-- Sprint 1 proposal only. DO NOT apply remotely as part of this sprint.
--
-- Adds an immutable, versioned commerce snapshot to cart/order items without
-- rewriting existing rows. Existing application paths may continue leaving the
-- column null until the persistent commerce adapter is introduced.

ALTER TABLE cart_items
  ADD COLUMN IF NOT EXISTS configuration_snapshot JSONB;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS configuration_snapshot JSONB;

COMMENT ON COLUMN cart_items.configuration_snapshot IS
  'Versioned ProductConfiguration snapshot captured when an item is added.';
COMMENT ON COLUMN order_items.configuration_snapshot IS
  'Immutable ProductConfiguration snapshot copied from the cart at checkout.';

-- Optional validation should be added only after existing rows and all writers
-- have been audited:
-- ALTER TABLE cart_items ADD CONSTRAINT cart_items_configuration_snapshot_object
--   CHECK (configuration_snapshot IS NULL OR jsonb_typeof(configuration_snapshot) = 'object');

-- Rollback notes:
--   ALTER TABLE order_items DROP COLUMN IF EXISTS configuration_snapshot;
--   ALTER TABLE cart_items DROP COLUMN IF EXISTS configuration_snapshot;
