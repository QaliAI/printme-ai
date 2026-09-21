import { describe, expect, it } from 'vitest';
import { getStudioFixtureImportPlan } from '@/lib/studio/fixture-import';

describe('Studio fixture import support', () => {
  it('maps all available seeds into draft-only import records', () => {
    const plan = getStudioFixtureImportPlan();
    expect(plan).toHaveLength(14);
    expect(plan.every((record) => record.publicationStatus === 'draft')).toBe(
      true,
    );
    expect(
      plan.every(
        (record) =>
          record.sourceAssetUrl && record.productionAssetUrl,
      ),
    ).toBe(true);
  });
});
