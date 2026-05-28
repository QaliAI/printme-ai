'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { StylePreset } from '@/lib/types';

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

function getStyleVisual(name: string) {
  const key = name.toLowerCase();
  return STYLE_VISUALS[key] || { emoji: '🎨', gradient: 'from-blue-500 via-purple-500 to-pink-500' };
}

export default function StyleSelectionPage() {
  const router = useRouter();
  const [styles, setStyles] = useState<StylePreset[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStyles();
  }, []);

  const handleContinue = () => {
    if (!selectedStyle) return;
    router.push(`/app/create/upload?style=${selectedStyle}`);
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
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Choose Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Style</span>
          </h1>
          <p className="text-lg text-gray-600">Pick an AI art style to transform your photo</p>
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
                        className={`cursor-pointer transition-all overflow-hidden ${
                          isSelected
                            ? 'ring-4 ring-blue-500 shadow-2xl scale-105'
                            : 'shadow-lg hover:shadow-2xl backdrop-blur-xl bg-white/80'
                        }`}
                        onClick={() => setSelectedStyle(style.id)}
                      >
                        <CardBody className="p-0 overflow-hidden">
                          {/* Style preview with gradient */}
                          <div
                            className={`relative aspect-square bg-gradient-to-br ${visual.gradient} overflow-hidden`}
                          >
                            {/* Animated overlay pattern */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)] opacity-30" />

                            {/* Shimmer */}
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                              initial={{ x: '-100%' }}
                              animate={{ x: isSelected ? '100%' : '-100%' }}
                              transition={{ duration: 1.2, repeat: isSelected ? Infinity : 0, repeatDelay: 1 }}
                            />

                            {/* Center emoji */}
                            <div className="relative h-full flex items-center justify-center">
                              <motion.div
                                className="text-8xl drop-shadow-2xl"
                                animate={
                                  isSelected
                                    ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                                    : { scale: 1, rotate: 0 }
                                }
                                transition={{ duration: 2, repeat: isSelected ? Infinity : 0 }}
                              >
                                {visual.emoji}
                              </motion.div>
                            </div>

                            {/* Selected indicator */}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-3 right-3 bg-white text-blue-600 rounded-full w-10 h-10 flex items-center justify-center shadow-2xl font-bold text-xl"
                              >
                                ✓
                              </motion.div>
                            )}
                          </div>

                          {/* Style info */}
                          <div className="p-4">
                            <h3 className="font-bold text-gray-900 mb-1">{style.name}</h3>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{style.description}</p>
                            {style.best_for && (
                              <p className="text-xs text-purple-600 font-medium">
                                ✨ Best for: {style.best_for}
                              </p>
                            )}
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
              className="flex gap-4"
            >
              <Link href="/app" className="flex-1 md:flex-none">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <div className="flex-1" />
              <motion.div
                whileHover={selectedStyle ? { scale: 1.05 } : {}}
                whileTap={selectedStyle ? { scale: 0.95 } : {}}
              >
                <Button
                  onClick={handleContinue}
                  disabled={!selectedStyle}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
                >
                  Continue →
                </Button>
              </motion.div>
            </motion.div>
          </>
        )}
      </Container>
    </div>
  );
}
