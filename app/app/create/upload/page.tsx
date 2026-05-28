'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { imageFileSchema } from '@/lib/validation';
import { getCurrentUser } from '@/lib/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const styleId = searchParams.get('style');

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!styleId) {
      router.push('/app/create/style');
    }
  }, [styleId, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be smaller than 10MB');
      return;
    }

    // Create preview and check dimensions
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height });
        setPreview(event.target?.result as string);
        setSelectedFile(file);
      };
      img.onerror = () => {
        setError('Invalid image file');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !styleId) return;

    setLoading(true);
    setError(null);

    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/auth/signin?redirect=/app');
        return;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${user.id}/${timestamp}-${selectedFile.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filename, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('user-uploads').getPublicUrl(filename);
      const publicUrl = data?.publicUrl || '';

      // Create database record
      const { data: uploadRecord, error: dbError } = await supabase
        .from('user_uploads')
        .insert({
          user_id: user.id,
          style_id: styleId,
          original_url: publicUrl,
          storage_path: filename,
          file_size: selectedFile.size,
          width: dimensions?.width,
          height: dimensions?.height,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Navigate to preview page
      router.push(`/app/create/preview?upload=${uploadRecord.id}&style=${styleId}`);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const qualityTips = [
    'High quality photo (at least 1000x1000px recommended)',
    'Clear, well-lit subject matter',
    'Face-forward or clearly visible subject',
    'Minimal background distractions',
  ];

  return (
    <Container size="lg" className="py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Upload Your Photo</h1>
        <p className="text-lg text-gray-600">Choose a high-quality image to transform</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Area */}
        <div className="lg:col-span-2">
          <Card>
            <CardBody className="p-8">
              {!preview ? (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-600 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-12 h-12 mb-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-lg font-semibold text-gray-700">Click to upload</p>
                    <p className="text-sm text-gray-500">JPEG, PNG, or WebP (Max 10MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_TYPES.join(',')}
                    onChange={handleFileSelect}
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-auto max-h-96 object-contain mx-auto"
                    />
                  </div>
                  {dimensions && (
                    <p className="text-sm text-gray-600 text-center">
                      {dimensions.width} × {dimensions.height} px
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setPreview(null);
                        setSelectedFile(null);
                        setDimensions(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Choose Different
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Quality Tips */}
        <div>
          <Card>
            <CardBody>
              <h3 className="font-semibold text-gray-900 mb-4">📋 Quality Tips</h3>
              <ul className="space-y-3">
                {qualityTips.map((tip, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                    <span className="text-sm text-gray-600">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        <Button
          onClick={() => router.push('/app/create/style')}
          variant="outline"
          className="flex-1 md:flex-none"
        >
          Back to Style
        </Button>
        <div className="flex-1" />
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || loading}
          className="flex-1 md:flex-none"
        >
          {loading ? 'Uploading...' : 'Generate My Design'}
        </Button>
      </div>
    </Container>
  );
}
