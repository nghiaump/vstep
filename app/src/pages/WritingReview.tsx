import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { writingById, examLabel } from '../lib/data';
import { getAttempt, saveAttempt, useAttempts } from '../lib/storage';
import { cefr, fmtScore, taskScore, writingOverall } from '../lib/scoring';
import { countParagraphs, countWords, duration, elapsedSec, when } from '../lib/time';
import type { WritingAttempt, WritingCriteria } from '../lib/types';
import { Markdown } from '../components/Markdown';
import { Icon } from '../components/Icon';
import { hasSolution } from '../lib/solutions';
import s from './WritingReview.module.css';

const CRITERIA: { key: keyof WritingCriteria; name: string; desc: string }[] = [
  { key: 'tf', name: 'Task Fulfilment', desc: 'Trả lời đủ các ý đề yêu cầu, đúng mục đích, giọng văn phù hợp, đủ số từ.' },
  { key: 'org', name: 'Organization', desc: 'Bố cục rõ ràng (mở – thân – kết), chia đoạn hợp lý, dùng từ nối mạch lạc.' },
  { key: 'voc', name: 'Vocabulary', desc: 'Từ vựng đa dạng, chính xác, đúng ngữ cảnh; ít lặp từ, ít lỗi chính tả.' },
  { key: 'gram', name: 'Grammar', desc: 'Cấu trúc câu đa dạng (câu phức, mệnh đề), chính xác; ít lỗi ngữ pháp.' },
];
const EMPTY: WritingCriteria = { tf: 5, org: 5, voc: 5, gram: 5 };

function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function WritingReview() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const [attempts] = useAttempts();
  const att = attempts.find((a) => a.id === attemptId) as WritingAttempt | undefined;
  if (!att || att.skill !== 'writing' || !att.submittedAt) return <Navigate to="/writing" replace />;
  const exam = writingById[att.examId];
  if (!exam) return <Navigate to="/writing" replace />;
  const order = att.mode === 'test' ? [1, 2] : att.mode === 'task1' ? [1] : [2];

  const setScore = (task: number, key: keyof WritingCriteria, v: number) => {
    const cur = getAttempt<WritingAttempt>(att.id) ?? att;
    const prev = cur.selfScores?.[task] ?? EMPTY;
    saveAttempt({ ...cur, selfScores: { ...cur.selfScores, [task]: { ...prev, [key]: v } } });
  };
  const t1 = taskScore(att.selfScores?.[1]);
  const t2 = taskScore(att.selfScores?.[2]);
  const overall = att.mode === 'test' ? writingOverall(t1, t2) : null;

  const exportMd = () => {
    const md = [`# ${exam.title} · Writing`, `_${new Date(att.submittedAt!).toLocaleString('vi-VN')}_`, ''];
    for (const t of order) {
      const task = exam.tasks.find((x) => x.task === t)!;
      md.push(`## Task ${t}`, '', '### Đề bài', task.prompt.replace(/\*\*/g, ''), '', `### Bài viết (${countWords(att.texts[t] ?? '')} từ)`, att.texts[t] ?? '', '');
    }
    download(`${exam.id}-writing.md`, md.join('\n'));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Bài viết · {att.mode === 'test' ? 'Thi thử' : `Task ${order[0]}`} · {when(att.submittedAt)} · {duration(elapsedSec(att.startedAt, att.submittedAt))}{att.autoSubmitted ? ' (hết giờ)' : ''}</p>
          <h1 className="page-title">{examLabel(exam.id)} · Writing</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={exportMd}><Icon name="download" size={15} /> Tải bài (.md)</button>
          {hasSolution(exam.id) && <Link className="btn" to={`/bai-mau/${exam.id}`}>So với bài mẫu</Link>}
          <Link className="btn" to="/writing">Danh sách đề</Link>
          <button className="btn btn-primary" onClick={() => nav(`/writing/${exam.id}/${att.mode}`)}>Viết lại</button>
        </div>
      </div>

      {overall != null && (
        <div className={s.overall}>
          <span>Điểm tự chấm</span>
          <b className="num">{fmtScore(overall)}</b><span className="muted">/ 10 · ước lượng {cefr(overall)} · (Task 1 + 2 × Task 2) / 3</span>
        </div>
      )}

      {order.map((t) => {
        const task = exam.tasks.find((x) => x.task === t)!;
        const text = att.texts[t] ?? '';
        const n = countWords(text);
        const sc = att.selfScores?.[t];
        const ts = taskScore(sc);
        return (
          <section key={t} className={s.task}>
            <header className={s.taskHead}>
              <h2>Task {t} <span className="muted">· {task.kind === 'Essay' ? 'Essay' : 'Email / Letter'}</span></h2>
              <span className={n >= task.minWords ? 'tag tag-ok' : 'tag tag-bad'}>{n} / {task.minWords} từ</span>
              <span className="tag">{countParagraphs(text)} đoạn</span>
            </header>
            <div className={s.cols}>
              <div>
                <details className={s.prompt}>
                  <summary>Đề bài</summary>
                  <Markdown source={task.prompt} />
                </details>
                <article className={s.essay}>
                  {text.trim() ? text.split(/\n+/).map((p, i) => <p key={i}>{p}</p>) : <p className="muted">Bạn chưa viết gì cho task này.</p>}
                </article>
              </div>
              <aside className={s.rubric}>
                <h3>Tự chấm <span className="muted">· thang 10</span></h3>
                {CRITERIA.map((c) => {
                  const v = (sc ?? EMPTY)[c.key];
                  return (
                    <label key={c.key} className={s.crit}>
                      <span className={s.critTop}><b>{c.name}</b><span className="num">{sc ? fmtScore(v) : '–'}</span></span>
                      <input type="range" min={0} max={10} step={0.5} value={v} onChange={(e) => setScore(t, c.key, Number(e.target.value))} />
                      <span className={s.critDesc}>{c.desc}</span>
                    </label>
                  );
                })}
                <div className={s.taskScore}><span>Điểm Task {t}</span><b className="num">{ts != null ? fmtScore(ts) : '–'}</b></div>
              </aside>
            </div>
            {task.guide && (
              <details className={s.guide}>
                <summary>Hướng dẫn làm bài: phân tích đề, dàn ý, từ vựng, lỗi thường gặp</summary>
                <Markdown source={task.guide} />
              </details>
            )}
          </section>
        );
      })}
      <p className={s.source}>Nguồn đề: <a href={exam.source} target="_blank" rel="noreferrer">vstepowl.com</a></p>
    </div>
  );
}
