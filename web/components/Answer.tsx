'use client';
/* ══════════════════════════════════════════════════════════════════════════
   Answer — render một AskResponse
   ══════════════════════════════════════════════════════════════════════════
   Chỗ dễ làm hỏng nhất của cả bản port, nên giữ nguyên từng quyết định đã
   được trả giá để học trong bản HTML:

   · follow_up có KIỂU. 'question' thì gửi câu hỏi mới; 'action' thì gọi
     handler thật. Chip 'action' KHÔNG có handler thì KHÔNG được vẽ — chip
     hứa đường lui rồi dẫn vào tường tệ hơn là không có chip (bài học ui.mjs).
   · Bấm 👎 mở luôn nút "Hỏi lại, chỉ trong Trang N" — đừng bắt người ta tự
     nghĩ cách nói lại (G9).
   · Nút Chép kèm SỐ TRANG — dán vào ghi chú mà mất nguồn thì câu trả lời
     thành tin đồn.
   · Voice chết thì nút Đọc disabled kèm lý do, không giấu (G2).
   ══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from 'react';
import type { AskResponse, FollowUp, TutorController } from '@/hooks/useTutor';
import type { ViewerController } from '@/hooks/useViewer';
import type { VoiceController } from '@/hooks/useVoice';

type Props = {
  res: AskResponse;
  req: unknown;
  styles: Record<string, string>;
  viewer: Omit<ViewerController, 'containerRef'>;
  tutor: TutorController;
  voice: VoiceController;
  voiceOk: boolean; docName: string;
  toast: (m: string, ms?: number) => void;
  onAsk: (q: string) => void;
  onFill: (v: string) => void;
  traceOpen?: boolean;
};

const DECISION: Record<string, { label: string; icon: string; tone: string }> = {
  answer:           { label: 'có căn cứ',        icon: '✓', tone: 'ok'   },
  clarify:          { label: 'cần làm rõ',       icon: '?', tone: 'warn' },
  no_grounding:     { label: 'không có căn cứ',  icon: '∅', tone: 'bad'  },
  out_of_scope:     { label: 'ngoài phạm vi',    icon: '⊘', tone: 'mute' },
  /* Nhánh thứ 5 (CONTRACT v1.1). Nhãn phải nói rõ "ngoài tài liệu" chứ không
     phải "có căn cứ" — người dùng cần biết câu này KHÔNG kiểm chứng được
     bằng slide đang mở. */
  outside_document: { label: 'ngoài tài liệu ⚠️', icon: '⚠', tone: 'warn' },
};

/** markdown tối giản: **đậm** *nghiêng* `mã` — cùng luật với ui.mjs */
const esc = (x: string) => String(x).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]!));
const md = (x: string) => esc(x)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/\*(.+?)\*/g, '<i>$1</i>')
  .replace(/`(.+?)`/g, '<code>$1</code>');

export function Answer({ res, req, styles: c, viewer, tutor, voice, voiceOk, docName, toast, onAsk, onFill, traceOpen = true }: Props) {
  const [vote, setVote] = useState<'' | 'up' | 'down'>('');
  const [whyOpen, setWhyOpen] = useState(false);
  const [why, setWhy] = useState('');
  const [folded, setFolded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [extra, setExtra] = useState<AskResponse | null>(null);   // kết quả nhánh ngoài tài liệu
  const whyRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (whyOpen) whyRef.current?.focus(); }, [whyOpen]);

  const info = DECISION[res.decision] ?? DECISION.answer;
  const firstPage = res.citations?.[0]?.page;

  const speak = async () => {
    if (speaking) { voice.stopSpeaking(); setSpeaking(false); return; }
    setSpeaking(true);
    try { await voice.speak(res.answer); }
    catch (err) { console.error('[voice]', err); toast('Không đọc được — dịch vụ TTS lỗi'); }
    finally { setSpeaking(false); }
  };

  const copy = async () => {
    const { copyText } = await import('@/lib/ui.mjs');
    const src = (res.citations ?? []).map(x => `Trang ${x.ref}: "${x.quote}"`).join('\n');
    const txt = `${res.answer}\n\n— Nguồn (${docName}):\n${src || '(không có trích dẫn)'}`;
    toast((await copyText(txt)) ? '📋 Đã chép câu trả lời kèm nguồn' : 'Không chép được');
  };

  /* Chip hành động. KNOWN_ACTIONS trong core.mjs là nguồn sự thật; ở đây chỉ
     cần mỗi action có đúng một handler — thiếu thì không vẽ chip. */
  const handlers: Record<string, () => void | Promise<void>> = {
    answer_outside: async () => {
      const out = await tutor.askOutside(req);
      if (out?.res) setExtra(out.res);
    },
    handoff_ta: async () => {
      const { copyText } = await import('@/lib/ui.mjs');
      const msg = tutor.buildHandoff(req, res);
      const ok = await copyText(msg);
      toast(ok
        ? '📋 Đã copy tin nhắn cho TA — kèm số trang, đoạn bôi đen và lý do tutor không trả lời được. Dán vào Discord khoá (bản demo chưa nối Discord thật).'
        : 'Không copy được — tin nhắn đã in ra Console (F12).', 4200);
      if (!ok) console.log(msg);
    },
  };

  const chips: FollowUp[] = (res.follow_ups ?? [])
    .map(f => (typeof f === 'string' ? { label: f as string, kind: 'question' as const } : f))
    .filter(f => f && f.label)
    .filter(f => {
      if (f.kind !== 'action') return true;
      const ok = typeof handlers[f.action ?? ''] === 'function';
      if (!ok) console.error(`[follow_ups] chip hành động "${f.label}" không có handler cho action="${f.action}" — bỏ qua, không vẽ nút chết.`);
      return ok;
    });

  return (
    <>
      <div className={folded ? c.fold : undefined}>
        <details className={c.tr} open={traceOpen} data-testid="trace">
          <summary>workflow · {res.trace?.length ?? 0} bước · {res.latency_ms}ms</summary>
          <ol>
            {(res.trace ?? []).map((t, i) => (
              <li key={i}><b>{t.step}</b> — {t.detail} <span className={c.ms}>{t.ms}ms</span></li>
            ))}
          </ol>
        </details>

        <div className={c.bd}>
          <span className={`${c.badge} ${c[info.tone]}`} data-testid="decision" data-decision={res.decision}>{info.icon} {info.label}</span>
          <span className={`${c.badge} ${c.cf}`}>tin cậy {Math.round(res.confidence * 100)}%</span>
          {res.core_used === 'mock-fallback' && (
            <span className={`${c.badge} ${c.mute}`} title={res.degraded_reason ?? ''}>nhân mock (hạ cấp)</span>
          )}
        </div>

        <div className={c.bub}>
          <span dangerouslySetInnerHTML={{ __html: md(res.answer) }} />
          {res.clarifying_question && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)', fontWeight: 560 }}
                 dangerouslySetInnerHTML={{ __html: md(res.clarifying_question) }} />
          )}
        </div>

        {!!res.citations?.length && (
          <div className={c.cts}>
            {res.citations.map((ct, i) => (
              <button key={i} className={c.ct} data-testid="citation" title={ct.quote} onClick={() => viewer.highlight(ct.page, ct.quote)}>
                Trang {ct.ref} <q>{ct.quote.slice(0, 38)}…</q>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={c.acts}>
        <button className={`${c.ib} ${vote === 'up' ? c.up : ''}`} title="Hữu ích"
                onClick={() => { setVote(v => (v === 'up' ? '' : 'up')); setWhyOpen(false); tutor.attachFeedback('up', ''); }}>👍</button>
        <button className={`${c.ib} ${vote === 'down' ? c.dn : ''}`} title="Chưa đúng"
                onClick={() => { setVote('down'); setWhyOpen(true); }}>👎</button>
        <button className={`${c.btn} ${c.sm}`}
                onClick={() => onFill(`Chỉ trả lời trong phạm vi Trang ${firstPage ?? viewer.page}: `)}>Thu hẹp phạm vi</button>
        <button className={`${c.btn} ${c.sm}`} title="Chép câu trả lời kèm số trang trích dẫn" onClick={copy}>Chép</button>
        <button className={`${c.btn} ${c.sm}`} disabled={!voiceOk}
                title={voiceOk ? 'Đọc câu trả lời (giọng PTIT)' : 'Dịch vụ giọng nói (PTIT) không kết nối được'}
                onClick={speak}>{speaking ? '⏹ Dừng' : '🔊 Đọc'}</button>
        <span className={c.sp} />
        <button className={`${c.btn} ${c.sm}`} onClick={() => setFolded(f => !f)}>{folded ? '▸ Hiện' : '✕ Ẩn'}</button>
      </div>

      {whyOpen && (
        <div className={c.why}>
          <input ref={whyRef} placeholder="Sai chỗ nào?" value={why} onChange={e => setWhy(e.target.value)} />
          <button className={`${c.btn} ${c.sm}`}
                  onClick={() => { tutor.attachFeedback('down', why); setWhyOpen(false); toast('Đã ghi vào log phiên'); }}>Gửi</button>
          {/* G9 — đưa luôn đường sửa, không bắt người ta tự nghĩ cách nói lại */}
          {firstPage && (
            <button className={`${c.btn} ${c.sm}`}
                    onClick={() => onFill(`Chỉ trả lời trong phạm vi Trang ${firstPage}: `)}>
              Hỏi lại, chỉ trong Trang {firstPage}
            </button>
          )}
        </div>
      )}

      {!folded && !!chips.length && (
        <div className={c.fus}>
          {chips.map((f, i) => f.kind === 'action' ? (
            <button key={i} className={`${c.fu} ${c.fuAct}`} data-testid={`action-${f.action}`} data-action={f.action} title={f.hint}
                    onClick={() => handlers[f.action!]()}>{f.label}</button>
          ) : (
            <button key={i} className={c.fu} title={f.hint} onClick={() => onAsk(f.label)}>{f.label}</button>
          ))}
        </div>
      )}

      {/* Nhánh ngoài tài liệu chạy xong thì hiện ngay dưới câu trả lời gốc,
          giữ được mạch "vì sao có câu này" thay vì đẩy xuống cuối khung chat. */}
      {extra && (
        <div style={{ marginTop: 10, paddingLeft: 10, borderLeft: '2px solid var(--warn)' }}>
          <Answer res={extra} req={req} styles={c} viewer={viewer} tutor={tutor} voice={voice}
                  voiceOk={voiceOk} docName={docName} toast={toast} onAsk={onAsk} onFill={onFill}
                  traceOpen={traceOpen} />
        </div>
      )}
    </>
  );
}
