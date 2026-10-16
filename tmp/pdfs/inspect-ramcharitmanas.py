from pathlib import Path
import collections
import hashlib
import json
import re
import sys
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'tmp/pdfs/ramcharitmanas'
WORK.mkdir(parents=True, exist_ok=True)
source = ROOT / 'frontend/public/library/shri-ramcharitmanas-gita-press.pdf'
manifest = json.loads((ROOT / 'library/documents/ramcharitmanas-hi.json').read_text(encoding='utf-8'))
assert hashlib.sha256(source.read_bytes()).hexdigest() == manifest['sha256']
pdf = pymupdf.open(source)
assert len(pdf) == manifest['pageCount']
print('Pages:', len(pdf), 'TOC:', [entry for entry in pdf.get_toc() if entry[0] == 1])
html_bytes = (WORK / 'chanakya-converter.html').read_bytes()
html = html_bytes.decode('utf-16' if html_bytes.startswith(b'\xff\xfe') else 'utf-8')
array = html.split('var array_one = new Array(', 1)[1].split('var array_one_length', 1)[0]
array = re.sub(r'/\*.*?\*/|//[^\n]*', '', array, flags=re.S)
pairs = re.findall(r'"([^"\n]*)"\s*,\s*"([^"\n]*)"', array)
pairs = [(a.replace('\\', ''), b) for a, b in pairs]
(WORK / 'mapping.json').write_text(json.dumps(pairs, ensure_ascii=False, indent=2), encoding='utf-8')
def decode(raw):
    raw = raw.replace('¤', '€')
    encoded = ''.join(chr(c) if c in (0x81,0x8d,0x8f,0x90,0x9d) else bytes([c]).decode('cp1252') for c in raw.encode('mac_roman'))
    for a, b in pairs:
        encoded = encoded.replace(a, b)
    encoded = re.sub(r'ç([^\s])((?:्[^\s])*)', r'\1\2ि', encoded)
    encoded = re.sub(r'([\u0904-\u0939\u0958-\u095f](?:्[\u0915-\u0939])*[ािीुूृेैोौंःँॅ]*)ü', r'र्\1', encoded)
    return encoded
fonts = collections.Counter()
pages = []
layout = []
unknown = collections.Counter()
for number, page in enumerate(pdf, 1):
    data = page.get_text('dict', flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)
    spans = [span for block in data['blocks'] for line in block.get('lines', []) for span in line['spans']]
    fonts.update(span['font'] for span in spans)
    for span in spans:
        if 'Chanakya' in span['font']:
            try:
                span['decoded'] = decode(span['text'])
                unknown.update(c for c in span['decoded'] if not ('\u0900' <= c <= '\u097f' or c in ' \n\t0123456789.,;:!?-—–()[]{}\"\'।॥'))
            except UnicodeError as error:
                span['decoded'] = 'ENCODING ERROR ' + str(error)
        else:
            span['decoded'] = span['text']
    layout.append(data)
    pages.append({'page': number, 'chars': sum(len(s['text']) for s in spans), 'fonts': sorted(set(s['font'] for s in spans))})
print('Fonts:', fonts)
print('Low text pages:', [p for p in pages if p['chars'] < 100])
print('Unconverted:', unknown)
for number in [3, 5, 19, 31, 100, 1057]:
    page = pdf[number - 1]
    print('PAGE', number, '\n', '\n'.join(''.join(s['decoded'] for s in line['spans']) for b in layout[number-1]['blocks'] for line in b.get('lines',[]))[:1800])
for number in [4, 18, 19, 344, 345, 620, 621, 682, 683, 714, 715, 772, 773, 906, 907, 1040, 1056, 1057]:
    pdf[number - 1].get_pixmap(matrix=pymupdf.Matrix(1.2, 1.2)).save(WORK / f'page-{number}.png')
(WORK / 'layout.json').write_text(json.dumps(layout, ensure_ascii=False), encoding='utf-8')
examples = {}
for number, page in enumerate(pdf, 1):
    raw = page.get_text('rawdict', flags=pymupdf.TEXTFLAGS_RAWDICT & ~pymupdf.TEXT_PRESERVE_IMAGES)
    for block in raw['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                if 'Chanakya' not in span['font']:
                    continue
                for char in span['chars']:
                    c = char['c']
                    if c.isspace() or c in examples:
                        continue
                    box = pymupdf.Rect(char['bbox'])
                    if box.width > 0.2 and box.height > 1:
                        examples[c] = (number, box, span['text'] if 'text' in span else '')
symbols = sorted(examples, key=ord)
atlas = pymupdf.open()
for offset in range(0, len(symbols), 90):
    target = atlas.new_page(width=900, height=1200)
    for i, c in enumerate(symbols[offset:offset+90]):
        col, row = i % 5, i // 5
        x, y = col * 180, row * 66
        number, box, _ = examples[c]
        clip = pdf[number-1].get_pixmap(matrix=pymupdf.Matrix(3,3), clip=box)
        target.insert_text((x+4,y+11), f'U+{ord(c):04X} p{number}', fontsize=9)
        target.insert_image(pymupdf.Rect(x+3,y+15,x+160,y+62), pixmap=clip)
    target.get_pixmap().save(WORK / f'glyphs-{offset//90}.png')
(WORK / 'inventory.json').write_text(json.dumps(pages, indent=2), encoding='utf-8')
