import { describe, expect, it } from 'vitest';
import {
  calculateArtworkBox,
  getRotatedBounds,
  instant2dRenderer,
} from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type { PrintPlacement } from '@/lib/commerce/types';

const template = getPreviewTemplate('poster-studio-v1');
const view = template.views[0];
const centeredPlacement: PrintPlacement = {
  position: 'front',
  decorationMethod: 'sublimation',
  normalizedX: 0.5,
  normalizedY: 0.5,
  normalizedScale: 1,
  angle: 0,
  fit: 'contain',
};

function render(
  artworkWidth: number,
  artworkHeight: number,
  placement: PrintPlacement = centeredPlacement
) {
  return calculateArtworkBox({
    artwork: {
      url: '/fixture.png',
      width: artworkWidth,
      height: artworkHeight,
    },
    template,
    viewId: view.id,
    placement,
  });
}

describe('placement math', () => {
  it('preserves square artwork', () => {
    const result = render(1200, 1200);
    expect(result.artworkBox.width / result.artworkBox.height).toBeCloseTo(1);
  });

  it('preserves portrait artwork', () => {
    const result = render(800, 1600);
    expect(result.artworkBox.width / result.artworkBox.height).toBeCloseTo(0.5);
  });

  it('preserves landscape artwork', () => {
    const result = render(1600, 800);
    expect(result.artworkBox.width / result.artworkBox.height).toBeCloseTo(2);
  });

  it('treats transparent PNG artwork with the same proportional rules', () => {
    const result = instant2dRenderer.render({
      artwork: { url: '/transparent-fixture.png', width: 1122, height: 1402 },
      template,
      viewId: view.id,
      placement: centeredPlacement,
    });
    expect(result.preservesAspectRatio).toBe(true);
    expect(result.artworkBox.width / result.artworkBox.height).toBeCloseTo(
      1122 / 1402
    );
  });

  it('normalizes oversized artwork deterministically', () => {
    const oversized = render(12_000, 12_000);
    const reference = render(1200, 1200);
    expect(oversized.artworkBox.width).toBeCloseTo(reference.artworkBox.width);
    expect(oversized.artworkBox.height).toBeCloseTo(reference.artworkBox.height);
    expect(oversized.artworkBox.x).toBeCloseTo(reference.artworkBox.x);
    expect(oversized.artworkBox.y).toBeCloseTo(reference.artworkBox.y);
  });

  it('normalizes undersized artwork deterministically', () => {
    const undersized = render(12, 12);
    const reference = render(1200, 1200);
    expect(undersized.artworkBox.width).toBeCloseTo(reference.artworkBox.width);
    expect(undersized.artworkBox.height).toBeCloseTo(reference.artworkBox.height);
    expect(undersized.artworkBox.x).toBeCloseTo(reference.artworkBox.x);
    expect(undersized.artworkBox.y).toBeCloseTo(reference.artworkBox.y);
  });

  it('centers normalized placement at 0.5 / 0.5', () => {
    const result = render(1200, 1200);
    expect(result.artworkBox.x + result.artworkBox.width / 2).toBeCloseTo(
      view.printArea.x + view.printArea.width / 2
    );
    expect(result.artworkBox.y + result.artworkBox.height / 2).toBeCloseTo(
      view.printArea.y + view.printArea.height / 2
    );
  });

  it('converts moved normalized placement to mockup pixels', () => {
    const result = render(1200, 1200, {
      ...centeredPlacement,
      normalizedX: 0.25,
      normalizedY: 0.75,
    });
    expect(result.artworkBox.x + result.artworkBox.width / 2).toBeCloseTo(
      view.printArea.x + view.printArea.width * 0.25
    );
    expect(result.artworkBox.y + result.artworkBox.height / 2).toBeCloseTo(
      view.printArea.y + view.printArea.height * 0.75
    );
  });

  it('applies normalized scale without changing aspect ratio', () => {
    const base = render(1600, 800);
    const scaled = render(1600, 800, {
      ...centeredPlacement,
      normalizedScale: 1.4,
    });
    expect(scaled.artworkBox.width).toBeCloseTo(base.artworkBox.width * 1.4);
    expect(scaled.artworkBox.height).toBeCloseTo(base.artworkBox.height * 1.4);
    expect(scaled.artworkBox.width / scaled.artworkBox.height).toBeCloseTo(2);
  });

  it('accounts for rotated placement in safe-zone status', () => {
    const result = render(1200, 1200, {
      ...centeredPlacement,
      angle: 45,
    });
    const rotated = getRotatedBounds(result.artworkBox, 45);
    expect(rotated.width).toBeGreaterThan(result.artworkBox.width);
    expect(result.rotationDegrees).toBe(45);
    expect(result.isWithinSafeZone).toBe(false);
  });

  it('implements deterministic cover behavior without stretching', () => {
    const result = render(1600, 800, {
      ...centeredPlacement,
      fit: 'cover',
    });
    expect(result.artworkBox.height).toBeCloseTo(result.safeZone.height);
    expect(result.artworkBox.width / result.artworkBox.height).toBeCloseTo(2);
  });
});
