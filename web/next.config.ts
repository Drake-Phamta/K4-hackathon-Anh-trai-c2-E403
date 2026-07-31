import type { NextConfig } from 'next';

/* ══════════════════════════════════════════════════════════════════════════
   rewrites() — GIỮ SAME-ORIGIN CHO /api/*
   ══════════════════════════════════════════════════════════════════════════
   voice.mjs ghi rõ nó đang dựa vào tính chất này: "trình duyệt chỉ thấy
   /api/stt và /api/tts cùng origin, không đụng CORS, không lộ endpoint ra
   client". Tách 2 host mà không có bước này là làm vỡ đúng thứ đó.

   Chuyển tiếp xảy ra PHÍA SERVER — trình duyệt vẫn chỉ thấy một origin. Đây
   là lý do dùng rewrites chứ không phải thêm CORS header vào backend: thêm
   header là mở endpoint cho mọi origin, còn rewrites thì không lộ gì cả.

   API_ORIGIN mặc định trỏ server.mjs (:8080) để giai đoạn A đo parity với
   backend ĐÃ BIẾT LÀ ĐÚNG. Sang giai đoạn B chỉ đổi biến này sang FastAPI —
   không phải sửa code.
   ══════════════════════════════════════════════════════════════════════════ */
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8080';

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
