import type { Metadata } from 'next';
import { PetsNav } from '@/components/pets/PetsNav';
import { PortraitStudio } from '@/components/pets/PortraitStudio';
import { SiteFooter } from '@/components/brand/SiteFooter';
import { getPetStyle } from '@/lib/pets/styles';
import styles from '@/components/pets/pets.module.css';
export const metadata: Metadata = { title: 'Make a pet portrait', description: 'Choose a look, prepare separate pet and person photos, and save your private portrait brief.', robots: { index: false, follow: true }, alternates: { canonical: 'https://www.printme.ai/pets/create' } };
export default async function PetsCreatePage({ searchParams }: { searchParams: Promise<{ style?: string }> }) {
  const query = await searchParams;
  const style = query.style && getPetStyle(query.style) ? query.style : 'together-in-blue';
  return <div className={styles.page}><div className={styles.inner}><PetsNav /><header className={styles.pageIntro}><p className={styles.eyebrow}>PrintMe Pets / Your portrait studio</p><h1 className={styles.title}>MAKE A LITTLE LEGEND.</h1><p>Start with a look. Bring your favorite faces. Make it feel like them.</p><p className={styles.note}>Preparation is free. Generation and purchases are currently paused.</p></header><PortraitStudio initialStyleId={style} initialStyleExplicit={Boolean(query.style && getPetStyle(query.style))} /></div><SiteFooter /></div>;
}
