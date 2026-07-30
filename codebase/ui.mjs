/* Tiện ích dùng chung cho cả 3 bản giao diện.
   Chỉ chứa phần lặp lại nhàm chán — phần trình bày để mỗi bản tự quyết. */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, cls, txt){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}

export const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));

/** markdown tối giản: **đậm** *nghiêng* `mã` */
export const md = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\*(.+?)\*/g, '<i>$1</i>')
  .replace(/`(.+?)`/g, '<code>$1</code>');

export const DECISION = {
  answer:       { label: 'có căn cứ',       icon: '✓', tone: 'ok'   },
  clarify:      { label: 'cần làm rõ',      icon: '?', tone: 'warn' },
  no_grounding: { label: 'không có căn cứ', icon: '∅', tone: 'bad'  },
  out_of_scope: { label: 'ngoài phạm vi',   icon: '⊘', tone: 'mute' },
};

/** Dựng AskRequest đúng hợp đồng CONTRACT.md từ trạng thái viewer. */
export function buildRequest({ question, selection, viewer, docName, history = [] }){
  return {
    question,
    selection: selection ? { text: selection.text, page: selection.page, rects: null } : null,
    page_text: viewer.pageText(viewer.page),
    document: {
      id: docName, title: docName,
      page_count: viewer.total, current_page: viewer.page,
    },
    history,
  };
}

/** Chuyển AskResponse thành câu ngắn để ĐỌC — đọc cả đoạn dài thì user bỏ chạy. */
export function toSpeech(res){
  if (res.decision === 'clarify')      return res.clarifying_question ?? res.answer;
  if (res.decision === 'no_grounding') return res.answer.split('\n')[0];
  if (res.decision === 'out_of_scope') return res.answer.split('\n')[0];
  const first = res.answer.split('\n').filter(l => l.trim() && !l.startsWith('Theo')).slice(0, 2).join(' ');
  const cite = res.citations?.length ? ` Xem trang ${res.citations.map(c => c.ref).join(', ')}.` : '';
  return (first || res.answer).slice(0, 420) + cite;
}

/** Theme: nhớ lựa chọn, mặc định theo hệ điều hành. */
export function initTheme(key = 'vlearn-theme'){
  const saved = localStorage.getItem(key);
  if (saved) document.documentElement.dataset.theme = saved;
  return {
    get(){
      return document.documentElement.dataset.theme
        ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    },
    toggle(){
      const next = this.get() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem(key, next);
      return next;
    },
  };
}

/** Tải log phiên ra JSON — artifact cho eval/ (rubric R5). */
export function downloadLog(turns, meta = {}){
  const blob = new Blob([JSON.stringify({
    exported_at: new Date().toISOString(), ...meta, turns,
  }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `session-log-${Date.now()}.json`;
  a.click();
}
