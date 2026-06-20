# Database Migrations

Run these SQL migrations in Supabase to set up the database schema for PrintMe.ai.

## 1. Create checkout_sessions table

```sql
CREATE TABLE checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

-- Enable RLS
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own checkout sessions
CREATE POLICY "Users can view their own checkout sessions"
  ON checkout_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert/update checkout sessions
CREATE POLICY "Service role can manage checkout sessions"
  ON checkout_sessions
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_checkout_sessions_stripe_session_id ON checkout_sessions(stripe_session_id);
CREATE INDEX idx_checkout_sessions_user_id ON checkout_sessions(user_id);
CREATE INDEX idx_checkout_sessions_cart_id ON checkout_sessions(cart_id);
```

## 2. Update orders table (if not already created)

```sql
-- If the orders table doesn't exist, create it:
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT DEFAULT 'PM-' || floor(random() * 899999 + 100000)::text UNIQUE,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_fulfillment' CHECK (status IN ('pending_fulfillment', 'processing', 'shipped', 'delivered', 'cancelled', 'needs_review', 'fulfillment_blocked')),
  stripe_session_id TEXT REFERENCES checkout_sessions(stripe_session_id),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own orders
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_stripe_session_id ON orders(stripe_session_id);
```

## 3. Update order_items table (if not already created)

```sql
-- If the order_items table doesn't exist, create it:
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES generated_designs(id),
  product_id UUID NOT NULL REFERENCES products(id),
  product_variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view order items from their own orders
CREATE POLICY "Users can view order items from their orders"
  ON order_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

-- Create index for faster lookups
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_design_id ON order_items(design_id);
```

## 4. Add Cloudinary fields to generated_designs table

```sql
-- Add Cloudinary public_id for image transformations
ALTER TABLE generated_designs
ADD COLUMN cloudinary_public_id TEXT,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX idx_generated_designs_cloudinary_public_id ON generated_designs(cloudinary_public_id);
```

## 5. Add Printify and tracking fields to orders table

```sql
-- Add Printify order tracking and shipping information
ALTER TABLE orders
ADD COLUMN printify_order_id TEXT UNIQUE,
ADD COLUMN tracking_number TEXT;

-- Create index for Printify order lookups
CREATE INDEX idx_orders_printify_order_id ON orders(printify_order_id);
CREATE INDEX idx_orders_tracking_number ON orders(tracking_number);
```

## 6. Enable Supabase Storage for design images

```sql
-- This should be configured in the Supabase dashboard:
-- 1. Go to Storage in the Supabase dashboard
-- 2. Create a new bucket called 'designs' if it doesn't exist
-- 3. Create a new bucket called 'uploads' if it doesn't exist
-- 4. Set appropriate access policies:
--    - 'uploads' should be private (only authenticated users can read their own)
--    - 'designs' can be public for viewing generated designs
```

## 4. Add Printify mockup cache columns (`migrations/001_add_mockup_cache.sql`)

Caches Printify mockup URLs on `generated_designs` so we don't regenerate them
on every page view. First load triggers Printify mockup generation (10-30s);
subsequent loads are instant.

```sql
ALTER TABLE generated_designs
  ADD COLUMN IF NOT EXISTS printify_mockups JSONB,
  ADD COLUMN IF NOT EXISTS printify_image_id TEXT,
  ADD COLUMN IF NOT EXISTS printify_mockups_generated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_generated_designs_has_mockups
  ON generated_designs ((printify_mockups IS NOT NULL))
  WHERE printify_mockups IS NOT NULL;
```

The cache fails open: if these columns don't exist yet, the mockup endpoint
still works — it just regenerates on every request.

## 7. Enable RLS Policies for cart_items

Run the following SQL to enable users to view, add, update, and delete items from their own cart:

```sql
-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
CREATE POLICY "Users can view own cart items" ON cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
  );

-- INSERT Policy
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
CREATE POLICY "Users can insert own cart items" ON cart_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
  );

-- UPDATE Policy
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
CREATE POLICY "Users can update own cart items" ON cart_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
  );

-- DELETE Policy
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
CREATE POLICY "Users can delete own cart items" ON cart_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
  );
```

## 8. Add Unique Index on orders.stripe_session_id

To prevent duplicate order processing from Stripe webhook retries, add a unique index constraint:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_id_unique
ON orders(stripe_session_id)
WHERE stripe_session_id IS NOT NULL;
```

## 9. Adjust Orders Status Constraints and Add Columns

This ensures that the status field in the `orders` table supports all required e-commerce statuses and the `error_message` and `order_number` columns exist:

```sql
-- 1. Ensure error_message and order_number columns exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT DEFAULT 'PM-' || floor(random() * 899999 + 100000)::text UNIQUE;

-- 2. Drop existing status check constraint if it exists and add the updated one
DO $$
DECLARE
    constraint_name_val text;
BEGIN
    SELECT con.conname INTO constraint_name_val
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'orders'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%';

    IF constraint_name_val IS NOT NULL THEN
        EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(constraint_name_val);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'pending_fulfillment',
  'submitted_to_printify',
  'needs_review',
  'fulfillment_blocked',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'fulfilled',
  'failed'
));
```

## Steps to Apply Migrations

1. Go to the Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy each SQL block above and run it separately
4. Verify that tables are created and policies are applied

## Verify Setup

Run these queries to verify everything is set up:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies exist
SELECT schemaname, tablename, policyname FROM pg_policies;
```

## Environment Variables Required

Add these to your `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See `.env.example` for a complete list.
