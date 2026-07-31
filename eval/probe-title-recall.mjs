/* ══════════════════════════════════════════════════════════════════════════
   PROBE — "tìm được trang bằng chính TIÊU ĐỀ của nó không?"
   ══════════════════════════════════════════════════════════════════════════
   node eval/probe-title-recall.mjs <pages.json>

   VÌ SAO CẦN PHÉP ĐO NÀY: golden set chấm nhánh quyết định, quote nguyên văn,
   confidence… nhưng KHÔNG chiều nào hỏi "trang được trích có phải trang ĐÚNG
   không". 24/42 case có trích dẫn mà không case nào khai `cite_pages` — tức
   phần lớn citation chưa từng bị kiểm về độ liên quan. Bộ đo không thể trượt
   thì không phải phép đo.

   Phép thử này khách quan, không cần ai chấm tay: lấy tiêu đề THẬT của từng
   trang làm câu hỏi. Nếu hỏi "Tool Registry: Khai Báo Tay Chân Cho Agent" mà
   retrieval không trả về chính trang đó thì đấy là lỗi không cãi được — không
   có cách diễn giải nào khiến nó thành đúng.

   Đây là phép đo HỒI QUY: chạy trước và sau mỗi lần đụng vào retrieve().
   ══════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { retrieve, setDocIndex } from '../codebase/core.mjs';

const pagesPath = process.argv[2];
if (!pagesPath){
  console.error('Thiếu tham số.\n  node eval/probe-title-recall.mjs <pages.json>');
  process.exit(2);
}
const pages = JSON.parse(readFileSync(pagesPath, 'utf8'));
setDocIndex(pages);

/* Cùng luật cắt tiêu đề với pageTitle() trong core.mjs */
const titleOf = t => (String(t).split(/\s{2,}|\||■/)[0] || '').trim().slice(0, 60);

let top1 = 0, top3 = 0, total = 0;
const misses = [];
for (const p of pages){
  const title = titleOf(p.text).replace(/\s+/g, ' ').trim();
  /* Trang phân mục chỉ có vài chữ thì tiêu đề không đủ đặc trưng để làm câu
     hỏi — bỏ qua, không tính vào mẫu số (thà hụt mẫu còn hơn thổi tỷ lệ). */
  if (title.length < 8) continue;
  total++;
  const got = retrieve(title, null, null).hits.map(h => h.page);
  if (got[0] === p.page) top1++;
  if (got.includes(p.page)) top3++;
  else misses.push({ page: p.page, title, got });
}

console.log(`Hỏi bằng ĐÚNG tiêu đề trang — ${total} trang có tiêu đề đủ dài\n`);
console.log(`  top-1 đúng : ${top1}/${total} = ${(top1 / total * 100).toFixed(1)}%`);
console.log(`  top-3 đúng : ${top3}/${total} = ${(top3 / total * 100).toFixed(1)}%`);
if (misses.length){
  console.log(`\nKhông tìm nổi CHÍNH NÓ trong top-3 (${misses.length} trang):`);
  for (const m of misses){
    console.log(`  tr.${String(m.page).padStart(2)}  "${m.title.slice(0, 48)}"  → trả về ${m.got.join(',') || '(rỗng)'}`);
  }
}
process.exitCode = misses.length ? 1 : 0;
