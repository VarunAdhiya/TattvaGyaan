# Devotional collections

These collections are separate from the six scripture editions. The Express API
serves `devotional_texts` and `calendar_days`; importing them does not change books,
passages, annotations, or reading progress.

## Source and coverage

`hinduaarti-2026.json` contains the complete catalog returned by
[Hindu Aarti's public MCP endpoint](https://www.hinduaarti.com/connect):
50 chalisas, 50 bhajans, and 54 mantras. Catalog identities were checked against
the live source on 19 October 2026. Hindi text and Roman transliteration retain
source line breaks, attribution, canonical URLs, and SHA-256 content checksums.
Modern descriptions and translations are not imported.

The source identifies its prayer collection as traditional. Ten modern songs
are deliberately catalog-only, with no stored lyrics. Their original URLs remain
in the internal provenance records; the UI displays “Lyrics unavailable”. Source
names, credits, and external source links are not displayed in the app.
`SOURCE_ONLY` in `fetch-devotionals.cjs` records these exceptions.
Review provenance before changing this list or adding newly published songs.

Calendar coverage is **1 January–31 December 2026**, including every date.
Timings are supplied by the source for **New Delhi, India, in IST**. Festival
dates follow the source's North Indian calendar and may differ regionally.
Values are reproduced from the source, not independently calculated or verified
astronomically. Unavailable years display an explicit empty state.

## Import and refresh

Run from the repository root with backend dependencies installed:

```powershell
node backend/scripts/fetch-devotionals.cjs 2026
node backend/scripts/import-devotionals.cjs 2026
node backend/scripts/import-devotionals.cjs 2026 --apply
```

The first command fetches a complete snapshot before replacing its file. The
second validates it without database writes. The last imports transactionally,
preserving IDs and leaving unchanged rows untouched. Changed catalog counts
require review before validation thresholds are updated. Database credentials
come from `backend/.env`; never commit credentials or recovery snapshots.

New databases need the committed Prisma migrations and generated client before
import. The migration enables RLS; application writes use the backend connection.

## Verification

Run `npm test` in `backend/`. Set `RUN_LIVE_DEVOTIONALS=1` to include live API
checks while port 3001 is running. In `frontend/`, run
`npx playwright test devotionals.spec.js`; set the same variable to exercise
the imported database through the UI. Screenshots go to `frontend/test-results/`.
