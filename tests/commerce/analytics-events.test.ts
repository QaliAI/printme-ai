import { describe, expect, it } from 'vitest';
import {
  commerceAnalyticsEvents,
  commerceAnalyticsPayloadSchema,
  hasDirectIdentifier,
} from '@/lib/commerce/analytics-events';

describe('commerce analytics contract', () => {
  it('exposes the complete Sprint 3 event vocabulary', () => {
    expect(commerceAnalyticsEvents).toHaveLength(18);
    expect(commerceAnalyticsEvents).toContain('upsell_added');
    expect(commerceAnalyticsEvents).toContain('fulfillment_failed');
  });

  it('rejects unknown events and nested or oversized properties', () => {
    expect(
      commerceAnalyticsPayloadSchema.safeParse({
        event: 'credit_card_entered',
        properties: {},
      }).success,
    ).toBe(false);
    expect(
      commerceAnalyticsPayloadSchema.safeParse({
        event: 'design_view',
        properties: { nested: { unsafe: true } },
      }).success,
    ).toBe(false);
  });

  it('blocks direct identifiers before transmission', () => {
    expect(hasDirectIdentifier({ productId: 'poster' })).toBe(false);
    expect(hasDirectIdentifier({ customerEmail: 'x@example.test' })).toBe(
      true,
    );
    expect(hasDirectIdentifier({ accessToken: 'not-for-analytics' })).toBe(
      true,
    );
  });
});
