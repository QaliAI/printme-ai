import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { getImageProvider } from '@/lib/ai/image-provider';
import { z } from 'zod';

const regenerateSchema = z.object({
  uploadId: z.string().uuid(),
  styleId: z.string().uuid(),
  imageUrl: z.string().url(),
  previousDesignId: z.string().uuid().optional(),
});

/**
 * Regenerate variations of an existing design.
 *
 * Uses prompt variation strategies to produce a meaningfully different output
 * from the previous design while staying within the chosen style.
 *
 * Variation strategies (cycles through them based on attempt count):
 *  1. Different artistic emphasis (e.g., "more dramatic", "softer", "more vibrant")
 *  2. Different composition (e.g., "tighter crop", "more background detail")
 *  3. Different mood (e.g., "warmer tones", "cooler palette")
 *  4. Different detail level
 */

const VARIATION_MODIFIERS = [
  'with more vibrant colors and dramatic lighting',
  'with softer tones and dreamy atmosphere',
  'with cinematic composition and rich shadows',
  'with bold contrast and striking detail',
  'with warm golden hour lighting',
  'with cool moody atmosphere',
  'with painterly brushstrokes and texture',
  'with cleaner lines and more refined detail',
];

const NEGATIVE_PROMPTS = [
  'avoid making it look identical to previous attempts',
  'create a fresh interpretation',
  'try a different artistic approach',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uploadId, styleId, imageUrl, previousDesignId: _previousDesignId } = regenerateSchema.parse(body);
    void _previousDesignId; // reserved for future "exclude this prompt" logic

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify ownership
    const { data: upload } = await supabase
      .from('user_uploads')
      .select('id')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single();

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Get style
    const { data: style } = await supabase
      .from('style_presets')
      .select('name, description')
      .eq('id', styleId)
      .single();

    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    }

    // Count previous attempts to pick a varied prompt
    const { count: previousCount } = await supabase
      .from('generated_designs')
      .select('id', { count: 'exact', head: true })
      .eq('upload_id', uploadId);

    const attemptIdx = previousCount || 0;
    const variation = VARIATION_MODIFIERS[attemptIdx % VARIATION_MODIFIERS.length];
    const negative = NEGATIVE_PROMPTS[attemptIdx % NEGATIVE_PROMPTS.length];

    const prompt = `${style.name} style: ${style.description}, ${variation}`;

    // Create pending design record
    const { data: pendingDesign, error: insertError } = await supabase
      .from('generated_designs')
      .insert({
        upload_id: uploadId,
        style_id: styleId,
        user_id: user.id,
        status: 'generating',
      })
      .select()
      .single();

    if (insertError || !pendingDesign) {
      return NextResponse.json({ error: 'Failed to create design' }, { status: 500 });
    }

    // Generate with variation prompt
    const provider = await getImageProvider();
    const result = await provider.generateDesign({
      imageUrl,
      promptTemplate: prompt,
      negativePrompt: negative,
    });

    const { data: finalDesign, error: updateError } = await supabase
      .from('generated_designs')
      .update({
        design_url: result.imageUrl,
        status: 'completed',
      })
      .eq('id', pendingDesign.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save design' }, { status: 500 });
    }

    return NextResponse.json({
      ...finalDesign,
      variation_used: variation,
      attempt: attemptIdx + 1,
    });
  } catch (err) {
    console.error('Regenerate error:', err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to regenerate design' }, { status: 500 });
  }
}
