-- PrintMe Studio publishing metadata and audit trail.
-- Additive only. Do not apply to production during Sprint 3.

BEGIN;

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

DROP TRIGGER IF EXISTS curated_designs_archive_instead_of_delete
  ON curated_designs;

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

DROP TRIGGER IF EXISTS design_versions_preserve_purchased
  ON design_versions;

CREATE TRIGGER design_versions_preserve_purchased
BEFORE UPDATE OR DELETE ON design_versions
FOR EACH ROW
EXECUTE FUNCTION prevent_purchased_curated_version_mutation();

COMMIT;

-- Rollback notes:
-- Preserve audit and metrics data before rollback.
-- DROP TRIGGER IF EXISTS design_versions_preserve_purchased ON design_versions;
-- DROP FUNCTION IF EXISTS prevent_purchased_curated_version_mutation();
-- DROP TRIGGER IF EXISTS curated_designs_archive_instead_of_delete ON curated_designs;
-- DROP FUNCTION IF EXISTS prevent_published_design_delete();
-- DROP TABLE IF EXISTS studio_design_metrics;
-- DROP TABLE IF EXISTS studio_design_audit_log;
-- ALTER TABLE design_assets DROP CONSTRAINT IF EXISTS design_assets_studio_file_size_check;
-- ALTER TABLE design_assets DROP CONSTRAINT IF EXISTS design_assets_studio_role_check;
-- ALTER TABLE design_assets DROP COLUMN IF EXISTS source_asset_id;
-- ALTER TABLE design_assets DROP COLUMN IF EXISTS file_size_bytes;
-- ALTER TABLE design_assets DROP COLUMN IF EXISTS storage_path;
-- ALTER TABLE design_assets DROP COLUMN IF EXISTS asset_role;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS prior_version_id;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS archived_at;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS published_at;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS published_by;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS updated_by;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS created_by;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS is_staff_pick;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS scheduled_for;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS alt_text;
-- ALTER TABLE curated_designs DROP COLUMN IF EXISTS rights_documentation_notes;
