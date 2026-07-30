import { afterEach, describe, expect, it } from 'vitest';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

const original = {
  explicit: process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED,
  vercelEnvironment: process.env.VERCEL_ENV,
  branch: process.env.VERCEL_GIT_COMMIT_REF,
};

afterEach(() => {
  process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED = original.explicit;
  process.env.VERCEL_ENV = original.vercelEnvironment;
  process.env.VERCEL_GIT_COMMIT_REF = original.branch;
});

describe('Sprint 3 review feature flags', () => {
  it('supports explicit local and staging enablement', () => {
    process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED = 'true';
    expect(isReviewFeatureEnabled('commerce')).toBe(true);
  });

  it('enables only the dedicated Sprint 3 Vercel preview branch', () => {
    delete process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED;
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF =
      'feature/unified-commerce-studio-sprint-3';
    expect(isReviewFeatureEnabled('commerce')).toBe(true);
    expect(isReviewFeatureEnabled('studio')).toBe(true);

    process.env.VERCEL_GIT_COMMIT_REF = 'main';
    expect(isReviewFeatureEnabled('commerce')).toBe(false);
  });

  it('never implicitly enables production', () => {
    delete process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED;
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_GIT_COMMIT_REF =
      'feature/unified-commerce-studio-sprint-3';
    expect(isReviewFeatureEnabled('commerce')).toBe(false);
  });
});
