import { useEffect, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LINKERS, TEMPLATES, TEMPLATE_INTRO, type Template } from '../lib/templates';
import s from './Templates.module.css';

/** "[Name]" → highlighted blank the learner fills in; everything else is memorised as is. */
function Frame({ text }: { text: string }) {
  const out: ReactNode[] = text.split(/(\[[^\]]+\])/).map((p, i) => (p.startsWith('[') ? <mark key={i}>{p}</mark> : p));
  return <li className={s.frame}>{out}</li>;
}

function Card({ t, active }: { t: Template; active: boolean }) {
  return (
    <section id={t.key} className={s.card + (active ? ' ' + s.active : '')}>
      <header className={s.head}>
        <span className={s.part}>{t.part}</span>
        <h2>{t.name}</h2>
        <span className={s.len}>{t.length}</span>
      </header>
      <p className={s.when}><b>Khi nào dùng:</b> {t.when}</p>
      <ol className={s.steps}>
        {t.structure.map((st, i) => (
          <li key={i}>
            <div className={s.stepHead}><b>{st.section}</b><span>{st.how}</span></div>
            <ul className={s.frames}>{st.frames.map((f, j) => <Frame key={j} text={f} />)}</ul>
          </li>
        ))}
      </ol>
      {t.avoid.length > 0 && <p className={s.avoid}><b>Tránh:</b> {t.avoid.join(' · ')}</p>}
    </section>
  );
}

const GROUPS: [string, string][] = [['W1', 'Writing Part 1 · Thư'], ['W2', 'Writing Part 2 · Bài luận'], ['S1', 'Speaking'], ['S2', ''], ['S3', '']];

export default function Templates() {
  const [params] = useSearchParams();
  const k = params.get('k');
  useEffect(() => {
    if (k) requestAnimationFrame(() => document.getElementById(k)?.scrollIntoView({ block: 'start' }));
    else window.scrollTo(0, 0);
  }, [k]);
  return (
    <div className={'page ' + s.page}>
      <div className="page-head">
        <div>
          <p className="eyebrow"><Link to="/bai-mau">Bài mẫu</Link> · học thuộc trước khi luyện đề</p>
          <h1 className="page-title">Khung mẫu</h1>
          <p className="lede">{TEMPLATE_INTRO}</p>
        </div>
      </div>
      <nav className={s.toc} aria-label="Các khung">
        {TEMPLATES.map((t) => <a key={t.key} href={`#/bai-mau/khung?k=${t.key}`} className={k === t.key ? s.on : undefined}>{t.part} · {t.name.split(':')[0]}</a>)}
      </nav>
      <section className={s.linkers}>
        <h2>Từ nối dùng luân phiên</h2>
        <dl>{Object.entries(LINKERS).map(([g, xs]) => <div key={g}><dt>{g}</dt><dd>{xs.join(' · ')}</dd></div>)}</dl>
      </section>
      {GROUPS.map(([part, title]) => (
        <div key={part}>
          {title && <h2 className={s.group}>{title}</h2>}
          {TEMPLATES.filter((t) => t.part === part).map((t) => <Card key={t.key} t={t} active={k === t.key} />)}
        </div>
      ))}
    </div>
  );
}
