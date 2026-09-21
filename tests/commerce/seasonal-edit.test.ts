import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  seasonalTrendCards,
  getActiveSeasonalTrends,
  getAdminSeasonalTrends,
  getSeasonalTrendBySlug,
} from '@/lib/commerce/seasonal-trends';
import {
  buildPersonalizedSvg,
  defaultPersonalization,
} from '@/lib/commerce/personalization-engine';
import { curatedDesigns, merchProducts } from '@/lib/commerce/fixtures';

describe('The Seasonal Edit — Trend Registry & Assets', () => {
  it('contains exactly 6 approved curated trend cards across 3 categories', () => {
    const active = getActiveSeasonalTrends();
    expect(active.length).toBe(6);

    const categories = new Set(active.map((c) => c.category));
    expect(categories.has('halloween')).toBe(true);
    expect(categories.has('cozy-fall')).toBe(true);
    expect(categories.has('thanksgiving')).toBe(true);

    const halloweenCards = active.filter((c) => c.category === 'halloween');
    const fallCards = active.filter((c) => c.category === 'cozy-fall');
    const thanksgivingCards = active.filter((c) => c.category === 'thanksgiving');

    expect(halloweenCards.length).toBe(3);
    expect(fallCards.length).toBe(2);
    expect(thanksgivingCards.length).toBe(1);
  });

  it('all 6 trend cards map to existing catalog designs and approved products', () => {
    for (const card of seasonalTrendCards) {
      const design = curatedDesigns.find((d) => d.id === card.relatedDesignId);
      expect(design, `Missing fixture for ${card.relatedDesignId}`).toBeDefined();
      expect(design?.title).toBe(card.headline);

      const product = merchProducts.find((p) => p.id === card.recommendedProductId);
      expect(product, `Missing product for ${card.recommendedProductId}`).toBeDefined();

      // Verify price matches variant price
      const minPrice = Math.min(...(product?.variants.map((v) => v.unitPrice) || []));
      expect(card.verifiedPriceCents).toBe(minPrice);
    }
  });

  it('all trend cards have documented source references and limitations', () => {
    for (const card of seasonalTrendCards) {
      expect(card.sources.length).toBeGreaterThan(0);
      for (const src of card.sources) {
        expect(src.url).toMatch(/^https:\/\//);
        expect(src.observedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(src.whatWasObserved.length).toBeGreaterThan(20);
        expect(src.limitations.length).toBeGreaterThan(15);
      }
    }
  });

  it('5 designs support personalization and 1 (Night Garden) is pure artwork', () => {
    const personalized = seasonalTrendCards.filter((c) => c.isPersonalizationSupported);
    const standard = seasonalTrendCards.filter((c) => !c.isPersonalizationSupported);

    expect(personalized.length).toBe(5);
    expect(standard.length).toBe(1);
    expect(standard[0].relatedDesignSlug).toBe('night-garden-society');
  });

  it('buildPersonalizedSvg generates customized SVG XML with customer text', () => {
    // 1. Haunted Household
    const hhSvg = buildPersonalizedSvg('haunted-household', {
      familyName: 'THE O\'CONNOR COVEN',
      membersText: 'EMMA • NOAH • BUSTER (DOG)',
    });
    expect(hhSvg).toContain('THE O\'CONNOR COVEN');
    expect(hhSvg).toContain('EMMA • NOAH • BUSTER (DOG)');

    // 2. Library of Lost Hours
    const libSvg = buildPersonalizedSvg('library-of-lost-hours', {
      patronName: 'CLARA OSWALD',
      cardNumber: '#7777-X',
      dueDate: 'OCT 31',
    });
    expect(libSvg).toContain('CLARA OSWALD');
    expect(libSvg).toContain('#7777-X');

    // 3. Midnight Hayride
    const hayrideSvg = buildPersonalizedSvg('midnight-hayride', {
      locationName: 'AUSTIN, TX',
      chapterNumber: 'CHAPTER NO. 12',
    });
    expect(hayrideSvg).toContain('AUSTIN, TX');
    expect(hayrideSvg).toContain('CHAPTER NO. 12');

    // 4. Field Notes
    const fnSvg = buildPersonalizedSvg('field-notes-after-dark', {
      woodlandAnimal: 'VULPES VULPES (RED FOX)',
      fieldLocation: 'ADIRONDACKS • NY',
    });
    expect(fnSvg).toContain('VULPES VULPES (RED FOX)');
    expect(fnSvg).toContain('ADIRONDACKS • NY');

    // 5. Leftovers League
    const llSvg = buildPersonalizedSvg('leftovers-league', {
      leagueFamilyName: 'THE RODRIGUEZ CLAN',
      memberRole: 'UNDEFEATED NAP CHAMPION',
    });
    expect(llSvg).toContain('THE RODRIGUEZ CLAN');
    expect(llSvg).toContain('ROLE: UNDEFEATED NAP CHAMPION');
  });

  it('all 6 production print files exist with exact dimensions and alpha transparency', async () => {
    const specs: Record<string, { width: number; height: number }> = {
      'haunted-household.png': { width: 3951, height: 4800 },
      'library-of-lost-hours.png': { width: 1275, height: 1155 },
      'midnight-hayride.png': { width: 3951, height: 4800 },
      'night-garden-society.png': { width: 5400, height: 7200 },
      'field-notes-after-dark.png': { width: 5400, height: 7200 },
      'leftovers-league.png': { width: 3951, height: 4800 },
    };

    for (const [filename, expected] of Object.entries(specs)) {
      const filePath = path.resolve('public/designs/seasonal-edit', filename);
      expect(fs.existsSync(filePath), `Missing production file: ${filename}`).toBe(true);

      const meta = await sharp(filePath).metadata();
      expect(meta.width).toBe(expected.width);
      expect(meta.height).toBe(expected.height);
      expect(meta.format).toBe('png');
      expect(meta.hasAlpha).toBe(true);
    }
  });

  it('all 6 realistic product mockups exist in public directory', () => {
    for (const card of seasonalTrendCards) {
      const mockupRelative = card.mockupUrl.replace(/^\//, '');
      const mockupPath = path.resolve('public', mockupRelative.replace(/^designs\//, 'designs/'));
      expect(fs.existsSync(mockupPath), `Missing mockup file: ${card.mockupUrl}`).toBe(true);
    }
  });
});
