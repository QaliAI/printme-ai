import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getStudioActor } from '@/lib/studio/auth';
import {
  StudioPublishingError,
  studioDesignRepository,
} from '@/lib/studio/repository';

const actionSchema = z.object({
  action: z.literal('archive'),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getStudioActor(request);
  if (!actor) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    actionSchema.parse(await request.json());
    return NextResponse.json({
      design: await studioDesignRepository.archive(id, actor.userId),
    });
  } catch (error) {
    const status =
      error instanceof StudioPublishingError &&
      error.code === 'DESIGN_NOT_FOUND'
        ? 404
        : 400;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Studio archive failed.',
      },
      { status },
    );
  }
}
