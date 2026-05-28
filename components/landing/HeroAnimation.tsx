'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';

// Deterministic pseudo-random distribution for particles
// Generated once at module load - never re-evaluates
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  delay: i * 0.1,
  x: 150 + ((i * 73) % 200),
  y: -50 + ((i * 37) % 100),
}));

// Particle component for the AI magic effect
function Particle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
      initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
      animate={{
        x: [0, x * 0.5, x],
        y: [0, y * 0.3, y],
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Infinity,
        repeatDelay: 1,
        ease: 'easeOut',
      }}
      style={{ left: '20%', top: '50%' }}
    />
  );
}

const STAGE_COUNT = 4;

export function HeroAnimation() {
  const [stage, setStage] = useState(0);
  const particles = PARTICLES;

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => (s + 1) % STAGE_COUNT);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, 100, 0], y: [0, 100, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-40 -right-20 w-[500px] h-[500px] bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, -100, 0], y: [0, 150, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-20 left-1/2 w-[500px] h-[500px] bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [-50, 50, -50], y: [0, -50, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <Container size="lg" className="relative z-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md border border-white/40 rounded-full px-4 py-2 self-start shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-gray-700">AI-Powered • Ships Worldwide</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-tight">
              Snap. <br />
              <span className="animate-text-shimmer">Transform.</span> <br />
              Print.
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-600 max-w-lg"
            >
              Turn any photo into stunning custom prints on shirts, mugs, posters & more. AI does the magic in 90 seconds.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/auth/signup" className="w-full sm:w-auto">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-xl hover:shadow-2xl animate-pulse-glow"
                  >
                    📸 Start Creating Free
                  </Button>
                </motion.div>
              </Link>
              <Link href="#how-it-works" className="w-full sm:w-auto">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full backdrop-blur-md bg-white/40 border-white/60"
                  >
                    See How It Works
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-6 pt-4 text-sm text-gray-600"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span><strong>90 seconds</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎨</span>
                <span><strong>12+ styles</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📦</span>
                <span><strong>Ships free</strong></span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Animated Transformation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative h-[500px] md:h-[600px]"
          >
            {/* Phone */}
            <motion.div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-48 h-80 z-20"
              animate={{
                rotate: [-2, 2, -2],
                y: ['-50%', 'calc(-50% - 10px)', '-50%'],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                  {/* Camera notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-full z-10"></div>

                  {/* Photo content */}
                  <motion.div
                    className="w-full h-full bg-gradient-to-br from-orange-300 via-pink-300 to-purple-400 flex items-center justify-center"
                    animate={{
                      scale: stage === 0 ? [1, 1.05, 1] : 1,
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="text-7xl">🐕</div>
                  </motion.div>

                  {/* Scan effect on stage 1 */}
                  {(stage === 1 || stage === 2) && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/60 to-transparent h-20"
                      animate={{ top: ['-20%', '120%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Particle stream */}
            {(stage === 1 || stage === 2) && (
              <div className="absolute left-48 top-1/2 -translate-y-1/2 w-64 h-32 pointer-events-none">
                {particles.map((p, i) => (
                  <Particle key={i} {...p} />
                ))}
              </div>
            )}

            {/* AI sparkle indicator */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
              animate={{
                opacity: stage === 1 || stage === 2 ? 1 : 0,
                scale: stage === 1 || stage === 2 ? [0.8, 1.2, 0.8] : 0,
                rotate: 360,
              }}
              transition={{
                opacity: { duration: 0.5 },
                scale: { duration: 2, repeat: Infinity },
                rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
              }}
            >
              <div className="text-6xl drop-shadow-2xl">✨</div>
            </motion.div>

            {/* Product mockup (t-shirt) */}
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-72 h-72 z-10"
              animate={{
                rotate: stage === 3 ? [-3, 3, -3] : 0,
                scale: stage === 3 ? [1, 1.05, 1] : 0.9,
                opacity: stage >= 2 ? 1 : 0.3,
              }}
              transition={{
                rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 0.6 },
                opacity: { duration: 0.6 },
              }}
            >
              {/* T-shirt SVG */}
              <div className="relative w-full h-full">
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                  <defs>
                    <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#f3f4f6" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 40 50 L 70 30 Q 100 45 130 30 L 160 50 L 175 80 L 150 90 L 150 180 L 50 180 L 50 90 L 25 80 Z"
                    fill="url(#shirtGrad)"
                    stroke="#e5e7eb"
                    strokeWidth="2"
                  />
                </svg>
                {/* Design printed on shirt */}
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg"
                  animate={{
                    opacity: stage >= 2 ? 1 : 0,
                    scale: stage >= 2 ? 1 : 0,
                  }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <span className="text-4xl">🐕</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Stage labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-3">
              {['📸 Snap', '✨ AI Magic', '🎨 Design', '👕 Print'].map((label, i) => (
                <motion.div
                  key={label}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    stage === i
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-110'
                      : 'bg-white/60 backdrop-blur-md text-gray-600'
                  }`}
                  animate={{
                    scale: stage === i ? 1.1 : 1,
                  }}
                >
                  {label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </Container>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </section>
  );
}
