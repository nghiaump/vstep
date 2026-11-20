import solutionsJson from '../data/solutions.json';

export interface OutlineRow { section: string; content: string; reusable: string }
export interface Vocab { term: string; meaning: string }
interface Sec { outline: OutlineRow[]; vocab: Vocab[] }

export interface WritingPrompt {
  title: string; time: string; min_words: number; kind: string;
  intro: string[]; quote: string[]; instruction: string; points: string[];
}
export interface SolutionPrompt {
  id: string; number: number; title: string;
  writing: Record<'1' | '2', WritingPrompt>;
  speaking: {
    '1': { title: string; name: string; time: string; topics: { lead: string; title: string; questions: string[] }[] };
    '2': { title: string; name: string; time: string; situation: string; options: string[]; task: string };
    '3': { title: string; name: string; time: string; topic: string; center: string; ideas: string[]; own_ideas_slot: boolean; follow_ups: string[] };
  };
}
export interface SolutionAnswer {
  id: string;
  writing: { '1': Sec & { answer: string }; '2': Sec & { answer: string; essay_type: string } };
  speaking: {
    '1': Sec & { answers: string[] };
    '2': Sec & { choice: number; answer: string };
    '3': Sec & { answer: string; own_idea: string; follow_ups: string[] };
  };
}
export interface Solution { id: string; number: number; prompt: SolutionPrompt; answer: SolutionAnswer }

export const SOLUTIONS = solutionsJson as unknown as Solution[];
export const solutionById: Record<string, Solution> = Object.fromEntries(SOLUTIONS.map((s) => [s.id, s]));
export const hasSolution = (id: string) => id in solutionById;

export const SPEAK_WPM = 120;
export function speakTime(words: number) {
  const s = Math.round((words / SPEAK_WPM) * 60);
  return s >= 60 ? `${Math.floor(s / 60)} phút ${String(s % 60).padStart(2, '0')} giây` : `${s} giây`;
}
