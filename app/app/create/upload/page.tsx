'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const styleId = searchParams.get('style');

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!styleId) {
      router.push('/app/create/style');
    }
  }, [styleId, router]);

  const processFile = (file: File) => {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
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
        // Redirect to signin and preserve upload configuration
        router.push(`/auth/signin?redirect=${encodeURIComponent(`/app/create/upload?style=${styleId}`)}`);
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
    { icon: '📸', text: 'Use a high-quality photo (1000×1000px or larger for crisp printing)' },
    { icon: '💡', text: 'Ensure the subject is well-lit and faces forward clearly' },
    { icon: '👤', text: 'Single subjects work best (pets, people, or distinct travel objects)' },
    { icon: '🎯', text: 'Avoid dark shadows, extreme angles, or blurry action shots' },
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
      </div>

      <Container size="lg" className="py-12 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            <span>Step 2 of 3</span>
            <span className="w-1 h-1 rounded-full bg-indigo-300" />
            <span>Upload Photo</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Upload Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Photo</span>
          </h1>
          <p className="text-lg text-gray-600">Take a fresh snap or pick your favorite portrait</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="backdrop-blur-xl bg-white/70 border-white/40 shadow-xl overflow-hidden">
                <CardBody className="p-6 md:p-8">
                  <AnimatePresence mode="wait">
                    {!preview ? (
                      <motion.div
                        key="upload-zone"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6"
                      >
                        {/* Drag and Drop Zone */}
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => galleryInputRef.current?.click()}
                          className={`border-3 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                            dragActive
                              ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]'
                              : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600 shadow-inner">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-slate-800 text-lg mb-1">Drag and drop your photo here</h3>
                          <p className="text-sm text-slate-500 mb-6">or click to browse your files</p>
                          <div className="flex flex-wrap justify-center gap-3">
                            <span className="bg-white/90 border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm">
                              JPEG, PNG, WebP
                            </span>
                            <span className="bg-white/90 border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm">
                              Max size 10MB
                            </span>
                          </div>
                        </div>

                        {/* Mobile Camera and Quick Actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => cameraInputRef.current?.click()}
                            className="relative group overflow-hidden bg-indigo-600 text-white font-semibold rounded-xl py-4 px-6 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3"
                          >
                            <span className="text-xl">📷</span>
                            <span>Take Live Photo</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => galleryInputRef.current?.click()}
                            className="relative group overflow-hidden bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl py-4 px-6 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3"
                          >
                            <span className="text-xl">🖼️</span>
                            <span>Photo Library</span>
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
                          className="relative w-full bg-gray-100 rounded-2xl overflow-hidden shadow-lg border border-slate-200"
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
                                <p className="font-semibold text-lg mb-2">Processing & Uploading...</p>
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
                            className="text-xs text-slate-500 text-center"
                          >
                            Image Resolution: {dimensions.width} × {dimensions.height} pixels
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
                              Choose Different Photo
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
              <CardBody className="p-6">
                <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2 text-lg">
                  <span className="text-xl">✨</span> Upload Guidelines
                </h3>
                <ul className="space-y-4">
                  {qualityTips.map((tip, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex gap-3.5 items-start"
                    >
                      <span className="text-2xl flex-shrink-0 bg-slate-100/80 w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200/50">{tip.icon}</span>
                      <span className="text-sm text-slate-600 mt-1 leading-relaxed">{tip.text}</span>
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
          className="flex gap-4 mt-8 border-t border-slate-200 pt-6"
        >
          <Button
            onClick={() => router.push('/app/create/style')}
            variant="outline"
            className="flex-1 md:flex-none"
            disabled={loading}
          >
            ← Back to Styles
          </Button>
          <div className="flex-1" />
          <motion.div
            whileHover={selectedFile && !loading ? { scale: 1.02 } : {}}
            whileTap={selectedFile && !loading ? { scale: 0.98 } : {}}
          >
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              className="flex-1 md:flex-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-10 shadow-lg"
            >
              {loading ? 'Uploading...' : '✨ Generate My Design'}
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
          <div className="text-6xl animate-pulse">✨</div>
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
