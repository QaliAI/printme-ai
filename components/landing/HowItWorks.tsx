'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Container } from '@/components/Container';

const steps = [
  {
    number: '01',
    title: 'Upload your photo',
    description:
      'Take a snap or pick one from your gallery. Pets, families, landscapes, anything that means something to you.',
    accent: 'from-indigo-500 to-blue-500',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="w-6 h-6">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'AI does the magic',
    description:
      'Pick one of 12 styles. Our AI transforms your photo into stunning art in under 30 seconds. Don\'t love it? Try another.',
    accent: 'from-purple-500 to-rose-500',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="w-6 h-6">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
        />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Print on anything',
    description:
      'Shirts, mugs, posters, phone cases, and more. Choose your favorite. We print, package, and ship it to your door.',
    accent: 'from-rose-500 to-amber-500',
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="w-6 h-6">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
        />
      </svg>
    ),
  },
];

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      className="relative"
    >
      <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-shadow duration-500 h-full border border-slate-100 group">
        {/* Icon + step number */}
        <div className="flex items-center justify-between mb-6">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.accent} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
          >
            {step.icon}
          </div>
          <span
            className={`text-5xl font-black bg-gradient-to-br ${step.accent} bg-clip-text text-transparent opacity-20`}
          >
            {step.number}
          </span>
        </div>

        <h3 className="text-2xl font-bold text-slate-900 mb-3">{step.title}</h3>
        <p className="text-slate-600 leading-relaxed">{step.description}</p>

        {/* Bottom underline accent */}
        <div
          className={`absolute bottom-0 left-8 right-8 h-1 bg-gradient-to-r ${step.accent} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-full`}
        />
      </div>

      {/* Connector arrow (desktop only, between cards) */}
      {index < steps.length - 1 && (
        <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10">
          <motion.svg
            className="w-8 h-8 text-slate-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ x: [0, 4, 0] }}
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
    <section id="how-it-works" className="py-24 bg-slate-50 relative">
      <Container size="lg">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-block text-xs font-semibold tracking-widest text-indigo-600 uppercase mb-3">
            How It Works
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Three steps from{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              photo to print
            </span>
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            No design skills required. Seriously.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
