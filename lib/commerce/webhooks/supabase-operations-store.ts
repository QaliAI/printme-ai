import 'server-only';

import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const sourceSchema = z.enum(['stripe', 'printify']);
export type CommerceWebhookSource = z.infer<typeof sourceSchema>;

export class SupabaseWebhookOperationsStore {
  private get client() {
    if (process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true') {
      throw new Error('Webhook persistence is disabled.');
    }
    return getSupabaseAdminClient();
  }

  async list(input: {
    source?: CommerceWebhookSource;
    status?: 'received' | 'processing' | 'processed' | 'failed';
  }) {
    let query = this.client
      .from('commerce_webhook_events')
      .select(
        'source,event_id,event_type,receipt_status,processing_attempts,error_code,error_message,received_at,last_attempted_at,replayed_at,order_id',
      )
      .order('received_at', { ascending: false })
      .limit(100);
    if (input.source) query = query.eq('source', input.source);
    if (input.status) query = query.eq('receipt_status', input.status);
    const { data, error } = await query;
    if (error) throw error;
    return z
      .array(
        z.object({
          source: sourceSchema,
          event_id: z.string(),
          event_type: z.string(),
          receipt_status: z.enum([
            'received',
            'processing',
            'processed',
            'failed',
          ]),
          processing_attempts: z.number().int().nonnegative(),
          error_code: z.string().nullable(),
          error_message: z.string().nullable(),
          received_at: z.string(),
          last_attempted_at: z.string().nullable(),
          replayed_at: z.string().nullable(),
          order_id: z.string().uuid().nullable(),
        }),
      )
      .parse(data ?? []);
  }
}
