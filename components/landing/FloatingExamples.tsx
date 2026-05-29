'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/Container';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { TRANSFORMATION_EXAMPLES } from '@/lib/assets';

export function FloatingExamples() {
  return (
    <section className="py-24 bg-white relative">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-block text-xs font-semibold tracking-widest text-rose-600 uppercase mb-3">
            See It In Action
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Real photos.{' '}
            <span className="bg-gradient-to-r from-rose-500 to-purple-600 bg-clip-text text-transparent">
              Real magic.
            </span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Drag each slider to compare the exact same photo before and after the selected style.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {TRANSFORMATION_EXAMPLES.map((example, i) => (
            <motion.div
              key={example.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.12 }}
              className="group"
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-500 ring-1 ring-slate-200">
                {/* Interactive drag-to-compare slider */}
                <BeforeAfterSlider
                  beforeImage={example.photo}
                  afterImage={example.afterPhoto}
                  beforeLabel="Original"
                  afterLabel={example.style}
                  initialPosition={48}
                  autoHint={i === 0}
                  className="!rounded-none !shadow-none"
                />

                {/* Caption row */}
                <div className="p-5 flex items-center justify-between bg-white border-t border-slate-100">
                  <div>
                    <h3 className="text-slate-900 font-semibold tracking-tight">
                      {example.label}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 tracking-widest uppercase">
                      {example.style}
                    </p>
                  </div>
                  <motion.div
                    className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-rose-500 group-hover:to-purple-600 flex items-center justify-center transition-colors"
                    whileHover={{ x: 2 }}
                  >
                    <svg
                      className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Helper text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-slate-500 mt-10"
        >
          Same composition. Same subject. Only the selected style changes.
        </motion.p>
      </Container>
    </section>
  );
}
