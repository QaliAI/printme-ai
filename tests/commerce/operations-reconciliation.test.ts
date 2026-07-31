import { describe, expect, it } from 'vitest';
import { reconcileOrders } from '@/lib/commerce/operations-reconciliation';

describe('Operations Order Reconciliation', () => {
  const now = new Date('2026-07-31T12:00:00.000Z');

  it('detects PAYMENT_WITHOUT_DRAFT alert', () => {
    const report = reconcileOrders(
      [
        {
          id: 'ord-1',
          orderNumber: 'PM-100001',
          paymentStatus: 'paid',
          fulfillmentStatus: 'pending',
          printifyOrderId: null,
          productionSubmittedAt: null,
          createdAt: now.toISOString(),
        },
      ],
      now,
    );

    expect(report.totalOrdersChecked).toBe(1);
    expect(report.alerts).toHaveLength(1);
    expect(report.alerts[0].type).toBe('PAYMENT_WITHOUT_DRAFT');
    expect(report.alerts[0].severity).toBe('high');
  });

  it('detects DRAFT_WITHOUT_PAYMENT alert', () => {
    const report = reconcileOrders(
      [
        {
          id: 'ord-2',
          orderNumber: 'PM-100002',
          paymentStatus: 'pending',
          fulfillmentStatus: 'draft_created',
          printifyOrderId: 'pf-draft-999',
          productionSubmittedAt: null,
          createdAt: now.toISOString(),
        },
      ],
      now,
    );

    expect(report.alerts).toHaveLength(1);
    expect(report.alerts[0].type).toBe('DRAFT_WITHOUT_PAYMENT');
    expect(report.alerts[0].severity).toBe('high');
  });

  it('produces clean report when all orders are reconciled', () => {
    const report = reconcileOrders(
      [
        {
          id: 'ord-3',
          orderNumber: 'PM-100003',
          paymentStatus: 'paid',
          fulfillmentStatus: 'manual_review_ready',
          printifyOrderId: 'pf-draft-888',
          productionSubmittedAt: null,
          createdAt: now.toISOString(),
        },
      ],
      now,
    );

    expect(report.alerts).toHaveLength(0);
    expect(report.paidOrdersCount).toBe(1);
    expect(report.draftOrdersCount).toBe(1);
  });
});
