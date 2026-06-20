# Supabase Migration Apply Checklist

Follow this checklist to safely apply and verify database schema migrations in the Supabase SQL editor.

> [!WARNING]
> DO NOT apply these migrations to the production environment directly until they are successfully verified in your local or staging database.

---

## Pre-Migration Risk Analysis

Verify these conditions before applying migrations:

1. **Supabase Order Status Validation**:
   - **Risk**: Dropping/modifying the check constraint on `orders.status` could fail if existing records contain a status that is not supported by the new constraint.
   - **Mitigation**: The new constraint lists a superset of the original statuses: `'pending_fulfillment', 'submitted_to_printify', 'needs_review', 'fulfillment_blocked', 'processing', 'shipped', 'delivered', 'cancelled', 'fulfilled', 'failed'`. This makes the migration safe.
2. **Order Number Uniqueness**:
   - **Risk**: The `order_number` column has a `UNIQUE` constraint and generates a default random value: `'PM-' || floor(random() * 899999 + 100000)::text`. If applied to a table with thousands of existing orders, collisions could occur during the default evaluation.
   - **Mitigation**: For standard development and testing (and low-volume databases), the 900,000 range is safe. If applied to a very large database, remove the `UNIQUE` constraint initially, backfill unique IDs sequentially, and then apply a `UNIQUE` index.
3. **Cart Items RLS Policy Enforcement**:
   - **Risk**: Enabling RLS without active policies would lock out all client reads and writes.
   - **Mitigation**: The migration enables RLS and immediately registers four policies (SELECT, INSERT, UPDATE, DELETE) mapped to `auth.uid() = carts.user_id`. Ensure RLS behaves as expected by performing tests with authenticated users.
4. **Analytics Events Redundant Policies**:
   - **Risk**: A previous version of `005_create_analytics_events.sql` created an RLS policy with `USING (true) WITH CHECK (true)`, exposing all analytics records to public read/write queries.
   - **Mitigation**: We updated the migration to drop the public `Service role can manage analytics_events` policy. Verify that it is not present in pg_policies after execution.

---

## Step-by-Step SQL Execution Checklist

Log into the **Supabase Dashboard** -> select your project -> **SQL Editor**. Copy, paste, and run the migrations in this order:

### [ ] 1. Apply Migration `002_add_cart_items_rls_policies`
```sql
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
CREATE POLICY "Users can view own cart items" ON cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
CREATE POLICY "Users can insert own cart items" ON cart_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
CREATE POLICY "Users can update own cart items" ON cart_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

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
```

### [ ] 2. Apply Migration `003_add_orders_stripe_session_id_unique`
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_id_unique
ON orders(stripe_session_id)
WHERE stripe_session_id IS NOT NULL;
```

### [ ] 3. Apply Migration `004_adjust_orders_status_and_columns`
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT DEFAULT 'PM-' || floor(random() * 899999 + 100000)::text UNIQUE;

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
        RAISE NOTICE 'Dropped constraint: %', constraint_name_val;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No matching status constraint found or error occurred: %', SQLERRM;
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

### [ ] 4. Apply Migration `005_create_analytics_events`
```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage analytics_events" ON analytics_events;

DROP POLICY IF EXISTS "Users can view own analytics events" ON analytics_events;
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
```

---

## SQL Verification Queries

Run these queries in the Supabase SQL editor to verify that migrations were applied correctly.

### 1. Verify `cart_items` Row-Level Security
```sql
SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'cart_items';
```
- **Expected Results**: You should see four rows matching `Users can view own cart items`, `Users can insert own cart items`, `Users can update own cart items`, and `Users can delete own cart items`.

### 2. Verify `orders.stripe_session_id` Unique Index
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'orders' AND indexname = 'idx_orders_stripe_session_id_unique';
```
- **Expected Results**: One row with definition containing `CREATE UNIQUE INDEX idx_orders_stripe_session_id_unique ON public.orders USING btree (stripe_session_id) WHERE (stripe_session_id IS NOT NULL)`.

### 3. Verify `orders.status` Constraint & Added Columns
```sql
-- Check constraint definition
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass AND contype = 'c';

-- Check if added columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name IN ('error_message', 'order_number');
```
- **Expected Results**:
  - The check constraint should display: `CHECK ((status = ANY (ARRAY['pending_fulfillment'::text, 'submitted_to_printify'::text, 'needs_review'::text, 'fulfillment_blocked'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'fulfilled'::text, 'failed'::text])))`.
  - The columns query should return both `error_message` (text) and `order_number` (text).

### 4. Verify `analytics_events` Table and RLS
```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'analytics_events';

-- Check RLS policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'analytics_events';
```
- **Expected Results**:
  - Table name `analytics_events` exists.
  - The only RLS policy should be `Users can view own analytics events` with SELECT command access. No public insert or write policies must be listed.
