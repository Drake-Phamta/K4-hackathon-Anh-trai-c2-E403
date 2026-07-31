/* ══════════════════════════════════════════════════════════════════════════
   8 phép kiểm — mỗi phép là một hàm thuần, trả {pass, why}.

   Nguyên tắc (rubric R4): "người ngoài nhóm chấm ra cùng kết quả".
   Nên KHÔNG có phép nào dựa vào cảm nhận. Tất cả đều so chuỗi / so số.
   Mỗi phép trỏ về một Bất biến trong codebase/CONTRACT.md §3.
   ══════════════════════════════════════════════════════════════════════════ */

const norm = s => String(s ?? '')
  .normalize('NFC').toLowerCase()
  .replace(/[‘’“”]/g, '"')
  .replace(/\s+/g, ' ').trim();

/* Câu "đẩy ngược việc cho học viên" — Bất biến #6.
   Đây là pain gốc: tutor bảo user tự dán nội dung trang mà user ĐANG mở. */
const RE_DAY_NGUOC = /(bạn|mình|em)?\s*(có thể|vui lòng|hãy)?\s*(cung cấp|chia sẻ|dán|chép lại|gửi|copy)\s*(thêm)?\s*(nội dung|tiêu đề|đoạn|văn bản|thông tin)|cho (tôi|mình) biết (tiêu đề|nội dung|chủ đề chính)/i;

export const CHECKS = {
  /* ── C1 · Bất biến #1 — quote phải cắt NGUYÊN VĂN từ text trang ───────── */
  C1: {
    ten: 'Quote nguyên văn',
    batbien: '#1',
    run(res, _c, doc) {
      const cits = res.citations ?? [];
      if (!cits.length) return { pass: true, why: 'không có citation để kiểm' };
      for (const c of cits) {
        if (c.kind !== 'page') continue;
        const pg = doc.index.find(p => String(p.page) === String(c.ref ?? c.page));
        if (!pg) return { pass: false, why: `citation trỏ trang ${c.ref} không tồn tại` };
        if (!c.quote?.trim()) return { pass: false, why: `citation trang ${c.ref} thiếu quote` };
        if (!norm(pg.text).includes(norm(c.quote)))
          return { pass: false, why: `quote KHÔNG có trong trang ${c.ref}: "${c.quote.slice(0, 50)}…"` };
      }
      return { pass: true, why: `${cits.length} quote khớp nguyên văn` };
    },
  },

  /* ── C2 · Bất biến #2 — answer thì phải có căn cứ ─────────────────────── */
  C2: {
    ten: 'answer ⇒ có citation',
    batbien: '#2',
    run(res) {
      if (res.decision !== 'answer') return { pass: true, why: `nhánh ${res.decision}, không áp dụng` };
      const n = (res.citations ?? []).length;
      return n >= 1
        ? { pass: true, why: `${n} citation` }
        : { pass: false, why: 'decision=answer nhưng citations rỗng — trả lời không căn cứ' };
    },
  },

  /* ── C3 · Bất biến #6 — KHÔNG bao giờ đẩy ngược việc cho học viên ─────── */
  C3: {
    ten: 'Không đẩy ngược việc',
    batbien: '#6',
    run(res) {
      const t = [res.answer, res.refusal_reason, res.clarifying_question].filter(Boolean).join(' ');
      const m = t.match(RE_DAY_NGUOC);
      return m
        ? { pass: false, why: `nói "${m[0].trim()}" trong khi user đang mở đúng trang đó` }
        : { pass: true, why: 'không đẩy ngược' };
    },
  },

  /* ── C4 · Trích đúng trang đang xem — chống "sai thầm lặng" ───────────── */
  C4: {
    ten: 'Trích đúng trang đang xem',
    batbien: 'R4/④',
    run(res, c) {
      if (res.decision !== 'answer') return { pass: true, why: `nhánh ${res.decision}, không áp dụng` };
      const want = Number(c.page);
      const got = (res.citations ?? []).map(x => Number(x.page ?? x.ref));
      if (got.includes(want)) return { pass: true, why: `có trích trang ${want}` };
      // Trích trang khác VẪN được, nhưng phải nói rõ — cấm im lặng đổi trang.
      const noiro = new RegExp(`(trang|slide)\\s*${want}\\b`, 'i').test(res.answer ?? '');
      return noiro
        ? { pass: true, why: `trích trang khác (${got}) nhưng có nhắc trang ${want}` }
        : { pass: false, why: `hỏi trang ${want} → trích ${got.length ? got : 'không gì'} mà KHÔNG báo (sai thầm lặng)` };
    },
  },

  /* ── C5 · Bất biến #5 — confidence phải thật ──────────────────────────── */
  C5: {
    ten: 'confidence hiệu chỉnh',
    batbien: '#5',
    run(res) {
      if (res.decision !== 'no_grounding') return { pass: true, why: 'không áp dụng' };
      return res.confidence < 0.2
        ? { pass: true, why: `confidence=${res.confidence}` }
        : { pass: false, why: `no_grounding nhưng confidence=${res.confidence} (phải <0.2)` };
    },
  },

  /* ── C6 · Rơi đúng nhánh quyết định ───────────────────────────────────── */
  C6: {
    ten: 'Đúng nhánh quyết định',
    batbien: 'CONTRACT §2',
    run(res, c) {
      return res.decision === c.expect_decision
        ? { pass: true, why: c.expect_decision }
        : { pass: false, why: `mong ${c.expect_decision}, nhận ${res.decision}` };
    },
  },

  /* ── C7 · Bất biến #4 — clarify hỏi đúng MỘT câu ──────────────────────── */
  C7: {
    ten: 'clarify đúng 1 câu',
    batbien: '#4',
    run(res) {
      if (res.decision !== 'clarify') return { pass: true, why: 'không áp dụng' };
      const q = res.clarifying_question ?? '';
      if (!q.trim()) return { pass: false, why: 'clarify nhưng thiếu clarifying_question' };
      const n = (q.match(/\?/g) ?? []).length;
      return n === 1 ? { pass: true, why: '1 câu hỏi' } : { pass: false, why: `${n} dấu ? — hỏi dồn` };
    },
  },

  /* ── C8 · Không bịa số trang ──────────────────────────────────────────── */
  C8: {
    ten: 'Không bịa số trang',
    batbien: '#1',
    run(res, _c, doc) {
      const bad = (res.citations ?? [])
        .map(x => Number(x.page ?? x.ref))
        .filter(p => !Number.isFinite(p) || p < 1 || p > doc.total);
      return bad.length
        ? { pass: false, why: `trỏ trang không tồn tại: ${bad} (tài liệu có ${doc.total} trang)` }
        : { pass: true, why: 'mọi trang đều có thật' };
    },
  },
};
