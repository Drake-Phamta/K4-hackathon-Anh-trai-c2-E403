# Reflection cá nhân — mỗi người một file

**Chấm riêng** theo rubric reflection của khoá, không nằm trong 75 điểm bài nộp.

Điền vào file mang tên vai của mình (`P1-product-owner.md` … `P6-demo-validation.md`),
đổi tên file thành tên thật nếu muốn. **Hạn: trước CP5 (14:00 N2).**

## Bốn mục bắt buộc

1. **Vai + phần mình làm** — cụ thể tên file/thư mục, không viết "tham gia phát triển".
2. **AI hỗ trợ thế nào** — dùng công cụ gì, cho việc gì, chỗ nào phải tự sửa lại vì AI làm sai.
3. **Một bài học từ case fail của CHÍNH NHÓM MÌNH** — không phải bài học chung
   về AI. Xem danh sách case fail thật ở dưới.
4. **Nếu làm lại** — một thứ làm khác đi.

## ⚠️ Vibe-coding rule — đọc trước khi viết

> *"Dùng AI để build thoải mái, nhưng **không giải thích được phần có tên mình
> thì phần đó 0 điểm**"* — kiểm tra tại CP5, **bốc ngẫu nhiên một thành viên**.

Nên: trước CP5, mở đúng file mình đứng tên và tự trả lời được ba câu:
- Đoạn này **làm gì**?
- **Vì sao** làm thế mà không làm cách khác?
- Nếu bỏ nó đi thì **hỏng chuyện gì**?

## Case fail thật của nhóm — dùng cho mục 3

Đừng bịa bài học. Đêm N1 nhóm đã có mấy cái đắt giá, ghi trong `spec.md` §9:

| Case fail | Bài học nằm ở đâu |
|---|---|
| **Lát cắt đã khai nhưng chưa cài** — `spec.md` viết "AI tự động bốc toàn bộ transcript của trang hiện tại nạp vào Context", nhưng `req.page_text` nhận vào rồi **bỏ đó**. Chạy 6 dạng câu hỏi pain nhiều nhất → **4/6 ra `no_grounding`**, tức prototype tái tạo đúng thất bại nó đi sửa | Viết spec xong không có nghĩa là đã làm. Phải có test neo vào **câu hỏi thật của người thật**, không phải case tự nghĩ ra |
| **Chip hứa suông** — chip *"Chuyển câu này cho TA"* bị gửi **làm câu hỏi mới** nên bấm vào ra kết quả vô nghĩa. Có ở cả 3 bản UI | Một nút trông như hành động mà không làm gì còn tệ hơn không có nút |
| **`viewer.mjs` báo sai trang hiện tại** — nhảy tới Tr.37 rồi hỏi "tóm tắt trang này" thì tutor tóm tắt **Tr.38**, vì slide 16:9 thấp hơn viewport nên vạch đọc 35% rơi sang trang sau | Một bug vô hại trong kiến trúc cũ (chỉ hiện sai số trang) trở thành **lỗi trả lời sai** khi đổi kiến trúc. Đổi cái gì thành nguồn sự thật thì phải soát lại mọi thứ tính ra nó |
| **Hai con số evidence không tái lập được** — CONTRACT ghi 68,0% và 54%, đếm chặt lại ra 61,2% và 57% | Con số không kèm phương pháp đếm thì không phải bằng chứng. Giờ phương pháp nằm trong `eval/verify-evidence.py` |
| **G06 `T0115` "điêu toa" vẫn fail** — 32/33, không sửa được bằng ngưỡng điểm | Có lỗi phải chấp nhận sống chung và **nói ra**, thay vì chỉnh test cho đẹp số |
