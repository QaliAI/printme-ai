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

type Product = (typeof PRODUCTS)[number];

interface ProductCardProps {
  product: Product;
  index: number;
  isHovered: boolean;
  onHover: (name: string | null) => void;
}

function ProductCard({ product, index, isHovered, onHover }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => onHover(product.name)}
      onMouseLeave={() => onHover(null)}
      className="group cursor-pointer"
    >
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative overflow-hidden rounded-2xl bg-white shadow-md transition-shadow duration-500 hover:shadow-2xl"
      >
        <div className="relative aspect-square overflow-hidden bg-[#eeeef0]">
          <motion.img
            src={product.sampleImage}
            alt={`${product.name} printed sample mockup`}
            className="absolute inset-0 h-full w-full object-cover"
            animate={isHovered ? { scale: 1.035 } : { scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            loading={index < 4 ? 'eager' : 'lazy'}
          />

          <motion.div
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/18 via-slate-950/0 to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-white p-5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-900">{product.name}</h3>
            <p className="mt-0.5 truncate text-[10px] uppercase tracking-widest text-slate-400">
              {product.subtitle}
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              from <span className="font-bold text-slate-900">{product.from}</span>
            </p>
          </div>
          <motion.div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-purple-600"
            animate={isHovered ? { x: 2 } : { x: 0 }}
          >
            <svg
              className="h-4 w-4 text-slate-600 transition-colors group-hover:text-white"
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
    <section id="products" className="relative bg-gradient-to-b from-slate-50 to-white py-24">
      <Container size="lg" className="relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <div className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Print On Anything
          </div>
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Built for{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              every moment
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Finished sample mockups across Printify-ready products.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
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
          className="mt-12 text-center"
        >
          <p className="text-sm text-slate-500">+ Frames, blankets, pillows & 50+ more products</p>
        </motion.div>
      </Container>
    </section>
  );
}
