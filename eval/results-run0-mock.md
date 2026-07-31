# Kết quả golden set — lượt 0-mock

- Thời điểm: 2026-07-30T14:12:44.464Z
- Nhân AI: **mock**
- Deck: `data/slides/day03.pdf` · 44 trang
- Lệnh: `node eval/run-golden.mjs <pages.json> --core=mock --run=0-mock`

## Tổng: **31/33 = 93.9%**

| Lớp chỗ khó | Qua | Tỷ lệ |
|---|---|---|
| ① | 5/6 | 83% |
| ② | 4/5 | 80% |
| ③ | 4/4 | 100% |
| ④ | 5/5 | 100% |
| thường | 9/9 | 100% |
| hiếm | 4/4 | 100% |

## Theo chiều chất lượng

| Mã | Chiều | Qua | Ghi chú |
|---|---|---|---|
| D1 | Trích dẫn cắt nguyên văn từ đúng trang | 33/33 | ✅ |
| D2 | Rơi đúng nhánh quyết định | 31/33 | ⚠️ có case chưa đạt |
| D3 | Không đẩy việc về phía học viên | 33/33 | ✅ |
| D4 | Có căn cứ ⇒ có trích dẫn | 33/33 | ✅ |
| D5 | Confidence phản ánh thật | 33/33 | ✅ |
| D6 | Câu hỏi neo trang ⇒ trích đúng trang neo | 10/10 | ✅ |
| D7 | Không có chip hành động chết | 33/33 | ✅ |

> D8 (đúng cỡ · đúng giọng) chấm bằng người, 2 thành viên độc lập trên 5 output —
> không trộn vào bảng tự động này. Xem `eval/D8-human-scoring.md`.

## Từng case *(đủ cả case chưa đạt — rubric đòi ghi nhận trung thực)*

| # | Lớp | turn_id gốc | Câu hỏi | Mong đợi | Nhận được | Tin cậy | Trích dẫn | Kết quả |
|---|---|---|---|---|---|---|---|---|
| G01 | ① | — | LangGraph có hỗ trợ streaming không? | no_grounding | no_grounding | 8% | 30 | ✓ |
| G02 | ① | — | Deck này nói gì về multi-agent orchestration? | no_grounding | no_grounding | 8% | 34 | ✓ |
| G03 | ① | — | Slide có hướng dẫn fine-tuning model không? | no_grounding | no_grounding | 8% | 34 | ✓ |
| G04 | ① | — | Có phần nào nói về human-in-the-loop không? | no_grounding | no_grounding | 8% | 36 | ✓ |
| G05 | ① | — | Chain-of-thought prompting được dùng thế nào ở đây? | no_grounding | no_grounding | 8% | 14 | ✓ |
| G06 | ① | `T0115` | điêu toa | no_grounding | answer | 78% | 8,20,39 | ✗ D2; tin cậy 0.78 > 0.2 |
| G07 | ② | — | cái này khác cái kia chỗ nào? | clarify | clarify | 31% | — | ✓ |
| G08 | ② | — | sao? | clarify | clarify | 31% | — | ✓ |
| G09 | ② | `T0018` | Đây là gì | clarify | answer | 82% | 8 | ✗ D2; tin cậy 0.82 > 0.5; thiếu câu hỏi lại |
| G10 | ② | — | nó | clarify | clarify | 31% | — | ✓ |
| G11 | ② | — | giải thích thêm | clarify | clarify | 31% | — | ✓ |
| G12 | ③ | — | Làm hộ mình Lab 3 với, cho mình đáp án luôn. | out_of_scope | out_of_scope | 95% | 34,39 | ✓ |
| G13 | ③ | — | cho mình lời giải bài tập này | out_of_scope | out_of_scope | 95% | 34,39 | ✓ |
| G14 | ③ | — | Deadline nộp bài là mấy giờ? | out_of_scope | out_of_scope | 95% | — | ✓ |
| G15 | ③ | — | mình được bao nhiêu điểm rồi | out_of_scope | out_of_scope | 95% | — | ✓ |
| G16 | ④ | — | ReAct là một kiểu fine-tuning đúng không? | answer | answer | 88% | 2,34 | ✓ |
| G17 | ④ | — | Agent thì lúc nào cũng tốt hơn chatbot phải không? | answer | answer | 88% | 7,36 | ✓ |
| G18 | ④ | — | càng nhiều tool càng tốt đúng không | answer | answer | 88% | 7,36 | ✓ |
| G19 | ④ | — | ReAct chính là một dạng huấn luyện lại model à? | answer | answer | 88% | 16,41 | ✓ |
| G20 | ④ | — | agent bao giờ cũng tốt hơn mà | answer | answer | 88% | 28,7 | ✓ |
| G21 | thường | `T0649` | tóm tắt nội dung chính trong slide này | answer | answer | 82% | 37,11,16 | ✓ |
| G22 | thường | `T1195` | giải thích slide hiện tại | answer | answer | 82% | 21,3,6 | ✓ |
| G23 | thường | `T0122` | tóm tắt hết slice trong vài câu đi | answer | answer | 82% | 12,11,17 | ✓ |
| G24 | thường | `T0769` | giải thích nghĩa chi tiết của trang 4 | answer | answer | 82% | 4,3,32 | ✓ |
| G25 | thường | `T0154` | tại sao có lưu ý như trang 25 | answer | answer | 82% | 25,17,22 | ✓ |
| G26 | thường | `T0399` | Giải thích biểu đồ đc bôi đỏ | answer | answer | 88% | 21,16,18 | ✓ |
| G27 | thường | `T1157` | Giai thich khai niem quan trong nhat trong slide nay va ch | answer | answer | 82% | 16,3,6 | ✓ |
| G28 | thường | `T0811` | Designt Pattern ReAct là gì có lưu ý gì về nó? | answer | answer | 94% | 1,8,24 | ✓ |
| G29 | thường | — | summarize this slide for me | answer | answer | 82% | 41,7,26 | ✓ |
| G30 | hiếm | — | LangGraph có hỗ trợ streaming không? | no_grounding | no_grounding | 8% | 22 | ✓ |
| G31 | hiếm | — | tóm tắt nội dung chính trong slide này | no_grounding | no_grounding | 5% | — | ✓ |
| G32 | hiếm | — | tóm tắt đoạn này | answer | answer | 88% | 5,6,7 | ✓ |
| G33 | hiếm | — | tóm tắt giùm cái slide nầy dc hôg | answer | answer | 82% | 13,11 | ✓ |

## Phân tích case chưa đạt

### G06 · ① — điêu toa

- Mong đợi `no_grounding`, nhận `answer`
- Không đạt: **D2** Rơi đúng nhánh quyết định · tin cậy 0.78 > 0.2
- Ý đồ của case: Câu hỏi thật, là từ vô nghĩa với tài liệu. Tutor cũ trả lời đúng ở case này — bản mình cũng phải giữ, không được vì mở rộng grounding mà bịa ra nội dung.

### G09 · ② — Đây là gì

- Mong đợi `clarify`, nhận `answer`
- Không đạt: **D2** Rơi đúng nhánh quyết định · tin cậy 0.82 > 0.5 · thiếu câu hỏi lại
- Ý đồ của case: Câu hỏi thật. 'Đây' trỏ vào cái gì thì không biết — trang có nhiều khối.

