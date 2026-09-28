import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Legacy checkout is deprecated and decommissioned. Please use /api/commerce/checkout.',
      code: 'LEGACY_CHECKOUT_DEPRECATED',
      redirectUrl: '/shop-v2',
    },
    { status: 410 }
  );
}

export async function GET(request: Request) {
  const url = new URL('/shop-v2', request.url);
  return NextResponse.redirect(url, 308);
}
