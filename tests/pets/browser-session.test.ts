import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const assets = vi.hoisted(() => ({ load: vi.fn(), remove: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/commerce/create-session', () => ({ loadCreateAsset: assets.load, removeCreateAssets: assets.remove, saveCreateAsset: assets.save }));
import { discardPetDraft, PET_DRAFT_KEY, PET_DRAFT_TTL, PetDraftCleanupError, PetDraftLoadError, petAssetKey, restorePetDraft, storePetPhoto, type PetDraft, type PetSubject } from '@/lib/pets/browser-session';

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const now = Date.parse('2026-10-22T20:00:00Z');
const subject = (): PetSubject => ({ id: randomUUID(), role: 'pet', label: 'Miso', mime: 'image/jpeg', width: 1600, height: 2400, rotation: 0, crop: 'original' });
const draft = (updatedAt = now): PetDraft => ({ id: randomUUID(), styleId: 'reigning-floof', subjects: [subject(), subject()], caption: '', updatedAt, favorites: [], versions: [] });
function savedDraft(value: PetDraft) {
  const storage = new MemoryStorage();
  storage.setItem(PET_DRAFT_KEY, JSON.stringify(value));
  storage.setItem(`printme:pets:request:${value.id}`, JSON.stringify({ requestId: randomUUID(), signature: 'fixture' }));
  storage.setItem('unrelated-session', 'preserve');
  return storage;
}
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  assets.load.mockReset().mockResolvedValue(new Blob(['local-private-photo'], { type: 'image/jpeg' }));
  assets.remove.mockReset().mockResolvedValue(undefined); assets.save.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Pets draft lifetime and local photo privacy', () => {
  it('restores a current draft only from locally available photo assets', async () => {
    const value = draft(); const storage = savedDraft(value);
    expect(await restorePetDraft(storage)).toEqual(value);
    expect(assets.load.mock.calls.map(call => call[0])).toEqual(value.subjects.map(item => petAssetKey(value.id, item.id)));
    expect(assets.remove).not.toHaveBeenCalled();
    expect(storage.getItem(`printme:pets:request:${value.id}`)).not.toBeNull();
  });
  it('expires old drafts by deleting their local photos, request identity and metadata', async () => {
    const value = draft(now - PET_DRAFT_TTL - 1); const storage = savedDraft(value);
    expect(await restorePetDraft(storage)).toBeNull();
    expect(assets.remove).toHaveBeenCalledWith(value.subjects.map(item => petAssetKey(value.id, item.id)));
    expect(storage.getItem(PET_DRAFT_KEY)).toBeNull(); expect(storage.getItem(`printme:pets:request:${value.id}`)).toBeNull();
    expect(storage.getItem('unrelated-session')).toBe('preserve'); expect(assets.load).not.toHaveBeenCalled();
  });
  it('expires implausibly future-dated metadata rather than extending retention indefinitely', async () => {
    const value = draft(now + 60_001); const storage = savedDraft(value);
    expect(await restorePetDraft(storage)).toBeNull(); expect(assets.remove).toHaveBeenCalledOnce();
    expect(storage.getItem(PET_DRAFT_KEY)).toBeNull(); expect(storage.getItem(`printme:pets:request:${value.id}`)).toBeNull();
  });
  it('retains an exactly-seven-day draft until it exceeds its stated lifetime', async () => {
    const value = draft(now - PET_DRAFT_TTL); const storage = savedDraft(value);
    expect(await restorePetDraft(storage)).toEqual(value); expect(assets.remove).not.toHaveBeenCalled();
  });
  it('removes only the selected draft assets and its saved generation request on discard', async () => {
    const value = draft(); const storage = savedDraft(value);
    await discardPetDraft(storage);
    expect(assets.remove).toHaveBeenCalledWith(value.subjects.map(item => `pets:${value.id}:${item.id}`));
    expect(storage.getItem(PET_DRAFT_KEY)).toBeNull(); expect(storage.getItem(`printme:pets:request:${value.id}`)).toBeNull();
    expect(storage.getItem('unrelated-session')).toBe('preserve');
  });
  it('retains the asset index and request identity when deletion fails, allowing a safe retry', async () => {
    const value = draft(); const storage = savedDraft(value);
    const metadata = storage.getItem(PET_DRAFT_KEY), requestKey = `printme:pets:request:${value.id}`, requestIdentity = storage.getItem(requestKey);
    assets.remove.mockRejectedValueOnce(new Error('IndexedDB transaction aborted'));
    await expect(discardPetDraft(storage)).rejects.toBeInstanceOf(PetDraftCleanupError);
    expect(storage.getItem(PET_DRAFT_KEY)).toBe(metadata); expect(storage.getItem(requestKey)).toBe(requestIdentity);
    await discardPetDraft(storage);
    expect(assets.remove).toHaveBeenCalledTimes(2);
    expect(assets.remove.mock.calls[1][0]).toEqual(value.subjects.map(item => petAssetKey(value.id, item.id)));
    expect(storage.getItem(PET_DRAFT_KEY)).toBeNull(); expect(storage.getItem(requestKey)).toBeNull();
  });
  it('propagates expired-draft cleanup failure instead of allowing its index to be overwritten', async () => {
    const value = draft(now - PET_DRAFT_TTL - 1); const storage = savedDraft(value);
    const metadata = storage.getItem(PET_DRAFT_KEY), requestKey = `printme:pets:request:${value.id}`, requestIdentity = storage.getItem(requestKey);
    assets.remove.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    await expect(restorePetDraft(storage)).rejects.toBeInstanceOf(PetDraftCleanupError);
    expect(storage.getItem(PET_DRAFT_KEY)).toBe(metadata); expect(storage.getItem(requestKey)).toBe(requestIdentity);
    expect(assets.load).not.toHaveBeenCalled();
    expect(await restorePetDraft(storage)).toBeNull();
    expect(assets.remove).toHaveBeenCalledTimes(2); expect(storage.getItem(PET_DRAFT_KEY)).toBeNull(); expect(storage.getItem(requestKey)).toBeNull();
  });
  it('filters missing local photos instead of inventing or fetching replacements', async () => {
    const value = draft(); const storage = savedDraft(value);
    assets.load.mockResolvedValueOnce(null).mockResolvedValueOnce(new Blob(['available']));
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const restored = await restorePetDraft(storage);
    expect(restored?.subjects).toEqual([value.subjects[1]]); expect(fetch).not.toHaveBeenCalled();
    expect(restored?.id).toBe(value.id);
  });
  it.each(['{broken-json', JSON.stringify({ id: 'untrusted', subjects: [{ id: '../another-session' }] })])('does not follow malformed draft asset metadata', async metadata => {
    const storage = new MemoryStorage(); storage.setItem(PET_DRAFT_KEY, metadata);
    expect(await restorePetDraft(storage)).toBeNull(); expect(assets.load).not.toHaveBeenCalled(); expect(assets.remove).not.toHaveBeenCalled();
  });
  it('preserves the current draft index and propagates a recoverable browser-storage load failure', async () => {
    const value = draft(); const storage = savedDraft(value);
    const metadata = storage.getItem(PET_DRAFT_KEY), requestKey = `printme:pets:request:${value.id}`, requestIdentity = storage.getItem(requestKey);
    assets.load.mockRejectedValue(new Error('IndexedDB blocked'));
    await expect(restorePetDraft(storage)).rejects.toBeInstanceOf(PetDraftLoadError);
    expect(storage.getItem(PET_DRAFT_KEY)).toBe(metadata); expect(storage.getItem(requestKey)).toBe(requestIdentity);
    expect(assets.remove).not.toHaveBeenCalled();
    assets.load.mockResolvedValue(new Blob(['restored private photo']));
    expect(await restorePetDraft(storage)).toEqual(value);
  });
});

describe('Pets local photo admission', () => {
  it.each([
    { type: 'image/svg+xml', size: 100, message: /JPEG, PNG or WebP/ },
    { type: 'image/jpeg', size: 10 * 1024 * 1024 + 1, message: /under 10 MB/ },
    { type: 'image/png', size: 0, message: /empty/ },
  ])('rejects invalid $type/$size before decoding or saving', async ({ type, size, message }) => {
    const decode = vi.fn(); vi.stubGlobal('createImageBitmap', decode);
    await expect(storePetPhoto(randomUUID(), { type, size } as File, 'pet')).rejects.toThrow(message);
    expect(decode).not.toHaveBeenCalled(); expect(assets.save).not.toHaveBeenCalled();
  });
  it('rejects corrupt image content without saving the original', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode failed')));
    await expect(storePetPhoto(randomUUID(), new File(['not an image'], 'bad.jpg', { type: 'image/jpeg' }), 'pet')).rejects.toThrow(/could not read/);
    expect(assets.save).not.toHaveBeenCalled();
  });
  it.each([
    { width: 255, height: 500, message: /at least 256/ },
    { width: 6000, height: 6000, message: /below 25 megapixels/ },
  ])('closes rejected decoded images ($width×$height) and does not save them', async ({ width, height, message }) => {
    const close = vi.fn(); vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close }));
    await expect(storePetPhoto(randomUUID(), new File(['fixture'], 'photo.jpg', { type: 'image/jpeg' }), 'pet')).rejects.toThrow(message);
    expect(close).toHaveBeenCalledOnce(); expect(assets.save).not.toHaveBeenCalled();
  });
  it('saves a valid selected photo locally without posting customer bytes to any service', async () => {
    const close = vi.fn(); vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1200, height: 1600, close }));
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const id = randomUUID(), photo = new File(['private fixture photo'], 'my-pet.jpg', { type: 'image/jpeg' });
    const stored = await storePetPhoto(id, photo, 'pet');
    expect(assets.save).toHaveBeenCalledWith(petAssetKey(id, stored.id), photo);
    expect(stored).toMatchObject({ role: 'pet', mime: 'image/jpeg', width: 1200, height: 1600 });
    expect(fetch).not.toHaveBeenCalled(); expect(close).toHaveBeenCalledOnce();
  });
});
