import { createHash, randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStudioActor } from '@/lib/studio/auth';
import { sanitizeStudioSvg } from '@/lib/studio/types';
import {
  isStudioE2ERequest,
  storeStudioE2EAsset,
} from '@/lib/studio/testing/e2e-harness';

const MAX_STUDIO_ASSET_BYTES = 20 * 1024 * 1024;
const acceptedTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

export async function POST(request: NextRequest) {
  const actor = await getStudioActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get('file');
  const role = form.get('role');
  const width = Number(form.get('width'));
  const height = Number(form.get('height'));
  const altText = String(form.get('altText') ?? '').trim();
  const hasTransparency = form.get('hasTransparency') === 'true';
  if (
    !(file instanceof File) ||
    !['original', 'display', 'thumbnail', 'production'].includes(
      String(role),
    ) ||
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0 ||
    !altText
  ) {
    return NextResponse.json(
      { error: 'Invalid Studio asset metadata.' },
      { status: 400 },
    );
  }
  if (
    !acceptedTypes.has(file.type) ||
    file.size > MAX_STUDIO_ASSET_BYTES
  ) {
    return NextResponse.json(
      { error: 'Use a PNG, JPEG, WebP, or sanitized SVG up to 20 MB.' },
      { status: 400 },
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === 'image/svg+xml') {
    try {
      sanitizeStudioSvg(new TextDecoder().decode(bytes));
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'SVG validation failed.',
        },
        { status: 400 },
      );
    }
  }
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const extension =
    file.type === 'image/jpeg'
      ? 'jpg'
      : file.type === 'image/svg+xml'
        ? 'svg'
        : file.type.split('/')[1];
  const id = `studio-asset-${randomUUID()}`;
  const storagePath = `${new Date().getUTCFullYear()}/${id}-${role}.${extension}`;
  if (isStudioE2ERequest(request)) {
    const stored = storeStudioE2EAsset({
      bytes,
      contentType: file.type,
    });
    return NextResponse.json({
      asset: {
        ...stored,
        role,
        altText,
        width,
        height,
        mimeType: file.type,
        fileSizeBytes: file.size,
        hasTransparency,
      },
    });
  }
  const bucket = getSupabaseAdminClient().storage.from(
    'studio-design-assets',
  );
  const { error } = await bucket.upload(storagePath, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json(
      {
        error:
          'Studio storage is unavailable. Create the studio-design-assets bucket in staging.',
      },
      { status: 503 },
    );
  }
  const { data } = bucket.getPublicUrl(storagePath);
  return NextResponse.json({
    asset: {
      id,
      role,
      stableUrl: data.publicUrl,
      storagePath,
      checksum,
      altText,
      width,
      height,
      mimeType: file.type,
      fileSizeBytes: file.size,
      hasTransparency,
    },
  });
}
