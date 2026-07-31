/* ══════════════════════════════════════════════════════════════════════════
   SERVER — phục vụ tĩnh + proxy LLM
   ══════════════════════════════════════════════════════════════════════════
   node server.mjs            → http://localhost:8080

   Thay cho `python -m http.server 8080` — bản kia không proxy được LLM.

   VÌ SAO PHẢI CÓ PROXY, không gọi LLM thẳng từ trình duyệt:
   CONTRACT.md §4 mục 3 — "API key KHÔNG commit. Để sau proxy nhỏ, dùng
   stdlib, không cần npm install". Key nằm trong .env ở gốc repo (.gitignore
   đã chặn) và không bao giờ đi xuống client. Trang web chỉ thấy /api/llm.

   Chỉ dùng thư viện chuẩn của Node — không package.json, không cài gì.
   ══════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const PORT = Number(process.env.PORT || 8080);

/* ── đọc .env bằng tay (không cần dotenv) ───────────────────────────────── */
function loadEnv(){
  const out = {};
  for (const p of [join(REPO, '.env'), join(HERE, '.env')]){
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)){
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i.exec(line);
      if (!m) continue;
      let v = m[2].trim();
      /* Giá trị KHÔNG bọc nháy thì cắt comment cuối dòng. Không cắt là
         `LLM_TIMEOUT=15.0  # giây` thành chuỗi "15.0  # giây" → Number() ra
         NaN → setTimeout(NaN) abort NGAY LẬP TỨC → mọi lời gọi LLM chết vì
         một dòng ghi chú vô hại. Giá trị bọc nháy giữ nguyên (key có thể
         chứa '#'). */
      if (/^["']/.test(v)) v = v.replace(/^["']|["']$/g, '');
      else v = v.replace(/\s+#.*$/, '').trim();
      out[m[1]] = v;
    }
    break;
  }
  return out;
}
const ENV = loadEnv();

/* Chuẩn hoá base URL: .env có thể ghi cả đuôi /chat/completions */
const RAW_URL = ENV.LLM_API_URL || 'http://localhost:8000/v1';
const BASE    = RAW_URL.replace(/\/chat\/completions\/?$/, '').replace(/\/$/, '');
const KEY     = ENV.LLM_API_KEY || '';
const MODEL   = ENV.LLM_MODEL || 'gemma-4';
const _t = Number(ENV.LLM_TIMEOUT);
const TIMEOUT = Number.isFinite(_t) && _t > 0 ? Math.round(_t * 1000) : 15000;

/* Voice (STT/TTS) — API hosted của PTIT. Timeout riêng, dài hơn LLM: một
   clip 30-60s phải upload xong rồi chờ nhận diện; TTS một câu trả lời dài
   đo được ~6s cho 2 câu, câu trả lời 900 ký tự cần dư địa. */
const VOICE_BASE = (ENV.VOICE_API_URL || 'https://aitools.ptit.edu.vn/holobox').replace(/\/$/, '');
const _vt = Number(ENV.VOICE_TIMEOUT);
const VOICE_TIMEOUT = Number.isFinite(_vt) && _vt > 0 ? Math.round(_vt * 1000) : 30000;

const MIME = {
  '.html':'text/html; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.pdf':'application/pdf',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.woff2':'font/woff2', '.map':'application/json', '.wav':'audio/wav',
};

const json = (res, code, obj) => {
  const b = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, { 'content-type':'application/json; charset=utf-8', 'content-length':b.length });
  res.end(b);
};

const readBody = req => new Promise((ok, no) => {
  let n = 0; const chunks = [];
  req.on('data', c => {
    n += c.length;
    if (n > 2_000_000){ no(new Error('body quá lớn')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
  req.on('error', no);
});

/* Bản nhị phân của readBody — cho audio. KHÔNG .toString('utf8'): wav qua
   utf8 là hỏng dữ liệu không kêu một tiếng. Trần 10MB ≈ 5 phút 16kHz PCM16. */
const readBodyRaw = (req, cap = 10_000_000) => new Promise((ok, no) => {
  let n = 0; const chunks = [];
  req.on('data', c => {
    n += c.length;
    if (n > cap){ no(new Error('body quá lớn')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => ok(Buffer.concat(chunks)));
  req.on('error', no);
});

/* ── gọi LLM ────────────────────────────────────────────────────────────── */
async function callLLM(body){
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try{
    const payload = {
      model: MODEL,
      messages: [
        { role:'system', content: String(body.system ?? '') },
        { role:'user',   content: String(body.user   ?? '') },
      ],
      temperature: body.temperature ?? 0.3,
      max_tokens: Math.min(Number(body.max_tokens ?? 700), 1500),
    };
    /* vLLM hỗ trợ guided decoding — buộc trả JSON đúng schema thay vì cầu
       xin trong prompt. Server nào không hiểu field này thì bỏ qua nó, nên
       gửi kèm là an toàn. */
    if (body.schema) payload.guided_json = body.schema;

    const r = await fetch(`${BASE}/chat/completions`, {
      method:'POST', signal: ctl.signal,
      headers: { 'content-type':'application/json', ...(KEY ? { authorization:`Bearer ${KEY}` } : {}) },
      body: JSON.stringify(payload),
    });

    if (!r.ok){
      const detail = (await r.text().catch(() => '')).slice(0, 300);
      console.error(`[llm] upstream ${r.status}: ${detail}`);   // log nội bộ
      /* Nếu server không chấp nhận guided_json thì thử lại một lần không có
         nó — với BỘ ĐẾM GIỜ RIÊNG. Dùng lại ctl.signal của lần đầu là lần
         retry chỉ còn phần thời gian thừa; lần đầu ngốn gần hết ngân sách
         thì retry bị chém ngang dù upstream vẫn khoẻ. */
      if (payload.guided_json && (r.status === 400 || r.status === 422)){
        delete payload.guided_json;
        const ctl2 = new AbortController();
        const timer2 = setTimeout(() => ctl2.abort(), TIMEOUT);
        try{
          const r2 = await fetch(`${BASE}/chat/completions`, {
            method:'POST', signal: ctl2.signal,
            headers: { 'content-type':'application/json', ...(KEY ? { authorization:`Bearer ${KEY}` } : {}) },
            body: JSON.stringify(payload),
          });
          if (r2.ok) return { ok:true, text: (await r2.json())?.choices?.[0]?.message?.content ?? '' };
        }finally{ clearTimeout(timer2); }
      }
      /* Không trả chi tiết upstream ra client — trong đó có thể có IP/host */
      return { ok:false, error:'llm_upstream_error', status:r.status };
    }
    const j = await r.json();
    return { ok:true, text: j?.choices?.[0]?.message?.content ?? '',
             usage: j?.usage ?? null };
  }catch(e){
    console.error(`[llm] ${e.name}: ${e.message}`);
    return { ok:false, error: e.name === 'AbortError' ? 'llm_timeout' : 'llm_unreachable' };
  }finally{ clearTimeout(timer); }
}

/* ── gọi STT/TTS (PTIT holobox) ─────────────────────────────────────────
   Vì sao proxy chứ không gọi thẳng từ trình duyệt: CORS của endpoint PTIT
   chưa xác nhận — và repo này đã từng dính một lỗi CORS im lặng mà curl
   không tái hiện được (xem spec.md §9). Một origin duy nhất, khớp kiến trúc
   /api/llm sẵn có; nếu sau này API cần key thì key cũng ở đây, không xuống
   client. Lỗi upstream chỉ log nội bộ, ra ngoài là mã đục — như callLLM. */
async function callSTT(wavBuf){
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), VOICE_TIMEOUT);
  try{
    /* Tự dựng multipart bằng stdlib — FormData của Node không nhận Buffer
       thẳng, mà kéo thêm Blob/File chỉ để có một boundary thì không đáng. */
    const boundary = '----vlearn' + Math.random().toString(16).slice(2);
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`
        + `Content-Disposition: form-data; name="audio_file"; filename="speech.wav"\r\n`
        + `Content-Type: audio/wav\r\n\r\n`),
      wavBuf,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const r = await fetch(`${VOICE_BASE}/transcribe`, {
      method:'POST', signal: ctl.signal,
      headers:{ 'content-type':`multipart/form-data; boundary=${boundary}` },
      body,
    });
    if (!r.ok){
      const detail = (await r.text().catch(() => '')).slice(0, 300);
      console.error(`[stt] upstream ${r.status}: ${detail}`);
      return { ok:false, error:'stt_upstream_error', status:r.status };
    }
    /* Shape đo được 31/07: {"text": "...", "duration_seconds": ..., "sample_rate": 16000}.
       Vẫn đọc phòng thủ vài tên khác — API không có versioning công khai. */
    const j = await r.json();
    const text = String(j?.text ?? j?.transcription ?? j?.result ?? '').trim();
    return { ok:true, text };
  }catch(e){
    console.error(`[stt] ${e.name}: ${e.message}`);
    return { ok:false, error: e.name === 'AbortError' ? 'stt_timeout' : 'stt_unreachable' };
  }finally{ clearTimeout(timer); }
}

async function callTTS(text){
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), VOICE_TIMEOUT);
  try{
    const r = await fetch(`${VOICE_BASE}/synthesize`, {
      method:'POST', signal: ctl.signal,
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!r.ok){
      const detail = (await r.text().catch(() => '')).slice(0, 300);
      console.error(`[tts] upstream ${r.status}: ${detail}`);
      return { ok:false, error:'tts_upstream_error', status:r.status };
    }
    return { ok:true, wav: Buffer.from(await r.arrayBuffer()) };
  }catch(e){
    console.error(`[tts] ${e.name}: ${e.message}`);
    return { ok:false, error: e.name === 'AbortError' ? 'tts_timeout' : 'tts_unreachable' };
  }finally{ clearTimeout(timer); }
}

/* ── static ─────────────────────────────────────────────────────────────── */
/*  BẢO MẬT — thứ tự các bước dưới đây là chỗ đã từng thủng.
    Bản trước kiểm `rel.startsWith('/data/')` TRƯỚC khi normalize(). Hệ quả:
    GET /data/../.env  → tiền tố khớp → gốc = thư mục repo → normalize() mới
    thu gọn ".." thành "/.env" → đường dẫn cuối vẫn nằm trong repo nên qua được
    chốt chặn → server TRẢ VỀ .env kèm API key, HTTP 200.

    Không phát hiện được bằng curl: curl tự thu gọn ".." phía client nên server
    chẳng bao giờ nhận chuỗi đó. Phải gửi raw socket (hoặc %2e%2e) mới thấy.

    Bản này: THU GỌN TRƯỚC, chọn thư mục gốc SAU, rồi mới kiểm chứa. Sau khi
    thu gọn, "/data/../.env" thành "/.env" — không còn tiền tố /data/ nên gốc
    là codebase/, và ở đó không có .env. */
async function serveStatic(req, res, urlPath){
  let rel;
  try{ rel = decodeURIComponent(urlPath.split('?')[0]); }
  catch{ json(res, 400, { error:'bad_path' }); return; }        // %-escape hỏng
  if (rel === '/' || rel === '') rel = '/prototype.html';

  /* Chặn ổ đĩa/UNC nhét thẳng vào URL: /C:/… hay //máy-khác/share */
  if (/^\/*[a-z]:/i.test(rel) || /^\/{2}/.test(rel)){
    json(res, 403, { error:'forbidden' }); return;
  }

  /* BƯỚC 1 — thu gọn trước, trên dạng POSIX để không phụ thuộc hệ điều hành */
  const parts = [];
  for (const seg of rel.split(/[/\\]+/)){
    if (!seg || seg === '.') continue;
    if (seg === '..'){ parts.pop(); continue; }                 // ăn lên một cấp
    parts.push(seg);
  }
  const safeRel = parts.join('/');
  if (!safeRel){ json(res, 403, { error:'forbidden' }); return; }

  /* BƯỚC 2 — chọn gốc dựa trên đường dẫn ĐÃ thu gọn.
     Chỉ data/slides/ được mở ra ngoài codebase/, đủ cho ?file=<deck>. */
  const fromRepo = safeRel.startsWith('data/slides/');
  const root = fromRepo ? REPO : HERE;

  /* BƯỚC 3 — kiểm chứa. Phải so với root + dấu phân cách, vì startsWith(root)
     trơn sẽ cho lọt thư mục anh em kiểu "codebase-secrets". */
  const abs = normalize(join(root, safeRel));
  if (abs !== root && !abs.startsWith(root + sep)){
    json(res, 403, { error:'forbidden' }); return;
  }

  try{
    const buf = await readFile(abs);
    res.writeHead(200, {
      'content-type': MIME[extname(abs).toLowerCase()] ?? 'application/octet-stream',
      'content-length': buf.length,
      'cache-control': 'no-cache',
    });
    res.end(buf);
  }catch{
    res.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
    res.end(`404 — không thấy ${rel}`);
  }
}

/* ── router ─────────────────────────────────────────────────────────────── */
createServer(async (req, res) => {
  const url = req.url ?? '/';

  if (url.startsWith('/api/llm/health')){
    if (!KEY && !BASE) return json(res, 200, { ok:false, error:'no_config' });
    const probe = await callLLM({ system:'ping', user:'ping', max_tokens: 1 });
    return json(res, 200, probe.ok
      ? { ok:true, model: MODEL }
      : { ok:false, model: MODEL, error: probe.error });
  }

  if (url.startsWith('/api/llm')){
    if (req.method !== 'POST') return json(res, 405, { error:'method_not_allowed' });
    let body;
    try{ body = JSON.parse(await readBody(req) || '{}'); }
    catch{ return json(res, 400, { error:'bad_json' }); }
    const out = await callLLM(body);
    return json(res, out.ok ? 200 : 502, out);
  }

  /* Health voice TÁCH RIÊNG khỏi /api/llm/health: voice chết trong khi LLM
     sống là chuyện bình thường (hai dịch vụ khác nhau) — UI cần phân biệt
     để chỉ tắt nút mic chứ không tắt cả chat (G2). Probe bằng một call TTS
     tí hon: rẻ nhất mà vẫn end-to-end thật; STT/TTS cùng một service nên
     một probe đại diện được cả hai. */
  if (url.startsWith('/api/voice/health')){
    const probe = await callTTS('ok');
    return json(res, 200, probe.ok ? { ok:true } : { ok:false, error: probe.error });
  }

  if (url.startsWith('/api/stt')){
    if (req.method !== 'POST') return json(res, 405, { error:'method_not_allowed' });
    let buf;
    try{ buf = await readBodyRaw(req); }
    catch{ return json(res, 413, { error:'body_too_large' }); }
    if (buf.length < 100) return json(res, 400, { error:'empty_audio' });
    const out = await callSTT(buf);
    return json(res, out.ok ? 200 : 502, out);
  }

  if (url.startsWith('/api/tts')){
    if (req.method !== 'POST') return json(res, 405, { error:'method_not_allowed' });
    let body;
    try{ body = JSON.parse(await readBody(req) || '{}'); }
    catch{ return json(res, 400, { error:'bad_json' }); }
    const text = String(body.text ?? '').trim().slice(0, 900);   // trần như speak() cũ
    if (!text) return json(res, 400, { error:'empty_text' });
    const out = await callTTS(text);
    if (!out.ok) return json(res, 502, out);
    /* json() không dùng được cho binary — trả wav thô như serveStatic */
    res.writeHead(200, {
      'content-type':'audio/wav',
      'content-length': out.wav.length,
      'cache-control':'no-store',
    });
    return res.end(out.wav);
  }

  return serveStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`\n  VLearn Slide Tutor  →  http://localhost:${PORT}/prototype.html`);
  console.log(`  ├─ LLM              →  ${BASE}  ·  model ${MODEL}` +
              `  ·  key ${KEY ? 'đã nạp từ .env' : 'THIẾU — nhân sẽ chạy mock'}`);
  console.log(`  └─ Voice (STT/TTS)  →  ${VOICE_BASE}`);
  console.log(`\n  Kiểm nhanh: curl -s localhost:${PORT}/api/llm/health` +
              `  ·  curl -s localhost:${PORT}/api/voice/health\n`);
});
