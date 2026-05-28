'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/Container';
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
            See how AI transforms ordinary photos into stunning custom art
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TRANSFORMATION_EXAMPLES.map((example, i) => (
            <motion.div
              key={example.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ y: -6 }}
              className="group"
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-500 ring-1 ring-slate-200">
                {/* Side-by-side photos */}
                <div className="relative aspect-[5/4] overflow-hidden">
                  <div className="absolute inset-0 grid grid-cols-2">
                    {/* Before — real photograph */}
                    <div className="relative overflow-hidden bg-slate-100">
                      <img
                        src={example.before}
                        alt={`${example.label} original`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
                        Before
                      </div>
                    </div>

                    {/* After — stylized */}
                    <div className="relative overflow-hidden bg-slate-100">
                      <img
                        src={example.after}
                        alt={`${example.label} AI styled`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full shadow-lg">
                        After
                      </div>
                      {/* Subtle sparkle accent */}
                      <motion.div
                        className="absolute bottom-4 right-4 w-6 h-6 text-white/90"
                        animate={{ rotate: 360, scale: [1, 1.15, 1] }}
                        transition={{
                          rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                          scale: { duration: 2, repeat: Infinity },
                        }}
                      >
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
                        </svg>
                      </motion.div>
                    </div>
                  </div>

                  {/* Center divider with handle */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/80">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center ring-1 ring-slate-200">
                      <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7l-4 4 4 4M16 17l4-4-4-4" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Caption */}
                <div className="p-5 flex items-center justify-between bg-white">
                  <div>
                    <h3 className="text-slate-900 font-semibold">{example.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 tracking-wide uppercase">
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
