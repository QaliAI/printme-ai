import { z } from 'zod';
import { designSourceTypeSchema } from './designs/canonical';

export const CREATE_SESSION_STORAGE_KEY = 'printme:create:session:v1';
const CREATE_DATABASE_NAME = 'printme-create';
const CREATE_ASSET_STORE = 'assets';

const placementSchema = z.object({
  normalizedX: z.number().min(0).max(1),
  normalizedY: z.number().min(0).max(1),
  normalizedScale: z.number().positive(),
  angle: z.number().finite(),
  fit: z.enum(['contain', 'cover']),
});

export const savedCreateSessionSchema = z.object({
  schemaVersion: z.literal(1),
  designId: z.string().min(1),
  versionId: z.string().min(1),
  revision: z.number().int().positive(),
  sourceType: designSourceTypeSchema,
  preparation: z.enum(['original', 'background-removed', 'art']),
  artStyle: z.enum(['illustrated', 'poster', 'soft-paint']),
  asset: z.object({
    id: z.string().min(1),
    alt: z.string().min(1),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    mimeType: z.string().min(1),
    hasTransparency: z.boolean(),
  }),
  productId: z.string().min(1),
  printifyVariantId: z.number().int().positive(),
  placement: placementSchema,
  phase: z.enum(['prepare', 'customize', 'cart']),
  updatedAt: z.string().datetime({ offset: true }),
});

export type SavedCreateSession = z.infer<typeof savedCreateSessionSchema>;
type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem' | 'removeItem'>;

export function createAssetStorageKey(designId: string, revision: number) {
  return revision === 1
    ? `${designId}:original`
    : `${designId}:version:${revision}`;
}

export function readCreateSession(
  storage: ReadStorage,
): SavedCreateSession | null {
  const value = storage.getItem(CREATE_SESSION_STORAGE_KEY);
  if (!value) return null;
  try {
    return savedCreateSessionSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}

export function writeCreateSession(
  storage: WriteStorage,
  session: SavedCreateSession,
) {
  storage.setItem(
    CREATE_SESSION_STORAGE_KEY,
    JSON.stringify(savedCreateSessionSchema.parse(session)),
  );
}

export function clearCreateSession(storage: WriteStorage) {
  storage.removeItem(CREATE_SESSION_STORAGE_KEY);
}

function openCreateDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CREATE_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CREATE_ASSET_STORE)) {
        database.createObjectStore(CREATE_ASSET_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCreateAsset(
  key: string,
  blob: Blob,
): Promise<void> {
  const database = await openCreateDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        CREATE_ASSET_STORE,
        'readwrite',
      );
      transaction.objectStore(CREATE_ASSET_STORE).put(blob, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function loadCreateAsset(key: string): Promise<Blob | null> {
  const database = await openCreateDatabase();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const transaction = database.transaction(CREATE_ASSET_STORE, 'readonly');
      const request = transaction.objectStore(CREATE_ASSET_STORE).get(key);
      request.onsuccess = () =>
        resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function removeCreateAssets(keys: string[]): Promise<void> {
  const database = await openCreateDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        CREATE_ASSET_STORE,
        'readwrite',
      );
      const store = transaction.objectStore(CREATE_ASSET_STORE);
      keys.forEach((key) => store.delete(key));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
