import 'server-only';

import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { cartConfigurationSnapshotSchema } from './snapshot';
import type {
  CartIdentity,
  CommerceCartStore,
  PersistentCart,
} from './cart-service';
import type { CartConfigurationSnapshot } from './types';

const cartRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  guest_token_hash: z.string().nullable(),
});

const cartItemRowSchema = z.object({
  configuration_snapshot: z.unknown(),
});

interface DatabaseErrorShape {
  code?: string;
  message?: string;
}

export class CommercePersistenceError extends Error {
  readonly code: string;

  constructor(operation: string, error: DatabaseErrorShape) {
    super(`Commerce persistence failed during ${operation}.`);
    this.name = 'CommercePersistenceError';
    this.code = error.code ?? 'COMMERCE_DATABASE_ERROR';
  }
}

function assertPersistenceEnabled() {
  if (process.env.COMMERCE_PERSISTENCE_ENABLED !== 'true') {
    throw new CommercePersistenceError('persistence feature gate', {
      code: 'COMMERCE_PERSISTENCE_DISABLED',
    });
  }
}

function toPersistentCart(value: unknown): PersistentCart {
  const parsed = cartRowSchema.parse(value);
  return {
    id: parsed.id,
    userId: parsed.user_id,
    guestTokenHash: parsed.guest_token_hash,
  };
}

function toSnapshot(value: unknown): CartConfigurationSnapshot {
  const row = cartItemRowSchema.parse(value);
  return cartConfigurationSnapshotSchema.parse(row.configuration_snapshot);
}

function throwDatabaseError(operation: string, error: DatabaseErrorShape | null) {
  if (error) throw new CommercePersistenceError(operation, error);
}

export class SupabaseCommerceCartStore implements CommerceCartStore {
  private get client() {
    assertPersistenceEnabled();
    return getSupabaseAdminClient();
  }

  async findActiveCartByUser(userId: string) {
    const { data, error } = await this.client
      .from('carts')
      .select('id,user_id,guest_token_hash')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    throwDatabaseError('find authenticated cart', error);
    return data ? toPersistentCart(data) : null;
  }

  async findActiveCartByGuest(guestTokenHash: string) {
    const { data, error } = await this.client
      .from('carts')
      .select('id,user_id,guest_token_hash')
      .eq('guest_token_hash', guestTokenHash)
      .eq('status', 'active')
      .maybeSingle();
    throwDatabaseError('find guest cart', error);
    return data ? toPersistentCart(data) : null;
  }

  async createCart(identity: CartIdentity) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const { data, error } = await this.client
      .from('carts')
      .insert({
        user_id: identity.userId ?? null,
        guest_token_hash: identity.guestTokenHash,
        expires_at: expiresAt.toISOString(),
        status: 'active',
      })
      .select('id,user_id,guest_token_hash')
      .single();
    throwDatabaseError('create cart', error);
    return toPersistentCart(data);
  }

  async claimGuestCart(cartId: string, userId: string) {
    const { data, error } = await this.client
      .from('carts')
      .update({
        user_id: userId,
        guest_token_hash: null,
        expires_at: null,
      })
      .eq('id', cartId)
      .select('id,user_id,guest_token_hash')
      .single();
    throwDatabaseError('claim guest cart', error);
    return toPersistentCart(data);
  }

  async listItems(cartId: string) {
    const { data, error } = await this.client
      .from('cart_items')
      .select('configuration_snapshot')
      .eq('cart_id', cartId)
      .order('created_at', { ascending: true });
    throwDatabaseError('list cart items', error);
    return z.array(cartItemRowSchema).parse(data ?? []).map(toSnapshot);
  }

  async findItem(cartId: string, itemId: string) {
    const { data, error } = await this.client
      .from('cart_items')
      .select('configuration_snapshot')
      .eq('cart_id', cartId)
      .eq('id', itemId)
      .maybeSingle();
    throwDatabaseError('find cart item', error);
    return data ? toSnapshot(data) : null;
  }

  async insertItem(cartId: string, snapshot: CartConfigurationSnapshot) {
    const { data, error } = await this.client
      .from('cart_items')
      .insert({
        id: snapshot.id,
        cart_id: cartId,
        design_id: null,
        product_id: null,
        product_variant_id: null,
        quantity: snapshot.quantity,
        unit_price: snapshot.configuration.unitPrice,
        configuration_snapshot: snapshot,
        configuration_hash: snapshot.configurationHash,
        snapshot_schema_version: snapshot.schemaVersion,
        snapshot_created_at: snapshot.createdAt,
      })
      .select('configuration_snapshot')
      .single();
    throwDatabaseError('insert cart item', error);
    return toSnapshot(data);
  }

  async updateItem(cartId: string, snapshot: CartConfigurationSnapshot) {
    const { data, error } = await this.client
      .from('cart_items')
      .update({
        quantity: snapshot.quantity,
        unit_price: snapshot.configuration.unitPrice,
        configuration_snapshot: snapshot,
        configuration_hash: snapshot.configurationHash,
        snapshot_schema_version: snapshot.schemaVersion,
        snapshot_created_at: snapshot.createdAt,
      })
      .eq('cart_id', cartId)
      .eq('id', snapshot.id)
      .select('configuration_snapshot')
      .single();
    throwDatabaseError('update cart item', error);
    return toSnapshot(data);
  }

  async deleteItem(cartId: string, itemId: string) {
    const { error } = await this.client
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)
      .eq('id', itemId);
    throwDatabaseError('delete cart item', error);
  }
}
