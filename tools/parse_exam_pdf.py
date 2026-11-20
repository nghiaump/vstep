"""Parse a vstepowl exam PDF (exported via the site's "Tải đề thi" button) into normalized JSON.

Usage: python3 parse_exam_pdf.py <pdf> [<pdf> ...] --out <dir>
Output: <dir>/vlu-<n>.json with reading (passages, questions, options, answers, per-question
explanations + question types from the hints), writing tasks (prompt + guide), speaking raw text.
"""
import json, re, sys, pathlib
import pymupdf

FOOTER_RE = re.compile(r'^VSTEP Owl · vstepowl\.com')
SP = lambda s: re.sub(r'\s+', '', s)  # letter-spaced headings like "R EADING · PART 1"


def load_lines(path):
    """Return visual lines: dict(page, x0, y, x1, size, bold, text, md). Two-column pieces stay separate."""
    doc = pymupdf.open(path)
    out = []
    for pno, page in enumerate(doc):
        for b in page.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                spans = [s for s in l['spans'] if s['text'].strip() or s['text'] == ' ']
                if not spans:
                    continue
                text = ''.join(s['text'] for s in spans)
                size = round(spans[0]['size'], 1)
                if size >= 25 and text.strip() == 'vstepowl.com':
                    continue  # watermark
                if size <= 8.5 and (FOOTER_RE.match(text.strip()) or re.match(r'^\d+/\d+$', text.strip())):
                    continue  # footer
                # markdown with **bold** for emphasized words inside regular text
                md = ''
                base_bold = 'Bold' in spans[0]['font']
                for s in spans:
                    t = s['text']
                    if 'Bold' in s['font'] and not base_bold and t.strip():
                        lead, core, trail = re.match(r'^(\s*)(.*?)(\s*)$', t).groups()
                        md += f'{lead}**{core}**{trail}'
                    else:
                        md += t
                out.append(dict(page=pno, x0=l['bbox'][0], y=l['bbox'][1], x1=l['bbox'][2], size=size,
                                bold=base_bold, text=re.sub(r'\s+', ' ', text).strip(),
                                md=re.sub(r'\s+', ' ', md).strip()))
    out.sort(key=lambda d: (d['page'], round(d['y']), d['x0']))
    return out


def rows(lines):
    """Group lines on the same visual row."""
    res = []
    for ln in lines:
        if res and res[-1][0]['page'] == ln['page'] and abs(res[-1][0]['y'] - ln['y']) < 3:
            res[-1].append(ln)
        else:
            res.append([ln])
    return res


def find(lines, pred, start=0):
    for i in range(start, len(lines)):
        if pred(lines[i]):
            return i
    return len(lines)


def join_wrapped(parts):
    s = ''
    for p in parts:
        s = (s + ' ' + p).strip() if s else p
    return re.sub(r'\s+', ' ', s)


def parse_passage(plines):
    """Passage lines (size 11) -> paragraphs; break on big vertical gap or short line before a page break."""
    paras, cur, prev = [], [], None
    right = max((l['x1'] for l in plines), default=0)
    for l in plines:
        if prev is not None:
            same_page = l['page'] == prev['page']
            gap = l['y'] - prev['y']
            if (same_page and gap > 30) or (not same_page and prev['x1'] < right - 45):
                paras.append(join_wrapped(cur)); cur = []
        cur.append(l['md']); prev = l
    if cur:
        paras.append(join_wrapped(cur))
    return paras


def parse_questions(qlines):
    qs, cur, last_opt = [], None, None
    for row in rows(qlines):
        row.sort(key=lambda d: d['x0'])
        first = row[0]['text']
        m = re.match(r'^(\d+)\.\s*(.*)$', first)
        if m and row[0]['x0'] < 55:
            stem = join_wrapped([m.group(2)] + [r['text'] for r in row[1:]])
            cur = dict(number=int(m.group(1)), stem=stem, options={}); qs.append(cur); last_opt = None
            continue
        if cur is None:
            continue
        opt_pieces = [r for r in row if re.match(r'^[A-D]\.\s', r['text'] + ' ')]
        if opt_pieces:
            for r in row:
                mo = re.match(r'^([A-D])\.\s*(.*)$', r['text'])
                if mo:
                    cur['options'][mo.group(1)] = mo.group(2).strip(); last_opt = mo.group(1)
                elif last_opt:
                    cur['options'][last_opt] += ' ' + r['text']
        elif last_opt:  # wrapped option text
            cur['options'][last_opt] = join_wrapped([cur['options'][last_opt]] + [r['text'] for r in row])
        else:  # wrapped stem
            cur['stem'] = join_wrapped([cur['stem']] + [r['text'] for r in row])
    return qs


def to_md(blines):
    """Hint/guide lines -> markdown: bullets, bold numbered headings, wrapped lines merged by line width."""
    rs = rows(blines)
    right = max((max(r['x1'] for r in row) for row in rs), default=0)
    items, prev_full = [], False
    for row in rs:
        row = sorted(row, key=lambda d: d['x0'])
        t = ' '.join(r['md'] if not row[0]['bold'] else r['text'] for r in row)
        x1 = max(r['x1'] for r in row)
        if t.startswith('•'):
            items.append('- ' + t[1:].strip())
        elif t.startswith('–'):
            items.append('  - ' + t[1:].strip())
        elif re.match(r'^\d+\.\s', t) and row[0]['bold']:
            items.append('\n**' + t + '**')
        elif items and prev_full and not items[-1].startswith('\n**'):
            items[-1] += ' ' + t
        else:
            items.append(t)
        prev_full = x1 > right - 40
    return '\n'.join(items).strip()


def parse_hints(hlines):
    """Return (markdown, {qnum_in_part: type}, {qnum_in_part: explanation})."""
    md = to_md(hlines)
    plain = md.replace('**', '')
    types, expl = {}, {}
    for line in plain.split('\n'):
        if 'Dạng câu hỏi' not in line:
            continue
        body = line.split('Dạng câu hỏi', 1)[1]
        header = body[:body.index('):') + 1] if '):' in body else body.split(':')[0]
        groups = re.findall(r'\s*(?:,|và|&)?\s*([^()]+?)\s*\(((?:R\dQ\d+(?:\s*(?:,|-|–|&|và)\s*)?)+)\)', header)
        allq = []
        for name, codes in groups:
            name = re.sub(r'^(và|,|&)\s*', '', name.strip(' ,:')).strip()
            qs = []
            for a, b in re.findall(r'R\dQ(\d+)(?:\s*[-–]\s*R\dQ(\d+))?', codes):
                qs += list(range(int(a), int(b) + 1)) if b else [int(a)]
            for q in qs:
                types[q] = name; allq.append(q)
        rest = body.split('):', 1)[1].strip() if '):' in body else ''
        if len(allq) == 1 and rest:
            expl[allq[0]] = rest
    for m in re.finditer(r'Với R\dQ(\d+),\s*([^\n]+)', plain):
        expl[int(m.group(1))] = m.group(2).strip()
    return md, types, expl


CANON = [  # (canonical type, stem regex, hint-name regex)
    ('Chèn câu', r'(where|which).{0,40}(sentence|square|\[\d\]).{0,60}(fit|added|inserted|placed)|\[1\].*\[2\]', r'chèn câu'),
    ('Từ vựng', r'closest in meaning|could best be replaced|meaning of the (word|phrase)|word .{0,30} means', r'từ vựng'),
    ('Quy chiếu', r'\brefers? to\b', r'quy chiếu'),
    ('Loại trừ (NOT/EXCEPT)', r'\bNOT\b|\bEXCEPT\b', r'loại trừ'),
    ('Mục đích tác giả', r"author'?s?.{0,15}purpose|purpose of (the|this) (passage|paragraph|article|text)|why does the author (mention|include|discuss|cite|refer)", r'^mục đích'),
    ('Thái độ tác giả', r'\battitude\b|\btone\b|\bstance\b|author.{0,20}(feel|view|opinion|frame)', r'thái độ|quan điểm'),
    ('Ý chính', r'main (idea|point|topic)|central (argument|idea)|\btitles?\b|mainly (about|discuss)|primarily (about|concerned)|summar', r'ý chính|nhan đề'),
    ('Suy luận', r'infer|impl(y|ied)|suggest|most likely|probably', r'suy luận|kết luận'),
    ('Chi tiết', r'according to|based on the passage|stated|mentioned|true about|what (did|does|is|was)|which of the following|\bwhy\b|\bhow\b', r'chi tiết|định vị|thông tin|tổng hợp|liên hệ'),
]


def classify(stem, hint):
    for name, srx, _ in CANON:
        if re.search(srx, stem, re.I if srx != r'\bNOT\b|\bEXCEPT\b' else 0):
            return name
    for name, _, hrx in CANON:
        if hint and re.search(hrx, hint.lower()):
            return name
    return 'Khác'


def writing_structure(lines):
    """Split a writing prompt (lines between the TASK header and 'BÀI LÀM') into
    intro (left margin, regular) / quote (indented: email excerpt or essay statement) / instruction (left margin, bold)."""
    if not lines:
        return dict(intro=[], quote=[], instruction='')
    left = min(l['x0'] for l in lines)
    right = max(l['x1'] for l in lines)
    zone = lambda l: 'quote' if l['x0'] > left + 8 else ('instruction' if l['bold'] else 'intro')
    out = dict(intro=[], quote=[], instruction=[])
    prev = None
    for row in rows(lines):
        row = sorted(row, key=lambda d: d['x0'])
        z = zone(row[0])
        t = ' '.join(r['md'] if not r['bold'] else r['text'] for r in row).strip()
        bullet = t.startswith('•')
        if bullet:
            t = '- ' + t[1:].strip()
        new_par = (prev is None or prev['zone'] != z or bullet or prev['x1'] < right - 40
                   or (z == 'quote' and prev['bold'] != row[0]['bold']))
        if new_par:
            out[z].append(t)
        else:
            out[z][-1] += ' ' + t
        prev = dict(zone=z, x1=max(r['x1'] for r in row), bold=row[0]['bold'])
    out['instruction'] = ' '.join(out['instruction'])
    return out


def parse_speaking(path, L, i_speak, i_ans):
    """Speaking section -> {parts:[{part, prompt(DOM-like text), guide_md}]} using line rows + spatial clustering for the Part 3 mindmap."""
    if i_speak >= len(L):
        return None
    seg = L[i_speak:i_ans]
    heads = [i for i, l in enumerate(seg) if re.match(r'^PART [123]$', l['text']) and l['bold']]
    out = []
    for k, h in enumerate(heads):
        e = heads[k + 1] if k + 1 < len(heads) else len(seg)
        part = int(seg[h]['text'][-1])
        body = seg[h + 1:e]
        i_note = find(body, lambda l: l['text'].startswith('GHI CHÚ'))
        i_guide = find(body, lambda l: SP(l['text']) == 'GỢIÝTRẢLỜI')
        guide = to_md(body[i_guide + 1:]) if i_guide < len(body) else ''
        P = [l for l in body[:i_note] if not re.match(r'^\d+ phút$', l['text']) and l['text'] not in ('Social Interaction', 'Solution Discussion', 'Topic Development')]
        rws = [sorted(r, key=lambda d: d['x0']) for r in rows(P)]
        txt = lambda r: ' '.join(x['text'] for x in r)
        if part == 1:
            lines_out, cur_q = [], None
            for r in rws:
                t = txt(r)
                m = re.match(r'^(\d+)\.\s*(.*)$', t)
                if re.match(r'^(Now,\s*)?let.s talk about', t, re.I):
                    lines_out += ['', t.rstrip('.').strip(), '']; cur_q = None
                elif m:
                    lines_out += [m.group(1), m.group(2)]; cur_q = len(lines_out) - 1
                elif cur_q is not None:
                    lines_out[cur_q] = (lines_out[cur_q] + ' ' + t).strip()
            prompt = 'SPEAKING — PART 1\n\nQuestions:\n' + '\n'.join(lines_out)
        elif part == 2:
            sit, opts, task, mode = [], [], '', 'sit'
            for r in rws:
                t = txt(r)
                if t.startswith('You are considering'):
                    mode = 'opt'; continue
                mo = re.match(r'^[•\-]?\s*Option (\d+):\s*(.*)$', t)
                if mo:
                    opts.append(f'Option {mo.group(1)}: {mo.group(2)}'); mode = 'opt'
                elif t.startswith('Choose'):
                    task = t; mode = 'task'
                elif mode == 'sit':
                    sit.append(t)
                elif mode == 'opt' and opts:
                    opts[-1] += ' ' + t
                elif mode == 'task':
                    task += ' ' + t
            prompt = ('SPEAKING — PART 2\n\n' + ' '.join(sit) + '\n\nYou are considering the following options:\n\n'
                      + '\n'.join(opts) + '\n\n' + (task or 'Choose the best option and explain your reasons.'))
        else:
            i_topic = find(P, lambda l: l['text'].startswith('Topic:'))
            i_fu = find(P, lambda l: l['text'].upper().startswith('FOLLOW-UP'))
            topic = P[i_topic]['text'].replace('Topic:', '').strip() if i_topic < len(P) else ''
            # wrapped topic lines (same style, right below)
            j = i_topic + 1
            while j < i_fu and P[j]['bold'] and P[j]['size'] == P[i_topic]['size'] and abs(P[j]['x0'] - P[i_topic]['x0']) < 3:
                topic += ' ' + P[j]['text']; j += 1
            mind = P[j:i_fu]
            own = any(re.search(r'Ý tưởng của bạn|your own', l['text'], re.I) for l in mind)
            center_lines = [l for l in mind if l['bold'] and l['size'] >= 10.2]
            node_lines = [l for l in mind if not l['bold'] and not re.search(r'Ý tưởng của bạn|your own', l['text'], re.I)]
            clusters = []
            for l in sorted(node_lines, key=lambda d: (d['page'], d['y'])):
                cx = (l['x0'] + l['x1']) / 2
                for c in clusters:
                    last = c[-1]
                    if last['page'] == l['page'] and abs((last['x0'] + last['x1']) / 2 - cx) < 45 and 0 < l['y'] - last['y'] < 18:
                        c.append(l); break
                else:
                    clusters.append([l])
            clusters.sort(key=lambda c: (c[0]['page'], round(c[0]['y'] / 40), c[0]['x0']))
            ideas = [re.sub(r'\s+', ' ', ' '.join(x['text'] for x in c)).strip() for c in clusters]
            center = re.sub(r'\s+', ' ', ' '.join(x['text'] for x in sorted(center_lines, key=lambda d: (d['y'], d['x0'])))).strip()
            fus, cur = [], None
            for r in [sorted(x, key=lambda d: d['x0']) for x in rows(P[i_fu + 1:])]:
                t = txt(r)
                m = re.match(r'^(\d+)\.\s*(.*)$', t)
                if m:
                    fus.append(m.group(2)); cur = len(fus) - 1
                elif cur is not None:
                    fus[cur] = (fus[cur] + ' ' + t).strip()
            fl = []
            for n, q in enumerate(fus, 1):
                fl += [str(n), q]
            prompt = ('SPEAKING — PART 3\n\n' + topic + '\n\n' + '\n'.join([center] + ideas + (['[your own ideas]'] if own else []))
                      + '\n\nFollow-up Questions:\n\n' + '\n'.join(fl))
        out.append(dict(part=part, prompt=re.sub(r'\n{3,}', '\n\n', prompt).strip(), guide_md=guide))
    return dict(parts=out) if len(out) == 3 else None


def parse(path):
    L = load_lines(path)
    head = ' '.join(l['text'] for l in L[:3])
    num = int(re.search(r'VLU (\d+)', head).group(1))
    i_read = find(L, lambda l: re.match(r'^PHẦN \d · ĐỌC', l['text']))
    i_write = find(L, lambda l: re.match(r'^PHẦN \d · VIẾT', l['text']))
    i_speak = find(L, lambda l: re.match(r'^PHẦN \d · NÓI', l['text']))
    i_ans = find(L, lambda l: l['text'].startswith('ĐÁP ÁN & GIẢI THÍCH'))

    # ---- answers
    ans_end = find(L, lambda l: 'READING·PART' in SP(l['text']), i_ans)
    ans_text = ' '.join(' '.join(r['text'] for r in sorted(row, key=lambda d: d['x0'])) for row in rows(L[i_ans:ans_end]))
    answers = {int(a): b for a, b in re.findall(r'(?<!PART )\b(\d{1,2})\s+([A-D])\b', ans_text)}

    # ---- hints per reading part
    hint_starts = [i for i in range(ans_end, len(L)) if re.search(r'READING·PART(\d)', SP(L[i]['text']))]
    hints = {}
    for k, s in enumerate(hint_starts):
        p = int(re.search(r'READING·PART(\d)', SP(L[s]['text'])).group(1))
        e = hint_starts[k + 1] if k + 1 < len(hint_starts) else len(L)
        hints[p] = parse_hints(L[s + 1:e])

    # ---- reading parts
    part_idx = [] if i_read >= len(L) else [i for i in range(i_read, min(i_write, i_speak, i_ans)) if re.match(r'^PART \d', L[i]['text']) and L[i]['bold']]
    parts = []
    for k, s in enumerate(part_idx):
        e = part_idx[k + 1] if k + 1 < len(part_idx) else min(i_write, i_speak, i_ans)
        seg = L[s:e]
        pnum = int(re.match(r'^PART (\d)', seg[0]['text']).group(1))
        rng = re.search(r'Câu (\d+) - (\d+)', ' '.join(l['text'] for l in seg[:4]))
        i_dir = find(seg, lambda l: l['text'].startswith('Directions'))
        i_title = find(seg, lambda l: l['size'] >= 11.5 and l['bold'], i_dir)
        i_q = find(seg, lambda l: l['text'].startswith('Chọn đáp án đúng'))
        directions = join_wrapped([l['text'] for l in seg[i_dir:i_title]]).replace('Directions: ', '')
        j = i_title
        while j < i_q and ((seg[j]['bold'] and seg[j]['size'] >= 11.5) or seg[j]['text'] == 'GHI CHÚ'):
            j += 1  # long titles wrap onto several bold lines
        title = re.sub(r'\s+', ' ', re.sub(r'\bGHI CHÚ\b', ' ', ' '.join(l['text'] for l in seg[i_title:j]))).strip()
        plines = [l for l in seg[j:i_q] if l['size'] >= 10.5 and l['text'] != 'GHI CHÚ']
        qs = parse_questions(seg[i_q + 1:])
        md, types, expl = hints.get(pnum, ('', {}, {}))
        base = (pnum - 1) * 10
        for q in qs:
            q['answer'] = answers.get(q['number'])
            q['type_hint'] = types.get(q['number'] - base)
            q['type'] = classify(q['stem'], q['type_hint'])
            q['explanation'] = expl.get(q['number'] - base)
        parts.append(dict(part=pnum, question_range=[int(rng.group(1)), int(rng.group(2))] if rng else None,
                          title=title, directions=directions, passage=parse_passage(plines),
                          questions=qs, tips_md=md))

    # ---- writing tasks
    w = L[i_write:min(i_speak, i_ans)] if i_write < len(L) else []
    t_idx = [i for i, l in enumerate(w) if re.match(r'^TASK \d', l['text'])]
    tasks = []
    for k, s in enumerate(t_idx):
        e = t_idx[k + 1] if k + 1 < len(t_idx) else len(w)
        seg = w[s:e]
        hy, hp = seg[0]['y'], seg[0]['page']
        hdr_lines = [l for l in w if l['page'] == hp and abs(l['y'] - hy) < 4]
        hdr = ' '.join(l['text'] for l in sorted(hdr_lines, key=lambda d: d['x0']))
        mt = re.match(r'^TASK (\d)\s+(.*?)\s+Tối thiểu (\d+) từ', hdr)
        i_bl = find(seg, lambda l: SP(l['text']) == 'BÀILÀM')
        i_g = find(seg, lambda l: SP(l['text']) == 'GỢIÝLÀMBÀI')
        body_lines = [l for l in seg[1:i_bl] if l not in hdr_lines]
        prompt = to_md(body_lines)
        structured = writing_structure(body_lines)
        tasks.append(dict(task=int(mt.group(1)) if mt else k + 1, kind=mt.group(2) if mt else None,
                          min_words=int(mt.group(3)) if mt else None, prompt=prompt.strip(), structured=structured,
                          guide_md=to_md(seg[i_g + 1:]) if i_g < len(seg) else ''))

    speaking_raw = '\n'.join(l['text'] for l in L[i_speak:i_ans]) if i_speak < len(L) else ''
    speaking = parse_speaking(path, L, i_speak, i_ans)
    return dict(id=f'vlu-{num}', number=num, title=f'Đề thi VLU {num}',
                source=f'https://vstepowl.com/exam-reviews/de-thi/?exam=vlu-exam-{num}',
                has_reading=bool(parts), reading=dict(duration_min=60, parts=parts),
                writing=dict(duration_min=60, tasks=tasks),
                speaking=speaking, speaking_raw=speaking_raw)


def validate(ex):
    errs = []
    parts = ex['reading']['parts']
    if ex['has_reading'] and len(parts) != 4: errs.append(f'{len(parts)} reading parts')
    for p in parts:
        if len(p['questions']) != 10: errs.append(f"part {p['part']}: {len(p['questions'])} questions")
        if len(p['passage']) < 3: errs.append(f"part {p['part']}: {len(p['passage'])} paragraphs")
        for q in p['questions']:
            if sorted(q['options']) != list('ABCD'): errs.append(f"q{q['number']} options {sorted(q['options'])}")
            if not q['answer']: errs.append(f"q{q['number']} no answer")
            if q['type'] == 'Khác': errs.append(f"q{q['number']} unclassified: {q['stem'][:60]}")
    if len(ex['writing']['tasks']) != 2: errs.append(f"{len(ex['writing']['tasks'])} writing tasks")
    return errs


if __name__ == '__main__':
    args = sys.argv[1:]
    out = pathlib.Path(args[args.index('--out') + 1]); pdfs = args[:args.index('--out')]
    out.mkdir(parents=True, exist_ok=True)
    for p in pdfs:
        ex = parse(p)
        errs = validate(ex)
        (out / f"{ex['id']}.json").write_text(json.dumps(ex, ensure_ascii=False, indent=1))
        nq = sum(len(p['questions']) for p in ex['reading']['parts']); ne = sum(1 for p in ex['reading']['parts'] for q in p['questions'] if q['explanation'])
        tag = f"reading {nq}q ({ne} expl)" if ex['has_reading'] else 'NO READING'
        print(ex['id'], tag, f"writing {len(ex['writing']['tasks'])}", 'OK' if not errs else 'ISSUES: ' + '; '.join(errs[:8]))
