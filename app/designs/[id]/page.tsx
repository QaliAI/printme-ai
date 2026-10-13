import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DesignDetail } from '@/components/commerce/DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const design = await getDesignCatalogService().findPublishedBySlug(id);
  if (!design) return { title: 'Design not found', robots: { index: false, follow: false } };
  return { title: design.seoTitle, description: design.seoDescription,
    alternates: { canonical: `/designs/${design.slug}` }, openGraph: { title: design.title, description: design.description, images: [design.asset.url] } };
}
export default async function PublicDesignPage({ params }: Props) {
  const { id } = await params;
  const design = await getDesignCatalogService().findPublishedBySlug(id);
  if (!design) notFound();
  return <DesignDetail design={design} />;
}
