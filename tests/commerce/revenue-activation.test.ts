import { describe, it, expect } from 'vitest';
import { buildPersonalizedSvg } from '@/lib/commerce/personalization-engine';
import { classifyAcquisition, hasDirectIdentifier } from '@/lib/commerce/analytics-events';
import { peakShippingSurchargeCents } from '@/lib/commerce/holiday-shipping';
import { summarizeFunnel } from '@/lib/commerce/funnel-summary';

describe('revenue activation contracts', () => {
  it('renders customer text as escaped XML in the canonical personalization artwork', () => {
    const svg = buildPersonalizedSvg('haunted-household', { familyName: 'A & B <script>' });
    expect(svg).toContain('A &#38; B &#60;SCRIPT&#62;');
    expect(svg).not.toContain('<SCRIPT>');
    expect(svg).not.toBe(buildPersonalizedSvg('haunted-household', { familyName: 'Different family' }));
  });
  it('records campaign classes without raw query strings, referrer URLs or customer names', () => {
    expect(classifyAcquisition(new URL('https://www.printme.ai/halloween?utm_source=instagram&utm_campaign=halloween-2026&email=a@example.com'), 'https://instagram.com/private?name=Jane')).toEqual({ utm_source: 'instagram', utm_campaign: 'halloween-2026', referrer_class: 'social', landing_path: '/halloween' });
    expect(classifyAcquisition(new URL('https://www.printme.ai/designs/Jane?utm_campaign=Jane%40example.com'))).toMatchObject({ utm_campaign: 'other', landing_path: '/designs' });
    expect(hasDirectIdentifier({ source: 'Jane@example.com' })).toBe(true);
  });
  it('reserves the peak surcharge once per US order within its inclusive dates and never duplicates an included provider quote', () => {
    for (const day of ['2026-10-14', '2027-01-18']) expect(peakShippingSurchargeCents({ now: new Date(day) })).toBe(0);
    for (const day of ['2026-10-15', '2027-01-17']) expect(peakShippingSurchargeCents({ now: new Date(day) })).toBe(40);
    expect(peakShippingSurchargeCents({ now: new Date('2026-12-01'), alreadyIncluded: true })).toBe(0);
    expect(peakShippingSurchargeCents({ now: new Date('2026-12-01'), country: 'CA' })).toBe(0);
  });
  it('counts paid orders and successful AI generations separately from ordinary placement previews', () => {
    const summary = summarizeFunnel([{ event_name: 'preview_generated', properties: {} }, { event_name: 'preview_generated', properties: { source: 'photo-edit' } }], [{ paid_amount: 4000 }, { paid_amount: 6000 }]);
    expect(summary).toMatchObject({ generations: 1, purchases: 2, aovCents: 5000, upsellAttachRate: null });
  });
});
