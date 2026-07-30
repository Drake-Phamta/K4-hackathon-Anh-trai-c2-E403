from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse
import shutil
import os
import tempfile
import socket
import json

app = FastAPI(title="PTalk Audio Microservice")

# Init STT
from stt_standalone import STTEngineStandalone
stt_engine = STTEngineStandalone(zipformer_dir="./models/ZipFormer")

# Init LLM Agent
from llm_agent import generate_rag_response

@app.post("/api/v1/stt")
async def speech_to_text(file: UploadFile = File(...)):
    # Tạo file tạm để lưu audio tải lên
    temp_fd, temp_path = tempfile.mkstemp(suffix=".wav")
    os.close(temp_fd)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
  
    try:
        text = stt_engine.transcribe(temp_path)
    finally:
        os.remove(temp_path)
        
    return {"text": text}

@app.post("/api/v1/tts")
async def text_to_speech(text: str = Form(...), speed: float = Form(1.0)):
    # Gửi request sang TTS TCP Socket Server ở cổng 8001
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(("127.0.0.1", 8001))
        payload = json.dumps({"text": text, "speed": speed}) + "\n"
        sock.sendall(payload.encode("utf-8"))
      
        resp_data = sock.recv(4096).decode("utf-8")
        sock.close()
        
        resp = json.loads(resp_data)
        if "error" in resp:
            return {"error": resp["error"]}
        return FileResponse(resp["output_path"], media_type="audio/wav")
    except ConnectionRefusedError:
        return {"error": "TTS Server (Port 8001) is not running. Please start tts_server.py first."}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/v1/voice_chat")
async def voice_chat(file: UploadFile = File(...), context: str = Form("Đây là nội dung bài giảng hiện tại.")):
    # 1. Nhận Audio và dịch ra chữ (STT)
    temp_fd, temp_path = tempfile.mkstemp(suffix=".wav")
    os.close(temp_fd)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
  
    try:
        user_text = stt_engine.transcribe(temp_path)
    finally:
        os.remove(temp_path)
    
    if not user_text:
        return {"error": "Không nghe rõ âm thanh."}
        
    # 2. Gọi Bộ não LLM để sinh câu trả lời kèm Context (RAG)
    ai_text = generate_rag_response(user_text, context)
    
    # 3. Gửi câu trả lời sang TTS Server để chuyển thành giọng nói
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect(("127.0.0.1", 8001))
        payload = json.dumps({"text": ai_text, "speed": 1.0}) + "\n"
        sock.sendall(payload.encode("utf-8"))
      
        resp_data = sock.recv(4096).decode("utf-8")
        sock.close()
        
        resp = json.loads(resp_data)
        if "error" in resp:
            return {"error": resp["error"], "user_text": user_text, "ai_text": ai_text}
            
        # Trả về cả Audio file (Dùng tạm cách này để demo dễ nhất)
        return FileResponse(resp["output_path"], media_type="audio/wav")
    except Exception as e:
        return {"error": str(e), "user_text": user_text, "ai_text": ai_text}

# Run via: uvicorn app_api:app --host 0.0.0.0 --port 8000
