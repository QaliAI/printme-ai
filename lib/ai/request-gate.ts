import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { ImageProviderError } from './image-provider';

const state = globalThis as typeof globalThis & { __imageGate?: { key: Buffer; requests: Map<string, { count: number; expires: number }> } };

export function guardImageRequest(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) throw new ImageProviderError('Refresh PrintMe and try again.', 'INVALID_ORIGIN', 403);
  state.__imageGate ??= { key: randomBytes(32), requests: new Map() };
  const gate = state.__imageGate;
  const now = Date.now();
  for (const [key, entry] of gate.requests) if (entry.expires <= now) gate.requests.delete(key);
  const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = createHmac('sha256', gate.key).update(client).digest('hex');
  const entry = gate.requests.get(key) ?? { count: 0, expires: now + 10 * 60_000 };
  if (entry.count >= 3 || gate.requests.size >= 10_000) throw new ImageProviderError('Please wait a few minutes before generating more artwork.', 'GENERATION_RATE_LIMIT', 429);
  entry.count++;
  gate.requests.set(key, entry);
}
