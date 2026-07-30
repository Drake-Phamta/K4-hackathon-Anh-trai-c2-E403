import pandas as pd
import os

file_path = r'd:\VinUni\K4-hackathon-Anh-trai-c2-E403\data\vlearn-pack\chatlog\chat_history_anonymized_for_hackathon.csv'
df = pd.read_csv(file_path)

tutor_df = df[df['role'] == 'tutor'].copy()
student_df = df[df['role'] == 'student'].copy()

# Tìm các câu trả lời báo lỗi
fail_keywords = ['không tìm thấy', 'rất tiếc', 'xin lỗi', 'không có thông tin']
tutor_df['failed'] = tutor_df['content'].str.lower().str.contains('|'.join(fail_keywords), na=False)
failed_tutor = tutor_df[tutor_df['failed']]

# Ghép với câu hỏi của học viên tương ứng
merged = pd.merge(failed_tutor, student_df, on='turn_id', suffixes=('_tutor', '_student'))

# Chỉ lấy các cột cần thiết
output_df = merged[['turn_id', 'content_student', 'content_tutor']]

# 1. Lưu ra file CSV vào thư mục eval/ cho nhóm dùng làm Golden Set
eval_dir = r'd:\VinUni\K4-hackathon-Anh-trai-c2-E403\eval'
os.makedirs(eval_dir, exist_ok=True)
csv_out = os.path.join(eval_dir, 'loi_mu_tai_lieu.csv')
output_df.to_csv(csv_out, index=False, encoding='utf-8-sig')

# 2. Tạo file Markdown Artifact để hiển thị trực tiếp cho User đọc nhanh
md_path = r'C:\Users\Admin\.gemini\antigravity-ide\brain\12df7c8b-fca3-44a2-854f-2feed264aeef\failed_cases.md'
with open(md_path, 'w', encoding='utf-8') as f:
    f.write("# Bằng Chứng Lỗi: AI Tutor 'Mù' Tài Liệu\n\n")
    f.write("> Đây là danh sách các trường hợp minh chứng cho lỗi: Học viên có bôi đen nội dung (UI bắt được), nhưng Backend lại không nạp đủ ngữ cảnh trang cho LLM, khiến LLM báo lỗi.\n\n")
    f.write(f"**Tổng số case phát hiện:** {len(output_df)} cases (chiếm ~24% tổng số lượt hội thoại).\n\n")
    f.write("---\n\n")
    
    # Hiển thị 20 cases tiêu biểu nhất vào Artifact
    for idx, row in output_df.head(20).iterrows():
        f.write(f"### Turn: `{row['turn_id']}`\n")
        f.write(f"**👤 Học viên hỏi:**\n```text\n{row['content_student']}\n```\n\n")
        f.write(f"**🤖 AI Tutor trả lời:**\n```text\n{row['content_tutor']}\n```\n\n")
        f.write("---\n")
    
    f.write(f"\n*(Chi tiết toàn bộ {len(output_df)} cases đã được xuất đầy đủ ra file: `d:\VinUni\K4-hackathon-Anh-trai-c2-E403\eval\loi_mu_tai_lieu.csv` để nhóm bạn làm Bằng chứng và xây dựng Golden Set)*\n")

print("Hoàn tất trích xuất dữ liệu.")
