# Ramayan reader and catalog consolidation

The single **Ramayan** collection (`ramayana`) contains the existing Ramcharitmanas
text/PDF editions and Dr. Karuna Sharma's **वाल्मीकि रामायण और रामकीर्ति
(रामकियन): एक तुलनात्मक अध्ययन** text/PDF editions. The study is the preferred
edition. Its identity, copyright, Embassy of India attribution and ISBN remain
explicit; it is not labeled as the primary Valmiki Ramayana.

## Source and layout

The supplied Downloads PDF matches `frontend/public/library/valmiki-ramayana-ramakien-study.pdf`:
266 pages, SHA-256 `759f2adbfd2fc1191ff8576401d1cbc34bbfefaf79a573e8747c53d4c858af75`.
The original file is unchanged and downloadable from the reader cover.

The draft has **1,189 passages in 60 sections**: 50 printed topics plus front
matter and three part openings. Ten visually checked blank pages remain in the
PDF and coverage audit. The extractor decodes Kruti Dev 010, excludes invisible
white text and printed folios from prose, and records folios as metadata. Image
text on pages 4, 7, 17–19 was transcribed from rendered pages. The checked-in font
map identifies its reference; three unusual i-matra sequences were compared with
rendered pages 149, 178 and 181. Printed spelling is preserved.

The shared Mahabharat/Garuda/Manusmriti reader supplies the devotional toolbar,
compact navigation, themes, font sizing, fullscreen, contents and annotations.
Comparison labels, quotations and footnotes have separate blocks. Topics start
on fresh leaves. A reader page never combines text from different PDF pages;
small screens and larger fonts may split one source page across several leaves.
The footer shows the source PDF page and printed folio when available. Reader
page numbers therefore differ from the PDF. The exact original appearance is
available in the PDF edition. The text remains **draft / not fully proofread**.

## Rebuild and validate

From the repository root, with the existing transcription Python environment:

```powershell
backend/.venv-ocr/Scripts/python.exe backend/scripts/extract-ramayan-study.py
backend/.venv-ocr/Scripts/python.exe backend/tests/ramayan_checks.py
node backend/scripts/import-draft-edition.cjs library/editions/drafts/ramayan-study-hi.json
```

The first command writes audit previews under ignored `tmp/pdfs/ramayan-reader/`.
Add `--write` to create missing checked-in files; changed existing drafts are
rejected. `backend/data/layouts/ramayan-study.json` contains source offsets and
passage hashes. The API rejects a stale layout rather than displaying it against
changed text. Deploy this manifest alongside the compiled backend.

## Apply to the database

```powershell
node backend/scripts/consolidate-ramayan.cjs
node backend/scripts/consolidate-ramayan.cjs --apply
node backend/scripts/verify-draft-api.cjs library/editions/drafts/ramayan-study-hi.json
```

The first command previews the operation. Applying writes recovery snapshots in
ignored `backend/backups/`, moves the old study edition to the existing Ramayan
record, removes only the empty duplicate collection, updates searchable aliases,
and imports the separate draft in one transaction. It preserves existing
edition/section/passage IDs and verifies existing passage fingerprints before
commit. It does not alter bookmarks, notes, highlights, plans, chats or progress.
An identical rerun reuses the draft IDs. No schema migration is needed. On a new
database, import the base catalog/documents first, then run this command.

The former public detail ID `7ef9d10a-ac5f-460b-8bf7-b08d1cb6469a` resolves to the
canonical collection; old reader links retain their edition IDs. Additional
historical IDs from another installation can be added in `ramayanCatalog.ts`.

Read-only recovery verification:

```powershell
node backend/scripts/verify-ramayan-merge.cjs backend/backups/<pre-merge-snapshot>.json
```

Restart the local API after building. Run backend `npm test`, frontend
`npm run lint` and `npm run build`, then the Ramayan layout and live Playwright
tests. Set `RUN_LIVE_LIBRARY=1` for live tests; their private writes are stubbed.
The shared-reader regression tests also cover Mahabharat, Garuda and Manusmriti.
