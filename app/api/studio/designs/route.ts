import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { getStudioActor } from '@/lib/studio/auth';
import {
  StudioPublishingError,
  studioDesignRepository,
} from '@/lib/studio/repository';

export async function GET(request: NextRequest) {
  const actor = await getStudioActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  try {
    return NextResponse.json({
      designs: await studioDesignRepository.list(),
    });
  } catch {
    return NextResponse.json(
      { error: 'Studio persistence is unavailable.' },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const actor = await getStudioActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  try {
    const design = await studioDesignRepository.create(
      await request.json(),
      actor.userId,
    );
    return NextResponse.json({ design }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Design data is incomplete.', issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof StudioPublishingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Studio design could not be saved.' },
      { status: 503 },
    );
  }
}
