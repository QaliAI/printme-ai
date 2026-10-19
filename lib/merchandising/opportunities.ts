import { z } from 'zod';

/**
 * Merchandising opportunity queue: internal research that decides what
 * PrintMe designs next. It never feeds the storefront directly — a design is
 * only published after its opportunity is approved and the artwork passes QA.
 *
 * Evidence discipline: every signal records where it came from and how it was
 * verified, so item-level marketplace proof is never mixed up with keywords,
 * forecasts, shop-wide totals or a seller's own marketing.
 *
 * The handoff fields (originalConceptBrief, riskLevel, evidenceUrls) match the
 * Trend Radar integration plan (QaliAI/printme-trends-dashboard,
 * docs/INTEGRATION_PLAN.md, phase 5), so its output can join this queue later.
 */

export const opportunityStatuses = ['researching', 'proposed', 'approved', 'in-design', 'published', 'rejected'] as const;

const signalSchema = z.object({
  platform: z.enum(['etsy', 'amazon', 'redbubble', 'teepublic', 'tiktok', 'web-search']),
  url: z.string().url(),
  listingId: z.string().optional(),
  snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /**
   * - listing-observed: read on the item page itself (badges, item reviews, favourites).
   * - search-snippet: only seen in a search result; the page was not opened or was blocked.
   * - shop-wide: totals for the whole shop, not this item.
   * - seller-claim: the seller's own wording (e.g. "best seller" in a title).
   * - keyword: search or tag presence, no sales signal.
   */
  verification: z.enum(['listing-observed', 'search-snippet', 'shop-wide', 'seller-claim', 'keyword']),
  summary: z.string().min(10),
  highSalesBadge: z.boolean().optional(),
  itemReviews: z.number().int().nonnegative().optional(),
  rating: z.number().min(0).max(5).optional(),
  favorites: z.number().int().nonnegative().optional(),
  priceUsd: z.tuple([z.number().nonnegative(), z.number().nonnegative()]).optional(),
});

export const opportunitySchema = z.object({
  id: z.string().regex(/^opp-[a-z0-9-]+$/),
  title: z.string(),
  category: z.enum(['funny-animal', 'personalized-pet', 'retro-horror', 'seasonal-humor', 'group-merch', 'niche-humor', 'brand']),
  status: z.enum(opportunityStatuses),
  decision: z
    .object({ by: z.string(), at: z.string(), note: z.string() })
    .optional(),
  persona: z.string(),
  hook: z.string(),
  signals: z.array(signalSchema).min(1),
  demandConfidence: z.enum(['high', 'medium', 'low']),
  demandRationale: z.string(),
  competition: z.object({ level: z.enum(['low', 'medium', 'high', 'saturated']), notes: z.string() }),
  designOpportunities: z.array(z.string()),
  originalConceptBrief: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high', 'blocked']),
  rightsNotes: z.string(),
  productIds: z.array(z.enum(['everyday-tee', 'gallery-poster', 'keepsake-mug', 'cozy-crewneck', 'heavy-hoodie'])),
  productNotes: z.string(),
  unitEconomics: z.object({
    retailPriceCents: z.number().int().positive(),
    unitCostCents: z.number().int().positive().nullable(),
    notes: z.string(),
  }),
  designIds: z.array(z.string()),
  /** Where a non-catalog opportunity (e.g. a personalization tool) is live. */
  liveSurface: z.string().optional(),
});

export type MerchOpportunity = z.infer<typeof opportunitySchema>;
export type OpportunitySignal = z.infer<typeof signalSchema>;

/** Only item-level, observed signals count as demand proof. */
export const isDemandProof = (signal: OpportunitySignal) =>
  signal.verification === 'listing-observed' && (signal.highSalesBadge === true || (signal.itemReviews ?? 0) >= 20);
