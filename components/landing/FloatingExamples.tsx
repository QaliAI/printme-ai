'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/Container';

const examples = [
  {
    label: 'Pet Portrait',
    before: '🐕',
    after: '👑🐕',
    style: 'Royal',
    bgBefore: 'from-amber-200 to-orange-300',
    bgAfter: 'from-purple-500 to-yellow-400',
  },
  {
    label: 'Family Photo',
    before: '👨‍👩‍👧',
    after: '🎨',
    style: 'Oil Painting',
    bgBefore: 'from-pink-200 to-rose-300',
    bgAfter: 'from-amber-400 to-orange-600',
  },
  {
    label: 'Travel Memory',
    before: '🏔️',
    after: '🌄',
    style: 'Watercolor',
    bgBefore: 'from-blue-200 to-cyan-300',
    bgAfter: 'from-cyan-400 to-blue-600',
  },
];

export function FloatingExamples() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            See The <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Transformation</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Real examples from real users
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {examples.map((ex, i) => (
            <motion.div
              key={ex.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="group"
              style={{
                animation: `float-slow ${6 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            >
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-500">
                {/* Before/After visual */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <div className="absolute inset-0 grid grid-cols-2">
                    {/* Before */}
                    <div className={`bg-gradient-to-br ${ex.bgBefore} flex items-center justify-center`}>
                      <span className="text-8xl drop-shadow-lg">{ex.before}</span>
                    </div>
                    {/* After */}
                    <div className={`bg-gradient-to-br ${ex.bgAfter} flex items-center justify-center relative overflow-hidden`}>
                      <span className="text-8xl drop-shadow-lg">{ex.after}</span>
                      {/* Sparkles */}
                      <motion.div
                        className="absolute top-4 right-4 text-2xl"
                        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        ✨
                      </motion.div>
                    </div>
                  </div>

                  {/* Divider line */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-white shadow-lg z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l-4 4 4 4M16 17l4-4-4-4" />
                      </svg>
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded-full">
                    Before
                  </div>
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full">
                    After ✨
                  </div>
                </div>

                {/* Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{ex.label}</p>
                      <p className="text-sm text-gray-500">{ex.style} style</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
