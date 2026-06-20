# Stripe Test Checkout Runbook

This document describes how to test the end-to-end checkout and webhook flow on PrintMe.ai using Stripe's test environment.

---

## 1. Required Stripe Test Environment Variables

Add these variables to your `.env.local` file (never commit these to source control):

```bash
STRIPE_SECRET_KEY=sk_test_...         # Stripe Developer Dashboard API Key (Test Mode)
STRIPE_WEBHOOK_SECRET=whsec_...       # Webhook signing secret (obtained via Stripe CLI or dashboard)
```

---

## 2. Using the Stripe CLI to Forward Webhook Events

To test the webhook handler locally on your development machine, forward events using the Stripe CLI:

1. **Download and login** to the Stripe CLI:
   ```bash
   stripe login
   ```
2. **Listen and forward** events to your local API route:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
3. **Capture the webhook secret** printed in the console (e.g., `whsec_...`) and update your `.env.local`'s `STRIPE_WEBHOOK_SECRET`.
4. Restart your development server so the new environment variable is loaded.

---

## 3. Test Payment Details (Stripe Sandbox)

Use the following card numbers in Stripe checkout test mode:

| Card Number | Expiry Date | CVC | Postal Code | Expected Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **`4242 4242 4242 4242`** | Any future date | Any 3 digits | Any | **Success** (Standard 3DS Test Card) |
| **`4000 0000 0000 3022`** | Any future date | Any 3 digits | Any | **Declined** (insufficient funds) |

---

## 4. Expected Checkout and Webhook Flow

1. **Checkout Initialization**:
   - Initiating a checkout session calls `POST /api/checkout`.
   - The server validates that quantities and pricing calculations are finite, positive integers.
   - The user is redirected to the Stripe Checkout page.
   - The user fills out their payment details, phone number, and shipping address.
2. **Webhook Receipt**:
   - When the payment succeeds, Stripe sends a `checkout.session.completed` webhook event.
   - The endpoint constructs the event, verifies its signature, and logs:
     `[Stripe Webhook] Received event: checkout.session.completed, ID: evt_...`
3. **Idempotency Check**:
   - The handler queries the `orders` table to check if an order already exists with `stripe_session_id = session.id`.
   - If not found, it proceeds to create the order and line items.
4. **Fulfillment Integration**:
   - If shipping details (`name`, `email`, `address1`, `city`, `zip`, `country_code`) are valid, a draft order is submitted to Printify.
   - The cart is cleared, and a status update is logged.

---

## 5. Duplicate Webhook Retry (Idempotency Testing)

To verify database-backed idempotency and ensure duplicate webhook requests do not result in duplicate orders:

1. **Trigger a duplicate webhook**:
   Use the Stripe CLI to resend a previously completed checkout session event:
   ```bash
   stripe events resend evt_XXXXXXXXXXXXXX
   ```
   *(Replace `evt_XXXXXXXXXXXXXX` with the event ID from your console logs or Stripe dashboard).*
2. **Verify console output**:
   You should see the idempotency warning in the server logs:
   `[Stripe Webhook] Idempotency hit: Order already exists (ID: ...) for session: cs_test_...`
3. **Verify database status**:
   Ensure only one record exists in the `orders` table matching that specific `stripe_session_id`.
