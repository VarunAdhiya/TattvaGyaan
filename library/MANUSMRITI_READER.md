# Manusmriti reader layout

The existing Hindi draft contains 1,867 passages in 14 sections: front matter,
12 adhyays, and credits. All 509 source pages remain represented. This reader
update preserves every stored character, passage ID, reference and source note.
No database migration or content reimport is required.

## Source-based structure

`backend/scripts/build-manusmriti-layout.py` checks the original PDF checksum,
then aligns its printed typography with the already-decoded draft. Red Sanskrit
verse text, black Hindi explanations, colored topic headings, and small footnotes
become separate layout blocks. The PDF's incorrect Unicode mappings are never
used to replace scripture. Short ambiguous headings must also match the printed
contents. Typography evidence and passage hashes are stored in
`backend/data/layouts/manusmriti.json`.

Verse labels delimit reading units, including verses continued across PDF pages.
These are display boundaries, not new database passages or claims of canonical
verse numbering. All 76 printed contents entries retain their exact text.
The reader preserves line breaks in shlokas, keeps short units together where
they fit, starts every adhyay on a fresh leaf, and keeps topic headings with
following content. Compact devotional controls match the other typeset books.

## Regenerate and deploy

From the repository root, using the existing Python environment with PyMuPDF:

```powershell
backend/.venv-ocr/Scripts/python.exe backend/scripts/build-manusmriti-layout.py
npm run build --prefix backend
npm run build --prefix frontend
```

Deploy the layout file with the backend build and restart the API. The backend
checks each stored passage's hash before serving its layout. The frontend refuses
missing layout metadata instead of silently mixing incompatible pagination.
Bookmarks, notes, reading plans and saved passages continue using their existing
IDs; displayed page counts adapt to font size and screen width.

## Verify

```powershell
node backend/scripts/verify-draft-api.cjs library/editions/drafts/manusmriti-hi.json
npm test --prefix backend
npm run lint --prefix frontend
```

From `frontend/`, run `npx playwright test tests/manusmriti-layout.spec.js`.
For the live database/API check, set `$env:RUN_LIVE_LIBRARY='1'` and run
`npx playwright test tests/manusmriti-live.spec.js`. Public text requests stay
live; private authentication, annotations and progress writes are isolated.
Run the Garuda, Mahabharat and generic reader regressions when changing shared
pagination or typography.

The edition remains an unreviewed draft. This layout work does not certify
spelling, translation, printed numbering or the source's textual completeness.
