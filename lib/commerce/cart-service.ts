import { cartConfigurationSnapshotSchema, finalizeConfigurationSnapshot } from './snapshot';
import type { CartConfigurationSnapshot } from './types';

export interface CartIdentity {
  guestTokenHash: string;
  userId?: string;
}

export interface PersistentCart {
  id: string;
  userId: string | null;
  guestTokenHash: string | null;
}

export interface CommerceCartStore {
  findActiveCartByUser(userId: string): Promise<PersistentCart | null>;
  findActiveCartByGuest(
    guestTokenHash: string
  ): Promise<PersistentCart | null>;
  createCart(identity: CartIdentity): Promise<PersistentCart>;
  claimGuestCart(cartId: string, userId: string): Promise<PersistentCart>;
  listItems(cartId: string): Promise<CartConfigurationSnapshot[]>;
  findItem(
    cartId: string,
    itemId: string
  ): Promise<CartConfigurationSnapshot | null>;
  insertItem(
    cartId: string,
    snapshot: CartConfigurationSnapshot
  ): Promise<CartConfigurationSnapshot>;
  updateItem(
    cartId: string,
    snapshot: CartConfigurationSnapshot
  ): Promise<CartConfigurationSnapshot>;
  deleteItem(cartId: string, itemId: string): Promise<void>;
}

export class CommerceCartService {
  constructor(
    private readonly store: CommerceCartStore,
    private readonly createId: () => string = () => crypto.randomUUID()
  ) {}

  async resolveCart(identity: CartIdentity): Promise<PersistentCart> {
    if (identity.userId) {
      const authenticatedCart = await this.store.findActiveCartByUser(
        identity.userId
      );
      if (authenticatedCart) return authenticatedCart;
    }

    const guestCart = await this.store.findActiveCartByGuest(
      identity.guestTokenHash
    );
    if (guestCart && identity.userId) {
      return this.store.claimGuestCart(guestCart.id, identity.userId);
    }
    if (guestCart) return guestCart;

    return this.store.createCart(identity);
  }

  async getItems(identity: CartIdentity) {
    const cart = await this.resolveCart(identity);
    return this.store.listItems(cart.id);
  }

  async upsertItem(
    identity: CartIdentity,
    input: unknown
  ): Promise<CartConfigurationSnapshot> {
    const submitted = cartConfigurationSnapshotSchema.parse(input);
    const cart = await this.resolveCart(identity);
    const existing = await this.store.findItem(cart.id, submitted.id);

    if (existing) {
      return this.store.updateItem(cart.id, structuredClone(submitted));
    }

    const persisted = finalizeConfigurationSnapshot({
      ...submitted,
      id: this.createId(),
    });
    return this.store.insertItem(cart.id, persisted);
  }

  async removeItem(identity: CartIdentity, itemId: string): Promise<void> {
    const cart = await this.resolveCart(identity);
    await this.store.deleteItem(cart.id, itemId);
  }
}
