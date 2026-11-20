import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WRITING, examLabel } from '../lib/data';
import { useAttempts } from '../lib/storage';
import { fmtScore, taskScore, writingOverall } from '../lib/scoring';
import { clock, remainingSec } from '../lib/time';
import type { WritingAttempt } from '../lib/types';
import { useNow } from '../hooks/useNow';
import { Icon } from '../components/Icon';
import { hasSolution } from '../lib/solutions';
import s from './List.module.css';

const firstLine = (md: string) => md.replace(/\*\*/g, '').split('\n').map((l) => l.replace(/^You should spend about \d+ minutes on this task\.\s*/, '').trim()).find((l) => l.length > 0) ?? '';

export default function WritingList() {
  const nav = useNavigate();
  const [attempts] = useAttempts();
  const [q, setQ] = useState('');
  const now = useNow();
  const mine = attempts.filter((a): a is WritingAttempt => a.skill === 'writing');
  const rows = useMemo(() => WRITING.filter((e) => {
    const t = q.trim().toLowerCase();
    return !t || e.number.toString().includes(t) || e.tasks.some((x) => x.prompt.toLowerCase().includes(t));
  }), [q]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Kỹ năng Viết · {WRITING.length} đề · 2 task / 60 phút</p>
          <h1 className="page-title">Writing</h1>
          <p className="lede">Task 1 viết thư/email (≥ 120 từ, khoảng 20 phút), Task 2 viết luận (≥ 250 từ, khoảng 40 phút). Task 2 được tính hệ số gấp đôi.</p>
        </div>
      </div>
      <div className={s.toolbar}>
        <label className={s.search}>
          <Icon name="search" size={15} />
          <input className="field" placeholder="Tìm theo số đề hoặc chủ đề…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="muted">{new Set(mine.filter((a) => a.submittedAt).map((a) => a.examId)).size}/{WRITING.length} đề đã viết</span>
      </div>
      <div className={s.table}>
        {rows.map((e) => {
          const att = mine.filter((a) => a.examId === e.id);
          const active = att.find((a) => !a.submittedAt);
          const last = att.filter((a) => a.submittedAt).sort((a, b) => b.submittedAt! - a.submittedAt!)[0];
          const t1 = taskScore(last?.selfScores?.[1]);
          const t2 = taskScore(last?.selfScores?.[2]);
          const sc = last?.mode === 'test' ? writingOverall(t1, t2) : (t1 ?? t2);
          return (
            <div key={e.id} className={s.simpleRow}>
              <span className={s.code}>{examLabel(e.id)}</span>
              <div className={s.prompts}>
                {e.tasks.map((t) => <span key={t.task}><b>TASK {t.task}</b>{firstLine(t.prompt)}</span>)}
                {last && (
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    Lần gần nhất: <Link to={`/writing/review/${last.id}`}>xem bài</Link>{sc != null ? ` · tự chấm ${fmtScore(sc)}` : ''}
                  </span>
                )}
              </div>
              <div className={s.rowActs}>
                {active ? (
                  <button className="btn btn-primary btn-sm" onClick={() => nav(`/writing/${e.id}/${active.mode}`)}>
                    Viết tiếp · {clock(remainingSec(active.startedAt, active.durationSec, now))}
                  </button>
                ) : (<>
                  <button className="btn btn-sm" onClick={() => nav(`/writing/${e.id}/task1`)}>Task 1</button>
                  <button className="btn btn-sm" onClick={() => nav(`/writing/${e.id}/task2`)}>Task 2</button>
                  <button className="btn btn-sm btn-primary" onClick={() => nav(`/writing/${e.id}/test`)}>Thi thử 60′</button>
                  {hasSolution(e.id) && <Link className="btn btn-sm btn-ghost" to={`/bai-mau/${e.id}`}>Bài mẫu</Link>}
                </>)}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className={s.empty}>Không tìm thấy đề phù hợp.</p>}
      </div>
    </div>
  );
}
