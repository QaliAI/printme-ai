import 'server-only';
import { PetGenerationError } from './schemas';

/** Physical checkout does not grant a digital portrait license. A future
 * entitlement ledger must verify server-owned paid order, asset, owner and holds.
 * No caller-supplied job/order identifier is evidence of purchase. */
export function requirePetDigitalEntitlement(): never {
  throw new PetGenerationError('DIGITAL_PURCHASE_UNAVAILABLE', 'Digital portrait purchases are not available yet. Unwatermarked downloads remain protected.', 403);
}
