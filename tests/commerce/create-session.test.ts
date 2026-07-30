import { describe, expect, it } from 'vitest';
import {
  clearCreateSession,
  readCreateSession,
  writeCreateSession,
} from '@/lib/commerce/create-session';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const session = {
  schemaVersion: 1 as const,
  designId: 'customer-design-1',
  versionId: 'version-1',
  revision: 1,
  sourceType: 'uploaded-photo' as const,
  preparation: 'original' as const,
  artStyle: 'illustrated' as const,
  asset: {
    id: 'asset-1',
    alt: 'Uploaded artwork',
    width: 1200,
    height: 1600,
    mimeType: 'image/png',
    hasTransparency: true,
  },
  productId: 'gallery-poster',
  printifyVariantId: 43138,
  placement: {
    normalizedX: 0.5,
    normalizedY: 0.5,
    normalizedScale: 1,
    angle: 0,
    fit: 'contain' as const,
  },
  phase: 'customize' as const,
  updatedAt: '2026-07-30T12:00:00.000Z',
};

describe('create session persistence', () => {
  it('round-trips a versioned customization session', () => {
    const storage = new MemoryStorage();
    writeCreateSession(storage, session);
    expect(readCreateSession(storage)).toEqual(session);
  });

  it('rejects invalid placement and clears safely', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'printme:create:session:v1',
      JSON.stringify({
        ...session,
        placement: { ...session.placement, normalizedX: 2 },
      }),
    );
    expect(readCreateSession(storage)).toBeNull();
    clearCreateSession(storage);
    expect(readCreateSession(storage)).toBeNull();
  });
});
