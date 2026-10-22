import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../migrations/017_pets_portraits.sql', import.meta.url), 'utf8');
let db: PGlite;
const owner = 'a'.repeat(64), ip = 'b'.repeat(64), hash = 'c'.repeat(64);
type Job = { id: string; status: string; reserved_cost_cents: number };
async function reserve(options: { owner?: string; ip?: string; requestId?: string; hash?: string; cost?: number; budget?: number; ownerLimit?: number; ipLimit?: number; globalLimit?: number } = {}) {
  return (await db.query<{ result: { job: Job; should_run: boolean } }>('SELECT reserve_pets_generation($1,$2,$3,$4,$5,$6,$7,$8,$9) result', [options.owner ?? owner, options.ip ?? ip, options.requestId ?? randomUUID(), options.hash ?? hash, options.cost ?? 20, options.budget ?? 100, options.ownerLimit ?? 3, options.ipLimit ?? 10, options.globalLimit ?? 100])).rows[0].result;
}
beforeAll(async () => {
  db = new PGlite(); await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(migration); await db.exec(migration);
}, 30000);
beforeEach(async () => { await db.exec('TRUNCATE pets_generation_jobs'); });
afterAll(async () => { await db.close(); });

describe('real PostgreSQL Pets cost ledger', () => {
  it('creates one durable reservation per owner request and rejects conflicting payloads', async () => {
    const requestId = randomUUID(); const first = await reserve({ requestId });
    const second = await reserve({ requestId });
    expect(first.should_run).toBe(true); expect(second.should_run).toBe(false); expect(second.job.id).toBe(first.job.id);
    await expect(reserve({ requestId, hash: 'd'.repeat(64) })).rejects.toMatchObject({ code: '23505' });
    expect((await db.query('SELECT * FROM pets_generation_jobs')).rows).toHaveLength(1);
  });
  it('serializes simultaneous request promises with exactly one admission', async () => {
    const requestId = randomUUID(); const responses = await Promise.all(Array.from({ length: 8 }, () => reserve({ requestId })));
    expect(responses.filter(result => result.should_run)).toHaveLength(1);
    // PGlite uses one connection; multi-connection hosted rehearsal is a separate gate.
  });
  it('enforces owner, shared IP and global daily count independently', async () => {
    await reserve({ ownerLimit: 1 }); await expect(reserve({ ownerLimit: 1 })).rejects.toMatchObject({ code: 'P0001' });
    await expect(reserve({ owner: 'd'.repeat(64), ipLimit: 1 })).rejects.toMatchObject({ code: 'P0001' });
    await expect(reserve({ owner: 'd'.repeat(64), ip: 'e'.repeat(64), globalLimit: 1 })).rejects.toMatchObject({ code: 'P0001' });
  });
  it('reserves the entire explicit cost ceiling atomically and retains it after failure', async () => {
    const first = await reserve({ cost: 60 });
    await db.query('SELECT finish_pets_generation($1,$2,$3,NULL,NULL,NULL)', [first.job.id, owner, 'uncertain']);
    await expect(reserve({ cost: 41 })).rejects.toMatchObject({ code: 'P0001' });
    expect((await db.query<{ sum: number }>('SELECT sum(reserved_cost_cents)::integer sum FROM pets_generation_jobs')).rows[0].sum).toBe(60);
    expect((await reserve({ cost: 40 })).should_run).toBe(true);
  });
  it('never reissues stale reservations and preserves completed state after lost acknowledgement', async () => {
    const requestId = randomUUID(), first = await reserve({ requestId });
    await db.query("UPDATE pets_generation_jobs SET updated_at=now()-interval '6 minutes' WHERE id=$1", [first.job.id]);
    expect(await reserve({ requestId })).toMatchObject({ should_run: false, job: { status: 'uncertain' } });
    const complete = await reserve();
    await db.query('SELECT finish_pets_generation($1,$2,$3,$4,$5,$6)', [complete.job.id, owner, 'completed', `pets/${complete.job.id}/original.png`, `pets/${complete.job.id}/preview.png`, 'req_fixture']);
    await db.query('SELECT finish_pets_generation($1,$2,$3,NULL,NULL,NULL)', [complete.job.id, owner, 'uncertain']);
    expect((await db.query<{ status: string }>('SELECT status FROM pets_generation_jobs WHERE id=$1', [complete.job.id])).rows[0].status).toBe('completed');
  });
  it('rejects forged owner finalization and non-canonical preview/original paths', async () => {
    const first = await reserve();
    await expect(db.query('SELECT finish_pets_generation($1,$2,$3,NULL,NULL,NULL)', [first.job.id, 'd'.repeat(64), 'failed'])).rejects.toMatchObject({ code: 'P0002' });
    await expect(db.query('SELECT finish_pets_generation($1,$2,$3,$4,$5,NULL)', [first.job.id, owner, 'completed', 'public/original.png', 'public/preview.png'])).rejects.toMatchObject({ code: '23514' });
  });
  it('denies anonymous/authenticated RPC execution and table access with RLS enabled', async () => {
    for (const role of ['anon', 'authenticated']) {
      const result = (await db.query<{ execute: boolean; select: boolean }>(`SELECT has_function_privilege($1,'reserve_pets_generation(text,text,uuid,text,integer,integer,integer,integer,integer)','EXECUTE') execute, has_table_privilege($1,'pets_generation_jobs','SELECT') select`, [role])).rows[0];
      expect(result.execute).toBe(false); expect(result.select).toBe(false);
      await db.exec(`SET ROLE ${role}`);
      try { await expect(db.query('SELECT pets_generation_ledger_version()')).rejects.toMatchObject({ code: '42501' }); } finally { await db.exec('RESET ROLE'); }
    }
    expect((await db.query<{ relrowsecurity: boolean }>("SELECT relrowsecurity FROM pg_class WHERE relname='pets_generation_jobs'")).rows[0].relrowsecurity).toBe(true);
  });
  it('rejects zero or negative cost configuration instead of providing invented pricing', async () => {
    await expect(reserve({ cost: 0 })).rejects.toMatchObject({ code: '23514' });
    await expect(reserve({ budget: -1 })).rejects.toMatchObject({ code: '23514' });
  });
});
