import { requirePetDigitalEntitlement } from '@/lib/pets/download';
import { petErrorResponse } from '@/lib/pets/server';

export async function GET() {
  try { requirePetDigitalEntitlement(); } catch (error) { return petErrorResponse(error); }
}
