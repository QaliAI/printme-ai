'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { composeCutout, type Cutout } from '@/lib/segmentation/client';
import styles from './CutoutRefiner.module.css';

type Tool = 'erase' | 'restore';

/**
 * Manual cutout refinement: paint to erase leftover background or restore
 * parts of the subject the model missed. Edits the mask only; the source
 * pixels are never altered.
 */
export function CutoutRefiner({ cutout, onCommit }: { cutout: Cutout; onCommit?: () => void }) {
  const viewRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('erase');
  const [size, setSize] = useState(36);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const original = useRef<ImageData | null>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);

  const maskContext = () => cutout.mask.getContext('2d', { willReadFrequently: true })!;

  const redraw = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (viewRef.current) composeCutout(cutout, viewRef.current);
    });
  }, [cutout]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const scale = Math.min(1, 1200 / Math.max(cutout.source.width, cutout.source.height));
    view.width = Math.round(cutout.source.width * scale);
    view.height = Math.round(cutout.source.height * scale);
    original.current = maskContext().getImageData(0, 0, cutout.mask.width, cutout.mask.height);
    history.current = [];
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutout]);

  function toMask(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * cutout.mask.width,
      y: ((event.clientY - rect.top) / rect.height) * cutout.mask.height,
      scale: cutout.mask.width / rect.width,
    };
  }

  function stamp(from: { x: number; y: number }, to: { x: number; y: number }, scale: number) {
    const context = maskContext();
    const radius = (size / 2) * scale;
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (radius / 3)));
    context.save();
    context.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over';
    for (let i = 0; i <= steps; i++) {
      const x = from.x + ((to.x - from.x) * i) / steps;
      const y = from.y + ((to.y - from.y) * i) / steps;
      const gradient = context.createRadialGradient(x, y, radius * 0.55, x, y, radius);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    redraw();
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    history.current.push(maskContext().getImageData(0, 0, cutout.mask.width, cutout.mask.height));
    if (history.current.length > 12) history.current.shift();
    const point = toMask(event);
    drawing.current = point;
    stamp(point, point, point.scale);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    if (!drawing.current) return;
    const point = toMask(event);
    stamp(drawing.current, point, point.scale);
    drawing.current = point;
  }

  function onPointerUp() {
    if (drawing.current) onCommit?.();
    drawing.current = null;
  }

  function undo() {
    const previous = history.current.pop();
    if (!previous) return;
    maskContext().putImageData(previous, 0, 0);
    redraw();
    onCommit?.();
  }

  function reset() {
    if (!original.current) return;
    history.current.push(maskContext().getImageData(0, 0, cutout.mask.width, cutout.mask.height));
    maskContext().putImageData(original.current, 0, 0);
    redraw();
    onCommit?.();
  }

  return (
    <div className={styles.refiner}>
      <div className={styles.stage}>
        <canvas
          ref={viewRef}
          className={styles.canvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setCursor(null)}
          aria-label={`Cutout editor. ${tool === 'erase' ? 'Erase' : 'Restore'} brush active.`}
          data-testid="cutout-canvas"
        />
        {cursor && (
          <span
            className={styles.cursor}
            style={{ left: cursor.x, top: cursor.y, width: size, height: size }}
            data-tool={tool}
            aria-hidden="true"
          />
        )}
      </div>
      <div className={styles.tools}>
        <div className={styles.toggle} role="group" aria-label="Brush">
          <button type="button" aria-pressed={tool === 'erase'} onClick={() => setTool('erase')}>
            Erase
          </button>
          <button type="button" aria-pressed={tool === 'restore'} onClick={() => setTool('restore')}>
            Restore
          </button>
        </div>
        <label className={styles.size}>
          <span>Brush</span>
          <input type="range" min={10} max={120} value={size} onChange={(event) => setSize(Number(event.target.value))} />
        </label>
        <button type="button" className={styles.small} onClick={undo}>
          Undo
        </button>
        <button type="button" className={styles.small} onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
