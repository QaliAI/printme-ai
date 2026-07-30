import 'server-only';

import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { cartConfigurationSnapshotSchema } from '../snapshot';
import { fulfillmentOrderSchema } from './payload';
import type {
  FulfillmentJob,
  FulfillmentMode,
  FulfillmentStore,
} from './service';

const jobRowSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  state: z.string(),
  mode: z.enum(['disabled', 'dry-run', 'live']),
  printify_order_id: z.string().nullable(),
  production_submitted_at: z.string().nullable().optional(),
});

function toJob(value: unknown): FulfillmentJob {
  const row = jobRowSchema.parse(value);
  return {
    id: row.id,
    orderId: row.order_id,
    state: row.state,
    mode: row.mode,
    printifyOrderId: row.printify_order_id,
    productionSubmittedAt: row.production_submitted_at ?? null,
  };
}

function assertFulfillmentPersistence() {
  if (
    process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true' ||
    process.env.COMMERCE_CHECKOUT_ENABLED !== 'true'
  ) {
    throw new Error('Fulfillment persistence is disabled.');
  }
}

export class SupabaseFulfillmentStore implements FulfillmentStore {
  private get client() {
    assertFulfillmentPersistence();
    return getSupabaseAdminClient();
  }

  async loadPaidOrder(orderId: string) {
    const { data, error } = await this.client
      .from('orders')
      .select(
        'id,payment_status,customer_email,shipping_address,printify_order_id,production_submitted_at,order_items(configuration_snapshot)',
      )
      .eq('id', orderId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = z
      .object({
        id: z.string().uuid(),
        payment_status: z.string(),
        customer_email: z.string().nullable(),
        shipping_address: z.unknown(),
        printify_order_id: z.string().nullable(),
        production_submitted_at: z.string().nullable(),
        order_items: z.array(
          z.object({ configuration_snapshot: z.unknown() }),
        ),
      })
      .parse(data);
    if (row.payment_status !== 'paid' || !row.customer_email) return null;
    return fulfillmentOrderSchema.parse({
      id: row.id,
      paymentStatus: row.payment_status,
      customerEmail: row.customer_email,
      shippingAddress: row.shipping_address,
      items: row.order_items.map((item) =>
        cartConfigurationSnapshotSchema.parse(item.configuration_snapshot),
      ),
      printifyOrderId: row.printify_order_id,
      productionSubmittedAt: row.production_submitted_at,
    });
  }

  async findJob(orderId: string) {
    const { data, error } = await this.client
      .from('fulfillment_jobs')
      .select(
        'id,order_id,state,mode,printify_order_id,production_submitted_at',
      )
      .eq('order_id', orderId)
      .maybeSingle();
    if (error) throw error;
    return data ? toJob(data) : null;
  }

  async lockJob(input: Parameters<FulfillmentStore['lockJob']>[0]) {
    const { data, error } = await this.client.rpc(
      'lock_fulfillment_job',
      {
        p_order_id: input.orderId,
        p_worker_id: input.workerId,
        p_mode: input.mode,
      },
    );
    if (error) throw error;
    const result = z
      .array(
        z.object({
          job_id: z.string().uuid(),
          state: z.string(),
          already_complete: z.boolean(),
        }),
      )
      .min(1)
      .parse(data)[0];
    const job =
      (await this.findJob(input.orderId)) ??
      ({
        id: result.job_id,
        orderId: input.orderId,
        state: result.state,
        mode: input.mode,
        printifyOrderId: null,
        productionSubmittedAt: null,
      } satisfies FulfillmentJob);
    return { job, alreadyComplete: result.already_complete };
  }

  async completeDryRun(
    input: Parameters<FulfillmentStore['completeDryRun']>[0],
  ) {
    await this.updatePreparedJob(
      input,
      'dry_run_complete',
      'dry_run_complete',
    );
  }

  async markReady(input: Parameters<FulfillmentStore['markReady']>[0]) {
    await this.updatePreparedJob(
      input,
      'fulfillment_ready',
      'fulfillment_ready',
    );
  }

  private async updatePreparedJob(
    input: {
      jobId: string;
      orderId: string;
      payloadHash: string;
      redactedPayload: unknown;
    },
    jobState: string,
    orderState: string,
  ) {
    const { error: jobError } = await this.client
      .from('fulfillment_jobs')
      .update({
        state: jobState,
        payload_hash: input.payloadHash,
        redacted_payload: input.redactedPayload,
        locked_at: null,
        locked_by: null,
        completed_at:
          jobState === 'dry_run_complete' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.jobId)
      .eq('order_id', input.orderId);
    if (jobError) throw jobError;
    const { error: orderError } = await this.client
      .from('orders')
      .update({ fulfillment_status: orderState })
      .eq('id', input.orderId);
    if (orderError) throw orderError;
  }

  async markFailed(input: Parameters<FulfillmentStore['markFailed']>[0]) {
    const { error: jobError } = await this.client
      .from('fulfillment_jobs')
      .update({
        state: 'fulfillment_failed',
        error_code: input.errorCode,
        error_message: input.errorMessage.slice(0, 500),
        retry_classification: input.retryClassification,
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.jobId)
      .eq('order_id', input.orderId);
    if (jobError) throw jobError;
    if (
      input.retryClassification ===
      'manual_review_uncertain_submission'
    ) {
      const { error: attemptError } = await this.client
        .from('fulfillment_attempts')
        .update({
          outcome: 'uncertain',
          retry_classification: input.retryClassification,
          error_code: input.errorCode,
        })
        .eq('fulfillment_job_id', input.jobId)
        .eq('outcome', 'started');
      if (attemptError) throw attemptError;
    }
    const { error: orderError } = await this.client
      .from('orders')
      .update({ fulfillment_status: 'fulfillment_failed' })
      .eq('id', input.orderId);
    if (orderError) throw orderError;
  }

  async markSubmitting(jobId: string, externalRequestId: string) {
    const { data, error } = await this.client
      .from('fulfillment_jobs')
      .update({
        state: 'fulfillment_submitting',
        external_request_id: externalRequestId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('state', 'fulfillment_ready')
      .select('attempt_count')
      .single();
    if (error) throw error;
    const attempt = z
      .object({ attempt_count: z.number().int().positive() })
      .parse(data);
    const { error: attemptError } = await this.client
      .from('fulfillment_attempts')
      .insert({
        fulfillment_job_id: jobId,
        attempt_number: attempt.attempt_count,
        action: 'send_to_production',
        external_request_id: externalRequestId,
        outcome: 'started',
      });
    if (attemptError) throw attemptError;
  }

  async markSubmitted(jobId: string, orderId: string) {
    const submittedAt = new Date().toISOString();
    const { error: jobError } = await this.client
      .from('fulfillment_jobs')
      .update({
        state: 'submitted',
        production_submitted_at: submittedAt,
        updated_at: submittedAt,
      })
      .eq('id', jobId)
      .eq('state', 'fulfillment_submitting');
    if (jobError) throw jobError;
    const { error: attemptError } = await this.client
      .from('fulfillment_attempts')
      .update({ outcome: 'succeeded' })
      .eq('fulfillment_job_id', jobId)
      .eq('action', 'send_to_production')
      .eq('outcome', 'started');
    if (attemptError) throw attemptError;
    const { error: orderError } = await this.client
      .from('orders')
      .update({
        fulfillment_status: 'submitted',
        production_submitted_at: submittedAt,
      })
      .eq('id', orderId);
    if (orderError) throw orderError;
  }

  async listOperationalJobs(states?: string[]) {
    let query = this.client
      .from('fulfillment_jobs')
      .select(
        'id,order_id,state,mode,attempt_count,retry_classification,error_code,updated_at',
      )
      .order('updated_at', { ascending: true })
      .limit(100);
    if (states?.length) query = query.in('state', states);
    const { data, error } = await query;
    if (error) throw error;
    return z
      .array(
        z.object({
          id: z.string().uuid(),
          order_id: z.string().uuid(),
          state: z.string(),
          mode: z.custom<FulfillmentMode>(),
          attempt_count: z.number().int(),
          retry_classification: z.string().nullable(),
          error_code: z.string().nullable(),
          updated_at: z.string(),
        }),
      )
      .parse(data ?? []);
  }
}
