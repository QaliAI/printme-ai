'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';

// Module-level deterministic shape positions (purity-safe)
const SHAPES = Array.from({ length: 6 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  const b = Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1;
  const c = Math.abs(Math.sin(i * 39.346) * 43758.5453) % 1;
  const d = Math.abs(Math.sin(i * 91.421) * 43758.5453) % 1;
  return {
    width: 200 + a * 280,
    height: 200 + b * 280,
    left: `${c * 100}%`,
    top: `${d * 100}%`,
    moveX: a * 80 - 40,
    moveY: b * 80 - 40,
    duration: 15 + c * 12,
  };
});

export function CTASection() {
  const shapes = SHAPES;

  return (
    <section className="py-24 relative overflow-hidden bg-slate-950">
      {/* Animated gradient mesh */}
      <div className="absolute inset-0 overflow-hidden opacity-50">
        {shapes.map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-rose-500/30 filter blur-3xl"
            style={{
              width: `${s.width}px`,
              height: `${s.height}px`,
              left: s.left,
              top: s.top,
            }}
            animate={{
              x: [0, s.moveX],
              y: [0, s.moveY],
            }}
            transition={{
              duration: s.duration,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <Container size="md" className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-white"
        >
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="inline-block text-xs font-semibold tracking-widest text-indigo-300 uppercase mb-4"
          >
            Ready When You Are
          </motion.div>

          <h2 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Your next favorite piece<br />
            is{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
              one photo away
            </span>
          </h2>

          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-xl mx-auto">
            Join thousands turning everyday moments into one-of-a-kind prints.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-100 shadow-2xl transition-all px-8 py-4 text-base font-semibold"
                >
                  Start Creating Free
                </Button>
              </motion.div>
            </Link>
            <Link href="/app">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border border-white/30 text-white hover:bg-white/10 backdrop-blur-md px-8 py-4 text-base font-semibold"
                >
                  View Gallery
                </Button>
              </motion.div>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-16 flex items-center justify-center gap-8 text-xs text-slate-400 tracking-wide uppercase"
          >
            <div>90 Second Setup</div>
            <div className="w-px h-3 bg-slate-700" />
            <div>Premium Print</div>
            <div className="w-px h-3 bg-slate-700" />
            <div>Worldwide Shipping</div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
