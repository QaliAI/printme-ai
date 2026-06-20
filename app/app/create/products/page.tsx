'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { Product, ProductVariant, GeneratedDesign } from '@/lib/types';
import { blueprintIdForProductName, PRODUCT_PHOTOS } from '@/lib/assets';

interface SelectedProduct {
  productId: string;
  variantId: string;
  quantity: number;
}

interface RecommendedProduct extends Product {
  recommendation_reason?: string;
  recommendation_score?: number;
}

interface PrintifyMockupCacheEntry {
  blueprintId: number;
  mockups: Array<{ src: string; position: string; isDefault: boolean }>;
}

function pickBestMockup(entry?: PrintifyMockupCacheEntry): string | undefined {
  if (!entry) return undefined;
  const defaultMockup = entry.mockups.find((m) => m.isDefault);
  return defaultMockup?.src || entry.mockups[0]?.src;
}

function getProductLabel(name: string): string {
  const norm = name.toLowerCase();
  if (norm.includes('canvas') || norm.includes('poster')) return '🏠 Wall Art';
  if (norm.includes('tshirt') || norm.includes('hoodie') || norm.includes('shirt') || norm.includes('tee')) return '👕 Premium Apparel';
  if (norm.includes('mug')) return '☕ Everyday Favorite';
  if (norm.includes('phone') || norm.includes('case')) return '📱 Daily Essential';
  if (norm.includes('sticker')) return '✨ Stocking Stuffer';
  return '🎁 Best Gift';
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get('design');

  const [design, setDesign] = useState<GeneratedDesign | null>(null);
  const [recommended, setRecommended] = useState<RecommendedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string, ProductVariant[]>>({});
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [personalizedMockups, setPersonalizedMockups] = useState<Record<number, PrintifyMockupCacheEntry>>({});
  const [mockupsLoading, setMockupsLoading] = useState(false);

  const fetchPersonalizedMockups = async (designForMockups: GeneratedDesign) => {
    if (!designForMockups.design_url) return;
    setMockupsLoading(true);
    try {
      const response = await fetch('/api/printify/mockups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: designForMockups.design_url,
          designId: designForMockups.id,
        }),
      });

      if (!response.ok) return;
      const data = await response.json();
      const indexed: Record<number, PrintifyMockupCacheEntry> = {};
      for (const m of data.mockups || []) {
        if (m.mockups?.length) indexed[m.blueprintId] = m;
      }
      setPersonalizedMockups(indexed);
    } catch (err) {
      console.warn('Personalized mockup fetch failed:', err);
    } finally {
      setMockupsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const { data: designData, error: designError } = await supabase
        .from('generated_designs')
        .select('*')
        .eq('id', designId)
        .single();

      if (designError) throw designError;
      setDesign(designData);

      if (designData?.design_url) {
        void fetchPersonalizedMockups(designData);
      }

      try {
        const recResponse = await fetch('/api/design/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ designId, limit: 3 }),
        });

        if (recResponse.ok) {
          const recData = await recResponse.json();
          setRecommended(recData.recommendations || []);
        }
      } catch (recErr) {
        console.error('Recommendations failed:', recErr);
      }

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .order('display_order');

      if (productError) throw productError;
      setAllProducts(productData || []);

      if (recommended.length === 0 && productData && productData.length > 0) {
        setRecommended(productData.slice(0, 3));
      }

      const { data: variantData, error: variantError } = await supabase
        .from('product_variants')
        .select('*');

      if (variantError) throw variantError;

      const variantsByProduct: Record<string, ProductVariant[]> = {};
      variantData?.forEach((variant) => {
        if (!variantsByProduct[variant.product_id]) {
          variantsByProduct[variant.product_id] = [];
        }
        variantsByProduct[variant.product_id].push(variant);
      });
      setVariants(variantsByProduct);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!designId) {
      router.push('/app/create/style');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    fetchData();
  }, [designId, router]);

  const handleSelectProduct = (productId: string) => {
    const productVariants = variants[productId] || [];
    const firstVariant = productVariants[0];
    if (!firstVariant) return;

    const existing = selectedProducts.find((p) => p.productId === productId);
    if (existing) {
      setSelectedProducts(selectedProducts.filter((p) => p.productId !== productId));
    } else {
      setSelectedProducts([
        ...selectedProducts,
        { productId, variantId: firstVariant.id, quantity: 1 },
      ]);
    }
  };

  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.productId === productId ? { ...p, variantId } : p
      )
    );
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.productId === productId ? { ...p, quantity } : p
      )
    );
  };

  const handleProceedToCart = async () => {
    if (selectedProducts.length === 0 || !design) return;

    try {
      const response = await fetch('/api/cart/add-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: design.id,
          items: selectedProducts,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add items to cart');
      }

      router.push('/app/cart');
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError('Failed to add items to cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ rotate: { duration: 2, repeat: Infinity, ease: 'linear' }, scale: { duration: 1, repeat: Infinity } }}
          className="text-6xl"
        >
          ✨
        </motion.div>
      </div>
    );
  }

  if (!design) {
    return (
      <Container size="lg" className="py-12">
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-red-600 mb-4">Design not found</p>
            <Button onClick={() => router.push('/app/create/style')}>
              Start Over
            </Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  const displayProducts: RecommendedProduct[] = showAll
    ? allProducts.map((p) => ({ ...p, recommendation_reason: '' }))
    : recommended;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 -left-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, -100, 0], y: [0, -100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <Container size="lg" className="py-12 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 uppercase tracking-wider animate-pulse">
            <span>🎉 Your Design is Ready!</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            {showAll ? 'All Products' : (
              <>
                Top <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Picks</span>
              </>
            )}
          </h1>
          <p className="text-lg text-gray-600">
            {showAll
              ? 'Choose from our full catalog'
              : `${recommended.length} products curated for your design`}
          </p>

          {mockupsLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 inline-flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/80 backdrop-blur-md border border-indigo-100 rounded-full px-3.5 py-2 font-medium"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent"
              />
              <span>Rendering your design on products…</span>
            </motion.div>
          )}
          {!mockupsLoading && Object.keys(personalizedMockups).length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 backdrop-blur-md border border-emerald-100 rounded-full px-3.5 py-2 font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Showing your design on {Object.keys(personalizedMockups).length} products</span>
            </motion.div>
          )}
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}

        <div className={`grid gap-8 mb-8 ${showAll ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
          <AnimatePresence mode="popLayout">
            {displayProducts.map((product, i) => {
              const isSelected = selectedProducts.some((p) => p.productId === product.id);
              const selected = selectedProducts.find((p) => p.productId === product.id);
              const productVariants = variants[product.id] || [];

              const blueprintId = blueprintIdForProductName(product.name);
              const personalizedMockup = blueprintId
                ? pickBestMockup(personalizedMockups[blueprintId])
                : undefined;
              const isPersonalized = !!personalizedMockup;

              let fallbackImage = product.mockup_url;
              if (!fallbackImage && blueprintId) {
                const assetMatch = Object.values(PRODUCT_PHOTOS).find(
                  (p) => p.blueprintId === blueprintId
                );
                fallbackImage = assetMatch?.image;
              }
              const displayImage = personalizedMockup || fallbackImage;

              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                >
                  <Card
                    className={`overflow-hidden transition-all cursor-pointer border-2 bg-white/95 backdrop-blur-xl ${
                      isSelected
                        ? 'border-indigo-600 ring-4 ring-indigo-500/10 shadow-2xl scale-[1.01]'
                        : 'border-white/50 shadow-lg hover:shadow-2xl'
                    }`}
                    onClick={() => handleSelectProduct(product.id)}
                  >
                    {/* Recommendation badge */}
                    {!showAll && product.recommendation_reason && (
                      <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1 shadow-lg">
                        <span>✨</span> AI Pick
                      </div>
                    )}

                    {/* Best-use Label */}
                    <div className="absolute top-4 right-4 z-10">
                      <span className="bg-slate-900/90 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
                        {getProductLabel(product.name)}
                      </span>
                    </div>

                    <CardBody className="space-y-4 pt-14">
                      {/* Product mockup container */}
                      <div className="relative aspect-square bg-[#f8f9fa] rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center">
                        {displayImage ? (
                          <motion.img
                            key={displayImage}
                            src={displayImage}
                            alt={`${product.name} with your design`}
                            className="w-full h-full object-contain p-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-7xl select-none">
                            {product.emoji}
                          </div>
                        )}

                        {isPersonalized && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute bottom-3 left-3 flex items-center gap-1 bg-emerald-500/95 text-white text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded shadow-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Live Preview
                          </motion.div>
                        )}

                        {!isPersonalized && mockupsLoading && blueprintId && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}

                        {!isPersonalized && design.design_url && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="absolute bottom-3 right-3 w-14 h-14 rounded-lg overflow-hidden shadow-xl border-2 border-white"
                          >
                            <img
                              src={design.design_url}
                              alt="Your design"
                              className="w-full h-full object-cover"
                            />
                          </motion.div>
                        )}
                      </div>

                      <div className="px-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-gray-900 text-lg leading-snug">{product.name}</h3>
                          {product.base_price && (
                            <span className="text-lg font-extrabold text-slate-900">
                              ${product.base_price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {product.recommendation_reason && (
                          <p className="text-xs text-purple-600 mt-1 italic font-medium">
                            ✨ {product.recommendation_reason}
                          </p>
                        )}
                        {product.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <AnimatePresence>
                        {isSelected && selected && productVariants.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t border-slate-100 pt-4 space-y-4"
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                                Choose Option
                              </label>
                              <select
                                value={selected.variantId}
                                onChange={(e) => handleVariantChange(product.id, e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                              >
                                {productVariants.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.size && variant.color
                                      ? `${variant.size} — ${variant.color}`
                                      : variant.size || variant.color}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700">Quantity</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(product.id, selected.quantity - 1)}
                                  className="w-9 h-9 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold flex items-center justify-center text-slate-600 active:bg-slate-100 transition-colors"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={selected.quantity}
                                  onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                                  className="w-12 h-9 border border-slate-200 rounded-xl text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(product.id, selected.quantity + 1)}
                                  className="w-9 h-9 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold flex items-center justify-center text-slate-600 active:bg-slate-100 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="pt-2">
                        <Button
                          type="button"
                          variant={isSelected ? 'outline' : 'primary'}
                          className={`w-full py-2.5 rounded-xl font-bold transition-all ${
                            isSelected
                              ? 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isSelected ? '✓ Selected' : 'Select Product'}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {!showAll && allProducts.length > recommended.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-8"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAll(true)}
              className="px-6 py-3 bg-white border border-slate-200 rounded-full text-slate-700 text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              See All {allProducts.length} Products →
            </motion.button>
          </motion.div>
        )}

        {showAll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-8"
          >
            <button
              onClick={() => setShowAll(false)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-bold"
            >
              ← Back to AI recommendations
            </button>
          </motion.div>
        )}

        <AnimatePresence>
          {selectedProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-8"
            >
              <Card className="backdrop-blur-xl bg-indigo-50/75 border border-indigo-100 shadow-lg">
                <CardBody className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="font-extrabold text-indigo-950 mb-2 flex items-center gap-2 text-base">
                      <span className="text-xl">🎁</span>
                      Ready to Add {selectedProducts.length} Item{selectedProducts.length !== 1 ? 's' : ''}
                    </p>
                    <ul className="space-y-1 pl-1">
                      {selectedProducts.map((sel) => {
                        const product = [...allProducts, ...recommended].find((p) => p.id === sel.productId);
                        const variant = variants[sel.productId]?.find((v) => v.id === sel.variantId);
                        return (
                          <li key={sel.productId} className="text-xs text-indigo-900 font-medium">
                            • {product?.name} ({variant?.size && variant?.color ? `${variant.size} / ${variant.color}` : variant?.size || variant?.color}) × {sel.quantity}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="bg-white/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-indigo-100/50 text-[11px] text-indigo-950/80 max-w-xs md:text-right font-medium">
                    💡 <span className="font-bold text-indigo-900">Conversion Tip:</span> Add a Canvas + Mug to create a matching Gift Set and save on combined shipping!
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4 border-t border-slate-200 pt-6"
        >
          <Button
            onClick={() => router.push(`/app/create/preview?upload=${design.upload_id}&style=${design.style_preset_id}`)}
            variant="outline"
            className="flex-1 md:flex-none"
          >
            ← Back to Preview
          </Button>
          <div className="flex-1" />
          <motion.div
            whileHover={selectedProducts.length > 0 ? { scale: 1.02 } : {}}
            whileTap={selectedProducts.length > 0 ? { scale: 0.98 } : {}}
            className="flex-1 md:flex-none"
          >
            <Button
              onClick={handleProceedToCart}
              disabled={selectedProducts.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-10 shadow-lg shadow-indigo-600/10 font-extrabold text-sm"
            >
              Add Selected to Cart →
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
          <div className="text-6xl animate-pulse">✨</div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
