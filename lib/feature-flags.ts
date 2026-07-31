export type ReviewFeature =
  | 'commerce'
  | 'homepage'
  | 'unified-create'
  | 'studio';

const sprint3ReviewBranch =
  'feature/unified-commerce-studio-sprint-3';
const launchReleaseBranch =
  'release/launch-safe-homepage-v2-2026-07-31';

const environmentKeys: Record<ReviewFeature, string> = {
  commerce: 'NEXT_PUBLIC_COMMERCE_V2_ENABLED',
  homepage: 'NEXT_PUBLIC_HOMEPAGE_V2_ENABLED',
  'unified-create': 'NEXT_PUBLIC_UNIFIED_CREATE_ENABLED',
  studio: 'NEXT_PUBLIC_STUDIO_ENABLED',
};

export function isLaunchRelease() {
  return process.env.VERCEL_GIT_COMMIT_REF === launchReleaseBranch;
}

export function isReviewFeatureEnabled(feature: ReviewFeature) {
  if (process.env[environmentKeys[feature]] === 'true') return true;

  const sprint3Preview =
    process.env.VERCEL_ENV === 'preview' &&
    process.env.VERCEL_GIT_COMMIT_REF === sprint3ReviewBranch;
  if (sprint3Preview) return true;

  // The release branch deliberately enables customer-facing launch surfaces.
  // Studio remains explicit-only because it requires real admin authorization.
  return feature !== 'studio' && isLaunchRelease();
}
