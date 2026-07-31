import Link from 'next/link';
import s from './page.module.css';

/* Trang chọn bản. Ba bản là ba giả thuyết thiết kế để test với người dùng
   thật ở CP5 — giữ bản nào là do feedback quyết định, không phải gu người
   build. Nên trang này mô tả ĐÚNG khác biệt, không quảng cáo bản nào. */
const VARIANTS = [
  {
    href: '/console', name: 'Console', tag: 'cân bằng · đủ tính năng',
    desc: 'Bảng điều khiển kỹ thuật. Trace mở sẵn, badge đậm, số liệu bằng mono. Hợp để soi cơ chế và demo cho giám khảo kỹ thuật.',
    ready: true,
  },
  {
    href: '/doc', name: 'Đọc', tag: 'clean',
    desc: 'Phòng đọc yên tĩnh. Cùng dữ liệu, khác thái độ: cơ chế gói sau “cách mình làm”, đóng mặc định. Hợp demo cho học viên.',
    ready: true,
  },
  {
    href: '/wild', name: 'Bàn Slide', tag: 'wildcard',
    desc: 'Bỏ hẳn cột chat. Câu trả lời là một ghim treo cạnh đúng đoạn nó trích dẫn, nối bằng sợi chỉ vẽ tay.',
    ready: true,
  },
];

export default function Home() {
  return (
    <main className={s.picker} data-scrollable>
      <header className={s.head}>
        <h1>VLearn Slide Tutor</h1>
        <p>
          Xem slide bài giảng · bôi đen một đoạn (hoặc nói) · nhận câu trả lời{' '}
          <b>có trích dẫn trang bấm được</b>.
        </p>
      </header>

      <div className={s.grid}>
        {VARIANTS.map(v => (v.ready ? (
          <Link key={v.href} href={v.href} className={s.card}>
            <div className={s.cardHd}>
              <span className={s.name}>{v.name}</span>
              <span className={s.tag}>{v.tag}</span>
            </div>
            <p>{v.desc}</p>
            <span className={s.go}>Mở →</span>
          </Link>
        ) : (
          <div key={v.href} className={`${s.card} ${s.soon}`}>
            <div className={s.cardHd}>
              <span className={s.name}>{v.name}</span>
              <span className={s.tag}>{v.tag}</span>
            </div>
            <p>{v.desc}</p>
            <span className={s.go}>đang chuyển sang Next.js — giai đoạn C</span>
          </div>
        )))}
      </div>

      <footer className={s.foot}>
        Nhân AI (<code>core.mjs</code>) giữ nguyên từ bản đã kiểm: 14/14 kịch bản ·
        24/24 trích dẫn nguyên văn · golden set 52/53. Ba bản chỉ khác cách trình bày.
      </footer>
    </main>
  );
}
