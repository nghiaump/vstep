import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { SPEAKING, speakingById, examLabel } from '../lib/data';
import { PART_META, PartBody } from '../components/SpeakingParts';
import { Icon } from '../components/Icon';
import { Markdown } from '../components/Markdown';
import { hasSolution } from '../lib/solutions';
import s from './SpeakingView.module.css';

export default function SpeakingView() {
  const { examId = '' } = useParams();
  const nav = useNavigate();
  const exam = speakingById[examId];
  if (!exam) return <Navigate to="/speaking" replace />;
  const i = SPEAKING.indexOf(exam);
  const newer = SPEAKING[i - 1];
  const older = SPEAKING[i + 1];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow"><Link to="/speaking">Speaking</Link> · Xem đề</p>
          <h1 className="page-title">{examLabel(exam.id)} · Speaking</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" disabled={!newer} onClick={() => nav(`/speaking/${newer.id}`)}><Icon name="left" size={15} /> Đề mới hơn</button>
          <button className="btn" disabled={!older} onClick={() => nav(`/speaking/${older.id}`)}>Đề cũ hơn <Icon name="right" size={15} /></button>
          {hasSolution(exam.id) && <Link className="btn" to={`/bai-mau/${exam.id}#s1`}>Bài mẫu</Link>}
          <button className="btn btn-primary" onClick={() => nav(`/speaking/${exam.id}/test`)}><Icon name="mic" size={15} /> Thi thử đề này</button>
        </div>
      </div>
      {([1, 2, 3] as const).map((p) => {
        const m = PART_META[p];
        return (
          <section key={p} className={s.part}>
            <header className={s.head}>
              <span className={s.pn}>Part {p}</span>
              <h2>{m.name} <span className="muted">· {m.vi}</span></h2>
              <span className={s.time}>{m.prep ? `${m.prep / 60}′ chuẩn bị · ` : ''}{m.speak / 60}′ nói</span>
            </header>
            <div className={s.body}><PartBody exam={exam} part={p} /></div>
            {exam.guides[p - 1] && (
              <details className={s.guide}>
                <summary>Gợi ý trả lời Part {p}: phân tích đề, bố cục, từ vựng, câu mẫu</summary>
                <Markdown source={exam.guides[p - 1]} />
              </details>
            )}
          </section>
        );
      })}
      <p className={s.source}>Nguồn đề: <a href={exam.source} target="_blank" rel="noreferrer">vstepowl.com</a></p>
    </div>
  );
}
