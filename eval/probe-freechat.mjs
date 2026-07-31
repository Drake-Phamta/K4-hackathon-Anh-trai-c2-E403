/* ══════════════════════════════════════════════════════════════════════════
   PROBE — "chat tự do tới đâu, regex chặn tới đâu?"
   ══════════════════════════════════════════════════════════════════════════
   node eval/probe-freechat.mjs <pages.json> [--core=real|mock]

   Câu hỏi cần trả lời bằng SỐ, không bằng cảm giác: một câu nói đời thường
   gõ vào ô chat thì đi tới LLM, hay bị một regex chặn lại và trả về câu soạn
   sẵn? `classify()` có 20+ cổng chạy TRƯỚC khi LLM được gọi — mỗi cổng là một
   lần "rule-based" có thể xen vào.

   Cách phân biệt: `core_used === 'real'` nghĩa là câu chữ do LLM sinh.
   Không có `core_used` (hoặc 'mock') ở nhân thật nghĩa là **một nhánh soạn
   sẵn đã trả lời thay**, LLM không được hỏi ý kiến lần nào.

   LƯU Ý VỀ CHÍNH PHÉP ĐO NÀY: lượt chạy đầu tiên của nó dán nhãn SAI, vì
   `chatResponse()` gọi LLM thật nhưng quên set `core_used` — nên những câu do
   model viết ("hôm nay tôi thấy hơi nản…") bị đếm nhầm là soạn sẵn. Đã vá ở
   core (`chatResponse` giờ set `real` / `mock-fallback` + `degraded_reason`).
   Ghi lại vì đây đúng kiểu lỗi mà bộ đo sinh ra để bắt, mà lần này nó nằm
   trong chính bộ đo.
   ══════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { askTutor, setDocIndex, setCore } from '../codebase/core.mjs';

const pagesPath = process.argv.find(a => !a.startsWith('--') && a.endsWith('.json'));
const wantCore = (process.argv.find(a => a.startsWith('--core=')) ?? '').split('=')[1] || 'real';
const wantMode = (process.argv.find(a => a.startsWith('--mode=')) ?? '').split('=')[1] || 'doc';
if (!pagesPath){
  console.error('Thiếu tham số.\n  node eval/probe-freechat.mjs <pages.json> [--core=real|mock] [--mode=doc|chat]');
  process.exit(2);
}
const pages = JSON.parse(readFileSync(pagesPath, 'utf8'));
setDocIndex(pages);
setCore(wantCore);

/* Câu người thật gõ khi đang mở slide mà KHÔNG hỏi về nội dung slide. */
const CASES = [
  'xin chào',
  'bạn là ai vậy',
  'cảm ơn bạn nhiều nhé',
  'hôm nay tôi thấy hơi nản, học AI có khó lắm không',
  'theo bạn thì nên học agent trước hay prompt engineering trước',
  'bạn thấy khoá học này thế nào',
  'kể tôi nghe một câu chuyện vui đi',
  'tôi vừa đi làm về mệt quá',
  'bạn có thể nói chuyện phiếm với tôi được không',
  'ừ',
  'ok bạn',
  'tạo cho tôi một bộ quiz',
  'deadline nộp lab 3 là khi nào',
  'giải thích ReAct đơn giản như đang nói với trẻ con',
  'bạn nghĩ AI có thay thế lập trình viên không',
];

/* Chế độ chat KHÔNG cầm tài liệu — ép rỗng đúng như `ui.mjs` làm ở nguồn.
   Bộ đo mà gửi `page_text` xuống trong khi UI thật thì không, là đang đo một
   hệ khác với hệ chạy thật. */
const chat = wantMode === 'chat';
const req = q => ({
  question: q,
  selection: null,
  page_text: chat ? '' : (pages.find(p => p.page === 20)?.text ?? ''),
  document: { id: 'day03', title: 'day03', page_count: pages.length, current_page: 20 },
  history: [],
  mode: chat ? 'chat' : 'doc',
});

console.log(`Nhân: ${wantCore} · chế độ: ${chat ? 'TRÒ CHUYỆN' : 'TÀI LIỆU'}\n`);
let llm = 0, leaked = 0;
for (const q of CASES){
  const r = await askTutor(req(q));
  /* Bất biến v1.3: chế độ chat KHÔNG BAO GIỜ được trả trích dẫn. Kiểm bằng
     code ở đây luôn, đừng để phải soi bằng mắt. */
  if (chat && (r.citations ?? []).length) leaked++;
  const byLlm = r.core_used === 'real';
  if (byLlm) llm++;
  const say = (r.answer || r.clarifying_question || r.refusal_reason || '').replace(/\s+/g, ' ').trim();
  console.log(`${byLlm ? 'LLM   ' : 'SOẠN SẴN'} │ ${q.slice(0, 44).padEnd(45)} │ ${String(r.decision).padEnd(15)} ${String(Math.round((r.confidence ?? 0) * 100)).padStart(3)}%`);
  console.log(`         └─ ${say.slice(0, 110)}`);
}
console.log(`\n${llm}/${CASES.length} câu được LLM trả lời · ${CASES.length - llm} câu bị nhánh soạn sẵn chặn`);
if (chat){
  console.log(leaked
    ? `⚠️  ${leaked} câu RÒ TRÍCH DẪN ở chế độ trò chuyện — vi phạm bất biến v1.3`
    : '✓ không câu nào trả trích dẫn ở chế độ trò chuyện (bất biến v1.3)');
  process.exitCode = leaked ? 1 : 0;
}
