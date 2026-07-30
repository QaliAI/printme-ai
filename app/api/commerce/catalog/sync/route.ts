import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getCuratedCatalogService } from '@/lib/commerce/catalog/catalog-service';

function hasSyncAccess(request: NextRequest) {
  const expected = process.env.COMMERCE_CATALOG_SYNC_SECRET;
  const supplied = request.headers.get('x-commerce-sync-secret');
  if (!expected || !supplied) return false;

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

export async function POST(request: NextRequest) {
  if (!process.env.COMMERCE_CATALOG_SYNC_SECRET) {
    return NextResponse.json(
      { error: 'Catalog sync is not configured.' },
      { status: 503 },
    );
  }
  if (!hasSyncAccess(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  try {
    const report = await getCuratedCatalogService().dryRunSync();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Catalog dry-run failed.',
        code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      },
      { status: 502 },
    );
  }
}
