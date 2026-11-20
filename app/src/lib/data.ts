import readingJson from '../data/reading.json';
import writingJson from '../data/writing.json';
import speakingJson from '../data/speaking.json';
import type { ReadingExam, SpeakingExam, WritingExam } from './types';

export const READING = readingJson as unknown as ReadingExam[];
export const WRITING = writingJson as unknown as WritingExam[];
export const SPEAKING = speakingJson as unknown as SpeakingExam[];

export const QUESTION_TYPES = [
  'Chi tiết',
  'Từ vựng',
  'Quy chiếu',
  'Loại trừ (NOT/EXCEPT)',
  'Suy luận',
  'Ý chính',
  'Mục đích tác giả',
  'Thái độ tác giả',
  'Chèn câu',
] as const;

export const TYPE_HINT: Record<string, string> = {
  'Chi tiết': 'Tìm thông tin được nêu trực tiếp trong bài',
  'Từ vựng': 'Đoán nghĩa từ theo ngữ cảnh',
  'Quy chiếu': 'Đại từ / cụm từ thay thế cho gì',
  'Loại trừ (NOT/EXCEPT)': 'Chọn ý KHÔNG được nhắc tới',
  'Suy luận': 'Điều có thể suy ra, không nói thẳng',
  'Ý chính': 'Nội dung chính / tiêu đề phù hợp',
  'Mục đích tác giả': 'Vì sao tác giả viết / nhắc tới chi tiết',
  'Thái độ tác giả': 'Quan điểm, giọng điệu của tác giả',
  'Chèn câu': 'Vị trí phù hợp để thêm một câu',
};

const byId = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((e) => [e.id, e])) as Record<string, T>;
export const readingById = byId(READING);
export const writingById = byId(WRITING);
export const speakingById = byId(SPEAKING);

const NUMS = SPEAKING.map((e) => e.number).filter((n) => n > 0);
/** e.g. "VLU 90–135", computed from the data so new exams need no code change. */
export const RANGE_LABEL = `VLU ${Math.min(...NUMS)}–${Math.max(...NUMS)}`;
export const TOTAL_EXAMS = new Set([...READING, ...WRITING.filter((e) => !e.custom), ...SPEAKING].map((e) => e.id)).size;

const LABELS: Record<string, string> = Object.fromEntries(WRITING.filter((e) => e.label).map((e) => [e.id, e.label!]));
export const examLabel = (id: string) => LABELS[id] ?? 'VLU ' + id.replace('vlu-', '');
