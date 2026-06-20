-- Migration: Add unique index on orders.stripe_session_id
--
-- This ensures that a Stripe session ID can only be associated with one order,
-- preventing duplicate order creation in case of webhook retry race conditions.
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_id_unique
ON orders(stripe_session_id)
WHERE stripe_session_id IS NOT NULL;
