# Kết quả golden set — lượt 3

- Thời điểm: 2026-07-30T21:00:52.866Z
- Nhân AI: **real** · model `gemma-4`
- Deck: `data/slides/day03.pdf` · 44 trang
- Lệnh: `node eval/run-golden.mjs <pages.json> --core=real --run=3`

## Tổng: **32/33 = 97.0%**

| Lớp chỗ khó | Qua | Tỷ lệ |
|---|---|---|
| ① | 5/6 | 83% |
| ② | 5/5 | 100% |
| ③ | 4/4 | 100% |
| ④ | 5/5 | 100% |
| thường | 9/9 | 100% |
| hiếm | 4/4 | 100% |

## Theo chiều chất lượng

| Mã | Chiều | Qua | Ghi chú |
|---|---|---|---|
| D1 | Trích dẫn cắt nguyên văn từ đúng trang | 25/25 | ✅ |
| D2 | Rơi đúng nhánh quyết định | 32/33 | ⚠️ có case chưa đạt |
| D3 | Không đẩy việc về phía học viên | 33/33 | ✅ |
| D4 | Có căn cứ ⇒ có trích dẫn | 17/17 | ✅ |
| D5 | Confidence phản ánh thật | 33/33 | ✅ |
| D6 | Câu hỏi neo trang ⇒ trích đúng trang neo | 10/10 | ✅ |
| D7 | Không có chip hành động chết | 33/33 | ✅ |

> **Cách đọc mẫu số:** mỗi chiều chỉ đếm case mà phép kiểm THẬT SỰ áp dụng
> (D1: case có ≥1 trích dẫn · D4: case decision=answer · D6: case neo trang).
> Bản trước đếm cả case n/a vào tử lẫn mẫu, thổi D1 lên "33/33" trong khi chỉ
> một phần số case có trích dẫn để kiểm.
>
> **D6 là bảo đảm bằng cấu trúc, không phải phép đo lấy mẫu:** core tự chèn
> trích dẫn trang neo nếu model bỏ sót (`core.mjs`, khối "scoped && !kept.some").
> Con số ở đây xác nhận bảo đảm đó còn nguyên; bẫy hồi quy nằm trong
> `codebase/test-pagescope.mjs`.
>
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
| G06 | ① | `T0115` | điêu toa | no_grounding | answer | 80% | 12,12,12 | ✗ D2; tin cậy 0.80 > 0.2 |
| G07 | ② | — | cái này khác cái kia chỗ nào? | clarify | clarify | 31% | — | ✓ |
| G08 | ② | — | sao? | clarify | clarify | 31% | — | ✓ |
| G09 | ② | `T0018` | Đây là gì | clarify | clarify | 31% | — | ✓ |
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
| G21 | thường | `T0649` | tóm tắt nội dung chính trong slide này | answer | answer | 94% | 37 | ✓ |
| G22 | thường | `T1195` | giải thích slide hiện tại | answer | answer | 94% | 21,21 | ✓ |
| G23 | thường | `T0122` | tóm tắt hết slice trong vài câu đi | answer | answer | 94% | 12,12,11 | ✓ |
| G24 | thường | `T0769` | giải thích nghĩa chi tiết của trang 4 | answer | answer | 94% | 4,4,4 | ✓ |
| G25 | thường | `T0154` | tại sao có lưu ý như trang 25 | answer | answer | 90% | 25,17 | ✓ |
| G26 | thường | `T0399` | Giải thích biểu đồ đc bôi đỏ | answer | answer | 94% | 21 | ✓ |
| G27 | thường | `T1157` | Giai thich khai niem quan trong nhat trong slide nay va ch | answer | answer | 94% | 16,16,16 | ✓ |
| G28 | thường | `T0811` | Designt Pattern ReAct là gì có lưu ý gì về nó? | answer | answer | 94% | 20,8 | ✓ |
| G29 | thường | — | summarize this slide for me | answer | answer | 94% | 41,41,41 | ✓ |
| G30 | hiếm | — | LangGraph có hỗ trợ streaming không? | no_grounding | no_grounding | 8% | 22 | ✓ |
| G31 | hiếm | — | tóm tắt nội dung chính trong slide này | no_grounding | no_grounding | 5% | — | ✓ |
| G32 | hiếm | — | tóm tắt đoạn này | answer | answer | 94% | 5,6 | ✓ |
| G33 | hiếm | — | tóm tắt giùm cái slide nầy dc hôg | answer | answer | 94% | 13,13,13 | ✓ |

## Phân tích case chưa đạt

### G06 · ① — điêu toa

- Mong đợi `no_grounding`, nhận `answer`
- Không đạt: **D2** Rơi đúng nhánh quyết định · tin cậy 0.80 > 0.2
- Ý đồ của case: Câu hỏi thật, là từ vô nghĩa với tài liệu. Tutor cũ trả lời ĐÚNG ở case này. GIỚI HẠN ĐÃ BIẾT của bản mình: phép phủ định ① chỉ áp cho token không phải âm tiết tiếng Việt (để học viên gõ không dấu như 'khai niem' không bị từ chối oan — xem G27). 'điêu toa' toàn âm tiết tiếng Việt nên được miễn, rồi retrieval khớp 'dieu' với 'điều' trong slide → trả lời thay vì từ chối. Không sửa được bằng ngưỡng điểm: 'abc def ghi' còn ăn 3.81 điểm (def có trong code Python Tr.33, ghi là từ tiếng Việt) trong khi 'điêu toa' chỉ 2.75. Cần embedding mới tách được — đã đưa vào backlog.

