'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Container } from '@/components/Container';

const steps = [
  {
    number: '01',
    icon: '📸',
    title: 'Snap or Upload',
    description: 'Take a quick photo with your phone or pick one from your gallery. Pets, kids, landscapes—anything works.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    number: '02',
    icon: '✨',
    title: 'AI Creates Magic',
    description: 'Pick a style. Our AI transforms your photo into stunning art in under 30 seconds. Don\'t love it? Try another style instantly.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    number: '03',
    icon: '📦',
    title: 'Print on Anything',
    description: 'Choose from shirts, mugs, posters, phone cases, and more. We print, package, and ship it to your door.',
    color: 'from-orange-500 to-red-500',
  },
];

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      className="relative group"
    >
      <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-shadow duration-500 h-full overflow-hidden">
        {/* Decorative gradient orb */}
        <div
          className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${step.color} opacity-10 group-hover:opacity-30 group-hover:scale-150 transition-all duration-700`}
        />

        {/* Step number */}
        <div className={`text-7xl font-black bg-gradient-to-br ${step.color} bg-clip-text text-transparent opacity-30 mb-2`}>
          {step.number}
        </div>

        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.2, rotate: 10 }}
          className="text-6xl mb-4 inline-block"
        >
          {step.icon}
        </motion.div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
        <p className="text-gray-600 leading-relaxed">{step.description}</p>

        {/* Hover line */}
        <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${step.color} w-0 group-hover:w-full transition-all duration-500`} />
      </div>

      {/* Connector arrow (desktop) */}
      {index < steps.length - 1 && (
        <div className="hidden md:block absolute top-1/2 -right-6 -translate-y-1/2 z-10">
          <motion.svg
            className="w-12 h-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </motion.svg>
        </div>
      )}
    </motion.div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white relative">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From photo to product in three simple steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 relative">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
