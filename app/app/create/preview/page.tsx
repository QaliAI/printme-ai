'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { LiveProductMockups } from '@/components/LiveProductMockups';
import { supabase } from '@/lib/supabase';
import { UserUpload, GeneratedDesign } from '@/lib/types';

const generationStages = [
  { icon: '🔍', text: 'Analyzing your photo...' },
  { icon: '🎨', text: 'Applying artistic style...' },
  { icon: '✨', text: 'Adding magical details...' },
  { icon: '💫', text: 'Polishing the final touches...' },
];

// Module-level deterministic particle positions
const PARTICLES = Array.from({ length: 20 }, (_, i) => {
  const seed = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  const seedB = Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1;
  return {
    x: `${seed * 100}%`,
    duration: 3 + seedB * 2,
    delay: i * 0.2,
  };
});

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
  const [stageIndex, setStageIndex] = useState(0);
  const particles = PARTICLES;

  const generateDesign = async (uploadData?: UserUpload) => {
    const current = uploadData || upload;
    if (!current) return;

    setRegenerating(true);
    setError(null);
    setStageIndex(0);

    try {
      const response = await fetch('/api/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          styleId,
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

  const fetchData = async () => {
    try {
      const { data: uploadData, error: uploadError } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('id', uploadId)
        .single();

      if (uploadError) throw uploadError;
      setUpload(uploadData);

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
        await generateDesign(uploadData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load upload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!uploadId || !styleId) {
      router.push('/app/create/style');
      return;
    }
    // Data fetching pattern - intentionally triggers setState inside effect
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    fetchData();
  }, [uploadId, styleId, router]);

  // Cycle through generation stages
  useEffect(() => {
    if (!regenerating) return;
    const interval = setInterval(() => {
      setStageIndex((s) => (s + 1) % generationStages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [regenerating]);

  const tryDifferentStyle = async () => {
    if (!upload) return;
    setRegenerating(true);
    setError(null);
    setStageIndex(0);

    try {
      const response = await fetch('/api/design/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          styleId,
          imageUrl: upload.original_url,
          previousDesignId: design?.id,
        }),
      });

      if (!response.ok) {
        // Fall back to regular generate
        return await generateDesign();
      }

      const newDesign = await response.json();
      setDesign(newDesign);
    } catch (err) {
      console.error('Regenerate error:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-6xl"
        >
          ✨
        </motion.div>
      </div>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 -left-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, -100, 0], y: [0, -100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <Container size="lg" className="py-12 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Design</span>
          </h1>
          <p className="text-lg text-gray-600">Slide to see the magic transformation</p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main slider */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="backdrop-blur-xl bg-white/70 border-white/40 shadow-xl overflow-hidden">
              <CardBody className="p-6">
                {regenerating ? (
                  /* AI Generation Animation */
                  <div className="relative aspect-square bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 rounded-2xl overflow-hidden">
                    {/* User's photo with scan lines */}
                    <img
                      src={upload.original_url}
                      alt="Generating"
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />

                    {/* Scanning effect */}
                    <motion.div
                      className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-blue-400/70 to-transparent"
                      animate={{ top: ['-20%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />

                    {/* Particles */}
                    {particles.map((p, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
                        initial={{
                          x: p.x,
                          y: '100%',
                          opacity: 0,
                        }}
                        animate={{
                          y: '-10%',
                          opacity: [0, 1, 0],
                          scale: [0, 1.5, 0],
                        }}
                        transition={{
                          duration: p.duration,
                          repeat: Infinity,
                          delay: p.delay,
                          ease: 'easeOut',
                        }}
                      />
                    ))}

                    {/* Center content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={stageIndex}
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.8 }}
                            transition={{ duration: 0.4 }}
                          >
                            <motion.div
                              className="text-8xl mb-4"
                              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              {generationStages[stageIndex].icon}
                            </motion.div>
                            <p className="font-semibold text-2xl mb-2">
                              {generationStages[stageIndex].text}
                            </p>
                          </motion.div>
                        </AnimatePresence>

                        <div className="flex justify-center gap-2 mt-6">
                          {generationStages.map((_, i) => (
                            <motion.div
                              key={i}
                              className={`h-1.5 rounded-full ${
                                i === stageIndex ? 'bg-white w-8' : 'bg-white/30 w-4'
                              }`}
                              animate={{ width: i === stageIndex ? 32 : 16 }}
                            />
                          ))}
                        </div>

                        <p className="text-sm opacity-70 mt-4">This usually takes 20-30 seconds</p>
                      </div>
                    </div>
                  </div>
                ) : design?.design_url ? (
                  <div>
                    <BeforeAfterSlider
                      beforeImage={upload.original_url}
                      afterImage={design.design_url}
                      beforeLabel="Original Photo"
                      afterLabel="AI Design"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center">
                    <p className="text-gray-500">No design yet</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>

          {/* Side panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Info card */}
            <Card className="backdrop-blur-xl bg-white/70 border-white/40 shadow-lg">
              <CardBody>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">📊</span> Design Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Dimensions</p>
                    <p className="font-semibold text-gray-900">
                      {upload.width} × {upload.height} px
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">File Size</p>
                    <p className="font-semibold text-gray-900">
                      {upload.file_size ? (upload.file_size / 1024 / 1024).toFixed(2) : 'N/A'} MB
                    </p>
                  </div>
                  {design?.status && (
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-semibold text-gray-900 capitalize flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {design.status}
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Quality checks */}
            <Card className="backdrop-blur-xl bg-gradient-to-br from-green-50/80 to-emerald-50/80 border-green-200 shadow-lg">
              <CardBody>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">✨</span> Quality Check
                </h3>
                <ul className="space-y-2 text-sm">
                  {[
                    'Design generated successfully',
                    'High resolution for printing',
                    'Ready to apply to products',
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex gap-2 items-center"
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                        className="text-green-600 font-bold"
                      >
                        ✓
                      </motion.span>
                      <span className="text-gray-700">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </motion.div>
        </div>

        {/* Live Printify Mockups - the user's design rendered on every product */}
        {design?.design_url && !regenerating && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12"
          >
            <Card className="backdrop-blur-xl bg-white/70 border-white/40 shadow-xl">
              <CardBody className="p-6 md:p-8">
                <LiveProductMockups
                  designUrl={design.design_url}
                  onSelectProduct={() =>
                    router.push(`/app/create/products?design=${design.id}`)
                  }
                />
              </CardBody>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 mt-8"
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={tryDifferentStyle}
              disabled={regenerating}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {regenerating ? '✨ Generating...' : '🔄 Try Different Style'}
            </Button>
          </motion.div>
          <div className="flex-1" />
          <motion.div
            whileHover={!regenerating && design?.design_url ? { scale: 1.02 } : {}}
            whileTap={!regenerating && design?.design_url ? { scale: 0.98 } : {}}
          >
            <Button
              onClick={() => router.push(`/app/create/products?design=${design?.id}`)}
              disabled={!design?.design_url || regenerating}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              Choose Products →
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}
