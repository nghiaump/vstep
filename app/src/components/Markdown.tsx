import type { ReactNode } from 'react';

/** Renders "**bold**" inline markers as <strong>. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+?\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : p,
      )}
    </>
  );
}

/** Minimal markdown for the normalized data: paragraphs, 2-level "- " lists, bold-only lines as headings. */
export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: { text: string; children: string[] }[] | null = null;
  const flush = () => {
    if (!list) return;
    const items = list;
    blocks.push(
      <ul key={blocks.length}>
        {items.map((it, i) => (
          <li key={i}>
            <Inline text={it.text} />
            {it.children.length > 0 && (
              <ul>{it.children.map((c, j) => <li key={j}><Inline text={c} /></li>)}</ul>
            )}
          </li>
        ))}
      </ul>,
    );
    list = null;
  };
  for (const raw of source.split('\n')) {
    const sub = raw.match(/^\s{2,}- (.*)$/);
    const top = raw.match(/^- (.*)$/);
    if (sub && list?.length) list[list.length - 1].children.push(sub[1]);
    else if (top || sub) (list ??= []).push({ text: (top || sub)![1], children: [] });
    else {
      flush();
      const line = raw.trim();
      if (!line) continue;
      const head = line.match(/^\*\*([^*]+)\*\*$/);
      blocks.push(head ? <h4 key={blocks.length}>{head[1]}</h4> : <p key={blocks.length}><Inline text={line} /></p>);
    }
  }
  flush();
  return <div className={'md ' + className}>{blocks}</div>;
}
