-- ============================================================================
-- Migration 011: Commerce Core Tables Row-Level Security (RLS) Policies
-- Tables: orders, order_items, commerce_checkout_sessions, fulfillment_jobs, fulfillment_attempts
-- ============================================================================

-- 1. Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- 2. Order Items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (
          (auth.uid() IS NOT NULL AND orders.user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.is_admin = true
          )
        )
    )
  );

-- 3. Commerce Checkout Sessions
ALTER TABLE commerce_checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own checkout sessions" ON commerce_checkout_sessions;
CREATE POLICY "Users can view own checkout sessions" ON commerce_checkout_sessions
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- 4. Fulfillment Jobs
ALTER TABLE fulfillment_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view fulfillment jobs" ON fulfillment_jobs;
CREATE POLICY "Admins can view fulfillment jobs" ON fulfillment_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- 5. Fulfillment Attempts
ALTER TABLE fulfillment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view fulfillment attempts" ON fulfillment_attempts;
CREATE POLICY "Admins can view fulfillment attempts" ON fulfillment_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );
