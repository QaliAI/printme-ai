-- Depends on reconciled commerce schema through 014. No provider calls.
BEGIN;

CREATE TABLE IF NOT EXISTS commerce_payment_holds (
  payment_intent_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL CHECK (reason IN ('refund', 'dispute')),
  refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  last_event_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE commerce_payment_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE commerce_payment_holds FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE commerce_payment_holds TO service_role;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commerce_hold_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_amount INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_intent_unique
  ON orders(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Holds are conservative and sticky, including failed refunds and won disputes.
-- Clearing one requires a separately reviewed merchant reconciliation, never an
-- old checkout event. This also protects a refund delivered before settlement.
CREATE OR REPLACE FUNCTION protect_commerce_order_payment()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE hold commerce_payment_holds%ROWTYPE;
BEGIN
  SELECT * INTO hold FROM commerce_payment_holds
    WHERE payment_intent_id = NEW.stripe_payment_intent_id;
  IF hold.payment_intent_id IS NOT NULL THEN
    NEW.commerce_hold_reason := hold.reason;
    NEW.refunded_amount := greatest(NEW.refunded_amount, hold.refunded_amount);
    NEW.payment_status := CASE
      WHEN hold.reason = 'dispute' THEN 'disputed'
      WHEN NEW.paid_amount > 0 AND hold.refunded_amount >= NEW.paid_amount THEN 'refunded'
      WHEN hold.refunded_amount > 0 THEN 'partially_refunded'
      ELSE 'refund_pending' END;
    NEW.fulfillment_status := 'cancelled';
    NEW.processing_status := 'payment_hold';
  ELSIF OLD.commerce_hold_reason IS NOT NULL THEN
    RAISE EXCEPTION 'payment hold requires reconciliation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
-- Alphabetical BEFORE trigger ordering: apply the hold after the legacy paid
-- job trigger. The settlement RPC cancels that job in the same transaction.
DROP TRIGGER IF EXISTS zz_orders_payment_hold ON orders;
CREATE TRIGGER zz_orders_payment_hold BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION protect_commerce_order_payment();

CREATE OR REPLACE FUNCTION record_stripe_payment_hold(
  p_event_id TEXT, p_payment_intent_id TEXT, p_reason TEXT, p_refunded_amount INTEGER
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE target_id UUID;
BEGIN
  IF coalesce(p_payment_intent_id, '') = '' OR p_reason NOT IN ('refund', 'dispute')
    OR p_reason IS NULL OR p_refunded_amount IS NULL OR p_refunded_amount < 0 THEN
    RAISE EXCEPTION 'invalid payment hold' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_payment_intent_id, 0));
  INSERT INTO commerce_payment_holds(payment_intent_id, reason, refunded_amount, last_event_id)
    VALUES (p_payment_intent_id, p_reason, p_refunded_amount, p_event_id)
  ON CONFLICT (payment_intent_id) DO UPDATE SET
    reason = CASE WHEN commerce_payment_holds.reason = 'dispute' THEN 'dispute' ELSE EXCLUDED.reason END,
    refunded_amount = greatest(commerce_payment_holds.refunded_amount, EXCLUDED.refunded_amount),
    last_event_id = EXCLUDED.last_event_id, updated_at = now();
  UPDATE orders SET updated_at = now()
    WHERE stripe_payment_intent_id = p_payment_intent_id RETURNING id INTO target_id;
  UPDATE fulfillment_jobs SET state = 'cancelled', locked_at = NULL, locked_by = NULL,
    error_code = 'PAYMENT_HOLD', retry_classification = 'not_retryable', updated_at = now()
    WHERE order_id = target_id;
  UPDATE commerce_webhook_events SET receipt_status = 'processed', order_id = target_id,
    processed_at = now(), error_code = NULL, error_message = NULL
    WHERE source = 'stripe' AND event_id = p_event_id;
END $$;
REVOKE ALL ON FUNCTION record_stripe_payment_hold(TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_stripe_payment_hold(TEXT, TEXT, TEXT, INTEGER) TO service_role;

-- Expired/failed checkout releases the pending cart attempt, never a paid order.
CREATE OR REPLACE FUNCTION close_commerce_checkout(p_event_id TEXT, p_session_id TEXT, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE target orders%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR p_reason NOT IN ('expired','payment_failed') THEN
    RAISE EXCEPTION 'invalid checkout closure' USING ERRCODE = '23514';
  END IF;
  SELECT o.* INTO target FROM orders o JOIN commerce_checkout_sessions c ON c.order_id=o.id
    WHERE c.stripe_session_id=p_session_id FOR UPDATE OF o;
  IF target.id IS NULL THEN RAISE EXCEPTION 'checkout order not found' USING ERRCODE = 'P0002'; END IF;
  IF target.payment_status='unpaid' THEN
    UPDATE commerce_checkout_sessions SET status=CASE WHEN p_reason='expired' THEN 'cancelled' ELSE 'failed' END,
      updated_at=now() WHERE order_id=target.id;
    UPDATE orders SET status='cancelled',processing_status='checkout_closed',fulfillment_status='cancelled',updated_at=now()
      WHERE id=target.id;
  END IF;
  UPDATE commerce_webhook_events SET receipt_status='processed',order_id=target.id,processed_at=now(),error_code=NULL,error_message=NULL
    WHERE source='stripe' AND event_id=p_event_id;
END $$;
REVOKE ALL ON FUNCTION close_commerce_checkout(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_commerce_checkout(TEXT, TEXT, TEXT) TO service_role;

-- Refuse a 2xx duplicate acknowledgement while the original worker is active.
-- A crashed worker becomes claimable after five minutes.
CREATE OR REPLACE FUNCTION begin_commerce_webhook_event(
  p_source TEXT, p_event_id TEXT, p_event_type TEXT, p_payload JSONB
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE inserted_count INTEGER;
BEGIN
  IF p_source NOT IN ('stripe', 'printify') OR coalesce(p_event_id, '') = ''
    OR coalesce(p_event_type, '') = '' THEN
    RAISE EXCEPTION 'invalid webhook receipt' USING ERRCODE = '23514';
  END IF;
  INSERT INTO commerce_webhook_events(source,event_id,event_type,payload,receipt_status,processing_attempts,last_attempted_at)
    VALUES(p_source,p_event_id,p_event_type,p_payload,'processing',1,now())
    ON CONFLICT(source,event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 AND EXISTS (SELECT 1 FROM commerce_webhook_events
    WHERE source = p_source AND event_id = p_event_id AND receipt_status = 'processing'
      AND last_attempted_at > now() - interval '5 minutes') THEN
    RAISE EXCEPTION 'webhook processing in progress' USING ERRCODE = '55P03';
  END IF;
  RETURN inserted_count = 1;
END $$;

CREATE OR REPLACE FUNCTION claim_failed_commerce_webhook_event(p_source TEXT, p_event_id TEXT)
RETURNS TABLE(event_type TEXT, payload JSONB)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  RETURN QUERY UPDATE commerce_webhook_events event SET receipt_status = 'processing',
    processing_attempts = event.processing_attempts + 1, last_attempted_at = now(),
    replayed_at = now(), processed_at = NULL, error_code = NULL, error_message = NULL
  WHERE event.source = p_source AND event.event_id = p_event_id
    AND (event.receipt_status = 'failed' OR (event.receipt_status = 'processing'
      AND coalesce(event.last_attempted_at, event.received_at) <= now() - interval '5 minutes'))
  RETURNING event.event_type, event.payload;
END $$;

CREATE OR REPLACE FUNCTION lock_fulfillment_job(p_order_id UUID, p_worker_id TEXT, p_mode TEXT)
RETURNS TABLE(job_id UUID, state TEXT, already_complete BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE target fulfillment_jobs%ROWTYPE; paid orders%ROWTYPE;
BEGIN
  SELECT * INTO paid FROM orders WHERE id = p_order_id FOR UPDATE;
  IF paid.payment_status IS DISTINCT FROM 'paid' OR paid.commerce_hold_reason IS NOT NULL
    OR paid.status = 'cancelled' OR paid.fulfillment_status IN ('cancelled', 'refunded') THEN
    RAISE EXCEPTION 'paid unheld order required' USING ERRCODE = '23514';
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('dry-run', 'draft', 'live') THEN
    RAISE EXCEPTION 'invalid fulfillment mode' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO target FROM fulfillment_jobs WHERE order_id = p_order_id FOR UPDATE;
  IF target.id IS NULL THEN RAISE EXCEPTION 'fulfillment job not found' USING ERRCODE = 'P0002'; END IF;
  IF target.state IN ('dry_run_complete','manual_review_ready','fulfillment_ready','submitted','in_production','shipped','delivered') THEN
    RETURN QUERY SELECT target.id, target.state, true; RETURN;
  END IF;
  IF target.state NOT IN ('paid', 'fulfillment_failed')
    OR (target.state = 'fulfillment_failed' AND target.retry_classification IS DISTINCT FROM 'retryable_before_submission')
    OR target.printify_order_id IS NOT NULL OR target.production_submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'fulfillment requires manual reconciliation' USING ERRCODE = '23514';
  END IF;
  UPDATE fulfillment_jobs SET mode = p_mode, state = 'preparing_fulfillment',
    locked_at = now(), locked_by = p_worker_id, attempt_count = attempt_count + 1,
    error_code = NULL, error_message = NULL, updated_at = now() WHERE id = target.id;
  UPDATE orders SET fulfillment_status = 'preparing_fulfillment' WHERE id = p_order_id;
  RETURN QUERY SELECT target.id, 'preparing_fulfillment'::TEXT, false;
END $$;

-- All provider write admission is atomic with the paid/hold check.
CREATE OR REPLACE FUNCTION begin_commerce_production_submission(p_job_id UUID, p_request_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE target fulfillment_jobs%ROWTYPE; paid orders%ROWTYPE;
BEGIN
  SELECT o.* INTO paid FROM orders o JOIN fulfillment_jobs j ON j.order_id=o.id WHERE j.id=p_job_id FOR UPDATE OF o;
  IF paid.payment_status IS DISTINCT FROM 'paid' OR paid.commerce_hold_reason IS NOT NULL
    OR paid.status='cancelled' OR paid.fulfillment_status IN ('cancelled','refunded') THEN
    RAISE EXCEPTION 'paid unheld order required' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO target FROM fulfillment_jobs WHERE id=p_job_id FOR UPDATE;
  IF target.state NOT IN ('fulfillment_ready','manual_review_ready') OR target.printify_order_id IS NULL
    OR target.production_submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'fulfillment not ready' USING ERRCODE = '23514';
  END IF;
  UPDATE fulfillment_jobs SET state='fulfillment_submitting', external_request_id=p_request_id, updated_at=now() WHERE id=p_job_id;
  INSERT INTO fulfillment_attempts(fulfillment_job_id,attempt_number,action,external_request_id,outcome)
    VALUES(p_job_id,target.attempt_count,'send_to_production',p_request_id,'started');
END $$;
REVOKE ALL ON FUNCTION begin_commerce_production_submission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION begin_commerce_production_submission(UUID, TEXT) TO service_role;

-- A late worker/provider event cannot revive a cancelled or financially held job.
CREATE OR REPLACE FUNCTION protect_commerce_fulfillment_job()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.state <> 'cancelled' AND EXISTS (SELECT 1 FROM orders WHERE id=NEW.order_id
    AND (payment_status <> 'paid' OR commerce_hold_reason IS NOT NULL OR status='cancelled'
      OR fulfillment_status IN ('cancelled','refunded'))) THEN
    NEW.state := 'cancelled'; NEW.error_code := 'PAYMENT_HOLD';
    NEW.retry_classification := 'not_retryable';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fulfillment_payment_guard ON fulfillment_jobs;
CREATE TRIGGER fulfillment_payment_guard BEFORE UPDATE ON fulfillment_jobs
  FOR EACH ROW EXECUTE FUNCTION protect_commerce_fulfillment_job();

CREATE OR REPLACE FUNCTION complete_stripe_checkout_payment(
  p_event_id TEXT,
  p_stripe_session_id TEXT,
  p_payment_intent_id TEXT,
  p_customer_email TEXT,
  p_shipping_address JSONB,
  p_paid_amount INTEGER,
  p_currency TEXT,
  p_amount_subtotal INTEGER,
  p_amount_shipping INTEGER,
  p_amount_tax INTEGER,
  p_amount_discount INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_order orders%ROWTYPE;
BEGIN
  IF coalesce(p_payment_intent_id, '') = '' THEN
    RAISE EXCEPTION 'payment intent required' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_payment_intent_id, 0));
  SELECT orders.*
    INTO target_order
  FROM orders
  JOIN commerce_checkout_sessions checkout
    ON checkout.order_id = orders.id
  WHERE checkout.stripe_session_id = p_stripe_session_id
  FOR UPDATE OF orders;

  IF target_order.id IS NULL THEN
    RAISE EXCEPTION 'checkout order not found' USING ERRCODE = 'P0002';
  END IF;
  -- Already paid: a replay of the same payment settles the event and changes
  -- nothing else; any other payment for this order is a double charge and is
  -- left for a human (the event stays failed and replayable).
  IF target_order.payment_status <> 'unpaid' THEN
    IF target_order.stripe_payment_intent_id IS DISTINCT FROM p_payment_intent_id THEN
      RAISE EXCEPTION 'order already paid by another payment'
        USING ERRCODE = '23505';
    END IF;
    UPDATE commerce_webhook_events
    SET
      receipt_status = 'processed',
      order_id = target_order.id,
      processed_at = now(),
      error_code = NULL,
      error_message = NULL
    WHERE source = 'stripe' AND event_id = p_event_id;
    RETURN target_order.id;
  END IF;
  IF upper(target_order.currency) <> upper(p_currency) THEN
    RAISE EXCEPTION 'paid currency mismatch' USING ERRCODE = '23514';
  END IF;
  IF p_paid_amount IS NULL OR p_paid_amount < 0
    OR p_amount_subtotal IS NULL OR p_amount_subtotal < 0
    OR p_amount_shipping IS NULL OR p_amount_shipping < 0
    OR p_amount_tax IS NULL OR p_amount_tax < 0
    OR p_amount_discount IS NULL OR p_amount_discount < 0 THEN
    RAISE EXCEPTION 'incomplete payment totals' USING ERRCODE = '23514';
  END IF;
  IF p_amount_subtotal <> target_order.subtotal::INTEGER THEN
    RAISE EXCEPTION 'paid subtotal mismatch' USING ERRCODE = '23514';
  END IF;
  IF p_amount_shipping <> COALESCE(target_order.shipping, 0)::INTEGER THEN
    RAISE EXCEPTION 'paid shipping mismatch' USING ERRCODE = '23514';
  END IF;
  IF p_amount_discount <> 0 THEN
    RAISE EXCEPTION 'unexpected discount' USING ERRCODE = '23514';
  END IF;
  IF p_amount_tax > p_amount_subtotal + p_amount_shipping THEN
    RAISE EXCEPTION 'tax out of range' USING ERRCODE = '23514';
  END IF;
  IF p_paid_amount <> p_amount_subtotal + p_amount_shipping + p_amount_tax THEN
    RAISE EXCEPTION 'paid amount mismatch' USING ERRCODE = '23514';
  END IF;
  IF p_shipping_address IS NULL
    OR COALESCE(p_shipping_address->>'line1', '') = ''
    OR COALESCE(p_shipping_address->>'city', '') = ''
    OR COALESCE(p_shipping_address->>'postal_code', '') = ''
    OR COALESCE(p_shipping_address->>'country', '') = '' THEN
    RAISE EXCEPTION 'complete shipping address required'
      USING ERRCODE = '23514';
  END IF;

  UPDATE orders
  SET
    status = 'paid',
    payment_status = 'paid',
    processing_status = 'paid',
    stripe_payment_intent_id = p_payment_intent_id,
    customer_email = p_customer_email,
    shipping_address = p_shipping_address,
    tax = p_amount_tax,
    total = p_paid_amount,
    paid_amount = p_paid_amount,
    stripe_event_id = p_event_id,
    updated_at = now()
  WHERE id = target_order.id;

  IF target_order.status = 'cancelled' OR target_order.fulfillment_status = 'cancelled' THEN
    UPDATE orders SET status='needs_review',processing_status='payment_after_checkout_closed',fulfillment_status='cancelled'
      WHERE id=target_order.id;
    UPDATE fulfillment_jobs SET state='cancelled',error_code='PAYMENT_AFTER_CHECKOUT_CLOSED',retry_classification='not_retryable'
      WHERE order_id=target_order.id;
  END IF;

  UPDATE fulfillment_jobs SET state = 'cancelled', error_code = 'PAYMENT_HOLD',
    retry_classification = 'not_retryable', updated_at = now()
    WHERE order_id = target_order.id AND EXISTS (
      SELECT 1 FROM orders WHERE id = target_order.id AND commerce_hold_reason IS NOT NULL);

  INSERT INTO commerce_notification_outbox(order_id,event_type,recipient,idempotency_key,payload)
  SELECT o.id,'order_confirmed',o.customer_email,'order-confirmed-' || o.id::text,
    jsonb_build_object('orderId',o.id,'orderNumber',o.order_number,'recipientEmail',o.customer_email,
      'recipientName',coalesce(o.shipping_address->>'name','Customer'),
      'items',(SELECT jsonb_agg(jsonb_build_object('title',i.configuration_snapshot->>'productTitle',
        'quantity',i.quantity,'unitPriceCents',i.unit_price)) FROM order_items i WHERE i.order_id=o.id),
      'subtotalCents',o.subtotal::integer,'shippingCents',o.shipping::integer,'taxCents',o.tax::integer,
      'totalCents',o.paid_amount,'currency',o.currency)
  FROM orders o WHERE o.id=target_order.id AND o.payment_status='paid'
  ON CONFLICT(idempotency_key) DO NOTHING;

  UPDATE commerce_checkout_sessions
  SET status = 'paid', updated_at = now()
  WHERE order_id = target_order.id;

  UPDATE carts
  SET status = 'converted', updated_at = now()
  WHERE id = target_order.cart_id;

  UPDATE commerce_webhook_events
  SET
    receipt_status = 'processed',
    order_id = target_order.id,
    processed_at = now(),
    error_code = NULL,
    error_message = NULL
  WHERE source = 'stripe' AND event_id = p_event_id;

  RETURN target_order.id;
END
$$;

REVOKE ALL ON FUNCTION complete_stripe_checkout_payment(
  TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_stripe_checkout_payment(
  TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
) TO service_role;

CREATE OR REPLACE FUNCTION create_commerce_pending_order(
  p_cart_id UUID,
  p_user_id UUID,
  p_guest_token_hash TEXT,
  p_idempotency_key TEXT,
  p_subtotal INTEGER,
  p_currency TEXT
)
RETURNS TABLE(order_id UUID, checkout_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_order_id UUID;
  existing_checkout_id UUID;
  existing_user_id UUID;
  existing_guest_token_hash TEXT;
  created_order_id UUID;
  created_checkout_id UUID;
  calculated_subtotal NUMERIC;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 1));
  IF p_subtotal < 0 OR length(p_currency) <> 3 THEN
    RAISE EXCEPTION 'invalid checkout totals' USING ERRCODE = '23514';
  END IF;

  SELECT
    commerce_checkout_sessions.order_id,
    commerce_checkout_sessions.id,
    commerce_checkout_sessions.user_id,
    commerce_checkout_sessions.guest_token_hash
    INTO
      existing_order_id,
      existing_checkout_id,
      existing_user_id,
      existing_guest_token_hash
  FROM commerce_checkout_sessions
  WHERE idempotency_key = p_idempotency_key;

  IF existing_order_id IS NOT NULL THEN
    IF NOT (
      (p_user_id IS NOT NULL AND existing_user_id = p_user_id)
      OR (
        p_user_id IS NULL
        AND existing_guest_token_hash = p_guest_token_hash
      )
    ) THEN
      RAISE EXCEPTION 'checkout ownership validation failed'
        USING ERRCODE = '42501';
    END IF;
    RETURN QUERY SELECT existing_order_id, existing_checkout_id;
    RETURN;
  END IF;

  PERFORM 1
  FROM carts
  WHERE id = p_cart_id
    AND status = 'active'
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (
        p_user_id IS NULL
        AND guest_token_hash = p_guest_token_hash
      )
    )
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cart ownership validation failed'
      USING ERRCODE = '42501';
  END IF;

  SELECT checkout.order_id, checkout.id INTO existing_order_id, existing_checkout_id
    FROM commerce_checkout_sessions checkout JOIN orders o ON o.id=checkout.order_id
    WHERE checkout.cart_id=p_cart_id AND o.payment_status='unpaid'
      AND checkout.status IN ('pending','redirect_ready')
    ORDER BY checkout.created_at DESC LIMIT 1;
  IF existing_order_id IS NOT NULL THEN
    IF EXISTS (
      (SELECT configuration_hash,quantity FROM cart_items WHERE cart_id=p_cart_id
       EXCEPT ALL SELECT configuration_hash,quantity FROM order_items WHERE order_items.order_id=existing_order_id)
      UNION ALL
      (SELECT configuration_hash,quantity FROM order_items WHERE order_items.order_id=existing_order_id
       EXCEPT ALL SELECT configuration_hash,quantity FROM cart_items WHERE cart_id=p_cart_id)
    ) THEN
      RAISE EXCEPTION 'active checkout snapshot changed' USING ERRCODE = '23514';
    END IF;
    RETURN QUERY SELECT existing_order_id, existing_checkout_id; RETURN;
  END IF;

  SELECT COALESCE(sum(unit_price * quantity), 0)
    INTO calculated_subtotal
  FROM cart_items
  WHERE cart_id = p_cart_id
    AND configuration_snapshot IS NOT NULL
    AND snapshot_schema_version >= 2;

  IF calculated_subtotal <> p_subtotal OR calculated_subtotal = 0 THEN
    RAISE EXCEPTION 'cart subtotal changed' USING ERRCODE = '23514';
  END IF;

  INSERT INTO orders (
    user_id,
    cart_id,
    status,
    subtotal,
    shipping,
    tax,
    total,
    checkout_idempotency_key,
    currency,
    payment_status,
    processing_status
  ) VALUES (
    p_user_id,
    p_cart_id,
    'pending_payment',
    p_subtotal,
    0,
    0,
    p_subtotal,
    p_idempotency_key,
    upper(p_currency),
    'unpaid',
    'pending'
  )
  RETURNING id INTO created_order_id;

  INSERT INTO order_items (
    order_id,
    design_id,
    product_id,
    product_variant_id,
    quantity,
    unit_price,
    configuration_snapshot,
    configuration_hash,
    snapshot_schema_version,
    snapshot_created_at
  )
  SELECT
    created_order_id,
    NULL,
    NULL,
    NULL,
    cart_items.quantity,
    cart_items.unit_price,
    cart_items.configuration_snapshot,
    cart_items.configuration_hash,
    cart_items.snapshot_schema_version,
    cart_items.snapshot_created_at
  FROM cart_items
  WHERE cart_id = p_cart_id
    AND configuration_snapshot IS NOT NULL
    AND snapshot_schema_version >= 2;

  INSERT INTO commerce_checkout_sessions (
    order_id,
    cart_id,
    user_id,
    guest_token_hash,
    idempotency_key
  ) VALUES (
    created_order_id,
    p_cart_id,
    p_user_id,
    CASE WHEN p_user_id IS NULL THEN p_guest_token_hash ELSE NULL END,
    p_idempotency_key
  )
  RETURNING id INTO created_checkout_id;

  RETURN QUERY SELECT created_order_id, created_checkout_id;
END
$$;

REVOKE ALL ON FUNCTION create_commerce_pending_order(
  UUID, UUID, TEXT, TEXT, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;


GRANT EXECUTE ON FUNCTION create_commerce_pending_order(UUID, UUID, TEXT, TEXT, INTEGER, TEXT) TO service_role;

-- profiles is user-editable under existing RLS. Do not permit self-promotion.
CREATE OR REPLACE FUNCTION protect_profile_admin_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN
    IF (TG_OP='INSERT' AND NEW.is_admin IS TRUE) OR
      (TG_OP='UPDATE' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin) THEN
      RAISE EXCEPTION 'admin assignment requires service role' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_guard_admin_assignment ON profiles;
CREATE TRIGGER profiles_guard_admin_assignment BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_admin_assignment();

CREATE OR REPLACE FUNCTION claim_commerce_notification(
  p_order_id UUID, p_event_type TEXT, p_recipient TEXT, p_key TEXT, p_payload JSONB
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE claimed UUID;
BEGIN
  INSERT INTO commerce_notification_outbox(order_id,event_type,recipient,idempotency_key,payload)
    VALUES(p_order_id,p_event_type,p_recipient,p_key,p_payload) ON CONFLICT(idempotency_key) DO NOTHING;
  UPDATE commerce_notification_outbox SET status='sending', attempts=attempts+1,
    updated_at=now(), last_error=NULL, next_attempt_at=NULL
    WHERE idempotency_key=p_key AND (status IN ('pending','failed') OR
      (status='sending' AND updated_at < now()-interval '5 minutes')) RETURNING id INTO claimed;
  RETURN claimed IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION claim_commerce_notification(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_commerce_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;
COMMIT;
