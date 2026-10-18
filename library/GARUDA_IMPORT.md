# Garuda Purana: PDF → text/JSON → Supabase

**Current catalog:** Garuda has one draft text edition and no PDF edition/download.
The text can be restored without PDF files using [the catalog guide](README.md).
The extraction instructions below are historical editorial tools; optional source
PDFs belong in the private `backend/data/source-pdfs/` archive, never the frontend.

This is the procedure for the supplied **638-page abridged Hindi Gita Press edition**, book code 1189, ISBN 81-293-0285-3. Its filename is `Garuda Purana Original upayogibooks.com.pdf`; “Original” in that filename does not establish canonical completeness. Preserve its attribution and unverified reuse status. The result is an **unreviewed OCR draft**, not a reviewed transcription.

## 1. Identify and preserve the source

Read `AGENTS.md`, `library/README.md` and `backend/data/SOURCES.md`. The identity manifest is `library/documents/garuda-purana-hi.json`.

- SHA-256: `c05368e6b60c64f58b2b86b8a9375d483259cd81d6b2469faaafb4a698a6dcb0`.
- Original selected path: `frontend/dist/library/Garuda Purana Original upayogibooks.com.pdf`.
- Public copy: `frontend/public/library/garuda-purana.pdf`.
- Private recovery copy: `backend/data/source-pdfs/garuda-purana.pdf` (ignored by Git).
- Public source URL: `/library/garuda-purana.pdf`.

Verify the checksum before copying or extracting. Both copies must remain byte-identical, including existing watermarks. Preserve a copy outside `frontend/dist` before building: Vite clears that directory. Do not build while an OCR process is still reading the selected `dist` file.

## 2. Why ordinary PDF extraction does not work

Each page contains one scanned image. The searchable PDF text mainly consists of repeated website watermarks. Extracting that text layer does not extract the book. Unlike the Shiva/Manusmriti conversions, a font mapping cannot recover these photographed letters.

The OCR script makes an in-memory page from the embedded scan image. This prevents the separate watermark overlay from becoming scripture text. It does **not** edit or replace the original PDF.

## 3. Prepare local OCR

From the repository root, use the existing OCR virtual environment. If absent, create it with `python -m venv backend/.venv-ocr`.

```powershell
backend/.venv-ocr/Scripts/python.exe -m pip install -r backend/scripts/requirements-garuda-ocr.txt
New-Item -ItemType Directory -Force backend/data/transcription-drafts/garuda
Invoke-WebRequest -UseBasicParsing https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/4.1.0/hin.traineddata -OutFile backend/data/transcription-drafts/garuda/hin.traineddata
```

Pinned dependencies are PyMuPDF 1.28.2 and NumPy 2.5.4. Hindi model SHA-256 must be `bd2e65a2184af08a167b0be2439e91fa5edbc4394399ca2f692b843ae26e78d6`. The script verifies source and model hashes before processing. This uses local Tesseract through PyMuPDF; no paid OCR service is involved.

## 4. Extract in printed reading order

```powershell
$env:PYTHONIOENCODING='utf-8'
backend/.venv-ocr/Scripts/python.exe backend/scripts/ocr-garuda-purana.py --workers 4
```

The script processes 620 OCR pages. It detects the curved central divider, identifies bands of two-column text, and reads each band left column then right column before continuing below a full-width heading. Full-width notes remain in source order. The contents, page 160's full-width hymn, and page 456's opening illustration have explicit layout handling. RGB rendering at 300 dpi is required; a grayscale OCR trial returned empty text.

Illustrations must not become fake OCR words. `backend/data/transcription-manual/garuda-illustrations.json` records visually located picture rectangles on 24 pages; these are masked only in derived OCR inputs. Page 456's picture is handled separately. Adjacent prose and captions remain. Full-page covers and illustrations are handled with the explicit transcriptions below.

Checkpoints are UTF-8 JSON in `backend/data/transcription-ocr/garuda-columns-v2/` and `garuda-columns-v2-illustrations/`. Their identities contain the PDF/model hashes, recipe, PyMuPDF version, page, resolution and any picture masks. Each checkpoint also has a text checksum. Completed matching checkpoints are reused; changed identities or text hashes fail. For a targeted retry or sample:

```powershell
backend/.venv-ocr/Scripts/python.exe backend/scripts/ocr-garuda-purana.py --pages 14,20,160,456,614,635 --workers 2
```

An older full-page draft in `backend/data/transcription-drafts/garuda-purana-hi.json` interleaves columns. Do not import that obsolete scratch draft.

## 5. Account for covers, captions and blanks

`backend/data/transcription-manual/garuda-pages.json` contains visual transcriptions for 16 pages: 1, 2, 4, 5, 36–43, 465, 471, 637 and 638. It preserves titles, publisher details and printed captions without inventing artwork descriptions. For example, page 36 contains:

```text
भगवान् शंकरद्वारा भगवान् विष्णुकी स्तुति
गीताप्रेस, गोरखपुर
1189
```

Pages **3 and 636** were visually checked as having no printed book text. They are recorded as `blankPages`, with a verification note; they must not receive invented placeholder passages. Website watermarks and scan artifacts remain in the PDF.

## 6. Export the edition and verify coverage

```powershell
backend/.venv-ocr/Scripts/python.exe backend/tests/garuda_extraction_checks.py
backend/.venv-ocr/Scripts/python.exe backend/scripts/export-garuda-purana.py --write
```

Outputs under `library/editions/drafts/`:

- `garuda-purana-hi.json`: Gita-compatible edition → sections → passages structure, with draft/source metadata.
- `garuda-purana-hi.txt`: UTF-8 text with explicit PDF-page separators.
- `garuda-purana-hi.audit.json`: all 638 page classifications, source text hashes, checkpoint hashes, region coordinates and passage references.

Navigation sections are front matter (1–6), contents (7–13), आचारकाण्ड (14–455), धर्मकाण्ड—प्रेतकल्प (456–613), ब्रह्मकाण्ड (614–635), and back covers (636–638, omitting the blank page). These are six sections, not an invented chapter index. Passage references such as `3.1` are local reading-block identifiers, not canonical verses.

The exporter groups at most eight source lines per block, targeting at most 600 characters without splitting or truncating a line. It verifies that joining the blocks reproduces every nonempty OCR line exactly. It refuses missing pages, mismatched source/checkpoint hashes, invalid characters, and changed existing output. All **638 pages** must be accounted for: **636 text-bearing pages** (620 OCR + 16 visual transcriptions) and **two blanks**.

Do not remove uncertain words or “correct” scripture from memory. OCR spacing, spelling, Sanskrit, headers and ornament recognition remain subject to review. Complete page coverage does not prove every word was recognized correctly. Keep `reviewStatus: "unreviewed-draft"` and the original license/provenance.

## 7. Store in Supabase through the existing importer

Use the configured backend environment; never paste database credentials into code, documentation or logs. From the repository root:

```powershell
# Local schema, coverage, attribution and PDF validation only.
node backend/scripts/import-draft-edition.cjs library/editions/drafts/garuda-purana-hi.json
# Explicitly authorized database import.
node backend/scripts/import-draft-edition.cjs library/editions/drafts/garuda-purana-hi.json --apply
```

The importer resolves the existing `garuda-purana` scripture and creates a separate `draft` text edition with sections and passage rows. It uses `urn:sha256:<source hash>` as the edition source identity, adds PDF page/hash notes, writes a local recovery snapshot, batches passages within one transaction, and compares every stored record before committing. Stored rows are re-read in groups of 400 to keep database responses bounded; comparisons use reference indexes. The PDF edition remains available. Identical reruns preserve IDs and annotations; changed existing text is rejected. No schema migration is required.

Do **not** use the reviewed-transcription migration to bypass editorial review, mark this edition complete, or remove its source PDF.

## 8. Verify the API and reader

With the application API running on port 3001:

```powershell
node backend/scripts/verify-draft-api.cjs library/editions/drafts/garuda-purana-hi.json
```

This compares every passage's text, reference, order and normalized source notes, checks section counts, accounts for all pages, verifies the original PDF edition remains, and reports the reader route. The UI loads database text through the API, not the JSON file directly.

From `frontend/`, run the live reader check:

```powershell
$env:RUN_LIVE_LIBRARY='1'
npx.cmd playwright test tests/garuda-draft.spec.js --workers=1
```

It checks the default draft edition, exact displayed text, source notes, the three kandas, desktop/mobile layouts, the last page, browser errors, and absence of PDF requests. Public API requests stay live; authentication and private user writes are stubbed. Also run backend tests/build, frontend lint and build as required by `AGENTS.md`. Report any failed checks honestly.

## Reader layout

The Hindi draft shares Mahabharat's compact devotional toolbar, navigation dock,
and measured, responsive book pages. Source topic headings start on a fresh leaf;
Contents includes the six original sections and the detected topic headings.
Verses retain line breaks, while running headers and footnotes use smaller type.

Regenerate the presentation metadata from the unchanged draft and region audit:

```powershell
node backend/scripts/build-garuda-layout.cjs
```

Deploy `backend/data/layouts/garuda-purana.json` together with the backend build
and restart the API so it serves the new layout metadata.
The API verifies passage hashes before attaching layout ranges. These ranges
preserve every source character and all 5,277 existing passage IDs; no database
migration or content reimport is needed. Bookmarks, notes, search links and saved
positions continue to reference the same records. Chapter summaries and follow-up
questions use server-validated topic ranges rather than the entire kanda.

The 273 detected topic headings come from the source audit, not canonical verse
numbering. OCR text and heading recognition still require editorial review.
Run `backend/tests/garudaLayout.test.cjs` through `npm test` and
`npx playwright test tests/garuda-layout.spec.js tests/garuda-draft.spec.js`
from `frontend/` (set `RUN_LIVE_LIBRARY=1` for the live API check).

## Recover missing word spaces

The first OCR pipeline re-extracted Tesseract's generated PDF text layer, which
merged many adjacent Hindi words. The direct OCR pass reads `GetUTF8Text()` from
the same masked source regions and keeps the recognized spaces. It writes new
checkpoints; the old extraction is not overwritten.

From the repository root (Windows, Python 3.12):

```powershell
backend/.venv-ocr/Scripts/python.exe -m pip install -r backend/scripts/requirements-garuda-spacing.txt
backend/.venv-ocr/Scripts/python.exe backend/scripts/ocr-garuda-purana.py --word-spacing --workers 6
backend/.venv-ocr/Scripts/python.exe backend/scripts/recover-garuda-spacing.py
```

Review `tmp/pdfs/garuda-reader/spacing-preview/` against the PDF. The recovery
aligns matching characters and inserts only recognized spaces; it never replaces
letters, punctuation, line breaks, passage references or source-page assignments.
Unmatched OCR differences remain for editorial review. The `.spacing.json` ledger
records old/new hashes and reversible insertion positions for each changed passage.

After review, write the complete import and regenerate its layout:

```powershell
backend/.venv-ocr/Scripts/python.exe backend/scripts/recover-garuda-spacing.py --write
node backend/scripts/build-garuda-layout.cjs
node backend/scripts/apply-garuda-spacing.cjs
node backend/scripts/apply-garuda-spacing.cjs --apply
```

The apply script verifies the current database text, saves a recovery snapshot in
ignored `backend/backups/`, updates text and word counts in one transaction, remaps
highlight offsets, and verifies the complete edition before committing. Passage
IDs, notes, bookmarks and reading positions are retained. Restart the API after
deploying the matching layout file and refresh the reader. This is a spacing-only
draft correction, not certification that every OCR word or contents number is correct.

The completed recovery inserts 171,414 spaces across 5,251 existing passages,
covering all 620 OCR pages. The other 26 passages are unchanged. All 5,277
passage references and every non-whitespace character remain intact. The reader
displays the printed contents as 304 separate entries and retains the 273 detected
topic headings with fresh-page starts.

## Initial import record

The supplied PDF was processed and imported on 2026-10-17. The output contains **5,277 reading blocks in six sections**: front matter (13), contents (68), आचारकाण्ड (3,692), धर्मकाण्ड—प्रेतकल्प (1,314), ब्रह्मकाण्ड (188), and back covers (2). Source pages 3 and 636 are blank; the other 636 pages have manually transcribed text/captions or OCR. Every stored passage matched the JSON through the API, and all 638 pages were accounted for.

- Supabase scripture ID: `338ac12a-2ba7-4717-9cad-b0480aef1c0c`.
- Draft edition ID: `b516980c-6e2a-4b78-a50f-755d5636db00`.
- Reader route: `/reader/338ac12a-2ba7-4717-9cad-b0480aef1c0c/b516980c-6e2a-4b78-a50f-755d5636db00`.
- `backend/tests/garuda_extraction_checks.py`: six checks passed; backend build and 59 tests passed. Frontend PDF checks and build passed; lint completed with existing warnings; the live Garuda desktop/mobile reader test passed.

The text is still an OCR draft. Complete coverage and passage-for-passage database equality do not replace proofreading; OCR spelling, spacing, Sanskrit and occasional illustration/ornament recognition need editorial review. Keep the scan edition and draft label until reviewed.
