import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { READING, SPEAKING, WRITING, TOTAL_EXAMS, RANGE_LABEL } from '../lib/data';
import { useAttempts, useProfile } from '../lib/storage';
import { fmtScore } from '../lib/scoring';
import { clock, remainingSec, when } from '../lib/time';
import { attemptHref, attemptTitle, modeLabel, resultLabel } from '../lib/summary';
import type { ReadingAttempt, WritingAttempt } from '../lib/types';
import { useNow } from '../hooks/useNow';
import { Icon } from '../components/Icon';
import s from './Home.module.css';

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export default function Home() {
  const nav = useNavigate();
  const [profile, setProfile] = useProfile();
  const [attempts] = useAttempts();
  const [name, setName] = useState('');
  const now = useNow();

  const active = attempts.filter((a) => !a.submittedAt).sort((a, b) => b.startedAt - a.startedAt);
  const done = attempts.filter((a) => a.submittedAt).sort((a, b) => b.submittedAt! - a.submittedAt!);
  const readingTests = done.filter((a): a is ReadingAttempt => a.skill === 'reading' && !!(a as ReadingAttempt).result);
  const last5 = readingTests.filter((a) => a.mode === 'test').slice(0, 5);
  const avg = last5.length ? last5.reduce((x, a) => x + a.result!.score, 0) / last5.length : null;
  const readDone = new Set(readingTests.map((a) => a.examId));
  const writeDone = new Set(done.filter((a) => a.skill === 'writing').map((a) => a.examId));
  const speakDone = new Set(done.filter((a) => a.skill === 'speaking').map((a) => a.examId));

  const nextOf = <T extends { id: string }>(list: T[], seen: Set<string>) => list.find((e) => !seen.has(e.id)) ?? pick(list);
  const hour = new Date(now).getHours();
  const greet = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="page">
      <section className={s.hero}>
        <div>
          <p className="eyebrow">{new Date(now).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className={s.greet}>{greet}{profile.name ? `, ${profile.name}` : ''}.</h1>
          <p className="lede">{TOTAL_EXAMS} đề VSTEP của Đại học Văn Lang ({RANGE_LABEL}), chạy offline trên máy bạn. Thi thử đúng giờ, xem lại từng câu, nghe lại bài nói.</p>
        </div>
        {!profile.name && (
          <form className={s.nameForm} onSubmit={(e) => { e.preventDefault(); if (name.trim()) setProfile({ ...profile, name: name.trim() }); }}>
            <label htmlFor="cand">Tên thí sinh hiển thị trong phòng thi</label>
            <div><input id="cand" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nguyễn Văn A" maxLength={40} />
              <button className="btn" type="submit">Lưu</button></div>
          </form>
        )}
      </section>

      {active.length > 0 && (
        <section className={s.resume} aria-label="Bài đang làm dở">
          {active.slice(0, 3).map((a) => {
            const dur = a.skill === 'reading' ? (a as ReadingAttempt).durationSec : a.skill === 'writing' ? (a as WritingAttempt).durationSec : null;
            const left = dur ? remainingSec(a.startedAt, dur, now) : null;
            return (
              <div key={a.id} className={s.resumeRow}>
                <span className={s.dot} aria-hidden="true" />
                <span><b>{attemptTitle(a)}</b> <span className="muted">· {modeLabel(a)} · bắt đầu {when(a.startedAt, now).toLowerCase()}</span></span>
                {left != null && <span className={'num ' + (left < 600 ? s.hot : 'muted')}>còn {clock(left)}</span>}
                <button className="btn btn-sm btn-primary" onClick={() => nav(attemptHref(a))}>Làm tiếp</button>
              </div>
            );
          })}
        </section>
      )}

      <section className={s.skills}>
        <div className={s.skill}>
          <div className={s.skillHead}><Icon name="book" size={18} /><h2>Reading</h2><span className="muted">{READING.length} đề</span></div>
          <p className={s.skillDesc}>4 bài đọc, 40 câu trắc nghiệm trong 60 phút. Có giải thích từng câu và luyện theo 9 dạng câu hỏi.</p>
          <dl className={s.stats}>
            <div><dt>Điểm TB 5 lần gần nhất</dt><dd className="num">{avg != null ? fmtScore(Math.round(avg * 4) / 4) : '—'}</dd></div>
            <div><dt>Đề đã làm</dt><dd className="num">{readDone.size}/{READING.length}</dd></div>
          </dl>
          <div className={s.acts}>
            <button className="btn btn-primary" onClick={() => nav(`/reading/${nextOf(READING, readDone).id}/test`)}>Thi thử đề mới</button>
            <Link className="btn btn-ghost" to="/reading">Chọn đề</Link>
          </div>
        </div>
        <div className={s.skill}>
          <div className={s.skillHead}><Icon name="pen" size={18} /><h2>Writing</h2><span className="muted">{WRITING.length} đề</span></div>
          <p className={s.skillDesc}>Thư/email ≥ 120 từ và bài luận ≥ 250 từ trong 60 phút. Đếm từ, tự lưu, hướng dẫn và tự chấm theo tiêu chí.</p>
          <dl className={s.stats}>
            <div><dt>Bài đã viết</dt><dd className="num">{done.filter((a) => a.skill === 'writing').length}</dd></div>
            <div><dt>Đề đã viết</dt><dd className="num">{writeDone.size}/{WRITING.length}</dd></div>
          </dl>
          <div className={s.acts}>
            <button className="btn btn-primary" onClick={() => nav(`/writing/${nextOf(WRITING, writeDone).id}/test`)}>Thi thử đề mới</button>
            <Link className="btn btn-ghost" to="/writing">Chọn đề</Link>
          </div>
        </div>
        <div className={s.skill}>
          <div className={s.skillHead}><Icon name="mic" size={18} /><h2>Speaking</h2><span className="muted">{SPEAKING.length} đề</span></div>
          <p className={s.skillDesc}>3 phần thi, khoảng 12 phút, có thời gian chuẩn bị. Ghi âm từng phần để nghe lại và tự đánh giá.</p>
          <dl className={s.stats}>
            <div><dt>Lần thi thử</dt><dd className="num">{done.filter((a) => a.skill === 'speaking').length}</dd></div>
            <div><dt>Đề đã nói</dt><dd className="num">{speakDone.size}/{SPEAKING.length}</dd></div>
          </dl>
          <div className={s.acts}>
            <button className="btn btn-primary" onClick={() => nav(`/speaking/${nextOf(SPEAKING, speakDone).id}/test`)}>Thi thử đề mới</button>
            <Link className="btn btn-ghost" to="/speaking">Xem đề</Link>
          </div>
        </div>
      </section>

      <div className={s.recentHead}>
        <h2 className="section-title" style={{ margin: 0 }}>Hoạt động gần đây</h2>
        {done.length > 0 && <Link to="/history" className={s.more}>Xem tất cả</Link>}
      </div>
      {done.length === 0 ? (
        <p className={s.empty}>Chưa có bài nào. Bắt đầu với một đề Reading thi thử: 60 phút, kết quả và giải thích có ngay sau khi nộp.</p>
      ) : (
        <div className={s.recent}>
          {done.slice(0, 8).map((a) => (
            <Link key={a.id} to={attemptHref(a)} className={s.recentRow}>
              <span className={s.skillTag}>{a.skill === 'reading' ? 'R' : a.skill === 'writing' ? 'W' : 'S'}</span>
              <span className={s.rt}>{attemptTitle(a)}<span className="muted"> · {modeLabel(a)}</span></span>
              <span className="num">{resultLabel(a)}</span>
              <span className="muted">{when(a.submittedAt!, now)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
