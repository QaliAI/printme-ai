import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  getPrintifyClient,
  type PrintifyProduct,
} from '@/lib/printify/client';

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

interface CachedMockup {
  blueprintId: number;
  productId?: string;
  title?: string;
  mockups: Array<{ src: string; position: string; isDefault: boolean }>;
  error?: string;
}

async function uploadImageToPrintify(imageUrl: string): Promise<string> {
  const result = await getPrintifyClient().uploadImage({
    fileName: `design-${Date.now()}.png`,
    url: imageUrl,
  });
  return result.id;
}

async function getFirstPrintProvider(blueprintId: number): Promise<{
  providerId: number;
  variantId: number;
  position: string;
  decorationMethod?: string;
}> {
  const client = getPrintifyClient();
  const providers = await client.listPrintProviders(blueprintId);
  if (!providers.length) throw new Error(`No print providers for blueprint ${blueprintId}`);

  const providerId = providers[0].id;
  const variantsData = await client.getProviderVariants(blueprintId, providerId);

  if (!variantsData.variants.length) {
    throw new Error(`No variants for blueprint ${blueprintId} provider ${providerId}`);
  }

  const frontVariant = variantsData.variants.find((variant) =>
    variant.placeholders.some((placeholder) => placeholder.position === 'front')
  );
  const variant = frontVariant ?? variantsData.variants[0];
  const placeholder =
    variant.placeholders.find((candidate) => candidate.position === 'front') ??
    variant.placeholders[0];
  if (!placeholder) {
    throw new Error(
      `No printable placeholders for blueprint ${blueprintId} provider ${providerId}`
    );
  }

  return {
    providerId,
    variantId: variant.id,
    position: placeholder.position,
    decorationMethod: placeholder.decoration_method,
  };
}

async function createDraftProductWithDesign(
  blueprintId: number,
  imageId: string
): Promise<PrintifyProduct> {
  const { providerId, variantId, position, decorationMethod } =
    await getFirstPrintProvider(blueprintId);

  return getPrintifyClient().createProduct({
    title: `Preview ${Date.now()}`,
    description: 'Auto-generated mockup preview',
    blueprint_id: blueprintId,
    print_provider_id: providerId,
    variants: [{ id: variantId, price: 2000, is_enabled: true }],
    print_areas: [
      {
        variant_ids: [variantId],
        placeholders: [
          {
            position,
            decoration_method: decorationMethod,
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
  });
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

    if (!process.env.PRINTIFY_SHOP_ID) {
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
      blueprintIds.map((id) => createDraftProductWithDesign(id, imageId))
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
          getPrintifyClient().deleteProduct(productId).catch((err) => {
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
