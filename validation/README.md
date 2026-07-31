# Vòng validation với người dùng thật — protocol

**Chạy sáng N2, trước CP5 (14:00).** Cần **≥5 người ngoài nhóm**, trong đó có
**≥2 willing user đã khai từ CP1** (`spec.md` §8).

Guide §4.2 gợi ý cách nhanh nhất: **đổi chéo với nhóm khác trong Zone Z5** —
ai trong khoá cũng là user thật của VLearn.

---

## Chuẩn bị trước khi mời người đầu tiên

```bash
# terminal 1 — web + proxy LLM (cổng 8080)
cd codebase && node server.mjs

```

Mở `localhost:8080/prototype.html`, nạp `data/slides/day03.pdf`, kiểm nhãn góc
trên phải hiện **`AI thật (gemma-4)`**. Nếu hiện `nhân mock` thì LLM chưa nối
được — sửa trước, đừng test bằng nhân mock rồi ghi là AI thật.

---

## Một phiên · 10 phút / người

### ① Giao task thật rồi **IM LẶNG**

Đưa máy cho họ, đọc to một task card (`task-cards.md`), rồi **không nói gì nữa**.

- **Không** thuyết minh "chỗ này là trace, chỗ kia là trích dẫn".
- **Không** gợi ý "bạn thử bôi đen xem".
- **Ghi lại họ bấm gì, kẹt ở đâu, im lặng bao lâu trước khi bấm.**

Chỗ họ kẹt là dữ liệu. Mình mở miệng đỡ là mất dữ liệu đó.

### ② Hỏi **đúng ba câu** này, không thêm

1. **"Điều gì khó hiểu hoặc khó chịu nhất?"**
2. **"Kết quả này bạn có tin không — vì sao?"**
3. **"Bạn có dùng thật không — vì sao / vì sao chưa?"**

### ③ Log **nguyên văn**

Chép đúng chữ họ nói vào `feedback-log.md`. Không diễn giải lại cho hay hơn,
không lược bớt phần khó nghe — phần khó nghe mới là phần đáng tiền.

---

## Cảnh báo từ guide §4.2

> **Nếu mọi phản hồi đều là lời khen, phiên test chưa đạt** — giao lại task khó
> hơn hoặc đổi người thử.

Prototype này có **3 chỗ được thiết kế để gây khó chịu có chủ đích**. Nếu không
ai phàn nàn về ít nhất một trong ba thì task chưa đủ khó:

1. Nhánh `no_grounding` **từ chối trả lời** dù học viên thấy trang có chữ.
2. Nhánh `clarify` **hỏi lại** thay vì trả lời ngay.
3. Nhánh `out_of_scope` **không làm hộ Lab** dù học viên xin.

---

## Sau khi xong 5 người

Điền 4 dòng tổng hợp ở cuối `feedback-log.md`:

- **Chủ đề lặp nhiều nhất** — thứ ≥3/5 người nói giống nhau.
- **1–2 thay đổi làm TRƯỚC demo** → ghi vào `spec.md` §9 Changelog.
- **Giữ nguyên có lý do** — feedback nào nghe hợp lý nhưng nhóm quyết không sửa, và vì sao.
- **Backlog** → lên slide 6 ("Nếu có thêm 1 tuần").

**Quan trọng:** rubric R6 cho 4 điểm cho *"≥1 thay đổi từ feedback ghi trong
Changelog, **hoặc giữ nguyên có lý do căn cứ**"*. Giữ nguyên mà giải trình được
cũng đủ điểm — nên đừng sửa vội một thứ chưa hiểu rõ chỉ để có gì mà ghi.
