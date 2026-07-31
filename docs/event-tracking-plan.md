# Marketing & Analytics Event Tracking Plan

This tracking plan defines the event measurement foundation for PrintMe.ai, including database schemas, backend event triggers, privacy filters, and marketing roadmap.

---

## 1. Database Schema (`analytics_events`)

Funnel events are stored in a dedicated Supabase table to capture server-side conversions accurately:

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Nullable for anonymous traffic
  anonymous_id TEXT,                                          -- Browser cookie / device identifier
  event_name TEXT NOT NULL,                                   -- e.g., 'checkout_started'
  properties JSONB DEFAULT '{}'::jsonb,                       -- Event attributes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Tracked E-commerce Funnel Events

The backend tracks the following core events along the purchase funnel:

### 1. `checkout_started`
- **Trigger**: User requests a Stripe Checkout Session via `POST /api/checkout`.
- **Properties**: `cartId`, `sessionId`, `itemsCount`.

### 2. `payment_completed`
- **Trigger**: Webhook receiver verifies a valid Stripe `checkout.session.completed` event.
- **Properties**: `sessionId`, `amountTotal` (cents), `customerEmail` (redacted/masked).

### 3. `order_created`
- **Trigger**: Internal database order row is successfully created.
- **Properties**: `orderId`, `orderNumber`, `totalAmount`, `status`, `stripeSessionId`.

### 4. `order_needs_review`
- **Trigger**: Webhook flow halts auto-fulfillment due to missing shipping fields or safety holds.
- **Properties**: `orderId`, `orderNumber`, `errorMessage` (listing missing fields).

### 5. `order_submitted_to_printify`
- **Trigger**: Draft or confirmed order is successfully submitted to Printify.
- **Properties**: `orderId`, `orderNumber`, `printifyOrderId`, `isLive`, `autoSubmitted`.

### 6. `printify_submission_failed`
- **Trigger**: Printify API rejects the payload or times out.
- **Properties**: `orderId`, `orderNumber`, `errorMessage` (non-sensitive API reject reason).

---

## 3. Data Privacy and Security Guidelines

To maintain strict security and compliance (PCI-DSS and GDPR):
- **Raw Card Details**: Never logged or stored. The utility script in `lib/analytics.ts` automatically runs a key check and redacts any properties containing `card`, `cvc`, `cvv`, `number`, `pin`, `secret`, `key`, `password`, or `token`.
- **Private Image URLs**: Raw customer face uploads are stored in the private `user-uploads` bucket and accessed using short-lived signed URLs. Public URLs are only generated for final styled design assets that are pushed to production print queues.

---

## 4. Integration Roadmap (Phase 2 & 3)

### Meta and TikTok Pixels (Client-Side)
- Once the storefront is live, add client-side event listeners for browser events (`PageView`, `AddToCart`, `InitiateCheckout`, `Purchase`) mapping anonymous identifiers to server-side events using Meta Conversions API (CAPI) for maximized attribution accuracy.

### Klaviyo & Lifecycle Marketing (Server-Side)
- **Cart Abandonment**: Send an event to Klaviyo if a cart remains active with no checkout activity after 4 hours.
- **Order Confirmation**: Trigger purchase notification emails upon `order_created`.
- **Fulfillment Updates**: Wire Printify shipment webhooks to trigger tracking notification emails inside Klaviyo automatically.
