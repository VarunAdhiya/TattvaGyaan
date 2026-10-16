"""Render one catalog page for text extraction; emit PNG bytes on stdout."""
import json
from pathlib import Path
import sys
import pymupdf

root = Path(__file__).resolve().parents[2]
book, number = sys.argv[1], int(sys.argv[2])
manifests = {item.stem: item for item in (root / 'library/documents').glob('*.json')}
metadata = json.loads(manifests[book].read_text(encoding='utf-8'))
source = (root / 'frontend/public' / metadata['source'].lstrip('/')).resolve()
source.relative_to((root / 'frontend/public/library').resolve())
if not source.exists():
    source = root / 'backend/data/source-pdfs' / source.name
with pymupdf.open(source) as document:
    if len(document) != metadata['pageCount'] or not 1 <= number <= len(document):
        raise ValueError('Source page count or requested page does not match the manifest.')
    page = document[number - 1]
    scale = min(200 / 72, 2400 / max(page.rect.width, page.rect.height))
    sys.stdout.buffer.write(page.get_pixmap(matrix=pymupdf.Matrix(scale, scale)).tobytes('png'))
