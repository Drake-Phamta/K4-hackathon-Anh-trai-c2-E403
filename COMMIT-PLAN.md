# Kế hoạch commit & push — chạy tay, 6 khối

> Sinh ra để bạn **tự chạy**. Nguyên tắc xuyên suốt: **không bao giờ `git add -A`
> hay `git add .`** — đó là con đường duy nhất `.env` lọt vào nếu `.gitignore`
> có ngày bị sửa nhầm. Mỗi khối dưới đây liệt kê file **đích danh**.

---

## 0 · Chốt chặn — phải chạy TRƯỚC, cả 3 dòng phải như mô tả

```bash
cd d:/VinUni/K4-hackathon-Anh-trai-c2-E403

git check-ignore -v .env               # phải in ra:  .gitignore:4:.env  .env
git log --all --oneline -- .env        # phải RỖNG   (chưa từng vào history)
git status --porcelain | grep -E '(^|/)\.env$|\.key$|\.pem$'   # phải RỖNG
```

**Đã kiểm hộ bạn lúc soạn file này — cả 3 đều sạch.** Chạy lại vẫn nên, vì giữa
lúc soạn và lúc bạn commit có thể có thay đổi.

---

## 1 · Ghi nhận việc XOÁ (microservice voice cục bộ)

> **CẬP NHẬT sau khi khối này được soạn:** voice đã QUAY LẠI dưới dạng API
> hosted (PTIT holobox) — `codebase/voice.mjs` được VIẾT LẠI chứ không xoá,
> nên nó chuyển sang khối 2. Chỉ còn `voice/` (Python) là xoá thật: whisper
> cục bộ bị thay bằng API hosted nên microservice hết lý do tồn tại.
> Các file `codebase/index.html`, `script.js`, `styles.css`,
> `prototype-minimal.html`, `prototype-wild.html` hiện ĐÃ ĐƯỢC KHÔI PHỤC về
> đĩa (không còn ` D`) — nếu nhóm vẫn muốn gom về một bản Console thì xoá
> file trước rồi mới `git add -u` chúng; còn giữ thì không cần làm gì.

```bash
git add -u voice

git commit -m "Bỏ microservice STT/TTS cục bộ — voice chuyển sang API hosted

Đo được whisper medium mất 33 giây cho một đoạn 3,5 giây trên CPU — hàng đợi
phình ~9,4 lần thời gian thực, không dùng được trong lớp. Voice không chết:
nó được làm lại trên API hosted của PTIT (STT ~0,6s/câu, đo 31/07) — xem
commit kế tiếp. Microservice Python vì thế hết vai trò.

Xoá: voice/ (app_api.py, stt_standalone.py, tts_server.py + 5 file phụ trợ)"
```

> `docs/STT_GUIDE.md` chưa từng được git theo dõi nên không cần khai ở đây.

---

## 2 · Lõi AI + UI

```bash
git add codebase/core.mjs codebase/server.mjs codebase/ui.mjs \
        codebase/viewer.mjs codebase/prototype.html codebase/voice.mjs \
        codebase/test-core.mjs codebase/test-intents.mjs \
        codebase/CONTRACT.md codebase/README.md codebase/dump-pages.py

git commit -m "Gộp bộ định tuyến intent + 7 nhóm edge case + voice qua API hosted

8 luật định tuyến đang bị chép y hệt ở cả mockCore lẫn realCore — mỗi lần vá
một edge case phải sửa hai chỗ, và đã có lần sửa sót. Gộp thành một classify();
hai nhân giờ chỉ khác nhau ở đúng một việc: sinh câu chữ.

7 intent mới, mỗi nhóm trước đây đều trả lời SAI với 78-94% tự tin:
  doc-summary · correction · relative-nav · compare-pages · meta-tutor ·
  transform · empty

Voice làm lại trên API hosted PTIT (lý do bỏ bản cũ — whisper CPU 33s/đoạn
3,5s — không còn): server.mjs thêm /api/stt + /api/tts + /api/voice/health
(proxy stdlib, cùng origin, lỗi upstream không lộ ra client); voice.mjs viết
mới — thu bấm-nói-bấm có đồng hồ đếm giây, mã hoá WAV 16kHz ngay trên trình
duyệt (encoder kiểm bằng round-trip qua chính endpoint STT), nút 'Đọc' mỗi
câu trả lời; dịch vụ chết thì nút disabled kèm tooltip nói vì sao (G2),
không fallback giọng trình duyệt.

Trải nghiệm: 3 câu mở màn bấm được ở màn hình chào, nút Chép kèm số trang,
bấm 👎 mở luôn đường 'Hỏi lại, chỉ trong Trang N'.

CONTRACT v1.1: thêm follow_ups[].hint, và ghim luật nhãn — chip kind='question'
khi bấm sẽ GỬI CHÍNH NHÃN của nó, nên nhãn phải là câu hỏi gõ được."
```

---

## 3 · Bộ đo

```bash
git add eval/

git commit -m "Golden set 33 → 53 case, bộ đo 7 chiều máy chấm, 13 lượt đo real

Mỗi intent mới bắt buộc có case dương VÀ case âm. Case âm bắt được 2 lỗi thật
mà case dương không thấy: G35 (nhánh tóm tắt cả tài liệu vượt mặt cổng chống
bịa) và G44 (regex \\bdich\\b nuốt luôn 'dịch vụ').

Lượt cuối (real · gemma-4, run 13): 52/53 = 98,1%
  D1 trích dẫn nguyên văn 40/40 · D3 không đẩy việc 53/53 · D6 neo trang 10/10
  → đạt bar đã cam kết lúc 23:59 N1 (≥90% tổng + D1/D3/D6 = 100%)

Giữ nguyên toàn bộ trace-log các lượt để đối chiếu — chuỗi quyết định là thứ
được chấm, và case G06 đang fail vẫn để nguyên trong bộ, không xoá."
```

---

## 4 · Tài liệu, bài nộp, protocol

```bash
git add spec.md README.md demo-script.md demo-slides.html \
        validation/ reflection/ .gitignore \
        analyze_chatlog.py extract_failed_cases.py COMMIT-PLAN.md

git commit -m "Spec, slide demo, protocol validation, reflection

spec.md: §7 bảng 13 lượt đo, §8 viết lại phần multi-prototype cho khớp sự thật
(đã dựng 3 hướng, chốt Console), §9 changelog đầy đủ gồm cả các lỗi tự bắt được.

Hai script log-mining bỏ đường dẫn tuyệt đối — bản cũ ghi cứng d:\\VinUni\\... và
còn ghi một file .md sang thư mục của một IDE khác, chạy trên máy thứ hai là văng."
```

---

## 5 · Soát LẦN CUỐI rồi mới push

```bash
git show --stat HEAD~3..HEAD | grep -iE '\.env|\.key|\.pem'   # phải RỖNG
git log --all --oneline -- .env                               # phải RỖNG
git push origin main
```

---

## 6 · Nếu lỡ commit nhầm `.env`

| Tình huống | Làm gì |
|---|---|
| **Chưa push** | `git rm --cached .env && git commit --amend --no-edit` |
| **Đã push** | Coi key là **đã lộ**. Xin cấp lại key **trước**, rồi mới dọn history — xoá khỏi history không thu hồi được thứ người khác đã kịp `git clone` |

---

## Việc còn lại của bạn (ngoài 5 khối trên)

1. **Cân nhắc xin cấp lại API key.** Key hiện tại từng bị phơi qua lỗ path
   traversal ở `server.mjs` (đã vá và đã kiểm lại bằng raw socket — xem §9
   changelog). Không có bằng chứng bị lấy, nhưng key đã từng đi ra ngoài HTTP.
2. **Ctrl+P `demo-slides.html` → `demo-slides.pdf`** (`.gitignore` đã mở ngoại lệ
   sẵn cho đúng tên file này).
3. **Điền tên + mã HV** vào bảng phân công trong `README.md` và `spec.md` §8, và
   6 file `reflection/P*.md`.
4. **Chạy validation 5 người** trước CP5 — kịch bản trong `validation/`.

---

## Không xoá gì thêm

Kế hoạch ban đầu định xoá bớt `eval/trace-log-run*.json` cho nhẹ repo. **Bỏ ý
đó:** đo lại thì cả thư mục `eval/` chỉ **1,8 MB**, mỗi trace-log ~70–100 KB chứ
không phải "vài trăm KB" như phỏng đoán. Đây là bằng chứng chuỗi quyết định —
thứ rubric chấm — nên giữ cả 10 lượt rẻ hơn nhiều so với mất nó.
