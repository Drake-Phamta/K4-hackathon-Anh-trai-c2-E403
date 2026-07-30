# VLearn Slide Tutor — prototype

Xem slide bài giảng · cuộn liên tục · bôi đen một đoạn (hoặc **nói**) · nhận câu trả lời
**có trích dẫn trang bấm được**.

**Vẫn giai đoạn 1:** nhân AI **mock hoàn toàn** — không có lời gọi LLM nào. Ghi chú cá
nhân hoá là GĐ2. Bản này bổ sung: cuộn liên tục (không còn lật từng trang), **trò chuyện
bằng giọng nói thời gian thực**, chế độ sáng/tối, và **3 phong cách giao diện** dựng trên
cùng một nhân — để chọn hướng trước khi khoá UI cuối cùng.

---

## Chạy

```bash
cd codebase
python -m http.server 8080
```

> Cổng **8080**, không phải 8000 — `ptalk_engine/` (STT/TTS của nhóm) chạy uvicorn ở
> cổng 8000. Hai server khác việc, không được đụng cổng nhau.

Mở một trong ba:

| URL | Phong cách |
|---|---|
| `localhost:8080/prototype.html` | **Console** — bảng điều khiển, phơi bày cơ chế |
| `localhost:8080/prototype-minimal.html` | **Đọc** — phòng đọc yên tĩnh, cơ chế ẩn sau `▸` |
| `localhost:8080/prototype-wild.html` | **Bàn Slide** — hội thoại ghim thẳng lên slide |

Không cài gì, không build step. `pdf.js` đã có sẵn trong `vendor/` nên demo không cần mạng.
Slide **không nằm trong repo** (quy định bảo mật data pack) — nạp lúc chạy bằng *Mở PDF*
hoặc kéo-thả, hoặc `?file=<url>` cho PDF cùng origin.

---

## Ba phong cách, một nhân

```
             ┌── prototype.html ─────────┐
core.mjs ────┼── prototype-minimal.html ─┼──── viewer.mjs (PDF, cuộn, bôi đen)
(AI seam)    └── prototype-wild.html ────┘──── voice.mjs  (giọng nói, ngắt lời)
                                          └──── ui.mjs     (request/response/theme)
```

Ba file HTML **không tự dựng lại PDF hay giọng nói** — dựng 3 lần là 3 bộ bug. Mỗi bản
chỉ khác CSS + bố cục + cách trình bày câu trả lời. Sửa một bug trong `viewer.mjs` là
sửa cho cả ba.

| File | Vai trò |
|---|---|
| `core.mjs` | **SEAM.** Contract + retrieval + mock. GĐ2 chỉ sửa file này. |
| `viewer.mjs` | pdf.js cuộn liên tục + ảo hoá (chỉ render trang gần khung nhìn) + bôi đen + highlight. |
| `voice.mjs` | Giọng nói thời gian thực — xem mục riêng bên dưới. |
| `ui.mjs` | Tiện ích dùng chung: dựng `AskRequest`, markdown tối giản, theme, xuất log. |
| `prototype*.html` | UI thuần — không chứa logic AI, chỉ gọi `askTutor()`. |
| `CONTRACT.md` | Hợp đồng `AskRequest`/`AskResponse` — đã chốt. |
| `test-core.mjs` | Kiểm thử `core.mjs` không cần trình duyệt. |
| `dump-pages.py` | PDF → `pages.json` để chạy test. |

Chia việc GĐ2 theo đúng ranh giới file: người làm AI sửa `core.mjs`, người làm UI sửa
phần trình bày trong `prototype*.html`. Không giẫm chân nhau.

---

## Ba phong cách — vì sao khác nhau

**Console** (`prototype.html`) — bảng điều khiển kỹ thuật. Trace mở sẵn, badge đậm, mono
cho số. Đúng gu người build muốn nhìn thấy cơ chế đang chạy, dùng để debug prompt và demo
cho giám khảo kỹ thuật.

**Đọc** (`prototype-minimal.html`) — phòng đọc. Cùng dữ liệu, khác thái độ: trace gói
trong `▸ cách mình làm` — đóng mặc định, mở khi bị hỏi. Bo tròn nhiều, khoảng trắng rộng,
palette giấy + xanh thông (không phải cream/terracotta mặc định). Hợp demo cho học viên —
không doạ người mới bằng thuật ngữ workflow.

**Bàn Slide** (`prototype-wild.html`) — thử nghiệm phá bố cục. Bỏ hẳn cột chat: câu trả
lời là một **ghim** treo cạnh đúng đoạn nó trích dẫn, nối bằng sợi chỉ vẽ tay. Dải phim
thumbnail bên trái thay cho page number, chấm đồng đánh dấu trang đã hỏi. Palette mực +
đồng thau (dụng cụ) + lơ (bằng chứng) + san hô (dừng) — một thế giới thị giác duy nhất,
cam kết tối, có "đèn bàn" thay vì light mode giấy trắng vì nền trắng phá vỡ ngôn ngữ
ghim + chỉ dẫn. Rủi ro: nhiều ghim cùng lúc thì bàn rối — có nút *Dọn bàn*.

Không bản nào là "bản chính". Ba bản là ba giả thuyết thiết kế để test với người dùng
thật ở CP5 — giữ bản nào phụ thuộc feedback, không phải gu của người build.

---

## Trò chuyện bằng giọng nói (mới)

Hai cỗ máy, tự dò, giao diện luôn nói rõ đang chạy cái nào (G2):

| Cỗ máy | Khi nào dùng | Chất lượng |
|---|---|---|
| **Web Speech API** (mặc định) | Luôn sẵn trên Chrome/Edge, không cần cài | Khá cho tiếng Việt phổ thông, có kết quả tạm thời (chữ hiện ngay khi đang nói) |
| **PTalk** (`ptalk_engine/` — Drake-Phamta) | Tự bật nếu server đang chạy ở `:8000` | ZipFormer/Whisper + OmniVoice tiếng Việt, có voice cloning — tốt hơn cho thuật ngữ AI |

Chạy PTalk (tuỳ chọn):
```bash
cd ptalk_engine
python setup_folders.py
# copy model ZipFormer + ref.wav theo hướng dẫn setup_folders.py in ra
uvicorn app_api:app --port 8000          # terminal 1
python tts_server.py                     # terminal 2
```
Không chạy PTalk thì cả 3 bản **vẫn hoạt động đầy đủ** — tự rơi về Web Speech.

**Ngắt lời (barge-in):** user mở miệng nói là tutor im ngay, không phải đợi nó nói hết.
Không có cái này thì hội thoại giọng nói rất khó chịu — phải chờ nhau như bộ đàm.

---

## Cuộn liên tục + ảo hoá

44 trang render hết cùng lúc sẽ đơ máy yếu. `viewer.mjs` chỉ giữ canvas cho trang gần
khung nhìn (`IntersectionObserver`), trang đi xa thì thu hồi — khung giữ chỗ (`.pv-page`)
vẫn còn nên thanh cuộn không nhảy. Đã kiểm: 44 khung trong DOM, ~3-5 canvas sống tại một
thời điểm.

---

## Phần nào mock, phần nào thật

| Thành phần | Trạng thái |
|---|---|
| Render PDF, cuộn liên tục, ảo hoá, zoom | **THẬT** — pdf.js |
| Bôi đen text trên slide | **THẬT** — text layer của pdf.js |
| Trích text mọi trang | **THẬT** — `getTextContent()` |
| Tra cứu, xếp hạng trang, chọn câu trích dẫn | **THẬT** — `retrieve()` trong `core.mjs` |
| Phát hiện thiếu căn cứ (nhánh ①), kể cả cụm ghép (`multi-agent` ≠ `multi-step`) | **THẬT** |
| Nhận diện giọng nói / đọc câu trả lời | **THẬT** — Web Speech hoặc PTalk, không mock |
| **Văn phong câu trả lời** | **MOCK** — template dựng từ chữ trong trang, không có LLM |
| Pane Ghi chú cá nhân hoá | **CHƯA CÓ** — GĐ2 |

Mọi trích dẫn là chữ có thật trong tài liệu; chỉ câu văn bao quanh là dựng sẵn. GĐ2 thay
đúng phần văn phong bằng LLM, giữ nguyên lớp grounding và giữ nguyên giọng nói.

---

## Kiểm thử

```bash
pip install pypdf
python dump-pages.py <slide.pdf> ../../tmp/pages.json   # ghi RA NGOÀI repo
node test-core.mjs ../../tmp/pages.json
```

Kết quả trên deck Day 3 (44 trang): **14/14 kịch bản · 24/24 trích dẫn nguyên văn ·
8/8 phép phủ định.** Cả 3 giao diện đã kiểm bằng Chrome headless (CDP): dựng đủ 44
khung trang, ảo hoá đúng (< 44 canvas sống), bôi đen được, 5 kịch bản ra đúng nhánh,
citation nhảy trang + tô đúng đoạn, đổi được sáng/tối, không exception — **14/14 mỗi bản**.

> `pages.json` chứa nguyên văn nội dung slide → ghi ra ngoài repo, không commit.
> `.gitignore` đã chặn `*.pdf`, `pages.json`.

---

## Năm kịch bản demo

Có ở cả 3 bản (nhãn khác nhau, cùng logic — neo vào deck Day 3, ReAct):

| Kịch bản | Lớp | Điều cho người xem thấy |
|---|---|---|
| happy | — | Bôi đen Trang 22 → trả lời kèm **2 trích dẫn bấm được** |
| mơ hồ | ② | *"cái này khác cái kia?"* → hỏi lại đúng 1 câu, không đoán |
| không căn cứ | ① | *"LangGraph có streaming?"* → có LangGraph (Tr.30), không có streaming ở đâu cả → nói thẳng |
| ngoài phạm vi | ③ | *"làm hộ Lab 3"* → từ chối + chuyển hướng |
| tiền đề sai | ④ | *"ReAct là fine-tuning?"* → sửa hiểu lầm trước |

Case ① là case mạnh nhất: tài liệu có `multi-step`/`prompt tuning` nhưng không có
`multi-agent`/`fine-tuning`. Trả lời cái sau bằng trang của cái trước là kiểu bịa nguy
hiểm nhất vì nghe rất có lý — `core.mjs` kiểm cụm ghép riêng để chặn.

---

## Nguyên tắc HAX — trỏ vào vị trí cụ thể (cả 3 bản)

| Nguyên tắc | Console | Đọc | Bàn Slide |
|---|---|---|---|
| **G1** làm rõ phạm vi | Dòng chào đầu chat | Dòng chào đầu chat | Placeholder ô nhập + trace |
| **G2** tin đến đâu | Badge % + trace mở | Badge % + `▸` đóng | Badge % trên ghim |
| **G10** thu hẹp khi nghi ngờ | Nhánh clarify | Nhánh clarify (nền hổ phách) | Nhánh clarify (viền hổ phách) |
| **G11** giải thích vì sao | Chip trang → nhảy + tô | Chip trang → nhảy + tô | Chip trang **+ sợi chỉ nối trực quan** |
| **G9** sửa dễ | Nút Thu hẹp phạm vi | Nút Thu hẹp | Ô nhập luôn nổi, gõ lại tức thì |
| **G8** gạt bỏ dễ | Nút Ẩn | Nút Ẩn | Nút ✕ trên từng ghim + Dọn bàn |
| **G15** mời feedback | 👍👎 + lý do | 👍👎 + lý do | 👍👎 trên ghim |

---

## Log cho `eval/`

Nút xuất log (⬇ / ↓) tải JSON gồm mọi lượt: `request`, `response` (có `trace`), feedback
kèm lý do. `variant` trong metadata cho biết log đến từ bản nào.

---

## Giới hạn đã biết

- Chưa có pane Ghi chú cá nhân hoá (GĐ2).
- Không có LLM thật (GĐ2) — `realCore()` trong `core.mjs` ném lỗi có chủ đích.
- Retrieval là keyword + idf, chưa có embedding.
- Web Speech cần Chrome/Edge; PTalk cần chạy server riêng (tuỳ chọn, xem trên).
- PDF scan (không có text layer) sẽ không tra cứu được — `dump-pages.py` cảnh báo nếu gặp.
- Bàn Slide: nhiều ghim cùng lúc trên một trang có thể chồng khoảng cách dọc — dùng
  *Dọn bàn* giữa các câu hỏi khi demo.
