// Printify API Client
// Documentation: https://developers.printify.com/

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

export interface PrintifyClientConfig {
  apiToken: string;
  shopId: string;
}

export class PrintifyClient {
  private apiToken: string;
  private shopId: string;

  constructor(config: PrintifyClientConfig) {
    this.apiToken = config.apiToken;
    this.shopId = config.shopId;

    if (!this.apiToken || !this.shopId) {
      console.warn('Printify API token or shop ID not configured. Printify integration will be unavailable.');
    }
  }

  private async request(method: string, endpoint: string, body?: any) {
    if (!this.apiToken || !this.shopId) {
      throw new Error('Printify not configured. Set PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID.');
    }

    const response = await fetch(`${PRINTIFY_API_BASE}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Printify API error: ${error.errors?.[0]?.message || response.statusText}`);
    }

    return response.json();
  }

  // Get shop info
  async getShop() {
    return this.request('GET', `/shops/${this.shopId}`);
  }

  // Get catalog products (filtered)
  async getProducts(limit = 100, offset = 0) {
    return this.request('GET', `/catalog/products?limit=${limit}&offset=${offset}`);
  }

  // Get specific product details
  async getProduct(blueprintId: string) {
    return this.request('GET', `/catalog/blueprints/${blueprintId}`);
  }

  // Get product variants
  async getProductVariants(blueprintId: string) {
    return this.request('GET', `/catalog/blueprints/${blueprintId}/variants`);
  }

  // Create and submit a complete order
  async submitOrder(order: any) {
    // Create draft order first
    const draftOrder = await this.request('POST', `/shops/${this.shopId}/orders`, order);

    // Then confirm/submit it for production
    if (draftOrder?.id) {
      await this.request('POST', `/shops/${this.shopId}/orders/${draftOrder.id}/confirm`);
    }

    return draftOrder;
  }

  // Create a draft order (unpublished)
  async createDraftOrder(order: any) {
    // This creates an order in draft state before payment confirmation
    return this.request('POST', `/shops/${this.shopId}/orders`, order);
  }

  // Confirm order for production
  async confirmOrder(orderId: string) {
    return this.request('POST', `/shops/${this.shopId}/orders/${orderId}/confirm`);
  }

  // Get order status
  async getOrderStatus(orderId: string) {
    return this.request('GET', `/shops/${this.shopId}/orders/${orderId}`);
  }

  // Cancel order
  async cancelOrder(orderId: string) {
    return this.request('DELETE', `/shops/${this.shopId}/orders/${orderId}`);
  }

  // Get shipping options
  async getShippingOptions(orderId: string) {
    // TODO: Implement shipping calculation
    return this.request('GET', `/shops/${this.shopId}/orders/${orderId}/shipping`);
  }
}

// Shop ID supports both naming conventions for backward compatibility
const getShopId = () =>
  process.env.NEXT_PUBLIC_PRINTIFY_SHOP_ID ||
  process.env.PRINTIFY_SHOP_ID ||
  '';

export function getPrintifyClient(): PrintifyClient {
  return new PrintifyClient({
    apiToken: process.env.PRINTIFY_API_TOKEN || '',
    shopId: getShopId(),
  });
}

export const printifyClient = new PrintifyClient({
  apiToken: process.env.PRINTIFY_API_TOKEN || '',
  shopId: getShopId(),
});
