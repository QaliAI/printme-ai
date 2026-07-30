'use client';

import { useEffect, useState } from 'react';
import { loadCreateAsset } from '@/lib/commerce/create-session';
import type {
  DesignAsset,
  ProductConfiguration,
} from '@/lib/commerce/types';
import { InstantPreview } from './InstantPreview';

interface PersistedInstantPreviewProps {
  design: DesignAsset;
  configuration: ProductConfiguration;
  showSafeZone?: boolean;
  compact?: boolean;
}

export function PersistedInstantPreview({
  design,
  configuration,
  showSafeZone,
  compact,
}: PersistedInstantPreviewProps) {
  const storageKey =
    design.storageKey ?? configuration.designAssetStorageKey;
  const requiresRestore =
    Boolean(storageKey) && design.url.startsWith('blob:');
  const [restoredDesign, setRestoredDesign] = useState<DesignAsset | null>(
    requiresRestore ? null : design,
  );

  useEffect(() => {
    if (!requiresRestore || !storageKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRestoredDesign(design);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    void loadCreateAsset(storageKey).then((blob) => {
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setRestoredDesign({
        ...design,
        url: objectUrl,
        productionUrl: objectUrl,
        storageKey,
      });
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [design, requiresRestore, storageKey]);

  if (!restoredDesign) {
    return <div role="status">Restoring your design preview...</div>;
  }

  return (
    <InstantPreview
      design={restoredDesign}
      configuration={configuration}
      showSafeZone={showSafeZone}
      compact={compact}
    />
  );
}
