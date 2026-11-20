import type { Attempt, ReadingAttempt, SpeakingAttempt, WritingAttempt } from './types';
import { examLabel } from './data';
import { fmtScore, roundHalf, taskScore, writingOverall } from './scoring';

export const SKILL_NAME = { reading: 'Reading', writing: 'Writing', speaking: 'Speaking' } as const;

export function modeLabel(a: Attempt) {
  if (a.skill === 'reading') return (a as ReadingAttempt).mode === 'test' ? 'Thi thử' : 'Luyện tập';
  if (a.skill === 'writing') { const m = (a as WritingAttempt).mode; return m === 'test' ? 'Thi thử' : m === 'task1' ? 'Task 1' : 'Task 2'; }
  return 'Thi thử';
}

/** Short result text for lists. */
export function resultLabel(a: Attempt): string {
  if (!a.submittedAt) return 'Đang làm';
  if (a.skill === 'reading') { const r = (a as ReadingAttempt).result; return r ? `${fmtScore(r.score)} · ${r.correct}/${r.total}` : '—'; }
  if (a.skill === 'writing') {
    const w = a as WritingAttempt;
    const t1 = taskScore(w.selfScores?.[1]); const t2 = taskScore(w.selfScores?.[2]);
    const sc = w.mode === 'test' ? writingOverall(t1, t2) : (t1 ?? t2);
    return sc != null ? `Tự chấm ${fmtScore(roundHalf(sc))}` : 'Chưa tự chấm';
  }
  const sp = (a as SpeakingAttempt).selfScore;
  return sp ? `Tự chấm ${fmtScore(roundHalf((sp.fluency + sp.pron + sp.voc + sp.gram) / 4))}` : `${(a as SpeakingAttempt).recorded.length}/3 phần`;
}

export function attemptHref(a: Attempt) {
  if (!a.submittedAt) {
    if (a.skill === 'reading') return `/reading/${a.examId}/${(a as ReadingAttempt).mode}`;
    if (a.skill === 'writing') return `/writing/${a.examId}/${(a as WritingAttempt).mode}`;
    return `/speaking/${a.examId}/test`;
  }
  return `/${a.skill}/${a.skill === 'reading' ? 'result' : 'review'}/${a.id}`;
}

export const attemptTitle = (a: Attempt) => `${examLabel(a.examId)} · ${SKILL_NAME[a.skill]}`;
