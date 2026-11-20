"""Before/after metrics for the audit against the study materials (doi-chieu/README.md).
Usage: python3 audit.py [answers_dir ...]   (default: answers-v1 answers)"""
import json, re, sys
from common import OUT, all_numbers, count_words, paragraphs, sentences, load_prompt
from check import EXAMPLE, ngrams

def metrics(d):
    nums = [n for n in all_numbers() if (OUT / d / f'vlu-{n}.json').exists()]
    A = {n: json.loads((OUT / d / f'vlu-{n}.json').read_text()) for n in nums}
    P = {n: load_prompt(n) for n in nums}
    m = {}
    w1 = [count_words(A[n]['writing']['1']['answer']) for n in nums]
    short = sum(any(len(sentences(p)) < 3 for p in paragraphs(A[n]['writing']['1']['answer'])[2:-2]) for n in nums)
    m['W1: số từ (min–max)'] = f'{min(w1)}–{max(w1)}'
    m['W1: thư có đoạn ý < 3 câu'] = short
    m['W1: thư có ≥ 2 dấu "!"'] = sum(A[n]['writing']['1']['answer'].count('!') >= 2 for n in nums)
    w2 = [count_words(A[n]['writing']['2']['answer']) for n in nums]
    m['W2: số từ (min–max)'] = f'{min(w2)}–{max(w2)}'
    m['W2: bài dưới 270 từ'] = sum(w < 270 for w in w2)
    m['W2: có đoạn thân bài không có ví dụ'] = sum(any(not EXAMPLE.search(p) for p in paragraphs(A[n]['writing']['2']['answer'])[1:3]) for n in nums)
    m['W2: mở bài chép ≥ 4 cụm 6 từ của đề'] = sum(len(ngrams(paragraphs(A[n]['writing']['2']['answer'])[0]) & ngrams(' '.join(P[n]['writing']['2']['quote']) + ' ' + P[n]['writing']['2']['instruction'])) >= 4 for n in nums)
    m['W2: có type_key theo khung'] = sum(bool(A[n]['writing']['2'].get('type_key')) for n in nums)
    s1 = [len(sentences(a)) for n in nums for a in A[n]['speaking']['1']['answers']]
    m['S1: câu trả lời chỉ 2 câu'] = sum(k < 3 for k in s1)
    s2 = [count_words(A[n]['speaking']['2']['answer']) for n in nums]
    m['S2: số từ (trung bình)'] = round(sum(s2) / len(s2))
    m['S2: bài có < 2 ví dụ'] = sum(len(EXAMPLE.findall(A[n]['speaking']['2']['answer'])) < 2 for n in nums)
    m['S2: kết bằng "To sum up, out of these three options"'] = sum('To sum up, out of these three options' in A[n]['speaking']['2']['answer'] for n in nums)
    fu = [count_words(x) for n in nums for x in A[n]['speaking']['3']['follow_ups']]
    m['S3: follow-up (từ, trung bình)'] = round(sum(fu) / len(fu))
    m['S3: follow-up < 3 câu'] = sum(len(sentences(x)) < 3 for n in nums for x in A[n]['speaking']['3']['follow_ups'])
    return len(nums), m

if __name__ == '__main__':
    dirs = sys.argv[1:] or ['answers-v1', 'answers']
    res = [metrics(d) for d in dirs]
    print('| Chỉ số | ' + ' | '.join(f'{d} ({k} đề)' for d, (k, _) in zip(dirs, res)) + ' |')
    print('|---|' + '---|' * len(dirs))
    for key in res[0][1]:
        print(f'| {key} | ' + ' | '.join(str(m[key]) for _, m in res) + ' |')
