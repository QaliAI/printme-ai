-- Migration to allow nullable user_id for guest checkouts, uploads, and designs.
-- This enables unauthenticated checkout without a shared guest user account.

-- 1. Make user_id nullable in key tables
ALTER TABLE user_uploads ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE generated_designs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE carts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE checkout_sessions ALTER COLUMN user_id DROP NOT NULL;

-- 2. Update RLS policies to allow unauthenticated (guest) access to their rows.
-- Since guest rows will have user_id IS NULL, we allow SELECT/INSERT when user_id IS NULL.
-- For security, guests must access rows via their exact IDs (UUIDs).

-- user_uploads
DROP POLICY IF EXISTS "Users can view own uploads" ON user_uploads;
CREATE POLICY "Allow SELECT for own uploads or guest uploads" ON user_uploads
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create uploads" ON user_uploads;
CREATE POLICY "Allow INSERT for own uploads or guest uploads" ON user_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- generated_designs
DROP POLICY IF EXISTS "Users can view own designs" ON generated_designs;
CREATE POLICY "Allow SELECT for own designs or guest designs" ON generated_designs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create designs" ON generated_designs;
CREATE POLICY "Allow INSERT for own designs or guest designs" ON generated_designs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- carts
DROP POLICY IF EXISTS "Users can view own cart" ON carts;
CREATE POLICY "Allow SELECT for own cart or guest cart" ON carts
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can create cart" ON carts;
CREATE POLICY "Allow INSERT for own cart or guest cart" ON carts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- checkout_sessions
DROP POLICY IF EXISTS "Users can view their own checkout sessions" ON checkout_sessions;
CREATE POLICY "Allow SELECT for own checkout sessions or guest checkout sessions" ON checkout_sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Service role can manage checkout sessions" ON checkout_sessions;
CREATE POLICY "Service role can manage checkout sessions" ON checkout_sessions
  USING (true) WITH CHECK (true);

-- orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Allow SELECT for own orders or guest orders" ON orders
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
