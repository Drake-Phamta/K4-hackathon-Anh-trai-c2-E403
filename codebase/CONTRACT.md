# Hợp đồng AI Core — `askTutor(AskRequest) → AskResponse`

> **Chốt từ GĐ1. Người làm UI và người làm nhân AI code hai bên của hợp đồng này mà không chặn nhau.**
> Đổi hợp đồng = phải báo cả hai bên. Thêm field mới thì được, đổi/xoá field cũ thì không.

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
  decision: 'answer' | 'clarify' | 'no_grounding' | 'out_of_scope';

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

  follow_ups?: string[];         // chip gợi ý dưới câu trả lời

  trace: Array<{                 // render thành trace strip + là log cho eval/
    step: string;                // 'nhận input' | 'tra cứu' | 'kiểm phủ' | 'quyết định' …
    detail: string;
    ms: number;
  }>;

  latency_ms?: number;           // askTutor() tự gắn, core không cần set
}
```

---

## 3. Bất biến — vi phạm là bug, không phải lựa chọn phong cách

| # | Ràng buộc | Vì sao |
|---|---|---|
| 1 | `citations[].quote` **phải cắt nguyên văn** từ text trang. Không viết lại, không tóm tắt. | Cả giá trị của sản phẩm nằm ở chỗ user kiểm chứng được. Quote bịa = mất sạch. Có test tự động. |
| 2 | `decision='answer'` thì `citations.length ≥ 1`. | Trả lời không căn cứ mà trông như có căn cứ là kiểu lỗi nguy hiểm nhất. |
| 3 | Không đủ căn cứ → `no_grounding`. **Không được đoán rồi rào trước.** | 54% downvote của tutor hiện tại đến từ đúng chỗ này. |
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

- **99,3%** tin nhắn học viên có header `(Trang N, đoạn được chọn: "...")`
- **68,0%** trong đó có `đoạn được chọn` **chính là câu hỏi user gõ** — tức tutor **không nhận được chữ nào trên slide**, chỉ có số trang
- Hệ quả: **19,9%** câu trả lời của tutor thừa nhận không tra được nội dung
- Và **20/37 = 54%** lượt downvote rơi đúng vào nhóm này

Ví dụ nguyên văn (`M0419`): *"rất xin lỗi vì hiện tại hệ thống tìm kiếm không tìm thấy nội dung cụ thể cho trang 4 … Bạn có thể vui lòng cung cấp nội dung hoặc tiêu đề của trang 4 đó"* — trong khi học viên **đang mở đúng trang 4**.

→ Hợp đồng này bắt buộc `page_text` **luôn có mặt**, kể cả khi `selection = null`. Nhân AI không bao giờ phải đi tra ngược một trang mà nó chưa từng được đọc.
