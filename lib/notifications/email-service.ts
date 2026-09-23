import 'server-only';

export type NotificationType =
  | 'order_confirmed'
  | 'order_attention_required'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_refunded';

export interface OrderEmailItem {
  title: string;
  variantTitle?: string;
  quantity: number;
  unitPriceCents: number;
  artworkThumbnailUrl?: string;
}

export interface ShippingAddressSummary {
  name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
}

export interface OrderConfirmationEmailData {
  orderId: string;
  orderNumber: string;
  recipientEmail: string;
  recipientName: string;
  items: OrderEmailItem[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  shippingAddress: ShippingAddressSummary;
  estimatedDelivery?: string;
}

export interface OrderShippedEmailData {
  orderId: string;
  orderNumber: string;
  recipientEmail: string;
  recipientName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  shippedItems: Array<{ title: string; quantity: number }>;
}

export interface OrderAttentionEmailData {
  orderId: string;
  orderNumber: string;
  recipientEmail: string;
  recipientName: string;
  issueDescription: string;
  merchantAlertDetails?: string;
}

export interface OrderRefundedEmailData {
  orderId: string;
  orderNumber: string;
  recipientEmail: string;
  recipientName: string;
  refundAmountCents: number;
  currency: string;
  reason?: string;
}

export interface TransactionalEmailMessage {
  idempotencyKey: string;
  type: NotificationType;
  to: string;
  from?: string;
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  idempotencyKey: string;
  error?: string;
  timestamp: string;
}

export interface EmailTransport {
  send(message: TransactionalEmailMessage): Promise<EmailSendResult>;
}

/**
 * In-memory deterministic fake email transport for testing and local development.
 */
export class FakeEmailTransport implements EmailTransport {
  private sentMessages: Map<string, TransactionalEmailMessage> = new Map();
  private deliveryHistory: EmailSendResult[] = [];

  async send(message: TransactionalEmailMessage): Promise<EmailSendResult> {
    if (this.sentMessages.has(message.idempotencyKey)) {
      return {
        success: true,
        messageId: `duplicate-cached-${message.idempotencyKey}`,
        idempotencyKey: message.idempotencyKey,
        timestamp: new Date().toISOString(),
      };
    }

    this.sentMessages.set(message.idempotencyKey, message);
    const result: EmailSendResult = {
      success: true,
      messageId: `fake-msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      idempotencyKey: message.idempotencyKey,
      timestamp: new Date().toISOString(),
    };
    this.deliveryHistory.push(result);
    return result;
  }

  getSentMessages(): TransactionalEmailMessage[] {
    return Array.from(this.sentMessages.values());
  }

  findByRecipient(email: string): TransactionalEmailMessage[] {
    return Array.from(this.sentMessages.values()).filter((m) => m.to === email);
  }

  findByIdempotencyKey(key: string): TransactionalEmailMessage | undefined {
    return this.sentMessages.get(key);
  }

  clear(): void {
    this.sentMessages.clear();
    this.deliveryHistory = [];
  }
}

/**
 * Production HTTPS Email transport (e.g. Resend or custom SMTP proxy).
 */
export class HttpEmailTransport implements EmailTransport {
  constructor(
    private apiKey: string = process.env.RESEND_API_KEY || '',
    private defaultFrom: string = process.env.TRANSACTIONAL_FROM_EMAIL || 'PrintMe Orders <orders@printme.ai>',
  ) {}

  async send(message: TransactionalEmailMessage): Promise<EmailSendResult> {
    if (!this.apiKey) {
      console.warn(
        `[EmailService] No RESEND_API_KEY configured. Skipping live delivery for ${message.idempotencyKey} to ${message.to}.`,
      );
      return {
        success: true,
        messageId: `simulated-no-key-${Date.now()}`,
        idempotencyKey: message.idempotencyKey,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'PrintMe.ai Transactional Service',
        },
        body: JSON.stringify({
          from: message.from || this.defaultFrom,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: {
            'X-Entity-Ref-ID': message.idempotencyKey,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errText}`,
          idempotencyKey: message.idempotencyKey,
          timestamp: new Date().toISOString(),
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.id || `resend-${Date.now()}`,
        idempotencyKey: message.idempotencyKey,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        idempotencyKey: message.idempotencyKey,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

function formatCents(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export class TransactionalEmailService {
  constructor(private transport: EmailTransport) {}

  setTransport(transport: EmailTransport) {
    this.transport = transport;
  }

  getTransport(): EmailTransport {
    return this.transport;
  }

  /**
   * 1. Payment Accepted / Order Confirmed
   */
  async sendOrderConfirmation(
    data: OrderConfirmationEmailData,
  ): Promise<EmailSendResult> {
    const idempotencyKey = `order-confirmed-${data.orderId}`;
    const itemsHtml = data.items
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px 0;">
            ${item.artworkThumbnailUrl ? `<img src="${item.artworkThumbnailUrl}" alt="${item.title}" width="48" height="48" style="vertical-align:middle;margin-right:12px;border-radius:4px;border:1px solid #e5e5e5;object-fit:cover;" />` : ''}
            <strong>${item.title}</strong>${item.variantTitle ? ` <span style="color:#666;">(${item.variantTitle})</span>` : ''}
          </td>
          <td style="padding: 12px 0; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 0; text-align: right;">${formatCents(item.unitPriceCents * item.quantity, data.currency)}</td>
        </tr>`,
      )
      .join('');

    const itemsText = data.items
      .map(
        (item) =>
          `- ${item.title} ${item.variantTitle ? `(${item.variantTitle}) ` : ''}x${item.quantity}: ${formatCents(item.unitPriceCents * item.quantity, data.currency)}`,
      )
      .join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">PRINTME.AI</h1>
          <p style="color: #666; margin-top: 4px;">Thank you for your order!</p>
        </div>

        <div style="background: #fafafa; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #666;">Order Number</p>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 700; color: #111;">${data.orderNumber}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Estimated Delivery: ${data.estimatedDelivery || '5–10 business days'}</p>
        </div>

        <h3 style="font-size: 16px; margin-bottom: 8px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="border-bottom: 2px solid #ddd; text-align: left; font-size: 13px; color: #777;">
              <th style="padding-bottom: 8px;">Item</th>
              <th style="padding-bottom: 8px; text-align: center;">Qty</th>
              <th style="padding-bottom: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="border-top: 2px solid #111; padding-top: 12px; margin-bottom: 24px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Subtotal:</span> <span>${formatCents(data.subtotalCents, data.currency)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Shipping:</span> <span>${formatCents(data.shippingCents, data.currency)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Tax:</span> <span>${formatCents(data.taxCents, data.currency)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:700; font-size:18px; margin-top:8px;">
            <span>Order Total:</span> <span>${formatCents(data.totalCents, data.currency)}</span>
          </div>
        </div>

        <div style="background:#f9f9f9; padding:16px; border-radius:6px; margin-bottom:24px;">
          <h4 style="margin:0 0 8px 0; font-size:14px;">Shipping To:</h4>
          <p style="margin:0; font-size:14px; color:#444;">
            ${data.shippingAddress.name}<br>
            ${data.shippingAddress.address1}${data.shippingAddress.address2 ? `<br>${data.shippingAddress.address2}` : ''}<br>
            ${data.shippingAddress.city}, ${data.shippingAddress.state || ''} ${data.shippingAddress.postalCode}<br>
            ${data.shippingAddress.country}
          </p>
        </div>

        <footer style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #888;">
          <p>Questions about your order? Contact <a href="mailto:support@printme.ai" style="color:#111;">support@printme.ai</a></p>
          <p>PrintMe.ai · Made to order with archival quality.</p>
        </footer>
      </body>
      </html>
    `;

    const text = `
PRINTME.AI - ORDER CONFIRMATION
Order Number: ${data.orderNumber}
Thank you for your order, ${data.recipientName}!

ITEMS:
${itemsText}

Subtotal: ${formatCents(data.subtotalCents, data.currency)}
Shipping: ${formatCents(data.shippingCents, data.currency)}
Tax: ${formatCents(data.taxCents, data.currency)}
Total: ${formatCents(data.totalCents, data.currency)}

SHIPPING ADDRESS:
${data.shippingAddress.name}
${data.shippingAddress.address1} ${data.shippingAddress.address2 || ''}
${data.shippingAddress.city}, ${data.shippingAddress.state || ''} ${data.shippingAddress.postalCode}
${data.shippingAddress.country}

Estimated Delivery: ${data.estimatedDelivery || '5–10 business days'}

Need help? Contact support@printme.ai
    `.trim();

    return this.transport.send({
      idempotencyKey,
      type: 'order_confirmed',
      to: data.recipientEmail,
      subject: `Order Confirmed: ${data.orderNumber} - PrintMe.ai`,
      html,
      text,
      metadata: { orderId: data.orderId, orderNumber: data.orderNumber },
    });
  }

  /**
   * 2. Order Shipped with Carrier and Verified Tracking
   */
  async sendOrderShipped(data: OrderShippedEmailData): Promise<EmailSendResult> {
    const idempotencyKey = `order-shipped-${data.orderId}-${data.trackingNumber}`;
    const trackingLink =
      data.trackingUrl ||
      `https://www.google.com/search?q=${encodeURIComponent(`${data.carrier} tracking ${data.trackingNumber}`)}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 800; margin: 0;">PRINTME.AI</h1>
          <p style="color: #666; margin-top: 4px;">Your order has shipped!</p>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #166534;">Carrier: <strong>${data.carrier}</strong></p>
          <p style="margin: 8px 0; font-size: 18px; font-weight: 700; color: #14532d;">Tracking #: ${data.trackingNumber}</p>
          <div style="margin-top: 16px;">
            <a href="${trackingLink}" style="background:#16a34a; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600; display:inline-block;">Track Shipment</a>
          </div>
        </div>

        <p>Order <strong>${data.orderNumber}</strong> is on its way. Items in this package:</p>
        <ul>
          ${data.shippedItems.map((item) => `<li>${item.title} (x${item.quantity})</li>`).join('')}
        </ul>

        <footer style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #888; margin-top: 32px;">
          <p>Questions? Contact <a href="mailto:support@printme.ai" style="color:#111;">support@printme.ai</a></p>
        </footer>
      </body>
      </html>
    `;

    const text = `
PRINTME.AI - ORDER SHIPPED
Order Number: ${data.orderNumber}
Carrier: ${data.carrier}
Tracking Number: ${data.trackingNumber}
Tracking Link: ${trackingLink}

Items in shipment:
${data.shippedItems.map((i) => `- ${i.title} (x${i.quantity})`).join('\n')}

Support: support@printme.ai
    `.trim();

    return this.transport.send({
      idempotencyKey,
      type: 'order_shipped',
      to: data.recipientEmail,
      subject: `Your PrintMe Order Has Shipped: ${data.orderNumber}`,
      html,
      text,
      metadata: {
        orderId: data.orderId,
        carrier: data.carrier,
        trackingNumber: data.trackingNumber,
      },
    });
  }

  /**
   * 3. Order Attention Required (Delays or Production Review)
   */
  async sendOrderAttentionRequired(
    data: OrderAttentionEmailData,
  ): Promise<EmailSendResult> {
    const idempotencyKey = `order-attention-${data.orderId}-${Date.now()}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 0;">PRINTME.AI</h1>
        <div style="background:#fefce8; border:1px solid #fef08a; padding:16px; border-radius:6px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600; color: #854d0e;">Notice Regarding Order ${data.orderNumber}</p>
          <p style="margin: 8px 0 0 0; color: #713f12;">${data.issueDescription}</p>
        </div>
        <p>Our production team is reviewing your order to guarantee the highest print standard. We will update you as soon as production advances.</p>
        <p>If you need assistance, reply to this email or reach us at <a href="mailto:support@printme.ai">support@printme.ai</a>.</p>
      </body>
      </html>
    `;

    const text = `
PRINTME.AI - ORDER UPDATE
Order: ${data.orderNumber}
Notice: ${data.issueDescription}
Our team is reviewing your order. Contact support@printme.ai for questions.
    `.trim();

    return this.transport.send({
      idempotencyKey,
      type: 'order_attention_required',
      to: data.recipientEmail,
      subject: `Update Regarding Order ${data.orderNumber} - PrintMe.ai`,
      html,
      text,
      metadata: { orderId: data.orderId, alert: data.merchantAlertDetails },
    });
  }

  /**
   * 4. Refund or Cancellation Notice
   */
  async sendOrderRefunded(data: OrderRefundedEmailData): Promise<EmailSendResult> {
    const idempotencyKey = `order-refunded-${data.orderId}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 0;">PRINTME.AI</h1>
        <p>A refund of <strong>${formatCents(data.refundAmountCents, data.currency)}</strong> has been processed for Order <strong>${data.orderNumber}</strong>.</p>
        ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
        <p>Refunds typically appear on your original payment method in 3–5 business days.</p>
        <footer style="margin-top: 24px; font-size: 12px; color: #888;">
          <p>Questions? Contact support@printme.ai</p>
        </footer>
      </body>
      </html>
    `;

    const text = `
PRINTME.AI - REFUND CONFIRMATION
Order: ${data.orderNumber}
A refund of ${formatCents(data.refundAmountCents, data.currency)} has been issued.
Support: support@printme.ai
    `.trim();

    return this.transport.send({
      idempotencyKey,
      type: 'order_refunded',
      to: data.recipientEmail,
      subject: `Refund Processed for Order ${data.orderNumber} - PrintMe.ai`,
      html,
      text,
      metadata: { orderId: data.orderId, amount: data.refundAmountCents },
    });
  }
}

// Global singleton instance
const defaultTransport: EmailTransport =
  process.env.NODE_ENV === 'test' || !process.env.RESEND_API_KEY
    ? new FakeEmailTransport()
    : new HttpEmailTransport();

let emailServiceInstance: TransactionalEmailService | null = null;

export function getTransactionalEmailService(): TransactionalEmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new TransactionalEmailService(defaultTransport);
  }
  return emailServiceInstance;
}
