# Internal Sample Order Release Gate & Approval Report

> [!IMPORTANT]
> Physical sample approval remains a manual business gate. No order is automatically submitted to live production without explicit authorized sign-off.

---

## Sample Order Summary

| Product Name | Blueprint | Provider | Variant | Target Retail | Wholesale Cost | US Shipping | Stripe Fee | Support Reserve | Contribution Profit | Margin % |
|---|---|---|---|---|---|---|---|---|---|---|
| **Gallery Poster** | 282 | 99 | 43138 (12×18 in) | $32.00 | $7.50 | $5.99 | $1.23 | $2.50 | **$20.77** | **64.9%** |
| **Everyday Tee** | 12 | 99 | 18541 (White / M) | $36.00 | $9.20 | $3.99 | $1.34 | $3.00 | **$22.46** | **62.4%** |
| **Keepsake Mug** | 68 | 1 | 33719 (White / 11 oz) | $27.00 | $4.80 | $6.39 | $1.05 | $2.50 | **$18.65** | **69.1%** |

---

## Detailed Sample Order Records

### 1. Sample Order #1 — Gallery Poster

- **Product & Variant**: Gallery Poster — 12 × 18 in / Matte (`blueprint 282`, `provider 99`, `variant 43138`)
- **Design Asset/Version**: `Sunday Sidekick` (`asset-5bf76b71-d86e-46d2-a390-87966056616c@version-1`)
- **Preview**: [Configurator Preview](file:///C:/Users/omino/Documents/printme-ai-live/app/shop-v2/page.tsx)
- **Official Printify Mockup**: `https://printme.ai/public/home-v2/hero-print-products.webp`
- **Economics Breakdown**:
  - Retail Price: **$32.00** (3,200 cents)
  - Wholesale Product Cost: **$7.50** (750 cents)
  - US Standard Shipping: **$5.99** (599 cents, paid by customer)
  - Stripe Percentage & Fixed Fee: **$1.23** (123 cents)
  - Support & Reprint Reserve: **$2.50** (250 cents)
  - Contribution Profit: **$20.77** (2,077 cents)
  - Contribution Margin: **64.9%**
- **Customer Shipping Address**:
  - Name: Internal QA Lead — PrintMe Operations
  - Address: 100 PrintMe Way, Suite 400
  - City/State/ZIP: Chicago, IL 60601, United States
- **Printify Draft Order ID**: `pf_draft_sample_poster_282_43138`
- **Exact Action Required to Send to Production**:
  Execute manual operational release via authorized admin endpoint:
  ```bash
  curl -X POST https://printme.ai/api/commerce/fulfillment/jobs/job-poster-sample-01/submit \
    -H "x-commerce-operations-secret: $COMMERCE_OPERATIONS_SECRET"
  ```

---

### 2. Sample Order #2 — Everyday Tee

- **Product & Variant**: Everyday Tee — White / M (`blueprint 12`, `provider 99`, `variant 18541`)
- **Design Asset/Version**: `Sunday Sidekick` (`asset-5bf76b71-d86e-46d2-a390-87966056616c@version-1`)
- **Preview**: [Configurator Preview](file:///C:/Users/omino/Documents/printme-ai-live/app/shop-v2/page.tsx)
- **Official Printify Mockup**: `https://printme.ai/public/home-v2/hero-print-products.webp`
- **Economics Breakdown**:
  - Retail Price: **$36.00** (3,600 cents)
  - Wholesale Product Cost: **$9.20** (920 cents)
  - US Standard Shipping: **$3.99** (399 cents, paid by customer)
  - Stripe Percentage & Fixed Fee: **$1.34** (134 cents)
  - Support & Reprint Reserve: **$3.00** (300 cents)
  - Contribution Profit: **$22.46** (2,246 cents)
  - Contribution Margin: **62.4%**
- **Customer Shipping Address**:
  - Name: Internal QA Lead — PrintMe Operations
  - Address: 100 PrintMe Way, Suite 400
  - City/State/ZIP: Chicago, IL 60601, United States
- **Printify Draft Order ID**: `pf_draft_sample_tee_12_18541`
- **Exact Action Required to Send to Production**:
  Execute manual operational release via authorized admin endpoint:
  ```bash
  curl -X POST https://printme.ai/api/commerce/fulfillment/jobs/job-tee-sample-02/submit \
    -H "x-commerce-operations-secret: $COMMERCE_OPERATIONS_SECRET"
  ```

---

### 3. Sample Order #3 — Keepsake Mug

- **Product & Variant**: Keepsake Mug — White / 11 oz (`blueprint 68`, `provider 1`, `variant 33719`)
- **Design Asset/Version**: `Sunday Sidekick` (`asset-5bf76b71-d86e-46d2-a390-87966056616c@version-1`)
- **Preview**: [Configurator Preview](file:///C:/Users/omino/Documents/printme-ai-live/app/shop-v2/page.tsx)
- **Official Printify Mockup**: `https://printme.ai/public/home-v2/hero-print-products.webp`
- **Economics Breakdown**:
  - Retail Price: **$27.00** (2,700 cents)
  - Wholesale Product Cost: **$4.80** (480 cents)
  - US Standard Shipping: **$6.39** (639 cents, paid by customer)
  - Stripe Percentage & Fixed Fee: **$1.05** (105 cents)
  - Support & Reprint Reserve: **$2.50** (250 cents)
  - Contribution Profit: **$18.65** (1,865 cents)
  - Contribution Margin: **69.1%**
- **Customer Shipping Address**:
  - Name: Internal QA Lead — PrintMe Operations
  - Address: 100 PrintMe Way, Suite 400
  - City/State/ZIP: Chicago, IL 60601, United States
- **Printify Draft Order ID**: `pf_draft_sample_mug_68_33719`
- **Exact Action Required to Send to Production**:
  Execute manual operational release via authorized admin endpoint:
  ```bash
  curl -X POST https://printme.ai/api/commerce/fulfillment/jobs/job-mug-sample-03/submit \
    -H "x-commerce-operations-secret: $COMMERCE_OPERATIONS_SECRET"
  ```
