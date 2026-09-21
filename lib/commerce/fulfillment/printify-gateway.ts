import 'server-only';
import { getPrintifyClient } from '@/lib/printify/client';
import {
  buildPrintifyFulfillmentPayload,
  type FulfillmentOrder,
} from './payload';
import type {
  PrintifyDraftGateway,
  PrintifyDraftOrderResult,
  PrintifyProductionGateway,
} from './service';

export class PrintifyProductionGatewayAdapter
  implements PrintifyProductionGateway
{
  async sendOrderToProduction(printifyOrderId: string) {
    await getPrintifyClient().sendOrderToProduction(printifyOrderId);
  }
}

export class PrintifyDraftGatewayAdapter implements PrintifyDraftGateway {
  async createDraftOrder(order: FulfillmentOrder): Promise<PrintifyDraftOrderResult> {
    const payload = buildPrintifyFulfillmentPayload(order);
    const shopId = process.env.PRINTIFY_SHOP_ID;
    const token = process.env.PRINTIFY_API_TOKEN;
    if (!shopId || !token) {
      throw new Error('Printify credentials missing for draft creation.');
    }
    const response = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/orders.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'PrintMe.ai/1.0 (+https://printme.ai)',
        },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Printify draft order creation failed (${response.status}): ${errorText}`,
      );
    }
    const data = (await response.json()) as {
      id: string;
      line_items?: Array<{ product_id?: string }>;
    };
    return {
      printifyOrderId: data.id,
      printifyProductId: data.line_items?.[0]?.product_id,
    };
  }
}
