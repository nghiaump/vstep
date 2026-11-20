import type { SpeakingExam } from '../lib/types';
import s from './SpeakingParts.module.css';

export const PART_META = {
  1: { name: 'Social Interaction', vi: 'Tương tác xã hội', prep: 0, speak: 180 },
  2: { name: 'Solution Discussion', vi: 'Thảo luận giải pháp', prep: 60, speak: 180 },
  3: { name: 'Topic Development', vi: 'Phát triển chủ đề', prep: 60, speak: 240 },
} as const;

export function Part1({ exam }: { exam: SpeakingExam }) {
  let n = 0;
  return (
    <div className={s.p1}>
      {exam.part1.topics.map((t, i) => (
        <div key={i} className={s.topic}>
          <h3 className={s.topicHead}><span className={s.lead}>{t.lead}</span> {t.title}</h3>
          <ol className={s.qs} start={n + 1}>
            {t.questions.map((q) => { n++; return <li key={n}>{q}</li>; })}
          </ol>
        </div>
      ))}
    </div>
  );
}

export function Part2({ exam }: { exam: SpeakingExam }) {
  const p = exam.part2;
  return (
    <div className={s.p2}>
      <p className={s.situation}>{p.situation}</p>
      <p className={s.consider}>You are considering the following options:</p>
      <ol className={s.options}>
        {p.options.map((o, i) => <li key={i}><span className={s.optN}>Option {i + 1}</span><span>{o}</span></li>)}
      </ol>
      <p className={s.task}>{p.task}</p>
    </div>
  );
}

export function Part3({ exam }: { exam: SpeakingExam }) {
  const p = exam.part3;
  const ideas = p.ideas;
  return (
    <div className={s.p3}>
      <p className={s.p3topic}>{p.topic}</p>
      <div className={s.mind} aria-label="Sơ đồ ý tưởng">
        <div className={s.center}>{p.center}</div>
        {ideas.map((idea, i) => (
          <div key={i} className={`${s.node} ${s['n' + i] ?? ''} ${/your own/i.test(idea) ? s.own : ''}`}>{idea}</div>
        ))}
      </div>
      {p.followUps.length > 0 && (<>
        <h3 className={s.fuHead}>Follow-up questions</h3>
        <ol className={s.qs}>{p.followUps.map((q, i) => <li key={i}>{q}</li>)}</ol>
      </>)}
    </div>
  );
}

export function PartBody({ exam, part }: { exam: SpeakingExam; part: 1 | 2 | 3 }) {
  return part === 1 ? <Part1 exam={exam} /> : part === 2 ? <Part2 exam={exam} /> : <Part3 exam={exam} />;
}
