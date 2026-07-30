import 'server-only';

import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import { z } from 'zod';

const carrierSchema = z.object({
  code: z.string().min(1).max(100),
  tracking_number: z.string().min(1).max(300),
  tracking_url: z.string().url().max(2_000).optional(),
});

const resourceDataSchema = z
  .object({
    shop_id: z.union([z.number().int().positive(), z.string().min(1)]),
    status: z.string().min(1).max(100).optional(),
    shipped_at: z.string().min(1).optional(),
    delivered_at: z.string().min(1).optional(),
    carrier: carrierSchema.optional(),
    skus: z.array(z.string().max(300)).max(500).optional(),
  })
  .passthrough();

export const printifyWebhookEventSchema = z.object({
  id: z.string().min(1).max(300),
  type: z.string().min(1).max(200),
  created_at: z.string().min(1).max(100),
  resource: z
    .object({
      id: z.union([z.string().min(1), z.number()]).transform(String),
      type: z.string().min(1).max(100),
      data: resourceDataSchema.nullable(),
    })
    .passthrough(),
}).passthrough();

export type PrintifyWebhookEvent = z.infer<
  typeof printifyWebhookEventSchema
>;

export type PrintifyOrderState =
  | 'submitted'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'fulfillment_failed'
  | 'cancelled';

export interface PrintifyTransition {
  eventId: string;
  printifyOrderId: string;
  nextStatus: PrintifyOrderState;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  occurredAt: string | null;
}

export interface PrintifyTransitionResult {
  outcome: 'applied' | 'ignored' | 'missing_order';
  orderId: string | null;
  previousStatus: string | null;
  currentStatus: string | null;
}

export interface PrintifyWebhookStore {
  beginEvent(event: PrintifyWebhookEvent): Promise<boolean>;
  claimFailedEvent(eventId: string): Promise<PrintifyWebhookEvent | null>;
  completeEvent(eventId: string): Promise<void>;
  failEvent(eventId: string, code: string, message: string): Promise<void>;
  applyTransition(
    transition: PrintifyTransition,
  ): Promise<PrintifyTransitionResult>;
}

export class PrintifyWebhookValidationError extends Error {
  constructor(readonly code: string, message?: string) {
    super(message ?? `Printify webhook validation failed: ${code}.`);
    this.name = 'PrintifyWebhookValidationError';
  }
}

export function verifyPrintifyWebhookPayload(
  payload: string,
  signature: string,
  secret: string,
) {
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = `sha256=${createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')}`;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(signature);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

function transitionFor(
  event: PrintifyWebhookEvent,
): Omit<PrintifyTransition, 'eventId' | 'printifyOrderId'> | null {
  if (
    ![
      'order:created',
      'order:updated',
      'order:sent-to-production',
      'order:shipment:created',
      'order:shipment:delivered',
    ].includes(event.type)
  ) {
    return null;
  }
  if (event.resource.type !== 'order') {
    throw new PrintifyWebhookValidationError(
      'INVALID_RESOURCE_TYPE',
      'A supported Printify order event must reference an order.',
    );
  }

  const data = event.resource.data;
  if (event.type === 'order:created') {
    return {
      nextStatus: 'submitted',
      trackingNumber: null,
      trackingCarrier: null,
      trackingUrl: null,
      occurredAt: event.created_at,
    };
  }
  if (event.type === 'order:sent-to-production') {
    return {
      nextStatus: 'submitted',
      trackingNumber: null,
      trackingCarrier: null,
      trackingUrl: null,
      occurredAt: event.created_at,
    };
  }
  if (
    event.type === 'order:shipment:created' ||
    event.type === 'order:shipment:delivered'
  ) {
    if (!data?.carrier) {
      throw new PrintifyWebhookValidationError(
        'TRACKING_DETAILS_MISSING',
      );
    }
    const delivered = event.type === 'order:shipment:delivered';
    return {
      nextStatus: delivered ? 'delivered' : 'shipped',
      trackingNumber: data.carrier.tracking_number,
      trackingCarrier: data.carrier.code,
      trackingUrl: data.carrier.tracking_url ?? null,
      occurredAt:
        (delivered ? data.delivered_at : data.shipped_at) ??
        event.created_at,
    };
  }
  if (event.type !== 'order:updated') return null;

  const status = data?.status;
  if (!status) {
    throw new PrintifyWebhookValidationError(
      'ORDER_STATUS_MISSING',
    );
  }
  const nextStatus: PrintifyOrderState | null =
    status === 'in-production'
      ? 'in_production'
      : status === 'fulfilled' || status === 'partially-fulfilled'
        ? 'shipped'
        : status === 'canceled'
          ? 'cancelled'
          : [
                'payment-not-received',
                'has-issues',
                'unfulfillable',
                'source-check-failed',
                'on-hold',
              ].includes(status)
            ? 'fulfillment_failed'
            : [
                  'pending',
                  'sending-to-production',
                  'cost-calculation',
                  'sending_to_production_delegate',
                  'sending_to_production_delegate_sync',
                ].includes(status)
              ? 'submitted'
              : null;
  if (!nextStatus) return null;
  return {
    nextStatus,
    trackingNumber: null,
    trackingCarrier: null,
    trackingUrl: null,
    occurredAt: event.created_at,
  };
}

export class PrintifyWebhookService {
  constructor(private readonly store: PrintifyWebhookStore) {}

  async process(event: PrintifyWebhookEvent) {
    const isNew = await this.store.beginEvent(event);
    if (!isNew) {
      return {
        duplicate: true,
        outcome: 'duplicate' as const,
        orderId: null,
      };
    }
    return this.processClaimed(event);
  }

  async replay(eventId: string) {
    const event = await this.store.claimFailedEvent(eventId);
    if (!event) {
      return {
        duplicate: true,
        outcome: 'not_replayable' as const,
        orderId: null,
      };
    }
    return this.processClaimed(event);
  }

  private async processClaimed(event: PrintifyWebhookEvent) {
    try {
      const transition = transitionFor(event);
      if (!transition) {
        await this.store.completeEvent(event.id);
        return {
          duplicate: false,
          outcome: 'ignored' as const,
          orderId: null,
        };
      }
      const result = await this.store.applyTransition({
        eventId: event.id,
        printifyOrderId: event.resource.id,
        ...transition,
      });
      return {
        duplicate: false,
        outcome: result.outcome,
        orderId: result.orderId,
      };
    } catch (error) {
      const code =
        error instanceof PrintifyWebhookValidationError
          ? error.code
          : 'PRINTIFY_WEBHOOK_PROCESSING_FAILED';
      await this.store.failEvent(
        event.id,
        code,
        error instanceof Error
          ? error.message
          : 'Unknown Printify webhook processing error.',
      );
      throw error;
    }
  }
}
