import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve('migrations/009_add_printme_studio.sql'),
  'utf8',
);

describe('PrintMe Studio migration', () => {
  it('is additive and preserves published and purchased versions', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS');
    expect(migration).toContain('studio_design_audit_log');
    expect(migration).toContain('studio_design_metrics');
    expect(migration).toContain('published designs must be archived');
    expect(migration).toContain('purchased design versions are immutable');
    expect(migration).not.toMatch(/DROP TABLE (?!IF EXISTS)/i);
    expect(migration).not.toMatch(/TRUNCATE/i);
  });

  it('defines real New, Trending, and Bestseller data inputs', () => {
    expect(migration).toContain('publication_status');
    expect(migration).toContain('trending_score');
    expect(migration).toContain('paid_order_quantity');
    expect(migration).toContain('WHERE paid_order_quantity > 0');
  });
});
