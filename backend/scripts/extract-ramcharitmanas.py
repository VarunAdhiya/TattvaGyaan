"""Decode the checksum-pinned Gita Press PDF into an explicitly unreviewed draft.

The base Chanakya encoding was compared with the mapping at:
https://github.com/sanskrit-coders/tech_hindi_font_converters/blob/master/Chanakya_to_Unicode_to_Chanakya_Converter_08.html
PDF-specific glyphs were checked against rendered source samples. This is not a
generic Hindi converter, OCR, an editorial correction, or a review attestation.
Run with backend/.venv-ocr/Scripts/python.exe from the repository root.
"""
from pathlib import Path
import collections
import hashlib
import json
import re
import sys
import unicodedata
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SOURCE_SHA256 = '1a40463ae7632cecd9069508e4fb9cc4baae757829a838ee8414c9277c9a2725'
WORK = ROOT / 'tmp/pdfs/ramcharitmanas'
WORK.mkdir(parents=True, exist_ok=True)
I, R, IN, IR = '\ue000', '\ue001', '\ue002', '\ue003'

# Byte meanings in this PDF's embedded Chanakya fonts. PDF extraction exposes
# MacRoman glyph names; these are byte encodings, not linguistic substitutions.
GLYPHS = {
    0x23:'प्त', 0x25:'त्न', 0x40:'ञ्च', 0x41:'्न', 0x43:'ष्ट', 0x44:'ष्ठ',
    0x45:'श्व', 0x46:'स्न', 0x48:'॥', 0x4b:'्य', 0x4c:'रु', 0x4d:'रू',
    0x4e:'हृ', 0x4f:'ह्र', 0x50:'क्क', 0x51:'क्त', 0x53:'स्', 0x54:'ञ्ज',
    0x55:'', 0x56:'ङ्क', 0x57:'ङ्ख', 0x58:'ङ्ग', 0x59:'ङ्घ', 0x5a:R+'ं',
    0x5e:'ट्ट', 0x5f:'ट्ठ', 0x60:'क्व', 0x61:'ड्ड', 0x62:'ड्ढ', 0x63:'ष्',
    0x64:'स्र', 0x65:'द्ग', 0x66:'द्घ', 0x67:'द्द', 0x68:'द्ध', 0x6a:'द्भ',
    0x6b:'द्म', 0x6c:'द्य', 0x6d:'द्व', 0x6f:'श', 0x70:'श्च', 0x71:'ह्न',
    0x72:'ह्म्', 0x73:'ह्य', 0x74:'ह्ल', 0x75:'ह्व',
    0x80:'क्', 0x81:'ख्', 0x82:'ग्', 0x83:'घ्', 0x84:'ल्ल', 0x85:'ज्',
    0x86:'ञ्', 0x87:'ण्', 0x88:'त्', 0x89:'थ्', 0x8a:'ध्', 0x8b:'न्',
    0x8c:'प्', 0x8f:'भ्', 0x8e:'ब्', 0x90:'म्', 0x91:'च्', 0x93:'च्च्',
    0x94:'ज्ज्', 0x98:'त्र्', 0x97:'—', 0x99:'ज्ञ्', 0x9d:'स्त्र',
    0x9e:'त्त्', 0x9f:'श्र्', 0xa1:'ँ', 0xa2:'ं', 0xa4:'', 0xa5:'अ',
    0xa7:'इ', 0xa8:IN, 0xa9:'उ', 0xaa:'ऊ', 0xab:'्र', 0xb0:'ए',
    0xb3:'श्', 0xb4:'ं', 0xb7:'क', 0xb8:'़', 0xb9:'ख', 0xbb:'ग',
    0xbc:'द', 0xbe:'ङ', 0xbf:'च', 0xc0:'छ', 0xc1:'ज', 0xc2:'प', 0xc3:'व्',
    0xc4:'य्', 0xc5:'ट', 0xc6:'ठ', 0xc7:'ड', 0xc8:'फ', 0xc9:'ढ',
    0xcb:'ल्', 0xcc:'त', 0xcd:'थ', 0xce:'द', 0xcf:'ध', 0xd0:'।',
    0xd1:'ः', 0xd2:'‘', 0xd3:'’', 0xd5:'ब', 0xd6:'भ', 0xd7:'म',
    0xd8:'य', 0xd9:'न', 0xda:'र', 0xdc:'ल', 0xdf:'व', 0xe0:'श्',
    0xe1:'ष', 0xe2:'स', 0xe3:'ह', 0xe4:'ु', 0xe5:'ू', 0xe6:'ा',
    0xe7:I, 0xe8:'ी', 0xe9:'ु', 0xea:'ू', 0xeb:'ृ', 0xed:IR,
    0xef:'', 0xf0:'े', 0xf1:'ै', 0xf3:'न्न्', 0xf4:'ो', 0xf5:'ौ',
    0xf6:'ह्ण', 0xf7:'्', 0xf9:'ऽ', 0xfa:'ॐ', 0xfc:R, 0xfd:'्र',
    0xfe:'्र', 0xff:'क्ष्',
}
GLYPHS.update({ord(str(n)): chr(0x966+n) for n in range(10)})
C = r'[\u0904-\u0939\u0958-\u095f]'
CLUSTER = C + '(?:्' + C + ')*'
MARKS = '[ािीुूृेैोौंःँॅ़]*'


def decode(raw):
    output = []
    for char in raw:
        # MuPDF emits the old Mac currency sign for byte 0xDB on some pages.
        byte = 0xdb if char == '¤' else char.encode('mac_roman')[0]
        if byte == 0xdb:
            output.append('झ्')
        elif byte in GLYPHS:
            output.append(GLYPHS[byte])
        elif char.isspace() or char in '.,;:!?-()[]{}*|':
            output.append(char)
        else:
            raise ValueError(f'Unmapped source glyph U+{ord(char):04X}')
    text = ''.join(output)
    for a,b in [('्ा',''), ('अा','आ'), ('अो','ओ'), ('अौ','औ'), ('आे','ओ'), ('आै','औ'), ('एे','ऐ'),
                ('इ'+R,'ई'), ('ाे','ो'), ('ाै','ौ'), ('्ो','े'), ('्ौ','ै')]:
        text = text.replace(a,b)
    # Reph precedes its consonant cluster logically, even if drawn after it.
    text = re.sub('('+CLUSTER+'्?'+MARKS+')'+R, r'र्\1', text)
    # Short-i and its nasal/reph ligatures are drawn before their consonants.
    for marker, prefix, suffix in [(I,'','ि'), (IN,'','िं'), (IR,'र्','ि')]:
        text = re.sub(marker+'('+CLUSTER+')', lambda m: prefix+m[1]+suffix, text)
    text = re.sub('([ंँ])([ािीुूृेैोौ]+)', r'\2\1', text)
    text = re.sub('([ािीुूृेैोौ])़', r'़\1', text)
    # Standalone reph is illustrated as a symbol in the discussion of र/म.
    text = text.replace(R, 'र्')
    return unicodedata.normalize('NFC', re.sub(r'[ \t]+', ' ', text).strip())


# These four overprinted/pre-base mark sequences were compared directly with
# rendered pages. Keep the exact encoded inputs and evidence pages auditable.
VISUAL_FIXES = {
    122: {'¬ÍÁ¸áÊ¸◊Ê': 'पूर्णिमा'},
    193: {'„UÁ¸·¸Ã': 'हर्षित'},
    376: {'‹ÊªÁ¢„¢U': 'लागहिं'},
    536: {'ŸÁ¢„U¢': 'नहिं'},
}


def source_rows(page, number):
    data = page.get_text('rawdict' if number == 1055 else 'dict', flags=(pymupdf.TEXTFLAGS_DICT
                         & ~pymupdf.TEXT_PRESERVE_IMAGES) | pymupdf.TEXT_INHIBIT_SPACES)
    if number == 1055:
        for block in data['blocks']:
            for line in block.get('lines',[]):
                expanded = []
                for span in line['spans']:
                    chars = span.pop('chars')
                    if 280 <= span['origin'][1] <= 625:
                        expanded.extend({**span,'text':c['c'],'bbox':c['bbox'],'origin':c['origin']} for c in chars)
                    else:
                        expanded.append({**span,'text':''.join(c['c'] for c in chars)})
                line['spans'] = expanded
    rows = []
    for block in data['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                if not span['text'].strip():
                    continue
                if span['color'] == 0xffffff or span.get('alpha',255) == 0:
                    continue  # Invisible white alignment characters on white paper.
                if span['font'] == 'DingbitsThree':
                    continue  # Decorative end marks, retained in the original PDF.
                y = span['origin'][1]
                column = -1
                split_y = 160 if number == 7 else 65 if 8 <= number <= 13 else 350 if number == 14 else None
                if split_y is not None and y >= split_y:
                    column = 0 if span['bbox'][0] < 270 else 1
                match = next((r for r in rows if r['column'] == column and abs(r['y']-y) < 1), None)
                if match is None:
                    match = {'y': y, 'column':column, 'spans': []}
                    rows.append(match)
                match['spans'].append(span)
    result = []
    for row in sorted(rows, key=lambda r:(r['column'],r['y'])):
        spans = sorted(row['spans'], key=lambda s:s['bbox'][0])
        if number == 1055 and 280 <= row['y'] <= 625:
            cells = [[] for _ in range(15)]
            for span in spans:
                middle = (span['bbox'][0]+span['bbox'][2])/2
                cell = int((middle-83.2)/24.65)
                assert 0 <= cell < 15, (row['y'],middle)
                cells[cell].append(span['text'])
            assert all(cells), (row['y'],cells)
            raw = ' | '.join(''.join(cell) for cell in cells)
        else:
            raw = ''.join(s['text'] for s in spans)
        if all('Chanakya' in s['font'] for s in spans):
            fragments = [raw]
            for encoded, corrected in VISUAL_FIXES.get(number, {}).items():
                if encoded in raw:
                    before, after = raw.split(encoded)
                    fragments = [before, corrected, after]
                    break
            text = ''.join(part if re.search('[\u0900-\u097f]',part) else
                           (' ' if part[:1].isspace() else '') + decode(part) +
                           (' ' if part[-1:].isspace() else '') for part in fragments).strip()
        elif all(s['font'] == 'Helvetica-Bold' for s in spans):
            text = raw
        else:
            raise ValueError('Mixed or unknown font row')
        if text:
            result.append({'text':text, 'raw':raw, 'y':row['y'],
                           'column':row['column'],
                           'bold':all('Bold' in s['font'] for s in spans),
                           'size':max(s['size'] for s in spans)})
    return result


SECTION_STARTS = [
    (1,'front-matter','मुखपृष्ठ और निवेदन'),
    (7,'contents','विषय-सूची'),
    (14,'parayana-schedule','नवाह्नपारायण और मासपारायणके विश्राम-स्थान'),
    (15,'parayana-vidhi','पारायण-विधि'),
    (18,'bala-kanda','बालकाण्ड'),
    (344,'ayodhya-kanda','अयोध्याकाण्ड'),
    (620,'aranya-kanda','अरण्यकाण्ड'),
    (682,'kishkindha-kanda','किष्किन्धाकाण्ड'),
    (714,'sundara-kanda','सुन्दरकाण्ड'),
    (772,'lanka-kanda','लङ्काकाण्ड'),
    (906,'uttara-kanda','उत्तरकाण्ड'),
    (1050,'arati','श्रीरामायणजीकी आरती'),
    (1051,'tulsidas-biography','गोस्वामी तुलसीदासजीकी संक्षिप्त जीवनी'),
    (1055,'ramashalaka','श्रीरामशलाका प्रश्नावली'),
]
COVER = ('॥ श्रीराम ॥\nश्रीमद्गोस्वामी तुलसीदासविरचित\nश्रीरामचरितमानस\n'
         '[ सचित्र, सटीक-मोटा टाइप ]\nगीताप्रेस गोरखपुर\n'
         'GITA PRESS, GORAKHPUR [SINCE 1923]\nटीकाकार—हनुमानप्रसाद पोद्दार')


def export(pages, manifest):
    sections, excluded = [], []
    emitted_rows = 0
    text_pages = set()
    for number, rows in enumerate(pages,1):
        boundary = next((b for b in SECTION_STARTS if b[0] == number),None)
        if boundary:
            sections.append({'slug':boundary[1],'title':boundary[2],
                             'sortOrder':len(sections)+1,'expectedPassages':0,'passages':[]})
        section = sections[-1]
        groups = []
        for row in rows:
            if number >= 7 and row['y'] <= 60 and (
                'काण्ड' in row['text'] or 'रामचरितमानस' in row['text'] or
                re.fullmatch(r'[\[\]०-९* ]+',row['text'])):
                excluded.append({'page':number,**row})
                continue
            key = (row['column'], row['bold'], round(row['size']))
            if (not groups or groups[-1]['key'] != key or
                len('\n'.join(groups[-1]['lines'])) + len(row['text']) > 900):
                groups.append({'key':key,'lines':[]})
            groups[-1]['lines'].append(row['text'])
            emitted_rows += 1
        if number == 1:
            assert not rows
            groups = [{'key':None,'lines':[COVER]}]
        for group in groups:
            text = '\n'.join(group['lines'])
            assert text.strip() and not re.search(r'[\ue000-\uf8ff\ufffd]',text), (number,text)
            order = len(section['passages'])+1
            notes = (f'PDF page {number}. Embedded Chanakya font decoding; printed line order retained. '
                     'Reference identifies a reading-order passage, not a canonical verse. Not fully proofread.')
            if number == 1:
                notes = 'PDF page 1. Cover labels manually transcribed from the rendered source image; illustration retained in the PDF.'
            if number in VISUAL_FIXES:
                notes += ' A pre-base/overprinted mark sequence on this page was checked against the rendered source.'
            if number == 1055:
                notes += ' The question-table cells are separated by | and read row-by-row, left-to-right.'
            if 7 <= number <= 14:
                notes += ' Two-column regions are read down the left column, then down the right.'
            section['passages'].append({'reference':f"{section['slug']}.{order}",
                'text':text,'sortOrder':order,'sourcePage':number,'sourceNotes':notes})
            text_pages.add(number)
    blanks = [2,4,1058]
    assert set(range(1,1059))-text_pages == set(blanks)
    assert emitted_rows+len(excluded) == sum(map(len,pages))
    for section in sections:
        section['expectedPassages'] = len(section['passages'])
        assert section['expectedPassages'] > 0
    edition = {k:manifest[k] for k in ['scriptureSlug','language','script','isOriginal','textDirection','license']}
    edition.update({
        'title':'श्रीरामचरितमानस — गीताप्रेस, हनुमानप्रसाद पोद्दार की टीका सहित (पाठ-रूपांतरण का मसौदा)',
        'translator':None,'textLanguages':['Awadhi','Hindi','Sanskrit'],
        'source':'urn:sha256:'+manifest['sha256'],
        'sourceDocument':manifest['source'],'sourceSha256':manifest['sha256'],
        'sourcePageCount':1058,'reviewStatus':'unreviewed-draft','illustrationOnlyPages':[],
        'blankPages':blanks,'blankPageVerification':
            'PDF pages 2, 4 and 1058 were rendered and visually inspected: blank; no passage text was invented.',
        'expectedPassages':sum(s['expectedPassages'] for s in sections),'sections':sections,
        'provenance':
            'Converted exclusively from the user-selected Shri-Ramcharitmanas-Gita-Press.pdf, preserved as '
            +manifest['source']+'. Source identifies Goswami Tulsidas as author, Hanumanprasad Poddar as commentator, '
            'and Gita Press, Gorakhpur as publisher. This is Shri Ramcharitmanas, not Valmiki Ramayana. '
            'Reuse permission remains unverified. All 1058 PDF pages are accounted for: 1055 text/cover/caption pages '
            'and 3 visually confirmed blank pages. Seven kandas follow the printed divisions and PDF bookmarks; '
            'each preceding illustrated caption page belongs to its kanda. Front matter, contents, recitation guidance, '
            'arati, biography and the closing question table are retained as separate sections. '
            'Text was decoded from this PDF\'s embedded Chanakya fonts by reversing MacRoman glyph-name extraction '
            'and reconstructing Devanagari character order. Base encoding reference: '
            'https://github.com/sanskrit-coders/tech_hindi_font_converters/blob/master/Chanakya_to_Unicode_to_Chanakya_Converter_08.html. '
            'PDF-specific glyph meanings were compared with rendered source samples. Four unusual mark sequences '
            'on PDF pages 122, 193, 376 and 536 were visually checked; exact source sequences are recorded in the extractor. '
            'The image-only cover labels were manually transcribed. Contents pages 7-13 and the lower half of '
            'page 14 are read by column, left then right. Running headers/page numbers, invisible white alignment '
            'characters, and decorative '
            'Dingbits end marks are omitted from passage text; illustrations remain in the original PDF. '
            'The question table is serialized by rows with | cell separators. Printed verse labels, Sanskrit/Awadhi '
            'and Hindi commentary are retained. Passages group consecutive printed lines by type style, split '
            'at page boundaries or a 900-character limit; reference IDs denote reading blocks, not canonical verses. '
            'Source-page numbers remain in passage notes. Structural coverage checks and sample visual comparisons '
            'are complete; every page has NOT been proofread. This is an unreviewed draft, never a verified/complete edition.'
    })
    output = ROOT/'library/editions/drafts/ramcharitmanas-hi.json'
    if output.exists() and json.loads(output.read_text(encoding='utf-8')) != edition:
        raise ValueError('Existing draft differs; preserve imported IDs and review before changing it.')
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(edition,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    audit = {'sourceSha256':manifest['sha256'],'sourceRows':sum(map(len,pages)),
             'emittedRows':emitted_rows,'excludedHeaderRows':len(excluded),
             'textPages':len(text_pages),'blankPages':blanks,'sections':len(sections),
             'passages':edition['expectedPassages'],'visualFixes':VISUAL_FIXES}
    (WORK/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (output.with_suffix('.audit.json')).write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(audit,ensure_ascii=False))


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    manifest = json.loads((ROOT/'library/documents/ramcharitmanas-hi.json').read_text(encoding='utf-8'))
    assert manifest['sha256'] == SOURCE_SHA256, 'This decoder is only for the inspected source PDF.'
    filename = ROOT/'frontend/public/library/shri-ramcharitmanas-gita-press.pdf'
    assert hashlib.sha256(filename.read_bytes()).hexdigest() == manifest['sha256']
    pdf = pymupdf.open(filename)
    assert len(pdf) == manifest['pageCount']
    if '--diagnostics' in sys.argv:
        colors = collections.Counter()
        for page in pdf:
            data = page.get_text('dict',flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)
            colors.update((s['color'],s.get('alpha')) for b in data['blocks'] for l in b.get('lines',[]) for s in l['spans'])
        print('COLORS',colors)
        for number in [7,14,1055,1057]:
            print('PAGE',number)
            data = pdf[number-1].get_text('dict',flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)
            for b in data['blocks']:
                for l in b.get('lines',[]):
                    for s in l['spans']:
                        if (number in [7,14] and s['origin'][1]<160) or (number==1055 and 280<s['origin'][1]<310) or (number==1057 and s['origin'][1]<150):
                            print(s)
        return
    if '--render' in sys.argv:
        for number in map(int, sys.argv[sys.argv.index('--render')+1:]):
            pdf[number-1].get_pixmap(matrix=pymupdf.Matrix(1.5,1.5)).save(WORK/f'page-{number}.png')
        return
    pages = []
    issues = []
    for number, page in enumerate(pdf,1):
        rows = source_rows(page,number)
        pages.append(rows)
        for row in rows:
            if re.search(r'[\ue000-\uf8ff\ufffd]',row['text']):
                issues.append({'page':number, **row})
    (WORK/'decoded-pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (WORK/'decoding-issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'pages':len(pages),'rows':sum(map(len,pages)),'unresolvedRows':len(issues)}))
    sample_pages = list(map(int,sys.argv[sys.argv.index('--samples')+1:])) if '--samples' in sys.argv else []
    for number in sample_pages:
        print('PAGE',number)
        for row in pages[number-1]:
            print(round(row['y'],1), row['text'])
    if issues:
        print('UNRESOLVED',json.dumps(issues[:8],ensure_ascii=False))
    elif '--write' in sys.argv:
        export(pages,manifest)


if __name__ == '__main__':
    main()
