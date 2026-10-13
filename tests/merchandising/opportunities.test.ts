import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SeedDesignRepository } from '@/lib/commerce/designs/repository';
import { isDemandProof, opportunitySchema } from '@/lib/merchandising/opportunities';
import { opportunityQueue } from '@/lib/merchandising/opportunity-queue';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('merchandising opportunity queue', () => {
  it('validates every entry', () => {
    for (const entry of opportunityQueue) expect(() => opportunitySchema.parse(entry)).not.toThrow();
    expect(new Set(opportunityQueue.map((entry) => entry.id)).size).toBe(opportunityQueue.length);
  });

  it('only publishes designs from decided, unblocked opportunities that exist in the catalog', async () => {
    const repository = new SeedDesignRepository();
    const published = new Set((await repository.listPublished()).map((design) => design.id));
    for (const entry of opportunityQueue) {
      if (entry.status === 'published') {
        expect(entry.decision, entry.id).toBeDefined();
        expect(entry.riskLevel).not.toBe('blocked');
        expect(entry.designIds.length > 0 || Boolean(entry.liveSurface), entry.id).toBe(true);
        for (const id of entry.designIds) expect(published.has(id), id).toBe(true);
      }
      if (entry.riskLevel === 'blocked') expect(entry.status).toBe('rejected');
    }
  });

  it('does not count snippets, keywords or shop-wide totals as demand proof', () => {
    const signals = opportunityQueue.flatMap((entry) => entry.signals);
    for (const signal of signals.filter((s) => s.verification !== 'listing-observed')) {
      expect(isDemandProof(signal)).toBe(false);
    }
    const raccoon = opportunityQueue.find((entry) => entry.id === 'opp-trash-panda')!;
    expect(raccoon.signals.some(isDemandProof)).toBe(false);
    expect(raccoon.demandConfidence).toBe('low');
  });

  it('stays out of the customer storefront', () => {
    const root = process.cwd();
    const storefront = [
      ...sourceFiles(path.join(root, 'app')).filter((file) => !file.includes(`${path.sep}admin${path.sep}`)),
      ...sourceFiles(path.join(root, 'components')),
    ];
    const leaks = storefront.filter((file) => readFileSync(file, 'utf8').includes('lib/merchandising'));
    expect(leaks).toEqual([]);
  });
});
