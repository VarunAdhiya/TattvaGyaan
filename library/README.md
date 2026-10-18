# Hindi scripture catalog

The library publishes **six books with one Hindi text edition each**. PostgreSQL
supplies all reader text. `catalog.json` contains the cards and search aliases;
`backend/data/reader-editions.json` selects the exact source for each book.

| Book | Retained text | Passages | Status |
| --- | --- | ---: | --- |
| Mahabharat | NCERT Bal Mahabharat Katha | 725 | Draft |
| Bhagavad Gita | Hansi Gita Bhawan Trust | 700 | Complete |
| Ramayan | Dr. Karuna Sharma's comparative study | 1,189 | Draft |
| Garuda Purana | Abridged Gita Press edition | 5,277 | Draft OCR |
| Shiva Purana | Manoj Publications simplified Hindi edition | 4,292 | Draft |
| Manusmriti | Sanskrit text and Hindi explanation | 1,867 | Draft |

Drafts remain **not fully proofread**. The comparative study is not the original
Valmiki Ramayana; Bal Mahabharat Katha and the abridged Garuda Purana do not
establish completeness of their entire works. Never fabricate missing passages
or change a draft's review status merely because it is the only edition.

## Retired content

At the user's request, Ramcharitmanas, the older 52-passage Gita sample titled
“श्रीमद्भगवद्गीता (हिन्दी अनुवाद)”, Rigveda/Vedas, and all PDF editions were removed.
The complete 700-verse Gita remains. Removed records and their dependent notes,
bookmarks, highlights, progress, plans, and conversations have a private recovery
snapshot under ignored `backend/backups/`. Accounts and retained text IDs remain.

There are no public PDFs, PDF downloads, PDF reader components, or PDF.js bundle.
The retained `documents/*.json` files preserve source attribution and checksums;
they do **not** create editions. Original PDFs needed for extraction can be kept
privately in ignored `backend/data/source-pdfs/`. These are optional development
inputs, never deployment assets. Rigveda and Ramcharitmanas sources are retired.

## Synchronize or restore

Install dependencies in both applications. From `backend/`:

```powershell
node scripts/import-library.cjs
node scripts/import-library.cjs --apply
```

The first command validates local text and previews retained/removed editions.
The second writes a private recovery snapshot, removes out-of-policy editions
and dependent records, updates catalog/search metadata, and imports missing text
in one serializable transaction. Existing source text must match exactly; retained
edition, section, passage IDs, metadata, and text are fingerprinted before and
after. Any mismatch rolls back. Repeating synchronization preserves retained IDs.
Fresh database seeding uses the same six-source policy, including honest draft
labels. It requires JSON sources, not PDFs. No schema migration is required.

`import-documents.cjs` refuses PDF imports. The explicit draft importer rejects
sources outside the reader policy. Historical extraction/transcription guides
describe provenance and editorial workflows; their former PDF publication and
multiple-edition deployment instructions are superseded by this guide.

## Validate

Run backend `npm test` and `npm run build`; run frontend `npm run lint` and
`npm run build`. The frontend prebuild runs `npm run check:library`, which checks
all six text sources and rejects public PDFs. With the API running, run from
`frontend/`:

```powershell
$env:RUN_LIVE_LIBRARY='1'
npx playwright test tests/library-live.spec.js tests/gita-layout.spec.js tests/reader.spec.js
```

The live catalog test verifies one edition per card, absence of retired searches,
404 responses for removed editions, and working text readers without PDF requests.
It stubs authentication and private writes. Gita-specific database verification
is documented in [Gita reader](GITA_READER.md).

Keep source text, attribution, checksums, direction, and existing IDs intact.
Database recovery snapshots contain private records and must never be committed.
