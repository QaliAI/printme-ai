# Local Integration Environment Setup

This guide details how to restore and configure the required environment variables in your `.env.local` file for testing.

---

## 1. Supabase Credentials
Retrieving database connection settings and API keys.

1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project: **PrintMe.ai**.
3. Navigate to **Project Settings** (gear icon) -> **API**.
4. Retrieve the following fields:
   - **Project URL**: Map to `NEXT_PUBLIC_SUPABASE_URL` (e.g., `https://xxxx.supabase.co`).
   - **`anon` `public` key**: Map to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **`service_role` key**: Map to `SUPABASE_SERVICE_ROLE_KEY` (Keep secure, only used server-side).

---

## 2. Stripe Test Mode Credentials
Setting up checkout payments and local webhook forwarding.

### Stripe API Keys
1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com).
2. Toggle the **Test mode** switch in the top-right corner.
3. Navigate to **Developers** -> **API keys**.
4. Retrieve the following keys:
   - **Secret key**: Starts with `sk_test_...`. Map to `STRIPE_SECRET_KEY`.

### Stripe CLI Webhook Secret (Local Development)
1. Ensure the Stripe CLI is installed (e.g., via `scoop install stripe-cli`, `brew install stripe`, or direct binary download).
2. Log in using the CLI:
   ```bash
   stripe login
   ```
3. Start forwarding webhook events to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret from the console output (starts with `whsec_...`).
5. Map this value to `STRIPE_WEBHOOK_SECRET` in your `.env.local` file.
6. **IMPORTANT**: Every time you restart Next.js or modify the `.env.local` file, restart the Next.js dev server (`npm run dev`) for env values to reload.

---

## 3. Printify API Credentials
Connecting to the Print-on-Demand supplier.

1. Log in to the [Printify Console](https://printify.com).
2. Click on the profile icon (top right) and navigate to **My Account** -> **Connections**.
3. Under the **Personal Access Tokens** section, click **Generate API token**.
4. Label it and copy the token. Map to `PRINTIFY_API_TOKEN`.
5. Retrieve your Shop ID:
   - Run the printify shop listing utility script:
     ```bash
     node scripts/printify-list-shops.mjs
     ```
   - Copy the numeric Shop ID for your sandbox store. Map to `PRINTIFY_SHOP_ID`.
6. Ensure safety rules are configured:
   - Set `PRINTIFY_AUTO_SUBMIT_LIVE_ORDERS=false`
   - Set `PRINTIFY_CREATE_DRAFT_IN_LIVE_MODE=false` (forces creation of draft orders in testing mode and skips live payments).

---

## 4. Cloudinary Credentials
Configuring image uploading and design asset hosting.

1. Log in to the [Cloudinary Console](https://cloudinary.com/console).
2. In the top-left Dashboard home view, locate your **Product Environment Credentials**:
   - **Cloud name**: Map to `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
   - **API Key**: Map to `CLOUDINARY_API_KEY`.
   - **API Secret**: Map to `CLOUDINARY_API_SECRET`.
3. In Cloudinary Settings -> **Upload** settings tab:
   - Scroll down to **Upload presets**.
   - Create or verify a preset named `printme_designs` (matching `CLOUDINARY_UPLOAD_PRESET`).
   - Mode should be set to **Unsigned** to allow client-side upload widgets to securely send images.

---

## 5. Vercel Env Pull (Alternative)
If you already configured these environment variables in your Vercel deployment:

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Link your local project to Vercel:
   ```bash
   vercel link
   ```
3. Pull the remote variables directly into your local environment:
   ```bash
   vercel env pull .env.local
   ```
4. Verify the pulled file does not contain production/live Stripe keys before proceeding to local tests.
