import { forwardRef } from 'react';
import clsx from 'clsx';
import type { Choice, Question } from '../lib/types';
import { Inline } from './Markdown';
import { Icon } from './Icon';
import s from './QuestionBlock.module.css';

const LETTERS: Choice[] = ['A', 'B', 'C', 'D'];

/** One multiple-choice item. `reveal` shows correctness, type and explanation (practice / review). */
export const QuestionBlock = forwardRef<HTMLElement, {
  q: Question; value?: Choice; onChange?: (c: Choice) => void;
  flagged?: boolean; onFlag?: () => void; active?: boolean; onFocusQ?: () => void;
  reveal?: boolean; meta?: React.ReactNode;
}>(function QuestionBlock({ q, value, onChange, flagged, onFlag, active, onFocusQ, reveal, meta }, ref) {
  const locked = reveal || !onChange;
  const status = reveal ? (value === q.answer ? 'ok' : value ? 'bad' : 'skip') : null;
  return (
    <section ref={ref} className={clsx(s.q, active && s.active)} onClick={onFocusQ} aria-labelledby={`q${q.number}-stem`} data-q={q.number}>
      <div className={s.top}>
        <span className={clsx(s.num, status && s[status])}>{q.number}</span>
        <h3 id={`q${q.number}-stem`} className={s.stem}><Inline text={q.stem} /></h3>
        {onFlag && (
          <button className={clsx(s.flag, flagged && s.flagOn)} onClick={(e) => { e.stopPropagation(); onFlag(); }}
            aria-pressed={!!flagged} title={flagged ? 'Bỏ đánh dấu (F)' : 'Đánh dấu xem lại (F)'}>
            <Icon name="flag" size={15} />
            <span>{flagged ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
          </button>
        )}
      </div>
      <div className={s.opts} role="radiogroup" aria-labelledby={`q${q.number}-stem`}>
        {LETTERS.map((L) => {
          const chosen = value === L;
          const right = reveal && L === q.answer;
          const wrong = reveal && chosen && L !== q.answer;
          return (
            <label key={L} className={clsx(s.opt, chosen && s.chosen, right && s.right, wrong && s.wrong, locked && s.locked)}>
              <input type="radio" name={`q${q.number}`} value={L} checked={chosen} disabled={locked}
                onChange={() => onChange?.(L)} className="sr-only" />
              <span className={s.letter}>{L}</span>
              <span className={s.text}><Inline text={q.options[L]} /></span>
              {right && <Icon name="check" size={16} className={s.mark} />}
              {wrong && <Icon name="x" size={16} className={s.mark} />}
            </label>
          );
        })}
      </div>
      {reveal && (
        <div className={s.explain}>
          <div className={s.explainHead}>
            <span className="tag tag-accent">{q.type}</span>
            <span>Đáp án <b>{q.answer}</b>{status === 'skip' && ' · bạn chưa chọn'}</span>
            {meta}
          </div>
          {q.explanation && <p><Inline text={q.explanation.charAt(0).toUpperCase() + q.explanation.slice(1)} /></p>}
        </div>
      )}
    </section>
  );
});
