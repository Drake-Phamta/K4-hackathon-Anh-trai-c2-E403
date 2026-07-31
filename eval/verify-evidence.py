#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kiểm lại MỌI con số mà spec.md trích — một lệnh, một phương pháp.

    python eval/verify-evidence.py

Vì sao có file này
-----------------
Rubric R1 đòi bằng chứng chuẩn B: "số mining đếm được + ≥5 ví dụ nguyên văn +
**phương pháp đếm kiểm lại được**". Nếu TA chạy lại mà ra số khác con số trong
spec thì mất điểm evidence — kể cả khi số trong spec không sai về bản chất.

Chuyện đã xảy ra thật: bản đầu của CONTRACT.md ghi 68,0% (đoạn được chọn ==
câu hỏi) và 20/37 = 54% downvote. Đếm chặt lại ra 60,9% và 21/37 = 57%. Lệch
vì phép so khớp không được định nghĩa. Nên file này GHIM phương pháp: mỗi con
số có một hàm, in ra cả phép đo phụ để thấy độ nhạy.

Bảo mật (README quy định 3): chỉ in turn_id + trích ngắn ≤ QUOTE_MAX ký tự.
Không dump nguyên văn dài, không xuất data pack ra ngoài.
"""
from __future__ import annotations

import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

# Console Windows mặc định là cp1252 — print() chữ có dấu là chết ngay dòng
# đầu. File output vẫn ghi UTF-8 riêng nên chỉ cần vá stdout.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import pandas as pd
except ImportError:
    sys.exit("Thiếu pandas. Cài bằng:  pip install pandas")

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "data" / "vlearn-pack" / "chatlog" / "chat_history_anonymized_for_hackathon.csv"
OUT = ROOT / "eval" / "evidence-report.md"
QUOTE_MAX = 120

# Từ khoá nhận diện tutor THỪA NHẬN không tra được nội dung.
# Khớp trên bản đã bỏ dấu + viết thường, nên chỉ cần viết một kiểu.
FAIL_KEYWORDS = ["khong tim thay", "rat tiec", "xin loi", "khong co thong tin"]

# Header mà UI VLearn tự chèn vào mỗi tin nhắn học viên.
HEADER = re.compile(r'\(trang (\d+), doan duoc chon:\s*"(.*?)"\s*\)', re.S)

# Câu hỏi NEO vào trang đang xem → page_text là nguồn sự thật, sửa được
# bằng cấu trúc (không cần tra keyword). Đây là phạm vi lát cắt của nhóm.
#
# HAI phép đếm, cố ý:
#   PAGE_ANCHORED (chặt) — đòi từ vật chứa đi kèm từ chỉ định ("trang NÀY",
#     "slide 37"). Đây là con số CHÍNH trong spec: cận dưới bảo thủ, không
#     thổi phồng phạm vi lát cắt.
#   PAGE_ANCHOR_CORE (rộng) — chép đúng PAGE_ANCHOR trong codebase/core.mjs:
#     chỉ cần có từ vật chứa. Luật định tuyến THẬT của hệ thống rộng như vậy
#     (kèm điều kiện decisive rỗng), nên số này mô tả sát hơn phần lỗi mà
#     route neo trang thực tế sẽ đón. In cả hai để người chấm thấy độ nhạy —
#     hai regex từng LỆCH NHAU âm thầm và không ai biết con số 30,6% ứng với
#     phép đo nào.
PAGE_ANCHORED = re.compile(
    r"(trang|slide|silde|slice|day ?\d|bai) ?(nay|hien tai|do|\d+)"
    r"|(nay|hien tai) ?(trang|slide)"
    r"|noi dung (nay|tren|cua trang)"
    r"|doan (nay|duoc chon|boi den|khoanh)"
    r"|(bieu do|hinh|so do|bang) ?(nay|tren|dc|duoc)"
)
# bản sao PAGE_ANCHOR của core.mjs (đã bỏ dấu): vật chứa trần + "day <số>"
PAGE_ANCHOR_CORE = re.compile(
    r"\b(trang|slide|silde|slice|page|bai|muc|phan|doan|hinh|anh|bang|bieu do|so do)\b"
    r"|\bday\s*\d"
)


def de(x) -> str:
    """Bỏ dấu + viết thường. Phải xử lý 'đ' RIÊNG vì nó không phải dấu tổ hợp —
    bỏ sót chỗ này là regex header trượt sạch (đã dính lỗi này một lần)."""
    s = str(x).lower().replace("đ", "d")
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


def body_of(raw: str) -> str:
    """Phần học viên GÕ, bỏ dòng header do UI chèn."""
    return raw.split("\n", 1)[1].strip() if "\n" in str(raw) else str(raw).strip()


def short(s: str, n: int = QUOTE_MAX) -> str:
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[: n - 1] + "…"


def main() -> int:
    if not CSV.exists():
        sys.exit(f"Không thấy chatlog: {CSV}")

    df = pd.read_csv(CSV)
    student = df[df.role == "student"].copy()
    tutor = df[df.role == "tutor"].copy()
    L: list[str] = []

    def say(line: str = "") -> None:
        print(line)
        L.append(line)

    say("# Bằng chứng mining — bản kiểm lại được")
    say()
    say(f"Sinh bằng `python eval/verify-evidence.py` · nguồn `{CSV.relative_to(ROOT).as_posix()}`")
    say()
    say("Mỗi con số dưới đây tương ứng một mã E dùng trong `spec.md`. Chạy lại")
    say("script này phải ra đúng những số này — nếu lệch thì spec sai, không phải")
    say("script sai.")
    say()

    # ── E1 ───────────────────────────────────────────────────────────────
    say("## E1 · Quy mô tập dữ liệu")
    say()
    say(f"- Tổng dòng: **{len(df):,}**")
    say(f"- Lượt học viên: **{len(student):,}** · lượt tutor: **{len(tutor):,}**")
    say(f"- Số hội thoại: **{df['conversation_id'].nunique():,}** · số người học: **{df['user_id'].nunique():,}**")
    say()

    # ── E2 ───────────────────────────────────────────────────────────────
    low = tutor["content"].map(de)
    tutor["fail"] = low.str.contains("|".join(FAIL_KEYWORDS), na=False)
    n_fail = int(tutor["fail"].sum())
    say("## E2 · Tutor thừa nhận không tra được nội dung")
    say()
    say("Phép đếm: chuẩn hoá bỏ dấu + viết thường, rồi tìm bất kỳ từ khoá nào trong danh sách.")
    say()
    say("| Từ khoá | Số lượt khớp |")
    say("|---|---|")
    for k in FAIL_KEYWORDS:
        say(f"| `{k}` | {int(low.str.contains(k, na=False).sum())} |")
    say(f"| **hợp (union, không đếm trùng)** | **{n_fail}** |")
    say()
    say(f"→ **{n_fail}/{len(tutor):,} = {n_fail / len(tutor) * 100:.1f}%** lượt trả lời của tutor")
    say()
    say("*Giới hạn đã biết, ghi rõ để không bị hỏi bất ngờ:* `xin loi` cũng khớp cả")
    say("câu xin lỗi lịch sự không liên quan tra cứu. Bỏ riêng từ này thì còn ")
    strict = int(low.str.contains("khong tim thay|rat tiec|khong co thong tin", na=False).sum())
    say(f"**{strict}/{len(tutor):,} = {strict / len(tutor) * 100:.1f}%** — vẫn cùng một bậc độ lớn,")
    say("nên kết luận không đổi.")
    say()

    # ── E3 ───────────────────────────────────────────────────────────────
    no_cite = int((tutor["citations"].fillna("[]").astype(str).str.strip() == "[]").sum())
    say("## E3 · Trả lời không kèm trích dẫn")
    say()
    say(f"Cột `citations` rỗng (`[]`): **{no_cite}/{len(tutor):,} = {no_cite / len(tutor) * 100:.1f}%**")
    say()

    # ── E4 ───────────────────────────────────────────────────────────────
    dv = tutor[tutor["rating"] == "down"]
    dv_fail = int(dv["fail"].sum())
    up = int((tutor["rating"] == "up").sum())
    say("## E4 · Downvote và mối liên hệ với lỗi thiếu ngữ cảnh")
    say()
    say(f"- Downvote: **{len(dv)}** · upvote: **{up}** · không đánh giá: **{len(tutor) - len(dv) - up:,}**")
    say(f"- Downvote thuộc nhóm E2: **{dv_fail}/{len(dv)} = {dv_fail / len(dv) * 100:.0f}%**")
    say()
    say(f"Tỷ lệ downvote trong nhóm E2 là {dv_fail / n_fail * 100:.1f}%, ngoài nhóm E2 là")
    say(f"{(len(dv) - dv_fail) / (len(tutor) - n_fail) * 100:.1f}% — chênh {(dv_fail / n_fail) / ((len(dv) - dv_fail) / (len(tutor) - n_fail)):.1f} lần.")
    say()

    # ── E5, E6 ───────────────────────────────────────────────────────────
    has_header = 0
    sel_eq_q = 0
    sel_eq_q_exact = 0
    pages_seen: list[int] = []
    for raw in student["content"]:
        d = de(raw)
        m = HEADER.search(d)
        if not m:
            continue
        has_header += 1
        pages_seen.append(int(m.group(1)))
        sel = " ".join(m.group(2).split())
        rest = " ".join(d[m.end():].split())
        if sel and rest:
            if rest == sel:
                sel_eq_q_exact += 1
            if rest[:50] == sel[:50]:
                sel_eq_q += 1

    say("## E5 · Học viên gần như luôn ở trong ngữ cảnh một trang cụ thể")
    say()
    say(f'Tin nhắn có header `(Trang N, đoạn được chọn: "…")`: '
        f"**{has_header}/{len(student):,} = {has_header / len(student) * 100:.1f}%**")
    say()
    say(f"Trang được nhắc tới: từ {min(pages_seen)} đến {max(pages_seen)}, "
        f"trung vị {int(pd.Series(pages_seen).median())}")
    say()

    say("## E6 · Nhưng tutor KHÔNG nhận được chữ nào trên slide")
    say()
    say("Phép đo: `đoạn được chọn` có trùng với chính câu học viên gõ hay không.")
    say("Trùng nghĩa là hệ thống chỉ chuyển tiếp lại câu hỏi, không gửi nội dung trang.")
    say()
    say("| Cách so khớp | Số lượt | Tỷ lệ trên E5 |")
    say("|---|---|---|")
    say(f"| trùng 50 ký tự đầu *(dùng trong spec)* | {sel_eq_q} | **{sel_eq_q / has_header * 100:.1f}%** |")
    say(f"| trùng tuyệt đối toàn chuỗi | {sel_eq_q_exact} | {sel_eq_q_exact / has_header * 100:.1f}% |")
    say()

    # ── E7 ───────────────────────────────────────────────────────────────
    merged = tutor[tutor["fail"]].merge(student, on="turn_id", suffixes=("_t", "_s"))
    shapes = Counter()
    SHAPE_KEYS = ["tom tat", "tom gon", "giai thich", "vi du", "so sanh",
                  "khac nhau", "lam sao", "tai sao", "la gi", "y nghia", "cach"]
    anchored = 0
    anchored_core = 0
    anchored_examples: list[tuple[str, str]] = []
    for _, r in merged.iterrows():
        b = body_of(r["content_s"])
        d = de(b)
        for k in SHAPE_KEYS:
            if k in d:
                shapes[k] += 1
                break
        else:
            shapes["(khác)"] += 1
        if PAGE_ANCHORED.search(d):
            anchored += 1
            if len(anchored_examples) < 6:
                anchored_examples.append((str(r["turn_id"]), b))
        if PAGE_ANCHOR_CORE.search(d):
            anchored_core += 1

    say("## E7 · Dạng câu hỏi trong nhóm lỗi E2")
    say()
    say("| Dạng | Số lượt |")
    say("|---|---|")
    for k, v in shapes.most_common():
        say(f"| {k} | {v} |")
    say()

    # ── E8 ───────────────────────────────────────────────────────────────
    lat = pd.to_numeric(tutor["avg_latency_ms"], errors="coerce")
    slow = int((lat > 10000).sum())
    say("## E8 · Độ trễ")
    say()
    say(f"- Lượt chờ trên 10 giây: **{slow}/{len(tutor):,} = {slow / len(tutor) * 100:.1f}%**")
    say(f"- Trung vị: **{lat.median():,.0f} ms** · phân vị 90: **{lat.quantile(0.9):,.0f} ms**")
    say()

    # ── E9 ───────────────────────────────────────────────────────────────
    fu = tutor["follow_ups"].fillna("[]").astype(str).str.strip()
    has_fu = int((~fu.isin(["[]", "nan", ""])).sum())
    asked = int((tutor["asked_check_question"] == True).sum())  # noqa: E712
    say("## E9 · Tutor cũ không bao giờ đưa bước tiếp theo")
    say()
    say(f"- Lượt có `follow_ups`: **{has_fu}/{len(tutor):,} = {has_fu / len(tutor) * 100:.1f}%**")
    say(f"- Lượt có `asked_check_question`: **{asked}/{len(tutor):,} = {asked / len(tutor) * 100:.2f}%**")
    say()
    say(f"Nghĩa là {n_fail} lần từ chối là {n_fail} ngõ cụt — học viên không được")
    say("đưa cho một hành động nào để đi tiếp.")
    say()

    # ── E10 ──────────────────────────────────────────────────────────────
    say("## E10 · Phần lỗi sửa được ĐẢM BẢO bằng text trang đang xem")
    say()
    say("Phép đo: trong nhóm E2, đếm câu hỏi NEO vào trang đang xem. In HAI phép")
    say("đếm với độ chặt khác nhau — con số dùng trong spec là bản CHẶT (cận dưới")
    say("bảo thủ); bản RỘNG chép đúng `PAGE_ANCHOR` trong `codebase/core.mjs` nên")
    say("mô tả sát hơn phạm vi mà route neo trang của hệ thống thực tế sẽ đón")
    say("(luật thật còn kèm điều kiện *không có thuật ngữ kỹ thuật* — nên số thật")
    say("nằm giữa hai mốc).")
    say()
    say("| Phép đếm | Số lượt | Tỷ lệ trên E2 |")
    say("|---|---|---|")
    say(f"| **chặt** — vật chứa + từ chỉ định (\"trang NÀY\", \"slide 37\") *(dùng trong spec)* | {anchored} | **{anchored / n_fail * 100:.1f}%** |")
    say(f"| rộng — chép `PAGE_ANCHOR` của core.mjs (vật chứa trần) | {anchored_core} | {anchored_core / n_fail * 100:.1f}% |")
    say()
    say(f"- Hỏi nội dung, vẫn cần retrieval (theo phép chặt): **{n_fail - anchored}/{n_fail} = "
        f"{(n_fail - anchored) / n_fail * 100:.1f}%**")
    say()
    say("Nhóm thứ hai vẫn được lợi vì `page_text` luôn có trong ngữ cảnh, nhưng")
    say("khi tài liệu thật sự không chứa thì vẫn phải từ chối — và phải từ chối.")
    say()

    # ── ví dụ nguyên văn ─────────────────────────────────────────────────
    say("## Ví dụ nguyên văn *(R1 đòi ≥5)*")
    say()
    say(f"Trích ngắn ≤{QUOTE_MAX} ký tự kèm `turn_id` để tra lại trong data pack —")
    say("không dán nguyên văn dài (README quy định 3).")
    say()
    say("| turn_id | Học viên hỏi | Tutor trả lời |")
    say("|---|---|---|")
    for _, r in merged.head(8).iterrows():
        say(f"| `{r['turn_id']}` | {short(body_of(r['content_s']), 90)} | {short(r['content_t'], 110)} |")
    say()

    say("### Trong đó, nhóm neo trang (E10) — chính là lát cắt nhóm chọn")
    say()
    for tid, b in anchored_examples:
        say(f"- `{tid}` — {short(b, 90)}")
    say()

    OUT.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"\n→ đã ghi {OUT.relative_to(ROOT).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
