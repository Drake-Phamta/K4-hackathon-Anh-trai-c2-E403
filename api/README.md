# VLearn FastAPI proxy

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --port 8000
```

Chạy Next.js với `API_ORIGIN=http://localhost:8000`. Biến môi trường giữ nguyên
như `.env.example`; không bật CORS vì trình duyệt chỉ gọi same-origin `/api/*`.
