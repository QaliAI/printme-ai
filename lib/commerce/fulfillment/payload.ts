import 'server-only';

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { cartConfigurationSnapshotSchema } from '../snapshot';
import { getApprovedMerchProduct } from '../catalog/approved-catalog';

const printifyImageSchema = z.object({
  src: z.string().url(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().positive(),
  angle: z.number().min(-360).max(360),
});

export const printifyFulfillmentPayloadSchema = z.object({
  external_id: z.string().uuid(),
  label: z.string().min(1),
  line_items: z
    .array(
      z.object({
        print_provider_id: z.number().int().positive(),
        blueprint_id: z.number().int().positive(),
        variant_id: z.number().int().positive(),
        print_areas: z.record(
          z.string(),
          z.array(printifyImageSchema).min(1),
        ),
        quantity: z.number().int().positive(),
        external_id: z.string().min(1),
      }),
    )
    .min(1),
  shipping_method: z.number().int().positive(),
  send_shipping_notification: z.literal(false),
  address_to: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string(),
    country: z.string().length(2),
    region: z.string(),
    address1: z.string().min(1),
    address2: z.string(),
    city: z.string().min(1),
    zip: z.string().min(1),
  }),
});

export type PrintifyFulfillmentPayload = z.infer<
  typeof printifyFulfillmentPayloadSchema
>;

export const fulfillmentOrderSchema = z.object({
  id: z.string().uuid(),
  paymentStatus: z.literal('paid'),
  customerEmail: z.string().email(),
  shippingAddress: z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().nullable().optional(),
    city: z.string().min(1),
    state: z.string().nullable().optional(),
    postal_code: z.string().min(1),
    country: z.string().length(2),
    phone: z.string().optional().default(''),
  }),
  items: z.array(cartConfigurationSnapshotSchema).min(1),
  printifyOrderId: z.string().nullable(),
  productionSubmittedAt: z.string().nullable(),
});

export type FulfillmentOrder = z.infer<typeof fulfillmentOrderSchema>;

export class FulfillmentValidationError extends Error {
  constructor(readonly code: string, message?: string) {
    super(message ?? `Fulfillment validation failed: ${code}.`);
    this.name = 'FulfillmentValidationError';
  }
}

function splitRecipientName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) {
    return { firstName: parts[0], lastName: 'Customer' };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.at(-1)!,
  };
}

function requireProductionAsset(value: string) {
  let asset: URL;
  try {
    asset = new URL(value);
  } catch {
    throw new FulfillmentValidationError('MISSING_PRODUCTION_ARTWORK');
  }
  if (asset.protocol !== 'https:') {
    throw new FulfillmentValidationError('UNSAFE_PRODUCTION_ARTWORK');
  }
  return asset.toString();
}

export function buildPrintifyFulfillmentPayload(
  input: FulfillmentOrder,
): PrintifyFulfillmentPayload {
  const parsed = fulfillmentOrderSchema.safeParse(input);
  if (!parsed.success) {
    throw new FulfillmentValidationError('INVALID_ORDER_DATA');
  }
  const order = parsed.data;
  const name = splitRecipientName(order.shippingAddress.name);
  const payload: PrintifyFulfillmentPayload = {
    external_id: order.id,
    label: `PrintMe ${order.id.slice(0, 8)}`,
    line_items: order.items.map((item) => {
      const configuration = item.configuration;
      const product = getApprovedMerchProduct(
        configuration.merchProductId,
      );
      const variant = product.variants.find(
        (candidate) =>
          candidate.printifyVariantId ===
          configuration.printifyVariantId,
      );
      if (
        !variant ||
        product.printifyBlueprintId !== configuration.printifyBlueprintId ||
        product.provider.printifyProviderId !==
          configuration.printifyProviderId
      ) {
        throw new FulfillmentValidationError(
          'INVALID_PRODUCT_MAPPING',
        );
      }
      const placement = variant.placeholders.find(
        (candidate) =>
          candidate.position === configuration.printPosition &&
          candidate.decorationMethod ===
            configuration.decorationMethod,
      );
      if (!placement) {
        throw new FulfillmentValidationError('INVALID_PLACEMENT');
      }
      const asset = requireProductionAsset(
        configuration.productionAssetUrl,
      );
      return {
        print_provider_id: configuration.printifyProviderId,
        blueprint_id: configuration.printifyBlueprintId,
        variant_id: configuration.printifyVariantId,
        print_areas: {
          [configuration.printPosition]: [
            {
              src: asset,
              x: configuration.normalizedX,
              y: configuration.normalizedY,
              scale: configuration.normalizedScale,
              angle: configuration.angle,
            },
          ],
        },
        quantity: item.quantity,
        external_id: item.id,
      };
    }),
    shipping_method: 1,
    send_shipping_notification: false,
    address_to: {
      first_name: name.firstName,
      last_name: name.lastName,
      email: order.customerEmail,
      phone: order.shippingAddress.phone,
      country: order.shippingAddress.country,
      region: order.shippingAddress.state ?? '',
      address1: order.shippingAddress.line1,
      address2: order.shippingAddress.line2 ?? '',
      city: order.shippingAddress.city,
      zip: order.shippingAddress.postal_code,
    },
  };
  return printifyFulfillmentPayloadSchema.parse(payload);
}

export function hashFulfillmentPayload(payload: PrintifyFulfillmentPayload) {
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

export function redactFulfillmentPayload(
  payload: PrintifyFulfillmentPayload,
) {
  return {
    ...structuredClone(payload),
    address_to: {
      first_name: '[redacted]',
      last_name: '[redacted]',
      email: '[redacted]',
      phone: '[redacted]',
      address1: '[redacted]',
      address2: '[redacted]',
      city: '[redacted]',
      zip: '[redacted]',
      country: payload.address_to.country,
      region: payload.address_to.region,
    },
  };
}
