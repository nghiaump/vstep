import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SPEAKING, examLabel } from '../lib/data';
import { useAttempts } from '../lib/storage';
import type { SpeakingAttempt } from '../lib/types';
import { Icon } from '../components/Icon';
import s from './List.module.css';

export default function SpeakingList() {
  const nav = useNavigate();
  const [attempts] = useAttempts();
  const [q, setQ] = useState('');
  const mine = attempts.filter((a): a is SpeakingAttempt => a.skill === 'speaking');
  const rows = useMemo(() => SPEAKING.filter((e) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    const hay = [e.number, ...e.part1.topics.map((x) => x.title + ' ' + x.questions.join(' ')), e.part2.situation, ...e.part2.options, e.part3.topic, ...e.part3.ideas].join(' ').toLowerCase();
    return hay.includes(t);
  }), [q]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Kỹ năng Nói · {SPEAKING.length} đề · 3 phần / khoảng 12 phút</p>
          <h1 className="page-title">Speaking</h1>
          <p className="lede">Part 1 trả lời câu hỏi theo 2 chủ đề (3 phút), Part 2 chọn giải pháp (1 phút chuẩn bị, 3 phút nói), Part 3 phát triển chủ đề theo sơ đồ (1 phút chuẩn bị, 4 phút nói). Thi thử có ghi âm để bạn nghe lại.</p>
        </div>
      </div>
      <div className={s.toolbar}>
        <label className={s.search}>
          <Icon name="search" size={15} />
          <input className="field" placeholder="Tìm chủ đề: sports, travel, technology…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="muted">{new Set(mine.filter((a) => a.submittedAt).map((a) => a.examId)).size}/{SPEAKING.length} đề đã thi thử</span>
      </div>
      <div className={s.table}>
        {rows.map((e) => {
          const last = mine.filter((a) => a.examId === e.id && a.submittedAt).sort((a, b) => b.submittedAt! - a.submittedAt!)[0];
          return (
            <div key={e.id} className={s.simpleRow}>
              <span className={s.code}>{examLabel(e.id)}</span>
              <div className={s.prompts}>
                <span><b>PART 1</b>{e.part1.topics.map((t) => t.title).join(' · ')}</span>
                <span><b>PART 2</b>{e.part2.situation}</span>
                <span><b>PART 3</b>{e.part3.topic}</span>
                {last && <span className="muted" style={{ fontSize: 12.5 }}>Đã thi thử · <Link to={`/speaking/review/${last.id}`}>nghe lại bài nói</Link></span>}
              </div>
              <div className={s.rowActs}>
                <button className="btn btn-sm" onClick={() => nav(`/speaking/${e.id}`)}>Xem đề</button>
                <button className="btn btn-sm btn-primary" onClick={() => nav(`/speaking/${e.id}/test`)}><Icon name="mic" size={14} /> Thi thử</button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className={s.empty}>Không tìm thấy đề phù hợp.</p>}
      </div>
    </div>
  );
}
