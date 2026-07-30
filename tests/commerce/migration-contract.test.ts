import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL(
    '../../migrations/002_add_cart_configuration_snapshot.sql',
    import.meta.url
  ),
  'utf8'
);

describe('commerce snapshot migration contract', () => {
  it('adds guest ownership and versioned snapshot verification metadata', () => {
    expect(migration).toContain('guest_token_hash TEXT');
    expect(migration).toContain('configuration_snapshot JSONB');
    expect(migration).toContain('configuration_hash TEXT');
    expect(migration).toContain('snapshot_schema_version SMALLINT');
    expect(migration).toContain('snapshot_created_at TIMESTAMPTZ');
  });

  it('enforces immutable order snapshots and documents rollback', () => {
    expect(migration).toContain(
      'prevent_order_configuration_snapshot_mutation'
    );
    expect(migration).toContain(
      'order_items_configuration_snapshot_immutable'
    );
    expect(migration).toContain('-- Rollback instructions');
    expect(migration).toContain('DROP COLUMN IF EXISTS configuration_snapshot');
  });
});
