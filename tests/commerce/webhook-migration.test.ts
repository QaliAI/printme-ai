import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL(
    '../../migrations/007_harden_commerce_webhooks.sql',
    import.meta.url,
  ),
  'utf8',
);

describe('hardened commerce webhook migration contract', () => {
  it('keeps raw payloads protected and makes failed events claimable', () => {
    expect(migration).toContain(
      'commerce_webhook_events ENABLE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'claim_failed_commerce_webhook_event',
    );
    expect(migration).toContain(
      "AND event.receipt_status = 'failed'",
    );
    expect(migration).toContain(
      'processing_attempts = event.processing_attempts + 1',
    );
  });

  it('applies tracking and monotonic Printify transitions atomically', () => {
    expect(migration).toContain('apply_printify_order_transition');
    expect(migration).toContain('tracking_number');
    expect(migration).toContain('tracking_carrier');
    expect(migration).toContain('tracking_url');
    expect(migration).toContain('orders_printify_order_unique');
    expect(migration).toContain('fulfillment_jobs_printify_order_unique');
    expect(migration).toContain('next_rank > old_rank');
    expect(migration).toContain('FOR UPDATE OF orders');
  });
});
