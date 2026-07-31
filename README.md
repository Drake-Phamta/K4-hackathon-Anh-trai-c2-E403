# Mini Hackathon AI — Batch 03

**Đội thi:** Anh trai c2 (Zone Z5) · **Hướng A — VLearn** · tối ưu tính năng có sẵn

> ### Lát cắt
> **1 học viên đang xem bài giảng · bôi đen 1 đoạn và hỏi rộng · AI tự động bốc toàn bộ transcript của trang hiện tại nạp vào Context · trả về câu trả lời có trích dẫn nguyên văn từ đúng trang đó.**

| Đọc gì trước | |
|---|---|
| **[spec.md](spec.md)** | AI Spec đầy đủ §1–§9 · quality bar đã chốt |
| **[demo-script.md](demo-script.md)** | Kịch bản demo 5′ — bấm gì, gõ gì, ra gì |
| **[codebase/README.md](codebase/README.md)** | Cách chạy prototype · phần nào mock, phần nào thật |

## Thành viên & phân công theo lãnh thổ file

Danh sách đầy đủ kèm MSSV: **[TEAMMATES.md](TEAMMATES.md)**. Nhóm 4 người trên 6 vai nên
hai thành viên kiêm hai vai — **vibe-coding rule**: CP5 bốc ngẫu nhiên một người, không
giải thích được phần có tên mình thì phần đó 0 điểm. Câu hỏi tự soát cho từng vai: xem
file tương ứng trong [reflection/](reflection/).

| Vai | Tên (mã HV) | Lãnh thổ file — chịu trách nhiệm giải thích được |
|---|---|---|
| **P1** · Product Owner & Spec Keeper | Ngô Ngọc Quyền (2A202601928) | `spec.md` · `README.md` · `TEAMMATES.md` |
| **P2** · Data & Evidence | Phạm Tuấn Anh (2A202601840) | `eval/verify-evidence.py` · `eval/evidence-report.md` · `analyze_chatlog.py` · `extract_failed_cases.py` |
| **P3** · AI/Prompt Engineer | Nguyễn Kỳ Anh (2A202601558) | `codebase/core.mjs` · `codebase/server.mjs` · `api/main.py` |
| **P4** · QA & Golden Set | Bế Quốc Khánh (2A202601463) | `eval/golden-set.json` · `eval/run-golden.mjs` · `codebase/test-core.mjs` · `codebase/test-intents.mjs` · `web/e2e/vlearn.spec.ts` |
| **P5** · UI/UX Builder | Nguyễn Kỳ Anh (2A202601558) | `codebase/prototype.html` · `codebase/ui.mjs` · `codebase/viewer.mjs` · `web/` |
| **P6** · Demo & Validation | Bế Quốc Khánh (2A202601463) | `validation/` · `demo-slides.html` · `demo-script.md` |

*Cách ghép vai: **P3+P5** đều là code chạy (engine và UI dùng chung `core.mjs` qua seam);
**P4+P6** đều là kiểm chứng (bộ đo máy chấm + kiểm chứng với người thật).*

## Chạy thử trong 2 phút

```bash
# 1 · web + proxy LLM (key đọc từ .env, KHÔNG xuống client)
cd codebase && node server.mjs          # → localhost:8080/prototype.html
curl -s localhost:8080/api/llm/health   # → {"ok":true,"model":"gemma-4"}

```

Mở `localhost:8080/prototype.html` → *Mở PDF* → `data/slides/day03.pdf`.
Nhãn góc trên phải phải hiện **`AI thật (gemma-4)`**; hiện `nhân mock` nghĩa là chưa nối được LLM.

## Kiểm lại mọi con số nhóm đưa ra

```bash
python eval/verify-evidence.py                        # E1..E10 → eval/evidence-report.md
python codebase/dump-pages.py data/slides/day03.pdf ../tmp/pages.json   # ghi RA NGOÀI repo
node codebase/test-core.mjs      ../tmp/pages.json    # 14/14 · 24/24 · 8/8
node codebase/test-intents.mjs   ../tmp/pages.json    # 118/118 · 48/48  (lát cắt + intent + bẫy hồi quy)
node eval/run-golden.mjs         ../tmp/pages.json --core=real --run=19  # 55/56 = 98,2%
```

## Kết quả · đối chiếu quality bar

| | Cam kết (chốt 23:59 N1) | Đo được (lượt 2 — AI thật, sau vòng audit) |
|---|---|---|
| Tổng golden set | ≥ **90%** | **98,2%** (55/56) ✅ |
| D1 trích dẫn cắt nguyên văn (so **toàn chuỗi**) | **100%** (điều kiện cứng) | 25/25 case có trích dẫn ✅ |
| D3 không đòi học viên cung cấp nội dung trang | **100%** (điều kiện cứng) | 33/33 ✅ |
| D6 neo trang ⇒ trích đúng trang neo | **100%** (điều kiện cứng) | 10/10 ✅ |

*Mẫu số D1 là 25 vì từ lượt 2 chỉ đếm case thật sự có trích dẫn để kiểm (case từ chối
không có gì để đối chiếu) — phép đo chặt hơn, không phải chất lượng tụt. Chi tiết:
`spec.md` §7.*

Một case chưa đạt (`G06` · turn `T0115`) — nguyên nhân phân tích trong [spec.md §7](spec.md).
**Không xoá, không chỉnh test cho đẹp số.**

## Cấu trúc repo

```
├── TEAMMATES.md         ← thành viên + MSSV + phân công theo vai
├── spec.md              ← AI Spec §1–§9 · quality bar
├── demo-slides.html     ← 9 trang · Ctrl+P → demo-slides.pdf
├── demo-script.md       ← kịch bản demo + Q&A đã chuẩn bị
├── codebase/            ← prototype (bản Console) + proxy LLM + test
├── web/                 ← bản Next.js của cùng lát cắt (engine dùng chung)
├── api/                 ← proxy FastAPI cho LLM + STT/TTS
├── eval/                ← golden set 63 case · runner · các lượt đo · trace log · script bằng chứng
├── validation/          ← protocol + task card + feedback log (chạy sáng N2)
├── reflection/          ← mỗi người 1 file
└── data/                ← data pack của khoá (BTC cấp)
```

**SPEC → Prototype → Demo.** Đây không phải cuộc thi code — đây là cuộc thi **tư duy sản phẩm AI**.

- Thời lượng: **1,5 ngày** (một ngày build + một buổi demo)
- Nhóm: **4-5 người** · zone tối đa 5 nhóm · thi theo lớp

## Bắt đầu từ đâu?

1. Đọc **`01-de-bai.md`** để chọn hướng và hiểu tiêu chí.
2. Mở **`02-guide.md`** — hướng dẫn từng giai đoạn, đứng ở đâu đọc mục đó.
3. Viết spec theo **`03-template-ai-spec.md`** — deliverable trung tâm của cả sự kiện.
4. Đọc **`04-rubric.md`** ngay từ đầu — biết trước bài được chấm theo tiêu chí nào.

| File / thư mục           | Nội dung                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-de-bai.md`           | Đề bài 3 hướng · 5 tiêu chí nghiệm thu · ràng buộc chung                                                                          |
| `02-guide.md`            | Hướng dẫn 5 giai đoạn: khám phá → spec → build → đo & validate → demo                                                             |
| `03-template-ai-spec.md` | Template AI Spec (nộp 23:59 ngày 1)                                                                                                         |
| `04-rubric.md`           | Rubric 100 điểm (25 nộp checkpoint + 75 chấm bài) + checklist xác minh 6 mốc                                                           |
| `data/`                  | Dữ liệu thật đã ẩn danh: chatlog VLearn tutor + 6 transcript bài giảng bản sạch — dùng để tìm bằng chứng và xây golden set |
| `tham-khao/`             | JTBD Playbook (PDF) + worksheet JTBD đầy đủ — đọc khi muốn đào sâu                                                                 |

## Lịch — 6 mốc

| Mốc                                                                   | Khoá 3       | Khoá 4       |
| ---------------------------------------------------------------------- | ------------- | ------------- |
| Khai mạc + phát đề                                                 | 09:00 ngày 1 | 14:00 ngày 1 |
| CP1 · Chốt Canvas                                                    | 10:00 ngày 1 | 15:00 ngày 1 |
| CP2 · Show được thứ bấm được                                  | 12:00 ngày 1 | 17:00 ngày 1 |
| CP3 · AI chạy thật + đo lượt đầu                               | 16:00 ngày 1 | 10:30 ngày 2 |
| CP4 · Chốt tiến độ — spec nộp hạn cứng**23:59 ngày 1** | 17:30 ngày 1 | 12:00 ngày 2 |
| CP5 · Xác minh + validation + dry run                                | 09:00 ngày 2 | 14:00 ngày 2 |
| CP6 · Demo                                                            | 10:00 ngày 2 | 15:00 ngày 2 |

Mỗi mốc cần show gì và được xác minh thế nào: xem bảng trong `04-rubric.md`.

## Nộp bài

Một repo nhóm, cấu trúc như sau. Spec chốt lúc 23:59 ngày 1; bản hoàn chỉnh trước CP6.

```
repo/
├── README.md          ← thành viên (mã HV + tên) + phân công có tên từng phần
├── TEAMMATES.md       ← danh sách thành viên + MSSV (dạng bảng, tool quét được)
├── spec.md            ← AI Spec theo 03-template-ai-spec.md
├── demo-slides.pdf    ← slide 6 trang theo 02-guide.md §5.1
├── codebase/          ← prototype (ghi rõ phần nào mock)
├── eval/              ← golden set + bảng kết quả các lượt chạy
├── validation/        ← feedback log từ vòng user test
└── reflection/        ← mỗi người 1 file
```

## Chấm điểm

Tổng **100 điểm = 25 điểm nộp checkpoint + 75 điểm chấm bài nộp**. Chi tiết từng ý điểm: `04-rubric.md`.

**25 điểm nộp — mỗi checkpoint 5 điểm (CP1-CP5):** nộp đúng hạn → 5 điểm · nộp muộn → 0 điểm cho mốc đó. Mỗi thành viên nộp riêng, cả nhóm dùng chung một link repo.

**75 điểm chấm — trên artifact trong repo, mỗi con điểm trỏ về một file:**

| Khối                                | Điểm | Chấm trên file nào                       |
| ------------------------------------ | ------ | ------------------------------------------- |
| R1 · Bằng chứng & impact          | 15     | `spec.md` §1-§2 + log khảo sát/mining |
| R2 · Lát cắt & thiết kế         | 15     | `spec.md` §4                             |
| R3 · Chỗ khó & kịch bản rủi ro | 11     | `spec.md` §5-§6                         |
| R4 · Kiểm thử                     | 15     | `spec.md` §7 + `eval/`                 |
| R5 · Prototype chạy được        | 8      | `codebase/` + demo                        |
| R6 · Validation với user           | 8      | `validation/`                             |
| R7 · Quy trình & repo              | 3      | cấu trúc repo                             |

Ba điều nên biết trước khi làm:

- Điểm dựa trên **chuỗi quyết định và bằng chứng**, không dựa trên mức độ hoành tráng của sản phẩm.
- Kết quả đo **ghi nhận trung thực** — kể cả khi không đạt mục tiêu nhóm tự đặt — vẫn được tính đủ điểm. Số liệu bị chỉnh sửa hoặc che giấu sẽ không được tính.
- Reflection cá nhân chấm riêng theo rubric của khoá. Điểm vòng demo, chấm chéo trong zone và thưởng thêm (nếu có) theo thể lệ công bố lúc khai mạc.

## Luật chung

1. Prototype có 3 mức **Sketch / Mock / Working** — mức nào cũng bắt buộc **≥1 lời gọi AI chạy thật**.
2. **Vibe-coding rule:** dùng AI để build thoải mái, nhưng không giải thích được phần có tên mình thì phần đó 0 điểm (kiểm tra tại CP5).
3. **Quality bar** chốt tại spec.md 23:59 ngày 1 và giữ nguyên sau đó.
4. Chỉ dùng dữ liệu trong `data/` hoặc dữ liệu giả tự sinh — không dùng dữ liệu thật của người thật. Không commit API key.
5. Tuân thủ **quy định bảo mật dữ liệu** bên dưới — đây là điều kiện để được cấp data.

## Bảo mật dữ liệu được cung cấp

Dữ liệu trong `data/` là dữ liệu thật của khoá học (đã ẩn danh), cấp riêng cho hackathon này. Khi nhận data, nhóm cam kết:

1. **Chỉ dùng trong phạm vi hackathon** — cho việc tìm bằng chứng, xây golden set và build prototype. Không dùng cho mục đích khác.
2. **Không chia sẻ ra ngoài khoá học** — không đăng lên mạng xã hội, không gửi cho người ngoài, không đưa vào bất kỳ dataset hay repo công khai nào.
3. **Không commit data pack vào repo nộp bài** — repo nhóm chỉ chứa trích dẫn ngắn để minh hoạ (vài dòng); golden set trích từ data ghi rõ mã đoạn/mã hội thoại thay vì dán nguyên văn dài.
4. **Cẩn trọng khi đưa data vào công cụ ngoài** — chỉ đưa phần tối thiểu cần cho việc đang làm; lưu ý API/công cụ free tier có thể dùng dữ liệu để huấn luyện (xem `02-guide.md` §3.4).
5. **Không cố suy ngược danh tính** từ dữ liệu đã ẩn danh ([học viên], mã U/C/T/M).
6. Sau sự kiện, **xoá các bản sao data pack** khỏi máy cá nhân và các công cụ đã upload nếu ban tổ chức yêu cầu.

Vi phạm được xử lý theo quy định của khoá và có thể ảnh hưởng trực tiếp đến điểm của nhóm.
