'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { supabase } from '@/lib/supabase';

interface StylePreset {
  id: string;
  name: string;
  description: string;
  best_for: string;
  is_active: boolean;
  sort_order: number;
}

export default function AdminStylesPage() {
  const [styles, setStyles] = useState<StylePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<StylePreset>>({});

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      const { data } = await supabase
        .from('style_presets')
        .select('*')
        .order('sort_order');

      setStyles(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (style: StylePreset) => {
    setEditingId(style.id);
    setFormData(style);
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('style_presets')
        .update(formData)
        .eq('id', editingId);

      if (error) throw error;

      setStyles(
        styles.map(s => (s.id === editingId ? { ...s, ...formData } : s))
      );
      setEditingId(null);
      setFormData({});
    } catch (error) {
      console.error('Failed to save style:', error);
      alert('Failed to save style');
    }
  };

  const handleToggleActive = async (style: StylePreset) => {
    try {
      const { error } = await supabase
        .from('style_presets')
        .update({ is_active: !style.is_active })
        .eq('id', style.id);

      if (error) throw error;

      setStyles(
        styles.map(s =>
          s.id === style.id ? { ...s, is_active: !s.is_active } : s
        )
      );
    } catch (error) {
      console.error('Failed to toggle style:', error);
      alert('Failed to toggle style');
    }
  };

  const handleDelete = async (styleId: string) => {
    if (!confirm('Are you sure you want to delete this style?')) return;

    try {
      const { error } = await supabase
        .from('style_presets')
        .delete()
        .eq('id', styleId);

      if (error) throw error;

      setStyles(styles.filter(s => s.id !== styleId));
    } catch (error) {
      console.error('Failed to delete style:', error);
      alert('Failed to delete style');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Styles Management</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Style
        </button>
      </div>

      <Card>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Best For</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Order</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Active</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {styles.map((style) => (
                  <tr key={style.id} className="border-b hover:bg-gray-50">
                    {editingId === style.id ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={formData.description || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={formData.best_for || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, best_for: e.target.value })
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            value={formData.sort_order || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                sort_order: parseInt(e.target.value),
                              })
                            }
                            className="w-20 px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={formData.is_active || false}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                is_active: e.target.checked,
                              })
                            }
                          />
                        </td>
                        <td className="py-3 px-4 space-x-2">
                          <button
                            onClick={handleSave}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setFormData({});
                            }}
                            className="text-gray-600 hover:text-gray-700 font-medium"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          {style.name}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {style.description}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {style.best_for}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{style.sort_order}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleActive(style)}
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              style.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {style.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-3 px-4 space-x-2">
                          <button
                            onClick={() => handleEdit(style)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(style.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
