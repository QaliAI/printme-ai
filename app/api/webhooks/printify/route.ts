import { type NextRequest, NextResponse } from 'next/server';
import {
  printifyWebhookEventSchema,
  PrintifyWebhookService,
  verifyPrintifyWebhookPayload,
} from '@/lib/commerce/webhooks/printify';
import { SupabasePrintifyWebhookStore } from '@/lib/commerce/webhooks/supabase-printify-store';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-pfy-signature');
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json(
      { error: 'Missing Printify webhook authentication.' },
      { status: 401 },
    );
  }

  const rawBody = await request.text();
  if (!verifyPrintifyWebhookPayload(rawBody, signature, secret)) {
    return NextResponse.json(
      { error: 'Invalid Printify signature.' },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Malformed Printify payload.' },
      { status: 400 },
    );
  }
  const event = printifyWebhookEventSchema.safeParse(payload);
  if (!event.success) {
    return NextResponse.json(
      { error: 'Malformed Printify payload.' },
      { status: 400 },
    );
  }

  try {
    const result = await new PrintifyWebhookService(
      new SupabasePrintifyWebhookStore(),
    ).process(event.data);
    return NextResponse.json({
      received: true,
      duplicate: result.duplicate,
      outcome: result.outcome,
    });
  } catch {
    return NextResponse.json(
      { error: 'Printify event processing failed.' },
      { status: 500 },
    );
  }
}
