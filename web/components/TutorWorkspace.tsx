'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Answer } from './Answer';
import answerStyles from '@/app/console/console.module.css';
import s from './workspace.module.css';
import { useTutor, type Turn } from '@/hooks/useTutor';
import { useViewer, type Selection } from '@/hooks/useViewer';
import { useVoice } from '@/hooks/useVoice';
import { introSequence, micLevel, pinSettle, themeMorph, turnEnter, wireDraw } from '@/lib/motion';

type Variant = 'doc' | 'wild';
const STARTERS = ['Tóm tắt trang mình đang xem', 'Tài liệu này gồm những phần nào?', 'LangGraph có hỗ trợ streaming không?'];

export function TutorWorkspace({ variant }: { variant: Variant }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const micRef = useRef<HTMLButtonElement>(null);
  const [docName, setDocName] = useState('chưa nạp tài liệu');
  const [selection, setSelection] = useState<Selection>(null);
  const [question, setQuestion] = useState('');
  const [toast, setToast] = useState('');
  const [recording, setRecording] = useState(false);
  const tutor = useTutor();
  const voice = useVoice();
  const {
    containerRef, getApi, page, total, ready, load, goTo, settled,
    highlight, setZoom, fitWidth, anchorOf, pageText, thumb,
  } = useViewer({
    gap: variant === 'doc' ? 24 : 28,
    onReady: ({ total: count, pages, name }) => {
      tutor.setDocIndex(pages);
      setDocName(`${name} · ${count} trang`);
      setToast(`Đã mở ${count} trang`);
    },
    onSelection: setSelection,
    onPageRendered: p => {
      rootRef.current?.querySelector(`[data-page="${p}"]`)?.setAttribute('data-rendered', 'true');
    },
  });
  const viewer = useMemo(() => ({
    getApi, page, total, ready, load, goTo, settled, highlight,
    setZoom, fitWidth, anchorOf, pageText, thumb,
  }), [getApi, page, total, ready, load, goTo, settled, highlight, setZoom, fitWidth, anchorOf, pageText, thumb]);

  useEffect(() => {
    if (!rootRef.current) return;
    return introSequence(rootRef.current);
  }, []);
  useEffect(() => { micLevel(micRef.current, voice.level); }, [voice.level]);
  useEffect(() => {
    const last = rootRef.current?.querySelector('[data-turn]:last-of-type');
    const cleanup = last ? turnEnter(last) : undefined;
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [tutor.turns]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2300);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadFile = useCallback(async (file: File) => {
    await load(new Uint8Array(await file.arrayBuffer()), file.name);
  }, [load]);

  const send = useCallback(async (text?: string, override?: Selection) => {
    const q = (text ?? question).trim();
    const api = getApi();
    if (!q || !api || !total) return;
    setQuestion('');
    setSelection(null);
    await tutor.ask({ question: q, selection: override === undefined ? selection : override, viewer: api, docName });
  }, [question, getApi, total, tutor, selection, docName]);

  const onMic = async () => {
    if (recording) {
      setRecording(false);
      const wav = await voice.stop();
      if (!wav) return setToast('Không nghe rõ — thử lại');
      try { await send((await voice.transcribe(wav)).trim(), null); }
      catch { setToast('Nhận diện giọng nói lỗi'); }
      return;
    }
    try { await voice.start(); setRecording(true); }
    catch { setToast('Không có quyền micro'); }
  };

  const changeTheme = async () => {
    const { initTheme } = await import('@/lib/ui.mjs');
    themeMorph(() => initTheme(`vlearn-theme-${variant}`).toggle());
  };

  const props = {
    viewer, tutor, voice, voiceOk: voice.healthy === true, docName,
    toast: (m: string) => setToast(m),
    onAsk: (q: string) => void send(q, null),
    onFill: (v: string) => { setQuestion(v); inputRef.current?.focus(); },
    traceOpen: false,
  };

  return (
    <div ref={rootRef} className={`${s.workspace} ${s[variant]}`} data-variant={variant}>
      <header className={s.top} data-motion="intro">
        <Link href="/" className={s.back} aria-label="Về trang chọn bản">←</Link>
        <div className={s.identity}>
          <strong>{variant === 'doc' ? 'Đọc' : 'Bàn Slide'}</strong>
          <span>{tutor.coreInfo?.core === 'real' ? `AI thật · ${tutor.coreInfo.model}` : 'nhân mock · minh bạch'}</span>
          <small>{docName}</small>
        </div>
        <button onClick={() => fileRef.current?.click()}>Mở PDF</button>
        <div className={s.nav}>
          <button disabled={!total} onClick={() => goTo(page - 1)}>←</button>
          <span>{total ? `${page} / ${total}` : '– / –'}</span>
          <button disabled={!total} onClick={() => goTo(page + 1)}>→</button>
        </div>
        <button disabled={!total} onClick={() => {
          const api = getApi(); if (api) void setZoom(api.scale - .16);
        }}>−</button>
        <button disabled={!total} onClick={() => {
          const api = getApi(); if (api) void setZoom(api.scale + .16);
        }}>+</button>
        <span className={s.flex} />
        <button onClick={changeTheme}>Đổi nền</button>
      </header>

      <main className={s.stage}>
        {variant === 'wild' && <FilmStrip total={total} page={page} goTo={goTo} thumb={thumb} />}
        <section className={`pv-scroll ${s.paper}`} data-testid={`${variant}-viewer`}>
          <div ref={containerRef} />
          {!total && (
            <div className={s.empty} data-motion="intro">
              <span>{variant === 'doc' ? 'Một phòng đọc yên để hỏi đúng chỗ.' : 'Đặt câu trả lời ngay cạnh đoạn làm căn cứ.'}</span>
              <h1>Mở slide để bắt đầu</h1>
              <p>PDF ở lại trên máy. Tutor chỉ dùng chữ trích xuất từ tài liệu đang mở.</p>
              <button className={s.primary} onClick={() => fileRef.current?.click()}>Chọn file PDF</button>
            </div>
          )}
        </section>

        {variant === 'doc' ? (
          <aside className={s.thread} data-motion="intro">
            <Thread turns={tutor.turns} props={props} />
          </aside>
        ) : (
          <WildPins turns={tutor.turns} props={props} rootRef={rootRef} />
        )}
      </main>

      <section className={s.composer} data-motion="intro">
        {selection && <div className={s.selection}>Trang {selection.page} · “{selection.text.slice(0, 84)}…”</div>}
        {total > 0 && !tutor.turns.length && (
          <div className={s.starters}>{STARTERS.map(q => <button key={q} onClick={() => void send(q, null)}>{q}</button>)}</div>
        )}
        <div className={s.ask}>
          <textarea ref={inputRef} value={question} disabled={!total} rows={1}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder={variant === 'doc' ? 'Hỏi về trang đang đọc…' : 'Bôi đen một đoạn rồi đặt câu hỏi…'} />
          <button ref={micRef} disabled={!total || voice.healthy !== true} onClick={onMic}
            title={voice.healthy ? 'Bấm–nói–bấm' : 'Dịch vụ giọng nói không kết nối được'}>
            {recording ? `Dừng ${voice.seconds}s` : 'Nói'}
          </button>
          <button className={s.primary} disabled={!total || !question.trim()} onClick={() => void send()}>Gửi</button>
        </div>
      </section>
      <input ref={fileRef} hidden type="file" accept="application/pdf"
        onChange={e => { const file = e.target.files?.[0]; if (file) void loadFile(file); }} />
      <div className={`${s.toast} ${toast ? s.show : ''}`}>{toast}</div>
    </div>
  );
}

type SharedProps = {
  viewer: ReturnType<typeof useViewer> extends infer T ? Omit<T & object, 'containerRef'> : never;
  tutor: ReturnType<typeof useTutor>;
  voice: ReturnType<typeof useVoice>;
  voiceOk: boolean; docName: string; toast: (m: string) => void;
  onAsk: (q: string) => void; onFill: (v: string) => void;
  traceOpen?: boolean;
};

function Thread({ turns, props }: { turns: Turn[]; props: SharedProps }) {
  return (
    <div className={s.threadInner}>
      <div className={s.threadHead}><span>Hỏi đáp theo trang</span><small>{props.docName}</small></div>
      {!turns.length && <p className={s.quiet}>Bôi đen một đoạn hoặc hỏi về trang đang xem. Cơ chế được gói lại; nguồn vẫn luôn hiện.</p>}
      {turns.map(turn => <TurnCard key={turn.id} turn={turn} props={props} />)}
    </div>
  );
}

function TurnCard({ turn, props }: { turn: Turn; props: SharedProps }) {
  return (
    <article className={answerStyles.msg} data-turn>
      <div className={`${answerStyles.bub} ${s.userQuestion}`}>{turn.question}</div>
      {!turn.res ? <div className={answerStyles.bub}>{turn.error ?? 'Đang đối chiếu với tài liệu…'}</div> : (
        <Answer res={turn.res} req={turn.req} styles={answerStyles} {...props} />
      )}
    </article>
  );
}

function WildPins({ turns, props, rootRef }: {
  turns: Turn[]; props: SharedProps; rootRef: React.RefObject<HTMLDivElement | null>;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<Array<{ id: string; d: string }>>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visible = useMemo(() => turns.filter(t => t.res && !hidden.has(t.id)), [turns, hidden]);

  useEffect(() => {
    const root = rootRef.current;
    const box = boxRef.current;
    if (!root || !box) return;
    const draw = () => {
      const rr = root.getBoundingClientRect();
      setPaths(visible.map(t => {
        const page = t.res?.citations?.[0]?.page ?? 1;
        const anchor = props.viewer.anchorOf(page);
        const pin = box.querySelector(`[data-pin="${t.id}"]`)?.getBoundingClientRect();
        if (!anchor || !pin) return { id: t.id, d: '' };
        const from = anchor.hit ?? anchor.page;
        const x1 = from.right - rr.left, y1 = from.top + from.height / 2 - rr.top;
        const x2 = pin.left - rr.left, y2 = pin.top + 28 - rr.top;
        const mid = (x1 + x2) / 2;
        return { id: t.id, d: `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}` };
      }));
    };
    const timer = setTimeout(draw, 120);
    const scroller = root.querySelector('.pv-scroll');
    addEventListener('resize', draw);
    scroller?.addEventListener('scroll', draw, { passive: true });
    return () => {
      clearTimeout(timer);
      removeEventListener('resize', draw);
      scroller?.removeEventListener('scroll', draw);
    };
  }, [visible, props.viewer, rootRef]);

  return (
    <>
      <svg className={s.wires} aria-hidden>{paths.map(p => <path key={p.id} d={p.d}
        ref={node => { if (node && p.d) wireDraw(node); }} />)}</svg>
      <aside ref={boxRef} className={s.pins} data-testid="wild-pins">
        <div className={s.pinHead}><span>{visible.length} ghim</span>
          <button onClick={() => setHidden(new Set(turns.map(t => t.id)))}>Dọn bàn</button></div>
        {visible.map(turn => (
          <article key={turn.id} data-pin={turn.id} className={s.pin}
            ref={node => { if (node) pinSettle(node); }}>
            <button className={s.pinClose} onClick={() => setHidden(new Set([...hidden, turn.id]))}>×</button>
            <TurnCard turn={turn} props={props} />
          </article>
        ))}
      </aside>
    </>
  );
}

function FilmStrip({ total, page, goTo, thumb }: {
  total: number; page: number; goTo: (p: number) => void;
  thumb: (p: number, w?: number) => Promise<string> | undefined;
}) {
  return <nav className={s.film} aria-label="Trang slide">{Array.from({ length: total }, (_, i) => i + 1).map(p => (
    <button key={p} className={p === page ? s.current : ''} onClick={() => goTo(p)}
      onMouseEnter={async e => {
        if (e.currentTarget.querySelector('img')) return;
        const src = await thumb(p, 100);
        if (src) {
          const img = document.createElement('img'); img.src = src; img.alt = '';
          e.currentTarget.prepend(img);
        }
      }}><span>{p}</span></button>
  ))}</nav>;
}
