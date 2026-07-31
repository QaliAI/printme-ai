-- Sprint 3 canonical design-to-product pipeline.
-- Additive only. Do not apply to production during Sprint 3.

BEGIN;

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

CREATE POLICY commerce_designs_owner_select
  ON commerce_designs
  FOR SELECT
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

CREATE POLICY commerce_designs_owner_insert
  ON commerce_designs
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

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

DROP TRIGGER IF EXISTS commerce_design_versions_immutable
  ON commerce_design_versions;

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

DROP TRIGGER IF EXISTS product_configuration_snapshots_immutable
  ON product_configuration_snapshots;

CREATE TRIGGER product_configuration_snapshots_immutable
BEFORE UPDATE OR DELETE ON product_configuration_snapshots
FOR EACH ROW
EXECUTE FUNCTION prevent_product_configuration_snapshot_mutation();

COMMIT;

-- Rollback notes:
-- Stop all Sprint 3 writers before rollback. Preserve snapshot rows externally.
-- No legacy table or legacy row is modified by this migration.
-- DROP TRIGGER IF EXISTS product_configuration_snapshots_immutable
--   ON product_configuration_snapshots;
-- DROP FUNCTION IF EXISTS prevent_product_configuration_snapshot_mutation();
-- DROP TRIGGER IF EXISTS commerce_design_versions_immutable
--   ON commerce_design_versions;
-- DROP FUNCTION IF EXISTS prevent_locked_design_version_mutation();
-- DROP TABLE IF EXISTS commerce_preview_results;
-- DROP TABLE IF EXISTS product_configuration_snapshots;
-- DROP TABLE IF EXISTS commerce_product_configurations;
-- DROP TABLE IF EXISTS design_product_adaptations;
-- ALTER TABLE commerce_designs
--   DROP CONSTRAINT IF EXISTS commerce_designs_current_version_fkey;
-- ALTER TABLE commerce_design_assets
--   DROP CONSTRAINT IF EXISTS commerce_design_assets_version_fkey;
-- DROP TABLE IF EXISTS commerce_design_versions;
-- DROP TABLE IF EXISTS commerce_design_assets;
-- DROP TABLE IF EXISTS commerce_designs;
