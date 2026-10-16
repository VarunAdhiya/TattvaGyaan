"""Offline, resumable Hindi/Sanskrit/English OCR. Output is an unreviewed draft."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODELS = ROOT / 'backend/data/ocr-models'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_json(filename):
    return json.loads(filename.read_text(encoding='utf-8'))


def save_json(filename, value):
    filename.parent.mkdir(parents=True, exist_ok=True)
    temporary = filename.with_name(filename.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        with temporary.open('x', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, filename)
    finally:
        temporary.unlink(missing_ok=True)


@contextmanager
def run_lock(filename):
    """OS lock releases even after a crash; keep the inode to avoid unlink races."""
    filename.parent.mkdir(parents=True, exist_ok=True)
    with filename.open('a+b') as stream:
        if stream.seek(0, os.SEEK_END) == 0:
            stream.write(b'0')
            stream.flush()
        stream.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            raise RuntimeError('Another local OCR process is writing drafts. Wait for it to finish.') from error
        try:
            yield
        finally:
            stream.seek(0)
            if os.name == 'nt':
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def documents(root, books):
    manifests = sorted((root / 'library/documents').glob('*.json'))
    unknown = set(books) - {item.stem for item in manifests}
    if unknown:
        raise ValueError('Unknown book: ' + ', '.join(sorted(unknown)))
    result = []
    for filename in manifests:
        if books and filename.stem not in books:
            continue
        document = read_json(filename)
        if not re.fullmatch(r'/library/[a-z0-9][a-z0-9-]*\.pdf', document['source']):
            raise ValueError('Invalid source path in ' + filename.name)
        source = root / 'frontend/public' / document['source'].lstrip('/')
        if not source.exists():
            source = root / 'backend/data/source-pdfs' / Path(document['source']).name
        with source.open('rb') as stream:
            header = stream.read(5)
            stream.seek(0)
            checksum = hashlib.file_digest(stream, 'sha256').hexdigest()
        if header != b'%PDF-' or checksum != document['sha256']:
            raise ValueError('PDF checksum/header mismatch: ' + filename.name)
        result.append((filename.stem, document, source))
    return result


def validate_draft(draft, document):
    if (draft.get('formatVersion') != 1 or draft.get('source') != document['source'] or
            draft.get('sourceSha256') != document['sha256'] or
            draft.get('pageCount') != document['pageCount'] or
            len(draft.get('pages', [])) != document['pageCount'] or
            [page.get('number') for page in draft['pages']] != list(range(1, document['pageCount'] + 1))):
        raise ValueError('Draft source, checksum or page order differs from the original PDF.')
    for page in draft['pages']:
        if not all(key in page for key in ['text', 'kind', 'review']):
            raise ValueError('Draft page lacks text, kind or review fields.')


def needs_ocr(page):
    # Never overwrite editorial changes, reviewed pages, or a previously staged result.
    return page['text'] is None and page['kind'] is None and page['review'] is None


def stage_result(page, result):
    if not needs_ocr(page):
        return False
    page['text'] = result['text']
    # No recognized text is NOT evidence that the printed page is blank.
    page['kind'] = 'text' if result['text'].strip() else None
    page['review'] = None
    return True


def model_identity(directory, languages):
    identity = {}
    recorded = read_json(directory / 'models.json') if (directory / 'models.json').exists() else {}
    for language in languages.split('+'):
        if not re.fullmatch('[a-z]{3}', language):
            raise ValueError('Use language codes such as hin+san+eng.')
        filename = directory / f'{language}.traineddata'
        if not filename.is_file():
            raise ValueError(f'Missing {filename.name}. Run python scripts/setup-local-ocr.py first.')
        checksum = digest(filename.read_bytes())
        if filename.name in recorded and recorded[filename.name]['sha256'] != checksum:
            raise ValueError(f'{filename.name}: model checksum mismatch.')
        identity[language] = checksum
    return identity


def cached_result(filename, identity):
    if not filename.exists():
        return None
    result = read_json(filename)
    if result.get('identity') != identity:
        raise ValueError(f'{filename}: cached OCR settings differ; preserve/review it before changing settings.')
    if not isinstance(result.get('text'), str) or digest(result['text'].encode('utf-8')) != result.get('textSha256'):
        raise ValueError(f'{filename}: cached OCR text checksum mismatch.')
    return result


def process_book(root, book, document, source, options, engine, models, remaining):
    draft_file = root / 'backend/data/transcription-drafts' / f'{book}.json'
    cache = root / 'backend/data/transcription-ocr/local' / book
    with engine.open(source) as pdf:
        if len(pdf) != document['pageCount']:
            raise ValueError(f'{book}: PDF page count differs from the source manifest.')
        if draft_file.exists():
            draft = read_json(draft_file)
            validate_draft(draft, document)
        else:
            draft = {'formatVersion': 1, 'source': document['source'], 'sourceSha256': document['sha256'],
                     'pageCount': len(pdf), 'pages': [
                         {'number': number + 1, 'extractedText': page.get_text(),
                          'text': None, 'kind': None, 'review': None}
                         for number, page in enumerate(pdf)]}
            save_json(draft_file, draft)
        processed = 0
        failures = 0
        backed_up = False
        for page in draft['pages']:
            if processed >= remaining:
                break
            if page['number'] < options.start_page or not needs_ocr(page):
                continue
            started = time.monotonic()
            identity = {'sourceSha256': document['sha256'], 'page': page['number'], 'dpi': options.dpi,
                        'languages': options.languages, 'models': models, 'pymupdf': engine.VersionBind,
                        'recipe': 'full-page-tesseract-v1'}
            filename = cache / f'{page["number"]:04d}.json'
            result = cached_result(filename, identity)
            from_cache = result is not None
            if result is None:
                try:
                    original = pdf[page['number'] - 1]
                    textpage = original.get_textpage_ocr(language=options.languages, dpi=options.dpi,
                                                        full=True, tessdata=str(options.tessdata.resolve()))
                    # Preserve OCR block reading order instead of interleaving columns by Y coordinate.
                    text = original.get_text(textpage=textpage, sort=False)
                    result = {'identity': identity, 'text': text, 'textSha256': digest(text.encode('utf-8')),
                              'createdAt': datetime.now(timezone.utc).isoformat(), 'reviewed': False}
                    save_json(filename, result)
                except Exception as error:
                    failures += 1
                    processed += 1
                    save_json(cache / f'{page["number"]:04d}.error.json', {'identity': identity, 'error': str(error)})
                    print(json.dumps({'book': book, 'page': page['number'], 'status': 'failed', 'error': str(error)}), flush=True)
                    continue
            if not backed_up:
                backup = root / 'backend/backups' / f'before-local-ocr-{book}-{uuid.uuid4().hex}.json'
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(draft_file, backup)
                backed_up = True
            # Reload before writing to preserve reviews/edits saved during OCR.
            draft = read_json(draft_file)
            validate_draft(draft, document)
            if stage_result(draft['pages'][page['number'] - 1], result):
                save_json(draft_file, draft)
            (cache / f'{page["number"]:04d}.error.json').unlink(missing_ok=True)
            processed += 1
            print(json.dumps({'book': book, 'page': page['number'], 'characters': len(result['text']),
                              'status': 'needs_review' if result['text'].strip() else 'no_text_detected_needs_review',
                              'cached': from_cache, 'seconds': round(time.monotonic() - started, 2)}), flush=True)
        print(json.dumps({'book': book, 'processed': processed, 'failed': failures,
                          'remainingOcrPages': sum(needs_ocr(page) for page in draft['pages']),
                          'unreviewedPages': sum(page['review'] is None for page in draft['pages'])}), flush=True)
        return processed, failures


def parse_args(args=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true', help='Run local OCR; default is a read-only plan.')
    parser.add_argument('--book', action='append', default=[], help='Manifest name without .json; repeat to select books.')
    parser.add_argument('--limit-pages', type=int, help='Maximum page attempts in this invocation across selected books.')
    parser.add_argument('--start-page', type=int, default=1, help='First source page to consider (1-based).')
    parser.add_argument('--dpi', type=int, default=300, help='Raster resolution, 150 to 600 (default: 300).')
    parser.add_argument('--languages', default='hin+san+eng')
    parser.add_argument('--tessdata', type=Path, default=DEFAULT_MODELS)
    options = parser.parse_args(args)
    if options.limit_pages is not None and options.limit_pages < 1:
        parser.error('--limit-pages must be positive')
    if options.start_page < 1 or not 150 <= options.dpi <= 600:
        parser.error('--start-page must be positive and --dpi must be 150 to 600')
    return options


def main(args=None):
    options = parse_args(args)
    selected = documents(ROOT, options.book)
    print(json.dumps({'engine': 'local Tesseract via PyMuPDF', 'network': False, 'execute': options.execute,
                      'books': [{'book': book, 'pages': document['pageCount']} for book, document, _ in selected]}), flush=True)
    if not options.execute:
        return 0
    models = model_identity(options.tessdata, options.languages)
    os.environ.setdefault('OMP_THREAD_LIMIT', '2')
    try:
        import pymupdf
    except ImportError as error:
        raise RuntimeError('Install scripts/requirements-transcription.txt in your Python environment first.') from error
    remaining = options.limit_pages if options.limit_pages is not None else float('inf')
    failures = 0
    with run_lock(ROOT / 'backend/data/transcription-ocr/local.lock'):
        for book, document, source in selected:
            if remaining <= 0:
                break
            processed, failed = process_book(ROOT, book, document, source, options, pymupdf, models, remaining)
            remaining -= processed
            failures += failed
    print('OCR drafts saved locally. Review/correct them before database import; PDFs are unchanged.', flush=True)
    return 1 if failures else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print('Interrupted. Completed pages are saved; rerun the same command to resume.', file=sys.stderr)
        sys.exit(130)
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
