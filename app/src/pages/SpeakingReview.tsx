import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { speakingById, examLabel } from '../lib/data';
import { getAttempt, saveAttempt, useAttempts } from '../lib/storage';
import { extFor, loadAudio } from '../lib/audio';
import { cefr, fmtScore, roundHalf } from '../lib/scoring';
import { when } from '../lib/time';
import type { SpeakingAttempt, SpeakingCriteria } from '../lib/types';
import { PART_META, PartBody } from '../components/SpeakingParts';
import { Icon } from '../components/Icon';
import { Markdown } from '../components/Markdown';
import { hasSolution } from '../lib/solutions';
import s from './SpeakingReview.module.css';

const CRIT: { key: keyof SpeakingCriteria; name: string; desc: string }[] = [
  { key: 'fluency', name: 'Fluency & Coherence', desc: 'Nói trôi chảy, ít ngập ngừng; ý mạch lạc, có liên kết.' },
  { key: 'pron', name: 'Pronunciation', desc: 'Phát âm rõ, đúng trọng âm và ngữ điệu; người nghe dễ hiểu.' },
  { key: 'voc', name: 'Vocabulary', desc: 'Từ vựng phong phú, đúng ngữ cảnh, có diễn đạt tự nhiên.' },
  { key: 'gram', name: 'Grammar', desc: 'Cấu trúc đa dạng, chính xác; lỗi không gây khó hiểu.' },
];
const DEFAULT: SpeakingCriteria = { fluency: 5, pron: 5, voc: 5, gram: 5 };

function Recording({ attemptId, part }: { attemptId: string; part: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState('audio/webm');
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let u: string | null = null;
    loadAudio(attemptId, part).then((b) => {
      if (!b) return setMissing(true);
      u = URL.createObjectURL(b);
      setMime(b.type);
      setUrl(u);
    }).catch(() => setMissing(true));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [attemptId, part]);
  if (missing) return <p className={s.noAudio}>Không có bản ghi cho phần này.</p>;
  if (!url) return <p className={s.noAudio}>Đang tải bản ghi…</p>;
  return (
    <div className={s.player}>
      <audio controls src={url} preload="metadata" />
      <a className="btn btn-sm" href={url} download={`${attemptId}-part${part}.${extFor(mime)}`}><Icon name="download" size={14} /> Tải</a>
    </div>
  );
}

export default function SpeakingReview() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const [attempts] = useAttempts();
  const att = attempts.find((a) => a.id === attemptId) as SpeakingAttempt | undefined;
  if (!att || att.skill !== 'speaking') return <Navigate to="/speaking" replace />;
  const exam = speakingById[att.examId];
  if (!exam) return <Navigate to="/speaking" replace />;
  const sc = att.selfScore;
  const avg = sc ? roundHalf((sc.fluency + sc.pron + sc.voc + sc.gram) / 4) : null;
  const set = (k: keyof SpeakingCriteria, v: number) => {
    const cur = getAttempt<SpeakingAttempt>(att.id) ?? att;
    saveAttempt({ ...cur, selfScore: { ...(cur.selfScore ?? DEFAULT), [k]: v } });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Bài nói · {att.submittedAt ? when(att.submittedAt) : 'chưa hoàn thành'}</p>
          <h1 className="page-title">{examLabel(exam.id)} · Speaking</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="btn" to="/speaking">Danh sách đề</Link>
          {hasSolution(exam.id) && <Link className="btn" to={`/bai-mau/${exam.id}`}>Bài mẫu</Link>}
          <button className="btn btn-primary" onClick={() => nav(`/speaking/${exam.id}/test`)}><Icon name="mic" size={15} /> Thi lại</button>
        </div>
      </div>

      <div className={s.layout}>
        <div>
          {([1, 2, 3] as const).map((p) => (
            <section key={p} className={s.part}>
              <header className={s.head}>
                <span className={s.pn}>Part {p}</span>
                <h2>{PART_META[p].name}</h2>
              </header>
              <div className={s.audio}>
                {att.recorded.includes(p) ? <Recording attemptId={att.id} part={p} /> : <p className={s.noAudio}>Bạn chưa làm phần này.</p>}
              </div>
              <details className={s.prompt}>
                <summary>Xem lại đề Part {p}</summary>
                <div className={s.promptBody}><PartBody exam={exam} part={p} /></div>
              </details>
              {exam.guides[p - 1] && (
                <details className={s.prompt}>
                  <summary>Gợi ý trả lời Part {p}</summary>
                  <div className={s.promptBody}><Markdown source={exam.guides[p - 1]} /></div>
                </details>
              )}
            </section>
          ))}
        </div>
        <aside className={s.rubric}>
          <h3>Tự chấm <span className="muted">· thang 10</span></h3>
          <p className={s.hint}>Nghe lại từng phần rồi đánh giá trung thực theo 4 tiêu chí của VSTEP.</p>
          {CRIT.map((c) => (
            <label key={c.key} className={s.crit}>
              <span className={s.critTop}><b>{c.name}</b><span className="num">{sc ? fmtScore(sc[c.key]) : '–'}</span></span>
              <input type="range" min={0} max={10} step={0.5} value={(sc ?? DEFAULT)[c.key]} onChange={(e) => set(c.key, Number(e.target.value))} />
              <span className={s.critDesc}>{c.desc}</span>
            </label>
          ))}
          <div className={s.total}><span>Điểm ước lượng</span><b className="num">{avg != null ? fmtScore(avg) : '–'}</b></div>
          {avg != null && <p className={s.hint}>Tương đương khoảng {cefr(avg)}.</p>}
        </aside>
      </div>
    </div>
  );
}
