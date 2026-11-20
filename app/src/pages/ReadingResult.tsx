import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { readingById, examLabel } from '../lib/data';
import { useAttempts } from '../lib/storage';
import { cefr, fmtScore } from '../lib/scoring';
import { duration, elapsedSec, when } from '../lib/time';
import type { ReadingAttempt } from '../lib/types';
import { Passage } from '../components/Passage';
import { QuestionBlock } from '../components/QuestionBlock';
import { Markdown } from '../components/Markdown';
import { Icon } from '../components/Icon';
import s from './ReadingResult.module.css';

type Filter = 'all' | 'wrong' | 'blank' | 'flag';

export default function ReadingResult() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const [attempts] = useAttempts();
  const att = attempts.find((a) => a.id === attemptId) as ReadingAttempt | undefined;
  const [filter, setFilter] = useState<Filter>('all');
  const [part, setPart] = useState(1);
  if (!att || att.skill !== 'reading' || !att.result) return <Navigate to="/reading" replace />;
  const exam = readingById[att.examId];
  if (!exam) return <Navigate to="/reading" replace />;
  const r = att.result;
  const used = elapsedSec(att.startedAt, att.submittedAt);
  const P = exam.parts.find((p) => p.part === part)!;

  const visible = P.questions.filter((q) => {
    const a = att.answers[q.number];
    if (filter === 'wrong') return a && a !== q.answer;
    if (filter === 'blank') return !a;
    if (filter === 'flag') return att.flags.includes(q.number);
    return true;
  });
  const counts = {
    wrong: exam.parts.flatMap((p) => p.questions).filter((q) => att.answers[q.number] && att.answers[q.number] !== q.answer).length,
    blank: 40 - Object.keys(att.answers).length,
    flag: att.flags.length,
  };
  const weak = r.byType.filter((t) => t.total >= 2 && t.correct / t.total < 0.75).slice(0, 2);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Kết quả · {att.mode === 'test' ? 'Thi thử' : 'Luyện tập'} · {when(att.submittedAt!)}</p>
          <h1 className="page-title">{examLabel(exam.id)} · Reading</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="btn" to="/reading">Danh sách đề</Link>
          <button className="btn btn-primary" onClick={() => nav(`/reading/${exam.id}/${att.mode}`)}>Làm lại đề này</button>
        </div>
      </div>

      <section className={s.score}>
        <div className={s.big}>
          <span className={s.bigNum + ' num'}>{fmtScore(r.score)}</span>
          <span className={s.bigOf}>/ 10</span>
        </div>
        <dl className={s.facts}>
          <div><dt>Số câu đúng</dt><dd className="num">{r.correct} / {r.total}</dd></div>
          <div><dt>Thời gian làm</dt><dd>{duration(used)}{att.autoSubmitted ? ' · hết giờ' : ''}</dd></div>
          <div><dt>Ước lượng trình độ</dt><dd>{cefr(r.score)} <span className="muted">(riêng kỹ năng đọc)</span></dd></div>
        </dl>
        <div className={s.parts}>
          {r.byPart.map((p) => (
            <button key={p.part} className={clsx(s.partCell, part === p.part && s.partOn)} onClick={() => setPart(p.part)}>
              <span className={s.partName}>Passage {p.part}</span>
              <span className={s.partVal + ' num'}>{p.correct}<small>/{p.total}</small></span>
              <span className={s.bar}><i style={{ width: `${(p.correct / p.total) * 100}%` }} /></span>
            </button>
          ))}
        </div>
      </section>

      <h2 className="section-title">Theo dạng câu hỏi</h2>
      <div className={s.types}>
        {r.byType.map((t) => {
          const pct = Math.round((t.correct / t.total) * 100);
          return (
            <div key={t.type} className={s.typeRow}>
              <span className={s.typeName}>{t.type}</span>
              <span className={s.typeBar}><i className={pct < 50 ? s.low : pct < 75 ? s.mid : ''} style={{ width: `${pct}%` }} /></span>
              <span className="num">{t.correct}/{t.total}</span>
              <Link className={s.typeLink} to={`/reading/types/${encodeURIComponent(t.type)}`}>Luyện dạng này</Link>
            </div>
          );
        })}
      </div>
      {weak.length > 0 && (
        <p className={s.advice}>
          Nên ưu tiên luyện: {weak.map((w, i) => <span key={w.type}>{i ? ' và ' : ''}<Link to={`/reading/types/${encodeURIComponent(w.type)}`}>{w.type}</Link></span>)}.
        </p>
      )}

      <h2 className="section-title">Xem lại bài làm</h2>
      <div className={s.reviewBar}>
        <div className="seg" role="group" aria-label="Chọn passage">
          {exam.parts.map((p) => (
            <button key={p.part} aria-pressed={part === p.part} onClick={() => setPart(p.part)}>Passage {p.part}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Lọc câu hỏi">
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Tất cả</button>
          <button aria-pressed={filter === 'wrong'} onClick={() => setFilter('wrong')}>Sai · {counts.wrong}</button>
          <button aria-pressed={filter === 'blank'} onClick={() => setFilter('blank')}>Bỏ trống · {counts.blank}</button>
          <button aria-pressed={filter === 'flag'} onClick={() => setFilter('flag')}>Đánh dấu · {counts.flag}</button>
        </div>
      </div>

      <div className={s.review}>
        <details className={s.passage}>
          <summary><Icon name="book" size={15} /> Bài đọc · {P.title}</summary>
          <Passage part={P} marks={att.highlights[P.part] ?? []} />
        </details>
        <div className={s.qs}>
          {visible.length === 0 && <p className={s.empty}>Không có câu nào trong mục này ở Passage {part}.</p>}
          {visible.map((q) => (
            <QuestionBlock key={q.number} q={q} value={att.answers[q.number]} reveal
              meta={att.flags.includes(q.number) ? <span className="tag">đã đánh dấu</span> : undefined} />
          ))}
        </div>
        {P.tips && (
          <details className={s.tips}>
            <summary>Gợi ý chiến thuật · Passage {P.part}</summary>
            <Markdown source={P.tips} />
          </details>
        )}
      </div>
      <p className={s.source}>Nguồn đề: <a href={exam.source} target="_blank" rel="noreferrer">vstepowl.com</a></p>
    </div>
  );
}
