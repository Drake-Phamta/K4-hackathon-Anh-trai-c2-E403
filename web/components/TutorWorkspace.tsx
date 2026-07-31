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

export function TutorWorkspace({
  variant,
  voiceProbe = false,
}: {
  variant: Variant;
  voiceProbe?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const micRef = useRef<HTMLButtonElement>(null);
  const [docName, setDocName] = useState('chưa nạp tài liệu');
  const [selection, setSelection] = useState<Selection>(null);
  const [question, setQuestion] = useState('');
  const [toast, setToast] = useState('');
  const [recording, setRecording] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const holdingMicRef = useRef(false);
  const recordingMicRef = useRef(false);
  const finishingMicRef = useRef(false);
  const [voiceThinking, setVoiceThinking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [conversationError, setConversationError] = useState('');
  const conversationActiveRef = useRef(false);
  const conversationBusyRef = useRef(false);
  const conversationPendingRef = useRef<string | null>(null);
  const conversationGenerationRef = useRef(0);
  const tutor = useTutor();
  const voice = useVoice();
  const {
    speak: speakVoice,
    startConversation: startVoiceConversation,
    stopConversation: stopVoiceConversation,
  } = voice;
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

  const send = useCallback(async (
    text?: string,
    override?: Selection,
    source: 'text' | 'voice' = 'text',
  ) => {
    const q = (text ?? question).trim();
    const api = getApi();
    if (!q || !api || !total) return null;
    setQuestion('');
    setSelection(null);
    return tutor.ask({
      question: q,
      selection: override === undefined ? selection : override,
      viewer: api,
      docName,
      source,
    });
  }, [question, getApi, total, tutor, selection, docName]);
  const sendRef = useRef(send);
  useEffect(() => { sendRef.current = send; }, [send]);

  const onConversationUtterance = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text || !conversationActiveRef.current) return;
    if (conversationBusyRef.current) {
      conversationPendingRef.current = text;
      return;
    }
    const generation = conversationGenerationRef.current;
    const run = async (first: string) => {
      let current: string | null = first;
      conversationBusyRef.current = true;
      while (current && conversationActiveRef.current
        && generation === conversationGenerationRef.current) {
        setLastTranscript(current);
        setConversationError('');
        setVoiceThinking(true);
        const result = await sendRef.current(current, undefined, 'voice');
        setVoiceThinking(false);
        if (!conversationActiveRef.current
          || generation !== conversationGenerationRef.current) break;
        if (result?.res?.answer) {
          try {
            await speakVoice(result.res.answer);
          } catch {
            setConversationError('TTS lỗi — hội thoại vẫn tiếp tục nghe');
          }
        }
        current = conversationPendingRef.current;
        conversationPendingRef.current = null;
      }
      if (generation === conversationGenerationRef.current) {
        conversationBusyRef.current = false;
      }
    };
    void run(text);
  }, [speakVoice]);

  const stopConversation = useCallback(() => {
    conversationGenerationRef.current++;
    conversationActiveRef.current = false;
    conversationBusyRef.current = false;
    conversationPendingRef.current = null;
    setVoiceThinking(false);
    stopVoiceConversation();
  }, [stopVoiceConversation]);

  const toggleConversation = useCallback(async () => {
    if (voice.conversing) {
      stopConversation();
      return;
    }
    if (!total || voice.healthy !== true) return;
    conversationGenerationRef.current++;
    conversationActiveRef.current = true;
    conversationPendingRef.current = null;
    setConversationError('');
    try {
      await startVoiceConversation({
        onUtterance: onConversationUtterance,
        onError: () => setConversationError('STT lỗi — hội thoại vẫn tiếp tục nghe'),
      });
    } catch {
      conversationActiveRef.current = false;
      setConversationError('Không mở được micro — kiểm tra quyền trình duyệt');
    }
  }, [
    voice.conversing, voice.healthy, startVoiceConversation,
    stopConversation, total, onConversationUtterance,
  ]);

  useEffect(() => () => {
    conversationGenerationRef.current++;
    conversationActiveRef.current = false;
    conversationPendingRef.current = null;
  }, []);

  const finishPushToTalk = useCallback(async () => {
    holdingMicRef.current = false;
    if (!recordingMicRef.current || finishingMicRef.current) return;
    recordingMicRef.current = false;
    finishingMicRef.current = true;
    setRecording(false);
    setMicBusy(true);
    try {
      const wav = await voice.stop();
      if (!wav) return setToast('Không nghe rõ — thử lại');
      const text = (await voice.transcribe(wav)).trim();
      if (!text) return setToast('Không nghe rõ — thử lại');
      await send(text, null, 'voice');
    } catch {
      setToast('Nhận diện giọng nói lỗi');
    } finally {
      finishingMicRef.current = false;
      setMicBusy(false);
    }
  }, [send, voice]);

  const beginPushToTalk = useCallback(async () => {
    if (
      holdingMicRef.current
      || finishingMicRef.current
      || !total
      || voice.healthy !== true
      || voice.conversing
    ) return;
    holdingMicRef.current = true;
    try {
      await voice.start();
      recordingMicRef.current = true;
      setRecording(true);
      if (!holdingMicRef.current) await finishPushToTalk();
    } catch {
      holdingMicRef.current = false;
      recordingMicRef.current = false;
      setRecording(false);
      setToast('Không có quyền micro');
    }
  }, [finishPushToTalk, total, voice]);

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
  const lastVoiceTurn = useMemo(
    () => [...tutor.turns].reverse().find(turn => turn.source === 'voice'),
    [tutor.turns],
  );
  const conversationPhase: ConversationPhase = !voice.conversing ? 'off'
    : voice.hearing ? 'hearing'
      : voice.transcribing ? 'transcribing'
        : voiceThinking ? 'thinking'
          : voice.speaking ? 'speaking'
            : 'listening';

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
        {variant === 'wild' && voiceProbe && (
          <VoiceProbe
            phase={conversationPhase}
            level={voice.level}
            transcript={lastTranscript}
            turn={lastVoiceTurn}
            error={conversationError}
            healthy={voice.healthy}
            ready={total > 0}
            onToggle={() => void toggleConversation()}
            onCitation={(citation) => highlight(citation.page, citation.quote)}
          />
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
          <button
            ref={micRef}
            className={`${s.pushToTalk} ${recording ? s.listening : ''}`}
            data-testid="push-to-talk"
            disabled={!total || voice.healthy !== true || voice.conversing || micBusy}
            aria-label={recording ? 'Đang nghe, thả để gửi' : 'Nhấn giữ để nói'}
            aria-pressed={recording}
            title={voice.healthy ? 'Nhấn giữ để nói · thả để gửi' : 'Dịch vụ giọng nói không kết nối được'}
            onPointerDown={e => {
              if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              void beginPushToTalk();
            }}
            onPointerUp={e => {
              e.preventDefault();
              void finishPushToTalk();
            }}
            onPointerCancel={() => void finishPushToTalk()}
            onKeyDown={e => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                e.preventDefault();
                void beginPushToTalk();
              }
            }}
            onKeyUp={e => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                void finishPushToTalk();
              }
            }}
          >
            {recording
              ? `Đang nghe ${voice.seconds}s · thả để gửi`
              : micBusy ? 'Đang nhận giọng…' : 'Giữ để nói'}
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

type ConversationPhase =
  | 'off'
  | 'listening'
  | 'hearing'
  | 'transcribing'
  | 'thinking'
  | 'speaking';

const PHASE_LABEL: Record<ConversationPhase, string> = {
  off: 'Đã tắt',
  listening: 'Đang nghe',
  hearing: 'Đang nghe bạn nói',
  transcribing: 'Đang nhận dạng',
  thinking: 'Đang đối chiếu với slide',
  speaking: 'Đang trả lời',
};

function VoiceProbe({
  phase,
  level,
  transcript,
  turn,
  error,
  healthy,
  ready,
  onToggle,
  onCitation,
}: {
  phase: ConversationPhase;
  level: number;
  transcript: string;
  turn?: Turn;
  error: string;
  healthy: boolean | null;
  ready: boolean;
  onToggle: () => void;
  onCitation: (citation: NonNullable<Turn['res']>['citations'][number]) => void;
}) {
  const active = phase !== 'off';
  const disabled = !active && (!ready || healthy !== true);
  const healthLabel = healthy === null ? 'đang dò voice'
    : healthy ? 'voice online' : 'voice offline';
  return (
    <aside className={s.voiceProbe} data-testid="voice-probe" data-phase={phase}>
      <header className={s.probeHead}>
        <div>
          <small>realtime voice probe · {healthLabel}</small>
          <strong data-testid="conversation-phase" role="status" aria-live="polite">
            {PHASE_LABEL[phase]}
          </strong>
        </div>
        <button
          data-testid="conversation-toggle"
          className={active ? s.probeStop : s.primary}
          disabled={disabled}
          onClick={onToggle}
        >
          {active ? 'Tắt hội thoại' : 'Bật hội thoại'}
        </button>
      </header>

      <label className={s.level}>
        <span>RMS micro</span>
        <progress data-testid="voice-level" max={1} value={level} />
      </label>

      <div className={s.probeBody}>
        <span>Transcript gần nhất</span>
        <p data-testid="voice-transcript">
          {transcript || (active ? 'Nói tự nhiên, ngừng khoảng một giây để gửi.' : 'Chưa có câu nói.')}
        </p>
      </div>

      {turn?.res && (
        <div className={s.probeResult}>
          <span data-testid="probe-decision">{turn.res.decision} · {Math.round(turn.res.confidence * 100)}%</span>
          {turn.res.citations?.[0] && (
            <button
              data-testid="probe-citation"
              onClick={() => onCitation(turn.res!.citations[0])}
            >
              Trang {turn.res.citations[0].ref}
            </button>
          )}
        </div>
      )}

      {error && <p className={s.probeError} role="alert">{error}</p>}
      <small className={s.probeHint}>Nói chen khi máy đang đọc để kiểm barge-in. Ô nhập bên dưới vẫn dùng được.</small>
    </aside>
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
