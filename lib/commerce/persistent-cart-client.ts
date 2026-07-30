'use client';

import { supabase } from '@/lib/supabase';
import { cartConfigurationSnapshotSchema } from './snapshot';
import type { CartConfigurationSnapshot } from './types';

async function authorizationHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

async function commerceFetch(path: string, init?: RequestInit) {
  const authorization = await authorizationHeaders();
  return fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...authorization,
      ...init?.headers,
    },
  });
}

export async function readPersistentCart(): Promise<
  CartConfigurationSnapshot[] | null
> {
  try {
    const response = await commerceFetch('/api/commerce/cart');
    if (!response.ok) return null;
    const payload = (await response.json()) as { items?: unknown[] };
    return cartConfigurationSnapshotSchema
      .array()
      .parse(payload.items ?? []);
  } catch {
    return null;
  }
}

export async function upsertPersistentCartItem(
  snapshot: CartConfigurationSnapshot
): Promise<CartConfigurationSnapshot | null> {
  try {
    const response = await commerceFetch('/api/commerce/cart/items', {
      method: 'POST',
      body: JSON.stringify({ snapshot }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { snapshot?: unknown };
    return cartConfigurationSnapshotSchema.parse(payload.snapshot);
  } catch {
    return null;
  }
}

export async function removePersistentCartItem(itemId: string) {
  try {
    const response = await commerceFetch(
      `/api/commerce/cart/items/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    );
    return response.ok;
  } catch {
    return false;
  }
}
