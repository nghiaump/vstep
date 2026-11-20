import { useRef, useState } from 'react';
import type { Highlight, ReadingPart } from '../lib/types';
import { addMark, segments, textOffset } from '../lib/highlight';
import { Icon } from './Icon';
import s from './Passage.module.css';

/** Reading passage with numbered paragraphs and select-to-highlight (click a highlight to remove it). */
export function Passage({ part, marks, onMarks, label }: {
  part: ReadingPart; marks: Highlight[]; onMarks?: (m: Highlight[]) => void; label?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<{ h: Highlight; x: number; y: number } | null>(null);

  const onUp = () => {
    if (!onMarks) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return setPending(null);
    const range = sel.getRangeAt(0);
    const a = (range.startContainer.parentElement ?? (range.startContainer as Element)).closest('[data-text]');
    const b = (range.endContainer.parentElement ?? (range.endContainer as Element)).closest('[data-text]');
    if (!a || a !== b || !box.current?.contains(a)) return setPending(null);
    const start = textOffset(a, range.startContainer, range.startOffset);
    const end = textOffset(a, range.endContainer, range.endOffset);
    if (end - start < 2) return setPending(null);
    const r = range.getBoundingClientRect();
    const host = box.current.getBoundingClientRect();
    setPending({
      h: { para: Number((a as HTMLElement).dataset.text), start, end },
      x: r.left + r.width / 2 - host.left,
      y: r.top - host.top + box.current.scrollTop,
    });
  };

  const apply = () => {
    if (!pending || !onMarks) return;
    onMarks(addMark(marks, pending.h));
    window.getSelection()?.removeAllRanges();
    setPending(null);
  };

  return (
    <div className={s.wrap} ref={box} onMouseUp={onUp} onKeyUp={(e) => e.shiftKey && onUp()}>
      <div className={s.head}>
        <span className={s.label}>{label ?? `Passage ${part.part}`}</span>
        <h2 className={s.title}>{part.title}</h2>
        <p className={s.dir}>{part.directions}</p>
      </div>
      <div className={s.body}>
        {part.passage.map((para, i) => {
          const pm = marks.filter((m) => m.para === i);
          return (
            <p key={i} className={s.para}>
              <span className={s.pn} aria-hidden="true">{i + 1}</span>
              <span data-text={i}>
                {segments(para, pm).map((seg, j) => {
                  const inner = seg.bold ? <strong>{seg.text}</strong> : seg.text;
                  return seg.mark != null ? (
                    <mark key={j} className={s.mark} title={onMarks ? 'Bấm để bỏ tô sáng' : undefined}
                      onClick={() => onMarks?.(marks.filter((m) => m !== pm[seg.mark!]))}>{inner}</mark>
                  ) : <span key={j}>{inner}</span>;
                })}
              </span>
            </p>
          );
        })}
      </div>
      {pending && (
        <div className={s.pop} style={{ left: pending.x, top: pending.y }} onMouseDown={(e) => e.preventDefault()}>
          <button onClick={apply}><Icon name="marker" size={14} /> Tô sáng</button>
          <button onClick={() => { setPending(null); window.getSelection()?.removeAllRanges(); }} aria-label="Huỷ"><Icon name="x" size={14} /></button>
        </div>
      )}
    </div>
  );
}
