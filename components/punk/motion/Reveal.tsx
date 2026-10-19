'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import styles from '../home-motion.module.css';

/**
 * Slaps children into place as they enter the viewport (sticker-style drop
 * with a little rotation). Pure CSS transition on transform/opacity; content is
 * visible without JavaScript and for reduced-motion users.
 */
export function Reveal({ children, delay = 0, tilt = 0, className, as: Tag = 'div' }: { children: ReactNode; delay?: number; tilt?: number; className?: string; as?: 'div' | 'li' }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return; // already on screen: never hide it
    element.dataset.reveal = 'pending';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.reveal = 'shown';
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const style = { ['--reveal-delay' as string]: `${delay}ms`, ['--reveal-tilt' as string]: `${tilt}deg` } as CSSProperties;
  return (
    <Tag ref={ref as never} className={`${styles.reveal} ${className ?? ''}`} style={style}>
      {children}
    </Tag>
  );
}
