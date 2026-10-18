from pathlib import Path
import json, hashlib, shutil, sys, re
import pymupdf
sys.stdout.reconfigure(encoding='utf-8')
root = Path(__file__).resolve().parents[2]
source = Path('C:/Users/91932/Downloads/Garuda Purana Original upayogibooks.com.pdf')
expected = 'c05368e6b60c64f58b2b86b8a9375d483259cd81d6b2469faaafb4a698a6dcb0'
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
out = root / 'tmp/pdfs/garuda-reader'
out.mkdir(parents=True, exist_ok=True)
if '--restore' in sys.argv:
    for target in [root / 'frontend/public/library/garuda-purana.pdf', root / 'backend/data/source-pdfs/garuda-purana.pdf']:
        if target.exists():
            assert hashlib.sha256(target.read_bytes()).hexdigest() == expected
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        print('Verified original:', target.relative_to(root))
data = json.loads((root / 'library/editions/drafts/garuda-purana-hi.json').read_text(encoding='utf8'))
audit = json.loads((root / 'library/editions/drafts/garuda-purana-hi.audit.json').read_text(encoding='utf8'))
pages = {}
for section in data['sections']:
    print('SECTION', section['slug'], len(section['passages']))
    for passage in section['passages']:
        pages.setdefault(passage['sourcePage'], []).append(passage)
doc = pymupdf.open(source)
for number in [7, 14, 20, 21, 456, 614]:
    doc[number-1].get_pixmap(matrix=pymupdf.Matrix(1.3, 1.3)).save(out / f'source-{number}.png')
candidates = []
for page in audit['pages']:
    lines = '\n'.join(p['text'] for p in pages.get(page['page'], [])).splitlines()
    for region in page.get('regions', []):
        if region['kind'] == 'full-width' and region.get('firstLine') and region['lineCount'] < 9:
            start = region['firstLine'] - 1
            candidates.append({'page': page['page'], 'top': region['top'], 'line': start+1, 'text': '\n'.join(lines[start:start+region['lineCount']])})
(out / 'heading-candidates.json').write_text(json.dumps(candidates, ensure_ascii=False, indent=2), encoding='utf8')
print('FULL-WIDTH CANDIDATES', len(candidates))
filtered = []
for c in candidates:
    if c['page'] < 14 or c['page'] > 635 or c['top'] == 12: continue
    lines = c['text'].splitlines()
    title_lines = [line for line in lines if len(line) > 12]
    title = ' '.join(title_lines)
    if title and len(title) < 240 and not re.search('[।॥?]|^\s*[१-९1-9][.\-]', title):
        filtered.append(c)
for i,c in enumerate(filtered): print(i, c['page'], c['line'], repr(c['text']))
(out / 'filtered-headings.json').write_text(json.dumps(filtered, ensure_ascii=False, indent=2), encoding='utf8')
print('FILTERED', len(filtered))
