# VLearn Slide Tutor — prototype

Xem slide bài giảng · cuộn liên tục · bôi đen một đoạn (hoặc **nói**) · nhận câu trả lời
**có trích dẫn trang bấm được**.

**Giai đoạn 2 — AI chạy thật.** Quyết định trung tâm gọi **gemma-4** qua proxy
`server.mjs`; lớp tra cứu, phép phủ định và kiểm trích dẫn nguyên văn chạy bằng code.
Ghi chú cá nhân hoá vẫn chưa có. Bản này có: cuộn liên tục, đường lui khi AI bí (nhánh thứ 5 *ngoài tài liệu* + chuyển TA), chế độ sáng/tối,
trên một bản giao diện Console.

---

## Chạy

```bash
cd codebase
node server.mjs
```

`server.mjs` phục vụ file tĩnh **và** proxy LLM trên cùng cổng **8080**. Phải dùng nó
thay `python -m http.server`, vì API key nằm trong `.env` ở gốc repo và **không được
xuống client** (CONTRACT §4 mục 3) — proxy giữ key lại ở server.

```bash
curl -s localhost:8080/api/llm/health     # → {"ok":true,"model":"gemma-4"}
```

Không có `.env` hoặc LLM chết thì mọi thứ **vẫn chạy**, tự rơi về nhân mock — và nhãn
trên thanh trên đổi thành `nhân mock` để không ai tưởng đang xem AI thật.

Mở một trong ba:

| URL | Phong cách |
|---|---|
| `localhost:8080/prototype.html` | **Console** — bảng điều khiển, phơi bày cơ chế |

Không `npm install`, không build step — `server.mjs` chỉ dùng thư viện chuẩn của Node.
`pdf.js` có sẵn trong `vendor/` nên UI không cần mạng (chỉ lời gọi LLM cần).

Nạp slide bằng *Mở PDF*, kéo-thả, hoặc `?file=/data/slides/day03.pdf` (server phục vụ
`data/` cùng origin nên link này chạy được):

```
localhost:8080/prototype.html?file=/data/slides/day03.pdf
```

> **Về deck trong repo:** `data/slides/day03.pdf` **có** được commit — nhóm chủ động giữ
> để mọi thành viên và TA chạy lại được cùng một bộ đo. Còn `pages.json` (text đã trích)
> thì **không** commit, `.gitignore` chặn. Data pack gốc trong `data/vlearn-pack/` do BTC
> cấp sẵn trong repo khởi tạo.

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
| **Nạp toàn bộ text trang đang xem vào ngữ cảnh** | **THẬT** — đây là lát cắt, `core.mjs` route neo trang |
| **Sinh câu trả lời** | **THẬT** — gemma-4 qua `server.mjs`, key ở server |
| **Kiểm mọi trích dẫn có cắt nguyên văn từ đúng trang** | **THẬT** — `verifyCitations()`, quote không khớp thì **bỏ** |
| Trả lời ngoài tài liệu (nhánh thứ 5) | **THẬT** — gọi LLM lần hai, 0 trích dẫn, tin cậy ≤45%, **chỉ khi user bấm** |
| **Chuyển câu hỏi cho TA** | **MOCK** — dựng đủ tin nhắn (trang + đoạn bôi đen + trace) rồi copy clipboard; **không** có tích hợp Discord/LMS thật |
| Pane Ghi chú cá nhân hoá | **CHƯA CÓ** — non-goal |

Mọi trích dẫn là chữ có thật trong tài liệu — không phải vì tin lời mô hình, mà vì code
kiểm lại từng quote xem có nằm trong text trang hay không, không khớp thì bỏ citation đó.
Nếu bỏ hết thì tự cắt lại quote bằng code và **hạ trần tin cậy xuống 0,70**.

---

## Kiểm thử

```bash
pip install pypdf
python dump-pages.py ../data/slides/day03.pdf ../../tmp/pages.json   # ghi RA NGOÀI repo

node test-core.mjs      ../../tmp/pages.json    # 4 lớp chỗ khó
node test-intents.mjs  ../../tmp/pages.json    # bộ định tuyến: 16 intent + bẫy hồi quy
node ../eval/run-golden.mjs ../../tmp/pages.json --core=real --run=19  # golden set 56 case
```

Kết quả trên deck Day 3 (44 trang):

| Bộ | Kết quả |
|---|---|
| `test-core.mjs` | **14/14** kịch bản · **24/24** trích dẫn nguyên văn · **8/8** phép phủ định |
| `test-intents.mjs` | **118/118** (neo trang · 7 intent mới, mỗi intent ≥1 case âm · bẫy hồi quy) · **27/27** trích dẫn nguyên văn |
| `eval/run-golden.mjs` (AI thật) | **55/56 = 98,2%** · bar cam kết ≥90% |

`test-intents.mjs` canh riêng cái dễ mất nhất: mở rộng grounding sang `page_text`
mà **không** chọc lỗ vào cổng chống bịa. Bẫy quan trọng nhất là *bôi đen một đoạn rồi
hỏi về `streaming`* — phải **vẫn** từ chối.

Bản Console đã kiểm bằng Chrome headless (CDP): 44 khung trang, ảo hoá đúng (4 canvas
sống), nhãn hiện `AI thật (gemma-4)`, case neo trang trích đúng Tr.37, nhánh ⚠️ ngoài tài
liệu ra **0 trích dẫn** + tin cậy 45%, chip chuyển TA gọi handler thật, **0 lỗi console**.

> `pages.json` chứa nguyên văn nội dung slide → ghi ra ngoài repo, không commit.

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

Và hai đường lui khi AI bí, **chỉ chạy khi user bấm** (không có nút nào là nút chết —
chiều D7 trong `eval/run-golden.mjs` tính chip không có handler là **fail**):

| Chip | Làm gì |
|---|---|
| **Trả lời ngoài tài liệu ⚠️** | Nhánh quyết định **thứ 5** `outside_document`: gọi LLM lần hai không đưa ngữ cảnh tài liệu, trả **0 trích dẫn**, tin cậy ≤0,45, viền cảnh báo. Vì sao không gọi là `answer`: bất biến #2 nói `answer` ⇒ `citations ≥ 1` |
| **Chuyển câu này cho TA** | Dựng tin nhắn có câu hỏi + số trang + đoạn bôi đen + trace giải thích vì sao tutor bí, rồi copy clipboard. **Mock có nhãn** — chưa nối Discord thật |

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
| **PAIR** lỗi có đường lui | 3 loại lỗi → 3 câu trả lời khác nhau + chip hành động | như Console | chip trên ghim |

---

## Log cho `eval/`

Nút xuất log (⬇ / ↓) tải JSON gồm mọi lượt: `request`, `response` (có `trace`), feedback
kèm lý do. `variant` trong metadata cho biết log đến từ bản nào.

---

## Giới hạn đã biết

- **Câu vô nghĩa bằng tiếng Việt có thể được trả lời** thay vì từ chối — case `G06`
  (`T0115` "điêu toa"), case duy nhất chưa đạt trong golden set. Phép phủ định chỉ áp cho
  token **không phải âm tiết tiếng Việt**, vì bỏ ràng buộc đó thì học viên gõ không dấu
  ("khai niem") bị từ chối oan. Không sửa được bằng ngưỡng điểm — đã đo: `"abc def ghi"`
  ăn 3,81đ (do `def` có trong code Python Tr.33) còn `"điêu toa"` chỉ 2,75đ. Cần embedding.
- Chưa có pane Ghi chú cá nhân hoá (non-goal).
- Retrieval là keyword + idf, chưa có embedding (non-goal).
- Số **98,2%** chỉ chắc trên **một deck** (day03, 44 trang). Chưa đo trên 6 transcript còn lại.
- Chuyển TA là **mock**: copy clipboard, chưa đẩy vào Discord khoá.
- PDF scan (không có text layer) không tra cứu được — nhưng **từ chối với lý do riêng**,
  không lẫn với "tài liệu không chứa" (case `G31`).
