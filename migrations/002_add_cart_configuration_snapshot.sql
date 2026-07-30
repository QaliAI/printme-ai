-- Sprint 2 commerce persistence migration.
-- Apply only to a confirmed non-production environment during development.
-- Production execution requires a separate reviewed migration window.

BEGIN;

-- Guest carts use a high-entropy browser token. Only its SHA-256 digest is
-- stored. Existing authenticated carts remain valid.
ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS guest_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE carts
  ALTER COLUMN user_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS carts_guest_token_hash_unique
  ON carts (guest_token_hash)
  WHERE guest_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS carts_active_guest_lookup
  ON carts (guest_token_hash, status)
  WHERE guest_token_hash IS NOT NULL AND status = 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'carts_owner_required'
      AND conrelid = 'carts'::regclass
  ) THEN
    ALTER TABLE carts
      ADD CONSTRAINT carts_owner_required
      CHECK (user_id IS NOT NULL OR guest_token_hash IS NOT NULL);
  END IF;
END
$$;

-- Snapshot-only Shop V2 rows intentionally do not depend on mutable legacy
-- product/design tables. Historical details live in configuration_snapshot.
ALTER TABLE cart_items
  ALTER COLUMN design_id DROP NOT NULL,
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN product_variant_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS configuration_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS configuration_hash TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_schema_version SMALLINT,
  ADD COLUMN IF NOT EXISTS snapshot_created_at TIMESTAMPTZ;

ALTER TABLE order_items
  ALTER COLUMN design_id DROP NOT NULL,
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN product_variant_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS configuration_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS configuration_hash TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_schema_version SMALLINT,
  ADD COLUMN IF NOT EXISTS snapshot_created_at TIMESTAMPTZ;

COMMENT ON COLUMN cart_items.configuration_snapshot IS
  'Versioned immutable-at-add ProductConfiguration approval snapshot.';
COMMENT ON COLUMN order_items.configuration_snapshot IS
  'Immutable ProductConfiguration snapshot copied from the cart at order creation.';
COMMENT ON COLUMN cart_items.configuration_hash IS
  'Deterministic server-verified hash of configuration and purchase-time labels/cost.';
COMMENT ON COLUMN order_items.configuration_hash IS
  'Configuration hash copied from cart_items; immutable after first write.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cart_items_snapshot_shape'
      AND conrelid = 'cart_items'::regclass
  ) THEN
    ALTER TABLE cart_items
      ADD CONSTRAINT cart_items_snapshot_shape CHECK (
        configuration_snapshot IS NULL
        OR (
          jsonb_typeof(configuration_snapshot) = 'object'
          AND snapshot_schema_version >= 2
          AND configuration_hash ~ '^pmcfg-v[0-9]+:[0-9a-f]{32,128}$'
          AND snapshot_created_at IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_snapshot_shape'
      AND conrelid = 'order_items'::regclass
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_snapshot_shape CHECK (
        configuration_snapshot IS NULL
        OR (
          jsonb_typeof(configuration_snapshot) = 'object'
          AND snapshot_schema_version >= 2
          AND configuration_hash ~ '^pmcfg-v[0-9]+:[0-9a-f]{32,128}$'
          AND snapshot_created_at IS NOT NULL
        )
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS cart_items_configuration_hash_idx
  ON cart_items (configuration_hash)
  WHERE configuration_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS order_items_configuration_hash_idx
  ON order_items (configuration_hash)
  WHERE configuration_hash IS NOT NULL;

-- An order snapshot may be backfilled once when currently null. Once present,
-- neither the JSON nor its verification metadata can be changed or removed.
CREATE OR REPLACE FUNCTION prevent_order_configuration_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.configuration_snapshot IS NOT NULL AND (
    NEW.configuration_snapshot IS DISTINCT FROM OLD.configuration_snapshot
    OR NEW.configuration_hash IS DISTINCT FROM OLD.configuration_hash
    OR NEW.snapshot_schema_version IS DISTINCT FROM OLD.snapshot_schema_version
    OR NEW.snapshot_created_at IS DISTINCT FROM OLD.snapshot_created_at
  ) THEN
    RAISE EXCEPTION 'order configuration snapshots are immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS order_items_configuration_snapshot_immutable
  ON order_items;

CREATE TRIGGER order_items_configuration_snapshot_immutable
BEFORE UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION prevent_order_configuration_snapshot_mutation();

COMMIT;

-- Rollback instructions (review before running):
-- 1. Stop Shop V2 cart/checkout writers.
-- 2. Preserve any snapshot-only rows externally; restoring the legacy NOT NULL
--    foreign keys is impossible until those rows are mapped or removed.
-- 3. Run:
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS order_items_configuration_snapshot_immutable ON order_items;
-- DROP FUNCTION IF EXISTS prevent_order_configuration_snapshot_mutation();
-- DROP INDEX IF EXISTS order_items_configuration_hash_idx;
-- DROP INDEX IF EXISTS cart_items_configuration_hash_idx;
-- ALTER TABLE order_items
--   DROP CONSTRAINT IF EXISTS order_items_snapshot_shape,
--   DROP COLUMN IF EXISTS snapshot_created_at,
--   DROP COLUMN IF EXISTS snapshot_schema_version,
--   DROP COLUMN IF EXISTS configuration_hash,
--   DROP COLUMN IF EXISTS configuration_snapshot;
-- ALTER TABLE cart_items
--   DROP CONSTRAINT IF EXISTS cart_items_snapshot_shape,
--   DROP COLUMN IF EXISTS snapshot_created_at,
--   DROP COLUMN IF EXISTS snapshot_schema_version,
--   DROP COLUMN IF EXISTS configuration_hash,
--   DROP COLUMN IF EXISTS configuration_snapshot;
-- ALTER TABLE carts
--   DROP CONSTRAINT IF EXISTS carts_owner_required,
--   DROP COLUMN IF EXISTS expires_at,
--   DROP COLUMN IF EXISTS guest_token_hash;
-- DROP INDEX IF EXISTS carts_active_guest_lookup;
-- DROP INDEX IF EXISTS carts_guest_token_hash_unique;
-- COMMIT;
