import { notFound } from 'next/navigation';
import {
  DesignCatalogHeader,
  DesignGrid,
} from '@/components/commerce/DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import styles from '@/app/designs/designs.module.css';

export default async function DropPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED !== 'true') notFound();
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
