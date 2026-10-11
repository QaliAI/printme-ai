import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID, createHash } from 'node:crypto';
import { generateDurableArtwork } from '@/lib/ai/generate-artwork';
import { ImageProviderError } from '@/lib/ai/image-provider';
import { photoStyles, type PhotoStyle } from '@/lib/ai/photo-styles';
import { FakeImageProvider } from '@/lib/ai/testing/fake-provider';
import { isCommerceE2ERequest } from '@/lib/commerce/testing/e2e-harness';
import { trackServerCommerceEvent } from '@/lib/commerce/analytics-server';
import { guardImageRequest } from '@/lib/ai/request-gate';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    if (!isCommerceE2ERequest(request)) guardImageRequest(request);
    const form = await request.formData();
    const file = form.get('file');
    const style = form.get('style') as PhotoStyle;
    if (!(file instanceof Blob) || !file.size || file.size > 10 * 1024 * 1024 || !Object.hasOwn(photoStyles, style)) {
      return NextResponse.json({ error: 'Choose a photo smaller than 10 MB and a transformation style.' }, { status: 400 });
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Choose a JPEG, PNG, or WebP photo.' }, { status: 415 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const designId = `ai-design-${randomUUID()}`;
    const testMode = isCommerceE2ERequest(request);
    const result = await generateDurableArtwork({
      imageUrl: `data:${file.type};base64,${bytes.toString('base64')}`, workflow: 'photo-edit', promptTemplate: photoStyles[style].prompt,
    }, { designId, revision: 1 }, testMode ? {
      provider: new FakeImageProvider(),
      persist: async input => ({ productionAssetUrl: `https://storage.printme.ai/production/${designId}/r1.png`, storagePath: `production/${designId}/r1.png`, checksum: createHash('sha256').update(input.bytes).digest('hex') }),
    } : {});
    await trackServerCommerceEvent('preview_generated', { source: 'photo-edit', style, provider: testMode ? 'e2e-fake' : 'openai', model: result.model ?? 'unknown' });
    return NextResponse.json({ ...result, designId, ...(testMode ? { e2eImageInputChecksum: createHash('sha256').update(bytes).digest('hex') } : {}) });
  } catch (error) {
    if (error instanceof ImageProviderError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: 'Your artwork could not be generated and saved. Please try again.', code: 'ARTWORK_GENERATION_FAILED' }, { status: 503 });
  }
}
