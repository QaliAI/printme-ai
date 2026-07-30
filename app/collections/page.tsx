import { notFound } from 'next/navigation';
import {
  CollectionLinks,
  DesignCatalogHeader,
} from '@/components/commerce/DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import styles from '@/app/designs/designs.module.css';

export default async function CollectionsPage() {
  if (process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED !== 'true') notFound();
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
