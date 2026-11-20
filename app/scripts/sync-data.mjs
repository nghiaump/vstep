// Build app/src/data/{reading,writing,speaking}.json from ../de-thi (single source of truth).
// Runs automatically before `dev` and `build`.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', '..', 'de-thi');
const OUT = join(here, '..', 'src', 'data');
mkdirSync(OUT, { recursive: true });

const warn = [];
const exams = readdirSync(join(SRC, 'exams'))
  .filter((f) => /^vlu-\d+\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(join(SRC, 'exams', f), 'utf8')))
  .sort((a, b) => b.number - a.number);

const reading = exams
  .filter((e) => e.has_reading)
  .map((e) => ({
    id: e.id,
    number: e.number,
    title: e.title,
    source: `${e.source}&skill=reading`,
    parts: e.reading.parts.map((p) => ({
      part: p.part,
      title: p.title,
      directions: p.directions,
      passage: p.passage,
      tips: p.tips_md || '',
      questions: p.questions.map((q) => ({
        number: q.number,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        type: q.type,
        explanation: q.explanation || '',
      })),
    })),
  }));

for (const e of reading) {
  const n = e.parts.reduce((s, p) => s + p.questions.length, 0);
  if (e.parts.length !== 4 || n !== 40) warn.push(`${e.id}: reading has ${e.parts.length} parts / ${n} questions`);
  for (const p of e.parts) for (const q of p.questions) if (!q.answer) warn.push(`${e.id} q${q.number}: no answer`);
}

const writing = exams
  .filter((e) => e.writing?.tasks?.length)
  .map((e) => ({
    id: e.id,
    number: e.number,
    title: e.title,
    source: `${e.source}&skill=writing`,
    tasks: e.writing.tasks.map((t) => ({
      task: t.task,
      kind: t.kind,
      minWords: t.min_words,
      prompt: t.prompt,
      guide: t.guide_md || '',
    })),
  }));

// ---- Speaking: raw text -> structure
const lines = (t) => t.split('\n').slice(1).map((s) => s.trim()).filter(Boolean);
const numbered = (arr) => {
  const out = [];
  for (let i = 0; i < arr.length; i++) if (/^\d+$/.test(arr[i]) && arr[i + 1]) out.push(arr[++i]);
  return out;
};
function part1(t) {
  const topics = [];
  let buf = [];
  let cur = null;
  const flush = () => { if (cur) cur.questions = numbered(buf); buf = []; };
  for (const s of lines(t).filter((x) => x !== 'Questions:')) {
    const m = s.match(/^(?:Now,\s*)?let.s talk about\s+(.*)$/i);
    if (m) { flush(); cur = { lead: s.replace(m[1], '').trim(), title: m[1].trim(), questions: [] }; topics.push(cur); }
    else buf.push(s);
  }
  flush();
  return { topics };
}
function part2(t) {
  const L = lines(t);
  return {
    situation: L[0],
    options: L.filter((s) => /^Option \d+:/.test(s)).map((s) => s.replace(/^Option \d+:\s*/, '')),
    task: L.find((s) => /^Choose/.test(s)) || 'Choose the best option and explain your reasons.',
  };
}
function part3(t) {
  const L = lines(t);
  const fi = L.indexOf('Follow-up Questions:');
  const mind = L.slice(1, fi < 0 ? L.length : fi);
  return {
    topic: L[0],
    center: mind[0] || L[0],
    ideas: mind.slice(1),
    followUps: fi < 0 ? [] : numbered(L.slice(fi + 1)),
  };
}
const spk = JSON.parse(readFileSync(join(SRC, 'speaking', 'data.json'), 'utf8'));
const guidesFor = (num) => {
  const ex = exams.find((e) => e.number === Number(num));
  const parts = ex?.speaking?.parts ?? [];
  return [1, 2, 3].map((n) => parts.find((p) => p.part === n)?.guide_md ?? '');
};
const speaking = Object.entries(spk)
  .map(([num, v]) => ({
    id: `vlu-${num}`,
    number: Number(num),
    title: v.title,
    source: `https://vstepowl.com/exam-reviews/de-thi/?exam=vlu-exam-${num}&skill=speaking`,
    part1: part1(v.parts[0]),
    part2: part2(v.parts[1]),
    part3: part3(v.parts[2]),
    guides: guidesFor(num),
  }))
  .sort((a, b) => b.number - a.number);

for (const s of speaking) {
  const q1 = s.part1.topics.reduce((n, t) => n + t.questions.length, 0);
  if (s.part1.topics.length !== 2 || q1 < 6) warn.push(`${s.id}: part1 ${s.part1.topics.length} topics / ${q1} questions`);
  if (s.part2.options.length !== 3) warn.push(`${s.id}: part2 ${s.part2.options.length} options`);
  if (s.part3.ideas.length < 3 || s.part3.followUps.length < 3) warn.push(`${s.id}: part3 ${s.part3.ideas.length} ideas / ${s.part3.followUps.length} follow-ups`);
}

// ---- Model answers (de-thi/loi-giai): verbatim prompt pack + answer JSON per exam
const SOL = join(SRC, 'loi-giai');
const solutions = existsSync(join(SOL, 'answers'))
  ? readdirSync(join(SOL, 'answers'))
      .filter((f) => f.endsWith('.json') && existsSync(join(SOL, 'prompts', f)))
      .map((f) => {
        const prompt = JSON.parse(readFileSync(join(SOL, 'prompts', f), 'utf8'));
        const answer = JSON.parse(readFileSync(join(SOL, 'answers', f), 'utf8'));
        return { id: prompt.id, number: prompt.number, label: prompt.label || `VLU ${prompt.number}`, custom: !!prompt.custom, prompt, answer };
      })
      // self-made / recalled exams first (newest date first), then VLU numbers descending
      .sort((a, b) => (b.custom - a.custom) || (b.custom ? (b.prompt.date || '').localeCompare(a.prompt.date || '') : b.number - a.number))
  : [];

// Self-made / recalled exams (writing only) also become timed Writing rooms, listed first.
const customWriting = solutions.filter((s) => s.custom && s.prompt.writing).map((s) => ({
  id: s.id,
  number: 0,
  title: s.prompt.title,
  label: s.label,
  custom: true,
  source: '',
  tasks: ['1', '2'].map((k) => {
    const p = s.prompt.writing[k];
    return { task: +k, kind: p.kind, minWords: p.min_words, prompt: [...p.intro, ...p.quote, p.instruction].join('\n'), guide: s.prompt.guides?.[k] || '' };
  }),
}));
writing.unshift(...customWriting);
for (const s of solutions) delete s.prompt.guides;

const write = (name, data) => writeFileSync(join(OUT, `${name}.json`), JSON.stringify(data));
write('reading', reading);
write('writing', writing);
write('speaking', speaking);
write('solutions', solutions);
if (existsSync(join(SOL, 'templates.json'))) writeFileSync(join(OUT, 'templates.json'), readFileSync(join(SOL, 'templates.json'), 'utf8'));
console.log(`sync-data: reading ${reading.length}, writing ${writing.length}, speaking ${speaking.length}, solutions ${solutions.length}`);
if (warn.length) console.warn('sync-data warnings:\n  ' + warn.join('\n  '));
if (!existsSync(join(OUT, 'reading.json'))) process.exit(1);
