import type { Metadata } from 'next';
import Link from 'next/link';
import { PetsNav } from '@/components/pets/PetsNav';
import { SiteFooter } from '@/components/brand/SiteFooter';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import { getPetsKeepsakes } from '@/lib/pets/catalog';
import type { DesignAsset } from '@/lib/commerce/types';
import styles from '@/components/pets/pets.module.css';
export const metadata: Metadata = { title: 'Pet portrait keepsakes', description: 'Explore approved PrintMe posters, mugs and tees for a favorite pet portrait. Ordering is currently paused.', alternates: { canonical: 'https://www.printme.ai/pets/keepsakes' } };
const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
const art: DesignAsset = { id: 'pets-portfolio-fuzz', version: '1', url: '/pets/fuzz-club.webp', alt: 'Original Fuzz club whippet portrait example', width: 1000, height: 1500, mimeType: 'image/webp', hasTransparency: false, sourceType: 'curated', role: 'display' };
export default function PetsKeepsakesPage() {
  const keepsakes = getPetsKeepsakes();
  return <div className={styles.page}><div className={styles.inner}><PetsNav /><header className={styles.pageIntro}><p className={styles.eyebrow}>For the wall. The desk. The everyday.</p><h1 className={styles.title}>A face worth keeping.</h1><p>Good art deserves a life outside your camera roll. Explore our existing approved print formats, then prepare a portrait brief.</p><p className={styles.status}>Portrait generation and purchases are paused. These are illustrative product previews, not products available to order today.</p></header><section className={styles.catalog} aria-label="Approved keepsake formats">{keepsakes.map(({ product, fromPrice }) => {
    const configuration = createProductConfiguration({ designId: art.id, design: art, product, template: getPreviewTemplate(product.previewTemplateId) });
    return <article key={product.id} className={styles.product}><InstantPreview design={art} configuration={configuration} showSafeZone={false} presentation="merchandising" /><p className={styles.note}>Illustrative preview / original example artwork</p><h2>{product.name}</h2><p>{product.description}</p><strong>Catalog price from {usd(fromPrice)}</strong><p className={styles.note}>Physical print only. Portrait creation, tax and shipping are separate. Final totals and delivery estimates are not yet available.</p>{product.id === 'gallery-poster' && <p>Unframed. Approved sizes: 12 × 18 and 18 × 24 inches.</p>}<Link href={`/create?product=${product.id}`} className={styles.secondary}>Try your own photo ↗</Link><p className={styles.note} style={{ marginTop: 12 }}>Opens the existing PrintMe product editor. Checkout remains paused.</p></article>;
  })}</section><section className={styles.section}><p className={styles.eyebrow}>Only what we can stand behind</p><h2>Good things take a little checking.</h2><p className={styles.body}>Frames, blankets and ornaments are not currently available. We&apos;re verifying production costs, shipping, image resolution and fulfillment before opening orders. A screen preview is an approximation of placement and color, not a photograph of a finished item.</p><div className={styles.actions}><Link href="/pets/create" className={styles.button}>Prepare a portrait ↗</Link><Link href="/pets" className={styles.link}>Back to the looks</Link></div></section></div><SiteFooter /></div>;
}
