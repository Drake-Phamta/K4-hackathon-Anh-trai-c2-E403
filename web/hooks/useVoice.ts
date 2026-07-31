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

type VoiceApi = {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  transcribe: (b: Blob) => Promise<string>;
  speak: (t: string) => Promise<void>;
  stopSpeaking: () => void;
  prefetch: (t: string) => void;
  probeHealth: () => Promise<boolean>;
  readonly state: VoiceState;
  readonly recording: boolean;
  readonly speaking: boolean;
};

export function useVoice() {
  const ref = useRef<VoiceApi | null>(null);
  const built = useRef(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [healthy, setHealthy] = useState<boolean | null>(null);   // null = chưa dò xong

  useEffect(() => {
    if (built.current) return;
    built.current = true;
    let disposed = false;

    (async () => {
      const { createVoice } = await import('@/lib/voice.mjs');
      if (disposed) return;
      ref.current = createVoice({
        onState: (s: VoiceState) => setState(s),
        onTimer: (n: number) => setSeconds(n),
        onLevel: (v: number) => setLevel(v),
      }) as VoiceApi;
      ref.current.probeHealth().then(ok => { if (!disposed) setHealthy(ok); });
    })();

    return () => {
      disposed = true;
      ref.current?.stopSpeaking();
    };
  }, []);

  return {
    state, seconds, level, healthy,
    recording: state === 'recording',
    speaking: state === 'speaking',
    start:      useCallback(() => ref.current?.startRecording() ?? Promise.resolve(), []),
    stop:       useCallback(() => ref.current?.stopRecording() ?? Promise.resolve(null), []),
    transcribe: useCallback((b: Blob) => ref.current?.transcribe(b) ?? Promise.resolve(''), []),
    speak:      useCallback((t: string) => ref.current?.speak(t) ?? Promise.resolve(), []),
    stopSpeaking: useCallback(() => ref.current?.stopSpeaking(), []),
    prefetch:   useCallback((t: string) => ref.current?.prefetch(t), []),
  };
}
