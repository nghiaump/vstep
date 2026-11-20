"""Verify that every rendered de-thi/loi-giai/vlu-N.md reproduces the original prompts verbatim
(source of truth: de-thi/exams/*.json writing.structured + de-thi/speaking/data.json)."""
import json, re, sys
from common import DE, OUT, all_numbers

norm = lambda s: re.sub(r'\s+', ' ', s.replace('**', '')).strip()
spk = json.loads((DE / 'speaking' / 'data.json').read_text())
bad = total = 0
for n in all_numbers():
    md_path = OUT / f'vlu-{n}.md'
    if not md_path.exists():
        continue
    md = norm(re.sub(r'^>\s?', '', md_path.read_text(), flags=re.M))
    ex = json.loads((DE / 'exams' / f'vlu-{n}.json').read_text())
    need = []
    for t in ex['writing']['tasks']:
        st = t['structured']
        need += st['intro'] + [q[2:] if q.startswith('- ') else q for q in st['quote']] + [st['instruction']]
    for part in spk[str(n)]['parts']:
        for line in part.split('\n')[1:]:
            line = line.strip()
            if not line or re.fullmatch(r'\d+', line) or line in ('Questions:', 'Follow-up Questions:', 'You are considering the following options:'):
                continue
            line = re.sub(r'^Option \d+:\s*', '', line)
            need.append(line.rstrip('.') if line.lower().startswith(("let’s talk", "let's talk", 'now, let')) else line)
    missing = [x for x in need if norm(x) not in md]
    total += 1
    if missing:
        bad += 1
        print(f'vlu-{n}: {len(missing)} dòng đề không khớp')
        for m in missing[:5]: print('   ✗', m[:90])
print(f'{total - bad}/{total} đề chép đúng nguyên văn')
sys.exit(1 if bad else 0)
