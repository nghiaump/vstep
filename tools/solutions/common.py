"""Shared helpers for the model-answer pipeline (prompts, answers, word counting)."""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
DE = ROOT / 'de-thi'
OUT = DE / 'loi-giai'
PROMPTS = OUT / 'prompts'
ANSWERS = OUT / 'answers'

WORD_RE = re.compile(r"[^\W_][\w'’-]*", re.UNICODE)


def count_words(s: str) -> int:
    """Same rule as the app's countWords(): letter/number runs incl. apostrophes and hyphens."""
    return len(WORD_RE.findall(s or ''))


def sentences(s: str):
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z"“‘\'(])', (s or '').strip())
    return [p for p in parts if count_words(p) > 0]


def paragraphs(s: str):
    return [p.strip() for p in re.split(r'\n\s*\n', (s or '').strip()) if p.strip()]


def all_numbers():
    return sorted(int(p.stem.split('-')[1]) for p in (DE / 'exams').glob('vlu-*.json'))


def load_prompt(n: int):
    return json.loads((PROMPTS / f'vlu-{n}.json').read_text())


def load_answer(n: int):
    p = ANSWERS / f'vlu-{n}.json'
    return json.loads(p.read_text()) if p.exists() else None
