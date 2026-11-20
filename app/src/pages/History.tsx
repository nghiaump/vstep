import { useState } from 'react';
import { Link } from 'react-router-dom';
import { removeAttempt, useAttempts } from '../lib/storage';
import { deleteAudio } from '../lib/audio';
import { duration, elapsedSec, when } from '../lib/time';
import { attemptHref, attemptTitle, modeLabel, resultLabel } from '../lib/summary';
import type { Attempt } from '../lib/types';
import s from './History.module.css';

type F = 'all' | Attempt['skill'];

export default function History() {
  const [attempts] = useAttempts();
  const [f, setF] = useState<F>('all');
  const [armed, setArmed] = useState<string | null>(null);
  const list = attempts.filter((a) => f === 'all' || a.skill === f).sort((a, b) => (b.submittedAt ?? b.startedAt) - (a.submittedAt ?? a.startedAt));
  const del = async (a: Attempt) => {
    if (armed !== a.id) { setArmed(a.id); setTimeout(() => setArmed((x) => (x === a.id ? null : x)), 3000); return; }
    if (a.skill === 'speaking') await deleteAudio(a.id);
    removeAttempt(a.id);
    setArmed(null);
  };
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{attempts.length} lượt làm bài</p>
          <h1 className="page-title">Lịch sử</h1>
        </div>
        <div className="seg" role="group" aria-label="Lọc kỹ năng">
          {(['all', 'reading', 'writing', 'speaking'] as F[]).map((k) => (
            <button key={k} aria-pressed={f === k} onClick={() => setF(k)}>{k === 'all' ? 'Tất cả' : k[0].toUpperCase() + k.slice(1)}</button>
          ))}
        </div>
      </div>
      {list.length === 0 ? <p className={s.empty}>Chưa có lượt làm bài nào.</p> : (
        <div className={s.table}>
          <div className={s.th}><span>Bài</span><span>Chế độ</span><span>Kết quả</span><span>Thời gian làm</span><span>Ngày</span><span /></div>
          {list.map((a) => (
            <div key={a.id} className={s.tr}>
              <Link to={attemptHref(a)} className={s.title}>{attemptTitle(a)}</Link>
              <span className="muted">{modeLabel(a)}</span>
              <span className={'num ' + (a.submittedAt ? '' : s.live)}>{resultLabel(a)}</span>
              <span className="muted num">{a.submittedAt ? duration(elapsedSec(a.startedAt, a.submittedAt)) : '—'}</span>
              <span className="muted">{when(a.submittedAt ?? a.startedAt)}</span>
              <button className={'btn btn-sm btn-ghost ' + (armed === a.id ? 'btn-danger' : '')} onClick={() => del(a)}>
                {armed === a.id ? 'Bấm lần nữa để xoá' : 'Xoá'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
