export type Choice = 'A' | 'B' | 'C' | 'D';

export interface Question {
  number: number;
  stem: string;
  options: Record<Choice, string>;
  answer: Choice;
  type: string;
  explanation: string;
}
export interface ReadingPart {
  part: number;
  title: string;
  directions: string;
  passage: string[];
  tips: string;
  questions: Question[];
}
export interface ReadingExam { id: string; number: number; title: string; source: string; parts: ReadingPart[] }

export interface WritingTask { task: 1 | 2; kind: string; minWords: number; prompt: string; guide: string }
export interface WritingExam {
  id: string; number: number; title: string; source: string; tasks: WritingTask[];
  /** Self-made / recalled exam (not from vstepowl), with its own display label. */
  custom?: boolean; label?: string;
}

export interface SpeakingExam {
  id: string; number: number; title: string; source: string;
  part1: { topics: { lead: string; title: string; questions: string[] }[] };
  part2: { situation: string; options: string[]; task: string };
  part3: { topic: string; center: string; ideas: string[]; followUps: string[] };
  /** Answer guides per part (from the PDF export), markdown; may be empty. */
  guides: string[];
}

/** Character range inside a passage paragraph (offsets on text with ** markers stripped). */
export interface Highlight { para: number; start: number; end: number }

export interface ReadingResult {
  correct: number;
  total: number;
  score: number; // 0–10, VSTEP scale (correct × 0.25)
  byPart: { part: number; correct: number; total: number }[];
  byType: { type: string; correct: number; total: number }[];
}

interface AttemptBase { id: string; examId: string; startedAt: number; submittedAt?: number }

export interface ReadingAttempt extends AttemptBase {
  skill: 'reading';
  mode: 'test' | 'practice';
  durationSec: number | null;
  answers: Record<number, Choice>;
  flags: number[];
  highlights: Record<number, Highlight[]>;
  checkedParts: number[];
  cursor: { part: number; question: number };
  result?: ReadingResult;
  autoSubmitted?: boolean;
}

export type WritingCriteria = { tf: number; org: number; voc: number; gram: number };
export interface WritingAttempt extends AttemptBase {
  skill: 'writing';
  mode: 'test' | 'task1' | 'task2';
  durationSec: number;
  texts: Record<number, string>;
  activeTask: number;
  selfScores?: Partial<Record<number, WritingCriteria>>;
  autoSubmitted?: boolean;
}

export type SpeakingCriteria = { fluency: number; pron: number; voc: number; gram: number };
export interface SpeakingAttempt extends AttemptBase {
  skill: 'speaking';
  recorded: number[];
  selfScore?: SpeakingCriteria;
}

export type Attempt = ReadingAttempt | WritingAttempt | SpeakingAttempt;
