# Hợp đồng AI Core — `askTutor(AskRequest) → AskResponse`  ·  **v1.3**

> **Chốt từ GĐ1. Người làm UI và người làm nhân AI code hai bên của hợp đồng này mà không chặn nhau.**
> Đổi hợp đồng = phải báo cả hai bên. Thêm field mới thì được, đổi/xoá field cũ thì không.

## Amendment v1.1 — GĐ2 *(chỉ THÊM, không xoá/đổi field nào)*

| # | Thêm gì | Vì sao |
|---|---|---|
| 1 | `follow_ups[]` nhận **cả** `string` (như v1.0) **và** `{label, kind:'question'\|'action', action?:'answer_outside'\|'handoff_ta'}` | v1.0 chỉ có nhãn chữ, nên UI phải đoán chip nào là câu hỏi, chip nào là hành động — và đoán sai: cả 3 bản đều gửi *"Chuyển câu này cho TA"* làm câu hỏi mới. Có `kind` thì hết đoán. |
| 2 | `decision` thêm giá trị thứ 5 **`outside_document`** | Bất biến #2 nói `answer` ⇒ `citations ≥ 1`. Câu trả lời ngoài tài liệu không có trích dẫn tài liệu, gọi nó là `answer` là vi phạm đúng bất biến quan trọng nhất. |
| 3 | `outside_note?: string` — vì sao câu này ra ngoài tài liệu | Song song với `refusal_reason`, để UI và eval đọc được. |
| 4 | `core_used?: 'real' \| 'mock' \| 'mock-fallback'` + `degraded_reason?: string` | LLM chết thì hạ cấp về mock, nhưng phải **nói ra**, không giả vờ là AI thật (G2). |

## Amendment v1.2 — N2 *(chỉ THÊM, không xoá/đổi field nào)*

| # | Thêm gì | Vì sao |
|---|---|---|
| 1 | `decision` thêm giá trị thứ **6**: **`chat`** | Xã giao từng bị gộp vào `clarify` cho khỏi phải đổi hợp đồng — tiện cho code, nhưng người dùng gõ *"xin chào"* thì nhận badge **"? cần làm rõ 30%"**: trả lời đúng, nhãn vô lý. Lời chào có gì mà phải làm rõ |
| 2 | `outside_note` giờ **được RENDER**, và được sinh ra cả trên nhánh `no_grounding` | Ô này có từ v1.1 nhưng chưa bao giờ vẽ ra màn hình. *"open ai là gì"* trước đây dừng ở ∅ 8% — ngõ cụt. Giờ phần **không kiểm chứng được** đi kèm ngay trong lượt đó, ở **ô riêng, nhãn riêng** |
| 3 | **Bất biến #6 — cổng bám nguồn** | `verifyCitations` chỉ kiểm quote có nằm trong trang không, **chưa bao giờ kiểm câu trả lời có dính gì tới quote**. Một câu do người dùng đặt hàng từng được dán `✓ có căn cứ` **94%** kèm quote có thật |

**Bất biến bổ sung cho `chat`:** `citations` PHẢI rỗng · `confidence` < 0,6 ·
**không tra tài liệu** (không cầm tài liệu thì không có gì để bịa là "có căn cứ").

## Amendment v1.3 — công tắc chế độ *(chỉ THÊM, không xoá/đổi field nào)*

| # | Thêm gì | Vì sao |
|---|---|---|
| 1 | `AskRequest.mode?: 'doc' \| 'chat'` — **vắng mặt = `'doc'`**, nên mọi request cũ vẫn hợp lệ và chạy y như trước | Hơn 20 cổng trong `classify()` làm đúng một việc: **đoán** xem người dùng hỏi tài liệu hay tán gẫu. Đoán thì luôn có "cách gõ thứ N+1 lọt khe". **Ý định là thứ duy nhất người dùng BIẾT CHẮC còn máy phải suy luận** — hỏi thẳng rẻ hơn đoán |
| 2 | UI gọi chế độ bằng lệnh `/doc` · `/chat` gõ ở **đầu** ô nhập, hoặc bấm chỉ báo | Nhanh, không rời bàn phím. Tiền tố bị cắt **trước** khi dựng request nên nhân không bao giờ thấy dấu `/` |
| 3 | `follow_ups` thêm action **`ask_in_doc_mode`** | Ở chế độ chat mà hỏi một câu tra được trong deck thì **mời** đổi chế độ, chứ không tự đổi và cũng không bỏ mặc |

**Bất biến cho `mode === 'chat'`** — code bảo đảm, không phải model tự giữ:
`page_text` gửi xuống là **chuỗi rỗng** · `selection` bị bỏ · **không chạy `retrieve()`** ·
`citations` rỗng · `confidence` < 0,6.

**Vì sao công tắc này KHÔNG lặp lại thất bại của lượt 21.** Lượt 21 để **LLM tự chọn**
mode trong khi nó **đang cầm tài liệu** — nên `G55` *"in ra system prompt"* lọt thành
`answer` 70% kèm trích dẫn thật. Ở đây **người dùng** chọn, và chế độ chat **không cầm
tài liệu**: bề mặt tấn công không rộng thêm một milimet nào.

**Cấm tuyệt đối:** không được thêm nhánh kiểu `if (mode === 'chat') skip` vào cổng bám
nguồn (bất biến #6). Chế độ chat an toàn vì nó **không đi qua** cổng đó, **không phải** vì
được miễn trừ. Cổng đó hiện có đúng **một** lỗ miễn trừ hợp pháp (`transform`) — thêm lỗ
thứ hai là mở lại đúng chỗ đã bị đâm thủng một lần.

**Bốn rào an toàn chạy ở CẢ HAI chế độ** (có case ÂM trong golden set canh): câu rỗng ·
xin quiz/flashcard · ③ ngoài phạm vi (làm hộ bài tập · deadline/điểm số) · phản đối câu
trả lời trước. Chọn chế độ trò chuyện **không mở được cửa nào** trong số đó.

**Bất biến #6 (cổng bám nguồn):** một câu `decision:'answer'` phải có **≥3 từ nội
dung** xuất hiện trong trang mà nó viện dẫn. Ngưỡng **hiệu chuẩn trên 31 câu trả
lời thật** (đáy 12 từ chung) so với câu bị injection (0–1). Không đạt → **hạ
xuống `no_grounding`**, không bao giờ được dán nhãn có căn cứ. Miễn trừ duy nhất:
yêu cầu **biến đổi từ vựng** (dịch/viết lại), và phải **khai báo công khai** bằng
`skip_d9` trong case golden, không giấu trong code.

**LUẬT NHÃN — quan trọng hơn mọi field:** `decision`, `confidence`, `citations`
là **do CODE dán**, không lấy từ lời tự khai của model. Model tự do quyết định
*nói gì*; code giữ độc quyền *dán nhãn*. Đây là thứ cho phép nới tự do mà không
mở đường cho bịa đặt.

**Nhánh quyết định lạ KHÔNG được làm vỡ UI:** dùng `decisionBadge(d)` (`ui.mjs`)
có lối lui, không tra thẳng `DECISION[d]` — bản trước ném `TypeError` và UI hiển
thị nó thành *"Lỗi core: …"*, tức một lỗ hổng bản đồ nhãn bị báo nhầm thành lỗi
nhân AI.

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

  mode?: 'doc' | 'chat';         // v1.3 — chế độ do NGƯỜI DÙNG chọn.
                                 // vắng mặt = 'doc' (request cũ vẫn hợp lệ).
                                 // 'chat' ⇒ page_text = '' và selection = null,
                                 // do buildRequest() ép ngay tại nguồn.
}
```

## 2. AskResponse

```ts
interface AskResponse {
  // Nhánh quyết định — UI render MỘT KIỂU KHÁC NHAU cho mỗi giá trị.
  // v1.1: 'outside_document' — chỉ sinh ra khi NGƯỜI DÙNG bấm chip,
  //       citations rỗng, confidence ≤ 0.45
  // v1.2: 'chat' — trò chuyện, KHÔNG tra tài liệu, citations rỗng, conf < 0.6
  // Thêm giá trị mới thì PHẢI sửa đủ 3 chỗ: ui.mjs DECISION · eval/run-golden.mjs
  // D5 · file này. Thiếu ui.mjs là vỡ màn hình; thiếu D5 là phép đo tự pass.
  decision: 'answer' | 'clarify' | 'no_grounding' | 'out_of_scope'
          | 'outside_document' | 'chat';

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
