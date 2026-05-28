'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { Product, ProductVariant, GeneratedDesign } from '@/lib/types';

interface SelectedProduct {
  productId: string;
  variantId: string;
  quantity: number;
}

interface RecommendedProduct extends Product {
  recommendation_reason?: string;
  recommendation_score?: number;
}

export default function ProductsPage() {
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

  const fetchData = async () => {
    try {
      // Fetch design
      const { data: designData, error: designError } = await supabase
        .from('generated_designs')
        .select('*')
        .eq('id', designId)
        .single();

      if (designError) throw designError;
      setDesign(designData);

      // Try recommendation API first
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
        // Fallback handled below
      }

      // Fetch all products (for "show all" toggle)
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .order('display_order');

      if (productError) throw productError;
      setAllProducts(productData || []);

      // If recommendations failed, fall back to first 3 products
      if (recommended.length === 0 && productData && productData.length > 0) {
        setRecommended(productData.slice(0, 3));
      }

      // Fetch variants
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
    // Data fetching pattern - intentionally triggers setState inside effect
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

  // Decide which products to show
  const displayProducts: RecommendedProduct[] = showAll
    ? allProducts.map((p) => ({ ...p, recommendation_reason: '' }))
    : recommended;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Background blobs */}
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

        {/* Products Grid */}
        <div className={`grid gap-6 mb-8 ${showAll ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
          <AnimatePresence mode="popLayout">
            {displayProducts.map((product, i) => {
              const isSelected = selectedProducts.some((p) => p.productId === product.id);
              const selected = selectedProducts.find((p) => p.productId === product.id);
              const productVariants = variants[product.id] || [];

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
                    className={`overflow-hidden transition-all cursor-pointer backdrop-blur-xl bg-white/80 border-white/40 ${
                      isSelected ? 'ring-4 ring-blue-500 shadow-2xl' : 'shadow-lg hover:shadow-xl'
                    }`}
                    onClick={() => handleSelectProduct(product.id)}
                  >
                    {/* Recommendation badge */}
                    {!showAll && product.recommendation_reason && (
                      <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1 shadow-lg">
                        <span>✨</span> AI Pick #{i + 1}
                      </div>
                    )}

                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 z-10 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
                      >
                        ✓
                      </motion.div>
                    )}

                    <CardBody className="space-y-4 pt-12">
                      {/* Mockup with design overlay preview */}
                      <div className="relative aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl overflow-hidden">
                        {product.mockup_url ? (
                          <img
                            src={product.mockup_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-7xl">
                            {product.emoji}
                          </div>
                        )}
                        {/* Design overlay (small preview) */}
                        {design.design_url && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="absolute bottom-3 right-3 w-16 h-16 rounded-lg overflow-hidden shadow-2xl border-2 border-white"
                          >
                            <img
                              src={design.design_url}
                              alt="Your design"
                              className="w-full h-full object-cover"
                            />
                          </motion.div>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                        {product.recommendation_reason && (
                          <p className="text-xs text-purple-600 mt-1 italic">
                            ✨ {product.recommendation_reason}
                          </p>
                        )}
                        {product.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        {product.base_price && (
                          <p className="text-lg font-bold text-gray-900 mt-2">
                            ${product.base_price.toFixed(2)}
                          </p>
                        )}
                      </div>

                      {/* Variant and Quantity (when selected) */}
                      <AnimatePresence>
                        {isSelected && selected && productVariants.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t pt-4 space-y-3"
                          >
                            <div>
                              <label className="text-xs font-semibold text-gray-700 mb-2 block">
                                Variant
                              </label>
                              <select
                                value={selected.variantId}
                                onChange={(e) => handleVariantChange(product.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600"
                              >
                                {productVariants.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.size && variant.color
                                      ? `${variant.size}, ${variant.color}`
                                      : variant.size || variant.color}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-gray-700 mb-2 block">
                                Quantity
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuantityChange(product.id, selected.quantity - 1);
                                  }}
                                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-bold"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={selected.quantity}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center text-sm"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuantityChange(product.id, selected.quantity + 1);
                                  }}
                                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Show more toggle */}
        {!showAll && allProducts.length > recommended.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-8"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAll(true)}
              className="px-6 py-3 bg-white/70 backdrop-blur-md border border-white/40 rounded-full text-gray-700 font-semibold shadow-md hover:shadow-lg transition-shadow"
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
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              ← Back to AI picks
            </button>
          </motion.div>
        )}

        {/* Selection Summary */}
        <AnimatePresence>
          {selectedProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mb-8"
            >
              <Card className="backdrop-blur-xl bg-blue-50/80 border-blue-200 shadow-lg">
                <CardBody>
                  <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🛒</span>
                    {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} ready for cart
                  </p>
                  <ul className="space-y-1">
                    {selectedProducts.map((sel) => {
                      const product = [...allProducts, ...recommended].find((p) => p.id === sel.productId);
                      const variant = variants[sel.productId]?.find((v) => v.id === sel.variantId);
                      return (
                        <li key={sel.productId} className="text-sm text-gray-700">
                          • {product?.name} ({variant?.size || variant?.color}) × {sel.quantity}
                        </li>
                      );
                    })}
                  </ul>
                </CardBody>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4"
        >
          <Button
            onClick={() => router.push(`/app/create/preview?design=${designId}`)}
            variant="outline"
            className="flex-1 md:flex-none"
          >
            ← Back
          </Button>
          <div className="flex-1" />
          <motion.div
            whileHover={selectedProducts.length > 0 ? { scale: 1.02 } : {}}
            whileTap={selectedProducts.length > 0 ? { scale: 0.98 } : {}}
          >
            <Button
              onClick={handleProceedToCart}
              disabled={selectedProducts.length === 0}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              Add to Cart →
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}
