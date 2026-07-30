-- Stripe test Checkout persistence and idempotency.
-- No Stripe call or payment is performed by this migration.

BEGIN;

ALTER TABLE orders
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_amount INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_idempotency_unique
  ON orders (checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_checkout_session_unique
  ON orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_event_unique
  ON orders (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS commerce_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  cart_id UUID NOT NULL REFERENCES carts(id),
  user_id UUID REFERENCES auth.users(id),
  guest_token_hash TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  stripe_session_id TEXT UNIQUE,
  stripe_checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'redirect_ready',
        'paid',
        'cancelled',
        'failed'
      )
    ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR guest_token_hash IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS commerce_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('stripe', 'printify')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  receipt_status TEXT NOT NULL DEFAULT 'received'
    CHECK (receipt_status IN ('received', 'processing', 'processed', 'failed')),
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  order_id UUID REFERENCES orders(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (source, event_id)
);

CREATE INDEX IF NOT EXISTS commerce_webhook_events_status_idx
  ON commerce_webhook_events (source, receipt_status, received_at);

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
) FROM PUBLIC;

CREATE OR REPLACE FUNCTION attach_commerce_stripe_session(
  p_checkout_id UUID,
  p_order_id UUID,
  p_stripe_session_id TEXT,
  p_stripe_checkout_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE commerce_checkout_sessions
  SET
    stripe_session_id = p_stripe_session_id,
    stripe_checkout_url = p_stripe_checkout_url,
    status = 'redirect_ready',
    updated_at = now()
  WHERE id = p_checkout_id
    AND order_id = p_order_id
    AND (
      stripe_session_id IS NULL
      OR stripe_session_id = p_stripe_session_id
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout session attachment failed'
      USING ERRCODE = '23514';
  END IF;

  UPDATE orders
  SET stripe_checkout_session_id = p_stripe_session_id
  WHERE id = p_order_id
    AND (
      stripe_checkout_session_id IS NULL
      OR stripe_checkout_session_id = p_stripe_session_id
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order session attachment failed'
      USING ERRCODE = '23514';
  END IF;
END
$$;

REVOKE ALL ON FUNCTION attach_commerce_stripe_session(
  UUID, UUID, TEXT, TEXT
) FROM PUBLIC;

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
  INSERT INTO commerce_webhook_events (
    source,
    event_id,
    event_type,
    payload,
    receipt_status,
    processing_attempts
  ) VALUES (
    p_source,
    p_event_id,
    p_event_type,
    p_payload,
    'processing',
    1
  )
  ON CONFLICT (source, event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END
$$;

CREATE OR REPLACE FUNCTION complete_stripe_checkout_payment(
  p_event_id TEXT,
  p_stripe_session_id TEXT,
  p_payment_intent_id TEXT,
  p_customer_email TEXT,
  p_shipping_address JSONB,
  p_paid_amount INTEGER,
  p_currency TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_order orders%ROWTYPE;
BEGIN
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
  IF target_order.total::INTEGER <> p_paid_amount
    OR upper(target_order.currency) <> upper(p_currency) THEN
    RAISE EXCEPTION 'paid amount or currency mismatch'
      USING ERRCODE = '23514';
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
    paid_amount = p_paid_amount,
    stripe_event_id = p_event_id,
    updated_at = now()
  WHERE id = target_order.id;

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
    error_code = p_error_code,
    error_message = left(p_error_message, 500)
  WHERE source = p_source AND event_id = p_event_id;
END
$$;

REVOKE ALL ON FUNCTION begin_commerce_webhook_event(
  TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC;
REVOKE ALL ON FUNCTION complete_stripe_checkout_payment(
  TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION finish_commerce_webhook_event(
  TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;

COMMIT;

-- Rollback requires first expiring all pending Stripe Checkout Sessions.
-- BEGIN;
-- DROP FUNCTION IF EXISTS create_commerce_pending_order(
--   UUID, UUID, TEXT, TEXT, INTEGER, TEXT
-- );
-- DROP FUNCTION IF EXISTS attach_commerce_stripe_session(
--   UUID, UUID, TEXT, TEXT
-- );
-- DROP FUNCTION IF EXISTS begin_commerce_webhook_event(
--   TEXT, TEXT, TEXT, JSONB
-- );
-- DROP FUNCTION IF EXISTS complete_stripe_checkout_payment(
--   TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT
-- );
-- DROP FUNCTION IF EXISTS finish_commerce_webhook_event(
--   TEXT, TEXT, TEXT, TEXT, TEXT
-- );
-- DROP TABLE IF EXISTS commerce_webhook_events;
-- DROP TABLE IF EXISTS commerce_checkout_sessions;
-- DROP INDEX IF EXISTS orders_stripe_event_unique;
-- DROP INDEX IF EXISTS orders_stripe_checkout_session_unique;
-- DROP INDEX IF EXISTS orders_checkout_idempotency_unique;
-- ALTER TABLE orders
--   DROP COLUMN IF EXISTS stripe_event_id,
--   DROP COLUMN IF EXISTS paid_amount,
--   DROP COLUMN IF EXISTS processing_status,
--   DROP COLUMN IF EXISTS payment_status,
--   DROP COLUMN IF EXISTS currency,
--   DROP COLUMN IF EXISTS checkout_idempotency_key;
-- COMMIT;
