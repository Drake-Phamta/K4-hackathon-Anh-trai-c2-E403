/* ══════════════════════════════════════════════════════════════════════════
   VIEWER — pdf.js, cuộn liên tục, ảo hoá
   ══════════════════════════════════════════════════════════════════════════
   Dùng chung cho cả 3 bản giao diện. Mỗi bản chỉ khác CSS + bố cục, không
   bản nào tự dựng lại phần PDF (dựng 3 lần = 3 bộ bug).

   Ảo hoá: 44 trang × (canvas + text layer) là quá nhiều để giữ hết trong
   DOM. Mỗi trang có sẵn một khung giữ chỗ đúng kích thước; chỉ trang gần
   khung nhìn mới được render, ra xa thì thu hồi. Nhờ vậy thanh cuộn luôn
   đúng độ dài và không bị giật.
   ══════════════════════════════════════════════════════════════════════════ */

import * as pdfjsLib from './vendor/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.mjs';

const KEEP = 2;                     // số trang giữ render mỗi bên khung nhìn

export function createViewer({ container, onPage, onSelection, onReady, gap = 18 }){
  let doc = null, total = 0, scale = 1, fit = 1, current = 1;
  let pages = [];                   // [{page, text}]
  let slots = [];                   // phần tử .pv-page theo thứ tự trang
  const rendered = new Map();       // page -> {task}
  let io = null, raf = 0;

  container.classList.add('pv-root');

  /* ── nạp ───────────────────────────────────────────────────────────── */
  async function load(data, name){
    destroyLayers();
    doc = await pdfjsLib.getDocument({ data }).promise;
    total = doc.numPages;
    current = 1;

    // trích text mọi trang — nguyên liệu cho retrieval
    pages = [];
    for (let p = 1; p <= total; p++){
      const tc = await (await doc.getPage(p)).getTextContent();
      pages.push({ page: p, text: tc.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim() });
    }

    await fitWidth();
    buildSlots();
    observe();
    onReady?.({ total, pages, name });
    return { total, pages };
  }

  /* ── khung giữ chỗ cho mọi trang (giữ thanh cuộn đúng) ─────────────── */
  function buildSlots(){
    container.replaceChildren();
    slots = [];
    for (let p = 1; p <= total; p++){
      const d = document.createElement('div');
      d.className = 'pv-page';
      d.dataset.page = p;
      d.style.marginBottom = gap + 'px';
      const { w, h } = sizeOf(p);
      d.style.width = w + 'px';
      d.style.height = h + 'px';
      const n = document.createElement('div');
      n.className = 'pv-num';
      n.textContent = p;
      d.append(n);
      container.append(d);
      slots.push(d);
    }
  }

  const dims = new Map();
  function sizeOf(p){
    if (dims.has(p)) {
      const d = dims.get(p);
      return { w: Math.floor(d.w * scale), h: Math.floor(d.h * scale) };
    }
    return { w: Math.floor(600 * scale), h: Math.floor(340 * scale) };
  }

  async function measureAll(){
    for (let p = 1; p <= total; p++){
      const v = (await doc.getPage(p)).getViewport({ scale: 1 });
      dims.set(p, { w: v.width, h: v.height });
    }
  }

  /* ── render / thu hồi ──────────────────────────────────────────────── */
  async function renderPage(p){
    if (rendered.has(p) || !doc) return;
    const slot = slots[p - 1];
    if (!slot) return;
    rendered.set(p, {});

    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvas = document.createElement('canvas');
    canvas.className = 'pv-canvas';
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = Math.floor(viewport.width) + 'px';
    canvas.style.height = Math.floor(viewport.height) + 'px';

    slot.style.width = Math.floor(viewport.width) + 'px';
    slot.style.height = Math.floor(viewport.height) + 'px';
    slot.style.setProperty('--total-scale-factor', scale);

    const tl = document.createElement('div');
    tl.className = 'textLayer';
    tl.style.width = canvas.style.width;
    tl.style.height = canvas.style.height;

    slot.prepend(canvas);
    slot.append(tl);

    try{
      await page.render({
        canvasContext: canvas.getContext('2d', { alpha: false }),
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
      }).promise;
      await new pdfjsLib.TextLayer({
        textContentSource: await page.getTextContent(),
        container: tl, viewport,
      }).render();
      slot.classList.add('pv-ready');
    }catch(err){
      if (err?.name !== 'RenderingCancelledException') console.error('render trang', p, err);
    }
  }

  function unrender(p){
    if (!rendered.has(p)) return;
    rendered.delete(p);
    const slot = slots[p - 1];
    if (!slot) return;
    slot.querySelector('.pv-canvas')?.remove();
    slot.querySelector('.textLayer')?.remove();
    slot.classList.remove('pv-ready');
  }

  /* ── theo dõi khung nhìn ───────────────────────────────────────────── */
  function observe(){
    io?.disconnect();
    io = new IntersectionObserver(entries => {
      for (const e of entries){
        const p = +e.target.dataset.page;
        if (e.isIntersecting) renderPage(p);
      }
      sweep();
    }, { root: container.closest('.pv-scroll') ?? null, rootMargin: '150% 0px' });
    slots.forEach(s => io.observe(s));
    (container.closest('.pv-scroll') ?? container).addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function onScroll(){
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const host = container.closest('.pv-scroll') ?? container;
      const mid = host.getBoundingClientRect().top + host.clientHeight * 0.35;
      let best = current, bestD = Infinity;
      for (const s of slots){
        const r = s.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight * 2) continue;
        const d = Math.abs(r.top - mid);
        if (d < bestD){ bestD = d; best = +s.dataset.page; }
      }
      if (best !== current){ current = best; onPage?.(current); }
    });
  }

  function sweep(){
    for (const p of [...rendered.keys()]){
      if (Math.abs(p - current) > KEEP + 2) unrender(p);
    }
  }

  /* ── điều hướng ────────────────────────────────────────────────────── */
  function goTo(p, smooth = true){
    p = Math.min(Math.max(1, p | 0), total);
    const slot = slots[p - 1];
    if (!slot) return;
    renderPage(p);
    slot.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    current = p; onPage?.(p);
  }

  async function fitWidth(){
    if (!doc) return;
    if (!dims.size) await measureAll();
    const host = container.closest('.pv-scroll') ?? container;
    const avail = host.clientWidth - 48;
    const w = dims.get(1)?.w ?? 600;
    fit = Math.max(0.4, Math.min(3, avail / w));
    scale = fit;
  }

  async function setZoom(z){
    scale = Math.max(0.4, Math.min(3, z));
    const keep = current;
    [...rendered.keys()].forEach(unrender);
    for (let p = 1; p <= total; p++){
      const { w, h } = sizeOf(p);
      slots[p - 1].style.width = w + 'px';
      slots[p - 1].style.height = h + 'px';
    }
    goTo(keep, false);
    renderPage(keep);
  }

  /* ── bôi đen ───────────────────────────────────────────────────────── */
  container.addEventListener('mouseup', () => setTimeout(() => {
    const sel = window.getSelection();
    const text = sel && !sel.isCollapsed ? sel.toString().replace(/\s+/g, ' ').trim() : '';
    if (text.length < 2){ onSelection?.(null); return; }
    const node = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
    const slot = node?.closest?.('.pv-page');
    const page = slot ? +slot.dataset.page : current;
    let rect = null;
    try{ rect = sel.getRangeAt(0).getBoundingClientRect(); }catch{}
    onSelection?.({ text, page, rect });
  }, 10));

  /* ── tô đoạn được trích ────────────────────────────────────────────── */
  const deacc = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
  async function highlight(page, quote){
    goTo(page, true);
    await renderPage(page);
    for (let i = 0; i < 24; i++){
      if (slots[page - 1]?.classList.contains('pv-ready')) break;
      await new Promise(r => setTimeout(r, 90));
    }
    container.querySelectorAll('.textLayer span.pv-hit').forEach(s => s.classList.remove('pv-hit'));
    const spans = [...(slots[page - 1]?.querySelectorAll('.textLayer span') ?? [])];
    const words = deacc(quote).split(/[^a-z0-9]+/).filter(w => w.length > 2).slice(0, 4);
    if (!words.length || !spans.length) return;
    let start = spans.findIndex(s => deacc(s.textContent).includes(words[0]));
    if (start < 0) start = spans.findIndex(s => words.some(w => deacc(s.textContent).includes(w)));
    if (start < 0) return;
    let acc = 0;
    for (let i = start; i < spans.length && acc < quote.length; i++){
      spans[i].classList.add('pv-hit');
      acc += spans[i].textContent.length + 1;
    }
    spans[start].scrollIntoView({ block: 'center', behavior: 'smooth' });
    return spans[start].getBoundingClientRect();
  }

  /* toạ độ tương đối của một trang — bản wildcard dùng để neo ghi chú */
  function anchorOf(page){
    const slot = slots[page - 1];
    if (!slot) return null;
    const r = slot.getBoundingClientRect();
    const hit = slot.querySelector('.textLayer span.pv-hit');
    const h = hit?.getBoundingClientRect();
    return { page: r, hit: h ?? null };
  }

  function destroyLayers(){
    io?.disconnect();
    rendered.clear();
    container.replaceChildren();
  }

  return {
    load, goTo, highlight, setZoom, fitWidth, anchorOf,
    get total(){ return total; },
    get page(){ return current; },
    get pages(){ return pages; },
    get scale(){ return scale; },
    get fit(){ return fit; },
    pageText: n => pages.find(p => p.page === n)?.text ?? '',
    thumb: async (n, w = 120) => {
      const page = await doc.getPage(n);
      const v0 = page.getViewport({ scale: 1 });
      const v = page.getViewport({ scale: w / v0.width });
      const c = document.createElement('canvas');
      c.width = v.width; c.height = v.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
      return c.toDataURL('image/jpeg', 0.7);
    },
  };
}

/* CSS bắt buộc cho text layer — chèn một lần, dùng chung cho mọi bản.
   Thiếu khối này thì KHÔNG bôi đen được. Nguồn: pdfjs-dist 5.7.284. */
export function injectViewerCSS(){
  if (document.getElementById('pv-css')) return;
  const s = document.createElement('style');
  s.id = 'pv-css';
  s.textContent = `
.pv-root{display:flex;flex-direction:column;align-items:center}
.pv-page{position:relative;flex:0 0 auto;background:var(--pv-paper,#fff);
  border-radius:var(--pv-radius,4px);overflow:hidden;
  box-shadow:var(--pv-shadow,0 2px 14px rgba(0,0,0,.28));
  --scale-round-x:1px;--scale-round-y:1px;transition:box-shadow .2s}
.pv-canvas{display:block}
.pv-num{position:absolute;right:8px;bottom:6px;z-index:5;font:500 10px/1 ui-monospace,monospace;
  color:var(--pv-num,#8a94a6);background:var(--pv-numbg,rgba(255,255,255,.82));
  padding:3px 6px;border-radius:20px;pointer-events:none}
.textLayer{position:absolute;text-align:initial;inset:0;overflow:clip;opacity:1;line-height:1;
  -webkit-text-size-adjust:none;text-size-adjust:none;forced-color-adjust:none;
  transform-origin:0 0;caret-color:CanvasText;z-index:2;
  --min-font-size:1;
  --text-scale-factor:calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv:calc(1 / var(--min-font-size))}
.textLayer :is(span,br){color:transparent;position:absolute;white-space:pre;cursor:text;
  transform-origin:0% 0%}
.textLayer > :not(.markedContent),.textLayer .markedContent span:not(.markedContent){
  z-index:1;--font-height:0;--scale-x:1;--rotate:0deg;
  font-size:calc(var(--text-scale-factor) * var(--font-height));
  transform:rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv))}
.textLayer .markedContent{display:contents}
.textLayer .endOfContent{display:block;position:absolute;inset:100% 0 0;z-index:-1;
  cursor:default;user-select:none}
.textLayer ::selection{background:var(--pv-sel,rgba(79,140,255,.4))}
.textLayer span.pv-hit{background:var(--pv-hit,rgba(232,163,61,.45));border-radius:2px;
  animation:pvPulse 1.5s ease-out}
@keyframes pvPulse{0%,18%{background:var(--pv-hit-strong,rgba(232,163,61,.85))}
  100%{background:var(--pv-hit,rgba(232,163,61,.45))}}
@media (prefers-reduced-motion:reduce){
  .textLayer span.pv-hit{animation:none}
  .pv-page{transition:none}}
`;
  document.head.append(s);
}
