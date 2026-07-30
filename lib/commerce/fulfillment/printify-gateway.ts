import 'server-only';

import { getPrintifyClient } from '@/lib/printify/client';
import type { PrintifyProductionGateway } from './service';

export class PrintifyProductionGatewayAdapter
  implements PrintifyProductionGateway
{
  async sendOrderToProduction(printifyOrderId: string) {
    await getPrintifyClient().sendOrderToProduction(printifyOrderId);
  }
}
