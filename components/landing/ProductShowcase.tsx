'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Container } from '@/components/Container';

// Module-level deterministic star positions (computed once at load, never re-runs)
const STARS = Array.from({ length: 50 }, (_, i) => {
  // Use trig to create natural-looking pseudo-random distribution
  const seedA = Math.sin(i * 12.9898) * 43758.5453;
  const seedB = Math.sin(i * 78.233) * 43758.5453;
  const seedC = Math.sin(i * 39.346) * 43758.5453;
  return {
    left: `${Math.abs(seedA - Math.floor(seedA)) * 100}%`,
    top: `${Math.abs(seedB - Math.floor(seedB)) * 100}%`,
    duration: 2 + Math.abs(seedC - Math.floor(seedC)) * 3,
    delay: Math.abs(seedA - Math.floor(seedA)) * 2,
  };
});

const products = [
  { name: 'T-Shirt', emoji: '👕', from: '$24', color: 'from-blue-400 to-blue-600' },
  { name: 'Mug', emoji: '☕', from: '$14', color: 'from-amber-400 to-amber-600' },
  { name: 'Canvas', emoji: '🖼️', from: '$39', color: 'from-purple-400 to-purple-600' },
  { name: 'Poster', emoji: '📄', from: '$12', color: 'from-pink-400 to-pink-600' },
  { name: 'Hoodie', emoji: '🧥', from: '$44', color: 'from-gray-500 to-gray-700' },
  { name: 'Phone Case', emoji: '📱', from: '$19', color: 'from-emerald-400 to-emerald-600' },
  { name: 'Tote Bag', emoji: '👜', from: '$18', color: 'from-orange-400 to-orange-600' },
  { name: 'Sticker', emoji: '⭐', from: '$4', color: 'from-yellow-400 to-yellow-600' },
];

export function ProductShowcase() {
  const [hovered, setHovered] = useState<string | null>(null);
  const stars = STARS;

  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated stars */}
      <div className="absolute inset-0">
        {stars.map((star, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{ left: star.left, top: star.top }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [0.5, 1.2, 0.5],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
            }}
          />
        ))}
      </div>

      <Container size="lg" className="relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Print On <span className="animate-text-shimmer">Anything</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            From shirts to mugs to canvases—pick your favorite
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((product, i) => (
            <motion.div
              key={product.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              onMouseEnter={() => setHovered(product.name)}
              onMouseLeave={() => setHovered(null)}
              className="group cursor-pointer perspective-1000"
            >
              <motion.div
                whileHover={{
                  rotateY: 15,
                  rotateX: -10,
                  scale: 1.05,
                }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative preserve-3d"
              >
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 hover:bg-white/20 transition-all duration-300 shadow-xl">
                  {/* Glow effect on hover */}
                  <div
                    className={`absolute -inset-0.5 bg-gradient-to-r ${product.color} rounded-3xl opacity-0 group-hover:opacity-50 blur transition-opacity duration-500 -z-10`}
                  />

                  {/* Product emoji */}
                  <motion.div
                    animate={{
                      y: hovered === product.name ? [-2, 2, -2] : 0,
                      rotate: hovered === product.name ? [-5, 5, -5] : 0,
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-7xl mb-4 text-center"
                  >
                    {product.emoji}
                  </motion.div>

                  <h3 className="text-white font-bold text-xl text-center mb-1">
                    {product.name}
                  </h3>
                  <p className="text-gray-300 text-center text-sm">
                    from <span className="font-bold text-white">{product.from}</span>
                  </p>

                  {/* Particle on hover */}
                  {hovered === product.name && (
                    <>
                      {[...Array(6)].map((_, j) => (
                        <motion.div
                          key={j}
                          className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                          initial={{
                            x: '50%',
                            y: '50%',
                            opacity: 0,
                          }}
                          animate={{
                            x: `${50 + (Math.cos((j / 6) * Math.PI * 2) * 100)}%`,
                            y: `${50 + (Math.sin((j / 6) * Math.PI * 2) * 100)}%`,
                            opacity: [0, 1, 0],
                          }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: j * 0.1 }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-400 mt-12"
        >
          + Hoodies, frames, blankets, pillows & 50+ more products
        </motion.p>
      </Container>
    </section>
  );
}
