import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminOrOperationsAccess } from '@/lib/commerce/admin-auth';
import { deliverOrderConfirmation } from '@/lib/notifications/order-confirmation';

export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  if (!(await verifyAdminOrOperationsAccess(request)).authorized) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const parsed = z.string().uuid().safeParse((await context.params).orderId);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid order.' }, { status: 400 });
  try {
    const result = await deliverOrderConfirmation(parsed.data);
    return NextResponse.json({ success: result.success }, { status: result.success ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: 'Order confirmation remains pending; inspect outbox.' }, { status: 503 });
  }
}
