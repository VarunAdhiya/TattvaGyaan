# Corrected text imports

**Historical workflow:** PDF editions have been retired. The application now
publishes one text edition per remaining book, with draft labels preserved.
Use [the current catalog guide](../README.md) for imports and deployment. The
review rules below still apply to editorial work, but do not republish PDFs or
restore retired books/editions through this former migration workflow.

PDF editions keep using the PDF reader until **every source page** has corrected text and an explicit review. Raw extraction, OCR output, and a successful script run are not evidence of textual accuracy. The Gita import is unchanged.

## Current source coverage

| Document manifest | Source pages |
| --- | ---: |
| `bal-mahabharat-katha-hi` | 96 |
| `garuda-purana-hi` | 638 |
| `manusmriti-hi` | 509 |
| `ramcharitmanas-hi` | 1,058 |
| `rigved-hi` | 739 |
| `shiva-purana-hi` | 845 |
| `valmiki-ramayana-ramakien-study-hi` | 266 |
| **Total** | **4,151** |

All seven original PDFs are available and match their recorded SHA-256 hashes. No corrected transcription has been approved or imported. The existing text layers contain encoding errors; Rigveda is image-only, and Garuda Purana's extractable text mostly consists of watermarks.

## Prepare drafts

From `backend/`, use Python 3.11 or newer. On Windows, install the free local OCR dependency and language data once:

```powershell
python -m venv .venv-ocr
.\.venv-ocr\Scripts\python.exe -m pip install -r scripts/requirements-transcription.txt
python scripts/setup-local-ocr.py
```

On Linux/macOS the virtual environment's Python is `.venv-ocr/bin/python`. The Node entry point detects either layout; `TRANSCRIPTION_PYTHON` can select another Python environment. The pinned PyMuPDF wheel includes the OCR engine, so a system Tesseract executable and GPU are unnecessary. The setup script downloads only the official Tesseract `tessdata_fast` 4.1.0 Hindi (`hin`), Sanskrit (`san`) and English (`eng`) language files and their license, verifies pinned SHA-256 checksums and stores them in ignored `backend/data/ocr-models/`. No PDF content is sent anywhere. Setup is the only step needing internet access.

Drafts go to the ignored `backend/data/transcription-drafts/` directory. The OCR runner prepares missing drafts itself, checks original PDF hashes and page counts, and preserves existing drafts. To prepare only raw text-layer extraction without OCR, run `.\.venv-ocr\Scripts\python.exe scripts/prepare-transcriptions.py`.

## Correct and review

Compare each page with the corresponding original PDF page. Preserve its words, verse numbers, accents, punctuation, translations, notes, and reading order. Resolve legacy font encodings and OCR errors without guessing. Do not substitute another edition or infer chapter/verse references.

In the draft JSON, fill each page's `text` with the corrected text and set `kind` to `text`. For a reviewed page containing no text, use `kind: "no_text"` and `text: ""`; do not insert a placeholder passage. Keep every page in its original order.

Only after completing the visual review, record who reviewed the page:

```powershell
node scripts/review-transcription-page.cjs data/transcription-drafts/rigved-hi.json 1 "Reviewer name"
```

This command records an attestation; it does not correct or verify the words. Subsequent text/classification edits invalidate that page's review checksum. Previous drafts are backed up locally. Move a fully corrected, reviewed file into `library/transcriptions/` for version control.

## Validate and import

```powershell
node scripts/import-transcription.cjs ../library/transcriptions/rigved-hi.json
node scripts/import-transcription.cjs ../library/transcriptions/rigved-hi.json --apply
```

The first command validates without connecting to Supabase. The second imports through the configured `DATABASE_URL` in one transaction, with a local recovery snapshot. It preserves the edition ID, remaps saved positions around pages without text, and refuses to overwrite existing text/annotations. Repeating an identical import preserves passage IDs.

Each source page with text becomes a section and passage, identified by its PDF page number. Verse numbers remain within the corrected text; segmentation into individual verses requires separate editorial work. Only after successful import does `contentStatus: transcribed` activate the database text reader. It does not mark an abridged work or partial collection as canonically complete. Catalog synchronization preserves converted editions.

## OCR and final database migration

OCR uses local Tesseract through PyMuPDF. It makes **no network requests**, loads no API keys, and has no paid-model fallback. The former paid OCR implementation has been removed.

```powershell
# Read-only plan of all seven PDFs.
node scripts/transcribe-library.cjs

# OCR all remaining pages, using Hindi + Sanskrit + English at 300 DPI.
node scripts/transcribe-library.cjs --execute

# Small trial, or resume one book (already staged or edited pages are skipped).
node scripts/transcribe-library.cjs --execute --book rigved-hi --limit-pages 5

# Start at a specific source page; the limit is global per invocation.
node scripts/transcribe-library.cjs --execute --book garuda-purana-hi --start-page 10 --limit-pages 2
```

The Python entry point is `scripts/ocr-library.py`. Options include repeatable `--book`, `--start-page`, `--limit-pages`, `--dpi` (150–600), `--languages` and `--tessdata`. A full run over 4,151 pages can take hours; processing is sequential to bound memory use. Stop with Ctrl+C and rerun the same command to resume. An operating-system lock prevents two OCR processes from writing drafts simultaneously and releases after a crash.

Each completed page is checkpointed in `backend/data/transcription-ocr/local/<book>/<page>.json`, including the source hash, page number, engine version, DPI, language model hashes and raw OCR text checksum. Interrupted draft writes recover from these checkpoints. Failed pages stay pending, receive a separate `.error.json` file, and are retried on the next run; any failures give a nonzero exit status. Changed settings on an unstaged cached page require explicit review of the old checkpoint rather than silently replacing it. Existing draft text and reviews are preserved, and a recovery copy is saved before staging a book's new OCR results.

The candidate is staged in each page's `text`; the old `extractedText` remains available for comparison. Every OCR page keeps `review: null`. Empty OCR results keep `kind: null` because an OCR failure does not prove the page is blank. Correct words, verse labels, Vedic accents and multi-column reading order against the original before recording a review. OCR neither invents verse boundaries nor imports content or removes PDFs. Follow the review and import steps above after correction.

When all seven corrected transcriptions are ready, run these commands from `backend/`:

```powershell
node scripts/library-text-status.cjs
node scripts/migrate-library-text.cjs
node scripts/migrate-library-text.cjs --apply
```

The dry run rolls back its import transaction. The apply command commits all verified imports before removing any frontend PDFs. Originals are retained under `backend/data/source-pdfs/` with verified SHA-256 checksums for private recovery and review. PDF source identifiers remain in database provenance, but text editions do not link to a deleted public asset. Re-running the migration checks stored text without changing passage IDs. Back up the private originals separately from the frontend deployment.
