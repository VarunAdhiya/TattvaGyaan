"""Restore only OCR-supported spaces; preserve every original non-space character.

Prepare into ignored staging files first. --write requires all 620 checkpoints
and writes a reversible, checksummed insertion ledger with the updated import.
This script never writes the database.
"""
from pathlib import Path
from difflib import SequenceMatcher
import argparse
import hashlib
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[2]
DRAFT = ROOT / 'library/editions/drafts/garuda-purana-hi.json'
AUDIT = DRAFT.with_suffix('.audit.json')
LEDGER = ROOT / 'library/editions/drafts/garuda-purana-hi.spacing.json'
CACHE = ROOT / 'backend/data/transcription-ocr/garuda-word-spacing-v1'
STAGE = ROOT / 'tmp/pdfs/garuda-reader/spacing-preview'
SOURCE = 'c05368e6b60c64f58b2b86b8a9375d483259cd81d6b2469faaafb4a698a6dcb0'
NOTE = ' Word spacing recovered from direct Tesseract 5.5.2 Hindi output; only spaces inserted, with a reversible per-passage checksum ledger. Original OCR letters, references and passage IDs retained; not fully proofread.'


def sha(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()


def stream(text):
    positions = [i for i, c in enumerate(text) if not c.isspace() and c not in '\u200c\u200d']
    return ''.join(text[i] for i in positions), positions


def recover(original, recognized):
    a, a_positions = stream(original)
    b, b_positions = stream(recognized)
    matcher = SequenceMatcher(None, a, b, autojunk=False)
    boundaries = {i for i in range(1, len(b_positions))
                  if any(c.isspace() for c in recognized[b_positions[i-1]+1:b_positions[i]])}
    inserted = set()
    for block in matcher.get_matching_blocks():
        # Require matching characters on both sides; do not infer a boundary
        # across an OCR substitution, deletion, reordering or a tiny match.
        for offset in range(2, block.size-1):
            if block.b + offset not in boundaries:
                continue
            index = block.a + offset
            start, end = a_positions[index-1]+1, a_positions[index]
            if any(c.isspace() for c in original[start:end]):
                continue
            if unicodedata.category(original[end]).startswith('M'):
                continue
            inserted.add(end)
    return sorted(inserted), round(matcher.ratio(), 5)


def insert(text, offsets):
    indices = set(offsets)
    return ''.join((' ' if i in indices else '') + c for i, c in enumerate(text))


def prepare(partial=False):
    draft = json.loads(DRAFT.read_text(encoding='utf8'))
    audit = json.loads(AUDIT.read_text(encoding='utf8'))
    if LEDGER.exists():
        prior = json.loads(LEDGER.read_text(encoding='utf8'))
        if sha(DRAFT.read_text(encoding='utf8')) == prior.get('correctedDraftSha256'):
            return None, None, prior
        raise ValueError('Existing spacing ledger does not match the current draft')
    assert draft['sourceSha256'] == audit['sourceSha256'] == SOURCE
    records = {}
    for section in draft['sections']:
        for passage in section['passages']:
            records.setdefault(passage['sourcePage'], []).append(passage)
    ledger = {'version': 1, 'sourceSha256': SOURCE, 'status': 'spacing-only-unreviewed-draft',
              'originalDraftSha256': sha(DRAFT.read_text(encoding='utf8')), 'originalProvenance': draft['provenance'], 'pages': [], 'passages': {}}
    for page in audit['pages']:
        if page['method'] != 'column-aware-ocr':
            continue
        file = CACHE / f'{page["page"]:04d}.json'
        if not file.exists():
            if partial:
                continue
            raise ValueError(f'Missing direct OCR checkpoint: {page["page"]}')
        checkpoint = json.loads(file.read_text(encoding='utf8'))
        identity = checkpoint['identity']
        assert identity['sourceSha256'] == SOURCE and identity['recipe'] == 'garuda-direct-word-spacing-v1'
        assert identity['tesseract'] == '5.5.2' and identity['tesserocr'] == '2.10.0'
        assert identity['modelSha256'] == audit['modelSha256']
        direct = '\n'.join(r['text'] for r in checkpoint['regions'])
        assert sha(direct) == checkpoint['textSha256']
        passages = records[page['page']]
        original = '\n'.join(p['text'] for p in passages)
        assert sha(original) == page['textSha256']
        offsets, ratio = recover(original, direct)
        cursor = 0
        for passage in passages:
            text = passage['text']
            local = [offset-cursor for offset in offsets if cursor <= offset < cursor+len(text)]
            if local:
                corrected = insert(text, local)
                assert re.sub(r'\s', '', text) == re.sub(r'\s', '', corrected)
                assert text.count('\n') == corrected.count('\n')
                ledger['passages'][passage['reference']] = {'beforeSha256': sha(text), 'afterSha256': sha(corrected), 'insertions': local}
                passage['text'] = corrected
            cursor += len(text)+1
        corrected = '\n'.join(p['text'] for p in passages)
        assert corrected == insert(original, offsets)
        page['spacingRecovery'] = {'originalTextSha256': page['textSha256'], 'directTextSha256': checkpoint['textSha256'],
                                   'checkpointSha256': sha(file.read_text(encoding='utf8')), 'spacesInserted': len(offsets), 'alignment': ratio}
        page['textSha256'] = sha(corrected)
        page['characters'] = len(corrected)
        lines = corrected.split('\n')
        for region in page['regions']:
            if region['firstLine']:
                region['textSha256'] = sha('\n'.join(lines[region['firstLine']-1:region['firstLine']-1+region['lineCount']]))
        ledger['pages'].append({'page': page['page'], **page['spacingRecovery']})
    if not partial:
        assert len(ledger['pages']) == 620
    draft['provenance'] += NOTE
    audit['spacingRecovery'] = {'ledger': LEDGER.name, 'pages': len(ledger['pages']),
                               'spacesInserted': sum(len(p['insertions']) for p in ledger['passages'].values())}
    return draft, audit, ledger


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--partial', action='store_true', help='Inspect available checkpoints in staging only')
    parser.add_argument('--write', action='store_true', help='Write the complete verified import and insertion ledger')
    args = parser.parse_args()
    if args.partial and args.write:
        parser.error('Partial recovery cannot replace the import')
    draft, audit, ledger = prepare(args.partial)
    if draft is None:
        print('Spacing recovery already applied; checksum matches.')
        return
    STAGE.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(draft, ensure_ascii=False, indent=2)+'\n'
    ledger['correctedDraftSha256'] = sha(payload)
    plain = []
    for number in range(1, draft['sourcePageCount']+1):
        section = next(s for s in draft['sections'] if max(p['sourcePage'] for p in s['passages']) >= number)
        plain.append(f'=== PDF page {number} | {section["title"]} ===\n' + '\n'.join(p['text'] for p in section['passages'] if p['sourcePage'] == number))
    files = {DRAFT: payload, AUDIT: json.dumps(audit, ensure_ascii=False, indent=2)+'\n',
             LEDGER: json.dumps(ledger, ensure_ascii=False, indent=2)+'\n', DRAFT.with_suffix('.txt'): '\n\n'.join(plain)+'\n'}
    for target, text in files.items():
        (STAGE / target.name).write_text(text, encoding='utf8', newline='\n')
    if args.write:
        backup = ROOT / 'backend/backups/garuda-before-spacing'
        backup.mkdir(parents=True, exist_ok=True)
        for target in files:
            if target.exists() and not (backup/target.name).exists():
                (backup/target.name).write_bytes(target.read_bytes())
        for target, text in files.items():
            target.write_text(text, encoding='utf8', newline='\n')
    print(json.dumps({'pages': len(ledger['pages']), 'passages': len(ledger['passages']),
                      'spacesInserted': sum(len(p['insertions']) for p in ledger['passages'].values()),
                      'minimumAlignment': min(p['alignment'] for p in ledger['pages']), 'written': args.write}))


if __name__ == '__main__':
    main()
