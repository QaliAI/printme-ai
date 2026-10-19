'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../home-motion.module.css';
import { useMediaQuery } from './useMediaQuery';

/**
 * Background hero loop. Picks the portrait cut on phones, never autoplays for
 * people who prefer reduced motion, and has a visible pause control (WCAG 2.2.2).
 */
export function HeroVideo({ wide, portrait, poster, portraitPoster }: { wide: string; portrait: string; poster: string; portraitPoster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const isPortrait = useMediaQuery('(max-width: 700px)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [hydrated, setHydrated] = useState(false);
  const src = hydrated ? (isPortrait ? portrait : wide) : null;

  useEffect(() => {
    // The source depends on the viewport, so it is only chosen in the browser.
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src || reduced) return;
    video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [src, reduced]);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) void video.play().then(() => setPlaying(true));
    else {
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      <video
        ref={ref}
        className={styles.heroVideo}
        src={src ?? undefined}
        poster={isPortrait ? portraitPoster : poster}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        data-testid="hero-video"
      />
      <button type="button" className={styles.videoToggle} onClick={toggle} aria-pressed={!playing} aria-label={playing ? 'Pause background video' : 'Play background video'}>
        {playing ? '❚❚' : '▶'}
      </button>
    </>
  );
}
