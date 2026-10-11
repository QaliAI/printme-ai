import { z } from 'zod';

export const commerceAnalyticsEvents = [
  'design_view',
  'design_selected',
  'upload_started',
  'upload_completed',
  'preparation_selected',
  'preview_generated',
  'official_mockup_ready',
  'product_changed',
  'variant_changed',
  'placement_changed',
  'quality_warning_seen',
  'add_to_cart',
  'upsell_viewed',
  'upsell_added',
  'begin_checkout',
  'purchase',
  'fulfillment_failed',
  'reprint_requested',
  'bundle_view',
  'bundle_added',
  'session_started',
] as const;

export const commerceAnalyticsEventSchema = z.enum(
  commerceAnalyticsEvents,
);
export type CommerceAnalyticsEvent = z.infer<
  typeof commerceAnalyticsEventSchema
>;

const propertyValueSchema = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const commerceAnalyticsPayloadSchema = z.object({
  event: commerceAnalyticsEventSchema,
  properties: z
    .record(z.string().min(1).max(50), propertyValueSchema)
    .default({}),
});

export function hasDirectIdentifier(properties: Record<string, unknown>) {
  const blocked = [
    'email',
    'phone',
    'name',
    'address',
    'card',
    'password',
    'secret',
    'token',
    'prompt',
    'imageurl',
    'customerid',
    'userid',
  ];
  return Object.values(properties).some(value => typeof value === 'string' && /@|https?:\/\/|data:image|\b\d{3}[- .]\d{3}[- .]\d{4}\b/.test(value)) || Object.keys(properties).some((key) =>
    blocked.some((term) => key.toLowerCase().includes(term)),
  );
}

export function classifyAcquisition(url: URL, referrer = '') {
  const allowed: Record<string, string[]> = {
    utm_source: ['google', 'bing', 'instagram', 'facebook', 'tiktok', 'pinterest', 'newsletter', 'printme'],
    utm_medium: ['organic', 'social', 'email', 'cpc', 'paid-social', 'referral'],
    utm_campaign: ['halloween-2026', 'fall-2026', 'thanksgiving-2026'],
  };
  const values: Record<string, string> = {};
  for (const [key, list] of Object.entries(allowed)) {
    const raw = url.searchParams.get(key)?.toLowerCase();
    if (raw) values[key] = list.includes(raw) ? raw : 'other';
  }
  let referrerClass = 'direct';
  try {
    const host = new URL(referrer).hostname;
    referrerClass = host === url.hostname ? 'internal' : /(^|\.)(google|bing)\./.test(host) ? 'search'
      : /(^|\.)(instagram|facebook|tiktok|pinterest)\./.test(host) ? 'social' : 'referral';
  } catch { /* No referrer is normal. */ }
  const section = url.pathname.split('/')[1];
  return { ...values, referrer_class: referrerClass, landing_path: ['', 'halloween', 'create', 'shop-v2', 'designs', 'products', 'collections', 'drops'].includes(section) ? `/${section}` : '/other' };
}

function acquisitionProperties() {
  try {
    const saved = window.sessionStorage.getItem('printme:acquisition:v1');
    const props = saved ? JSON.parse(saved) : classifyAcquisition(new URL(window.location.href), document.referrer);
    if (!saved) window.sessionStorage.setItem('printme:acquisition:v1', JSON.stringify(props));
    return props as Record<string, string>;
  } catch { return classifyAcquisition(new URL(window.location.href), document.referrer); }
}

export function trackCommerceEvent(
  event: CommerceAnalyticsEvent,
  properties: Record<
    string,
    string | number | boolean | null
  > = {},
) {
  if (typeof window === 'undefined') return;
  const payload = commerceAnalyticsPayloadSchema.safeParse({
    event,
    properties: { ...properties, ...acquisitionProperties() },
  });
  if (!payload.success || hasDirectIdentifier(payload.data.properties)) {
    return;
  }
  void fetch('/api/commerce/analytics', {
    method: 'POST',
    credentials: 'same-origin',
    keepalive: true,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload.data),
  }).catch(() => undefined);
}
