# VLearn Slide Tutor — Next.js UI

Ba giao diện dùng chung AI core và PDF viewer:

- `/console`: bảng điều khiển, trace mở.
- `/doc`: phòng đọc, trace đóng.
- `/wild`: câu trả lời thành ghim cạnh slide.

## Chạy local

```bash
cd ../api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --port 8000

cd ../web
npm ci
API_ORIGIN=http://localhost:8000 npm run dev
```

Mở `http://localhost:3000`, chọn giao diện, rồi nạp PDF từ máy. Không có cấu
hình LLM, core tự hạ cấp về mock và UI ghi rõ trạng thái.

## Kiểm

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e

cd ../api
.venv/bin/pytest -q
```

Playwright tự chạy Node proxy baseline ở `:8080` để đối chiếu legacy và Next.
PDF mẫu chỉ được nạp qua file input; không copy vào `public/`.
