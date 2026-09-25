import { type NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { isCommerceE2ERequest } from '@/lib/commerce/testing/e2e-harness';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit (matches user-uploads bucket)
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const designId = formData.get('designId') as string | null;
    const revision = Number(formData.get('revision') || 1);

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'File is required.', code: 'FILE_REQUIRED' },
        { status: 400 },
      );
    }

    if (!designId) {
      return NextResponse.json(
        { error: 'Design ID is required.', code: 'DESIGN_ID_REQUIRED' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 10MB limit.', code: 'FILE_TOO_LARGE' },
        { status: 413 },
      );
    }

    const mimeType = file.type || 'image/png';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: 'Unsupported file type. JPEG, PNG, or WebP required.',
          code: 'INVALID_FILE_TYPE',
        },
        { status: 415 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const checksum = createHash('sha256').update(buffer).digest('hex');

    if (isCommerceE2ERequest(request)) {
      return NextResponse.json({
        productionAssetUrl: `https://storage.printme.ai/production/${encodeURIComponent(designId)}/r${revision}-${checksum.slice(0, 12)}.png`,
        storagePath: `production/${designId}/r${revision}-${checksum.slice(0, 12)}.png`,
        checksum,
      });
    }

    const ext =
      mimeType === 'image/jpeg'
        ? 'jpg'
        : mimeType === 'image/webp'
          ? 'webp'
          : 'png';
    const storagePath = `production/${designId}/r${revision}-${checksum.slice(0, 12)}.${ext}`;

    const supabase = getSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to upload production artwork:', uploadError);
      return NextResponse.json(
        {
          error: 'Failed to persist production artwork.',
          code: 'STORAGE_UPLOAD_FAILED',
        },
        { status: 500 },
      );
    }

    // Create 1-year signed URL for fulfillment
    const { data: signedData, error: signError } = await supabase.storage
      .from('user-uploads')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (signError || !signedData?.signedUrl) {
      console.error('Failed to create signed URL:', signError);
      return NextResponse.json(
        {
          error: 'Failed to create durable artwork URL.',
          code: 'SIGNED_URL_FAILED',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      productionAssetUrl: signedData.signedUrl,
      storagePath,
      checksum,
    });
  } catch (error) {
    console.error('Artwork persist error:', error);
    return NextResponse.json(
      { error: 'Failed to process artwork persistence request.' },
      { status: 500 },
    );
  }
}
