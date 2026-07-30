/* ══════════════════════════════════════════════════════════════════════════
   Kiểm thử core.mjs trên TEXT THẬT của slide — chạy không cần trình duyệt.
   ══════════════════════════════════════════════════════════════════════════
   Cách chạy:
     node test-core.mjs <đường-dẫn-pages.json>

   pages.json = [{page:1, text:"..."}, ...] — sinh bằng dump-pages.py từ file PDF
   trên máy bạn. KHÔNG commit pages.json (là nội dung slide của khoá).

   Mục đích: chốt rằng mỗi kịch bản demo rơi ĐÚNG nhánh quyết định, và
   citation trỏ về trang có thật — trước khi mở trình duyệt.
   ══════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { askTutor, setDocIndex, retrieve, getDoc } from './core.mjs';

const path = process.argv[2];
if (!path){
  console.error('Thiếu tham số.\n  node test-core.mjs <pages.json>');
  process.exit(2);
}
const pages = JSON.parse(readFileSync(path, 'utf8'));
setDocIndex(pages);
console.log(`Tài liệu: ${pages.length} trang · ${pages.reduce((a,p)=>a+p.text.length,0).toLocaleString()} ký tự\n`);

const req = (question, { page = 1, selection = null } = {}) => ({
  question, selection,
  page_text: pages.find(p => p.page === page)?.text ?? '',
  document: { id:'test', title:'test', page_count: pages.length, current_page: page },
  history: [],
});

/* Kịch bản: mỗi dòng = [tên, request, nhánh mong đợi, điều kiện phụ] */
const CASES = [
  /* Từ chối vẫn kèm 1 trang liên quan (từ chối nhưng không bỏ rơi user),
     nên điều kiện là "nêu đúng thứ còn thiếu", không phải "không trích dẫn". */
  ['① không căn cứ — streaming',
    req('LangGraph có hỗ trợ streaming không?', { page: 30 }),
    'no_grounding', r => /streaming/.test(r.refusal_reason) && r.confidence < 0.2],

  ['① không căn cứ — multi-agent (bẫy: deck có "multi-step")',
    req('Deck này nói gì về multi-agent orchestration?', { page: 15 }),
    'no_grounding', r => /multi-agent/.test(r.refusal_reason)],

  ['① không căn cứ — human-in-the-loop',
    req('Slide có nói về human-in-the-loop không?', { page: 37 }),
    'no_grounding', r => /human-in-the-loop/.test(r.refusal_reason)],

  ['KHÔNG được từ chối oan — "multi-step" CÓ trong deck',
    req('Multi-step reasoning nghĩa là gì?', { page: 10 }),
    'answer', r => r.citations.length > 0],

  ['② mơ hồ — đại từ trỏ, không bôi đen',
    req('cái này khác cái kia chỗ nào?', { page: 37 }),
    'clarify', r => !!r.clarifying_question && r.confidence < 0.5],

  ['② mơ hồ — một từ',
    req('sao?', { page: 12 }),
    'clarify', r => !!r.clarifying_question],

  ['③ ngoài phạm vi — xin đáp án Lab',
    req('Làm hộ mình Lab 3 với, cho mình đáp án luôn.', { page: 40 }),
    'out_of_scope', r => !!r.refusal_reason],

  ['③ ngoài phạm vi — deadline',
    req('Deadline nộp bài là mấy giờ?', { page: 4 }),
    'out_of_scope', r => !!r.refusal_reason],

  ['④ tiền đề sai — ReAct = fine-tuning',
    req('ReAct là một kiểu fine-tuning đúng không?', { page: 20 }),
    'answer', r => /tiền đề/i.test(r.answer) && r.citations.length > 0],

  ['④ tiền đề sai — agent luôn tốt hơn',
    req('Agent thì lúc nào cũng tốt hơn chatbot phải không?', { page: 36 }),
    'answer', r => /tiền đề/i.test(r.answer)],

  ['happy — có bôi đen ở Trang 22',
    req('Giải thích đoạn bôi đen ở Trang 22.', {
      page: 22,
      selection: { text: pages.find(p=>p.page===22)?.text.slice(0,220) ?? '', page: 22, rects: null },
    }),
    'answer', r => r.citations.length > 0 && r.confidence > 0.6],

  ['happy — hỏi thẳng không bôi đen',
    req('ReAct loop gồm những bước nào?', { page: 21 }),
    'answer', r => r.citations.length > 0],

  ['happy — thuật ngữ có trong deck',
    req('Tool calling là gì?', { page: 18 }),
    'answer', r => r.citations.length > 0],

  ['thẻ giám khảo — câu lạ nhưng vẫn trong deck',
    req('Khi nào thì nên dùng hybrid pattern?', { page: 1 }),
    'answer', r => r.citations.length > 0],
];

let pass = 0, fail = 0;
const bad = [];

for (const [name, request, want, extra] of CASES){
  const res = await askTutor(request);
  const okDecision = res.decision === want;
  const okExtra = !extra || extra(res);
  const ok = okDecision && okExtra;
  ok ? pass++ : (fail++, bad.push({ name, want, got: res.decision, res }));

  const cites = res.citations.map(c => c.ref).join(',') || '—';
  console.log(
    `${ok ? '✓' : '✗'} ${name.padEnd(44)} ${res.decision.padEnd(13)} ` +
    `tin cậy ${String(Math.round(res.confidence*100)).padStart(3)}%  trích dẫn: ${cites}`
  );
  if (!ok) console.log(`    → mong đợi ${want}${okDecision ? ' (nhánh đúng, điều kiện phụ sai)' : ''}`);
}

/* Kiểm tính toàn vẹn của trích dẫn: mọi quote phải là chữ CÓ THẬT trong trang. */
console.log('\n── Kiểm trích dẫn có thật trong tài liệu ──');
const doc = getDoc();
let citeChecked = 0, citeBad = 0;
for (const [, request] of CASES){
  const res = await askTutor(request);
  for (const c of res.citations){
    citeChecked++;
    const page = doc.index.find(p => p.page === c.page);
    if (!page || !page.text.includes(c.quote.slice(0, 40))){
      citeBad++;
      console.log(`  ✗ Trang ${c.ref}: quote không khớp text trang — "${c.quote.slice(0,50)}…"`);
    }
  }
}
console.log(`  ${citeBad === 0 ? '✓' : '✗'} ${citeChecked - citeBad}/${citeChecked} trích dẫn khớp nguyên văn text trang`);

/* Phép phủ định: thứ KHÔNG có trong tài liệu phải bị đánh dấu missing,
   thứ CÓ thì tuyệt đối không được đánh dấu missing (từ chối oan còn tệ hơn). */
console.log('\n── Kiểm phép phủ định (missing) ──');
let negBad = 0;
const NEG = [
  ['streaming',        false], ['multi-agent',   false],
  ['fine-tuning',      false], ['human-in-the-loop', false],
  ['multi-step',       true ], ['tool calling',  true ],
  ['ReAct',            true ], ['LangGraph',     true ],
];
for (const [w, shouldExist] of NEG){
  const { missing } = retrieve(w, null);
  const flagged = missing.length > 0;
  const ok = flagged === !shouldExist;
  if (!ok) negBad++;
  console.log(`  ${ok ? '✓' : '✗'} "${w}" ${shouldExist ? 'CÓ trong deck' : 'không có'} → ${flagged ? 'missing=' + JSON.stringify(missing) : 'coi là có căn cứ'}`);
}

console.log(`\n${'═'.repeat(64)}
KẾT QUẢ
  kịch bản đúng nhánh : ${pass}/${CASES.length}
  trích dẫn hợp lệ    : ${citeChecked - citeBad}/${citeChecked}
  phép phủ định       : ${NEG.length - negBad}/${NEG.length}`);
if (fail){
  console.log('\nChi tiết case sai:');
  bad.forEach(b => console.log(`  • ${b.name}: mong ${b.want}, nhận ${b.got}`));
}
process.exit(fail || citeBad || negBad ? 1 : 0);
