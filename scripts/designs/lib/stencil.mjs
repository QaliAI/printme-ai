// Two-tone spray-stencil treatment of a transparent cutout: light areas print
// in `light`, saturated pink stays `accent`, everything else lets the garment
// show through. Upscaled first so the threshold edges stay crisp in print.
import sharp from 'sharp';

export async function stencil(sourcePath, { height, light = [242, 236, 222], accent = [255, 43, 145], threshold = 128 }) {
  const meta = await sharp(sourcePath).metadata();
  const width = Math.round((meta.width / meta.height) * height);
  const { data } = await sharp(sourcePath)
    .resize(width, height, { kernel: 'lanczos3' })
    .blur(1.2)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2], a = data[p * 4 + 3];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const pink = r > 170 && g < 120 && b > 90 && r - g > 90;
    // Soft 2px edge around the threshold avoids jaggies after the upscale.
    const t = Math.min(1, Math.max(0, (l - threshold + 10) / 20));
    const colour = pink ? accent : light;
    const alpha = pink ? a / 255 : (a / 255) * t;
    out[p * 4] = colour[0]; out[p * 4 + 1] = colour[1]; out[p * 4 + 2] = colour[2];
    out[p * 4 + 3] = Math.round(alpha * 255);
  }
  return { png: await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer(), width, height };
}
