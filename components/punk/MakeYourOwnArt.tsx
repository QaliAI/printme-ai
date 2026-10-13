'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import { CutoutRefiner } from '@/components/segmentation/CutoutRefiner';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type { DesignAsset, MerchProduct } from '@/lib/commerce/types';
import { renderCutout, segmentPhoto, type Cutout, type SegmentationProgress } from '@/lib/segmentation/client';
import styles from './punk.module.css';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;
const SAMPLE = { url: '/samples/ginger-cat.jpg', name: 'Sample: ginger cat (CC0)' };

type Status = 'empty' | 'photo' | 'working' | 'cutout' | 'error';

function assetFrom(url: string, width: number, height: number, mimeType: string, alt: string, version: string): DesignAsset {
  return { id: 'asset-homepage-local', version, url, alt, width, height, mimeType, hasTransparency: mimeType === 'image/png' };
}

/**
 * Homepage photo studio: UPLOAD → REMOVE BACKGROUND → PREVIEW/REFINE CUTOUT →
 * CHOOSE PRODUCT → CONTINUE TO STUDIO. The cutout comes from Cloudinary AI
 * background removal (the source photo is deleted right after); the original
 * stays in the browser so the visitor can switch back or refine edges.
 */
export function MakeYourOwnArt({
  products,
  styles: photoStyleOptions,
}: {
  products: MerchProduct[];
  styles: { key: string; label: string }[];
}) {
  const [status, setStatus] = useState<Status>('empty');
  const [original, setOriginal] = useState<{ blob: Blob; url: string; width: number; height: number; name: string } | null>(null);
  const [cutout, setCutout] = useState<Cutout | null>(null);
  const [cutoutAsset, setCutoutAsset] = useState<DesignAsset | null>(null);
  const [useCutout, setUseCutout] = useState(true);
  const [refining, setRefining] = useState(false);
  const [progress, setProgress] = useState<SegmentationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState((products.find((p) => p.id === 'everyday-tee') ?? products[0])?.id);
  const urls = useRef<string[]>([]);

  useEffect(() => () => {
    // Keep URLs alive briefly so a studio hand-off can still read them.
    const list = urls.current;
    setTimeout(() => list.forEach((url) => URL.revokeObjectURL(url)), 60_000);
  }, []);

  function track(url: string) {
    urls.current.push(url);
    return url;
  }

  async function load(blob: Blob, name: string) {
    setError(null);
    if (!ACCEPTED.includes(blob.type)) {
      setError('That file type is not supported yet. Choose a JPEG, PNG or WebP photo.');
      return;
    }
    if (blob.size > MAX_BYTES) {
      setError('That photo is over 10 MB. Choose a smaller one.');
      return;
    }
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    setOriginal({ blob, url: track(URL.createObjectURL(blob)), width: bitmap.width, height: bitmap.height, name });
    bitmap.close();
    setCutout(null);
    setCutoutAsset(null);
    setRefining(false);
    setStatus('photo');
  }

  async function loadSample() {
    const response = await fetch(SAMPLE.url);
    await load(await response.blob(), SAMPLE.name);
  }

  async function updateCutoutAsset(next: Cutout) {
    const rendered = await renderCutout(next);
    setCutoutAsset(assetFrom(track(URL.createObjectURL(rendered.blob)), rendered.width, rendered.height, 'image/png', 'Your cutout', String(Date.now())));
  }

  async function removeBackground() {
    if (!original) return;
    setStatus('working');
    setError(null);
    setProgress({ stage: 'upload' });
    try {
      const result = await segmentPhoto(original.blob, setProgress);
      setCutout(result);
      await updateCutoutAsset(result);
      setUseCutout(true);
      setStatus('cutout');
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error && cause.message ? `${cause.message} You can also continue with the original photo.` : 'Background removal did not finish. Try again, or continue with the original photo.');
    } finally {
      setProgress(null);
    }
  }

  const product = products.find((item) => item.id === productId) ?? products[0];
  const asset = useMemo(() => {
    if (useCutout && cutoutAsset) return cutoutAsset;
    if (original) return assetFrom(original.url, original.width, original.height, original.blob.type, 'Your photo', 'original');
    return null;
  }, [useCutout, cutoutAsset, original]);
  const configuration = useMemo(
    () =>
      asset && product
        ? createProductConfiguration({ designId: 'homepage-try-it', design: asset, product, template: getPreviewTemplate(product.previewTemplateId) })
        : null,
    [asset, product],
  );

  // Print sharpness: pixels per inch across the printed width.
  const printInches = product?.variants.find((v) => v.available)?.placeholders[0]?.printWidthInches;
  const ppi = asset && printInches ? Math.round(asset.width / printInches) : null;
  const studioHref = `/create?product=${encodeURIComponent(product?.id ?? '')}${asset ? `&artwork=${encodeURIComponent(asset.url)}` : ''}`;

  return (
    <section className={styles.makeAct} id="make" aria-labelledby="make-heading">
      <div className={styles.makeIntro}>
        <p className={styles.issueTag}>Your photo, cut out</p>
        <h2 id="make-heading" className={styles.posterHeading}>
          Make your own <span className={styles.hlYellow}>damn</span> art.
        </h2>
        <p className={styles.lede}>
          Upload a photo of your pet, your person or your thing. We cut out the background (hair and fur included), then you put it
          on a real tee, poster or mug.
        </p>
        <ol className={styles.pipeline}>
          <li data-status="live">
            <span className={styles.pipelineNum}>01</span>
            <span>
              <strong>Upload a photo</strong>
              <small>JPEG, PNG or WebP up to 10 MB, from your camera roll or files.</small>
            </span>
          </li>
          <li data-status="live">
            <span className={styles.pipelineNum}>02</span>
            <span>
              <strong>Remove the background</strong>
              <small>AI cutout that handles hair and fur. Paint to fix any edge.</small>
            </span>
          </li>
          <li data-status="live">
            <span className={styles.pipelineNum}>03</span>
            <span>
              <strong>Pick a product</strong>
              <small>Real print area and placement. What you see is what prints.</small>
            </span>
          </li>
          <li data-status="studio">
            <span className={styles.pipelineNum}>04</span>
            <span>
              <strong>Finish in the studio</strong>
              <small>Resize and position it, then add to cart.</small>
            </span>
          </li>
        </ol>
        {photoStyleOptions.length > 0 && (
        <div className={styles.styleChips} aria-label="AI styles available in the studio">
          {photoStyleOptions.map((style) => (
            <Link key={style.key} href={`/create?style=${encodeURIComponent(style.key)}`}>
              {style.label}
            </Link>
          ))}
        </div>
        )}
      </div>

      <div className={styles.tryIt} data-testid="try-it">
        {status === 'empty' && (
          <div className={styles.dropzone}>
            <p className={styles.dropTitle}>Start with a photo</p>
            <p className={styles.microtype}>Your photo is only processed to make the cutout, then deleted.</p>
            <div className={styles.tryItActions}>
              <label htmlFor="homepage-photo" className={styles.btnPink}>
                Upload your photo
              </label>
              <button type="button" className={styles.btnGhost} onClick={() => void loadSample()} data-testid="use-sample">
                Try a sample
              </button>
            </div>
          </div>
        )}

        {original && (
          <>
            <div className={styles.tryItHead}>
              <span className={styles.microtype}>{original.name}</span>
              {cutoutAsset && (
                <div className={styles.productSwitch} role="group" aria-label="Artwork">
                  <button type="button" aria-pressed={useCutout} onClick={() => setUseCutout(true)}>
                    Cutout
                  </button>
                  <button type="button" aria-pressed={!useCutout} onClick={() => setUseCutout(false)}>
                    Original
                  </button>
                </div>
              )}
            </div>

            {status === 'cutout' && cutout && refining ? (
              <CutoutRefiner cutout={cutout} onCommit={() => void updateCutoutAsset(cutout)} />
            ) : (
              <div className={styles.stagePair}>
                <figure className={styles.cutoutView} data-testid="cutout-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img src={useCutout && cutoutAsset ? cutoutAsset.url : original.url} alt={useCutout && cutoutAsset ? 'Your cutout' : 'Your photo'} />
                  {status === 'working' && (
                    <figcaption className={styles.working} role="status">
                      {progress?.stage === 'process' ? 'Cutting out your subject…' : 'Sending your photo…'}
                      <span className={styles.workingBar} />
                    </figcaption>
                  )}
                </figure>
                {configuration && asset && (
                  <div className={styles.tryItStage} data-testid="try-it-preview">
                    <InstantPreview design={asset} configuration={configuration} showSafeZone={false} presentation="merchandising" />
                  </div>
                )}
              </div>
            )}

            <div className={styles.productSwitch} role="group" aria-label="Preview product">
              {products.map((item) => (
                <button key={item.id} type="button" aria-pressed={item.id === product?.id} onClick={() => setProductId(item.id)}>
                  {item.name.replace(/^(Everyday|Gallery|Keepsake) /, '')}
                </button>
              ))}
            </div>

            {ppi !== null && ppi < 150 && (
              <p className={styles.warn}>Heads up: about {ppi} pixels per inch at full print width. A larger photo will print sharper.</p>
            )}
            {error && (
              <p className={styles.warn} role="alert">
                {error}
              </p>
            )}

            <div className={styles.tryItActions}>
              {(status === 'photo' || status === 'error') && (
                <button type="button" className={styles.btnPink} onClick={() => void removeBackground()} data-testid="remove-background">
                  Remove background
                </button>
              )}
              {status === 'working' && (
                <button type="button" className={styles.btnPink} disabled>
                  Working…
                </button>
              )}
              {status === 'cutout' && (
                <button type="button" className={styles.btnGhost} onClick={() => setRefining((value) => !value)} data-testid="refine-cutout">
                  {refining ? 'Done refining' : 'Refine edges'}
                </button>
              )}
              <Link href={studioHref} className={styles.btnInk} data-testid="continue-to-studio">
                Continue to studio
              </Link>
              <label htmlFor="homepage-photo" className={styles.textButton}>
                Change photo
              </label>
            </div>
          </>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={styles.srOnly}
          id="homepage-photo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void load(file, file.name || 'Your photo');
            event.target.value = '';
          }}
        />
      </div>
    </section>
  );
}
