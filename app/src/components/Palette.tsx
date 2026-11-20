import clsx from 'clsx';
import type { Choice, ReadingExam } from '../lib/types';
import s from './Palette.module.css';

/** Footer question navigator: P1–P4 × 10 cells with answered / flagged / current / graded states. */
export function Palette({ exam, answers, flags, current, onJump, graded }: {
  exam: ReadingExam; answers: Record<number, Choice>; flags: number[]; current: number;
  onJump: (part: number, q: number) => void; graded?: (part: number) => boolean;
}) {
  return (
    <nav className={s.palette} aria-label="Danh sách câu hỏi">
      {exam.parts.map((p) => {
        const done = p.questions.filter((q) => answers[q.number]).length;
        return (
          <div key={p.part} className={s.group}>
            <div className={s.gl}><span>Passage {p.part}</span><span className="num">{done}/{p.questions.length}</span></div>
            <div className={s.cells}>
              {p.questions.map((q) => {
                const g = graded?.(p.part);
                const a = answers[q.number];
                return (
                  <button key={q.number} onClick={() => onJump(p.part, q.number)}
                    className={clsx(s.cell, a && s.answered, flags.includes(q.number) && s.flagged, q.number === current && s.current,
                      g && (a === q.answer ? s.ok : s.bad))}
                    aria-label={`Câu ${q.number}${a ? ', đã chọn ' + a : ', chưa làm'}${flags.includes(q.number) ? ', đã đánh dấu' : ''}`}
                    aria-current={q.number === current ? 'true' : undefined}>
                    {q.number}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
