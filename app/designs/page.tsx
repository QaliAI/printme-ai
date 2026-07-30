import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';
import {
  CollectionLinks,
  DesignCatalogHeader,
  DesignFilters,
  DesignGrid,
} from '@/components/commerce/DesignCatalog';
import type { DesignFilter } from '@/lib/commerce/designs/models';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import styles from './designs.module.css';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// Helper to build Pollinations.ai image URLs
const getAIGeneratedUrl = (prompt: string, seed: number) => {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true&seed=${seed}&model=flux`;
};

// Curated featured designs matching user intent (funny, emotional, giftable)
const FEATURED_DESIGNS = [
  {
    title: "Presidential Pug Portrait",
    slug: "presidential-pug-portrait",
    styleSlug: "oil-painting-portrait",
    category: "Funny Gifts",
    prompt: "oil painting of a serious pug dog dressed in a formal suit and red tie behind a presidential podium, official portrait style, highly detailed",
    seed: 2040,
    tag: "Popular Choice",
    description: "Give the gift of absolute executive authority. This hilarious pug portrait is guaranteed to command respect and bring belly laughs to any home or office."
  },
  {
    title: "Majestic Fluffy King Cat",
    slug: "majestic-king-cat",
    styleSlug: "pet-royal-portrait",
    category: "Pet Lovers",
    prompt: "renaissance royal portrait of a majestic fluffy Persian cat wearing a gold crown and deep red royal velvet cloak, oil painting, museum quality",
    seed: 2041,
    tag: "Best Seller",
    description: "Your pet already rules the household—now let them rule the walls. Immortalize your feline companion with this elegant, regal Renaissance portrait."
  },
  {
    title: "Grandpa's Golden Hour Fishing",
    slug: "grandpa-fishing-sunset",
    styleSlug: "watercolor-memory",
    category: "Family Moments",
    prompt: "watercolor painting of a grandfather and grandson fishing on a calm lake at sunset, warm golden rays, dreamy pastel washes, emotional memory",
    seed: 2042,
    tag: "Heartwarming",
    description: "Capture the quiet warmth of family bonding. A touching, emotional watercolor print that makes a deeply personal keepsake for Father's Day or birthdays."
  },
  {
    title: "Monday Morning Meltdown",
    slug: "monday-morning-meltdown",
    styleSlug: "cartoon-gift-style",
    category: "Office Chaos",
    prompt: "funny cartoon illustration of a stressed cup of coffee with a cute face screaming while holding a computer mouse, bold outline cartoon style",
    seed: 2043,
    tag: "Office Favorite",
    description: "A tribute to the corporate grind. The ultimate desk accessory mug to help you power through endless video calls and Monday morning status reports."
  },
  {
    title: "Weekend Golf Champion",
    slug: "weekend-golf-champion",
    styleSlug: "cartoon-gift-style",
    category: "Sports & Hobbies",
    prompt: "playful cartoon caricature of a golfer sleeping in a sand trap hugging his golf club, bright colors, humorous illustration",
    seed: 2044,
    tag: "Trending",
    description: "For the golf enthusiast whose relationship with the game is 'complicated.' Perfect for bringing good-natured laughs to their custom weekend t-shirt."
  },
  {
    title: "Retro Campfire Adventure",
    slug: "retro-campfire-adventure",
    styleSlug: "clean-cutout",
    category: "Stickers & Logos",
    prompt: "clean vintage circular sticker design of a campfire in front of pine trees and mountains, 1970s retro graphic style, bold flat colors, isolated on white background",
    seed: 2045,
    tag: "Sticker Ready",
    description: "Celebrate the great outdoors with a clean, vintage 70s badge design. Looks incredibly authentic printed on outdoor hoodies, camper mugs, or sticker packs."
  }
];

interface GalleryPageProps {
  searchParams: Promise<{
    category?: string;
    filter?: string | string[];
    q?: string;
    product?: string;
    occasion?: string;
    style?: string;
  }>;
}

export default async function FeaturedDesignsGalleryPage({ searchParams }: GalleryPageProps) {
  const query = await searchParams;

  if (isReviewFeatureEnabled('commerce')) {
    const validFilters = new Set<DesignFilter>([
      'new',
      'trending',
      'bestsellers',
      'archive',
    ]);
    const requested = query.filter;
    const filter =
      typeof requested === 'string' &&
      validFilters.has(requested as DesignFilter)
        ? (requested as DesignFilter)
        : undefined;
    const service = getDesignCatalogService();
    const [publishedDesigns, collections] = await Promise.all([
      service.listPublished(filter),
      service.listCollections(),
    ]);
    const q = query.q?.trim().toLowerCase();
    const requestedProduct = query.product?.trim();
    const tokens = [query.occasion, query.style]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());
    const designs = publishedDesigns.filter((design) => {
      const searchable = [
        design.title,
        design.description,
        design.collection,
        ...design.tags,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!q || searchable.includes(q)) &&
        (!requestedProduct ||
          design.compatibleProductIds.includes(requestedProduct)) &&
        tokens.every((token) => searchable.includes(token))
      );
    });
    const products = getApprovedMerchProducts();

    return (
      <main className={styles.shell}>
        <DesignCatalogHeader
          eyebrow="Curated by PrintMe"
          title="Choose the art first."
          description="Published designs with server-controlled product compatibility and purchase-time versioning."
        />
        <DesignFilters active={filter} />
        <form className={styles.search} action="/designs">
          <label>
            Search
            <input
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder="Title, tag, collection, occasion"
            />
          </label>
          <label>
            Product
            <select name="product" defaultValue={requestedProduct ?? ''}>
              <option value="">All products</option>
              {products.map((product) => (
                <option value={product.id} key={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Search designs</button>
        </form>
        <DesignGrid designs={designs} />
        <CollectionLinks collections={collections} />
      </main>
    );
  }

  const activeCategory = query.category || 'All';

  // Fetch active style presets to match URLs and IDs properly
  const { data: stylePresets } = await supabaseAdmin
    .from('style_presets')
    .select('id, slug, name')
    .eq('is_active', true);

  // Hardcoded list of buyer-friendly categories to ensure perfect ordering
  const categories = [
    'All',
    'Funny Gifts',
    'Pet Lovers',
    'Family Moments',
    'Office Chaos',
    'Sports & Hobbies',
    'Stickers & Logos'
  ];

  // Filter designs based on category
  const filteredDesigns = activeCategory === 'All'
    ? FEATURED_DESIGNS
    : FEATURED_DESIGNS.filter(d => d.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-pink-50/20 py-12">
      <Container size="lg">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 uppercase tracking-wider animate-pulse">
            ✨ Curated Printable Gifts
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Featured <span className="bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">AI Designs</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Pick a beautifully curated AI design to print on any premium product instantly. No account or login required.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Link
                key={cat}
                href={cat === 'All' ? '/designs' : `/designs?category=${encodeURIComponent(cat)}`}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </div>

        {/* Designs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDesigns.map((design) => {
            // Find corresponding style preset in database
            const matchedPreset = stylePresets?.find(p => p.slug === design.styleSlug);
            const styleId = matchedPreset?.id || stylePresets?.[0]?.id || '';
            const styleName = matchedPreset?.name || 'AI Original';

            // Generate image URL
            const designImageUrl = getAIGeneratedUrl(design.prompt, design.seed);

            // Purchase/Mockup selection flow link
            const printUrl = `/app/create/products?design=guest-design-${design.slug}&designUrl=${encodeURIComponent(designImageUrl)}&style=${styleId}&imageUrl=${encodeURIComponent(designImageUrl)}`;

            // Share design link
            const shareUrl = `/designs/guest?designUrl=${encodeURIComponent(designImageUrl)}&style=${styleId}&imageUrl=${encodeURIComponent(designImageUrl)}`;

            return (
              <Card key={design.slug} className="group overflow-hidden border border-slate-100 shadow-md bg-white hover:shadow-2xl transition-all duration-300 flex flex-col justify-between rounded-2xl">
                <CardBody className="p-4 flex flex-col gap-4">
                  {/* Image Container with Zoom effect */}
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200/50">
                    <img
                      src={designImageUrl}
                      alt={design.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    
                    {/* Absolutely Positioned Badges */}
                    {design.tag && (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        🔥 {design.tag}
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                      🎨 {styleName}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-extrabold text-slate-900 text-base leading-tight group-hover:text-indigo-600 transition-colors">
                          {design.title}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {design.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        {design.description}
                      </p>
                    </div>

                    {/* CTAs */}
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <Link href={shareUrl} className="w-full">
                        <Button variant="outline" className="w-full border-slate-200 text-slate-700 font-bold py-2.5 text-xs rounded-xl shadow-sm hover:bg-slate-50 flex items-center justify-center gap-1">
                          <span>👁️</span> Previews
                        </Button>
                      </Link>
                      <Link href={printUrl} className="w-full">
                        <Button className="w-full bg-indigo-600 text-white font-extrabold py-2.5 text-xs rounded-xl shadow-md hover:bg-indigo-700 flex items-center justify-center gap-1 group-hover:shadow-lg transition-all">
                          <span>🛒</span> Print This
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
