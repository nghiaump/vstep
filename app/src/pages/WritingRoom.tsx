import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { writingById, examLabel } from '../lib/data';
import { findActive, getAttempt, newId, removeAttempt, saveAttempt, useAttempts, useProfile, useUi } from '../lib/storage';
import { countParagraphs, countWords, remainingSec } from '../lib/time';
import type { WritingAttempt, WritingExam } from '../lib/types';
import { useNow } from '../hooks/useNow';
import { useMedia } from '../hooks/useMedia';
import { ExamBar } from '../components/ExamBar';
import { SplitPane } from '../components/SplitPane';
import { Markdown } from '../components/Markdown';
import { Dialog } from '../components/Dialog';
import s from './WritingRoom.module.css';

type Mode = 'test' | 'task1' | 'task2';
const DURATION: Record<Mode, number> = { test: 3600, task1: 1200, task2: 2400 };
const tasksFor = (m: Mode) => (m === 'test' ? [1, 2] : m === 'task1' ? [1] : [2]);

export default function WritingRoom() {
  const { examId = '', mode = '' } = useParams();
  const exam = writingById[examId];
  const [attempts] = useAttempts();
  const [id, setId] = useState(() => findActive<WritingAttempt>((a) => a.skill === 'writing' && a.examId === examId && (a as WritingAttempt).mode === mode)?.id);
  if (!exam || !['test', 'task1', 'task2'].includes(mode)) return <Navigate to="/writing" replace />;
  const att = attempts.find((a) => a.id === id) as WritingAttempt | undefined;
  if (!att || att.submittedAt) {
    return <Intro exam={exam} mode={mode as Mode} onStart={() => {
      const m = mode as Mode;
      const a: WritingAttempt = { id: newId(), skill: 'writing', examId, mode: m, startedAt: Date.now(), durationSec: DURATION[m], texts: {}, activeTask: tasksFor(m)[0] };
      saveAttempt(a);
      setId(a.id);
    }} />;
  }
  return <Room key={att.id} exam={exam} att={att} />;
}

function Intro({ exam, mode, onStart }: { exam: WritingExam; mode: Mode; onStart: () => void }) {
  const nav = useNavigate();
  const [profile, setProfile] = useProfile();
  const [name, setName] = useState(profile.name);
  const tasks = exam.tasks.filter((t) => tasksFor(mode).includes(t.task));
  return (
    <div className={s.room}>
      <ExamBar skill="Writing" exam={examLabel(exam.id)} sub={mode === 'test' ? 'Thi thử' : `Task ${tasks[0].task}`} onExit={() => nav('/writing')} />
      <div className={s.introWrap}>
        <div className={s.intro}>
          <p className="eyebrow">{mode === 'test' ? 'Thi thử · đúng định dạng VSTEP' : 'Luyện một task'}</p>
          <h1 className={s.introTitle}>{exam.title} · Viết</h1>
          <div className={s.taskList}>
            {tasks.map((t) => (
              <div key={t.task}>
                <span className={s.tk}>Task {t.task}</span>
                <span>{t.kind === 'Essay' ? 'Bài luận' : 'Thư / Email'}</span>
                <span className="muted">≥ {t.minWords} từ · khoảng {t.task === 1 ? 20 : 40} phút</span>
              </div>
            ))}
          </div>
          <ul className={s.notes}>
            <li>Tổng thời gian <b>{DURATION[mode] / 60} phút</b>, tính từ lúc bấm bắt đầu và vẫn chạy nếu bạn rời trang. Hết giờ, bài được nộp tự động.</li>
            {mode === 'test' && <li>Chuyển qua lại giữa hai task bất cứ lúc nào. Nên dành khoảng 20 phút cho Task 1, 40 phút cho Task 2.</li>}
            <li>Bài viết tự lưu liên tục. Sau khi nộp, bạn xem hướng dẫn chi tiết và tự chấm theo 4 tiêu chí của VSTEP.</li>
          </ul>
          <div className={s.startRow}>
            <label className={s.nameField}><span>Tên thí sinh</span>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên (tuỳ chọn)" maxLength={40} />
            </label>
            <button className="btn btn-primary btn-lg" autoFocus onClick={() => { if (name.trim() !== profile.name) setProfile({ ...profile, name: name.trim() }); onStart(); }}>Bắt đầu viết</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Room({ exam, att }: { exam: WritingExam; att: WritingAttempt }) {
  const nav = useNavigate();
  const [ui, setUi] = useUi();
  const [dialog, setDialog] = useState<null | 'submit' | 'exit'>(null);
  const [texts, setTexts] = useState<Record<number, string>>(att.texts);
  const [saved, setSaved] = useState(true);
  const [mobileView, setMobileView] = useState<'prompt' | 'write'>('write');
  const narrow = useMedia('(max-width: 900px)');
  const timer = useRef<number>(0);
  const done = useRef(false);
  const now = useNow();
  const remaining = remainingSec(att.startedAt, att.durationSec, now);
  const order = tasksFor(att.mode);
  const active = order.includes(att.activeTask) ? att.activeTask : order[0];
  const task = exam.tasks.find((t) => t.task === active)!;

  const persist = (t: Record<number, string>, extra: Partial<WritingAttempt> = {}) => {
    const cur = getAttempt<WritingAttempt>(att.id) ?? att;
    saveAttempt({ ...cur, texts: t, ...extra });
    setSaved(true);
  };
  const onType = (v: string) => {
    const next = { ...texts, [active]: v };
    setTexts(next);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(next), 500);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const submit = (auto = false) => {
    if (done.current) return;
    done.current = true;
    clearTimeout(timer.current);
    const cur = getAttempt<WritingAttempt>(att.id) ?? att;
    saveAttempt({ ...cur, texts, submittedAt: Date.now(), autoSubmitted: auto || undefined });
    nav(`/writing/review/${att.id}`, { replace: true });
  };
  useEffect(() => { if (remaining === 0) submit(true); });

  const words = countWords(texts[active] ?? '');
  const under = order.map((t) => ({ t, n: countWords(texts[t] ?? ''), min: exam.tasks.find((x) => x.task === t)!.minWords })).filter((x) => x.n < x.min);

  const promptPane = (
    <div className={s.prompt}>
      <span className={s.plabel}>Task {task.task} · {task.kind === 'Essay' ? 'Essay' : 'Email / Letter'}</span>
      <Markdown source={task.prompt} className={s.pmd} />
      <p className={s.pmin}>Viết tối thiểu <b>{task.minWords}</b> từ.</p>
    </div>
  );
  const editorPane = (
    <div className={s.editor}>
      <textarea className={s.ta} value={texts[active] ?? ''} onChange={(e) => onType(e.target.value)} spellCheck={false}
        placeholder={task.task === 1 ? 'Dear …,' : 'Bắt đầu bài luận của bạn…'} aria-label={`Bài viết Task ${task.task}`} autoFocus />
      <div className={s.status}>
        <span className={clsx(s.wc, words >= task.minWords ? s.ok : words > 0 && s.low)}>
          <b className="num">{words}</b> / {task.minWords} từ
        </span>
        <span className="num">{countParagraphs(texts[active] ?? '')} đoạn</span>
        <span className={s.saved}>{saved ? 'Đã lưu' : 'Đang lưu…'}</span>
      </div>
    </div>
  );

  return (
    <div className={s.room}>
      <ExamBar skill="Writing" exam={examLabel(exam.id)} sub={att.mode === 'test' ? 'Thi thử' : `Task ${order[0]}`}
        seconds={remaining} onExit={() => { persist(texts); setDialog('exit'); }}>
        <button className="btn btn-sm btn-primary" onClick={() => { persist(texts); setDialog('submit'); }}>Nộp bài</button>
      </ExamBar>
      {order.length > 1 && (
        <div className={s.taskbar} role="tablist">
          {order.map((t) => {
            const n = countWords(texts[t] ?? '');
            const min = exam.tasks.find((x) => x.task === t)!.minWords;
            return (
              <button key={t} role="tab" aria-selected={t === active} className={clsx(s.tab, t === active && s.tabOn)}
                onClick={() => { persist(texts, { activeTask: t }); }}>
                Task {t}<span className={clsx('num', n >= min && s.ok)}>{n}/{min}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className={s.mobileTabs}>
        <div className="seg">
          <button aria-pressed={mobileView === 'prompt'} onClick={() => setMobileView('prompt')}>Đề bài</button>
          <button aria-pressed={mobileView === 'write'} onClick={() => setMobileView('write')}>Bài viết</button>
        </div>
      </div>
      <div className={s.work}>
        {narrow
          ? <div className={s.mobile}>{mobileView === 'prompt' ? promptPane : editorPane}</div>
          : <div className={s.desktop}><SplitPane ratio={Math.min(ui.split, 0.5)} onRatio={(r) => setUi({ ...ui, split: r })} left={promptPane} right={editorPane} /></div>}
      </div>

      <Dialog open={dialog === 'submit'} onClose={() => setDialog(null)} title="Nộp bài viết?"
        actions={<><button className="btn" onClick={() => setDialog(null)}>Viết tiếp</button><button className="btn btn-primary" onClick={() => submit()}>Nộp bài</button></>}>
        {under.length > 0
          ? <p>{under.map((u) => `Task ${u.t} mới có ${u.n}/${u.min} từ`).join('; ')}. Bài thiếu số từ tối thiểu sẽ bị trừ điểm.</p>
          : <p>Cả {order.length > 1 ? 'hai task' : 'bài'} đã đủ số từ tối thiểu.</p>}
        <p className="muted" style={{ marginTop: 6 }}>Bạn còn {Math.floor(remaining / 60)} phút.</p>
      </Dialog>
      <Dialog open={dialog === 'exit'} onClose={() => setDialog(null)} title="Rời phòng thi?"
        actions={<>
          <button className="btn btn-ghost btn-danger" onClick={() => { removeAttempt(att.id); nav('/writing'); }}>Huỷ bài</button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={() => setDialog(null)}>Ở lại</button>
          <button className="btn btn-primary" onClick={() => nav('/writing')}>Lưu &amp; thoát</button>
        </>}>
        <p>Bài viết đã được lưu. Đồng hồ <b>vẫn tiếp tục chạy</b> khi bạn rời đi.</p>
      </Dialog>
    </div>
  );
}
