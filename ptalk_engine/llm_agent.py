import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_API_KEY_HERE":
    genai.configure(api_key=GEMINI_API_KEY)
    # Dùng model flash để có tốc độ phản hồi nhanh nhất cho Voice Chat
    llm_model = genai.GenerativeModel("gemini-1.5-flash")
else:
    llm_model = None

def generate_rag_response(user_text: str, current_page_transcript: str) -> str:
    """Hàm 'Suy nghĩ' của hệ thống. Nhận text từ STT và Context của trang để trả lời."""
    if not llm_model:
        return "Xin lỗi, hệ thống chưa được cấu hình khóa API của Google. Vui lòng kiểm tra lại cấu hình."
        
    prompt = f"""Bạn là VLearn AI Tutor. Nhiệm vụ của bạn là trả lời câu hỏi của học viên một cách ngắn gọn, súc tích và tự nhiên như đang nói chuyện (dưới 40 từ) để chuyển đổi sang giọng nói (TTS). Không dùng các ký tự markdown phức tạp như *, #.

NGỮ CẢNH BÀI GIẢNG HIỆN TẠI MÀ HỌC VIÊN ĐANG XEM:
{current_page_transcript}

CÂU NÓI CỦA HỌC VIÊN:
{user_text}

HÃY TRẢ LỜI:"""

    try:
        response = llm_model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Tôi đang gặp sự cố kết nối tới máy chủ AI. Chi tiết lỗi là: {str(e)}"
