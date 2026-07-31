'use client';
/* ══════════════════════════════════════════════════════════════════════════
   CONSOLE — bản React của codebase/prototype.html
   ══════════════════════════════════════════════════════════════════════════
   Cổng ra giai đoạn A: phải làm được ĐÚNG những gì bản HTML làm được —
   5 kịch bản + nhánh outside_document + chip chuyển TA, 0 lỗi console.

   Logic AI không đổi một dòng: core.mjs / viewer.mjs / voice.mjs / ui.mjs
   được nạp động trong hook, chỉ vòng đời là của React.
   ══════════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './console.module.css';
import { useViewer, type Selection } from '@/hooks/useViewer';
import { useVoice } from '@/hooks/useVoice';
import { useTutor, type AskResponse, type Turn } from '@/hooks/useTutor';
import { Answer } from '@/components/Answer';

const SCEN: Record<string, { p: number; q: string; s?: boolean }> = {
  happy:   { p: 22, q: 'Giải thích đoạn bôi đen ở Trang 22.', s: true },
  clarify: { p: 37, q: 'cái này khác cái kia chỗ nào?' },
  nog:     { p: 30, q: 'LangGraph có hỗ trợ streaming không?' },
  oos:     { p: 40, q: 'Làm hộ mình Lab 3 với, cho mình đáp án luôn.' },
  domain:  { p: 20, q: 'ReAct là một kiểu fine-tuning đúng không?' },
};

const STARTERS = [
  'Tài liệu này gồm những phần nào?',
  'Tóm tắt trang mình đang xem',
  'LangGraph có hỗ trợ streaming không?',
];

export default function ConsolePage() {
  const [docName, setDocName] = useState('chưa nạp tài liệu');
  const [sel, setSel] = useState<Selection>(null);
  const [popAt, setPopAt] = useState<{ x: number; y: number } | null>(null);
  const [zoomPct, setZoomPct] = useState('—');
  const [toastMsg, setToastMsg] = useState('');
  const [question, setQuestion] = useState('');
  const [micState, setMicState] = useState<'idle' | 'recording' | 'processing'>('idle');

  const qRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viaVoice = useRef(false);

  const toast = useCallback((m: string, ms = 2300) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), ms);
  }, []);

  const tutor = useTutor();
  const voice = useVoice();

  const viewer = useViewer({
    onReady: ({ total, pages, name }) => {
      tutor.setDocIndex(pages);
      const dn = `${name} · ${total} trang`;
      setDocName(dn);
      setZoomPct('100%');
      const ok = pages.filter(p => p.text.length > 20).length;
      toast(`${total} trang · trích được text ${ok}/${total}`);
    },
    onSelection: sl => {
      setSel(sl);
      setPopAt(sl?.rect ? { x: Math.max(6, sl.rect.left + sl.rect.width / 2 - 80), y: Math.max(6, sl.rect.top - 40) } : null);
    },
  });

  /* cuộn khung chat xuống đáy mỗi khi có lượt mới hoặc lượt cũ có kết quả */
  useEffect(() => {
    const l = logRef.current;
    if (l) l.scrollTop = l.scrollHeight;
  }, [tutor.turns]);

  /* Mic chỉ sáng khi CẢ PDF đã nạp LẪN health probe xanh. Probe đỏ thì nút
     vẫn hiện nhưng disabled kèm tooltip nói vì sao — giấu nút đi là người
     dùng tưởng tính năng không tồn tại (G2). */
  const voiceOk = voice.healthy === true;
  const micDisabled = !(voiceOk && viewer.total) || micState === 'processing';
  const micTitle = voiceOk
    ? 'Hỏi bằng giọng nói — bấm để ghi, bấm lần nữa để gửi'
    : 'Dịch vụ giọng nói (PTIT) không kết nối được — gõ câu hỏi thay nhé';

  const send = useCallback(async (text?: string, selOverride?: Selection) => {
    const q = (text ?? qRef.current?.value ?? '').trim();
    if (!q || !viewer.total) return;
    const used = selOverride !== undefined ? selOverride : sel;

    setQuestion('');
    if (qRef.current) { qRef.current.value = ''; qRef.current.style.height = 'auto'; }
    setSel(null); setPopAt(null);

    const fromVoice = viaVoice.current; viaVoice.current = false;
    const out = await tutor.ask({ question: q, selection: used, viewer: viewer.viewer.current, docName });

    /* Hỏi bằng giọng thì khả năng cao muốn NGHE đáp — sưởi sẵn câu đầu để bấm
       🔊 là ra tiếng liền. Chỉ khi hỏi bằng giọng, không tốn request TTS cho
       người chỉ gõ phím. */
    if (out?.res && fromVoice && voiceOk) voice.prefetch(out.res.answer);
  }, [sel, viewer, docName, tutor, voice, voiceOk]);

  /* ── mic: bấm–nói–bấm ────────────────────────────────────────────── */
  const finishRecording = useCallback(async () => {
    setMicState('processing');
    try {
      const wav = await voice.stop();
      if (!wav) { toast('Không nghe rõ — thử nói gần micro hơn'); return setMicState('idle'); }
      const text = (await voice.transcribe(wav)).trim();
      if (!text) { toast('Không nghe rõ — thử nói gần micro hơn'); return setMicState('idle'); }
      setMicState('idle');
      viaVoice.current = true;
      send(text);
    } catch (err) {
      console.error('[voice]', err);
      toast('Nhận diện giọng nói lỗi — thử lại hoặc gõ câu hỏi');
      setMicState('idle');
    }
  }, [voice, send, toast]);

  const onMic = useCallback(async () => {
    if (micState === 'recording') return finishRecording();
    if (micState !== 'idle') return;
    try {
      await voice.start();
      setMicState('recording');
    } catch (err) {
      console.error('[voice]', err);
      toast('Không có quyền micro — cấp quyền trong trình duyệt rồi thử lại');
    }
  }, [micState, voice, finishRecording, toast]);

  /* tự dừng ở 60s — tránh một lần ghi lỡ tay thành file khổng lồ */
  useEffect(() => {
    if (micState === 'recording' && voice.seconds >= 60) {
      toast('Đã ghi 60 giây — tự dừng và gửi');
      finishRecording();
    }
  }, [voice.seconds, micState, finishRecording, toast]);

  /* ── nạp file ────────────────────────────────────────────────────── */
  const loadFile = useCallback(async (f: File) => {
    viewer.load(new Uint8Array(await f.arrayBuffer()), f.name);
  }, [viewer]);

  useEffect(() => {
    const qs = new URLSearchParams(location.search).get('file');
    if (!qs) return;
    fetch(qs).then(r => r.arrayBuffer())
      .then(b => viewer.load(new Uint8Array(b), qs.split('/').pop() ?? 'slide.pdf'))
      .catch(e => toast('Không nạp được ?file= — ' + e.message));
  }, [viewer, toast]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest?.('[data-pop]')) setPopAt(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (viewer.total) viewer.fitWidth()?.then(() => viewer.setZoom(viewer.viewer.current!.fit));
    };
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, [viewer]);

  const zoom = (d: number) => {
    const v = viewer.viewer.current;
    if (!v) return;
    const next = v.scale + d;
    viewer.setZoom(next);
    setZoomPct(Math.round((next / v.fit) * 100) + '%');
  };

  const runScenario = async (key: string) => {
    const sc = SCEN[key];
    if (!sc || !viewer.total) return;
    const p = Math.min(sc.p, viewer.total);
    viewer.goTo(p);
    const s2: Selection = sc.s ? { text: viewer.pageText(p).slice(0, 220), page: p } : null;
    if (s2) setSel(s2);
    /* PHẢI chờ cuộn tới đúng trang trước khi gửi: page_text của trang hiện tại
       là nguồn sự thật, gửi sớm là tutor tóm tắt sai trang. */
    await viewer.settled();
    send(sc.q, s2);
  };

  const core = tutor.coreInfo;
  const coreLabel = !core ? 'console · đang dò nhân…'
    : core.core === 'real' ? `console · AI thật (${core.model})`
    : 'console · nhân mock (không có LLM)';
  const coreTitle = !core ? ''
    : core.core === 'real'
      ? `Quyết định trung tâm gọi ${core.model} qua proxy. Trích dẫn được kiểm nguyên văn bằng code.`
      : `Chưa nối được LLM (${core.error ?? 'không rõ'}). Văn phong câu trả lời là template dựng sẵn — lớp tra cứu và trích dẫn vẫn chạy thật.`;

  return (
    <div className={s.app}>
      <div className={s.bar}>
        {/* Nhãn nhân AI do initCore() ghi lại. KHÔNG hardcode: người dùng phải
            biết đang xem AI thật hay văn phong dựng sẵn (HAX G2). */}
        <div className={s.brand}>VLearn Slide Tutor <em title={coreTitle}>{coreLabel}</em></div>
        <button className={`${s.btn} ${s.sm}`} onClick={() => fileRef.current?.click()}>Mở PDF</button>
        <div className={s.pg}>
          <button className={`${s.btn} ${s.sm}`} disabled={!viewer.total} onClick={() => viewer.goTo(viewer.page - 1)}>◀</button>
          <input
            className={s.pgIn} disabled={!viewer.total}
            value={viewer.total ? viewer.page : '–'}
            onChange={e => viewer.goTo(parseInt(e.target.value) || 1)}
          />
          <span>/ {viewer.total || '–'}</span>
          <button className={`${s.btn} ${s.sm}`} disabled={!viewer.total} onClick={() => viewer.goTo(viewer.page + 1)}>▶</button>
        </div>
        <button className={`${s.btn} ${s.sm}`} disabled={!viewer.total} onClick={() => zoom(-0.2)}>−</button>
        <span className={s.zl}>{zoomPct}</span>
        <button className={`${s.btn} ${s.sm}`} disabled={!viewer.total} onClick={() => zoom(0.2)}>+</button>
        <div className={s.sp} />
        <button className={`${s.btn} ${s.sm}`} onClick={async () => {
          const { initTheme } = await import('@/lib/ui.mjs');
          initTheme().toggle();
        }}>◐</button>
        <button className={`${s.btn} ${s.sm}`} onClick={async () => {
          const log = tutor.getLog();
          if (!log.length) return toast('Chưa có lượt hỏi nào');
          const { downloadLog } = await import('@/lib/ui.mjs');
          downloadLog(log, { core: core?.core ?? 'mock', variant: 'console', document: docName });
          toast(`Đã xuất ${log.length} lượt`);
        }}>⬇ Log</button>
      </div>

      <div className={s.main}>
        <div
          className="pv-scroll"
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
          onDragLeave={e => e.currentTarget.classList.remove('drag')}
          onDrop={async e => {
            e.preventDefault(); e.currentTarget.classList.remove('drag');
            const f = e.dataTransfer.files[0];
            if (f?.type === 'application/pdf') loadFile(f);
            else toast('Cần một file PDF');
          }}
        >
          <div ref={viewer.containerRef} />
          {!viewer.total && (
            <div className={s.empty}>
              <h2>Chưa có tài liệu</h2>
              <p>Kéo-thả PDF vào đây hoặc bấm <b>Mở PDF</b>. Slide không nằm trong repo
                 theo quy định bảo mật data — nạp từ máy bạn lúc chạy.</p>
              <button className={`${s.btn} ${s.pri}`} onClick={() => fileRef.current?.click()}>Chọn file PDF</button>
            </div>
          )}
        </div>

        <div className={s.side}>
          <div className={s.sideHd}>
            <div style={{ flex: 1 }}>
              <div className={s.t}>Hỏi đáp theo slide</div>
              <div className={s.s}>{docName}</div>
            </div>
          </div>

          <div className={s.log} ref={logRef}>
            {viewer.total > 0 && (
              <>
                <div className={s.note}>
                  <b>Mình trả lời dựa trên tài liệu đang mở</b> ({viewer.total} trang), luôn kèm số trang
                  để bạn tự kiểm. Ngoài tài liệu mình nói rõ là ngoài, không trộn vào.
                </div>
                {/* Ba câu mở màn bấm được: vòng validation là 10 phút/người và phải
                    IM LẶNG quan sát — người thử ngồi trước ô trống là mất mấy phút đầu. */}
                <div className={s.starter}>
                  <span>Thử ngay:</span>
                  {STARTERS.map(q => (
                    <button key={q} className={s.fu} onClick={() => send(q, null)}>{q}</button>
                  ))}
                </div>
              </>
            )}

            {tutor.turns.map(t => (
              <TurnView
                key={t.id} turn={t} styles={s} viewer={viewer} tutor={tutor}
                voice={voice} voiceOk={voiceOk} docName={docName} toast={toast}
                onAsk={(q) => send(q, null)}
                onFill={(v) => { if (qRef.current) { qRef.current.value = v; qRef.current.focus(); } setQuestion(v); }}
              />
            ))}
          </div>

          <div className={s.comp}>
            <div className={`${s.sel} ${sel ? s.selOn : ''}`}>
              <span>Trang <b>{sel?.page ?? '–'}</b></span>
              <span className={s.selTx}>{sel ? `“${sel.text.slice(0, 80)}${sel.text.length > 80 ? '…' : ''}”` : ''}</span>
              <button className={`${s.btn} ${s.sm}`} onClick={() => setSel(null)}>✕</button>
            </div>
            <div className={s.row}>
              <textarea
                ref={qRef} className={s.q} rows={1} disabled={!viewer.total}
                placeholder="Hỏi về nội dung slide… (Enter để gửi)"
                defaultValue={question}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(130, t.scrollHeight) + 'px';
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <button
                className={`${s.btn} ${micState === 'recording' ? s.rec : ''}`}
                disabled={micDisabled} title={micTitle} onClick={onMic}
              >
                {micState === 'recording' ? `⏹ ${voice.seconds}s` : micState === 'processing' ? '…' : '🎙'}
              </button>
              <button className={`${s.btn} ${s.pri}`} disabled={!viewer.total} onClick={() => send()}>Gửi</button>
            </div>
            {viewer.total > 0 && (
              <div className={s.scen}>
                <span className={s.l}>kịch bản</span>
                {Object.keys(SCEN).map(k => (
                  <button key={k} className={s.fu} data-s={k} onClick={() => runScenario(k)}>
                    {{ happy: 'happy', clarify: 'mơ hồ ②', nog: 'không căn cứ ①', oos: 'ngoài phạm vi ③', domain: 'tiền đề sai ④' }[k]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {popAt && (
        <div className={`${s.pop} ${s.popOn}`} data-pop style={{ left: popAt.x, top: popAt.y }}>
          <button
            className={`${s.btn} ${s.sm} ${s.pri}`}
            onClick={() => {
              setPopAt(null);
              if (!sel) return;
              const v = `Giải thích đoạn bôi đen ở Trang ${sel.page}.`;
              if (qRef.current) { qRef.current.value = v; qRef.current.focus(); }
              setQuestion(v);
            }}
          >💬 Hỏi về đoạn này</button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="application/pdf" hidden
             onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
      <div className={`${s.toast} ${toastMsg ? s.toastOn : ''}`}>{toastMsg}</div>
    </div>
  );
}

/* Một lượt hỏi-đáp: bubble người dùng + (đang chờ | câu trả lời) */
function TurnView(props: {
  turn: Turn; styles: typeof s; viewer: ReturnType<typeof useViewer>;
  tutor: ReturnType<typeof useTutor>; voice: ReturnType<typeof useVoice>;
  voiceOk: boolean; docName: string;
  toast: (m: string, ms?: number) => void;
  onAsk: (q: string) => void; onFill: (v: string) => void;
}) {
  const { turn, styles: c } = props;
  return (
    <>
      <div className={`${c.msg} ${c.msgU}`}>
        {turn.selection && (
          <div className={c.att}>
            Trang {turn.selection.page} · <i>“{turn.selection.text.slice(0, 64)}{turn.selection.text.length > 64 ? '…' : ''}”</i>
          </div>
        )}
        <div className={c.bub}>{turn.question}</div>
      </div>
      <div className={`${c.msg} ${c.msgA}`}>
        {turn.error ? (
          <div className={c.bub}>Lỗi core: {turn.error}</div>
        ) : !turn.res ? (
          <div className={c.bub}>
            <span className={c.spin} />{' '}
            <span style={{ color: 'var(--dim)' }}>đang tìm căn cứ trong {props.viewer.total} trang…</span>
          </div>
        ) : (
          <Answer
            res={turn.res} req={turn.req} styles={c}
            viewer={props.viewer} tutor={props.tutor} voice={props.voice}
            voiceOk={props.voiceOk} docName={props.docName} toast={props.toast}
            onAsk={props.onAsk} onFill={props.onFill}
          />
        )}
      </div>
    </>
  );
}
