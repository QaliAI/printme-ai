-- Harden Stripe and Printify webhook receipt, replay, and order transitions.
-- Raw webhook payloads remain service-role-only.

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS orders_printify_order_unique
  ON orders (printify_order_id)
  WHERE printify_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS fulfillment_jobs_printify_order_unique
  ON fulfillment_jobs (printify_order_id)
  WHERE printify_order_id IS NOT NULL;

ALTER TABLE commerce_webhook_events
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replayed_at TIMESTAMPTZ;

ALTER TABLE commerce_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION begin_commerce_webhook_event(
  p_source TEXT,
  p_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  IF p_source NOT IN ('stripe', 'printify')
    OR length(trim(p_event_id)) = 0
    OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'invalid webhook receipt'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO commerce_webhook_events (
    source,
    event_id,
    event_type,
    payload,
    receipt_status,
    processing_attempts,
    last_attempted_at
  ) VALUES (
    p_source,
    p_event_id,
    p_event_type,
    p_payload,
    'processing',
    1,
    now()
  )
  ON CONFLICT (source, event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END
$$;

CREATE OR REPLACE FUNCTION claim_failed_commerce_webhook_event(
  p_source TEXT,
  p_event_id TEXT
)
RETURNS TABLE(event_type TEXT, payload JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  UPDATE commerce_webhook_events event
  SET
    receipt_status = 'processing',
    processing_attempts = event.processing_attempts + 1,
    last_attempted_at = now(),
    replayed_at = now(),
    processed_at = NULL,
    error_code = NULL,
    error_message = NULL
  WHERE event.source = p_source
    AND event.event_id = p_event_id
    AND event.receipt_status = 'failed'
  RETURNING event.event_type, event.payload;
END
$$;

CREATE OR REPLACE FUNCTION finish_commerce_webhook_event(
  p_source TEXT,
  p_event_id TEXT,
  p_status TEXT,
  p_error_code TEXT,
  p_error_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('processed', 'failed') THEN
    RAISE EXCEPTION 'invalid webhook terminal status'
      USING ERRCODE = '23514';
  END IF;
  UPDATE commerce_webhook_events
  SET
    receipt_status = p_status,
    processed_at = CASE WHEN p_status = 'processed' THEN now() ELSE NULL END,
    last_attempted_at = now(),
    error_code = p_error_code,
    error_message = left(p_error_message, 500)
  WHERE source = p_source
    AND event_id = p_event_id
    AND receipt_status = 'processing';
END
$$;

CREATE OR REPLACE FUNCTION apply_printify_order_transition(
  p_event_id TEXT,
  p_printify_order_id TEXT,
  p_next_status TEXT,
  p_tracking_number TEXT,
  p_tracking_carrier TEXT,
  p_tracking_url TEXT,
  p_occurred_at TIMESTAMPTZ
)
RETURNS TABLE(
  outcome TEXT,
  order_id UUID,
  previous_status TEXT,
  current_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_order orders%ROWTYPE;
  old_status TEXT;
  old_rank INTEGER;
  next_rank INTEGER;
  should_apply BOOLEAN := false;
BEGIN
  IF p_next_status NOT IN (
    'submitted',
    'in_production',
    'shipped',
    'delivered',
    'fulfillment_failed',
    'cancelled'
  ) THEN
    RAISE EXCEPTION 'invalid Printify fulfillment status'
      USING ERRCODE = '23514';
  END IF;

  SELECT orders.*
    INTO target_order
  FROM orders
  LEFT JOIN fulfillment_jobs
    ON fulfillment_jobs.order_id = orders.id
  WHERE orders.printify_order_id = p_printify_order_id
    OR fulfillment_jobs.printify_order_id = p_printify_order_id
  ORDER BY orders.created_at
  LIMIT 1
  FOR UPDATE OF orders;

  IF target_order.id IS NULL THEN
    UPDATE commerce_webhook_events
    SET
      receipt_status = 'failed',
      error_code = 'PRINTIFY_ORDER_NOT_FOUND',
      error_message = 'No local order matches the Printify order identifier.',
      last_attempted_at = now()
    WHERE source = 'printify'
      AND event_id = p_event_id
      AND receipt_status = 'processing';
    RETURN QUERY SELECT
      'missing_order'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  old_status := COALESCE(target_order.fulfillment_status, 'pending_payment');
  old_rank := CASE old_status
    WHEN 'pending_payment' THEN 0
    WHEN 'paid' THEN 1
    WHEN 'preparing_fulfillment' THEN 2
    WHEN 'fulfillment_ready' THEN 3
    WHEN 'fulfillment_submitting' THEN 4
    WHEN 'dry_run_complete' THEN 4
    WHEN 'submitted' THEN 5
    WHEN 'in_production' THEN 6
    WHEN 'shipped' THEN 7
    WHEN 'delivered' THEN 8
    ELSE NULL
  END;
  next_rank := CASE p_next_status
    WHEN 'submitted' THEN 5
    WHEN 'in_production' THEN 6
    WHEN 'shipped' THEN 7
    WHEN 'delivered' THEN 8
    ELSE NULL
  END;

  should_apply := CASE
    WHEN old_status = p_next_status THEN false
    WHEN old_status IN ('delivered', 'refunded') THEN false
    WHEN old_status = 'cancelled' THEN false
    WHEN p_next_status = 'cancelled' THEN true
    WHEN p_next_status = 'fulfillment_failed'
      THEN old_status NOT IN ('shipped', 'delivered')
    WHEN old_status = 'fulfillment_failed'
      THEN next_rank >= 5
    WHEN old_rank IS NOT NULL AND next_rank IS NOT NULL
      THEN next_rank > old_rank
    ELSE false
  END;

  IF should_apply THEN
    UPDATE orders
    SET
      fulfillment_status = p_next_status,
      status = CASE p_next_status
        WHEN 'shipped' THEN 'shipped'
        WHEN 'delivered' THEN 'delivered'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'fulfillment_failed' THEN 'failed'
        ELSE 'processing'
      END,
      tracking_number = COALESCE(p_tracking_number, tracking_number),
      tracking_carrier = COALESCE(p_tracking_carrier, tracking_carrier),
      tracking_url = COALESCE(p_tracking_url, tracking_url),
      shipped_at = CASE
        WHEN p_next_status = 'shipped'
          THEN COALESCE(p_occurred_at, shipped_at, now())
        ELSE shipped_at
      END,
      delivered_at = CASE
        WHEN p_next_status = 'delivered'
          THEN COALESCE(p_occurred_at, delivered_at, now())
        ELSE delivered_at
      END,
      updated_at = now()
    WHERE id = target_order.id;

    UPDATE fulfillment_jobs
    SET
      state = p_next_status,
      error_code = CASE
        WHEN p_next_status = 'fulfillment_failed'
          THEN COALESCE(error_code, 'PRINTIFY_REPORTED_FAILURE')
        ELSE NULL
      END,
      error_message = CASE
        WHEN p_next_status = 'fulfillment_failed'
          THEN COALESCE(error_message, 'Printify reported an order failure.')
        ELSE NULL
      END,
      retry_classification = CASE
        WHEN p_next_status = 'fulfillment_failed'
          THEN COALESCE(retry_classification, 'manual_review')
        ELSE NULL
      END,
      completed_at = CASE
        WHEN p_next_status IN ('delivered', 'cancelled') THEN now()
        ELSE completed_at
      END,
      updated_at = now()
    WHERE fulfillment_jobs.order_id = target_order.id;
  END IF;

  UPDATE commerce_webhook_events
  SET
    receipt_status = 'processed',
    order_id = target_order.id,
    processed_at = now(),
    last_attempted_at = now(),
    error_code = NULL,
    error_message = NULL
  WHERE source = 'printify'
    AND event_id = p_event_id
    AND receipt_status = 'processing';

  RETURN QUERY SELECT
    CASE WHEN should_apply THEN 'applied' ELSE 'ignored' END,
    target_order.id,
    old_status,
    CASE WHEN should_apply THEN p_next_status ELSE old_status END;
END
$$;

REVOKE ALL ON FUNCTION begin_commerce_webhook_event(
  TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_failed_commerce_webhook_event(
  TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION finish_commerce_webhook_event(
  TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_printify_order_transition(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
) FROM PUBLIC;

COMMIT;

-- Rollback:
-- BEGIN;
-- DROP FUNCTION IF EXISTS apply_printify_order_transition(
--   TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ
-- );
-- DROP FUNCTION IF EXISTS claim_failed_commerce_webhook_event(TEXT, TEXT);
-- ALTER TABLE commerce_webhook_events
--   DROP COLUMN IF EXISTS replayed_at,
--   DROP COLUMN IF EXISTS last_attempted_at;
-- ALTER TABLE orders
--   DROP COLUMN IF EXISTS delivered_at,
--   DROP COLUMN IF EXISTS shipped_at,
--   DROP COLUMN IF EXISTS tracking_url,
--   DROP COLUMN IF EXISTS tracking_carrier,
--   DROP COLUMN IF EXISTS tracking_number;
-- DROP INDEX IF EXISTS fulfillment_jobs_printify_order_unique;
-- DROP INDEX IF EXISTS orders_printify_order_unique;
-- COMMIT;
