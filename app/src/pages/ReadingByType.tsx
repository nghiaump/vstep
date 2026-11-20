import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { READING, QUESTION_TYPES, TYPE_HINT, examLabel } from '../lib/data';
import { useStored } from '../lib/storage';
import type { Choice, Question, ReadingExam, ReadingPart } from '../lib/types';
import { QuestionBlock } from '../components/QuestionBlock';
import { Passage } from '../components/Passage';
import { Icon } from '../components/Icon';
import s from './ReadingByType.module.css';

type Item = { exam: ReadingExam; part: ReadingPart; q: Question; key: string };
type Filter = 'todo' | 'wrong' | 'all';
const PER = 8;
const EMPTY: Record<string, Choice> = {};

export default function ReadingByType() {
  const { type } = useParams();
  const [log, setLog] = useStored<Record<string, Choice>>('typePractice', EMPTY);
  const [filter, setFilter] = useState<Filter>('todo');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const all = useMemo(() => {
    const out: Item[] = [];
    for (const exam of READING) for (const part of exam.parts) for (const q of part.questions)
      out.push({ exam, part, q, key: `${exam.id}#${q.number}` });
    return out;
  }, []);

  if (!type) return <Navigate to={`/reading/types/${encodeURIComponent(QUESTION_TYPES[0])}`} replace />;
  const items = all.filter((x) => x.q.type === type);
  const shown = items.filter((x) => filter === 'all' || (filter === 'todo' ? !log[x.key] : log[x.key] && log[x.key] !== x.q.answer));
  const pages = Math.max(1, Math.ceil(shown.length / PER));
  const pg = Math.min(page, pages - 1);
  const done = items.filter((x) => log[x.key]);
  const right = done.filter((x) => log[x.key] === x.q.answer).length;

  const stat = (t: string) => {
    const its = all.filter((x) => x.q.type === t);
    const d = its.filter((x) => log[x.key]);
    return { n: its.length, d: d.length, ok: d.filter((x) => log[x.key] === x.q.answer).length };
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow"><Link to="/reading">Reading</Link> · Luyện theo dạng câu hỏi</p>
          <h1 className="page-title">{type}</h1>
          <p className="lede">{TYPE_HINT[type] ?? ''}. Chọn đáp án để xem ngay đúng/sai và giải thích.</p>
        </div>
        <div className={s.stats}>
          <div><b className="num">{done.length}</b><span>/{items.length} đã làm</span></div>
          <div><b className="num">{done.length ? Math.round((right / done.length) * 100) : 0}%</b><span>chính xác</span></div>
        </div>
      </div>

      <div className={s.layout}>
        <nav className={s.side} aria-label="Dạng câu hỏi">
          {QUESTION_TYPES.map((t) => {
            const st = stat(t);
            return (
              <Link key={t} to={`/reading/types/${encodeURIComponent(t)}`} onClick={() => setPage(0)}
                className={clsx(s.sideItem, t === type && s.sideOn)}>
                <span>{t}</span>
                <span className="num muted">{st.d}/{st.n}</span>
                <span className={s.sideBar}><i style={{ width: `${(st.d / st.n) * 100}%` }} /></span>
              </Link>
            );
          })}
          {done.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
              onClick={() => setLog(Object.fromEntries(Object.entries(log).filter(([k]) => !items.some((x) => x.key === k))))}>
              <Icon name="undo" size={14} /> Làm lại dạng này
            </button>
          )}
        </nav>

        <div>
          <div className={s.bar}>
            <div className="seg" role="group" aria-label="Lọc">
              <button aria-pressed={filter === 'todo'} onClick={() => { setFilter('todo'); setPage(0); }}>Chưa làm · {items.length - done.length}</button>
              <button aria-pressed={filter === 'wrong'} onClick={() => { setFilter('wrong'); setPage(0); }}>Làm sai · {done.length - right}</button>
              <button aria-pressed={filter === 'all'} onClick={() => { setFilter('all'); setPage(0); }}>Tất cả · {items.length}</button>
            </div>
            <div className={s.pager}>
              <button className="btn btn-sm" disabled={pg === 0} onClick={() => setPage(pg - 1)} aria-label="Trang trước"><Icon name="left" size={14} /></button>
              <span className="num">{pg + 1} / {pages}</span>
              <button className="btn btn-sm" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} aria-label="Trang sau"><Icon name="right" size={14} /></button>
            </div>
          </div>

          <div className={s.list}>
            {shown.length === 0 && (
              <p className={s.empty}>{filter === 'todo' ? 'Bạn đã làm hết các câu thuộc dạng này.' : filter === 'wrong' ? 'Chưa có câu nào làm sai.' : 'Không có câu nào.'}</p>
            )}
            {shown.slice(pg * PER, pg * PER + PER).map((x) => (
              <article key={x.key} className={s.item}>
                <div className={s.src}>
                  <span>{examLabel(x.exam.id)} · Passage {x.part.part} · <i>{x.part.title}</i></span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setOpen(open === x.key ? null : x.key)} aria-expanded={open === x.key}>
                    <Icon name="book" size={14} /> {open === x.key ? 'Ẩn bài đọc' : 'Xem bài đọc'}
                  </button>
                </div>
                {open === x.key && <div className={s.ctx}><Passage part={x.part} marks={[]} /></div>}
                <QuestionBlock q={x.q} value={log[x.key]} reveal={!!log[x.key]}
                  onChange={log[x.key] ? undefined : (c) => setLog({ ...log, [x.key]: c })} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
