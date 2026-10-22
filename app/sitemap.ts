import type { MetadataRoute } from 'next';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.printme.ai').replace(/\/$/, '');
  const urls = new Map<string, MetadataRoute.Sitemap[number]>();
  const add = (path: string, priority: number, date?: string | null) => urls.set(path, {
    url: `${baseUrl}${path}`, priority, changeFrequency: 'weekly', ...(date ? { lastModified: date } : {}),
  });
  ['', '/designs', '/collections', '/drops', '/shop-v2', '/products', '/create', '/halloween', '/pets', '/pets/keepsakes', '/pets/gift', '/pets/privacy'].forEach(path => add(path, path ? 0.8 : 1));
  getApprovedMerchProducts().forEach(product => add(`/products/${encodeURIComponent(product.id)}`, 0.7));
  const catalog = getDesignCatalogService();
  const [designs, collections, drops] = await Promise.all([catalog.listPublished(), catalog.listCollections(), catalog.listDrops()]);
  designs.filter(d => d.publicationStatus === 'published').forEach(d => add(`/designs/${encodeURIComponent(d.slug)}`, 0.8, d.publicationDate));
  collections.filter(c => c.publicationStatus === 'published').forEach(c => add(`/collections/${encodeURIComponent(c.slug)}`, 0.7));
  drops.filter(d => d.publicationStatus === 'published').forEach(d => add(`/drops/${encodeURIComponent(d.slug)}`, 0.7, d.publicationDate));
  return [...urls.values()];
}
