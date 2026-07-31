export type ReviewFeature =
  | 'commerce'
  | 'homepage'
  | 'unified-create'
  | 'studio';

const sprint3ReviewBranch =
  'feature/unified-commerce-studio-sprint-3';
const launchReleaseBranches = new Set([
  'release/launch-safe-homepage-v2-2026-07-31',
  'master',
]);

const environmentKeys: Record<ReviewFeature, string> = {
  commerce: 'NEXT_PUBLIC_COMMERCE_V2_ENABLED',
  homepage: 'NEXT_PUBLIC_HOMEPAGE_V2_ENABLED',
  'unified-create': 'NEXT_PUBLIC_UNIFIED_CREATE_ENABLED',
  studio: 'NEXT_PUBLIC_STUDIO_ENABLED',
};

export function isLaunchRelease() {
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  return Boolean(branch && launchReleaseBranches.has(branch));
}

export function isReviewFeatureEnabled(feature: ReviewFeature) {
  if (process.env[environmentKeys[feature]] === 'true') return true;

  const sprint3Preview =
    process.env.VERCEL_ENV === 'preview' &&
    process.env.VERCEL_GIT_COMMIT_REF === sprint3ReviewBranch;
  if (sprint3Preview) return true;

  // The launch release and its canonical master deployment deliberately enable
  // customer-facing surfaces. Studio remains explicit-only because it requires
  // real admin authorization and production storage policies.
  return feature !== 'studio' && isLaunchRelease();
}
