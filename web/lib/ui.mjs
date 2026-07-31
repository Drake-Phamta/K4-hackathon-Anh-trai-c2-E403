/* Tiện ích dùng chung cho bản Console.
   Chỉ chứa phần lặp lại nhàm chán — phần trình bày để UI tự quyết. */

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
  /* Nhánh thứ 5 (CONTRACT v1.1). Nhãn phải nói rõ "ngoài tài liệu" chứ không
     phải "có căn cứ" — người dùng cần biết câu này KHÔNG kiểm chứng được
     bằng slide đang mở. */
  outside_document: { label: 'ngoài tài liệu ⚠️', icon: '⚠', tone: 'warn' },
  /* Nhánh thứ 6 (CONTRACT v1.2) — trò chuyện, không tra tài liệu.
     Trước đây lời chào bị dán "? cần làm rõ 30%": trả lời thì đúng mà nhãn thì
     vô lý — chào hỏi có gì mà phải làm rõ. Gộp xã giao vào `clarify` là tiện
     cho code, không tiện cho người đọc. `citations` bắt buộc rỗng. */
  chat: { label: 'trò chuyện', icon: '💬', tone: 'mute' },
};

/* Không có nhãn thì KHÔNG được để nổ. `DECISION[res.decision]` trần từng làm
   prototype.html ném TypeError, và UI hiển thị nó thành "Lỗi core: Cannot read
   properties of undefined" — một lỗ hổng bản đồ nhãn bị báo nhầm thành lỗi nhân
   AI. Thêm giá trị mới vào hợp đồng mà quên sửa đây là hỏng cả màn hình. */
export const decisionBadge = d =>
  DECISION[d] ?? { label: String(d || 'không rõ'), icon: '•', tone: 'mute' };

/* ══════════════════════════════════════════════════════════════════════════
   FOLLOW-UP — chip gợi ý và chip HÀNH ĐỘNG
   ══════════════════════════════════════════════════════════════════════════
   Bài học từ chính bản trước: chip "Chuyển câu này cho TA" bị xử lý như một
   câu hỏi (nhồi vào ô nhập rồi gửi), nên bấm vào ra câu trả lời vô nghĩa.
   Chip hứa một đường lui rồi dẫn vào tường thì tệ hơn là không có chip.

   Nên: follow_up có KIỂU. 'question' thì hỏi tiếp, 'action' thì gọi handler.
   Chip 'action' không có handler là BUG — renderFollowUps sẽ không vẽ nó ra
   và báo lỗi console, chứ không vẽ một nút chết.
   ══════════════════════════════════════════════════════════════════════════ */

/** Nhận cả dạng cũ (string) lẫn dạng mới (object) — CONTRACT v1.1 chỉ THÊM. */
export const normalizeFollowUps = res => (res?.follow_ups ?? [])
  .map(f => typeof f === 'string' ? { label: f, kind: 'question' } : f)
  .filter(f => f && f.label);

/**
 * Vẽ danh sách chip vào `host`.
 * @param handlers  { question(label), answer_outside(), handoff_ta() }
 * @param cls       tên class cho nút question / nút action
 */
export function renderFollowUps(res, host, handlers, cls = { q: 'sug', a: 'sug act' }){
  const items = normalizeFollowUps(res);
  if (!items.length) return 0;
  let drawn = 0;
  for (const f of items){
    if (f.kind === 'action'){
      const fn = handlers?.[f.action];
      if (typeof fn !== 'function'){
        console.error(`[follow_ups] chip hành động "${f.label}" không có handler cho action="${f.action}" — bỏ qua, không vẽ nút chết.`);
        continue;
      }
      const b = el('button', cls.a, f.label);
      b.dataset.action = f.action;
      if (f.hint) b.title = f.hint;
      b.onclick = () => fn(f);
      host.append(b); drawn++;
    } else {
      /* Nhãn của chip `question` chính là câu sẽ được gửi đi — nên nhãn phải là
         một câu hỏi gõ được, không phải lời mô tả. `hint` là chỗ để giải thích
         VÌ SAO chip này có mặt, mà không làm hỏng câu được gửi. */
      const b = el('button', cls.q, f.label);
      if (f.hint) b.title = f.hint;
      b.onclick = () => handlers?.question?.(f.label);
      host.append(b); drawn++;
    }
  }
  return drawn;
}

/** Copy có lối lui cho trình duyệt không cho clipboard API (http, iframe). */
export async function copyText(text){
  try{ await navigator.clipboard.writeText(text); return true; }
  catch{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px';
    document.body.append(ta); ta.select();
    const ok = document.execCommand?.('copy') ?? false;
    ta.remove();
    return ok;
  }
}

/** Toast ngắn — dùng cho xác nhận đã copy tin nhắn chuyển TA. */
export function toast(msg, ms = 2600){
  let t = document.getElementById('vl-toast');
  if (!t){
    t = document.createElement('div');
    t.id = 'vl-toast';
    t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);' +
      'z-index:9999;max-width:min(560px,90vw);padding:11px 16px;border-radius:10px;' +
      'font:13px/1.45 system-ui,sans-serif;white-space:pre-wrap;pointer-events:none;' +
      'background:#1c1f26;color:#f2f4f8;box-shadow:0 8px 30px rgba(0,0,0,.34);' +
      'opacity:0;transition:opacity .18s';
    document.body.append(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => { t.style.opacity = '1'; });
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.opacity = '0'; }, ms);
}

/** Dựng AskRequest đúng hợp đồng CONTRACT.md từ trạng thái viewer. */
export function buildRequest({ question, selection, viewer, docName, history = [], mode = 'doc' }){
  const chat = mode === 'chat';
  return {
    question,
    /* Chế độ trò chuyện KHÔNG được cầm tài liệu (CONTRACT v1.3). Chặn ngay ở
       đây, tại chỗ dựng request, chứ không chỉ dựa vào nhân bỏ qua: nếu sau này
       có ai thêm một đường đọc `page_text` mà quên kiểm `mode`, thì thứ họ đọc
       được phải là rỗng. Rào đặt ở nguồn rẻ hơn rào đặt ở mọi chỗ tiêu thụ. */
    selection: (!chat && selection) ? { text: selection.text, page: selection.page, rects: null } : null,
    page_text: chat ? '' : viewer.pageText(viewer.page),
    document: {
      id: docName, title: docName,
      page_count: viewer.total, current_page: viewer.page,
    },
    history,
    mode: chat ? 'chat' : 'doc',
  };
}

/** Chế độ hỏi: nhớ lựa chọn giữa các phiên. Cùng khuôn với initTheme. */
export function initMode(key = 'vlearn-mode'){
  const valid = m => (m === 'chat' ? 'chat' : 'doc');
  /* Mặc định 'doc' — đó là lý do sản phẩm tồn tại. Ai muốn tán gẫu thì phải
     nói ra; ngược lại thì không, vì hỏi bài mà rơi vào chế độ trò chuyện là
     mất trích dẫn mà không hiểu vì sao. */
  document.documentElement.dataset.mode = valid(localStorage.getItem(key));
  return {
    get(){ return valid(document.documentElement.dataset.mode); },
    set(m){
      const next = valid(m);
      document.documentElement.dataset.mode = next;
      localStorage.setItem(key, next);
      return next;
    },
    toggle(){ return this.set(this.get() === 'chat' ? 'doc' : 'chat'); },
  };
}

/** Cắt tiền tố slash command khỏi câu người dùng gõ: "/chat xin chào".
    Trả `{ mode, text }` — `mode` null nghĩa là không có lệnh nào.

    Chỉ nhận `/` ở ĐẦU chuỗi. Câu hỏi có `/` ở giữa ("A/B testing là gì",
    "so sánh trang 3/4") không bị đụng tới. Và đây là phân tích trên đúng thứ
    NGƯỜI DÙNG TỰ GÕ, không phải trên `page_text` — nên một PDF chứa dòng
    "/chat" không kích hoạt được gì. */
export const MODE_COMMANDS = [
  { cmd: '/doc',  mode: 'doc',  desc: 'Hỏi theo tài liệu — trả lời kèm trích dẫn số trang' },
  { cmd: '/chat', mode: 'chat', desc: 'Trò chuyện tự do — không tra tài liệu, không trích dẫn' },
];
export function parseModeCommand(raw){
  const s = String(raw ?? '');
  const m = /^\s*\/([a-z]+)\b[ \t]*([\s\S]*)$/i.exec(s);
  if (!m) return { mode: null, text: s };
  const hit = MODE_COMMANDS.find(c => c.cmd === '/' + m[1].toLowerCase());
  if (!hit) return { mode: null, text: s };
  return { mode: hit.mode, text: m[2] };
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
