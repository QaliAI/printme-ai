import {
  CollectionLinks,
  DesignCatalogHeader,
  DesignFilters,
  DesignGrid,
} from './DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import type { DesignFilter } from '@/lib/commerce/designs/models';
import styles from '@/app/designs/designs.module.css';

export async function DesignDiscoveryPage({
  filter,
  title,
  description,
}: {
  filter: DesignFilter;
  title: string;
  description: string;
}) {
  const service = getDesignCatalogService();
  const [designs, collections] = await Promise.all([
    service.listPublished(filter),
    service.listCollections(),
  ]);
  return (
    <main className={styles.shell}>
      <DesignCatalogHeader
        eyebrow="Curated by PrintMe"
        title={title}
        description={description}
      />
      <DesignFilters active={filter} />
      <DesignGrid designs={designs} />
      <CollectionLinks collections={collections} />
    </main>
  );
}
