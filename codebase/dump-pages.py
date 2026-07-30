#!/usr/bin/env python3
"""Trích text từng trang PDF -> pages.json để chạy test-core.mjs không cần trình duyệt.

    pip install pypdf
    python dump-pages.py <file.pdf> <ra/pages.json>

LƯU Ý BẢO MẬT: pages.json chứa nguyên văn nội dung slide của khoá.
Ghi ra ngoài repo (vd. thư mục tạm), KHÔNG commit. Xem README.md §Bảo mật.
"""
import json
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    sys.exit("Thiếu pypdf. Cài bằng:  pip install pypdf")

if len(sys.argv) != 3:
    sys.exit(__doc__)

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
if not src.exists():
    sys.exit(f"Không thấy file: {src}")

reader = PdfReader(str(src))
pages = [
    {"page": i + 1, "text": " ".join((p.extract_text() or "").split())}
    for i, p in enumerate(reader.pages)
]

dst.write_text(json.dumps(pages, ensure_ascii=False, indent=1), encoding="utf-8")

empty = sum(1 for p in pages if len(p["text"]) < 20)
total = sum(len(p["text"]) for p in pages)
print(f"{len(pages)} trang -> {dst}")
print(f"  {total:,} ký tự · {empty} trang thiếu text")
if empty:
    print("  ! Trang thiếu text sẽ không tra cứu được — PDF đó có thể là ảnh scan.")
