# Database Migration Runbook

This runbook outlines how to safely apply, verify, and roll back migrations for the PrintMe.ai database.

## Migration Files & Order

Apply migrations in the following order:

1. **`migrations/001_add_mockup_cache.sql`**
   - *Purpose*: Adds cache columns for Printify mockups on the `generated_designs` table.
2. **`migrations/002_add_cart_items_rls_policies.sql`**
   - *Purpose*: Enables Row-Level Security (RLS) on the `cart_items` table and creates policy rules for client-side queries.
3. **`migrations/003_add_orders_stripe_session_id_unique.sql`**
   - *Purpose*: Creates a unique partial index on `orders.stripe_session_id` to enforce database-backed webhook idempotency.
4. **`migrations/004_adjust_orders_status_and_columns.sql`**
   - *Purpose*: Alters the CHECK constraint on `orders.status` to support the required e-commerce order statuses and ensures `error_message` is defined.
5. **`migrations/005_create_analytics_events.sql`**
   - *Purpose*: Creates the `analytics_events` table for server-side funnel tracking, enables RLS, and sets up a policy allowing users to view only their own events.

---

## Rollback Considerations

If a rollback is required, execute the following SQL statement corresponding to each migration:

### Rollback `005_create_analytics_events.sql`
```sql
DROP TABLE IF EXISTS analytics_events CASCADE;
```

### Rollback `004_adjust_orders_status_and_columns.sql`
```sql
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'pending_fulfillment', 
  'processing', 
  'shipped', 
  'delivered', 
  'cancelled'
));
```

### Rollback `003_add_orders_stripe_session_id_unique.sql`
```sql
DROP INDEX IF EXISTS idx_orders_stripe_session_id_unique;
```

### Rollback `002_add_cart_items_rls_policies.sql`
```sql
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;
```

### Rollback `001_add_mockup_cache.sql`
```sql
ALTER TABLE generated_designs 
  DROP COLUMN IF EXISTS printify_mockups,
  DROP COLUMN IF EXISTS printify_image_id,
  DROP COLUMN IF EXISTS printify_mockups_generated_at;
DROP INDEX IF EXISTS idx_generated_designs_has_mockups;
```

---

## How to Verify Changes

Run the following SQL queries in the Supabase SQL editor to confirm that all migrations were successfully applied.

### 1. Verify RLS Policies exist for `cart_items`
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'cart_items';
```
*Expected Result*: You should see four rows corresponding to SELECT, INSERT, UPDATE, and DELETE command permissions for `cart_items`.

### 2. Verify unique index on `orders.stripe_session_id`
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'orders' AND indexname = 'idx_orders_stripe_session_id_unique';
```
*Expected Result*: Returns a record with definition containing `CREATE UNIQUE INDEX idx_orders_stripe_session_id_unique ON public.orders USING btree (stripe_session_id) WHERE (stripe_session_id IS NOT NULL)`.

### 3. Verify order status CHECK constraint
```sql
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass AND contype = 'c';
```
*Expected Result*: The returned CHECK constraint string should list: `'pending_fulfillment', 'submitted_to_printify', 'needs_review', 'fulfillment_blocked', 'processing', 'shipped', 'delivered', 'cancelled', 'fulfilled', 'failed'`.

### 4. Verify `analytics_events` table and RLS policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'analytics_events';
```
*Expected Result*: You should see only one row: "Users can view own analytics events" with SELECT command access restricted to `(auth.uid() = user_id)`. The insecure public write policy should not be present.
