"""Resumable column-aware OCR of the exact user-supplied Garuda Purana scan.

This produces local, unreviewed page checkpoints only; it never writes a database.
The original PDF and its watermarks are not modified. OCR reads the embedded scan
image so repeated website overlays do not become scripture passages.
"""
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path
import argparse
import hashlib
import json
import os
import time

os.environ.setdefault('OMP_THREAD_LIMIT', '1')
import numpy as np
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SOURCE = next((candidate for candidate in [
    ROOT / 'frontend/dist/library/Garuda Purana Original upayogibooks.com.pdf',
    ROOT / 'frontend/public/library/garuda-purana.pdf',
    ROOT / 'backend/data/source-pdfs/garuda-purana.pdf',
] if candidate.exists()), ROOT / 'frontend/public/library/garuda-purana.pdf')
CACHE = ROOT / 'backend/data/transcription-ocr/garuda-columns-v2'
MODEL = ROOT / 'backend/data/transcription-drafts/garuda'
SOURCE_SHA = 'c05368e6b60c64f58b2b86b8a9375d483259cd81d6b2469faaafb4a698a6dcb0'
MODEL_SHA = 'bd2e65a2184af08a167b0be2439e91fa5edbc4394399ca2f692b843ae26e78d6'
MODEL_URL = 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/4.1.0/hin.traineddata'
# Covers, colour plates, two full-page illustrations, and blank scan pages are
# handled by explicit visual transcription/classification, not noisy OCR.
MANUAL_PAGES = {1,2,3,4,5,36,37,38,39,40,41,42,43,465,471,636,637,638}
RECIPE = 'garuda-curved-column-bands-rgb-300dpi-hin-best-v2'
ILLUSTRATIONS = json.loads((ROOT / 'backend/data/transcription-manual/garuda-illustrations.json').read_text(encoding='utf8'))
assert ILLUSTRATIONS['sourceSha256'] == SOURCE_SHA
MASKED_CACHE = ROOT / 'backend/data/transcription-ocr/garuda-columns-v2-illustrations'


def checkpoint_identity(number):
    identity = {'recipe': RECIPE, 'sourceSha256': SOURCE_SHA, 'modelSha256': MODEL_SHA,
                'pymupdf': pymupdf.VersionBind, 'page': number, 'dpi': 300}
    masks = ILLUSTRATIONS['rectangles'].get(str(number), [])
    if masks:
        identity['illustrationMasks'] = masks
    return identity


def checkpoint_path(number):
    directory = MASKED_CACHE if str(number) in ILLUSTRATIONS['rectangles'] else CACHE
    return directory / f'{number:04d}.json'


def ranges(mask):
    edges = np.diff(np.r_[False, mask, False].astype(np.int8))
    return list(zip(np.flatnonzero(edges == 1).tolist(), np.flatnonzero(edges == -1).tolist()))


def detect_layout(page, number):
    pix = page.get_pixmap(colorspace=pymupdf.csGRAY)
    ink = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width) < 225
    h, w = ink.shape
    if number == 6:
        return [], None
    if 7 <= number <= 13:
        # Contents have an open gutter, not a central printed rule.
        left, right = int(w*.46), int(w*.54)
        density = ink[150:min(h-40,780),left:right].sum(axis=0)
        smooth = np.convolve(density, np.ones(5)/5, mode='valid')
        center = int(np.argmin(smooth))+left+2
        top = 146 if number == 7 else (150 if number == 13 else 84)
        return [[top, h-25]], [(0, center), (h, center)]
    if number == 160:
        # Two prose rows followed by a full-width Sanskrit hymn.
        return [[69,112]], [(0,278),(h,278)]
    x0, x1 = int(w*.40), int(w*.58)
    strip = ink[:,x0:x1] | ink[:,x0-1:x1-1] | ink[:,x0+1:x1+1]
    cumulative = np.vstack([np.zeros((1,strip.shape[1]),dtype=np.int32), np.cumsum(strip,axis=0)])
    vertical = cumulative[35:] - cumulative[:-35] >= 32
    # A bold heading can accidentally align with a body glyph for a few rows.
    # Require persistence before treating that stroke as the column divider.
    for x in range(vertical.shape[1]):
        for a,b in ranges(vertical[:,x]):
            if b-a < 10:
                vertical[a:b,x] = False
    # Search the full central corridor: the scanned gutter bends appreciably.
    segments = ranges(vertical.any(axis=1))
    bands = []
    for a,b in segments:
        b += 34
        if bands and a-bands[-1][1] < 12:
            bands[-1][1] = b
        else:
            bands.append([a,b])
    if number == 456:
        bands = [band for band in bands if band[0] > 300]  # opening illustration
    if not bands:
        raise ValueError(f'Page {number}: no reliable column rule; inspect before continuing')
    centers = []
    last = int(np.argmax(vertical.sum(axis=0)))+x0
    for y in range(vertical.shape[0]):
        candidates = np.flatnonzero(vertical[y])+x0
        if len(candidates):
            closest = candidates[np.argmin(abs(candidates-last))]
            nearby = candidates[abs(candidates-closest) <= 3]
            last = float(np.median(nearby))
            centers.append((y+17, last))
    # Safe horizontal cuts in whitespace avoid clipping descenders at rule ends.
    density = ink[:,20:w-20].sum(axis=1)
    for band in bands:
        for index in (0,1):
            boundary = band[index]
            candidates = np.arange(max(0,boundary-5), min(h,boundary+6))
            score = density[candidates] + abs(candidates-boundary)*.2
            band[index] = int(candidates[np.argmin(score)])
    return bands, centers


def read_lines(ocr_page):
    lines = []
    for x0,y0,x1,y1,text,*_ in ocr_page.get_text('words'):
        if not text.strip():
            continue
        center = (y0+y1)/2
        line = next((line for line in lines if abs(line['center']-center) < 4), None)
        if line is None:
            line = {'center':center,'words':[]}
            lines.append(line)
        line['words'].append((x0,text))
    return [' '.join(text for _,text in sorted(line['words']))
            for line in sorted(lines,key=lambda line:line['center'])]


def process_page(number):
    filename = checkpoint_path(number)
    identity = checkpoint_identity(number)
    if filename.exists():
        cached = json.loads(filename.read_text(encoding='utf8'))
        assert cached['identity'] == identity, 'Checkpoint settings changed'
        assert cached['textSha256'] == hashlib.sha256('\n'.join(r['text'] for r in cached['regions']).encode()).hexdigest(), 'Checkpoint text changed'
        return number, sum(len(r['text']) for r in cached['regions']), True
    with pymupdf.open(SOURCE) as pdf:
        source_page = pdf[number-1]
        images = source_page.get_images()
        assert len(images) == 1
        # Derived in-memory OCR input only; original public PDF remains intact.
        with pymupdf.open() as scan:
            page = scan.new_page(width=source_page.rect.width,height=source_page.rect.height)
            page.insert_image(page.rect,stream=pdf.extract_image(images[0][0])['image'])
            for rectangle in identity.get('illustrationMasks', []):
                # Derived input only. Picture strokes otherwise become fake words.
                box = pymupdf.Rect(rectangle)
                assert not box.is_empty and page.rect.contains(box), 'Picture mask outside source page'
                page.draw_rect(box, color=None, fill=(1,1,1), overlay=True)
            bands, centers = detect_layout(page,number)
            boxes = []
            position = 12
            for a,b in bands:
                if a > position:
                    boxes.append(('full-width',position,a))
                boxes.extend([('left-column',a,b),('right-column',a,b)])
                position = b
            if position < page.rect.height-12:
                boxes.append(('full-width',position,page.rect.height-12))
            if not bands:
                boxes = [('full-width',12,page.rect.height-12)]
            regions = []
            for kind,top,bottom in boxes:
                if bottom-top < 5:
                    continue
                # Keep the opening invocation and title; skip only the picture.
                if number == 456 and kind == 'full-width' and top < 300:
                    parts = [(top,91),(284,bottom)]
                else:
                    parts = [(top,bottom)]
                for a,b in parts:
                    if b-a < 5:
                        continue
                    clip = pymupdf.Rect(12,a,page.rect.width-12,b)
                    pix = page.get_pixmap(dpi=300,clip=clip)
                    samples = np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width,3).copy()
                    if centers and kind != 'full-width':
                        ys = (np.arange(pix.height)+pix.y)/ (300/72)
                        cuts = np.interp(ys,[c[0] for c in centers],[c[1] for c in centers]) * (300/72) - pix.x
                        xx = np.arange(pix.width)[None,:]
                        # Two-point overlap covers the printed rule; no glyphs
                        # are chopped by a rectangular cut through a bent page.
                        mask = xx > cuts[:,None]+2 if kind == 'left-column' else xx < cuts[:,None]-2
                        samples[mask] = 255
                        extent = (0,int(cuts.max()+4)) if kind == 'left-column' else (int(cuts.min()-4),pix.width)
                        samples = samples[:,max(0,extent[0]):min(pix.width,extent[1]),:]
                    # Blank margins and ornaments with very little ink are not
                    # a source of prose. Record empty regions in the audit.
                    ink_pixels = int((samples.mean(axis=2)<120).sum())
                    text, lines = '', []
                    if ink_pixels > 150:
                        rgb = pymupdf.Pixmap(pymupdf.csRGB,samples.shape[1],samples.shape[0],samples.tobytes(),False)
                        rgb.set_dpi(300,300)  # RGB required for reliable OCR here.
                        result = rgb.pdfocr_tobytes(language='hin',tessdata=str(MODEL))
                        with pymupdf.open('pdf',result) as recognized:
                            lines = read_lines(recognized[0])
                            text = '\n'.join(lines).strip()
                    regions.append({'kind':kind,'top':round(a,2),'bottom':round(b,2),
                                    'text':text,'lines':lines,'inkPixels':ink_pixels})
    result = {'identity':identity,'reviewStatus':'unreviewed-draft','regions':regions,
              'textSha256':hashlib.sha256('\n'.join(r['text'] for r in regions).encode()).hexdigest()}
    temporary = filename.with_suffix('.tmp')
    temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    temporary.replace(filename)
    return number,sum(len(r['text']) for r in regions),False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pages',help='Comma-separated PDF page numbers for a sample; default all OCR pages')
    parser.add_argument('--workers',type=int,default=3)
    args = parser.parse_args()
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_SHA
    assert hashlib.sha256((MODEL/'hin.traineddata').read_bytes()).hexdigest() == MODEL_SHA
    CACHE.mkdir(parents=True,exist_ok=True)
    MASKED_CACHE.mkdir(parents=True,exist_ok=True)
    selected = [int(n) for n in args.pages.split(',')] if args.pages else list(range(1,639))
    selected = [n for n in selected if n not in MANUAL_PAGES]
    assert all(1 <= n <= 638 for n in selected)
    started = time.monotonic()
    failures = []
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        pending = {executor.submit(process_page,n):n for n in selected}
        for index,future in enumerate(as_completed(pending),1):
            try:
                number,characters,cached = future.result()
                print(json.dumps({'page':number,'characters':characters,'cached':cached,
                                  'completed':index,'total':len(selected),'seconds':round(time.monotonic()-started)}),flush=True)
            except Exception as error:
                failures.append(pending[future])
                print(json.dumps({'page':pending[future],'error':str(error)}),flush=True)
    if failures:
        raise RuntimeError(f'Failed pages: {failures}; completed checkpoints preserved')


if __name__ == '__main__':
    main()
