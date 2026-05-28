'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { supabase } from '@/lib/supabase';

interface Design {
  id: string;
  user_id: string;
  style_id: string;
  design_url: string;
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
  style_presets?: { name: string };
  user_profiles?: { full_name: string; email: string };
}

export default function AdminDesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      const { data } = await supabase
        .from('generated_designs')
        .select('*, style_presets(name), user_profiles(full_name, email)')
        .order('created_at', { ascending: false });

      setDesigns(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (designId: string) => {
    if (!confirm('Are you sure you want to delete this design?')) return;

    try {
      await supabase
        .from('generated_designs')
        .delete()
        .eq('id', designId);

      setDesigns(designs.filter(d => d.id !== designId));
    } catch (error) {
      console.error('Failed to delete design:', error);
      alert('Failed to delete design');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Designs Management</h1>

      {designs.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-600">No designs created yet</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {designs.map((design) => (
            <Card key={design.id} className="overflow-hidden">
              <div className="aspect-square bg-gray-100 overflow-hidden">
                {design.design_url && (
                  <img
                    src={design.design_url}
                    alt="Design"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {design.style_presets?.name || 'Unknown Style'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {design.user_profiles?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {design.user_profiles?.email}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(design.status)}`}>
                    {design.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  {new Date(design.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => handleDelete(design.id)}
                  className="w-full px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded font-medium text-sm"
                >
                  Delete
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
