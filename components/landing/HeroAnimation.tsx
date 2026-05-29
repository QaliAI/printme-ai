'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { HERO_IMAGES } from '@/lib/assets';

// Deterministic positions for floating accent particles (purity-rule safe)
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  delay: i * 0.15,
  startX: 50 + ((i * 23) % 100) - 50,
  endX: 180 + ((i * 47) % 120),
  endY: -30 + ((i * 31) % 60),
}));

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
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Subtle premium gradient mesh */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-200/40 to-transparent filter blur-3xl"
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/4 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-rose-200/40 to-transparent filter blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, 80, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <Container size="lg" className="relative z-10 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Editorial Typography */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-7"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-4 py-2 self-start shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-slate-700 tracking-wide uppercase">AI-Powered · Ships Worldwide</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05]">
              Snap.<br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 bg-clip-text text-transparent">
                Transform.
              </span><br />
              Print.
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-slate-600 max-w-lg leading-relaxed"
            >
              Turn any photo into stunning custom prints on shirts, mugs, posters & more. AI does the magic in 90 seconds.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link href="/auth/signup" className="w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 transition-shadow"
                  >
                    Start Creating Free
                  </Button>
                </motion.div>
              </Link>
              <Link href="#how-it-works" className="w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
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
              className="flex items-center gap-8 pt-6 border-t border-slate-200 text-sm text-slate-600"
            >
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">90s</span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Avg. Creation</span>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">12+</span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">AI Styles</span>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">Free</span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Shipping</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Real Photo → T-Shirt Transformation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative h-[520px] md:h-[600px]"
          >
            {/* Phone with REAL photo */}
            <motion.div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-52 h-[26rem] z-20"
              animate={{
                rotate: [-3, 3, -3],
                y: ['-50%', 'calc(-50% - 8px)', '-50%'],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Phone bezel */}
              <div className="relative w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-2.5 shadow-2xl ring-1 ring-slate-700/50">
                <div className="w-full h-full bg-black rounded-[2rem] overflow-hidden relative">
                  {/* Camera notch */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                  </div>

                  {/* Real photo on screen */}
                  <div className="relative w-full h-full">
                    <img
                      src={HERO_IMAGES.phoneScreen}
                      alt="Your photo"
                      className="w-full h-full object-cover"
                    />

                    {/* Subtle status bar overlay */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/30 to-transparent" />

                    {/* AI scan effect during transform stages */}
                    {(stage === 1 || stage === 2) && (
                      <>
                        <motion.div
                          className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent pointer-events-none"
                          animate={{ y: ['-50%', '120%'] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="absolute inset-0 ring-2 ring-cyan-400/60 rounded-[2rem] pointer-events-none" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Phone shadow */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-36 h-4 bg-black/20 blur-xl rounded-full" />
            </motion.div>

            {/* Particle transfer stream */}
            {(stage === 1 || stage === 2) && (
              <div className="absolute inset-0 pointer-events-none z-15">
                {particles.map((p, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 shadow-lg shadow-indigo-500/50"
                    initial={{
                      left: '28%',
                      top: '50%',
                      opacity: 0,
                      scale: 0,
                    }}
                    animate={{
                      left: ['28%', '50%', '70%'],
                      top: [`${50 + p.startX * 0.1}%`, `${50 + p.endY * 0.5}%`, `${50 + p.endY * 0.3}%`],
                      opacity: [0, 1, 0],
                      scale: [0, 1.4, 0],
                    }}
                    transition={{
                      duration: 2.2,
                      delay: p.delay,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
            )}

            {/* AI sparkle marker */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
              animate={{
                opacity: stage === 1 || stage === 2 ? 1 : 0,
                scale: stage === 1 || stage === 2 ? [0.8, 1.2, 0.8] : 0,
              }}
              transition={{
                opacity: { duration: 0.4 },
                scale: { duration: 1.8, repeat: Infinity },
              }}
            >
              <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-xl border border-slate-200">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600"
                />
                <span className="text-xs font-semibold text-slate-700">AI Magic</span>
              </div>
            </motion.div>

            {/* T-Shirt with applied design */}
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-80 z-10"
              animate={{
                rotate: stage === 3 ? [-2, 2, -2] : 0,
                scale: stage >= 2 ? 1 : 0.92,
                opacity: stage >= 2 ? 1 : 0.55,
                y: stage === 3 ? ['-50%', 'calc(-50% - 6px)', '-50%'] : '-50%',
              }}
              transition={{
                rotate: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 0.6 },
                opacity: { duration: 0.6 },
                y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <div className="relative">
                {/* Real t-shirt photo */}
                <img
                  src={HERO_IMAGES.shirtBlank}
                  alt="Custom printed t-shirt"
                  className="w-full h-auto drop-shadow-2xl"
                />

                {/* Design overlay - transparent dog cutout printed onto the shirt */}
                <motion.div
                  className="absolute top-[29%] left-[27%] w-[46%] h-[36%] pointer-events-none"
                  animate={{
                    opacity: stage >= 2 ? 1 : 0,
                    scale: stage >= 2 ? 1 : 0.5,
                  }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <img
                    src={HERO_IMAGES.dogCutout}
                    alt="Dog cutout printed on shirt"
                    className="absolute inset-0 w-full h-full object-contain mix-blend-multiply opacity-90 saturate-90 contrast-95 brightness-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-[9%] opacity-60 mix-blend-soft-light"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 30% 40%, rgba(15,23,42,0.08) 0 1px, transparent 1px), repeating-linear-gradient(12deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 5px)',
                      backgroundSize: '7px 7px, 9px 9px',
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Stage progress indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-30">
              {['Snap', 'Scan', 'Design', 'Print'].map((label, i) => (
                <motion.div
                  key={label}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide transition-all ${
                    stage === i
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-white/80 backdrop-blur-md text-slate-500 border border-slate-200'
                  }`}
                  animate={{
                    scale: stage === i ? 1.05 : 1,
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
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </section>
  );
}
