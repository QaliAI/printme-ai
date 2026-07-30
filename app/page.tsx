import { HeroAnimation } from '@/components/landing/HeroAnimation';
import { FloatingExamples } from '@/components/landing/FloatingExamples';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { StylePresets } from '@/components/landing/StylePresets';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CTASection } from '@/components/landing/CTASection';
import { HomepageV2 } from '@/components/home-v2/HomepageV2';

export default function Home() {
  if (process.env.NEXT_PUBLIC_HOMEPAGE_V2_ENABLED === 'true') {
    return <HomepageV2 />;
  }

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Hero Section with Animated Phone-to-Product Transformation */}
      <HeroAnimation />

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
