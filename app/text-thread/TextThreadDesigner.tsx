'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAssetStorageKey, saveCreateAsset, writeCreateSession } from '@/lib/commerce/create-session';
import styles from './text-thread.module.css';

type Sender = 'me' | 'them';
type ThreadStyle = 'iphone' | 'android';

type Message = {
  id: string;
  sender: Sender;
  text: string;
};

interface Props {
  defaultProductId: string;
  defaultPrintifyVariantId: number;
}

const STARTER_MESSAGES: Message[] = [
  { id: 'm1', sender: 'them', text: 'You said you were only getting one shirt.' },
  { id: 'm2', sender: 'me', text: 'I lied.' },
  { id: 'm3', sender: 'them', text: 'How many did you order?' },
  { id: 'm4', sender: 'me', text: 'This conversation is now on one of them.' },
];

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function renderArtwork({
  messages,
  meName,
  themName,
  threadStyle,
  showNames,
}: {
  messages: Message[];
  meName: string;
  themName: string;
  threadStyle: ThreadStyle;
  showNames: boolean;
}) {
  const width = 1800;
  const padding = 150;
  const contentWidth = width - padding * 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering is unavailable.');

  ctx.font = '600 54px Arial, Helvetica, sans-serif';
  const messageFont = '500 46px Arial, Helvetica, sans-serif';
  const nameFont = '600 30px Arial, Helvetica, sans-serif';
  const maxBubbleWidth = 1120;
  const innerX = 48;
  const innerY = 34;
  const lineHeight = 60;
  let y = showNames ? 150 : 60;

  const layout = messages.map((message) => {
    ctx.font = messageFont;
    const lines = wrapCanvasText(ctx, message.text || ' ', maxBubbleWidth - innerX * 2);
    const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const bubbleWidth = Math.max(180, Math.min(maxBubbleWidth, textWidth + innerX * 2));
    const bubbleHeight = lines.length * lineHeight + innerY * 2;
    const item = { ...message, lines, bubbleWidth, bubbleHeight, y };
    y += bubbleHeight + 34;
    return item;
  });

  const height = Math.max(1600, Math.ceil(y + 100));
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  if (showNames) {
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '700 58px Arial, Helvetica, sans-serif';
    ctx.fillText(`${meName || 'You'} + ${themName || 'Friend'}`, width / 2, 78);
  }

  for (const message of layout) {
    const mine = message.sender === 'me';
    const x = mine ? width - padding - message.bubbleWidth : padding;
    const isIphone = threadStyle === 'iphone';
    const bubbleColor = mine
      ? isIphone ? '#0B84FE' : '#1A73E8'
      : isIphone ? '#E9E9EB' : '#303134';
    const textColor = mine ? '#ffffff' : isIphone ? '#111111' : '#ffffff';

    roundedRect(ctx, x, message.y, message.bubbleWidth, message.bubbleHeight, isIphone ? 58 : 36);
    ctx.fillStyle = bubbleColor;
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = messageFont;
    message.lines.forEach((line, index) => {
      ctx.fillText(line, x + innerX, message.y + innerY + index * lineHeight);
    });

    ctx.font = nameFont;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.72;
    ctx.textAlign = mine ? 'right' : 'left';
    ctx.fillText(mine ? (meName || 'You') : (themName || 'Friend'), mine ? x + message.bubbleWidth - 12 : x + 12, message.y + message.bubbleHeight + 7);
    ctx.globalAlpha = 1;
  }

  return canvas;
}

export function TextThreadDesigner({ defaultProductId, defaultPrintifyVariantId }: Props) {
  const router = useRouter();
  const [meName, setMeName] = useState('You');
  const [themName, setThemName] = useState('Bestie');
  const [threadStyle, setThreadStyle] = useState<ThreadStyle>('iphone');
  const [showNames, setShowNames] = useState(false);
  const [messages, setMessages] = useState<Message[]>(STARTER_MESSAGES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => messages.some((message) => message.text.trim().length > 0), [messages]);

  function updateMessage(id: string, patch: Partial<Message>) {
    setMessages((current) => current.map((message) => message.id === id ? { ...message, ...patch } : message));
  }

  function addMessage(sender: Sender = 'them') {
    setMessages((current) => [...current, { id: newId(), sender, text: '' }]);
  }

  function moveMessage(index: number, direction: -1 | 1) {
    setMessages((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function continueToProducts() {
    if (!canContinue) return;
    setSaving(true);
    setError(null);
    try {
      const cleanMessages = messages.filter((message) => message.text.trim());
      const canvas = renderArtwork({ messages: cleanMessages, meName, themName, threadStyle, showNames });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not create print artwork.')), 'image/png');
      });

      const designId = `text-thread-${newId()}`;
      const assetId = `${designId}-asset`;
      await saveCreateAsset(createAssetStorageKey(designId, 1), blob);
      writeCreateSession(window.localStorage, {
        schemaVersion: 1,
        designId,
        versionId: `${designId}-v1`,
        revision: 1,
        sourceType: 'text-personalized',
        preparation: 'original',
        artStyle: 'illustrated',
        asset: {
          id: assetId,
          alt: `Text conversation between ${meName || 'You'} and ${themName || 'Friend'}`,
          width: canvas.width,
          height: canvas.height,
          mimeType: 'image/png',
          hasTransparency: true,
        },
        productId: defaultProductId,
        printifyVariantId: defaultPrintifyVariantId,
        placement: {
          normalizedX: 0.5,
          normalizedY: 0.5,
          normalizedScale: 0.82,
          angle: 0,
          fit: 'contain',
        },
        phase: 'customize',
        updatedAt: new Date().toISOString(),
      });
      router.push(`/create?product=${encodeURIComponent(defaultProductId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not prepare this design.');
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.editor}>
          <div className={styles.eyebrow}>PrintMe Text Thread</div>
          <h1>Turn the group-chat moment into merch.</h1>
          <p className={styles.lede}>Build a two-person conversation, choose a phone style, then print it on a shirt, hoodie, mug, tote, or any compatible PrintMe product.</p>

          <div className={styles.row2}>
            <label>
              <span>You</span>
              <input value={meName} onChange={(event) => setMeName(event.target.value)} maxLength={24} />
            </label>
            <label>
              <span>Other person</span>
              <input value={themName} onChange={(event) => setThemName(event.target.value)} maxLength={24} />
            </label>
          </div>

          <div className={styles.segmented} aria-label="Message style">
            <button className={threadStyle === 'iphone' ? styles.active : ''} onClick={() => setThreadStyle('iphone')} type="button">iPhone style</button>
            <button className={threadStyle === 'android' ? styles.active : ''} onClick={() => setThreadStyle('android')} type="button">Android style</button>
          </div>

          <label className={styles.check}><input type="checkbox" checked={showNames} onChange={(event) => setShowNames(event.target.checked)} /> Add conversation title to artwork</label>

          <div className={styles.messages}>
            {messages.map((message, index) => (
              <div className={styles.messageEditor} key={message.id}>
                <select value={message.sender} onChange={(event) => updateMessage(message.id, { sender: event.target.value as Sender })} aria-label="Message sender">
                  <option value="them">{themName || 'Friend'}</option>
                  <option value="me">{meName || 'You'}</option>
                </select>
                <textarea value={message.text} onChange={(event) => updateMessage(message.id, { text: event.target.value })} placeholder="Type a message…" rows={2} maxLength={240} />
                <div className={styles.messageActions}>
                  <button type="button" aria-label="Move message up" onClick={() => moveMessage(index, -1)} disabled={index === 0}><ArrowUp size={16} /></button>
                  <button type="button" aria-label="Move message down" onClick={() => moveMessage(index, 1)} disabled={index === messages.length - 1}><ArrowDown size={16} /></button>
                  <button type="button" aria-label="Delete message" onClick={() => setMessages((current) => current.filter((item) => item.id !== message.id))}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.addRow}>
            <button type="button" onClick={() => addMessage('them')}><Plus size={17} /> Add {themName || 'friend'} message</button>
            <button type="button" onClick={() => addMessage('me')}><Plus size={17} /> Add your message</button>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
          <button className={styles.primary} type="button" disabled={!canContinue || saving} onClick={continueToProducts}>{saving ? 'Preparing artwork…' : 'Choose a product →'}</button>
          <p className={styles.hint}>Your thread becomes a transparent, high-resolution PNG and then uses PrintMe’s normal placement, mockup, cart, and Printify fulfillment flow.</p>
        </section>

        <section className={styles.previewWrap} aria-label="Live text thread preview">
          <div className={`${styles.phone} ${threadStyle === 'android' ? styles.android : styles.iphone}`}>
            <div className={styles.phoneTop}><span className={styles.back}>‹</span><div><strong>{themName || 'Friend'}</strong><small>Text Message</small></div><span>•••</span></div>
            <div className={styles.thread}>
              {messages.filter((message) => message.text.trim()).map((message) => (
                <div key={message.id} className={`${styles.bubbleRow} ${message.sender === 'me' ? styles.mine : styles.theirs}`}>
                  <div className={styles.bubble}>{message.text}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.printNote}>PRINT PREVIEW · transparent background artwork</div>
        </section>
      </div>
    </main>
  );
}
