import { NextResponse, type NextRequest } from 'next/server';
import { getStudioActor } from '@/lib/studio/auth';

export async function GET(request: NextRequest) {
  const actor = await getStudioActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  return NextResponse.json({ actor });
}
