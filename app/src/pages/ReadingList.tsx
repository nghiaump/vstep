import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { READING, QUESTION_TYPES, examLabel } from '../lib/data';
import { useAttempts } from '../lib/storage';
import { fmtScore } from '../lib/scoring';
import { clock, remainingSec } from '../lib/time';
import type { ReadingAttempt } from '../lib/types';
import { useNow } from '../hooks/useNow';
import { Icon } from '../components/Icon';
import s from './List.module.css';

export default function ReadingList() {
  const nav = useNavigate();
  const [attempts] = useAttempts();
  const [mode, setMode] = useState<'test' | 'practice'>('test');
  const [q, setQ] = useState('');
  const now = useNow();
  const reading = attempts.filter((a): a is ReadingAttempt => a.skill === 'reading');

  const rows = useMemo(() => READING.filter((e) => {
    const t = q.trim().toLowerCase();
    return !t || e.number.toString().includes(t) || e.parts.some((p) => p.title.toLowerCase().includes(t));
  }), [q]);

  const totalDone = new Set(reading.filter((a) => a.result).map((a) => a.examId)).size;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Kỹ năng Đọc · {READING.length} đề · 40 câu / 60 phút</p>
          <h1 className="page-title">Reading</h1>
          <p className="lede">Chọn một đề để thi thử đúng định dạng VSTEP, hoặc luyện tập không giới hạn thời gian và xem giải thích ngay sau mỗi bài đọc.</p>
        </div>
        <div className={s.headTools}>
          <div className="seg" role="group" aria-label="Chế độ">
            <button aria-pressed={mode === 'test'} onClick={() => setMode('test')}>Thi thử 60 phút</button>
            <button aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>Luyện tập</button>
          </div>
        </div>
      </div>

      <div className={s.toolbar}>
        <label className={s.search}>
          <Icon name="search" size={15} />
          <input className="field" placeholder="Tìm theo số đề hoặc tên bài đọc…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="muted">{totalDone}/{READING.length} đề đã làm</span>
      </div>

      <div className={s.table} role="table" aria-label="Danh sách đề Reading">
        <div className={s.thead} role="row">
          <span role="columnheader">Đề</span>
          <span role="columnheader">Bài đọc</span>
          <span role="columnheader" className={s.right}>Cao nhất</span>
          <span role="columnheader" />
        </div>
        {rows.map((e) => {
          const mine = reading.filter((a) => a.examId === e.id);
          const best = Math.max(-1, ...mine.filter((a) => a.result).map((a) => a.result!.score));
          const active = mine.find((a) => !a.submittedAt && a.mode === mode);
          const left = active?.durationSec ? remainingSec(active.startedAt, active.durationSec, now) : null;
          return (
            <div key={e.id} className={s.tr} role="row">
              <span className={s.code}>{examLabel(e.id)}</span>
              <span className={s.titles}>
                {e.parts.map((p) => <span key={p.part}><i className="num">{p.part}</i>{p.title}</span>)}
              </span>
              <span className={s.right + ' num'}>
                {best >= 0 ? <b>{fmtScore(best)}</b> : <span className="muted">—</span>}
                {mine.filter((a) => a.result).length > 0 && <small className="muted"> · {mine.filter((a) => a.result).length} lần</small>}
              </span>
              <span className={s.act}>
                {active
                  ? <button className="btn btn-primary btn-sm" onClick={() => nav(`/reading/${e.id}/${mode}`)}>
                      Làm tiếp{left != null ? ` · ${clock(left)}` : ''}
                    </button>
                  : <button className="btn btn-sm" onClick={() => nav(`/reading/${e.id}/${mode}`)}>
                      {mode === 'test' ? 'Thi thử' : 'Luyện tập'} <Icon name="right" size={14} />
                    </button>}
              </span>
            </div>
          );
        })}
        {rows.length === 0 && <p className={s.empty}>Không tìm thấy đề phù hợp.</p>}
      </div>

      <h2 className="section-title">Luyện theo dạng câu hỏi</h2>
      <div className={s.typeGrid}>
        {QUESTION_TYPES.map((t) => {
          const n = READING.reduce((sum, e) => sum + e.parts.reduce((x, p) => x + p.questions.filter((qq) => qq.type === t).length, 0), 0);
          return (
            <Link key={t} to={`/reading/types/${encodeURIComponent(t)}`} className={s.typeItem}>
              <span>{t}</span><span className="num muted">{n}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
