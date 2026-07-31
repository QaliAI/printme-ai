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
        description="Published design groupings with explicit dates and no fabricated demand signals."
      />
      <DropLinks drops={drops} />
    </main>
  );
}
