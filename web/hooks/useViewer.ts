'use client';
/* ══════════════════════════════════════════════════════════════════════════
   useViewer — bọc createViewer() theo vòng đời React
   ══════════════════════════════════════════════════════════════════════════
   KHÔNG viết lại logic PDF. viewer.mjs đã ảo hoá cuộn, bôi đen, tô trích dẫn
   và đã được kiểm; việc ở đây chỉ là đối phó với vòng đời React.

   Hai cái bẫy phải chặn:

   1. StrictMode gọi effect HAI LẦN ở dev. Không chặn thì có 2 viewer cùng
      quan sát một container → 2 IntersectionObserver, 2 listener cuộn, trang
      render đè nhau. Lỗi này chỉ hiện ở dev nên rất dễ tưởng "chắc do máy".

   2. viewer.mjs đụng window/document ngay khi import (workerSrc). Trang phải
      là 'use client' VÀ nạp động với ssr:false — nếu không, `next build` sẽ
      chết ở bước prerender.
   ══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, useCallback } from 'react';

export type Selection = { text: string; page: number; rect?: DOMRect | null } | null;
export type PageInfo = { page: number; text: string };

export type ViewerApi = {
  load: (data: Uint8Array, name: string) => Promise<{ total: number; pages: PageInfo[] }>;
  goTo: (p: number, smooth?: boolean) => void;
  /* Chờ cuộn mượt tới đúng trang rồi mới resolve. BẮT BUỘC gọi trước khi gửi
     câu hỏi sau một lần goTo(): page_text của trang hiện tại là nguồn sự thật,
     cuộn qua mấy chục trang mất >260ms — gửi sớm là tutor tóm tắt sai trang. */
  settled: (ms?: number) => Promise<number>;
  highlight: (page: number, quote: string) => Promise<DOMRect | undefined>;
  setZoom: (z: number) => Promise<void>;
  fitWidth: () => Promise<void>;
  /* Toạ độ trang + đoạn đang tô — bản Bàn Slide dùng để neo ghim (giai đoạn C) */
  anchorOf: (page: number) => { page: DOMRect; hit: DOMRect | null } | null;
  pageText: (n: number) => string;
  thumb: (n: number, w?: number) => Promise<string>;
  destroy: () => void;
  readonly total: number;
  readonly page: number;
  readonly pages: PageInfo[];
  readonly scale: number;
  readonly fit: number;
};

export function useViewer(opts: {
  onReady?: (info: { total: number; pages: PageInfo[]; name: string }) => void;
  onSelection?: (sel: Selection) => void;
  onPageRendered?: (page: number) => void;
  gap?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<ViewerApi | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);

  /* Giữ callback trong ref: viewer chỉ được dựng MỘT lần, nhưng callback từ
     component thì đổi mỗi lần render. Đưa thẳng vào deps của effect là dựng
     lại viewer sau mỗi lần render. */
  const cb = useRef(opts);
  useEffect(() => { cb.current = opts; });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let instance: ViewerApi | null = null;

    (async () => {
      const { createViewer, injectViewerCSS } = await import('@/lib/viewer.mjs');
      if (disposed) return;
      injectViewerCSS();
      instance = createViewer({
        container,
        gap: cb.current.gap ?? 18,
        onPage: (p: number) => setPage(p),
        onReady: (info: { total: number; pages: PageInfo[]; name: string }) => {
          setTotal(info.total);
          setReady(true);
          cb.current.onReady?.(info);
        },
        onSelection: (s: Selection) => cb.current.onSelection?.(s),
        onPageRendered: (p: number) => cb.current.onPageRendered?.(p),
      }) as ViewerApi;
      viewerRef.current = instance;
    })();

    return () => {
      disposed = true;
      instance?.destroy();
      if (viewerRef.current === instance) viewerRef.current = null;
    };
  }, []);

  const load = useCallback(async (data: Uint8Array, name: string) => {
    /* Người dùng có thể thả file trước khi import động kịp xong */
    for (let i = 0; i < 60 && !viewerRef.current; i++) await new Promise(r => setTimeout(r, 50));
    return viewerRef.current?.load(data, name);
  }, []);

  return {
    containerRef,
    getApi: useCallback(() => viewerRef.current, []),
    page, total, ready,
    load,
    goTo:      useCallback((p: number, smooth = true) => viewerRef.current?.goTo(p, smooth), []),
    settled:   useCallback((ms?: number) => viewerRef.current?.settled(ms) ?? Promise.resolve(0), []),
    highlight: useCallback((p: number, q: string) => viewerRef.current?.highlight(p, q), []),
    setZoom:   useCallback((z: number) => viewerRef.current?.setZoom(z), []),
    fitWidth:  useCallback(() => viewerRef.current?.fitWidth(), []),
    anchorOf:  useCallback((p: number) => viewerRef.current?.anchorOf(p) ?? null, []),
    pageText:  useCallback((n: number) => viewerRef.current?.pageText(n) ?? '', []),
    thumb:     useCallback((n: number, w?: number) => viewerRef.current?.thumb(n, w), []),
  };
}

export type ViewerController = ReturnType<typeof useViewer>;
