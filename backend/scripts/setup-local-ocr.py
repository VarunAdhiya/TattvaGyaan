"""Download free Tesseract language data once. No documents leave this computer."""
import hashlib
import json
from pathlib import Path
import urllib.request

DIRECTORY = Path(__file__).resolve().parents[1] / 'data/ocr-models'
BASE = 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0'
FILES = {
    'hin.traineddata': '4c73ffc59d497c186b19d1e90f5d721d678ea6b2e277b719bee4e2af12271825',
    'san.traineddata': 'a399958921c64e7d2319369ade1e74b4db2577744ac5bfeabd16663cf743b91c',
    'eng.traineddata': '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2',
    'LICENSE': 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30',
}


def setup():
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    manifest_file = DIRECTORY / 'models.json'
    manifest = json.loads(manifest_file.read_text(encoding='utf-8')) if manifest_file.exists() else {}
    for name in FILES:
        destination = DIRECTORY / name
        if not destination.exists():
            request = urllib.request.Request(f'{BASE}/{name}', headers={'User-Agent': 'TattvaGyaan-local-OCR'})
            with urllib.request.urlopen(request, timeout=60) as response:
                data = response.read(30 * 1024 * 1024)
            if name.endswith('.traineddata') and len(data) < 100000:
                raise ValueError(f'{name}: language data download is incomplete')
            if hashlib.sha256(data).hexdigest() != FILES[name]:
                raise ValueError(f'{name}: downloaded data differs from the pinned release checksum')
            temporary = destination.with_suffix('.download')
            temporary.write_bytes(data)
            temporary.replace(destination)
        checksum = hashlib.sha256(destination.read_bytes()).hexdigest()
        if checksum != FILES[name]:
            raise ValueError(f'{name}: checksum differs from the pinned release')
        if name in manifest and manifest[name]['sha256'] != checksum:
            raise ValueError(f'{name}: checksum changed; restore the original language data')
        manifest[name] = {'url': f'{BASE}/{name}', 'sha256': checksum}
        temporary = manifest_file.with_suffix('.tmp')
        temporary.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
        temporary.replace(manifest_file)
        print(json.dumps({'file': name, 'sha256': checksum}), flush=True)
    print('Local OCR language data ready. OCR itself requires no network or API key.')


if __name__ == '__main__':
    setup()
