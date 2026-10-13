import { notFound } from 'next/navigation';
import {
  DesignCatalogHeader,
  DropLinks,
} from '@/components/commerce/DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import styles from '@/app/designs/designs.module.css';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

export default async function DropsPage() {
  if (!isReviewFeatureEnabled('commerce')) notFound();
  const drops = await getDesignCatalogService().listDrops();
  return (
    <main className={styles.shell}>
      <DesignCatalogHeader
        eyebrow="Limited edits"
        title="Drops"
        description="Limited seasonal releases and curated design drops, printed to order with archival quality."
      />
      <DropLinks drops={drops} />
    </main>
  );
}
