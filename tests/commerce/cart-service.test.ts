import { describe, expect, it } from 'vitest';
import { CommerceCartService } from '@/lib/commerce/cart-service';
import type {
  CartIdentity,
  CommerceCartStore,
  PersistentCart,
} from '@/lib/commerce/cart-service';
import type { CartConfigurationSnapshot } from '@/lib/commerce/types';
import { curatedDesigns, merchProducts } from '@/lib/commerce/fixtures';
import { createCartSnapshot } from '@/lib/commerce/local-cart';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';

class MemoryCartStore implements CommerceCartStore {
  carts: PersistentCart[] = [];
  items = new Map<string, CartConfigurationSnapshot[]>();
  nextCart = 1;

  async findActiveCartByUser(userId: string) {
    return this.carts.find((cart) => cart.userId === userId) ?? null;
  }

  async findActiveCartByGuest(guestTokenHash: string) {
    return (
      this.carts.find((cart) => cart.guestTokenHash === guestTokenHash) ?? null
    );
  }

  async createCart(identity: CartIdentity) {
    const cart = {
      id: `cart-${this.nextCart++}`,
      userId: identity.userId ?? null,
      guestTokenHash: identity.guestTokenHash,
    };
    this.carts.push(cart);
    this.items.set(cart.id, []);
    return cart;
  }

  async claimGuestCart(cartId: string, userId: string) {
    const cart = this.carts.find((candidate) => candidate.id === cartId);
    if (!cart) throw new Error('Missing cart');
    cart.userId = userId;
    cart.guestTokenHash = null;
    return cart;
  }

  async listItems(cartId: string) {
    return structuredClone(this.items.get(cartId) ?? []);
  }

  async findItem(cartId: string, itemId: string) {
    return (
      structuredClone(
        this.items.get(cartId)?.find((item) => item.id === itemId)
      ) ?? null
    );
  }

  async insertItem(cartId: string, snapshot: CartConfigurationSnapshot) {
    this.items.set(cartId, [
      ...(this.items.get(cartId) ?? []),
      structuredClone(snapshot),
    ]);
    return structuredClone(snapshot);
  }

  async updateItem(cartId: string, snapshot: CartConfigurationSnapshot) {
    this.items.set(
      cartId,
      (this.items.get(cartId) ?? []).map((item) =>
        item.id === snapshot.id ? structuredClone(snapshot) : item
      )
    );
    return structuredClone(snapshot);
  }

  async deleteItem(cartId: string, itemId: string) {
    this.items.set(
      cartId,
      (this.items.get(cartId) ?? []).filter((item) => item.id !== itemId)
    );
  }
}

function fixtureSnapshot() {
  const design = curatedDesigns[0];
  const product = merchProducts[0];
  return createCartSnapshot({
    id: 'local-item',
    configuration: createProductConfiguration({
      designId: design.id,
      design: design.asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    }),
    design,
    product,
    createdAt: '2026-07-29T12:00:00.000Z',
  });
}

describe('persistent commerce cart service', () => {
  it('restores a guest cart from the durable token identity', async () => {
    const store = new MemoryCartStore();
    const service = new CommerceCartService(
      store,
      () => '56ee753d-27cc-4374-bc9c-5d9bb27a245a'
    );
    const identity = { guestTokenHash: 'guest-token-hash' };

    const persisted = await service.upsertItem(identity, fixtureSnapshot());
    const restored = await service.getItems(identity);

    expect(restored).toEqual([persisted]);
    expect(store.carts).toHaveLength(1);
  });

  it('keeps existing authenticated carts compatible', async () => {
    const store = new MemoryCartStore();
    const authenticatedIdentity = {
      guestTokenHash: 'current-browser-token',
      userId: '8be820dd-e2ad-4b7f-8be0-e1a1d8de9676',
    };
    await store.createCart(authenticatedIdentity);
    const service = new CommerceCartService(store);

    const resolved = await service.resolveCart(authenticatedIdentity);

    expect(resolved.userId).toBe(authenticatedIdentity.userId);
    expect(store.carts).toHaveLength(1);
  });

  it('claims a restored guest cart when the shopper authenticates', async () => {
    const store = new MemoryCartStore();
    await store.createCart({ guestTokenHash: 'guest-before-sign-in' });
    const service = new CommerceCartService(store);

    const resolved = await service.resolveCart({
      guestTokenHash: 'guest-before-sign-in',
      userId: '8be820dd-e2ad-4b7f-8be0-e1a1d8de9676',
    });

    expect(resolved.userId).toBe(
      '8be820dd-e2ad-4b7f-8be0-e1a1d8de9676'
    );
    expect(resolved.guestTokenHash).toBeNull();
    expect(store.carts).toHaveLength(1);
  });
});
