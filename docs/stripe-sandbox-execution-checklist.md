# Stripe Sandbox Execution Checklist

Follow this checklist to perform a successful, controlled end-to-end sandbox revenue test for Stripe payments.

---

## 1. Setup Phase
- [ ] **Verify `.env.local` exists**: Ensure the file contains `STRIPE_SECRET_KEY` (starts with `sk_test_`) and `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
- [ ] **Start Stripe Webhook Forwarder**:
  - Run the following command in a separate terminal:
    ```bash
    stripe listen --forward-to localhost:3000/api/webhooks/stripe
    ```
  - Copy the webhook signing secret (starts with `whsec_...`) printed to the console.
- [ ] **Configure Webhook Secret**:
  - Add or update the signing secret in `.env.local`:
    ```ini
    STRIPE_WEBHOOK_SECRET=whsec_your_copied_secret
    ```
- [ ] **Start/Restart local dev server**:
  - Stop any existing Next.js dev server instances.
  - Start the dev server so it reads the updated `.env.local` credentials:
    ```bash
    npm run dev
    ```

---

## 2. Execution Phase
- [ ] **Cart Flow**:
  - Open `http://localhost:3000` in your browser.
  - Sign in or register a test user.
  - Upload a test design or choose an existing generated design.
  - Configure options, choose a product type (e.g. t-shirt), select a quantity, and click **Add to Cart**.
  - Navigate to the `/app/cart` page.
- [ ] **Checkout Flow**:
  - Verify cart item counts and pricing.
  - Click the **Checkout** or **Pay** button.
  - Verify you are redirected to the `checkout.stripe.com` test page.
- [ ] **Simulate Successful Purchase**:
  - Under **Email**, enter your test user's email.
  - Under **Shipping Address**, fill in valid test details:
    - Name: `Jane Doe`
    - Address line 1: `123 Sandbox Street`
    - City: `Austin`
    - State: `TX`
    - Postal code: `78701`
    - Country: `United States`
  - Under **Card details**, enter the standard Stripe test card:
    - Card number: `4242 4242 4242 4242`
    - Expiry date: any future date (e.g., `12/28`)
    - CVC: any 3-digit code (e.g., `123`)
  - Enter a test phone number.
  - Click **Pay**.

---

## 3. Verification Phase
- [ ] **Verify Redirect**:
  - Ensure Stripe redirects you back to the application success page (e.g. `/checkout/cs_test_...` or `/app/orders`).
  - Verify that your shopping cart has been cleared.
- [ ] **Verify Webhook Receipt**:
  - Check the Stripe CLI terminal output. Confirm `checkout.session.completed` was delivered (response status `200 OK`).
  - Check the Next.js dev server terminal logs. Ensure it printed:
    ```
    [Stripe Webhook] Received event: checkout.session.completed, ID: evt_...
    ```
- [ ] **Verify Order in Database**:
  - Open the Supabase SQL editor and query the `orders` table:
    ```sql
    SELECT id, user_id, status, stripe_session_id, total_amount, shipping_address, order_number 
    FROM orders 
    ORDER BY created_at DESC 
    LIMIT 1;
    ```
  - Verify that:
    - `stripe_session_id` matches the Stripe session ID from the redirect URL.
    - `status` is set to `pending_fulfillment` (or `needs_review` / `submitted_to_printify` depending on Printify environment settings).
    - `shipping_address` contains the name and address details entered on the Stripe page.
    - `order_number` starts with `PM-` followed by 6 random digits.
- [ ] **Verify Cents-to-Dollars Conversion**:
  - Compare the Stripe session amount paid with the `total_amount` in the database.
  - Verify that database `total_amount` matches the checkout total in standard dollar format (e.g. `29.99` in DB, not `2999`).
- [ ] **Verify Idempotency**:
  - Find the event ID (`evt_...`) from the Stripe CLI log or Stripe dashboard.
  - Send a duplicate event request manually using Stripe CLI:
    ```bash
    stripe events resend evt_your_event_id
    ```
  - Check the Next.js dev server console. Ensure it caught the duplicate event and printed the idempotency bypass message:
    ```
    [Stripe Webhook] Idempotency hit: Order already exists (ID: ...) for session: cs_test_...
    ```
  - Query the `orders` table again:
    ```sql
    SELECT count(*) FROM orders WHERE stripe_session_id = 'cs_test_your_session_id';
    ```
  - Confirm the count is exactly `1`.
