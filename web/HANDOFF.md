# HANDOFF — chuyển UI sang Next.js + FastAPI

> Gói bàn giao cho agent/người tiếp theo. Gồm: **kế hoạch nguyên bản đã duyệt**,
> **trạng thái hiện tại**, và **những cái bẫy đã trả giá để biết** — phần cuối là
> phần đáng đọc nhất, vì nó là thứ không suy ra được từ code.

**Cập nhật lần cuối:** hoàn tất local demo Giai đoạn A–E; chưa deploy.

---

## 0 · Đọc gì trước

| File | Vì sao |
|---|---|
| `web/HANDOFF.md` | file này |
| `codebase/CONTRACT.md` | hợp đồng `AskRequest`/`AskResponse` — **bất biến, không tự sửa** |
| `phan_cong_nhiem_vu.md` | lãnh thổ 6 người. Việc này là **P5 (Frontend)** |
| `COMMIT-PLAN.md` | kỷ luật commit — khối 7 là việc này |
| `spec.md` §9 | changelog, **lãnh thổ P1**, không tự sửa |
| `web/AGENTS.md` | cảnh báo Next.js 16 khác bản bạn từng biết → đọc `node_modules/next/dist/docs/` |

**Lãnh thổ:** chỉ sửa `web/**`, `api/**`, `codebase/README.md`. **KHÔNG** đụng
`codebase/core.mjs` (P3) hay `eval/**` (P4).

---

## 1 · Trạng thái

### Xong
- **Giai đoạn A + A-gate** — Next.js 16.2.12 + React 19.2.4, App Router, TypeScript, không Tailwind.
  - `npm run lint` · `npm run typecheck` · `npm run build` sạch.
  - `web/lib/` = bản sao engine (`core/viewer/voice/ui.mjs`), **nguồn sự thật mới**.
  - Hook `useViewer` / `useVoice` / `useTutor` bọc engine theo vòng đời React.
  - `/console` port đủ: 5 kịch bản, nhánh `outside_document`, chip `handoff_ta`,
    mic bấm–nói–bấm, 👍/👎 + "hỏi lại trong Trang N", Chép kèm nguồn, theme, xuất log.
  - `next.config.ts` có `rewrites()` `/api/*` → `API_ORIGIN` (mặc định `:8080` = `server.mjs`).
- **Giai đoạn B** — FastAPI proxy đủ 5 route, 6 contract test xanh; Next rewrite giữ same-origin.
- **Giai đoạn C** — `/doc` và `/wild` dùng hooks hiện tại, đủ decision/action/degraded state.
- **Giai đoạn D** — GSAP motion primitives + callback `onPageRendered`; reduced-motion tắt chuyển động.
- **Giai đoạn E** — breakpoint 880px; Console/Đọc thành bottom sheet, Bàn Slide thành danh sách ghim dọc.
- **E2E Playwright** — 8 flow: lifecycle/virtualization/Trang 37, 5 decision,
  `outside_document` + `handoff_ta`, citation/theme/feedback/copy/log/voice-disabled,
  legacy parity, Đọc, Bàn Slide, compact/reduced-motion.

### Chưa làm
- Manual smoke mic STT/TTS trên máy demo.
- LLM thật cần `.env`/key mới; không có key thì app ghi rõ `nhân mock`.
- Giai đoạn F deploy vẫn bị chặn bởi 3 điều kiện §6.

---

## 2 · Chạy

```bash
# cửa sổ 1 — backend (LLM + STT/TTS proxy, giữ API key)
cd api && .venv/bin/uvicorn main:app --reload --port 8000

# cửa sổ 2 — UI
cd web && API_ORIGIN=http://localhost:8000 npm run dev
```

`http://localhost:3000` → chọn bản · `/console` là bản đã port.
Nạp slide: nút *Mở PDF*, kéo-thả, hoặc `?file=`.

Không có `.env`/LLM thì **vẫn chạy** — `initCore()` im lặng rơi về nhân mock và
nhãn trên thanh trên đổi thành `nhân mock (không có LLM)`. **Không bao giờ vờ là AI thật.**

---

## 3 · ⚠️ Đọc + Bàn Slide trong `codebase/` ĐANG GÃY

`codebase/prototype-minimal.html` và `prototype-wild.html` **lỗi ngay khi mở**.
Sau khi `voice.mjs` được viết lại (Web Speech → bấm–nói–bấm qua PTIT) và `ui.mjs`
bỏ `toSpeech`, hai file này không được cập nhật theo. Chúng vẫn gọi:

```
voice.listening · voice.probe() · voice.setEngine() · voice.start()/stop()
import { toSpeech } from './ui.mjs'
```

— **không cái nào còn tồn tại.** Chỉ `prototype.html` (Console) được cập nhật.

**Nên: đừng port nguyên xi 2 file đó.** Viết lại thành React component dùng chung
`useViewer/useVoice/useTutor` với Console thì mặc nhiên đúng API hiện tại — việc port
CHÍNH LÀ việc vá. Lấy `codebase/prototype-minimal.html` / `-wild.html` làm tham chiếu
**CSS/bố cục**, lấy `web/app/console/page.tsx` làm tham chiếu **logic**.

Hai bản này vẫn phải có: nhánh thứ 5 `outside_document`, chip hành động
(`answer_outside` + `handoff_ta`), badge `core_used === 'mock-fallback'`.

---

## 4 · Cổng kiểm (bắt buộc mỗi giai đoạn)

1. **Parity với `codebase/`** — lưới an toàn của cả cuộc chuyển đổi. Bản Next.js
   phải làm được đúng thứ bản HTML làm được, không ít hơn.
2. **E2E Playwright/Chromium** ở rộng + ~800px: 0 exception ·
   đúng nhánh quyết định · citation nhảy trang + tô đúng đoạn · đổi theme ·
   `prefers-reduced-motion` tắt animation. Chạy `cd web && npm run test:e2e`.
3. Ảnh chụp trước/sau khi báo cáo.

Đây là kiểm **UI/tương tác** — **không** phải bộ đo chất lượng câu trả lời AI
(`eval/`, lãnh thổ P4, đừng đụng).

---

## 5 · 🪤 Bẫy đã trả giá để biết

Phần quan trọng nhất của file này.

| # | Bẫy | Phải làm gì |
|---|---|---|
| 1 | **`.pv-scroll` bị CSS Module băm tên** | `viewer.mjs` tìm vùng cuộn bằng `container.closest('.pv-scroll')`. Băm tên là ảo hoá **chết im lặng** — không lỗi, chỉ giật. Dùng `:global(.pv-scroll)` trong `.module.css` và class chuỗi thường trong JSX. |
| 2 | **React StrictMode gọi effect 2 lần** | One-shot `builtRef` cũng sai: cleanup lần đầu làm import bị huỷ, setup lần hai bị guard chặn → viewer không bao giờ dựng. Hook hiện dùng cancellation + `destroy()` idempotent; giữ mô hình này. |
| 3 | **`workerSrc` phải TUYỆT ĐỐI** | Worker nạp theo URL của **trang**, không phải module. `'./vendor/...'` ở route `/console` → tìm `/console/vendor/...` → 404 → pdf.js rơi về fake worker chạy main thread, cuộn giật. Dùng `'/pdf.worker.min.mjs'` (file ở `web/public/`). |
| 4 | **Phải `await viewer.settled()` sau `goTo()` rồi mới `send()`** | `page_text` của trang hiện tại là **nguồn sự thật**. Cuộn mượt qua mấy chục trang mất >260ms — gửi sớm là tutor tóm tắt **sai trang**. |
| 5 | **`pdfjs-dist` ghim `5.7.284`** | CSS text-layer trong `viewer.mjs` chép từ đúng bản đó. Đã đối chiếu sha256: **giống hệt** file vendor cũ (chỉ khác CRLF/LF). Nâng version phải chép lại CSS. |
| 6 | **Token theo route, không ở `globals.css`** | Ba bản dùng **cùng tên** token (`--bg`, `--accent`…) với giá trị khác nhau. Mỗi route có `tokens.css` riêng, nạp qua `layout.tsx` lồng. `--pv-*` phải ở `:root` vì `injectViewerCSS()` chèn CSS vào `<head>`, ngoài phạm vi CSS Module. |
| 7 | **`rewrites()` chứ KHÔNG phải CORS header** | `voice.mjs` ghi rõ nó dựa vào same-origin. Thêm CORS header là mở endpoint cho mọi origin; `rewrites()` chuyển tiếp phía server, trình duyệt vẫn thấy một origin, key không xuống client. |
| 8 | **Chip `action` không có handler thì KHÔNG vẽ** | Bài học `ui.mjs`: chip "Chuyển cho TA" từng bị xử lý như câu hỏi → gửi chính chuỗi đó đi → kết quả vô nghĩa. Chip hứa đường lui rồi dẫn vào tường **tệ hơn** không có chip. `Answer.tsx` lọc + `console.error`. |
| 9 | **`outside_document` không phải `answer`** | Bất biến #2: `answer` ⇒ `citations ≥ 1`. Nhánh ngoài tài liệu trả **0 trích dẫn**, tin cậy ≤0,45, **chỉ chạy khi user bấm** — AI không tự bước ra ngoài tài liệu. |
| 10 | **Next.js 16 khác bản bạn từng biết** | `web/AGENTS.md` cảnh báo sẵn. Đọc `node_modules/next/dist/docs/` trước khi dùng API lạ. Đã kiểm: `rewrites()` và dynamic import **không** đổi. |
| 11 | **Engine nạp động trong `useEffect`, không phải `dynamic(ssr:false)`** | `viewer.mjs` đụng `window` ngay khi import. `await import()` trong `useEffect` thì module **không bao giờ** nạp phía server — chính xác hơn và không cần bọc `dynamic`. |
| 12 | **pdf.js build thường cần `Uint8Array.toHex()`** | Chromium Playwright 139 chưa có API này; build thường chết lúc import bằng `a.toHex is not a function`. Next dùng `pdfjs-dist/legacy/build/pdf.mjs` và worker legacy cùng version 5.7.284. |

---

## 6 · Ba điều kiện chặn trước khi deploy công khai

1. **Xin cấp lại API key.** Key hiện tại **đã từng phơi** qua lỗ path-traversal ở
   `server.mjs` (`spec.md` §9; `COMMIT-PLAN.md` đã nêu). Đưa key đã lộ lên host công
   khai là nhân đôi rủi ro.
2. **Không đóng gói `data/slides/day03.pdf` vào bản deploy** — tài liệu mật của khoá.
   App đã hỗ trợ chọn file lúc chạy; bản deploy chỉ để đường nạp thủ công.
3. **Kiểm endpoint PTIT có gọi được ngoài mạng trường không.** Nếu bị giới hạn nội bộ
   thì bản deploy phải tắt mic kèm tooltip nói rõ lý do (cơ chế G2 đã có sẵn), không
   để nút chết im lặng.

---

## 7 · Kế hoạch nguyên bản (đã duyệt, chưa chỉnh)

<details>
<summary>Bấm để mở — bản raw</summary>

### Context

Mục tiêu cuối cùng đã đồng thuận: một sản phẩm học trực tuyến — xem slide, hỏi đáp có
trích dẫn kiểm chứng được, trò chuyện bằng giọng nói — production-ready **về mặt UI**, với
3 phong cách: **clean** (Đọc), **cân bằng đủ tính năng** (Console), **wildcard** (Bàn Slide).

**Nguyên tắc xuyên suốt: không vứt thứ đã được kiểm chứng.**

`codebase/core.mjs` là 2.055 dòng logic đã qua audit — `classify()` gộp 8 luật định tuyến,
`verifyCitations()` (so nguyên văn + cứu vãn ≥60 ký tự), cổng phủ định cụm ghép
(`multi-agent` ≠ `multi-step`), chống prompt-injection. Nó có `test-core.mjs` **14/14**,
`test-intents.mjs` **101/101**, golden set **52/53 = 98,1%** real-core. Viết lại bằng
Python nghĩa là vứt toàn bộ số đo đó — trong lúc `spec.md` đã chốt quality bar.
**Nên: `core.mjs` giữ nguyên JavaScript, chạy trong Next.js.**

FastAPI nhận đúng phần nó xứng đáng: **lớp proxy mỏng** (LLM, STT, TTS) — chỗ không có
logic nghiệp vụ, chỉ có chuyển tiếp và giữ khoá.

### Thứ phải trả giá — nói trước
- Console đang đạt 14/14 sẽ **tạm gãy** trong lúc port. `codebase/` **đóng băng làm bản
  dự phòng CP6**, không xoá, không sửa nữa.
- pdf.js + React StrictMode double-mount → phải có `useRef` guard + cleanup.
- `viewer.mjs` đụng `window` top-level → không SSR được.
- Tách 2 host làm mất same-origin mà `voice.mjs` dựa vào → khôi phục bằng `rewrites()`.

### Kiến trúc
```
Trình duyệt ──► Next.js (Vercel)         ──rewrites()──► FastAPI (Render/Fly)
               │  /console /doc /wild                     │  /api/llm
               │  React + GSAP                            │  /api/stt  /api/tts
               │  lib/*.mjs (chạy client, giữ nguyên)     │  .env — KEY ở đây
```

### Giai đoạn A — Dựng khung + Console *(rủi ro cao nhất)*
create-next-app · copy engine sang `web/lib/` không sửa nội dung · worker sang `public/` ·
hook `useViewer`/`useVoice`/`useTutor` · `/console` + CSS Module giữ nguyên tên token ·
component hoá `TraceStrip`/`DecisionBadge`/`CiteChip`/`FollowUps`/`MicButton`.
**Cổng ra:** chạy hết 5 kịch bản + `outside_document` + `handoff_ta`, 0 lỗi console,
bằng đúng bản `codebase/`. Chưa đạt thì không đi tiếp.

### Giai đoạn B — FastAPI + rewrites
Port 4 endpoint từ `server.mjs`, **giữ nguyên từng quyết định đã trả giá**:
timeout riêng + **retry không `guided_json` với bộ đếm giờ MỚI** (dùng lại signal cũ là
retry bị chém ngang) · STT multipart **giữ nhị phân**, không qua utf8 · TTS trả
`Response(media_type="audio/wav")` · health LLM và voice **tách riêng** (voice chết mà LLM
sống là bình thường — UI chỉ tắt mic, G2) · lỗi upstream chỉ log nội bộ, ra client là mã đục.
**Cổng ra:** curl 4 endpoint giống hệt `server.mjs`.

### Giai đoạn C — Port Đọc + Bàn Slide
Hai bản đang gãy thật; port = vá. Giữ bản sắc: Đọc = bo tròn, khoảng trắng rộng, trace
đóng mặc định. Bàn Slide = ghim + sợi chỉ SVG + dải phim thumbnail.

### Giai đoạn D — Animation (`lib/motion.ts` + GSAP npm)
`useGSAP()` để cleanup theo vòng đời (thiếu là rò tween mỗi lần đổi route).
Primitive: `introSequence` · `pageRendered` (thêm callback `onPageRendered` vào
`createViewer`, chỉ THÊM) · `turnEnter` · `traceReveal` · `confidenceCountUp` ·
`citeChipsIn` · `highlightPulse` · `micLevel` (`gsap.quickTo` ăn `onLevel`) ·
`themeMorph` (`startViewTransition`, fallback crossfade) · `pinSettle`/`wireDraw` ·
tất cả bọc `gsap.matchMedia()` theo `prefers-reduced-motion`.

| | Console | Đọc | Bàn Slide |
|---|---|---|---|
| Nhịp | 120–180ms | 250–400ms | ~200ms |
| Ease | `power2.out` | `power1.out` | `back.out(1.6)` · `power3.inOut` |

**Font bản Đọc:** `next/font/local` + **Be Vietnam Pro** variable (OFL, thiết kế cho
tiếng Việt, nét bo tròn hình học). Thay `Segoe UI Variable` (font hệ thống, không cá tính).
Một họ variable duy nhất cho cả tiêu đề lẫn thân bài.

### Giai đoạn E — Responsive
Mốc ~880px, panel → bottom sheet. **Bàn Slide riêng:** ghim neo `offsetLeft+offsetWidth`
không còn chỗ treo → rơi về danh sách dọc, ẩn sợi chỉ; dải phim → dải ngang trên.

### Giai đoạn F — Deploy
Ba điều kiện chặn: xem §6.

### Không làm
Không đụng logic/prompt/retrieval `core.mjs` (P3) · không chạy lại golden set (P4) ·
không dựng pane Ghi chú (non-goal) · **không xoá `codebase/`** cho tới khi đạt parity.

</details>
