import Image from 'next/image';
import Link from 'next/link';
import type {
  CuratedDesignRecord,
  DesignCollection,
  DesignDrop,
  DesignFilter,
} from '@/lib/commerce/designs/models';
import styles from '@/app/designs/designs.module.css';

const filters: Array<{ value: DesignFilter; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'trending', label: 'Trending' },
  { value: 'bestsellers', label: 'Bestsellers' },
  { value: 'archive', label: 'Archive' },
];

export function DesignCatalogHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className={styles.header}>
      <nav aria-label="Commerce preview">
        <Link href="/designs">Designs</Link>
        <Link href="/drops">Drops</Link>
        <Link href="/collections">Collections</Link>
        <Link href="/shop-v2">Shop preview</Link>
      </nav>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <div>{description}</div>
    </header>
  );
}

export function DesignFilters({ active }: { active?: DesignFilter }) {
  return (
    <nav className={styles.filters} aria-label="Filter designs">
      <Link href="/designs" aria-current={!active ? 'page' : undefined}>
        All
      </Link>
      {filters.map((filter) => (
        <Link
          href={`/designs?filter=${filter.value}`}
          key={filter.value}
          aria-current={active === filter.value ? 'page' : undefined}
        >
          {filter.label}
        </Link>
      ))}
    </nav>
  );
}

export function DesignGrid({
  designs,
}: {
  designs: CuratedDesignRecord[];
}) {
  if (designs.length === 0) {
    return (
      <div className={styles.empty}>
        No published designs are assigned to this view yet.
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {designs.map((design, index) => (
        <article className={styles.card} key={design.id}>
          <Link href={`/designs/${design.slug}`}>
            <span className={styles.imageFrame}>
              <Image
                src={design.asset.url}
                alt={design.asset.alt}
                fill
                sizes="(max-width: 700px) 92vw, 30vw"
                priority={index === 0}
              />
            </span>
            <span className={styles.cardCopy}>
              <small>{design.collection}</small>
              <strong>{design.title}</strong>
              <span>{design.description}</span>
            </span>
          </Link>
        </article>
      ))}
    </div>
  );
}

export function DesignDetail({ design }: { design: CuratedDesignRecord }) {
  return (
    <main className={styles.shell}>
      <DesignCatalogHeader
        eyebrow={design.collection}
        title={design.title}
        description={design.seoDescription}
      />
      <section className={styles.detail}>
        <div className={styles.detailImage}>
          <Image
            src={design.asset.url}
            alt={design.asset.alt}
            fill
            sizes="(max-width: 800px) 92vw, 50vw"
            priority
          />
        </div>
        <div className={styles.detailCopy}>
          <p>{design.description}</p>
          <dl>
            <div>
              <dt>Source</dt>
              <dd>{design.artistOrSource}</dd>
            </div>
            <div>
              <dt>Rights</dt>
              <dd>{design.rightsStatus}</dd>
            </div>
            <div>
              <dt>Recommended format</dt>
              <dd>{design.recommendedProductId}</dd>
            </div>
          </dl>
          <Link className={styles.action} href="/shop-v2">
            Configure this design
          </Link>
        </div>
      </section>
    </main>
  );
}

export function CollectionLinks({
  collections,
}: {
  collections: DesignCollection[];
}) {
  return (
    <section className={styles.linkList}>
      <h2>Collections</h2>
      {collections.map((collection) => (
        <Link href={`/collections/${collection.slug}`} key={collection.id}>
          <strong>{collection.title}</strong>
          <span>{collection.description}</span>
        </Link>
      ))}
    </section>
  );
}

export function DropLinks({ drops }: { drops: DesignDrop[] }) {
  return (
    <section className={styles.linkList}>
      {drops.map((drop) => (
        <Link href={`/drops/${drop.slug}`} key={drop.id}>
          <strong>{drop.title}</strong>
          <span>{drop.description}</span>
        </Link>
      ))}
    </section>
  );
}
