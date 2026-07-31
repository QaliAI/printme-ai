# PrintMe.ai Launch Readiness Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make PrintMe.ai ready for a launch/promotion push next week: users can upload photos, optionally remove backgrounds, apply attractive AI/filter styles, preview designs on Printify print-on-demand products, pay onsite, and have orders fulfilled through Printify.

**Architecture:** Keep the current Next.js 16 App Router + Supabase + Stripe + Printify foundation, but stabilize the launch-critical happy path before adding community features. Add a lightweight CMS/admin workflow for featured/trending designs first, then evolve it into public voting/leaderboards after checkout is reliable.

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript, Tailwind CSS 4, Supabase Auth/Postgres/RLS, Stripe Checkout/webhooks, Printify API/webhooks, Cloudinary image storage/transforms, OpenAI image generation abstraction.

---

## Current State Snapshot — 2026-06-07

### Verified locally
- Canonical launch repo appears to be `C:/Users/omino/Documents/printme-ai-live`.
- GitHub remote: `https://github.com/QaliAI/printme-ai.git`.
- Branch `master` is clean and matches `origin/master` at `16a7b63`.
- `npm run build` succeeds in the canonical repo.
- Local build warning: `Printify API token or shop ID not configured. Printify integration will be unavailable.` because this clone has no `.env.local`.
- Live website `https://printme.ai` loads the polished marketing page and `/app` redirects to sign-in.
- Vercel CLI can see production deployments for project `qaliais-projects/printme-ai`.

### Launch blockers found
1. **Supabase project appears paused/offline.** The configured project URL in the other local clone is `https://vfgbvnfhvjmkmfmianpb.supabase.co`; DNS lookup failed during audit, consistent with a paused Supabase project.
2. **Vercel env vars appear missing.** `vercel env ls` returned `No Environment Variables found for qaliais-projects/printme-ai`. If true for the active production project, signup, auth, API routes, checkout, and fulfillment cannot work reliably.
3. **The root clone `C:/Users/omino/printme-ai` is behind by 4 commits and has uncommitted local changes.** Treat it as a work-in-progress/backup clone, not the launch source of truth until reconciled.
4. **The schema files need consolidation.** The root clone has `database.sql` deleted and `database.legacy.sql.bak`; the canonical clone still has `database.sql`. Runtime code references newer columns such as `design_url`, `style_id`, `cloudinary_public_id`, `printify_mockups`, and checkout/fulfillment fields, so production schema must be verified against app code before launch.
5. **Checkout success route mismatch.** API creates Stripe success URL `/checkout/success?session_id=...`, while the app currently has `/checkout/[sessionId]`. This should be fixed before payment testing.
6. **Upload API currently accepts `userId` from form data.** This must be changed to derive the authenticated user server-side to prevent cross-user writes.
7. **Background removal is not yet a first-class user option.** There is a `Clean Cutout` AI style, but not a clear remove-background toggle/workflow with transparent output suitable for products.
8. **Featured design CMS/community layer is not built yet.** Admin pages exist for designs/styles/products, but no dedicated featured designs schedule, campaign tagging, public gallery, voting, or leaderboard.

---

## Launch MVP Definition

Launch next week should mean all of this works end-to-end in production:

1. Visitor lands on a visually stunning, fast, mobile-first homepage.
2. Visitor creates account or starts creation with minimal friction.
3. User uploads a photo.
4. User optionally removes background.
5. User applies one style/filter or chooses no style.
6. User previews the result on a curated set of Printify products.
7. User adds one or more product variants to cart.
8. User pays via Stripe Checkout.
9. Stripe webhook creates an order.
10. Order is submitted to Printify with the correct design asset, product, variant, print area, shipping address, and tracking hooks.
11. Admin can upload/feature designs for World Cup/trending drops without code changes.

---

## Commit Schedule

Use small, reversible commits. Each phase should pass `npm run build` before committing.

### Day 0 / Tonight — Stabilize source of truth and infrastructure checklist
- Commit `docs: add launch readiness plan`.
- Back up both local clones with git bundles/archives.
- Reconcile `C:/Users/omino/printme-ai` only after the canonical repo is protected.
- Confirm Supabase unpaused and Vercel env vars restored.

### Day 1 — Production env + schema recovery
- Commit 1: `chore: document required production environment variables`.
- Commit 2: `db: consolidate launch schema and migrations`.
- Commit 3: `fix: align checkout success route with Stripe redirect`.
- Verify: Supabase health, auth signup/signin, protected `/app`, build.

### Day 2 — Secure upload + background removal
- Commit 1: `fix: derive upload user from authenticated session`.
- Commit 2: `feat: add remove-background option to creation flow`.
- Commit 3: `feat: persist transparent/cutout assets for product mockups`.
- Verify: upload, cutout output, design preview, RLS checks.

### Day 3 — Product preview and Printify accuracy
- Commit 1: `feat: curate launch product catalog`.
- Commit 2: `fix: map app products to Printify blueprint/provider/variant ids`.
- Commit 3: `feat: improve live mockup loading states and cache refresh`.
- Verify: generated mockups for shirts, mugs, posters/canvas, stickers/totes.

### Day 4 — Stripe and Printify end-to-end test mode
- Commit 1: `fix: harden checkout line item pricing and metadata`.
- Commit 2: `fix: submit paid orders to Printify with full shipping payload`.
- Commit 3: `feat: add admin order detail/troubleshooting view`.
- Verify: Stripe test checkout -> webhook -> Printify test/sandbox order path.

### Day 5 — Featured designs CMS
- Commit 1: `db: add featured design campaigns and gallery tables`.
- Commit 2: `feat: add admin featured design uploader`.
- Commit 3: `feat: add public designs of the day gallery`.
- Commit 4: `feat: let users print featured designs`.
- Verify: admin uploads a World Cup design, homepage/gallery shows it, user can purchase it.

### Day 6 — Visual polish + interactivity
- Commit 1: `feat: add interactive creation demo to homepage`.
- Commit 2: `style: polish mobile conversion path and product cards`.
- Commit 3: `feat: add campaign sections for trending moments`.
- Verify: Lighthouse/mobile pass, browser QA, no console errors.

### Day 7 — Launch hardening
- Commit 1: `test: add checkout smoke tests`.
- Commit 2: `chore: add monitoring and launch runbook`.
- Commit 3: `docs: add admin content upload guide`.
- Verify: production smoke test with a small real/test order, rollback documented.

---

## Detailed Implementation Tasks

### Task 1: Restore Supabase and production environment

**Objective:** Make production auth/API/database reachable again.

**Files:**
- Modify: Vercel project env vars via Vercel dashboard/CLI
- Modify: Supabase project state via Supabase dashboard
- Modify: `.env.example` if keys are missing

**Steps:**
1. Unpause Supabase project `vfgbvnfhvjmkmfmianpb` in Supabase dashboard.
2. Confirm DNS/API health:
   ```bash
   curl -I https://vfgbvnfhvjmkmfmianpb.supabase.co
   ```
3. Add Vercel env vars for Production/Preview/Development:
   - `NEXT_PUBLIC_APP_URL=https://www.printme.ai`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_UPLOAD_PRESET`
   - `OPENAI_API_KEY`
   - `AI_PROVIDER=openai`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `PRINTIFY_API_TOKEN`
   - `NEXT_PUBLIC_PRINTIFY_SHOP_ID`
   - `PRINTIFY_WEBHOOK_SECRET`
   - `ADMIN_EMAILS`
4. Redeploy production.
5. Verify `/auth/signup`, `/auth/signin`, and `/app`.

**Verification:** `vercel env ls` shows keys present; browser signup no longer hangs/fails; protected app loads after auth.

### Task 2: Consolidate the production schema

**Objective:** Ensure Supabase tables match runtime code exactly.

**Files:**
- Modify/Create: `database.sql`
- Modify/Create: `migrations/002_launch_schema_alignment.sql`
- Modify: `DATABASE_MIGRATIONS.md`

**Steps:**
1. Inventory all table/column names referenced by code.
2. Compare with current Supabase schema.
3. Create an idempotent migration for missing columns/tables.
4. Include tables for featured CMS:
   - `featured_designs`
   - `featured_design_campaigns`
   - `design_votes`
5. Add RLS policies for public read on approved/featured designs and admin write.
6. Run migration in Supabase SQL editor.

**Verification:** Admin pages, app pages, checkout routes, and featured gallery queries all return without schema errors.

### Task 3: Fix checkout success route

**Objective:** Stripe redirects to a real confirmation page.

**Files:**
- Modify: `app/api/checkout/route.ts`
- Create or modify: `app/checkout/success/page.tsx`

**Steps:**
1. Decide on canonical URL: `/checkout/success?session_id=...`.
2. Create `app/checkout/success/page.tsx` that reads `session_id`, shows success state, and links to `/app/orders`.
3. Keep `/checkout/[sessionId]` only if it has a purpose; otherwise redirect it.
4. Build and test.

**Verification:** Stripe test session returns to a valid success page.

### Task 4: Secure upload route

**Objective:** Prevent spoofed user IDs and make upload reliable.

**Files:**
- Modify: `app/api/upload/route.ts`
- Modify callers in creation/upload flow if they send `userId`

**Steps:**
1. Import `getCurrentUser` server-side.
2. Remove `userId` from accepted form data.
3. Use authenticated `user.id` in Cloudinary folder and DB update.
4. Verify the design belongs to the user before update.
5. Return consistent JSON errors.

**Verification:** Upload succeeds for the logged-in user and fails when unauthenticated or when `designId` belongs to another user.

### Task 5: Add remove-background UX

**Objective:** Give users a clear optional background removal step.

**Files:**
- Modify: `app/app/create/upload/page.tsx`
- Modify: `app/app/create/style/page.tsx`
- Modify/Create: `app/api/remove-background/route.ts`
- Modify: `lib/ai/image-provider.ts` or add `lib/images/background-removal.ts`

**Steps:**
1. Add a visible toggle: `Remove background for product-ready cutout`.
2. Use Cloudinary background removal if available, otherwise a provider abstraction with clear fallback.
3. Store both original and background-removed asset URLs.
4. Make `Clean Cutout` style use the transparent/cutout asset when possible.
5. Add loading/progress UI and failure fallback.

**Verification:** A photo can be uploaded, background removed, and previewed on product mockups.

### Task 6: Build featured designs CMS

**Objective:** Let admin upload weekly/daily trend designs without developer changes.

**Files:**
- Create: `app/admin/featured/page.tsx`
- Create: `app/designs/page.tsx` or `app/gallery/page.tsx`
- Create: `app/api/admin/featured-designs/route.ts`
- Create: `app/api/featured-designs/route.ts`
- Modify: `components/Navbar.tsx`
- Modify: `app/page.tsx`

**Steps:**
1. Add database tables from Task 2.
2. Admin upload form fields:
   - title
   - slug
   - campaign/tag, e.g. `World Cup`
   - image/design file
   - description
   - active date range
   - sort order
   - products enabled
3. Public gallery shows active featured designs.
4. Add `Print this design` CTA that creates a design/cart path without requiring a user-uploaded photo.
5. Add simple vote/favorite field after launch or hide behind feature flag.

**Verification:** Admin uploads a World Cup design; it appears on homepage/gallery; user can select a product and checkout.

### Task 7: Make the site visually stunning and interactive

**Objective:** Improve conversion for social/promotion traffic.

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/landing/*`
- Modify: `app/globals.css`

**Steps:**
1. Add an above-the-fold interactive mini demo: upload/photo card -> style chip -> product mockup.
2. Add campaign strip: `World Cup drops this week` once featured CMS exists.
3. Add trust/clarity modules: shipped by Printify, secure checkout, delivery expectations.
4. Add sticky mobile CTA.
5. Add empty/error/loading states with polished motion.
6. Audit copy for spacing issues such as `fromphoto`, `subject,twelve`, `isone`.

**Verification:** No text spacing issues, mobile CTA works, no console errors, page feels launch-ready.

### Task 8: Launch QA checklist

**Objective:** Validate the full funnel before promotion.

**Commands:**
```bash
npm run build
npm run lint
```

**Manual browser tests:**
1. Homepage loads on desktop/mobile.
2. Signup/signin works.
3. Upload a photo.
4. Remove background.
5. Generate/apply style.
6. Preview on products.
7. Add product to cart.
8. Checkout with Stripe test card.
9. Stripe webhook creates order.
10. Printify receives/submits order.
11. Admin can upload a featured design.
12. Featured design can be purchased.

---

## Immediate Next Actions

1. Restore Supabase project and Vercel environment variables.
2. Fix checkout success route + secure upload route.
3. Add launch schema migration including featured CMS tables.
4. Implement admin featured design uploader and public `Designs of the Day` gallery.
5. Run end-to-end checkout and Printify test order.

## Useful Links

- Live site: https://www.printme.ai
- Vercel project: `qaliais-projects/printme-ai`
- Latest observed production deployment: `https://printme-h4lvqe8ol-qaliais-projects.vercel.app`
- GitHub repo: https://github.com/QaliAI/printme-ai
- Supabase project URL observed locally: `https://vfgbvnfhvjmkmfmianpb.supabase.co`
