import { notFound } from 'next/navigation';
import {
  CollectionLinks,
  DesignCatalogHeader,
  DesignFilters,
  DesignGrid,
} from '@/components/commerce/DesignCatalog';
import type { DesignFilter } from '@/lib/commerce/designs/models';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import styles from './designs.module.css';

const validFilters = new Set<DesignFilter>([
  'new',
  'trending',
  'bestsellers',
  'archive',
]);

export default async function DesignsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  if (process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED !== 'true') notFound();

  const requested = (await searchParams).filter;
  const filter =
    typeof requested === 'string' &&
    validFilters.has(requested as DesignFilter)
      ? (requested as DesignFilter)
      : undefined;
  const service = getDesignCatalogService();
  const [designs, collections] = await Promise.all([
    service.listPublished(filter),
    service.listCollections(),
  ]);

  return (
    <main className={styles.shell}>
      <DesignCatalogHeader
        eyebrow="Curated by PrintMe"
        title="Choose the art first."
        description="Published designs with server-controlled product compatibility and purchase-time versioning."
      />
      <DesignFilters active={filter} />
      <DesignGrid designs={designs} />
      <CollectionLinks collections={collections} />
    </main>
  );
}
