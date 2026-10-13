'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LiveProductMockups } from '@/components/LiveProductMockups';
import { supabase } from '@/lib/supabase';
import type { MerchProduct } from '@/lib/commerce/types';

/** Preserve legacy artwork, but use the approved catalog/editor and checkout. */
export function LegacyProductsExperience({
  products
}: {
  products: MerchProduct[];
}) {
  const query = useSearchParams();
  const router = useRouter();
  const designId = query.get('design') ?? undefined;
  const queryArtwork = query.get('designUrl');
  const [designUrl, setDesignUrl] = useState(queryArtwork);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (queryArtwork || !designId || designId.startsWith('guest-design-')) return;
    let cancelled = false;
    void supabase.from('generated_designs').select('design_url').eq('id', designId).single().then(({
      data,
      error
    }) => {
      if (cancelled) return;
      if (error || !data?.design_url) setError('Your artwork could not be loaded. Return to your design to try again.');else setDesignUrl(data.design_url);
    });
    return () => {
      cancelled = true;
    };
  }, [designId, queryArtwork]);
  return <main className="mx-auto max-w-6xl px-6 py-12"><h1 className="mb-8 text-3xl font-bold">Choose your product</h1>
    {error && <p role="alert">{error}</p>}
    {designUrl ? <LiveProductMockups designUrl={designUrl} designId={designId} products={products} onSelectProduct={blueprint => {
      const product = products.find(candidate => candidate.printifyBlueprintId === blueprint);
      if (product) router.push(`/create?product=${encodeURIComponent(product.id)}&artwork=${encodeURIComponent(designUrl)}`);
    }} /> : <p>Open an existing design or <a href="/create">upload your artwork</a> to preview our tee, mug, and poster.</p>}
  </main>;
}
