import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SOLUTIONS } from '../lib/solutions';
import { countWords } from '../lib/time';
import { Icon } from '../components/Icon';
import l from './List.module.css';
import s from './SolutionsList.module.css';

export default function SolutionsList() {
  const [q, setQ] = useState('');
  const rows = useMemo(() => SOLUTIONS.filter((x) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    const P = x.prompt;
    return [x.label, ...P.writing['1'].intro, ...P.writing['1'].quote, ...P.writing['2'].quote, P.speaking?.['2'].situation, P.speaking?.['3'].topic,
      ...(P.speaking?.['1'].topics.map((tp) => tp.title) ?? [])].join(' ').toLowerCase().includes(t);
  }), [q]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Writing + Speaking · mục tiêu 5–6 điểm</p>
          <h1 className="page-title">Bài mẫu</h1>
          <p className="lede">Bài giải tham khảo cho {SOLUTIONS.filter((x) => !x.custom).length} đề VLU (đề chép nguyên văn){SOLUTIONS.some((x) => x.custom) ? ` và ${SOLUTIONS.filter((x) => x.custom).length} đề tự tạo theo đề nhớ lại` : ''}: bài mẫu dễ học thuộc, số từ, khung dàn ý và từ vựng. Nên tự làm trước rồi mới xem.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" to="/bai-mau/khung"><Icon name="book" size={15} /> Khung mẫu để học thuộc</Link>
        <a className="btn" href="#/in/bai-mau/all" target="_blank" rel="noreferrer"><Icon name="download" size={15} /> Bản in toàn bộ</a>
        </div>
      </div>
      <div className={l.toolbar}>
        <label className={l.search}>
          <Icon name="search" size={15} />
          <input className="field" placeholder="Tìm chủ đề: smartphone, travel, family…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="muted">{rows.length} đề</span>
      </div>
      <div className={l.table}>
        {rows.map((x) => {
          const P = x.prompt, A = x.answer;
          const w1 = P.writing['1'].intro.slice(-1)[0]?.replace(/^You should spend about \d+ minutes on this task\.\s*/, '') ?? '';
          const w2 = P.writing['2'].quote.slice(-1)[0] ?? '';
          return (
            <Link key={x.id} to={`/bai-mau/${x.id}`} className={s.row}>
              <span className={l.code}>{x.label}</span>
              <span className={s.cells}>
                <span><b>W1</b>{w1}</span>
                <span><b>W2</b>{w2} <i>· {A.writing['2'].essay_type.split(' (')[0]}</i></span>
                {P.speaking ? <span><b>S3</b>{P.speaking['3'].topic}</span> : <span className="muted">Đề tự tạo theo đề thí sinh nhớ lại · chỉ Writing</span>}
              </span>
              <span className={s.wc}>
                <span className="num">{countWords(A.writing['1'].answer)} / {countWords(A.writing['2'].answer)} từ</span>
                <Icon name="right" size={15} />
              </span>
            </Link>
          );
        })}
        {rows.length === 0 && <p className={l.empty}>{SOLUTIONS.length ? 'Không tìm thấy đề phù hợp.' : 'Chưa có bài mẫu nào.'}</p>}
      </div>
    </div>
  );
}
