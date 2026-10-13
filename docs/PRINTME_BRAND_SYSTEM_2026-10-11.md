# PrintMe Brand System & Design Direction
**Date:** 2026-10-11  
**Author:** Principal Ecommerce Design Engineer & Creative Director  
**Status:** Approved & Implemented across Canonical Codebase  

---

## 1. Brand Positioning & Proposition

PrintMe is **not** fundamentally an AI showcase or a corporate SaaS tool. AI is an invisible engine. The customer-facing product is:

> **A FAST, FUN PERSONALIZED GIFT STUDIO.**

### Core Brand Pillars
* **Brand Promise:** *MAKE IT WEIRDLY YOURS.*
* **Commercial Hook:** *YOUR PHOTO. YOUR JOKE. YOUR MERCH.*
* **Primary Customer Use Cases:**
  * Pets (custom pet transformations, funny animal portraits)
  * Couples & friends (inside jokes, shared memories)
  * Families (custom clan portraits, Thanksgiving keepsakes)
  * Seasonal events (Halloween party shirts, holiday gifts)
  * Keepsakes (memories people actually want to keep)

### Voice & Tone
* **Personality:** Playful, sharp, warm, confident, human, slightly irreverent.
* **Prohibited Voices:**
  * Corporate SaaS / developer productivity jargon
  * AI hype & robotic terminology ("neural network", "generative prompt", "algorithm")
  * Luxury-gallery pretension / fine-art academic speak
  * Generic motivational copy

---

## 2. Visual Direction & Design Tokens

PrintMe uses a physical printmaking aesthetic—rooted in ink, paper, press marks, and tactile warmth.

### Color Palette

| Token Name | Hex Code | Role |
| :--- | :--- | :--- |
| **Ink** | `#151512` | Deep charcoal-black for text, dark CTA buttons, high-contrast borders |
| **Paper** | `#FFF9EF` | Creamy warm off-white for page backgrounds and light surfaces |
| **Warm Surface** | `#F0E9DC` | Tactile warm beige for cards, sidebars, interactive controls |
| **PrintMe Orange** | `#FF4B2B` | Vibrant, confident brand accent; primary CTA, highlights, active states |
| **Punch Yellow** | `#FFD84D` | Cheerful secondary accent for badges, sale highlights, stickers |
| **Secondary Moss** | `#667A50` | Earthy organic olive/moss for verified trust states and nature accents |
| **Border / Rule** | `#DED6C7` | Muted hairline border separating paper surfaces |

> **Palette Guardrails:**
> * Never introduce purple/blue SaaS gradients, indigo glowing boxes, or glassmorphic blurs.
> * Eliminate cold battleship gray (`#eef0f1`, `#cdd1cf`) from user-facing screens.

---

## 3. Typography Architecture

PrintMe adopts a two-tier typographic system loaded via `next/font/google`:

```css
--font-display: 'Bricolage Grotesque', sans-serif; /* Display / Brand / Headings */
--font-sans: 'DM Sans', -apple-system, sans-serif;  /* Body / Controls / Interface */
```

### Type Hierarchy
1. **Brand Headings (`h1`, `h2`, Hero headlines):**
   * Font: `Bricolage Grotesque`
   * Weight: 800–850
   * Tracking: `-0.035em` to `-0.04em`
   * Line height: `0.92` to `1.02`
2. **Subheadings & Section Tags:**
   * Font: `Bricolage Grotesque`
   * Weight: 700
   * Letter spacing: `0.08em` to `0.12em` uppercase
3. **Body & Commerce Controls:**
   * Font: `DM Sans`
   * Weight: 400 (body), 600 (semi-bold labels), 750 (buttons/prices)
   * Line height: `1.55`

> **De-duplication:**
> * **Arial eliminated** as the primary brand display face on `/` and `/products`.
> * **Georgia eliminated** as a secondary disconnected identity on `/designs`, `/shop`, and `/collections`.
> * All customer surfaces now share the unified Grotesk + DM Sans pairing.

---

## 4. Brand Identity: Wordmark & Registration Mark

The previous orange rounded-square `"P"` with plain Arial text has been replaced by the canonical **PrintMe Wordmark** (`components/brand/PrintMeWordmark.tsx`):

### Symbol Language
* **Physical Registration Mark (`⌖`):** Precision crosshairs extending beyond an outer registration ring with a solid center punch dot. Represents tactile print calibration, craft, and physical merch production.
* **Lettering:** Precision Bricolage Grotesque letterforms:
  * `Print` rendered in Ink (`#151512`)
  * `Me` rendered in PrintMe Orange (`#FF4B2B`)
* **Responsive & Monochrome:**
  * Supports `monochrome` mode for inverse headers and dark footers.
  * Scales gracefully from 22px mobile navbar height to large hero representations.
  * Absolutely no generic AI sparkles, glowing orbs, or robots.

---

## 5. Navigation & Customer Surface Hierarchy

### Global Navigation (`HomepageV2Header.tsx` & `Navbar.tsx`)
Simplified to clear customer intent:
* **Shop** (`/shop`) — Catalog of approved merchandise and customizable designs
* **Create** (`/create`) — Interactive gift studio upload and placement tool
* **Halloween** (`/halloween`) — Current limited seasonal drop
* **Gifts & Collections** (`/collections`) — Curated gift groupings
* **Search** (`/designs`) — Searchable artwork library
* **Bag** (`/shop`) — Drawer bag with live placement previews

### Customer-Safe Policy Claims
* **Allowed:**
  * Preview before you buy (interactive client-side rendering)
  * Made to order (2–3 business days production)
  * Free defect & damage replacement guarantee (prompt reprints)
  * US carrier shipping calculated at checkout
* **Prohibited:**
  * Fabricated review counts or order volumes
  * Fake countdown timers or false urgency
  * "Made in USA" claims (print providers have diverse facilities)
  * Shipping guarantees without carrier backing

---

## 6. Implementation Checklist & Files Modified

* `components/brand/PrintMeWordmark.tsx` — Vector SVG registration mark & wordmark primitive
* `components/brand/SiteFooter.tsx` — Universal consumer footer component
* `components/brand/SiteFooter.module.css` — Responsive footer layout tokens
* `app/globals.css` — Canonical CSS variables, typography imports, reset tokens
* `app/layout.tsx` — Google Font injection, SEO metadata, clean consumer layout
* `components/home-v2/HomepageV2Header.tsx` — Unification to PrintMe wordmark & customer links
* `components/Navbar.tsx` — Wordmark replacement across legacy routes
* `components/home-v2/HomepageV2.tsx` — 8-step story reconstruction
* `app/home-v2.module.css` — Grotesk headings, responsive step cards, warm palette
* `app/shop/page.tsx` — Customer `/shop` route established
* `app/shop-v2/shop-v2.module.css` — Georgia removal, Paper/Ink token alignment
* `app/create/UnifiedCreateExperience.tsx` — "Drop the photo. We'll do the fun part."
* `app/create/create.module.css` — Warm studio palette replacing cold gray productivity UI
* `app/halloween/page.tsx` & `seasonal-landing.module.css` — Rich drop landing experience
* `components/seasonal/seasonal.module.css` — Georgia removal from Seasonal Edit cards
* `components/seasonal/SeasonalTrendCard.tsx` — Link redirection to canonical `/shop`
* `components/seasonal/PersonalizationModal.tsx` — Direct bag linking to canonical `/shop`
* `app/designs/designs.module.css` — Georgia removal from designs catalog
* `app/products/page.tsx` & `products.module.css` — Customer-first merchandising presentation
