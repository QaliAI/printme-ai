// Converts OFL font text to SVG path outlines, so print files never depend on
// installed fonts and never contain AI-rendered lettering.
import opentype from 'opentype.js';

const cache = new Map();
export function loadFont(path) {
  if (!cache.has(path)) cache.set(path, opentype.loadSync(path));
  return cache.get(path);
}

/** Width of `text` at `size` with `tracking` (em fraction) between glyphs. */
export function measure(font, text, size, tracking = 0) {
  const glyphs = font.stringToGlyphs(text);
  let width = 0;
  glyphs.forEach((glyph, i) => {
    width += (glyph.advanceWidth / font.unitsPerEm) * size;
    if (i < glyphs.length - 1) {
      width += (font.getKerningValue(glyph, glyphs[i + 1]) / font.unitsPerEm) * size;
      width += tracking * size;
    }
  });
  return width;
}

/** Font size that makes `text` exactly `width` wide. */
export const sizeToWidth = (font, text, width, tracking = 0) => width / measure(font, text, 1, tracking);

/** Cap height in px for a font size. */
export const capHeight = (font, size) => ((font.tables.os2?.sCapHeight || font.ascender * 0.7) / font.unitsPerEm) * size;

/**
 * SVG path data for `text` with its baseline at `y`.
 * `align` is 'left' | 'center' | 'right' relative to `x`.
 */
export function textPath(font, text, { x, y, size, tracking = 0, align = 'left' }) {
  const total = measure(font, text, size, tracking);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const glyphs = font.stringToGlyphs(text);
  let d = '';
  glyphs.forEach((glyph, i) => {
    d += glyph.getPath(cursor, y, size).toPathData(2);
    cursor += (glyph.advanceWidth / font.unitsPerEm) * size;
    if (i < glyphs.length - 1) {
      cursor += (font.getKerningValue(glyph, glyphs[i + 1]) / font.unitsPerEm) * size + tracking * size;
    }
  });
  return { d, width: total };
}
