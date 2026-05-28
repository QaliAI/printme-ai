'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/Container';

const styles = [
  { name: 'Oil Painting', emoji: '🎨', color: 'from-amber-400 to-orange-500' },
  { name: 'Watercolor', emoji: '💧', color: 'from-cyan-400 to-blue-500' },
  { name: 'Pop Art', emoji: '💥', color: 'from-pink-400 to-red-500' },
  { name: 'Vintage', emoji: '📷', color: 'from-amber-700 to-yellow-600' },
  { name: 'B&W Editorial', emoji: '⚫', color: 'from-gray-700 to-gray-900' },
  { name: 'Cartoon', emoji: '🎭', color: 'from-yellow-400 to-pink-500' },
  { name: 'Pet Royal', emoji: '👑', color: 'from-purple-500 to-yellow-500' },
  { name: 'Sketch', emoji: '✏️', color: 'from-gray-400 to-gray-600' },
  { name: 'Line Art', emoji: '📐', color: 'from-slate-500 to-slate-700' },
  { name: 'Cinematic', emoji: '🎬', color: 'from-indigo-600 to-purple-800' },
  { name: 'Toy Style', emoji: '🧸', color: 'from-pink-300 to-rose-400' },
  { name: 'Clean Cutout', emoji: '✂️', color: 'from-emerald-400 to-teal-500' },
];

export function StylePresets() {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-purple-50 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <pattern id="dotgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dotgrid)" />
        </svg>
      </div>

      <Container size="lg" className="relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            12 AI Style Presets
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            One photo, twelve incredible transformations
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {styles.map((style, i) => (
            <motion.div
              key={style.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -8, scale: 1.03 }}
              className="group relative cursor-pointer"
            >
              <div
                className={`relative aspect-square rounded-2xl bg-gradient-to-br ${style.color} overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300`}
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,white,transparent)]" />
                </div>

                {/* Shimmer effect on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                />

                {/* Content */}
                <div className="relative h-full flex flex-col items-center justify-center p-4 text-white">
                  <motion.div
                    className="text-5xl mb-2"
                    whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    {style.emoji}
                  </motion.div>
                  <p className="text-center font-bold text-sm md:text-base drop-shadow-md">
                    {style.name}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
