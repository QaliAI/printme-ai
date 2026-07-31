import { afterEach, describe, expect, it } from 'vitest';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

const original = {
  commerce: process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED,
  homepage: process.env.NEXT_PUBLIC_HOMEPAGE_V2_ENABLED,
  create: process.env.NEXT_PUBLIC_UNIFIED_CREATE_ENABLED,
  studio: process.env.NEXT_PUBLIC_STUDIO_ENABLED,
  vercelEnvironment: process.env.VERCEL_ENV,
  branch: process.env.VERCEL_GIT_COMMIT_REF,
};

afterEach(() => {
  process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED = original.commerce;
  process.env.NEXT_PUBLIC_HOMEPAGE_V2_ENABLED = original.homepage;
  process.env.NEXT_PUBLIC_UNIFIED_CREATE_ENABLED = original.create;
  process.env.NEXT_PUBLIC_STUDIO_ENABLED = original.studio;
  process.env.VERCEL_ENV = original.vercelEnvironment;
  process.env.VERCEL_GIT_COMMIT_REF = original.branch;
});

describe('PrintMe feature flags', () => {
  it('supports explicit local and staging enablement', () => {
    process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED = 'true';
    expect(isReviewFeatureEnabled('commerce')).toBe(true);
  });

  it('enables the dedicated Sprint 3 preview branch', () => {
    delete process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED;
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF =
      'feature/unified-commerce-studio-sprint-3';
    expect(isReviewFeatureEnabled('commerce')).toBe(true);
    expect(isReviewFeatureEnabled('studio')).toBe(true);

    process.env.VERCEL_GIT_COMMIT_REF = 'main';
    expect(isReviewFeatureEnabled('commerce')).toBe(false);
  });

  it.each([
    'release/launch-safe-homepage-v2-2026-07-31',
    'master',
  ])('enables only customer-facing features on %s', (branch) => {
    delete process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED;
    delete process.env.NEXT_PUBLIC_HOMEPAGE_V2_ENABLED;
    delete process.env.NEXT_PUBLIC_UNIFIED_CREATE_ENABLED;
    delete process.env.NEXT_PUBLIC_STUDIO_ENABLED;
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_GIT_COMMIT_REF = branch;

    expect(isReviewFeatureEnabled('commerce')).toBe(true);
    expect(isReviewFeatureEnabled('homepage')).toBe(true);
    expect(isReviewFeatureEnabled('unified-create')).toBe(true);
    expect(isReviewFeatureEnabled('studio')).toBe(false);
  });

  it('does not enable Sprint 3 features on unrelated production branches', () => {
    delete process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED;
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_GIT_COMMIT_REF =
      'feature/unified-commerce-studio-sprint-3';
    expect(isReviewFeatureEnabled('commerce')).toBe(false);
  });
});
