-- Curated design, version, asset, collection, and drop catalog.
-- Application reads use service-role access; public tables remain RLS-denied
-- until an explicit production policy review.

BEGIN;

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

COMMIT;

-- Rollback:
-- BEGIN;
-- DROP VIEW IF EXISTS commerce_published_drops;
-- DROP VIEW IF EXISTS commerce_published_collections;
-- DROP VIEW IF EXISTS commerce_published_designs;
-- DROP TABLE IF EXISTS drop_designs;
-- DROP TABLE IF EXISTS commerce_drops;
-- DROP TABLE IF EXISTS collection_designs;
-- DROP TABLE IF EXISTS collections;
-- DROP TABLE IF EXISTS design_product_compatibility;
-- DROP TABLE IF EXISTS design_product_defaults;
-- ALTER TABLE curated_designs
--   DROP CONSTRAINT IF EXISTS curated_designs_current_version_fkey;
-- DROP TABLE IF EXISTS design_versions;
-- DROP TABLE IF EXISTS curated_designs;
-- DROP TABLE IF EXISTS design_assets;
-- COMMIT;
