/* Layout lồng: nạp token của riêng bản Console.
   Ba bản dùng CÙNG tên token với giá trị khác nhau, nên token phải theo route
   chứ không nằm ở globals.css. */
import './tokens.css';

export const metadata = { title: 'Console — VLearn Slide Tutor' };

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
