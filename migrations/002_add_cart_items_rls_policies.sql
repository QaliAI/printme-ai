-- Migration: Add Row-Level Security (RLS) policies to cart_items table
--
-- This enables users to manage their own cart items (SELECT, INSERT, UPDATE, DELETE)
-- from the client-side Supabase client while preventing access to other users' carts.
--

-- Enable RLS on cart_items (just in case it was not enabled)
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Users can view items in their own carts
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
CREATE POLICY "Users can view own cart items" ON cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

-- 2. INSERT Policy: Users can insert items into their own carts
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
CREATE POLICY "Users can insert own cart items" ON cart_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

-- 3. UPDATE Policy: Users can update items in their own carts (e.g. quantity changes)
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
CREATE POLICY "Users can update own cart items" ON cart_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

-- 4. DELETE Policy: Users can delete items from their own carts (e.g. removing products)
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
CREATE POLICY "Users can delete own cart items" ON cart_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

COMMENT ON TABLE cart_items IS 'Shopping cart items with Row Level Security restricting access to cart owners';
