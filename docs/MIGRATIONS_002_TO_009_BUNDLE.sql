-- ============================================================================
-- PRINTME.AI — CONSOLIDATED DATABASE MIGRATION BUNDLE (002 TO 009)
-- Target Project: vfgbvnfhvjmkmfmianpb (printme-ai)
-- Generation Date: Fall 2026 Launch Sprint
--
-- Instructions:
-- 1. Open the Supabase Dashboard -> Project `vfgbvnfhvjmkmfmianpb`.
-- 2. Navigate to SQL Editor -> New Query.
-- 3. Paste this entire file and click "Run" (or Ctrl+Enter / Cmd+Enter).
-- 4. Review the verification query results at the end of the script to confirm
--    all 25+ tables, views, functions, triggers, and indexes are in place.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PREREQUISITES: EXTENSIONS & SCHEMAS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure base tables exist before alterations (if applying to fresh DB)
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  design_id UUID,
  product_id UUID,
  product_variant_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_id UUID REFERENCES carts(id),
  order_number TEXT DEFAULT 'PM-' || floor(random() * 899999 + 100000)::text UNIQUE,
  status TEXT DEFAULT 'pending',
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  customer_email TEXT,
  shipping_address JSONB,
  notes TEXT,
  error_message TEXT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  printify_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  design_id UUID,
  product_id UUID,
  product_variant_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  printify_line_item_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 002: CART CONFIGURATION SNAPSHOT & GUEST OWNERSHIP
-- Source: migrations/002_add_cart_configuration_snapshot.sql & 002_add_cart_items_rls_policies.sql
-- ============================================================================

-- Guest carts use a high-entropy browser token hash.
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

-- Snapshot-only Shop V2 columns for cart_items and order_items
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

DROP TRIGGER IF EXISTS order_items_configuration_snapshot_immutable ON order_items;
CREATE TRIGGER order_items_configuration_snapshot_immutable
BEFORE UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION prevent_order_configuration_snapshot_mutation();

-- Enable RLS on cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
CREATE POLICY "Users can view own cart items" ON cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (carts.user_id = auth.uid() OR carts.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
CREATE POLICY "Users can insert own cart items" ON cart_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (carts.user_id = auth.uid() OR carts.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
CREATE POLICY "Users can update own cart items" ON cart_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (carts.user_id = auth.uid() OR carts.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
CREATE POLICY "Users can delete own cart items" ON cart_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND (carts.user_id = auth.uid() OR carts.user_id IS NULL)
    )
  );

-- ============================================================================
-- SECTION 003: CURATED PRINTIFY CATALOG & ORDERS STRIPE SESSION INDEX
-- Source: migrations/003_add_curated_catalog.sql & 003_add_orders_stripe_session_id_unique.sql
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_id_unique
  ON orders(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS catalog_blueprints (
  printify_blueprint_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_print_providers (
  printify_provider_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  location JSONB,
  decoration_methods TEXT[] NOT NULL DEFAULT '{}',
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_provider_variants (
  printify_blueprint_id INTEGER NOT NULL
    REFERENCES catalog_blueprints(printify_blueprint_id),
  printify_provider_id INTEGER NOT NULL
    REFERENCES catalog_print_providers(printify_provider_id),
  printify_variant_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  available BOOLEAN NOT NULL,
  product_cost INTEGER,
  cost_currency TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (
    printify_blueprint_id,
    printify_provider_id,
    printify_variant_id
  ),
  CHECK (product_cost IS NULL OR product_cost >= 0),
  CHECK (cost_currency IS NULL OR length(cost_currency) = 3)
);

CREATE TABLE IF NOT EXISTS catalog_print_placements (
  printify_blueprint_id INTEGER NOT NULL,
  printify_provider_id INTEGER NOT NULL,
  printify_variant_id INTEGER NOT NULL,
  position TEXT NOT NULL,
  decoration_method TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  PRIMARY KEY (
    printify_blueprint_id,
    printify_provider_id,
    printify_variant_id,
    position,
    decoration_method
  ),
  FOREIGN KEY (
    printify_blueprint_id,
    printify_provider_id,
    printify_variant_id
  ) REFERENCES catalog_provider_variants (
    printify_blueprint_id,
    printify_provider_id,
    printify_variant_id
  ),
  CHECK (width > 0 AND height > 0)
);

CREATE TABLE IF NOT EXISTS merchandising_products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  printify_blueprint_id INTEGER NOT NULL,
  printify_provider_id INTEGER NOT NULL,
  preview_template_id TEXT NOT NULL,
  default_placement JSONB NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approved_product_variants (
  merchandising_product_id TEXT NOT NULL
    REFERENCES merchandising_products(id) ON DELETE CASCADE,
  printify_variant_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  color TEXT,
  size TEXT,
  available BOOLEAN NOT NULL DEFAULT false,
  review_required BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (merchandising_product_id, printify_variant_id)
);

CREATE TABLE IF NOT EXISTS retail_prices (
  merchandising_product_id TEXT NOT NULL,
  printify_variant_id INTEGER NOT NULL,
  currency TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at TIMESTAMPTZ,
  approved_by UUID,
  PRIMARY KEY (
    merchandising_product_id,
    printify_variant_id,
    effective_at
  ),
  FOREIGN KEY (merchandising_product_id, printify_variant_id)
    REFERENCES approved_product_variants (
      merchandising_product_id,
      printify_variant_id
    ),
  CHECK (unit_price >= 0),
  CHECK (length(currency) = 3)
);

CREATE TABLE IF NOT EXISTS catalog_shipping_profiles (
  printify_blueprint_id INTEGER NOT NULL,
  printify_provider_id INTEGER NOT NULL,
  profile_key TEXT NOT NULL,
  variant_ids INTEGER[] NOT NULL DEFAULT '{}',
  countries TEXT[] NOT NULL DEFAULT '{}',
  first_item_cost INTEGER NOT NULL,
  additional_item_cost INTEGER NOT NULL,
  currency TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (
    printify_blueprint_id,
    printify_provider_id,
    profile_key
  )
);

CREATE TABLE IF NOT EXISTS catalog_sync_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode TEXT NOT NULL CHECK (mode IN ('dry-run', 'apply')),
  status TEXT NOT NULL CHECK (status IN ('running', 'complete', 'failed')),
  report JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- SECTION 004: CURATED DESIGNS, DROPS, COLLECTIONS & ORDERS STATUS
-- Source: migrations/004_add_curated_designs.sql & 004_adjust_orders_status_and_columns.sql
-- ============================================================================

-- Ensure order columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT DEFAULT 'PM-' || floor(random() * 899999 + 100000)::text UNIQUE;

-- Adjust orders status check constraint safely
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
  'pending',
  'pending_payment',
  'paid',
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

-- Curated designs tables
CREATE TABLE IF NOT EXISTS design_assets (
  id TEXT PRIMARY KEY,
  stable_url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  has_transparency BOOLEAN NOT NULL DEFAULT false,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (width > 0 AND height > 0)
);

CREATE TABLE IF NOT EXISTS curated_designs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  artist_or_source TEXT NOT NULL,
  rights_status TEXT NOT NULL,
  publication_status TEXT NOT NULL
    CHECK (publication_status IN ('draft', 'scheduled', 'published', 'archived')),
  publication_date TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT '{}',
  filters TEXT[] NOT NULL DEFAULT '{}',
  merchandising_priority INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  current_version_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS design_versions (
  id TEXT PRIMARY KEY,
  curated_design_id TEXT NOT NULL
    REFERENCES curated_designs(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  artwork_asset_id TEXT NOT NULL REFERENCES design_assets(id),
  production_asset_id TEXT NOT NULL REFERENCES design_assets(id),
  thumbnail_asset_id TEXT NOT NULL REFERENCES design_assets(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (curated_design_id, version_label)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'curated_designs_current_version_fkey'
      AND conrelid = 'curated_designs'::regclass
  ) THEN
    ALTER TABLE curated_designs
      ADD CONSTRAINT curated_designs_current_version_fkey
      FOREIGN KEY (current_version_id) REFERENCES design_versions(id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS design_product_defaults (
  curated_design_id TEXT PRIMARY KEY
    REFERENCES curated_designs(id) ON DELETE CASCADE,
  merchandising_product_id TEXT NOT NULL
    REFERENCES merchandising_products(id),
  default_product_color TEXT,
  default_placement JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS design_product_compatibility (
  curated_design_id TEXT NOT NULL
    REFERENCES curated_designs(id) ON DELETE CASCADE,
  merchandising_product_id TEXT NOT NULL
    REFERENCES merchandising_products(id) ON DELETE CASCADE,
  compatible BOOLEAN NOT NULL,
  reason TEXT,
  preview_configuration JSONB,
  PRIMARY KEY (curated_design_id, merchandising_product_id)
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  publication_status TEXT NOT NULL
    CHECK (publication_status IN ('draft', 'scheduled', 'published', 'archived')),
  publication_date TIMESTAMPTZ,
  merchandising_priority INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS collection_designs (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  curated_design_id TEXT NOT NULL
    REFERENCES curated_designs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, curated_design_id)
);

CREATE TABLE IF NOT EXISTS commerce_drops (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  publication_status TEXT NOT NULL
    CHECK (publication_status IN ('draft', 'scheduled', 'published', 'archived')),
  publication_date TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  merchandising_priority INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS drop_designs (
  drop_id TEXT NOT NULL REFERENCES commerce_drops(id) ON DELETE CASCADE,
  curated_design_id TEXT NOT NULL
    REFERENCES curated_designs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (drop_id, curated_design_id)
);

CREATE INDEX IF NOT EXISTS curated_designs_publication_idx
  ON curated_designs (
    publication_status,
    publication_date,
    merchandising_priority DESC
  );
CREATE INDEX IF NOT EXISTS curated_designs_tags_idx
  ON curated_designs USING GIN (tags);
CREATE INDEX IF NOT EXISTS curated_designs_filters_idx
  ON curated_designs USING GIN (filters);

ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_product_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_product_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_designs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW commerce_published_designs
WITH (security_invoker = true)
AS
SELECT
  design.id,
  design.slug,
  design.title,
  design.description,
  COALESCE(collection.title, 'Uncollected') AS collection_title,
  jsonb_build_object(
    'id', artwork.id,
    'version', version.version_label,
    'url', artwork.stable_url,
    'productionUrl', production.stable_url,
    'alt', artwork.alt_text,
    'width', artwork.width,
    'height', artwork.height,
    'mimeType', artwork.mime_type,
    'hasTransparency', artwork.has_transparency
  ) AS artwork_asset,
  design.artist_or_source,
  design.rights_status,
  design.publication_status,
  design.publication_date,
  design.tags,
  defaults.merchandising_product_id AS default_product_id,
  defaults.default_product_color,
  defaults.default_placement,
  COALESCE((
    SELECT array_agg(compatibility.merchandising_product_id)
    FROM design_product_compatibility compatibility
    WHERE compatibility.curated_design_id = design.id
      AND compatibility.compatible
  ), '{}'::text[]) AS compatible_product_ids,
  COALESCE((
    SELECT array_agg(compatibility.merchandising_product_id)
    FROM design_product_compatibility compatibility
    WHERE compatibility.curated_design_id = design.id
      AND NOT compatibility.compatible
  ), '{}'::text[]) AS incompatible_product_ids,
  design.merchandising_priority,
  design.seo_title,
  design.seo_description,
  design.filters
FROM curated_designs design
JOIN design_versions version ON version.id = design.current_version_id
JOIN design_assets artwork ON artwork.id = version.artwork_asset_id
JOIN design_assets production ON production.id = version.production_asset_id
JOIN design_product_defaults defaults
  ON defaults.curated_design_id = design.id
LEFT JOIN LATERAL (
  SELECT catalog.title
  FROM collection_designs membership
  JOIN collections catalog ON catalog.id = membership.collection_id
  WHERE membership.curated_design_id = design.id
    AND catalog.publication_status = 'published'
  ORDER BY catalog.merchandising_priority DESC, membership.position
  LIMIT 1
) collection ON true
WHERE design.publication_status = 'published'
  AND (
    design.publication_date IS NULL
    OR design.publication_date <= now()
  );

CREATE OR REPLACE VIEW commerce_published_collections
WITH (security_invoker = true)
AS
SELECT
  collection.id,
  collection.slug,
  collection.title,
  collection.description,
  collection.publication_status,
  COALESCE(
    array_agg(membership.curated_design_id ORDER BY membership.position)
      FILTER (WHERE design.id IS NOT NULL),
    '{}'::text[]
  ) AS design_ids
FROM collections collection
LEFT JOIN collection_designs membership
  ON membership.collection_id = collection.id
LEFT JOIN curated_designs design
  ON design.id = membership.curated_design_id
  AND design.publication_status = 'published'
WHERE collection.publication_status = 'published'
  AND (
    collection.publication_date IS NULL
    OR collection.publication_date <= now()
  )
GROUP BY collection.id;

CREATE OR REPLACE VIEW commerce_published_drops
WITH (security_invoker = true)
AS
SELECT
  drop_catalog.id,
  drop_catalog.slug,
  drop_catalog.title,
  drop_catalog.description,
  drop_catalog.publication_status,
  drop_catalog.publication_date,
  COALESCE(
    array_agg(membership.curated_design_id ORDER BY membership.position)
      FILTER (WHERE design.id IS NOT NULL),
    '{}'::text[]
  ) AS design_ids
FROM commerce_drops drop_catalog
LEFT JOIN drop_designs membership ON membership.drop_id = drop_catalog.id
LEFT JOIN curated_designs design
  ON design.id = membership.curated_design_id
  AND design.publication_status = 'published'
WHERE drop_catalog.publication_status = 'published'
  AND (
    drop_catalog.publication_date IS NULL
    OR drop_catalog.publication_date <= now()
  )
  AND (drop_catalog.ends_at IS NULL OR drop_catalog.ends_at > now())
GROUP BY drop_catalog.id;

-- ============================================================================
-- SECTION 005: SECURE CHECKOUT, COMMERCE SESSIONS & ANALYTICS
-- Source: migrations/005_add_secure_checkout.sql & 005_create_analytics_events.sql
-- ============================================================================

-- Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage analytics_events" ON analytics_events;
DROP POLICY IF EXISTS "Users can view own analytics events" ON analytics_events;
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Orders checkout extensions
ALTER TABLE orders
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_amount INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_idempotency_unique
  ON orders (checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_checkout_session_unique
  ON orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_event_unique
  ON orders (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS commerce_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  cart_id UUID NOT NULL REFERENCES carts(id),
  user_id UUID REFERENCES auth.users(id),
  guest_token_hash TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  stripe_session_id TEXT UNIQUE,
  stripe_checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'redirect_ready',
        'paid',
        'cancelled',
        'failed'
      )
    ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR guest_token_hash IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS commerce_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('stripe', 'printify')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  receipt_status TEXT NOT NULL DEFAULT 'received'
    CHECK (receipt_status IN ('received', 'processing', 'processed', 'failed')),
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  order_id UUID REFERENCES orders(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ,
  replayed_at TIMESTAMPTZ,
  UNIQUE (source, event_id)
);

CREATE INDEX IF NOT EXISTS commerce_webhook_events_status_idx
  ON commerce_webhook_events (source, receipt_status, received_at);

ALTER TABLE commerce_webhook_events ENABLE ROW LEVEL SECURITY;

-- RPC: create_commerce_pending_order
CREATE OR REPLACE FUNCTION create_commerce_pending_order(
  p_cart_id UUID,
  p_user_id UUID,
  p_guest_token_hash TEXT,
  p_idempotency_key TEXT,
  p_subtotal INTEGER,
  p_currency TEXT
)
RETURNS TABLE(order_id UUID, checkout_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_order_id UUID;
  existing_checkout_id UUID;
  existing_user_id UUID;
  existing_guest_token_hash TEXT;
  created_order_id UUID;
  created_checkout_id UUID;
  calculated_subtotal NUMERIC;
BEGIN
  IF p_subtotal < 0 OR length(p_currency) <> 3 THEN
    RAISE EXCEPTION 'invalid checkout totals' USING ERRCODE = '23514';
  END IF;

  SELECT
    commerce_checkout_sessions.order_id,
    commerce_checkout_sessions.id,
    commerce_checkout_sessions.user_id,
    commerce_checkout_sessions.guest_token_hash
    INTO
      existing_order_id,
      existing_checkout_id,
      existing_user_id,
      existing_guest_token_hash
  FROM commerce_checkout_sessions
  WHERE idempotency_key = p_idempotency_key;

  IF existing_order_id IS NOT NULL THEN
    IF NOT (
      (p_user_id IS NOT NULL AND existing_user_id = p_user_id)
      OR (
        p_user_id IS NULL
        AND existing_guest_token_hash = p_guest_token_hash
      )
    ) THEN
      RAISE EXCEPTION 'checkout ownership validation failed'
        USING ERRCODE = '42501';
    END IF;
    RETURN QUERY SELECT existing_order_id, existing_checkout_id;
    RETURN;
  END IF;

  PERFORM 1
  FROM carts
  WHERE id = p_cart_id
    AND status = 'active'
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (
        p_user_id IS NULL
        AND guest_token_hash = p_guest_token_hash
      )
    )
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cart ownership validation failed'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(sum(unit_price * quantity), 0)
    INTO calculated_subtotal
  FROM cart_items
  WHERE cart_id = p_cart_id
    AND configuration_snapshot IS NOT NULL
    AND snapshot_schema_version >= 2;

  IF calculated_subtotal <> p_subtotal OR calculated_subtotal = 0 THEN
    RAISE EXCEPTION 'cart subtotal changed' USING ERRCODE = '23514';
  END IF;

  INSERT INTO orders (
    user_id,
    cart_id,
    status,
    subtotal,
    shipping,
    tax,
    total,
    checkout_idempotency_key,
    currency,
    payment_status,
    processing_status
  ) VALUES (
    p_user_id,
    p_cart_id,
    'pending_payment',
    p_subtotal,
    0,
    0,
    p_subtotal,
    p_idempotency_key,
    upper(p_currency),
    'unpaid',
    'pending'
  )
  RETURNING id INTO created_order_id;

  INSERT INTO order_items (
    order_id,
    design_id,
    product_id,
    product_variant_id,
    quantity,
    unit_price,
    configuration_snapshot,
    configuration_hash,
    snapshot_schema_version,
    snapshot_created_at
  )
  SELECT
    created_order_id,
    NULL,
    NULL,
    NULL,
    cart_items.quantity,
    cart_items.unit_price,
    cart_items.configuration_snapshot,
    cart_items.configuration_hash,
    cart_items.snapshot_schema_version,
    cart_items.snapshot_created_at
  FROM cart_items
  WHERE cart_id = p_cart_id
    AND configuration_snapshot IS NOT NULL
    AND snapshot_schema_version >= 2;

  INSERT INTO commerce_checkout_sessions (
    order_id,
    cart_id,
    user_id,
    guest_token_hash,
    idempotency_key
  ) VALUES (
    created_order_id,
    p_cart_id,
    p_user_id,
    CASE WHEN p_user_id IS NULL THEN p_guest_token_hash ELSE NULL END,
    p_idempotency_key
  )
  RETURNING id INTO created_checkout_id;

  RETURN QUERY SELECT created_order_id, created_checkout_id;
END
$$;

REVOKE ALL ON FUNCTION create_commerce_pending_order(
  UUID, UUID, TEXT, TEXT, INTEGER, TEXT
) FROM PUBLIC;

-- RPC: attach_commerce_stripe_session
CREATE OR REPLACE FUNCTION attach_commerce_stripe_session(
  p_checkout_id UUID,
  p_order_id UUID,
  p_stripe_session_id TEXT,
  p_stripe_checkout_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE commerce_checkout_sessions
  SET
    stripe_session_id = p_stripe_session_id,
    stripe_checkout_url = p_stripe_checkout_url,
    status = 'redirect_ready',
    updated_at = now()
  WHERE id = p_checkout_id
    AND order_id = p_order_id
    AND (
      stripe_session_id IS NULL
      OR stripe_session_id = p_stripe_session_id
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout session attachment failed'
      USING ERRCODE = '23514';
  END IF;

  UPDATE orders
  SET stripe_checkout_session_id = p_stripe_session_id
  WHERE id = p_order_id
    AND (
      stripe_checkout_session_id IS NULL
      OR stripe_checkout_session_id = p_stripe_session_id
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order session attachment failed'
      USING ERRCODE = '23514';
  END IF;
END
$$;

REVOKE ALL ON FUNCTION attach_commerce_stripe_session(
  UUID, UUID, TEXT, TEXT
) FROM PUBLIC;

-- RPC: complete_stripe_checkout_payment
CREATE OR REPLACE FUNCTION complete_stripe_checkout_payment(
  p_event_id TEXT,
  p_stripe_session_id TEXT,
  p_payment_intent_id TEXT,
  p_customer_email TEXT,
  p_shipping_address JSONB,
  p_paid_amount INTEGER,
  p_currency TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_order orders%ROWTYPE;
BEGIN
  SELECT orders.*
    INTO target_order
  FROM orders
  JOIN commerce_checkout_sessions checkout
    ON checkout.order_id = orders.id
  WHERE checkout.stripe_session_id = p_stripe_session_id
  FOR UPDATE OF orders;

  IF target_order.id IS NULL THEN
    RAISE EXCEPTION 'checkout order not found' USING ERRCODE = 'P0002';
  END IF;
  IF target_order.total::INTEGER <> p_paid_amount
    OR upper(target_order.currency) <> upper(p_currency) THEN
    RAISE EXCEPTION 'paid amount or currency mismatch'
      USING ERRCODE = '23514';
  END IF;
  IF p_shipping_address IS NULL
    OR COALESCE(p_shipping_address->>'line1', '') = ''
    OR COALESCE(p_shipping_address->>'city', '') = ''
    OR COALESCE(p_shipping_address->>'postal_code', '') = ''
    OR COALESCE(p_shipping_address->>'country', '') = '' THEN
    RAISE EXCEPTION 'complete shipping address required'
      USING ERRCODE = '23514';
  END IF;

  UPDATE orders
  SET
    status = 'paid',
    payment_status = 'paid',
    processing_status = 'paid',
    stripe_payment_intent_id = p_payment_intent_id,
    customer_email = p_customer_email,
    shipping_address = p_shipping_address,
    paid_amount = p_paid_amount,
    stripe_event_id = p_event_id,
    updated_at = now()
  WHERE id = target_order.id;

  UPDATE commerce_checkout_sessions
  SET status = 'paid', updated_at = now()
  WHERE order_id = target_order.id;

  UPDATE carts
  SET status = 'converted', updated_at = now()
  WHERE id = target_order.cart_id;

  UPDATE commerce_webhook_events
  SET
    receipt_status = 'processed',
    order_id = target_order.id,
    processed_at = now(),
    error_code = NULL,
    error_message = NULL
  WHERE source = 'stripe' AND event_id = p_event_id;

  RETURN target_order.id;
END
$$;

REVOKE ALL ON FUNCTION complete_stripe_checkout_payment(
  TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT
) FROM PUBLIC;

-- ============================================================================
-- SECTION 006: GUEST PERMISSIONS & FULFILLMENT STATE MACHINE
-- Source: migrations/006_make_user_id_nullable_for_guests.sql & 006_add_fulfillment_jobs.sql
-- ============================================================================

-- Allow guest rows in core tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_uploads') THEN
    ALTER TABLE user_uploads ALTER COLUMN user_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_designs') THEN
    ALTER TABLE generated_designs ALTER COLUMN user_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkout_sessions') THEN
    ALTER TABLE checkout_sessions ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Fulfillment columns on orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT
    NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS production_submitted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS fulfillment_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  triggering_event_id TEXT,
  mode TEXT NOT NULL DEFAULT 'disabled'
    CHECK (mode IN ('disabled', 'dry-run', 'live')),
  state TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (
      state IN (
        'pending_payment',
        'paid',
        'preparing_fulfillment',
        'fulfillment_ready',
        'fulfillment_submitting',
        'dry_run_complete',
        'submitted',
        'in_production',
        'shipped',
        'delivered',
        'fulfillment_failed',
        'cancelled',
        'refunded'
      )
    ),
  payload_hash TEXT,
  redacted_payload JSONB,
  printify_order_id TEXT,
  production_submitted_at TIMESTAMPTZ,
  external_request_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  retry_classification TEXT,
  error_code TEXT,
  error_message TEXT,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (attempt_count >= 0)
);

CREATE TABLE IF NOT EXISTS fulfillment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfillment_job_id UUID NOT NULL
    REFERENCES fulfillment_jobs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  external_request_id TEXT,
  request_payload_redacted JSONB,
  response_payload_redacted JSONB,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('started', 'succeeded', 'failed', 'uncertain')),
  retry_classification TEXT,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fulfillment_job_id, attempt_number, action)
);

CREATE INDEX IF NOT EXISTS fulfillment_jobs_operations_idx
  ON fulfillment_jobs (state, retry_classification, updated_at);

CREATE OR REPLACE FUNCTION ensure_paid_order_fulfillment_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.payment_status = 'paid'
    AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    INSERT INTO fulfillment_jobs (
      order_id,
      idempotency_key,
      triggering_event_id,
      mode,
      state
    ) VALUES (
      NEW.id,
      'printify-order:' || NEW.id::text,
      NEW.stripe_event_id,
      'disabled',
      'paid'
    )
    ON CONFLICT (order_id) DO NOTHING;
    NEW.fulfillment_status := 'paid';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS orders_create_fulfillment_job ON orders;
CREATE TRIGGER orders_create_fulfillment_job
BEFORE UPDATE OF payment_status ON orders
FOR EACH ROW
EXECUTE FUNCTION ensure_paid_order_fulfillment_job();

CREATE OR REPLACE FUNCTION lock_fulfillment_job(
  p_order_id UUID,
  p_worker_id TEXT,
  p_mode TEXT
)
RETURNS TABLE(job_id UUID, state TEXT, already_complete BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target fulfillment_jobs%ROWTYPE;
BEGIN
  IF p_mode NOT IN ('dry-run', 'live') THEN
    RAISE EXCEPTION 'disabled mode cannot acquire a fulfillment job'
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO target
  FROM fulfillment_jobs
  WHERE order_id = p_order_id
  FOR UPDATE;
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'fulfillment job not found' USING ERRCODE = 'P0002';
  END IF;

  IF target.state IN (
    'dry_run_complete',
    'submitted',
    'in_production',
    'shipped',
    'delivered'
  ) THEN
    RETURN QUERY SELECT target.id, target.state, true;
    RETURN;
  END IF;
  IF target.locked_at IS NOT NULL
    AND target.locked_at > now() - interval '5 minutes'
    AND target.locked_by <> p_worker_id THEN
    RAISE EXCEPTION 'fulfillment job is locked'
      USING ERRCODE = '55P03';
  END IF;

  UPDATE fulfillment_jobs
  SET
    mode = p_mode,
    state = 'preparing_fulfillment',
    locked_at = now(),
    locked_by = p_worker_id,
    attempt_count = attempt_count + 1,
    updated_at = now()
  WHERE id = target.id;

  UPDATE orders
  SET fulfillment_status = 'preparing_fulfillment'
  WHERE id = p_order_id;

  RETURN QUERY
    SELECT target.id, 'preparing_fulfillment'::TEXT, false;
END
$$;

REVOKE ALL ON FUNCTION lock_fulfillment_job(UUID, TEXT, TEXT) FROM PUBLIC;

-- ============================================================================
-- SECTION 007: HARDENED WEBHOOKS, PRINTIFY TRACKING & TRANSITIONS
-- Source: migrations/007_harden_commerce_webhooks.sql
-- ============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS orders_printify_order_unique
  ON orders (printify_order_id)
  WHERE printify_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS fulfillment_jobs_printify_order_unique
  ON fulfillment_jobs (printify_order_id)
  WHERE printify_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION begin_commerce_webhook_event(
  p_source TEXT,
  p_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  IF p_source NOT IN ('stripe', 'printify')
    OR length(trim(p_event_id)) = 0
    OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'invalid webhook receipt'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO commerce_webhook_events (
    source,
    event_id,
    event_type,
    payload,
    receipt_status,
    processing_attempts,
    last_attempted_at
  ) VALUES (
    p_source,
    p_event_id,
    p_event_type,
    p_payload,
    'processing',
    1,
    now()
  )
  ON CONFLICT (source, event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END
$$;

CREATE OR REPLACE FUNCTION claim_failed_commerce_webhook_event(
  p_source TEXT,
  p_event_id TEXT
)
RETURNS TABLE(event_type TEXT, payload JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  UPDATE commerce_webhook_events event
  SET
    receipt_status = 'processing',
    processing_attempts = event.processing_attempts + 1,
    last_attempted_at = now(),
    replayed_at = now(),
    processed_at = NULL,
    error_code = NULL,
    error_message = NULL
  WHERE event.source = p_source
    AND event.event_id = p_event_id
    AND event.receipt_status = 'failed'
  RETURNING event.event_type, event.payload;
END
$$;

CREATE OR REPLACE FUNCTION finish_commerce_webhook_event(
  p_source TEXT,
  p_event_id TEXT,
  p_status TEXT,
  p_error_code TEXT,
  p_error_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('processed', 'failed') THEN
    RAISE EXCEPTION 'invalid webhook terminal status'
      USING ERRCODE = '23514';
  END IF;
  UPDATE commerce_webhook_events
  SET
    receipt_status = p_status,
    processed_at = CASE WHEN p_status = 'processed' THEN now() ELSE NULL END,
    last_attempted_at = now(),
    error_code = p_error_code,
    error_message = left(p_error_message, 500)
  WHERE source = p_source
    AND event_id = p_event_id
    AND receipt_status = 'processing';
END
$$;

CREATE OR REPLACE FUNCTION apply_printify_order_transition(
  p_event_id TEXT,
  p_printify_order_id TEXT,
  p_next_status TEXT,
  p_tracking_number TEXT,
  p_tracking_carrier TEXT,
  p_tracking_url TEXT,
  p_occurred_at TIMESTAMPTZ
)
RETURNS TABLE(
  outcome TEXT,
  order_id UUID,
  previous_status TEXT,
  current_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_order orders%ROWTYPE;
  old_status TEXT;
  old_rank INTEGER;
  next_rank INTEGER;
  should_apply BOOLEAN := false;
BEGIN
  IF p_next_status NOT IN (
    'submitted',
    'in_production',
    'shipped',
    'delivered',
    'fulfillment_failed',
    'cancelled'
  ) THEN
    RAISE EXCEPTION 'invalid Printify fulfillment status'
      USING ERRCODE = '23514';
  END IF;

  SELECT orders.*
    INTO target_order
  FROM orders
  LEFT JOIN fulfillment_jobs
    ON fulfillment_jobs.order_id = orders.id
  WHERE orders.printify_order_id = p_printify_order_id
    OR fulfillment_jobs.printify_order_id = p_printify_order_id
  ORDER BY orders.created_at
  LIMIT 1
  FOR UPDATE OF orders;

  IF target_order.id IS NULL THEN
    UPDATE commerce_webhook_events
    SET
      receipt_status = 'failed',
      error_code = 'PRINTIFY_ORDER_NOT_FOUND',
      error_message = 'No local order matches the Printify order identifier.',
      last_attempted_at = now()
    WHERE source = 'printify'
      AND event_id = p_event_id
      AND receipt_status = 'processing';
    RETURN QUERY SELECT
      'missing_order'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  old_status := COALESCE(target_order.fulfillment_status, 'pending_payment');
  old_rank := CASE old_status
    WHEN 'pending_payment' THEN 0
    WHEN 'paid' THEN 1
    WHEN 'preparing_fulfillment' THEN 2
    WHEN 'fulfillment_ready' THEN 3
    WHEN 'fulfillment_submitting' THEN 4
    WHEN 'dry_run_complete' THEN 4
    WHEN 'submitted' THEN 5
    WHEN 'in_production' THEN 6
    WHEN 'shipped' THEN 7
    WHEN 'delivered' THEN 8
    ELSE NULL
  END;
  next_rank := CASE p_next_status
    WHEN 'submitted' THEN 5
    WHEN 'in_production' THEN 6
    WHEN 'shipped' THEN 7
    WHEN 'delivered' THEN 8
    ELSE NULL
  END;

  should_apply := CASE
    WHEN old_status = p_next_status THEN false
    WHEN old_status IN ('delivered', 'refunded') THEN false
    WHEN old_status = 'cancelled' THEN false
    WHEN p_next_status = 'cancelled' THEN true
    WHEN p_next_status = 'fulfillment_failed'
      THEN old_status NOT IN ('shipped', 'delivered')
    WHEN old_status = 'fulfillment_failed'
      THEN next_rank >= 5
    WHEN old_rank IS NOT NULL AND next_rank IS NOT NULL
      THEN next_rank > old_rank
    ELSE false
  END;

  IF should_apply THEN
    UPDATE orders
    SET
      fulfillment_status = p_next_status,
      status = CASE p_next_status
        WHEN 'shipped' THEN 'shipped'
        WHEN 'delivered' THEN 'delivered'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'fulfillment_failed' THEN 'failed'
        ELSE 'processing'
      END,
      tracking_number = COALESCE(p_tracking_number, tracking_number),
      tracking_carrier = COALESCE(p_tracking_carrier, tracking_carrier),
      tracking_url = COALESCE(p_tracking_url, tracking_url),
      shipped_at = CASE
        WHEN p_next_status = 'shipped'
          THEN COALESCE(p_occurred_at, shipped_at, now())
        ELSE shipped_at
      END,
      delivered_at = CASE
        WHEN p_next_status = 'delivered'
          THEN COALESCE(p_occurred_at, delivered_at, now())
        ELSE delivered_at
      END,
      updated_at = now()
    WHERE id = target_order.id;

    UPDATE fulfillment_jobs
    SET
      state = p_next_status,
      error_code = CASE
        WHEN p_next_status = 'fulfillment_failed'
          THEN COALESCE(error_code, 'PRINTIFY_REPORTED_FAILURE')
        ELSE NULL
      END,
      error_message = CASE
        WHEN p_next_status = 'fulfillment_failed'
          THEN COALESCE(error_message, 'Printify reported an order failure.')
        ELSE NULL
      END,
      retry_classification = CASE
        WHEN p_next_status = 'fulfillment_failed'
          THEN COALESCE(retry_classification, 'manual_review')
        ELSE NULL
      END,
      completed_at = CASE
        WHEN p_next_status IN ('delivered', 'cancelled') THEN now()
        ELSE completed_at
      END,
      updated_at = now()
    WHERE fulfillment_jobs.order_id = target_order.id;
  END IF;

  UPDATE commerce_webhook_events
  SET
    receipt_status = 'processed',
    order_id = target_order.id,
    processed_at = now(),
    last_attempted_at = now(),
    error_code = NULL,
    error_message = NULL
  WHERE source = 'printify'
    AND event_id = p_event_id
    AND receipt_status = 'processing';

  RETURN QUERY SELECT
    CASE WHEN should_apply THEN 'applied' ELSE 'ignored' END,
    target_order.id,
    old_status,
    CASE WHEN should_apply THEN p_next_status ELSE old_status END;
END
$$;

REVOKE ALL ON FUNCTION begin_commerce_webhook_event(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_failed_commerce_webhook_event(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION finish_commerce_webhook_event(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_printify_order_transition(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;

-- ============================================================================
-- SECTION 008: UNIFIED CANONICAL DESIGN-TO-PRODUCT PIPELINE
-- Source: migrations/008_unify_design_pipeline.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS commerce_designs (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'uploaded-photo',
      'uploaded-artwork',
      'ai-generated',
      'ai-styled',
      'background-removed',
      'curated',
      'text-personalized'
    )
  ),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    lifecycle_status IN (
      'draft',
      'scheduled',
      'published',
      'purchased',
      'archived'
    )
  ),
  legacy_generated_design_id UUID UNIQUE
    REFERENCES generated_designs(id) ON DELETE SET NULL,
  curated_design_id TEXT UNIQUE
    REFERENCES curated_designs(id) ON DELETE SET NULL,
  current_version_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (source_type = 'curated' AND curated_design_id IS NOT NULL)
    OR source_type <> 'curated'
  )
);

CREATE TABLE IF NOT EXISTS commerce_design_assets (
  id TEXT PRIMARY KEY,
  design_id TEXT NOT NULL
    REFERENCES commerce_designs(id) ON DELETE RESTRICT,
  version_id TEXT,
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'uploaded-photo',
      'uploaded-artwork',
      'ai-generated',
      'ai-styled',
      'background-removed',
      'curated',
      'text-personalized'
    )
  ),
  asset_role TEXT NOT NULL CHECK (
    asset_role IN (
      'original',
      'preview',
      'display',
      'production',
      'product-derivative'
    )
  ),
  parent_asset_id TEXT
    REFERENCES commerce_design_assets(id) ON DELETE RESTRICT,
  derivative_id TEXT,
  stable_url TEXT NOT NULL,
  storage_path TEXT,
  checksum TEXT,
  alt_text TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  has_transparency BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (width IS NULL OR width > 0),
  CHECK (height IS NULL OR height > 0),
  CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

CREATE TABLE IF NOT EXISTS commerce_design_versions (
  id TEXT PRIMARY KEY,
  design_id TEXT NOT NULL
    REFERENCES commerce_designs(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK (revision > 0),
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'uploaded-photo',
      'uploaded-artwork',
      'ai-generated',
      'ai-styled',
      'background-removed',
      'curated',
      'text-personalized'
    )
  ),
  version_reason TEXT NOT NULL CHECK (
    version_reason IN (
      'initial',
      'background-removed',
      'style-changed',
      'artwork-cropped',
      'product-derivative-generated',
      'text-personalization-changed',
      'legacy-generated-design-imported',
      'curated-design-imported'
    )
  ),
  original_asset_id TEXT NOT NULL
    REFERENCES commerce_design_assets(id) ON DELETE RESTRICT,
  preview_asset_id TEXT NOT NULL
    REFERENCES commerce_design_assets(id) ON DELETE RESTRICT,
  display_asset_id TEXT NOT NULL
    REFERENCES commerce_design_assets(id) ON DELETE RESTRICT,
  production_asset_id TEXT NOT NULL
    REFERENCES commerce_design_assets(id) ON DELETE RESTRICT,
  supersedes_version_id TEXT
    REFERENCES commerce_design_versions(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  UNIQUE (design_id, revision)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commerce_designs_current_version_fkey'
      AND conrelid = 'commerce_designs'::regclass
  ) THEN
    ALTER TABLE commerce_designs
      ADD CONSTRAINT commerce_designs_current_version_fkey
      FOREIGN KEY (current_version_id)
      REFERENCES commerce_design_versions(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commerce_design_assets_version_fkey'
      AND conrelid = 'commerce_design_assets'::regclass
  ) THEN
    ALTER TABLE commerce_design_assets
      ADD CONSTRAINT commerce_design_assets_version_fkey
      FOREIGN KEY (version_id)
      REFERENCES commerce_design_versions(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS design_product_adaptations (
  id TEXT PRIMARY KEY,
  design_version_id TEXT NOT NULL
    REFERENCES commerce_design_versions(id) ON DELETE RESTRICT,
  merchandising_product_id TEXT NOT NULL
    REFERENCES merchandising_products(id) ON DELETE RESTRICT,
  variant_id TEXT,
  derivative_asset_id TEXT
    REFERENCES commerce_design_assets(id) ON DELETE RESTRICT,
  default_placement JSONB NOT NULL,
  adaptation_status TEXT NOT NULL CHECK (
    adaptation_status IN (
      'not-required',
      'ready',
      'needs-review',
      'failed'
    )
  ),
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (design_version_id, merchandising_product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS commerce_product_configurations (
  id TEXT PRIMARY KEY,
  design_id TEXT NOT NULL
    REFERENCES commerce_designs(id) ON DELETE RESTRICT,
  design_version_id TEXT NOT NULL
    REFERENCES commerce_design_versions(id) ON DELETE RESTRICT,
  production_asset_id TEXT NOT NULL
    REFERENCES commerce_design_assets(id) ON DELETE RESTRICT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_token_hash TEXT,
  configuration JSONB NOT NULL,
  configuration_hash TEXT NOT NULL,
  configuration_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    configuration_status IN ('draft', 'approved', 'in-cart', 'purchased')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (owner_user_id IS NOT NULL OR guest_token_hash IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS product_configuration_snapshots (
  id TEXT PRIMARY KEY,
  product_configuration_id TEXT
    REFERENCES commerce_product_configurations(id) ON DELETE SET NULL,
  design_id TEXT NOT NULL
    REFERENCES commerce_designs(id) ON DELETE RESTRICT,
  design_version_id TEXT NOT NULL
    REFERENCES commerce_design_versions(id) ON DELETE RESTRICT,
  production_asset_id TEXT NOT NULL
    REFERENCES commerce_design_assets(id) ON DELETE RESTRICT,
  configuration_snapshot JSONB NOT NULL,
  configuration_hash TEXT NOT NULL,
  snapshot_schema_version SMALLINT NOT NULL CHECK (
    snapshot_schema_version >= 2
  ),
  locked_reason TEXT NOT NULL CHECK (
    locked_reason IN ('cart', 'checkout', 'purchase', 'fulfillment')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commerce_preview_results (
  id TEXT PRIMARY KEY,
  configuration_hash TEXT NOT NULL,
  renderer TEXT NOT NULL CHECK (renderer IN ('instant', 'printify')),
  preview_status TEXT NOT NULL CHECK (
    preview_status IN ('pending', 'ready', 'failed', 'needs-review')
  ),
  preview_url TEXT,
  design_version_id TEXT NOT NULL
    REFERENCES commerce_design_versions(id) ON DELETE RESTRICT,
  production_asset_id TEXT NOT NULL
    REFERENCES commerce_design_assets(id) ON DELETE RESTRICT,
  merchandising_product_id TEXT NOT NULL
    REFERENCES merchandising_products(id) ON DELETE RESTRICT,
  printify_variant_id INTEGER NOT NULL,
  view_id TEXT NOT NULL,
  difference_score NUMERIC(8, 6),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (
    difference_score IS NULL
    OR (difference_score >= 0 AND difference_score <= 1)
  )
);

CREATE INDEX IF NOT EXISTS commerce_designs_owner_updated_idx
  ON commerce_designs (owner_user_id, updated_at DESC)
  WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS commerce_designs_publication_idx
  ON commerce_designs (lifecycle_status, updated_at DESC)
  WHERE lifecycle_status IN ('scheduled', 'published');
CREATE INDEX IF NOT EXISTS commerce_design_assets_design_idx
  ON commerce_design_assets (design_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_design_assets_version_idx
  ON commerce_design_assets (version_id)
  WHERE version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS commerce_design_versions_design_idx
  ON commerce_design_versions (design_id, revision DESC);
CREATE INDEX IF NOT EXISTS design_product_adaptations_product_idx
  ON design_product_adaptations (
    merchandising_product_id,
    adaptation_status
  );
CREATE INDEX IF NOT EXISTS commerce_configurations_owner_idx
  ON commerce_product_configurations (owner_user_id, updated_at DESC)
  WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS commerce_configurations_guest_idx
  ON commerce_product_configurations (guest_token_hash, updated_at DESC)
  WHERE guest_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS configuration_snapshots_design_idx
  ON product_configuration_snapshots (design_id, created_at DESC);
CREATE INDEX IF NOT EXISTS preview_results_configuration_idx
  ON commerce_preview_results (
    configuration_hash,
    renderer,
    created_at DESC
  );

ALTER TABLE commerce_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_product_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_product_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_configuration_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_preview_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commerce_designs_owner_select ON commerce_designs;
CREATE POLICY commerce_designs_owner_select
  ON commerce_designs
  FOR SELECT
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS commerce_designs_owner_insert ON commerce_designs;
CREATE POLICY commerce_designs_owner_insert
  ON commerce_designs
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS commerce_designs_owner_update ON commerce_designs;
CREATE POLICY commerce_designs_owner_update
  ON commerce_designs
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION prevent_locked_design_version_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'locked design versions are immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS commerce_design_versions_immutable ON commerce_design_versions;
CREATE TRIGGER commerce_design_versions_immutable
BEFORE UPDATE OR DELETE ON commerce_design_versions
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_design_version_mutation();

CREATE OR REPLACE FUNCTION prevent_product_configuration_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'product configuration snapshots are immutable'
    USING ERRCODE = '23514';
END
$$;

DROP TRIGGER IF EXISTS product_configuration_snapshots_immutable ON product_configuration_snapshots;
CREATE TRIGGER product_configuration_snapshots_immutable
BEFORE UPDATE OR DELETE ON product_configuration_snapshots
FOR EACH ROW
EXECUTE FUNCTION prevent_product_configuration_snapshot_mutation();

-- ============================================================================
-- SECTION 009: PRINTME STUDIO EXTENSIONS & METRICS
-- Source: migrations/009_add_printme_studio.sql
-- ============================================================================

ALTER TABLE curated_designs
  ADD COLUMN IF NOT EXISTS rights_documentation_notes TEXT,
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prior_version_id TEXT REFERENCES design_versions(id) ON DELETE RESTRICT;

ALTER TABLE design_assets
  ADD COLUMN IF NOT EXISTS asset_role TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS source_asset_id TEXT REFERENCES design_assets(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'design_assets_studio_role_check'
      AND conrelid = 'design_assets'::regclass
  ) THEN
    ALTER TABLE design_assets
      ADD CONSTRAINT design_assets_studio_role_check
      CHECK (
        asset_role IS NULL OR asset_role IN (
          'original',
          'display',
          'thumbnail',
          'production'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'design_assets_studio_file_size_check'
      AND conrelid = 'design_assets'::regclass
  ) THEN
    ALTER TABLE design_assets
      ADD CONSTRAINT design_assets_studio_file_size_check
      CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS studio_design_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curated_design_id TEXT NOT NULL
    REFERENCES curated_designs(id) ON DELETE RESTRICT,
  design_version_id TEXT REFERENCES design_versions(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (
    action IN (
      'created',
      'updated',
      'scheduled',
      'published',
      'archived',
      'previewed'
    )
  ),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prior_version_id TEXT REFERENCES design_versions(id) ON DELETE RESTRICT,
  change_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_design_metrics (
  curated_design_id TEXT PRIMARY KEY
    REFERENCES curated_designs(id) ON DELETE CASCADE,
  paid_order_quantity BIGINT NOT NULL DEFAULT 0 CHECK (paid_order_quantity >= 0),
  recent_view_score NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (recent_view_score >= 0),
  recent_cart_score NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (recent_cart_score >= 0),
  trending_score NUMERIC(14, 4) GENERATED ALWAYS AS (
    recent_view_score * 0.25 + recent_cart_score * 0.75
  ) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curated_designs_studio_status_idx
  ON curated_designs (publication_status, scheduled_for, updated_at DESC);
CREATE INDEX IF NOT EXISTS curated_designs_staff_pick_idx
  ON curated_designs (is_staff_pick, updated_at DESC)
  WHERE is_staff_pick;
CREATE INDEX IF NOT EXISTS studio_design_audit_design_idx
  ON studio_design_audit_log (curated_design_id, created_at DESC);
CREATE INDEX IF NOT EXISTS studio_design_metrics_trending_idx
  ON studio_design_metrics (trending_score DESC)
  WHERE trending_score > 0;
CREATE INDEX IF NOT EXISTS studio_design_metrics_bestsellers_idx
  ON studio_design_metrics (paid_order_quantity DESC)
  WHERE paid_order_quantity > 0;

ALTER TABLE studio_design_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_design_metrics ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION prevent_published_design_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.publication_status = 'published' THEN
    RAISE EXCEPTION 'published designs must be archived, not deleted'
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END
$$;

DROP TRIGGER IF EXISTS curated_designs_archive_instead_of_delete ON curated_designs;
CREATE TRIGGER curated_designs_archive_instead_of_delete
BEFORE DELETE ON curated_designs
FOR EACH ROW
EXECUTE FUNCTION prevent_published_design_delete();

CREATE OR REPLACE FUNCTION prevent_purchased_curated_version_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.product_configuration_snapshots snapshot
    WHERE snapshot.design_version_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'purchased design versions are immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END
$$;

DROP TRIGGER IF EXISTS design_versions_preserve_purchased ON design_versions;
CREATE TRIGGER design_versions_preserve_purchased
BEFORE UPDATE OR DELETE ON design_versions
FOR EACH ROW
EXECUTE FUNCTION prevent_purchased_curated_version_mutation();

COMMIT;

-- ============================================================================
-- VERIFICATION & HEALTH CHECK QUERY
-- Run the query below to confirm all tables, views, and functions are verified.
-- ============================================================================
SELECT
  item_type,
  item_name,
  status
FROM (
  -- Check Tables
  SELECT
    'table' AS item_type,
    table_name AS item_name,
    'EXISTS' AS status
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'catalog_blueprints',
      'catalog_print_providers',
      'catalog_provider_variants',
      'catalog_print_placements',
      'merchandising_products',
      'approved_product_variants',
      'retail_prices',
      'catalog_shipping_profiles',
      'catalog_sync_runs',
      'design_assets',
      'curated_designs',
      'design_versions',
      'design_product_defaults',
      'design_product_compatibility',
      'collections',
      'collection_designs',
      'commerce_drops',
      'drop_designs',
      'analytics_events',
      'commerce_checkout_sessions',
      'commerce_webhook_events',
      'fulfillment_jobs',
      'fulfillment_attempts',
      'commerce_designs',
      'commerce_design_assets',
      'commerce_design_versions',
      'design_product_adaptations',
      'commerce_product_configurations',
      'product_configuration_snapshots',
      'commerce_preview_results',
      'studio_design_audit_log',
      'studio_design_metrics'
    )
  UNION ALL
  -- Check Views
  SELECT
    'view' AS item_type,
    table_name AS item_name,
    'EXISTS' AS status
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN (
      'commerce_published_designs',
      'commerce_published_collections',
      'commerce_published_drops'
    )
  UNION ALL
  -- Check Functions
  SELECT
    'function' AS item_type,
    routine_name AS item_name,
    'EXISTS' AS status
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'prevent_order_configuration_snapshot_mutation',
      'create_commerce_pending_order',
      'attach_commerce_stripe_session',
      'complete_stripe_checkout_payment',
      'ensure_paid_order_fulfillment_job',
      'lock_fulfillment_job',
      'begin_commerce_webhook_event',
      'claim_failed_commerce_webhook_event',
      'finish_commerce_webhook_event',
      'apply_printify_order_transition',
      'prevent_locked_design_version_mutation',
      'prevent_product_configuration_snapshot_mutation',
      'prevent_published_design_delete',
      'prevent_purchased_curated_version_mutation'
    )
) verification
ORDER BY item_type, item_name;
