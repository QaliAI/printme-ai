import { notFound } from 'next/navigation';
import {
  CollectionLinks,
  DesignCatalogHeader,
} from '@/components/commerce/DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import styles from '@/app/designs/designs.module.css';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

export default async function CollectionsPage() {
  if (!isReviewFeatureEnabled('commerce')) notFound();
  const collections = await getDesignCatalogService().listCollections();

  return (
    <main className={styles.shell}>
      <DesignCatalogHeader
        eyebrow="Curated groupings"
        title="Collections"
        description="Browse published design families, then configure a compatible product in Shop V2."
      />
      <CollectionLinks collections={collections} />
    </main>
  );
}
