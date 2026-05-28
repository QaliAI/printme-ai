interface PrintifyProduct {
  id: string;
  title: string;
}

interface PrintifyVariant {
  id: string;
  title: string;
}

interface PrintifyOrderItem {
  product_id: string;
  variant_ids: string[];
  quantity: number;
  files: Array<{
    type: 'front' | 'back' | 'label';
    url: string;
    position?: string;
  }>;
}

interface PrintifyOrderInput {
  recipient: {
    name: string;
    email: string;
    phone: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    country_code: string;
  };
  line_items: PrintifyOrderItem[];
}

interface PrintifyOrder {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

class PrintifyClient {
  private apiKey: string;
  private shopId: string;
  private baseUrl = 'https://api.printful.com';

  constructor() {
    this.apiKey = process.env.PRINTIFY_API_TOKEN || '';
    this.shopId = process.env.NEXT_PUBLIC_PRINTIFY_SHOP_ID || '';
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    body?: Record<string, any>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Printful-Shop-Id': this.shopId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Printify API error: ${error.message || 'Unknown error'}`);
    }

    return response.json();
  }

  async submitOrder(order: PrintifyOrderInput): Promise<PrintifyOrder> {
    if (!this.apiKey || !this.shopId) {
      throw new Error('Printify API credentials not configured');
    }

    const response = await this.makeRequest<{ result: PrintifyOrder }>(
      'POST',
      `/shops/${this.shopId}/orders`,
      {
        recipient: order.recipient,
        line_items: order.line_items,
        shipping_type: 'STANDARD',
        production_delay: 0,
      }
    );

    return response.result;
  }

  async getOrderStatus(orderId: string): Promise<PrintifyOrder> {
    if (!this.apiKey || !this.shopId) {
      throw new Error('Printify API credentials not configured');
    }

    const response = await this.makeRequest<{ result: PrintifyOrder }>(
      'GET',
      `/shops/${this.shopId}/orders/${orderId}`
    );

    return response.result;
  }

  async getShippingOptions(
    items: PrintifyOrderItem[]
  ): Promise<Array<{ id: string; name: string; price: number }>> {
    if (!this.apiKey || !this.shopId) {
      throw new Error('Printify API credentials not configured');
    }

    const response = await this.makeRequest<{
      result: Array<{ id: string; name: string; rate: number }>;
    }>(
      'POST',
      `/shops/${this.shopId}/shipping/rates`,
      {
        line_items: items,
        address: {
          country_code: 'US',
        },
      }
    );

    return response.result.map((rate) => ({
      id: rate.id,
      name: rate.name,
      price: Math.round(rate.rate * 100),
    }));
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.apiKey || !this.shopId) {
      throw new Error('Printify API credentials not configured');
    }

    try {
      await this.makeRequest('DELETE', `/shops/${this.shopId}/orders/${orderId}`);
      return true;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }
}

export const printifyClient = new PrintifyClient();
export type { PrintifyOrderInput, PrintifyOrder };
