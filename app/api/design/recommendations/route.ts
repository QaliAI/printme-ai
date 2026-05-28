import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const recommendationsSchema = z.object({
  designId: z.string().uuid(),
  limit: z.number().min(1).max(10).optional().default(3),
});

/**
 * Heuristic-based product recommendation engine.
 *
 * Phase 1: Rules-based scoring using image aspect ratio + style metadata.
 * Phase 2 (future): Claude Vision API to analyze image content and match products.
 *
 * Scoring factors:
 *  - Aspect ratio match (portrait → poster/canvas; square → mug/sticker)
 *  - Style metadata (e.g., "playful" → t-shirt; "elegant" → canvas)
 *  - Popularity & price tier (give variety: 1 cheap, 1 mid, 1 premium)
 */

interface ProductRow {
  id: string;
  name: string;
  description?: string | null;
  base_price?: number | null;
  emoji?: string | null;
  mockup_url?: string | null;
  display_order?: number | null;
  tags?: string[] | null;
}

interface ScoredProduct {
  product: ProductRow;
  score: number;
  reason: string;
}

function scoreProductsForDesign(
  products: ProductRow[],
  designAspect: number,
  styleName: string
): ScoredProduct[] {
  const styleLower = (styleName || '').toLowerCase();

  return products.map((product) => {
    let score = 50; // base
    const reasons: string[] = [];

    const productName = (product.name || '').toLowerCase();
    const tags: string[] = product.tags || [];
    const tagsLower = tags.map((t) => t.toLowerCase());

    // Aspect-ratio bonuses
    const isPortrait = designAspect < 0.85;
    const isLandscape = designAspect > 1.15;
    const isSquare = !isPortrait && !isLandscape;

    if (isPortrait) {
      if (productName.includes('poster') || productName.includes('canvas') || productName.includes('frame')) {
        score += 30;
        reasons.push('great for portrait photos');
      }
      if (productName.includes('phone case')) {
        score += 20;
        reasons.push('fits portrait orientation');
      }
    } else if (isLandscape) {
      if (productName.includes('canvas') || productName.includes('poster')) {
        score += 25;
        reasons.push('landscape wall art');
      }
      if (productName.includes('mug')) {
        score += 15;
      }
    } else if (isSquare) {
      if (productName.includes('mug') || productName.includes('sticker') || productName.includes('tote')) {
        score += 25;
        reasons.push('perfect for square designs');
      }
      if (productName.includes('t-shirt') || productName.includes('hoodie')) {
        score += 20;
      }
    }

    // Style-based bonuses
    if (styleLower.includes('royal') || styleLower.includes('vintage') || styleLower.includes('oil')) {
      if (productName.includes('canvas') || productName.includes('frame') || productName.includes('poster')) {
        score += 20;
        reasons.push('elegant wall display');
      }
    }
    if (styleLower.includes('pop') || styleLower.includes('cartoon') || styleLower.includes('toy')) {
      if (productName.includes('t-shirt') || productName.includes('sticker') || productName.includes('phone')) {
        score += 20;
        reasons.push('fun & casual');
      }
    }
    if (styleLower.includes('cinematic') || styleLower.includes('editorial') || styleLower.includes('b&w')) {
      if (productName.includes('poster') || productName.includes('canvas')) {
        score += 20;
        reasons.push('cinematic showcase');
      }
    }

    // Tag matches
    if (tagsLower.includes('bestseller')) {
      score += 10;
      reasons.push('bestseller');
    }
    if (tagsLower.includes('giftable')) {
      score += 5;
    }

    // Price-tier diversity (small random nudge so we don't always recommend the cheapest)
    const price = product.base_price || 0;
    if (price > 30) score += 3;
    if (price > 50) score += 5;

    return {
      product,
      score,
      reason: reasons[0] || 'great fit for your design',
    };
  });
}

function diversify(scored: ScoredProduct[], limit: number): ScoredProduct[] {
  // Sort by score descending
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  // Greedy diversification: pick top product, then pick highest-scoring next product
  // that's a different category (different first word of name)
  const selected: ScoredProduct[] = [];
  const categoriesUsed = new Set<string>();

  for (const item of sorted) {
    if (selected.length >= limit) break;
    const category = (item.product.name || '').split(' ')[0].toLowerCase();
    if (!categoriesUsed.has(category)) {
      selected.push(item);
      categoriesUsed.add(category);
    }
  }

  // Fill remaining slots with top scorers if we couldn't diversify enough
  for (const item of sorted) {
    if (selected.length >= limit) break;
    if (!selected.includes(item)) {
      selected.push(item);
    }
  }

  return selected.slice(0, limit);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { designId, limit } = recommendationsSchema.parse(body);

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch design with related upload + style
    const { data: design, error: designError } = await supabase
      .from('generated_designs')
      .select(`
        id,
        design_url,
        style_preset_id,
        upload:user_uploads(
          id,
          width,
          height
        ),
        style:style_presets(
          id,
          name,
          description
        )
      `)
      .eq('id', designId)
      .single();

    if (designError || !design) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    // Calculate aspect ratio
    const upload = Array.isArray(design.upload) ? design.upload[0] : design.upload;
    const style = Array.isArray(design.style) ? design.style[0] : design.style;
    const width = upload?.width || 1000;
    const height = upload?.height || 1000;
    const aspect = width / height;

    // Fetch all active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('display_order');

    if (productsError || !products) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Score and diversify
    const scored = scoreProductsForDesign(products, aspect, style?.name || '');
    const recommended = diversify(scored, limit);

    return NextResponse.json({
      designId,
      aspect,
      styleName: style?.name,
      recommendations: recommended.map((r) => ({
        ...r.product,
        recommendation_reason: r.reason,
        recommendation_score: r.score,
      })),
    });
  } catch (err) {
    console.error('Recommendations error:', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}
