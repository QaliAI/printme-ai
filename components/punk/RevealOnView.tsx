'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './punk.module.css';

export type RevealVariant = 'tear' | 'peel' | 'slap' | 'flip';

/**
 * Arms an off-screen element after hydration and reveals it once when it
 * scrolls into view. Server HTML is always fully visible (no-JS, crawlers,
 * reduced motion), and nothing is hidden that the visitor has already seen.
 */
export function RevealOnView({
  children,
  variant,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  variant: RevealVariant;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return;
    el.dataset.reveal = 'armed';
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.dataset.reveal = 'shown';
            observer.disconnect();
          }
        }
      },
      { threshold: 0.22 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref as never} className={`${styles.reveal} ${styles[`reveal_${variant}`]} ${className ?? ''}`}>
      {children}
    </Tag>
  );
}
