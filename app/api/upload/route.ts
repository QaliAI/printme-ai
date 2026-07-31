import { createClient } from '@supabase/supabase-js';
import { cloudinaryClient } from '@/lib/cloudinary/client';
import { getCurrentUser } from '@/lib/auth';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

export async function POST(request: Request) {
  try {
    // 1. Authenticate user server-side (do not trust userId from client)
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const designId = formData.get('designId') as string;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!designId) {
      return Response.json({ error: 'Design ID required' }, { status: 400 });
    }

    // 2. Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'File must be smaller than 10MB' }, { status: 400 });
    }

    // 3. Validate file type by MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      return Response.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 });
    }

    // 4. Validate file type by extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileExtension = file.name ? path.extname(file.name).toLowerCase() : '';
    if (file.name && !allowedExtensions.includes(fileExtension)) {
      return Response.json({ error: 'Invalid file extension' }, { status: 400 });
    }

    // 5. Verify the target design exists and belongs to the authenticated user BEFORE uploading to Cloudinary
    const { data: design, error: designCheckError } = await supabase
      .from('generated_designs')
      .select('id')
      .eq('id', designId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (designCheckError || !design) {
      return Response.json(
        { error: 'Design not found or access denied' },
        { status: 404 }
      );
    }

    // 6. Upload to Cloudinary under the user's isolated folder
    const uploadResponse = await cloudinaryClient.uploadImage(file, `printme/designs/${user.id}`);

    // 7. Update design record
    const { error: dbError } = await supabase
      .from('generated_designs')
      .update({
        design_url: uploadResponse.secure_url,
        cloudinary_public_id: uploadResponse.public_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', designId)
      .eq('user_id', user.id);

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
