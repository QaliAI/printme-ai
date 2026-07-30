import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export function hasCommerceOperationsAccess(request: NextRequest) {
  const expected = process.env.COMMERCE_OPERATIONS_SECRET;
  const supplied = request.headers.get('x-commerce-operations-secret');
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}
