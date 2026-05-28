import { createClient } from '@supabase/supabase-js';
import { cloudinaryClient } from '@/lib/cloudinary/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const designId = formData.get('designId') as string;
    const userId = formData.get('userId') as string;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!designId) {
      return Response.json({ error: 'Design ID required' }, { status: 400 });
    }

    const uploadResponse = await cloudinaryClient.uploadImage(file, `printme/designs/${userId}`);

    const { error: dbError } = await supabase
      .from('generated_designs')
      .update({
        design_url: uploadResponse.secure_url,
        cloudinary_public_id: uploadResponse.public_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', designId)
      .eq('user_id', userId);

    if (dbError) {
      console.error('Database update error:', dbError);
      return Response.json(
        { error: 'Failed to save design reference' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      publicId: uploadResponse.public_id,
      url: uploadResponse.secure_url,
      width: uploadResponse.width,
      height: uploadResponse.height,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
