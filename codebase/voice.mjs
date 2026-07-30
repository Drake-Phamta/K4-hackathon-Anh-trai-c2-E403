/* ══════════════════════════════════════════════════════════════════════════
   VOICE — trò chuyện thời gian thực với tutor
   ══════════════════════════════════════════════════════════════════════════
   Hai cỗ máy, cùng một giao diện:

   'browser'  Web Speech API — chạy ngay, không cài gì, không server.
              Chrome/Edge có sẵn, nhận diện vi-VN, có kết quả tạm thời
              (interim) nên chữ hiện ra NGAY khi đang nói.

   'ptalk'    Microservice của nhóm (ptalk_engine/ — Drake-Phamta):
              POST /api/v1/stt  (file wav)     -> {text}
              POST /api/v1/tts  (form text)    -> audio/wav
              ZipFormer/Whisper + OmniVoice tiếng Việt, có voice cloning.
              Tốt hơn cho tiếng Việt, nhưng cần chạy server + tải model.

   Tự dò: probe() thử gọi ptalk; sống thì dùng, không thì rơi về browser.
   Giao diện luôn NÓI RÕ đang chạy cỗ máy nào — user cần biết vì chất lượng
   nhận diện khác hẳn nhau (G2: làm rõ hệ thống làm tốt đến đâu).

   Ngắt lời (barge-in): user mở miệng là tutor im ngay. Không có cái này thì
   hội thoại thoại thành ra phải chờ nhau, rất khó chịu.
   ══════════════════════════════════════════════════════════════════════════ */

export const PTALK_BASE = 'http://localhost:8000';

export function createVoice({
  lang = 'vi-VN', onPartial, onFinal, onState, onLevel, onEngine,
} = {}){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let engine = 'browser';
  let rec = null, listening = false, wantListen = false;
  let media = null, recorder = null, chunks = [];
  let ac = null, analyser = null, levelRaf = 0, stream = null;
  let speaking = false, audioEl = null;
  let state = 'idle';                       // idle|listening|thinking|speaking

  const setState = s => { if (s !== state){ state = s; onState?.(s); } };

  /* ── đo mức âm thanh: cho vòng sóng / orb phản ứng theo giọng thật ─── */
  async function openMic(){
    if (stream) return stream;
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    ac = new (window.AudioContext || window.webkitAudioContext)();
    analyser = ac.createAnalyser();
    analyser.fftSize = 512;
    ac.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf){ const x = (v - 128) / 128; sum += x * x; }
      onLevel?.(Math.min(1, Math.sqrt(sum / buf.length) * 3.2));
      levelRaf = requestAnimationFrame(tick);
    };
    tick();
    return stream;
  }
  function closeMic(){
    cancelAnimationFrame(levelRaf);
    onLevel?.(0);
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
    ac?.close().catch(() => {});
    ac = null;
  }

  /* ── cỗ máy trình duyệt ────────────────────────────────────────────── */
  function startBrowser(){
    if (!SR) throw new Error('Trình duyệt này không có Web Speech API. Dùng Chrome/Edge, hoặc bật cỗ máy PTalk.');
    rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = e => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++){
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      if (interim){ stopSpeaking(); onPartial?.(interim); }      // ngắt lời
      if (final.trim()){ onPartial?.(''); onFinal?.(final.trim()); }
    };
    rec.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      onState?.('error:' + e.error);
    };
    rec.onend = () => { if (wantListen) { try { rec.start(); } catch {} } };
    rec.start();
  }

  /* ── cỗ máy PTalk: thu từng đoạn rồi gửi lên STT ────────────────────── */
  async function startPtalk(){
    const s = await openMic();
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm';
    recorder = new MediaRecorder(s, { mimeType: mime });
    chunks = [];
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: mime });
      chunks = [];
      if (blob.size < 2000) { if (wantListen) cycle(); return; }
      setState('thinking');
      try{
        const fd = new FormData();
        fd.append('file', blob, 'speech.wav');
        const r = await fetch(`${PTALK_BASE}/api/v1/stt`, { method: 'POST', body: fd });
        const j = await r.json();
        if (j.text?.trim()) onFinal?.(j.text.trim());
      }catch(err){ onState?.('error:stt ' + err.message); }
      if (wantListen) cycle();
    };
    cycle();
    function cycle(){
      if (!wantListen) return;
      try{ recorder.start(); }catch{ return; }
      setState('listening');
      // đoạn 3.5s — đủ cho một câu, đủ ngắn để không thấy trễ
      setTimeout(() => { if (recorder?.state === 'recording') recorder.stop(); }, 3500);
    }
  }

  /* ── điều khiển ────────────────────────────────────────────────────── */
  async function start(){
    if (listening) return;
    wantListen = true; listening = true;
    stopSpeaking();
    try{
      if (engine === 'ptalk') await startPtalk();
      else { await openMic().catch(() => {}); startBrowser(); }
      setState('listening');
    }catch(err){
      listening = false; wantListen = false;
      setState('idle');
      throw err;
    }
  }

  function stop(){
    wantListen = false; listening = false;
    try{ rec?.stop(); }catch{}
    rec = null;
    try{ if (recorder?.state === 'recording') recorder.stop(); }catch{}
    recorder = null;
    closeMic();
    setState('idle');
  }

  /* ── nói ───────────────────────────────────────────────────────────── */
  async function speak(text){
    if (!text?.trim()) return;
    stopSpeaking();
    speaking = true;
    setState('speaking');
    const done = () => { speaking = false; setState(wantListen ? 'listening' : 'idle'); };

    if (engine === 'ptalk'){
      try{
        const fd = new FormData();
        fd.append('text', text.slice(0, 900));
        fd.append('speed', '1.0');
        const r = await fetch(`${PTALK_BASE}/api/v1/tts`, { method: 'POST', body: fd });
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('audio')) throw new Error((await r.json()).error ?? 'TTS lỗi');
        audioEl = new Audio(URL.createObjectURL(await r.blob()));
        audioEl.onended = done; audioEl.onerror = done;
        await audioEl.play();
        return;
      }catch(err){ onState?.('error:tts ' + err.message); /* rơi về giọng trình duyệt */ }
    }

    const u = new SpeechSynthesisUtterance(stripMd(text).slice(0, 900));
    u.lang = lang;
    const v = speechSynthesis.getVoices().find(x => x.lang?.startsWith('vi'))
           ?? speechSynthesis.getVoices().find(x => x.lang?.startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    u.rate = 1.04;
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
  }

  function stopSpeaking(){
    if (audioEl){ audioEl.pause(); audioEl = null; }
    try{ speechSynthesis.cancel(); }catch{}
    if (speaking){ speaking = false; setState(wantListen ? 'listening' : 'idle'); }
  }

  /* bỏ **đậm** và ký tự trang trí trước khi đọc — đọc "sao sao" rất kỳ */
  const stripMd = s => String(s)
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1').replace(/[•▸■·⚠️✓∅⊘]/g, '')
    .replace(/\s+/g, ' ').trim();

  /* ── dò PTalk ──────────────────────────────────────────────────────── */
  async function probe(){
    try{
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 1200);
      const r = await fetch(`${PTALK_BASE}/docs`, { signal: c.signal, mode: 'no-cors' });
      clearTimeout(t);
      return true;                                    // no-cors: tới được là đủ
    }catch{ return false; }
  }

  function setEngine(e){
    const was = listening;
    if (was) stop();
    engine = e;
    onEngine?.(e);
    if (was) start().catch(() => {});
  }

  return {
    start, stop, speak, stopSpeaking, probe, setEngine,
    get engine(){ return engine; },
    get listening(){ return listening; },
    get state(){ return state; },
    get supported(){ return !!SR || !!navigator.mediaDevices; },
    stripMd,
  };
}
