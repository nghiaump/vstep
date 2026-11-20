import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { readingById, examLabel } from '../lib/data';
import { findActive, getAttempt, newId, removeAttempt, saveAttempt, useAttempts, useProfile, useUi } from '../lib/storage';
import { scoreReading } from '../lib/scoring';
import { elapsedSec, remainingSec } from '../lib/time';
import type { Choice, ReadingAttempt, ReadingExam } from '../lib/types';
import { useNow } from '../hooks/useNow';
import { useHotkeys } from '../hooks/useHotkeys';
import { useMedia } from '../hooks/useMedia';
import { ExamBar } from '../components/ExamBar';
import { SplitPane } from '../components/SplitPane';
import { Passage } from '../components/Passage';
import { QuestionBlock } from '../components/QuestionBlock';
import { Palette } from '../components/Palette';
import { Dialog } from '../components/Dialog';
import { Markdown } from '../components/Markdown';
import { Icon } from '../components/Icon';
import s from './ReadingTest.module.css';

const TEST_SECONDS = 60 * 60;
type Mode = 'test' | 'practice';

export default function ReadingTest() {
  const { examId = '', mode = '' } = useParams();
  const exam = readingById[examId];
  const [attempts] = useAttempts();
  const [attemptId, setAttemptId] = useState(() =>
    findActive<ReadingAttempt>((a) => a.skill === 'reading' && a.examId === examId && (a as ReadingAttempt).mode === mode)?.id);
  if (!exam || (mode !== 'test' && mode !== 'practice')) return <Navigate to="/reading" replace />;
  const att = attempts.find((a) => a.id === attemptId) as ReadingAttempt | undefined;
  if (!att || att.submittedAt) {
    return <Intro exam={exam} mode={mode} onStart={() => {
      const a: ReadingAttempt = {
        id: newId(), skill: 'reading', examId, mode, startedAt: Date.now(), durationSec: mode === 'test' ? TEST_SECONDS : null,
        answers: {}, flags: [], highlights: {}, checkedParts: [], cursor: { part: 1, question: exam.parts[0].questions[0].number },
      };
      saveAttempt(a);
      setAttemptId(a.id);
    }} />;
  }
  return <Room key={att.id} exam={exam} att={att} mode={mode} />;
}

/* ----------------------------------------------------------------------------------------------- */

function Intro({ exam, mode, onStart }: { exam: ReadingExam; mode: Mode; onStart: () => void }) {
  const nav = useNavigate();
  const [profile, setProfile] = useProfile();
  const [name, setName] = useState(profile.name);
  const start = () => { if (name.trim() !== profile.name) setProfile({ ...profile, name: name.trim() }); onStart(); };
  return (
    <div className={s.room}>
      <ExamBar skill="Reading" exam={examLabel(exam.id)} sub={mode === 'test' ? 'Thi thử' : 'Luyện tập'} onExit={() => nav('/reading')} />
      <div className={s.introWrap}>
        <div className={s.intro}>
          <p className="eyebrow">{mode === 'test' ? 'Thi thử · đúng định dạng VSTEP' : 'Luyện tập · không giới hạn thời gian'}</p>
          <h1 className={s.introTitle}>{exam.title} · Đọc hiểu</h1>
          <ol className={s.passages}>
            {exam.parts.map((p) => (
              <li key={p.part}><span className="num">Passage {p.part}</span>{p.title}</li>
            ))}
          </ol>
          <div className={s.rules}>
            <div><b className="num">60</b><span>phút</span></div>
            <div><b className="num">4</b><span>bài đọc</span></div>
            <div><b className="num">40</b><span>câu hỏi</span></div>
            <div><b className="num">0,25</b><span>điểm / câu</span></div>
          </div>
          <ul className={s.notes}>
            {mode === 'test' ? (<>
              <li>Đồng hồ bắt đầu khi bấm <b>Bắt đầu làm bài</b> và <b>vẫn chạy</b> nếu bạn rời trang. Hết giờ, bài được nộp tự động.</li>
              <li>Có thể chuyển qua lại giữa các bài đọc và sửa đáp án bất cứ lúc nào trước khi nộp. Sai không bị trừ điểm.</li>
              <li>Đáp án và giải thích chỉ hiện sau khi nộp bài.</li>
            </>) : (<>
              <li>Đồng hồ chỉ đếm thời gian đã làm để bạn tự theo dõi.</li>
              <li>Làm xong một bài đọc, bấm <b>Kiểm tra passage</b> để xem đáp án, giải thích và gợi ý chiến thuật.</li>
            </>)}
            <li>Bôi đen một đoạn trong bài đọc để <b>tô sáng</b>; bấm vào chỗ đã tô để bỏ.</li>
            <li>Phím tắt: <kbd>A</kbd>–<kbd>D</kbd> chọn đáp án · <kbd>J</kbd>/<kbd>K</kbd> câu sau/trước · <kbd>F</kbd> đánh dấu · <kbd>[</kbd> <kbd>]</kbd> đổi bài đọc · <kbd>?</kbd> xem tất cả</li>
          </ul>
          <div className={s.startRow}>
            <label className={s.nameField}>
              <span>Tên thí sinh</span>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên (tuỳ chọn)" maxLength={40} />
            </label>
            <button className="btn btn-primary btn-lg" onClick={start} autoFocus>Bắt đầu làm bài</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------------- */

function Room({ exam, att, mode }: { exam: ReadingExam; att: ReadingAttempt; mode: Mode }) {
  const nav = useNavigate();
  const [ui, setUi] = useUi();
  const [dialog, setDialog] = useState<null | 'submit' | 'exit' | 'keys'>(null);
  const [mobileView, setMobileView] = useState<'passage' | 'questions'>('passage');
  const [notice, setNotice] = useState<string | null>(null);
  const shown = useRef<Set<number>>(new Set());
  const qRefs = useRef<Record<number, HTMLElement | null>>({});
  const rightPane = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);

  const narrow = useMedia('(max-width: 900px)');
  const now = useNow();
  const remaining = att.durationSec ? remainingSec(att.startedAt, att.durationSec, now) : null;
  const elapsed = elapsedSec(att.startedAt, now);

  const update = (patch: Partial<ReadingAttempt>) => {
    const cur = getAttempt<ReadingAttempt>(att.id) ?? att;
    saveAttempt({ ...cur, ...patch });
  };

  const part = exam.parts.find((p) => p.part === att.cursor.part) ?? exam.parts[0];
  const allQs = exam.parts.flatMap((p) => p.questions.map((q) => ({ part: p.part, q })));
  const curIdx = Math.max(0, allQs.findIndex((x) => x.q.number === att.cursor.question));
  const checked = (p: number) => att.checkedParts.includes(p);

  const submit = (auto = false) => {
    if (submitting.current) return;
    submitting.current = true;
    const latest = getAttempt<ReadingAttempt>(att.id) ?? att;
    saveAttempt({ ...latest, submittedAt: Date.now(), result: scoreReading(exam, latest.answers), autoSubmitted: auto || undefined });
    nav(`/reading/result/${att.id}`, { replace: true });
  };

  // Auto-submit when time is up (also covers re-opening an expired attempt).
  useEffect(() => { if (mode === 'test' && remaining === 0) submit(true); });

  // 10- and 5-minute warnings.
  useEffect(() => {
    if (remaining == null) return;
    // Fire once per threshold even if the clock jumped past it (sleep, background-tab throttling).
    const m = remaining <= 300 ? 5 : remaining <= 600 ? 10 : 0;
    if (m && remaining > 0 && !shown.current.has(m)) {
      shown.current.add(m);
      if (m === 5) shown.current.add(10);
      setNotice(`Còn ${Math.max(1, Math.ceil(remaining / 60))} phút. Hãy kiểm tra lại các câu chưa làm và các câu đã đánh dấu.`);
      setTimeout(() => setNotice(null), 8000);
    }
  }, [remaining]);

  const go = (partNum: number, qNum: number, scroll = true) => {
    update({ cursor: { part: partNum, question: qNum } });
    setMobileView('questions');
    if (scroll) requestAnimationFrame(() => qRefs.current[qNum]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  const step = (d: number) => {
    const n = allQs[Math.min(allQs.length - 1, Math.max(0, curIdx + d))];
    go(n.part, n.q.number);
  };
  const stepPart = (d: number) => {
    const p = exam.parts[Math.min(exam.parts.length - 1, Math.max(0, exam.parts.indexOf(part) + d))];
    update({ cursor: { part: p.part, question: p.questions[0].number } });
    rightPane.current?.parentElement?.scrollTo({ top: 0 });
  };
  const choose = (qNum: number, c: Choice) => {
    const pNum = allQs.find((x) => x.q.number === qNum)!.part;
    if (checked(pNum)) return;
    const latest = getAttempt<ReadingAttempt>(att.id) ?? att;
    saveAttempt({ ...latest, answers: { ...latest.answers, [qNum]: c }, cursor: { part: pNum, question: qNum } });
  };
  const toggleFlag = (qNum: number) => {
    const latest = getAttempt<ReadingAttempt>(att.id) ?? att;
    update({ flags: latest.flags.includes(qNum) ? latest.flags.filter((x) => x !== qNum) : [...latest.flags, qNum] });
  };

  useHotkeys({
    a: () => choose(att.cursor.question, 'A'), b: () => choose(att.cursor.question, 'B'),
    c: () => choose(att.cursor.question, 'C'), d: () => choose(att.cursor.question, 'D'),
    j: () => step(1), k: () => step(-1), ArrowDown: () => step(1), ArrowUp: () => step(-1),
    f: () => toggleFlag(att.cursor.question), '[': () => stepPart(-1), ']': () => stepPart(1),
    '?': () => setDialog('keys'),
  }, dialog === null);

  const answered = Object.keys(att.answers).length;
  const unanswered = 40 - answered;
  const partIdx = exam.parts.indexOf(part);

  const passagePane = (
    <Passage part={part} marks={att.highlights[part.part] ?? []}
      onMarks={(m) => update({ highlights: { ...(getAttempt<ReadingAttempt>(att.id) ?? att).highlights, [part.part]: m } })} />
  );
  const questionPane = (
    <div ref={rightPane} className={s.qpane}>
      <div className={s.qhead}>
        <div>
          <span className={s.qlabel}>Câu {part.questions[0].number}–{part.questions[part.questions.length - 1].number}</span>
          <span className={s.qhint}>Chọn đáp án đúng nhất (A, B, C hoặc D)</span>
        </div>
        {mode === 'practice' && !checked(part.part) && (
          <button className="btn btn-sm" onClick={() => update({ checkedParts: [...att.checkedParts, part.part] })}>
            <Icon name="check" size={14} /> Kiểm tra passage {part.part}
          </button>
        )}
        {mode === 'practice' && checked(part.part) && (
          <span className={s.partScore}>
            {part.questions.filter((q) => att.answers[q.number] === q.answer).length}/{part.questions.length} đúng
          </span>
        )}
      </div>
      {part.questions.map((q) => (
        <QuestionBlock key={q.number} ref={(el) => { qRefs.current[q.number] = el; }} q={q}
          value={att.answers[q.number]} onChange={(c) => choose(q.number, c)}
          flagged={att.flags.includes(q.number)} onFlag={() => toggleFlag(q.number)}
          active={att.cursor.question === q.number}
          onFocusQ={() => att.cursor.question !== q.number && update({ cursor: { part: part.part, question: q.number } })}
          reveal={mode === 'practice' && checked(part.part)} />
      ))}
      {mode === 'practice' && checked(part.part) && part.tips && (
        <details className={s.tips}>
          <summary>Gợi ý chiến thuật cho passage {part.part}</summary>
          <Markdown source={part.tips} />
        </details>
      )}
      <div className={s.qfoot}>
        <button className="btn" disabled={partIdx === 0} onClick={() => stepPart(-1)}><Icon name="left" size={15} /> Passage {part.part - 1 || ''}</button>
        {partIdx < exam.parts.length - 1
          ? <button className="btn" onClick={() => stepPart(1)}>Passage {part.part + 1} <Icon name="right" size={15} /></button>
          : <button className="btn btn-primary" onClick={() => setDialog('submit')}>{mode === 'test' ? 'Nộp bài' : 'Kết thúc'}</button>}
      </div>
    </div>
  );

  return (
    <div className={s.room}>
      <ExamBar skill="Reading" exam={examLabel(exam.id)} sub={mode === 'test' ? 'Thi thử' : 'Luyện tập'}
        seconds={remaining ?? elapsed} countdown={mode === 'test'} onExit={() => setDialog('exit')}>
        <button className="btn btn-sm" onClick={() => setDialog('keys')} title="Phím tắt (?)"><Icon name="keyboard" size={15} /></button>
        <button className="btn btn-sm btn-primary" onClick={() => setDialog('submit')}>{mode === 'test' ? 'Nộp bài' : 'Kết thúc'}</button>
      </ExamBar>

      {notice && <div className={s.notice} role="status"><Icon name="clock" size={15} />{notice}<button onClick={() => setNotice(null)} aria-label="Đóng"><Icon name="x" size={14} /></button></div>}

      <div className={s.mobileTabs}>
        <div className="seg">
          <button aria-pressed={mobileView === 'passage'} onClick={() => setMobileView('passage')}>Bài đọc</button>
          <button aria-pressed={mobileView === 'questions'} onClick={() => setMobileView('questions')}>Câu hỏi</button>
        </div>
      </div>

      <div className={clsx(s.work, s['show-' + mobileView])}>
        {narrow
          ? <div className={s.mobile}>{mobileView === 'passage' ? passagePane : questionPane}</div>
          : <div className={s.desktop}><SplitPane ratio={ui.split} onRatio={(r) => setUi({ ...ui, split: r })} left={passagePane} right={questionPane} /></div>}
      </div>

      <footer className={s.foot}>
        <Palette exam={exam} answers={att.answers} flags={att.flags} current={att.cursor.question}
          onJump={(p, q) => go(p, q)} graded={mode === 'practice' ? checked : undefined} />
        <div className={s.legend}>
          <span><i className={s.lgAns} /> Đã làm <b className="num">{answered}</b></span>
          <span><i className={s.lgFlag} /> Đánh dấu <b className="num">{att.flags.length}</b></span>
        </div>
      </footer>

      <Dialog open={dialog === 'submit'} onClose={() => setDialog(null)} title={mode === 'test' ? 'Nộp bài thi?' : 'Kết thúc lượt luyện tập?'}
        actions={<>
          <button className="btn" onClick={() => setDialog(null)}>Tiếp tục làm</button>
          <button className="btn btn-primary" onClick={() => submit()}>{mode === 'test' ? 'Nộp bài' : 'Xem kết quả'}</button>
        </>}>
        <div className={s.submitStats}>
          <div><b className="num">{answered}</b><span>đã làm</span></div>
          <div className={unanswered ? s.warnStat : ''}><b className="num">{unanswered}</b><span>chưa làm</span></div>
          <div className={att.flags.length ? s.warnStat : ''}><b className="num">{att.flags.length}</b><span>đánh dấu</span></div>
        </div>
        {unanswered > 0 && <p>Câu chưa làm sẽ tính là sai. Sai không bị trừ điểm, nên đừng bỏ trống câu nào.</p>}
        {mode === 'test' && remaining != null && <p className="muted" style={{ marginTop: 6 }}>Bạn vẫn còn {Math.floor(remaining / 60)} phút.</p>}
      </Dialog>

      <Dialog open={dialog === 'exit'} onClose={() => setDialog(null)} title="Rời phòng thi?"
        actions={<>
          <button className="btn btn-ghost btn-danger" onClick={() => { removeAttempt(att.id); nav('/reading'); }}>Huỷ bài làm</button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={() => setDialog(null)}>Ở lại</button>
          <button className="btn btn-primary" onClick={() => nav('/reading')}>Lưu &amp; thoát</button>
        </>}>
        <p>Bài làm được lưu tự động; bạn có thể quay lại làm tiếp.</p>
        {mode === 'test' && <p style={{ marginTop: 8 }}>Đây là bài thi thử nên <b>đồng hồ vẫn tiếp tục chạy</b> khi bạn rời đi, giống phòng thi thật.</p>}
      </Dialog>

      <Dialog open={dialog === 'keys'} onClose={() => setDialog(null)} title="Phím tắt" width={380}
        actions={<button className="btn" onClick={() => setDialog(null)}>Đóng</button>}>
        <dl className={s.keys}>
          <dt><kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd></dt><dd>Chọn đáp án cho câu đang chọn</dd>
          <dt><kbd>J</kbd> / <kbd>↓</kbd></dt><dd>Câu tiếp theo</dd>
          <dt><kbd>K</kbd> / <kbd>↑</kbd></dt><dd>Câu trước</dd>
          <dt><kbd>F</kbd></dt><dd>Đánh dấu / bỏ đánh dấu</dd>
          <dt><kbd>[</kbd> <kbd>]</kbd></dt><dd>Bài đọc trước / sau</dd>
          <dt><kbd>?</kbd></dt><dd>Mở bảng này</dd>
        </dl>
      </Dialog>
    </div>
  );
}
