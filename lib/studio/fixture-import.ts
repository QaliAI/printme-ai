import { developmentDesignSeeds } from '@/lib/commerce/designs/seed';

export interface StudioFixtureImportRecord {
  id: string;
  slug: string;
  title: string;
  sourceAssetUrl: string;
  productionAssetUrl: string;
  rightsStatus: string;
  publicationStatus: 'draft';
  compatibleProductIds: string[];
}

export function getStudioFixtureImportPlan(): StudioFixtureImportRecord[] {
  return developmentDesignSeeds.map((design) => ({
    id: design.id,
    slug: design.slug,
    title: design.title,
    sourceAssetUrl: design.asset.url,
    productionAssetUrl:
      design.asset.productionUrl ?? design.asset.url,
    rightsStatus: design.rightsStatus,
    publicationStatus: 'draft',
    compatibleProductIds: design.compatibleProductIds,
  }));
}
