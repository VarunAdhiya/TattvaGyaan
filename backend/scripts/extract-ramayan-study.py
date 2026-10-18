"""Build a source-page-preserving draft and reader layout for the supplied study.

No network or database writes. Run without --write to inspect tmp/pdfs/ramayan-reader.
The original PDF is never changed; existing published draft text is never overwritten.
"""
from pathlib import Path
import hashlib, importlib.util, json, re, sys, difflib
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'tmp/pdfs/ramayan-reader'
SHA = '759f2adbfd2fc1191ff8576401d1cbc34bbfefaf79a573e8747c53d4c858af75'
spec = importlib.util.spec_from_file_location('ramayan_font', Path(__file__).with_name('ramayan-font.py'))
font = importlib.util.module_from_spec(spec)
spec.loader.exec_module(font)
BLANKS = [1, 2, 6, 8, 20, 22, 48, 244, 246, 266]

def digest(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()

def clean(text):
    return re.sub(r'\s+', ' ', text).strip()

def key(text):
    return re.sub(r'[^\u0900-\u097f]', '', text).replace('ं','').replace('्','')

def source_lines(page):
    lines = []
    folio = None
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            spans = [s for s in line['spans'] if s['color'] != 0xffffff and s['alpha']]
            text = clean(''.join(font.decode(s['text']) if 'Kruti' in s['font'] else s['text'] for s in spans))
            if not text:
                continue
            x0,y0,x1,y1 = line['bbox']
            if y0 > 530 and text.isdigit():
                folio = text
                continue
            lines.append({'text': text, 'x': x0, 'y': y0, 'bottom': y1,
                          'right': x1, 'size': max(s['size'] for s in spans)})
    return sorted(lines, key=lambda l:(round(l['y']/3),l['x'])), folio

def build():
    manifest = json.loads((ROOT/'library/documents/valmiki-ramayana-ramakien-study-hi.json').read_text(encoding='utf8'))
    pdf = ROOT/'frontend/public/library/valmiki-ramayana-ramakien-study.pdf'
    assert hashlib.sha256(pdf.read_bytes()).hexdigest() == SHA == manifest['sha256']
    manual = json.loads((ROOT/'backend/data/transcription-manual/ramayan-study.json').read_text(encoding='utf8'))
    assert manual['sourceSha256'] == SHA
    doc = pymupdf.open(pdf)
    assert len(doc) == 266
    pages = {}
    for number,page in enumerate(doc,1):
        lines,folio = source_lines(page)
        if number in BLANKS:
            assert not lines, f'Unexpected visible text on blank page {number}'
        if str(number) in manual['pages']:
            lines = [{'text': text, 'manual': True, 'x':72, 'y':i*30, 'bottom':i*30+12,'right':350,'size':12}
                     for i,text in enumerate(manual['pages'][str(number)])]
        pages[number] = {'lines':lines, 'folio':folio}
    # The printed contents identifies the actual topics. Locate their printed
    # headings, including headings near the foot of a source page.
    boundaries = {(3,0):'शीर्षक', (4,0):'प्रकाशन', (5,0):'समर्पण', (7,0):'आमुख',
                  (9,0):'प्रस्तावना', (13,0):'मन की बात', (17,0):'विषय–सूची',
                  (21,0):'प्रथम भाग — वाल्मीकि रामायण और उसका बदलता स्वरूप',
                  (47,0):'द्वितीय भाग — वाल्मीकि रामायण और रामकीर्ति का तुलनात्मक अध्ययन',
                  (245,0):'तृतीय भाग — रामकीर्ति के वे प्रसंग जो वाल्मीकि रामायण में नहीं हैं।'}
    matches=[]
    for number in [17,18,19]:
        for entry in manual['pages'][str(number)]:
            match = re.match(r'(.+) — (\d+)$',entry)
            if not match or 'भाग' in match[1]:
                continue
            title,printed = match[1],int(match[2])
            source_page = printed + (20 if printed < 225 else 21)
            candidates=[(difflib.SequenceMatcher(None,key(title),key(line['text'])).ratio(),p,i,line['text'])
                        for p in range(source_page-1,source_page+2) for i,line in enumerate(pages[p]['lines'])
                        if len(line['text']) < 120 and line['x'] < 80]
            score,p,i,actual = max(candidates)
            assert score>.65,(title,score,actual)
            assert (p,i) not in boundaries
            boundaries[p,i]=actual
            matches.append({'contents':title,'printedPage':printed,'sourcePage':p,'line':i,'heading':actual,'match':round(score,3)})
    sections=[]; layout_sections={}; audit=[]; current=None
    for number, source in pages.items():
        if number in BLANKS:
            audit.append({'page':number,'classification':'blank'})
            continue
        assert source['lines'],f'Unclassified page {number}'
        groups=[]; group=None
        for index,line in enumerate(source['lines']):
            boundary=boundaries.get((number,index))
            text=line['text']; previous=source['lines'][index-1] if index else None
            label=bool(re.match(r'^(वाल्मीकि[ -]?रामायण|रामकीर्ति|रामायण) के अनुसार',text)) or text in ['तुलना','तुलनात्मक अध्ययन']
            if number in [17,18,19]:
                kind='topic' if index==0 and number==17 or 'भाग' in text else 'contents-entry'
            elif boundary or label or line['size']>=14:
                kind='topic'
            elif line['size']<11.6 and number>22:
                kind='source-note'
            elif text.endswith(('।','॥','।।')) and line['right']<300 and previous and line['y']-previous['bottom']>8 and len(text)<95:
                kind='verse'
            else:
                kind='paragraph'
            new = (group is None or boundary or line.get('manual') or kind!=group['kind'] or kind in ['topic','contents-entry','verse']
                   or (previous and line['y']-previous['bottom']>8) or line['x']>=100
                   or len(' '.join(group['lines']))+len(text)>1100)
            if new:
                group={'kind':kind,'lines':[],'boundary':boundary};groups.append(group)
            group['lines'].append(text)
        references=[]
        for index,group in enumerate(groups):
            if group['boundary']:
                slug=f'section-{len(sections)+1}'
                current={'slug':slug,'title':group['boundary'],'sortOrder':len(sections)+1,'passages':[]}
                sections.append(current);layout_sections[slug]={'hashes':{},'blocks':[]}
            assert current
            text='\n'.join(group['lines']) if group['kind']=='verse' else ' '.join(group['lines'])
            assert not re.search(r'[\ue000-\uf8ff\ufffd]',text)
            reference=f'pdf-{number}.{index+1}'
            passage={'reference':reference,'text':text,'sortOrder':len(current['passages'])+1,'sourcePage':number,
                     'sourceNotes':f"Original PDF page {number}"+(f"; printed page {source['folio']}" if source['folio'] else '')+'. '+
                     ('Image text transcribed from the rendered source.' if str(number) in manual['pages'] else 'Kruti Dev 010 font decoded; source wording and paragraph order retained.')}
            current['passages'].append(passage);references.append(reference)
            block={'kind':group['kind'],'sourcePage':number,'printedPage':source['folio'],'pageBreakBefore':index==0,
                   'parts':[{'reference':reference,'start':0,'end':len(text.encode('utf-16-le'))//2}]}
            if group['kind'] in ['topic','verse','contents-entry']:block['keepTogether']=True
            if group['kind']=='topic':block['keepWithNext']=True
            layout_sections[current['slug']]['blocks'].append(block)
            layout_sections[current['slug']]['hashes'][reference]=digest(text)
        # Every visible decoded line occurs once, in its original order.
        assert clean(' '.join(l['text'] for l in source['lines']))==clean(' '.join(' '.join(g['lines']) for g in groups))
        audit.append({'page':number,'printedPage':source['folio'],'classification':'manual' if str(number) in manual['pages'] else 'decoded',
                      'lines':len(source['lines']),'references':references,'textSha256':digest(clean(' '.join(l['text'] for l in source['lines'])))})
    for section in sections:section['expectedPassages']=len(section['passages'])
    draft={'scriptureSlug':'ramayana','title':'वाल्मीकि रामायण और रामकीर्ति (रामकियन): एक तुलनात्मक अध्ययन — डॉ. करुणा शर्मा (पाठ-रूपांतरण का मसौदा)',
           'language':'hi','script':'Devanagari','isOriginal':True,'textDirection':'ltr',
           'source':f'urn:sha256:{SHA}','sourceDocument':manifest['source'],'sourceSha256':SHA,'sourcePageCount':266,
           'license':manifest['license'],'reviewStatus':'unreviewed-draft','blankPages':BLANKS,
           'blankPageVerification':'Rendered pages visually checked as blank. White invisible PDF text is not printed content; original blank leaves remain in the downloadable PDF.',
           'provenance':'Dr. Karuna Sharma’s comparative study of Valmiki Ramayana and Ramkirti (Ramakien), published by the Embassy of India, Bangkok, ISBN 978-616-423-555-7. Grouped under the Ramayan collection; not represented as the primary Valmiki Ramayana. Exact user-supplied 266-page PDF preserved. Kruti Dev 010 text decoded from the embedded text layer; image pages 4, 7, 17–19 manually transcribed. Printed paragraphs, comparison labels, footnotes and page boundaries retained; folios recorded as metadata. Draft, not fully proofread; no editorial corrections or review attestation. Chapter starts follow printed topic headings. Original source PDF is available for exact page appearance.',
           'expectedPassages':sum(len(s['passages']) for s in sections),'sections':sections}
    layout={'source':draft['source'],'sourceSha256':SHA,'sourcePageCount':266,'preserveSourcePages':True,'sections':layout_sections}
    report={'sourceSha256':SHA,'pageCount':266,'blankPages':BLANKS,'chapters':matches,'pages':audit}
    return draft,layout,report

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf8')
    draft,layout,report=build();WORK.mkdir(parents=True,exist_ok=True)
    outputs=[('ramayan-study-hi.json',draft),('ramayan-study-layout.json',layout),('ramayan-study-hi.audit.json',report)]
    for name,data in outputs:(WORK/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    if '--write' in sys.argv:
        targets=[ROOT/'library/editions/drafts/ramayan-study-hi.json',ROOT/'backend/data/layouts/ramayan-study.json',ROOT/'library/editions/drafts/ramayan-study-hi.audit.json']
        for (name,_),target in zip(outputs,targets):
            content=(WORK/name).read_bytes()
            if target.exists() and target.read_bytes()!=content:raise ValueError(f'Refusing to overwrite changed draft: {target}')
        for (name,_),target in zip(outputs,targets):target.write_bytes((WORK/name).read_bytes())
    print(json.dumps({'sections':len(draft['sections']),'passages':draft['expectedPassages'],'pages':266,'blanks':BLANKS,'written':'--write' in sys.argv},ensure_ascii=False))
    for match in report['chapters']:print(json.dumps(match,ensure_ascii=False))
