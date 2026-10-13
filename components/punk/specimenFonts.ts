import { DM_Serif_Display, Space_Mono } from 'next/font/google';

// The Specimen Plates type system (SIL OFL), loaded only where the plate is drawn.
export const plateSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
});

export const plateMono = Space_Mono({
  subsets: ['latin'],
  weight: '700',
  display: 'swap',
  preload: false,
});
