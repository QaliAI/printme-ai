/**
 * Shared PrintMe collage primitives: seeded torn paper, tape, ink splatter
 * and halftone. Used by the logo builder and the merch artwork builder so the
 * brand and the products share one hand-made vocabulary.
 */
export const palette = {
  ink: '#111111',
  newsprint: '#F3F0E9',
  paper: '#FBF9F4',
  photocopy: '#CFCBC3',
  gray: '#92908B',
  pink: '#FF2B91',
  yellow: '#F8D829',
  orange: '#FF6038',
};

/* ------------------------------------------------------------------ */
/* Deterministic randomness                                            */
/* ------------------------------------------------------------------ */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const r2 = (n) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Torn paper scrap                                                    */
/* ------------------------------------------------------------------ */
export function tornRect(w, h, seed, { rough = 2.4, step = 9, tears = 1 } = {}) {
  const rand = rng(seed);
  const pts = [];
  const edge = (x0, y0, x1, y1, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.round(len / step));
    // one deliberate "bite" per torn edge, positioned by seed
    const bite = rand() < tears * 0.55 ? Math.floor(rand() * (n - 2)) + 1 : -1;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      let off = (rand() - 0.5) * rough * 2;
      if (i === bite) off -= rough * (2.2 + rand() * 1.6);
      pts.push([x0 + (x1 - x0) * t + nx * off, y0 + (y1 - y0) * t + ny * off]);
    }
  };
  edge(0, 0, w, 0, 0, -1);
  edge(w, 0, w, h, 1, 0);
  edge(w, h, 0, h, 0, 1);
  edge(0, h, 0, 0, -1, 0);
  return 'M' + pts.map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L') + 'Z';
}

/* Tape strip with zig-zag torn ends */
export function tape(w, h, seed) {
  const rand = rng(seed);
  const teeth = 5;
  const top = [];
  const bottom = [];
  for (let i = 0; i <= teeth; i++) {
    const y = (h / teeth) * i;
    top.push([(i % 2 ? 3 : 0) + rand() * 2, y]);
    bottom.push([w - (i % 2 ? 0 : 3) - rand() * 2, h - y]);
  }
  return 'M' + [...top, ...bottom].map(([x, y]) => `${r2(x)} ${r2(y)}`).join('L') + 'Z';
}

/* Ink splatter blob, smoothed through midpoints */
export function blob(cx, cy, r, seed, spikes = 0.35) {
  const rand = rng(seed);
  const n = 18;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - spikes / 2 + rand() * spikes) * (rand() < 0.18 ? 1.35 : 1);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    if (i === 0) {
      const last = pts[n - 1];
      d += `M${r2((last[0] + p[0]) / 2)} ${r2((last[1] + p[1]) / 2)}`;
    }
    d += `Q${r2(p[0])} ${r2(p[1])} ${r2(m[0])} ${r2(m[1])}`;
  }
  return d + 'Z';
}

export function splatter(cx, cy, r, seed, { drip = 0 } = {}) {
  const rand = rng(seed + 7);
  const parts = [blob(cx, cy, r, seed)];
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const dist = r * (1.2 + rand() * 1.4);
    parts.push(blob(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, r * (0.06 + rand() * 0.14), seed + i * 13, 0.2));
  }
  if (drip) {
    const x = cx - r * 0.1;
    const w = r * 0.16;
    parts.push(
      `M${r2(x)} ${r2(cy)}L${r2(x + w)} ${r2(cy)}L${r2(x + w * 0.8)} ${r2(cy + drip)}` +
        `Q${r2(x + w / 2)} ${r2(cy + drip + w * 1.4)} ${r2(x + w * 0.2)} ${r2(cy + drip)}Z`,
      blob(x + w / 2, cy + drip + w * 0.6, w * 0.9, seed + 99, 0.15),
    );
  }
  return parts.join('');
}

/* Halftone patch: dot radius falls off from the center of a blob */
export function halftone(cx, cy, w, h, seed, { pitch = 9, max = 3.6 } = {}) {
  const rand = rng(seed);
  const dots = [];
  for (let y = -h / 2; y <= h / 2; y += pitch) {
    for (let x = -w / 2; x <= w / 2; x += pitch) {
      const off = (Math.round(y / pitch) % 2) * (pitch / 2);
      const px = x + off;
      const d = Math.hypot(px / (w / 2), y / (h / 2));
      const rr = max * (1 - d) * (0.75 + rand() * 0.5);
      if (rr > 0.7) dots.push(`M${r2(cx + px - rr)} ${r2(cy + y)}a${r2(rr)} ${r2(rr)} 0 1 0 ${r2(rr * 2)} 0a${r2(rr)} ${r2(rr)} 0 1 0 ${r2(-rr * 2)} 0`);
    }
  }
  return dots.join('');
}

