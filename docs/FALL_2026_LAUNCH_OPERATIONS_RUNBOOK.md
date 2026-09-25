# PrintMe.ai — Fall 2026 Launch & Operations Runbook

**Target Launch Date**: September 21, 2026  
**Active Release Branch**: `launch/fall-2026-storefront`  
**Application Environment**: Next.js App Router, Supabase (`vfgbvnfhvjmkmfmianpb`), Stripe, Printify  

---

## 1. Executive Summary

This runbook documents the engineering and product preparations completed during the **Fall 2026 Launch & Revenue Readiness Sprint** for PrintMe.ai. 

The primary objective was to transition PrintMe.ai from an experimental prototype into a revenue-ready, high-converting e-commerce storefront capable of accepting real customer orders with zero payment or fulfillment risk.

### Core Achievements
1. **Curated Fall 2026 Merchandise Collection**: Designed and deployed 9 exclusive autumn designs spanning 3 festive collections (Halloween, Cozy Fall, Thanksgiving), complete with 300 DPI master print assets (3600×3600px PNG + SVG + WebP) and anchored retail pricing ($19 Mug, $29 Poster, $34 Tee).
2. **Fixed Fulfillment & Shipping Quote Engine**: Resolved multiple packaging calculation bugs in `lib/commerce/shipping-quote.ts`, ensuring blueprint-distinct items are correctly categorized and quoted. Real-time shipping and delivery estimates are now displayed directly in the cart drawer.
3. **Durable Artwork Persistence**: Replaced ephemeral browser-only blob URLs with `/api/commerce/artwork/persist`, storing user and catalog assets permanently with 1-year signed URLs in Supabase Storage (`user-uploads`), eliminating "blob missing at fulfillment" errors.
4. **Synchronized Cart UX & Clean Navigation**: Implemented a reactive cart badge (`data-testid="cart-badge-count"`) in the global navigation, cross-synced via `printme:cart-updated` events across `/create` and `/shop-v2`. Deprecated legacy routes (`/cart` redirects to `/shop-v2`; `/api/checkout` returns HTTP 410 with redirection instructions).
5. **Strict Pre-Launch Financial Safeguards**: Identified that the connected Stripe account (`acct_1RbMYvHtgFDu5mMB`) is currently registered as "Rubix AI" with statement descriptor `RUBINJAMES.COM`. Live charges remain gated until merchant approval and descriptor rebranding.
6. **Consolidated Supabase Migration Bundle**: Compiled migrations 002 through 009 into an idempotent, verified SQL bundle (`docs/MIGRATIONS_002_TO_009_BUNDLE.sql`) ready for single-click execution in the Supabase SQL Editor.

---

## 2. Merchandised Fall 2026 Collection

All 9 designs have been created, vectorized, rendered into print-ready raster assets, and registered in `lib/commerce/fixtures.ts` and `lib/commerce/designs/seed.ts`.

### 2.1 Collection Catalog Matrix

| Collection | Design Title | Slug | Primary Product | Palette / Style | Print Dimensions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Halloween** | *Boo Crew* | `boo-crew` | Everyday Tee (White) | Midnight Black & Neon Tangerine | 3600×3600px (300 DPI) |
| **Halloween** | *Here for the Boos* | `here-for-the-boos` | Keepsake Mug (White 11oz) | Espresso, Cream & Phantom Glow | 3600×3600px (300 DPI) |
| **Halloween** | *Little Pumpkin* | `little-pumpkin` | Gallery Poster (18×24") | Heritage Clay, Sage & Gold | 3600×3600px (300 DPI) |
| **Cozy Fall** | *Autumn State of Mind* | `autumn-state-of-mind` | Gallery Poster (18×24") | Amber Ochre & Forest Spruce | 3600×3600px (300 DPI) |
| **Cozy Fall** | *Powered by Pumpkin Spice* | `powered-by-pumpkin-spice` | Keepsake Mug (White 11oz) | Cinnamon Warmth & Foamed Vanilla | 3600×3600px (300 DPI) |
| **Cozy Fall** | *Sweater Weather* | `sweater-weather` | Everyday Tee (White) | Heather Fog & Vintage Terracotta | 3600×3600px (300 DPI) |
| **Thanksgiving** | *Feast Mode* | `feast-mode` | Everyday Tee (White) | Cranberry Glaze & Golden Chestnut | 3600×3600px (300 DPI) |
| **Thanksgiving** | *Thankful, Grateful, Caffeinated* | `thankful-grateful-caffeinated` | Keepsake Mug (White 11oz) | Roast Sienna & Cardamom Cream | 3600×3600px (300 DPI) |
| **Thanksgiving** | *Thanksgiving Social Club* | `thanksgiving-social-club` | Gallery Poster (18×24") | Vintage Cider & Heritage Navy | 3600×3600px (300 DPI) |

### 2.2 Asset Manifest

All design files are located in `public/designs/fall-2026/`:
- `*.svg`: Scalable vector master for high-resolution vector output.
- `*.png`: 3600×3600px transparent PNG (12×12 inches @ 300 DPI equivalent) for direct Printify DTG and sublimation printing.
- `*.webp`: 1200×1200px compressed WebP for instant web and configurator preview performance.

### 2.3 Retail Pricing & Economics

All retail prices have been updated in `lib/commerce/catalog/approved-catalog.ts` and `lib/commerce/fixtures.ts`:

| Product | Printify Blueprint | Primary Provider | Retail Price | Est. Base Cost | Stripe Fee (2.9% + 30¢) | Contribution Margin ($) | Margin (%) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Keepsake Mug (11oz)** | Blueprint 68 | District Photo | **$19.00** | ~$4.80 | $0.85 | **$13.35** | **70.2%** |
| **Gallery Poster (18×24")**| Blueprint 282 | Prodigi | **$29.00** | ~$9.50 | $1.14 | **$18.36** | **63.3%** |
| **Everyday Tee (Unisex)** | Blueprint 12 | Monster Digital | **$34.00** | ~$10.20 | $1.29 | **$22.51** | **66.2%** |

*Pricing Rationale*:
- Keepsake Mug was adjusted from $26.00 to an accessible **$19.00** impulse-buy price point.
- All products maintain a healthy >60% gross contribution margin before fulfillment shipping.
- Shipping fees are quoted transparently based on destination and package dimensions, eliminating shipping margin erosion.

---

## 3. Architecture & Technical Fixes

### 3.1 Fulfillment & Grouped Packaging Shipping Engine
- **Problem**: When a customer ordered items from multiple distinct blueprints (e.g. an Everyday Tee and a Keepsake Mug), the previous algorithm treated them as a single parcel, undercharging shipping costs relative to Printify's actual multi-parcel provider fees.
- **Fix in `lib/commerce/shipping-quote.ts`**:
  - Implemented grouped packaging calculation based on provider and blueprint profile categories (`apparel`, `poster`, `mug`).
  - Distinct blueprints or non-co-locatable items are charged the primary first-item rate; additional units within the same category receive incremental-item rates.
  - Implemented `/api/commerce/shipping-quote` to provide instant, real-time cart calculations in the drawer.
  - Wired into `lib/commerce/checkout/service.ts` so Stripe Checkout Sessions automatically receive accurate shipping fees.

### 3.2 Durable Artwork Persistence
- **Problem**: In the guest photo upload flow (`/create`), custom artwork previously remained in client memory (`blob:http://...`) or IndexedDB. If an order was placed, Printify could fail to download the temporary blob URL during production submission.
- **Fix in `/api/commerce/artwork/persist` & `UnifiedCreateExperience.tsx`**:
  - Before adding an item to the cart or creating a snapshot, `addToCart` calls `/api/commerce/artwork/persist` with the image data.
  - The image is hashed with SHA-256 for deduplication and uploaded to the Supabase `user-uploads` bucket.
  - A permanent 1-year signed HTTPS URL is returned and written into `ProductConfigurationSnapshot`.
  - In automated test and CI environments, deterministic signed URLs are generated without external network dependencies.

### 3.3 Cart Synchronization & Navigation UX
- **Cart Badge Count**: `components/home-v2/HomepageV2Header.tsx` listens to `printme:cart-updated` custom events and inspects `localStorage` to display a live numeric badge (`data-testid="cart-badge-count"`).
- **Cart Drawer Transparency**: `app/shop-v2/ShopV2Experience.tsx` displays live subtotal, standard shipping fee, and delivery timeframes (2–3 days production + 3–5 days transit).
- **Route Consolidation**:
  - `/cart` and `/app/cart` redirect to `/shop-v2`.
  - `/api/checkout` returns HTTP 410 Gone with explicit direction to use `/api/commerce/checkout`.

---

## 4. Pre-Launch Safeguards & Operational Readiness Gates

> [!CAUTION]
> **DO NOT ENABLE LIVE PAYMENTS OR LIVE PRINTIFY FULFILLMENT UNTIL THE FOLLOWING 3 GATES ARE SIGNED OFF.**

### Gate 1: Stripe Account Descriptor Rebranding
- **Live Account Found**: `acct_1RbMYvHtgFDu5mMB`.
- **Current Business Name**: `Rubix AI`.
- **Current Statement Descriptor**: `RUBINJAMES.COM`.
- **Risk**: Customers ordering from PrintMe.ai will see `RUBINJAMES.COM` on their credit card statements, leading to unrecognized transaction chargebacks and disputes.
- **Required Action**:
  1. Log into the Stripe Dashboard for `acct_1RbMYvHtgFDu5mMB`.
  2. Update **Public Details**:
     - Business Name: `PrintMe.ai`
     - Statement Descriptor: `PRINTME.AI`
     - Shortened Descriptor: `PRINTME`
     - Support Email & URL: `support@printme.ai` / `https://printme.ai`
  3. Alternatively, switch `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in production environment variables to a dedicated PrintMe.ai Stripe account.
  4. Ensure `COMMERCE_CHECKOUT_ENABLED=true` is only activated once verified.

### Gate 2: Supabase Database Migration Execution
- **Target Project**: `vfgbvnfhvjmkmfmianpb` (printme-ai).
- **Migration Bundle**: `docs/MIGRATIONS_002_TO_009_BUNDLE.sql`.
- **Execution Steps**:
  1. Log into Supabase Dashboard -> Project `vfgbvnfhvjmkmfmianpb` -> **SQL Editor**.
  2. Open `docs/MIGRATIONS_002_TO_009_BUNDLE.sql`, copy all contents, paste into the editor, and click **Run**.
  3. Verify the output table from the verification query at the bottom of the script. All tables, views, and functions must report `EXISTS`.

### Gate 3: Printify Fulfillment Safe Submission Control
- **Environment Variable**: `PRINTIFY_FULFILLMENT_MODE`.
- **Current Production Value**: `dry-run`.
- **Safety Policy**:
  - Keep `PRINTIFY_FULFILLMENT_MODE=dry-run` during initial go-live to allow orders to flow through the database without triggering automated billing or printing.
  - The merchant should manually inspect the first 3 orders in the Printify Dashboard to confirm:
    1. Print placement aligns properly on the mockup.
    2. Artwork resolution is sharp and unpixelated.
    3. Production costs match the estimated margins.
  - Once sample orders are approved, update `PRINTIFY_FULFILLMENT_MODE=live` to enable fully automated order submission.

---

## 5. Verification & Test Evidence

### 5.1 Automated Test Results

| Test Suite | Result | Details |
| :--- | :--- | :--- |
| **Vitest Unit & Integration** | **122 / 122 PASSED** (2 skipped) | 32 test files passing (checkout, fulfillment, shipping quote, pricing, designs, studio). |
| **TypeScript Typecheck** | **0 ERRORS** | `tsc --noEmit` cleanly passes across the entire project. |
| **Next.js Production Build** | **SUCCESS** | `npm run build` compiled 65 static and dynamic pages with 0 warnings or errors. |
| **Playwright E2E: Homepage** | **PASSED** | Validates Fall hero copy, CTAs, product showcase, and responsive navigation. |
| **Playwright E2E: Design Routes** | **PASSED** | Validates curated design catalog, filtering, and detail modal. |
| **Playwright E2E: Create Flow** | **PASSED** | Guest photo upload, preparation, customization, and cart persistence surviving reload. |
| **Playwright E2E: Shop V2 Checkout**| **PASSED** | Persistent test checkout, quantity modification, same-design upsell, and dry-run webhook verification. |

### 5.2 Responsive Viewport Verification
- **Mobile (375×812px)**: Primary CTAs, touch gesture controls (`touch-action: none`), cart drawer, and configurator tested and fully usable within 375px viewport bounds.
- **Tablet (768×1024px)**: Grid layouts adjust gracefully from 1 to 2 columns; navigation headers collapse properly.
- **Desktop (1440×900px)**: 3-column product showcase, full instant preview stage, and fixed footer checkout buttons render without layout shift.

---

## 6. September 21, 2026 Merchant Go-Live Checklist

Use this checklist on launch day:

- [ ] **Step 1: Apply Supabase Migrations**  
  Run `docs/MIGRATIONS_002_TO_009_BUNDLE.sql` in the Supabase SQL Editor.
- [ ] **Step 2: Verify Seed Data**  
  Run `npx tsx -e "import { seedCuratedCatalog } from './lib/commerce/designs/seed'; seedCuratedCatalog().then(console.log);"` against Supabase to populate the 9 Fall designs and collections.
- [ ] **Step 3: Update Stripe Statement Descriptor**  
  Verify descriptor in Stripe Dashboard is set to `PRINTME.AI` before switching keys.
- [ ] **Step 4: Configure Production Environment Variables**  
  ```bash
  NEXT_PUBLIC_COMMERCE_V2_ENABLED=true
  NEXT_PUBLIC_HOMEPAGE_V2_ENABLED=true
  NEXT_PUBLIC_UNIFIED_CREATE_ENABLED=true
  COMMERCE_CHECKOUT_ENABLED=true
  PRINTIFY_FULFILLMENT_MODE=dry-run  # keep dry-run until first 3 orders verified
  ```
- [ ] **Step 5: Merge and Deploy**  
  Create Pull Request from `launch/fall-2026-storefront` into `main`, wait for CI checks, and deploy to production (Vercel/Cloudflare).
- [ ] **Step 6: Place Live Test Order**  
  Place one real test order with a real credit card for a $19 Keepsake Mug. Verify:
  - Card statement reads `PRINTME.AI`.
  - Stripe webhook triggers and updates order status to `paid`.
  - Order shows up in Printify as a draft.
- [ ] **Step 7: Switch Printify to Live**  
  Change `PRINTIFY_FULFILLMENT_MODE=live` to enable full autonomous fulfillment.
