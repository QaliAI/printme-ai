/**
 * AI photo styles depend on paid OpenAI image credits. When the account has
 * no credits (2026-10-12: `credit_balance_exhausted`), generation fails, so
 * the storefront must not advertise the feature. Turn it back on with
 * NEXT_PUBLIC_AI_STYLES_ENABLED=true once credits are restored.
 */
export const AI_STYLES_ENABLED = process.env.NEXT_PUBLIC_AI_STYLES_ENABLED === 'true';
