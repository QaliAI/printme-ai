'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

interface Design {
  id: string;
  design_url: string;
  status: string;
  created_at: string;
  style?: any;
  upload?: any;
}

export default function DesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('generated_designs')
        .select(
          `
          id,
          design_url,
          status,
          created_at,
          style:style_id(name),
          upload:upload_id(original_url)
        `
        )
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDesigns(data || []);
    } catch (err) {
      console.error('Error fetching designs:', err);
      setError('Failed to load designs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDesign = async (designId: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    setDeleting(designId);
    try {
      const { error: deleteError } = await supabase
        .from('generated_designs')
        .delete()
        .eq('id', designId);

      if (deleteError) throw deleteError;

      setDesigns(designs.filter((d) => d.id !== designId));
    } catch (err) {
      console.error('Error deleting design:', err);
      setError('Failed to delete design');
    } finally {
      setDeleting(null);
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

  return (
    <Container size="lg" className="py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Designs</h1>
        <p className="text-lg text-gray-600">
          {designs.length === 0 ? 'No designs yet' : `${designs.length} design${designs.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {designs.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-600 mb-6">You haven't created any designs yet.</p>
            <Link href="/app/create/style">
              <Button>Create Your First Design</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => (
            <Card key={design.id} className="h-full flex flex-col">
              <div className="aspect-square bg-gray-100 overflow-hidden relative">
                <img
                  src={design.design_url}
                  alt="Design"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                    {design.status}
                  </span>
                </div>
              </div>

              <CardBody className="flex-1 flex flex-col">
                <div className="flex-1">
                  {design.style && (
                    <p className="text-sm text-gray-600 mb-1">
                      Style: <span className="font-medium text-gray-900">{design.style.name}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(design.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1 text-sm" disabled>
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-sm text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteDesign(design.id)}
                    disabled={deleting === design.id}
                  >
                    {deleting === design.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
