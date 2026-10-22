# Pets competitor evidence and implementation boundaries

Observed 2026-10-22, America/Chicago. This is a public customer-journey inspection, not evidence of the competitor's internal security, profitability, or successful fulfillment.

The preferred browser connection failed; the available in-app browser fallback successfully loaded and interacted with the public site. Inspection reached style selection and its photo step, gift contact, recovery, rewards, affiliates, and keepsakes. No photo, email address, payment, purchase, affiliate application, or fulfillment request was submitted. Selecting one style created an anonymous draft session. Generation, paid download delivery, checkout, and post-purchase behavior were not exercised. Mobile menu behavior was not verified.

## Public evidence

| Source | Verified public behavior or offer | Limit |
| --- | --- | --- |
| [Homepage](https://www.pet-plus-us.com/) | Editorial cream/citron presentation; separate person/pet inputs illustrated beside a combined result; samples identified as examples; desktop navigation, bilingual selector, FAQs and support links. FAQ advertises $19 first portrait, $10 additional, no subscription, three watermarked previews and two purchase rerolls. | Offer text is observable; delivered rendering quality and reroll enforcement are not. Hero emphasizes one free preview; FAQ provides the broader allowance. |
| [Studio](https://www.pet-plus-us.com/create?step=looks) | More than 100 selectable looks; categories Studio, Cozy, Playful and Outdoors; people filter; selection limit 12; lineup/removal controls; first three designated free previews. Pet-only, person/pet, multiple-pet and larger-group looks appear. Selected pet-only look led to a separate photo step. | Style names and illustrative images do not prove reliable generation for all subject counts. People filter opened but its unlabeled option values were not inferred. |
| Studio photo step, reached through the selector | One photo requested per subject; framing guidance and examples; JPG/PNG/WebP/HEIC advertised, 25 MB/photo; rights and child-consent notice; preview disabled until inputs supplied. | No file was uploaded; actual validation, cropping, processing and output quality remain unverified. Session URL deliberately omitted. |
| [Keepsakes](https://www.pet-plus-us.com/keepsakes) | Frame 8×10 $89; plush blanket 50×60 $99; ceramic mug 11 oz $29; ceramic heart ornament $29. Sets: frame/mug $109, blanket/mug $119, all three $179. Digital portrait and standard US shipping advertised as included; tax additional. Existing purchases may receive a one-time credit up to $19 within 30 days toward qualifying frame/blanket/set. | These are competitor offers, not PrintMe prices or approved provider bindings. Delivery dates, reprint promise, credit application and tracking were not independently tested. |
| [Gifts](https://www.pet-plus-us.com/gift) and [buyer contact](https://www.pet-plus-us.com/gift/contact?portraits=1) | One portrait $19; three $33. Buyer email collected first; recipient address added later. Advertises private note, digital reveal, full-resolution downloads and buyer-controlled sending. | No contact details entered; reveal delivery, scheduling and entitlement not tested. Gift bundle differs from standard additional-portrait pricing. |
| [Order recovery](https://www.pet-plus-us.com/find) | Email-based private-link recovery; supports purchased portraits or saved previews; no password advertised. | No request submitted; enumeration resistance, token expiry and message delivery unverified. |
| [Rewards](https://www.pet-plus-us.com/rewards) | Private email-link entry; joining available after first paid portrait delivery. | Reward amounts, accounting and redemption hidden behind access. |
| [Affiliates](https://www.pet-plus-us.com/affiliates) | Public application; advertises 30% of net revenue after tax/refunds/production, weekly payments after 14-day aging, tracked links and 30-day attribution. | Dashboard, payouts and attribution behavior unverified. Do not copy this commission into PrintMe economics. |

The site displays an analytics/privacy notice and descriptive page titles. Their presence does not verify consent implementation, analytics accuracy, SEO performance, attribution correctness or private data handling. No proprietary assets, wording, code or customer photographs were reused.

## Feature parity and engineering direction

Baseline is local architecture inspected during this task; the release report must record final implementation and tests. “Verified result” below deliberately distinguishes code inspection from end-to-end proof.

| Feature | Competitor | Existing PrintMe | Action / classification | Verified result |
| --- | --- | --- | --- | --- |
| Original brand and existing site | Cohesive editorial portrait storefront | Established punk branding, mascot, product photography | Already differentiated: preserve; add Pets navigation and compact homepage entry | Existing brand/product assets present locally |
| Pet landing and gallery | Visual input-to-result demonstration and browseable looks | Local pet source/treatment pair; five shared photo styles | Missing dedicated Pets journey: implement original landing and curated presets | Baseline files inspected; final UI verification owned by implementation |
| Multiple separate reference images | Public per-subject photo workflow | ImageProviderOptions exposes one imageUrl | Missing: extend existing provider interface compatibly, after current provider documentation validation | Single-input interface confirmed; no successful multi-reference generation claimed |
| Shared preparation/placement | Product preview advertised | UnifiedCreateExperience, image preparation, segmentation, approved placements | Already strong: reuse rather than duplicate | Existing services and bindings inspected |
| Preview quota and watermark | Three free previews advertised | AI styles availability flag defaults off; exhausted-credit comment exists | Unsupported until durable quota, budget, server watermark and private original storage are proven | Gate independently from checkout; no credits spent |
| Rerolls/favorites/versions | Two paid rerolls advertised; selection workflow visible | No Pets-specific entitlement inspected | Missing: implement bounded, idempotent, authorized versions before advertising | Paid behavior unverified |
| Physical merchandise | Frames, blankets, mugs, ornament and sets | Approved poster, mug, tee, crewneck, hoodie bindings | Preserve approved catalog; gate unsupported frame/blanket/ornament offers | Local bindings confirmed; live provider availability/costs not reverified here |
| Digital purchase/download | Digital and gift offers advertised | Existing physical commerce architecture; no secure Pets digital entitlement demonstrated | Missing: reuse checkout; add server-confirmed payment entitlement and expiring authorized downloads before enabling purchase | Do not label digital delivery ready from UI alone |
| Recovery and durable email | Email private-link recovery | Existing order/recovery work and shared commerce services | Preserve commerce safeguards; extend authenticated creation recovery only with consent | No email delivery submitted or verified here |
| Gifts | Buyer/recipient separation and controlled reveal | No verified recipient-delivery lifecycle | Unsupported: offer honest gift preparation route; gate sending/purchase until delivered lifecycle exists | No fake recipient form or fake “sent” success |
| Bundles/credits/referrals | Public offers; rewards details restricted | No reviewed Pets liability/accounting model | Unsupported: defer paid discounts/credits/commission until refund-safe ledger and margins exist | Referral-ready attribution can be added without promising rewards |
| SEO/analytics/accessibility | Visible titles, skip link, privacy notice | Existing metadata/analytics infrastructure | Preserve and extend with accurate events; verified-payment event authoritative | Final metadata, mobile and accessibility checks required |

## Approved catalog and pricing limits

Use `lib/commerce/catalog/approved-catalog.ts` and `flat-garments.ts`, not competitor identifiers. Baseline retail: poster $29/$39, mug $19, tee $34, crewneck $49, hoodie $59. Poster is unframed. These are existing configured prices, not proof that all fulfillment and payment launch gates pass.

Poster blueprint/provider/variants are 282/99/43138 and 43144; mug is 68/1/33719; base tee is 12/99/18541 and 18542. Additional garment bindings are measured-data entries in `flat-garments.ts`. These local identifiers still require current provider/account verification before purchase activation. Unknown unit and shipping costs are explicitly null in catalog entries.

The existing `economics-report.ts` has hardcoded reference costs and an $8 production/$5 shipping fallback for unknown variants; its profit calculation omits shipping subsidy. It must not be treated as a newly verified authoritative margin report. Compute contribution as revenue minus verified production, shipping subsidy, payment fees, generation and support/reprint reserve. Unknown costs must fail launch approval. Include failed generations and included rerolls in acquisition cost. The $19/$10 digital offer remains a hypothesis until generation budget, entitlement, refunds and taxes are proven.

## Artwork and quality acceptance

Visually inspected local `public/landing/transformations/pet-original.webp`, `pet-cartoon.webp` and `public/samples/ginger-cat.jpg`. The beagle treatment preserves the source composition but is visibly posterized; describe it as a local art treatment, not proof of a new AI portrait. The ginger cat has CC0 provenance documented in `public/samples/README.md`. `lib/assets.ts` also contains remote generated sample URLs; those are not a substitute for inspected, locally approved premium campaign artwork.

Missing artwork: a curated set of distinct original royal/editorial/cinematic portraits, diverse cat/dog breeds and markings, and believable owner/pet combinations. Do not fill 24 gallery entries by relabeling one treatment. Label all samples honestly, and never imply customer testimonials or actual provider output without evidence.

Before accepting generated work: inspect subject count, recognizable face/markings/eyes, ears/paws/anatomy, composition, accidental text, and artifacts individually. Retain dimensions and provenance. Evaluate each approved print placement using effective DPI after crop/scale and required bleed/safe areas; reject unsupported sizes rather than implying that a small source becomes print-ready through display resizing. Production artwork must be unwatermarked and private until payment entitlement. Public previews must remain watermarked server-side.
