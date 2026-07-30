import type { ProductConfiguration } from './types';

export interface MockupPlacementObservation {
  normalizedX: number;
  normalizedY: number;
  normalizedScale: number;
  angle: number;
}

export interface OfficialMockupResult {
  cacheKey: string;
  url: string;
  instantRenderKey: string;
  observedPlacement?: MockupPlacementObservation;
  generatedAt: string;
}

export interface MockupDifference {
  centerDistance: number;
  scaleDifference: number;
  angleDifference: number;
  materiallyDifferent: boolean;
}

export interface OfficialMockupCache {
  get(key: string): Promise<OfficialMockupResult | null>;
  set(key: string, value: OfficialMockupResult): Promise<void>;
}

export interface OfficialMockupGenerator {
  generate(input: {
    configuration: ProductConfiguration;
    cacheKey: string;
  }): Promise<Omit<OfficialMockupResult, 'cacheKey' | 'instantRenderKey'>>;
}

export function officialMockupCacheKey(
  configuration: ProductConfiguration,
) {
  return [
    configuration.printifyBlueprintId,
    configuration.printifyProviderId,
    configuration.printifyVariantId,
    configuration.printPosition,
    configuration.decorationMethod,
    configuration.designVersionId ?? configuration.designVersion,
    configuration.instantPreview.renderKey,
  ].join(':');
}

function angleDistance(left: number, right: number) {
  const raw = Math.abs(left - right) % 360;
  return Math.min(raw, 360 - raw);
}

export function compareMockupPlacement(
  configuration: ProductConfiguration,
  observed: MockupPlacementObservation,
): MockupDifference {
  const centerDistance = Math.hypot(
    configuration.normalizedX - observed.normalizedX,
    configuration.normalizedY - observed.normalizedY,
  );
  const scaleDifference =
    Math.abs(configuration.normalizedScale - observed.normalizedScale) /
    Math.max(configuration.normalizedScale, 0.01);
  const angleDifference = angleDistance(configuration.angle, observed.angle);
  return {
    centerDistance,
    scaleDifference,
    angleDifference,
    materiallyDifferent:
      centerDistance > 0.05 ||
      scaleDifference > 0.08 ||
      angleDifference > 3,
  };
}

export async function generateReconciledOfficialMockup(input: {
  configuration: ProductConfiguration;
  cache: OfficialMockupCache;
  generator: OfficialMockupGenerator;
}) {
  const cacheKey = officialMockupCacheKey(input.configuration);
  const cached = await input.cache.get(cacheKey);
  const result =
    cached ??
    ({
      ...(await input.generator.generate({
        configuration: input.configuration,
        cacheKey,
      })),
      cacheKey,
      instantRenderKey: input.configuration.instantPreview.renderKey,
    } satisfies OfficialMockupResult);
  if (!cached) await input.cache.set(cacheKey, result);

  const difference = result.observedPlacement
    ? compareMockupPlacement(input.configuration, result.observedPlacement)
    : null;
  return {
    result,
    fromCache: Boolean(cached),
    difference,
    state: difference?.materiallyDifferent ? ('review' as const) : ('ready' as const),
    configuration: {
      ...input.configuration,
      officialMockupUrl: result.url,
      officialMockupState: difference?.materiallyDifferent
        ? ('review' as const)
        : ('ready' as const),
      officialMockupRenderKey: result.instantRenderKey,
    },
  };
}
