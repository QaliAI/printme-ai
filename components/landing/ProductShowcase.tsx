'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Container } from '@/components/Container';
import { PRODUCT_PHOTOS } from '@/lib/assets';

const PRODUCTS = [
  PRODUCT_PHOTOS.tshirt,
  PRODUCT_PHOTOS.mug,
  PRODUCT_PHOTOS.canvas,
  PRODUCT_PHOTOS.poster,
  PRODUCT_PHOTOS.hoodie,
  PRODUCT_PHOTOS.phoneCase,
  PRODUCT_PHOTOS.toteBag,
  PRODUCT_PHOTOS.sticker,
] as const;

interface ProductCardProps {
  product: (typeof PRODUCTS)[number];
  index: number;
  isHovered: boolean;
  onHover: (name: string | null) => void;
}

function ProductCard({ product, index, isHovered, onHover }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.06 }}
      onMouseEnter={() => onHover(product.name)}
      onMouseLeave={() => onHover(null)}
      className="group cursor-pointer"
    >
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-500"
      >
        {/* Real product photograph */}
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
            transition={{ duration: 0.4 }}
            loading="lazy"
          />

          {/* "Your Design Here" placeholder overlay positioned on the product */}
          <motion.div
            className="absolute pointer-events-none"
            style={{
              top: product.designArea.top,
              left: product.designArea.left,
              width: product.designArea.width,
              height: product.designArea.height,
            }}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: isHovered ? 0.95 : 0.7 }}
          >
            <div className="w-full h-full rounded-md border-2 border-dashed border-white/90 bg-gradient-to-br from-indigo-500/40 via-purple-500/40 to-rose-500/40 backdrop-blur-[2px] flex items-center justify-center shadow-lg">
              <div className="text-center px-2">
                <div className="text-white text-[10px] md:text-xs font-semibold tracking-wide drop-shadow-md">
                  YOUR
                </div>
                <div className="text-white text-[10px] md:text-xs font-semibold tracking-wide drop-shadow-md">
                  DESIGN
                </div>
                <div className="text-white text-[10px] md:text-xs font-semibold tracking-wide drop-shadow-md">
                  HERE
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hover gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
          />
        </div>

        {/* Product info */}
        <div className="p-5 flex items-center justify-between bg-white border-t border-slate-100">
          <div>
            <h3 className="text-slate-900 font-semibold text-base">{product.name}</h3>
            <p className="text-slate-500 text-sm mt-0.5">
              from <span className="font-bold text-slate-900">{product.from}</span>
            </p>
          </div>
          <motion.div
            className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-purple-600 flex items-center justify-center transition-colors"
            animate={isHovered ? { x: 2 } : { x: 0 }}
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
      </motion.div>
    </motion.div>
  );
}

export function ProductShowcase() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative">
      <Container size="lg" className="relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-block text-xs font-semibold tracking-widest text-indigo-600 uppercase mb-3">
            Print On Anything
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Built for <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">every moment</span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Premium products. Professional printing. Worldwide shipping.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {PRODUCTS.map((product, i) => (
            <ProductCard
              key={product.name}
              product={product}
              index={i}
              isHovered={hovered === product.name}
              onHover={setHovered}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-slate-500">
            + Frames, blankets, pillows & 50+ more products
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
