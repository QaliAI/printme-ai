'use client';

import { motion } from 'framer-motion';
import { ImageIcon } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
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
type ProductName = Product['name'];
type PrintSurfaceVariant = 'fabric' | 'mug' | 'flat' | 'poster' | 'phoneCase' | 'tote' | 'sticker';

interface PrintTreatment {
  variant: PrintSurfaceVariant;
  className: string;
  style?: CSSProperties;
}

const PRINT_TREATMENTS: Record<ProductName, PrintTreatment> = {
  'T-Shirt': {
    variant: 'fabric',
    className: 'rounded-[5px] shadow-[0_1px_5px_rgba(15,23,42,0.08)]',
  },
  Mug: {
    variant: 'mug',
    className: 'rounded-[5px] shadow-[10px_8px_18px_rgba(15,23,42,0.08)]',
    style: {
      transform: 'perspective(420px) rotateY(-9deg) rotateZ(-0.5deg)',
      transformOrigin: '50% 50%',
    },
  },
  Canvas: {
    variant: 'flat',
    className: 'rounded-[2px] shadow-[0_7px_14px_rgba(15,23,42,0.08)]',
  },
  Poster: {
    variant: 'poster',
    className: 'rounded-[2px] shadow-[0_8px_14px_rgba(15,23,42,0.11)]',
  },
  Hoodie: {
    variant: 'fabric',
    className: 'rounded-[6px] shadow-[0_1px_5px_rgba(15,23,42,0.08)]',
  },
  'Phone Case': {
    variant: 'phoneCase',
    className: 'rounded-[18%] shadow-[8px_8px_18px_rgba(15,23,42,0.12)]',
    style: {
      transform: 'rotate(10deg)',
      transformOrigin: '50% 50%',
    },
  },
  'Tote Bag': {
    variant: 'tote',
    className: 'rounded-[3px] shadow-[0_2px_7px_rgba(15,23,42,0.08)]',
  },
  Sticker: {
    variant: 'sticker',
    className: '',
    style: {
      transform: 'rotate(-8deg)',
      transformOrigin: '50% 50%',
    },
  },
};

/**
 * Print-area placeholder modeled after professional POD mockup tools,
 * sized proportionally to each product's actual print area.
 */
function YourImageMark({ variant }: { variant: Exclude<PrintSurfaceVariant, 'sticker'> }) {
  const compact = variant === 'fabric' || variant === 'mug' || variant === 'phoneCase';

  return (
    <div className="relative z-10 grid place-items-center gap-0.5 text-center">
      <div
        className={[
          'grid place-items-center rounded-md border border-slate-300/50 bg-white/65 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)]',
          compact ? 'size-4 md:size-5' : 'size-5 md:size-6',
        ].join(' ')}
      >
        <ImageIcon className={compact ? 'size-2.5 md:size-3' : 'size-3 md:size-3.5'} strokeWidth={1.9} />
      </div>
      <div
        className={[
          'font-semibold leading-[0.95] tracking-tight text-slate-800',
          compact ? 'text-[7px] md:text-[8px]' : 'text-[8px] md:text-[10px]',
        ].join(' ')}
      >
        Your
        <br />
        Image
      </div>
    </div>
  );
}

function StickerArtwork({ isHovered }: { isHovered: boolean }) {
  return (
    <motion.div
      className="relative h-full w-full"
      animate={isHovered ? { scale: 1.04, rotate: -1.5 } : { scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      <div
        className="absolute inset-0 bg-white shadow-[0_12px_22px_rgba(15,23,42,0.18)]"
        style={{
          borderRadius: '42% 58% 48% 52% / 54% 42% 58% 46%',
        }}
      />
      <div
        className="absolute inset-[7%] overflow-hidden"
        style={{
          borderRadius: '40% 60% 46% 54% / 56% 42% 58% 44%',
          background:
            'linear-gradient(135deg, #f97316 0%, #facc15 34%, #22c55e 66%, #7c3aed 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 24%, white 0 3px, transparent 3px), radial-gradient(circle at 78% 70%, white 0 4px, transparent 4px), repeating-linear-gradient(-18deg, rgba(255,255,255,0.32) 0 2px, transparent 2px 13px)',
          }}
        />
        <div className="absolute inset-0 grid place-items-center px-[7%]">
          <div
            className="w-full rounded-full border-2 border-white/80 bg-slate-950/88 px-[6%] py-[5%] text-center font-black uppercase leading-none text-white shadow-[0_7px_14px_rgba(15,23,42,0.22)]"
            style={{
              fontSize: 'clamp(7px, 0.86vw, 11px)',
              letterSpacing: '0',
              textShadow: '0 1px 0 rgba(0,0,0,0.24)',
              whiteSpace: 'nowrap',
            }}
          >
            YOURCOOLBRAND
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PrintAreaPlaceholder({
  isHovered,
  variant,
}: {
  isHovered: boolean;
  variant: Exclude<PrintSurfaceVariant, 'sticker'>;
}) {
  const fabricLike = variant === 'fabric' || variant === 'tote';
  const flatLike = variant === 'flat' || variant === 'poster';
  const radiusClass =
    variant === 'phoneCase'
      ? 'rounded-[18%]'
      : variant === 'mug'
        ? 'rounded-[5px]'
        : fabricLike
          ? 'rounded-[4px]'
          : 'rounded-[2px]';

  return (
    <div
      className={[
        'relative grid h-full w-full place-items-center overflow-hidden border',
        radiusClass,
        fabricLike ? 'border-slate-300/35 bg-white/58 mix-blend-multiply' : 'border-slate-200/80 bg-white/88',
        variant === 'phoneCase' ? 'bg-white/82' : '',
      ].join(' ')}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(15,23,42,0.055) 0 1px, transparent 1px 9px)',
        }}
      />

      {fabricLike && (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 35%, rgba(15,23,42,0.07) 0 1px, transparent 1px), repeating-linear-gradient(5deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 5px)',
            backgroundSize: '6px 6px, 8px 8px',
          }}
        />
      )}

      {variant === 'mug' && (
        <>
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-slate-300/18 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-slate-400/14 to-transparent" />
          <div className="absolute inset-x-[16%] top-0 h-px bg-white/80" />
        </>
      )}

      {variant === 'phoneCase' && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-300/10 via-white/10 to-slate-500/10" />
      )}

      {flatLike && <div className="absolute inset-0 ring-1 ring-inset ring-white/70" />}

      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-indigo-500/12 to-purple-500/12"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <YourImageMark variant={variant} />
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  index: number;
  isHovered: boolean;
  onHover: (name: string | null) => void;
}

function ProductCard({ product, index, isHovered, onHover }: ProductCardProps) {
  const treatment = PRINT_TREATMENTS[product.name];

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
            data-print-area={product.name}
            className={['absolute pointer-events-none z-10', treatment.className].filter(Boolean).join(' ')}
            style={{
              top: product.designArea.top,
              left: product.designArea.left,
              width: product.designArea.width,
              height: product.designArea.height,
              aspectRatio: product.aspectRatio,
              ...treatment.style,
            }}
          >
            {treatment.variant === 'sticker' ? (
              <StickerArtwork isHovered={isHovered} />
            ) : (
              <PrintAreaPlaceholder isHovered={isHovered} variant={treatment.variant} />
            )}
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
          <div className="min-w-0">
            <h3 className="text-slate-900 font-semibold text-base tracking-tight truncate">{product.name}</h3>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase mt-0.5 truncate">
              {product.subtitle}
            </p>
            <p className="text-slate-500 text-sm mt-1.5">
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
    <section id="products" className="py-24 bg-gradient-to-b from-slate-50 to-white relative">
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
            Real Printify products. Same photos you&apos;ll see at checkout.
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
