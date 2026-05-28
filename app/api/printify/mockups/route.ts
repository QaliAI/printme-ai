import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Printify Mockup Generator API
 *
 * POST /api/printify/mockups
 *
 * Body:
 *  {
 *    imageUrl: string,           // public URL of the user's design
 *    blueprintIds?: number[],    // which products to generate for
 *  }
 *
 * Flow:
 *  1. Upload the user's design image to Printify
 *  2. For each requested blueprint, create a draft product with that design
 *  3. Return the mockup URLs for each product
 *
 * The mockups returned are REAL renders of the user's design on actual
 * Printify products — same imagery they'll see at checkout.
 */

const mockupsRequestSchema = z.object({
  imageUrl: z.string().url(),
  blueprintIds: z.array(z.number()).optional(),
});

// Default blueprints (matches what's shown on the landing page)
const DEFAULT_BLUEPRINTS = [12, 68, 937, 282, 77, 268, 553, 400];

interface PrintifyMockup {
  src: string;
  position: string;
  is_default: boolean;
  variant_ids: number[];
}

interface PrintifyDraftProductResponse {
  id: string;
  title: string;
  images?: PrintifyMockup[];
}

async function printifyRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) throw new Error('PRINTIFY_API_TOKEN not configured');

  const res = await fetch(`https://api.printify.com/v1${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Printify API ${res.status}: ${errText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Step 1: Upload the user's design image to Printify.
 * Returns the upload's image_id which we use when creating products.
 */
async function uploadImageToPrintify(imageUrl: string): Promise<string> {
  const result = await printifyRequest<{ id: string }>('/uploads/images.json', {
    method: 'POST',
    body: {
      file_name: `design-${Date.now()}.png`,
      url: imageUrl,
    },
  });
  return result.id;
}

/**
 * Step 2: Get the first print provider for a blueprint and a sample variant.
 * We need this to construct a valid draft product request.
 */
async function getFirstPrintProvider(blueprintId: number): Promise<{
  providerId: number;
  variantId: number;
}> {
  const providers = await printifyRequest<Array<{ id: number }>>(
    `/catalog/blueprints/${blueprintId}/print_providers.json`
  );
  if (!providers.length) throw new Error(`No print providers for blueprint ${blueprintId}`);

  const providerId = providers[0].id;
  const variantsData = await printifyRequest<{
    variants: Array<{ id: number }>;
  }>(`/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`);

  if (!variantsData.variants.length) {
    throw new Error(`No variants for blueprint ${blueprintId} provider ${providerId}`);
  }

  return {
    providerId,
    variantId: variantsData.variants[0].id,
  };
}

/**
 * Step 3: Create a draft product on a blueprint with the uploaded design.
 * This triggers Printify's mockup generator to render the design on the
 * product. The response includes mockup image URLs.
 */
async function createDraftProductWithDesign(
  shopId: string,
  blueprintId: number,
  imageId: string
): Promise<PrintifyDraftProductResponse> {
  const { providerId, variantId } = await getFirstPrintProvider(blueprintId);

  return printifyRequest<PrintifyDraftProductResponse>(
    `/shops/${shopId}/products.json`,
    {
      method: 'POST',
      body: {
        title: `Preview ${Date.now()}`,
        description: 'Auto-generated mockup preview',
        blueprint_id: blueprintId,
        print_provider_id: providerId,
        variants: [
          {
            id: variantId,
            price: 2000,
            is_enabled: true,
          },
        ],
        print_areas: [
          {
            variant_ids: [variantId],
            placeholders: [
              {
                position: 'front',
                images: [
                  {
                    id: imageId,
                    x: 0.5,
                    y: 0.5,
                    scale: 1,
                    angle: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, blueprintIds = DEFAULT_BLUEPRINTS } = mockupsRequestSchema.parse(body);

    const shopId = process.env.NEXT_PUBLIC_PRINTIFY_SHOP_ID || process.env.PRINTIFY_SHOP_ID;
    if (!shopId) {
      return NextResponse.json(
        { error: 'PRINTIFY_SHOP_ID not configured' },
        { status: 500 }
      );
    }

    // Step 1: Upload the user's image once
    const imageId = await uploadImageToPrintify(imageUrl);

    // Step 2: Create a draft product per blueprint in parallel
    const settledResults = await Promise.allSettled(
      blueprintIds.map((id) => createDraftProductWithDesign(shopId, id, imageId))
    );

    // Step 3: Extract mockup URLs from successful responses
    const mockups = blueprintIds.map((blueprintId, i) => {
      const result = settledResults[i];
      if (result.status === 'rejected') {
        return {
          blueprintId,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          mockups: [],
        };
      }
      const product = result.value;
      return {
        blueprintId,
        productId: product.id,
        title: product.title,
        mockups:
          product.images?.map((img) => ({
            src: img.src,
            position: img.position,
            isDefault: img.is_default,
          })) || [],
      };
    });

    return NextResponse.json({
      imageId,
      mockups,
    });
  } catch (err) {
    console.error('Printify mockup error:', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: 'Mockup generation failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
