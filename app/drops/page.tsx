import { notFound } from 'next/navigation';
import {
  DesignCatalogHeader,
  DropLinks,
} from '@/components/commerce/DesignCatalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import styles from '@/app/designs/designs.module.css';

export default async function DropsPage() {
  if (process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED !== 'true') notFound();
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
