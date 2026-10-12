'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import type { DesignAsset, MerchProduct } from '@/lib/commerce/types';
interface BlueprintMockupResult {
  blueprintId: number;
  providerId?: number;
  variantId?: number;
  artworkUrl?: string;
  mockups: Array<{
    src: string;
    position: string;
    isDefault: boolean;
  }>;
  error?: string;
}
export function LiveProductMockups({
  designUrl,
  designId,
  products,
  onSelectProduct
}: {
  designUrl: string;
  designId?: string;
  products: MerchProduct[];
  onSelectProduct?: (blueprintId: number) => void;
}) {
  const [artwork, setArtwork] = useState<DesignAsset | null>(null);
  const [mockups, setMockups] = useState<BlueprintMockupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (!cancelled) setArtwork({
        id: designId ?? 'legacy-artwork',
        version: 'original',
        url: designUrl,
        productionUrl: designUrl,
        alt: 'Your artwork',
        width: image.naturalWidth,
        height: image.naturalHeight,
        mimeType: 'image/png',
        hasTransparency: true
      });
    };
    image.src = designUrl;
    return () => {
      cancelled = true;
    };
  }, [designId, designUrl]);
  async function requestOfficialMockups() {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch('/api/printify/mockups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: designUrl,
          designId,
          blueprintIds: products.map(product => product.printifyBlueprintId)
        })
      });
      if (!response.ok) throw new Error('Official preview unavailable');
      const data = await response.json();
      setMockups(data.mockups ?? []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  return <section data-testid="live-product-mockups">
    <h3 className="text-2xl font-bold">Your design on our products</h3>
    <p className="my-3 text-sm">Instant previews show your artwork on clean product templates.</p>
    <button type="button" onClick={requestOfficialMockups} disabled={loading || !artwork} className="mb-5 rounded-lg border px-4 py-2">{loading ? 'Requesting official previews…' : 'Request Printify previews'}</button>
    {failed && <p role="status">Printify previews are unavailable. Your instant previews are shown below.</p>}
    <div className="grid gap-4 sm:grid-cols-3">
      {artwork && products.map(product => {
        const variant = product.variants.find(candidate => candidate.available)!;
        const result = mockups.find(candidate => candidate.blueprintId === product.printifyBlueprintId && candidate.providerId === product.provider.printifyProviderId && candidate.variantId === variant.printifyVariantId && candidate.artworkUrl === designUrl && !candidate.error);
        const officialUrl = result?.mockups.find(image => image.isDefault)?.src ?? result?.mockups[0]?.src;
        return <button type="button" key={product.id} onClick={() => onSelectProduct?.(product.printifyBlueprintId)} className="overflow-hidden rounded-xl border bg-white text-left" data-testid={`legacy-preview-${product.id}`}>
          {officialUrl ? <div className="relative aspect-square"><Image src={officialUrl} alt={`${product.name} rendered by Printify with your artwork`} fill unoptimized className="object-contain" /></div> : <MerchandisePreview design={{
            id: artwork.id,
            title: 'Your artwork',
            description: '',
            collection: 'Your design',
            asset: artwork,
            recommendedProductId: product.id
          }} product={product} />}
          <div className="p-4"><h4 className="font-semibold">{product.name}</h4><p>{new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(variant.unitPrice / 100)}</p><small>{officialUrl ? 'Rendered by Printify' : 'Instant preview'}</small></div>
        </button>;
      })}
    </div>
  </section>;
}
