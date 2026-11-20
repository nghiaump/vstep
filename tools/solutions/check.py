"""Validate model answers against the brief + the rules extracted from the study materials
(templates.json, doi-chieu/). Usage: python3 check.py [-q] [N|id ...]  (default: all with answers)
Exit code 1 if any ERROR. WARN = worth a look but not blocking."""
import re, sys
from common import count_words, sentences, paragraphs, all_numbers, custom_ids, exam_id, load_prompt, load_answer

STOP = set('the a an and or of to in on for with at by from is are be this that your you my our their its it as into about than more most very can will should would could do does did have has had not no yes but if so such also each other any some all which who what when where why how there here been being was were up out over under young people'.split())
TIME_RE = re.compile(r"\b(\d{1,2}(:\d{2})?\s?(a\.m\.(?!\w)|p\.m\.(?!\w)|am\b|pm\b)|\d{1,2}\s?o'clock|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|morning|afternoon|evening|tonight|tomorrow|next week|next month|\d{1,2}(st|nd|rd|th)?\s+(of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december))(?!\w)", re.I)
PLACE_RE = re.compile(r"\b(at|in|near|outside|inside|opposite)\s+(the\s+|a\s+|my\s+|our\s+)?[A-Z0-9][\w'’-]*|\bat (the|a|my|our) [a-z]+", re.I)
HARD = [(re.compile(r'^(Never|Rarely|Seldom|Not only|Hardly|Little)\b'), 'đảo ngữ'),
        (re.compile(r'\bhad\s+\w+(ed|en)\b[^.]*\bwould have\b', re.I), 'điều kiện loại 3'),
        (re.compile(r'\bwhom\b', re.I), '"whom"'), (re.compile(r'\bwere I\b'), 'đảo ngữ điều kiện')]
CONTR = re.compile(r"\b\w+(?:n['’]t|['’]m|['’]re|['’]ll|['’]ve|['’]d)\b|\b(?:it|that|there|what|let|he|she|here)['’]s\b", re.I)
EXAMPLE = re.compile(r'\b(for example|for instance|a good example|such as|to illustrate)\b', re.I)
STANCE = re.compile(r'\b(in my opinion|i believe|i think|i agree|i disagree|i firmly|i strongly|personally|in my view)\b', re.I)
CONCEDE = re.compile(r'\b(admittedly|some people (argue|believe|think|say)|it is true that|although|on the one hand)\b', re.I)
NEG = re.compile(r"\b(not|never|less|too|instead|cannot|no)\b|n['’]t\b", re.I)
LINKERS = ['This is because', 'The reason is that', 'This means that', 'As a result', 'Therefore', 'Thanks to this',
           'For example', 'For instance', 'A good example']
TYPE_KEYS = {'opinion': 1, 'discussion': 1, 'adv_disadv': 1, 'cause_effect': 2, 'x_solution': 2, 'one_side': 2}  # PEERs in body 1
W1_TEMPLATES = ('w1_informal', 'w1_formal')
MAX_SENT = 25
# fixed template sentences (templates.json) are memorised as a whole, so they may run longer
FRAME_START = re.compile(r'^(In this situation, among the three options|To sum up, out of these three options|Regarding |As for |There are also some reasons why|In conclusion, although|If you require any further information)', re.I)


def keywords(s):
    return {w.lower().strip("'’") for w in re.findall(r"[A-Za-z][A-Za-z'’-]{3,}", s)} - STOP


def covers(text, phrase, need=1):
    k = keywords(phrase)
    if not k:
        return True
    low = text.lower()
    hits = sum(1 for w in k if w in low or (len(w) > 5 and w[:-2] in low))
    return hits >= min(need, len(k))


def ngrams(s, k=6):
    w = re.findall(r"[a-z']+", s.lower().replace('’', "'"))
    return {' '.join(w[i:i + k]) for i in range(len(w) - k + 1)}


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
        if count_words(s) > MAX_SENT and not (FRAME_START.match(s) and count_words(s) <= 32):
            r.warn(part, f'câu dài {count_words(s)} từ: "{s[:60]}…"')
        for rx, name in HARD:
            if rx.search(s):
                r.warn(part, f'cấu trúc khó ({name}): "{s[:60]}…"')


def check_w1(r, P, w1):
    p1 = P['writing']['1']
    t = w1.get('answer', '')
    wc = count_words(t)
    if wc < 120: r.err('W1', f'{wc} từ < 120')
    elif not 150 <= wc <= 180: r.warn('W1', f'{wc} từ (mục tiêu 150–180)')
    paras = paragraphs(t)
    need = len(p1['points']) + 4
    if len(paras) < need - 1: r.err('W1', f'{len(paras)} đoạn, cần lời chào + mở đầu + {len(p1["points"])} đoạn ý + kết + ký tên (= {need})')
    elif len(paras) != need: r.warn('W1', f'{len(paras)} đoạn (kỳ vọng {need})')
    if paras and not re.match(r'^(Dear|Hi|Hello)\b', paras[0]): r.err('W1', 'thiếu lời chào (Dear/Hi …)')
    body = paras[2:-2] if len(paras) > 4 else [t]
    for i, p in enumerate(body, 1):
        k = len(sentences(p))
        if k < 3: r.err('W1', f'đoạn ý {i} chỉ có {k} câu (cần 3–4: trả lời → lý do → chi tiết)')
    for pt in p1['points']:
        if not covers('\n'.join(body), pt): r.warn('W1', f'có thể chưa trả lời ý: "{pt[:60]}"')
        if re.search(r'\b(arrange|suggest|invite|meet|recommend|plan|when|where)\b', pt, re.I):
            if not TIME_RE.search(t) or not PLACE_RE.search(t):
                r.err('W1', f'ý "{pt[:40]}…" cần chi tiết cụ thể: thời gian + địa điểm')
    # register: greeting / sign-off pairing, contractions
    tpl = w1.get('template')
    if tpl not in W1_TEMPLATES:
        r.err('W1', f'template phải là {W1_TEMPLATES} (đang {tpl!r})')
    elif paras:
        greet, sign = paras[0], paras[-1].split('\n')[0].strip()
        if tpl == 'w1_formal':
            if not greet.startswith('Dear'): r.err('W1', 'thư trang trọng phải mở bằng "Dear …"')
            want = 'Yours faithfully,' if re.search(r'Sir or Madam', greet) else 'Yours sincerely,'
            if sign != want: r.err('W1', f'"{greet}" phải ký "{want}" (đang "{sign}")')
            c = [m.group(0) for m in CONTR.finditer(t)]
            if c: r.err('W1', f'thư trang trọng không viết tắt: {c[:4]}')
            if '!' in t: r.warn('W1', 'thư trang trọng không nên dùng dấu "!"')
        else:
            if re.search(r'Sir or Madam|Dear (Mr|Ms|Mrs|Dr|Professor)\b', greet): r.err('W1', f'"{greet}" là lời chào trang trọng, template phải là w1_formal')
            if not re.match(r'(Best wishes|All the best|Love|Take care|Best),?$', sign): r.err('W1', f'thư thân mật nên ký "Best wishes," (đang "{sign}")')
    if t.count('!') > 1: r.warn('W1', f'{t.count("!")} dấu "!" (tối đa 1)')
    cp = ngrams(t) & ngrams(' '.join(p1['quote']))
    if len(cp) >= 3: r.warn('W1', f'chép {len(cp)} cụm 6 từ từ đề, nên diễn đạt lại: "{sorted(cp)[0]}"')
    common_checks(r, 'W1', w1, t)


def check_w2(r, P, w2):
    p2 = P['writing']['2']
    t = w2.get('answer', '')
    wc = count_words(t)
    if wc < 250: r.err('W2', f'{wc} từ < 250')
    elif not 270 <= wc <= 300: r.warn('W2', f'{wc} từ (mục tiêu 270–300)')
    ps = paragraphs(t)
    if not w2.get('essay_type'): r.err('W2', 'thiếu dạng đề (essay_type)')
    tk = w2.get('type_key')
    if len(ps) != 4 or tk not in TYPE_KEYS:
        if len(ps) != 4: r.err('W2', f'{len(ps)} đoạn, cần đúng 4')
        if tk not in TYPE_KEYS: r.err('W2', f'type_key phải thuộc {list(TYPE_KEYS)} (đang {tk!r})')
        return common_checks(r, 'W2', w2, t)
    intro, b1, b2, concl = ps
    # intro: paraphrase, 2–3 sentences, 35–55 words
    q = ' '.join(p2['quote']) + ' ' + p2['instruction']
    cp = ngrams(intro) & ngrams(q)
    if len(cp) >= 4: r.err('W2', f'mở bài chép {len(cp)} cụm 6 từ từ đề, cần viết lại bằng lời khác: "{sorted(cp)[0]}"')
    ni, wi = len(sentences(intro)), count_words(intro)
    if not (2 <= ni <= 3 and 35 <= wi <= 55): r.warn('W2', f'mở bài {ni} câu / {wi} từ (mục tiêu 2–3 câu, 35–50 từ)')
    # PEER: examples in every body paragraph
    e1, e2 = len(EXAMPLE.findall(b1)), len(EXAMPLE.findall(b2))
    if e1 < 1 or e2 < 1: r.err('W2', f'mỗi thân bài cần ví dụ (For example/For instance…): đang {e1} / {e2}')
    if TYPE_KEYS[tk] == 1 and e2 < 2: r.err('W2', f'thân bài 2 ({tk}) gồm 2 PEER nên cần ≥2 ví dụ (đang {e2})')
    if TYPE_KEYS[tk] == 2 and e1 + e2 < 3: r.err('W2', f'{tk}: 2 + 2 ý cần ≥3 ví dụ (đang {e1 + e2})')
    if tk in ('opinion', 'discussion'):
        if not STANCE.search(intro): r.err('W2', f'{tk}: mở bài phải nêu quan điểm (I believe / In my opinion …)')
        if not STANCE.search(concl): r.err('W2', f'{tk}: kết bài phải nhắc lại quan điểm')
    if tk == 'opinion' and not CONCEDE.search(b1): r.err('W2', 'opinion: thân bài 1 phải nhượng bộ phía đối lập (Admittedly, some people argue that …)')
    if not re.match(r'(In conclusion|To sum up|To conclude)\b', concl): r.err('W2', 'kết bài nên mở bằng "In conclusion,"')
    for l in LINKERS:
        k = len(re.findall(r'\b' + re.escape(l) + r'\b', t, re.I))
        if k > 2: r.warn('W2', f'"{l}" dùng {k} lần (nên luân phiên)')
    rows = len(w2.get('outline') or [])
    need = 5 if TYPE_KEYS[tk] == 1 else 6
    if rows < need: r.warn('W2', f'dàn ý {rows} dòng; nên có mở bài + một dòng mỗi PEER + kết bài (= {need})')
    common_checks(r, 'W2', w2, t)


def check_speaking(r, P, A):
    # ---- Speaking 1
    s1 = A['speaking'].get('1') or {}
    qs = [q for tp in P['speaking']['1']['topics'] for q in tp['questions']]
    ans = s1.get('answers') or []
    if len(ans) != len(qs): r.err('S1', f'{len(ans)} câu trả lời / {len(qs)} câu hỏi')
    for i, a in enumerate(ans):
        k = len(sentences(a))
        if not 3 <= k <= 4: r.err('S1', f'câu {i + 1}: {k} câu (cần 3: trả lời → lý do → chi tiết)')
    common_checks(r, 'S1', s1, ' '.join(ans))
    # ---- Speaking 2
    s2, p2 = A['speaking'].get('2') or {}, P['speaking']['2']
    t = s2.get('answer', '')
    ch = s2.get('choice')
    if ch not in (1, 2, 3): r.err('S2', 'choice phải là 1, 2 hoặc 3')
    for i, o in enumerate(p2['options'], 1):
        if not covers(t, o): r.err('S2', f'chưa nhắc tới Option {i}: "{o[:40]}"')
    ss = sentences(t)
    if ch in (1, 2, 3):
        for i, o in enumerate(p2['options'], 1):
            if i == ch: continue
            idx = [j for j, s in enumerate(ss) if covers(s, o) and re.search(r"\b(regarding|as for|do not choose|don't choose|not choose)\b", s, re.I)]
            ok = any(NEG.search(' '.join(ss[j:j + 2])) and re.search(r'\bbecause\b', ' '.join(ss[j:j + 2]), re.I) for j in idx)
            if not ok: r.err('S2', f'Option {i} chưa bị bác bỏ rõ ràng (Regarding/As for … I do not think … because …)')
    if len(EXAMPLE.findall(t)) < 2: r.err('S2', f'cần ≥2 ví dụ (For example / For instance), đang {len(EXAMPLE.findall(t))}')
    if not re.search(r'\bTo sum up\b', t): r.err('S2', 'thiếu câu kết "To sum up, out of these three options…"')
    wc = count_words(t)
    if not 220 <= wc <= 260: r.warn('S2', f'{wc} từ (mục tiêu 220–260, khoảng 2 phút)')
    common_checks(r, 'S2', s2, t)
    # ---- Speaking 3
    s3, p3 = A['speaking'].get('3') or {}, P['speaking']['3']
    t = s3.get('answer', '')
    for idea in p3['ideas']:
        if not covers(t, idea): r.err('S3', f'chưa triển khai ý: "{idea[:50]}"')
    if not s3.get('own_idea') or not covers(t, s3.get('own_idea', '')): r.err('S3', 'thiếu ý riêng (own_idea) hoặc bài nói chưa nhắc tới')
    if not re.search(r'\b(To sum up|In conclusion)\b', t): r.err('S3', 'thiếu câu kết "To sum up, …"')
    wc = count_words(t)
    if not 200 <= wc <= 260: r.warn('S3', f'{wc} từ (mục tiêu 200–260)')
    fu = s3.get('follow_ups') or []
    if len(fu) != len(p3['follow_ups']): r.err('S3', f'{len(fu)} câu follow-up / {len(p3["follow_ups"])}')
    for i, a in enumerate(fu):
        k, w = len(sentences(a)), count_words(a)
        if not 3 <= k <= 5: r.err('S3', f'follow-up {i + 1}: {k} câu (cần 3–4: trả lời → lý do → ví dụ)')
        elif not 35 <= w <= 55: r.warn('S3', f'follow-up {i + 1}: {w} từ (mục tiêu 35–55)')
    common_checks(r, 'S3', s3, t + ' ' + ' '.join(fu))


def check(n):
    P, A, r = load_prompt(n), load_answer(n), Report(n)
    if not A:
        r.err('ALL', 'chưa có file answers'); return r
    W = A.get('writing') or {}
    check_w1(r, P, W.get('1') or {})
    check_w2(r, P, W.get('2') or {})
    if 'speaking' in P:
        if not A.get('speaking'): r.err('S', 'thiếu phần speaking')
        else: check_speaking(r, P, A)
    return r


if __name__ == '__main__':
    args = sys.argv[1:]
    quiet = '-q' in args
    nums = [a for a in args if a != '-q'] or [n for n in all_numbers() + custom_ids() if load_answer(n)]
    bad = 0
    for n in nums:
        r = check(n)
        status = 'ERROR' if r.errors else ('WARN' if r.warns else 'OK')
        print(f'{exam_id(n)}: {status}' + (f' ({len(r.errors)} lỗi, {len(r.warns)} lưu ý)' if quiet else ''))
        if not quiet:
            for e in r.errors: print('   ✗', e)
            for w in r.warns: print('   ·', w)
        bad += bool(r.errors)
    print(f'\n{len(nums) - bad}/{len(nums)} không có lỗi bắt buộc')
    sys.exit(1 if bad else 0)
