/* ══════════════════════════════════════════════════════════════════════════
   Chạy trọn bộ golden_set.csv qua askTutor() và in bảng kết quả.

   Cách chạy:
     node eval/run-eval.mjs <pages.json> [--md eval/ket-qua-luot1.md]

   pages.json sinh bằng codebase/dump-pages.py từ PDF trên máy cá nhân.
   KHÔNG commit pages.json (quy định bảo mật data pack).

   Case nào trỏ tới trang vượt quá số trang của tài liệu đang nạp sẽ được
   ghi SKIP — không tính vào mẫu số, và có ghi rõ trong bảng.
   ══════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';
import { askTutor, setDocIndex, getDoc } from '../codebase/core.mjs';
import { CHECKS } from './checks.mjs';

/* ── QUALITY BAR — chốt trước 23:59 N1, KHÔNG sửa sau đó (rubric R4) ────── */
const BAR = {
  tong_the: 0.80,          // ≥80% case đạt toàn bộ check bắt buộc
  C3_khong_day_nguoc: 1.00, // tuyệt đối — đây là pain gốc của cả dự án
  C1_quote_nguyen_van: 1.00,// tuyệt đối — bịa quote là mất sạch giá trị
};

/* ── đọc CSV tối giản (có hỗ trợ ô bọc ngoặc kép) ──────────────────────── */
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length > 1 && r[0]).map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const pagesPath = process.argv[2];
if (!pagesPath) { console.error('Thiếu tham số.\n  node eval/run-eval.mjs <pages.json>'); process.exit(2); }
const mdIdx = process.argv.indexOf('--md');
const mdOut = mdIdx > -1 ? process.argv[mdIdx + 1] : null;

const pages = JSON.parse(readFileSync(pagesPath, 'utf8'));
setDocIndex(pages);
const doc = getDoc();
const cases = parseCSV(readFileSync(new URL('./golden_set.csv', import.meta.url), 'utf8'));

console.log(`Tài liệu: ${pages.length} trang · Golden set: ${cases.length} case\n`);

const results = [];
for (const c of cases) {
  const page = Number(c.page);
  if (page > doc.total) {
    results.push({ c, skip: true, reason: `trang ${page} > ${doc.total} trang của tài liệu đang nạp` });
    continue;
  }
  const req = {
    question: c.question,
    selection: c.selection ? { text: c.selection, page, rects: null } : null,
    page_text: pages.find(p => p.page === page)?.text ?? '',
    document: { id: 'eval', title: pagesPath, page_count: pages.length, current_page: page },
    history: [],
  };
  let res, err = null;
  try { res = await askTutor(req); } catch (e) { err = e; }
  if (err) { results.push({ c, skip: false, crash: String(err.message ?? err), checks: [] }); continue; }

  const ids = c.checks.split(/[,\s]+/).filter(Boolean);
  const checks = ids.map(id => {
    const k = CHECKS[id];
    if (!k) return { id, pass: false, why: 'check không tồn tại' };
    try { return { id, ten: k.ten, ...k.run(res, c, doc) }; }
    catch (e) { return { id, pass: false, why: `lỗi khi kiểm: ${e.message}` }; }
  });
  results.push({ c, res, checks, pass: checks.every(x => x.pass) });
}

/* ── bảng kết quả ──────────────────────────────────────────────────────── */
const ran = results.filter(r => !r.skip);
const passed = ran.filter(r => r.pass);
const line = (s = '─') => s.repeat(104);

console.log(line('═'));
console.log('KẾT QUẢ TỪNG CASE');
console.log(line('═'));
for (const r of results) {
  if (r.skip) { console.log(`SKIP ${r.c.id} ${r.c.lop.padEnd(16)} ${r.reason}`); continue; }
  if (r.crash) { console.log(`CRASH ${r.c.id} — ${r.crash}`); continue; }
  const tag = r.pass ? 'ĐẠT ' : 'HỎNG';
  console.log(`${tag} ${r.c.id} ${r.c.lop.padEnd(16)} ${(r.c.question ?? '').slice(0, 44).padEnd(44)} → ${r.res.decision}`);
  for (const k of r.checks.filter(x => !x.pass)) console.log(`       ✗ ${k.id} ${k.ten ?? ''}: ${k.why}`);
}

/* ── đối chiếu quality bar ─────────────────────────────────────────────── */
const rate = ran.length ? passed.length / ran.length : 0;
const perCheck = id => {
  const rel = ran.filter(r => r.checks.some(k => k.id === id));
  const ok = rel.filter(r => r.checks.find(k => k.id === id).pass);
  return { n: rel.length, ok: ok.length, rate: rel.length ? ok.length / rel.length : 1 };
};
const c1 = perCheck('C1'), c3 = perCheck('C3');

console.log('\n' + line('═'));
console.log('ĐỐI CHIẾU QUALITY BAR');
console.log(line('═'));
const row = (ten, got, bar) => {
  const ok = got >= bar;
  console.log(`${ten.padEnd(38)} ${(got * 100).toFixed(1).padStart(6)}%  bar ${(bar * 100).toFixed(0).padStart(3)}%  ${ok ? 'ĐẠT' : 'CHƯA ĐẠT'}`);
  return ok;
};
const ok1 = row('Tổng thể (case đạt mọi check)', rate, BAR.tong_the);
const ok2 = row('C3 · Không đẩy ngược việc', c3.rate, BAR.C3_khong_day_nguoc);
const ok3 = row('C1 · Quote nguyên văn', c1.rate, BAR.C1_quote_nguyen_van);
console.log(line());
console.log(`Chạy ${ran.length}/${cases.length} case (${results.filter(r => r.skip).length} SKIP) · đạt ${passed.length} · hỏng ${ran.length - passed.length}`);
console.log(`KẾT LUẬN: ${ok1 && ok2 && ok3 ? 'QUA quality bar' : 'CHƯA QUA quality bar'}`);

/* ── phân rã theo lớp chỗ khó ──────────────────────────────────────────── */
console.log('\nTheo lớp chỗ khó:');
for (const lop of [...new Set(cases.map(c => c.lop))]) {
  const g = ran.filter(r => r.c.lop === lop);
  if (g.length) console.log(`  ${lop.padEnd(18)} ${g.filter(r => r.pass).length}/${g.length} = ${(g.filter(r => r.pass).length / g.length * 100).toFixed(0)}%`);
}

if (mdOut) {
  const md = [
    `# Kết quả eval — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, '',
    `Tài liệu: \`${pagesPath}\` (${pages.length} trang) · Core: \`${process.env.AI_CORE ?? 'xem core.mjs'}\``, '',
    `| Case | Lớp | Câu hỏi | Nhánh | Kết quả | Check hỏng |`,
    `|---|---|---|---|---|---|`,
    ...results.map(r => r.skip
      ? `| ${r.c.id} | ${r.c.lop} | ${r.c.question} | — | SKIP | ${r.reason} |`
      : `| ${r.c.id} | ${r.c.lop} | ${r.c.question} | ${r.res?.decision ?? 'CRASH'} | ${r.pass ? 'ĐẠT' : 'HỎNG'} | ${r.checks.filter(k => !k.pass).map(k => `${k.id}: ${k.why}`).join('; ') || '—'} |`),
    '', '## Đối chiếu quality bar', '',
    `| Chiều | Đo được | Bar | Kết luận |`, `|---|---|---|---|`,
    `| Tổng thể | ${(rate * 100).toFixed(1)}% | ${BAR.tong_the * 100}% | ${ok1 ? 'ĐẠT' : 'CHƯA ĐẠT'} |`,
    `| C3 Không đẩy ngược | ${(c3.rate * 100).toFixed(1)}% | 100% | ${ok2 ? 'ĐẠT' : 'CHƯA ĐẠT'} |`,
    `| C1 Quote nguyên văn | ${(c1.rate * 100).toFixed(1)}% | 100% | ${ok3 ? 'ĐẠT' : 'CHƯA ĐẠT'} |`,
  ].join('\n');
  writeFileSync(mdOut, md, 'utf8');
  console.log(`\n[đã ghi bảng kết quả ra ${mdOut}]`);
}
process.exit(ok1 && ok2 && ok3 ? 0 : 1);
