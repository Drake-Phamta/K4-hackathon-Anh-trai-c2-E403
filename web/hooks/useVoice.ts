'use client';
/* ══════════════════════════════════════════════════════════════════════════
   useVoice — bọc createVoice() (bấm–nói–bấm qua proxy PTIT)
   ══════════════════════════════════════════════════════════════════════════
   voice.mjs không nghe liên tục: một lần ghi = một request. Lý do ghi trong
   chính file đó — auto-chunk 3,5s làm hàng đợi phình 9,4 lần thời gian thực.
   Hook này chỉ đổi callback thành React state, không đổi hành vi.

   probeHealth() chạy một lần lúc mount: dịch vụ chết thì UI tắt mic kèm
   tooltip nói vì sao (G2 — làm rõ hệ thống làm được đến đâu), chứ không để
   một nút bấm vào không có gì xảy ra.
   ══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, useCallback } from 'react';

export type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking';
export type ConversationHandlers = {
  onUtterance: (text: string) => void;
  onHearing?: (hearing: boolean) => void;
  onTranscribing?: (transcribing: boolean) => void;
  onError?: (stage: 'stt') => void;
};

type VoiceApi = {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  transcribe: (b: Blob) => Promise<string>;
  speak: (t: string) => Promise<void>;
  stopSpeaking: () => void;
  prefetch: (t: string) => void;
  startConversation: (handlers: ConversationHandlers) => Promise<void>;
  stopConversation: () => void;
  probeHealth: () => Promise<boolean>;
  destroy: () => void;
  readonly state: VoiceState;
  readonly recording: boolean;
  readonly speaking: boolean;
  readonly conversing: boolean;
};

export function useVoice() {
  const ref = useRef<VoiceApi | null>(null);
  const mountedRef = useRef(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [healthy, setHealthy] = useState<boolean | null>(null);   // null = chưa dò xong
  const [conversing, setConversing] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    let disposed = false;
    let instance: VoiceApi | null = null;

    (async () => {
      const { createVoice } = await import('@/lib/voice.mjs');
      if (disposed) return;
      instance = createVoice({
        onState: (s: VoiceState) => { if (!disposed) setState(s); },
        onTimer: (n: number) => { if (!disposed) setSeconds(n); },
        onLevel: (v: number) => { if (!disposed) setLevel(v); },
      }) as VoiceApi;
      ref.current = instance;
      instance.probeHealth().then(ok => { if (!disposed) setHealthy(ok); });
    })();

    return () => {
      disposed = true;
      mountedRef.current = false;
      instance?.destroy();
      if (ref.current === instance) ref.current = null;
    };
  }, []);

  const startConversation = useCallback(async (handlers: ConversationHandlers) => {
    const instance = ref.current;
    if (!instance) throw new Error('voice_not_ready');
    await instance.startConversation({
      onUtterance: handlers.onUtterance,
      onHearing: value => {
        if (!mountedRef.current) return;
        setHearing(value);
        handlers.onHearing?.(value);
      },
      onTranscribing: value => {
        if (!mountedRef.current) return;
        setTranscribing(value);
        handlers.onTranscribing?.(value);
      },
      onError: stage => {
        if (mountedRef.current) handlers.onError?.(stage);
      },
    });
    if (mountedRef.current) setConversing(true);
  }, []);

  const stopConversation = useCallback(() => {
    ref.current?.stopConversation();
    ref.current?.stopSpeaking();
    setConversing(false);
    setHearing(false);
    setTranscribing(false);
    setLevel(0);
  }, []);

  return {
    state, seconds, level, healthy, conversing, hearing, transcribing,
    recording: state === 'recording',
    speaking: state === 'speaking',
    start:      useCallback(() => ref.current?.startRecording() ?? Promise.resolve(), []),
    stop:       useCallback(() => ref.current?.stopRecording() ?? Promise.resolve(null), []),
    transcribe: useCallback((b: Blob) => ref.current?.transcribe(b) ?? Promise.resolve(''), []),
    speak:      useCallback((t: string) => ref.current?.speak(t) ?? Promise.resolve(), []),
    stopSpeaking: useCallback(() => ref.current?.stopSpeaking(), []),
    prefetch:   useCallback((t: string) => ref.current?.prefetch(t), []),
    startConversation,
    stopConversation,
  };
}

export type VoiceController = ReturnType<typeof useVoice>;
