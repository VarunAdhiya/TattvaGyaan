"""Stage source text for correction; never import it or mark it reviewed."""
import argparse
import hashlib
import json
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]


def prepare(book=None):
    destination = ROOT / 'backend/data/transcription-drafts'
    destination.mkdir(parents=True, exist_ok=True)
    manifests = sorted((ROOT / 'library/documents').glob('*.json'))
    if book:
        manifests = [manifest for manifest in manifests if manifest.stem == book]
        if not manifests:
            raise ValueError('Unknown document manifest: ' + book)
    for manifest in manifests:
        metadata = json.loads(manifest.read_text(encoding='utf-8'))
        output = destination / manifest.name
        if output.exists():
            print(json.dumps({'book': manifest.stem, 'status': 'existing draft preserved'}), flush=True)
            continue
        source = ROOT / 'frontend/public' / metadata['source'].lstrip('/')
        if not source.exists():
            source = ROOT / 'backend/data/source-pdfs' / Path(metadata['source']).name
        if hashlib.sha256(source.read_bytes()).hexdigest() != metadata['sha256']:
            raise ValueError('Source checksum mismatch: ' + manifest.name)
        with pymupdf.open(source) as pdf:
            if len(pdf) != metadata['pageCount']:
                raise ValueError('Source page count mismatch: ' + manifest.name)
            pages = []
            for number, page in enumerate(pdf, 1):
                pages.append({'number': number, 'extractedText': page.get_text(),
                              'text': None, 'kind': None, 'review': None})
            draft = {'formatVersion': 1, 'source': metadata['source'],
                     'sourceSha256': metadata['sha256'], 'pageCount': len(pdf), 'pages': pages}
            with output.open('x', encoding='utf-8') as stream:
                json.dump(draft, stream, ensure_ascii=False, indent=2)
                stream.write('\n')
        print(json.dumps({'book': manifest.stem, 'pages': len(pages),
                          'reviewedPages': 0, 'status': 'needs correction and review'}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--book', help='Manifest filename without .json; defaults to all books.')
    prepare(parser.parse_args().book)
