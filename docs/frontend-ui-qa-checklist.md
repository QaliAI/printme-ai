# PrintMe.ai Premium UI/CRO Redesign — Frontend QA Checklist

This checklist is a structured runbook to perform comprehensive smoke tests across desktop and mobile devices for PrintMe.ai ecommerce paths.

---

## 1. Global Visual and Responsive Layout Checks

- [ ] **Typography consistency**: Verify headers use premium fonts and body copy is clear with proper weights.
- [ ] **Focus rings and focus states**: Click/tab through interactive buttons to ensure accessibility focus outlines show clearly.
- [ ] **Contrast check**: Ensure text labels, badges, and background gradients satisfy color contrast ratios for high readability.
- [ ] **Mobile Responsive Menu**: Verify the layout wraps neatly on screens under 640px. The navbar should hide secondary links and keep primary CTAs clickable.

---

## 2. Route-by-Route Smoke Tests

### 2.1 landing Page (`/`)
- [ ] **Hero Value Proposition**: Verify the copy emphasizes photo-to-gift e-commerce set promise clearly.
- [ ] **CTAs redirect to flow**: Test "Start Creating" hero and footer CTAs. They must point directly to `/app/create/style` to start the visual creation flow.
- [ ] **Mockups click-through**: Select any product card from the showcase or preset card. It should link to `/app/create/style` carrying the preselected style query param (e.g. `?select=oil-painting-portrait`).
- [ ] **Interactive comparisons**: Drag the slider in "Before/After" section to ensure smooth comparison.

### 2.2 Style Selection Page (`/app/create/style`)
- [ ] **Style cards load**: Verify cards render premium sample thumbnails from `STYLE_PRESET_SAMPLES` instead of plain colors or generic emoji placeholders.
- [ ] **Pre-selection from landing**: Navigate via `/app/create/style?select=oil-painting-portrait` and confirm the "Oil Painting" card is automatically selected.
- [ ] **Best-use badges**: Verify tags (e.g., "Ideal for: Pet Portraits") display clearly on style cards.
- [ ] **Unselected boundary protection**: Check that the "Continue" button remains disabled until a style is explicitly selected.

### 2.3 Upload Page (`/app/create/upload`)
- [ ] **Suspense validation**: Ensure query parameters are parsed smoothly on first paint.
- [ ] **Drag & Drop Upload Zone**: Drag a image over the dashed zone. Confirm the border color changes to indigo and accepts the drop.
- [ ] **Camera Actions**: Confirm "Take Live Photo" (for mobile) and "Photo Library" trigger native capture or file selectors.
- [ ] **Guidance indicators**: Ensure resolution tips (e.g., "Use 1000px or larger") display clearly.
- [ ] **Authentication redirect**: Try generating a design when unauthenticated. Verify redirect to `/auth/signin?redirect=...` and that logging in returns you straight back to the upload page with your pre-selected style active.

### 2.4 Preview Page (`/app/create/preview`)
- [ ] **Loading states**: Ensure the particle animations and progress messages ("Analyzing your photo...") render smoothly during generation.
- [ ] **Graceful error handling**: If generation fails, confirm that clear action buttons ("Retry Generation", "Choose Another Style") appear dynamically.
- [ ] **Before/After slider**: Verify comparison slider handles original photo and AI design correctly.
- [ ] **"What happens next" box**: Verify the guide in the side panel lists clear steps (Review Mockups -> Select Sizes -> Check out with Stripe).

### 2.5 Product Selection Page (`/app/create/products`)
- [ ] **Product list and price clarity**: Ensure base prices are visible and premium category labels (e.g. "🏠 Wall Art") highlight each card.
- [ ] **Fitted mockup images**: Check that the product mockup displays with `object-contain` on a light background, avoiding extreme cropping for cases/posters.
- [ ] **Personalized Printify Mockups**: Verify live mockup thumbnails render once Printify returns mockup sheets.
- [ ] **Quantity & Variant dropdowns**: Confirm dropdowns and quantity buttons work properly.
- [ ] **Bundle Tip**: Confirm the recommendation tip is displayed under the checkout summary.

### 2.6 Cart Page (`/app/app/cart`)
- [ ] **Empty cart state**: Verify checkout buttons are hidden and a "Start Creating" button guides users back to style selection.
- [ ] **Quantities update**: Confirm plus/minus buttons change values and subtotal recalculates instantly.
- [ ] **Trust badges**: Ensure secure badges ("🔒 Secure Checkout", "🛡️ Powered by Stripe") are highly visible.
- [ ] **Shipping and Guarantee details**: Verify production timeline (2-3 business days) and satisfaction guarantee labels display correctly.

### 2.7 Checkout Success Page (`/checkout/[sessionId]`)
- [ ] **Friendly order numbers**: Ensure it displays the database-backed `order.order_number` (e.g. `PM-XXXXXX`) rather than a raw database UUID.
- [ ] **Fulfillment status timeline**: Check that clear steps showing order progress are presented to build buyer confidence.

---

## 3. Known Frontend Behaviors and Fallbacks

1. **Stripe Test Mode Redirect**: Since checkout routes rely on session verification, navigating directly to `/checkout/test-placeholder` will show a loading state and poll. To test the success page manually, a real Stripe test session must be completed.
2. **First-Load Printify Mockup Shimmer**: Product mockups may show a shimmer placeholder on first load while the backend requests Printify to render custom mockups for a new design. This is normal and transitions automatically once loaded.
