'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { petCategories, petStyles } from '@/lib/pets/styles';
import { trackCommerceEvent } from '@/lib/commerce/analytics-events';
import styles from './pets.module.css';

export function StyleLibrary() {
  const [category, setCategory] = useState('All');
  return <><div className={styles.filters} aria-label="Portrait style categories">{['All', ...petCategories].map(value => <button key={value} data-testid="pets-category-filter" aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div>
    <div className={styles.styleGrid}>{petStyles.filter(style => category === 'All' || style.category === category).map(style => <Link data-testid="pets-style-card" key={style.id} href={`/pets/create?style=${style.id}`} className={styles.style} onClick={() => trackCommerceEvent('pets_style_selected', { style_id: style.id, category: style.category })}><span className={styles.styleMark} style={{ background: style.tone }} aria-hidden="true">{style.mark}</span><span><strong>{style.title}</strong><small>{style.description}</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>)}</div>
    <p className={styles.note} style={{ marginTop: 17 }}>24 curated art directions. The four portraits above are original portfolio examples; individual results vary.</p>
  </>;
}
