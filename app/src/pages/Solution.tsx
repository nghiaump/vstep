import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { SOLUTIONS, solutionById, speakTime, type OutlineRow, type Solution as Sol, type Vocab } from '../lib/solutions';
import { countWords } from '../lib/time';
import { Inline } from '../components/Markdown';
import { Icon } from '../components/Icon';
import s from './Solution.module.css';

const paras = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

function Quote({ lines }: { lines: string[] }) {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { out.push(<ul key={out.length}>{list.map((l, i) => <li key={i}><Inline text={l} /></li>)}</ul>); list = []; } };
  for (const l of lines) {
    if (l.startsWith('- ')) list.push(l.slice(2));
    else { flush(); out.push(<p key={out.length}><Inline text={l} /></p>); }
  }
  flush();
  return <blockquote className={s.quote}>{out}</blockquote>;
}

function Outline({ rows }: { rows: OutlineRow[] }) {
  return (
    <table className={s.table}>
      <thead><tr><th>Đoạn</th><th>Nội dung</th><th>Câu mẫu dùng lại</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td>{r.section}</td><td>{r.content}</td><td className={s.reuse}>{r.reusable}</td></tr>)}</tbody>
    </table>
  );
}
function VocabTable({ rows }: { rows: Vocab[] }) {
  return (
    <table className={s.table}>
      <thead><tr><th>Từ / cụm từ</th><th>Nghĩa</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td><b>{r.term}</b></td><td>{r.meaning}</td></tr>)}</tbody>
    </table>
  );
}

function Part({ id, title, kind, meta, prompt, children, count, outline, vocab }: {
  id: string; title: string; kind: string; meta: string; prompt: ReactNode; children: ReactNode; count: ReactNode; outline: OutlineRow[]; vocab: Vocab[];
}) {
  return (
    <section className={s.part} id={id}>
      <header className={s.partHead}>
        <h2>{title} <span>· {kind}</span></h2>
        <span className={s.meta}>{meta}</span>
      </header>
      <div className={s.step}><h3><i>1</i> Đề bài</h3><div className={s.paper}>{prompt}</div></div>
      <div className={s.step}><h3><i>2</i> Bài mẫu</h3><div className={s.answer}>{children}</div></div>
      <div className={s.step}><h3><i>3</i> Số từ</h3><p className={s.count}>{count}</p></div>
      <div className={s.step}><h3><i>4</i> Khung dàn ý</h3><Outline rows={outline} /></div>
      <div className={s.step}><h3><i>5</i> Từ vựng đáng học</h3><VocabTable rows={vocab} /></div>
    </section>
  );
}

export function SolutionBody({ sol }: { sol: Sol }) {
  const P = sol.prompt, A = sol.answer;
  const w = (['1', '2'] as const).map((k) => {
    const p = P.writing[k], a = A.writing[k], wc = countWords(a.answer);
    return (
      <Part key={k} id={`w${k}`} title={p.title} kind={p.kind} meta={`${p.time} · tối thiểu ${p.min_words} từ`}
        prompt={<>{p.intro.map((t, i) => <p key={i}>{t}</p>)}<Quote lines={p.quote} /><p className={s.instr}>{p.instruction}</p></>}
        count={<><b>{wc} từ</b> (đếm bằng công cụ) · {wc >= p.min_words ? 'đạt' : 'chưa đạt'} mức tối thiểu {p.min_words} từ</>}
        outline={a.outline} vocab={a.vocab}>
        {k === '2' && 'essay_type' in a && <p className={s.type}><b>Dạng đề:</b> {a.essay_type}</p>}
        {paras(a.answer).map((t, i) => <p key={i} className={s.ap}>{t.split('\n').map((l, j) => <span key={j}>{j > 0 && <br />}{l}</span>)}</p>)}
      </Part>
    );
  });
  const S = P.speaking, SA = A.speaking;
  const qs = S['1'].topics.flatMap((t) => t.questions);
  let qn = 0;
  const w1 = countWords(SA['1'].answers.join(' ')), w2 = countWords(SA['2'].answer), w3 = countWords(SA['3'].answer), wf = countWords(SA['3'].follow_ups.join(' '));
  return (
    <>
      {w}
      <Part id="s1" title={S['1'].title} kind={S['1'].name} meta={S['1'].time}
        prompt={S['1'].topics.map((t, i) => (
          <div key={i} className={s.topic}><p><b>{t.lead} {t.title}</b></p>
            <ol start={qn + 1}>{t.questions.map((q) => { qn++; return <li key={qn}>{q}</li>; })}</ol></div>
        ))}
        count={<><b>{w1} từ</b> · khoảng {speakTime(w1)} nói</>} outline={SA['1'].outline} vocab={SA['1'].vocab}>
        {qs.map((q, i) => <div key={i} className={s.qa}><p className={s.q}>{i + 1}. {q}</p><p>{SA['1'].answers[i]}</p></div>)}
      </Part>
      <Part id="s2" title={S['2'].title} kind={S['2'].name} meta={S['2'].time}
        prompt={<><p>{S['2'].situation}</p><p>You are considering the following options:</p>
          <ul>{S['2'].options.map((o, i) => <li key={i}>Option {i + 1}: {o}</li>)}</ul><p className={s.instr}>{S['2'].task}</p></>}
        count={<><b>{w2} từ</b> · khoảng {speakTime(w2)} nói</>} outline={SA['2'].outline} vocab={SA['2'].vocab}>
        <p className={s.type}><b>Lựa chọn:</b> Option {SA['2'].choice}: {S['2'].options[SA['2'].choice - 1]}</p>
        {paras(SA['2'].answer).map((t, i) => <p key={i} className={s.ap}>{t}</p>)}
      </Part>
      <Part id="s3" title={S['3'].title} kind={S['3'].name} meta={S['3'].time}
        prompt={<><p><b>Topic:</b> {S['3'].topic}</p>
          <div className={s.mind}><span className={s.center}>{S['3'].center}</span>{S['3'].ideas.map((x, i) => <span key={i}>{x}</span>)}{S['3'].own_ideas_slot && <span className={s.own}>[your own ideas]</span>}</div>
          <p><b>Follow-up questions</b></p><ol>{S['3'].follow_ups.map((q, i) => <li key={i}>{q}</li>)}</ol></>}
        count={<><b>Bài nói chính: {w3} từ</b> (khoảng {speakTime(w3)}) · follow-up: {wf} từ</>} outline={SA['3'].outline} vocab={SA['3'].vocab}>
        <p className={s.type}><b>Ý riêng (your own idea):</b> {SA['3'].own_idea}</p>
        {paras(SA['3'].answer).map((t, i) => <p key={i} className={s.ap}>{t}</p>)}
        <p className={s.fuHead}>Trả lời câu hỏi follow-up</p>
        {S['3'].follow_ups.map((q, i) => <div key={i} className={s.qa}><p className={s.q}>{i + 1}. {q}</p><p>{SA['3'].follow_ups[i]}</p></div>)}
      </Part>
    </>
  );
}

const TABS = [['w1', 'Writing 1'], ['w2', 'Writing 2'], ['s1', 'Speaking 1'], ['s2', 'Speaking 2'], ['s3', 'Speaking 3']];

export default function Solution() {
  const { examId = '' } = useParams();
  const { hash } = useLocation();
  const sol = solutionById[examId];
  useEffect(() => {
    if (hash) requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    else window.scrollTo(0, 0);
  }, [examId, hash]);
  if (!sol) return <Navigate to="/bai-mau" replace />;
  const i = SOLUTIONS.indexOf(sol);
  const newer = SOLUTIONS[i - 1], older = SOLUTIONS[i + 1];
  return (
    <div className={'page ' + s.page}>
      <div className="page-head">
        <div>
          <p className="eyebrow"><Link to="/bai-mau">Bài mẫu</Link> · mục tiêu 5–6 điểm</p>
          <h1 className="page-title">VLU {sol.number} · Bài giải tham khảo</h1>
          <p className="lede">Đề chép nguyên văn. Bài mẫu dùng câu ngắn, ngữ pháp an toàn, dễ học thuộc. Số từ đếm bằng công cụ.</p>
        </div>
        <div className={s.headActs}>
          {newer && <Link className="btn" to={`/bai-mau/${newer.id}`}><Icon name="left" size={15} /> VLU {newer.number}</Link>}
          {older && <Link className="btn" to={`/bai-mau/${older.id}`}>VLU {older.number} <Icon name="right" size={15} /></Link>}
          <button className="btn btn-primary" onClick={() => window.print()}><Icon name="download" size={15} /> In / lưu PDF</button>
        </div>
      </div>
      <nav className={s.tabs} aria-label="Các phần">
        {TABS.map(([id, label]) => <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }}>{label}</a>)}
        <span className={s.tabsLinks}>
          <Link to={`/writing/${sol.id}/test`}>Làm thử Writing</Link>
          <Link to={`/speaking/${sol.id}/test`}>Thi thử Speaking</Link>
        </span>
      </nav>
      <SolutionBody sol={sol} />
    </div>
  );
}
