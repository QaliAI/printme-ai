import { z } from 'zod';
import { loadCreateAsset, removeCreateAssets, saveCreateAsset } from '@/lib/commerce/create-session';
import { getPetStyle } from './styles';

export const PET_DRAFT_KEY = 'printme:pets:draft:v1';
export const PET_DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export const petSubjectSchema = z.object({
  id: z.string().uuid(), role: z.enum(['pet', 'person']), label: z.string().max(40),
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  width: z.number().positive(), height: z.number().positive(),
  rotation: z.number().int().min(0).max(3), crop: z.enum(['original', 'square', 'portrait']),
});
export const petDraftSchema = z.object({
  id: z.string().uuid(), styleId: z.string().refine(value => Boolean(getPetStyle(value))),
  subjects: z.array(petSubjectSchema).max(4), caption: z.string().max(100),
  updatedAt: z.number().finite(), favorites: z.array(z.string().uuid()).max(30).default([]),
  versions: z.array(z.object({ id: z.string().uuid(), styleId: z.string(), createdAt: z.number() })).max(30).default([]),
});
export type PetSubject = z.infer<typeof petSubjectSchema>;
export type PetDraft = z.infer<typeof petDraftSchema>;
export const petAssetKey = (draftId: string, subjectId: string) => `pets:${draftId}:${subjectId}`;
export class PetDraftCleanupError extends Error {
  constructor() { super('Saved photos could not be deleted. Retry opening this brief, or clear this site’s browser data.'); }
}
export class PetDraftLoadError extends Error {
  constructor() { super('Your saved photos are temporarily unavailable. Retry opening this brief before starting over.'); }
}

export async function discardPetDraft(storage: Pick<Storage, 'getItem' | 'removeItem'>) {
  let parsed: ReturnType<typeof petDraftSchema.safeParse>;
  try { parsed = petDraftSchema.safeParse(JSON.parse(storage.getItem(PET_DRAFT_KEY) || 'null')); }
  catch { storage.removeItem(PET_DRAFT_KEY); return; }
  if (parsed.success) {
    try { await removeCreateAssets(parsed.data.subjects.map(subject => petAssetKey(parsed.data.id, subject.id))); }
    catch { throw new PetDraftCleanupError(); }
    storage.removeItem(`printme:pets:request:${parsed.data.id}`);
  }
  // Retain the index on failed asset deletion so a later attempt can finish it.
  storage.removeItem(PET_DRAFT_KEY);
}

export async function restorePetDraft(storage: Pick<Storage, 'getItem' | 'removeItem'>): Promise<PetDraft | null> {
  try {
    const parsed = petDraftSchema.safeParse(JSON.parse(storage.getItem(PET_DRAFT_KEY) || 'null'));
    if (!parsed.success) return null;
    if (Date.now() - parsed.data.updatedAt > PET_DRAFT_TTL || parsed.data.updatedAt > Date.now() + 60000) {
      await discardPetDraft(storage); return null;
    }
    const available = await Promise.all(parsed.data.subjects.map(async subject => (await loadCreateAsset(petAssetKey(parsed.data.id, subject.id))) ? subject : null))
      .catch(() => { throw new PetDraftLoadError(); });
    return { ...parsed.data, subjects: available.filter((subject): subject is PetSubject => subject !== null) };
  } catch (error) {
    if (error instanceof PetDraftCleanupError || error instanceof PetDraftLoadError) throw error;
    return null;
  }
}

export async function storePetPhoto(draftId: string, file: File, role: PetSubject['role']): Promise<PetSubject> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP photo.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Each photo needs to be under 10 MB.');
  if (!file.size) throw new Error('That photo is empty. Try another file.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('We could not read that image. Try a different JPEG, PNG or WebP.'); }
  try {
    if (bitmap.width < 256 || bitmap.height < 256) throw new Error('Choose a photo at least 256 × 256 pixels so we can see their face.');
    if (bitmap.width * bitmap.height > 25_000_000) throw new Error('That image is too large to prepare safely. Resize it below 25 megapixels.');
    const subject: PetSubject = { id: crypto.randomUUID(), role, label: '', mime: file.type as PetSubject['mime'], width: bitmap.width, height: bitmap.height, rotation: 0, crop: 'original' };
    await saveCreateAsset(petAssetKey(draftId, subject.id), file);
    return subject;
  } finally { bitmap.close(); }
}

/** Local crop/rotation are baked into a bounded upload; originals never leave the browser here. */
export async function preparePetReference(blob: Blob, subject: PetSubject): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const rotated = document.createElement('canvas');
    const swap = subject.rotation % 2 !== 0;
    const prescale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    rotated.width = Math.max(1, Math.round((swap ? bitmap.height : bitmap.width) * prescale));
    rotated.height = Math.max(1, Math.round((swap ? bitmap.width : bitmap.height) * prescale));
    const context = rotated.getContext('2d');
    if (!context) throw new Error('Photo preparation is unavailable in this browser.');
    context.translate(rotated.width / 2, rotated.height / 2); context.rotate(subject.rotation * Math.PI / 2);
    context.scale(prescale, prescale);
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    const ratio = subject.crop === 'square' ? 1 : subject.crop === 'portrait' ? 2 / 3 : rotated.width / rotated.height;
    const width = Math.min(rotated.width, rotated.height * ratio); const height = width / ratio;
    const scale = Math.min(1, 1536 / Math.max(width, height));
    const output = document.createElement('canvas'); output.width = Math.round(width * scale); output.height = Math.round(height * scale);
    const out = output.getContext('2d'); if (!out) throw new Error('Photo preparation failed.');
    out.fillStyle = '#fff'; out.fillRect(0, 0, output.width, output.height);
    out.drawImage(rotated, (rotated.width - width) / 2, (rotated.height - height) / 2, width, height, 0, 0, output.width, output.height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const data = output.toDataURL('image/jpeg', quality);
      if (data.length <= 750_000) return data;
    }
    throw new Error('That photo is still too large. Try a smaller image.');
  } finally { bitmap.close(); }
}
