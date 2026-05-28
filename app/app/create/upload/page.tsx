'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { supabase } from '@/lib/supabase';
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!styleId) {
      router.push('/app/create/style');
    }
  }, [styleId, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File must be smaller than 10MB');
      return;
    }

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
    setUploadProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 200);

    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/auth/signin?redirect=/app');
        return;
      }

      const timestamp = Date.now();
      const filename = `${user.id}/${timestamp}-${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filename, selectedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('user-uploads').getPublicUrl(filename);
      const publicUrl = data?.publicUrl || '';

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

      setUploadProgress(100);
      setTimeout(() => {
        router.push(`/app/create/preview?upload=${uploadRecord.id}&style=${styleId}`);
      }, 400);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setLoading(false);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const qualityTips = [
    { icon: '📸', text: 'High quality photo (1000×1000px or larger)' },
    { icon: '💡', text: 'Clear, well-lit subject matter' },
    { icon: '👤', text: 'Face-forward or clearly visible subject' },
    { icon: '🎯', text: 'Minimal background distractions' },
  ];

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
        <motion.div
          className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
          animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <Container size="lg" className="py-12 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Upload Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Photo</span>
          </h1>
          <p className="text-lg text-gray-600">Take a snap or pick from your gallery</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="backdrop-blur-xl bg-white/70 border-white/40 shadow-xl">
                <CardBody className="p-6 md:p-8">
                  <AnimatePresence mode="wait">
                    {!preview ? (
                      <motion.div
                        key="upload-buttons"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Camera Button */}
                          <motion.button
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => cameraInputRef.current?.click()}
                            className="relative group overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold rounded-2xl py-8 px-6 shadow-lg hover:shadow-2xl transition-shadow"
                          >
                            <motion.div
                              className="absolute inset-0 bg-white/20"
                              initial={{ x: '-100%' }}
                              whileHover={{ x: '100%' }}
                              transition={{ duration: 0.6 }}
                            />
                            <div className="relative flex flex-col items-center gap-3">
                              <motion.span
                                className="text-5xl"
                                animate={{ rotate: [0, -5, 5, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                              >
                                📷
                              </motion.span>
                              <span className="text-lg">Take Photo</span>
                              <span className="text-xs opacity-80">Use your camera</span>
                            </div>
                          </motion.button>

                          {/* Gallery Button */}
                          <motion.button
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => galleryInputRef.current?.click()}
                            className="relative group overflow-hidden bg-gradient-to-br from-pink-500 to-orange-500 text-white font-semibold rounded-2xl py-8 px-6 shadow-lg hover:shadow-2xl transition-shadow"
                          >
                            <motion.div
                              className="absolute inset-0 bg-white/20"
                              initial={{ x: '-100%' }}
                              whileHover={{ x: '100%' }}
                              transition={{ duration: 0.6 }}
                            />
                            <div className="relative flex flex-col items-center gap-3">
                              <motion.span
                                className="text-5xl"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 2.5, repeat: Infinity }}
                              >
                                🖼️
                              </motion.span>
                              <span className="text-lg">Choose Photo</span>
                              <span className="text-xs opacity-80">From gallery</span>
                            </div>
                          </motion.button>
                        </div>

                        <input
                          ref={cameraInputRef}
                          type="file"
                          className="hidden"
                          accept={ACCEPTED_TYPES.join(',')}
                          capture="environment"
                          onChange={handleFileSelect}
                        />
                        <input
                          ref={galleryInputRef}
                          type="file"
                          className="hidden"
                          accept={ACCEPTED_TYPES.join(',')}
                          onChange={handleFileSelect}
                        />

                        <p className="text-xs text-gray-500 text-center pt-2">
                          JPEG, PNG, or WebP • Max 10MB
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-4"
                      >
                        <motion.div
                          className="relative w-full bg-gray-100 rounded-2xl overflow-hidden shadow-lg"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                        >
                          <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-auto max-h-[28rem] object-contain mx-auto"
                          />
                          {/* Scan line during upload */}
                          {loading && (
                            <motion.div
                              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                              initial={{ top: 0 }}
                              animate={{ top: '100%' }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            />
                          )}
                          {loading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                              <div className="text-center text-white">
                                <motion.div
                                  className="text-6xl mb-4"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                >
                                  ✨
                                </motion.div>
                                <p className="font-semibold text-lg mb-2">Uploading...</p>
                                <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                  />
                                </div>
                                <p className="text-sm mt-2 opacity-80">{Math.round(uploadProgress)}%</p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                        {dimensions && !loading && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-gray-600 text-center"
                          >
                            {dimensions.width} × {dimensions.height} px
                          </motion.p>
                        )}
                        {!loading && (
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
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <p className="text-sm text-red-700">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardBody>
              </Card>
            </motion.div>
          </div>

          {/* Quality Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="backdrop-blur-xl bg-white/70 border-white/40 shadow-xl">
              <CardBody>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">✨</span> Quality Tips
                </h3>
                <ul className="space-y-3">
                  {qualityTips.map((tip, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex gap-3 items-start"
                    >
                      <span className="text-xl flex-shrink-0">{tip.icon}</span>
                      <span className="text-sm text-gray-600">{tip.text}</span>
                    </motion.li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-4 mt-8"
        >
          <Button
            onClick={() => router.push('/app/create/style')}
            variant="outline"
            className="flex-1 md:flex-none"
            disabled={loading}
          >
            ← Back
          </Button>
          <div className="flex-1" />
          <motion.div
            whileHover={selectedFile && !loading ? { scale: 1.02 } : {}}
            whileTap={selectedFile && !loading ? { scale: 0.98 } : {}}
          >
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? 'Uploading...' : '✨ Generate My Design'}
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}
