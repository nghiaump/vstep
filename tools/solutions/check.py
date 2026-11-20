"""Validate model answers against the brief. Usage: python3 check.py [N ...]  (default: all with answers)
Exit code 1 if any ERROR. WARN = worth a look but not blocking."""
import re, sys
from common import count_words, sentences, paragraphs, all_numbers, load_prompt, load_answer

STOP = set('the a an and or of to in on for with at by from is are be this that your you my our their its it as into about than more most very can will should would could do does did have has had not no yes but if so such also each other any some all which who what when where why how there here been being was were up out over under young people'.split())
TIME_RE = re.compile(r"\b(\d{1,2}(:\d{2})?\s?(a\.m\.|p\.m\.|am|pm)|\d{1,2}\s?o'clock|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|morning|afternoon|evening|tonight|tomorrow|next week|next month|\d{1,2}(st|nd|rd|th)?\s+(of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december))\b", re.I)
PLACE_RE = re.compile(r"\b(at|in|near|outside|inside|opposite)\s+(the\s+|a\s+|my\s+|our\s+)?[A-Z0-9][\w'’-]*|\bat (the|a|my|our) [a-z]+", re.I)
HARD = [(re.compile(r'^(Never|Rarely|Seldom|Not only|Hardly|Little)\b'), 'đảo ngữ'),
        (re.compile(r'\bhad\s+\w+(ed|en)\b[^.]*\bwould have\b', re.I), 'điều kiện loại 3'),
        (re.compile(r'\bwhom\b', re.I), '"whom"'), (re.compile(r'\bwere I\b'), 'đảo ngữ điều kiện')]


def keywords(s):
    return {w.lower().strip("'’") for w in re.findall(r"[A-Za-z][A-Za-z'’-]{3,}", s)} - STOP


def covers(text, phrase, need=1):
    k = keywords(phrase)
    if not k:
        return True
    low = text.lower()
    hits = sum(1 for w in k if w in low or (len(w) > 5 and w[:-2] in low))
    return hits >= min(need, len(k))


class Report:
    def __init__(self, n): self.n, self.errors, self.warns = n, [], []
    def err(self, part, msg): self.errors.append(f'{part}: {msg}')
    def warn(self, part, msg): self.warns.append(f'{part}: {msg}')


def common_checks(r, part, sec, text):
    v = sec.get('vocab') or []
    if not (3 <= len(v) <= 5) or not all(x.get('term') and x.get('meaning') for x in v):
        r.err(part, f'vocab phải 3–5 mục có nghĩa (đang {len(v)})')
    o = sec.get('outline') or []
    if len(o) < 3 or not all(x.get('section') and x.get('content') and x.get('reusable') for x in o):
        r.err(part, 'outline thiếu (cần ≥3 dòng section/content/reusable)')
    # every reusable sentence (fragments split by "…") must appear verbatim in the answer
    flat = lambda s: re.sub(r'\s+', ' ', s.replace('’', "'")).strip().lower()
    body = flat(text)
    for x in o:
        for frag in re.split(r'\s*(?:…|\.\.\.)\s*', x.get('reusable', '')):
            f = flat(frag).strip(' ,.;:!?')  # a template may cut a sentence short
            if len(f) > 3 and f not in body:
                r.err(part, f'câu mẫu dàn ý không có trong bài: "{frag[:50]}"')
    for s in sentences(text):
        if count_words(s) > 28:
            r.warn(part, f'câu dài {count_words(s)} từ: "{s[:60]}…"')
        for rx, name in HARD:
            if rx.search(s):
                r.warn(part, f'cấu trúc khó ({name}): "{s[:60]}…"')


def check(n):
    P, A, r = load_prompt(n), load_answer(n), Report(n)
    if not A:
        r.err('ALL', 'chưa có file answers'); return r
    # ---- Writing 1
    w1, p1 = (A.get('writing') or {}).get('1') or {}, P['writing']['1']
    t = w1.get('answer', '')
    wc = count_words(t)
    if wc < 120: r.err('W1', f'{wc} từ < 120')
    elif not 150 <= wc <= 190: r.warn('W1', f'{wc} từ (mục tiêu 150–190)')
    paras = paragraphs(t)
    need = len(p1['points']) + 4
    if len(paras) < need - 1: r.err('W1', f'{len(paras)} đoạn, cần lời chào + mở đầu + {len(p1["points"])} đoạn ý + kết + ký tên (= {need})')
    elif len(paras) != need: r.warn('W1', f'{len(paras)} đoạn (kỳ vọng {need})')
    if paras and not re.match(r'^(Dear|Hi|Hello)\b', paras[0]): r.err('W1', 'thiếu lời chào (Dear/Hi …)')
    body = '\n'.join(paras[2:-2]) if len(paras) > 4 else t
    for pt in p1['points']:
        if not covers(body, pt): r.warn('W1', f'có thể chưa trả lời ý: "{pt[:60]}"')
        if re.search(r'\b(arrange|suggest|invite|meet|recommend|plan|when|where)\b', pt, re.I):
            if not TIME_RE.search(t) or not PLACE_RE.search(t):
                r.err('W1', f'ý "{pt[:40]}…" cần chi tiết cụ thể: thời gian + địa điểm')
    common_checks(r, 'W1', w1, t)
    # ---- Writing 2
    w2 = (A.get('writing') or {}).get('2') or {}
    t = w2.get('answer', '')
    wc = count_words(t)
    if wc < 250: r.err('W2', f'{wc} từ < 250')
    elif not 260 <= wc <= 300: r.warn('W2', f'{wc} từ (mục tiêu 260–300)')
    if len(paragraphs(t)) != 4: r.err('W2', f'{len(paragraphs(t))} đoạn, cần đúng 4')
    if not w2.get('essay_type'): r.err('W2', 'thiếu dạng đề (essay_type)')
    common_checks(r, 'W2', w2, t)
    # ---- Speaking 1
    s1 = (A.get('speaking') or {}).get('1') or {}
    qs = [q for tp in P['speaking']['1']['topics'] for q in tp['questions']]
    ans = s1.get('answers') or []
    if len(ans) != len(qs): r.err('S1', f'{len(ans)} câu trả lời / {len(qs)} câu hỏi')
    for i, a in enumerate(ans):
        k = len(sentences(a))
        if k < 2 or k > 4: r.err('S1', f'câu {i + 1}: {k} câu (cần 2–3)')
        elif k == 4: r.warn('S1', f'câu {i + 1}: 4 câu (nên 2–3)')
    common_checks(r, 'S1', s1, ' '.join(ans))
    # ---- Speaking 2
    s2, p2 = (A.get('speaking') or {}).get('2') or {}, P['speaking']['2']
    t = s2.get('answer', '')
    if s2.get('choice') not in (1, 2, 3): r.err('S2', 'choice phải là 1, 2 hoặc 3')
    for i, o in enumerate(p2['options'], 1):
        if not covers(t, o): r.err('S2', f'chưa nhắc tới Option {i}: "{o[:40]}"')
    wc = count_words(t)
    if not 150 <= wc <= 250: r.warn('S2', f'{wc} từ (mục tiêu 150–250, khoảng 1,5–2 phút)')
    common_checks(r, 'S2', s2, t)
    # ---- Speaking 3
    s3, p3 = (A.get('speaking') or {}).get('3') or {}, P['speaking']['3']
    t = s3.get('answer', '')
    for idea in p3['ideas']:
        if not covers(t, idea): r.err('S3', f'chưa triển khai ý: "{idea[:50]}"')
    if not s3.get('own_idea') or not covers(t, s3.get('own_idea', '')): r.err('S3', 'thiếu ý riêng (own_idea) hoặc bài nói chưa nhắc tới')
    wc = count_words(t)
    if not 180 <= wc <= 280: r.warn('S3', f'{wc} từ (mục tiêu 180–280)')
    fu = s3.get('follow_ups') or []
    if len(fu) != len(p3['follow_ups']): r.err('S3', f'{len(fu)} câu follow-up / {len(p3["follow_ups"])}')
    for i, a in enumerate(fu):
        k = len(sentences(a))
        if k < 2 or k > 4: r.err('S3', f'follow-up {i + 1}: {k} câu (cần 2–3)')
    common_checks(r, 'S3', s3, t + ' ' + ' '.join(fu))
    return r


if __name__ == '__main__':
    nums = [int(x) for x in sys.argv[1:]] or [n for n in all_numbers() if load_answer(n)]
    bad = 0
    for n in nums:
        r = check(n)
        status = 'ERROR' if r.errors else ('WARN' if r.warns else 'OK')
        print(f'vlu-{n}: {status}')
        for e in r.errors: print('   ✗', e)
        for w in r.warns: print('   ·', w)
        bad += bool(r.errors)
    print(f'\n{len(nums) - bad}/{len(nums)} không có lỗi bắt buộc')
    sys.exit(1 if bad else 0)
