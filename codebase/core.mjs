/* ══════════════════════════════════════════════════════════════════════════
   AI CORE — VLearn Slide Tutor
   ══════════════════════════════════════════════════════════════════════════
   ĐÂY LÀ SEAM. Giai đoạn 2 chỉ cần viết realCore() trong file này rồi đổi
   AI_CORE = 'real'. UI (prototype.html) không phải sửa một dòng nào.

   Hợp đồng dữ liệu: xem CONTRACT.md — askTutor(AskRequest) -> AskResponse.

   GĐ1 mock cái gì và KHÔNG mock cái gì:
     • MOCK    — văn phong câu trả lời (không có lời gọi LLM nào).
     • THẬT    — trích text PDF, retrieval, xếp hạng trang, chọn câu trích dẫn.
   Nghĩa là mọi citation đều là chữ CÓ THẬT trong tài liệu đang mở, không bịa.
   GĐ2 thay đúng phần văn phong bằng LLM và giữ nguyên lớp grounding này.
   ══════════════════════════════════════════════════════════════════════════ */

export const AI_CORE = 'mock';                 // 'mock' | 'real'

/* ── trạng thái tài liệu ────────────────────────────────────────────────── */
const DOC = { index: [], total: 0 };

/** index: [{page, text}] — UI gọi sau khi trích xong text mọi trang. */
export function setDocIndex(pages){
  DOC.index = pages.map(p => ({
    ...p,
    norm: norm(p.text),
    tokens: new Set(tokenize(p.text)),   // khớp theo TỪ, không phải substring
  }));
  DOC.total = pages.length;
}
export const getDoc = () => DOC;

/* ── log phiên → artifact cho eval/ (rubric R5 đòi trace trong repo) ────── */
const LOG = [];
export const getLog = () => LOG;
export function attachFeedback(rating, why){
  const last = LOG[LOG.length - 1];
  if (last) last.feedback = { rating, why, at: new Date().toISOString() };
}

/* ── chuẩn hoá tiếng Việt: bỏ dấu để so khớp không phụ thuộc dấu ───────── */
export const deaccent = s => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D');
export const norm = s => deaccent(s).toLowerCase().replace(/\s+/g, ' ').trim();

const STOP = new Set(('la co the cua va cho nhung mot cai nay do gi khong nao thi ma nhu duoc voi trong tren den tu ve hay hoac boi nen se da dang cung ra vao khi neu con rat hon nhat cac minh ban toi ai sao dau day kia nua chi tuc phai bi cho lam nhu vay').split(' '));

export function tokenize(s){
  return norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
}

/** Khớp theo TỪ, không phải substring — nếu không thì "fine" trúng trong
    "defined" và "tro" trúng trong "control" (đã bị dính lỗi này một lần). */
function pageHas(page, term){
  if (page.tokens.has(term)) return true;
  if (term.length >= 5){                       // cho phép biến thể: agent ~ agentic
    for (const t of page.tokens){
      if (t.startsWith(term)) return true;
      if (t.length >= 5 && term.startsWith(t)) return true;
    }
  }
  return false;
}

/** Từ khoá "quyết định" của câu hỏi: token ASCII thuần (thuật ngữ kỹ thuật
    của khoá hầu hết là tiếng Anh — streaming, multi-agent, LangGraph…).
    Từ tiếng Việt CÓ DẤU bị loại khỏi phép phủ định, vì tách âm tiết tiếng Việt
    sinh ra token vô nghĩa ("hỗ trợ" -> "ho"/"tro") và sẽ gây từ chối oan. */
function decisiveTerms(rawQuery){
  return [...new Set(
    String(rawQuery || '')
      .split(/[^\p{L}\p{N}]+/u)
      .filter(w => w && !/[̀-ͯ]/.test(w.normalize('NFD')))  // bỏ từ có dấu
      .map(norm)
      .filter(w => w.length >= 4 && !STOP.has(w))
  )];
}

/** Cụm ghép có gạch nối: "multi-agent", "fine-tuning", "human-in-the-loop".
    Cần kiểm riêng vì tách từ sẽ nhìn nhầm — tài liệu này có "multi-step" và
    "prompt tuning", nên "multi" và "tuning" đều tồn tại, trong khi
    "multi-agent" / "fine-tuning" thì KHÔNG. Hỏi cái sau mà trả lời bằng
    trang của cái trước chính là kiểu bịa nguy hiểm nhất: nghe rất có lý. */
function decisivePhrases(rawQuery){
  return [...new Set(
    String(rawQuery || '').split(/[^\p{L}\p{N}-]+/u)
      .filter(w => w.includes('-') && w.length >= 6)
      .filter(w => !/[̀-ͯ]/.test(w.normalize('NFD')))
      .map(norm)
  )];
}
const phraseInDoc = p =>
  DOC.index.some(pg => pg.norm.includes(p) || pg.norm.includes(p.replace(/-/g, ' ')));

/* ══════════════════════════════════════════════════════════════════════════
   RETRIEVAL — chạy thật trên text PDF, không mock
   ══════════════════════════════════════════════════════════════════════════ */
export function retrieve(query, selText){
  const terms = [...new Set([...tokenize(query), ...tokenize(selText || '')])];
  if (!terms.length || !DOC.index.length) return { hits: [], terms, missing: [], found: [] };

  /* idf thô: term có mặt ở càng ít trang thì càng đáng giá.
     Term có mặt ở MỌI trang (header/footer) bị loại hẳn. */
  const df = {};
  for (const t of terms) df[t] = DOC.index.reduce((a, p) => a + (pageHas(p, t) ? 1 : 0), 0);

  const hits = DOC.index.map(p => {
    let score = 0;
    for (const t of terms){
      if (!df[t] || df[t] === DOC.index.length) continue;
      if (pageHas(p, t)) score += Math.log(1 + DOC.index.length / df[t]);
    }
    return { page: p.page, score, text: p.text };
  }).filter(h => h.score > 0).sort((a, b) => b.score - a.score);

  /* Trọng tâm câu hỏi mà tài liệu KHÔNG hề nhắc tới.
     "LangGraph có hỗ trợ streaming không?" → langgraph có, streaming không có
     → không đủ căn cứ, dù retrieval vẫn trả về trang nói về LangGraph. */
  const dec = decisiveTerms(query);
  const phrases = decisivePhrases(query);
  const missing = [
    ...phrases.filter(p => !phraseInDoc(p)),
    ...dec.filter(t => !phrases.some(p => p.includes(t))       // đã tính ở cụm rồi
                    && !DOC.index.some(p => pageHas(p, t))),
  ];
  const found = dec.filter(t => DOC.index.some(p => pageHas(p, t)));

  return { hits: hits.slice(0, 3), terms, missing, found };
}

/** Câu trong trang chứa nhiều term nhất → dùng làm quote.
    Luôn là chữ có thật trong PDF. */
export function bestQuote(pageNo, terms){
  const p = DOC.index.find(x => x.page === pageNo);
  if (!p) return '';
  const parts = p.text
    .split(/(?<=[.!?;:])\s+|\s{2,}|■|·|\|/)
    .map(s => s.trim()).filter(s => s.length > 18);
  if (!parts.length) return clip(p.text, 120, false);
  let best = parts[0], bs = -1;
  for (const s of parts){
    const ns = norm(s);
    const sc = terms.reduce((a, t) => a + (ns.includes(t) ? 1 : 0), 0);
    if (sc > bs){ bs = sc; best = s; }
  }
  return clip(best, 150, false);          // nguyên văn, không thêm "…"
}

const pageTitle = (text, fallback) =>
  (text.split(/\s{2,}|\||■/)[0] || '').trim().slice(0, 44) || fallback;

/** Cắt theo ranh giới từ — cắt giữa từ ("…destinatio") trông rất ẩu khi demo.
    ell=false cho `quote`: phải giữ nguyên văn 100% để còn đối chiếu được với
    text trang (bất biến #1 trong CONTRACT.md), nên không thêm dấu "…". */
function clip(s, n, ell = true){
  s = String(s ?? '').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  const out = (sp > n * 0.6 ? cut.slice(0, sp) : cut).trimEnd();
  return ell ? out + '…' : out;
}

/* ══════════════════════════════════════════════════════════════════════════
   ★ ĐIỂM VÀO DUY NHẤT ★
   ══════════════════════════════════════════════════════════════════════════ */
export async function askTutor(req){
  const t0 = Date.now();
  const res = AI_CORE === 'mock' ? await mockCore(req) : await realCore(req);
  res.latency_ms = Date.now() - t0;
  LOG.push({ at: new Date().toISOString(), core: AI_CORE, request: req, response: res });
  return res;
}

/* GĐ2: cài hàm này. Gợi ý — giữ nguyên retrieve() ở trên làm lớp grounding,
   chỉ đưa hits + selection vào prompt và bắt LLM trả JSON đúng AskResponse.
   Ràng buộc bắt buộc: citations rỗng thì PHẢI trả decision='no_grounding'. */
async function realCore(req){                                    // eslint-disable-line
  throw new Error('realCore() chưa cài — việc của GĐ2. Xem CONTRACT.md §4.');
}

/* ══════════════════════════════════════════════════════════════════════════
   LUẬT PHÂN LOẠI — 4 lớp chỗ khó
   ══════════════════════════════════════════════════════════════════════════ */

/* LUẬT KHỚP TRÊN norm(q) — đã bỏ dấu + viết thường, nên chỉ cần viết
   pattern một kiểu duy nhất (trước đây phải duy trì song song có dấu/không dấu
   và đã bỏ sót "một kiểu" với "lúc nào cũng"). */

/* ③ ngoài phạm vi / thẩm quyền */
const OOS = [
  { id: 'lam-ho-bai-tap',
    re: /(lam|code|viet|giai)\s*(ho|giup)\b|dap an|loi giai|answer key|lam bai (tap|nay) (ho|giup)/,
    why: 'làm hộ bài tập / xin đáp án',
    msg: 'Mình không làm hộ Lab và không đưa đáp án — Lab là phần được chấm, mình làm hộ thì bạn mất đúng cái mà buổi học này muốn bạn có được.',
    redirect: ['Debug Checklist', 'Cách Chạy Lab'] },

  { id: 'logistics',
    re: /deadline|han nop|may gio nop|nop o dau|link nop|diem so|bao nhieu diem|lich hoc|lich nop/,
    why: 'thông tin hành chính / logistics ngoài tài liệu',
    msg: 'Mình chỉ đọc được slide đang mở — mình không có quyền truy cập lịch nộp bài, deadline hay điểm số. Trả lời sai deadline thì hậu quả rơi thẳng vào bạn, nên mình không đoán.',
    redirect: null },
];

/* ④ đặc thù domain — câu hỏi mang tiền đề sai, không được gật theo */
const PREMISE = [
  { id: 'react-la-finetuning',
    re: /react\s+(la|chinh la)\s+((mot|kieu|loai|dang)\s+)*(fine.?tun|finetun|huan luyen|train)/,
    fix: 'ReAct **không phải** fine-tuning. Nó là một *design pattern* nằm ở tầng prompt + vòng lặp điều khiển: model suy luận (Thought) → gọi tool (Action) → đọc kết quả (Observation) → lặp cho tới khi đủ thông tin. Không có bước cập nhật trọng số nào cả.',
    note: 'Kiểm chứng nhanh: cả tài liệu này không có chữ "fine-tuning" ở bất kỳ trang nào.',
    noteTitle: 'Đính chính: ReAct là pattern, không phải fine-tuning' },

  { id: 'agent-luon-tot-hon',
    re: /agent.{0,20}(luon|bao gio cung|luc nao cung).{0,20}(tot|hon)|cang nhieu tool cang/,
    fix: 'Không đúng. Tài liệu dành hẳn một phần **Anti-Patterns** cho chuyện này: task một lượt, tra cứu đơn giản, hoặc yêu cầu độ trễ thấp thì chatbot thắng. Agent đổi tốc độ và chi phí để lấy khả năng xử lý bài nhiều bước — không phải nâng cấp miễn phí.',
    note: 'Xem bảng so sánh "Khi nào chatbot thắng, khi nào agent thắng".',
    noteTitle: 'Đính chính: agent không mặc định tốt hơn chatbot' },
];

/* ② mơ hồ — đại từ trỏ mà không có đoạn bôi đen */
const DEICTIC = /^(cai|no|phan|thang|con)?\s*(nay|do|kia|ay)\b|^(giai thich them|noi ro hon|sao|tai sao|the nao|con)\b|khac\s*(gi|nhau|cai kia)/;

/* ══════════════════════════════════════════════════════════════════════════
   MOCK CORE
   ══════════════════════════════════════════════════════════════════════════ */
async function mockCore(req){
  const trace = [];
  const T = (step, detail) => trace.push({ step, detail, ms: Math.round(18 + Math.random() * 70) });
  await new Promise(r => setTimeout(r, 200));

  const q = req.question || '';
  const nq = norm(q);                    // mọi luật khớp trên bản đã bỏ dấu
  const sel = req.selection;
  const curPage = req.document?.current_page ?? 1;

  T('nhận input', sel
    ? `đoạn đã chọn (Trang ${sel.page}, ${sel.text.length} ký tự)`
    : `không có đoạn chọn → tự đính text Trang ${curPage} (${(req.page_text || '').length} ký tự)`);

  /* ── ③ chặn trước, không cần tra tài liệu ───────────────────────────── */
  for (const r of OOS){
    if (r.re.test(nq)){
      T('phân loại', `ngoài phạm vi ③ — ${r.why}`);
      T('quyết định', 'từ chối + chuyển hướng sang thứ làm được');
      const redirect = (r.redirect || []).map(k => {
        const key = norm(k).slice(0, 14);
        const hit = DOC.index.find(p => p.norm.includes(key));
        return hit ? { kind: 'page', ref: String(hit.page), page: hit.page,
                       quote: bestQuote(hit.page, tokenize(k)) } : null;
      }).filter(Boolean);
      return {
        decision: 'out_of_scope', confidence: 0.95,
        answer: r.msg + (redirect.length ? '\n\nThứ mình **làm được** cho bạn ngay:' : ''),
        refusal_reason: r.why, citations: redirect, trace,
        follow_ups: redirect.length
          ? ['Tóm tắt trang này giúp mình', 'Mình đang kẹt ở bước nào thì hỏi tiếp?'] : [],
        suggested_note: null,
      };
    }
  }

  /* ── ④ tiền đề sai — sửa TRƯỚC, rồi mới giải thích ──────────────────── */
  for (const r of PREMISE){
    if (r.re.test(nq)){
      T('phân loại', 'đặc thù domain ④ — câu hỏi chứa tiền đề sai');
      const { hits, terms } = retrieve(q, sel?.text);
      T('tra cứu', `${DOC.total} trang → ${hits.length} căn cứ`);
      T('quyết định', 'sửa hiểu lầm trước, không gật theo tiền đề');
      return {
        decision: 'answer', confidence: 0.88,
        answer: `⚠️ Câu hỏi đang dựa trên một tiền đề chưa đúng — mình sửa trước đã.\n\n${r.fix}\n\n${r.note}`,
        citations: hits.slice(0, 2).map(h => ({
          kind: 'page', ref: String(h.page), page: h.page, quote: bestQuote(h.page, terms) })),
        trace,
        follow_ups: ['Vậy khác gì prompt engineering thường?', 'Cho mình một vòng lặp cụ thể'],
        suggested_note: { title: r.noteTitle, body: r.fix,
                          anchor_page: hits[0]?.page ?? curPage },
      };
    }
  }

  /* ── ② mơ hồ — chỉ khi KHÔNG bôi đen ────────────────────────────────── */
  if (!sel && (DEICTIC.test(nq.trim()) || tokenize(q).length <= 1)){
    T('phân loại', 'mơ hồ ② — đại từ trỏ không rõ, không có đoạn chọn');
    const near = [curPage, curPage - 1]
      .map(n => DOC.index.find(p => p.page === n)).filter(Boolean);
    const opts = near.map(p => ({ page: p.page, title: pageTitle(p.text, `Trang ${p.page}`) }));
    T('quyết định', 'KHÔNG đoán — hỏi lại đúng 1 câu (G10)');
    return {
      decision: 'clarify', confidence: 0.31,
      answer: `Mình chưa chắc "${q.trim()}" đang trỏ vào đâu, mà đoán sai chỗ này thì bạn học nhầm ý — nên mình hỏi lại một câu cho chắc.`,
      clarifying_question: opts.length > 1
        ? `Bạn đang hỏi về **${opts[0].title}** (Trang ${opts[0].page}) hay **${opts[1].title}** (Trang ${opts[1].page})?`
        : 'Bạn bôi đen giúp mình đoạn cụ thể trên slide nhé — mình sẽ trả lời sát hơn nhiều.',
      citations: [], trace,
      follow_ups: opts.map(o => `Ý mình là Trang ${o.page} — ${o.title}`),
      suggested_note: null,
    };
  }

  /* ── ① / happy — tra cứu thật ───────────────────────────────────────── */
  const { hits, terms, missing, found } = retrieve(q, sel?.text);
  T('tra cứu', `quét ${DOC.total} trang · ${terms.length} từ khoá → ${hits.length} trang khớp`);

  /* Có trang khớp CHƯA CHẮC là có căn cứ.
     "LangGraph có hỗ trợ streaming không?" — LangGraph có ở Trang 30, nhưng
     "streaming" không có ở đâu cả. Trọng tâm câu hỏi mới là thứ quyết định:
     thiếu nó thì trả lời = bịa, dù retrieval vẫn trả về trang trông có lý. */
  if (!hits.length || missing.length){
    const q1 = missing.map(t => `"${t}"`).join(', ');
    T('kiểm phủ', missing.length
      ? `thiếu trọng tâm: ${q1}${found.length ? ` · có: ${found.map(t => `"${t}"`).join(', ')}` : ''}`
      : 'không trang nào khớp');
    T('quyết định', 'KHÔNG đủ căn cứ ① — từ chối, không đoán');

    const detail = missing.length
      ? (found.length
          ? `Tài liệu **có** nói về ${found.map(t => `\`${t}\``).join(', ')}, nhưng **không có trang nào nhắc tới** ${missing.map(t => `\`${t}\``).join(', ')}.`
          : `**Không trang nào** trong tài liệu nhắc tới ${missing.map(t => `\`${t}\``).join(', ')}.`)
      : `Mình tra hết **${DOC.total} trang** và không có đoạn nào khớp với câu này.`;

    return {
      decision: 'no_grounding', confidence: 0.08,
      answer: `${detail}\n\nMình sẽ không đoán phần còn thiếu — trả lời bịa ở đây thì bạn không có cách nào biết là mình sai.`,
      refusal_reason: missing.length
        ? `tài liệu không chứa: ${missing.join(', ')}`
        : 'không có đoạn nào trong tài liệu khớp với câu hỏi',
      /* vẫn đưa trang liên quan để user tự đọc — từ chối nhưng không bỏ rơi */
      citations: hits.slice(0, 1).map(h => ({
        kind: 'page', ref: String(h.page), page: h.page, quote: bestQuote(h.page, terms) })),
      trace,
      follow_ups: ['Trả lời ngoài tài liệu (gắn nhãn ⚠️)', 'Chuyển câu này cho TA',
                   'Hỏi lại về nội dung có trong slide'],
      suggested_note: null,
    };
  }

  const top = hits[0];
  const confidence = Math.min(0.94, 0.55 + top.score / 12 + (sel ? 0.14 : 0));
  T('xếp hạng', hits.map(h => `Trang ${h.page} (${h.score.toFixed(2)})`).join(' · '));
  T('quyết định', `trả lời có căn cứ · ${hits.length} trích dẫn`);

  const answer = sel
    ? `Đoạn bạn bôi đen ở **Trang ${sel.page}** nằm trong mạch này:\n\n${summarize(top, terms)}\n\nMình bám đúng chữ trong slide — bấm chip trích dẫn bên dưới để nhảy tới đúng chỗ và tự đối chiếu.`
    : `${summarize(top, terms)}\n\nBạn chưa bôi đen đoạn nào nên mình lấy nội dung **Trang ${curPage}** làm ngữ cảnh chính. Bôi đen đúng đoạn thì câu trả lời sẽ hẹp và chính xác hơn.`;

  return {
    decision: 'answer', confidence,
    answer,
    citations: hits.map(h => ({
      kind: 'page', ref: String(h.page), page: h.page, quote: bestQuote(h.page, terms) })),
    trace,
    follow_ups: ['Cho mình một ví dụ cụ thể', 'Chỗ này khác gì phần trước?',
                 'Tóm tắt trang này thành 3 ý'],
    suggested_note: {
      title: `Trang ${top.page} — ${pageTitle(top.text, '')}`,
      body: bestQuote(top.page, terms),
      anchor_page: top.page,
    },
  };
}

/* Văn phong mock: dựng từ chính chữ trong trang — không thêm dữ kiện mới. */
function summarize(hit, terms){
  const p = DOC.index.find(x => x.page === hit.page);
  /* Tách theo bullet ■·| VÀ theo mốc câu — slide dạng trace (Thought/Action/
     Observation) không có ký tự bullet nào, để nguyên sẽ ra một cục dài. */
  const parts = p.text
    .split(/■|·|\||(?=Thought \d)|(?=Action \d)|(?=Observation \d)|(?<=[.!?])\s+(?=[A-ZĐÀ-Ỹ])/)
    .map(s => s.trim()).filter(s => s.length > 22);
  const ranked = parts
    .map(s => ({ s, sc: terms.reduce((a, t) => a + (norm(s).includes(t) ? 1 : 0), 0) }))
    .sort((a, b) => b.sc - a.sc).slice(0, 3).filter(x => x.sc > 0);
  const chosen = ranked.length ? ranked : parts.slice(0, 2).map(s => ({ s }));
  return `Theo **Trang ${hit.page}**:\n` + chosen.map(x => '• ' + clip(x.s, 165)).join('\n');
}
