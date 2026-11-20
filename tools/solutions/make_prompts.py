"""Build verbatim prompt packs de-thi/loi-giai/prompts/vlu-N.json (no LLM involved)."""
import json, re, sys
from common import DE, PROMPTS, all_numbers

PROMPTS.mkdir(parents=True, exist_ok=True)
speaking = json.loads((DE / 'speaking' / 'data.json').read_text())


def lines(t):
    return [x.strip() for x in t.split('\n')[1:] if x.strip()]


def numbered(a):
    out, i = [], 0
    while i < len(a):
        if re.fullmatch(r'\d+', a[i]) and i + 1 < len(a):
            out.append(a[i + 1]); i += 2
        else:
            i += 1
    return out


def part1(t):
    topics, buf, cur = [], [], None
    for s in [x for x in lines(t) if x != 'Questions:']:
        m = re.match(r'^((?:Now,\s*)?let.s talk about)\s+(.*)$', s, re.I)
        if m:
            if cur: cur['questions'] = numbered(buf)
            buf, cur = [], {'lead': m.group(1), 'title': m.group(2).rstrip('.')}
            topics.append(cur)
        else:
            buf.append(s)
    if cur: cur['questions'] = numbered(buf)
    return topics


def part2(t):
    L = lines(t)
    return {'situation': L[0],
            'options': [re.sub(r'^Option \d+:\s*', '', x) for x in L if re.match(r'^Option \d+:', x)],
            'task': next((x for x in L if x.startswith('Choose')), 'Choose the best option and explain your reasons.')}


def part3(t):
    L = lines(t)
    fi = L.index('Follow-up Questions:') if 'Follow-up Questions:' in L else len(L)
    mind = L[1:fi]
    ideas = [x for x in mind[1:] if not re.search(r'your own', x, re.I)]
    return {'topic': L[0], 'center': mind[0] if mind else L[0], 'ideas': ideas,
            'own_ideas_slot': any(re.search(r'your own', x, re.I) for x in mind), 'follow_ups': numbered(L[fi + 1:])}


for n in all_numbers():
    ex = json.loads((DE / 'exams' / f'vlu-{n}.json').read_text())
    w = {}
    for t in ex['writing']['tasks']:
        st = t['structured']
        w[str(t['task'])] = {
            'title': f"WRITING — PART {t['task']}", 'time': '20 phút' if t['task'] == 1 else '40 phút',
            'min_words': t['min_words'], 'kind': t['kind'],
            'intro': st['intro'], 'quote': st['quote'], 'instruction': st['instruction'],
            # points the answer must cover: bullets, else the questions asked in the excerpt
            'points': [q[2:] for q in st['quote'] if q.startswith('- ')] or
                      [s.strip() for q in st['quote'] for s in re.findall(r'[^.!?]*\?', q)],
        }
    sp = speaking[str(n)]['parts']
    pack = {
        'id': f'vlu-{n}', 'number': n, 'title': f'Đề thi VLU {n}',
        'writing': w,
        'speaking': {
            '1': {'title': 'SPEAKING — PART 1', 'name': 'Social Interaction', 'time': '3 phút', 'topics': part1(sp[0])},
            '2': {'title': 'SPEAKING — PART 2', 'name': 'Solution Discussion', 'time': '4 phút (1 phút chuẩn bị)', **part2(sp[1])},
            '3': {'title': 'SPEAKING — PART 3', 'name': 'Topic Development', 'time': '5 phút (1 phút chuẩn bị)', **part3(sp[2])},
        },
        # site guides, for idea reference only
        'guides': {
            'writing': {str(t['task']): t.get('guide_md', '') for t in ex['writing']['tasks']},
            'speaking': {str(p['part']): p.get('guide_md', '') for p in (ex.get('speaking') or {}).get('parts', [])},
        },
    }
    errs = []
    if len(w) != 2: errs.append('writing tasks')
    if not w.get('1', {}).get('points'): errs.append('W1 points')
    s1 = pack['speaking']['1']['topics']
    if len(s1) != 2 or sum(len(x['questions']) for x in s1) < 6: errs.append('S1')
    if len(pack['speaking']['2']['options']) != 3: errs.append('S2')
    if len(pack['speaking']['3']['ideas']) < 3 or len(pack['speaking']['3']['follow_ups']) < 3: errs.append('S3')
    (PROMPTS / f'vlu-{n}.json').write_text(json.dumps(pack, ensure_ascii=False, indent=1))
    print(f'vlu-{n}', 'OK' if not errs else 'ISSUES ' + ', '.join(errs))
