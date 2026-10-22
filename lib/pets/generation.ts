import 'server-only';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { getImageProvider, type ImageProvider } from '@/lib/ai/image-provider';
import { validateImageInput } from '@/lib/ai/openai-image-provider';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getPetStyle } from './styles';
import { PetGenerationError, type PetGenerationRequest, type PetJob } from './schemas';
import type { PetGenerationStore } from './store';

export type PetGenerationConfig = { enabled: boolean; dailyBudgetCents: number; estimatedCostCents: number; ownerLimit: number; ipLimit: number; globalLimit: number };
const positiveInteger = (value: string | undefined, fallback = 0) => value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;

/** Cost estimates are explicit merchant configuration, never invented pricing. */
export function petGenerationConfig(env: Record<string, string | undefined> = process.env): PetGenerationConfig {
  return {
    // Production spend is deliberately unavailable in this release. An estimate
    // alone cannot prove a provider-enforced cost ceiling. Removing this guard
    // requires a reviewed implementation and evidence, not a settings change.
    enabled: env.NODE_ENV !== 'production' && env.VERCEL_ENV !== 'production' && env.PETS_GENERATION_ENABLED === 'true' && (!env.AI_PROVIDER || env.AI_PROVIDER === 'openai') && Boolean(env.OPENAI_API_KEY) && Boolean(env.PETS_QUOTA_SECRET && env.PETS_QUOTA_SECRET.length >= 32),
    dailyBudgetCents: positiveInteger(env.PETS_DAILY_BUDGET_CENTS), estimatedCostCents: positiveInteger(env.PETS_MAX_GENERATION_COST_CENTS),
    ownerLimit: positiveInteger(env.PETS_OWNER_DAILY_LIMIT, 3), ipLimit: positiveInteger(env.PETS_IP_DAILY_LIMIT, 10), globalLimit: positiveInteger(env.PETS_GLOBAL_DAILY_LIMIT, 100),
  };
}
export function petGenerationConfigured(config: PetGenerationConfig) {
  return config.enabled && config.dailyBudgetCents > 0 && config.estimatedCostCents > 0 && config.estimatedCostCents <= config.dailyBudgetCents;
}

export function publicPetJob(job: PetJob) {
  return { jobId: job.id, status: job.status, ...(job.status === 'completed' && job.preview_path ? { previewUrl: `/api/pets/generations/${job.id}/preview` } : {}), downloadAvailable: false };
}

export async function watermarkPetPortrait(original: Buffer) {
  const preview = await sharp(original, { limitInputPixels: 24_000_000 }).rotate().resize(800, 1200, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  const metadata = await sharp(preview).metadata();
  const width = metadata.width ?? 800, height = metadata.height ?? 1200;
  const rows = Array.from({ length: Math.ceil(height / 140) + 1 }, (_, row) => `<text x="${row % 2 ? -50 : 30}" y="${row * 140 + 50}" font-size="35" font-family="sans-serif" font-weight="700" fill="white" fill-opacity="0.65" stroke="black" stroke-opacity="0.45" stroke-width="1">PRINTME · PREVIEW   PRINTME · PREVIEW</text>`).join('');
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rows}<rect y="${height - 48}" width="${width}" height="48" fill="#111" fill-opacity="0.8"/><text x="20" y="${height - 17}" fill="white" font-family="sans-serif" font-size="18">PRINTME.AI · WATERMARKED PREVIEW</text></svg>`);
  return sharp(preview).composite([{ input: overlay }]).png().toBuffer();
}

export async function savePetPortrait(jobId: string, original: Buffer) {
  const bucket = getSupabaseAdminClient().storage.from('user-uploads');
  const originalPath = `pets/${jobId}/original.png`, previewPath = `pets/${jobId}/preview.png`;
  const preview = await watermarkPetPortrait(original);
  // Never create a signed URL for the unwatermarked original here.
  for (const [path, bytes] of [[originalPath, original], [previewPath, preview]] as const) {
    const { error } = await bucket.upload(path, bytes, { contentType: 'image/png', upsert: false });
    if (error) throw new PetGenerationError('PETS_STORAGE_UNCERTAIN', 'Your portrait needs recovery before it can be shown.');
  }
  return { originalPath, previewPath };
}

export async function generatePetPortrait(input: PetGenerationRequest, identity: { ownerHash: string; ipHash: string }, config: PetGenerationConfig,
  dependencies: { store: PetGenerationStore; provider?: ImageProvider; save?: typeof savePetPortrait }) {
  if (!petGenerationConfigured(config) || !await dependencies.store.verify()) throw new PetGenerationError('PETS_GENERATION_UNAVAILABLE', 'Portrait generation is being prepared. You can save your photos and style here.');
  // Decode and validate every input before reserving budget or making a provider request.
  for (const reference of input.references) {
    try {
      validateImageInput(reference.dataUrl);
      const metadata = await sharp(Buffer.from(reference.dataUrl.split(',')[1], 'base64'), { limitInputPixels: 24_000_000 }).metadata();
      if (!metadata.width || !metadata.height || metadata.width < 256 || metadata.height < 256 || metadata.width > 1536 || metadata.height > 1536 || (metadata.pages ?? 1) > 1) throw new Error('Invalid dimensions or animation');
    } catch { throw new PetGenerationError('PETS_INVALID_IMAGE', 'Choose a still photo between 256 and 1536 pixels on each side.', 400); }
  }
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const reservation = await dependencies.store.reserve({ ...identity, requestId: input.requestId, requestHash, estimatedCostCents: config.estimatedCostCents, dailyBudgetCents: config.dailyBudgetCents, ownerLimit: config.ownerLimit, ipLimit: config.ipLimit, globalLimit: config.globalLimit });
  if (!reservation.shouldRun) return publicPetJob(reservation.job);
  let providerStarted = false;
  try {
    const provider = dependencies.provider ?? await getImageProvider();
    const style = getPetStyle(input.styleId)!;
    providerStarted = true;
    const result = await provider.generateDesign({ imageUrls: input.references.map(reference => reference.dataUrl), workflow: 'photo-edit', background: 'opaque',
      promptTemplate: `${style.direction} Compose one original portrait with exactly ${input.subjectCount} subjects. Each reference is ordered: ${input.references.map((reference, index) => `photo ${index + 1}: ${reference.role}${reference.label ? ` named ${JSON.stringify(reference.label)}` : ''}`).join('; ')}. Preserve each individual identity; do not duplicate subjects or invent extra limbs. ${input.petName ? `Pet name: ${JSON.stringify(input.petName)}.` : ''} ${input.caption ? `Include this short caption exactly as supplied where legible: ${JSON.stringify(input.caption)}.` : 'No text.'}`,
    });
    validateImageInput(result.imageUrl);
    if (!result.imageUrl.startsWith('data:image/png;base64,')) throw new PetGenerationError('PETS_INVALID_OUTPUT', 'Your portrait needs recovery.');
    const saved = await (dependencies.save ?? savePetPortrait)(reservation.job.id, Buffer.from(result.imageUrl.split(',')[1], 'base64'));
    await dependencies.store.finish({ jobId: reservation.job.id, ownerHash: identity.ownerHash, status: 'completed', ...saved, providerRequestId: result.requestId });
    return publicPetJob({ ...reservation.job, status: 'completed', original_path: saved.originalPath, preview_path: saved.previewPath });
  } catch {
    // Charged generation and lost response are indistinguishable. Hold the entire
    // reservation, never automatically reissue a request or refund its allowance.
    const status = providerStarted ? 'uncertain' : 'failed';
    await dependencies.store.finish({ jobId: reservation.job.id, ownerHash: identity.ownerHash, status }).catch(() => undefined);
    // A completion may have committed before its acknowledgement was lost.
    const recovered = await dependencies.store.find(reservation.job.id, identity.ownerHash).catch(() => null);
    return publicPetJob(recovered?.status === 'completed' ? recovered : { ...reservation.job, status });
  }
}
