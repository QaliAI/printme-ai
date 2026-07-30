import { type NextRequest, NextResponse } from 'next/server';
import {
  getCommerceE2ESession,
  getE2EStatus,
  isCommerceE2ERequest,
} from '@/lib/commerce/testing/e2e-harness';

export async function GET(request: NextRequest) {
  if (!isCommerceE2ERequest(request)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  return NextResponse.json(
    getE2EStatus(
      getCommerceE2ESession(request),
      request.nextUrl.searchParams.get('session_id') ?? undefined,
    ),
  );
}
