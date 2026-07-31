/* ══════════════════════════════════════════════════════════════════════════
   Kiểm LÁT CẮT — "page_text là nguồn sự thật"
   ══════════════════════════════════════════════════════════════════════════
   Cách chạy:
     node test-intents.mjs <đường-dẫn-pages.json>

   Vì sao có file này tách khỏi test-core.mjs:
   test-core.mjs canh 4 lớp chỗ khó. File này canh đúng một thứ — câu hỏi
   NEO TRANG phải được trả lời từ text trang đang xem, và việc mở rộng đó
   KHÔNG được chọc lỗ vào cổng chống bịa ①.

   Nhóm A — 6 dạng câu hỏi gây pain nhiều nhất, lấy nguyên văn từ chatlog
   thật (94/307 case lỗi = 30,6% thuộc dạng neo trang). Trước bản sửa: 2/6.

   Nhóm B — 4 BẪY HỒI QUY. Đây là phần dễ mất nhất: mở rộng grounding rồi
   vô tình cho lọt case bịa. Mỗi bẫy canh một đường lọt cụ thể.
   ══════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { askTutor, setDocIndex, parseNamedPages, norm } from './core.mjs';

const path = process.argv[2];
if (!path){
  console.error('Thiếu tham số.\n  node test-intents.mjs <pages.json>');
  process.exit(2);
}
const pages = JSON.parse(readFileSync(path, 'utf8'));
setDocIndex(pages);
const textOf = n => pages.find(p => p.page === n)?.text ?? '';

const req = (question, { page = 1, selection = null, pageText = null } = {}) => ({
  question, selection,
  page_text: pageText != null ? pageText : textOf(page),
  document: { id: 'test', title: 'day03', page_count: pages.length, current_page: page },
  history: [],
});

/* ── Nhóm A — neo trang: phải trả lời, phải trích đúng trang đã neo ────── */
const ANCHORED = [
  ['T0649  tóm tắt nội dung chính trong slide này',
   req('tóm tắt nội dung chính trong slide này', { page: 37 }), 37],

  ['T0905  tóm gọn nội dung quan trọng nhất trong day 04 này',
   req('tóm gọn những nội dung quan trọng nhất trong day 04 này', { page: 22 }), 22],

  ['T0769  giải thích nghĩa chi tiết của trang 4',
   req('giải thích nghĩa chi tiết của trang 4', { page: 4 }), 4],

  ['T1195  giải thích slide hiện tại',
   req('giải thích slide hiện tại', { page: 21 }), 21],

  /* Gõ KHÔNG DẤU — trước đây "niem" bị coi là trọng tâm còn thiếu */
  ['T1157  gõ không dấu: khai niem quan trong nhat',
   req('Giai thich khai niem quan trong nhat trong slide nay va cho vi du', { page: 16 }), 16],

  ['T0122  tóm tắt hết slide trong vài câu đi',
   req('tóm tắt hết slide trong vài câu đi', { page: 12 }), 12],

  /* Có bôi đen — trang neo là trang của đoạn chọn */
  ['có bôi đen ở Trang 22 + hỏi rộng',
   req('giải thích đoạn này giúp mình', {
     page: 22, selection: { text: textOf(22).slice(0, 200), page: 22, rects: null },
   }), 22],

  /* CONTRACT §5: user bôi đen Trang 5 rồi cuộn xuống Trang 9 — câu hỏi vẫn
     nói về Trang 5, không được trả lời bằng trang đang hiển thị. */
  ['selection Trang 5 nhưng đang xem Trang 9 → phải neo Trang 5',
   req('tóm tắt đoạn này', {
     page: 9, selection: { text: textOf(5).slice(0, 200), page: 5, rects: null },
   }), 5],
];

/* ── Nhóm B — bẫy hồi quy: mở rộng grounding không được tạo lỗ bịa ────── */
const TRAPS = [
  /* Bẫy 1 — đường lọt nguy hiểm nhất. Nếu "có selection" là đủ để đi đường
     page_text, thì bôi đen bất kỳ đoạn nào rồi hỏi về thứ không có trong
     tài liệu sẽ ra câu trả lời bịa nghe rất có lý. */
  ['BẪY 1  bôi đen + hỏi term VẮNG MẶT (streaming) → vẫn phải từ chối',
   req('LangGraph có hỗ trợ streaming không?', {
     page: 30, selection: { text: textOf(30).slice(0, 200), page: 30, rects: null },
   }),
   r => r.decision === 'no_grounding' && /streaming/.test(r.refusal_reason ?? '')],

  ['BẪY 2  deictic KHÔNG neo trang → vẫn phải hỏi lại (②)',
   req('cái này khác cái kia chỗ nào?', { page: 37 }),
   r => r.decision === 'clarify' && !!r.clarifying_question],

  ['BẪY 3  bôi đen + tiền đề sai → vẫn phải sửa hiểu lầm (④)',
   req('ReAct là một kiểu fine-tuning đúng không?', {
     page: 20, selection: { text: textOf(20).slice(0, 200), page: 20, rects: null },
   }),
   r => r.decision === 'answer' && /tiền đề/i.test(r.answer)],
];

let pass = 0, fail = 0;

console.log(`Tài liệu: ${pages.length} trang\n`);
console.log('── Nhóm A · câu hỏi neo trang (phải trả lời từ text trang) ──');
for (const [name, request, wantPage] of ANCHORED){
  const r = await askTutor(request);
  const ok = r.decision === 'answer' && r.citations.some(c => c.page === wantPage);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(52)} ${r.decision.padEnd(13)}` +
              ` neo Tr.${wantPage} · trích dẫn: ${r.citations.map(c => c.ref).join(',') || '—'}`);
  if (!ok) console.log(`      → mong đợi answer + có trích dẫn Trang ${wantPage}`);
}

console.log('\n── Nhóm B · bẫy hồi quy (mở rộng không được tạo lỗ bịa) ──');
for (const [name, request, check] of TRAPS){
  const r = await askTutor(request);
  const ok = check(r);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(52)} ${r.decision.padEnd(13)}` +
              ` ${(r.refusal_reason ?? '').slice(0, 40)}`);
}

/* Bất biến #1 — mọi quote phải cắt nguyên văn từ text trang. Route mới sinh
   citation theo cách mới, nên phải kiểm lại chứ không tin là còn đúng. */
console.log('\n── Bất biến #1 · trích dẫn cắt nguyên văn ──');
let cChecked = 0, cBad = 0;
const flat = s => String(s).replace(/\s+/g, ' ').trim();
for (const [, request] of [...ANCHORED, ...TRAPS]){
  const r = await askTutor(request);
  for (const c of r.citations){
    cChecked++;
    if (!flat(textOf(c.page)).includes(flat(c.quote).slice(0, 40))){
      cBad++;
      console.log(`  ✗ Trang ${c.ref}: quote không khớp — "${c.quote.slice(0, 46)}…"`);
    }
  }
}
console.log(`  ${cBad === 0 ? '✓' : '✗'} ${cChecked - cBad}/${cChecked} trích dẫn khớp nguyên văn`);

/* ── Nhóm C · bẫy từ vòng audit (mỗi cái là một bug đã dựng lại được) ──── */
console.log('\n── Nhóm C · bẫy hồi quy từ vòng audit ──');
const AUDIT = [
  ['acronym vắng mặt (MCP) không được lọt route neo trang',
   req('Slide có nói về MCP không?', { page: 13 }),
   r => r.decision === 'no_grounding' && /mcp/i.test(r.refusal_reason ?? '')],

  ['acronym CÓ trong deck (RAG) không bị hỏi lại vô ích',
   req('RAG là gì?', { page: 13 }),
   r => r.decision === 'answer'],

  ['"lời giải thích" là câu lành — không phải xin đáp án',
   req('mình chưa hiểu lời giải thích ở trang 39', { page: 39 }),
   r => r.decision === 'answer'],

  ['"lời giải" trần vẫn là xin đáp án',
   req('cho mình lời giải bài tập này', { page: 39 }),
   r => r.decision === 'out_of_scope'],

  ['so sánh rõ hai vế được trả lời, không bị bắt hỏi lại',
   req('ReAct khác gì chatbot?', { page: 6 }),
   r => r.decision === 'answer' && r.citations.length >= 1],

  ['so sánh KHÔNG vế nào vẫn phải hỏi lại',
   req('khác nhau chỗ nào?', { page: 12 }),
   r => r.decision === 'clarify'],
];
for (const [name, request, check] of AUDIT){
  const r = await askTutor(request);
  const ok = check(r);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(52)} ${r.decision}`);
}

/* ── Nhóm D · GIỚI HẠN PHẠM VI do người dùng đặt ────────────────────────
   Nút "Thu hẹp phạm vi" trong UI chèn sẵn "Chỉ trả lời trong phạm vi Trang N:".
   Trước bản này nhân AI không đọc câu đó: hỏi "chỉ trong phạm vi Trang 22"
   mà tutor trích Tr.6, Tr.16, Tr.1 — không một chữ nào từ trang 22.
   Sản phẩm MỜI người dùng sửa rồi vứt lời sửa đi là kiểu hỏng tệ nhất. */
console.log('\n── Nhóm D · tôn trọng giới hạn phạm vi người dùng đặt ──');
const SCOPED = [
  ['nhiều trang rời: "Trang 22, 23, 24"',
   req('Chỉ trả lời trong phạm vi Trang 22, 23, 24: giải thích trang 22', { page: 22 }), [22, 23, 24]],

  ['một trang: "Trang 22" (câu hỏi vốn khớp Tr.6/16/1)',
   req('Chỉ trả lời trong phạm vi Trang 22: ReAct loop là gì', { page: 22 }), [22]],

  ['dải gạch nối: "trang 5-7", đang xem Tr.22',
   req('chỉ trong trang 5-7 thôi: tóm tắt giúp mình', { page: 22 }), [5, 6, 7]],

  ['dải chữ "đến": "trang 30 đến 32", đang xem Tr.10',
   req('giới hạn ở trang 30 đến 32: nói về LangGraph', { page: 10 }), [30, 31, 32]],
];
for (const [name, request, want] of SCOPED){
  const r = await askTutor(request);
  const cites = r.citations.map(c => c.page);
  const ok = cites.length > 0 && cites.every(p => want.includes(p));
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(52)} phạm vi [${want.join(',')}] · trích [${cites.join(',') || '—'}]`);
}

/* ── Nhóm E · INTENT không phải "hỏi bài" ────────────────────────────────
   Ba lỗi người dùng thật bắt được khi demo, mỗi cái một kiểu sai cỡ:
   · "chào bạn" → tutor hỏi lại "mình chưa chắc 'chào bạn' trỏ vào đâu"
   · "ví dụ NGOÀI slides" → answer 94% (chữ "ngoài" khớp "ngoài context window")
   · "ví dụ tương tự khác" → answer 94% bằng một trang bất kỳ, hoặc lặp lại */
console.log('\n── Nhóm E · nhận diện intent, trả lời đúng cỡ ──');
const INTENT = [
  ['chào hỏi → chào lại + nói phạm vi, KHÔNG hỏi "trỏ vào đâu"',
   req('chào bạn', { page: 1 }),
   r => r.decision === 'clarify' && /chào bạn/i.test(r.answer)
        && !/trỏ vào đâu/i.test(r.answer)],

  ['cảm ơn có tiểu từ ("cảm ơn nhé") không bị đem đi tra cứu',
   req('cảm ơn nhé', { page: 1 }),
   r => r.decision === 'clarify' && r.citations.length === 0],

  ['"bạn làm được gì" → nói phạm vi, không tra tài liệu',
   req('bạn làm được gì', { page: 1 }),
   r => r.decision === 'clarify' && /trích dẫn|số trang/i.test(r.answer)],

  ['xin ví dụ NGOÀI slides → không tra tài liệu, đưa nút mở cửa',
   req('một ví dụ nằm ngoài slides', { page: 22 }),
   r => r.decision === 'no_grounding' && r.citations.length === 0
        && (r.follow_ups ?? []).some(f => f?.action === 'answer_outside')],

  ['"kiến thức chung" cũng là xin ra ngoài tài liệu',
   req('cho mình ví dụ ngoài tài liệu đi', { page: 22 }),
   r => r.decision === 'no_grounding'],
];
for (const [name, request, check] of INTENT){
  const r = await askTutor(request);
  const ok = check(r);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(56)} ${r.decision}`);
}

/* ── Nhóm F · hỏi cấu trúc CẢ tài liệu ──────────────────────────────────
   "Tài liệu này gồm những phần nào?" từng bị hiểu thành hỏi TRANG ĐANG XEM
   (chữ "phần" nằm trong PAGE_ANCHOR) → đứng ở Trang 1 thì nhận mô tả trang
   bìa. Chip gợi ý trong câu chào dẫn thẳng vào lỗi này. */
console.log('\n── Nhóm F · hỏi cấu trúc cả tài liệu ──');
const isOutline = r => /mục lục ở \*\*Trang/.test(r.answer ?? '');
const OUTLINE = [
  ['"Tài liệu này gồm những phần nào?" (đứng ở trang bìa)', req('Tài liệu này gồm những phần nào?', { page: 1 }), true],
  ['"mục lục đâu"',                                          req('mục lục đâu', { page: 1 }), true],
  ['"cấu trúc bài giảng thế nào" (động từ đứng trước)',      req('cấu trúc bài giảng thế nào', { page: 22 }), true],
  ['"outline của deck này"',                                 req('outline của deck này', { page: 5 }), true],
  ['"trang này gồm những phần nào" → hỏi TRANG, không phải tài liệu',
                                                             req('trang này gồm những phần nào', { page: 22 }), false],
];
for (const [name, request, want] of OUTLINE){
  const r = await askTutor(request);
  const ok = isOutline(r) === want && r.decision === 'answer' && r.citations.length >= 1;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(56)} ${want ? 'dàn ý' : 'câu hỏi thường'} · trích [${r.citations.map(c => c.ref).join(',')}]`);
}
/* Dàn ý phải trỏ ĐÚNG trang mở đầu từng phần — trang bìa nhắc lại gần hết
   tên chương nên từng cướp mục "ReAct Pattern" và "Chatbot vs Agent". */
{
  const r = await askTutor(req('Tài liệu này gồm những phần nào?', { page: 1 }));
  const want = [[/ReAct Pattern/, 19], [/Chatbot vs Agent/, 35], [/Kiến Trúc Agent/, 15]];
  const ok = want.every(([re, pg]) =>
    new RegExp(re.source + `[^\\n]*Trang ${pg}\\b`).test(r.answer));
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${'mỗi phần trỏ đúng trang mở đầu (không dồn về trang bìa)'.padEnd(56)} ${ok ? 'Tr.19/35/15 đúng' : 'SAI trang'}`);
}

/* ── Nhóm G · 7 intent bổ sung sau vòng người dùng test ─────────────────
   Mỗi dòng là một câu người dùng thật gõ mà hệ thống từng trả lời SAI với
   độ tự tin cao. Case ÂM đi kèm quan trọng ngang case dương — ngay lần chạy
   đầu sau refactor, `DOC_SUMMARY_RE` đã cướp mất "Deck này nói gì về
   multi-agent" và vượt mặt luôn cổng chống bịa ①. */
console.log('\n── Nhóm G · 7 intent bổ sung ──');
const INTENT7 = [
  ['① tóm tắt CẢ tài liệu → dàn ý, không phải 1 trang ngẫu nhiên',
   req('tóm tắt toàn bộ tài liệu', { page: 1 }),
   r => r.decision === 'answer' && /\d+ phần/.test(r.answer) && r.citations.length >= 2],

  ['② "sai rồi" → hỏi lại, KHÔNG tra về trang Anti-Patterns',
   req('sai rồi, không phải vậy', { page: 22 }),
   r => r.decision === 'clarify' && !!r.clarifying_question
        && !/Anti-Patterns/i.test(r.answer)],

  ['③ "trang tiếp theo" ở Tr.22 → nội dung Tr.23',
   req('trang tiếp theo nói gì', { page: 22 }),
   r => r.decision === 'answer' && r.citations.some(c => c.page === 23)],

  ['③b "trang trước" ở Tr.22 → nội dung Tr.21',
   req('trang trước nói gì', { page: 22 }),
   r => r.decision === 'answer' && r.citations.some(c => c.page === 21)],

  ['④ so sánh Tr.22 và Tr.35 → trích dẫn CẢ HAI',
   req('so sánh trang 22 và trang 35', { page: 22 }),
   r => r.decision === 'answer'
        && r.citations.some(c => c.page === 22) && r.citations.some(c => c.page === 35)],

  ['⑤ "bạn dùng model gì" → nói về mình, không trích tài liệu',
   req('bạn dùng model gì', { page: 22 }),
   r => r.decision === 'clarify' && r.citations.length === 0
        && /trích dẫn|kiểm/i.test(r.answer)],

  ['⑥ "dịch sang tiếng Anh" ở nhân mock → nói thẳng là không làm được',
   req('dịch trang này sang tiếng Anh', { page: 22 }),
   r => r.decision === 'clarify' && /mock|mô hình ngôn ngữ/i.test(r.answer)],

  ['⑦ câu rỗng → lời mời gõ, không quote chuỗi rỗng',
   req('   ', { page: 22 }),
   r => r.decision === 'clarify' && !/""/.test(r.answer)],
];
for (const [name, request, check] of INTENT7){
  const r = await askTutor(request);
  const ok = check(r);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(58)} ${r.decision}`);
}

console.log('\n── Nhóm G2 · case ÂM: intent mới KHÔNG được bắt nhầm ──');
const NEG7 = [
  ['"Deck này nói gì về multi-agent" → vẫn phải TỪ CHỐI (cổng ① thắng)',
   req('Deck này nói gì về multi-agent orchestration?', { page: 15 }),
   r => r.decision === 'no_grounding'],

  ['"so sánh ReAct với chatbot" → so sánh KHÁI NIỆM, không phải trang',
   req('so sánh ReAct với chatbot', { page: 6 }),
   r => r.decision === 'answer' && r.citations.length >= 1],

  ['"tóm tắt hết slide trong vài câu" (T0122) → vẫn là câu hỏi cấp TRANG',
   req('tóm tắt hết slide trong vài câu đi', { page: 12 }),
   r => r.decision === 'answer' && r.citations.some(c => c.page === 12)],

  /* `\bdich\b` trần từng nuốt "dịch VỤ" — một câu hỏi nội dung lành bị trả về
     clarify "cần LLM". Đây đúng là kiểu lỗi mà case âm sinh ra để bắt. */
  ['"dịch vụ nào hỗ trợ ReAct" → là câu hỏi NỘI DUNG, không phải lệnh dịch',
   req('dịch vụ nào hỗ trợ ReAct', { page: 30 }),
   r => r.decision === 'answer' && r.citations.length >= 1],

  /* Điểm retrieval chỉ có idf → mọi trang nhắc tới "ReAct" hoà nhau, và thế hoà
     phá theo thứ tự trang nên luôn ra Tr.1-2-3: bìa, mục lục, mục tiêu. */
  ['hỏi trống một thuật ngữ → KHÔNG được trích bìa/mục lục',
   req('ReAct', { page: 22 }),
   r => r.decision === 'answer' && !r.citations.some(c => c.page <= 2)],

  /* Bắt được ở vòng kiểm trình duyệt: người dùng tự giới hạn "chỉ Trang 22",
     bị từ chối, và lời từ chối nói "KHÔNG TRANG NÀO TRONG TÀI LIỆU nhắc tới
     ReAct" — một câu SAI VỀ TÀI LIỆU (ReAct có ở 17/44 trang). Nói sai kiểu
     này hại hơn bịa: người dùng tin là tài liệu thiếu rồi bỏ đi. */
  ['từ chối trong phạm vi hẹp → phải nói đúng ĐÃ TRA TỚI ĐÂU',
   req('Chỉ trả lời trong phạm vi Trang 22: ReAct là gì', { page: 22 }),
   r => r.decision === 'no_grounding'
        && /Trang 22/.test(r.answer)
        // câu SAI phải biến mất: "(Không trang nào|…) trong tài liệu nhắc tới X"
        && !/(không\s+(trang nào|có trang nào)|tài liệu).{0,40}(nhắc tới|đề cập)/i.test(r.answer)
        && /chưa tra/i.test(r.answer)],       // và phải nói rõ phần chưa tra

  /* Chip kind='question' được bấm là NHÃN bị gửi đi nguyên văn → nhãn phải là
     câu hỏi gõ được. "Bỏ giới hạn, tra cả tài liệu" gửi đi là một câu vô nghĩa. */
  ['mọi chip câu hỏi phải là câu hỏi GÕ ĐƯỢC, không phải lời mô tả',
   req('Chỉ trả lời trong phạm vi Trang 22: ReAct là gì', { page: 22 }),
   r => (r.follow_ups ?? []).filter(f => f.kind === 'question')
          .every(f => !/^(bỏ|xoá|mở rộng) giới hạn/i.test(f.label))],

  /* Điều hướng tương đối + thuật ngữ trong cùng một câu. Trước đây `decisive`
     đẩy hẳn sang nhánh tra cứu toàn tài liệu và trang vừa quy ra bị bỏ rơi.
     Case này còn canh một chuyện nữa: nhân mock từng gọi LẠI `isPageScoped()`
     thay vì dùng kết quả của bộ định tuyến → hai nhân trôi khỏi nhau. */
  ['điều hướng tương đối KÈM thuật ngữ → vẫn phải trích trang vừa quy ra',
   req('trang kế tiếp giải thích gì về ReAct', { page: 20 }),
   r => r.decision === 'answer' && r.citations.some(c => c.page === 21)],

  /* Người dùng test tay bắt được: "bạn có thể làm gf" (gõ sai một chữ) rơi
     xuống ② rồi bị đáp "bạn bôi đen giúp mình đoạn cụ thể trên slide nhé" —
     với một câu hỏi KHÔNG hề nói về slide. Luật cũ là regex liệt kê 6 cách
     nói; trong 12 cách hỏi tự nhiên cùng một ý nó bắt 4. */
  ['hỏi về năng lực, gõ sai chữ "gì" → vẫn phải hiểu là hỏi về mình',
   req('bạn có thể làm gf', { page: 1 }),
   r => r.decision === 'clarify' && /trích dẫn|trang/i.test(r.answer)
        && !/bôi đen/i.test(r.clarifying_question ?? '')],

  ['"help" trần → hướng dẫn năng lực, không phải đòi bôi đen',
   req('help', { page: 1 }),
   r => r.decision === 'clarify' && !/bôi đen/i.test(r.clarifying_question ?? '')],
];
/* ── Nhóm G3 · câu KHÔNG PHẢI câu hỏi thì KHÔNG được trả lời bừa ────────
   Đây là mặt kia của "cứng nhắc": bot không chỉ từ chối máy móc, nó còn TRẢ
   LỜI TỰ TIN những câu chẳng ai hỏi. Không thuật ngữ + không neo trang +
   không bôi đen ⇒ tra keyword chỉ còn từ tiếng Việt thông thường để khớp,
   nên nó luôn khớp trúng thứ gì đó rồi trả 3 trang ngẫu nhiên với 90%. */
const NOT_A_QUESTION = [
  ['"ok cảm ơn nhé" → lời cảm ơn, KHÔNG được trả về trang nào',
   req('ok cảm ơn nhé', { page: 22 }),
   r => r.decision !== 'answer' && r.citations.length === 0],

  ['"khó quá" → lời than, không phải câu hỏi nội dung',
   req('khó quá', { page: 22 }),
   r => r.decision !== 'answer'],

  ['"mình chưa hiểu" (chưa có lượt nào trước) → hỏi lại, không đoán',
   req('mình chưa hiểu', { page: 22 }),
   r => r.decision === 'clarify' && r.citations.length === 0],

  /* Mặt ngược lại: "tóm tắt" trần LÀ câu hỏi thật — dạng chiếm 80/307 case
     lỗi trong chatlog. Chặn nhầm nó là chặn đúng thứ sản phẩm sinh ra để sửa. */
  ['"tóm tắt" trần khi đang mở Tr.22 → tóm tắt ĐÚNG Tr.22',
   req('tóm tắt', { page: 22 }),
   r => r.decision === 'answer' && r.citations.some(c => c.page === 22)],
];
for (const [name, request, check] of NOT_A_QUESTION){
  const r = await askTutor(request);
  const ok = check(r);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(58)} ${r.decision}`);
}

/* "chưa hiểu" SAU một lượt có trích dẫn → phải bám đúng trang lượt trước. */
{
  await askTutor(req('giải thích trace ở trang này', { page: 22 }));
  const r = await askTutor(req('mình chưa hiểu', { page: 22 }));
  const ok = r.decision === 'answer' && r.citations.some(c => c.page === 22);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${'"chưa hiểu" sau một lượt → nói tiếp về đúng trang đó'.padEnd(58)} ${r.decision}`);
}

for (const [name, request, check] of NEG7){
  const r = await askTutor(request);
  const ok = check(r);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(58)} ${r.decision}`);
}

/* "cho tôi ví dụ KHÁC" — phải xét theo lượt TRƯỚC, nên chạy hai lượt liền. */
{
  await askTutor(req('giải thích ví dụ trace ở trang này', { page: 22 }));   // lượt 1
  const r = await askTutor(req('cho tôi thêm 1 ví dụ tương tự khác đi', { page: 22 }));
  const ok = r.decision === 'no_grounding' && /chỉ có ví dụ/i.test(r.answer);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${'xin "ví dụ khác" mà không có thuật ngữ → nói thẳng là hết'.padEnd(56)} ${r.decision}`);
}
{
  const r = await askTutor(req('cho mình ví dụ khác về tool calling', { page: 22 }));
  const ok = r.decision === 'answer' && r.confidence <= 0.7;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${'xin "ví dụ khác" CÓ thuật ngữ → trả lời nhưng hạ tin cậy'.padEnd(56)} ${r.decision} · ${Math.round(r.confidence * 100)}%`);
}

/* Không được bắt nhầm câu LÀNH thành lệnh giới hạn — "chi tiet" chứa "chi". */
{
  const r = await askTutor(req('giải thích chi tiết trang 4', { page: 4 }));
  const ok = r.decision === 'answer' && r.citations.length >= 1;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${'"giải thích chi tiết trang 4" KHÔNG bị coi là lệnh giới hạn'.padEnd(52)} ${r.decision} · ${r.citations.length} trích dẫn`);
}

/* Tiền đề sai trên DECK KHÁC: không được trả câu đính chính viết sẵn với 0
   trích dẫn (vi phạm bất biến #2) — phải thả rơi cho cổng ① từ chối. */
console.log('\n── Nhóm C2 · tiền đề sai trên deck không liên quan ──');
setDocIndex([{ page: 1, text: 'Bài giảng về marketing và bán hàng. Khách hàng là trung tâm của chiến lược.' }]);
const alien = await askTutor({
  question: 'ReAct là một kiểu fine-tuning đúng không?',
  selection: null, page_text: 'Bài giảng về marketing.',
  document: { id: 'alien', title: 'alien', page_count: 1, current_page: 1 }, history: [],
});
const alienOk = !(alien.decision === 'answer' && alien.citations.length === 0);
alienOk ? pass++ : fail++;
console.log(`  ${alienOk ? '✓' : '✗'} không trả answer-0-citation trên deck lạ  → ${alien.decision} · ${alien.citations.length} trích dẫn`);
setDocIndex(pages);   // trả lại deck thật cho khối BẪY 4 phía dưới

/* ── BẪY 4 · trang không có text layer (PDF scan) ────────────────────────
   Phải đổi cả tài liệu mới mô phỏng đúng: PDF scan thì pdf.js trả rỗng cho
   trang đó, nên CẢ page_text LẪN index đều rỗng — không phải chỉ một bên.
   Vì phải thay tài liệu nên khối này chạy CUỐI, sau khi các case trên xong. */
console.log('\n── BẪY 4 · trang ảnh scan, không có chữ nào đọc được ──');
setDocIndex(pages.map(p => p.page === 37 ? { ...p, text: '' } : p));
const scanRes = await askTutor({
  question: 'tóm tắt nội dung chính trong slide này',
  selection: null, page_text: '',
  document: { id: 'test', title: 'day03', page_count: pages.length, current_page: 37 },
  history: [],
});
const scanOk = scanRes.decision === 'no_grounding'
  && /không có text|scan/i.test(scanRes.refusal_reason ?? '')
  && !/tài liệu không chứa/.test(scanRes.refusal_reason ?? '');
scanOk ? pass++ : fail++;
console.log(`  ${scanOk ? '✓' : '✗'} từ chối với lý do RIÊNG, không lẫn với nhánh ①` +
            `  → ${scanRes.decision} · "${scanRes.refusal_reason ?? ''}"`);
if (scanOk) console.log(`     (khác hẳn "tài liệu không chứa X" — user cần biết là lỗi ĐỌC trang,` +
                        ` không phải tài liệu thiếu nội dung)`);

/* ── Nhóm H1 · unit: đọc số trang NGƯỜI DÙNG GỌI TÊN ────────────────────
   Kiểm ở tầng hàm chứ không chỉ end-to-end. Case âm mà kiểm end-to-end thì
   yếu: một con số nội dung ("4 tiêu chí") vẫn có thể tình cờ ra câu trả lời
   trông đúng, che mất việc parser đã bắt nhầm. */
console.log('\n── Nhóm H1 · unit parseNamedPages (case âm là phần quan trọng) ──');
const H1 = [
  ['tóm tắt slide 12 giúp mình',            [12]],
  ['trang 12 nói gì',                       [12]],
  ['tr.22 có gì',                           [22]],
  ['p12 nói gì',                            [12]],
  ['tóm tắt trang 30 và trang 31',          [30, 31]],
  ['trang 30 và 31',                        [30, 31]],
  ['trang 22, 23, 24 nói gì',               [22, 23, 24]],
  ['tóm tắt từ trang 5 đến trang 9',        [5, 6, 7, 8, 9]],
  ['trang 5-7 nói gì',                      [5, 6, 7]],
  /* Đuôi liệt kê phải phân biệt được "trang nối" với "danh từ đếm" */
  ['trang 12 và 4 tiêu chí',                [12]],

  /* ── ÂM · không có danh từ chỉ TRANG đứng trước số ───────────────── */
  ['4 tiêu chí đánh giá agent là gì',       null],
  ['3 kiểu hệ thống AI',                    null],
  ['top 3 công cụ',                         null],   // \bp không lọt giữa "top"
  ['ReAct 2 bước là gì',                    null],
  ['GPT-4 khác gì GPT-3',                   null],
  /* CHỐT HỒI QUY T0905: "day" đánh số BUỔI, không đánh số trang. Nhận nó là
     câu này bị kéo từ Tr.22 về Trang 4. */
  ['tóm gọn những nội dung quan trọng nhất trong day 04 này', null],
  /* CHỐT HỒI QUY G12: "Lab 3" là tên bài tập, không phải trang 3. */
  ['Làm hộ mình Lab 3 với',                 null],
  ['phần 2 nói gì',                         null],   // mục/hình ≠ trang
  ['hình 1',                                null],
  ['tóm tắt trang này',                     null],   // có danh từ, không có số
  ['giải thích 5 phút thôi',                null],   // danh từ phải ĐỨNG TRƯỚC số
  ['trang 100 nói gì',                      null],   // kẹp theo total = 44
];
for (const [q, want] of H1){
  const got = parseNamedPages(norm(q), pages.length);
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(q).padEnd(52)} ${JSON.stringify(got)}` +
              (ok ? '' : `  ← cần ${JSON.stringify(want)}`));
}

/* ── Nhóm H2 · lời người dùng THẮNG vị trí cuộn ─────────────────────────
   Bốn dòng này đo được bằng nhân thật trước khi sửa, và cả bốn đều sai:
     Tr.22 · "tóm tắt slide 12"          → trích 22,22,22
     Tr.5  · "tóm tắt trang 30 và 31"    → trích 5
     Tr.40 · "tóm tắt từ trang 5 đến 9"  → trích 40
     Tr.1  · "trang 22 nói gì"           → trích 1,22,22  (Tr.1 xếp đầu)
   Vì sao 48 case golden set không bắt được: cả ba case có nêu số trang đều
   để người dùng đứng SẴN ở đúng trang đó. Bug nấp sau một trùng hợp. */
console.log('\n── Nhóm H2 · gọi đích danh số trang thắng vị trí cuộn ──');
const inAll = (r, set) => r.citations.length > 0 && r.citations.every(c => set.includes(c.page));
const H2 = [
  ['đang Tr.22, hỏi "slide 12" → neo Trang 12',
   req('tóm tắt slide 12 giúp mình', { page: 22 }),
   r => r.decision === 'answer' && r.citations[0]?.page === 12],

  ['đang Tr.1, hỏi "trang 22" → Tr.22 đứng đầu, KHÔNG dính Tr.1',
   req('trang 22 nói gì', { page: 1 }),
   r => r.decision === 'answer' && r.citations[0]?.page === 22
        && !r.citations.some(c => c.page === 1)],

  ['đang Tr.5, hỏi 2 trang rời → phải trích ĐỦ CẢ HAI',
   req('tóm tắt trang 30 và trang 31', { page: 5 }),
   r => r.decision === 'answer'
        && r.citations.some(c => c.page === 30) && r.citations.some(c => c.page === 31)],

  /* Dải 5 trang > trần 3 của ngữ cảnh → KHÔNG đòi đủ 5 trang, chỉ đòi mọi
     trích dẫn nằm trong dải và bắt đầu từ đầu dải. Đòi đủ là đòi model báo
     cáo thứ nó không cầm trong tay. */
  ['đang Tr.40, hỏi dải 5–9 → mọi trích dẫn nằm TRONG dải',
   req('tóm tắt từ trang 5 đến trang 9', { page: 40 }),
   r => r.decision === 'answer' && r.citations[0]?.page === 5
        && inAll(r, [5, 6, 7, 8, 9])],

  ['gọi tên trang KÈM thuật ngữ → vẫn neo trang được gọi tên',
   req('slide 12 giải thích gì về ReAct', { page: 22 }),
   r => r.decision === 'answer' && r.citations[0]?.page === 12],
];
for (const [name, request, check] of H2){
  const r = await askTutor(request);
  const ok = check(r);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(58)} ${r.decision} · Tr.${r.citations.map(c => c.page).join(',') || '—'}`);
}

/* ── Nhóm H3 · bốn thứ nhánh mới KHÔNG được làm vỡ ──────────────────── */
console.log('\n── Nhóm H3 · gọi tên trang không được chọc lỗ vào luật cũ ──');
const H3 = [
  /* Quan trọng nhất: cổng ① chạy TRƯỚC khi `scoped` được tính, nên gọi tên
     trang KHÔNG mua được quyền trả lời về thứ tài liệu không có. */
  ['cổng ① vẫn thắng: "trang 12 nói gì về streaming" → TỪ CHỐI',
   req('trang 12 nói gì về streaming', { page: 22 }),
   r => r.decision === 'no_grounding' && /streaming/i.test(r.refusal_reason ?? '')],

  ['giới hạn phạm vi tường minh vẫn nguyên vẹn (gác bằng !scope)',
   req('Chỉ trả lời trong phạm vi Trang 22, 23, 24: giải thích trang 22', { page: 22 }),
   r => inAll(r, [22, 23, 24])],

  ['so sánh 2 trang CHẠY TRƯỚC nhánh mới — vẫn ra bảng hai cột',
   req('so sánh trang 22 và trang 35', { page: 22 }),
   r => r.citations.some(c => c.page === 22) && r.citations.some(c => c.page === 35)
        && /Đặt cạnh nhau/i.test(r.answer)],

  ['T0905 "day 04" là số BUỔI, không phải số trang → vẫn neo Tr.22',
   req('tóm gọn những nội dung quan trọng nhất trong day 04 này', { page: 22 }),
   r => r.decision === 'answer' && r.citations.some(c => c.page === 22)],
];
for (const [name, request, check] of H3){
  const r = await askTutor(request);
  const ok = check(r);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(58)} ${r.decision} · Tr.${r.citations.map(c => c.page).join(',') || '—'}`);
}

/* ── Nhóm H4 · xin một SẢN PHẨM HỌC TẬP mình chưa làm được ──────────────
   Người dùng thật bắt được: "Bạn tạo quiz cho tôi được chứ" → no_grounding
   «Mình đã tra 44 trang và không thấy `quiz`» — một câu vô nghĩa, họ có hỏi
   tài liệu chứa chữ "quiz" đâu. Đo tiếp thì thấy CÙNG MỘT Ý, năm cách gõ ra
   BA hành vi sai: hai câu bị từ chối, hai câu được `answer` 82% (tóm tắt
   trang rồi VỜ như đã ra đề), một câu bị hỏi lại "Trang 6 hay Trang 40?".
   Tệ nhất: nhánh ngoài-tài-liệu HỨA "tôi hoàn toàn có thể giúp bạn tạo quiz",
   người dùng xin đúng thứ đó, rồi bị từ chối. Hứa xong nuốt lời. */
console.log('\n── Nhóm H4 · xin quiz/flashcard → nói thẳng là chưa làm được ──');
const ARTIFACT_REQ = [
  'Bạn tạo quiz cho tôi được chứ',
  'Tạo quiz từ chủ đề được nhắc đến trong slides',
  'cho mình vài câu hỏi ôn tập',
  'làm flashcard giúp mình',
  'tạo đề trắc nghiệm từ trang này',
  'vẽ sơ đồ tư duy cho bài này',
];
for (const q of ARTIFACT_REQ){
  const r = await askTutor(req(q, { page: 40 }));
  /* Ba điều kiện: KHÔNG giả vờ đã làm · KHÔNG nói "tài liệu không có quiz"
     (sai bản chất — đây là giới hạn NĂNG LỰC) · chip phải chạy thật. */
  const ok = r.decision === 'clarify'
          && r.citations.length === 0
          && /chưa tạo được/i.test(r.answer)
          && (r.follow_ups ?? []).some(f => /Tóm tắt trang/i.test(f.label));
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${JSON.stringify(q).padEnd(50)} ${r.decision}`);
}

console.log('\n── Nhóm H4b · case ÂM: không được nuốt câu hỏi NỘI DUNG ──');
const ARTIFACT_NEG = [
  ['"trang này có câu hỏi nào không" → hỏi NỘI DUNG trang', 'trang này có câu hỏi nào không', 44, 'answer'],
  ['"sơ đồ kiến trúc agent gồm khối nào" → hỏi NỘI DUNG',   'sơ đồ kiến trúc agent gồm những khối nào', 15, 'answer'],
  ['"cho mình ví dụ về tool calling" → xin ví dụ, không phải quiz', 'cho mình ví dụ về tool calling', 18, 'answer'],
  ['"cho mình lời giải bài tập này" → vẫn là ③ làm hộ bài', 'cho mình lời giải bài tập này', 39, 'out_of_scope'],
];
for (const [name, q, pg, want] of ARTIFACT_NEG){
  const r = await askTutor(req(q, { page: pg }));
  const ok = r.decision === want;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(58)} ${r.decision}`);
}

/* Bất biến #1 trên ĐƯỜNG TRÍCH DẪN MỚI — nhánh gọi tên trang dựng citation
   theo lối riêng, nên phải kiểm lại nguyên văn chứ không tin là còn đúng. */
console.log('\n── Bất biến #1 trên nhánh gọi tên trang ──');
for (const [, request] of [...H2, ...H3]){
  const r = await askTutor(request);
  for (const c of r.citations){
    cChecked++;
    if (!flat(textOf(c.page)).includes(flat(c.quote).slice(0, 40))){
      cBad++;
      console.log(`  ✗ Trang ${c.ref}: quote không khớp — "${c.quote.slice(0, 46)}…"`);
    }
  }
}
console.log(`  ${cBad === 0 ? '✓' : '✗'} tổng cộng ${cChecked - cBad}/${cChecked} trích dẫn khớp nguyên văn`);

/* Đếm bằng pass+fail thay vì cộng tay từng mảng: bản trước cộng tay rồi quên
   cập nhật khi thêm nhóm mới, in ra "60/55" — một phép đo tự nói dối. */
const total = pass + fail;
console.log(`\n${'═'.repeat(64)}
KẾT QUẢ
  neo trang + bẫy hồi quy : ${pass}/${total}
  trích dẫn nguyên văn    : ${cChecked - cBad}/${cChecked}`);
process.exit(fail || cBad ? 1 : 0);
