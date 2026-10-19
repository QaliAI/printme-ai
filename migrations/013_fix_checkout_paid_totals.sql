-- Blocker B1 (docs/launch/LAUNCH_GATE_10_EVIDENCE.md): paid orders failed to
-- record. The pending order kept total = subtotal, but the Stripe session adds
-- shipping and automatic tax, and complete_stripe_checkout_payment rejected
-- any amount_total <> total. The webhook returned 500 and the order stayed
-- unpaid after Stripe had taken the money.
--
-- Fix:
--   * attach_commerce_stripe_session records the shipping fee that was put on
--     the Stripe session (orders.shipping, total = subtotal + shipping).
--   * complete_stripe_checkout_payment takes Stripe's subtotal, shipping, tax
--     and discount, checks them against the order, and records tax and total.
--   * Both are callable only by service_role (the app uses the admin client).
--
-- Amounts are integer cents, like orders.subtotal and orders.paid_amount.
-- Same SQL as the canonical launch migration in docs/launch/.
-- Not applied anywhere. The commerce schema isn't on production yet; this
-- replaces the 005 versions when the reviewed plan is applied.

BEGIN;

-- RPC: attach_commerce_stripe_session
-- Links the Stripe session and records the shipping fee that was put on it.
-- Amounts are integer cents. Blocker B1: total used to stay = subtotal.
DROP FUNCTION IF EXISTS attach_commerce_stripe_session(
  UUID, UUID, TEXT, TEXT
);
CREATE OR REPLACE FUNCTION attach_commerce_stripe_session(
  p_checkout_id UUID,
  p_order_id UUID,
  p_stripe_session_id TEXT,
  p_stripe_checkout_url TEXT,
  p_shipping_cents INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_shipping_cents IS NULL OR p_shipping_cents < 0 THEN
    RAISE EXCEPTION 'invalid shipping amount' USING ERRCODE = '23514';
  END IF;

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
  SET
    stripe_checkout_session_id = p_stripe_session_id,
    shipping = p_shipping_cents,
    tax = 0,
    total = subtotal + p_shipping_cents
  WHERE id = p_order_id
    AND payment_status = 'unpaid'
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
  UUID, UUID, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION attach_commerce_stripe_session(
  UUID, UUID, TEXT, TEXT, INTEGER
) TO service_role;

-- RPC: complete_stripe_checkout_payment
-- Accepts Stripe's amount_total when subtotal and shipping match the order,
-- Stripe's numbers add up, there is no discount, and tax is in range.
-- Records the tax and the paid total. Mirrors
-- lib/commerce/checkout/payment-totals.ts.
DROP FUNCTION IF EXISTS complete_stripe_checkout_payment(
  TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT
);
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

COMMIT;

-- Rollback (brings blocker B1 back):
-- BEGIN;
-- DROP FUNCTION IF EXISTS attach_commerce_stripe_session(
--   UUID, UUID, TEXT, TEXT, INTEGER
-- );
-- DROP FUNCTION IF EXISTS complete_stripe_checkout_payment(
--   TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, INTEGER
-- );
-- Then re-run both CREATE FUNCTION blocks from 005_add_secure_checkout.sql.
-- COMMIT;
