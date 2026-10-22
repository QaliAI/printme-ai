'use client';
import { useState } from 'react';
import Image from 'next/image';
import styles from './pets.module.css';
export function PortraitComparison() {
  const [reveal, setReveal] = useState(52);
  return <div className={styles.comparison}>
    <Image src="/samples/ginger-cat.jpg" alt="Source photograph of a ginger cat" width={1000} height={1000} sizes="(max-width:700px) 100vw,50vw" />
    <Image src="/pets/royal-ginger.webp" alt="Illustrative transformation of the same ginger cat into a royal oil portrait" width={1000} height={1500} sizes="(max-width:700px) 100vw,50vw" style={{ clipPath: `inset(0 0 0 ${reveal}%)` }} />
    <span className={styles.compareLabel} style={{ left: 20 }}>THE PHOTO</span><span className={styles.compareLabel} style={{ right: 20 }}>THE PORTRAIT</span>
    <span className={styles.compareLine} style={{ left: `${reveal}%` }} aria-hidden="true" />
    <input type="range" min={0} max={100} value={reveal} onChange={event => setReveal(Number(event.target.value))} aria-label="Reveal portrait transformation" />
  </div>;
}
