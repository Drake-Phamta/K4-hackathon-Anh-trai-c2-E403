# VLearn Slide Tutor — prototype

Xem slide bài giảng · bôi đen một đoạn · hỏi · nhận câu trả lời **có trích dẫn trang bấm được**.

**Giai đoạn 1 (bản này):** PDF + chat. Nhân AI **mock hoàn toàn** — không có lời gọi LLM nào.
Ghi chú cá nhân hoá là **GĐ2**.

---

## Chạy

```bash
cd codebase
python -m http.server 8000
# mở http://localhost:8000/prototype.html  →  bấm "Mở PDF" và chọn file slide
```

Không cài gì, không build step. `pdf.js` đã để sẵn trong `vendor/` nên **demo không cần mạng**.

> **Vì sao phải qua http.server mà không double-click file?**
> `file://` chặn ES module import và Web Worker (CORS) → pdf.js không chạy được.
> `python -m http.server` không phải build step: không cài, không compile, một lệnh.

**Slide không nằm trong repo** (quy định bảo mật data pack — xem README gốc).
Nạp lúc chạy bằng nút *Mở PDF* hoặc kéo-thả. Có thể dùng `?file=<url>` cho PDF cùng origin.

---

## File

| File | Vai trò |
|---|---|
| `prototype.html` | Toàn bộ UI — PDF pane, chat pane, render trace/citation. Không chứa logic AI. |
| `core.mjs` | **SEAM.** Contract + retrieval + mock. GĐ2 chỉ sửa file này. |
| `CONTRACT.md` | Hợp đồng `AskRequest`/`AskResponse` — đã chốt, code hai bên theo đây. |
| `test-core.mjs` | Kiểm thử `core.mjs` không cần trình duyệt. |
| `dump-pages.py` | PDF → `pages.json` để chạy test. |
| `vendor/` | pdf.js 5.7.284 bản offline. |

Chia việc GĐ2 theo đúng ranh giới file: người làm AI sửa `core.mjs`, người làm UI sửa
`prototype.html` (pane Ghi chú). Không giẫm chân nhau.

---

## Phần nào mock, phần nào thật

Quan trọng cho rubric R5 (*"mức prototype khai báo khớp thực tế"*) — khai đúng:

| Thành phần | GĐ1 | Ghi chú |
|---|---|---|
| Render PDF, lật trang, zoom | **THẬT** | pdf.js |
| Bôi đen text trên slide | **THẬT** | text layer của pdf.js |
| Trích text 44 trang | **THẬT** | `getTextContent()` |
| Tra cứu, xếp hạng trang, chọn câu trích dẫn | **THẬT** | `retrieve()` trong `core.mjs` |
| Phát hiện thiếu căn cứ (nhánh ①) | **THẬT** | so từ khoá quyết định với tài liệu |
| **Văn phong câu trả lời** | **MOCK** | template dựng từ chính chữ trong trang — **không có LLM** |
| Pane Ghi chú | **CHƯA CÓ** | GĐ2 |

Nói cách khác: **mọi trích dẫn đều là chữ có thật trong tài liệu**, chỉ có câu văn bao quanh
là dựng sẵn. GĐ2 thay đúng phần văn phong bằng LLM và giữ nguyên lớp grounding.

---

## Kiểm thử

```bash
pip install pypdf
python dump-pages.py <slide.pdf> ../../tmp/pages.json   # ghi RA NGOÀI repo
node test-core.mjs ../../tmp/pages.json
```

Kiểm 3 thứ: mỗi kịch bản rơi đúng nhánh · mọi `quote` khớp nguyên văn text trang ·
phép phủ định đúng (thứ không có trong tài liệu bị đánh dấu, thứ có thì không bị từ chối oan).

Kết quả trên deck Day 3 (44 trang): **14/14 kịch bản · 24/24 trích dẫn · 8/8 phép phủ định.**

> `pages.json` chứa nguyên văn nội dung slide → **ghi ra ngoài repo, không commit.**
> `.gitignore` đã chặn sẵn `*.pdf` và `pages.json`.

---

## Năm kịch bản demo

Hàng nút **Kịch bản** dưới ô nhập bắn thẳng từng đường đi (neo vào deck Day 3 — ReAct):

| Nút | Lớp | Điều muốn cho người xem thấy |
|---|---|---|
| `happy` | — | Bôi đen Trang 22 → trả lời kèm **2 trích dẫn bấm được** (Tr.21 định nghĩa + Tr.22 ví dụ) |
| `mơ hồ ②` | ② | *"cái này khác cái kia?"* → **hỏi lại đúng 1 câu**, không đoán bừa |
| `không căn cứ ①` | ① | *"LangGraph có streaming?"* → LangGraph có ở Tr.30 nhưng **streaming không có ở trang nào** → nói thẳng, không bịa |
| `ngoài phạm vi ③` | ③ | *"làm hộ Lab 3"* → từ chối + chuyển hướng sang Debug Checklist |
| `tiền đề sai ④` | ④ | *"ReAct là fine-tuning?"* → **sửa hiểu lầm trước**, không gật theo |

Case đáng chú ý nhất là ①: tài liệu có `multi-step` nhưng không có `multi-agent`, có
`prompt tuning` nhưng không có `fine-tuning`. Hỏi cái sau mà trả lời bằng trang của cái trước
chính là kiểu bịa nguy hiểm nhất vì nghe rất có lý — `core.mjs` kiểm cụm ghép riêng để chặn.

---

## Nguyên tắc HAX — trỏ vào vị trí cụ thể

| Nguyên tắc | Ở đâu trong prototype |
|---|---|
| **G1** làm rõ phạm vi | Dòng chào đầu khung chat, ngay khi nạp tài liệu |
| **G2** làm rõ tin đến đâu | Badge `tin cậy N%` + trace strip hiện số căn cứ tìm được |
| **G10** thu hẹp khi nghi ngờ | Nhánh `clarify` — hỏi lại 1 câu thay vì đoán |
| **G11** giải thích vì sao | Chip `📄 Trang N` bấm được → nhảy trang + tô vàng đúng đoạn |
| **G9** sửa dễ | Nút *Thu hẹp phạm vi* + chip follow-up |
| **G8** gạt bỏ dễ | Nút *✕ Ẩn* — thu câu trả lời, không chặn việc đọc slide |
| **G15** mời feedback | 👍/👎 kèm ô *"Sai chỗ nào?"* → vào log phiên |

---

## Log cho `eval/`

Nút **⬇ Xuất log** tải về JSON gồm mọi lượt: `request`, `response` (có `trace` từng bước),
và feedback 👍/👎 kèm lý do. Đây là artifact cho rubric R5 (*log/trace trong repo*).

---

## Giới hạn đã biết

- Chưa có pane Ghi chú (GĐ2).
- Không có LLM thật (GĐ2) — `realCore()` hiện ném lỗi có chủ đích.
- Retrieval là keyword + idf, chưa có embedding. Đủ cho GĐ1, và là baseline để GĐ2 so.
- Chỉ render một trang mỗi lần (không cuộn liên tục).
- Chưa responsive cho màn hình hẹp.
- PDF scan (không có text layer) sẽ không tra cứu được — `dump-pages.py` cảnh báo nếu gặp.
