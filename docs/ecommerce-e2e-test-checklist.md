# E-commerce End-to-End Sandbox Test Checklist

Follow this checklist to verify the end-to-end user purchase and fulfillment integration for PrintMe.ai.

---

### [ ] Step 1: Preflight Verification
- Run `npm run preflight` to confirm that all P0 integrations (`STRIPE_SECRET_KEY`, `PRINTIFY_API_TOKEN`, etc.) are configured.
- Start the local development server: `npm run dev`.
- Start Stripe CLI webhook forwarding in another console:
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Update `STRIPE_WEBHOOK_SECRET` in `.env.local` with the CLI output key.

### [ ] Step 2: Create a Test User
- Go to `/auth/signup` on your local environment.
- Create a new account with a test email (e.g. `sandbox-buyer@example.com`) and secure password.
- Confirm successful redirection to the main dashboard `/app`.

### [ ] Step 3: Upload a Test Photo
- Navigate to `/app/create/upload` (via Choose Style step).
- Select a test photo (JPEG or PNG under 10MB).
- Click **✨ Generate My Design** to start upload.
- Confirm that the photo is uploaded, cached, and redirects to `/app/create/preview`.

### [ ] Step 4: Select a Product & Build a Cart
- Navigate to product selection `/app/create/products`.
- Select a test product variant (e.g., Canvas, Mug) with valid base price and modifiers.
- Set quantity to `2` (to verify quantity mapping).
- Click **Add to Cart**.
- Confirm redirection to `/app/cart` and that the items are listed with correct quantities and totals.

### [ ] Step 5: Start Stripe Checkout
- Click **Proceed to Checkout** in the cart page.
- Verify server logs show:
  `[Stripe Checkout] Initiating session creation for user: ...`
- Confirm redirect to the official Stripe Checkout sandbox page.

### [ ] Step 6: Complete Stripe Test Payment
- Enter standard Stripe test card numbers:
  - Card: `4242 4242 4242 4242`
  - Exp: Any future date (e.g. `12/30`)
  - CVC: `123`
- Fill out shipping address fields (be sure to provide name, email, line1, city, zip, and country).
- Click **Pay**.

### [ ] Step 7: Confirm Checkout Redirection & Success Page
- Verify Stripe redirects you back to `/checkout/{CHECKOUT_SESSION_ID}`.
- Verify that a loading state is displayed while polling, followed by a **✅ Order Confirmed!** message.
- Verify the displayed total matches the cart total.

### [ ] Step 8: Confirm Webhook & Order Creation
- Check your local development server console logs. Verify that:
  - `[Stripe Webhook] Received event: checkout.session.completed` is logged.
  - `[Stripe Webhook] Order created successfully (ID: ...)` is logged.
  - `[Analytics] Event recorded: "order_created"` is logged.
- Open Supabase SQL Editor and query:
  `SELECT id, total_amount, status, stripe_session_id FROM orders WHERE stripe_session_id = 'cs_test_...';`
- Confirm exactly one order row is returned.

### [ ] Step 9: Verify Webhook Idempotency
- Trigger a duplicate webhook retry event via Stripe CLI:
  `stripe events resend evt_XXXXXXXXXXXXXX`
  *(Replace with the actual event ID from Stripe CLI logs)*
- Verify local dev server console logs show:
  `[Stripe Webhook] Idempotency hit: Order already exists (ID: ...) for session: cs_test_...`
- Query the database to confirm no duplicate order was created.

### [ ] Step 10: Confirm Shipping Validation and Printify Draft Creation
- In the Supabase database, verify the shipping address was stored.
- Confirm that Printify draft order was created in your Printify Merchant Dashboard under **Orders**.
- If shipping validation failed due to missing fields, confirm:
  - Order status is set to `needs_review`.
  - `error_message` contains details of the missing fields.
  - No draft order was submitted to Printify.
  - Server logged: `[Stripe Webhook] Skipping Printify submission. Reason: ...`

### [ ] Step 11: Confirm Cart Cleared
- Return to `/app/cart` or click **Back to Cart**.
- Confirm that your cart is now empty.

### [ ] Step 12: Confirm User & Admin Order Dashboards
- Navigate to `/app/orders` as the buyer. Confirm that the order is listed with correct total and status.
- Sign in as an administrator and go to `/admin/orders`.
- Confirm the order is visible with:
  - Unique Order number (`PM-xxxxxx`)
  - Stripe Session ID & Printify Order ID
  - Error messages (if fulfillment failed or was blocked)
  - Created & Updated timestamps.

### [ ] Step 13: Verify Logging Security
- Inspect console and database logs.
- Confirm **no credit card numbers, Stripe secret keys, or customer passwords** are printed or saved in database `properties` fields.
