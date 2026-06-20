import { supabaseAdmin } from './supabase';

export interface TrackEventParams {
  userId?: string | null;
  anonymousId?: string | null;
  eventName: string;
  properties?: Record<string, any>;
}

export async function trackEvent({
  userId,
  anonymousId,
  eventName,
  properties = {},
}: TrackEventParams) {
  try {
    // Sanitize properties to redact sensitive details (e.g. credentials, tokens, cards)
    const sanitizedProps = { ...properties };
    const sensitiveKeys = ['card', 'cvc', 'number', 'secret', 'key', 'password', 'token', 'cvv', 'pin'];
    
    for (const key of Object.keys(sanitizedProps)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitizedProps[key] = '[REDACTED]';
      }
    }

    const { error } = await supabaseAdmin.from('analytics_events').insert({
      user_id: userId || null,
      anonymous_id: anonymousId || null,
      event_name: eventName,
      properties: sanitizedProps,
    });

    if (error) {
      console.error('[Analytics] Failed to track event in database:', error);
    } else {
      console.log(`[Analytics] Event recorded: "${eventName}"`);
    }
  } catch (err) {
    console.error('[Analytics] Error recording event:', err);
  }
}
