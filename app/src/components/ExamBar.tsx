import type { ReactNode } from 'react';
import { useProfile } from '../lib/storage';
import { clock } from '../lib/time';
import { Icon } from './Icon';
import s from './ExamBar.module.css';

/** Dark top bar of an exam room: skill · exam · candidate · clock · actions. */
export function ExamBar({ skill, exam, sub, seconds, countdown = true, onExit, children }: {
  skill: string; exam: string; sub?: string; seconds?: number | null; countdown?: boolean;
  onExit: () => void; children?: ReactNode;
}) {
  const [profile] = useProfile();
  const level = countdown && seconds != null ? (seconds <= 300 ? 'crit' : seconds <= 600 ? 'warn' : '') : '';
  return (
    <header className={s.bar}>
      <button className={s.exit} onClick={onExit} aria-label="Thoát phòng thi" title="Thoát">
        <Icon name="left" size={18} />
      </button>
      <div className={s.id}>
        <span className={s.skill}>{skill}</span>
        <span className={s.sep} aria-hidden="true">/</span>
        <span>{exam}</span>
        {sub && <span className={s.subtag}>{sub}</span>}
      </div>
      <div className={s.candidate} title="Thí sinh">
        <span className={s.label}>Thí sinh</span>
        <span>{profile.name || 'Chưa đặt tên'}</span>
      </div>
      {seconds != null && (
        <div className={`${s.clock} ${level ? s[level] : ''}`} role="timer" aria-live="off" aria-label={countdown ? 'Thời gian còn lại' : 'Thời gian đã làm'}>
          <Icon name="clock" size={16} />
          <span className="num">{clock(seconds)}</span>
        </div>
      )}
      <div className={s.actions}>{children}</div>
    </header>
  );
}
