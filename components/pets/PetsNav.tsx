import Link from 'next/link';
import styles from './pets.module.css';
export function PetsNav() {
  return <div className={styles.subnav}><Link href="/pets" aria-label="PrintMe Pets home"><strong>PRINTME<span>PETS</span></strong></Link><nav aria-label="Pets navigation"><Link href="/pets#looks">The looks</Link><Link href="/pets/keepsakes">Keepsakes</Link><Link href="/pets/gift">Gifts</Link></nav></div>;
}
