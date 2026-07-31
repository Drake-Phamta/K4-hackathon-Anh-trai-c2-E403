import type { Metadata } from 'next';
import './globals.css';

/* Không nạp webfont ở root: bản Console/Bàn Slide dùng font hệ thống có chủ
   đích, chỉ bản Đọc mới cần một họ chữ riêng (nạp ở layout của route đó,
   giai đoạn D). Nạp Geist ở đây là bắt cả 3 bản tải font không ai dùng. */
export const metadata: Metadata = {
  title: 'VLearn Slide Tutor',
  description: 'Xem slide bài giảng, hỏi đáp có trích dẫn kiểm chứng được, trò chuyện bằng giọng nói.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
