import Image from 'next/image';
import { instant2dRenderer, placementFromConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type { DesignAsset, ProductConfiguration } from '@/lib/commerce/types';
import styles from '@/app/shop-v2/shop-v2.module.css';

interface InstantPreviewProps {
  design: DesignAsset;
  configuration: ProductConfiguration;
  showSafeZone?: boolean;
  compact?: boolean;
}

function percentage(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

export function InstantPreview({
  design,
  configuration,
  showSafeZone = true,
  compact = false,
}: InstantPreviewProps) {
  const template = getPreviewTemplate(configuration.previewTemplateId);
  const render = instant2dRenderer.render({
    artwork: design,
    template,
    viewId: configuration.previewViewId,
    placement: placementFromConfiguration(configuration),
  });
  const { view, artworkBox, clipBox, safeZone } = render;

  return (
    <figure
      className={`${styles.preview} ${compact ? styles.previewCompact : ''}`}
      data-testid="instant-preview"
      data-product-id={configuration.merchProductId}
      data-render-key={render.renderKey}
      aria-label={`Instant ${configuration.merchProductId} preview`}
    >
      <Image
        src={view.baseProductImage}
        alt=""
        fill
        priority={!compact}
        sizes={compact ? '160px' : '(max-width: 700px) 92vw, 520px'}
        className={styles.previewBase}
      />
      <div
        className={styles.artworkClip}
        style={{
          left: percentage(clipBox.x, view.mockupWidth),
          top: percentage(clipBox.y, view.mockupHeight),
          width: percentage(clipBox.width, view.mockupWidth),
          height: percentage(clipBox.height, view.mockupHeight),
        }}
      >
        <div
          className={styles.artwork}
          style={{
            left: percentage(artworkBox.x - clipBox.x, clipBox.width),
            top: percentage(artworkBox.y - clipBox.y, clipBox.height),
            width: percentage(artworkBox.width, clipBox.width),
            height: percentage(artworkBox.height, clipBox.height),
            transform: `rotate(${render.rotationDegrees}deg)`,
          }}
        >
          <Image
            src={design.url}
            alt={design.alt}
            fill
            sizes={compact ? '120px' : '(max-width: 700px) 55vw, 300px'}
            className={styles.artworkImage}
          />
        </div>
      </div>
      {showSafeZone && (
        <div
          className={styles.safeZone}
          style={{
            left: percentage(safeZone.x, view.mockupWidth),
            top: percentage(safeZone.y, view.mockupHeight),
            width: percentage(safeZone.width, view.mockupWidth),
            height: percentage(safeZone.height, view.mockupHeight),
          }}
        >
          <span>Safe print area</span>
        </div>
      )}
      {view.shadowOverlay && (
        <Image
          src={view.shadowOverlay}
          alt=""
          fill
          sizes={compact ? '160px' : '(max-width: 700px) 92vw, 520px'}
          className={styles.previewOverlay}
        />
      )}
      {view.highlightOverlay && (
        <Image
          src={view.highlightOverlay}
          alt=""
          fill
          sizes={compact ? '160px' : '(max-width: 700px) 92vw, 520px'}
          className={styles.previewOverlay}
        />
      )}
      <figcaption className={styles.previewStatus}>
        <span aria-hidden="true" />
        Instant preview · artwork kept proportional
      </figcaption>
    </figure>
  );
}
