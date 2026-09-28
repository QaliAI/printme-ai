-- Migration 012: Launch fulfillment hardening and notification outbox
-- 1. Updates fulfillment_jobs constraints to permit 'draft' mode and 'manual_review_ready' state.
-- 2. Updates lock_fulfillment_job() RPC to accept 'draft' mode and recognize manual review readiness.
-- 3. Creates commerce_notification_outbox table for durable transactional email tracking and deduplication.

BEGIN;

-- 1. Update fulfillment_jobs mode constraint
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'fulfillment_jobs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%mode%';

  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE fulfillment_jobs DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END $$;

ALTER TABLE fulfillment_jobs
  ADD CONSTRAINT fulfillment_jobs_mode_check
  CHECK (mode IN ('disabled', 'dry-run', 'draft', 'live'));

-- 2. Update fulfillment_jobs state constraint
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'fulfillment_jobs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%state%';

  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE fulfillment_jobs DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END $$;

ALTER TABLE fulfillment_jobs
  ADD CONSTRAINT fulfillment_jobs_state_check
  CHECK (
    state IN (
      'pending_payment',
      'paid',
      'preparing_fulfillment',
      'fulfillment_ready',
      'manual_review_ready',
      'fulfillment_submitting',
      'dry_run_complete',
      'submitted',
      'in_production',
      'shipped',
      'delivered',
      'fulfillment_failed',
      'cancelled',
      'refunded'
    )
  );

-- 3. Update lock_fulfillment_job function
CREATE OR REPLACE FUNCTION lock_fulfillment_job(
  p_order_id UUID,
  p_worker_id TEXT,
  p_mode TEXT
)
RETURNS TABLE(job_id UUID, state TEXT, already_complete BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target fulfillment_jobs%ROWTYPE;
BEGIN
  IF p_mode NOT IN ('dry-run', 'draft', 'live') THEN
    RAISE EXCEPTION 'disabled mode cannot acquire a fulfillment job'
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO target
  FROM fulfillment_jobs
  WHERE order_id = p_order_id
  FOR UPDATE;
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'fulfillment job not found' USING ERRCODE = 'P0002';
  END IF;

  IF target.state IN (
    'dry_run_complete',
    'manual_review_ready',
    'fulfillment_ready',
    'submitted',
    'in_production',
    'shipped',
    'delivered'
  ) THEN
    RETURN QUERY SELECT target.id, target.state, true;
    RETURN;
  END IF;
  IF target.locked_at IS NOT NULL
    AND target.locked_at > now() - interval '5 minutes'
    AND target.locked_by <> p_worker_id THEN
    RAISE EXCEPTION 'fulfillment job is locked'
      USING ERRCODE = '55P03';
  END IF;

  UPDATE fulfillment_jobs
  SET
    mode = p_mode,
    state = 'preparing_fulfillment',
    locked_at = now(),
    locked_by = p_worker_id,
    attempt_count = attempt_count + 1,
    updated_at = now()
  WHERE id = target.id;

  UPDATE orders
  SET
    fulfillment_status = 'preparing_fulfillment',
    updated_at = now()
  WHERE id = p_order_id;

  RETURN QUERY SELECT target.id, 'preparing_fulfillment'::TEXT, false;
END
$$;

-- 4. Create commerce_notification_outbox table
CREATE TABLE IF NOT EXISTS commerce_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_order_id
  ON commerce_notification_outbox (order_id);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status
  ON commerce_notification_outbox (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_idempotency
  ON commerce_notification_outbox (idempotency_key);

ALTER TABLE commerce_notification_outbox ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'commerce_notification_outbox'
      AND policyname = 'service_role_manage_notification_outbox'
  ) THEN
    CREATE POLICY service_role_manage_notification_outbox
      ON commerce_notification_outbox
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
