'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { interpolate, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { RebelBot } from './RebelBot';
import styles from './punk.module.css';

/**
 * Signature scroll story (MOTION_STORYBOARD.md, scene "The Wall"):
 *   01 SPRAY  the Rebel Bot sprays YOUR IDEAS. YOUR RULES. onto concrete
 *   02 DESIGN the mural resolves into a real Issue Nº 01 design
 *   03 TEAR   the design rips off the wall like a fly-poster
 *   04 WEAR   it lands on the real tee preview (InstantPreview engine)
 * One scroll-linked timeline (framer-motion useScroll) drives every beat, so
 * the story is a single continuous take. Only transform / opacity / clip-path
 * and two SVG attributes change per frame. Reduced motion gets the finished
 * composition with no pinning.
 */
/**
 * Scroll-linked mapping computed on the main thread. framer-motion v12 can
 * offload plain `useTransform(p, input, output)` to a native ScrollTimeline,
 * whose WAAPI animation reverts to the initial style outside the input range
 * (end states vanished). A function transform keeps every beat clamped.
 */
function useBeat<T extends number | string>(p: MotionValue<number>, input: number[], output: T[]) {
  const map = interpolate(input, output as never[], { clamp: true }) as (v: number) => T;
  return useTransform(p, (v) => map(v));
}

export function RebelWallSequence({
  teeSlot,
  art,
  product,
}: {
  teeSlot: ReactNode;
  art: { url: string; alt: string; title: string; href: string };
  product: { name: string; price: string; href: string };
}) {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const armRef = useRef<SVGGElement>(null);
  const mistRef = useRef<SVGGElement>(null);
  const { scrollYProgress: p } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  // how far the torn poster travels to land on the tee (layout differs by breakpoint)
  const [travel, setTravel] = useState('120%');
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const apply = () => setTravel(mq.matches ? '40%' : '120%');
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const sprayReveal = useBeat(p, [0.03, 0.36], [0, 1]);
  const artClip = useBeat(p, [0.38, 0.54], ['circle(0% at 30% 40%)', 'circle(85% at 30% 40%)']);
  const artRotate = useBeat(p, [0.58, 0.76], [0, -9]);
  const artY = useBeat(p, [0.58, 0.76, 0.86], ['0%', '-14%', '6%']);
  const artX = useBeat(p, [0.58, 0.86], ['0%', travel]);
  const artScale = useBeat(p, [0.58, 0.76, 0.86], [1, 1.06, 0.42]);
  const artOpacity = useBeat(p, [0.8, 0.88], [1, 0]);
  const tornOpacity = useBeat(p, [0.58, 0.62], [0, 1]);
  const muralOpacity = useBeat(p, [0.6, 0.82], [1, 0.35]);
  const teeOpacity = useBeat(p, [0.78, 0.88], [0, 1]);
  const teeScale = useBeat(p, [0.78, 0.9], [0.86, 1]);
  const cardY = useBeat(p, [0.88, 0.97], ['40%', '0%']);
  const cardOpacity = useBeat(p, [0.88, 0.95], [0, 1]);
  const progressWidth = useBeat(p, [0, 1], ['0%', '100%']);

  useMotionValueEvent(p, 'change', (v) => {
    const spraying = (v > 0.02 && v < 0.37) || (v > 0.38 && v < 0.55);
    const sweep = spraying ? Math.sin(v * 46) * 16 : 0;
    const raise = v < 0.56 ? -18 : v < 0.7 ? -18 + ((v - 0.56) / 0.14) * 40 : 22;
    armRef.current?.setAttribute('transform', `rotate(${(raise + sweep).toFixed(1)})`);
    if (mistRef.current) mistRef.current.style.opacity = spraying ? '1' : '0';
  });

  const stage = (
    <>
      <div className={styles.wallSurface} aria-hidden="true">
        <span className={styles.wallPosterScrap} style={{ left: '6%', top: '8%', rotate: '-4deg' }} />
        <span className={styles.wallPosterScrap} style={{ right: '4%', bottom: '12%', rotate: '6deg' }} />
        <span className={styles.wallTag}>NO BILLS</span>
      </div>

      <motion.svg className={styles.mural} viewBox="0 0 1000 520" aria-hidden="true" style={reduced ? undefined : { opacity: muralOpacity }}>
        <defs>
          <filter id="spray-rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="5" />
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          <mask id="spray-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="520">
            <motion.path
              d="M40 120 L960 90 L60 230 L950 210 L50 360 L960 340 L60 470 L960 460"
              fill="none"
              stroke="#fff"
              strokeWidth="170"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={reduced ? undefined : { pathLength: sprayReveal }}
            />
          </mask>
        </defs>
        <g mask="url(#spray-reveal)" filter="url(#spray-rough)" style={{ fontFamily: 'var(--font-poster), Impact, sans-serif' }}>
          <text x="500" y="230" textAnchor="middle" fontSize="210" fill="#111111" transform="translate(8 8)">
            YOUR IDEAS.
          </text>
          <text x="500" y="230" textAnchor="middle" fontSize="210" fill="#FF2B91">
            YOUR IDEAS.
          </text>
          <text x="500" y="450" textAnchor="middle" fontSize="210" fill="#111111" transform="translate(8 8)">
            YOUR RULES.
          </text>
          <text x="500" y="450" textAnchor="middle" fontSize="210" fill="#F8D829">
            YOUR RULES.
          </text>
          <path d="M210 238 v60 q0 12 7 0 v-58 M612 240 v38 q0 10 6 0 v-36 M318 458 v70 q0 12 7 0 v-68 M760 460 v44 q0 10 6 0 v-42" fill="#FF2B91" />
        </g>
      </motion.svg>

      <motion.figure
        className={styles.muralArt}
        style={reduced ? undefined : { clipPath: artClip, rotate: artRotate, x: artX, y: artY, scale: artScale, opacity: artOpacity }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- transparent art layer animated as a single element */}
        <img src={art.url} alt={art.alt} width={988} height={1200} loading="lazy" decoding="async" />
        <motion.span className={styles.tornEdge} style={reduced ? { opacity: 0 } : { opacity: tornOpacity }} aria-hidden="true" />
      </motion.figure>

      <div className={styles.botWrap}>
        <RebelBot armRef={armRef} mistRef={mistRef} armAngle={-18} idle spraying={false} />
      </div>

      <motion.div className={styles.teeStage} style={reduced ? undefined : { opacity: teeOpacity, scale: teeScale }}>
        {teeSlot}
      </motion.div>

      <motion.div className={styles.wallCard} style={reduced ? undefined : { y: cardY, opacity: cardOpacity }}>
        <p className={styles.microtype}>Issue Nº 01 · Original artwork</p>
        <h3>{art.title}</h3>
        <p>
          {product.name} · <strong>{product.price}</strong>
        </p>
        <div className={styles.wallCardActions}>
          <Link href={art.href} className={styles.btnInk}>
            Shop this design
          </Link>
          <a href="#make" className={styles.btnGhost}>
            Do it with my photo
          </a>
        </div>
      </motion.div>

      {!reduced && (
        <div className={styles.beatBar} aria-hidden="true">
          <motion.span className={styles.beatFill} style={{ width: progressWidth }} />
          <ol>
            <li>01 Spray</li>
            <li>02 Design</li>
            <li>03 Tear</li>
            <li>04 Wear</li>
          </ol>
        </div>
      )}
    </>
  );

  return (
    <section
      ref={sectionRef}
      className={`${styles.wallSequence} ${reduced ? styles.wallSequenceStatic : ''}`}
      aria-labelledby="wall-heading"
      data-testid="rebel-wall-sequence"
    >
      <h2 id="wall-heading" className={styles.srOnly}>
        Your ideas, your rules: from a sprayed wall to a printed tee
      </h2>
      <div className={styles.wallSticky}>{stage}</div>
    </section>
  );
}
