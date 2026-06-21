import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// Helper to build Pollinations.ai image URLs
const getAIGeneratedUrl = (prompt: string, seed: number) => {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true&seed=${seed}&model=flux`;
};

// Seed structure for featured/funny designs
const FEATURED_DESIGNS = [
  {
    title: "Cosmic Astronaut Cat",
    slug: "cosmic-astronaut-cat",
    styleSlug: "oil-painting-portrait",
    category: "Space Art",
    prompt: "oil painting masterpiece of a majestic cat wearing an astronaut suit in deep space, colorful nebula, stars, cinematic detail",
    seed: 2026,
    tag: "Best Seller",
    description: "An adventurous feline exploring the final frontier. Perfect for canvas prints and hoodies."
  },
  {
    title: "Neon Cyberpunk Bulldog",
    slug: "cyberpunk-bulldog",
    styleSlug: "pop-art-poster",
    category: "Sci-Fi",
    prompt: "synthwave cyberpunk portrait of a cool bulldog wearing sunglasses, neon colors, grid landscape, 80s retro futurism",
    seed: 2027,
    tag: "Trending",
    description: "Retro-futuristic bulldog with neon style. Looks stunning on t-shirts and stickers."
  },
  {
    title: "Royal Golden Retriever",
    slug: "royal-golden-retriever",
    styleSlug: "pet-royal-portrait",
    category: "Humorous",
    prompt: "renaissance royal portrait of a regal golden retriever puppy wearing a crown and velvet robe with gold embroidery",
    seed: 1007,
    tag: "Customer Favorite",
    description: "His royal highness, the goodest boy. Bring classical laughter to your mugs and canvases."
  },
  {
    title: "Watercolor Ocean Turtle",
    slug: "watercolor-ocean-turtle",
    styleSlug: "watercolor-memory",
    category: "Nature",
    prompt: "watercolor painting of a sea turtle swimming in turquoise ocean water, soft pastel washes, dreamy brushstrokes",
    seed: 1088,
    tag: "Nature Vibe",
    description: "A calming underwater scene with delicate textures. Ideal for canvas prints and tote bags."
  },
  {
    title: "Happy Shiba Cutout",
    slug: "happy-shiba-cutout",
    styleSlug: "clean-cutout",
    category: "Stickers",
    prompt: "clean studio cutout of a cute happy shiba inu puppy smiling, isolated on pure white background, crisp edges",
    seed: 1012,
    tag: "Sticker Ready",
    description: "Crisp outline of a joyful Shiba Inu. Made specifically for die-cut stickers and t-shirts."
  },
  {
    title: "Vintage Mountain Adventure",
    slug: "vintage-mountain-adventure",
    styleSlug: "vintage-travel-poster",
    category: "Travel",
    prompt: "vintage 1970s travel poster illustration of a mountain lake, warm retro tones, nostalgic adventure travel graphic art",
    seed: 2028,
    tag: "Retro",
    description: "Nostalgic wanderlust vibes from the 70s. Perfect for posters and phone cases."
  }
];

interface GalleryPageProps {
  searchParams: Promise<{
    category?: string;
  }>;
}

export default async function FeaturedDesignsGalleryPage({ searchParams }: GalleryPageProps) {
  const query = await searchParams;
  const activeCategory = query.category || 'All';

  // Fetch active style presets to match URLs and IDs properly
  const { data: stylePresets } = await supabaseAdmin
    .from('style_presets')
    .select('id, slug, name')
    .eq('is_active', true);

  // Extract unique categories for filter tabs
  const categories = ['All', ...Array.from(new Set(FEATURED_DESIGNS.map(d => d.category)))];

  // Filter designs based on category
  const filteredDesigns = activeCategory === 'All'
    ? FEATURED_DESIGNS
    : FEATURED_DESIGNS.filter(d => d.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-pink-50/20 py-12">
      <Container size="lg">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            ✨ Curated Masterpieces
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Featured <span className="bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">AI Designs</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Pick a stunning AI design from our community and print it on any premium product instantly. No account required.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Link
                key={cat}
                href={cat === 'All' ? '/app/designs' : `/app/designs?category=${encodeURIComponent(cat)}`}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto">
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
