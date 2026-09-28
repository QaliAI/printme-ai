import { describe, expect, it } from 'vitest';
import { generateAuthoritativeEconomicsReport } from '@/lib/commerce/catalog/economics-report';

describe('Authoritative Printify Economics Report', () => {
  it('generates a valid economics report for all approved variants', () => {
    const report = generateAuthoritativeEconomicsReport(
      new Date('2026-07-31T12:00:00.000Z'),
    );
    expect(report.currency).toBe('USD');
    expect(report.variants.length).toBeGreaterThanOrEqual(5);

    for (const v of report.variants) {
      expect(v.productCostCents).toBeGreaterThan(0);
      expect(v.usShippingFirstItemCents).toBeGreaterThan(0);
      expect(v.contributionProfitCents).toBeGreaterThanOrEqual(800); // >= $8.00
      expect(v.contributionMarginPercent).toBeGreaterThanOrEqual(30); // >= 30%
      expect(v.passesMarginFloor).toBe(true);
    }
  });
});
