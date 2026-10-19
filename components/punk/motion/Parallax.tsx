'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Drifts its child vertically by up to `distance` px as it crosses the viewport. */
export function Parallax({ children, distance = 80, rotate = 0, className }: { children: ReactNode; distance?: number; rotate?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const centre = rect.top + rect.height / 2 - window.innerHeight / 2;
      const ratio = Math.max(-1, Math.min(1, centre / window.innerHeight));
      element.style.transform = `translate3d(0, ${(ratio * distance).toFixed(1)}px, 0) rotate(${(ratio * rotate).toFixed(2)}deg)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [distance, rotate]);
  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
