'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** Optional CSS filter string applied to the "before" image only */
  beforeFilter?: string;
  /** Optional CSS filter string applied to the "after" image only */
  afterFilter?: string;
  /** Optional initial split position (0-100). Defaults to 50 (middle). */
  initialPosition?: number;
  /** Animate the slider on mount/in-view to hint it's interactive */
  autoHint?: boolean;
  className?: string;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = 'AI Design',
  beforeFilter,
  afterFilter,
  initialPosition = 50,
  autoHint = false,
  className = '',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, percent)));
    if (!hasInteracted) setHasInteracted(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  // Auto-hint animation: gently oscillate the slider when in view to show
  // it's interactive, then settle at center. Stops once user touches it.
  useEffect(() => {
    if (!autoHint || hasInteracted) return;
    let cancelled = false;
    const sequence = async () => {
      // Wait a beat for the section to scroll into view
      await new Promise((r) => setTimeout(r, 800));
      if (cancelled || hasInteracted) return;
      // Sweep right
      setPosition(72);
      await new Promise((r) => setTimeout(r, 700));
      if (cancelled || hasInteracted) return;
      // Sweep left
      setPosition(28);
      await new Promise((r) => setTimeout(r, 700));
      if (cancelled || hasInteracted) return;
      // Settle center
      setPosition(50);
    };
    sequence();
    return () => {
      cancelled = true;
    };
  }, [autoHint, hasInteracted]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-square rounded-2xl overflow-hidden select-none cursor-ew-resize shadow-2xl ${className}`}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        if (e.touches[0]) handleMove(e.touches[0].clientX);
      }}
    >
      {/* After image (full, with optional filter) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        style={afterFilter ? { filter: afterFilter } : undefined}
        draggable={false}
      />

      {/* Before image (clipped, with optional filter) */}
      <div
        className="absolute inset-0 overflow-hidden transition-[clip-path] duration-150"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
          style={beforeFilter ? { filter: beforeFilter } : undefined}
          draggable={false}
        />
      </div>

      {/* Slider line */}
      <motion.div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none"
        animate={{ left: `${position}%` }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{ transform: 'translateX(-50%)' }}
      >
        {/* Vertical glow */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-transparent"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Handle */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center ring-1 ring-slate-200"
          animate={{ scale: isDragging ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="absolute inset-[3px] bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7l-4 4 4 4M16 17l4-4-4-4" />
            </svg>
          </div>
        </motion.div>
      </motion.div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full shadow-lg">
        AI {afterLabel}
      </div>

      {/* Hint text on first load - fades out once interacted */}
      {!hasInteracted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur text-white text-[11px] px-3 py-1.5 rounded-full pointer-events-none flex items-center gap-2"
        >
          <span>drag to compare</span>
        </motion.div>
      )}
    </div>
  );
}
