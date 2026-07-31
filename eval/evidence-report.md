# Bằng chứng mining — bản kiểm lại được

Sinh bằng `python eval/verify-evidence.py` · nguồn `data/vlearn-pack/chatlog/chat_history_anonymized_for_hackathon.csv`

Mỗi con số dưới đây tương ứng một mã E dùng trong `spec.md`. Chạy lại
script này phải ra đúng những số này — nếu lệch thì spec sai, không phải
script sai.

## E1 · Quy mô tập dữ liệu

- Tổng dòng: **2,522**
- Lượt học viên: **1,261** · lượt tutor: **1,261**
- Số hội thoại: **585** · số người học: **369**

## E2 · Tutor thừa nhận không tra được nội dung

Phép đếm: chuẩn hoá bỏ dấu + viết thường, rồi tìm bất kỳ từ khoá nào trong danh sách.

| Từ khoá | Số lượt khớp |
|---|---|
| `khong tim thay` | 122 |
| `rat tiec` | 164 |
| `xin loi` | 114 |
| `khong co thong tin` | 21 |
| **hợp (union, không đếm trùng)** | **307** |

→ **307/1,261 = 24.3%** lượt trả lời của tutor

*Giới hạn đã biết, ghi rõ để không bị hỏi bất ngờ:* `xin loi` cũng khớp cả
câu xin lỗi lịch sự không liên quan tra cứu. Bỏ riêng từ này thì còn 
**242/1,261 = 19.2%** — vẫn cùng một bậc độ lớn,
nên kết luận không đổi.

## E3 · Trả lời không kèm trích dẫn

Cột `citations` rỗng (`[]`): **582/1,261 = 46.2%**

## E4 · Downvote và mối liên hệ với lỗi thiếu ngữ cảnh

- Downvote: **37** · upvote: **33** · không đánh giá: **1,191**
- Downvote thuộc nhóm E2: **21/37 = 57%**

Tỷ lệ downvote trong nhóm E2 là 6.8%, ngoài nhóm E2 là
1.7% — chênh 4.1 lần.

## E5 · Học viên gần như luôn ở trong ngữ cảnh một trang cụ thể

Tin nhắn có header `(Trang N, đoạn được chọn: "…")`: **1252/1,261 = 99.3%**

Trang được nhắc tới: từ 1 đến 98, trung vị 13

## E6 · Nhưng tutor KHÔNG nhận được chữ nào trên slide

Phép đo: `đoạn được chọn` có trùng với chính câu học viên gõ hay không.
Trùng nghĩa là hệ thống chỉ chuyển tiếp lại câu hỏi, không gửi nội dung trang.

| Cách so khớp | Số lượt | Tỷ lệ trên E5 |
|---|---|---|
| trùng 50 ký tự đầu *(dùng trong spec)* | 766 | **61.2%** |
| trùng tuyệt đối toàn chuỗi | 757 | 60.5% |

## E7 · Dạng câu hỏi trong nhóm lỗi E2

| Dạng | Số lượt |
|---|---|
| (khác) | 122 |
| tom tat | 80 |
| giai thich | 61 |
| la gi | 19 |
| cach | 7 |
| tai sao | 6 |
| vi du | 4 |
| lam sao | 4 |
| khac nhau | 2 |
| tom gon | 1 |
| y nghia | 1 |

## E8 · Độ trễ

- Lượt chờ trên 10 giây: **3/1,261 = 0.2%**
- Trung vị: **1,758 ms** · phân vị 90: **3,686 ms**

## E9 · Tutor cũ không bao giờ đưa bước tiếp theo

- Lượt có `follow_ups`: **0/1,261 = 0.0%**
- Lượt có `asked_check_question`: **3/1,261 = 0.24%**

Nghĩa là 307 lần từ chối là 307 ngõ cụt — học viên không được
đưa cho một hành động nào để đi tiếp.

## E10 · Phần lỗi sửa được ĐẢM BẢO bằng text trang đang xem

Phép đo: trong nhóm E2, đếm câu hỏi NEO vào trang đang xem. In HAI phép
đếm với độ chặt khác nhau — con số dùng trong spec là bản CHẶT (cận dưới
bảo thủ); bản RỘNG chép đúng `PAGE_ANCHOR` trong `codebase/core.mjs` nên
mô tả sát hơn phạm vi mà route neo trang của hệ thống thực tế sẽ đón
(luật thật còn kèm điều kiện *không có thuật ngữ kỹ thuật* — nên số thật
nằm giữa hai mốc).

| Phép đếm | Số lượt | Tỷ lệ trên E2 |
|---|---|---|
| **chặt** — vật chứa + từ chỉ định ("trang NÀY", "slide 37") *(dùng trong spec)* | 94 | **30.6%** |
| rộng — chép `PAGE_ANCHOR` của core.mjs (vật chứa trần) | 188 | 61.2% |

- Hỏi nội dung, vẫn cần retrieval (theo phép chặt): **213/307 = 69.4%**

Nhóm thứ hai vẫn được lợi vì `page_text` luôn có trong ngữ cảnh, nhưng
khi tài liệu thật sự không chứa thì vẫn phải từ chối — và phải từ chối.

## Ví dụ nguyên văn *(R1 đòi ≥5)*

Trích ngắn ≤120 ký tự kèm `turn_id` để tra lại trong data pack —
không dán nguyên văn dài (README quy định 3).

| turn_id | Học viên hỏi | Tutor trả lời |
|---|---|---|
| `T0649` | tóm tắt nội dung chính trong slide này | Xin lỗi bạn, tôi không tìm thấy nội dung cụ thể cho slide 37 trong tài liệu hiện có. Bạn có thể cung cấp thêm… |
| `T0905` | tóm gọn những nội dung quan trọng nhất trong day 04 này | Chào bạn, hiện tại tôi không tìm thấy tài liệu tổng hợp đầy đủ cho toàn bộ nội dung của Ngày 04 trong slide đ… |
| `T0092` | kỹ thuật tối ưu prompt, cơ chế gọi tool và cách xử lý ngữ cảnh | Rất tiếc, tôi không tìm thấy tài liệu tổng hợp đầy đủ cho nội dung của Day 04 trong các file slide đã được cu… |
| `T0115` | điêu toa | Rất xin lỗi, mình không tìm thấy thuật ngữ "điêu toa" trong tài liệu của bài học hôm nay. Có thể đây không ph… |
| `T0154` | tại sao có lưu ý như trang 25 | Rất tiếc, mình đã kiểm tra lại các tài liệu của bài học hôm nay nhưng không thấy trang 25 đề cập đến lưu ý nà… |
| `T0811` | Designt Pattern ReAct là gì có lưu ý gì về nó? | Rất tiếc, tôi không tìm thấy định nghĩa chi tiết về "ReAct" trong các slide bài giảng hiện tại của ngày học n… |
| `T0541` | Giúp tôi viết summary chi tiết và đầy đủ nhất về toàn bộ slide bài giảng ngày hôm nay | Rất tiếc, hiện tại trong nội dung slide bài giảng của ngày hôm nay không chứa thông tin chi tiết về khái niệm… |
| `T0122` | tóm tắt hết slice trong vài câu đi | Rất tiếc là mình đã thử tìm kiếm nội dung tổng quan từ các slide (với các từ khóa như "giới thiệu", "mục tiêu… |

### Trong đó, nhóm neo trang (E10) — chính là lát cắt nhóm chọn

- `T0649` — tóm tắt nội dung chính trong slide này
- `T0905` — tóm gọn những nội dung quan trọng nhất trong day 04 này
- `T0154` — tại sao có lưu ý như trang 25
- `T0769` — giải thích nghĩa chi tiết của trang 4
- `T0399` — Giải thích biều đồ đc bôi đỏ
- `T0408` — tóm tắt các chủ đề chính của slide day05-lecture-slides-batch03.pdf này

