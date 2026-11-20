import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { speakingById, examLabel } from '../lib/data';
import { findActive, getAttempt, newId, removeAttempt, saveAttempt, useProfile } from '../lib/storage';
import { beep, deleteAudio, saveAudio } from '../lib/audio';
import { clock } from '../lib/time';
import type { SpeakingAttempt, SpeakingExam } from '../lib/types';
import { useNow } from '../hooks/useNow';
import { useRecorder } from '../hooks/useRecorder';
import { ExamBar } from '../components/ExamBar';
import { PART_META, PartBody } from '../components/SpeakingParts';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import s from './SpeakingTest.module.css';

type Part = 1 | 2 | 3;
type Stage = { kind: 'setup' } | { kind: 'run'; part: Part; phase: 'prep' | 'speak'; endsAt: number; total: number } | { kind: 'saving' };

export default function SpeakingTest() {
  const { examId = '' } = useParams();
  const exam = speakingById[examId];
  if (!exam) return <Navigate to="/speaking" replace />;
  return <Room exam={exam} />;
}

function Room({ exam }: { exam: SpeakingExam }) {
  const nav = useNavigate();
  const [profile, setProfile] = useProfile();
  const [name, setName] = useState(profile.name);
  const rec = useRecorder();
  const [stage, setStage] = useState<Stage>({ kind: 'setup' });
  const [att, setAtt] = useState<SpeakingAttempt | undefined>(() =>
    findActive<SpeakingAttempt>((a) => a.skill === 'speaking' && a.examId === exam.id));
  const [withMic, setWithMicState] = useState(true);
  const micOn = useRef(true);
  const setWithMic = (v: boolean) => { micOn.current = v; setWithMicState(v); };
  const [exitOpen, setExitOpen] = useState(false);
  const busy = useRef(false);
  const now = useNow(stage.kind === 'run', 250);

  const resumeFrom = (att?.recorded.length ? (Math.max(...att.recorded) + 1) : 1) as Part;
  const remaining = stage.kind === 'run' ? Math.max(0, (stage.endsAt - now) / 1000) : 0;

  const startPart = (part: Part) => {
    const m = PART_META[part];
    if (m.prep) {
      beep(660, 140);
      setStage({ kind: 'run', part, phase: 'prep', endsAt: Date.now() + m.prep * 1000, total: m.prep });
    } else beginSpeak(part);
  };
  const beginSpeak = (part: Part) => {
    beep(880, 120, 2);
    if (micOn.current) rec.start(); // no-op when the mic stream is unavailable
    const m = PART_META[part];
    setStage({ kind: 'run', part, phase: 'speak', endsAt: Date.now() + m.speak * 1000, total: m.speak });
  };
  const finishPart = async (part: Part) => {
    if (busy.current || !att) return;
    busy.current = true;
    setStage({ kind: 'saving' });
    const blob = await rec.stop();
    const cur = getAttempt<SpeakingAttempt>(att.id) ?? att;
    let next: SpeakingAttempt = cur;
    if (blob) {
      await saveAudio(att.id, part, blob);
      next = { ...cur, recorded: [...new Set([...cur.recorded, part])] };
    } else next = { ...cur, recorded: [...new Set([...cur.recorded, part])] };
    if (part === 3) {
      next = { ...next, submittedAt: Date.now() };
      saveAttempt(next);
      beep(520, 300);
      nav(`/speaking/review/${att.id}`, { replace: true });
      return;
    }
    saveAttempt(next);
    setAtt(next);
    busy.current = false;
    startPart((part + 1) as Part);
  };

  // Advance phases when the clock hits zero.
  useEffect(() => {
    if (stage.kind !== 'run' || remaining > 0) return;
    if (stage.phase === 'prep') beginSpeak(stage.part);
    else finishPart(stage.part);
  });

  const begin = async () => {
    if (name.trim() !== profile.name) setProfile({ ...profile, name: name.trim() });
    let a = att;
    if (!a) {
      a = { id: newId(), skill: 'speaking', examId: exam.id, startedAt: Date.now(), recorded: [] };
      saveAttempt(a);
      setAtt(a);
    }
    if (withMic && rec.mic !== 'ready') { const ok = await rec.enable(); if (!ok) setWithMic(false); }
    startPart(resumeFrom);
  };

  const exit = async (discard: boolean) => {
    await rec.stop();
    if (discard && att) { await deleteAudio(att.id); removeAttempt(att.id); }
    nav('/speaking');
  };

  if (stage.kind === 'setup') {
    return (
      <div className={s.room}>
        <ExamBar skill="Speaking" exam={examLabel(exam.id)} sub="Thi thử" onExit={() => nav('/speaking')} />
        <div className={s.setupWrap}>
          <div className={s.setup}>
            <p className="eyebrow">Thi thử · ghi âm từng phần</p>
            <h1 className={s.setupTitle}>{exam.title} · Nói</h1>
            <div className={s.timeline}>
              {([1, 2, 3] as const).map((p) => (
                <div key={p} className={clsx(att?.recorded.includes(p) && s.tlDone)}>
                  <span className={s.tlPart}>Part {p}</span>
                  <span className={s.tlName}>{PART_META[p].name}</span>
                  <span className={s.tlTime}>{PART_META[p].prep ? '1′ chuẩn bị + ' : ''}{PART_META[p].speak / 60}′ nói</span>
                </div>
              ))}
            </div>

            <div className={s.mic}>
              <div className={s.micHead}>
                <Icon name="mic" size={18} />
                <div>
                  <b>Micro</b>
                  <span className="muted">
                    {rec.mic === 'idle' && 'Chưa bật. Trình duyệt sẽ hỏi quyền dùng micro.'}
                    {rec.mic === 'asking' && 'Đang chờ bạn cho phép…'}
                    {rec.mic === 'ready' && 'Sẵn sàng. Thử nói vài câu để xem mức âm.'}
                    {rec.mic === 'denied' && 'Không truy cập được micro. Vẫn thi được nhưng không ghi âm.'}
                    {rec.mic === 'unsupported' && (window.isSecureContext ? 'Trình duyệt không hỗ trợ ghi âm. Vẫn thi được nhưng không ghi âm.' : 'Ghi âm chỉ chạy trên localhost hoặc HTTPS (mở trên máy tính). Vẫn thi được nhưng không ghi âm.')}
                  </span>
                </div>
                {rec.mic === 'idle' && <button className="btn btn-sm" onClick={rec.enable}>Kiểm tra micro</button>}
              </div>
              {rec.mic === 'ready' && <div className={s.meter}><i style={{ width: `${Math.round(rec.level * 100)}%` }} /></div>}
              <label className={s.check}>
                <input type="checkbox" checked={withMic && rec.mic !== 'denied' && rec.mic !== 'unsupported'}
                  disabled={rec.mic === 'denied' || rec.mic === 'unsupported'} onChange={(e) => setWithMic(e.target.checked)} />
                Ghi âm bài nói để nghe lại (lưu trên máy này)
              </label>
            </div>

            <div className={s.startRow}>
              <label className={s.nameField}><span>Tên thí sinh</span>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên (tuỳ chọn)" maxLength={40} />
              </label>
              <button className="btn btn-primary btn-lg" onClick={begin}>
                {resumeFrom > 1 ? `Tiếp tục từ Part ${resumeFrom}` : 'Bắt đầu thi'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const part = stage.kind === 'run' ? stage.part : resumeFrom;
  const m = PART_META[part];
  const frac = stage.kind === 'run' ? remaining / stage.total : 0;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className={s.room}>
      <ExamBar skill="Speaking" exam={examLabel(exam.id)} sub={`Part ${part}`}
        onExit={() => setExitOpen(true)} />
      <div className={s.stageGrid}>
        <main className={s.prompt}>
          <div className={s.promptHead}>
            <span className={s.pn}>Part {part}</span>
            <h2>{m.name}</h2>
            <span className="muted">{m.vi}</span>
          </div>
          <div className={s.promptBody}><PartBody exam={exam} part={part} /></div>
        </main>
        <aside className={s.rail}>
          <ol className={s.steps}>
            {([1, 2, 3] as const).map((p) => (
              <li key={p} className={clsx(p === part && s.stepOn, (att?.recorded.includes(p) || p < part) && s.stepDone)}>
                <span className={s.stepDot}>{att?.recorded.includes(p) || p < part ? <Icon name="check" size={12} stroke={2.4} /> : p}</span>
                Part {p}
              </li>
            ))}
          </ol>

          <div className={clsx(s.ring, stage.kind === 'run' && stage.phase === 'speak' ? s.speak : s.prep)}>
            <svg viewBox="0 0 128 128" aria-hidden="true">
              <circle cx="64" cy="64" r={R} className={s.track} />
              <circle cx="64" cy="64" r={R} className={s.prog} strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
            </svg>
            <div className={s.ringText}>
              <span className={s.phase}>{stage.kind === 'saving' ? 'Đang lưu…' : stage.phase === 'prep' ? 'Chuẩn bị' : 'Đang nói'}</span>
              <span className={s.big + ' num'}>{stage.kind === 'run' ? clock(Math.ceil(remaining)) : '–'}</span>
            </div>
          </div>

          {stage.kind === 'run' && stage.phase === 'speak' && rec.recording && (
            <div className={s.recBox}>
              <span className={s.recLabel}><span className={s.recDot} /> Đang ghi âm</span>
              <div className={s.meter}><i style={{ width: `${Math.round(rec.level * 100)}%` }} /></div>
            </div>
          )}
          {stage.kind === 'run' && stage.phase === 'prep' && (
            <textarea className={s.notes} placeholder="Ghi chú nháp trong thời gian chuẩn bị…" aria-label="Ghi chú nháp" />
          )}

          <div className={s.railActs}>
            {stage.kind === 'run' && stage.phase === 'prep' && (
              <button className="btn btn-primary" onClick={() => beginSpeak(stage.part)}>Bắt đầu nói ngay</button>
            )}
            {stage.kind === 'run' && stage.phase === 'speak' && (
              <button className="btn btn-primary" onClick={() => finishPart(stage.part)}>
                {part === 3 ? 'Kết thúc bài thi' : `Kết thúc Part ${part}`}
              </button>
            )}
          </div>
        </aside>
      </div>
      <Dialog open={exitOpen} onClose={() => setExitOpen(false)} title="Dừng bài thi?"
        actions={<>
          <button className="btn btn-ghost btn-danger" onClick={() => exit(true)}>Huỷ bài thi</button>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={() => setExitOpen(false)}>Tiếp tục thi</button>
          <button className="btn btn-primary" onClick={() => exit(false)}>Lưu &amp; thoát</button>
        </>}>
        <p>Các part đã hoàn thành được giữ lại; phần đang nói dở sẽ không được lưu. Lần sau bạn có thể tiếp tục từ part kế tiếp.</p>
      </Dialog>
    </div>
  );
}
