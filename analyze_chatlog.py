import pandas as pd

file_path = r'd:\VinUni\K4-hackathon-Anh-trai-c2-E403\data\vlearn-pack\chatlog\chat_history_anonymized_for_hackathon.csv'
df = pd.read_csv(file_path)

tutor_df = df[df['role'] == 'tutor'].copy()
student_df = df[df['role'] == 'student'].copy()

print(f"Tổng số lượt hội thoại: {len(tutor_df)}")

# Phân tích 1: Tutor báo lỗi / từ chối trả lời do không tìm thấy tài liệu
fail_keywords = ['không tìm thấy', 'rất tiếc', 'xin lỗi', 'không có thông tin']
tutor_df['failed_to_answer'] = tutor_df['content'].str.lower().str.contains('|'.join(fail_keywords), na=False)
failed_answers = tutor_df[tutor_df['failed_to_answer']]
print(f"\n1. Số lần Tutor thất bại trong việc trả lời (báo lỗi không tìm thấy): {len(failed_answers)}")

print("\n--- 5 Ví dụ Tutor trả lời thất bại ---")
for idx, row in failed_answers.head(5).iterrows():
    turn_id = row['turn_id']
    student_msg = student_df[student_df['turn_id'] == turn_id]['content'].values
    student_q = student_msg[0] if len(student_msg) > 0 else "N/A"
    print(f"Học viên: {student_q}")
    print(f"Tutor: {row['content'][:150]}...")
    print("-" * 40)

# Phân tích 2: Các câu trả lời bị đánh giá DOWN
downvoted = tutor_df[tutor_df['rating'] == 'down']
print(f"\n2. Số lần Tutor bị đánh giá 'down' (không hài lòng): {len(downvoted)}")

print("\n--- 3 Ví dụ Tutor bị DOWNvote ---")
for idx, row in downvoted.head(3).iterrows():
    turn_id = row['turn_id']
    student_msg = student_df[student_df['turn_id'] == turn_id]['content'].values
    student_q = student_msg[0] if len(student_msg) > 0 else "N/A"
    print(f"Học viên: {student_q}")
    print(f"Tutor: {row['content'][:150]}...")
    print("-" * 40)

# Phân tích 3: Không có trích dẫn (Hallucination risk)
tutor_df['no_citation'] = tutor_df['citations'] == '[]'
no_citation_count = tutor_df['no_citation'].sum()
print(f"\n3. Số lần Tutor trả lời nhưng KHÔNG có trích dẫn (nguy cơ bịa chuyện): {no_citation_count} ({no_citation_count/len(tutor_df)*100:.1f}%)")

# Phân tích 4: Latency cao
high_latency = tutor_df[tutor_df['avg_latency_ms'] > 10000]
print(f"\n4. Số lần người dùng phải chờ trên 10 giây (Latency cao): {len(high_latency)}")
