'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './pets.module.css';
const key = 'printme:pets:gift-brief:v1';
export function GiftBrief() {
  const [occasion, setOccasion] = useState('Just because');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => {
    let live = true;
    // Restore browser-only storage after hydration; never change the server HTML.
    queueMicrotask(() => {
    if (!live) return;
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (value && typeof value.occasion === 'string' && typeof value.message === 'string' && typeof value.updatedAt === 'number' && Date.now() - value.updatedAt < 604800000) {
        setOccasion(value.occasion.slice(0, 40)); setMessage(value.message.slice(0, 240));
      } else localStorage.removeItem(key);
    } catch { /* A private browser may not provide local storage. */ }
    });
    return () => { live = false; };
  }, []);
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ occasion, message, updatedAt: Date.now() })); setStatus('Gift brief saved on this device for seven days. No gift has been purchased or sent.'); }
    catch { setStatus('This browser could not save your brief. You can still choose a portrait style.'); }
  }
  return <form className={styles.form} onSubmit={event => { event.preventDefault(); save(); }}><label>What&apos;s the occasion?<select value={occasion} onChange={event => setOccasion(event.target.value)}>{['Just because', 'Birthday', 'Gotcha day', 'New pet', 'In memory', 'Thank you'].map(value => <option key={value}>{value}</option>)}</select></label><label>A little note (optional)<textarea maxLength={240} value={message} onChange={event => setMessage(event.target.value)} placeholder="For the best dog-parent I know…" /></label><p className={styles.note}>This note stays on this device. We do not collect a recipient&apos;s email, send a gift, reserve a price or take payment.</p><div className={styles.actions}><button className={styles.button} type="submit">Save gift brief</button><Link className={styles.secondary} href="/pets/create">Choose a portrait style ↗</Link></div><button type="button" className={styles.link} style={{ textAlign: 'left', width: 'fit-content', cursor: 'pointer' }} onClick={() => { try { localStorage.removeItem(key); setMessage(''); setOccasion('Just because'); setStatus('Gift brief deleted from this device.'); } catch { setStatus('Unable to access local storage.'); } }}>Delete saved gift brief</button><p role="status" className={styles.note}>{status}</p></form>;
}
