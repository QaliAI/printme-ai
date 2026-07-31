# Local Sandbox Revenue Test

This is the master checklist for manually verifying the end-to-end payment and fulfillment flow on a local sandbox setup. Follow these steps in order.

---

## Phase 1: Environment & Schema Configuration

- [ ] **1. Restore `.env.local`**:
  - Configure all credentials in `.env.local` following the [Local Environment Setup Guide](file:///c:/Users/omino/Documents/printme-ai-live/docs/local-env-setup.md).
- [ ] **2. Run preflight checks**:
  - Run the preflight validation command in your console:
    ```bash
    npm run preflight
    ```
  - Verify that the output returns `PREFLIGHT SUCCESS: All required P0 integrations are ready!`.
- [ ] **3. Apply Supabase Migrations**:
  - Open the Supabase SQL editor and execute the migrations sequentially as described in the [Supabase Migration Apply Checklist](file:///c:/Users/omino/Documents/printme-ai-live/docs/supabase-migration-apply-checklist.md).
  - Run the verification queries to ensure RLS policies, tables, constraints, and indexes exist.
- [ ] **4. Build the Project**:
  - Compile the Next.js application to check for any static compilation errors:
    ```bash
    npm run build
    ```
- [ ] **5. Start Local Dev Server**:
  - Start the Next.js development server:
    ```bash
    npm run dev
    ```

---

## Phase 2: Stripe & Hook Connection

- [ ] **6. Run Stripe CLI Webhook Forwarding**:
  - In a new terminal, launch the Stripe event forwarder:
    ```bash
    stripe listen --forward-to localhost:3000/api/webhooks/stripe
    ```
  - Copy the webhook signing secret (`whsec_...`) printed to your console.
- [ ] **7. Update Webhook Secret and Restart Server**:
  - Add or update `STRIPE_WEBHOOK_SECRET=whsec_...` in `.env.local`.
  - Restart the Next.js development server (`npm run dev`) so the new webhook signing secret is active.

---

## Phase 3: E2E Checkout Flow Execution

- [ ] **8. Create or Login Test User**:
  - Open `http://localhost:3000` in your web browser.
  - Register a new test account or log in as an existing user.
- [ ] **9. Upload Test Image**:
  - Navigate to the upload flow (`/app/create/upload`).
  - Upload a test photo (verify it complies with file type restrictions: JPEG/PNG only, under 10MB).
- [ ] **10. Generate and Select Design**:
  - Generate styles for your uploaded photo.
  - Select one generated design.
- [ ] **11. Configure Product and Add to Cart**:
  - Choose a product type (e.g. Canvas, T-Shirt) and select options.
  - Add the item to your cart.
- [ ] **12. Update Quantity in Cart**:
  - Navigate to the shopping cart page (`/app/cart`).
  - Update the quantity (e.g., set to `2` to confirm quantity calculations are correctly handled).
  - Verify the subtotal updates accurately.
- [ ] **13. Start Stripe Test Checkout**:
  - Click the checkout button.
  - Verify you are redirected to the Stripe Checkout domain (`checkout.stripe.com`).
- [ ] **14. Complete Payment with Test Card**:
  - Enter your test user's email.
  - Fill in shipping information (Name: `Jane Doe`, Address: `123 Sandbox Street`, City: `Austin`, State: `TX`, ZIP: `78701`, Country: `US`).
  - Use Stripe test card `4242 4242 4242 4242`.
  - Click **Pay** and wait for payment confirmation.
- [ ] **15. Confirm Success Page & Redirect**:
  - Ensure you are redirected back to the app success page (e.g. `/checkout/cs_test_...` or `/app/orders`).

---

## Phase 4: Backend & Fulfillment Verification

- [ ] **16. Confirm Webhook Logs**:
  - Inspect the Next.js dev server terminal console.
  - Ensure the webhook handler logs `[Stripe Webhook] Received event: checkout.session.completed, ID: evt_...`.
- [ ] **17. Confirm Order Row Created Exactly Once**:
  - Query the database to verify the order is present:
    ```sql
    SELECT id, status, stripe_session_id, total_amount, order_number 
    FROM orders 
    WHERE stripe_session_id = 'cs_test_your_session_id';
    ```
  - Verify that exactly one row was created and that the total matches the payment amount in dollars.
- [ ] **18. Confirm Shipping Details Stored**:
  - Query the order's shipping column to confirm details were preserved:
    ```sql
    SELECT shipping_address FROM orders WHERE stripe_session_id = 'cs_test_your_session_id';
    ```
- [ ] **19. Confirm Printify Draft Order Behavior**:
  - Log into your [Printify Dashboard](https://printify.com).
  - Click on **Orders**.
  - Verify that a new order has been created in **Draft** state matching the design image, product, quantity, and shipping address.
- [ ] **20. Confirm Admin Order Page Status & Error Display**:
  - Log in to the administrator portal at `http://localhost:3000/admin/orders`.
  - Confirm the order is listed with its status (`pending_fulfillment` or similar) and contains the Stripe session ID and Printify order ID.
- [ ] **21. Confirm Cart Clears**:
  - Navigate back to `/app/cart` or `/app` and verify the cart count is `0`.
- [ ] **22. Confirm Event Rows Created**:
  - Query the analytics events table in Supabase to confirm that checkout and order creation actions were tracked:
    ```sql
    SELECT event_name, properties FROM analytics_events ORDER BY created_at DESC LIMIT 5;
    ```
  - Confirm events such as `checkout_started`, `payment_completed`, and `order_created` are present.
- [ ] **23. Confirm No Secrets Logged**:
  - Inspect all terminal outputs and the `properties` json of `analytics_events`.
  - Confirm no credentials, Stripe secret keys, client tokens, or credit card details were printed to console or written to database logs (verify sensitive values show up as `[REDACTED]`).
