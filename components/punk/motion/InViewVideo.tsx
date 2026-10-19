'use client';

import { useEffect, useRef } from 'react';

/**
 * A muted loop that only downloads and plays while it is on screen, so the
 * homepage can carry several mascot clips without costing idle bandwidth/CPU.
 */
export function InViewVideo({ src, poster, className, label }: { src: string; poster: string; className?: string; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) video.src = src;
          if (!reduce) void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  return <video ref={ref} className={className} poster={poster} muted loop playsInline preload="none" aria-hidden={label ? undefined : true} aria-label={label} />;
}
