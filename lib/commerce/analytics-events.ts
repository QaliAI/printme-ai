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
  ];
  return Object.keys(properties).some((key) =>
    blocked.some((term) => key.toLowerCase().includes(term)),
  );
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
    properties,
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
