-- Migration: Adjust orders status constraint and ensure columns exist
--
-- This script:
-- 1. Ensures the error_message column exists on the orders table.
-- 2. Drops any existing status check constraint on the orders table.
-- 3. Adds the updated status check constraint supporting all required e-commerce order states.
--

-- 1. Ensure error_message and order_number columns exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT DEFAULT 'PM-' || floor(random() * 899999 + 100000)::text UNIQUE;

-- 2. Drop existing status check constraint if it exists
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

-- 3. Add the updated status check constraint
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
