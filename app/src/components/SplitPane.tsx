import { useRef, type ReactNode } from 'react';
import s from './SplitPane.module.css';

/** Two scrollable columns with a draggable / keyboard-adjustable divider. ratio = left width fraction. */
export function SplitPane({ left, right, ratio, onRatio }: { left: ReactNode; right: ReactNode; ratio: number; onRatio: (r: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const clamp = (r: number) => Math.min(0.72, Math.max(0.3, r));
  const onDown = (e: React.PointerEvent) => {
    const el = box.current;
    if (!el) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const move = (ev: PointerEvent) => onRatio(clamp((ev.clientX - rect.left) / rect.width));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.cursor = ''; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    document.body.style.cursor = 'col-resize';
  };
  return (
    <div className={s.split} ref={box} style={{ gridTemplateColumns: `${ratio}fr 9px ${1 - ratio}fr` }}>
      <div className={s.pane}>{left}</div>
      <div className={s.handle} role="separator" aria-orientation="vertical" aria-label="Kéo để đổi độ rộng" tabIndex={0}
        aria-valuenow={Math.round(ratio * 100)} aria-valuemin={30} aria-valuemax={72}
        onPointerDown={onDown} onDoubleClick={() => onRatio(0.52)}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') onRatio(clamp(ratio - 0.03)); if (e.key === 'ArrowRight') onRatio(clamp(ratio + 0.03)); }}>
        <span />
      </div>
      <div className={s.pane}>{right}</div>
    </div>
  );
}
