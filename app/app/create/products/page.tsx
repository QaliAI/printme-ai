'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { Product, ProductVariant, GeneratedDesign } from '@/lib/types';

interface SelectedProduct {
  productId: string;
  variantId: string;
  quantity: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get('design');

  const [design, setDesign] = useState<GeneratedDesign | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string, ProductVariant[]>>({});
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!designId) {
      router.push('/app/create/style');
      return;
    }

    fetchData();
  }, [designId, router]);

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

      // Fetch all products
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .order('display_order');

      if (productError) throw productError;
      setProducts(productData || []);

      // Fetch all variants
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
        {
          productId,
          variantId: firstVariant.id,
          quantity: 1,
        },
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
      // Add items to cart via API
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
      <Container size="lg" className="py-12">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-12 h-12"></div>
        </div>
      </Container>
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

  return (
    <Container size="lg" className="py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Choose Products</h1>
        <p className="text-lg text-gray-600">Select which products to print your design on</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {products.map((product) => {
          const isSelected = selectedProducts.some((p) => p.productId === product.id);
          const selected = selectedProducts.find((p) => p.productId === product.id);
          const productVariants = variants[product.id] || [];

          return (
            <Card
              key={product.id}
              className={`transition-all cursor-pointer ${
                isSelected ? 'ring-2 ring-blue-600 shadow-lg' : ''
              }`}
              onClick={() => handleSelectProduct(product.id)}
            >
              <CardHeader>
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* Mockup */}
                <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                  {product.mockup_url ? (
                    <img
                      src={product.mockup_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl">{product.emoji}</div>
                  )}
                </div>

                <p className="text-sm text-gray-600">{product.description}</p>

                {/* Selection Checkbox */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectProduct(product.id)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {isSelected ? 'Selected' : 'Select this product'}
                  </span>
                </div>

                {/* Variant and Quantity Selection */}
                {isSelected && selected && productVariants.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-2 block">
                        Variant
                      </label>
                      <select
                        value={selected.variantId}
                        onChange={(e) => handleVariantChange(product.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
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
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={selected.quantity}
                          onChange={(e) =>
                            handleQuantityChange(product.id, parseInt(e.target.value) || 1)
                          }
                          className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center text-sm"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(product.id, selected.quantity + 1);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedProducts.length > 0 && (
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardBody>
            <p className="font-semibold text-gray-900 mb-2">
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
            </p>
            <ul className="space-y-1">
              {selectedProducts.map((sel) => {
                const product = products.find((p) => p.id === sel.productId);
                const variant = variants[sel.productId]?.find((v) => v.id === sel.variantId);
                return (
                  <li key={sel.productId} className="text-sm text-gray-700">
                    {product?.name} ({variant?.size || variant?.color}) × {sel.quantity}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => router.push(`/app/create/preview?design=${designId}`)}
          variant="outline"
          className="flex-1 md:flex-none"
        >
          Back to Design
        </Button>
        <div className="flex-1" />
        <Button
          onClick={handleProceedToCart}
          disabled={selectedProducts.length === 0}
          className="flex-1"
        >
          Proceed to Cart →
        </Button>
      </div>
    </Container>
  );
}
