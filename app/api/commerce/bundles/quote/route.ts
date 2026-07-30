import { NextResponse } from 'next/server';
import {
  bundleQuoteRequestSchema,
  calculateBundleQuote,
} from '@/lib/commerce/bundle-pricing';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';

export async function POST(request: Request) {
  const parsed = bundleQuoteRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid bundle quote request.' },
      { status: 400 },
    );
  }
  return NextResponse.json(
    calculateBundleQuote(parsed.data, getApprovedMerchProducts()),
  );
}
