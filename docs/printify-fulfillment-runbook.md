# Printify Fulfillment Runbook

This document describes how to configure, test, and safely operate the PrintMe.ai Printify fulfillment integration.

---

## 1. Environment Configurations

Configure these keys in your `.env.local` to enable Printify fulfillment:

```bash
PRINTIFY_API_TOKEN=pr_...           # Printify API token (obtained from Printify Account Settings > Connections)
PRINTIFY_SHOP_ID=123456             # Printify Shop ID (can also be NEXT_PUBLIC_PRINTIFY_SHOP_ID)
PRINTIFY_WEBHOOK_SECRET=wh_...      # Optional: signature key for incoming Printify webhooks
```

---

## 2. Safety Rules and Configurations

To prevent accidental charges on your merchant account, the integration is designed with a conservative safety-first approach.

### Stripe Test Mode
- When checkout occurs in Stripe Test Mode (`livemode = false`), the system **always** creates the order as a **DRAFT** on Printify.
- Draft orders do not charge your credit card or go into production until you manually review and confirm them in the Printify dashboard.

### Stripe Live Mode
- In production (`livemode = true`), the submission behavior is governed by the following environment flags:

| `PRINTIFY_AUTO_SUBMIT_LIVE_ORDERS` | `PRINTIFY_CREATE_DRAFT_IN_LIVE_MODE` | Behavior |
| :--- | :--- | :--- |
| `true` | *(Any)* | **Auto-Submit**: Creates draft order and immediately confirms it (enters production, triggers merchant charge). |
| `false` / `undefined` | `true` | **Draft Only**: Creates a draft order on Printify. Manual review and confirmation in Printify dashboard is required to start production. |
| `false` / `undefined` | `false` / `undefined` | **Hold**: No Printify request is sent. The order is recorded internally with status `needs_review` and error message: `Manual review required`. |

---

## 3. Order Status Tracking and Mapping

Printify status updates received via incoming webhooks (`POST /api/webhooks/printify`) map to internal `orders.status` values:

| Printify Status | Internal Order Status | Description |
| :--- | :--- | :--- |
| `draft` | `pending_fulfillment` | Draft order created. |
| `confirmed` | `processing` | Paid, waiting to start production. |
| `production` | `processing` | Item is being printed. |
| `shipping` | `shipped` | Package left the facility (tracking number attached). |
| `delivered` | `delivered` | Package reached the customer. |
| `cancelled` | `cancelled` | Order was cancelled. |
| `failed` | `cancelled` | Order printing or dispatch failed. |

---

## 4. Verification and Testing

### Testing Draft Submissions locally:
1. Ensure `PRINTIFY_API_TOKEN` and `PRINTIFY_SHOP_ID` are configured in `.env.local`.
2. Follow the [Stripe Test Checkout Runbook](file:///c:/Users/omino/Documents/printme-ai-live/docs/stripe-test-checkout-runbook.md) to forward checkout webhook events.
3. Place a successful test payment with Stripe's test card `4242 4242 4242 4242`.
4. Inspect your local server log:
   `[Printify] Stripe Checkout Session is in test mode. Creating DRAFT order on Printify.`
5. Log into your Printify Merchant Dashboard and navigate to **Orders**. You should see a new draft order matching the test customer's name, design image, and product variant.
