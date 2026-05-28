'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { StylePreset } from '@/lib/types';

export default function StyleSelectionPage() {
  const router = useRouter();
  const [styles, setStyles] = useState<StylePreset[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      const { data, error } = await supabase
        .from('style_presets')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setStyles(data || []);
    } catch (error) {
      console.error('Failed to load styles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedStyle) return;
    router.push(`/app/create/upload?style=${selectedStyle}`);
  };

  return (
    <Container size="lg" className="py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Choose Your Style</h1>
        <p className="text-lg text-gray-600">Select an AI art style to transform your photo</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-12 h-12"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {styles.map((style) => (
              <Card
                key={style.id}
                hover
                className={`cursor-pointer transition-all ${selectedStyle === style.id ? 'ring-2 ring-blue-600 shadow-lg' : ''}`}
                onClick={() => setSelectedStyle(style.id)}
              >
                <CardBody className="p-0 overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <div className="text-6xl opacity-50">🎨</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{style.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{style.description}</p>
                    <p className="text-xs text-gray-500">Best for: {style.best_for}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="flex gap-4">
            <Link href="/app" className="flex-1">
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleContinue}
              disabled={!selectedStyle}
              className="flex-1"
            >
              Continue to Upload
            </Button>
          </div>
        </>
      )}
    </Container>
  );
}
