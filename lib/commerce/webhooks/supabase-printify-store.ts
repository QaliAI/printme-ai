import 'server-only';

import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  printifyWebhookEventSchema,
  type PrintifyWebhookStore,
} from './printify';

const transitionResultSchema = z.object({
  outcome: z.enum(['applied', 'ignored', 'missing_order']),
  order_id: z.string().uuid().nullable(),
  previous_status: z.string().nullable(),
  current_status: z.string().nullable(),
});

export class SupabasePrintifyWebhookStore
  implements PrintifyWebhookStore
{
  private get client() {
    if (
      process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true' ||
      process.env.COMMERCE_CHECKOUT_ENABLED !== 'true'
    ) {
      throw new Error('Printify webhook persistence is disabled.');
    }
    return getSupabaseAdminClient();
  }

  async beginEvent(
    event: Parameters<PrintifyWebhookStore['beginEvent']>[0],
  ) {
    const { data, error } = await this.client.rpc(
      'begin_commerce_webhook_event',
      {
        p_source: 'printify',
        p_event_id: event.id,
        p_event_type: event.type,
        p_payload: event,
      },
    );
    if (error) throw error;
    return z.boolean().parse(data);
  }

  async claimFailedEvent(eventId: string) {
    const { data, error } = await this.client.rpc(
      'claim_failed_commerce_webhook_event',
      {
        p_source: 'printify',
        p_event_id: eventId,
      },
    );
    if (error) throw error;
    const result = z
      .array(z.object({ event_type: z.string(), payload: z.unknown() }))
      .max(1)
      .parse(data ?? [])[0];
    return result
      ? printifyWebhookEventSchema.parse(result.payload)
      : null;
  }

  async completeEvent(eventId: string) {
    await this.finish(eventId, 'processed', null, '');
  }

  async failEvent(eventId: string, code: string, message: string) {
    await this.finish(eventId, 'failed', code, message);
  }

  private async finish(
    eventId: string,
    status: 'processed' | 'failed',
    code: string | null,
    message: string,
  ) {
    const { error } = await this.client.rpc(
      'finish_commerce_webhook_event',
      {
        p_source: 'printify',
        p_event_id: eventId,
        p_status: status,
        p_error_code: code,
        p_error_message: message,
      },
    );
    if (error) throw error;
  }

  async applyTransition(
    input: Parameters<PrintifyWebhookStore['applyTransition']>[0],
  ) {
    const { data, error } = await this.client.rpc(
      'apply_printify_order_transition',
      {
        p_event_id: input.eventId,
        p_printify_order_id: input.printifyOrderId,
        p_next_status: input.nextStatus,
        p_tracking_number: input.trackingNumber,
        p_tracking_carrier: input.trackingCarrier,
        p_tracking_url: input.trackingUrl,
        p_occurred_at: input.occurredAt,
      },
    );
    if (error) throw error;
    const result = z
      .array(transitionResultSchema)
      .length(1)
      .parse(data)[0];
    return {
      outcome: result.outcome,
      orderId: result.order_id,
      previousStatus: result.previous_status,
      currentStatus: result.current_status,
    };
  }
}
