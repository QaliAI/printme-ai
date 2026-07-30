-- Server-controlled curated Printify catalog.
-- This migration stores approved launch mappings and sync observations. Catalog
-- syncs must never update retail_prices automatically.

BEGIN;

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

COMMIT;

-- Rollback (only after removing dependent application code):
-- BEGIN;
-- DROP TABLE IF EXISTS catalog_sync_runs;
-- DROP TABLE IF EXISTS catalog_shipping_profiles;
-- DROP TABLE IF EXISTS retail_prices;
-- DROP TABLE IF EXISTS approved_product_variants;
-- DROP TABLE IF EXISTS merchandising_products;
-- DROP TABLE IF EXISTS catalog_print_placements;
-- DROP TABLE IF EXISTS catalog_provider_variants;
-- DROP TABLE IF EXISTS catalog_print_providers;
-- DROP TABLE IF EXISTS catalog_blueprints;
-- COMMIT;
