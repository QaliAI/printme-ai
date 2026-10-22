import { z } from 'zod';
import { getPetStyle } from './styles';

export const PETS_MAX_BODY_BYTES = 3_100_000;
export const petGenerationRequestSchema = z.object({
  requestId: z.string().uuid(),
  styleId: z.string().max(80).refine(id => Boolean(getPetStyle(id)), 'Choose an available portrait style.'),
  petName: z.string().trim().max(60).optional(),
  caption: z.string().trim().max(100).optional(),
  subjectCount: z.number().int().min(1).max(4),
  references: z.array(z.object({
    dataUrl: z.string().max(750_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
    role: z.enum(['pet', 'person']).default('pet'),
    label: z.string().trim().max(40).optional(),
  }).strict()).min(1).max(4),
}).strict()
  .refine(value => value.references.some(reference => reference.role === 'pet'), 'Include at least one pet photo.')
  .refine(value => value.subjectCount === value.references.length, 'Provide one reference photo for each subject.');

export type PetGenerationRequest = z.infer<typeof petGenerationRequestSchema>;
export type PetJobStatus = 'reserved' | 'completed' | 'failed' | 'uncertain';
export type PetJob = {
  id: string;
  status: PetJobStatus;
  owner_hash: string;
  request_hash: string;
  original_path: string | null;
  preview_path: string | null;
  provider_request_id: string | null;
};
export class PetGenerationError extends Error {
  constructor(readonly code: string, message: string, readonly status = 503) { super(message); }
}
