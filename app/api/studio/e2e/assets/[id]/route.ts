import { NextResponse, type NextRequest } from 'next/server';
import {
  getStudioE2EAsset,
  isStudioE2ERequest,
} from '@/lib/studio/testing/e2e-harness';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isStudioE2ERequest(request)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  const asset = getStudioE2EAsset((await params).id);
  if (!asset) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(asset.bytes), {
    headers: {
      'content-type': asset.contentType,
      'cache-control': 'no-store',
    },
  });
}
