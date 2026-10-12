import React from 'react';

interface PrintMeWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  monochrome?: boolean;
  className?: string;
  showMark?: boolean;
}

export function PrintMeWordmark({
  size = 'md',
  monochrome = false,
  className = '',
  showMark = true,
}: PrintMeWordmarkProps) {
  const sizeMap = {
    sm: {
      mark: 18,
      text: 'text-base font-extrabold tracking-tight',
      gap: 'gap-1.5',
    },
    md: {
      mark: 22,
      text: 'text-xl font-black tracking-tight',
      gap: 'gap-2',
    },
    lg: {
      mark: 28,
      text: 'text-2xl md:text-3xl font-black tracking-tight',
      gap: 'gap-2.5',
    },
  };

  const currentSize = sizeMap[size];
  const markColor = monochrome ? 'currentColor' : '#FF4B2B';
  const textColor = monochrome ? 'currentColor' : '#151512';

  return (
    <span
      className={`inline-flex items-center ${currentSize.gap} select-none ${className}`}
      style={{ color: textColor }}
    >
      {showMark && (
        <span
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{ width: currentSize.mark, height: currentSize.mark, color: markColor }}
          aria-hidden="true"
        >
          {/* Print Registration / Crop Precision Mark */}
          <svg
            viewBox="0 0 24 24"
            width={currentSize.mark}
            height={currentSize.mark}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Outer registration circle */}
            <circle cx="12" cy="12" r="7.5" />
            {/* North, South, West, East registration crosshairs */}
            <line x1="12" y1="1.5" x2="12" y2="4.5" />
            <line x1="12" y1="19.5" x2="12" y2="22.5" />
            <line x1="1.5" y1="12" x2="4.5" y2="12" />
            <line x1="19.5" y1="12" x2="22.5" y2="12" />
            {/* Center target dot */}
            <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          </svg>
        </span>
      )}
      <span
        className={`font-display ${currentSize.text} leading-none`}
        style={{ letterSpacing: '-0.04em' }}
      >
        <span>Print</span>
        <span style={{ color: markColor }}>Me</span>
      </span>
    </span>
  );
}
