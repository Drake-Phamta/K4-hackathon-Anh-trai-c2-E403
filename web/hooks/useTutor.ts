'use client';
/* ══════════════════════════════════════════════════════════════════════════
   useTutor — quản lý hội thoại + gọi seam AI
   ══════════════════════════════════════════════════════════════════════════
   core.mjs giữ nguyên, không sửa một dòng. Hook chỉ giữ danh sách lượt hỏi
   và trạng thái "đang chờ" cho React.

   Nhãn nhân AI lấy từ GIÁ TRỊ TRẢ VỀ của initCore(), không đọc biến AI_CORE:
   giá trị trả về là ảnh chụp tại thời điểm dò, rõ ràng qua mọi bundler, và
   nguyên tắc trong core.mjs là KHÔNG BAO GIỜ vờ là nhân thật — nhãn sai còn
   tệ hơn không có nhãn.
   ══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Selection, ViewerApi } from './useViewer';

export type Citation = { kind: string; ref: string; page: number; quote: string };
export type TraceStep = { step: string; detail: string; ms: number };
export type FollowUp = { label: string; kind?: 'question' | 'action'; action?: string; hint?: string };

export type AskResponse = {
  decision: 'answer' | 'clarify' | 'no_grounding' | 'out_of_scope' | 'outside_document';
  answer: string;
  confidence: number;
  citations: Citation[];
  clarifying_question?: string;
  refusal_reason?: string;
  outside_note?: string;
  follow_ups?: FollowUp[];
  trace: TraceStep[];
  latency_ms?: number;
  core_used?: string;
  degraded_reason?: string;
};

export type Turn = {
  id: string;
  question: string;
  selection: Selection;
  req: unknown;
  res: AskResponse | null;      // null = đang chờ
  error?: string;
};

type CoreInfo = { core: 'mock' | 'real'; model: string | null; error: string | null } | null;
type AskRequest = Record<string, unknown>;
type BuildRequestArgs = {
  question: string;
  selection: Selection;
  viewer: ViewerApi;
  docName: string;
  history: Array<{ role: 'user'; content: string }>;
};
type UiModule = { buildRequest: (args: BuildRequestArgs) => AskRequest };
type CoreModule = {
  initCore: () => Promise<NonNullable<CoreInfo>>;
  setDocIndex: (pages: { page: number; text: string }[]) => void;
  getLog: () => Array<{ request: { question: string } }>;
  askTutor: (req: AskRequest) => Promise<AskResponse>;
  askOutside: (req: unknown) => Promise<AskResponse>;
  buildHandoff: (req: unknown, res: AskResponse) => string;
  attachFeedback: (rating: 'up' | 'down', why: string) => void;
};

let seq = 0;
const nextId = () => `t${++seq}`;

export function useTutor() {
  const mod = useRef<CoreModule | null>(null);
  const [coreInfo, setCoreInfo] = useState<CoreInfo>(null);
  const [turns, setTurns] = useState<Turn[]>([]);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const core = await import('@/lib/core.mjs') as CoreModule;
      if (disposed) return;
      mod.current = core;
      const info = await core.initCore();
      if (!disposed) setCoreInfo(info);
    })();
    return () => { disposed = true; mod.current = null; };
  }, []);

  const setDocIndex = useCallback((pages: { page: number; text: string }[]) => {
    mod.current?.setDocIndex(pages);
  }, []);

  const patch = (id: string, up: Partial<Turn>) =>
    setTurns(ts => ts.map(t => (t.id === id ? { ...t, ...up } : t)));

  /** Gửi một câu hỏi. Trả về id lượt để caller theo dõi nếu cần. */
  const ask = useCallback(async (args: {
    question: string;
    selection: Selection;
    viewer: ViewerApi;
    docName: string;
  }) => {
    const { buildRequest } = await import('@/lib/ui.mjs') as unknown as UiModule;
    const core = mod.current;
    if (!core) return null;

    const req = buildRequest({
      question: args.question,
      selection: args.selection,
      viewer: args.viewer,
      docName: args.docName,
      history: core.getLog().slice(-4).map(l => ({ role: 'user', content: l.request.question })),
    });

    const id = nextId();
    setTurns(ts => [...ts, { id, question: args.question, selection: args.selection, req, res: null }]);
    try {
      const res: AskResponse = await core.askTutor(req);
      patch(id, { res });
      return { id, req, res };
    } catch (e: unknown) {
      patch(id, { error: e instanceof Error ? e.message : 'lỗi không rõ' });
      return null;
    }
  }, []);

  /** Đường lui ①: chỉ chạy khi NGƯỜI DÙNG bấm chip — AI không tự bước ra
      ngoài tài liệu. Đây là mức automation Conditional viết bằng code. */
  const askOutside = useCallback(async (req: unknown) => {
    const core = mod.current;
    if (!core) return null;
    const id = nextId();
    setTurns(ts => [...ts, { id, question: '(trả lời ngoài tài liệu)', selection: null, req, res: null }]);
    try {
      const res: AskResponse = await core.askOutside(req);
      patch(id, { res });
      return { id, res };
    } catch (e: unknown) {
      patch(id, { error: e instanceof Error ? e.message : 'lỗi không rõ' });
      return null;
    }
  }, []);

  /** Đường lui ②: dựng tin nhắn đủ ngữ cảnh cho TA. MOCK có nhãn. */
  const buildHandoff = useCallback((req: unknown, res: AskResponse) =>
    mod.current?.buildHandoff(req, res) ?? '', []);

  const attachFeedback = useCallback((rating: 'up' | 'down', why: string) =>
    mod.current?.attachFeedback(rating, why), []);

  const getLog = useCallback(() => mod.current?.getLog() ?? [], []);
  const clear = useCallback(() => setTurns([]), []);

  return { coreInfo, turns, ask, askOutside, buildHandoff, attachFeedback, getLog, setDocIndex, clear };
}

export type TutorController = ReturnType<typeof useTutor>;
