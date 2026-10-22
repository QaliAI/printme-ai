import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { generatePetPortrait, petGenerationConfig, petGenerationConfigured, publicPetJob, watermarkPetPortrait, type PetGenerationConfig } from '@/lib/pets/generation';
import { petGenerationRequestSchema, type PetGenerationRequest, type PetJob } from '@/lib/pets/schemas';
import { requirePetDigitalEntitlement } from '@/lib/pets/download';
import { OpenAIImageProvider } from '@/lib/ai/openai-image-provider';
import type { PetGenerationStore } from '@/lib/pets/store';

let image: Buffer, dataUrl: string;
const identity = { ownerHash: 'a'.repeat(64), ipHash: 'b'.repeat(64) };
const config: PetGenerationConfig = { enabled: true, dailyBudgetCents: 100, estimatedCostCents: 20, ownerLimit: 3, ipLimit: 10, globalLimit: 100 };
beforeAll(async () => {
  image = await sharp({ create: { width: 300, height: 450, channels: 3, background: '#803b64' } }).png().toBuffer();
  dataUrl = `data:image/png;base64,${image.toString('base64')}`;
});
const input = (): PetGenerationRequest => ({ requestId: randomUUID(), styleId: 'reigning-floof', subjectCount: 1, references: [{ dataUrl, role: 'pet' }] });
function fixture(status: PetJob['status'] = 'reserved') {
  const job: PetJob = { id: randomUUID(), status, owner_hash: identity.ownerHash, request_hash: 'c'.repeat(64), original_path: null, preview_path: null, provider_request_id: null };
  const store: PetGenerationStore = { verify: vi.fn(async () => true), reserve: vi.fn(async () => ({ job, shouldRun: true })), finish: vi.fn(async () => undefined), find: vi.fn(async () => job) };
  const provider = { generateDesign: vi.fn(async () => ({ imageUrl: dataUrl, prompt: 'fixture', requestId: 'req_synthetic' })), validateConnection: async () => true, getName: () => 'fixture' };
  const save = vi.fn(async (id: string) => ({ originalPath: `pets/${id}/original.png`, previewPath: `pets/${id}/preview.png` }));
  return { job, store, provider, save };
}

describe('Pets generation admission and privacy', () => {
  it('defaults off and requires explicit positive cost ceiling, budget, secret and real provider', () => {
    expect(petGenerationConfigured(petGenerationConfig({}))).toBe(false);
    const env = { PETS_GENERATION_ENABLED: 'true', OPENAI_API_KEY: 'fixture', PETS_QUOTA_SECRET: 'x'.repeat(32), PETS_DAILY_BUDGET_CENTS: '100' };
    expect(petGenerationConfigured(petGenerationConfig(env))).toBe(false);
    expect(petGenerationConfigured(petGenerationConfig({ ...env, PETS_MAX_GENERATION_COST_CENTS: '20' }))).toBe(true);
    expect(petGenerationConfigured(petGenerationConfig({ ...env, PETS_MAX_GENERATION_COST_CENTS: '101' }))).toBe(false);
    expect(petGenerationConfigured(petGenerationConfig({ ...env, PETS_MAX_GENERATION_COST_CENTS: '20', AI_PROVIDER: 'mock' }))).toBe(false);
    expect(petGenerationConfigured(petGenerationConfig({ ...env, PETS_MAX_GENERATION_COST_CENTS: '20', NODE_ENV: 'production' }))).toBe(false);
    expect(petGenerationConfigured(petGenerationConfig({ ...env, PETS_MAX_GENERATION_COST_CENTS: '20', VERCEL_ENV: 'production' }))).toBe(false);
  });
  it('does not reserve, inspect storage or call provider when disabled', async () => {
    const dependencies = fixture();
    await expect(generatePetPortrait(input(), identity, { ...config, enabled: false }, dependencies)).rejects.toMatchObject({ code: 'PETS_GENERATION_UNAVAILABLE' });
    expect(dependencies.store.verify).not.toHaveBeenCalled(); expect(dependencies.store.reserve).not.toHaveBeenCalled(); expect(dependencies.provider.generateDesign).not.toHaveBeenCalled();
  });
  it('fails closed when ledger/private storage verification fails', async () => {
    const dependencies = fixture(); vi.mocked(dependencies.store.verify).mockResolvedValue(false);
    await expect(generatePetPortrait(input(), identity, config, dependencies)).rejects.toMatchObject({ code: 'PETS_GENERATION_UNAVAILABLE' });
    expect(dependencies.store.reserve).not.toHaveBeenCalled();
  });
  it('validates all images before reservation or spend', async () => {
    const dependencies = fixture(); const invalid = input(); invalid.references.push({ dataUrl: 'data:image/png;base64,YWJj', role: 'pet' });
    await expect(generatePetPortrait(invalid, identity, config, dependencies)).rejects.toMatchObject({ code: 'PETS_INVALID_IMAGE', status: 400 });
    expect(dependencies.store.reserve).not.toHaveBeenCalled(); expect(dependencies.provider.generateDesign).not.toHaveBeenCalled();
  });
  it('makes one multi-reference opaque render and returns only owner-protected preview path', async () => {
    const dependencies = fixture(); const request = input(); request.subjectCount = 2; request.references.push({ dataUrl, role: 'person', label: 'Alex' });
    const result = await generatePetPortrait(request, identity, config, dependencies);
    expect(dependencies.provider.generateDesign).toHaveBeenCalledOnce();
    expect(dependencies.provider.generateDesign).toHaveBeenCalledWith(expect.objectContaining({ imageUrls: [dataUrl, dataUrl], background: 'opaque', workflow: 'photo-edit' }));
    expect(dependencies.store.reserve).toHaveBeenCalledWith(expect.objectContaining({ estimatedCostCents: 20, dailyBudgetCents: 100, ownerLimit: 3, ipLimit: 10 }));
    expect(result).toEqual({ jobId: dependencies.job.id, status: 'completed', previewUrl: `/api/pets/generations/${dependencies.job.id}/preview`, downloadAvailable: false });
    expect(JSON.stringify(result)).not.toContain('original');
  });
  it.each(['reserved', 'completed', 'uncertain', 'failed'] as const)('never repeats a provider request for existing %s idempotency key', async status => {
    const dependencies = fixture(status); vi.mocked(dependencies.store.reserve).mockResolvedValue({ job: dependencies.job, shouldRun: false });
    expect((await generatePetPortrait(input(), identity, config, dependencies)).status).toBe(status);
    expect(dependencies.provider.generateDesign).not.toHaveBeenCalled();
  });
  it('keeps failed/unknown provider responses held rather than retrying', async () => {
    const dependencies = fixture(); dependencies.provider.generateDesign.mockRejectedValue(new Error('timeout after charge'));
    expect(await generatePetPortrait(input(), identity, config, dependencies)).toMatchObject({ jobId: dependencies.job.id, status: 'uncertain', downloadAvailable: false });
    expect(dependencies.provider.generateDesign).toHaveBeenCalledOnce();
    expect(dependencies.store.finish).toHaveBeenCalledWith(expect.objectContaining({ status: 'uncertain' }));
  });
  it('does not repeat a paid render after output persistence or DB acknowledgement fails', async () => {
    const dependencies = fixture(); dependencies.save.mockRejectedValue(new Error('storage unavailable'));
    expect(await generatePetPortrait(input(), identity, config, dependencies)).toMatchObject({ jobId: dependencies.job.id, status: 'uncertain' });
    expect(dependencies.provider.generateDesign).toHaveBeenCalledOnce(); expect(dependencies.store.finish).toHaveBeenCalledWith(expect.objectContaining({ status: 'uncertain' }));
    const acknowledgement = fixture(); vi.mocked(acknowledgement.store.finish).mockRejectedValue(new Error('DB ack lost'));
    expect(await generatePetPortrait(input(), identity, config, acknowledgement)).toMatchObject({ jobId: acknowledgement.job.id, status: 'uncertain' });
    expect(acknowledgement.provider.generateDesign).toHaveBeenCalledOnce();
  });
  it('burns a visible server watermark into a smaller PNG', async () => {
    const preview = await watermarkPetPortrait(image); const metadata = await sharp(preview).metadata();
    expect(metadata.width).toBe(300); expect(metadata.height).toBe(450); expect(metadata.format).toBe('png');
    const sourcePixels = await sharp(image).raw().toBuffer(); const previewPixels = await sharp(preview).removeAlpha().raw().toBuffer();
    expect(sourcePixels.equals(previewPixels)).toBe(false);
    const footer = await sharp(await sharp(preview).extract({ left: 0, top: 420, width: 10, height: 10 }).toBuffer()).stats();
    expect(footer.channels[0].mean).toBeLessThan(100);
  });
  it('never treats a job ID as an entitlement to an unwatermarked digital download', () => {
    expect(requirePetDigitalEntitlement).toThrowError(expect.objectContaining({ code: 'DIGITAL_PURCHASE_UNAVAILABLE', status: 403 }));
    const dependencies = fixture('completed'); dependencies.job.original_path = 'secret';
    expect(JSON.stringify(publicPetJob(dependencies.job))).not.toContain('secret');
  });
  it('rejects unsupported styles, arbitrary URLs, excess references and people-only requests', () => {
    expect(petGenerationRequestSchema.safeParse({ ...input(), styleId: 'unknown' }).success).toBe(false);
    expect(petGenerationRequestSchema.safeParse({ ...input(), references: [{ dataUrl: 'https://evil.test/image.png' }] }).success).toBe(false);
    expect(petGenerationRequestSchema.safeParse({ ...input(), references: Array(5).fill({ dataUrl, role: 'pet' }) }).success).toBe(false);
    expect(petGenerationRequestSchema.safeParse({ ...input(), references: [{ dataUrl, role: 'person' }] }).success).toBe(false);
    expect(petGenerationRequestSchema.safeParse({ ...input(), subjectCount: 2 }).success).toBe(false);
  });
});

describe('existing image provider multi-reference compatibility', () => {
  it('sends bounded ordered JSON images and keeps n=1, without unsupported input_fidelity', async () => {
    const transport = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ data: [{ b64_json: image.toString('base64') }] }), { headers: { 'content-type': 'application/json' } }));
    const provider = new OpenAIImageProvider('fixture-key', transport);
    await provider.generateDesign({ workflow: 'photo-edit', imageUrls: [dataUrl, dataUrl], promptTemplate: 'Two subjects', background: 'opaque' });
    const body = JSON.parse(transport.mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({ images: [{ image_url: dataUrl }, { image_url: dataUrl }], n: 1, size: '1024x1536', background: 'opaque' }); expect(body.input_fidelity).toBeUndefined();
  });
  it('rejects ambiguous one-plus-many input and too many references before transport', async () => {
    const transport = vi.fn(); const provider = new OpenAIImageProvider('fixture-key', transport);
    await expect(provider.generateDesign({ imageUrl: dataUrl, imageUrls: [dataUrl], promptTemplate: 'Pet' })).rejects.toMatchObject({ code: 'INVALID_IMAGE' });
    await expect(provider.generateDesign({ imageUrls: Array(5).fill(dataUrl), promptTemplate: 'Pet' })).rejects.toMatchObject({ code: 'INVALID_IMAGE' });
    expect(transport).not.toHaveBeenCalled();
  });
});
