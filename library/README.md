# Hindi scripture catalog

`catalog.json` is the editorial catalog: one tradition, eight works (including a separately identified comparative study), Hindi editions, and searchable title aliases. Application code contains no book-specific content or fallback passages. PostgreSQL is the runtime source of truth.

`editions/*.json` contains attributed source imports, never AI-generated scripture. The Hindi Gita is extracted verbatim from the existing Hansi Gita Bhawan Trust snapshot (700 verses, 18 chapters). Its source URL, translator, reuse notice, and provenance are retained in the edition and reader. Other works remain partial or metadata-only until verified Hindi editions are supplied; an empty edition must not be labeled complete.

`documents/*.json` describes original scanned PDFs, served from `frontend/public/library/` in development and copied to the frontend build. The supplied `rigved.pdf` is a 739-page scan with Sanskrit verses and Hindi explanations. Its first page begins Mandala 1 and its last page ends Mandala 6; neither the Rigveda nor the Vedas collection is labeled complete. Publisher, translator and reuse license remain unverified. The original bytes and SHA-256 are retained. Scans use the same `Reader3D` interface as text editions: cover, contents, desktop spreads, mobile single pages, themes, zoom, fullscreen, page jumps and saved reading position. PDF.js renders only the visible scanned pages, with its worker bundled locally and loaded only for scans. The original PDF remains downloadable from the cover. There is no searchable text layer, so verse selection, text-based AI, annotations and reading plans remain unavailable.

To validate PDF assets, run `node scripts/import-documents.cjs` from `backend/`. To add them to the configured database, run `node scripts/import-documents.cjs --apply`. This targeted import preserves existing content and annotations, updates catalog metadata for the affected books, and reuses existing scan edition IDs. It checks file headers and hashes before opening the transaction. Full synchronization and seeding also include these documents. PDF editions use `contentStatus: scanned`, no passage counts, and never fabricate passage records; no schema migration is needed. Deploy the frontend build containing the PDF together with the updated database catalog.

From `frontend/`, `npm run check:pdfs` verifies that every document manifest has its original PDF in `public/library/`, with the recorded header and SHA-256. `npm run build` runs this check automatically and stops if a PDF is missing or altered. Catalog records alone do not contain the PDF bytes: preserve and deploy the assets too. If the reader reports "Unable to load this book", check these files first; the development server can return the app's HTML page for a missing PDF URL. Restore the exact original file to its manifest's `source` path under `frontend/public/`, then retry the book. Do not change the recorded checksum to accept a different edition.

## User-supplied PDFs added on 2026-10-13

The document manifests preserve file checksums, page counts, printed attribution, and unverified reuse status:

| Original file | Catalog placement | PDF pages |
| --- | --- | --- |
| `मनुस्मृति-सम्पूर्ण.pdf` | Manusmriti | 509 |
| `ghmb101.pdf` | Bal Mahabharat Katha, under Mahabharata; a children's retelling | 96 |
| `Valmiki Ramayana aur Ramakien Ek Tulnamatmak Adhyayan.pdf` | Dr. Karuna Sharma's comparative study, a separate work from Ramayana | 266 |

These PDFs contain text layers with extraction/legacy-font issues. They use the existing `scanned` PDF reader mode without creating passage records or enabling text-based AI and annotations. Original bytes, including blank pages, are unchanged. All supplied pages are retained, but no claim of verified textual completeness is made. The comparative study's first two PDF pages are blank; its title is on PDF page 3 (reader page 5).

## Import and deployment

Garuda Purana has a dedicated catalog entry for the supplied 638-page `Garuda Purana Original upayogibooks.com.pdf`. Its printed title is **संक्षिप्त गरुड़पुराण**, an abridged Hindi Gita Press edition (code 1189, ISBN 81-293-0285-3). Original bytes and watermarks are retained. Its scanned text uses JBIG2 compression; the Vite configuration serves PDF.js decoder assets and their licenses from the installed package at `/pdfjs/wasm/` and emits them into production builds. Deploy this decoder directory with the PDF assets.

The user also supplied `Shri-Ramcharitmanas-Gita-Press.pdf` (1,058 pages) and `शिव पुराण.pdf` (845 pages) on 2026-10-13. Ramcharitmanas is filed under the existing Ramayana collection with its own title and Gita Press/commentator attribution; Shiva Purana has a dedicated catalog entry with Manoj Publications/editor attribution. Both use the same PDF reader and preserve their original bytes. The former Upanishads catalog entry and its database content were removed at the user's request; a recovery snapshot is kept locally in the ignored `backend/backups/` directory.

From `backend/`:

1. Stop the API on Windows if it locks Prisma's engine DLL.
2. Run `npm run prisma:generate`, `npm run build`, and `npx prisma migrate deploy`.
3. Run `node scripts/sync-library.cjs` for a dry run.
4. Run `node scripts/sync-library.cjs --apply` to synchronize the catalog and import validated text.
5. Restart the API with `npm start`.

Synchronization removes editions outside the catalog/language and their dependent annotations, reading progress, plans, and conversations. It first writes a local recovery JSON snapshot to the gitignored `backend/backups/` directory. Accounts and sessions are preserved. The operation uses one database transaction; validation or import failure rolls it back. Backups contain private annotations and must remain uncommitted.

Repeating the import preserves existing Hindi passage IDs and annotations. Changed source text is rejected for editorial review. To add content, supply a JSON edition with source URL, license, provenance, expected passage counts, ordered sections, and ordered passages; the validator documents the full schema in `backend/scripts/library-sources.cjs`.

## Retrieval

### Explicit draft text editions

At the user's request, `editions/drafts/bal-mahabharat-katha-hi.json` can be imported as a separate text edition under Mahabharata. It contains 41 chapters and 725 passages from 94 text pages; source pages 22 and 80 contain illustrations. It is **not fully proofread**. The original PDF edition and its saved positions are preserved. The text reader displays a draft label and source-page notes; the Mahabharata collection remains partial.

`editions/drafts/manusmriti-hi.json` likewise contains a separate draft text edition: 12 printed chapters plus front matter and credits (14 sections, 1,867 passages), covering all 509 pages. It preserves Sanskrit verses and Hindi explanations. The user-selected `frontend/dist/library/manusmriti-sampurna.pdf` matches the original catalog PDF checksum. Incorrect PDF Unicode mappings were decoded from Nirmala UI glyph IDs using font cmap/GSUB data; all seven embedded font subsets were checked against the installed font's outlines. The output retains source-page references, printed verse labels and unverified attribution/reuse status. It is not fully proofread and does not mark the work complete. Use the same explicit importer below with `../library/editions/drafts/manusmriti-hi.json` to restore this edition.

From `backend/`, validate with `node scripts/import-draft-edition.cjs ../library/editions/drafts/bal-mahabharat-katha-hi.json`; append `--apply` to import into the configured database. The import checks source identity and PDF checksum, writes a recovery snapshot, creates the edition/chapters/passages in one transaction, and verifies the stored text before committing. Identical reruns preserve IDs and annotations; changed existing content is rejected. No schema migration is needed. Ordinary catalog sync preserves this separate edition but does not automatically import drafts; run this explicit command when restoring a fresh database. This path does not attest review, activate a reviewed transcription, or remove PDFs.

For replacing PDF editions with corrected database text, follow [Corrected text imports](transcriptions/README.md). All source pages must be reviewed before activating a reviewed transcription. Draft extraction never activates that migration; explicitly imported draft editions use the separate path above.

### Shiva Purana draft

`editions/drafts/shiva-purana-hi.json` contains a separate draft of the supplied Manoj Publications simplified Hindi edition, edited by Dr. Mahendra Mittal. The selected `frontend/dist/library/shiva-purana.pdf` matches the catalog's original SHA-256. **4,292 reading passages in 484 sections** preserve 462 printed chapters, 13 division title sections, and nine front-matter/appendix sections. These are local reading blocks, not canonical shloka numbers. All 845 pages are accounted for: 814 pages with text (including four manually transcribed image pages) and 31 illustration/decorative-only pages. The edition remains **draft / not fully proofread**, with the original PDF available and reuse status unchanged.

From the repository root:

```powershell
backend/.venv-ocr/Scripts/python.exe backend/scripts/extract-shiva-purana.py --write
node backend/scripts/import-draft-edition.cjs library/editions/drafts/shiva-purana-hi.json
node backend/scripts/import-draft-edition.cjs library/editions/drafts/shiva-purana-hi.json --apply
node backend/scripts/verify-draft-api.cjs library/editions/drafts/shiva-purana-hi.json
```

The extractor uses PyMuPDF and the checked-in `backend/data/font-maps/shiva-purana-noto.json`. The PDF's incorrect Unicode mappings are decoded from glyph IDs after exact matching of all 293 embedded nonempty Noto font outlines against historical official font files. The mapping records upstream URLs and font hashes; the extractor checks the PDF and embedded font hashes on every run. It reconstructs contextual i/reph/anusvara positioning, preserves source line order and printed spelling, checks every text line survives passage grouping, and refuses changes to an existing JSON. The accompanying `shiva-purana-hi.audit.json` records per-page coverage and hashes. Image-only text on pages 1, 2, 37 and 844 was transcribed from rendered pages; illustration-only pages were visually checked. Full editorial review is still outstanding.

### Garuda Purana draft

For the 638-page Garuda Purana scan, see [Garuda PDF → text/JSON → Supabase](GARUDA_IMPORT.md). Its dedicated OCR/export scripts produced 5,277 reading blocks in six sections; all 638 source pages are accounted for. The text remains an unreviewed OCR draft. The existing full-page scratch OCR interleaves columns and should not be imported.

### Ramcharitmanas draft

`editions/drafts/ramcharitmanas-hi.json` contains the user-selected Gita Press **Shri Ramcharitmanas**, with Hanumanprasad Poddar's commentary, under the existing `ramayana` book. It is not Valmiki Ramayana. Its 14 sections contain seven kandas plus front matter, contents, recitation guidance, arati, biography, and the closing question table: **12,821 reading passages**, not individually numbered canonical verses. All 1,058 source pages are accounted for, including three visually checked blank pages (2, 4, 1058). The original PDF remains available.

From the repository root:

```powershell
backend/.venv-ocr/Scripts/python.exe backend/tests/ramcharitmanas_checks.py
backend/.venv-ocr/Scripts/python.exe backend/scripts/extract-ramcharitmanas.py --write
node backend/scripts/import-draft-edition.cjs library/editions/drafts/ramcharitmanas-hi.json
node backend/scripts/import-draft-edition.cjs library/editions/drafts/ramcharitmanas-hi.json --apply
node backend/scripts/verify-draft-api.cjs library/editions/drafts/ramcharitmanas-hi.json
```

The extractor requires PyMuPDF from `backend/scripts/requirements-transcription.txt`. It checks the exact PDF checksum, decodes the embedded Chanakya font, preserves two-column reading order and the 225-cell question table, and rejects a changed existing draft. The coverage audit is `editions/drafts/ramcharitmanas-hi.audit.json`; scratch files go to `tmp/pdfs/ramcharitmanas/`. The importer records blank-page classifications in database provenance, imports atomically, and verifies stored text. The API verifier compares every passage, reference, order, and source note. The edition remains **draft / not fully proofread**; sample checks do not attest a complete review. The frontend reads this edition through the database/API, without loading the PDF or JSON as frontend scripture content.

For the live reader check, run `npx playwright test tests/ramcharitmanas-draft.spec.js --workers=1` in `frontend/` with `RUN_LIVE_LIBRARY=1` and the API on port 3001. Authentication and private writes are stubbed; catalog and text requests remain live.

OCR now runs offline using free Tesseract language data through PyMuPDF. From `backend/`, `node scripts/transcribe-library.cjs --execute` processes all remaining pages with per-page checkpoints; see the transcription guide for the one-time local setup and book/page options. No paid OCR provider or API key is used. One real source page from each of the seven PDFs has been processed as a smoke test; the remaining corpus still needs OCR and review.

The final database migration is `node scripts/migrate-library-text.cjs --apply` from `backend/`. It imports all seven reviewed transcriptions in one transaction, verifies the stored text, references, ordering and provenance, then removes each original from `frontend/public/library/` after making a checksum-verified recovery copy in the ignored `backend/data/source-pdfs/` directory. Without `--apply`, it exercises and rolls back the database imports and leaves all files intact. Missing or incomplete transcriptions stop the command before database access. It is safe to resume after interruption. Do not remove PDFs manually before this verification.

After migration, the frontend build accepts reviewed text replacements instead of requiring public PDFs. Database seeding/synchronization also restores those reviewed transcriptions and does not reactivate scans. Keep the backend source archive backed up privately; it is used for source verification, extraction and review, and is never part of the frontend deployment. Deploy the database changes before deploying a frontend without PDFs.

Run `node scripts/library-text-status.cjs` from `backend/` to report reviewed-page coverage and actual Supabase passage counts without printing credentials. The 2026-10-14 assessment found the complete 700-verse Gita in Supabase; the seven scanned editions still have zero passages and zero reviewed pages. The migration has **not** been applied. A separate unverified Gita sample remains untouched.

For future vector retrieval, use the stored passage IDs as source identifiers and preserve edition, source-page/verse reference, provenance and text checksum alongside each derived embedding chunk. The text remains authoritative in `scripture_passages`; embeddings should be derived records, recomputed when the text changes. The scanned editions initially retain exact page text and printed verse labels, not guessed verse boundaries. Neither embeddings nor individually segmented verses for these scans have been generated.

Catalog search is paginated, supports Hindi and stored English aliases, and uses a PostgreSQL trigram index. Reader startup fetches section metadata/counts only. Each visible page requests two passages using indexed section/order queries. A position endpoint resolves notes and bookmarks without downloading a book. Page 1 is the cover, page 2 is contents, and subsequent pages hold two passages within each section. Font size and screen width do not change page numbers.

Scanned editions follow the same cover/contents numbering, with one original PDF page per subsequent reader page (Rigveda: 741 reader pages including its 739 scans). Contents groups are labeled by scan page range rather than inventing chapter boundaries. Progress uses the existing per-user/per-edition page index; scans do not create synthetic passage or section records. The A−/A+ controls zoom scanned pages while text editions retain font-size adjustment.
