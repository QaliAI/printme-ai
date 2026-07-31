import 'server-only';

import { randomUUID } from 'node:crypto';
import {
  buildPrintifyFulfillmentPayload,
  FulfillmentValidationError,
  hashFulfillmentPayload,
  redactFulfillmentPayload,
  type FulfillmentOrder,
} from './payload';

export type FulfillmentMode = 'disabled' | 'dry-run' | 'live';
export type RetryClassification =
  | 'not_retryable'
  | 'retryable_before_submission'
  | 'manual_review_uncertain_submission';

export interface FulfillmentJob {
  id: string;
  orderId: string;
  state: string;
  mode: FulfillmentMode;
  printifyOrderId: string | null;
  productionSubmittedAt: string | null;
}

export interface FulfillmentStore {
  loadPaidOrder(orderId: string): Promise<FulfillmentOrder | null>;
  findJob(orderId: string): Promise<FulfillmentJob | null>;
  lockJob(input: {
    orderId: string;
    workerId: string;
    mode: Exclude<FulfillmentMode, 'disabled'>;
  }): Promise<{ job: FulfillmentJob; alreadyComplete: boolean }>;
  completeDryRun(input: {
    jobId: string;
    orderId: string;
    payloadHash: string;
    redactedPayload: unknown;
  }): Promise<void>;
  markReady(input: {
    jobId: string;
    orderId: string;
    payloadHash: string;
    redactedPayload: unknown;
  }): Promise<void>;
  markFailed(input: {
    jobId: string;
    orderId: string;
    errorCode: string;
    errorMessage: string;
    retryClassification: RetryClassification;
  }): Promise<void>;
  markSubmitting(jobId: string, externalRequestId: string): Promise<void>;
  markSubmitted(jobId: string, orderId: string): Promise<void>;
}

export interface PrintifyProductionGateway {
  sendOrderToProduction(printifyOrderId: string): Promise<void>;
}

export class FulfillmentModeError extends Error {
  constructor(readonly code: string) {
    super(`Fulfillment mode error: ${code}.`);
    this.name = 'FulfillmentModeError';
  }
}

export function getFulfillmentMode(): FulfillmentMode {
  const value = process.env.PRINTIFY_FULFILLMENT_MODE ?? 'disabled';
  if (value === 'disabled' || value === 'dry-run' || value === 'live') {
    return value;
  }
  throw new FulfillmentModeError('INVALID_FULFILLMENT_MODE');
}

export function classifyFulfillmentFailure(
  error: unknown,
): RetryClassification {
  if (error instanceof FulfillmentValidationError) return 'not_retryable';
  if (
    error instanceof Error &&
    /timeout|network|unknown response/i.test(error.message)
  ) {
    return 'manual_review_uncertain_submission';
  }
  return 'retryable_before_submission';
}

export class PrintifyFulfillmentService {
  constructor(
    private readonly store: FulfillmentStore,
    private readonly productionGateway?: PrintifyProductionGateway,
    private readonly workerId: () => string = () => randomUUID(),
  ) {}

  async prepare(orderId: string) {
    const mode = getFulfillmentMode();
    if (mode === 'disabled') {
      throw new FulfillmentModeError('FULFILLMENT_DISABLED');
    }

    const order = await this.store.loadPaidOrder(orderId);
    if (!order) {
      throw new FulfillmentValidationError('PAID_ORDER_REQUIRED');
    }
    const lock = await this.store.lockJob({
      orderId,
      workerId: this.workerId(),
      mode,
    });
    if (lock.alreadyComplete) return lock.job;

    try {
      const payload = buildPrintifyFulfillmentPayload(order);
      const payloadHash = hashFulfillmentPayload(payload);
      const redactedPayload = redactFulfillmentPayload(payload);
      if (mode === 'dry-run') {
        await this.store.completeDryRun({
          jobId: lock.job.id,
          orderId,
          payloadHash,
          redactedPayload,
        });
        return { ...lock.job, state: 'dry_run_complete', mode };
      }

      await this.store.markReady({
        jobId: lock.job.id,
        orderId,
        payloadHash,
        redactedPayload,
      });
      return { ...lock.job, state: 'fulfillment_ready', mode };
    } catch (error) {
      await this.store.markFailed({
        jobId: lock.job.id,
        orderId,
        errorCode:
          error instanceof FulfillmentValidationError
            ? error.code
            : 'FULFILLMENT_PREPARATION_FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown fulfillment error.',
        retryClassification: classifyFulfillmentFailure(error),
      });
      throw error;
    }
  }

  async submitExistingOrderToProduction(orderId: string) {
    if (getFulfillmentMode() !== 'live') {
      throw new FulfillmentModeError('LIVE_MODE_REQUIRED');
    }
    if (!this.productionGateway) {
      throw new FulfillmentModeError('PRODUCTION_GATEWAY_UNAVAILABLE');
    }
    const [order, job] = await Promise.all([
      this.store.loadPaidOrder(orderId),
      this.store.findJob(orderId),
    ]);
    if (!order) {
      throw new FulfillmentValidationError('PAID_ORDER_REQUIRED');
    }
    if (!job || job.state !== 'fulfillment_ready') {
      throw new FulfillmentValidationError('FULFILLMENT_NOT_READY');
    }
    const printifyOrderId = order.printifyOrderId ?? job.printifyOrderId;
    if (!printifyOrderId) {
      throw new FulfillmentValidationError(
        'PRINTIFY_ORDER_ID_REQUIRED',
      );
    }
    if (order.productionSubmittedAt ?? job.productionSubmittedAt) {
      throw new FulfillmentValidationError(
        'DUPLICATE_PRODUCTION_SUBMISSION',
      );
    }

    const requestId = randomUUID();
    await this.store.markSubmitting(job.id, requestId);
    try {
      await this.productionGateway.sendOrderToProduction(printifyOrderId);
      await this.store.markSubmitted(job.id, orderId);
    } catch (error) {
      await this.store.markFailed({
        jobId: job.id,
        orderId,
        errorCode: 'PRODUCTION_SUBMISSION_UNCERTAIN',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown submission error.',
        retryClassification: 'manual_review_uncertain_submission',
      });
      throw error;
    }
  }
}
