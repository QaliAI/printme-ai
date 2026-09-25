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
  shippingAddress?: ShippingAddressSummary | null;
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
  shippedItems: Array<{ title: string; variantTitle?: string; quantity: number }>;
  packageNumber?: number;
  totalPackages?: number;
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
  replyTo?: string;
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

export interface EmailNotificationLogEntry {
  idempotencyKey: string;
  orderId: string;
  type: NotificationType;
  recipientEmail: string;
  result: EmailSendResult;
  createdAt: string;
}

export interface EmailTransport {
  send(message: TransactionalEmailMessage): Promise<EmailSendResult>;
}

/**
 * Escapes untrusted text for safe HTML embedding.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
 * Production HTTPS Email transport using Resend.
 * In production/preview environments, missing configuration returns an actionable failure,
 * never a simulated success.
 */
export class HttpEmailTransport implements EmailTransport {
  constructor(
    private apiKey: string = process.env.RESEND_API_KEY || '',
    private defaultFrom: string = process.env.TRANSACTIONAL_FROM_EMAIL || 'PrintMe Orders <orders@printme.ai>',
    private defaultReplyTo: string = process.env.SUPPORT_EMAIL || 'support@printme.ai',
  ) {}

  async send(message: TransactionalEmailMessage): Promise<EmailSendResult> {
    if (!this.apiKey) {
      const errorMsg = 'CONFIGURATION_ERROR: RESEND_API_KEY is not configured in environment.';
      console.error(
        `[EmailService] ${errorMsg} Cannot deliver email ${message.idempotencyKey} to ${message.to}.`,
      );
      return {
        success: false,
        error: errorMsg,
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
          reply_to: message.replyTo || this.defaultReplyTo,
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

      const data = (await response.json()) as { id?: string };
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
  private log: EmailNotificationLogEntry[] = [];

  constructor(private transport: EmailTransport) {}

  setTransport(transport: EmailTransport) {
    this.transport = transport;
  }

  getTransport(): EmailTransport {
    return this.transport;
  }

  getNotificationLog(orderId?: string): EmailNotificationLogEntry[] {
    if (orderId) {
      return this.log.filter((entry) => entry.orderId === orderId);
    }
    return [...this.log];
  }

  private recordLog(
    orderId: string,
    type: NotificationType,
    recipientEmail: string,
    result: EmailSendResult,
  ) {
    this.log.push({
      idempotencyKey: result.idempotencyKey,
      orderId,
      type,
      recipientEmail,
      result,
      createdAt: result.timestamp,
    });
  }

  /**
   * 1. Payment Accepted / Order Confirmed
   */
  async sendOrderConfirmation(
    data: OrderConfirmationEmailData,
  ): Promise<EmailSendResult> {
    const idempotencyKey = `order-confirmed-${data.orderId}`;
    const escapedName = escapeHtml(data.recipientName);
    const escapedOrderNumber = escapeHtml(data.orderNumber);

    const itemsHtml = data.items
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px 0;">
            ${item.artworkThumbnailUrl ? `<img src="${escapeHtml(item.artworkThumbnailUrl)}" alt="${escapeHtml(item.title)}" width="48" height="48" style="vertical-align:middle;margin-right:12px;border-radius:4px;border:1px solid #e5e5e5;object-fit:cover;" />` : ''}
            <strong>${escapeHtml(item.title)}</strong>${item.variantTitle ? ` <span style="color:#666;">(${escapeHtml(item.variantTitle)})</span>` : ''}
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

    let addressHtml = '';
    let addressText = '';
    if (data.shippingAddress && data.shippingAddress.address1) {
      const addr = data.shippingAddress;
      addressHtml = `
        <div style="background:#f9f9f9; padding:16px; border-radius:6px; margin-bottom:24px;">
          <h4 style="margin:0 0 8px 0; font-size:14px;">Shipping To:</h4>
          <p style="margin:0; font-size:14px; color:#444;">
            ${escapeHtml(addr.name || data.recipientName)}<br>
            ${escapeHtml(addr.address1)}${addr.address2 ? `<br>${escapeHtml(addr.address2)}` : ''}<br>
            ${escapeHtml(addr.city)}${addr.state ? `, ${escapeHtml(addr.state)}` : ''} ${escapeHtml(addr.postalCode)}<br>
            ${escapeHtml(addr.country)}
          </p>
        </div>`;
      addressText = `\nSHIPPING ADDRESS:\n${addr.name || data.recipientName}\n${addr.address1} ${addr.address2 || ''}\n${addr.city}, ${addr.state || ''} ${addr.postalCode}\n${addr.country}\n`;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">PRINTME.AI</h1>
          <p style="color: #666; margin-top: 4px;">Thank you for your order, ${escapedName}!</p>
        </div>

        <div style="background: #fafafa; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #666;">Order Number</p>
          <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 700; color: #111;">${escapedOrderNumber}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Estimated Delivery: ${escapeHtml(data.estimatedDelivery || '5–10 business days')}</p>
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

        ${addressHtml}

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
${addressText}
Estimated Delivery: ${data.estimatedDelivery || '5–10 business days'}

Need help? Contact support@printme.ai
    `.trim();

    const result = await this.transport.send({
      idempotencyKey,
      type: 'order_confirmed',
      to: data.recipientEmail,
      subject: `Order Confirmed: ${data.orderNumber} - PrintMe.ai`,
      html,
      text,
      metadata: { orderId: data.orderId, orderNumber: data.orderNumber },
    });

    this.recordLog(data.orderId, 'order_confirmed', data.recipientEmail, result);
    return result;
  }

  /**
   * 2. Shipment Created with Tracking Link (supports multi-package shipments)
   */
  async sendOrderShipped(data: OrderShippedEmailData): Promise<EmailSendResult> {
    const idempotencyKey = `order-shipped-${data.orderId}-${data.trackingNumber}`;
    const escapedName = escapeHtml(data.recipientName);
    const escapedOrderNumber = escapeHtml(data.orderNumber);
    const escapedCarrier = escapeHtml(data.carrier);
    const escapedTracking = escapeHtml(data.trackingNumber);

    const packageNote =
      data.totalPackages && data.totalPackages > 1
        ? ` (Package ${data.packageNumber || 1} of ${data.totalPackages})`
        : '';

    const itemsHtml = data.shippedItems
      .map(
        (it) =>
          `<li><strong>${escapeHtml(it.title)}</strong>${it.variantTitle ? ` (${escapeHtml(it.variantTitle)})` : ''} × ${it.quantity}</li>`,
      )
      .join('');

    const itemsText = data.shippedItems
      .map(
        (it) =>
          `- ${it.title}${it.variantTitle ? ` (${it.variantTitle})` : ''} x ${it.quantity}`,
      )
      .join('\n');

    const trackingButton = data.trackingUrl
      ? `<div style="text-align: center; margin: 24px 0;">
           <a href="${escapeHtml(data.trackingUrl)}" style="background: #111; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Track Shipment</a>
         </div>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">PRINTME.AI</h1>
          <p style="color: #666; margin-top: 4px;">Your order is on the way${escapeHtml(packageNote)}!</p>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 18px;">Shipment Details</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Order:</strong> ${escapedOrderNumber}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Carrier:</strong> ${escapedCarrier}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Tracking Number:</strong> ${escapedTracking}</p>
        </div>

        ${trackingButton}

        <div style="margin-bottom: 24px;">
          <h4 style="font-size: 14px; margin-bottom: 8px;">Items in this shipment:</h4>
          <ul style="padding-left: 20px; font-size: 14px; color: #444;">
            ${itemsHtml}
          </ul>
        </div>

        <footer style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #888;">
          <p>Questions? Contact <a href="mailto:support@printme.ai" style="color:#111;">support@printme.ai</a></p>
          <p>PrintMe.ai · Made to order with archival quality.</p>
        </footer>
      </body>
      </html>
    `;

    const text = `
PRINTME.AI - ORDER SHIPPED
Order: ${data.orderNumber}
Hello ${data.recipientName}, your order is on the way${packageNote}!

Carrier: ${data.carrier}
Tracking Number: ${data.trackingNumber}
${data.trackingUrl ? `Tracking Link: ${data.trackingUrl}` : ''}

Items in this shipment:
${itemsText}

Questions? Contact support@printme.ai
    `.trim();

    const result = await this.transport.send({
      idempotencyKey,
      type: 'order_shipped',
      to: data.recipientEmail,
      subject: `Your PrintMe.ai Order Has Shipped (${data.orderNumber})`,
      html,
      text,
      metadata: {
        orderId: data.orderId,
        trackingNumber: data.trackingNumber,
        carrier: data.carrier,
      },
    });

    this.recordLog(data.orderId, 'order_shipped', data.recipientEmail, result);
    return result;
  }

  /**
   * 3. Attention Required (Delays, Address issues, Quality holds)
   */
  async sendOrderAttentionRequired(
    data: OrderAttentionEmailData,
  ): Promise<EmailSendResult> {
    const idempotencyKey = `order-attention-${data.orderId}-${Date.now()}`;
    const escapedName = escapeHtml(data.recipientName);
    const escapedOrderNumber = escapeHtml(data.orderNumber);
    const escapedIssue = escapeHtml(data.issueDescription);

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 16px 0;">PRINTME.AI</h1>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 8px 0; color: #92400e; font-size: 16px;">Notice Regarding Order ${escapedOrderNumber}</h2>
          <p style="margin: 0; font-size: 14px; color: #78350f;">Hello ${escapedName},</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #78350f;">${escapedIssue}</p>
        </div>
        <p style="font-size: 14px; color: #444;">Our concierge team is monitoring this closely. If we need any additional details, please reply directly to this email or contact us at <a href="mailto:support@printme.ai">support@printme.ai</a>.</p>
        <footer style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; font-size: 12px; color: #888;">
          PrintMe.ai Support Concierge
        </footer>
      </body>
      </html>
    `;

    const text = `
PRINTME.AI - ORDER UPDATE
Notice regarding order ${data.orderNumber}
Hello ${data.recipientName},

${data.issueDescription}

If you have questions, reply to this email or contact support@printme.ai.
    `.trim();

    const result = await this.transport.send({
      idempotencyKey,
      type: 'order_attention_required',
      to: data.recipientEmail,
      subject: `Update Regarding Order ${data.orderNumber} - PrintMe.ai`,
      html,
      text,
      metadata: { orderId: data.orderId },
    });

    this.recordLog(data.orderId, 'order_attention_required', data.recipientEmail, result);
    return result;
  }

  /**
   * 4. Order Refunded
   */
  async sendOrderRefunded(data: OrderRefundedEmailData): Promise<EmailSendResult> {
    const idempotencyKey = `order-refunded-${data.orderId}-${data.refundAmountCents}`;
    const escapedName = escapeHtml(data.recipientName);
    const escapedOrderNumber = escapeHtml(data.orderNumber);
    const escapedReason = data.reason ? escapeHtml(data.reason) : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 16px 0;">PRINTME.AI</h1>
        <div style="background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 8px 0; font-size: 16px;">Refund Confirmation</h2>
          <p style="margin: 0; font-size: 14px;">Hello ${escapedName},</p>
          <p style="margin: 8px 0 0 0; font-size: 14px;">A refund of <strong>${formatCents(data.refundAmountCents, data.currency)}</strong> has been processed for order <strong>${escapedOrderNumber}</strong>.</p>
          ${escapedReason ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Reason: ${escapedReason}</p>` : ''}
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #888;">Funds typically appear on your payment method within 3–5 business days.</p>
        </div>
        <footer style="margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; font-size: 12px; color: #888;">
          Questions? Contact <a href="mailto:support@printme.ai">support@printme.ai</a>
        </footer>
      </body>
      </html>
    `;

    const text = `
PRINTME.AI - REFUND CONFIRMATION
Hello ${data.recipientName},
A refund of ${formatCents(data.refundAmountCents, data.currency)} has been processed for order ${data.orderNumber}.
${data.reason ? `Reason: ${data.reason}\n` : ''}
Funds typically appear on your original payment method in 3–5 business days.

Questions? Contact support@printme.ai
    `.trim();

    const result = await this.transport.send({
      idempotencyKey,
      type: 'order_refunded',
      to: data.recipientEmail,
      subject: `Refund Processed for Order ${data.orderNumber} - PrintMe.ai`,
      html,
      text,
      metadata: { orderId: data.orderId, amount: data.refundAmountCents },
    });

    this.recordLog(data.orderId, 'order_refunded', data.recipientEmail, result);
    return result;
  }
}

/**
 * Returns the configured default transport.
 * FakeEmailTransport runs ONLY in explicit test environments.
 * HttpEmailTransport runs in production and staging, producing an actionable error
 * if credentials are missing.
 */
export function getDefaultEmailTransport(): EmailTransport {
  if (process.env.NODE_ENV === 'test' || process.env.EMAIL_TRANSPORT === 'fake') {
    return new FakeEmailTransport();
  }
  return new HttpEmailTransport();
}

let emailServiceInstance: TransactionalEmailService | null = null;

export function getTransactionalEmailService(): TransactionalEmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new TransactionalEmailService(getDefaultEmailTransport());
  }
  return emailServiceInstance;
}

export function resetTransactionalEmailService(): void {
  emailServiceInstance = null;
}
