'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, Heart, RotateCw, Trash2, Upload } from 'lucide-react';
import { petCategories, petExamples, petStyles, getPetStyle } from '@/lib/pets/styles';
import { discardPetDraft, petAssetKey, petDraftSchema, PET_DRAFT_KEY, preparePetReference, restorePetDraft, storePetPhoto, type PetDraft, type PetSubject } from '@/lib/pets/browser-session';
import { loadCreateAsset, removeCreateAssets } from '@/lib/commerce/create-session';
import { trackCommerceEvent } from '@/lib/commerce/analytics-events';
import common from './pets.module.css';
import styles from './creator.module.css';

type Portrait = { jobId: string; status: string; previewUrl?: string; downloadAvailable?: boolean };
const steps = ['01 Style', '02 Photos', '03 Review', '04 Portrait'];

export function PortraitStudio({ initialStyleId, initialStyleExplicit = false }: { initialStyleId: string; initialStyleExplicit?: boolean }) {
  const [draft, setDraft] = useState<PetDraft | null>(null);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('All');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [role, setRole] = useState<PetSubject['role']>('pet');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [consent, setConsent] = useState(false);
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [loadRetry, setLoadRetry] = useState(0);
  const uploadLock = useRef(false);
  const requestRef = useRef<{ signature: string; requestId: string } | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => restorePetDraft(localStorage)).then(saved => {
      if (!live) return;
      setDraft(saved ? { ...saved, ...(initialStyleExplicit ? { styleId: initialStyleId } : {}) } : { id: crypto.randomUUID(), styleId: initialStyleId, subjects: [], caption: '', updatedAt: Date.now(), favorites: [], versions: [] });
    }).catch(failure => { if (live) setError(failure instanceof Error ? failure.message : 'Your saved brief could not be opened. Please try again.'); });
    void fetch('/api/pets/readiness', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(data => { if (live) setEnabled(data?.enabled === true); }).catch(() => undefined);
    return () => { live = false; };
  }, [initialStyleId, initialStyleExplicit, loadRetry]);

  useEffect(() => {
    if (!draft) return;
    try { localStorage.setItem(PET_DRAFT_KEY, JSON.stringify(petDraftSchema.parse({ ...draft, updatedAt: Date.now() }))); }
    catch { queueMicrotask(() => setNotice('This browser cannot save a draft. Keep this page open while you prepare it.')); }
  }, [draft]);

  const subjectIds = draft?.subjects.map(subject => `${subject.id}:${subject.crop}:${subject.rotation}`).join(',') || '';
  const draftId = draft?.id;
  useEffect(() => {
    if (!draftId) return;
    let live = true;
    void Promise.all(subjectIds.split(',').filter(Boolean).map(async entry => {
      const [id, crop, rotation] = entry.split(':');
      const blob = await loadCreateAsset(petAssetKey(draftId, id));
      if (!blob || !live) return null;
      const url = await preparePetReference(blob, { id, crop, rotation: Number(rotation) } as PetSubject);
      return [id, url] as const;
    })).then(entries => { if (live) setUrls(Object.fromEntries(entries.filter(entry => entry !== null))); }).catch(() => { if (live) setError('A saved photo could not be restored. Please add it again.'); });
    return () => { live = false; };
  }, [draftId, subjectIds]);

  const chosen = getPetStyle(draft?.styleId || initialStyleId) || petStyles[3];
  const example = petExamples.find(value => value.id === chosen.id);
  function changeSubject(id: string, patch: Partial<PetSubject>) { setDraft(current => current ? { ...current, subjects: current.subjects.map(subject => subject.id === id ? { ...subject, ...patch } : subject) } : current); }
  async function addPhotos(files: FileList | null) {
    if (!draft || !files?.length || uploadLock.current) return;
    setError(''); setNotice('');
    if (draft.subjects.length + files.length > 4) { setError('Add up to four photos, one for each pet or person. Remove one to make room.'); return; }
    uploadLock.current = true; setUploading(true);
    const added: PetSubject[] = [];
    try {
      for (const file of Array.from(files)) added.push(await storePetPhoto(draft.id, file, role));
      setDraft(current => current ? { ...current, subjects: [...current.subjects, ...added] } : current);
    } catch (failure) {
      await removeCreateAssets(added.map(subject => petAssetKey(draft.id, subject.id))).catch(() => undefined);
      setError(failure instanceof Error ? failure.message : 'That photo could not be added. Try again.');
    } finally { uploadLock.current = false; setUploading(false); }
  }
  async function removePhoto(id: string) {
    if (!draft) return;
    try { await removeCreateAssets([petAssetKey(draft.id, id)]); setDraft(current => current ? { ...current, subjects: current.subjects.filter(subject => subject.id !== id) } : current); }
    catch { setError('Could not remove that saved photo. Please try again.'); }
  }
  function save() {
    if (!draft) return;
    try { localStorage.setItem(PET_DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: Date.now() })); setNotice('Draft saved on this device for seven days.'); trackCommerceEvent('pets_draft_saved', { style_id: chosen.id, subject_count: draft.subjects.length }); }
    catch { setError('This browser could not save your draft.'); }
  }
  async function erase() {
    try { await discardPetDraft(localStorage); setDraft({ id: crypto.randomUUID(), styleId: initialStyleId, subjects: [], caption: '', updatedAt: Date.now(), favorites: [], versions: [] }); setPortrait(null); setConsent(false); setStep(0); requestRef.current = null; setNotice('Local draft and photos deleted.'); }
    catch { setError('Your browser could not delete the draft. You can also clear this site’s browser data.'); }
  }
  async function generate() {
    if (!draft || !enabled || !consent || generating || !draft.subjects.some(subject => subject.role === 'pet')) return;
    setGenerating(true); setError(''); setStep(3); setPortrait(null); setPreviewFailed(false);
    try {
      const references = await Promise.all(draft.subjects.map(async subject => {
        const blob = await loadCreateAsset(petAssetKey(draft.id, subject.id));
        if (!blob) throw new Error('A saved photo is missing. Go back and add it again.');
        return { dataUrl: await preparePetReference(blob, subject), role: subject.role, label: subject.label };
      }));
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ styleId: chosen.id, subjects: draft.subjects, caption: draft.caption })));
      const signature = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      // Persist one request identity before sending, so a lost response never causes a new paid request.
      const savedKey = `printme:pets:request:${draft.id}`;
      if (!requestRef.current || requestRef.current.signature !== signature) {
        let saved: { signature?: string; requestId?: string } | null = null;
        try { saved = JSON.parse(localStorage.getItem(savedKey) || 'null'); } catch { /* Fresh request. */ }
        requestRef.current = { signature, requestId: saved?.signature === signature && typeof saved.requestId === 'string' ? saved.requestId : crypto.randomUUID() };
        localStorage.setItem(savedKey, JSON.stringify(requestRef.current));
      }
      trackCommerceEvent('pets_generation_started', { style_id: chosen.id, subject_count: references.length });
      const response = await fetch('/api/pets/generations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: requestRef.current.requestId, styleId: chosen.id, subjectCount: references.length, references, caption: draft.caption }) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'The portrait service is unavailable. Your brief is saved.');
      if (typeof data.jobId !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.jobId)) throw new Error('The portrait response was incomplete. Retry this same request to check its status.');
      const next: Portrait = { jobId: data.jobId, status: data.status, previewUrl: data.status === 'completed' ? `/api/pets/generations/${data.jobId}/preview` : undefined, downloadAvailable: data.downloadAvailable === true };
      setPortrait(next);
      if (next.status === 'completed') {
        setDraft(current => current ? { ...current, versions: [...current.versions.filter(version => version.id !== data.jobId), { id: data.jobId, styleId: chosen.id, createdAt: Date.now() }].slice(-30) } : current);
        trackCommerceEvent('pets_generation_completed', { style_id: chosen.id });
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not confirm the portrait result. Your brief is saved.');
      trackCommerceEvent('pets_generation_failed', { style_id: chosen.id });
    } finally { setGenerating(false); }
  }
  function favorite(id: string) {
    setDraft(current => current ? { ...current, favorites: current.favorites.includes(id) ? current.favorites.filter(value => value !== id) : [...current.favorites, id].slice(-30) } : current);
    trackCommerceEvent('pets_preview_favorited', { style_id: chosen.id });
  }

  if (!draft) return <div className={common.status}>{error ? <><p role="alert">{error}</p><button className={common.secondary} style={{ marginTop: 15 }} onClick={() => { setError(''); setLoadRetry(value => value + 1); }}>Retry opening brief</button></> : <p role="status">Opening your private portrait brief…</p>}</div>;
  return <><nav className={styles.steps} aria-label="Portrait steps">{steps.map((label, index) => <button type="button" key={label} aria-current={step === index ? 'step' : undefined} disabled={generating || uploading || (index === 2 && !draft.subjects.some(subject => subject.role === 'pet'))} onClick={() => { setStep(index); setError(''); }}>{label}</button>)}</nav>
    <div className={styles.layout}><section className={styles.panel} aria-labelledby="portrait-step-title">
      {step === 0 && <><h2 id="portrait-step-title">Pick their alter ego.</h2><p className={common.body}>One best friend. Twenty-four ways to show their personality.</p><div className={styles.mobileSelection}>{example ? <Image src={example.image} alt={example.alt} width={1000} height={1500} sizes="110px" /> : <span className={styles.directionMark} style={{ background: chosen.tone }} aria-hidden="true">{chosen.mark}</span>}<div><p className={common.eyebrow}>Selected look</p><h3>{chosen.title}</h3><p>{chosen.description}</p><small>{example ? 'Original example · results vary' : 'Curated art direction · no sample result'}</small></div></div><div className={common.filters}>{['All', ...petCategories].map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div><div className={styles.styles}>{petStyles.filter(style => category === 'All' || style.category === category).map(style => <button key={style.id} className={styles.style} aria-pressed={chosen.id === style.id} onClick={() => { setDraft({ ...draft, styleId: style.id }); trackCommerceEvent('pets_style_selected', { style_id: style.id }); }}><span aria-hidden="true">{style.mark}</span><strong>{style.title}</strong><small>{style.description}</small></button>)}</div><p className={common.note} style={{ marginTop: 18 }}>Art directions are curated briefs, not guarantees of a particular result.</p></>}
      {step === 1 && <><h2 id="portrait-step-title">Introduce the legends.</h2><p className={common.body}>Add one clear photo for each pet or person. Separate photos are perfect. Natural light, visible faces, no heavy filters.</p><label className={styles.field}>Photo subject<select value={role} onChange={event => setRole(event.target.value as PetSubject['role'])}><option value="pet">Pet</option><option value="person">Person</option></select></label><label className={styles.drop}><Upload size={26} aria-hidden="true" /><strong>{uploading ? 'Preparing photo…' : 'Choose photos or drop them here'}</strong><small>JPEG, PNG or WebP · Up to 10 MB each · Maximum 4 subjects</small><input aria-label="Add subject photos" data-testid="pets-photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={event => { void addPhotos(event.target.files); event.target.value = ''; }} /></label><p className={common.note} style={{ marginTop: 13 }}>Photos stay on this device until you explicitly request generation. Only upload photos you have permission to use.</p>
      <div className={styles.subjects}>{draft.subjects.map((subject, index) => <article data-testid="pets-subject-card" key={subject.id} className={styles.subject}><div className={styles.thumb} style={{ aspectRatio: subject.crop === 'portrait' ? '2/3' : '1' }}>{urls[subject.id] && <Image src={urls[subject.id]} width={1536} height={1536} unoptimized alt={`Photo ${index + 1}: ${subject.role}`} />}</div><div><p className={common.eyebrow} style={{ marginBottom: 10 }}>Photo {index + 1} / {subject.role}</p><label className={styles.field}>Subject name<input aria-label="Subject name" value={subject.label} maxLength={40} placeholder="Their name (optional)" onChange={event => changeSubject(subject.id, { label: event.target.value })} /></label><label className={styles.field}>Photo crop<select value={subject.crop} onChange={event => changeSubject(subject.id, { crop: event.target.value as PetSubject['crop'] })}><option value="original">Full photo</option><option value="square">Square · centered</option><option value="portrait">Portrait · centered</option></select></label></div><div className={styles.tools} style={{ gridColumn: '1/-1' }}><button aria-label="Rotate photo" onClick={() => changeSubject(subject.id, { rotation: (subject.rotation + 1) % 4 })}><RotateCw size={15} aria-hidden="true" /> Rotate</button><button aria-label="Move photo up" disabled={index === 0} onClick={() => { const subjects = [...draft.subjects]; [subjects[index - 1], subjects[index]] = [subjects[index], subjects[index - 1]]; setDraft({ ...draft, subjects }); }}><ArrowUp size={15} aria-hidden="true" /> Move up</button><button aria-label="Remove photo" onClick={() => void removePhoto(subject.id)}><Trash2 size={15} aria-hidden="true" /> Remove</button></div></article>)}</div><label className={styles.field}>Caption (optional)<input maxLength={100} placeholder="A name, a date, a little dedication…" value={draft.caption} onChange={event => setDraft({ ...draft, caption: event.target.value })} /></label><p className={common.note}>Crop and rotation apply to the prepared photo reference. Review faces before continuing; captions may need refinement in a generated preview.</p></>}
      {step === 2 && <><h2 id="portrait-step-title">One last little check.</h2><dl className={styles.review}><div><dt>Your look</dt><dd>{chosen.title} · {chosen.category}</dd></div><div><dt>Your subjects</dt><dd>{draft.subjects.map((subject, index) => `${subject.label || `Photo ${index + 1}`} (${subject.role})`).join(' + ')}</dd></div>{draft.caption && <div><dt>Your caption</dt><dd>{draft.caption}</dd></div>}</dl><p className={common.body}>Keep faces fully visible, use the best photo you have, and include everyone once. A preview can vary from the original photo.</p><div data-testid="pets-generation-status" role="status" className={common.status} style={{ marginTop: 20 }}>{enabled ? 'Portrait generation is available within the current preview allowance. Your original photos will be prepared and sent only when you request a portrait.' : 'Portrait generation is paused. Your brief is ready and stays on this device. Nothing has been uploaded or charged.'}</div>{enabled && <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I have permission to use these photos and the people shown. I agree to send these prepared references to PrintMe and its image provider to create my portrait.</label>}<Link href="/pets/privacy" className={common.link} style={{ display: 'inline-block', marginTop: 15 }}>Read Pets photo privacy</Link><div className={common.actions}><button className={common.button} disabled={!enabled || !consent || generating} onClick={() => void generate()}>{enabled ? 'Generate watermarked preview' : 'Portrait generation is paused'}</button></div><p className={common.note}>Digital purchases and printing a generated portrait are not yet available. No payment is collected here.</p></>}
      {step === 3 && <><h2 id="portrait-step-title">Their moment. Your masterpiece.</h2><div data-testid="pets-generation-status" role="status" className={common.status}>{generating ? 'Making your portrait. Keep this page open; do not start another request.' : portrait?.status === 'completed' ? 'Your watermarked preview is ready. Original downloads and purchases are not yet available.' : portrait?.status === 'uncertain' || portrait?.status === 'reserved' ? 'We are checking the result of this request. A new paid generation will not be started automatically. Keep your brief and contact support if it remains unresolved.' : enabled ? 'Request a portrait from the Review step when your brief is ready.' : 'Portrait generation is paused. Your brief is safely saved on this device; no portrait has been generated.'}</div>
      {portrait?.previewUrl && !previewFailed ? <div className={styles.result}><Image src={portrait.previewUrl} width={800} height={1200} unoptimized alt="Your private watermarked pet portrait preview" onError={() => setPreviewFailed(true)} /><small>Watermarked preview · not a print-ready original</small><button className={common.secondary} style={{ marginTop: 15 }} onClick={() => favorite(portrait.jobId)}><Heart size={17} fill={draft.favorites.includes(portrait.jobId) ? 'currentColor' : 'none'} aria-hidden="true" />{draft.favorites.includes(portrait.jobId) ? 'Saved favorite' : 'Favorite this portrait'}</button></div> : <div className={styles.empty} style={{ marginTop: 20 }}><span aria-hidden="true">✶</span><p>{previewFailed ? 'This private preview could not be opened. It may have expired. Your saved brief is still available.' : 'Your portrait will appear here when generation is available. Example artwork is never substituted for your result.'}</p></div>}
      {portrait?.status === 'completed' && <><button className={common.button} disabled style={{ marginTop: 20 }}>Original downloads are not yet available</button><p className={common.note} style={{ marginTop: 12 }}>A future download requires a verified purchase. We do not collect payment today.</p></>}
      {draft.versions.length > 0 && <div style={{ marginTop: 25 }}><p className={common.eyebrow}>Your versions · This device</p>{draft.versions.map((version, index) => <div key={version.id} className={styles.version}><button onClick={() => { setPreviewFailed(false); setPortrait({ jobId: version.id, status: 'completed', previewUrl: `/api/pets/generations/${version.id}/preview`, downloadAvailable: false }); }}>{index + 1}. {getPetStyle(version.styleId)?.title || 'Portrait'}</button><button aria-label={`Favorite portrait ${index + 1}`} aria-pressed={draft.favorites.includes(version.id)} onClick={() => favorite(version.id)}><Heart size={16} fill={draft.favorites.includes(version.id) ? 'currentColor' : 'none'} /></button></div>)}</div>}
      <div className={common.actions}><Link href="/pets/keepsakes" className={common.secondary}>Explore keepsake formats <ArrowUpRight size={16} /></Link></div></>}
      {error && <p role="alert" className={styles.error}>{error}</p>}<p role="status" className={common.note} style={{ marginTop: 18 }}>{notice}</p><div className={common.actions}>{step > 0 && <button className={common.secondary} disabled={generating || uploading} onClick={() => { setStep(step - 1); setError(''); }}>Back</button>}{step < 2 && <button className={common.button} disabled={uploading || (step === 1 && !draft.subjects.length)} onClick={() => { if (step === 1 && !draft.subjects.some(subject => subject.role === 'pet')) { setError('Include at least one pet photo before continuing.'); return; } setStep(step + 1); setError(''); }}>Continue</button>}<button className={common.link} style={{ padding: 12, cursor: 'pointer' }} disabled={generating || uploading} onClick={save}>Save draft</button></div><button className={styles.delete} disabled={generating || uploading} onClick={() => void erase()}>Delete draft &amp; local photos</button>
    </section><aside className={styles.aside}><p className={common.eyebrow}>Your portrait brief</p><h2>{chosen.title}</h2>{example && <><Image src={example.image} alt={example.alt} width={1000} height={1500} sizes="300px" /><p className={common.note}>Original portfolio example, not your result.</p></>}<p>{chosen.description}</p><dl><div><dt>Subjects</dt><dd>{draft.subjects.length} / 4</dd></div><div><dt>Draft</dt><dd>Private to this device</dd></div><div><dt>Payment</dt><dd>Not collected</dd></div><div><dt>Generation</dt><dd>{enabled ? 'Preview allowance applies' : 'Paused'}</dd></div></dl><p>Separate photos work. Your pet, you and your sidekick, or the whole little crew.</p><Link className={common.link} href="/pets/privacy">Your photos &amp; privacy ↗</Link></aside></div></>;
}
