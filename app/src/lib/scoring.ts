import type { Choice, ReadingExam, ReadingResult, WritingCriteria } from './types';

/** VSTEP Reading: 40 items, each worth 0.25 → score on a 10-point scale. */
export function scoreReading(exam: ReadingExam, answers: Record<number, Choice>): ReadingResult {
  const byType = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  let total = 0;
  const byPart = exam.parts.map((p) => {
    let c = 0;
    for (const q of p.questions) {
      const ok = answers[q.number] === q.answer;
      if (ok) c++;
      const t = byType.get(q.type) ?? { correct: 0, total: 0 };
      t.total++;
      if (ok) t.correct++;
      byType.set(q.type, t);
    }
    correct += c;
    total += p.questions.length;
    return { part: p.part, correct: c, total: p.questions.length };
  });
  return {
    correct,
    total,
    score: roundHalf((correct / Math.max(total, 1)) * 10, 0.25),
    byPart,
    byType: [...byType.entries()].map(([type, v]) => ({ type, ...v })).sort((a, b) => a.correct / a.total - b.correct / b.total),
  };
}

export function roundHalf(x: number, step = 0.5) {
  return Math.round(x / step) * step;
}

/** Self-assessed writing: task score = mean of 4 criteria; overall = (T1 + 2·T2) / 3, rounded to 0.5. */
export function taskScore(c?: WritingCriteria) {
  if (!c) return null;
  return (c.tf + c.org + c.voc + c.gram) / 4;
}
export function writingOverall(t1: number | null, t2: number | null) {
  if (t1 == null || t2 == null) return null;
  return roundHalf((t1 + 2 * t2) / 3);
}

/** Rough CEFR mapping used by VSTEP 3–5 for an averaged score. */
export function cefr(score: number) {
  if (score >= 8.5) return 'C1';
  if (score >= 6) return 'B2';
  if (score >= 4) return 'B1';
  return 'Dưới B1';
}

export function fmtScore(n: number) {
  return n.toLocaleString('vi-VN', { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 2 });
}
