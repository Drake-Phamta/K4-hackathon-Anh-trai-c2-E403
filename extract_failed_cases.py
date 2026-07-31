"""Trích các lượt tutor THỪA NHẬN không tra được nội dung, ghép lại với câu hỏi
gốc của học viên → bằng chứng cho E2/E10 trong spec.md §1.

    python extract_failed_cases.py

Chạy từ đâu cũng được: mọi đường dẫn tính từ vị trí file này, không phải từ cwd.
(Bản đầu ghi cứng `d:\\VinUni\\...` và còn ghi một file .md sang thư mục brain của
một IDE khác — chạy trên máy người thứ hai là văng ngay.)
"""
import os

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_IN = os.path.join(HERE, 'data', 'vlearn-pack', 'chatlog',
                      'chat_history_anonymized_for_hackathon.csv')
EVAL_DIR = os.path.join(HERE, 'eval')

df = pd.read_csv(CSV_IN)

tutor_df = df[df['role'] == 'tutor'].copy()
student_df = df[df['role'] == 'student'].copy()

# Tìm các câu trả lời báo lỗi.
# LƯU Ý PHƯƠNG PHÁP (spec.md §1 đã khai): 'xin lỗi' bắt cả câu xin lỗi lịch sự
# không liên quan tra cứu → bỏ riêng nó thì còn 242/1.261 = 19,2%, cùng bậc độ
# lớn, kết luận không đổi.
fail_keywords = ['không tìm thấy', 'rất tiếc', 'xin lỗi', 'không có thông tin']
tutor_df['failed'] = tutor_df['content'].str.lower().str.contains('|'.join(fail_keywords), na=False)
failed_tutor = tutor_df[tutor_df['failed']]

# Ghép với câu hỏi của học viên tương ứng
merged = pd.merge(failed_tutor, student_df, on='turn_id', suffixes=('_tutor', '_student'))

# Chỉ lấy các cột cần thiết
output_df = merged[['turn_id', 'content_student', 'content_tutor']]

os.makedirs(EVAL_DIR, exist_ok=True)

# 1 · CSV đầy đủ cho nhóm xây Golden Set
csv_out = os.path.join(EVAL_DIR, 'loi_mu_tai_lieu.csv')
output_df.to_csv(csv_out, index=False, encoding='utf-8-sig')

# 2 · Markdown 20 case tiêu biểu để đọc nhanh — ghi TRONG repo
md_path = os.path.join(EVAL_DIR, 'failed-cases.md')
with open(md_path, 'w', encoding='utf-8') as f:
    f.write("# Bằng chứng lỗi: AI Tutor 'mù' tài liệu\n\n")
    f.write("> Sinh bằng `python extract_failed_cases.py` — không sửa tay.\n\n")
    f.write("> Học viên có bôi đen nội dung (UI bắt được), nhưng backend không nạp đủ "
            "ngữ cảnh trang cho LLM, khiến LLM báo không tra được.\n\n")
    f.write(f"**Tổng số case phát hiện:** {len(output_df)} "
            f"(≈24,3% tổng số lượt tutor — xem E2 trong `spec.md`).\n\n")
    f.write("---\n\n")

    for _, row in output_df.head(20).iterrows():
        f.write(f"### Turn: `{row['turn_id']}`\n")
        f.write(f"**👤 Học viên hỏi:**\n```text\n{row['content_student']}\n```\n\n")
        f.write(f"**🤖 AI Tutor trả lời:**\n```text\n{row['content_tutor']}\n```\n\n")
        f.write("---\n")

    f.write(f"\n*(Đủ {len(output_df)} case trong `eval/loi_mu_tai_lieu.csv`.)*\n")

print(f"Hoàn tất. {len(output_df)} case →")
print(f"  {csv_out}")
print(f"  {md_path}")
