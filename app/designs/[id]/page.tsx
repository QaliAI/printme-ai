import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';
import { DesignDetail } from '@/components/commerce/DesignCatalog';
import { PRODUCT_PHOTOS } from '@/lib/assets';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    designUrl?: string;
    style?: string;
    imageUrl?: string;
  }>;
}

export default async function PublicDesignPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  if (isReviewFeatureEnabled('commerce')) {
    const curatedDesign =
      await getDesignCatalogService().findPublishedBySlug(id);
    if (!curatedDesign) notFound();
    return <DesignDetail design={curatedDesign} />;
  }

  let designUrl = '';
  let styleName = 'AI Original';
  const designId = id;
  let styleId = '';
  let imageUrl = '';

  if (id === 'guest') {
    designUrl = query.designUrl || '';
    styleId = query.style || '';
    imageUrl = query.imageUrl || '';

    if (!designUrl) {
      notFound();
    }

    if (styleId) {
      const { data: stylePreset } = await supabaseAdmin
        .from('style_presets')
        .select('name')
        .eq('id', styleId)
        .single();
      if (stylePreset) {
        styleName = stylePreset.name;
      }
    }
  } else {
    // Fetch the design
    const { data: design, error } = await supabaseAdmin
      .from('generated_designs')
      .select(`
        id,
        design_url,
        style_preset_id,
        original_image_url
      `)
      .eq('id', id)
      .single();

    if (error || !design) {
      notFound();
    }

    designUrl = design.design_url || '';
    styleId = design.style_preset_id || '';
    imageUrl = design.original_image_url || '';

    if (design.style_preset_id) {
      const { data: stylePreset } = await supabaseAdmin
        .from('style_presets')
        .select('name')
        .eq('id', design.style_preset_id)
        .single();
      if (stylePreset) {
        styleName = stylePreset.name;
      }
    }
  }

  const products = [
    { name: 'Canvas Print', emoji: '🖼️', category: 'Wall Art', price: '$39.00', key: 'canvas' },
    { name: 'Classic Mug', emoji: '☕', category: 'Home & Living', price: '$14.00', key: 'mug' },
    { name: 'Premium Tee', emoji: '👕', category: 'Apparel', price: '$24.00', key: 'tshirt' },
    { name: 'Cozy Hoodie', emoji: '🧥', category: 'Apparel', price: '$44.00', key: 'hoodie' },
    { name: 'Slim Phone Case', emoji: '📱', category: 'Accessories', price: '$19.00', key: 'phoneCase' },
    { name: 'Sticker Pack', emoji: '✨', category: 'Stickers', price: '$4.00', key: 'sticker' },
  ];

  // Routing for checkout selection
  const buyUrl = id === 'guest'
    ? `/app/create/products?design=guest-design-${encodeURIComponent(styleId || 'custom')}&designUrl=${encodeURIComponent(designUrl)}&style=${styleId}&imageUrl=${encodeURIComponent(imageUrl)}`
    : `/app/create/products?design=${designId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-pink-50/20 py-12">
      <Container size="lg">
        {/* Back Link */}
        <div className="mb-8">
          <Link href="/app" className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            ← Create Your Own Design
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Design Showcase */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="overflow-hidden border border-slate-100 shadow-2xl bg-white/80 backdrop-blur-xl">
              <CardBody className="p-4">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={designUrl || ''}
                    alt="AI Masterpiece"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-slate-900/80 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                    ✨ {styleName}
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="px-2">
              <h1 className="text-2xl font-black text-slate-950 mb-2">
                Custom {styleName} Masterpiece
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Created with PrintMe.ai. Choose a product below to print this exact design with high-quality custom merchandise fulfillment.
              </p>
            </div>
          </div>

          {/* Product Grid */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Select a Product to Print</h2>
              <p className="text-xs text-slate-500">Pick any of these premium options to checkout in seconds.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((prod) => {
                const photoData = PRODUCT_PHOTOS[prod.key as keyof typeof PRODUCT_PHOTOS];
                return (
                  <Card key={prod.name} className="overflow-hidden border border-slate-100 shadow-md bg-white hover:shadow-xl transition-shadow flex flex-col justify-between">
                    <CardBody className="p-4 flex flex-col gap-4">
                      {/* Interactive Custom Overlay */}
                      <div className="relative aspect-square bg-[#f8f9fa] rounded-xl overflow-hidden border border-slate-200/50 flex items-center justify-center">
                        {photoData?.image && designUrl ? (
                          <div className="relative w-full h-full p-2">
                            <img
                              src={photoData.image}
                              alt={prod.name}
                              className="w-full h-full object-contain"
                            />
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                top: photoData.designArea.top,
                                left: photoData.designArea.left,
                                width: photoData.designArea.width,
                                height: photoData.designArea.height,
                              }}
                            >
                              <img
                                src={designUrl}
                                alt="Design overlay"
                                className="w-full h-full object-cover mix-blend-multiply"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-5xl">{prod.emoji}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{prod.name}</h3>
                          <span className="text-sm font-black text-slate-900">{prod.price}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{prod.category}</p>
                      </div>

                      <Link href={buyUrl} className="block">
                        <Button className="w-full bg-indigo-600 text-white font-extrabold py-2 text-xs rounded-lg shadow-md hover:bg-indigo-700">
                          🛒 Print This Design
                        </Button>
                      </Link>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
