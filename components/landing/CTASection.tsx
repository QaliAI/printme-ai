'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';

// Module-level deterministic shape positions
const SHAPES = Array.from({ length: 8 }, (_, i) => {
  const a = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  const b = Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1;
  const c = Math.abs(Math.sin(i * 39.346) * 43758.5453) % 1;
  const d = Math.abs(Math.sin(i * 91.421) * 43758.5453) % 1;
  return {
    width: 100 + a * 200,
    height: 100 + b * 200,
    left: `${c * 100}%`,
    top: `${d * 100}%`,
    moveX: a * 100 - 50,
    moveY: b * 100 - 50,
    duration: 10 + c * 10,
  };
});

export function CTASection() {
  const shapes = SHAPES;

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"
        animate={{
          background: [
            'linear-gradient(135deg, #2563eb, #9333ea, #db2777)',
            'linear-gradient(135deg, #9333ea, #db2777, #2563eb)',
            'linear-gradient(135deg, #db2777, #2563eb, #9333ea)',
            'linear-gradient(135deg, #2563eb, #9333ea, #db2777)',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {shapes.map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: `${s.width}px`,
              height: `${s.height}px`,
              left: s.left,
              top: s.top,
            }}
            animate={{
              x: [0, s.moveX],
              y: [0, s.moveY],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: s.duration,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}
      </div>

      <Container size="md" className="relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-white"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="text-7xl mb-6 inline-block"
          >
            ✨
          </motion.div>

          <h2 className="text-5xl md:text-6xl font-black mb-6 drop-shadow-lg">
            Ready to Create<br />
            Something Magical?
          </h2>

          <p className="text-xl md:text-2xl mb-10 opacity-90 max-w-2xl mx-auto">
            Your next favorite piece of art is just one photo away.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  className="bg-white text-purple-600 hover:bg-gray-100 shadow-2xl hover:shadow-white/50 transition-all px-8 py-4 text-lg font-bold"
                >
                  📸 Start Creating Free
                </Button>
              </motion.div>
            </Link>
            <Link href="/app">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-md px-8 py-4 text-lg font-bold"
                >
                  See Gallery
                </Button>
              </motion.div>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex items-center justify-center gap-8 text-sm opacity-80"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span>90 second magic</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <span>Premium quality</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚚</span>
              <span>Ships worldwide</span>
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
