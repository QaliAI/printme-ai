import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL(
    '../../migrations/008_unify_design_pipeline.sql',
    import.meta.url,
  ),
  'utf8',
);

describe('unified design pipeline migration', () => {
  it('is additive and preserves both legacy design sources', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commerce_designs');
    expect(migration).toContain('legacy_generated_design_id UUID UNIQUE');
    expect(migration).toContain('curated_design_id TEXT UNIQUE');
    expect(migration).not.toMatch(/DROP TABLE IF EXISTS generated_designs;/);
    expect(migration).not.toMatch(/DROP TABLE IF EXISTS curated_designs;/);
  });

  it('stores separate assets, immutable versions, adaptations, and snapshots', () => {
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS commerce_design_assets',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS commerce_design_versions',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS design_product_adaptations',
    );
    expect(migration).toContain(
      'CREATE TABLE IF NOT EXISTS product_configuration_snapshots',
    );
    expect(migration).toContain('commerce_design_versions_immutable');
    expect(migration).toContain('product_configuration_snapshots_immutable');
  });

  it('enables RLS and indexes ownership and foreign-key access paths', () => {
    expect(migration).toContain(
      'ALTER TABLE commerce_designs ENABLE ROW LEVEL SECURITY',
    );
    expect(migration).toContain('commerce_designs_owner_updated_idx');
    expect(migration).toContain('commerce_design_versions_design_idx');
    expect(migration).toContain('commerce_design_assets_version_idx');
  });
});
