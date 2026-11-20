import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { SOLUTIONS, solutionById } from '../lib/solutions';
import { SolutionBody } from './Solution';
import s from './PrintSolutions.module.css';

/** Chrome-free document used for printing / PDF export: #/in/bai-mau/:examId or #/in/bai-mau/all */
export default function PrintSolutions() {
  const { examId = '' } = useParams();
  const list = examId === 'all' ? SOLUTIONS : solutionById[examId] ? [solutionById[examId]] : [];
  useEffect(() => {
    document.documentElement.dataset.print = '1';
    const prev = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = 'light';
    return () => { delete document.documentElement.dataset.print; if (prev) document.documentElement.dataset.theme = prev; else delete document.documentElement.dataset.theme; };
  }, []);
  const nums = list.filter((x) => !x.custom).map((x) => x.number);
  if (!list.length) return <Navigate to="/bai-mau" replace />;
  return (
    <div className={s.doc}>
      {list.length > 1 && (
        <section className={s.cover}>
          <p className={s.kicker}>VSTEP · Đề Văn Lang</p>
          <h1>Bài giải tham khảo Writing &amp; Speaking</h1>
          <p className={s.sub}>VLU {Math.min(...nums)}–{Math.max(...nums)}{list.length > nums.length ? ' + đề tự tạo' : ''} · {list.length} đề · mục tiêu 5–6 điểm</p>
          <ol className={s.toc}>{list.map((x) => <li key={x.id}>{x.label}: {x.prompt.writing['2'].quote.slice(-1)[0]}</li>)}</ol>
        </section>
      )}
      {list.map((x) => (
        <article key={x.id} className={s.exam}>
          <header className={s.examHead}><span>{x.label}</span><span>Bài giải tham khảo · mục tiêu 5–6 điểm</span></header>
          <SolutionBody sol={x} />
        </article>
      ))}
    </div>
  );
}
