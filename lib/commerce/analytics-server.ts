import 'server-only';

import { trackEvent } from '@/lib/analytics';
import {
  commerceAnalyticsEventSchema,
  hasDirectIdentifier,
  type CommerceAnalyticsEvent,
} from './analytics-events';

export async function trackServerCommerceEvent(
  event: CommerceAnalyticsEvent,
  properties: Record<string, string | number | boolean | null> = {},
) {
  if (
    process.env.COMMERCE_ANALYTICS_ENABLED !== 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !commerceAnalyticsEventSchema.safeParse(event).success ||
    hasDirectIdentifier(properties)
  ) {
    return;
  }
  await trackEvent({ eventName: event, properties });
}
