import { notFound } from 'next/navigation';
import {
  DesignCatalogHeader,
  DesignGrid,
} from '@/components/commerce/DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import styles from '@/app/designs/designs.module.css';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

export default async function DropPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isReviewFeatureEnabled('commerce')) notFound();
  const { slug } = await params;
  const service = getDesignCatalogService();
  const drop = await service.findDropBySlug(slug);
  if (!drop) notFound();
  const published = await service.listPublished();
  const designs = published.filter((design) =>
    drop.designIds.includes(design.id),
  );

  return (
    <main className={styles.shell}>
      <DesignCatalogHeader
        eyebrow="Drop"
        title={drop.title}
        description={drop.description}
      />
      <DesignGrid designs={designs} />
    </main>
  );
}
