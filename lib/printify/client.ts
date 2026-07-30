import 'server-only';

import { z } from 'zod';

const DEFAULT_API_BASE = 'https://api.printify.com/v1';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_GET_RETRIES = 2;
const DEFAULT_USER_AGENT = 'PrintMe.ai/1.0 (+https://printme.ai)';

const idSchema = z.number().int().positive();
const currencySchema = z.string().length(3);

export const printifyShopSchema = z
  .object({
    id: idSchema,
    title: z.string(),
    sales_channel: z.string(),
  })
  .passthrough();

export const printifyBlueprintSchema = z
  .object({
    id: idSchema,
    title: z.string(),
    description: z.string().optional().default(''),
    brand: z.string().optional().default(''),
    model: z.string().optional().default(''),
    images: z.array(z.string().url()).optional().default([]),
  })
  .passthrough();

const printifyLocationSchema = z
  .object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    zip: z.string().optional(),
  })
  .passthrough();

export const printifyProviderSchema = z
  .object({
    id: idSchema,
    title: z.string(),
    location: printifyLocationSchema.optional(),
    decoration_methods: z.array(z.string()).optional().default([]),
  })
  .passthrough();

export const printifyPlaceholderSchema = z
  .object({
    position: z.string().min(1),
    decoration_method: z.string().optional(),
    height: z.number().int().positive(),
    width: z.number().int().positive(),
  })
  .passthrough();

export const printifyCatalogVariantSchema = z
  .object({
    id: idSchema,
    title: z.string(),
    options: z.record(z.string(), z.string()).optional().default({}),
    placeholders: z.array(printifyPlaceholderSchema).optional().default([]),
  })
  .passthrough();

export const printifyProviderVariantsSchema = z
  .object({
    id: idSchema.optional(),
    title: z.string().optional(),
    variants: z.array(printifyCatalogVariantSchema),
  })
  .passthrough();

const printifyMoneySchema = z
  .object({
    cost: z.number().int().nonnegative(),
    currency: currencySchema,
  })
  .passthrough();

export const printifyShippingSchema = z
  .object({
    handling_time: z
      .object({
        value: z.number().nonnegative(),
        unit: z.string(),
      })
      .passthrough(),
    profiles: z.array(
      z
        .object({
          variant_ids: z.array(idSchema),
          first_item: printifyMoneySchema,
          additional_items: printifyMoneySchema,
          countries: z.array(z.string()),
        })
        .passthrough()
    ),
  })
  .passthrough();

export const printifyUploadedImageSchema = z
  .object({
    id: z.string().min(1),
    file_name: z.string(),
    height: z.number().int().positive(),
    width: z.number().int().positive(),
    size: z.number().int().nonnegative(),
    mime_type: z.string(),
    preview_url: z.string().url(),
    upload_time: z.string(),
  })
  .passthrough();

export const printifyPlacementImageSchema = z.object({
  id: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().positive(),
  angle: z.number().min(-360).max(360),
});

export const printifyCreateProductSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  blueprint_id: idSchema,
  print_provider_id: idSchema,
  variants: z
    .array(
      z.object({
        id: idSchema,
        price: z.number().int().nonnegative(),
        is_enabled: z.boolean(),
      })
    )
    .min(1),
  print_areas: z
    .array(
      z.object({
        variant_ids: z.array(idSchema).min(1),
        placeholders: z
          .array(
            z.object({
              position: z.string().min(1),
              decoration_method: z.string().optional(),
              images: z.array(printifyPlacementImageSchema).min(1),
            })
          )
          .min(1),
      })
    )
    .min(1),
  tags: z.array(z.string()).optional(),
});

export const printifyMockupImageSchema = z
  .object({
    src: z.string().url(),
    variant_ids: z.array(idSchema),
    position: z.string(),
    is_default: z.boolean(),
  })
  .passthrough();

const printifyProductVariantSchema = z
  .object({
    id: idSchema,
    price: z.number().int().nonnegative(),
    title: z.string().optional(),
    is_enabled: z.boolean(),
    is_default: z.boolean().optional(),
  })
  .passthrough();

export const printifyProductSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    description: z.string().optional().default(''),
    blueprint_id: idSchema,
    print_provider_id: idSchema,
    variants: z.array(printifyProductVariantSchema).optional().default([]),
    images: z.array(printifyMockupImageSchema).optional().default([]),
  })
  .passthrough();

export const printifyAddressSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  country: z.string().length(2),
  region: z.string(),
  address1: z.string().min(1),
  address2: z.string().optional().default(''),
  city: z.string().min(1),
  zip: z.string().min(1),
});

export const printifyCreateOrderSchema = z.object({
  external_id: z.string().min(1),
  label: z.string().optional(),
  line_items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        variant_id: idSchema,
        quantity: z.number().int().positive(),
        external_id: z.string().optional(),
      })
    )
    .min(1),
  shipping_method: z.number().int().min(1).max(4),
  send_shipping_notification: z.boolean().optional().default(false),
  address_to: printifyAddressSchema,
});

export const printifyOrderSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().optional().default('pending'),
    external_id: z.string().optional(),
  })
  .passthrough();

const printifyMutationResponseSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough()
  .nullable();

export type PrintifyShop = z.infer<typeof printifyShopSchema>;
export type PrintifyBlueprint = z.infer<typeof printifyBlueprintSchema>;
export type PrintifyProvider = z.infer<typeof printifyProviderSchema>;
export type PrintifyPlaceholder = z.infer<typeof printifyPlaceholderSchema>;
export type PrintifyCatalogVariant = z.infer<typeof printifyCatalogVariantSchema>;
export type PrintifyProviderVariants = z.infer<typeof printifyProviderVariantsSchema>;
export type PrintifyShipping = z.infer<typeof printifyShippingSchema>;
export type PrintifyUploadedImage = z.infer<typeof printifyUploadedImageSchema>;
export type PrintifyCreateProductInput = z.input<typeof printifyCreateProductSchema>;
export type PrintifyProduct = z.infer<typeof printifyProductSchema>;
export type PrintifyMockupImage = z.infer<typeof printifyMockupImageSchema>;
export type PrintifyCreateOrderInput = z.input<typeof printifyCreateOrderSchema>;
export type PrintifyOrder = z.infer<typeof printifyOrderSchema>;

export interface PrintifyClientConfig {
  apiToken: string;
  shopId?: string;
  apiBaseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
  maxGetRetries?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

interface RequestOptions<TSchema extends z.ZodType> {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  schema: TSchema;
}

interface PrintifyErrorBody {
  code?: string | number;
  message?: string;
  errors?: unknown;
}

export class PrintifyApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly method: string;
  readonly path: string;
  readonly retryAfterMs?: number;
  readonly details?: unknown;

  constructor(input: {
    message: string;
    status: number;
    code: string;
    method: string;
    path: string;
    retryAfterMs?: number;
    details?: unknown;
  }) {
    super(input.message);
    this.name = 'PrintifyApiError';
    this.status = input.status;
    this.code = input.code;
    this.method = input.method;
    this.path = input.path;
    this.retryAfterMs = input.retryAfterMs;
    this.details = input.details;
  }
}

function getRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) return undefined;
  return Math.max(0, dateMs - Date.now());
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function safeJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 500) };
  }
}

export class PrintifyClient {
  private readonly apiToken: string;
  private readonly shopId?: string;
  private readonly apiBaseUrl: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly maxGetRetries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(config: PrintifyClientConfig) {
    this.apiToken = config.apiToken;
    this.shopId = config.shopId;
    this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/$/, '');
    this.userAgent = config.userAgent ?? DEFAULT_USER_AGENT;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxGetRetries = config.maxGetRetries ?? DEFAULT_GET_RETRIES;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.sleep = config.sleep ?? defaultSleep;
  }

  private requireToken() {
    if (!this.apiToken) {
      throw new PrintifyApiError({
        message: 'Printify API token is not configured.',
        status: 500,
        code: 'PRINTIFY_NOT_CONFIGURED',
        method: 'CONFIG',
        path: '',
      });
    }
  }

  private requireShopId() {
    if (!this.shopId) {
      throw new PrintifyApiError({
        message: 'Printify shop ID is not configured.',
        status: 500,
        code: 'PRINTIFY_SHOP_NOT_CONFIGURED',
        method: 'CONFIG',
        path: '',
      });
    }
    return this.shopId;
  }

  private async request<TSchema extends z.ZodType>(
    path: string,
    options: RequestOptions<TSchema>
  ): Promise<z.output<TSchema>> {
    this.requireToken();
    const method = options.method ?? 'GET';
    const attempts = method === 'GET' ? this.maxGetRetries + 1 : 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent,
          },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: controller.signal,
        });

        const responseText = await response.text();
        const responseBody = safeJson(responseText);

        if (!response.ok) {
          const parsedError = z
            .object({
              code: z.union([z.string(), z.number()]).optional(),
              message: z.string().optional(),
              errors: z.unknown().optional(),
            })
            .passthrough()
            .safeParse(responseBody);
          const errorBody: PrintifyErrorBody = parsedError.success
            ? parsedError.data
            : {};
          const retryAfterMs = getRetryAfterMs(response.headers.get('retry-after'));
          const retryable =
            method === 'GET' &&
            (response.status === 429 || response.status === 502 || response.status === 503);

          if (retryable && attempt + 1 < attempts) {
            const backoffMs = Math.min(
              retryAfterMs ?? 250 * 2 ** attempt,
              2_000
            );
            await this.sleep(backoffMs);
            continue;
          }

          throw new PrintifyApiError({
            message:
              errorBody.message ??
              `Printify request failed with HTTP ${response.status}.`,
            status: response.status,
            code: String(errorBody.code ?? `HTTP_${response.status}`),
            method,
            path,
            retryAfterMs,
            details: errorBody.errors,
          });
        }

        const parsed = options.schema.safeParse(responseBody);
        if (!parsed.success) {
          throw new PrintifyApiError({
            message: 'Printify response did not match the expected contract.',
            status: 502,
            code: 'RESPONSE_VALIDATION_FAILED',
            method,
            path,
            details: parsed.error.issues,
          });
        }
        return parsed.data;
      } catch (error) {
        if (error instanceof PrintifyApiError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
          throw new PrintifyApiError({
            message: `Printify request timed out after ${this.timeoutMs}ms.`,
            status: 504,
            code: 'REQUEST_TIMEOUT',
            method,
            path,
          });
        }
        throw new PrintifyApiError({
          message: 'Printify request failed before receiving a response.',
          status: 502,
          code: 'NETWORK_ERROR',
          method,
          path,
          details: error instanceof Error ? error.message : undefined,
        });
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new PrintifyApiError({
      message: 'Printify request exhausted its retry policy.',
      status: 502,
      code: 'RETRY_EXHAUSTED',
      method,
      path,
    });
  }

  async listShops(): Promise<PrintifyShop[]> {
    return this.request('/shops.json', {
      schema: z.array(printifyShopSchema),
    });
  }

  async validateConfiguredShop(): Promise<PrintifyShop> {
    const shopId = this.requireShopId();
    const shops = await this.listShops();
    const shop = shops.find((candidate) => String(candidate.id) === shopId);
    if (!shop) {
      throw new PrintifyApiError({
        message: 'The configured Printify shop is not available to this token.',
        status: 404,
        code: 'CONFIGURED_SHOP_NOT_FOUND',
        method: 'GET',
        path: '/shops.json',
      });
    }
    return shop;
  }

  async listBlueprints(): Promise<PrintifyBlueprint[]> {
    return this.request('/catalog/blueprints.json', {
      schema: z.array(printifyBlueprintSchema),
    });
  }

  async getBlueprint(blueprintId: number): Promise<PrintifyBlueprint> {
    return this.request(`/catalog/blueprints/${blueprintId}.json`, {
      schema: printifyBlueprintSchema,
    });
  }

  async listPrintProviders(blueprintId: number): Promise<PrintifyProvider[]> {
    return this.request(
      `/catalog/blueprints/${blueprintId}/print_providers.json`,
      { schema: z.array(printifyProviderSchema) }
    );
  }

  async getProviderVariants(
    blueprintId: number,
    providerId: number,
    includeOutOfStock = false
  ): Promise<PrintifyProviderVariants> {
    const query = includeOutOfStock ? '?show-out-of-stock=1' : '';
    return this.request(
      `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json${query}`,
      { schema: printifyProviderVariantsSchema }
    );
  }

  async getShippingInformation(
    blueprintId: number,
    providerId: number
  ): Promise<PrintifyShipping> {
    return this.request(
      `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/shipping.json`,
      { schema: printifyShippingSchema }
    );
  }

  async uploadImage(input: {
    fileName: string;
    url?: string;
    contents?: string;
  }): Promise<PrintifyUploadedImage> {
    const payload = z
      .object({
        file_name: z.string().min(1),
        url: z.string().url().optional(),
        contents: z.string().min(1).optional(),
      })
      .refine((value) => Boolean(value.url) !== Boolean(value.contents), {
        message: 'Provide exactly one of url or contents.',
      })
      .parse({
        file_name: input.fileName,
        url: input.url,
        contents: input.contents,
      });

    return this.request('/uploads/images.json', {
      method: 'POST',
      body: payload,
      schema: printifyUploadedImageSchema,
    });
  }

  async createProduct(input: PrintifyCreateProductInput): Promise<PrintifyProduct> {
    const payload = printifyCreateProductSchema.parse(input);
    return this.request(`/shops/${this.requireShopId()}/products.json`, {
      method: 'POST',
      body: payload,
      schema: printifyProductSchema,
    });
  }

  async getProduct(productId: string): Promise<PrintifyProduct> {
    return this.request(
      `/shops/${this.requireShopId()}/products/${encodeURIComponent(productId)}.json`,
      { schema: printifyProductSchema }
    );
  }

  async getProductMockupImages(productId: string): Promise<PrintifyMockupImage[]> {
    const product = await this.getProduct(productId);
    return product.images;
  }

  async deleteProduct(productId: string) {
    return this.request(
      `/shops/${this.requireShopId()}/products/${encodeURIComponent(productId)}.json`,
      {
        method: 'DELETE',
        schema: printifyMutationResponseSchema,
      }
    );
  }

  async createOrder(input: PrintifyCreateOrderInput): Promise<PrintifyOrder> {
    const payload = printifyCreateOrderSchema.parse(input);
    return this.request(`/shops/${this.requireShopId()}/orders.json`, {
      method: 'POST',
      body: payload,
      schema: printifyOrderSchema,
    });
  }

  async sendOrderToProduction(orderId: string) {
    return this.request(
      `/shops/${this.requireShopId()}/orders/${encodeURIComponent(orderId)}/send_to_production.json`,
      {
        method: 'POST',
        schema: printifyMutationResponseSchema,
      }
    );
  }

  /**
   * Compatibility method for the existing paid-order webhook.
   * The input is validated before either non-idempotent request is attempted.
   */
  async submitOrder(input: unknown): Promise<PrintifyOrder> {
    const payload = printifyCreateOrderSchema.parse(input);
    const order = await this.createOrder(payload);
    await this.sendOrderToProduction(order.id);
    return order;
  }
}

export function getPrintifyClient(): PrintifyClient {
  return new PrintifyClient({
    apiToken: process.env.PRINTIFY_API_TOKEN ?? '',
    shopId: process.env.PRINTIFY_SHOP_ID,
    userAgent: process.env.PRINTIFY_USER_AGENT,
  });
}

export const printifyClient = getPrintifyClient();
