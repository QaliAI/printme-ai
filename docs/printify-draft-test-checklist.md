# Printify Draft Verification Checklist

Follow this checklist to verify the Printify print-on-demand fulfillment integration using sandbox settings.

---

## 1. Credentials and Configuration Setup
- [ ] **Check Environment Variables**:
  - Open `.env.local` and check that `PRINTIFY_API_TOKEN` and `PRINTIFY_SHOP_ID` (or `NEXT_PUBLIC_PRINTIFY_SHOP_ID`) are set.
  - Verify that `PRINTIFY_AUTO_SUBMIT_LIVE_ORDERS` is set to `false`.
  - Verify that `PRINTIFY_CREATE_DRAFT_IN_LIVE_MODE` is set to `false` or `true` depending on live test goals (keep as `false` to block live orders completely).
- [ ] **Run Connectivity Test**:
  - Execute the test connection script to verify your credentials:
    ```bash
    node scripts/test-printify.mjs
    ```
  - Verify that the output confirms your token is valid and matches your configured shop.
- [ ] **List Available Shops**:
  - Run the shop listing utility script to verify the name of the store you are connecting to:
    ```bash
    node scripts/printify-list-shops.mjs
    ```
  - Confirm the Shop ID matches your configuration.

---

## 2. Test Draft Order Verification (Sandbox Run)
- [ ] **Ensure Stripe Test Mode is Active**:
  - Ensure the Stripe webhook event is generated in **Test Mode** (`livemode = false` in the event payload).
- [ ] **Complete Test Checkout**:
  - Run a checkout sandbox transaction using the Stripe test card `4242 4242 4242 4242`.
- [ ] **Monitor webhook console logs**:
  - Verify the server outputs:
    ```
    [Printify] Stripe Checkout Session is in test mode. Creating DRAFT order on Printify.
    ```
- [ ] **Inspect Printify Dashboard**:
  - Log into the [Printify Console](https://printify.com) and navigate to **Orders**.
  - Verify a new order has appeared.
  - Check that its status in Printify is **Draft**.
  - Confirm the customer shipping address (e.g. `123 Sandbox Street`) and line items match.

---

## 3. Verify Live Mode Safety & fallbacks
- [ ] **Verify Live Mode Needs Review Behavior**:
  - Mock a Stripe webhook where `livemode = true` but `PRINTIFY_AUTO_SUBMIT_LIVE_ORDERS=false` and `PRINTIFY_CREATE_DRAFT_IN_LIVE_MODE=false`.
  - Ensure the order status in the database is created as `needs_review`.
  - Check that the `error_message` column contains:
    ```
    Manual review required: Live order auto-submission and draft creation are disabled.
    ```
  - Confirm that **no** request was sent to Printify (no draft or confirmed order was created on your account).
- [ ] **Verify Invalid Address/Payload fallback**:
  - Perform a transaction with missing required address fields (e.g. missing postal code) or missing product IDs.
  - Verify that the webhook handler catches the missing data and creates the order internally as `needs_review` with a detailed validation message (e.g. `Fulfillment blocked: Missing shipping details: postal_code`).
  - Confirm that no Printify request is sent for this order, protecting the system from API payload crashes.
