'use client';

import gsap from 'gsap';

const withMotion = (run: () => void) => {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', run);
  return () => mm.revert();
};

export const introSequence = (root: Element) => withMotion(() => {
  gsap.from(root.querySelectorAll('[data-motion="intro"]'), {
    opacity: 0, y: 14, duration: 0.42, stagger: 0.055, ease: 'power2.out',
  });
});

export const pageRendered = (node: Element | null) => node && withMotion(() => {
  gsap.fromTo(node, { opacity: 0.4 }, { opacity: 1, duration: 0.28, ease: 'power1.out' });
});

export const turnEnter = (node: Element | null) => node && withMotion(() => {
  gsap.from(node, { opacity: 0, y: 10, duration: 0.24, ease: 'power2.out' });
});

export const traceReveal = (node: Element | null) => node && withMotion(() => {
  gsap.from(node.querySelectorAll('li'), { opacity: 0, x: -6, stagger: 0.025, duration: 0.18 });
});

export const confidenceCountUp = (node: Element | null) => node && withMotion(() => {
  gsap.from(node, { opacity: 0.25, scale: 0.94, duration: 0.22, ease: 'power2.out' });
});

export const citeChipsIn = (root: Element | null) => root && withMotion(() => {
  gsap.from(root.children, { opacity: 0, y: 5, stagger: 0.035, duration: 0.2 });
});

export const highlightPulse = (node: Element | null) => node && withMotion(() => {
  gsap.fromTo(node, { scale: 0.985 }, { scale: 1, duration: 0.45, ease: 'power2.out' });
});

export const micLevel = (node: Element | null, level: number) => {
  if (!node || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.to(node, {
    scaleX: 1 + level * 0.12, scaleY: 1 + level * 0.12,
    duration: 0.12, ease: 'power1.out', overwrite: true,
  });
};

export const themeMorph = (toggle: () => void) => {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && doc.startViewTransition) {
    doc.startViewTransition(toggle);
  } else toggle();
};

export const pinSettle = (node: Element | null) => node && withMotion(() => {
  gsap.from(node, { opacity: 0, x: 18, rotate: 0.7, duration: 0.36, ease: 'back.out(1.6)' });
});

export const wireDraw = (path: SVGPathElement | null) => path && withMotion(() => {
  const length = path.getTotalLength();
  gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, {
    strokeDashoffset: 0, duration: 0.42, ease: 'power3.inOut',
  });
});
