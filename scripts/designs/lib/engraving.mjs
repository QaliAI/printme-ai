// Turns an ink-on-paper illustration into a print-ready transparent layer.
//
// - Paper is detected from the border and keyed out only OUTSIDE the subject:
//   the silhouette is closed and flood-filled from the edges, so white fur or
//   bellies stay opaque white on coloured garments.
// - Thin strokes outside the silhouette (whiskers) survive through an ink alpha.
// - The result is upscaled with a contrast curve that keeps line art crisp.
import sharp from 'sharp';

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Median paper colour along the border: { l, r, g, b }. */
function borderPaper(data, width, height) {
  const channels = [[], [], [], []];
  const push = (x, y) => {
    const i = (y * width + x) * 3;
    channels[0].push(lum(data[i], data[i + 1], data[i + 2]));
    for (let c = 0; c < 3; c++) channels[c + 1].push(data[i + c]);
  };
  for (let x = 0; x < width; x += 2) { push(x, 2); push(x, height - 3); }
  for (let y = 0; y < height; y += 2) { push(2, y); push(width - 3, y); }
  const [l, r, g, b] = channels.map((s) => s.sort((a, z) => a - z)[Math.floor(s.length / 2)]);
  return { l, r, g, b };
}

function dilate(mask, width, height, radius) {
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let k = -radius; k <= radius && !on; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < width && mask[y * width + xx]) on = 1;
      }
      tmp[y * width + x] = on;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let on = 0;
      for (let k = -radius; k <= radius && !on; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < height && tmp[yy * width + x]) on = 1;
      }
      out[y * width + x] = on;
    }
  }
  return out;
}

const erode = (mask, width, height, radius) => {
  const inverted = mask.map((v) => (v ? 0 : 1));
  return dilate(inverted, width, height, radius).map((v) => (v ? 0 : 1));
};

function outsideRegion(blocked, width, height) {
  const outside = new Uint8Array(blocked.length);
  const stack = [];
  const seed = (x, y) => {
    const i = y * width + x;
    if (!blocked[i] && !outside[i]) { outside[i] = 1; stack.push(i); }
  };
  for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
  for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }
  return outside;
}

/** Keeps connected regions at least `minShare` of the largest one (drops specks). */
function keepLargeRegions(mask, width, height, minShare = 0.02) {
  const label = new Int32Array(mask.length);
  const sizes = [0];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start]) continue;
    const id = sizes.length;
    let size = 0;
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const i = stack.pop();
      size++;
      const x = i % width;
      const y = (i - x) / width;
      const visit = (j) => { if (mask[j] && !label[j]) { label[j] = id; stack.push(j); } };
      if (x > 0) visit(i - 1);
      if (x < width - 1) visit(i + 1);
      if (y > 0) visit(i - width);
      if (y < height - 1) visit(i + width);
    }
    sizes.push(size);
  }
  const largest = Math.max(...sizes);
  return mask.map((v, i) => (v && sizes[label[i]] >= largest * minShare ? 1 : 0));
}

/**
 * @returns {Promise<{ png: Buffer, width: number, height: number }>} trimmed RGBA layer
 */
export async function engravingToLayer(sourcePath, { scale = 4, closeRadius = 3, inkThreshold = 42, nearRadius = 70 } = {}) {
  const { data, info } = await sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const paperColor = borderPaper(data, width, height);
  const paper = paperColor.l;

  const ink = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2];
    const l = lum(r, g, b);
    // Hue shift away from the paper tint (pink tails, orange skins), independent of brightness.
    const shift = Math.max(
      Math.abs(r - paperColor.r - (l - paper)),
      Math.abs(g - paperColor.g - (l - paper)),
      Math.abs(b - paperColor.b - (l - paper)),
    );
    ink[p] = paper - l > inkThreshold || shift > 24 ? 1 : 0;
  }
  // Generated sheets often carry a faint frame or vignette at the edge; it is never subject.
  const band = Math.round(Math.min(width, height) * 0.012);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < band || y < band || x >= width - band || y >= height - band) ink[y * width + x] = 0;
    }
  }

  // Close gaps between hatching so the silhouette is solid, then restore its edge.
  const closed = dilate(ink, width, height, closeRadius);
  const outside = outsideRegion(closed, width, height);
  let inside = outside.map((v) => (v ? 0 : 1));
  inside = keepLargeRegions(erode(inside, width, height, closeRadius - 1), width, height);
  // Strokes are only kept near the subject; isolated paper specks are dropped.
  const near = dilate(inside, width, height, nearRadius);

  const W = width * scale;
  const H = height * scale;
  const silhouette = await sharp(Buffer.from(inside.map((v) => v * 255)), { raw: { width, height, channels: 1 } })
    .resize(W, H, { kernel: 'cubic' })
    .blur(scale * 0.6)
    .extractChannel(0)
    .raw()
    .toBuffer();
  if (silhouette.length !== W * H) throw new Error(`Unexpected mask size ${silhouette.length}`);
  const nearMask = await sharp(Buffer.from(near.map((v) => v * 255)), { raw: { width, height, channels: 1 } })
    .resize(W, H, { kernel: 'nearest' })
    .extractChannel(0)
    .raw()
    .toBuffer();
  const color = await sharp(data, { raw: { width, height, channels: 3 } })
    .resize(W, H, { kernel: 'lanczos3' })
    .sharpen({ sigma: scale * 0.35 })
    .raw()
    .toBuffer();

  const black = 18;
  const out = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    // White-balance against the paper so cream sheets print as clean white.
    let r = Math.min(255, (color[p * 3] * paper) / paperColor.r);
    let g = Math.min(255, (color[p * 3 + 1] * paper) / paperColor.g);
    let b = Math.min(255, (color[p * 3 + 2] * paper) / paperColor.b);
    const l = lum(r, g, b);
    // Levels: paper -> pure white, keep ink dense and edges crisp.
    const t = Math.min(1, Math.max(0, (l - black) / (paper - black)));
    const curved = t < 1 ? Math.pow(t, 1.35) : 1;
    const k = l > 0 ? (curved * 255) / Math.max(l, 1) : 0;
    r = Math.min(255, r * k); g = Math.min(255, g * k); b = Math.min(255, b * k);
    // Ink alpha for strokes outside the silhouette (whiskers).
    const darkness = (paper - l) / paper;
    const inkAlpha = nearMask[p] ? Math.min(1, Math.max(0, (darkness - 0.16) / 0.22)) : 0;
    const alpha = Math.max(silhouette[p] / 255, inkAlpha);
    out[p * 4] = r; out[p * 4 + 1] = g; out[p * 4 + 2] = b;
    out[p * 4 + 3] = Math.round(alpha * 255);
  }
  if (boldLines > 0) {
    // Thicken thin line art so it holds up at browsing size and in DTG: spread
    // alpha with a blur, then re-steepen it (a soft morphological dilation).
    const alpha = Buffer.alloc(W * H);
    for (let p = 0; p < W * H; p++) alpha[p] = out[p * 4 + 3];
    const spread = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(boldLines).extractChannel(0).raw().toBuffer();
    for (let p = 0; p < W * H; p++) {
      const a = Math.min(255, Math.max(out[p * 4 + 3], spread[p] * 3.2));
      if (out[p * 4 + 3] < 40 && a > out[p * 4 + 3]) {
        // Newly covered pixels take the line colour, not paper.
        out[p * 4] = 30; out[p * 4 + 1] = 30; out[p * 4 + 2] = 30;
      }
      out[p * 4 + 3] = a;
    }
  }
  const png = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
  const meta = await sharp(png).metadata();
  return { png, width: meta.width, height: meta.height };
}

/**
 * General illustration keying for already-high-resolution sources.
 * Masks are analysed on a downsampled copy (fast), colour is kept at full
 * resolution.
 *
 * - mode 'silhouette': subject filled solid (white areas stay white), for light garments.
 * - mode 'lineart': only ink prints (dark strokes + coloured fills); paper inside the
 *   drawing is transparent, so the garment colour shows through.
 * - mode 'knockout': for dark garments. Light tones print in `inkColor`, dark strokes are
 *   transparent, the way vintage band tees are separated.
 *
 * @returns {Promise<{ png: Buffer, width: number, height: number }>} trimmed RGBA layer
 */
export async function keyIllustration(
  sourcePath,
  { mode = 'silhouette', analysisMax = 1100, closeRadius = 3, inkThreshold = 42, nearRadius = 70, inkColor = [242, 236, 222], knockoutGamma = 1.1, boldLines = 0 } = {},
) {
  const full = await sharp(sourcePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = full.info.width;
  const H = full.info.height;
  const factor = Math.min(1, analysisMax / Math.max(W, H));
  const small = await sharp(full.data, { raw: { width: W, height: H, channels: 3 } })
    .resize(Math.round(W * factor), Math.round(H * factor), { kernel: 'cubic' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = small.info;
  const data = small.data;
  const paperColor = borderPaper(data, width, height);
  const paper = paperColor.l;
  const shiftOf = (r, g, b, l) =>
    Math.max(Math.abs(r - paperColor.r - (l - paper)), Math.abs(g - paperColor.g - (l - paper)), Math.abs(b - paperColor.b - (l - paper)));

  const ink = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2];
    const l = lum(r, g, b);
    ink[p] = paper - l > inkThreshold || shiftOf(r, g, b, l) > 24 ? 1 : 0;
  }
  const band = Math.round(Math.min(width, height) * 0.012);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < band || y < band || x >= width - band || y >= height - band) ink[y * width + x] = 0;
    }
  }
  const closed = dilate(ink, width, height, closeRadius);
  const outside = outsideRegion(closed, width, height);
  const inside = keepLargeRegions(erode(outside.map((v) => (v ? 0 : 1)), width, height, closeRadius - 1), width, height);
  const near = dilate(inside, width, height, Math.round(nearRadius * (width / 896)));

  const upMask = (mask, kernel, blur) => {
    let pipeline = sharp(Buffer.from(mask.map((v) => v * 255)), { raw: { width, height, channels: 1 } }).resize(W, H, { kernel });
    if (blur) pipeline = pipeline.blur(blur);
    return pipeline.extractChannel(0).raw().toBuffer();
  };
  const silhouette = await upMask(inside, 'cubic', 1 / factor * 0.5);
  const nearMask = await upMask(near, 'nearest', 0);
  const color = full.data;

  const out = Buffer.alloc(W * H * 4);
  const black = 18;
  for (let p = 0; p < W * H; p++) {
    let r = Math.min(255, (color[p * 3] * paper) / paperColor.r);
    let g = Math.min(255, (color[p * 3 + 1] * paper) / paperColor.g);
    let b = Math.min(255, (color[p * 3 + 2] * paper) / paperColor.b);
    const l = lum(r, g, b);
    let alpha;
    if (mode === 'knockout') {
      // Light = ink, dark = shirt.
      const light = Math.min(1, Math.max(0, (l - 40) / (paper - 60)));
      alpha = (silhouette[p] / 255) * Math.pow(light, knockoutGamma);
      [r, g, b] = inkColor;
    } else {
      const t = Math.min(1, Math.max(0, (l - black) / (paper - black)));
      const k = l > 0 ? ((t < 1 ? Math.pow(t, 1.25) : 1) * 255) / Math.max(l, 1) : 0;
      r = Math.min(255, r * k); g = Math.min(255, g * k); b = Math.min(255, b * k);
      const darkness = (paper - l) / paper;
      const dark = Math.min(1, Math.max(0, (darkness - 0.14) / 0.24));
      const hue = Math.min(1, Math.max(0, (shiftOf(color[p * 3], color[p * 3 + 1], color[p * 3 + 2], lum(color[p * 3], color[p * 3 + 1], color[p * 3 + 2])) - 18) / 26));
      const inkAlpha = nearMask[p] ? Math.max(dark, hue) : 0;
      alpha = mode === 'lineart' ? inkAlpha : Math.max(silhouette[p] / 255, inkAlpha);
      if (mode === 'lineart' && alpha > 0 && hue < dark) {
        // Pure line pixels: print solid line colour rather than a grey ramp.
        r = Math.min(r, 40); g = Math.min(g, 40); b = Math.min(b, 40);
      }
    }
    out[p * 4] = r; out[p * 4 + 1] = g; out[p * 4 + 2] = b;
    out[p * 4 + 3] = Math.round(alpha * 255);
  }
  const png = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
  const meta = await sharp(png).metadata();
  return { png, width: meta.width, height: meta.height };
}
