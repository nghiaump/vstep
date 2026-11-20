import type { Highlight } from './types';

export interface Segment { text: string; bold: boolean; mark: number | null; start: number }

/** Split a paragraph containing **bold** markers into segments, overlaying highlight ranges (on plain-text offsets). */
export function segments(md: string, marks: Highlight[]): Segment[] {
  const bold: [number, number][] = [];
  let plain = '';
  md.split(/(\*\*[^*]+?\*\*)/g).forEach((p) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      bold.push([plain.length, plain.length + p.length - 4]);
      plain += p.slice(2, -2);
    } else plain += p;
  });
  const cuts = new Set<number>([0, plain.length]);
  bold.forEach(([a, b]) => { cuts.add(a); cuts.add(b); });
  marks.forEach((m) => { cuts.add(Math.max(0, m.start)); cuts.add(Math.min(plain.length, m.end)); });
  const pts = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (a === b) continue;
    const mi = marks.findIndex((m) => m.start <= a && m.end >= b);
    out.push({ text: plain.slice(a, b), bold: bold.some(([x, y]) => x <= a && y >= b), mark: mi < 0 ? null : mi, start: a });
  }
  return out;
}

export const plainText = (md: string) => md.replace(/\*\*/g, '');

/** Add a range to a paragraph's highlights, merging overlaps. */
export function addMark(list: Highlight[], h: Highlight): Highlight[] {
  const same = list.filter((x) => x.para === h.para);
  const other = list.filter((x) => x.para !== h.para);
  let { start, end } = h;
  const keep: Highlight[] = [];
  for (const x of same) {
    if (x.end < start || x.start > end) keep.push(x);
    else { start = Math.min(start, x.start); end = Math.max(end, x.end); }
  }
  return [...other, ...keep, { para: h.para, start, end }];
}

/** Character offset of (node, offset) measured over the text nodes inside root. */
export function textOffset(root: Node, node: Node, offset: number): number {
  const r = document.createRange();
  r.setStart(root, 0);
  r.setEnd(node, offset);
  return r.toString().length;
}
