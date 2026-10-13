# Hindi scripture catalog

`catalog.json` is the editorial catalog: one tradition, eight works (including a separately identified comparative study), Hindi editions, and searchable title aliases. Application code contains no book-specific content or fallback passages. PostgreSQL is the runtime source of truth.

`editions/*.json` contains attributed source imports, never AI-generated scripture. The Hindi Gita is extracted verbatim from the existing Hansi Gita Bhawan Trust snapshot (700 verses, 18 chapters). Its source URL, translator, reuse notice, and provenance are retained in the edition and reader. Other works remain partial or metadata-only until verified Hindi editions are supplied; an empty edition must not be labeled complete.

`documents/*.json` describes original scanned PDFs, served from `frontend/public/library/` in development and copied to the frontend build. The supplied `rigved.pdf` is a 739-page scan with Sanskrit verses and Hindi explanations. Its first page begins Mandala 1 and its last page ends Mandala 6; neither the Rigveda nor the Vedas collection is labeled complete. Publisher, translator and reuse license remain unverified. The original bytes and SHA-256 are retained. Scans use the same `Reader3D` interface as text editions: cover, contents, desktop spreads, mobile single pages, themes, zoom, fullscreen, page jumps and saved reading position. PDF.js renders only the visible scanned pages, with its worker bundled locally and loaded only for scans. The original PDF remains downloadable from the cover. There is no searchable text layer, so verse selection, text-based AI, annotations and reading plans remain unavailable.

To validate PDF assets, run `node scripts/import-documents.cjs` from `backend/`. To add them to the configured database, run `node scripts/import-documents.cjs --apply`. This targeted import preserves existing content and annotations, updates catalog metadata for the affected books, and reuses existing scan edition IDs. It checks file headers and hashes before opening the transaction. Full synchronization and seeding also include these documents. PDF editions use `contentStatus: scanned`, no passage counts, and never fabricate passage records; no schema migration is needed. Deploy the frontend build containing the PDF together with the updated database catalog.

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

Catalog search is paginated, supports Hindi and stored English aliases, and uses a PostgreSQL trigram index. Reader startup fetches section metadata/counts only. Each visible page requests two passages using indexed section/order queries. A position endpoint resolves notes and bookmarks without downloading a book. Page 1 is the cover, page 2 is contents, and subsequent pages hold two passages within each section. Font size and screen width do not change page numbers.

Scanned editions follow the same cover/contents numbering, with one original PDF page per subsequent reader page (Rigveda: 741 reader pages including its 739 scans). Contents groups are labeled by scan page range rather than inventing chapter boundaries. Progress uses the existing per-user/per-edition page index; scans do not create synthetic passage or section records. The A−/A+ controls zoom scanned pages while text editions retain font-size adjustment.
