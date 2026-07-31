# Yêu cầu cập nhật: 2 chế độ giọng nói — Thuyết trình & Hội thoại real-time

> Người nhận: **P5 (UI)** phần giao diện · **P3 (AI/prompt)** phần dàn ý toàn deck.
> Nền tảng đã chạy được và verify bằng máy (xem §1) — việc còn lại là UI đúng nghĩa
> và một bước nâng chất lượng bài giảng. Soạn 31/07.

---

## 0 · Nguyên tắc chốt trước khi làm

1. **Hai chế độ TÁCH BIỆT về trải nghiệm, CHUNG hạ tầng.**
   - **A · Thuyết trình (▶):** một chiều — AI giảng, người nghe; ngắt được để hỏi rồi quay lại.
   - **B · Hội thoại (🎧):** hai chiều — người hỏi bằng lời tự nhiên, AI đáp bằng lời.
   - Hai chế độ **loại trừ nhau** (bật A thì B ẩn/khoá và ngược lại) — chỉ MỘT bên sở hữu mic tại một thời điểm. Đừng cho hai nút cùng sáng.
2. **Không đụng tầng dưới khi làm UI.** `voice.mjs` (mic/VAD/TTS) và `core.mjs` (`generateLecture`, `askTutor`) là API ổn định — UI chỉ gọi. Muốn đổi hành vi tầng dưới → nói P3, đừng sửa thẳng.
3. Mọi trạng thái máy đang làm gì phải **nhìn thấy được** (G2): đang nghe / đang nghĩ / đang nói / đang soạn — không có pha nào im lặng không giải thích.

---

## 1 · Cái ĐÃ CÓ — đừng viết lại (đã test với API thật 31/07)

### `voice.mjs` — hạ tầng giọng nói
| API | Mô tả | Trạng thái |
|---|---|---|
| `createVoice({onState,onTimer,onLevel})` | factory | ✅ |
| `startRecording()/stopRecording()` | bấm–nói–bấm, trả Blob WAV 16kHz | ✅ đã test |
| `transcribe(blob)` | STT PTIT qua proxy, ~0,6s/câu | ✅ đã test |
| `speak(text, opts?)` | TTS cắt câu **phát gối đầu** — tiếng đầu ~1,8s; promise resolve khi phát xong; gọi mới là cắt cũ | ✅ đã test |
| `prefetch(text)` | sưởi TTS câu đầu trước khi cần | ✅ đã test |
| `startConversation({onUtterance,onHearing})` | mic mở liên tục, VAD tự cắt câu (im ~0,7s), **barge-in** (nói chen khi TTS đang phát là máy im ngay) | ✅ code xong, CẦN test mic thật |
| `stopConversation()` | đóng mic thật | ✅ |
| Hằng `VAD` đầu file | ngưỡng chỉnh theo phòng (VOICE 0.02 · BARGE 0.055 · END 700ms) | tune tại chỗ demo |

### `core.mjs` — sinh lời giảng
```js
generateLecture({ pageNum, pageText, docTitle, prevSummary })
→ { script, key_quotes[], summary, core_used: 'real'|'mock'|'mock-fallback'|'skip' }
```
- Luật cứng trong prompt: **chỉ dùng chữ trên trang**; `key_quotes` phải nguyên văn (UI kiểm substring trước khi highlight); trang scan → `script:null` (skip).
- Đã đo: ~1,5s/trang với gemma-4, 5/5 lượt ổn định; parse phòng thủ (model có lúc tự đổi tên khoá — đã vá, đừng bỏ).
- LLM chết → fallback đọc nguyên văn đầu trang **có nhãn** — thuyết trình không chết đứng.

### `server.mjs` — proxy (không cần đụng)
`/api/stt` · `/api/tts` (knob `.env`: `TTS_SPEED`=1.0, `TTS_SPEAKER`, `TTS_NUM_STEP`) · `/api/voice/health`.

### `prototype.html` — wiring TỐI THIỂU hiện có (P5 thay phần này)
`runLecture()/pauseLecture()/startLecture()` (máy trạng thái + prefetch trang kế),
`handleUtter()` (Q&A khi ngắt, giữ câu mới nhất), `lectureCtx` (mạch giảng tiêm vào history
của `send()`), chip "▶ Giảng tiếp từ Trang N". **Logic giữ, giao diện làm lại.**

---

## 2 · Việc cho P3 — bước DÀN Ý TOÀN DECK (nâng "bài giảng từ toàn slides")

Hiện tại lời giảng là per-page nối mạch bằng `prevSummary` — chạy được nhưng mạch là cục bộ.
Yêu cầu: thêm **một lần gọi LLM lúc bấm ▶** để có mạch TOÀN CỤC:

```js
// core.mjs — export mới
generateLecturePlan({ pages /* [{page, firstLines}] */, docTitle })
→ { sections: [{ title, pages: [từ..đến], emphasis }], opening, closing }
```
- Input: mục lục (Tr.2) + ~2 dòng đầu mỗi trang (nhẹ, không phải full text).
- `sections` chia deck thành các mục; `emphasis` = 1 câu "mục này cần nhấn gì".
- `generateLecture()` mỗi trang nhận thêm `sectionTitle + emphasis` → lời giảng biết
  mình đang ở đâu trong tổng thể, mở mục có câu dẫn mục, hết mục có câu chốt mục.
- `opening`/`closing`: lời chào mở đầu + tổng kết cuối buổi (đọc trước Tr.1 và sau trang cuối).
- Vẫn per-page ở tầng sinh — vì slide phải sync theo lời đọc và tiếng phải ra trong ~4s,
  KHÔNG sinh nguyên khối một lần (vượt max_tokens + chờ 30s+ mới có tiếng).
- Plan lỗi/LLM chậm → bỏ qua plan, chạy per-page như hiện tại (degrade có nhãn).

---

## 3 · Việc cho P5 — UI chế độ A · THUYẾT TRÌNH

Bản wiring hiện tại chỉ có 1 nút text trên #bar — **chưa đạt**. Cần:

1. **Thanh điều khiển thuyết trình** (hiện khi bật, thay cho #scen):
   `▶/⏸` · `⏮ mục trước / mục sau ⏭` (nhảy theo `sections` của plan) · thanh tiến độ
   **"Trang 12/44 · mục 3/8: ReAct Pattern"** · nút `✕ Kết thúc`.
2. **Caption đang đọc**: script trang hiện tại hiện trong một khối cố định (không phải
   bubble trôi trong log) — câu ĐANG đọc nếu làm được thì tô đậm (không bắt buộc).
   Nhãn `mock-fallback` phải hiện khi đang đọc nguyên văn (G2).
3. **Trạng thái pha** luôn hiển thị: `● Đang giảng Tr.N` / `🎙 Đang nghe bạn…` /
   `… Đang nghĩ` / `⏸ Tạm dừng — hỏi gì cứ nói`. Kèm level meter mic khi đang nghe
   (`onLevel` có sẵn) nếu kịp.
4. **Ngắt & quay lại**: khi người dùng chen (nói hoặc bấm ⏸) → panel Q&A như thường,
   trả lời xong hiện **"▶ Giảng tiếp từ Trang N"** nổi bật + đếm 5s tự giảng tiếp
   (có thể huỷ) — hiện tại chip chìm trong log, dễ trôi mất.
5. Highlight `key_quotes` trên slide khi đọc tới (đã có `viewer.highlight` — chỉ vẽ
   quote qua được phép kiểm substring).

## 4 · Việc cho P5 — UI chế độ B · HỘI THOẠI REAL-TIME

1. Nút 🎧 tách khỏi cụm nhập liệu — đây là MODE, không phải nút gửi. Bật → **orb/chỉ báo
   trạng thái lớn**: `nghe (xanh, phập phồng theo onLevel)` → `nghĩ (xoay)` → `nói (sóng)`.
2. Transcript câu người dùng vừa nói hiện NGAY khi STT xong (đã có — giữ), kèm nhãn
   nhỏ "nghe qua giọng nói" để phân biệt với gõ phím.
3. Toast hướng dẫn lần đầu bật (đã có) + hint cố định nhỏ: *"nói chen khi máy đang đọc
   là máy im ngay"*.
4. Tắt 🎧 → icon mic trình duyệt phải tắt (kiểm bằng mắt — đây là niềm tin riêng tư).
5. Bấm–nói–bấm 🎙 giữ nguyên là fallback khi hội trường ồn — đừng xoá.

## 5 · Checklist nghiệm thu (chạy tay trước khi báo xong)

- [ ] ▶ từ trang bất kỳ: nghe ≥3 trang liền, có lời dẫn mục (plan P3), slide tự cuộn, không có khoảng lặng giữa trang
- [ ] Đang giảng nói chen → im <300ms → trả lời CÓ trích dẫn đúng trang → "Giảng tiếp" hoạt động, mạch không đứt ("phần này" hiểu đúng)
- [ ] Trang scan → skip có nhãn; rút mạng LLM → thuyết trình vẫn chạy bằng fallback CÓ NHÃN
- [ ] 🎧: 3 câu liên tiếp không chạm chuột; ngồi im 30s → 0 request; tắt → icon mic tắt
- [ ] Hai chế độ không bật đồng thời được; golden set `eval/run-golden.mjs` chạy lại không đổ case nào
- [ ] Chỉnh hằng `VAD` theo phòng demo thật (ngưỡng hiện tune cho phòng lặng)

## 6 · Ranh giới file (theo phân công spec §8)

| Ai | Được sửa | Không đụng |
|---|---|---|
| P5 | `prototype.html`, `ui.mjs`, CSS | `voice.mjs`, `core.mjs`, `server.mjs` |
| P3 | `core.mjs` (`generateLecturePlan` + nâng `generateLecture`) | UI, `server.mjs` |

Commit đích danh file — tuyệt đối không `git add -A` (luật COMMIT-PLAN).
