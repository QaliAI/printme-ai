import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import { getImageProvider } from '@/lib/ai/image-provider';
import { z } from 'zod';

const generateDesignSchema = z.object({
  uploadId: z.string().uuid(),
  styleId: z.string().uuid(),
  imageUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body = await req.json();
    const { uploadId, styleId, imageUrl } = generateDesignSchema.parse(body);

    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user owns this upload
    const { data: upload, error: uploadError } = await supabase
      .from('user_uploads')
      .select('id, style_id')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single();

    if (uploadError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Fetch style details
    const { data: style, error: styleError } = await supabase
      .from('style_presets')
      .select('name, description')
      .eq('id', styleId)
      .single();

    if (styleError || !style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    }

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
      return NextResponse.json(
        { error: 'Failed to create design record' },
        { status: 500 }
      );
    }

    // Get AI provider and generate design
    const provider = await getImageProvider();
    const result = await provider.generateDesign({
      imageUrl,
      promptTemplate: `${style.name} style: ${style.description}`,
    });
    const designUrl = result.imageUrl;

    // Update design record with generated image
    const { data: finalDesign, error: updateError } = await supabase
      .from('generated_designs')
      .update({
        design_url: designUrl,
        status: 'completed',
      })
      .eq('id', pendingDesign.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save generated design' },
        { status: 500 }
      );
    }

    return NextResponse.json(finalDesign);
  } catch (err) {
    console.error('Design generation error:', err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate design' },
      { status: 500 }
    );
  }
}
