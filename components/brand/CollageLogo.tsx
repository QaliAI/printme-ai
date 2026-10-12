import layers from '@/lib/brand/logo-layers.json';
import styles from './CollageLogo.module.css';

type Layout = (typeof layers)['stacked'];
type Piece = Layout['pieces'][number];

const paperFill: Record<string, string> = {
  paper: layers.palette.paper,
  newsprint: layers.palette.newsprint,
  photocopy: layers.palette.photocopy,
  yellow: layers.palette.yellow,
  pink: layers.palette.pink,
  ink: layers.palette.ink,
};

/**
 * Inline, animatable version of the reconstructed PrintMe.ai collage logo.
 * Geometry comes from scripts/brand/build-logo.mjs (same source as the
 * production SVG files). Each letter scrap "slaps" onto the page with CSS
 * only, so it costs no client JavaScript and is static under reduced motion.
 */
export function CollageLogo({
  variant = 'stacked',
  animate = true,
  className,
  title = 'PrintMe.ai',
}: {
  variant?: 'stacked' | 'horizontal';
  animate?: boolean;
  className?: string;
  title?: string;
}) {
  const layout: Layout = layers[variant];
  return (
    <svg
      className={`${styles.logo} ${animate ? styles.animated : ''} ${className ?? ''}`}
      viewBox={layout.viewBox}
      role="img"
      aria-label={title}
    >
      <g className={styles.splatter} fill={layers.palette.ink}>
        <path d={layout.deco.splat} />
        <path d={layout.deco.splat2} />
      </g>
      {layout.pieces.map((piece: Piece, index: number) => (
        <g
          key={piece.id}
          transform={`translate(${piece.x} ${piece.y}) rotate(${piece.rot} ${piece.w / 2} ${piece.h / 2})`}
        >
          <g className={styles.piece} style={{ ['--i' as string]: index, ['--spin' as string]: `${index % 2 ? 14 : -11}deg` }}>
            {piece.scrap && <path d={piece.scrap} fill={paperFill[piece.paper ?? 'paper']} />}
            <g transform={`rotate(${piece.glyphRot} ${piece.w / 2} ${piece.h / 2})`}>
              <path d={piece.glyph} fill={piece.invert ? layers.palette.newsprint : layers.palette.ink} />
            </g>
            {piece.tape && (
              <path
                d={piece.tape.d}
                transform={`translate(${piece.tape.x} ${piece.tape.y}) rotate(${piece.tape.rot})`}
                fill={layers.palette.newsprint}
                fillOpacity={0.8}
                stroke={layers.palette.gray}
                strokeOpacity={0.4}
              />
            )}
          </g>
        </g>
      ))}
    </svg>
  );
}
