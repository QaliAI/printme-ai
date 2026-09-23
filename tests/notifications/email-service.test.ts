import { describe, expect, it, beforeEach } from 'vitest';
import {
  FakeEmailTransport,
  TransactionalEmailService,
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

  it('formats and dispatches order confirmation email correctly', async () => {
    const data: OrderConfirmationEmailData = {
      orderId: '00000000-0000-0000-0000-000000000001',
      orderNumber: 'PM-TEST-001',
      recipientEmail: 'customer@example.com',
      recipientName: 'Alice Smith',
      items: [
        {
          title: 'Everyday Tee',
          variantTitle: 'White / L',
          quantity: 2,
          unitPriceCents: 3400,
          artworkThumbnailUrl: 'https://printme.ai/thumb.png',
        },
      ],
      subtotalCents: 6800,
      shippingCents: 500,
      taxCents: 450,
      totalCents: 7750,
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
    expect(sent[0].html).toContain('$77.50');
    expect(sent[0].html).toContain('123 Main St');
    expect(sent[0].text).toContain('Alice Smith');
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

  it('formats and dispatches order shipped notification with tracking link', async () => {
    const data: OrderShippedEmailData = {
      orderId: 'ship-123',
      orderNumber: 'PM-SHIP-123',
      recipientEmail: 'charlie@example.com',
      recipientName: 'Charlie',
      carrier: 'USPS',
      trackingNumber: '9400100000000000000000',
      trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000',
      shippedItems: [{ title: 'Gallery Poster', quantity: 1 }],
    };

    const result = await service.sendOrderShipped(data);

    expect(result.success).toBe(true);
    const msg = transport.findByIdempotencyKey(result.idempotencyKey);
    expect(msg).toBeDefined();
    expect(msg?.subject).toContain('PM-SHIP-123');
    expect(msg?.html).toContain('9400100000000000000000');
    expect(msg?.html).toContain('Track Shipment');
    expect(msg?.html).toContain('USPS');
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
