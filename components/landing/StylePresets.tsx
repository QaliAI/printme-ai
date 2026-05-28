'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/Container';

const styles = [
  { name: 'Oil Painting', tagline: 'Rich, classical', gradient: 'from-amber-600 to-orange-700' },
  { name: 'Watercolor', tagline: 'Soft, dreamy', gradient: 'from-cyan-500 to-blue-600' },
  { name: 'Pop Art', tagline: 'Bold, vibrant', gradient: 'from-rose-500 to-red-600' },
  { name: 'Vintage', tagline: 'Warm, nostalgic', gradient: 'from-amber-700 to-yellow-700' },
  { name: 'B&W Editorial', tagline: 'Cinematic mono', gradient: 'from-slate-700 to-slate-900' },
  { name: 'Cartoon', tagline: 'Playful lines', gradient: 'from-yellow-500 to-pink-500' },
  { name: 'Royal Portrait', tagline: 'Regal, elegant', gradient: 'from-purple-600 to-amber-500' },
  { name: 'Sketch', tagline: 'Hand-drawn', gradient: 'from-slate-400 to-slate-600' },
  { name: 'Line Art', tagline: 'Minimal, clean', gradient: 'from-slate-500 to-slate-700' },
  { name: 'Cinematic', tagline: 'Dramatic mood', gradient: 'from-indigo-700 to-purple-800' },
  { name: 'Toy Style', tagline: 'Soft 3D', gradient: 'from-pink-400 to-rose-500' },
  { name: 'Clean Cutout', tagline: 'Crisp subject', gradient: 'from-emerald-500 to-teal-600' },
];

export function StylePresets() {
  return (
    <section className="py-24 bg-white relative">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-block text-xs font-semibold tracking-widest text-indigo-600 uppercase mb-3">
            12 AI Style Presets
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            One photo,{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              twelve looks
            </span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Don&apos;t love the first one? Switch styles instantly.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {styles.map((style, i) => (
            <motion.div
              key={style.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4 }}
              className="group cursor-pointer"
            >
              <div
                className={`relative aspect-[5/6] rounded-xl bg-gradient-to-br ${style.gradient} overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-300`}
              >
                {/* Subtle texture overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />

                {/* Shimmer on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                />

                {/* Content */}
                <div className="relative h-full flex flex-col justify-end p-5">
                  <div className="text-white">
                    <p className="text-[10px] tracking-widest uppercase opacity-80 mb-1">
                      {style.tagline}
                    </p>
                    <h3 className="font-bold text-lg leading-tight">{style.name}</h3>
                  </div>
                </div>

                {/* Hover arrow */}
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
