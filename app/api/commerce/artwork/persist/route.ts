import { type NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { persistArtwork } from '@/lib/commerce/artwork-storage';
import { isCommerceE2ERequest } from '@/lib/commerce/testing/e2e-harness';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const designId = form.get('designId');
    const revision = Number(form.get('revision') || 1);
    if (!(file instanceof Blob) || !file.size || typeof designId !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(designId) || !Number.isSafeInteger(revision) || revision < 1) {
      return NextResponse.json({ error: 'A file, design ID, and valid revision are required.' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File exceeds 10 MB.' }, { status: 413 });
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return NextResponse.json({ error: 'JPEG, PNG, or WebP required.' }, { status: 415 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (isCommerceE2ERequest(request)) {
      const checksum = createHash('sha256').update(bytes).digest('hex');
      const storagePath = `production/${designId}/r${revision}-${checksum.slice(0, 12)}.png`;
      return NextResponse.json({ productionAssetUrl: `https://storage.printme.ai/${storagePath}`, storagePath, checksum });
    }
    return NextResponse.json(await persistArtwork({ bytes, mimeType: file.type, designId, revision }));
  } catch {
    return NextResponse.json({ error: 'Your artwork could not be saved. Please try again.', code: 'STORAGE_UPLOAD_FAILED' }, { status: 503 });
  }
}
