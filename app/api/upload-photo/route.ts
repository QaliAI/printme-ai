import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';
import path from 'path';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const styleId = formData.get('styleId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be smaller than 10MB' }, { status: 400 });
    }

    // Validate mime type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 });
    }

    const user = await getCurrentUser();
    const timestamp = Date.now();
    const cleanFileName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'image.png';

    if (user) {
      // Authenticated upload path: upload to user-uploads bucket (private)
      const storagePath = `${user.id}/${timestamp}-${cleanFileName}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from('user-uploads')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          duplex: 'half',
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage.from('user-uploads').getPublicUrl(storagePath);
      const publicUrl = data?.publicUrl || '';

      // Insert record
      const { data: uploadRecord, error: dbError } = await supabaseAdmin
        .from('user_uploads')
        .insert({
          user_id: user.id,
          original_file_name: file.name || 'upload.png',
          original_url: publicUrl,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return NextResponse.json(uploadRecord);
    } else {
      // Guest upload path: upload to designs bucket (public) under guests/ folder
      const storagePath = `guests/${timestamp}-${cleanFileName}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from('designs')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          duplex: 'half',
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage.from('designs').getPublicUrl(storagePath);
      const publicUrl = data?.publicUrl || '';

      // Return a mock upload record format for guest
      return NextResponse.json({
        id: `guest-upload-${timestamp}`,
        original_url: publicUrl,
        original_file_name: file.name || 'upload.png',
        file_size: file.size,
        style_id: styleId,
      });
    }
  } catch (err) {
    console.error('Guest upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
