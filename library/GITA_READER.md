# Bhagavad Gita reader

The attributed Hindi edition from Hansi Gita Bhawan Trust uses the shared
Mahabharat reader: wooden stand, devotional toolbar, curved page turns, desktop
spreads, mobile single pages, themes, font resizing, contents, and page jumps.
Its 18 chapters and 700 translated verses remain complete, with the original
source link, attribution, license, provenance checksum, and passage IDs.

## Frontend and API

The exact source `https://gitabhawan.org.in/gita/research` and language `hi`
enable typesetting. The separate unverified sample retains its existing reader.
`bookLayoutService.ts` returns one `translation` block per stored verse with
its original reference and character range. Blocks keep a verse together when
it fits on a leaf; longer verses split without losing characters. Each chapter
starts on a fresh leaf.

Explicit blocks prevent Gita chapter 3 from triggering Mahabharat's family-tree
heuristic. The frontend requires this metadata and reports unavailable layout
if an older API omits it. Deploy the backend and frontend together and restart
the API if it does not reload automatically.

Verse references are displayed separately from selectable scripture text. The
browser measures both together to prevent clipping. Saved progress, bookmarks,
notes, reading-plan links, selected-text AI, and chapter summaries continue to
use existing passage and section IDs.

## Database verification

No schema migration, reimport, or data rewrite is required for an existing
attributed edition. From `backend/`, run:

```powershell
node scripts/verify-gita-reader.cjs
```

This read-only check compares all stored verses, chapter order, attribution,
completion status, and import checksum against `library/editions/gita-hi.json`.
It never modifies scripture or user records. For a fresh database, follow the
ordinary library import instructions in [README.md](README.md).

## Validation

Run `npm test` and `npm run build` in `backend/`, then frontend lint/build and:

```powershell
npx playwright test tests/gita-layout.spec.js tests/mahabharata-layout.spec.js tests/reader.spec.js
```

The browser fixture uses the full attributed edition and backend block builder.
To include the public API/database smoke test, start the API and set
`$env:RUN_LIVE_LIBRARY='1'` before running Playwright. That test stubs authentication
and private data writes; it reads the live catalog and all 700 verses.
