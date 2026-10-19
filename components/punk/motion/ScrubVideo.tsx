'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from '../home-motion.module.css';
import { useMediaQuery } from './useMediaQuery';

/**
 * Scroll-scrubbed clip with natural scrolling: no sticky positioning and no
 * scroll hijacking. As the section travels through the viewport its progress
 * (0 → 1) drives the video's currentTime, and steps reveal at their thresholds.
 * The clip is encoded all-intra (every frame a keyframe) so seeking is smooth.
 */
export function ScrubVideo({ src, poster, endFrame, steps, children }: { src: string; poster: string; endFrame: string; steps: string[]; children?: ReactNode }) {
  const section = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    if (reduced) return;
    const element = section.current;
    const clip = video.current;
    if (!element || !clip) return;
    let frame = 0;
    let active = false;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      // 0 when the section's top reaches the bottom of the screen, 1 when its bottom leaves the top third.
      const value = Math.min(1, Math.max(0, (viewport - rect.top) / (rect.height + viewport * 0.35)));
      setProgress(value);
      if (clip.duration) clip.currentTime = value * (clip.duration - 0.05);
    };
    const onScroll = () => {
      if (active && !frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) {
        if (!clip.src) {
          clip.src = src;
          clip.load();
        }
        onScroll();
      }
    }, { rootMargin: '300px 0px' });
    observer.observe(element);
    window.addEventListener('scroll', onScroll, { passive: true });
    clip.addEventListener('loadedmetadata', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      clip.removeEventListener('loadedmetadata', update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [src, reduced]);

  return (
    <div ref={section} className={styles.scrub} data-testid="spray-scrub" style={{ ['--progress' as string]: progress }}>
      <div className={styles.scrubFrame}>
        {reduced ? (
          // eslint-disable-next-line @next/next/no-img-element -- static end frame for reduced motion
          <img src={endFrame} alt="" className={styles.scrubMedia} />
        ) : (
          <video ref={video} className={styles.scrubMedia} poster={poster} muted playsInline preload="none" aria-hidden="true" />
        )}
        <div className={styles.scrubMeter} aria-hidden="true">
          <span style={{ transform: `scaleX(${reduced ? 1 : progress})` }} />
        </div>
      </div>
      <ol className={styles.scrubSteps}>
        {steps.map((step, index) => {
          const shown = reduced || progress >= (index + 0.4) / (steps.length + 0.6);
          return (
            <li key={step} data-shown={shown}>
              <span>0{index + 1}</span>
              {step}
            </li>
          );
        })}
      </ol>
      {children}
    </div>
  );
}
