'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type { DesignAsset, MerchProduct } from '@/lib/commerce/types';
import styles from './punk.module.css';

const SAMPLE: DesignAsset = {
  id: 'asset-homepage-sample-photo',
  version: 'sample-v1',
  url: '/landing/transformations/pet-original.webp',
  alt: 'Sample photo of a smiling beagle',
  width: 1200,
  height: 1200,
  mimeType: 'image/webp',
  hasTransparency: false,
};

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

type StepStatus = 'live' | 'studio' | 'soon';
const steps: { label: string; detail: string; status: StepStatus }[] = [
  { label: 'Original photo', detail: 'Camera roll, files or camera. JPEG, PNG, WebP up to 10 MB.', status: 'live' },
  { label: 'Remove background', detail: 'Not available yet. We will not fake it — use a cut-out PNG for now.', status: 'soon' },
  { label: 'Choose a style', detail: 'AI restyles run in the studio. You see the result before paying.', status: 'studio' },
  { label: 'Preview on product', detail: 'Real print area, real placement. Try it right here.', status: 'live' },
  { label: 'Buy', detail: 'Secure checkout, printed to order.', status: 'studio' },
];

const statusLabel: Record<StepStatus, string> = {
  live: 'Works here',
  studio: 'In the studio',
  soon: 'Not yet',
};

/**
 * ACT III — the most literal demo on the page: drop a photo and see it on the
 * real product templates immediately, using the same InstantPreview +
 * placement engine as the studio. The photo stays on the device (object URL)
 * until the visitor continues into the studio, which imports it through the
 * studio's validated upload path.
 */
export function MakeYourOwnArt({
  products,
  styles: photoStyleOptions,
}: {
  products: MerchProduct[];
  styles: { key: string; label: string }[];
}) {
  const [asset, setAsset] = useState<DesignAsset>(SAMPLE);
  const [productId, setProductId] = useState((products.find((p) => p.id === 'everyday-tee') ?? products[0])?.id);
  const [error, setError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    // Revoke only on unmount: the studio hand-off needs the URL during navigation.
    if (objectUrl.current) setTimeout(() => URL.revokeObjectURL(objectUrl.current!), 60_000);
  }, []);

  const product = products.find((item) => item.id === productId) ?? products[0];
  const configuration = useMemo(
    () =>
      product &&
      createProductConfiguration({
        designId: 'homepage-try-it',
        design: asset,
        product,
        template: getPreviewTemplate(product.previewTemplateId),
      }),
    [asset, product],
  );

  function choose(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError('That file type is not supported yet. Choose a JPEG, PNG or WebP photo.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That photo is over 10 MB. Choose a smaller one.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = url;
      setAsset({
        id: 'asset-homepage-local',
        version: String(Date.now()),
        url,
        alt: 'Your photo',
        width: img.naturalWidth,
        height: img.naturalHeight,
        mimeType: file.type,
        hasTransparency: file.type !== 'image/jpeg',
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('We could not read that photo. Try another one.');
    };
    img.src = url;
  }

  const usingOwnPhoto = asset !== SAMPLE;
  const lowRes = usingOwnPhoto && Math.min(asset.width, asset.height) < 1200;
  const studioHref = `/create?product=${encodeURIComponent(product?.id ?? '')}${usingOwnPhoto ? `&artwork=${encodeURIComponent(asset.url)}` : ''}`;

  return (
    <section className={styles.makeAct} id="make" aria-labelledby="make-heading">
      <div className={styles.makeIntro}>
        <p className={styles.issueTag}>Act III · The studio</p>
        <h2 id="make-heading" className={styles.posterHeading}>
          Make your own <span className={styles.hlYellow}>damn</span> art.
        </h2>
        <p className={styles.lede}>Your photo. Real products. No design degree, no desktop software, no account to start.</p>
        <ol className={styles.pipeline}>
          {steps.map((step, i) => (
            <li key={step.label} data-status={step.status}>
              <span className={styles.pipelineNum}>{String(i + 1).padStart(2, '0')}</span>
              <span>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </span>
              <em>{statusLabel[step.status]}</em>
            </li>
          ))}
        </ol>
        <div className={styles.styleChips} aria-label="AI styles available in the studio">
          {photoStyleOptions.map((style) => (
            <Link key={style.key} href={`/create?style=${encodeURIComponent(style.key)}`}>
              {style.label}
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.tryIt}>
        <div className={styles.tryItHead}>
          <span className={styles.microtype}>{usingOwnPhoto ? 'Your photo · stays on this device' : 'Sample photo · swap in yours'}</span>
          <div className={styles.productSwitch} role="group" aria-label="Preview product">
            {products.map((item) => (
              <button key={item.id} type="button" aria-pressed={item.id === product?.id} onClick={() => setProductId(item.id)}>
                {item.name.replace(/^(Everyday|Gallery|Keepsake) /, '')}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.tryItStage} data-testid="try-it-preview">
          {configuration && <InstantPreview design={asset} configuration={configuration} showSafeZone={false} presentation="merchandising" />}
        </div>
        {lowRes && <p className={styles.warn}>Heads up: this photo is under 1200 px. It may print soft at large sizes. The studio checks print quality before checkout.</p>}
        {error && (
          <p className={styles.warn} role="alert">
            {error}
          </p>
        )}
        <div className={styles.tryItActions}>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.srOnly}
            id="homepage-photo"
            onChange={(event) => choose(event.target.files?.[0])}
          />
          <label htmlFor="homepage-photo" className={styles.btnPink}>
            Upload your photo
          </label>
          <Link href={studioHref} className={styles.btnInk} data-testid="continue-to-studio">
            {usingOwnPhoto ? 'Keep going in the studio' : 'Open the studio'}
          </Link>
        </div>
      </div>
    </section>
  );
}
