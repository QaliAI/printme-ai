'use client';

import { supabase } from '@/lib/supabase';
import type {
  StudioDesignDraft,
  StudioProductCompatibility,
} from './types';

async function authorizationHeaders(): Promise<Record<string, string>> {
  const e2eSession = await fetch('/api/studio/session', {
    credentials: 'same-origin',
  });
  if (e2eSession.ok) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Studio sign-in is required.');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function uploadStudioAsset(input: {
  file: File;
  role: 'original' | 'display' | 'thumbnail' | 'production';
  width: number;
  height: number;
  altText: string;
  hasTransparency: boolean;
}) {
  const form = new FormData();
  form.set('file', input.file);
  form.set('role', input.role);
  form.set('width', String(input.width));
  form.set('height', String(input.height));
  form.set('altText', input.altText);
  form.set('hasTransparency', String(input.hasTransparency));
  const response = await fetch('/api/studio/assets', {
    method: 'POST',
    headers: await authorizationHeaders(),
    body: form,
  });
  const payload = (await response.json()) as {
    asset?: StudioDesignDraft['assets'][number];
    error?: string;
  };
  if (!response.ok || !payload.asset) {
    throw new Error(payload.error ?? 'Studio asset upload failed.');
  }
  return payload.asset;
}

export async function saveStudioDesign(draft: StudioDesignDraft) {
  const response = await fetch('/api/studio/designs', {
    method: 'POST',
    headers: {
      ...(await authorizationHeaders()),
      'content-type': 'application/json',
    },
    body: JSON.stringify(draft),
  });
  const payload = (await response.json()) as {
    design?: StudioDesignDraft;
    error?: string;
  };
  if (!response.ok || !payload.design) {
    throw new Error(payload.error ?? 'Studio design save failed.');
  }
  return payload.design;
}

export function createDefaultCompatibility(
  products: Array<{
    id: string;
    variants: Array<{
      printifyVariantId: number;
      color: string | null;
    }>;
    defaultPlacement: StudioProductCompatibility['placement'] & {
      position: string;
      decorationMethod: string;
    };
  }>,
): StudioProductCompatibility[] {
  return products.map((product, index) => ({
    productId: product.id,
    status: index === 0 ? 'recommended' : 'compatible',
    defaultColor: product.variants[0]?.color ?? null,
    defaultVariantId:
      product.variants[0]?.printifyVariantId ?? null,
    isDefault: index === 0,
    placement: {
      normalizedX: product.defaultPlacement.normalizedX,
      normalizedY: product.defaultPlacement.normalizedY,
      normalizedScale: product.defaultPlacement.normalizedScale,
      angle: product.defaultPlacement.angle,
      fit: product.defaultPlacement.fit,
    },
    severeDpiWarning: false,
    severeSafeZoneWarning: false,
  }));
}
