"""Derive reader structure from the original PDF's printed colors, without editing text.

Requires the existing OCR venv's PyMuPDF. The PDF's legacy Unicode is used only
to align typography with the already-decoded draft, never to replace scripture.
"""
from pathlib import Path
from collections import Counter
from difflib import SequenceMatcher
import hashlib
import json
import re
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SOURCE = '992c71ecb2a16913c2fb578ae51f3a73d6288109f133b10b811d1b976f8698e3'
RED, BLUE, TOPIC, CAPTION = 0xc00000, 0x2060, 0x365f91, 0x3c4043


def sha(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()


def utf16(text):
    return len(text.encode('utf-16-le')) // 2


def source_styles(draft, pdf):
    pages = {}
    starts = set()
    contents = '\n'.join(p['text'] for p in draft['sections'][0]['passages'] if 2 <= p['sourcePage'] <= 5)
    for section in draft['sections']:
        if not section['slug'].startswith('chapter-'):
            continue
        starts.add(section['passages'][0]['sourcePage'])
        for passage in section['passages']:
            pages.setdefault(passage['sourcePage'], []).append(passage)
    evidence = {}
    for number, passages in pages.items():
        lines = []
        for block in pdf[number-1].get_text('dict')['blocks']:
            for line in block.get('lines', []):
                # The original import omits repeated footer labels. Chapter
                # titles are already stored as section titles, not passages.
                spans = [s for s in line['spans'] if s['text'].strip() and s['bbox'][1] < 510]
                if not spans or (number in starts and any('Bold' in s['font'] and s['size'] >= 13.9 for s in spans)):
                    continue
                lines.append((line['bbox'][1], spans))
        lines.sort(key=lambda line: line[0])
        printed = [(c, s['color'], round(s['size'], 1)) for _, spans in lines for s in spans for c in s['text'] if not c.isspace()]
        decoded = [(c, p['reference']) for p in passages for c in p['text'] if not c.isspace()]
        matcher = SequenceMatcher(None, ''.join(c for c, _ in decoded), ''.join(c for c, _, _ in printed), autojunk=False)
        counts, sizes = {}, {}
        for match in matcher.get_matching_blocks():
            for offset in range(match.size):
                ref = decoded[match.a+offset][1]
                _, color, size = printed[match.b+offset]
                counts.setdefault(ref, Counter())[color] += 1
                sizes.setdefault(ref, Counter())[size] += 1
        for passage in passages:
            ref, text = passage['reference'], passage['text']
            count = counts[ref]
            color, matched = count.most_common(1)[0]
            purity = matched / sum(count.values())
            coverage = sum(count.values()) / len(re.sub(r'\s', '', text))
            # Short headings have fewer matching glyphs. Require their exact
            # decoded title to occur in the source's printed contents as well.
            if purity < .9 or coverage < .55:
                assert color == TOPIC and text in contents, f'Ambiguous source style: {ref}'
            assert color in (RED, BLUE, TOPIC, CAPTION, 0), f'Unknown source color: {ref}'
            evidence[ref] = {'sourcePage': number, 'color': color, 'fontSize': sizes[ref].most_common(1)[0][0],
                             'coverage': round(coverage, 5), 'purity': round(purity, 5)}
    return evidence


def build_layout(draft, evidence):
    result = {'version': 1, 'source': draft['source'], 'status': 'unreviewed-draft',
              'method': 'Original PDF typography aligned to unchanged decoded passages', 'styleEvidence': evidence, 'sections': {}}
    for section in draft['sections']:
        blocks, hashes = [], {}
        pending = []
        pending_page = None

        def flush_verse():
            nonlocal pending
            if pending:
                blocks.append({'kind': 'verse', 'sourcePage': pending_page, 'keepTogether': True, 'parts': pending})
                pending = []

        for passage in section['passages']:
            ref, text, page = passage['reference'], passage['text'], passage['sourcePage']
            hashes[ref] = sha(text)
            style = evidence.get(ref)
            kind = 'paragraph'
            if style:
                if text in ('॥ श्री हरि ॥', '॥ मनुस्मृति ॥') or 'अध्याय समाप्त' in text or 'ऽध्यायः समाप्त' in text or 'धर्म शास्त्र समाप्त' in text:
                    kind = 'source-note'
                elif style['color'] == TOPIC:
                    kind = 'topic'
                elif style['color'] == RED:
                    kind = 'verse'
                elif style['color'] in (BLUE, CAPTION) or style['fontSize'] < 11:
                    kind = 'source-note'
            elif section['slug'] == 'front-matter':
                if 2 <= page <= 5:
                    kind = 'topic' if text == 'विषय सूची' else 'contents-entry'
                elif text in ('प्रस्तावना', 'मनुस्मृति'):
                    kind = 'topic'
                elif page == 1 or text == '॥ श्री हरि ॥':
                    kind = 'source-note'
            if kind == 'verse':
                start = 0
                for line in text.splitlines(keepends=True):
                    if not pending:
                        pending_page = page
                    end = start + utf16(line)
                    pending.append({'reference': ref, 'start': start, 'end': end})
                    start = end
                    if re.search(r'॥\s*[०-९0-9]+\s*॥\s*$', line):
                        flush_verse()
                assert start == utf16(text)
            else:
                flush_verse()
                part = {'reference': ref, 'start': 0, 'end': utf16(text)}
                previous = blocks[-1] if blocks else None
                # Rejoin only prose broken by a source-page boundary. Verse,
                # explanation, subheading and footnote boundaries remain intact.
                if kind == 'paragraph' and previous and previous['kind'] == kind and previous['sourcePage'] != page:
                    prior = next(p for p in section['passages'] if p['reference'] == previous['parts'][-1]['reference'])
                    if not re.search(r'[।॥.!?]\s*$', prior['text']):
                        previous['parts'].append(part)
                        continue
                block = {'kind': kind, 'sourcePage': page, 'parts': [part]}
                if kind == 'topic': block['keepWithNext'] = True
                if kind == 'contents-entry': block['keepTogether'] = True
                blocks.append(block)
        flush_verse()
        for passage in section['passages']:
            end = 0
            for block in blocks:
                for part in block['parts']:
                    if part['reference'] != passage['reference']: continue
                    assert part['start'] == end and part['end'] > end, 'Duplicate or missing source range'
                    end = part['end']
            assert end == utf16(passage['text']), 'Incomplete source coverage'
        result['sections'][section['slug']] = {'hashes': hashes, 'blocks': blocks}
    return result


def main():
    draft = json.loads((ROOT/'library/editions/drafts/manusmriti-hi.json').read_text(encoding='utf8'))
    source = ROOT/'frontend/public/library/manusmriti-sampurna.pdf'
    assert hashlib.sha256(source.read_bytes()).hexdigest() == SOURCE == draft['sourceSha256']
    assert draft['expectedPassages'] == 1867 and len(draft['sections']) == 14
    with pymupdf.open(source) as pdf:
        assert len(pdf) == 509
        evidence = source_styles(draft, pdf)
    result = build_layout(draft, evidence)
    target = ROOT/'backend/data/layouts/manusmriti.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf8')
    print(json.dumps({'sections': len(result['sections']), 'passages': 1867, 'blocks': dict(Counter(b['kind'] for s in result['sections'].values() for b in s['blocks']))}))


if __name__ == '__main__':
    main()
