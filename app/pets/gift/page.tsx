import type { Metadata } from 'next';
import { PetsNav } from '@/components/pets/PetsNav';
import { GiftBrief } from '@/components/pets/GiftBrief';
import { SiteFooter } from '@/components/brand/SiteFooter';
import styles from '@/components/pets/pets.module.css';
export const metadata: Metadata = { title: 'Plan a pet portrait gift', description: 'Save a thoughtful pet portrait gift brief. Gift purchases and email delivery are not yet available.', alternates: { canonical: 'https://www.printme.ai/pets/gift' } };
export default function PetsGiftPage() {
  return <div className={styles.page}><div className={styles.inner}><PetsNav /><header className={styles.pageIntro}><p className={styles.eyebrow}>For their favorite person. With paws.</p><h1 className={styles.title}>The gift that gets it.</h1><p>For the birthday, the gotcha-day, or the friend whose camera roll is 99% one dog. Start with a little thought and a look that feels like them.</p><p className={styles.status}>Gift purchases and gift email delivery are not yet available. Save a private gift brief now; nothing is charged or sent.</p></header><GiftBrief /></div><SiteFooter /></div>;
}
