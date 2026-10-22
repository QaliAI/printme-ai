import Image from 'next/image';
import Link from 'next/link';
import styles from './pets.module.css';
export function PetsPromo() {
  return <section className={styles.promo} aria-labelledby="pets-promo-title"><Image src="/pets/fuzz-club.webp" alt="Original punk whippet portrait example" width={110} height={125} sizes="110px" /><div><p className={styles.eyebrow}>New department / PrintMe Pets</p><h2 id="pets-promo-title">Your best friend. Immortalized.</h2><p>Pet portraits with a little more personality. Explore 24 looks and build your brief.</p></div><Link href="/pets" className={styles.button}>Meet PrintMe Pets ↗</Link></section>;
}
