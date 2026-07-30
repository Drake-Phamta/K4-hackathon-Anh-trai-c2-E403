# AI SPEC — Tối ưu Context RAG cho tính năng Bôi đen · Nhóm Anh trai c2 · Zone Z5
Hướng: [x] A — VLearn  [ ] B — Trợ lý Học viên  [ ] C — Làn mở
Loại: [x] Tối ưu tính năng có sẵn  [ ] Tính năng mới

## Canvas CP1 (7 dòng)
- **Hướng:** A - VLearn
- **Job executor:** Học viên đang học bài trên VLearn.
- **Pain 1 câu:** Học viên muốn AI giải thích/tóm tắt một đoạn tài liệu cụ thể đang xem, nhưng AI liên tục báo lỗi do chỉ nhận được duy nhất từ khóa bôi đen mà không có toàn bộ ngữ cảnh của trang tài liệu đó.
- **Bằng chứng đầu tiên:** Data mining từ 1.261 lượt chat cho thấy 307 lần (24.3%) AI báo lỗi "Không tìm thấy nội dung/Rất tiếc..." và 37 lượt Downvote đều xuất phát từ việc thiếu Context này.
- **Lát cắt 1 câu:** 1 học viên đang xem bài giảng · bôi đen 1 đoạn và hỏi rộng · AI tự động bốc toàn bộ transcript của trang hiện tại nạp vào Context · Trả về câu trả lời chính xác dựa trên toàn bộ nội dung trang đó thay vì chỉ dựa vào từ khóa.
- **Automation dự kiến:** Conditional (Điều kiện) - Nếu có chọn trang, tự động kẹp transcript trang đó vào prompt. Lý do: Sai thì rẻ (trả lời sai học viên tự thấy và hỏi lại), nhưng nếu không kẹp thì chắc chắn 100% AI trả lời sai/từ chối.
- **Willing users dự kiến:** User 1, User 2, User 3 (Sẽ đi tìm ở CP5).
- **Phân công có tên:** (Đã cập nhật ở file README.md)

---
*(Các phần dưới đây sẽ tiếp tục hoàn thiện và chốt trước 23:59 Ngày 1)*

## §1. User & Job
- Job executor + workflow (đính kèm worksheet JTBD / ảnh sơ đồ): Học viên đang trong buổi học.
- Core JTBD: Làm rõ ngay nội dung của một trang slide cụ thể mà không cần AI phải tìm kiếm mông lung trong toàn bộ tài liệu.
- Problem statement: Hệ thống hiện tại chỉ truyền chuỗi văn bản bôi đen ngắn ngủi cho AI, khiến AI thiếu bối cảnh và từ chối trả lời (hoặc trả lời sai không có trích dẫn) khi học viên hỏi các câu hỏi vĩ mô như "tóm tắt trang này".
- Evidence: (Đã trích xuất ra file `eval/missing_context_errors.csv`)
  - Số liệu mining: n = 1261 lượt hội thoại, 307 lượt (24%) lỗi thiếu context, 46.2% lỗi trả lời không có trích dẫn.
  - ≥5 quote nguyên văn: 
    - Q: "tóm tắt nội dung chính trong slide này" -> A: "Xin lỗi bạn, tôi không tìm thấy..."
    - Q: "tóm tắt những nội dung quan trọng nhất trong day 04" -> A: "Chào bạn, hiện tại tôi không tìm thấy..."

## §2. Impact & quyết định chọn
*(Nhóm sẽ điền bảng đánh giá 3 ý tưởng và lý do chọn ý tưởng này vào đây)*

## §3. Giải pháp tương tự đã nghiên cứu
*(Nhóm điền các sản phẩm đã nghiên cứu vào đây)*

## §4. Thiết kế
*(Nhóm sẽ điền HAX/PAIR vào đây ở CP4)*

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản (≥8) 
*(Nhóm sẽ điền vào đây ở CP4)*

## §6. Bốn đường đi của trải nghiệm
*(Nhóm sẽ điền vào đây ở CP4)*

## §7. Kiểm thử
- Golden set: Sử dụng file `eval/missing_context_errors.csv` làm tập test chính.
- Quality bar: Đạt khi ≥ ___% qua bộ (Chốt lúc 23:59 N1).

## §8. Phân công & kế hoạch
*(Nhóm tự điền)*

## §9. Changelog
*(Dành cho N2)*
