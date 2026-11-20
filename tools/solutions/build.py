"""Render de-thi/loi-giai/vlu-N.md (+ README index) from verbatim prompts + answer JSON.
Usage: python3 build.py [N ...]   (default: every exam that has an answer file)"""
import sys
from common import OUT, count_words, all_numbers, load_prompt, load_answer, paragraphs
from check import check

WPM = 120  # speaking pace used for duration estimates


def esc(s):
    return str(s).replace('|', '\\|').replace('\n', ' ')


def quote(lines):
    """Blockquote; consecutive list items stay tight, other lines become separate paragraphs."""
    out = []
    for i, l in enumerate(lines):
        is_item = l.startswith('- ') or l[:3].rstrip('.').isdigit()
        prev_item = i > 0 and (lines[i - 1].startswith('- ') or lines[i - 1][:3].rstrip('.').isdigit())
        if i > 0 and not (is_item and prev_item):
            out.append('>')
        out.append('> ' + l)
    return '\n'.join(out)


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join(['---'] * len(head)) + '|']
    out += ['| ' + ' | '.join(esc(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)


def outline_tbl(sec):
    return table(['Đoạn', 'Nội dung', 'Câu mẫu dùng lại'], [(o['section'], o['content'], f"*{o['reusable']}*") for o in sec.get('outline', [])])


def vocab_tbl(sec):
    return table(['Từ / cụm từ', 'Nghĩa'], [(f"**{v['term']}**", v['meaning']) for v in sec.get('vocab', [])])


def essay(text):
    return '\n\n'.join(p.replace('\n', '  \n') for p in paragraphs(text))


def mins(words):
    s = round(words / WPM * 60)
    return f'{s // 60} phút {s % 60:02d} giây' if s >= 60 else f'{s} giây'


def render(n):
    P, A = load_prompt(n), load_answer(n)
    md = [f"# VLU {n} · Bài giải tham khảo Writing & Speaking",
          '',
          '*Mục tiêu 5–6 điểm: câu ngắn, ngữ pháp an toàn, dễ học thuộc. Đề được chép nguyên văn từ đề thi; số từ đếm bằng công cụ.*',
          '']
    # ---------------- Writing
    for k in ('1', '2'):
        p, a = P['writing'][k], A['writing'][k]
        wc = count_words(a['answer'])
        md += [f"## {p['title']} · {p['kind']}", '',
               f"**Thời gian:** {p['time']} · **Số từ tối thiểu:** {p['min_words']}", '',
               '### 1. Đề bài', '']
        md += ['\n\n'.join(p['intro']), '', quote(p['quote']), '', f"**{p['instruction']}**", '']
        md += ['### 2. Bài mẫu', '']
        if k == '2':
            md += [f"**Dạng đề:** {a['essay_type']}", '']
        md += [essay(a['answer']), '',
               '### 3. Số từ', '',
               f"**{wc} từ** (đếm bằng công cụ) · {'đạt' if wc >= p['min_words'] else 'CHƯA ĐẠT'} mức tối thiểu {p['min_words']} từ.", '',
               '### 4. Khung dàn ý', '', outline_tbl(a), '',
               '### 5. Từ vựng đáng học', '', vocab_tbl(a), '']
    # ---------------- Speaking
    S, SA = P['speaking'], A['speaking']
    # Part 1
    p, a = S['1'], SA['1']
    qs = [q for t in p['topics'] for q in t['questions']]
    lines, i = [], 0
    for t in p['topics']:
        lines.append(f"**{t['lead']} {t['title']}**")
        for q in t['questions']:
            i += 1; lines.append(f"{i}. {q}")
    wc = count_words(' '.join(a['answers']))
    md += [f"## {p['title']} · {p['name']}", '', f"**Thời gian:** {p['time']}", '', '### 1. Đề bài', '', quote(lines), '',
           '### 2. Bài mẫu', '']
    for j, (q, ans) in enumerate(zip(qs, a['answers']), 1):
        md += [f"**{j}. {q}**  ", ans, '']
    md += ['### 3. Số từ', '', f"**{wc} từ** · khoảng {mins(wc)} nói (tốc độ {WPM} từ/phút).", '',
           '### 4. Khung dàn ý', '', outline_tbl(a), '', '### 5. Từ vựng đáng học', '', vocab_tbl(a), '']
    # Part 2
    p, a = S['2'], SA['2']
    wc = count_words(a['answer'])
    lines = [p['situation'], 'You are considering the following options:'] + [f"- Option {k}: {o}" for k, o in enumerate(p['options'], 1)] + [p['task']]
    md += [f"## {p['title']} · {p['name']}", '', f"**Thời gian:** {p['time']}", '', '### 1. Đề bài', '', quote(lines), '',
           '### 2. Bài mẫu', '', f"**Lựa chọn:** Option {a['choice']}: {p['options'][a['choice'] - 1]}", '',
           essay(a['answer']), '',
           '### 3. Số từ', '', f"**{wc} từ** · khoảng {mins(wc)} nói.", '',
           '### 4. Khung dàn ý', '', outline_tbl(a), '', '### 5. Từ vựng đáng học', '', vocab_tbl(a), '']
    # Part 3
    p, a = S['3'], SA['3']
    wc = count_words(a['answer'])
    wf = count_words(' '.join(a['follow_ups']))
    lines = [f"Topic: {p['topic']}", f"Mind map, {p['center']}:"] + [f"- {x}" for x in p['ideas']] + (['- [your own ideas]'] if p['own_ideas_slot'] else []) + \
            ['Follow-up questions:'] + [f"{k}. {q}" for k, q in enumerate(p['follow_ups'], 1)]
    md += [f"## {p['title']} · {p['name']}", '', f"**Thời gian:** {p['time']}", '', '### 1. Đề bài', '', quote(lines), '',
           '### 2. Bài mẫu', '', f"**Ý riêng (your own idea):** {a['own_idea']}", '', essay(a['answer']), '',
           '**Trả lời câu hỏi follow-up**', '']
    for k, (q, ans) in enumerate(zip(p['follow_ups'], a['follow_ups']), 1):
        md += [f"**{k}. {q}**  ", ans, '']
    md += ['### 3. Số từ', '', f"**Bài nói chính: {wc} từ** (khoảng {mins(wc)}) · follow-up: {wf} từ.", '',
           '### 4. Khung dàn ý', '', outline_tbl(a), '', '### 5. Từ vựng đáng học', '', vocab_tbl(a), '']
    text = '\n'.join(md).rstrip() + '\n'
    (OUT / f'vlu-{n}.md').write_text(text)
    return text


def index(nums):
    rows = []
    for n in sorted(nums, reverse=True):
        A = load_answer(n)
        r = check(n)
        st = 'lỗi' if r.errors else ('lưu ý' if r.warns else 'đạt')
        w1, w2 = count_words(A['writing']['1']['answer']), count_words(A['writing']['2']['answer'])
        rows.append((f'[VLU {n}](vlu-{n}.md)', str(w1), str(w2), A['writing']['2'].get('essay_type', '').split(' (')[0], st))
    md = ['# Bài giải tham khảo VSTEP · Đề Văn Lang', '',
          'Writing Part 1 + 2 và Speaking Part 1–3 cho từng đề, mục tiêu 5–6 điểm. Đề chép nguyên văn; số từ đếm bằng công cụ.', '',
          f'- PDF từng đề: `pdf/vlu-N.pdf` · PDF gộp: `pdf/VSTEP-VLU-{min(nums)}-{max(nums)}-bai-mau.pdf`',
          '- Dữ liệu: `prompts/` (đề nguyên văn), `answers/` (bài giải, JSON)', '',
          table(['Đề', 'W1 (từ)', 'W2 (từ)', 'Dạng đề W2', 'Kiểm tra'], rows), '']
    (OUT / 'README.md').write_text('\n'.join(md))


if __name__ == '__main__':
    nums = [int(x) for x in sys.argv[1:]] or [n for n in all_numbers() if load_answer(n)]
    for n in nums:
        render(n)
    index([n for n in all_numbers() if load_answer(n)])
    print('rendered', len(nums))
