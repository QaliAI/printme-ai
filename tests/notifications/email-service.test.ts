import { describe, expect, it, beforeEach } from 'vitest';
import {
  FakeEmailTransport,
  HttpEmailTransport,
  TransactionalEmailService,
  escapeHtml,
  type OrderConfirmationEmailData,
  type OrderShippedEmailData,
} from '@/lib/notifications/email-service';

describe('TransactionalEmailService', () => {
  let transport: FakeEmailTransport;
  let service: TransactionalEmailService;

  beforeEach(() => {
    transport = new FakeEmailTransport();
    service = new TransactionalEmailService(transport);
  });

  it('formats and dispatches order confirmation email correctly with real items', async () => {
    const data: OrderConfirmationEmailData = {
      orderId: '00000000-0000-0000-0000-000000000001',
      orderNumber: 'PM-TEST-001',
      recipientEmail: 'customer@example.com',
      recipientName: 'Alice Smith',
      items: [
        {
          title: 'Everyday Tee (Boo Crew)',
          variantTitle: 'White / L',
          quantity: 2,
          unitPriceCents: 3400,
          artworkThumbnailUrl: 'https://printme.ai/thumb.png',
        },
        {
          title: 'Keepsake Mug (Here for the Boos)',
          variantTitle: '11oz White',
          quantity: 1,
          unitPriceCents: 1900,
        },
      ],
      subtotalCents: 8700,
      shippingCents: 500,
      taxCents: 450,
      totalCents: 9650,
      currency: 'USD',
      shippingAddress: {
        name: 'Alice Smith',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      },
      estimatedDelivery: '3–7 business days',
    };

    const result = await service.sendOrderConfirmation(data);

    expect(result.success).toBe(true);
    expect(result.idempotencyKey).toBe('order-confirmed-00000000-0000-0000-0000-000000000001');

    const sent = transport.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('customer@example.com');
    expect(sent[0].subject).toContain('PM-TEST-001');
    expect(sent[0].html).toContain('$96.50');
    expect(sent[0].html).toContain('Everyday Tee (Boo Crew)');
    expect(sent[0].html).toContain('Keepsake Mug (Here for the Boos)');
    expect(sent[0].html).toContain('123 Main St');
    expect(sent[0].text).toContain('Alice Smith');

    // Verify durable notification history logged
    const history = service.getNotificationLog('00000000-0000-0000-0000-000000000001');
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe('order_confirmed');
    expect(history[0].result.success).toBe(true);
  });

  it('escapes untrusted user input in email HTML (prevents XSS)', async () => {
    const maliciousName = '<script>alert("xss")</script>';
    const maliciousAddress = '<b onmouseover=alert(1)>Hack St</b>';
    const data: OrderConfirmationEmailData = {
      orderId: 'xss-test-order',
      orderNumber: 'PM-XSS-999',
      recipientEmail: 'victim@example.com',
      recipientName: maliciousName,
      items: [
        {
          title: 'Custom Tee <img src=x onerror=alert(1)>',
          variantTitle: 'Large & In Charge',
          quantity: 1,
          unitPriceCents: 3400,
        },
      ],
      subtotalCents: 3400,
      shippingCents: 499,
      taxCents: 0,
      totalCents: 3899,
      currency: 'USD',
      shippingAddress: {
        name: maliciousName,
        address1: maliciousAddress,
        city: 'SafeTown',
        postalCode: '12345',
        country: 'US',
      },
    };

    const result = await service.sendOrderConfirmation(data);
    expect(result.success).toBe(true);

    const sent = transport.getSentMessages();
    expect(sent[0].html).not.toContain('<script>');
    expect(sent[0].html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(sent[0].html).not.toContain('<b onmouseover=alert(1)>');
    expect(sent[0].html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(sent[0].html).toContain('Large &amp; In Charge');
  });

  it('does not invent fake shipping address details when address is absent (Defect C fix)', async () => {
    const data: OrderConfirmationEmailData = {
      orderId: 'no-addr-order',
      orderNumber: 'PM-NOADDR-1',
      recipientEmail: 'digital@example.com',
      recipientName: 'Digital Buyer',
      items: [{ title: 'Digital Asset Poster', quantity: 1, unitPriceCents: 2000 }],
      subtotalCents: 2000,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 2000,
      currency: 'USD',
      shippingAddress: null, // No shipping address
    };

    const result = await service.sendOrderConfirmation(data);
    expect(result.success).toBe(true);

    const sent = transport.getSentMessages();
    expect(sent[0].html).not.toContain('Order Address on File');
    expect(sent[0].html).not.toContain('city: US');
    expect(sent[0].html).not.toContain('Shipping To:');
  });

  it('enforces idempotency on duplicate order confirmation calls', async () => {
    const data: OrderConfirmationEmailData = {
      orderId: 'dup-order-123',
      orderNumber: 'PM-DUP-123',
      recipientEmail: 'bob@example.com',
      recipientName: 'Bob',
      items: [{ title: 'Mug', quantity: 1, unitPriceCents: 1900 }],
      subtotalCents: 1900,
      shippingCents: 700,
      taxCents: 0,
      totalCents: 2600,
      currency: 'USD',
      shippingAddress: {
        name: 'Bob',
        address1: '456 Oak St',
        city: 'Austin',
        postalCode: '78701',
        country: 'US',
      },
    };

    const first = await service.sendOrderConfirmation(data);
    const second = await service.sendOrderConfirmation(data);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.messageId).toContain('duplicate-cached');
    expect(transport.getSentMessages()).toHaveLength(1);
  });

  it('formats and dispatches order shipped notification with tracking link and items (Defect A fix)', async () => {
    const data: OrderShippedEmailData = {
      orderId: 'ship-123',
      orderNumber: 'PM-SHIP-123',
      recipientEmail: 'realbuyer@example.com', // Must be real buyer, not customer@printme.ai
      recipientName: 'Charlie Brown',
      carrier: 'USPS',
      trackingNumber: '9400100000000000000000',
      trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000',
      shippedItems: [
        { title: 'Everyday Tee (Boo Crew)', variantTitle: 'White / M', quantity: 2 },
      ],
      packageNumber: 1,
      totalPackages: 2,
    };

    const result = await service.sendOrderShipped(data);

    expect(result.success).toBe(true);
    const msg = transport.findByIdempotencyKey(result.idempotencyKey);
    expect(msg).toBeDefined();
    expect(msg?.to).toBe('realbuyer@example.com');
    expect(msg?.subject).toContain('PM-SHIP-123');
    expect(msg?.html).toContain('9400100000000000000000');
    expect(msg?.html).toContain('Package 1 of 2');
    expect(msg?.html).toContain('Everyday Tee (Boo Crew)');
    expect(msg?.html).toContain('Track Shipment');
    expect(msg?.html).toContain('USPS');
  });

  it('HttpEmailTransport fails with actionable error if RESEND_API_KEY is missing (Defect D fix)', async () => {
    const httpTransport = new HttpEmailTransport(''); // No API key configured
    const result = await httpTransport.send({
      idempotencyKey: 'test-key',
      type: 'order_confirmed',
      to: 'customer@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('CONFIGURATION_ERROR');
    expect(result.error).toContain('RESEND_API_KEY');
    // Ensure it NEVER reports simulated success
    expect(result.messageId).toBeUndefined();
  });

  it('escapeHtml helper handles null, undefined, and special characters', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('Hello & Welcome <world> "test" \'foo\'')).toBe(
      'Hello &amp; Welcome &lt;world&gt; &quot;test&quot; &#39;foo&#39;',
    );
  });

  it('sends order attention required notification', async () => {
    const result = await service.sendOrderAttentionRequired({
      orderId: 'att-123',
      orderNumber: 'PM-ATT-123',
      recipientEmail: 'dave@example.com',
      recipientName: 'Dave',
      issueDescription: 'High demand is causing a 2-day production queue delay.',
      merchantAlertDetails: 'Printify provider queue backlog exceeded 48h.',
    });

    expect(result.success).toBe(true);
    const sent = transport.getSentMessages();
    expect(sent[0].subject).toContain('Update Regarding Order PM-ATT-123');
    expect(sent[0].html).toContain('High demand');
  });

  it('sends order refund notification', async () => {
    const result = await service.sendOrderRefunded({
      orderId: 'ref-123',
      orderNumber: 'PM-REF-123',
      recipientEmail: 'eve@example.com',
      recipientName: 'Eve',
      refundAmountCents: 3400,
      currency: 'USD',
      reason: 'Customer requested size exchange',
    });

    expect(result.success).toBe(true);
    const sent = transport.getSentMessages();
    expect(sent[0].html).toContain('$34.00');
    expect(sent[0].html).toContain('Customer requested size exchange');
  });
});
