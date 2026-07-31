/* ══════════════════════════════════════════════════════════════════════════
   VOICE — hỏi bằng giọng nói + đọc câu trả lời, qua API hosted của PTIT
   ══════════════════════════════════════════════════════════════════════════
   Bản trước (whisper chạy CPU cục bộ) bị bỏ ở N2 vì đo được 33s cho một
   đoạn 3,5s. Bản này gọi API hosted qua proxy server.mjs — đo 31/07: STT
   ~0,6s một câu, TTS ~6s cho hai câu. Trình duyệt chỉ thấy /api/stt và
   /api/tts cùng origin, không đụng CORS, không lộ endpoint ra client.

   Thu âm BẤM–NÓI–BẤM: một lần ghi = một request (bài học §9 — auto-chunk
   3,5s liên tục làm hàng đợi phình 9,4 lần thời gian thực). Đồng hồ đếm
   giây báo qua onTimer để UI hiện — người dùng phải thấy máy đang nghe.

   KHÔNG có fallback speechSynthesis: sự cố "giọng Anh đọc tiếng Việt im
   lặng" (§9, G2) là lý do — TTS chết thì nói thẳng là chết, không hạ cấp
   sang một giọng sai mà không báo.
   ══════════════════════════════════════════════════════════════════════════ */

/* bỏ **đậm** và ký tự trang trí trước khi đọc — đọc "sao sao" rất kỳ */
export const stripMd = s => String(s)
  .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
  .replace(/`(.+?)`/g, '$1').replace(/[•▸■·⚠️✓∅⊘]/g, '')
  .replace(/\s+/g, ' ').trim();

/* ── WAV encoder — mảnh duy nhất phải viết mới ──────────────────────────
   MediaRecorder chỉ cho webm/opus; bản cũ dán nhãn .wav lên blob webm và
   thoát tội nhờ ffmpeg phía server cũ đoán format hộ. API PTIT khai
   audio/wav thì đưa đúng audio/wav — không dựa vào tolerance không tài
   liệu của một dịch vụ hosted (đêm trước demo là lúc nó hết tolerance).

   Ghép các buffer Float32 mono → hạ về 16kHz bằng nội suy tuyến tính
   (upstream tự resample về 16kHz nên gửi cao hơn chỉ tốn băng thông) →
   PCM16LE + header RIFF 44 byte. */
export function encodeWav(chunks, inputRate, targetRate = 16000){
  let len = 0;
  for (const c of chunks) len += c.length;
  const flat = new Float32Array(len);
  let o = 0;
  for (const c of chunks){ flat.set(c, o); o += c.length; }

  const ratio = inputRate / targetRate;
  const outLen = Math.max(1, Math.floor(flat.length / ratio));
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++){
    const pos = i * ratio, i0 = Math.floor(pos), frac = pos - i0;
    const a = flat[i0] ?? 0, b = flat[Math.min(i0 + 1, flat.length - 1)] ?? 0;
    const s = Math.max(-1, Math.min(1, a + (b - a) * frac));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);                    // PCM
  v.setUint16(22, 1, true);                    // mono
  v.setUint32(24, targetRate, true);
  v.setUint32(28, targetRate * 2, true);       // byteRate = rate · block
  v.setUint16(32, 2, true);                    // blockAlign
  v.setUint16(34, 16, true);                   // bits
  str(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  return new Blob([buf], { type: 'audio/wav' });
}

export function createVoice({ onState, onTimer, onLevel } = {}){
  let stream = null, ac = null, proc = null, chunks = [];
  let timerId = 0, seconds = 0;
  let analyser = null, levelRaf = 0;
  let audioEl = null;
  let state = 'idle';                          // idle|recording|processing|speaking

  const setState = s => { if (s !== state){ state = s; onState?.(s); } };

  /* ── thu âm ─────────────────────────────────────────────────────────── */
  async function startRecording(){
    if (state !== 'idle') return;
    stopSpeaking();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    /* Xin thẳng 16kHz — trùng target của encoder thì bước downsample thành
       ratio 1, upload nhỏ đi ~3 lần. Trình duyệt không chiều thì rơi về
       mặc định, encoder vẫn tự hạ tần số như cũ. */
    try{ ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 }); }
    catch{ ac = new (window.AudioContext || window.webkitAudioContext)(); }
    const src = ac.createMediaStreamSource(stream);

    /* ScriptProcessor thay vì AudioWorklet CÓ CHỦ ĐÍCH: worklet đòi một
       file module riêng + một đường async có thể fail lúc nạp; còn đây chỉ
       buffer chứ không DSP realtime nên độ trễ của processor không thành
       vấn đề. Deprecated nhưng chạy vững trên desktop Chrome — target demo. */
    proc = ac.createScriptProcessor(4096, 1, 1);
    chunks = [];
    proc.onaudioprocess = e => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    src.connect(proc);
    /* Chrome chỉ chạy onaudioprocess khi processor nối tới destination —
       chèn gain 0 để mic không dội ra loa. */
    const mute = ac.createGain(); mute.gain.value = 0;
    proc.connect(mute); mute.connect(ac.destination);

    if (onLevel){
      analyser = ac.createAnalyser(); analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf){ const x = (v - 128) / 128; sum += x * x; }
        onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3.2));
        levelRaf = requestAnimationFrame(tick);
      };
      tick();
    }

    seconds = 0; onTimer?.(0);
    timerId = setInterval(() => onTimer?.(++seconds), 1000);
    setState('recording');
  }

  /* Dừng và trả về Blob wav 16kHz mono — null nếu ngắn quá (< 0,4s) */
  async function stopRecording(){
    if (state !== 'recording') return null;
    setState('processing');
    clearInterval(timerId);
    cancelAnimationFrame(levelRaf); onLevel?.(0);
    const rate = ac.sampleRate;
    try{ proc.disconnect(); }catch{}
    proc = null; analyser = null;
    stream?.getTracks().forEach(t => t.stop()); stream = null;
    await ac?.close().catch(() => {}); ac = null;

    const got = chunks; chunks = [];
    const samples = got.reduce((n, c) => n + c.length, 0);
    if (samples / rate < 0.4){ setState('idle'); return null; }
    const wav = encodeWav(got, rate);
    setState('idle');
    return wav;
  }

  /* ── STT: wav → chữ. Throw Error(mã) khi lỗi — UI toast theo mã. ────── */
  async function transcribe(wavBlob){
    const r = await fetch('/api/stt', {
      method:'POST', headers:{ 'content-type':'audio/wav' }, body: wavBlob,
    });
    const j = await r.json().catch(() => null);
    if (!j?.ok) throw new Error(j?.error ?? 'stt_http_' + r.status);
    return j.text;                             // có thể rỗng — UI xử lý
  }

  /* ── TTS: chữ → phát tiếng ──────────────────────────────────────────
     Đo 31/07: tổng hợp CẢ đoạn 900 ký tự bắt người dùng chờ 15-20s im lặng
     trước tiếng đầu tiên. Nên: CẮT CÂU rồi phát GỐI ĐẦU — câu đầu để ngắn
     cho ra tiếng sớm (~2s), trong lúc phát thì câu kế đang tổng hợp sẵn.
     Blob cache theo text: bấm 🔊 lần hai (hay prefetch xong mới bấm) là
     phát tức thì, không tốn thêm request. */

  /* Tách theo dấu kết câu, gom thành chunk KÍCH THƯỚC TĂNG DẦN: 1 câu →
     ~80 → ~200 ký tự. Vì sao tăng dần: đo 31/07 tổng hợp ~19ms/ký tự (+1,5s
     overhead) còn phát lại ~73ms/ký tự — chunk N phát đủ lâu để chunk N+1
     tổng hợp xong thì không hở tiếng; chunk đầu ngắn để ra tiếng sớm (~2,3s
     thay vì 9,9s cho đoạn 434 ký tự), các chunk sau dài để giữ nhịp giọng. */
  function splitSentences(text){
    const parts = text.match(/[^.!?…\n]+[.!?…]*\s*/g) ?? [text];
    const out = [];
    let cur = '';
    for (const p of parts){
      cur += p;
      const cap = out.length === 0 ? 1 : out.length === 1 ? 80 : 200;
      if (cur.trim().length >= cap){ out.push(cur.trim()); cur = ''; }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  const ttsCache = new Map();                  // text → Promise<Blob>
  function fetchTts(text){
    if (!ttsCache.has(text)){
      const p = (async () => {
        const r = await fetch('/api/tts', {
          method:'POST', headers:{ 'content-type':'application/json' },
          body: JSON.stringify({ text }),
        }).catch(() => { throw new Error('tts_unreachable'); });
        if (!r.ok || !(r.headers.get('content-type') || '').includes('audio'))
          throw new Error((await r.json().catch(() => null))?.error ?? 'tts_failed');
        return r.blob();
      })();
      p.catch(() => ttsCache.delete(text));    // lỗi thì đừng găm vào cache
      if (ttsCache.size >= 40) ttsCache.delete(ttsCache.keys().next().value);
      ttsCache.set(text, p);
    }
    return ttsCache.get(text);
  }

  /* Sưởi cache trước khi người dùng bấm 🔊 — chỉ câu đầu, phần còn lại để
     pipeline lo trong lúc phát. Nuốt lỗi: prefetch hỏng thì speak() báo sau. */
  function prefetch(text){
    const clean = stripMd(text).slice(0, 900);
    if (clean) fetchTts(splitSentences(clean)[0]).catch(() => {});
  }

  function playBlob(blob){
    return new Promise(resolve => {
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      let finished = false;                    // done có thể bị gọi kép (onerror + play().catch)
      const done = () => {
        if (finished) return;
        finished = true;
        if (audioEl === a) audioEl = null;
        URL.revokeObjectURL(url);
        resolve();
      };
      a.onended = done; a.onerror = done; a._done = done;
      audioEl = a;
      a.play().catch(done);
    });
  }

  let speakToken = 0;                          // tăng = mọi lượt speak cũ tự rút lui
  async function speak(text){
    stopSpeaking();
    const clean = stripMd(text).slice(0, 900);
    if (!clean) return;
    const chunks = splitSentences(clean);
    const token = ++speakToken;
    setState('speaking');
    try{
      let next = fetchTts(chunks[0]);
      for (let i = 0; i < chunks.length; i++){
        const blob = await next;
        if (token !== speakToken) return;      // bị cắt trong lúc chờ tổng hợp
        if (i + 1 < chunks.length) next = fetchTts(chunks[i + 1]);   // gối đầu
        await playBlob(blob);
        if (token !== speakToken) return;      // bị cắt trong lúc phát
      }
    }finally{
      if (token === speakToken) setState('idle');
    }
  }

  function stopSpeaking(){
    speakToken++;                              // vòng for của speak() đang chạy sẽ thấy và dừng
    if (!audioEl) return;
    const a = audioEl; audioEl = null;
    a.pause();
    a._done?.();                               // resolve playBlob đang treo
  }

  /* ── dò dịch vụ — UI tắt mic kèm tooltip khi voice chết (G2) ────────── */
  async function probeHealth(){
    try{
      const r = await fetch('/api/voice/health');
      return (await r.json())?.ok === true;
    }catch{ return false; }
  }

  return {
    startRecording, stopRecording, transcribe, speak, stopSpeaking, prefetch, probeHealth,
    stripMd,
    get state(){ return state; },
    get recording(){ return state === 'recording'; },
    get speaking(){ return state === 'speaking'; },
  };
}
