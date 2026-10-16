"""Reproduce the separately labeled Shiva Purana draft from its exact source PDF.

Requires PyMuPDF from requirements-transcription.txt. No OCR, AI-generated text,
database writes, or network calls. Default validates; --write saves new artifacts.
"""
from pathlib import Path
import argparse
import collections
import hashlib
import json
import re

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'library/documents/shiva-purana-hi.json'
OUTPUT = ROOT / 'library/editions/drafts/shiva-purana-hi.json'
AUDIT = OUTPUT.with_suffix('.audit.json')
FONT_MAP = ROOT / 'backend/data/font-maps/shiva-purana-noto.json'
CONSONANT = r'[क-हक़-य़]़?'
CLUSTER = CONSONANT + r'(?:्' + CONSONANT + r')*'
MARKERS = 'ⓘⓇⒶⒷⒸ'

# Image-only text inspected in rendered source pages. Labels on page 37 are
# ordered by rows, left to right. Do not replace unusual printed deity names.
IMAGE_TEXT = {
    1: 'संपूर्ण ११ खण्डः ७ संहिताएं\nशिव पुराण\nबड़े अक्षरों में मुद्रित\nसरल हिन्दी भाषा',
    2: 'शिव पुराण\nसंपूर्ण ग्यारह खण्ड, सात संहिताएं\nसरल हिन्दी भाषा में\nबड़े अक्षरों में मुद्रित\nमनोज पब्लिकेशन्स',
    37: 'श्री मल्लिकार्जुन\nश्री नागेश्वर\nश्री विश्वनाथ\nश्री भीमशंकर\nश्री त्र्यम्बकेश्वर\nश्री वैद्यनाथ\nश्री केदारनाथ\nश्री अमलेश्वर\nश्री घृष्णेश्वर\nश्री तारकनाथ\nश्री महाकालेश्वर\nश्री श्रीसोमनाथ',
    844: 'शिव पुराण\nमनोज पब्लिकेशन्स',
}
ILLUSTRATIONS = [30,31,32,33,34,35,36,38,54,85,229,251,280,312,338,353,359,
                453,524,576,589,650,658,687,712,724,728,742,782,833,845]
DIVISIONS = {
    39: 'शिव पुराण माहात्म्य', 55: 'विद्येश्वर संहिता',
    110: 'श्रीरुद्र संहिता — प्रथम खण्ड', 151: 'श्रीरुद्र संहिता — द्वितीय खण्ड',
    232: 'श्रीरुद्र संहिता — तृतीय खण्ड', 354: 'श्रीरुद्र संहिता — चतुर्थ खंड',
    395: 'श्रीरुद्र संहिता — पंचम खंड', 502: 'श्रीशतरुद्र संहिता',
    577: 'श्रीकोटिरुद्र संहिता', 653: 'श्रीउमा संहिता',
    716: 'श्रीकैलाश संहिता', 743: 'श्रीवायवीय संहिता (पूर्वार्द्ध)',
    783: 'श्रीवायवीय संहिता (उत्तरार्ध)',
}
EXTRA_SECTIONS = {
    1: ('front-matter', 'मुखपृष्ठ, प्रकाशकीय विवरण और निवेदन'),
    5: ('contents', 'अनुक्रम'), 29: ('rudrashtak', 'श्री रुद्राष्टक'),
    37: ('illustration-captions', 'चित्र के नाम — स्रोत पृष्ठ 37'),
    826: ('shiv-chalisa', 'शिव चालीसा'), 830: ('shiv-stuti', 'शिव स्तुति'),
    834: ('shiv-ashtak', 'श्री शिवाष्टक'), 836: ('shiv-sahasranam', 'शिव सहस्रनाम'),
    844: ('back-cover', 'पिछला आवरण'),
}


def logical_order(text):
    for marker, replacement in [('ⓘ', r'\1ि'), ('Ⓐ', r'\1िं'),
                                ('Ⓑ', r'र्\1ि'), ('Ⓒ', r'र्\1िं')]:
        text = re.sub(marker + '(' + CLUSTER + ')', replacement, text)
    text = re.sub('(' + CLUSTER + r'्?|[अ-औ])([ािीुूृॄॅेैॉोौंँ़]*)Ⓡ',
                  r'र्\1\2', text)
    text = re.sub(r'\s+', ' ', text).strip()
    if any(marker in text for marker in MARKERS):
        raise ValueError('Unresolved Devanagari positioning marker: ' + text)
    return text


def glyph_value(glyph, mapping):
    value = mapping[str(glyph)]  # Unknown glyphs stop extraction.
    # The original font GSUB lookups 80-83 combine pre-base i with
    # anusvara/reph. 606 is an empty placeholder, not an anusvara character.
    if 570 <= glyph <= 581:
        return 'Ⓐ'
    if 582 <= glyph <= 593:
        return 'Ⓑ'
    if 594 <= glyph <= 605:
        return 'Ⓒ'
    if glyph == 606:
        return ''
    if value == 'ि':
        return 'ⓘ'
    if value in ('र्', 'र्ं') or (value[0] in 'ािीुूृेैोौं' and 'र्' in value):
        return value.replace('र्', 'Ⓡ')
    return value


def decode_pages(pdf, mapping):
    checked_fonts = set()
    pages = []
    for number, page in enumerate(pdf, 1):
        for xref, _, _, name, *_ in page.get_fonts():
            if xref in checked_fonts:
                continue
            if 'NotoSansDevanagari' in name:
                style = 'Bold' if 'Bold' in name else 'Regular'
                actual = hashlib.sha256(pdf.extract_font(xref)[3]).hexdigest()
                assert actual == mapping['fonts'][style]['embeddedFontSha256']
            else:
                assert 'Tahoma' in name, 'Unexpected source font'
            checked_fonts.add(xref)
        lines = []
        for span in page.get_texttrace():
            by_baseline = collections.OrderedDict()
            for code, glyph, origin, _ in span['chars']:
                if glyph < 0:
                    continue  # Synthetic expansion of one glyph, not new ink.
                if 'NotoSans' in span['font']:
                    style = 'Bold' if 'Bold' in span['font'] else 'Regular'
                    value = glyph_value(glyph, mapping['fonts'][style]['glyphs'])
                else:
                    value = chr(code)
                baseline = next((y for y in by_baseline if abs(y-origin[1]) < 1), round(origin[1], 1))
                run = by_baseline.setdefault(baseline, {'x': origin[0], 'text': '', 'size': span['size']})
                run['text'] += value
            for baseline, run in by_baseline.items():
                line = next((item for item in lines if abs(item['y']-baseline) < 1), None)
                if line is None:
                    line = {'y': baseline, 'runs': []}
                    lines.append(line)
                line['runs'].append(run)
        result = []
        for line in sorted(lines, key=lambda item: item['y']):
            runs = sorted(line['runs'], key=lambda item: item['x'])
            text = logical_order(''.join(run['text'] for run in runs))
            if text:
                result.append({'text': text, 'y': line['y'], 'x': min(run['x'] for run in runs),
                               'size': max(run['size'] for run in runs)})
        assert bool(result) == (number not in IMAGE_TEXT and number not in ILLUSTRATIONS), number
        pages.append({'number': number, 'lines': result})
    return pages


def reading_blocks(page):
    number, lines = page['number'], page['lines']
    if number in IMAGE_TEXT:
        return [IMAGE_TEXT[number]]
    if not lines:
        return []
    blocks, pending = [], []
    for line in lines:
        # Preserve source lines within prose paragraphs; page boundaries remain
        # passage boundaries. Front matter and verse appendices use short blocks.
        split = False
        if pending:
            previous = pending[-1]
            split = (len(pending) >= 8 or sum(len(item['text']) for item in pending) > 1000)
            if 40 <= number <= 825:
                split |= (abs(line['x']-88.5) < 1 or line['size'] != previous['size'] or
                          line['y']-previous['y'] > 23)
        if split:
            blocks.append('\n'.join(item['text'] for item in pending))
            pending = []
        pending.append(line)
    if pending:
        blocks.append('\n'.join(item['text'] for item in pending))
    return blocks


def build_edition(manifest, pages):
    sections, section, division = [], None, None
    chapter_count, chapter_in_division = 0, 0
    division_counts, audit_pages = {}, []
    for page in pages:
        number, lines = page['number'], page['lines']
        start = None
        if number in EXTRA_SECTIONS:
            start = EXTRA_SECTIONS[number]
        elif number in DIVISIONS:
            division = number
            chapter_in_division = 0
            division_counts[str(division)] = 0
            start = (f'division-{division}-title', DIVISIONS[division] + ' — शीर्षक')
        elif 40 <= number <= 825 and any(line['size'] == 21 for line in lines):
            chapter_count += 1
            chapter_in_division += 1
            division_counts[str(division)] += 1
            headings = [line['text'] for line in lines if line['size'] in (21, 17.25)]
            start = (f'division-{division}-chapter-{chapter_in_division}',
                     DIVISIONS[division] + ' · ' + ' — '.join(headings))
        if start:
            section = {'slug': start[0], 'title': start[1], 'sortOrder': len(sections)+1,
                       'expectedPassages': 0, 'passages': []}
            sections.append(section)
        blocks = reading_blocks(page)
        for text in blocks:
            order = len(section['passages'])+1
            notes = 'Local reading-block reference, not a canonical verse number. Printed text and source page order retained.'
            if number in IMAGE_TEXT:
                notes += ' Manually transcribed from the rendered image; page 37 captions follow rows left-to-right. Caption spelling remains subject to review.'
            if number in (433, 566, 625):
                notes += ' Unusual printed chapter label retained verbatim; not silently renumbered or corrected.'
            section['passages'].append({'reference': f'{section["sortOrder"]}.{order}',
                                       'text': text, 'sortOrder': order, 'sourcePage': number,
                                       'sourceNotes': notes})
        source_text = IMAGE_TEXT[number] if number in IMAGE_TEXT else '\n'.join(line['text'] for line in lines)
        assert ''.join(''.join(block.split()) for block in blocks) == ''.join(source_text.split()), number
        audit_pages.append({'page': number, 'classification': 'image-text' if number in IMAGE_TEXT else
                            'illustration-only' if number in ILLUSTRATIONS else 'text',
                            'passages': len(blocks), 'textSha256': hashlib.sha256('\n'.join(blocks).encode()).hexdigest()})
    assert chapter_count == 462
    assert list(division_counts.values()) == [7,25,20,42,55,20,59,42,43,51,23,34,41]
    for section in sections:
        section['expectedPassages'] = len(section['passages'])
        assert section['expectedPassages'] > 0
    count = sum(section['expectedPassages'] for section in sections)
    provenance = (
        manifest['provenance'] + '\nSeparate unreviewed draft extracted from the exact user-selected '
        'frontend/dist/library/shiva-purana.pdf, matching the catalog PDF SHA-256. '
        'Noto Sans Devanagari regular/bold glyph IDs decoded using original font cmap/GSUB; '
        'all 227 regular and 66 bold embedded nonempty outlines match the historical official font '
        'at commit ad153f5a14c838afb16c83f0a02784c7605f1e21. Contextual pre-base i, anusvara '
        'and reph positioning reconstructed from GSUB lookups. All text-layer lines retained; '
        'source line breaks retained within local reading blocks. Covers on pages 1, 2, 844 and '
        'illustration captions on page 37 transcribed from rendered images. '
        '31 visually inspected illustration/decorative-only pages are recorded separately; '
        'Om symbols within ornaments remain artwork. The original PDF preserves all artwork. '
        'Includes 462 printed chapters across the mahatmya and 12 samhita/khand divisions, '
        'plus division title pages, front matter, contents, Rudrashtak and closing devotional texts. '
        'Passage references identify reading blocks, not canonical shlokas. Printed spelling and '
        'chapter-label anomalies are retained, including pages 433, 566 and 625. '
        'This is the supplied simplified Hindi edition; its cover claim of completeness is not '
        'independently verified. Sample visual checks and complete page coverage do not establish '
        'full proofreading. Reuse license remains unverified. Original scan edition is preserved.'
    )
    edition = {key: manifest[key] for key in ['scriptureSlug', 'language', 'script', 'isOriginal', 'textDirection', 'license']}
    edition.update({'title': 'शिव पुराण — सरल हिन्दी, मनोज पब्लिकेशन्स (असमीक्षित पाठ)',
                    'translator': None, 'source': 'urn:sha256:'+manifest['sha256'],
                    'provenance': provenance, 'expectedPassages': count,
                    'reviewStatus': 'unreviewed-draft', 'sourceDocument': manifest['source'],
                    'sourceSha256': manifest['sha256'], 'sourcePageCount': manifest['pageCount'],
                    'illustrationOnlyPages': ILLUSTRATIONS,
                    'illustrationPageVerification': 'All listed pages inspected as rendered PDF images; 845 contains only a decorative strip. Image pages with words (1, 2, 37, 844) are transcribed instead.',
                    'sections': sections})
    audit = {'sourceSha256': manifest['sha256'], 'sourcePageCount': len(pages),
             'sections': len(sections), 'printedChapters': chapter_count, 'passages': count,
             'chaptersByDivisionStartPage': division_counts, 'manualImageTextPages': list(IMAGE_TEXT),
             'illustrationOnlyPages': ILLUSTRATIONS, 'pages': audit_pages,
             'reviewStatus': 'unreviewed-draft'}
    return edition, audit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding='utf8'))
    mapping = json.loads(FONT_MAP.read_text(encoding='utf8'))
    choices = [ROOT/'frontend/dist/library/shiva-purana.pdf', ROOT/'frontend/public/library/shiva-purana.pdf',
               ROOT/'backend/data/source-pdfs/shiva-purana.pdf']
    source = next(path for path in choices if path.exists())
    assert hashlib.sha256(source.read_bytes()).hexdigest() == manifest['sha256'] == mapping['sourcePdfSha256']
    with pymupdf.open(source) as pdf:
        assert len(pdf) == manifest['pageCount'] == 845
        pages = decode_pages(pdf, mapping)
    # Independent samples read from rendered source: these exercise contextual
    # i/reph/anusvara, conjuncts and the final numbered devotional text.
    assert 'निर्विकल्पं' in pages[28]['lines'][2]['text']
    assert pages[100]['lines'][1]['text'] == 'शिव नैवेद्य और बिल्व माहात्म्य'
    assert 'ज्ञानमूर्ति' in pages[842]['lines'][4]['text']
    edition, audit = build_edition(manifest, pages)
    for target, value in [(OUTPUT, edition), (AUDIT, audit)]:
        content = json.dumps(value, ensure_ascii=False, indent=2)+'\n'
        if target.exists() and target.read_text(encoding='utf8') != content:
            raise ValueError(f'Existing {target.name} differs; refusing to overwrite imported text.')
        if args.write and not target.exists():
            target.write_text(content, encoding='utf8')
    print(json.dumps({key: audit[key] for key in ['sourcePageCount', 'sections', 'printedChapters', 'passages', 'reviewStatus']}))


if __name__ == '__main__':
    main()
