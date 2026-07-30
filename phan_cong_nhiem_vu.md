# KẾ HOẠCH THỰC THI & PHÂN CÔNG NHIÊM VỤ CHI TIẾT
Dự án: AI Mini Hackathon
Quy mô nhóm: 06 Thành viên
Phương pháp làm việc: Chạy song song trên nhánh `main`, phân lập không gian làm việc.

---

## I. NGUYÊN TẮC VẬN HÀNH CHUNG
1. Tính độc lập: Mỗi thành viên sở hữu và chịu trách nhiệm toàn quyền trên một số tệp tin/thư mục cụ thể. Không thực hiện lệnh `git add .` toàn cục. Bắt buộc `git pull origin main` trước khi bắt đầu phiên làm việc.
2. Quản trị xung đột: Mọi quyết định thay đổi cấu trúc hoặc nội dung tài liệu cốt lõi (`spec.md`) phải thông qua Trưởng dự án (Product Owner) để tránh xung đột hệ thống.
3. Chấp nhận lỗi (Graceful Degradation): Sản phẩm không cần hoàn hảo 100%, nhưng phải biết cách từ chối và xử lý lỗi một cách thanh lịch khi người dùng đưa ra yêu cầu ngoài phạm vi.

---

## II. ĐỘI HÌNH VÀ PHÂN BỔ TRÁCH NHIỆM

### 1. Trưởng Dự Án (Product Owner & Spec Keeper - P1)
- Trách nhiệm: Giữ nhịp độ dự án, đưa ra quyết định cuối cùng khi có tranh luận. Đảm bảo toàn bộ tiêu chí Rubric được phản ánh vào sản phẩm.
- Lãnh thổ Repo: Quản lý chính tệp `spec.md` và `README.md`.
- Đầu ra yêu cầu: Hoàn thiện bản Đặc tả (AI Spec) khớp với các nguyên tắc HAX/PAIR. Xử lý các xung đột Git (nếu có).

### 2. Chuyên viên Phân tích Dữ liệu (Data Analyst - P2)
- Trách nhiệm: Phân tích 2.522 dòng dữ liệu chatlog để tìm ra vấn đề lõi. Không cần đi khảo sát diện rộng ở ngày đầu.
- Lãnh thổ Repo: Các tệp phân tích dữ liệu đính kèm (ví dụ: `docs/data_mining_results.md`).
- Đầu ra yêu cầu: Cung cấp con số thống kê chính xác và ít nhất 5 đoạn hội thoại nguyên văn làm bằng chứng (Tiêu chuẩn B). Phối hợp định hình mục 1, 2, 3 trong Đặc tả.

### 3. Kỹ sư AI & Prompt (AI Engineer - P3)
- Trách nhiệm: Xây dựng logic AI, viết Prompt và tích hợp API thực tế vào hệ thống.
- Lãnh thổ Repo: Mã nguồn xử lý logic AI trong thư mục `codebase/` (ví dụ: `api.js` hoặc `agent.py`).
- Đầu ra yêu cầu: AI có khả năng nhận diện 4 lớp khó khăn (nguồn sự thật, mơ hồ, ngoài phạm vi, chuyên môn sâu) và xử lý theo đúng thiết kế của P1.

### 4. Đảm bảo Chất lượng (QA & Test Lead - P4)
- Trách nhiệm: Xây dựng bộ dữ liệu kiểm thử (Golden Set) và tiến hành đo lường chất lượng độc lập với Kỹ sư AI.
- Lãnh thổ Repo: Thư mục `eval/` (chứa tệp test cases và bảng kết quả đo lường).
- Đầu ra yêu cầu: Tối thiểu 20 Test Cases phủ kín 4 rủi ro lõi (tối thiểu 10 cases lấy từ log thực tế). Cung cấp tỷ lệ % thành công chính xác để chốt Quality Bar.

### 5. Phát triển Giao diện & Luồng (Frontend Builder - P5)
- Trách nhiệm: Phát triển giao diện người dùng (Prototype) ở mức hiển thị và tương tác tốt. Ưu tiên sử dụng các công cụ hỗ trợ sinh mã giao diện để tối ưu thời gian.
- Lãnh thổ Repo: Mã nguồn giao diện chính trong thư mục `codebase/` (không can thiệp tệp logic AI của P3).
- Đầu ra yêu cầu: Một Prototype vận hành mượt mà toàn bộ luồng công việc (Happy Path, Lỗi, và Sửa chữa). Giao diện thể hiện tính chuyên nghiệp và minh bạch (hiển thị nguồn tham chiếu của AI).

### 6. Phụ trách Kiểm định & Trình bày (Validation & Demo Lead - P6)
- Trách nhiệm: Thiết kế tài liệu trình bày, lên kịch bản chạy thử (Demo) và thực hiện quá trình kiểm định thực tế (User Testing) vào ngày thứ hai.
- Lãnh thổ Repo: Thư mục `validation/` (lưu trữ nhật ký người dùng) và tệp `demo-slides.pdf`.
- Đầu ra yêu cầu: 5 bản ghi phản hồi nguyên văn từ người dùng thực tế. 6 trang Slide chứa đầy đủ số liệu và bằng chứng. Kịch bản thuyết trình chi tiết.

---

## III. QUY TRÌNH THỰC THI CHI TIẾT (6 GIAI ĐOẠN)

### Giai đoạn 1: Khám phá & Định hình vấn đề (Hoàn thành CP1)
- P2 (Data Analyst): Đọc nhanh tập dữ liệu mẫu, đếm số lượng các mẫu hội thoại thất bại và trích xuất bằng chứng (Evidence).
- P1 (Product Owner): Cùng P2 chuyển hóa dữ liệu thành "Lát cắt 1 câu" (1 user, 1 công việc, 1 quyết định AI, 1 kết quả). Xác định mức độ tự động hóa (Augment, Conditional, hoặc Automate).
- P3, P4, P5, P6: Đọc lướt các tài liệu tham khảo và thảo luận độc lập về cấu trúc kỹ thuật và giao diện dự kiến.
- ĐẦU RA MỐC: Nộp bản Canvas 7 dòng định hình dự án.

### Giai đoạn 2: Phát triển Luồng Giao diện Cơ bản (Hoàn thành CP2)
- P5 (Frontend Builder): Xây dựng giao diện các màn hình chính. Bỏ qua logic AI, chỉ cần đảm bảo người dùng có thể nhấp chuột và đi hết quy trình.
- P3 (AI Engineer): Viết hàm API riêng lẻ. Thử nghiệm trên Terminal hoặc Postman để kiểm chứng dữ liệu trả về từ mô hình ngôn ngữ.
- P1 (Product Owner): Chọn tối thiểu 4 nguyên tắc HAX/PAIR và đối chiếu vị trí hiển thị dự kiến trên giao diện của P5.
- ĐẦU RA MỐC: Báo cáo luồng giao diện bấm được (không cần AI thật).

### Giai đoạn 3: Tích hợp AI thật & Kiểm thử vòng 1 (Hoàn thành CP3)
- P3 (AI Engineer) & P5 (Frontend Builder): Ghép nối hàm API của P3 vào giao diện của P5. Chạy thử quy trình toàn vẹn từ đầu đến cuối.
- P4 (QA Lead): Hoàn thiện tập dữ liệu Golden Set (20 cases). 
- P3 & P4: Phối hợp chạy bộ Golden Set lên phiên bản nguyên mẫu đầu tiên. Tính toán tỷ lệ % thành công lần 1.
- ĐẦU RA MỐC: Lời gọi AI thật hoạt động trên giao diện và Bảng tỷ lệ % đo lường sơ bộ.

### Giai đoạn 4: Đẩy giới hạn AI & Hoàn thiện Đặc tả (Chốt trước 23:59 Ngày 1)
- P3 & P4: Chu trình tinh chỉnh (Iterative Process) - P4 phát hiện lỗi, P3 sửa Prompt, P4 chạy lại toàn bộ kiểm thử. Lặp lại cho đến khi tỷ lệ % ổn định.
- P1 & P2: Hoàn tất tài liệu `spec.md`. Xác định ít nhất 8 kịch bản rủi ro theo đúng 4 phân loại.
- P1 (Product Owner): Công bố và ghi nhận tỷ lệ % cuối cùng làm Quality Bar (Cam kết chất lượng).
- ĐẦU RA MỐC: Nộp bản `spec.md` hoàn chỉnh trước 23:59. (Không thay đổi Quality Bar sau thời điểm này).

### Giai đoạn 5: Kiểm định thực tế với Người dùng (Sáng Ngày 2 - Hoàn thành CP5)
- P6 (Validation Lead): Tìm 5 cá nhân không thuộc nhóm. Giao máy tính cho họ trải nghiệm nguyên mẫu trong 10 phút. Ghi nhận 3 câu trả lời bắt buộc (Khó hiểu chỗ nào? Có tin tưởng không? Có dùng thực tế không?).
- P5 & P3: Chờ báo cáo nhanh từ P6 để thực hiện các thay đổi khẩn cấp trên giao diện hoặc Prompt (nếu cần). 
- P1 (Product Owner): Ghi nhận các thay đổi vào phần Nhật ký sửa đổi (Changelog).
- Toàn bộ 6 thành viên: Viết tài liệu phản tư cá nhân (Reflection) đưa vào thư mục `reflection/`.
- ĐẦU RA MỐC: Nộp tệp nhật ký phản hồi (Feedback logs) và sẵn sàng trả lời phỏng vấn từ Ban Giám Khảo (Vibe-checking).

### Giai đoạn 6: Hoàn thiện Báo cáo & Trình bày (Hoàn thành CP6)
- P6 & P1: Thiết kế Slide trình bày (Quy định: Mọi thông tin trên slide phải kèm theo số liệu đo lường hoặc trích dẫn người dùng cụ thể). So sánh kết quả thực tế với Quality Bar đã chốt ở Giai đoạn 4.
- Toàn bộ nhóm: Tổ chức chạy thử toàn bộ chương trình trong giới hạn 5 phút. Phân chia rõ ràng phần nói của từng thành viên.
- P5 & P6 (Demo): Chuẩn bị sẵn 1 kịch bản hoạt động trơn tru (Happy Path) và 1 kịch bản xử lý rủi ro xuất sắc (Graceful Degradation) để trình diễn trực tiếp trên sân khấu.
- ĐẦU RA MỐC: Hoàn tất phần thuyết trình trực tiếp và vấn đáp với Ban Giám Khảo.

---

## IV. TIÊU CHUẨN HOÀN THIỆN VÀ ẤN TƯỢNG (WOW FACTOR)
Để tối ưu hóa điểm số và tạo ấn tượng mạnh mẽ với Ban Giám Khảo, nhóm cần đảm bảo các yếu tố sau:
1. Xử lý Lỗi Thanh Lịch (Graceful Degradation): Tuyệt đối không để AI đưa ra thông báo lỗi chung chung. Phải hướng dẫn người dùng hành động tiếp theo một cách hợp lý khi yêu cầu vượt quá giới hạn.
2. Tính Minh Bạch (Explainability): Hiển thị rõ nguồn tham chiếu hoặc căn cứ của AI bên dưới mỗi kết quả trả về, giúp người dùng tự xác minh thông tin.
3. Trung Thực Tuyệt Đối: Việc thừa nhận AI thất bại ở một số tình huống khó và đưa ra phương án khắc phục sẽ được đánh giá cao hơn việc báo cáo tỷ lệ thành công 100% thiếu cơ sở thực tế.
