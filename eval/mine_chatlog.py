# -*- coding: utf-8 -*-
"""
Mining chatlog → bằng chứng cho spec.md §1 (rubric R1: "phương pháp đếm kiểm lại được").

Chạy:  python eval/mine_chatlog.py
Đường dẫn TƯƠNG ĐỐI theo repo — ai clone về cũng chạy ra đúng con số này.

Chạy HAI bộ lọc song song rồi đối chiếu, vì không bộ nào tự nó là chân lý:
  - loc_tho : 4 keyword thô (bộ lọc đầu tiên của nhóm)
  - loc_chat: yêu cầu chủ ngữ của câu phủ định là tutor/hệ thống, và chỉ xét
              4 câu đầu — để không bắt nhầm câu đang MÔ TẢ nội dung slide
              (vd. "bot có rule không thể truy cập dữ liệu thời gian thực")

Vùng hai bộ lọc BẤT ĐỒNG chính là chỗ cần người gán nhãn tay → xuất ra
can_gan_nhan_tay.csv để chia nhau chấm.
"""
import csv, re, sys, unicodedata
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
CSV_IN = ROOT / "data" / "vlearn-pack" / "chatlog" / "chat_history_anonymized_for_hackathon.csv"
OUT = Path(__file__).resolve().parent

if not CSV_IN.exists():
    sys.exit(f"Không thấy chatlog tại {CSV_IN}\n(data pack không commit — xin lại từ BTC)")

# ── đọc & ghép cặp theo turn_id ──────────────────────────────────────────
csv.field_size_limit(10**7)
rows = list(csv.DictReader(CSV_IN.open(encoding="utf-8")))
turns = {}
for r in rows:
    t = turns.setdefault(r["turn_id"], {})
    t[r["role"]] = r
pairs = [(k, v["student"], v["tutor"]) for k, v in turns.items() if "student" in v and "tutor" in v]
print(f"Đọc {len(rows)} dòng → {len(pairs)} turn hoàn chỉnh (student+tutor)")

# ── bộ lọc 1: keyword thô ────────────────────────────────────────────────
KW = ["không tìm thấy", "rất tiếc", "xin lỗi", "không có thông tin"]
def loc_tho(a): return any(k in a.lower() for k in KW)

# ── bộ lọc 2: phủ định CÓ chủ ngữ là tutor/hệ thống, chỉ ở phần mở đầu ───
SUBJ = r"(tôi|mình|hệ thống|công cụ|trợ giảng|kết quả tìm kiếm|dữ liệu|tài liệu|nội dung|phần trích xuất)"
NEG = (r"(không|chưa|không thể)\s*(tìm thấy|thấy|truy (cập|xuất)|có (thông tin|nội dung|dữ liệu)"
       r"|đề cập|nhắc đến|hiển thị|mở|đọc|tra cứu|khả dụng|được cung cấp|chứa)")
RE_A = re.compile(SUBJ + r"[^.!?\n]{0,60}?" + NEG, re.I)
RE_B = re.compile(r"(rất tiếc|xin lỗi)[^.!?\n]{0,80}?" + NEG, re.I)
def loc_chat(a):
    for s in re.split(r"(?<=[.!?])\s+|\n+", a)[:4]:
        if RE_A.search(s) or RE_B.search(s):
            return True
    return False

# ── phân loại ────────────────────────────────────────────────────────────
recs = []
for tid, s, t in pairs:
    a = t["content"]
    recs.append(dict(
        turn_id=tid, user_id=t["user_id"], day_code=t["day_code"],
        cau_hoi=s["content"], cau_tra_loi=a,
        rating=t.get("rating", ""), citations=t.get("citations", ""),
        tho=loc_tho(a), chat=loc_chat(a),
    ))

n = len(recs)
both = [r for r in recs if r["tho"] and r["chat"]]
only_tho = [r for r in recs if r["tho"] and not r["chat"]]
only_chat = [r for r in recs if r["chat"] and not r["tho"]]

print("\n── MA TRẬN ĐỒNG THUẬN ──")
print(f"  Cả hai cùng gắn lỗi   : {len(both):4d} ({len(both)/n:5.1%})  → gần như chắc chắn lỗi")
print(f"  Chỉ lọc thô gắn       : {len(only_tho):4d}         → cần người phân xử")
print(f"  Chỉ lọc chặt gắn      : {len(only_chat):4d}         → cần người phân xử")
print(f"  VÙNG BẤT ĐỒNG         : {len(only_tho)+len(only_chat):4d}         → gán nhãn tay")

# ── đối chiếu ground truth: rating do học viên chấm ──────────────────────
print("\n── KIỂM CHỨNG bằng rating học viên (bằng chứng khách quan) ──")
rated = [r for r in recs if r["rating"] in ("up", "down")]
print(f"  Chỉ {len(rated)}/{n} turn có rating ({len(rated)/n:.1%}) — dùng để KIỂM bộ lọc, không dùng làm nhãn")
for ten, f in [("lọc thô", lambda r: r["tho"]), ("lọc chặt", lambda r: r["chat"])]:
    hit = [r for r in rated if f(r)]
    d = sum(1 for r in hit if r["rating"] == "down"); u = len(hit) - d
    miss_d = sum(1 for r in rated if r["rating"] == "down" and not f(r))
    print(f"  {ten:9s}: bắt {d:2d} down / {u:2d} up · bỏ sót {miss_d:2d} down"
          f"  → {'bắt nhầm câu TỐT' if u else 'không bắt nhầm câu tốt'}")

# ── xuất file ────────────────────────────────────────────────────────────
def dump(path, rs, cols):
    with (OUT / path).open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader(); w.writerows(rs)
    print(f"  → {path} ({len(rs)} dòng)")

print("\n── XUẤT FILE ──")
COLS = ["turn_id", "user_id", "day_code", "rating", "citations", "cau_hoi", "cau_tra_loi"]
dump("loi_dong_thuan.csv", both, COLS)

for r in only_tho: r["chi_boi"] = "loc_tho"
for r in only_chat: r["chi_boi"] = "loc_chat"
dis = sorted(only_tho + only_chat, key=lambda r: r["turn_id"])
for r in dis: r["nhan_tay"] = ""; r["nguoi_cham"] = ""
dump("can_gan_nhan_tay.csv", dis, ["turn_id", "chi_boi", "nhan_tay", "nguoi_cham", "rating", "cau_hoi", "cau_tra_loi"])
print("     ^ cột nhan_tay: điền LOI / KHONG_LOI / TU_CHOI_DUNG — chia nhau chấm, 2 người/case")

print(f"""
── SỐ ĐƯA VÀO spec.md ──
  Mẫu:                    n = {n} turn
  Lỗi đồng thuận 2 bộ lọc:  {len(both)} ({len(both)/n:.1%})   ← con số AN TOÀN để khai
  Cận trên (hợp 2 bộ lọc):  {len(both)+len(only_tho)+len(only_chat)} ({(len(both)+len(only_tho)+len(only_chat))/n:.1%})
  Chờ gán nhãn tay:         {len(dis)}
  Ghi khoảng [{len(both)/n:.0%}–{(len(both)+len(only_tho)+len(only_chat))/n:.0%}] thay vì một con số cứng
  sẽ vững hơn khi giám khảo vặn phương pháp đếm.
""")
