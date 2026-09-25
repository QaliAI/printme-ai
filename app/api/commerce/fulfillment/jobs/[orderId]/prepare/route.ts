import { type NextRequest, NextResponse } from 'next/server';
import { PrintifyFulfillmentService } from '@/lib/commerce/fulfillment/service';
import { SupabaseFulfillmentStore } from '@/lib/commerce/fulfillment/supabase-store';
import {
  PrintifyDraftGatewayAdapter,
  PrintifyProductionGatewayAdapter,
} from '@/lib/commerce/fulfillment/printify-gateway';
import { hasCommerceOperationsAccess } from '@/lib/commerce/operations-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  if (!hasCommerceOperationsAccess(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  try {
    const { orderId } = await context.params;
    const job = await new PrintifyFulfillmentService(
      new SupabaseFulfillmentStore(),
      new PrintifyProductionGatewayAdapter(),
      new PrintifyDraftGatewayAdapter(),
    ).prepare(orderId);
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fulfillment preparation failed.',
        code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      },
      { status: 409 },
    );
  }
}
