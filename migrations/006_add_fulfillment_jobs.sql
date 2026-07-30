-- Idempotent Printify fulfillment state machine.
-- This schema does not call Printify. Application mode defaults to disabled.

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT
    NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS production_submitted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS fulfillment_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  triggering_event_id TEXT,
  mode TEXT NOT NULL DEFAULT 'disabled'
    CHECK (mode IN ('disabled', 'dry-run', 'live')),
  state TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (
      state IN (
        'pending_payment',
        'paid',
        'preparing_fulfillment',
        'fulfillment_ready',
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
    ),
  payload_hash TEXT,
  redacted_payload JSONB,
  printify_order_id TEXT,
  production_submitted_at TIMESTAMPTZ,
  external_request_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  retry_classification TEXT,
  error_code TEXT,
  error_message TEXT,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (attempt_count >= 0)
);

CREATE TABLE IF NOT EXISTS fulfillment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfillment_job_id UUID NOT NULL
    REFERENCES fulfillment_jobs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  external_request_id TEXT,
  request_payload_redacted JSONB,
  response_payload_redacted JSONB,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('started', 'succeeded', 'failed', 'uncertain')),
  retry_classification TEXT,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fulfillment_job_id, attempt_number, action)
);

CREATE INDEX IF NOT EXISTS fulfillment_jobs_operations_idx
  ON fulfillment_jobs (state, retry_classification, updated_at);

CREATE OR REPLACE FUNCTION ensure_paid_order_fulfillment_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.payment_status = 'paid'
    AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    INSERT INTO fulfillment_jobs (
      order_id,
      idempotency_key,
      triggering_event_id,
      mode,
      state
    ) VALUES (
      NEW.id,
      'printify-order:' || NEW.id::text,
      NEW.stripe_event_id,
      'disabled',
      'paid'
    )
    ON CONFLICT (order_id) DO NOTHING;
    NEW.fulfillment_status := 'paid';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS orders_create_fulfillment_job ON orders;
CREATE TRIGGER orders_create_fulfillment_job
BEFORE UPDATE OF payment_status ON orders
FOR EACH ROW
EXECUTE FUNCTION ensure_paid_order_fulfillment_job();

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
  IF p_mode NOT IN ('dry-run', 'live') THEN
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
  SET fulfillment_status = 'preparing_fulfillment'
  WHERE id = p_order_id;

  RETURN QUERY
    SELECT target.id, 'preparing_fulfillment'::TEXT, false;
END
$$;

REVOKE ALL ON FUNCTION lock_fulfillment_job(UUID, TEXT, TEXT) FROM PUBLIC;

COMMIT;

-- Rollback:
-- BEGIN;
-- DROP FUNCTION IF EXISTS lock_fulfillment_job(UUID, TEXT, TEXT);
-- DROP TRIGGER IF EXISTS orders_create_fulfillment_job ON orders;
-- DROP FUNCTION IF EXISTS ensure_paid_order_fulfillment_job();
-- DROP TABLE IF EXISTS fulfillment_attempts;
-- DROP TABLE IF EXISTS fulfillment_jobs;
-- ALTER TABLE orders
--   DROP COLUMN IF EXISTS production_submitted_at,
--   DROP COLUMN IF EXISTS fulfillment_status;
-- COMMIT;
