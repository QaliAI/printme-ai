import { NextResponse } from 'next/server';
import {
  commerceAnalyticsPayloadSchema,
  hasDirectIdentifier,
} from '@/lib/commerce/analytics-events';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const parsed = commerceAnalyticsPayloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success || hasDirectIdentifier(parsed.data.properties)) {
    return NextResponse.json(
      { error: 'Invalid commerce analytics event.' },
      { status: 400 },
    );
  }

  const persistenceEnabled =
    process.env.COMMERCE_ANALYTICS_ENABLED === 'true';
  const adminConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (!persistenceEnabled || !adminConfigured) {
    return NextResponse.json(
      { accepted: true, persisted: false },
      { status: 202 },
    );
  }

  const { error } = await supabaseAdmin.from('analytics_events').insert({
    event_name: parsed.data.event,
    properties: parsed.data.properties,
  });
  if (error) {
    return NextResponse.json(
      { error: 'Unable to persist commerce analytics event.' },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { accepted: true, persisted: true },
    { status: 201 },
  );
}
