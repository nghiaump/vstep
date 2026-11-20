"""Merge grabbed speaking exams (JSON list on stdin: [{id, title, parts}]) into de-thi/speaking/."""
import json, sys, pathlib, re
out = pathlib.Path(__file__).resolve().parent.parent / 'de-thi' / 'speaking'
out.mkdir(parents=True, exist_ok=True)
db_path = out / 'data.json'
db = json.loads(db_path.read_text()) if db_path.exists() else {}
for ex in json.load(sys.stdin):
    if not ex.get('parts') or not all(ex['parts']):
        print('SKIP (incomplete):', ex.get('id'), ex.get('error')); continue
    db[str(ex['id'])] = {'title': ex['title'], 'parts': ex['parts']}
    md = [f"# {ex['title']} · Speaking", f"Nguồn: https://vstepowl.com/exam-reviews/de-thi/?exam=vlu-exam-{ex['id']}&skill=speaking", '']
    for p in ex['parts']:
        lines = p.split('\n'); md.append('## ' + lines[0].title().replace('—', '-')); md += lines[1:]; md.append('')
    (out / f"vlu-{ex['id']}.md").write_text('\n'.join(md))
    print('saved', ex['id'])
db_path.write_text(json.dumps(dict(sorted(db.items(), key=lambda kv: -int(kv[0]))), ensure_ascii=False, indent=1))
print('total exams:', len(db))
