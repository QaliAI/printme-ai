'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { UserUpload, GeneratedDesign } from '@/lib/types';

export default function PreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get('upload');
  const styleId = searchParams.get('style');

  const [upload, setUpload] = useState<UserUpload | null>(null);
  const [design, setDesign] = useState<GeneratedDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadId || !styleId) {
      router.push('/app/create/style');
      return;
    }

    fetchData();
  }, [uploadId, styleId, router]);

  const fetchData = async () => {
    try {
      // Fetch upload record
      const { data: uploadData, error: uploadError } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('id', uploadId)
        .single();

      if (uploadError) throw uploadError;
      setUpload(uploadData);

      // Fetch design if it exists
      const { data: designData } = await supabase
        .from('generated_designs')
        .select('*')
        .eq('upload_id', uploadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (designData) {
        setDesign(designData);
      } else {
        // Generate initial design
        await generateDesign(uploadData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load upload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateDesign = async (uploadData?: UserUpload) => {
    const current = uploadData || upload;
    if (!current) return;

    setRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadId,
          styleId: styleId,
          imageUrl: current.original_url,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const generatedDesign = await response.json();
      setDesign(generatedDesign);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate design');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <Container size="lg" className="py-12">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-12 h-12"></div>
        </div>
      </Container>
    );
  }

  if (!upload) {
    return (
      <Container size="lg" className="py-12">
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-red-600 mb-4">Upload not found</p>
            <Button onClick={() => router.push('/app/create/style')}>
              Start Over
            </Button>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Design</h1>
        <p className="text-lg text-gray-600">See your photo transformed by AI</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Original Image */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Original Photo</h3>
          </CardHeader>
          <CardBody className="p-0">
            <div className="aspect-square bg-gray-100 overflow-hidden">
              <img
                src={upload.original_url}
                alt="Original"
                className="w-full h-full object-cover"
              />
            </div>
          </CardBody>
        </Card>

        {/* Generated Design */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">AI Generated Design</h3>
          </CardHeader>
          <CardBody className="p-0">
            <div className="aspect-square bg-gray-100 overflow-hidden">
              {design?.design_url ? (
                <img
                  src={design.design_url}
                  alt="Generated"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-12 h-12 mb-4"></div>
                    <p className="text-gray-600">Generating...</p>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Design Info */}
      <Card className="mb-8">
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Original Dimensions</p>
              <p className="font-semibold text-gray-900">
                {upload.width} × {upload.height} px
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">File Size</p>
              <p className="font-semibold text-gray-900">
                {(upload.file_size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {design?.status && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <p className="font-semibold text-gray-900 capitalize">{design.status}</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Quality Checklist */}
      <Card className="mb-8 border-green-200 bg-green-50">
        <CardBody>
          <h3 className="font-semibold text-gray-900 mb-4">✨ Design Quality Check</h3>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-sm text-gray-700">Design is generated and ready</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-sm text-gray-700">High resolution for printing</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-sm text-gray-700">Ready to apply to products</span>
            </li>
          </ul>
        </CardBody>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => generateDesign()}
          disabled={regenerating}
          variant="outline"
          className="flex-1 md:flex-none"
        >
          {regenerating ? 'Regenerating...' : '🔄 Try Again'}
        </Button>
        <Button
          onClick={() => router.push(`/app/create/products?design=${design?.id}`)}
          disabled={!design?.design_url || regenerating}
          className="flex-1"
        >
          Choose Products →
        </Button>
      </div>
    </Container>
  );
}
