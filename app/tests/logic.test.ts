import { describe, expect, it } from 'vitest';
import { scoreReading, writingOverall, taskScore, cefr, roundHalf } from '../src/lib/scoring';
import { remainingSec, elapsedSec, clock, countWords } from '../src/lib/time';
import { segments, addMark } from '../src/lib/highlight';
import reading from '../src/data/reading.json';
import writing from '../src/data/writing.json';
import speaking from '../src/data/speaking.json';
import type { Choice, ReadingExam, SpeakingExam } from '../src/lib/types';

const R = reading as unknown as ReadingExam[];
const S = speaking as unknown as SpeakingExam[];

describe('scoring', () => {
  const exam = R[0];
  const all = exam.parts.flatMap((p) => p.questions);
  it('all correct → 10, all blank → 0', () => {
    const full = Object.fromEntries(all.map((q) => [q.number, q.answer])) as Record<number, Choice>;
    expect(scoreReading(exam, full).score).toBe(10);
    expect(scoreReading(exam, {}).score).toBe(0);
  });
  it('each correct item is worth 0.25', () => {
    const some = Object.fromEntries(all.slice(0, 13).map((q) => [q.number, q.answer])) as Record<number, Choice>;
    const r = scoreReading(exam, some);
    expect(r.correct).toBe(13);
    expect(r.score).toBe(3.25);
    expect(r.byPart.reduce((n, p) => n + p.correct, 0)).toBe(13);
    expect(r.byType.reduce((n, t) => n + t.total, 0)).toBe(40);
  });
  it('writing overall = (T1 + 2·T2)/3 rounded to .5', () => {
    expect(taskScore({ tf: 6, org: 7, voc: 6, gram: 5 })).toBe(6);
    expect(writingOverall(6, 7)).toBe(6.5);
    expect(writingOverall(null, 7)).toBeNull();
    expect(roundHalf(6.74)).toBe(6.5);
  });
  it('CEFR bands', () => {
    expect(cefr(3.5)).toBe('Dưới B1');
    expect(cefr(4)).toBe('B1');
    expect(cefr(6)).toBe('B2');
    expect(cefr(8.5)).toBe('C1');
  });
});

describe('timer (wall-clock based, reload safe)', () => {
  it('derives remaining time from startedAt', () => {
    const start = 1_000_000;
    expect(remainingSec(start, 3600, start)).toBe(3600);
    expect(remainingSec(start, 3600, start + 61_500)).toBe(3539);
    expect(remainingSec(start, 3600, start + 4_000_000)).toBe(0);
    expect(elapsedSec(start, start + 125_900)).toBe(125);
  });
  it('formats clocks', () => {
    expect(clock(3600)).toBe('1:00:00');
    expect(clock(599)).toBe('9:59');
    expect(clock(5)).toBe('0:05');
  });
  it('counts words incl. Vietnamese and contractions', () => {
    expect(countWords("I'm finally coming to Vietnam!")).toBe(5);
    expect(countWords('  Xin chào   các bạn ')).toBe(4);
    expect(countWords('')).toBe(0);
  });
});

describe('highlights', () => {
  it('splits bold markers and overlays marks on plain offsets', () => {
    const segs = segments('who used **them** as places', [{ para: 0, start: 4, end: 13 }]);
    expect(segs.map((s) => s.text).join('')).toBe('who used them as places');
    expect(segs.find((s) => s.text === 'them')).toMatchObject({ bold: true, mark: 0 });
    expect(segs[0]).toMatchObject({ text: 'who ', mark: null });
  });
  it('merges overlapping ranges in the same paragraph only', () => {
    const m = addMark(addMark([], { para: 1, start: 0, end: 5 }), { para: 1, start: 3, end: 9 });
    expect(m).toEqual([{ para: 1, start: 0, end: 9 }]);
    expect(addMark(m, { para: 2, start: 0, end: 2 })).toHaveLength(2);
  });
});

describe('synced data', () => {
  it('covers VLU 1–141: 98 reading, 141 writing, 141 speaking exams', () => {
    expect(R).toHaveLength(98);
    expect(writing.filter((e) => !e.custom)).toHaveLength(141);
    expect(S).toHaveLength(141);
    expect(S.map((e) => e.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 141 }, (_, i) => 1 + i));
  });
  it('speaking guides come from the PDF export for every exam', () => {
    for (const s of S) expect(s.guides.filter((g) => g.length > 200)).toHaveLength(3);
  });
  it('every reading exam: 4 parts × 10 questions with 4 options and an answer', () => {
    for (const e of R) {
      expect(e.parts).toHaveLength(4);
      for (const p of e.parts) {
        expect(p.questions).toHaveLength(10);
        expect(p.passage.length).toBeGreaterThanOrEqual(3);
        expect(p.title.length).toBeGreaterThan(5);
        for (const q of p.questions) {
          expect(Object.keys(q.options).sort()).toEqual(['A', 'B', 'C', 'D']);
          expect(['A', 'B', 'C', 'D']).toContain(q.answer);
        }
      }
    }
  });
  it('passages never start with a wrapped title fragment', () => {
    // Regression: long titles used to wrap into the first paragraph ("Biology For decades…").
    const fragments = /^(Biology|Remain Unconvinced|Kong|Habitability|Deterrence|Verdict|Cola|Cultural Exchange|Jack Ma|Large Animals) /;
    for (const e of R) for (const p of e.parts) expect(p.passage[0]).not.toMatch(fragments);
  });
  it('speaking parts are fully structured', () => {
    for (const s of S) {
      expect(s.part1.topics).toHaveLength(2);
      expect(s.part1.topics.flatMap((t) => t.questions).length).toBeGreaterThanOrEqual(6);
      expect(s.part2.options).toHaveLength(3);
      expect(s.part3.ideas.length).toBeGreaterThanOrEqual(3);
      expect(s.part3.followUps.length).toBeGreaterThanOrEqual(3);
    }
  });
});

import solutions from '../src/data/solutions.json';
import type { Solution } from '../src/lib/solutions';

describe('model answers', () => {
  const SOL = solutions as unknown as Solution[];
  it('every exam VLU 1–141 has a model answer', () => {
    expect(SOL.filter((s) => !s.custom).map((s) => s.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 141 }, (_, i) => 1 + i));
  });
  it('every W2 answer names a known essay template, and every template exists', async () => {
    const { templateByKey, w2TemplateKey } = await import('../src/lib/templates');
    for (const s of SOL) {
      const w2 = s.answer.writing['2'] as { type_key?: string };
      expect(templateByKey[w2TemplateKey(w2.type_key) ?? '']).toBeDefined();
      expect(['w1_informal', 'w1_formal']).toContain((s.answer.writing['1'] as { template?: string }).template);
    }
    for (const k of ['s1', 's2', 's3']) expect(templateByKey[k]).toBeDefined();
  });
  it('self-made exams are writing-only, labelled, and also available as Writing rooms', () => {
    const custom = SOL.filter((s) => s.custom);
    expect(custom.length).toBeGreaterThanOrEqual(1);
    for (const s of custom) {
      expect(s.label).toBeTruthy();
      expect(s.prompt.speaking).toBeUndefined();
      expect(writing.find((e) => e.id === s.id)?.tasks).toHaveLength(2);
    }
  });
  it('word counts meet VSTEP minimums and the brief', () => {
    for (const s of SOL) {
      expect(countWords(s.answer.writing['1'].answer)).toBeGreaterThanOrEqual(120);
      expect(countWords(s.answer.writing['2'].answer)).toBeGreaterThanOrEqual(250);
      expect(s.answer.writing['2'].answer.split(/\n\s*\n/).filter((p) => p.trim())).toHaveLength(4);
      for (const k of ['1', '2'] as const) expect(s.answer.writing[k].vocab.length).toBeGreaterThanOrEqual(3);
      if (!s.answer.speaking || !s.prompt.speaking) continue;
      expect(s.answer.speaking['1'].answers).toHaveLength(s.prompt.speaking['1'].topics.flatMap((t) => t.questions).length);
      expect(s.answer.speaking['3'].follow_ups).toHaveLength(s.prompt.speaking['3'].follow_ups.length);
    }
  });
});
