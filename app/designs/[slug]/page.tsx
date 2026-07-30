import { notFound } from 'next/navigation';
import { DesignDetail } from '@/components/commerce/DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';

export default async function DesignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED !== 'true') notFound();
  const { slug } = await params;
  const design = await getDesignCatalogService().findPublishedBySlug(slug);
  if (!design) notFound();
  return <DesignDetail design={design} />;
}
