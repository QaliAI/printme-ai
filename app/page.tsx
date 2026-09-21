import { HeroAnimation } from '@/components/landing/HeroAnimation';
import { FloatingExamples } from '@/components/landing/FloatingExamples';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { StylePresets } from '@/components/landing/StylePresets';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CTASection } from '@/components/landing/CTASection';
import { HomepageV2 } from '@/components/home-v2/HomepageV2';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { SeasonalEditSection } from '@/components/seasonal/SeasonalEditSection';

export default async function Home() {
  if (isReviewFeatureEnabled('homepage')) {
    return <HomepageV2 />;
  }

  const products = getApprovedMerchProducts();
  const designs = await getDesignCatalogService().listPublished();

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Hero Section with Animated Phone-to-Product Transformation */}
      <HeroAnimation />

      {/* The Seasonal Edit: Curated Trends & Personalization */}
      <SeasonalEditSection products={products} designs={designs} />

      {/* How It Works - 3 steps with smooth scroll reveals */}
      <HowItWorks />

      {/* Style Presets with Floating Cards */}
      <StylePresets />

      {/* Floating Design Examples */}
      <FloatingExamples />

      {/* Product Showcase with 3D Hover */}
      <ProductShowcase />

      {/* Final CTA */}
      <CTASection />
    </div>
  );
}
