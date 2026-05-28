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

/**
 * Print-area placeholder that mimics what Printful/Printify show:
 * a clean dashed boundary marking the actual printable surface,
 * with a subtle upload prompt inside.
 */
function PrintAreaPlaceholder({ isHovered }: { isHovered: boolean }) {
  return (
    <div className="relative w-full h-full">
      {/* Outer dashed border — the "print boundary" */}
      <motion.div
        className="absolute inset-0 rounded-sm border-[1.5px] border-dashed border-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
        animate={{
          borderColor: isHovered ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.85)',
        }}
      />

      {/* Inner translucent fill */}
      <div className="absolute inset-[3px] rounded-[2px] bg-gradient-to-br from-white/30 via-white/15 to-white/30 backdrop-blur-[2px] flex flex-col items-center justify-center overflow-hidden">
        {/* Subtle inner glow on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Center icon + label */}
        <div className="relative flex flex-col items-center justify-center text-center px-1">
          {/* Camera/upload icon */}
          <motion.svg
            className="w-4 h-4 md:w-5 md:h-5 text-white mb-1 drop-shadow-md"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            animate={{ y: isHovered ? -1 : 0 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </motion.svg>
          <div className="text-white text-[9px] md:text-[10px] font-semibold tracking-[0.15em] uppercase drop-shadow-md leading-tight">
            Your
          </div>
          <div className="text-white text-[9px] md:text-[10px] font-semibold tracking-[0.15em] uppercase drop-shadow-md leading-tight">
            Design
          </div>
        </div>
      </div>

      {/* Corner markers — like crop marks */}
      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => (
        <div
          key={corner}
          className={`absolute w-2 h-2 ${
            corner.startsWith('top') ? '-top-px' : '-bottom-px'
          } ${corner.endsWith('left') ? '-left-px' : '-right-px'}`}
        >
          <div className="absolute inset-0 bg-white rounded-full shadow-md ring-1 ring-slate-900/20" />
        </div>
      ))}
    </div>
  );
}

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
            className="absolute inset-0 w-full h-full object-cover"
            animate={isHovered ? { scale: 1.04 } : { scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            loading="lazy"
          />

          {/* Print area placeholder — positioned precisely on the product's printable surface */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: product.designArea.top,
              left: product.designArea.left,
              width: product.designArea.width,
              height: product.designArea.height,
              aspectRatio: product.aspectRatio,
            }}
          >
            <PrintAreaPlaceholder isHovered={isHovered} />
          </div>

          {/* Subtle hover gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
          />
        </div>

        {/* Product info */}
        <div className="p-5 flex items-center justify-between bg-white border-t border-slate-100">
          <div>
            <h3 className="text-slate-900 font-semibold text-base tracking-tight">{product.name}</h3>
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
            Premium products. Professional printing. Print area sized to industry standards.
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
