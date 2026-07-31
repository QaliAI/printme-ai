import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  printifyWebhookEventSchema,
  PrintifyWebhookService,
  verifyPrintifyWebhookPayload,
  type PrintifyOrderState,
  type PrintifyTransition,
  type PrintifyWebhookEvent,
  type PrintifyWebhookStore,
} from '@/lib/commerce/webhooks/printify';

function event(
  id: string,
  type = 'order:updated',
  data: Record<string, unknown> | null = {
    shop_id: 815256,
    status: 'in-production',
  },
): PrintifyWebhookEvent {
  return printifyWebhookEventSchema.parse({
    id,
    type,
    created_at: '2026-07-29 18:00:00+00:00',
    resource: {
      id: 'printify-order-1',
      type: 'order',
      data,
    },
  });
}

const stateRank: Partial<Record<PrintifyOrderState, number>> = {
  submitted: 5,
  in_production: 6,
  shipped: 7,
  delivered: 8,
};

class MemoryPrintifyWebhookStore implements PrintifyWebhookStore {
  events = new Map<
    string,
    { event: PrintifyWebhookEvent; status: 'processing' | 'processed' | 'failed' }
  >();
  state: PrintifyOrderState = 'submitted';
  trackingNumber: string | null = null;
  attempts = new Map<string, number>();

  async beginEvent(value: PrintifyWebhookEvent) {
    if (this.events.has(value.id)) return false;
    this.events.set(value.id, { event: value, status: 'processing' });
    this.attempts.set(value.id, 1);
    return true;
  }

  async claimFailedEvent(eventId: string) {
    const stored = this.events.get(eventId);
    if (!stored || stored.status !== 'failed') return null;
    stored.status = 'processing';
    this.attempts.set(eventId, (this.attempts.get(eventId) ?? 0) + 1);
    return stored.event;
  }

  async completeEvent(eventId: string) {
    const stored = this.events.get(eventId);
    if (stored) stored.status = 'processed';
  }

  async failEvent(eventId: string) {
    const stored = this.events.get(eventId);
    if (stored) stored.status = 'failed';
  }

  async applyTransition(input: PrintifyTransition) {
    const previousStatus = this.state;
    const currentRank = stateRank[this.state];
    const nextRank = stateRank[input.nextStatus];
    const terminal =
      this.state === 'delivered' || this.state === 'cancelled';
    const canRecover =
      this.state === 'fulfillment_failed' &&
      nextRank !== undefined &&
      nextRank >= 5;
    const canAdvance =
      currentRank !== undefined &&
      nextRank !== undefined &&
      nextRank > currentRank;
    const canFail =
      input.nextStatus === 'fulfillment_failed' &&
      !['shipped', 'delivered', 'cancelled'].includes(this.state);
    const canCancel =
      input.nextStatus === 'cancelled' && this.state !== 'delivered';
    const applied =
      !terminal && (canRecover || canAdvance || canFail || canCancel);
    if (applied) {
      this.state = input.nextStatus;
      this.trackingNumber = input.trackingNumber ?? this.trackingNumber;
    }
    await this.completeEvent(input.eventId);
    return {
      outcome: applied ? ('applied' as const) : ('ignored' as const),
      orderId: '5cb5afe4-ff4d-4a98-8069-2d5fd1142f4a',
      previousStatus,
      currentStatus: this.state,
    };
  }
}

describe('Printify webhook authentication and validation', () => {
  it('verifies the documented HMAC over the exact raw body', () => {
    const body = JSON.stringify(event('printify-event-signature'));
    const secret = 'printify-test-webhook-secret';
    const signature = `sha256=${createHmac('sha256', secret)
      .update(body)
      .digest('hex')}`;

    expect(
      verifyPrintifyWebhookPayload(body, signature, secret),
    ).toBe(true);
    expect(
      verifyPrintifyWebhookPayload(`${body} `, signature, secret),
    ).toBe(false);
    expect(
      verifyPrintifyWebhookPayload(body, 'sha256=invalid', secret),
    ).toBe(false);
  });

  it('rejects malformed documented event envelopes', () => {
    expect(
      printifyWebhookEventSchema.safeParse({
        type: 'order:updated',
        resource: { id: 'order-1', type: 'order' },
      }).success,
    ).toBe(false);
  });
});

describe('Printify webhook processing', () => {
  it('deduplicates external event identifiers', async () => {
    const store = new MemoryPrintifyWebhookStore();
    const service = new PrintifyWebhookService(store);
    const payload = event('printify-event-duplicate');

    expect((await service.process(payload)).duplicate).toBe(false);
    expect((await service.process(payload)).duplicate).toBe(true);
  });

  it('acknowledges and records unknown event types without mutation', async () => {
    const store = new MemoryPrintifyWebhookStore();
    const unknown = event(
      'printify-event-unknown',
      'product:future:event',
    );
    unknown.resource.type = 'product';
    const result = await new PrintifyWebhookService(store).process(
      unknown,
    );

    expect(result.outcome).toBe('ignored');
    expect(store.state).toBe('submitted');
    expect(store.events.get('printify-event-unknown')?.status).toBe(
      'processed',
    );
  });

  it('maps production, shipment, delivery, cancellation, and failures', async () => {
    const store = new MemoryPrintifyWebhookStore();
    const service = new PrintifyWebhookService(store);

    await service.process(event('event-production'));
    expect(store.state).toBe('in_production');

    await service.process(
      event('event-shipped', 'order:shipment:created', {
        shop_id: 815256,
        shipped_at: '2026-07-29 19:00:00+00:00',
        carrier: {
          code: 'USPS',
          tracking_number: 'tracking-1',
          tracking_url: 'https://example.com/tracking-1',
        },
        skus: ['shirt-1'],
      }),
    );
    expect(store.state).toBe('shipped');
    expect(store.trackingNumber).toBe('tracking-1');

    await service.process(
      event('event-delivered', 'order:shipment:delivered', {
        shop_id: 815256,
        delivered_at: '2026-07-30 19:00:00+00:00',
        carrier: {
          code: 'USPS',
          tracking_number: 'tracking-1',
        },
      }),
    );
    expect(store.state).toBe('delivered');

    const cancelledStore = new MemoryPrintifyWebhookStore();
    await new PrintifyWebhookService(cancelledStore).process(
      event('event-cancelled', 'order:updated', {
        shop_id: 815256,
        status: 'canceled',
      }),
    );
    expect(cancelledStore.state).toBe('cancelled');

    const failedStore = new MemoryPrintifyWebhookStore();
    await new PrintifyWebhookService(failedStore).process(
      event('event-failed', 'order:updated', {
        shop_id: 815256,
        status: 'has-issues',
      }),
    );
    expect(failedStore.state).toBe('fulfillment_failed');
  });

  it('ignores out-of-order regressions and terminal-state changes', async () => {
    const store = new MemoryPrintifyWebhookStore();
    store.state = 'shipped';
    const service = new PrintifyWebhookService(store);

    const regression = await service.process(event('event-regression'));
    expect(regression.outcome).toBe('ignored');
    expect(store.state).toBe('shipped');

    store.state = 'delivered';
    await service.process(
      event('event-terminal-cancel', 'order:updated', {
        shop_id: 815256,
        status: 'canceled',
      }),
    );
    expect(store.state).toBe('delivered');
  });

  it('claims a failed event once and replays it safely', async () => {
    const store = new MemoryPrintifyWebhookStore();
    const payload = event('event-replay');
    store.events.set(payload.id, {
      event: payload,
      status: 'failed',
    });
    store.attempts.set(payload.id, 1);
    const service = new PrintifyWebhookService(store);

    const replayed = await service.replay(payload.id);
    const secondReplay = await service.replay(payload.id);

    expect(replayed.outcome).toBe('applied');
    expect(secondReplay.outcome).toBe('not_replayable');
    expect(store.attempts.get(payload.id)).toBe(2);
  });
});
