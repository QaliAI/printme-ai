import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tables = ['catalog_blueprints', 'catalog_print_providers', 'catalog_provider_variants', 'catalog_print_placements', 'merchandising_products', 'approved_product_variants', 'retail_prices', 'catalog_shipping_profiles', 'catalog_sync_runs'];
let db: PGlite;
const sql = (name: string) => readFileSync(new URL(`../../migrations/${name}.sql`, import.meta.url), 'utf8');

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE FUNCTION uuid_generate_v4() RETURNS UUID LANGUAGE sql AS 'SELECT gen_random_uuid()';`);
  await db.exec(sql('003_add_curated_catalog'));
  // Reproduce hosted default grants and demonstrate the observed vulnerability.
  await db.exec('GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role; SET ROLE anon;');
  await db.exec("INSERT INTO catalog_blueprints(printify_blueprint_id,title) VALUES(1,'Fixture'); RESET ROLE;");
  await db.exec(sql('016_restrict_catalog_writes'));
  await db.exec(sql('016_restrict_catalog_writes'));
}, 30000);
afterAll(async () => { await db?.close(); });

describe('catalog is read only for storefront roles', () => {
  for (const role of ['anon', 'authenticated']) {
    it(`preserves intended catalog reads but denies every write for ${role}`, async () => {
      await db.exec(`SET ROLE ${role}`);
      try {
        for (const table of tables) {
          if (table === 'catalog_sync_runs') await expect(db.query(`SELECT * FROM ${table}`)).rejects.toThrow(/permission denied/);
          else await expect(db.query(`SELECT * FROM ${table}`)).resolves.toBeDefined();
          for (const statement of [`INSERT INTO ${table} DEFAULT VALUES`, `DELETE FROM ${table}`, `TRUNCATE ${table}`]) {
            await expect(db.query(statement)).rejects.toThrow(/permission denied/);
          }
        }
        expect((await db.query<{ title: string }>('SELECT title FROM catalog_blueprints')).rows).toEqual([{ title: 'Fixture' }]);
        await expect(db.exec("UPDATE catalog_blueprints SET title='Compromised' WHERE printify_blueprint_id=1")).rejects.toThrow(/permission denied/);
      } finally { await db.exec('RESET ROLE'); }
    });
  }

  it('permits service-role sync writes and internal reports while every table has RLS', async () => {
    await db.exec("SET ROLE service_role; INSERT INTO catalog_blueprints(printify_blueprint_id,title) VALUES(2,'Synced'); INSERT INTO catalog_sync_runs(mode,status) VALUES('dry-run','complete');");
    expect((await db.query('SELECT * FROM catalog_sync_runs')).rows).toHaveLength(1);
    await db.exec('RESET ROLE');
    const result = await db.query<{ relrowsecurity: boolean }>('SELECT relrowsecurity FROM pg_class WHERE relname = ANY($1::text[])', [tables]);
    expect(result.rows).toHaveLength(9);
    expect(result.rows.every(row => row.relrowsecurity)).toBe(true);
  });

  it('keeps the canonical catalog security upgrade identical to the reviewed migration', () => {
    const canonical = readFileSync(new URL('../../docs/launch/01_CANONICAL_LAUNCH_MIGRATION_vfgbvnfhvjmkmfmianpb.sql', import.meta.url), 'utf8');
    expect(canonical.slice(canonical.indexOf('-- The curated catalog is server controlled.')).replace(/\r\n/g, '\n').trim()).toBe(sql('016_restrict_catalog_writes').replace(/\r\n/g, '\n').trim());
  });
});
