import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/**
 * Printify Mockup Generator API with Supabase caching.
 *
 * POST /api/printify/mockups
 *
 * Body:
 *   {
 *     imageUrl: string,           // public URL of the user's design
 *     designId?: string,          // optional - enables cache lookup/persist
 *     blueprintIds?: number[],    // which products to generate for
 *     forceRefresh?: boolean,     // bypass cache
 *   }
 *
 * Flow with caching:
 *   1. If designId provided + cache exists + !forceRefresh: return cached
 *   2. Otherwise upload design to Printify
 *   3. Create draft products on selected blueprints (in parallel)
 *   4. Persist results to generated_designs.printify_mockups if designId given
 *   5. Return mockup URLs
 */

const mockupsRequestSchema = z.object({
  imageUrl: z.string().url(),
  designId: z.string().uuid().optional(),
  blueprintIds: z.array(z.number()).optional(),
  forceRefresh: z.boolean().optional().default(false),
});

const DEFAULT_BLUEPRINTS = [12, 68, 937, 282, 77, 268, 553, 400];

interface PrintifyMockup {
  src: string;
  position: string;
  is_default: boolean;
  variant_ids?: number[];
}

interface PrintifyDraftProductResponse {
  id: string;
  title: string;
  images?: PrintifyMockup[];
}

interface CachedMockup {
  blueprintId: number;
  productId?: string;
  title?: string;
  mockups: Array<{ src: string; position: string; isDefault: boolean }>;
  error?: string;
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

/**
 * Returns a Supabase admin client, or null if env vars not configured.
 * Cache operations gracefully no-op when null.
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (url.includes('placeholder')) return null;
  return createClient(url, key);
}

interface CachedDesignRow {
  printify_mockups: CachedMockup[] | null;
  printify_image_id: string | null;
  printify_mockups_generated_at: string | null;
}

async function loadCachedMockups(
  designId: string,
  expectedBlueprintIds: number[]
): Promise<{
  mockups: CachedMockup[] | null;
  imageId: string | null;
} | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('generated_designs')
      .select('printify_mockups, printify_image_id, printify_mockups_generated_at')
      .eq('id', designId)
      .single();

    if (error || !data) return null;

    const row = data as CachedDesignRow;
    if (!row.printify_mockups || row.printify_mockups.length === 0) return null;

    // Confirm cache covers all requested blueprints
    const cachedIds = new Set(row.printify_mockups.map((m) => m.blueprintId));
    const missing = expectedBlueprintIds.filter((id) => !cachedIds.has(id));
    if (missing.length > 0) return null;

    return {
      mockups: row.printify_mockups,
      imageId: row.printify_image_id,
    };
  } catch (err) {
    // If column doesn't exist (migration not applied yet) or any other issue,
    // silently fall through to generation.
    console.warn('Mockup cache lookup failed:', err);
    return null;
  }
}

async function saveCachedMockups(
  designId: string,
  imageId: string,
  mockups: CachedMockup[]
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase
      .from('generated_designs')
      .update({
        printify_mockups: mockups,
        printify_image_id: imageId,
        printify_mockups_generated_at: new Date().toISOString(),
      })
      .eq('id', designId);
  } catch (err) {
    // Migration may not be applied yet — fail open so request still succeeds
    console.warn('Mockup cache persist failed:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, designId, blueprintIds = DEFAULT_BLUEPRINTS, forceRefresh } =
      mockupsRequestSchema.parse(body);

    const shopId = process.env.NEXT_PUBLIC_PRINTIFY_SHOP_ID || process.env.PRINTIFY_SHOP_ID;
    if (!shopId) {
      return NextResponse.json(
        { error: 'PRINTIFY_SHOP_ID not configured' },
        { status: 500 }
      );
    }

    // ── Cache check ───────────────────────────────────────────────
    if (designId && !forceRefresh) {
      const cached = await loadCachedMockups(designId, blueprintIds);
      if (cached?.mockups) {
        return NextResponse.json({
          imageId: cached.imageId,
          mockups: cached.mockups,
          fromCache: true,
        });
      }
    }

    // ── Step 1: Upload the user's image to Printify ───────────────
    const imageId = await uploadImageToPrintify(imageUrl);

    // ── Step 2: Create a draft product per blueprint in parallel ──
    const settledResults = await Promise.allSettled(
      blueprintIds.map((id) => createDraftProductWithDesign(shopId, id, imageId))
    );

    // ── Step 3: Shape the response ────────────────────────────────
    const productIdsToCleanup: string[] = [];

    const mockups: CachedMockup[] = blueprintIds.map((blueprintId, i) => {
      const result = settledResults[i];
      if (result.status === 'rejected') {
        return {
          blueprintId,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          mockups: [],
        };
      }
      const product = result.value;
      if (product.id) productIdsToCleanup.push(product.id);
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

    // ── Step 4: Persist to cache (fire-and-forget; non-blocking) ──
    if (designId) {
      void saveCachedMockups(designId, imageId, mockups);
    }

    // ── Step 5: Optional draft-product cleanup ────────────────────
    if (process.env.PRINTIFY_AUTO_CLEANUP === 'true' && productIdsToCleanup.length > 0) {
      void Promise.allSettled(
        productIdsToCleanup.map((productId) =>
          printifyRequest(`/shops/${shopId}/products/${productId}.json`, {
            method: 'DELETE',
          }).catch((err) => {
            console.warn(`Cleanup failed for product ${productId}:`, err);
          })
        )
      );
    }

    return NextResponse.json({
      imageId,
      mockups,
      productIds: productIdsToCleanup,
      fromCache: false,
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
