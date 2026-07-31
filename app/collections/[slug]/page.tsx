import { notFound } from 'next/navigation';
import {
  DesignCatalogHeader,
  DesignGrid,
} from '@/components/commerce/DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import styles from '@/app/designs/designs.module.css';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isReviewFeatureEnabled('commerce')) notFound();
  const { slug } = await params;
  const service = getDesignCatalogService();
  const collection = await service.findCollectionBySlug(slug);
  if (!collection) notFound();
  const published = await service.listPublished();
  const designs = published.filter((design) =>
    collection.designIds.includes(design.id),
  );

  return (
    <main className={styles.shell}>
      <DesignCatalogHeader
        eyebrow="Collection"
        title={collection.title}
        description={collection.description}
      />
      <DesignGrid designs={designs} />
    </main>
  );
}
