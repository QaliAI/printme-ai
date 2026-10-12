'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import styles from './punk.module.css';

export interface FactoryProduct {
  id: string;
  name: string;
  price: string;
  method: string;
  printArea: string;
  href: string;
  preview: ReactNode;
}

/**
 * ACT V — one artwork, every compatible product. The screen-print sweep is
 * storytelling; the preview underneath is the real InstantPreview render with
 * the product's actual print area and default placement.
 */
export function PrintFactory({ products, artTitle }: { products: FactoryProduct[]; artTitle: string }) {
  const [active, setActive] = useState(products[0]?.id);
  const current = products.find((p) => p.id === active) ?? products[0];
  if (!current) return null;
  return (
    <section className={styles.factory} aria-labelledby="factory-heading">
      <div className={styles.factoryCopy}>
        <p className={styles.issueTag}>Act V · The print factory</p>
        <h2 id="factory-heading" className={styles.posterHeading}>
          Pixels in.
          <br />
          <span className={styles.hlPink}>Stuff out.</span>
        </h2>
        <p className={styles.lede}>
          One design, placed inside each product&apos;s real printable area. What you preview is what we send to print.
        </p>
        <div className={styles.factorySwitch} role="tablist" aria-label="Choose a product">
          {products.map((p) => (
            <button
              key={p.id}
              role="tab"
              type="button"
              aria-selected={p.id === current.id}
              aria-controls="factory-panel"
              onClick={() => setActive(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <dl className={styles.specSheet}>
          <div>
            <dt>Artwork</dt>
            <dd>{artTitle}</dd>
          </div>
          <div>
            <dt>Print method</dt>
            <dd>{current.method}</dd>
          </div>
          <div>
            <dt>Print area</dt>
            <dd>{current.printArea}</dd>
          </div>
          <div>
            <dt>From</dt>
            <dd>{current.price}</dd>
          </div>
        </dl>
        <Link href={current.href} className={styles.btnInk}>
          Shop the {current.name}
        </Link>
      </div>
      <div className={styles.factoryBed} id="factory-panel" role="tabpanel" aria-label={`${current.name} preview`}>
        <div className={styles.factoryRun} key={current.id}>
          {current.preview}
          <span className={styles.squeegee} aria-hidden="true" />
        </div>
        <span className={styles.regMark} style={{ left: 12, top: 12 }} aria-hidden="true" />
        <span className={styles.regMark} style={{ right: 12, bottom: 12 }} aria-hidden="true" />
      </div>
    </section>
  );
}
