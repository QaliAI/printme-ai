import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPlateFonts } from '@/lib/segmentation/specimen-plate';

// next/font families look like "'DM Serif Display', 'DM Serif Display Fallback'",
// where the fallback face is src: local("Times New Roman") / local("Arial").
const serif = "'DM Serif Display', 'DM Serif Display Fallback'";
const mono = "'Space Mono', 'Space Mono Fallback'";

describe('loadPlateFonts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the web fonts even where the local() fallback fonts are not installed (Linux, Android)', async () => {
    // Chromium rejects document.fonts.load with NetworkError when any matching face fails,
    // and a local() face for a font the OS lacks always fails.
    const load = vi.fn(async (font: string) => {
      if (font.includes('Fallback')) throw new DOMException('A network error occurred.', 'NetworkError');
      return [];
    });
    vi.stubGlobal('document', { fonts: { load } });

    await expect(loadPlateFonts(serif, mono)).resolves.toBeUndefined();
    expect(load.mock.calls.map(([font]) => font)).toEqual([
      "400 200px 'DM Serif Display'",
      "italic 400 200px 'DM Serif Display'",
      "700 100px 'Space Mono'",
    ]);
  });
});
