import type { Ref } from 'react';
import styles from './RebelBot.module.css';

/**
 * The PrintMe Rebel Bot — campaign character, never the logo.
 *
 * A DIY graffiti robot assembled from shop junk: a dented paint-tin head
 * with a camera-lens eye and a taped-over eye, a riot-yellow milk-crate
 * torso, flex-conduit arms, spring legs and skate high-tops. The pink
 * bandana and spray can are its signature. Built as layered SVG so scenes
 * can pose the head and spray arm (pivot transforms) without new artwork.
 *
 * Poses: pass static angles, or pass refs and drive the `transform`
 * attribute from a scroll timeline (see RebelWallSequence).
 */
export interface RebelBotProps {
  className?: string;
  /** Spray arm rotation in degrees around the shoulder. Negative = raise. */
  armAngle?: number;
  /** Free arm rotation in degrees around the shoulder. */
  freeArmAngle?: number;
  headTilt?: number;
  spraying?: boolean;
  idle?: boolean;
  armRef?: Ref<SVGGElement>;
  headRef?: Ref<SVGGElement>;
  mistRef?: Ref<SVGGElement>;
  title?: string;
}

const ink = '#111111';
const news = '#F3F0E9';
const metal = '#CFCBC3';
const pink = '#FF2B91';
const yellow = '#F8D829';

export function RebelBot({
  className,
  armAngle = 0,
  freeArmAngle = 0,
  headTilt = 0,
  spraying = false,
  idle = true,
  armRef,
  headRef,
  mistRef,
  title = 'The PrintMe Rebel Bot, a junk-built graffiti robot holding a spray can',
}: RebelBotProps) {
  const spring = (x: number, x2: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      const x0 = x + (x2 - x) * t + (i % 2 ? 15 : -15) * (i === 0 || i === 9 ? 0 : 1);
      pts.push(`${x0.toFixed(1)} ${(390 + t * 96).toFixed(1)}`);
    }
    return `M${pts.join('L')}`;
  };

  return (
    <svg className={`${styles.bot} ${idle ? styles.idle : ''} ${className ?? ''}`} viewBox="0 0 420 560" role="img" aria-label={title}>
      <ellipse cx="200" cy="540" rx="128" ry="12" fill={ink} opacity=".18" />
      <g className={styles.body}>
        {/* spring legs */}
        <g fill="none" stroke={ink} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round">
          <path d={spring(172, 164)} />
          <path d={spring(228, 238)} />
        </g>
        {/* skate high-tops */}
        <g stroke={ink} strokeWidth="5" strokeLinejoin="round">
          <path d="M126 486 q10 -18 44 -14 q30 4 36 26 v14 h-86 q-6 -14 6 -26z" fill={ink} />
          <rect x="114" y="506" width="98" height="13" rx="6" fill={news} />
          <path d="M150 482 l14 10 M160 478 l14 10" stroke={pink} strokeWidth="4" />
          <path d="M208 486 q10 -18 44 -14 q30 4 36 26 v14 h-86 q-6 -14 6 -26z" fill={ink} />
          <rect x="196" y="506" width="98" height="13" rx="6" fill={news} />
          <path d="M232 482 l14 10 M242 478 l14 10" stroke={pink} strokeWidth="4" />
        </g>

        {/* free arm (viewer left) */}
        <g transform="translate(120 278)">
          <g transform={`rotate(${freeArmAngle})`}>
            <path d="M0 0 Q-44 30 -40 92" fill="none" stroke={ink} strokeWidth="24" strokeLinecap="round" />
            <path d="M0 0 Q-44 30 -40 92" fill="none" stroke={metal} strokeWidth="13" strokeLinecap="round" strokeDasharray="6 5" />
            <circle cx="-40" cy="98" r="15" fill={ink} />
            <path d="M-50 104 l-8 12 M-38 110 l-2 14 M-28 104 l6 12" stroke={ink} strokeWidth="6" strokeLinecap="round" />
          </g>
        </g>

        {/* milk-crate torso */}
        <g stroke={ink} strokeWidth="6" strokeLinejoin="round">
          <rect x="118" y="258" width="164" height="136" rx="12" fill={yellow} />
          <g fill={ink} stroke="none">
            <rect x="138" y="280" width="34" height="14" rx="7" />
            <rect x="183" y="280" width="34" height="14" rx="7" />
            <rect x="228" y="280" width="34" height="14" rx="7" />
            <rect x="138" y="362" width="34" height="14" rx="7" />
            <rect x="228" y="362" width="34" height="14" rx="7" />
          </g>
          <circle cx="200" cy="333" r="25" fill={pink} strokeWidth="5" />
          <text x="200" y="343" textAnchor="middle" fontFamily="var(--font-poster), Impact, sans-serif" fontSize="27" fill={ink} stroke="none">
            PM
          </text>
          <rect x="236" y="320" width="56" height="18" fill={news} strokeWidth="3" transform="rotate(-32 264 329)" />
          <rect x="242" y="336" width="48" height="16" fill={news} strokeWidth="3" transform="rotate(28 266 344)" />
        </g>

        {/* neck */}
        <g stroke={ink} strokeWidth="5">
          <rect x="184" y="226" width="32" height="36" fill={metal} />
          <path d="M184 238 h32 M184 250 h32" />
        </g>

        {/* paint-tin head */}
        <g ref={headRef} transform={`rotate(${headTilt} 200 240)`}>
          <path d="M214 102 Q222 62 252 54 Q284 46 272 26" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
          <rect x="262" y="12" width="30" height="16" fill={pink} stroke={ink} strokeWidth="3" transform="rotate(14 277 20)" />
          <g stroke={ink} strokeWidth="6" strokeLinejoin="round">
            <rect x="136" y="112" width="128" height="122" fill={metal} />
            <ellipse cx="200" cy="234" rx="64" ry="12" fill={metal} />
            <ellipse cx="200" cy="112" rx="64" ry="15" fill="#9C998F" />
            <ellipse cx="200" cy="110" rx="50" ry="9" fill={pink} strokeWidth="4" />
          </g>
          <path d="M150 118 v30 q0 10 7 0 v-26 M244 120 v18 q0 8 6 0 v-16 M178 120 v12 q0 7 5 0 v-10" fill={pink} stroke={ink} strokeWidth="3" />
          <path d="M248 196 q8 10 2 22" fill="none" stroke={ink} strokeWidth="3" />
          <rect x="136" y="150" width="128" height="40" fill={news} stroke={ink} strokeWidth="4" />
          {/* camera-lens eye */}
          <circle cx="172" cy="170" r="21" fill={ink} />
          <circle cx="172" cy="170" r="13" fill={pink} stroke={news} strokeWidth="3" />
          <circle cx="177" cy="165" r="4" fill={news} />
          {/* taped-over eye */}
          <g fill={news} stroke={ink} strokeWidth="3">
            <rect x="208" y="163" width="44" height="13" transform="rotate(35 230 170)" />
            <rect x="208" y="163" width="44" height="13" transform="rotate(-35 230 170)" />
          </g>
          {/* bandana */}
          <path d="M132 196 L268 196 L264 226 Q200 254 136 226 Z" fill={pink} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
          <g fill={ink}>
            <circle cx="160" cy="210" r="3" />
            <circle cx="182" cy="222" r="3" />
            <circle cx="206" cy="210" r="3" />
            <circle cx="230" cy="222" r="3" />
            <circle cx="248" cy="208" r="3" />
          </g>
          <path d="M264 204 l30 -12 l-6 20 z M264 214 l28 14 l-18 6 z" fill={pink} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
        </g>

        {/* spray arm (viewer right), pivot at the shoulder */}
        <g transform="translate(282 278)">
          <g ref={armRef} transform={`rotate(${armAngle})`}>
            <path d="M0 0 Q46 -10 62 -62" fill="none" stroke={ink} strokeWidth="24" strokeLinecap="round" />
            <path d="M0 0 Q46 -10 62 -62" fill="none" stroke={metal} strokeWidth="13" strokeLinecap="round" strokeDasharray="6 5" />
            <g stroke={ink} strokeWidth="5" strokeLinejoin="round">
              <rect x="46" y="-150" width="34" height="74" rx="8" fill={pink} />
              <rect x="46" y="-128" width="34" height="24" fill={ink} />
              <rect x="52" y="-166" width="22" height="18" rx="3" fill={news} strokeWidth="4" />
              <rect x="72" y="-162" width="12" height="9" fill={ink} />
            </g>
            <circle cx="62" cy="-66" r="15" fill={ink} />
            <g ref={mistRef} className={styles.mist} style={{ opacity: spraying ? 1 : 0 }}>
              <circle cx="100" cy="-158" r="10" fill={pink} opacity=".75" />
              <circle cx="124" cy="-150" r="15" fill={pink} opacity=".5" />
              <circle cx="152" cy="-162" r="20" fill={pink} opacity=".32" />
              <circle cx="186" cy="-150" r="26" fill={pink} opacity=".18" />
              <circle cx="116" cy="-172" r="5" fill={pink} />
              <circle cx="140" cy="-134" r="4" fill={pink} />
              <circle cx="170" cy="-184" r="6" fill={pink} opacity=".6" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
