# Thành viên nhóm

**Đội thi:** Anh trai c2 · **Zone:** Z5 · **Hướng:** A — VLearn (tối ưu tính năng có sẵn)

**Sản phẩm:** VLearn Slide Tutor — nạp đúng trang đang xem vào ngữ cảnh AI tutor.

## Danh sách thành viên

| # | Họ và tên | MSSV | Vai | Lãnh thổ file — chịu trách nhiệm giải thích được |
|---|---|---|---|---|
| 1 | Nguyễn Kỳ Anh | 2A202601558 | P3 · AI/Prompt Engineer · P5 · UI/UX Builder | `codebase/core.mjs` · `codebase/server.mjs` · `api/main.py` · `codebase/prototype.html` · `codebase/ui.mjs` · `codebase/viewer.mjs` · `web/` |
| 2 | Ngô Ngọc Quyền | 2A202601928 | P2 · Data & Evidence | `eval/verify-evidence.py` · `eval/evidence-report.md` · `analyze_chatlog.py` · `extract_failed_cases.py` |
| 3 | Phạm Tuấn Anh | 2A202601840 | P1 · Product Owner & Spec Keeper | `spec.md` · `README.md` · `TEAMMATES.md` |
| 4 | Bế Quốc Khánh | 2A202601463 | P4 · QA & Golden Set · P6 · Demo & Validation | `eval/golden-set.json` · `eval/run-golden.mjs` · `codebase/test-core.mjs` · `codebase/test-intents.mjs` · `web/e2e/vlearn.spec.ts` · `validation/` · `demo-slides.html` · `demo-script.md` |

## Phân công theo vai P1–P6

| Vai | Người phụ trách | MSSV | Lãnh thổ file |
|---|---|---|---|
| **P1** · Product Owner & Spec Keeper | Phạm Tuấn Anh | 2A202601840 | `spec.md` · `README.md` · `TEAMMATES.md` |
| **P2** · Data & Evidence | Ngô Ngọc Quyền | 2A202601928 | `eval/verify-evidence.py` · `eval/evidence-report.md` · `analyze_chatlog.py` · `extract_failed_cases.py` |
| **P3** · AI/Prompt Engineer | Nguyễn Kỳ Anh | 2A202601558 | `codebase/core.mjs` · `codebase/server.mjs` · `api/main.py` |
| **P4** · QA & Golden Set | Bế Quốc Khánh | 2A202601463 | `eval/golden-set.json` · `eval/run-golden.mjs` · `codebase/test-core.mjs` · `codebase/test-intents.mjs` · `web/e2e/vlearn.spec.ts` |
| **P5** · UI/UX Builder | Nguyễn Kỳ Anh | 2A202601558 | `codebase/prototype.html` · `codebase/ui.mjs` · `codebase/viewer.mjs` · `web/` |
| **P6** · Demo & Validation | Bế Quốc Khánh | 2A202601463 | `validation/` · `demo-slides.html` · `demo-script.md` |

Nhóm 4 người trên 6 vai, nên hai thành viên kiêm hai vai. Cách ghép theo cụm công việc
liền mạch: **P3+P5** đều là code chạy (engine và UI dùng chung `core.mjs` qua seam, sửa
một chỗ ảnh hưởng cả hai); **P4+P6** đều là kiểm chứng (bộ đo máy chấm và kiểm chứng với
người thật là hai nửa của cùng một câu hỏi "sản phẩm này có dùng được không").

## Chấm D8 — hai người độc lập

Chiều D8 (*đúng cỡ · đúng giọng*) là chiều duy nhất cần người chấm, không nằm trong quality
bar. Hai người chấm: **Ngô Ngọc Quyền** (P2) và **Phạm Tuấn Anh** (P1) — cố ý không giao
cho P4/P6, vì người xây golden set tự chấm output của chính bộ đo mình viết thì mất tính
độc lập. Bảng chấm: `eval/D8-human-scoring.md`.

## Vibe-coding rule

> *"Dùng AI để build thoải mái, nhưng **không giải thích được phần có tên mình thì phần đó
> 0 điểm**"* — kiểm tra tại CP5, **bốc ngẫu nhiên một thành viên**.

Trước CP5, mỗi người mở đúng file mình đứng tên ở bảng trên và tự trả lời được ba câu:
đoạn này **làm gì** · **vì sao** làm thế mà không làm cách khác · bỏ nó đi thì **hỏng gì**.

Câu hỏi tự soát riêng cho từng vai: xem file tương ứng trong [reflection/](reflection/).

## Liên quan

| File | Nội dung |
|---|---|
| [README.md](README.md) | Tổng quan repo · cách chạy · kết quả đo |
| [spec.md](spec.md) §8 | Phân công + kế hoạch + willing users |
| [phan_cong_nhiem_vu.md](phan_cong_nhiem_vu.md) | Mô tả nhiệm vụ chi tiết 6 vai theo từng giai đoạn |
| [reflection/](reflection/) | Reflection cá nhân — mỗi vai một file |
