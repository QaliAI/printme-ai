import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkPaidOrderTotals,
  orderShippingPaidCents,
  readStripeSessionAmounts,
} from '@/lib/commerce/checkout/payment-totals';

function session(subtotal: number, shipping: number, tax: number, discount = 0, total?: number) {
  return {
    amount_subtotal: subtotal,
    amount_total: total ?? subtotal + shipping + tax - discount,
    total_details: { amount_shipping: shipping, amount_tax: tax, amount_discount: discount },
  };
}

const order = { subtotal: 3400, shipping: 399, currency: 'USD' };

describe('Stripe paid totals (blocker B1)', () => {
  it('reads subtotal, shipping and tax from a completed session', () => {
    expect(readStripeSessionAmounts(session(3400, 0, 0))).toEqual({ subtotal: 3400, shipping: 0, tax: 0, discount: 0, total: 3400 });
    expect(readStripeSessionAmounts(session(3400, 399, 0)).total).toBe(3799);
    expect(readStripeSessionAmounts(session(3400, 399, 312)).total).toBe(4111);
  });

  it('rejects sessions whose numbers are missing, inconsistent or discounted', () => {
    expect(() => readStripeSessionAmounts({ amount_total: 3400, amount_subtotal: null, total_details: null })).toThrow(/INCOMPLETE_PAYMENT_DETAILS/);
    expect(() => readStripeSessionAmounts({ ...session(3400, 399, 0), total_details: { amount_shipping: 399 } })).toThrow(/INCOMPLETE_PAYMENT_DETAILS/);
    expect(() => readStripeSessionAmounts(session(3400, 399, 0, 0, 3800))).toThrow(/PAYMENT_TOTALS_INCONSISTENT/);
    expect(() => readStripeSessionAmounts(session(3400, -1, 0))).toThrow(/INCOMPLETE_PAYMENT_DETAILS/);
    expect(() => readStripeSessionAmounts(session(3400, 399, 0, 500))).toThrow(/UNEXPECTED_DISCOUNT/);
  });

  it('accepts a payment at subtotal + shipping and at subtotal + shipping + tax', () => {
    const paid = (s: ReturnType<typeof session>) => ({ ...readStripeSessionAmounts(s), currency: 'usd' });
    expect(checkPaidOrderTotals(order, paid(session(3400, 399, 0)))).toBeNull();
    expect(checkPaidOrderTotals(order, paid(session(3400, 399, 312)))).toBeNull();
    expect(checkPaidOrderTotals({ ...order, shipping: 0 }, paid(session(3400, 0, 0)))).toBeNull();
  });

  it('rejects payments that do not match the order', () => {
    const base = { subtotal: 3400, shipping: 399, tax: 0, discount: 0, total: 3799, currency: 'USD' };
    expect(checkPaidOrderTotals(order, { ...base, shipping: 0, total: 3400 })).toBe('SHIPPING_MISMATCH');
    expect(checkPaidOrderTotals(order, { ...base, subtotal: 3300, tax: 100 })).toBe('SUBTOTAL_MISMATCH');
    expect(checkPaidOrderTotals(order, { ...base, currency: 'EUR' })).toBe('CURRENCY_MISMATCH');
    expect(checkPaidOrderTotals(order, { ...base, tax: 3800, total: 7599 })).toBe('TAX_OUT_OF_RANGE');
    expect(checkPaidOrderTotals(order, { ...base, total: 3798 })).toBe('TOTAL_MISMATCH');
    expect(checkPaidOrderTotals(order, { ...base, discount: 100, total: 3699 })).toBe('UNEXPECTED_DISCOUNT');
  });

  it('reads orders.shipping as cents', () => {
    expect(orderShippingPaidCents(399)).toBe(399);
    expect(orderShippingPaidCents('399.00')).toBe(399);
    expect(orderShippingPaidCents(null)).toBe(0);
  });
});

describe('B1 SQL stays in step', () => {
  const canonical = readFileSync(
    new URL('../../docs/launch/01_CANONICAL_LAUNCH_MIGRATION_vfgbvnfhvjmkmfmianpb.sql', import.meta.url),
    'utf8',
  );
  const fix = readFileSync(new URL('../../migrations/013_fix_checkout_paid_totals.sql', import.meta.url), 'utf8');

  function block(sql: string) {
    const start = sql.indexOf('-- RPC: attach_commerce_stripe_session');
    const endMarker = ') TO service_role;';
    const end = sql.indexOf(endMarker, sql.indexOf('-- RPC: complete_stripe_checkout_payment', start));
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return sql.slice(start, end + endMarker.length);
  }

  it('uses the same attach/complete functions in migration 013 and the canonical launch migration', () => {
    expect(block(canonical)).toBe(block(fix));
  });

  it('records shipping at attach time and checks every component before marking paid', () => {
    const sql = block(fix);
    expect(sql).toMatch(/total = subtotal \+ p_shipping_cents/);
    expect(sql).toMatch(/p_amount_subtotal <> target_order\.subtotal::INTEGER/);
    expect(sql).toMatch(/p_amount_shipping <> COALESCE\(target_order\.shipping, 0\)::INTEGER/);
    expect(sql).toMatch(/p_paid_amount <> p_amount_subtotal \+ p_amount_shipping \+ p_amount_tax/);
    expect(sql).toMatch(/tax = p_amount_tax,\s+total = p_paid_amount/);
    expect(sql).not.toMatch(/target_order\.total::INTEGER <> p_paid_amount/);
    expect(sql).toMatch(/FROM PUBLIC, anon, authenticated;/);
  });

  it('removes the old signatures so PostgREST has one function per name', () => {
    expect(canonical).toMatch(/DROP FUNCTION IF EXISTS attach_commerce_stripe_session\(\s*UUID, UUID, TEXT, TEXT\s*\);/);
    expect(canonical).toMatch(/DROP FUNCTION IF EXISTS complete_stripe_checkout_payment\(\s*TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT\s*\);/);
  });
});
