# D8 · Đúng cỡ, đúng giọng — chiều duy nhất chấm bằng người

D1–D7 là substring/regex nên máy chấm, ai chạy cũng ra một kết quả. Nhưng
*"câu trả lời có đúng cỡ và đúng giọng cho học viên hay không"* thì không có
regex nào đo được — nên tách riêng, chấm tay, và **không trộn vào con số tự
động** trong `results-run*.md`.

Guide §2.6 mục 4: *"Hai thành viên chấm độc lập cùng 5 output → so. Lệch =
định nghĩa mơ hồ → viết lại. Trong nhóm còn chấm khác nhau thì không dùng
chấm được ai."*

---

## Thang 1–5 · mỗi mức có mô tả kiểm được, không chấm theo cảm giác

| Điểm | Mô tả | Dấu hiệu nhận ra |
|---|---|---|
| **1** | **Sai kiến thức** | Nói ngược nội dung slide, hoặc gật theo tiền đề sai của học viên |
| **2** | Đúng nhưng **lệch cỡ nặng** | Dài gấp 3 lần cần thiết, hoặc ngắn đến mức không trả lời được câu hỏi |
| **3** | Đúng, **dài gấp đôi** cần thiết | Đọc xong phải tự lọc lại ý; hoặc lặp lại nguyên văn cả trang thay vì tóm |
| **4** | Đúng, đúng cỡ, nhưng **giọng lệch** | Dùng thuật ngữ chưa giải thích, hoặc giọng quá hàn lâm / quá suồng sã so với học viên đi làm |
| **5** | Đúng · đúng cỡ · có trích dẫn · **giọng vừa** | Trả lời trong 2–4 gạch đầu dòng, mỗi ý bám một câu có thật trong trang, đọc một lượt là hiểu |

**Quy ước:** ≤2 là **không chấp nhận được** · 3 là **sửa được** · ≥4 là **dùng được**.

---

## Cách chấm

1. Mở `eval/trace-log-run1.json`, lấy **5 case** dưới đây (cố ý trải đủ 4 nhánh
   quyết định, không chỉ toàn happy path):

   | Case | Nhánh | Vì sao chọn |
   |---|---|---|
   | `G21` | answer · neo trang | case chủ lực của lát cắt |
   | `G01` | no_grounding | câu từ chối có dễ hiểu không, hay nghe như lỗi hệ thống |
   | `G07` | clarify | hỏi lại **một** câu, có thật là câu dễ trả lời không |
   | `G12` | out_of_scope | từ chối mà **vẫn hữu ích** hay từ chối rồi bỏ mặc |
   | `G16` | answer · tiền đề sai | đính chính có làm học viên tự ái không |

2. **Hai thành viên chấm ĐỘC LẬP** — không xem điểm của nhau, không bàn trước.
3. Điền vào bảng dưới. Lệch ≥2 điểm ở cùng một case → **viết lại mô tả mức**
   trong thang trên rồi chấm lại, đừng ép nhau về một số.

---

## Bảng chấm — lượt 1

| Case | Người chấm A (tên: ⚠️ TODO) | Người chấm B (tên: ⚠️ TODO) | Lệch | Ghi chú của người chấm |
|---|---|---|---|---|
| G21 | | | | |
| G01 | | | | |
| G07 | | | | |
| G12 | | | | |
| G16 | | | | |
| **Trung bình** | | | | |

**Kết luận D8:** ⚠️ chưa chấm — điền sáng N2 trước CP5.

**Số case lệch ≥2 điểm:** ___ / 5 → nếu >1 thì định nghĩa thang chưa đủ rõ,
phải viết lại và ghi vào Changelog `spec.md` §9.

---

## Vì sao D8 không nằm trong quality bar

Quality bar (`spec.md` §7) chốt bằng D1–D7 vì chúng tái lập được. D8 là chiều
**định hướng cải thiện**, không phải chiều để cam kết bằng số — cam kết một con
số dựa trên chấm tay của chính nhóm mình thì người ngoài không kiểm lại được, mà
rubric đòi ngược lại: *"người ngoài nhóm chấm ra cùng kết quả"*.
