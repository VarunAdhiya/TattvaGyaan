"""Validate all Garuda OCR checkpoints and export an explicitly unreviewed draft.

Run ocr-garuda-purana.py first. This exporter never contacts the database and
refuses incomplete coverage, altered checkpoints, or overwriting changed output.
"""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import re

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('garuda_ocr', Path(__file__).with_name('ocr-garuda-purana.py'))
ocr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr)
MANUAL = ROOT / 'backend/data/transcription-manual/garuda-pages.json'
OUTPUT = ROOT / 'library/editions/drafts/garuda-purana-hi.json'
DIVISIONS = [
    (1, 6, 'front-matter', 'मुखपृष्ठ और प्रकाशकीय विवरण'),
    (7, 13, 'contents', 'विषय-सूची'),
    (14, 455, 'achara-kanda', 'आचारकाण्ड'),
    (456, 613, 'dharma-kanda', 'धर्मकाण्ड—प्रेतकल्प'),
    (614, 635, 'brahma-kanda', 'ब्रह्मकाण्ड'),
    (636, 638, 'back-covers', 'अन्तिम आवरण'),
]


def digest(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()


def blocks(lines, maximum_lines=8, maximum_characters=600):
    """Bound reader blocks without rephrasing, joining words, or losing lines."""
    result, current = [], []
    for line in lines:
        assert line.strip(), 'Unexpected empty source line'
        if current and (len(current) >= maximum_lines or
                        len('\n'.join(current + [line])) > maximum_characters):
            result.append('\n'.join(current))
            current = []
        current.append(line)
    if current:
        result.append('\n'.join(current))
    assert '\n'.join(result) == '\n'.join(lines), 'Passage grouping lost source text'
    return result


def load_page(number, manual):
    if number in manual['blankPages']:
        return [], {'page': number, 'method': 'visually-checked-blank', 'textSha256': digest('')}
    if str(number) in manual['pages']:
        text = manual['pages'][str(number)]
        return text.splitlines(), {
            'page': number, 'method': 'visual-transcription', 'textSha256': digest(text),
            'characters': len(text), 'regions': [],
        }
    file = ocr.checkpoint_path(number)
    if not file.exists():
        raise ValueError(f'Missing OCR page {number}; run ocr-garuda-purana.py before exporting')
    data = json.loads(file.read_text(encoding='utf8'))
    expected = ocr.checkpoint_identity(number)
    if data['identity'] != expected or data['reviewStatus'] != 'unreviewed-draft':
        raise ValueError(f'Page {number}: checkpoint identity mismatch')
    raw = '\n'.join(region['text'] for region in data['regions'])
    if digest(raw) != data['textSha256']:
        raise ValueError(f'Page {number}: checkpoint text hash mismatch')
    lines, regions = [], []
    for region in data['regions']:
        if '\n'.join(region['lines']).strip() != region['text']:
            raise ValueError(f'Page {number}: inconsistent OCR lines')
        first = len(lines) + 1
        lines.extend(line for line in region['lines'] if line.strip())
        regions.append({key: region[key] for key in ['kind', 'top', 'bottom', 'inkPixels']})
        regions[-1].update({'firstLine': first if len(lines) >= first else None,
                           'lineCount': len(lines) - first + 1,
                           'textSha256': digest(region['text'])})
    if not lines:
        raise ValueError(f'Page {number}: OCR returned no text; inspect the original')
    text = '\n'.join(lines)
    if re.search('[\ue000-\uf8ff\ufffd]', text):
        raise ValueError(f'Page {number}: invalid or undecoded characters')
    return lines, {'page': number, 'method': 'column-aware-ocr',
                   'checkpointSha256': hashlib.sha256(file.read_bytes()).hexdigest(),
                   'rawTextSha256': data['textSha256'], 'textSha256': digest(text),
                   'characters': len(text), 'regions': regions,
                   'illustrationMasks': expected.get('illustrationMasks', [])}


def export():
    manifest = json.loads((ROOT / 'library/documents/garuda-purana-hi.json').read_text(encoding='utf8'))
    manual = json.loads(MANUAL.read_text(encoding='utf8'))
    assert manifest['sha256'] == manual['sourceSha256'] == ocr.SOURCE_SHA
    assert hashlib.sha256(ocr.SOURCE.read_bytes()).hexdigest() == ocr.SOURCE_SHA
    assert set(map(int, manual['pages'])) | set(manual['blankPages']) == ocr.MANUAL_PAGES
    assert not set(map(int, manual['pages'])) & set(manual['blankPages'])
    assert manual['status'] == 'unreviewed-draft'
    sections, audit_pages, plain = [], [], []
    for first, last, slug, title in DIVISIONS:
        section = {'slug': slug, 'title': title, 'sortOrder': len(sections) + 1, 'passages': []}
        for number in range(first, last + 1):
            lines, audit = load_page(number, manual)
            chunks = blocks(lines)
            audit['passages'] = []
            line_number = 1
            for chunk in chunks:
                order = len(section['passages']) + 1
                reference = f'{section["sortOrder"]}.{order}'
                count = len(chunk.splitlines())
                method = ('Visual transcription of cover, publisher details or illustration captions.'
                          if audit['method'] == 'visual-transcription' else
                          'Column-aware Hindi OCR; original line order retained. OCR spelling, spacing, running headers and ornament recognition need review.')
                section['passages'].append({
                    'reference': reference, 'text': chunk, 'sortOrder': order, 'sourcePage': number,
                    'sourceNotes': f'Local reading block, not a canonical verse number. {method} Source transcription lines {line_number}–{line_number + count - 1}.',
                })
                audit['passages'].append(reference)
                line_number += count
            assert digest('\n'.join(chunks)) == audit['textSha256']
            audit_pages.append(audit)
            plain.append(f'=== PDF page {number} | {title} ===\n' + '\n'.join(lines))
        section['expectedPassages'] = len(section['passages'])
        assert section['expectedPassages'] > 0
        sections.append(section)
    assert [p['page'] for p in audit_pages] == list(range(1, 639))
    provenance = (
        'Source: user-supplied Garuda Purana Original upayogibooks.com.pdf, SHA-256 verified against the catalog PDF. '
        'The printed title identifies संक्षिप्त गरुडपुराण, an abridged Hindi Gita Press edition, book code 1189, ISBN 81-293-0285-3. '
        'Translator/editor not identified; the filename is not evidence of an unabridged original. '
        'All 638 original PDF pages, artwork and watermarks are preserved byte-for-byte. '
        '620 pages transcribed using PyMuPDF/Tesseract Hindi tessdata_best 4.1.0 at 300 dpi, using embedded scan images as derived OCR input. '
        'Curved column dividers, intervening full-width headings and footnotes determine reading order. '
        'Visually located inline illustrations on 24 pages are masked in derived OCR inputs; the opening illustration on page 456 is also excluded. '
        '16 covers/publisher/illustration pages manually transcribed from rendered pages; two blank printed pages visually classified separately. '
        'Six navigation sections group front matter, contents, the three printed kandas and back covers; individual printed chapters are not separately indexed. '
        'Reading blocks retain OCR line breaks and source-page references; they are not canonical verse numbers. '
        'All nonempty OCR lines are retained, including running headers and possible ornament-recognition artifacts. '
        'OCR spelling, word spacing, Sanskrit recognition and layout still need editorial review. '
        'Coverage and sample checks do not establish accurate transcription of every printed word. '
        'Explicit unreviewed draft; the original scan edition is preserved. Reuse license remains unverified.'
    )
    edition = {key: manifest[key] for key in ['scriptureSlug', 'language', 'script', 'isOriginal', 'textDirection', 'license']}
    edition.update({
        'title': 'संक्षिप्त गरुडपुराण — गीताप्रेस, हिन्दी (असमीक्षित OCR पाठ)',
        'translator': None, 'source': f'urn:sha256:{ocr.SOURCE_SHA}', 'provenance': provenance,
        'expectedPassages': sum(s['expectedPassages'] for s in sections),
        'reviewStatus': 'unreviewed-draft', 'sourceDocument': manifest['source'],
        'sourceSha256': ocr.SOURCE_SHA, 'sourcePageCount': 638,
        'illustrationOnlyPages': [], 'blankPages': manual['blankPages'],
        'blankPageVerification': manual['blankPageVerification'], 'sections': sections,
    })
    audit = {'sourceSha256': ocr.SOURCE_SHA, 'sourcePages': 638, 'textPages': 636,
             'ocrPages': 620, 'manualTextPages': 16, 'blankPages': manual['blankPages'],
             'recipe': ocr.RECIPE, 'modelUrl': ocr.MODEL_URL, 'modelSha256': ocr.MODEL_SHA,
             'manualDataSha256': digest(json.dumps(manual, ensure_ascii=False, sort_keys=True, separators=(',', ':'))),
             'reviewStatus': 'unreviewed-draft', 'expectedPassages': edition['expectedPassages'],
             'pages': audit_pages}
    return edition, audit, '\n\n'.join(plain) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Write JSON, coverage audit and UTF-8 text after validation')
    args = parser.parse_args()
    edition, audit, plain = export()
    payloads = {
        OUTPUT: json.dumps(edition, ensure_ascii=False, indent=2) + '\n',
        OUTPUT.with_suffix('.audit.json'): json.dumps(audit, ensure_ascii=False, indent=2) + '\n',
        OUTPUT.with_suffix('.txt'): plain,
    }
    # Validate every target before writing any output. Identical reruns are safe.
    for target, content in payloads.items():
        if target.exists() and target.read_text(encoding='utf8') != content:
            raise ValueError(f'Refusing changed existing export: {target}; review differences before replacing it')
    if args.write:
        for target, content in payloads.items():
            if not target.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content, encoding='utf8', newline='\n')
    print(json.dumps({'sourcePages': 638, 'textPages': 636, 'blankPages': audit['blankPages'],
                      'sections': len(edition['sections']), 'passages': edition['expectedPassages'],
                      'written': args.write, 'status': 'unreviewed-draft'}))


if __name__ == '__main__':
    main()
