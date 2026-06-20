'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { StylePreset } from '@/lib/types';
import { STYLE_PRESET_SAMPLES } from '@/lib/assets';

// Style emoji + gradient mapping (fallback for styles without images)
const STYLE_VISUALS: Record<string, { emoji: string; gradient: string }> = {
  'oil painting': { emoji: '🎨', gradient: 'from-amber-400 via-orange-500 to-red-500' },
  'watercolor': { emoji: '💧', gradient: 'from-cyan-400 via-blue-500 to-indigo-500' },
  'pop art': { emoji: '💥', gradient: 'from-pink-400 via-red-500 to-yellow-500' },
  'vintage': { emoji: '📷', gradient: 'from-amber-700 via-yellow-600 to-orange-700' },
  'b&w editorial': { emoji: '⚫', gradient: 'from-gray-700 via-gray-800 to-black' },
  'cartoon': { emoji: '🎭', gradient: 'from-yellow-400 via-pink-500 to-purple-500' },
  'pet royal': { emoji: '👑', gradient: 'from-purple-500 via-pink-500 to-yellow-500' },
  'sketch': { emoji: '✏️', gradient: 'from-gray-400 via-gray-500 to-gray-700' },
  'line art': { emoji: '📐', gradient: 'from-slate-500 via-slate-600 to-slate-800' },
  'cinematic': { emoji: '🎬', gradient: 'from-indigo-600 via-purple-700 to-pink-700' },
  'toy style': { emoji: '🧸', gradient: 'from-pink-300 via-rose-400 to-red-400' },
  'clean cutout': { emoji: '✂️', gradient: 'from-emerald-400 via-teal-500 to-cyan-600' },
};

const SAMPLE_SLUG_BY_DB_SLUG: Record<string, string> = {
  'oil-painting-portrait': 'oil-painting',
  'watercolor-memory': 'watercolor',
  'pop-art-poster': 'pop-art',
  'vintage-travel-poster': 'vintage',
  'black-white-editorial': 'bw-editorial',
  'cartoon-gift-style': 'cartoon',
  'pet-royal-portrait': 'royal-portrait',
  'pencil-sketch': 'sketch',
  'modern-minimal-line-art': 'line-art',
  'cinematic-poster': 'cinematic',
  'toy-figurine-style': 'toy-style',
  'clean-cutout': 'clean-cutout',
};

function getStyleVisual(name: string) {
  const key = name.toLowerCase();
  return STYLE_VISUALS[key] || { emoji: '🎨', gradient: 'from-blue-500 via-purple-500 to-pink-500' };
}

function StyleSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectParam = searchParams.get('select');

  const [styles, setStyles] = useState<StylePreset[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const fetchStyles = async () => {
    try {
      const { data, error } = await supabase
        .from('style_presets')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setStyles(data || []);

      // Auto-select style if parameter is provided
      if (selectParam && data) {
        const found = data.find((s) => s.slug === selectParam || s.id === selectParam);
        if (found) {
          setSelectedStyle(found.id);
        }
      }
    } catch (error) {
      console.error('Failed to load styles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStyles();
  }, [selectParam]);

  const handleContinue = () => {
    if (!selectedStyle) return;
    router.push(`/app/create/upload?style=${selectedStyle}`);
  };

  const handleImageLoad = (styleId: string) => {
    setLoadedImages((prev) => ({ ...prev, [styleId]: true }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 -left-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-40 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <Container size="lg" className="py-12 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            <span>Step 1 of 3</span>
            <span className="w-1 h-1 rounded-full bg-indigo-300" />
            <span>Choose Your Vibe</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Choose Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Style</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Pick an AI art style to transform your photo. Each style is optimized to look incredible on print-on-demand gifts.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.1, 1] }}
              transition={{ rotate: { duration: 2, repeat: Infinity, ease: 'linear' }, scale: { duration: 1, repeat: Infinity } }}
              className="text-6xl inline-block"
            >
              ✨
            </motion.div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <AnimatePresence>
                {styles.map((style, i) => {
                  const visual = getStyleVisual(style.name);
                  const isSelected = selectedStyle === style.id;

                  // Resolve the premium preview asset
                  const sampleSlug = SAMPLE_SLUG_BY_DB_SLUG[style.slug] || style.slug;
                  const sample = STYLE_PRESET_SAMPLES.find((s) => s.slug === sampleSlug);

                  return (
                    <motion.div
                      key={style.id}
                      layout
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -6 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all overflow-hidden border-2 ${
                          isSelected
                            ? 'border-indigo-600 ring-4 ring-indigo-500/10 shadow-2xl scale-[1.02]'
                            : 'border-white/40 shadow-lg hover:shadow-2xl backdrop-blur-xl bg-white/80'
                        }`}
                        onClick={() => setSelectedStyle(style.id)}
                      >
                        <CardBody className="p-0 overflow-hidden">
                          {/* Style preview container */}
                          <div className="relative aspect-square overflow-hidden bg-slate-100">
                            {/* Backdrop/Skeleton gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${visual.gradient} opacity-20`} />

                            {/* Center emoji (backdrop fallback) */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-30 text-7xl select-none">
                              {visual.emoji}
                            </div>

                            {/* Premium AI Sample Image */}
                            {sample && (
                              <img
                                src={sample.sample}
                                alt={`${style.name} preview`}
                                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
                                  loadedImages[style.id] ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                                }`}
                                onLoad={() => handleImageLoad(style.id)}
                                loading={i < 6 ? 'eager' : 'lazy'}
                              />
                            )}

                            {/* Soft shadow & shimmer */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none" />

                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              initial={{ x: '-100%' }}
                              animate={{ x: isSelected ? '100%' : '-100%' }}
                              transition={{ duration: 1.2, repeat: isSelected ? Infinity : 0, repeatDelay: 1 }}
                            />

                            {/* Selected badge */}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-4 right-4 bg-indigo-600 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-xl font-bold text-lg border-2 border-white"
                              >
                                ✓
                              </motion.div>
                            )}

                            {/* Label over the image */}
                            <div className="absolute bottom-4 left-4 right-4 text-white">
                              {style.best_for && (
                                <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full mb-1.5 border border-white/10">
                                  ✨ Ideal for: {style.best_for}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Style info */}
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-slate-900 text-lg">{style.name}</h3>
                              {sample?.tagline && (
                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">
                                  {sample.tagline}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                              {style.description}
                            </p>
                          </div>
                        </CardBody>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between gap-4 mt-12 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/40"
            >
              <Link href="/app" className="flex-1 md:flex-none">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <div className="hidden md:block text-sm text-slate-500">
                {selectedStyle ? 'Style selected! Press Continue.' : 'Select a style to continue.'}
              </div>
              <motion.div
                whileHover={selectedStyle ? { scale: 1.02 } : {}}
                whileTap={selectedStyle ? { scale: 0.98 } : {}}
                className="flex-1 md:flex-none"
              >
                <Button
                  onClick={handleContinue}
                  disabled={!selectedStyle}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-10 shadow-lg shadow-indigo-600/10"
                >
                  Continue to Upload →
                </Button>
              </motion.div>
            </motion.div>
          </>
        )}
      </Container>
    </div>
  );
}

export default function StyleSelectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
          <div className="text-6xl animate-pulse">✨</div>
        </div>
      }
    >
      <StyleSelectionContent />
    </Suspense>
  );
}
