import type { NextRequest } from 'next/server';
import { handleLegacyGeneration } from '@/lib/ai/legacy-generation';
export const maxDuration = 120;
export function POST(request: NextRequest) { return handleLegacyGeneration(request); }
