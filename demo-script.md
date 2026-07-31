# Kịch bản demo — 5 phút trình bày + 5 phút Q&A

**CP6 · 15:00 N2.** Bản UI dùng để demo: **Console** `codebase/prototype.html`.

Yêu cầu CP6: **mỗi thành viên nói ≥1 phần** · giám khảo có **thẻ chạy 1 case lạ tại chỗ**.

---

## Chuẩn bị trước khi lên (làm xong trước 14:40)

```bash
# terminal 1 — web + proxy LLM
cd codebase && node server.mjs
#   kiểm: curl -s localhost:8080/api/llm/health   →  {"ok":true,"model":"gemma-4"}

```


Mở `localhost:8080/prototype.html`, nạp `data/slides/day03.pdf`, rồi soát 4 thứ:

- [ ] Nhãn góc trên phải hiện **`console · AI thật (gemma-4)`** — nếu hiện `nhân mock` thì **dừng**, sửa trước khi lên sân khấu. Demo nhân mock mà nói là AI thật là gian.
- [ ] Đủ 44 khung trang, cuộn mượt.
- [ ] Bôi đen thử một đoạn → thanh "đoạn đã chọn" hiện lên.
- [ ] Zoom trình duyệt 100%, tắt thông báo, cắm sạc.

**Backup nếu live hỏng:** mở `eval/results-run1.md` và `eval/trace-log-run1.json` —
có đủ 48 case với trace thật. Nói thẳng là live hỏng và chuyển sang đọc log; đừng
diễn tiếp như không có gì.

---

## Phân vai · 5 phút

| Phút | Slide | Ai nói | Nội dung |
|---|---|---|---|
| 0:00–0:45 | 1 | **P2 (Data)** | Pain + 3 con số + 2 quote nguyên văn |
| 0:45–1:30 | 2 | **P1 (PO)** | Bảng 3 ứng viên, loại B và C **bằng số** |
| 1:30–3:30 | 3 | **P5 (UI) demo · P3 (AI) giải thích** | **Demo live 2 case** |
| 3:30–4:15 | 4 | **P4 (QA)** | 97,9% vs bar 90% + failure G06 |
| 4:15–4:45 | 5 | **P6 (Validation)** | 2 quote user thật + thay đổi đã làm |
| 4:45–5:00 | 6 | **P1** | Backlog 3 việc + bài học lớn nhất |

---

## Demo live — bấm gì, gõ gì, ra gì

### Case 1 · đường lành (~50 giây)

| Bước | Làm gì | Phải thấy gì |
|---|---|---|
| 1 | Gõ `37` vào ô số trang, Enter. **Đợi cuộn dừng hẳn** (~1,5s) | Trang 37 *Hybrid Pattern* ở đầu khung nhìn |
| 2 | **Không bôi đen gì.** Gõ: `tóm tắt nội dung chính trong slide này` | |
| 3 | Enter | Badge **✓ có căn cứ** · tin cậy ~72–94% · **≥1 chip trích dẫn Trang 37** (số chip tuỳ lượt — model trích 1–3 câu) |
| 4 | Bấm một chip trích dẫn | Nhảy tới Tr.37 và **tô vàng đúng đoạn được trích** |

**Câu phải nói ở bước 2:** *"Đây đúng câu học viên thật đã hỏi — turn `T0649`. Tutor
hiện tại trả lời: «không tìm thấy nội dung cụ thể cho slide 37, bạn có thể cung cấp
thêm thông tin» — trong khi học viên đang mở đúng trang 37."*

**Câu phải nói ở bước 4:** *"Trích dẫn này là chữ cắt nguyên văn từ trang. Code kiểm
lại từng quote, không khớp thì bỏ — không phải tin lời mô hình."*

### Case 2 · chỗ khó (~60 giây) — **đừng giấu case này, nó là phần được chấm cao**

| Bước | Làm gì | Phải thấy gì |
|---|---|---|
| 1 | Gõ `30`, Enter, đợi cuộn dừng | Trang 30 *Từ ReAct Đến LangGraph* |
| 2 | Gõ: `LangGraph có hỗ trợ streaming không?` | Badge **∅ không có căn cứ** · tin cậy **8%** · nói rõ `có: langgraph` / `không có: streaming` |
| 3 | **Bôi đen một đoạn bất kỳ trên Tr.30, hỏi lại đúng câu đó** | **VẪN** `∅ không có căn cứ` |
| 4 | Ở kết quả bước 2, bấm chip **`Trả lời ngoài tài liệu ⚠️`** | Badge **⚠ ngoài tài liệu** · tin cậy **45%** · **0 trích dẫn** · câu đầu tự nói rõ "không có trong tài liệu buổi học" |
| 5 | Bấm chip **`Chuyển câu này cho TA`** | Toast xác nhận đã copy. Ctrl+V vào Notepad cho giám khảo xem |

**Câu phải nói ở bước 3 — đây là câu quan trọng nhất của cả demo:**
> *"Có bôi đen không phải giấy phép để trả lời thứ không có trong tài liệu. Cổng chống
> bịa chạy **trước** bước nạp trang. Nếu đảo hai bước đó thì bôi đen bất kỳ đoạn nào
> rồi hỏi về streaming sẽ ra một câu trả lời bịa mà nghe rất có lý — và đó là kiểu lỗi
> nguy hiểm nhất. Case `G30` trong golden set canh đúng đường lọt này."*

**Câu phải nói ở bước 4:**
> *"Đây là nhánh quyết định thứ năm, không phải `answer`. Vì bất biến của hợp đồng nói
> `answer` thì phải có trích dẫn — câu trả lời ngoài tài liệu không có trích dẫn, gọi nó
> là `answer` là vi phạm đúng cái bất biến quan trọng nhất. Và cửa này **chỉ mở khi học
> viên bấm**, AI không tự bước ra."*

**Câu phải nói ở bước 5:**
> *"Tutor hiện tại có 0 trên 1.261 lượt đưa bước tiếp theo — nên 307 lần từ chối là 307
> ngõ cụt. Bản này: 100% nhánh từ chối đều có đường lui bấm được, và chiều D7 trong bộ
> đo tính chip không có handler là **fail**, không phải cảnh báo."*

---

## Q&A · 5 phút — chuẩn bị sẵn

### Thẻ giám khảo: họ chạy 1 case lạ tại chỗ

Đừng đỡ, đừng lái. Mở trace ra và **đọc theo trace**: nó ghi từng bước quyết định
kèm ms, nên dù ra kết quả gì cũng giải thích được vì sao.

Ba tình huống hay xảy ra:

| Họ hỏi gì | Sẽ ra gì | Nói gì |
|---|---|---|
| Thuật ngữ AI không có trong deck (`MCP`, `LoRA`, `streaming`…) | `no_grounding` | "Đúng nhánh — đây là hành vi cam kết, không phải lỗi" |
| Câu tiếng Việt chung chung không neo trang | có thể `clarify` | "Nó hỏi lại đúng một câu thay vì đoán, G10" |
| Câu vô nghĩa / gõ bừa | **có thể trả lời sai** | **Nói thật:** "Đây đúng giới hạn đã biết — case G06 trong bảng kết quả, chưa sửa được vì lý do X, đã vào backlog." Có sẵn slide 4 để chỉ vào |

### Ba câu bắt buộc cả nhóm trả lời được *(guide §5.2)*

**"Augment hay automate — vì sao?"**
> Conditional. Kẹp text trang thì tự động vì sai rẻ — học viên đang mở đúng trang đó,
> đọc là thấy lệch. Trả lời khi thiếu căn cứ thì không tự động vì sai đắt — học sai mà
> không có cách nào biết. Bước ra ngoài tài liệu thì do người mở, không do AI.

**"Failure nguy hiểm nhất là gì?"**
> Trả lời một câu hỏi mà tài liệu **có thuật ngữ gần giống nhưng không có thứ được hỏi**
> — `multi-step` vs `multi-agent`, hay `Thought` vs `chain-of-thought`. Retrieval trả về
> trang trông rất thuyết phục, nên câu bịa nghe cực có lý và học viên không có cách nào
> biết. Đó là lý do cổng chống bịa kiểm cụm ghép riêng và chạy trước mọi thứ khác.

**"Phần bạn làm là gì?"** → mỗi người mở đúng file mình đứng tên trong `README.md` và
trả lời được: đoạn này làm gì · vì sao làm thế · bỏ nó đi thì hỏng gì.

### Câu khó có thể bị hỏi

| Câu hỏi | Trả lời |
|---|---|
| *"97% có phải các bạn tự chấm bài mình không?"* | D1–D7 là substring/regex trong `eval/run-golden.mjs`, chạy lại ra đúng số đó. Chiều duy nhất cần người chấm là D8, và nó **không** nằm trong quality bar — vì cam kết một con số dựa trên chấm tay của chính mình thì người ngoài không kiểm lại được. |
| *"Bar 90% mà đo 97%, đặt bar dễ quá?"* | Bar chốt lúc 23:59 N1 kèm **ba điều kiện cứng ở 100%** (D1, D3, D6) — đó mới là chỗ cam kết. 90% chừa chỗ cho một giới hạn đã biết cộng case lạ giám khảo đưa tại chỗ. |
| *"Golden set do chính các bạn xây, có thiên vị không?"* | 10/48 case lấy nguyên văn câu hỏi thật từ chatlog kèm `turn_id` tra lại được. **15 case là bẫy hồi quy** — cố ý dựng để bắt chính nhóm mình làm sai, và 2 trong số đó **đã bắt được lỗi thật** (G35, G44). Và có **1 case đang fail**, không xoá. |
| *"Sao không dùng embedding cho chuẩn?"* | Deck 44 trang, 14.480 ký tự — keyword + idf đủ, và đã khai trong non-goals. Nhưng nó là đúng lý do case G06 fail, nên embedding là mục số 1 trong backlog. |
| *"Số 30,6% ở đâu ra?"* | `python eval/verify-evidence.py`, mục E10. Regex neo trang in kèm 6 ví dụ có `turn_id`. |

---

## Sau demo

- [ ] Ctrl+P `demo-slides.html` → lưu `demo-slides.pdf` vào gốc repo
- [ ] `git add` + commit lần cuối (không commit `.env`, `pages.json`, `audio_output/`)
- [ ] Mỗi người nộp link repo riêng
