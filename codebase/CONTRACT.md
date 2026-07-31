# Hợp đồng AI Core — `askTutor(AskRequest) → AskResponse`  ·  **v1.1**

> **Chốt từ GĐ1. Người làm UI và người làm nhân AI code hai bên của hợp đồng này mà không chặn nhau.**
> Đổi hợp đồng = phải báo cả hai bên. Thêm field mới thì được, đổi/xoá field cũ thì không.

## Amendment v1.1 — GĐ2 *(chỉ THÊM, không xoá/đổi field nào)*

| # | Thêm gì | Vì sao |
|---|---|---|
| 1 | `follow_ups[]` nhận **cả** `string` (như v1.0) **và** `{label, kind:'question'\|'action', action?:'answer_outside'\|'handoff_ta'}` | v1.0 chỉ có nhãn chữ, nên UI phải đoán chip nào là câu hỏi, chip nào là hành động — và đoán sai: cả 3 bản đều gửi *"Chuyển câu này cho TA"* làm câu hỏi mới. Có `kind` thì hết đoán. |
| 2 | `decision` thêm giá trị thứ 5 **`outside_document`** | Bất biến #2 nói `answer` ⇒ `citations ≥ 1`. Câu trả lời ngoài tài liệu không có trích dẫn tài liệu, gọi nó là `answer` là vi phạm đúng bất biến quan trọng nhất. |
| 3 | `outside_note?: string` — vì sao câu này ra ngoài tài liệu | Song song với `refusal_reason`, để UI và eval đọc được. |
| 4 | `core_used?: 'real' \| 'mock' \| 'mock-fallback'` + `degraded_reason?: string` | LLM chết thì hạ cấp về mock, nhưng phải **nói ra**, không giả vờ là AI thật (G2). |

**Bất biến bổ sung cho `outside_document`:** `citations` PHẢI rỗng · `confidence` ≤ 0,45 ·
UI phải hiển thị khác hẳn nhánh có căn cứ · và **chỉ được sinh ra khi người dùng
bấm chip**, không bao giờ do AI tự chọn.

Seam nằm ở `core.mjs`. UI (`prototype.html`) gọi đúng **một** hàm:

```js
import { askTutor } from './core.mjs';
const res = await askTutor(req);
```

GĐ2 chỉ cần viết `realCore()` trong `core.mjs` rồi đổi `AI_CORE = 'real'`. **UI không sửa một dòng.**

---

## 1. AskRequest

```ts
interface AskRequest {
  question: string;              // câu hỏi user gõ

  // Đoạn user bôi đen trên slide. null = user không bôi đen gì.
  // ĐÂY LÀ FIELD QUAN TRỌNG NHẤT — xem §5.
  selection: {
    text: string;                // nguyên văn đoạn được chọn
    page: number;                // trang chứa đoạn đó (1-based)
    rects: null;                 // để dành cho highlight chính xác, GĐ1 chưa dùng
  } | null;

  page_text: string;             // text đầy đủ của trang đang xem — LUÔN có,
                                 // kể cả khi selection = null

  document: {
    id: string;
    title: string;
    page_count: number;
    current_page: number;        // 1-based
  };

  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}
```

## 2. AskResponse

```ts
interface AskResponse {
  // Nhánh quyết định — UI render 4 kiểu khác nhau theo field này.
  // v1.1: thêm 'outside_document' — chỉ sinh ra khi NGƯỜI DÙNG bấm chip,
  // citations bắt buộc rỗng, confidence ≤ 0.45 (xem Amendment v1.1 ở đầu file)
  decision: 'answer' | 'clarify' | 'no_grounding' | 'out_of_scope'
          | 'outside_document';

  answer: string;                // markdown tối giản: **đậm**, *nghiêng*, \n
  confidence: number;            // 0..1 — hiện thành badge, KHÔNG được bịa cao

  citations: Array<{
    kind: 'page' | 'transcript'; // GĐ1 chỉ dùng 'page'
    ref: string;                 // '22' hoặc 'T01-001'
    page?: number;               // để UI nhảy tới trang
    quote: string;               // PHẢI là chữ có thật, cắt nguyên văn từ nguồn
  }>;

  clarifying_question?: string;  // bắt buộc khi decision='clarify'
  refusal_reason?: string;       // bắt buộc khi 'no_grounding' | 'out_of_scope'

  suggested_note?: {             // GĐ1 trả về nhưng UI CHƯA render (pane Ghi chú là GĐ2)
    title: string;
    body: string;
    anchor_page: number;
  } | null;

  // v1.1: nhận CẢ string cũ LẪN object có kiểu. kind='action' phải có
  // `action` nằm trong KNOWN_ACTIONS (core.mjs export) — UI và bộ đo D7
  // cùng đọc từ đó, chip không có handler bị tính là bug.
  // LUẬT NHÃN: với kind='question', `label` chính là câu sẽ được GỬI ĐI khi
  // bấm. Nên nhãn phải là một câu hỏi gõ được — không được là lời mô tả kiểu
  // "Bỏ giới hạn, tra cả tài liệu" (bấm vào là gửi đúng chuỗi đó làm câu hỏi).
  // Muốn giải thích vì sao chip có mặt thì để vào `hint` (v1.1 → tooltip).
  follow_ups?: Array<string | {
    label: string;
    kind: 'question' | 'action';
    action?: 'answer_outside' | 'handoff_ta';
    hint?: string;               // v1.1 · tuỳ chọn, chỉ hiện dưới dạng tooltip
  }>;

  trace: Array<{                 // render thành trace strip + là log cho eval/
    step: string;                // 'nhận input' | 'tra cứu' | 'kiểm phủ' | 'quyết định' …
    detail: string;
    ms: number;
  }>;

  latency_ms?: number;           // askTutor() tự gắn, core không cần set

  // ── v1.1 — các field mới (xem Amendment ở đầu file) ──
  outside_note?: string;         // vì sao câu này ra ngoài tài liệu
  core_used?: 'real' | 'mock' | 'mock-fallback';  // nhân nào THẬT SỰ sinh câu này
  degraded_reason?: string;      // đi kèm 'mock-fallback' — LLM chết vì gì
}
```

---

## 3. Bất biến — vi phạm là bug, không phải lựa chọn phong cách

| # | Ràng buộc | Vì sao |
|---|---|---|
| 1 | `citations[].quote` **phải cắt nguyên văn** từ text trang. Không viết lại, không tóm tắt. | Cả giá trị của sản phẩm nằm ở chỗ user kiểm chứng được. Quote bịa = mất sạch. Có test tự động. |
| 2 | `decision='answer'` thì `citations.length ≥ 1`. | Trả lời không căn cứ mà trông như có căn cứ là kiểu lỗi nguy hiểm nhất. |
| 3 | Không đủ căn cứ → `no_grounding`. **Không được đoán rồi rào trước.** | 57% downvote của tutor hiện tại đến từ đúng chỗ này *(E4 — đo lại được bằng `eval/verify-evidence.py`)*. |
| 4 | `clarify` hỏi lại **đúng một câu**, không hỏi dồn. | G10 — thu hẹp phạm vi khi nghi ngờ. |
| 5 | `confidence` phải phản ánh thật. `no_grounding` thì < 0.2. | G2 — user cần biết khi nào nên tin. |
| 6 | Không bao giờ bảo user *"bạn cung cấp nội dung trang đó giúp mình"*. | Đây là câu tutor hiện tại đang nói khi tra trượt — trong khi user đang mở đúng trang đó. Là pain gốc của cả dự án. |

---

## 4. GĐ2 — cài `realCore()`

Giữ nguyên `retrieve()` đang có làm lớp grounding, chỉ thay phần sinh văn bản:

```js
async function realCore(req){
  const { hits, missing, found } = retrieve(req.question, req.selection?.text);

  // Bất biến #3 — kiểm TRƯỚC khi gọi LLM, không để LLM tự quyết
  if (!hits.length || missing.length) return noGrounding(missing, found, hits);

  const res = await callLLM({
    system: SYSTEM_PROMPT,                       // buộc trả JSON đúng AskResponse
    context: hits.map(h => `[Trang ${h.page}]\n${h.text}`).join('\n\n'),
    selection: req.selection,
    question: req.question,
  });

  return { ...res, trace: [...] };
}
```

**Ba chỗ dễ sai:**
1. Đừng để LLM tự quyết có căn cứ hay không — nó sẽ luôn nói có. Chặn bằng code ở trên.
2. Bắt LLM chỉ được trích từ đoạn context đưa vào, và **verify lại** `quote` có nằm trong `page.text` không; không khớp thì bỏ citation đó đi.
3. API key **không commit**. Để sau proxy nhỏ (`node server.mjs`, dùng stdlib, không cần `npm install`).

---

## 5. Vì sao `selection` + `page_text` là trung tâm

Mining `data/vlearn-pack/chatlog/` (1.261 turn) cho thấy:

- **99,3%** tin nhắn học viên có header `(Trang N, đoạn được chọn: "...")`  *(E5)*
- **61,2%** trong đó có `đoạn được chọn` **chính là câu hỏi user gõ** — tức tutor **không nhận được chữ nào trên slide**, chỉ có số trang  *(E6)*
- Hệ quả: **24,3%** câu trả lời của tutor thừa nhận không tra được nội dung  *(E2)*
- **21/37 = 57%** lượt downvote rơi đúng vào nhóm này; tỷ lệ downvote trong nhóm là **6,8%** so với **1,7%** ngoài nhóm — **chênh 4,1 lần**  *(E4)*
- Và **30,6%** nhóm lỗi đó là câu hỏi **neo vào trang đang xem** → sửa được đảm bảo bằng `page_text`  *(E10)*

> **Số ở đây kiểm lại được:** chạy `python eval/verify-evidence.py`, mỗi mã E
> tương ứng một mục trong `eval/evidence-report.md`. Bản đầu của mục này ghi
> 68,0% và 20/37 = 54% — đếm chặt lại thì ra 61,2% và 21/37. Lệch vì phép so
> khớp chưa được định nghĩa; giờ định nghĩa nằm trong script, không nằm trong
> đầu người viết.

Ví dụ nguyên văn (`M0419`): *"rất xin lỗi vì hiện tại hệ thống tìm kiếm không tìm thấy nội dung cụ thể cho trang 4 … Bạn có thể vui lòng cung cấp nội dung hoặc tiêu đề của trang 4 đó"* — trong khi học viên **đang mở đúng trang 4**.

→ Hợp đồng này bắt buộc `page_text` **luôn có mặt**, kể cả khi `selection = null`. Nhân AI không bao giờ phải đi tra ngược một trang mà nó chưa từng được đọc.
