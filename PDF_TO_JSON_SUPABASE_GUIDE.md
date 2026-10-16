# PDF → JSON → Supabase → reader: TattvaGyaan handoff guide

This guide records the work performed on **Bal Mahabharat Katha** and **Manusmriti**, with a reproducible **Shiva Purana** addition at the end. Give it to another Claude/Codex agent together with access to this repository. It explains how to repeat the process without inventing text, losing source information, overwriting annotations, or incorrectly calling a draft verified.

The importer, tables, API routes and UI behavior described here reflect this working tree. Inspect their current implementations before applying this guide to a different revision. Some files were newly created during this work and may not yet be committed.

## 1. What was accomplished

| Item | Bal Mahabharat Katha | Manusmriti |
| --- | --- | --- |
| User-selected PDF | `frontend/public/library/bal-mahabharat-katha.pdf` | `frontend/dist/library/manusmriti-sampurna.pdf` |
| Original PDF source URL | `/library/bal-mahabharat-katha.pdf` | `/library/manusmriti-sampurna.pdf` |
| Document manifest | `library/documents/bal-mahabharat-katha-hi.json` | `library/documents/manusmriti-hi.json` |
| Scripture slug | `mahabharata` | `manusmriti` |
| Source pages | 96 | 509 |
| JSON sections | 41 printed chapters | 12 printed chapters + front matter + credits = 14 sections |
| Imported passages | 725 | 1,867 |
| Text coverage | 94 text pages; pages 22 and 80 contain illustrations | All 509 pages |
| Output | `library/editions/drafts/bal-mahabharat-katha-hi.json` | `library/editions/drafts/manusmriti-hi.json` |
| Database edition status | `draft` | `draft` |

Both editions were stored in Supabase using the same relational tables that store the Gita. Their original PDF editions were retained. The existing React reader displays the imported text and a **“Draft text · Not fully proofread”** label.

These imports preserve source text; they are not translations or AI-written summaries. Neither import is a claim that every printed word has been proofread or that an abridged source represents the entire canonical work.

## 2. Instructions for the next agent

1. Read `AGENTS.md`, `library/README.md`, `backend/data/SOURCES.md`, and the relevant source manifest. Inspect current code where older documentation disagrees with it.
2. Read `library/editions/gita-hi.json` for the edition → sections → passages structure.
3. Inspect and hash the **exact PDF selected by the user** before extraction.
4. Determine whether its text is reliable Unicode, a legacy-font encoding, a broken Unicode map, or image-only scans. Do not assume one converter works for every book.
5. Recover the printed text and its reading order. Preserve Sanskrit/Hindi, verse labels, attribution, and source-page references.
6. Produce a UTF-8 draft edition and validate counts, ordering, coverage, source identity, and sample text against rendered pages.
7. If the user requested Supabase storage, run the explicit draft importer and verify the resulting database/API text. A request to convert only a PDF does not by itself request database changes.
8. Verify the live reader and report the JSON location, actual imported counts, and any remaining proofreading limitations.

Do not invent missing verses, replace text with a different online edition, silently “correct” controversial or unusual source wording, fabricate a review attestation, or set a draft's `contentStatus` to `complete`/`transcribed`.

## 3. Workspace and prerequisites

The workspace used here was:

```text
C:\Users\HP\Desktop\Build_In_Public\TattvaGyaan
```

Run the following setup commands from the **repository root** in PowerShell. Use the actual repository path on another machine.

```powershell
Set-Location 'C:\Users\HP\Desktop\Build_In_Public\TattvaGyaan'

# Only create/install these if missing. Existing environments can be reused.
python -m venv backend/.venv-ocr
backend/.venv-ocr/Scripts/python.exe -m pip install -r backend/scripts/requirements-transcription.txt
backend/.venv-ocr/Scripts/python.exe -m pip install fonttools

$env:PYTHONIOENCODING = 'utf-8'
```

The runs used PyMuPDF 1.28.2 and fontTools 4.67.0. Manusmriti additionally used the Windows font collection `C:/Windows/Fonts/Nirmala.ttc`. Another font version may have different glyph IDs: the outline comparison described below is mandatory before reusing those mappings.

Node dependencies belong in `backend/` and `frontend/`; there is no root npm package. Use the existing installation, or run `npm.cmd install` separately in each directory. `backend/.env` already supplied the Supabase PostgreSQL `DATABASE_URL`. Do not print it, copy it into documentation, or expose it to the frontend. No new Supabase JS client or frontend service-role key is needed.

Save Python examples as UTF-8 `.py` files and execute them. PowerShell's older native-command pipeline encodings can corrupt Hindi pasted into `python -` even when Python's output encoding is UTF-8. Use `Get-Content -Encoding UTF8` when inspecting JSON or Markdown.

## 4. Verify the exact PDF and source manifest

Read these fields from `library/documents/<book>-hi.json`:

```text
scriptureSlug, title, language, script, isOriginal, textDirection,
source, license, provenance, pageCount, sha256
```

The manifest identifies the original PDF; it is not the text-edition JSON. Preserve its attribution and unverified reuse status rather than borrowing the Gita's translator or license.

Known hashes from these runs:

```text
bal-mahabharat-katha.pdf
eb00713009dd7b6a81feec459c7518a494f851dc79d77e5d67856e4d8d70d809

manusmriti-sampurna.pdf
992c71ecb2a16913c2fb578ae51f3a73d6288109f133b10b811d1b976f8698e3
```

Example inspection script, run from the repository root:

```python
from pathlib import Path
import hashlib
import json
import pymupdf

source = Path('frontend/dist/library/manusmriti-sampurna.pdf')
manifest = json.loads(Path('library/documents/manusmriti-hi.json').read_text(encoding='utf-8'))
assert source.read_bytes().startswith(b'%PDF-')
assert hashlib.sha256(source.read_bytes()).hexdigest() == manifest['sha256']

with pymupdf.open(source) as pdf:
    assert len(pdf) == manifest['pageCount']
    print('PDF pages:', len(pdf))
    print('Fonts:', pdf[10].get_fonts())
    print('Extracted sample:', pdf[10].get_text()[:1500])
    pdf[10].get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5)).save('backend/data/transcription-drafts/source-page-11.png')
```

Create the scratch directory first if necessary, then visually inspect the PNG. PDF page numbers in JSON are **one-based**; PyMuPDF indexes are **zero-based**.

`frontend/dist/` is generated build output. Manusmriti's selected dist file matched the original in `frontend/public/library/`. Prefer the original as the durable source after confirming identity; do not treat a build output as the only archival copy. The supplied extraction-script snapshots retain the originally selected dist path, which you may change to the checksum-identical public path if dist is absent.

For a genuinely new book, first establish its manifest and approved catalog placement. The current draft importer requires an existing matching manifest and an existing `Scripture` row; it does not create arbitrary books. Inspect catalog synchronization before using it: the general sync command can remove out-of-catalog editions and dependent data, so it is not a substitute for this targeted import.

## 5. Choose extraction based on the PDF

| Observed behavior | Method |
| --- | --- |
| Extracted Unicode matches the rendered page | Extract positioned text directly; preserve paragraphs and page order. |
| Text looks like `egkHkkjr` rather than Hindi | Decode the actual legacy font using its mapping. |
| Text looks like Hindi but letters/conjuncts are wrong | Inspect glyph IDs, embedded fonts and ToUnicode maps; repair decoding from font evidence. |
| No usable text layer | Use local OCR, then inspect/correct it against source pages. |

Existing OCR drafts were available for both books, but they were not used as the authoritative text. The Mahabharata OCR interleaved two columns and lost spaces. Manusmriti OCR also had recognition/spacing errors. Font-based decoding produced better candidates for these particular PDFs.

OCR fallback, from `backend/`:

```powershell
python scripts/setup-local-ocr.py
node scripts/transcribe-library.cjs --execute --book manusmriti-hi
```

This prepares page-based OCR drafts, **not** the chapter-based edition expected by `import-draft-edition.cjs`. Adapt and review their structure before importing. Do not set page reviews merely because an OCR command succeeded. See `library/transcriptions/README.md` for the separate fully reviewed transcription workflow.

## 6. How Bal Mahabharat Katha was decoded

### Font conversion

The PDF uses `Walkman-Chanakya905Normal` for body text and fonts such as `TT65CT00` for headings. Raw extracted text included sequences such as `egkHkkjr dh dFkk`; the printed page reads `महाभारत की कथा`.

We used the [IIT Delhi Assistive Technology Walkman Chanakya converter](https://github.com/assistech-iitdelhi/ePubFontConverter-WalkmanChanakya) as a mapping source. The downloaded `convert.py` snapshot had SHA-256:

```text
47d781a5fea6438ef578ddfc75b289b6b4ec7966f1e7dd1d071a25f6206efc81
```

The upstream utility was Python 2 code. We inspected it, changed `<>` to `!=`, and replaced the unused `userdict` import with an empty mapping. We saved that local adaptation as `convert3.py`. If downloading a changed upstream version, compare it before running it. Retain upstream attribution and consult its license before redistributing converter code.

Example download/setup from the repository root, only when the local converter is absent:

```powershell
New-Item -ItemType Directory -Force backend/data/transcription-drafts/walkman-converter | Out-Null
Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/assistech-iitdelhi/ePubFontConverter-WalkmanChanakya/master/convert.py' -OutFile backend/data/transcription-drafts/walkman-converter/convert.py
Get-FileHash backend/data/transcription-drafts/walkman-converter/convert.py -Algorithm SHA256
```

Then run this Python adaptation after inspecting/checking the downloaded source:

```python
from pathlib import Path
import hashlib

directory = Path('backend/data/transcription-drafts/walkman-converter')
original = directory / 'convert.py'
assert hashlib.sha256(original.read_bytes()).hexdigest() == '47d781a5fea6438ef578ddfc75b289b6b4ec7966f1e7dd1d071a25f6206efc81'
source = original.read_text(encoding='utf-8')
source = source.replace('<>', '!=')
source = source.replace('import userdict\ndict.append(userdict.dict)', 'dict.append([])')
(directory / 'convert3.py').write_text(source, encoding='utf-8')
```

Additional PDF-specific handling was necessary: private-use heading codes, the font's `Q` modifiers, reph/nasal forms, four conjunct glyphs in another font, and an ornamental end marker. The exact transformations are included in the Mahabharata exporter appendix. They decode font encodings; they must not be applied as generic spelling replacements to another book.

### Reading order and layout

The source is two-column. Sorting all text by vertical position mixes left and right columns. We instead:

1. Extracted positioned lines/blocks with `get_text('dict')`, excluding image bytes for efficiency.
2. Identified chapter headings by their heading font and associated printed chapter numbers.
3. Split each page into horizontal regions at chapter headings.
4. Read the left column top-to-bottom, then the right column, **within each region**.
5. Restarted the column order below the next chapter heading.
6. Preserved text blocks and physical line breaks, splitting passages at page/column boundaries.
7. Excluded running headers/footers from passage text and retained their attribution in metadata.

The source-specific thresholds were body y-coordinates 82–655, column division x=252, heading font `TT65CT00`, and chapter numbers in `Bookman-Demi` at size >=18. They are not universal PDF settings.

Prepare the layout cache:

```python
from pathlib import Path
import json
import pymupdf

pdf = pymupdf.open('frontend/public/library/bal-mahabharat-katha.pdf')
layout = [page.get_text('dict', flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES) for page in pdf]
Path('backend/data/transcription-drafts/bal-mahabharat-layout.json').write_text(
    json.dumps(layout, ensure_ascii=False), encoding='utf-8')
```

Visual inspection confirmed pages **22 and 80** contain illustrations and no body passages. They are recorded as `illustrationOnlyPages: [22, 80]`; no placeholder scripture was created. The final check accounted for all **4,988 extracted body lines**, resulting in 41 chapters and 725 passages.

## 7. How Manusmriti was decoded

### Why ordinary Unicode extraction was wrong

The printed PDF is readable, but its ToUnicode mappings mislabel many glyphs. For example, extraction produced `तिषय सूची` where the page prints `विषय सूची`. The font draws the correct glyph while the PDF reports the wrong character.

We did **not** replace all occurrences of `त` with `व`: that would corrupt real words. We decoded individual glyph IDs from the actual font instead.

### Recovering glyph meanings

1. Loaded `C:/Windows/Fonts/Nirmala.ttc` with fontTools.
2. Built a glyph-name → Unicode mapping from the font's `cmap`.
3. Expanded it through GSUB single substitutions and ligatures, including extension lookup type 7. This recovers glyphs representing conjuncts such as `क्ष` or `स्त्र`.
4. Converted names to glyph IDs.
5. Inspected `page.get_texttrace()` to collect the actual glyph IDs used by the PDF.
6. Verified that all **422 used Nirmala glyph IDs** had mappings.
7. Compared embedded glyph outlines at those font IDs against the installed font. Across all seven embedded Nirmala subsets, **1,729 nonempty outline comparisons matched**; these include repeated outlines across subsets, not 1,729 unique used characters.

The installed font collection hash was:

```text
ad02cdfc06e144ac45f318e8e5a64cbe04c7479d4beb91d25f5a319a466b1767
```

Another font version or PDF may use different IDs. Matching a font family name alone is insufficient. Run the outline checker in the appendices before reusing a map. Missing or ambiguous mappings need investigation; do not replace unknown glyphs with guessed words.

### Converting visual glyph order to Unicode text order

Glyph order can be visual rather than linguistic. The pre-base `ि` mark appears before the consonant it belongs to; the reph (`र्`) glyph can appear after the cluster it logically precedes.

The decoder temporarily marked these glyphs, moved them into logical Unicode order, and removed the temporary markers. It also:

- Ignored synthetic negative-glyph-ID entries that merely expand a ligature into multiple extracted characters.
- Grouped baselines within one PDF point, preserving glyph order inside each run. This matters because a slightly lowered `ू` in `दूसरा` was otherwise placed after the whole word.
- Sorted runs within a line and lines within a page.
- Removed only the repeatedly verified footer below y=510; nonempty main-body text was checked against this cutoff.
- Normalized runs of whitespace while retaining line breaks between source lines.

Unusual printed reph placements on pages **83, 460 and 463** were preserved and flagged in source notes. They were not silently rewritten to match another edition.

### Sections and passages

The printed chapters start at these PDF pages:

```text
11, 34, 85, 143, 198, 228, 246, 287, 362, 420, 443, 488
```

Pages 1–10 became `front-matter`, the 12 chapters became `chapter-1` through `chapter-12`, and page 509 became `credits`. The export preserved 11,687 decoded body lines, with 12 chapter-heading lines represented in section titles.

Passages follow page boundaries and source spacing/color changes: red Sanskrit verse blocks, black Hindi explanation blocks, and blue headings remain distinguishable in the grouping. The JSON retains text, not the source's font styling. Printed verse numbers stay inside `text`; local references such as `1.3` identify extracted blocks, not necessarily one Sanskrit verse.

Example: Manusmriti passage `1.1` is an invocation, `1.2` is the printed title, `1.3` contains the first group of Sanskrit verses, and `1.4` contains their Hindi explanation. Never describe the imported count of 1,867 as a count of canonical shlokas.

### Reproduction order

Restore the UTF-8 scripts from the appendices to their named paths if they are missing. From the repository root:

```powershell
backend/.venv-ocr/Scripts/python.exe backend/data/transcription-drafts/inspect-manusmriti-font.py
backend/.venv-ocr/Scripts/python.exe backend/data/transcription-drafts/check-manusmriti-outlines.py
backend/.venv-ocr/Scripts/python.exe backend/data/transcription-drafts/extract-manusmriti.py
backend/.venv-ocr/Scripts/python.exe backend/data/transcription-drafts/export-manusmriti.py
```

The exporter intentionally refuses to overwrite an existing output. For comparison/re-extraction, change its output path to a new candidate filename and compare it to the existing JSON. Do not delete an imported edition just to rerun an exporter. The Mahabharata snapshot predates that guard and overwrites its output, so give it a candidate output path before rerunning it against existing work.

## 8. JSON structure and a real example

Use the Gita's core shape, adding source-page and draft metadata. Drafts belong under `library/editions/drafts/`, not directly under `library/editions/`: the ordinary loader treats top-level edition files as verified imports and assigns `complete` during sync.

The example below is a **reduced excerpt of the real Manusmriti file**, not a standalone import. The counts intentionally describe the full edition; omitted sections/passages must not be replaced with fabricated content or submitted as a complete file.

```json
{
  "scriptureSlug": "manusmriti",
  "title": "मनुस्मृति — संस्कृत मूल एवं हिन्दी व्याख्या (पाठ-रूपांतरण का मसौदा)",
  "language": "hi",
  "script": "Devanagari",
  "isOriginal": false,
  "textDirection": "ltr",
  "translator": null,
  "source": "urn:sha256:992c71ecb2a16913c2fb578ae51f3a73d6288109f133b10b811d1b976f8698e3",
  "license": "User-supplied PDF; reuse license unverified. The document credits Shri Hindu Dharma Vedic Education Foundation (shdvef.com).",
  "expectedPassages": 1867,
  "reviewStatus": "unreviewed-draft",
  "sourceDocument": "/library/manusmriti-sampurna.pdf",
  "sourceSha256": "992c71ecb2a16913c2fb578ae51f3a73d6288109f133b10b811d1b976f8698e3",
  "sourcePageCount": 509,
  "illustrationOnlyPages": [],
  "provenance": "Excerpt only; see the full edition for complete source attribution and conversion history.",
  "sections": [
    {
      "slug": "chapter-1",
      "title": "॥अथ प्रथमोऽध्यायः पहला अध्याय ॥",
      "sortOrder": 2,
      "expectedPassages": 84,
      "passages": [
        {
          "reference": "1.3",
          "text": "मनुमेकाग्रमासीनमभिगम्य महर्षयः।\nप्रतिपूज्य यथान्यायमिदं वचनमब्रुवन् ॥१॥\nभगवन् सर्ववर्णानां यथावदनुपूर्वशः।\nअन्तरप्रभवानां च धर्मान्नो वक्तुमर्हसि ॥२॥\nत्वमेको ह्यस्य सर्वस्य विधानस्य स्वयंभुवः।\nअचिन्त्यस्याप्रमेयस्य कार्यतत्त्वार्थवित् प्रभो ॥३॥",
          "sortOrder": 3,
          "sourcePage": 11,
          "sourceNotes": "PDF page 11. Source glyph decoding; not fully proofread. This reference identifies a reading-order text block, not an individual Sanskrit verse."
        }
      ]
    }
  ]
}
```

Field rules:

| Field | Meaning / requirement |
| --- | --- |
| `scriptureSlug` | Existing catalog book; `manusmriti` for this source. |
| `language` | `hi`, matching the current catalog; supplementary `textLanguages` can record Sanskrit/Hindi. |
| `source` | `urn:sha256:<original-PDF-hash>`: a stable identity for the separate text edition, distinct from the PDF edition's source URL. |
| `sourceDocument` | Exact manifest URL, such as `/library/manusmriti-sampurna.pdf`. |
| `sourceSha256`, `sourcePageCount` | Must match the original PDF manifest. |
| `license` | Exact existing manifest license string; do not invent reuse permission. |
| `translator` | `null` if unverified. A compiler credit is not automatically a translator credit. |
| `provenance` | Explain source, attribution, method, omissions, coverage and review limits. |
| `reviewStatus` | Exactly `unreviewed-draft` for this importer. |
| `expectedPassages` | Actual passage count; at edition level, sum all sections. |
| `sections[].slug` | Unique within the edition. |
| `sections[].sortOrder` | Consecutive integers from 1 in source order, including front matter. |
| `passages[].reference` | Unique across the entire edition; retain the intended meaning in provenance. |
| `passages[].sortOrder` | Consecutive integers from 1 within each section. |
| `passages[].text` | Original recovered text, not generated summaries. |
| `passages[].sourcePage` | Integer 1..pageCount; pages must not decrease through the edition. |
| `passages[].sourceNotes` | Source page, method and relevant review limitations. |
| `illustrationOnlyPages` | Pages visually confirmed to contain no body text; not a way to hide failed extraction. |

Every source page must appear in at least one passage or in the confirmed illustration-only list. Unknown/blank-page handling for another source needs an explicit classification policy; don't label an OCR failure an illustration.

The database schema does not have a `sourcePage` column. The importer retains the page and PDF hash in each passage's `sourceNotes`. Extra JSON extraction fields remain in the file; they are not automatically persisted as database columns.

## 9. Validate before connecting to Supabase

From `backend/`:

```powershell
node scripts/import-draft-edition.cjs ../library/editions/drafts/manusmriti-hi.json
```

Without `--apply`, this validates the JSON and original PDF without opening a database connection. It checks the exact source identity/attribution, PDF header and checksum, total counts, unique references, ordered sections/passages, page coverage and unconverted private-use/replacement characters.

For Manusmriti, the output includes:

```json
{"chapters":14,"passages":1867,"status":"draft","apply":false}
```

The importer's field is called `chapters`, but it counts **sections**. Report Manusmriti as 12 printed chapters plus front matter and credits, not 14 printed chapters.

Also visually compare the cover, first text page, several middle pages, chapter transitions, difficult glyphs and final pages. Compare line coverage before/after export and ensure two-column text is not interleaved. Structural validation does not establish textual accuracy.

## 10. Import into Supabase

Supabase is the configured PostgreSQL database. We did **not** upload a JSON blob to Storage or create a new table. Prisma writes the same existing relational structure used by the Gita:

```text
scriptures (existing book)
  └── scripture_editions (one NEW draft text edition)
       └── scripture_sections (ordered chapter/section records)
            └── scripture_passages (text, references, source notes, ordering)
```

From `backend/`, after validation and within the user's requested import scope:

```powershell
node scripts/import-draft-edition.cjs ../library/editions/drafts/manusmriti-hi.json --apply

# Equivalent command for Bal Mahabharat Katha:
node scripts/import-draft-edition.cjs ../library/editions/drafts/bal-mahabharat-katha-hi.json --apply
```

If the sandbox blocks database/network access, use the environment's normal network-approval mechanism and rerun the same command. Do not expose credentials or change the connection string to evade restrictions. The user already requested the import; this is execution permission, not a new decision about whether to store the book.

### What the importer actually does

1. Validates the draft and the original PDF before database work.
2. Reads `DATABASE_URL` from `backend/.env`, limits its Prisma pool to one connection, and uses an interactive transaction.
3. Looks up the existing scripture by slug and locks that scripture row to serialize imports.
4. Looks for an edition with the same scripture, language and source URN.
5. If an edition already exists, compares metadata, provenance, sections, text, references, order and notes. An identical rerun returns `unchanged: true` without replacing IDs. Changed content is rejected for review.
6. Before a new import, writes a local recovery record under `backend/backups/draft-edition-*.json`. It contains the prior scripture metadata, new edition ID and source identity; it is **not** a full database backup.
7. Creates the new edition with `contentStatus: 'draft'`, creates sections, and inserts passages in batches of 250 with word counts.
8. Reads the newly stored records back and compares them to the normalized import **before committing**.
9. Keeps the book's availability `partial`, unless it already has another genuinely `complete` edition.
10. Returns IDs and `/reader/<scriptureId>/<editionId>`.

No schema migration, PDF deletion, scan-to-text replacement, review attestation, or user-data reset was performed. Existing scan progress remains associated with the scan edition; the separate text edition has separate positions. Do not remap saved PDF positions by assuming PDF page numbers equal reader page numbers.

The SHA-256 in the source URN identifies the original PDF. The separate `Draft edition SHA-256` provenance marker hashes the normalized import payload. These are different checksums with different purposes.

## 11. How it renders on the UI

The app reads from the API/database; it does not import the JSON into a React component.

| File | Role |
| --- | --- |
| `backend/src/services/scriptureService.ts` | Supplies book editions, section metadata and paginated passages. |
| `frontend/src/api/client.js` | Calls the backend endpoints. |
| `frontend/src/pages/ScriptureDetail.jsx` | Offers the edition and displays the draft count/status label. |
| `frontend/src/pages/ReaderPage.jsx` | Uses `PdfReader` for `scanned`; other text editions use `Reader3D`. |
| `frontend/src/components/Reader3D.jsx` | Displays passages, chapter contents and source notes; shows a persistent draft label. |
| `frontend/src/lib/readerPages.js` | Builds cover/contents and stable pages with two passages per section page. |

For the first import, two UI additions were made: a draft label on the edition selector and a persistent draft label in the reader, plus “Source notes” for draft passages. Manusmriti reused that support without additional app changes.

Current book-detail queries order editions by `contentStatus` ascending. `draft` sorts before `scanned`, so these text editions became the default selected edition. This is current implementation behavior, not a universal guarantee; verify it if sorting changes.

Start servers only if needed, in separate terminals:

```powershell
# Terminal 1, backend directory
npm.cmd run dev

# Terminal 2, frontend directory
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The local UI is `http://127.0.0.1:5173`; the API is normally port 3001. Authentication may be required. These local checks did not deploy the application to a public host.

The existing reader yielded 375 UI pages for Mahabharata and 939 for Manusmriti. These counts include cover/contents and two-passage section pages; they differ from the PDFs' 96 and 509 pages. Use `sourcePage`/source notes for PDF references.

## 12. Verify storage and the live reader

First check API metadata and then **every passage**, not just the edition count:

```text
GET /api/scriptures?search=Manusmriti
GET /api/scriptures/<scriptureId>
GET /api/scripture-editions/<editionId>
GET /api/passages/edition/<editionId>
GET /api/passages/section/<sectionId>?page=1&limit=100
```

Continue pagination for sections larger than 100 passages. The reader-content endpoint returns section metadata/counts, not all text. Compare each section's slug/title/count and each passage's text/reference/order/source notes to the JSON. Confirm the original scan still exists and the new edition is `draft`.

The generic read-only API verifier in the appendices locates the edition by source URN instead of hardcoding IDs. Run it from the repository root with the API online:

```powershell
node backend/data/transcription-drafts/verify-draft-api.cjs library/editions/drafts/manusmriti-hi.json
```

Then inspect the browser:

1. Open the book detail page and confirm the draft label, passage count and PDF option.
2. Click Start Reading and verify the correct edition ID in the URL.
3. Navigate through contents to a real chapter, not only the cover or invocations.
4. Confirm actual Sanskrit and Hindi paragraph text appears, and open Source notes.
5. Verify desktop spread and mobile single-page layouts, scrolling, and no horizontal overflow.
6. Jump to the final page and compare it to the final JSON passage.
7. Confirm no JavaScript errors and no PDF download is required for the text reader.

The Manusmriti smoke check specifically inspected **reader page 56**, containing the first Sanskrit block and Hindi explanation. Page 55 contains only introductory invocations. The final reader page was 939. Screenshots were saved to `frontend/test-results/manusmriti-draft-desktop.png` and `manusmriti-draft-mobile.png`.

Live browser smoke checks used real catalog/edition/passage APIs but stubbed authentication, private annotations and progress writes to avoid creating user data. Thus they verified live text rendering, not a real signed-in session's saved progress. Separate fixture-based reader tests exercised progress, bookmarks, notes, and AI selection/context; they did not prove a live external AI-provider response.

### Checks performed and limitations

- Both books: JSON validation, source hash verification, transactional stored-text comparison and API equality against every imported passage.
- Mahabharata: an identical real database rerun returned `unchanged: true`; 15 relevant Playwright tests passed, including the live desktop/mobile reader.
- Manusmriti: all 1,867 passages and all 509 source pages matched the API check; live desktop/mobile and final-page checks passed with zero browser page errors; the existing three draft-import tests passed.
- During the initial UI implementation, backend compilation, frontend Vite compilation and lint completed. The full frontend build gate and one backend catalog test failed because an unrelated original `frontend/public/library/garuda-purana.pdf` was missing. The backend suite then reported 53/54 passing. This did not mean those full checks passed.
- `npx.cmd vite build` was used to isolate frontend compilation from that asset gate. It is not a replacement for a passing `npm.cmd run build` deployment check. Never delete the Garuda manifest or change its checksum merely to silence the gate.
- Playwright's temporary Vite server on port 5174 needed explicit cleanup after its tests finished on Windows. Verify process identity before stopping only a server you started; do not terminate every Node process or the user's dev server.

For application code changes, follow `AGENTS.md`: run both builds, frontend lint, backend tests, and relevant browser tests. Report unrelated existing failures accurately. Documentation-only handoffs do not require rerunning all application tests.

## 13. Troubleshooting and future revisions

| Symptom | Action |
| --- | --- |
| Hindi looks like `à¤...` in PowerShell | Inspect UTF-8 decoding before assuming the JSON itself is corrupted. |
| Extracted Hindi looks plausible but differs from the page | Check glyph mapping and visual order; never do global guessed letter substitutions. |
| Text runs across the wrong columns | Reconstruct layout regions and column order from positions. |
| Some pages have no extracted text | Render and inspect them; use OCR if needed. Do not silently skip them. |
| `Expected an explicitly labeled unreviewed draft` | Use the draft edition schema, not the OCR page-checkpoint schema or a falsely reviewed file. |
| Source identity/license/checksum mismatch | Compare manifest and exact PDF; do not relax the validator. |
| Missing source PDF during import | The importer verifies the public original, or its archive under `backend/data/source-pdfs/`; a JSON alone is insufficient. |
| Missing scripture row | Establish the book/catalog entry deliberately; this importer expects it to exist. |
| Existing draft differs | Stop automatic replacement. Preserve edition/passage IDs and annotations while planning an explicit, backed-up revision. |
| Reader still opens PDF | Check selected edition ID, status, sort order, returned API content and frontend/server revision. |
| Supabase succeeds but a fresh database lacks the draft | Ordinary sync preserves existing drafts but does not discover/import them. Rerun the explicit draft importer for restoration. |

Draft imports are a separate path from `import-transcription.cjs` and `migrate-library-text.cjs`. Those require reviewed source pages and can convert existing PDF editions/archive PDFs. Do not use them to bypass missing review or to accomplish this separate-draft task.

Keep original PDFs, manifests, draft JSON and the importer together. Scratch extraction files, screenshots, virtual environments and backups are gitignored. Commit/share the intended source files through the user's normal workflow; do not commit secrets or private backups.

## 14. A prompt to give another Claude model

> Read `PDF_TO_JSON_SUPABASE_GUIDE.md` and the current repository instructions. Convert the exact PDF I identify into an attributed UTF-8 JSON edition using the Gita-style section/passage structure. Inspect and resolve its actual font/text-layer problems; preserve the printed content, ordering, provenance, checksum and source-page coverage. Do not invent text or mark it reviewed. If I request Supabase storage, validate and use the separate draft importer with the existing backend DATABASE_URL, preserve the original scan and user annotations, compare every stored passage to the JSON, and verify the live reader. Return the JSON path, imported counts, reader link and any unresolved limitations. Reuse the existing implementation where appropriate; do not assume another PDF shares these books' font IDs, coordinates or chapter boundaries.

## Appendices: executable snapshots and verification code

These snapshots preserve the local conversion logic because `backend/data/transcription-drafts/` is gitignored. Write each fenced block to the exact indicated path as UTF-8, review it, and run from the repository root unless stated otherwise. Existing files should be inspected before being replaced. The book-specific scripts encode the layouts and checksums of these exact sources; they are not a universal PDF converter.

The importer snapshot depends on the repository's existing `library-sources.cjs`, `document-text.cjs`, Prisma client/schema, and Node dependencies. This document is a handoff for this project, not a standalone replacement for the repository or its private database configuration.

### A. Explicit draft importer (run from backend/)

Save as `backend/scripts/import-draft-edition.cjs`.

```javascript
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { validateEdition } = require('./library-sources.cjs');
const { documentPaths, verifyPdf } = require('./document-text.cjs');

// Explicit imports only. Drafts never enter the verified-edition loader.
function validateDraftEdition(input, document) {
  if (input.reviewStatus !== 'unreviewed-draft') throw new Error('Expected an explicitly labeled unreviewed draft.');
  if (!document || input.sourceDocument !== document.source || input.sourceSha256 !== document.sha256 ||
      input.sourcePageCount !== document.pageCount || input.scriptureSlug !== document.scriptureSlug ||
      input.language !== document.language || input.license !== document.license ||
      input.source !== `urn:sha256:${document.sha256}`) {
    throw new Error('Draft identity, attribution or checksum does not match the source document.');
  }
  const edition = validateEdition(input);
  const pages = new Set();
  const illustrations = new Set(input.illustrationOnlyPages || []);
  const checkPage = page => {
    if (!Number.isInteger(page) || page < 1 || page > document.pageCount) throw new Error('Invalid source page.');
  };
  for (const page of illustrations) checkPage(page);
  let lastPage = 0;
  edition.sections.forEach((section, sectionIndex) => {
    if (section.sortOrder !== sectionIndex + 1) throw new Error('Chapters must be in consecutive source order.');
    section.passages.forEach((passage, passageIndex) => {
      const page = input.sections[sectionIndex].passages[passageIndex].sourcePage;
      checkPage(page);
      if (page < lastPage || illustrations.has(page)) throw new Error('Passage source pages are out of order or illustration-only.');
      if (passage.sortOrder !== passageIndex + 1) throw new Error('Passages must be in consecutive source order.');
      if (/[\uE000-\uF8FF\uFFFD]/u.test(passage.text)) throw new Error('Unconverted font characters remain in the draft.');
      lastPage = page;
      pages.add(page);
      passage.sourceNotes = [passage.sourceNotes,
        `Source PDF: ${document.source}; page ${page}. Source SHA-256: ${document.sha256}. Draft text; not fully proofread.`,
      ].filter(Boolean).join('\n');
    });
  });
  if (new Set([...pages, ...illustrations]).size !== document.pageCount) throw new Error('Some source pages are missing.');
  const checksum = createHash('sha256').update(JSON.stringify(edition)).digest('hex');
  edition.provenance += `\nExplicitly imported as a separate draft text edition; no review attestation is implied.\nSource PDF: ${document.source}\nSource PDF SHA-256: ${document.sha256}\nDraft edition SHA-256: ${checksum}`;
  return edition;
}

function assertStoredDraft(stored, source) {
  const { sections, scriptureSlug, ...metadata } = source;
  if (stored.contentStatus !== 'draft' || Object.entries(metadata).some(([key, value]) => stored[key] !== value) ||
      stored.sections.length !== sections.length) throw new Error('Stored draft metadata differs; refusing to overwrite existing content.');
  for (const section of sections) {
    const saved = stored.sections.find(item => item.slug === section.slug);
    if (!saved || saved.title !== section.title || saved.sortOrder !== section.sortOrder || saved.passages.length !== section.passages.length) {
      throw new Error('Stored draft chapters differ; refusing to overwrite existing content.');
    }
    for (const passage of section.passages) {
      const savedPassage = saved.passages.find(item => item.reference === passage.reference);
      if (!savedPassage || savedPassage.text !== passage.text || savedPassage.sortOrder !== passage.sortOrder ||
          savedPassage.sourceNotes !== passage.sourceNotes) throw new Error('Stored draft passages differ; refusing to overwrite annotated text.');
    }
  }
}

async function applyDraftEdition(tx, input, document, writeBackup) {
  const source = validateDraftEdition(input, document);
  const scripture = await tx.scripture.findUniqueOrThrow({ where: { slug: source.scriptureSlug } });
  // Serialize imports for this book, including concurrent first-time imports.
  await tx.$queryRaw`SELECT id FROM scriptures WHERE id = ${scripture.id} FOR UPDATE`;
  const matches = await tx.scriptureEdition.findMany({
    where: { scriptureId: scripture.id, source: source.source, language: source.language },
    include: { sections: { include: { passages: true } } },
  });
  if (matches.length > 1) throw new Error('Multiple editions match this draft source; no changes made.');
  if (matches.length) {
    assertStoredDraft(matches[0], source);
    return { editionId: matches[0].id, scriptureId: scripture.id, unchanged: true, chapters: source.sections.length, passages: source.expectedPassages };
  }
  const id = randomUUID();
  await writeBackup({ scripture, newEditionId: id, source: source.source, sourceSha256: document.sha256 });
  const { sections, scriptureSlug, ...metadata } = source;
  await tx.scriptureEdition.create({ data: { id, scriptureId: scripture.id, ...metadata, contentStatus: 'draft' } });
  const records = sections.map(section => ({ ...section, id: randomUUID() }));
  await tx.scriptureSection.createMany({ data: records.map(({ id: sectionId, title, slug, sortOrder }) => ({
    id: sectionId, editionId: id, title, slug, sortOrder,
  })) });
  const passages = records.flatMap(section => section.passages.map(passage => ({
    ...passage, sectionId: section.id, wordCount: passage.text.trim().split(/\s+/u).length,
  })));
  for (let index = 0; index < passages.length; index += 250) {
    await tx.scripturePassage.createMany({ data: passages.slice(index, index + 250) });
  }
  const stored = await tx.scriptureEdition.findUniqueOrThrow({ where: { id }, include: { sections: { include: { passages: true } } } });
  assertStoredDraft(stored, source);
  const complete = await tx.scriptureEdition.count({ where: { scriptureId: scripture.id, contentStatus: 'complete' } });
  await tx.scripture.update({ where: { id: scripture.id }, data: { availabilityStatus: complete ? 'complete' : 'partial' } });
  return { editionId: id, scriptureId: scripture.id, unchanged: false, chapters: sections.length, passages: passages.length };
}

async function main(args) {
  const apply = args.includes('--apply');
  const filenames = args.filter(arg => arg !== '--apply');
  if (filenames.length !== 1 || filenames[0].startsWith('--')) throw new Error('Usage: node scripts/import-draft-edition.cjs <draft.json> [--apply]');
  const input = JSON.parse(fs.readFileSync(path.resolve(filenames[0]), 'utf8'));
  const directory = path.resolve(__dirname, '../../library/documents');
  const document = fs.readdirSync(directory).filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'))).find(item => item.source === input.sourceDocument);
  const source = validateDraftEdition(input, document);
  const { publicFile, archiveFile } = documentPaths(document);
  verifyPdf(fs.existsSync(publicFile) ? publicFile : archiveFile, document);
  console.log(JSON.stringify({ title: source.title, chapters: source.sections.length, passages: source.expectedPassages, status: 'draft', apply }));
  if (!apply) return;
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  const { PrismaClient } = require('@prisma/client');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  url.searchParams.set('connect_timeout', '15');
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    const result = await prisma.$transaction(tx => applyDraftEdition(tx, input, document, snapshot => {
      const backups = path.resolve(__dirname, '../backups');
      fs.mkdirSync(backups, { recursive: true });
      fs.writeFileSync(path.join(backups, `draft-edition-${Date.now()}-${randomUUID()}.json`), JSON.stringify(snapshot), { flag: 'wx' });
    }), { timeout: 120000, maxWait: 10000 });
    console.log(JSON.stringify({ ...result, readerPath: `/reader/${result.scriptureId}/${result.editionId}` }));
  } finally { await prisma.$disconnect(); }
}

module.exports = { validateDraftEdition, assertStoredDraft, applyDraftEdition };
if (require.main === module) main(process.argv.slice(2)).catch(error => {
  console.error(error.name?.startsWith('Prisma') ? `Database import failed (${error.code || error.name}).` : error.message);
  process.exitCode = 1;
});
```

### B. Manusmriti glyph mapping

Save as `backend/data/transcription-drafts/inspect-manusmriti-font.py`.

```python
from pathlib import Path
from fontTools.ttLib import TTCollection, TTFont
import pymupdf, io, json, collections

font = TTCollection('C:/Windows/Fonts/Nirmala.ttc').fonts[0]
mapping = {name: chr(code) for code, name in font.getBestCmap().items() if code < 0xe000}
subtables = []
for lookup in font['GSUB'].table.LookupList.Lookup:
    for sub in lookup.SubTable:
        subtables.append((sub.ExtensionLookupType, sub.ExtSubTable) if lookup.LookupType == 7 else (lookup.LookupType, sub))
for repeat in range(20):
    before = len(mapping)
    for kind, sub in subtables:
        if kind == 1:
            for source, target in sub.mapping.items():
                if source in mapping and target not in mapping: mapping[target] = mapping[source]
        elif kind == 4:
            for source, ligatures in sub.ligatures.items():
                for lig in ligatures:
                    parts = [source] + lig.Component
                    if all(p in mapping for p in parts) and lig.LigGlyph not in mapping:
                        mapping[lig.LigGlyph] = ''.join(mapping[p] for p in parts)
    if len(mapping) == before: break
by_id = {font.getGlyphID(name): text for name, text in mapping.items()}
pdf = pymupdf.open('frontend/dist/library/manusmriti-sampurna.pdf')
used = collections.Counter()
for page in pdf:
    for span in page.get_texttrace():
        if 'Nirmala' in span['font']:
            used.update(c[1] for c in span['chars'] if c[1] >= 0)
print('used',len(used),'unknown',[(g,n) for g,n in used.items() if g not in by_id])
for gid in sorted(used):
    if gid >= 300: print(gid,used[gid],repr(by_id.get(gid)))
Path('backend/data/transcription-drafts/manusmriti-glyph-map.json').write_text(json.dumps(by_id,ensure_ascii=False,indent=2),encoding='utf8')
```

### C. Manusmriti outline compatibility check

Save as `backend/data/transcription-drafts/check-manusmriti-outlines.py`.

```python
"""Verify glyph-ID compatibility before using the installed font to decode PDF text."""
import io
import pymupdf
from fontTools.ttLib import TTCollection, TTFont

pdf = pymupdf.open('frontend/dist/library/manusmriti-sampurna.pdf')
fonts = TTCollection('C:/Windows/Fonts/Nirmala.ttc').fonts
checked = set()
total = 0
for page in pdf:
    for xref, _, _, name, *_ in page.get_fonts():
        if 'Nirmala' not in name or xref in checked:
            continue
        checked.add(xref)
        embedded = TTFont(io.BytesIO(pdf.extract_font(xref)[3]))
        original = fonts[1 if 'Bold' in name else 0]
        count = 0
        for glyph_id, glyph_name in enumerate(embedded.getGlyphOrder()):
            glyph = embedded['glyf'][glyph_name]
            if not glyph.numberOfContours:
                continue
            expected = original['glyf'][original.getGlyphName(glyph_id)]
            assert glyph.getCoordinates(embedded['glyf']) == expected.getCoordinates(original['glyf']), (xref, glyph_id)
            count += 1
        total += count
        print('Verified font', xref, 'outlines', count)
print('Verified', len(checked), 'embedded fonts and', total, 'nonempty outlines')
```

### D. Manusmriti glyph/line decoder

Save as `backend/data/transcription-drafts/extract-manusmriti.py`.

```python
"""Decode the supplied PDF glyphs locally, preserving source order and text."""
from pathlib import Path
import json, re, collections, hashlib
import pymupdf

ROOT = Path(__file__).resolve().parents[3]
WORK = Path(__file__).resolve().parent
PDF = ROOT / 'frontend/dist/library/manusmriti-sampurna.pdf'
mapping = {int(k): v for k, v in json.loads((WORK / 'manusmriti-glyph-map.json').read_text(encoding='utf8')).items()}
reph = {330: 'Ⓡ', 333: 'Ⓡं', 334: 'ीⓇ', 335: 'ीⓇं', 337: 'ेⓇ', 340: 'ैⓇ',
        342: 'ोⓇ', 343: 'ौⓇ', 344: 'ोⓇं'}
consonant = r'[क-हक़-य़]़?'
cluster = consonant + r'(?:्' + consonant + r')*'

def logical(text):
    text = re.sub('ⓘ(' + cluster + ')', r'\1ि', text)
    text = re.sub('(' + cluster + r'्?|[अ-औ])([ािीुूृॄॅेैॉोौंँ़]*)Ⓡ', r'र्\1\2', text)
    return re.sub(r'[\s\u00a0]+', ' ', text).strip()

pdf = pymupdf.open(PDF)
pages = []
for number, page in enumerate(pdf, 1):
    lines = []
    for span in page.get_texttrace():
        # Footer title, source website and printed page number are in metadata.
        if not span['chars'] or span['chars'][0][2][1] > 510:
            continue
        by_baseline = collections.OrderedDict()
        for code, glyph, origin, bbox in span['chars']:
            if glyph < 0: continue  # synthetic Unicode expansion, not another glyph
            if 'Nirmala' in span['font']:
                value = reph.get(glyph, 'ⓘ' if glyph in [302, 303, 304] else mapping[glyph])
            else:
                value = chr(code)
            key = next((y for y in by_baseline if abs(y - origin[1]) < 1), round(origin[1], 1))
            if key not in by_baseline: by_baseline[key] = {'x': origin[0], 'text': ''}
            by_baseline[key]['text'] += value
        for baseline, run in by_baseline.items():
            line = next((l for l in lines if abs(l['y'] - baseline) < 1), None)
            if line is None:
                line = {'y': baseline, 'runs': [], 'colors': []}
                lines.append(line)
            line['runs'].append(run)
            if run['text'].strip(): line['colors'].append(span['color'])
    result = []
    for line in sorted(lines, key=lambda l: l['y']):
        text = logical(''.join(r['text'] for r in sorted(line['runs'], key=lambda r: r['x'])))
        if text:
            result.append({'y': round(line['y'], 2), 'text': text, 'colors': line['colors']})
    pages.append({'number': number, 'lines': result})
    for line in result:
        if 'अथ' in line['text'] and 'अध्याय' in line['text']: print(number, line['y'], line['text'])
(WORK / 'manusmriti-decoded-pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf8')
print('PAGES',len(pages),'EMPTY',[p['number'] for p in pages if not p['lines']])
print('UNRESOLVED',[(p['number'],l['text']) for p in pages for l in p['lines'] if 'ⓘ' in l['text'] or 'Ⓡ' in l['text']][:30])
print('PAGE11','\n'.join(l['text'] for l in pages[10]['lines']))
```

### E. Manusmriti JSON exporter

Save as `backend/data/transcription-drafts/export-manusmriti.py`.

```python
"""Package decoded PDF text as an explicitly unreviewed library edition."""
from pathlib import Path
import json, hashlib, re

ROOT = Path(__file__).resolve().parents[3]
WORK = Path(__file__).resolve().parent
pages = json.loads((WORK / 'manusmriti-decoded-pages.json').read_text(encoding='utf8'))
document = json.loads((ROOT / 'library/documents/manusmriti-hi.json').read_text(encoding='utf8'))
source = ROOT / 'frontend/dist/library/manusmriti-sampurna.pdf'
assert hashlib.sha256(source.read_bytes()).hexdigest() == document['sha256']
chapter_pages = [11, 34, 85, 143, 198, 228, 246, 287, 362, 420, 443, 488]
sections = [{'slug': 'front-matter', 'title': 'आरंभिक पृष्ठ, विषय सूची और प्रस्तावना', 'sortOrder': 1,
             'expectedPassages': 0, 'passages': []}]
line_count = 0
heading_count = 0
covered = set()
for page in pages:
    number = page['number']
    heading = None
    if number in chapter_pages:
        chapter = chapter_pages.index(number) + 1
        headings = [l for l in page['lines'] if re.match(r'^॥अथ .+अध्याय ॥$', l['text'])]
        assert len(headings) == 1, number
        heading = headings[0]
        heading_count += 1
        sections.append({'slug': f'chapter-{chapter}', 'title': heading['text'], 'sortOrder': len(sections) + 1,
                         'expectedPassages': 0, 'passages': []})
    elif number == 509:
        sections.append({'slug': 'credits', 'title': 'संकलन और प्रकाशन संबंधी विवरण', 'sortOrder': len(sections) + 1,
                         'expectedPassages': 0, 'passages': []})
    groups = []
    for line in page['lines']:
        if line == heading: continue
        # Red verse blocks, black explanation blocks and blue headings stay distinct.
        colors = line['colors']
        color = colors[0] if colors else []
        if not groups or line['y'] - groups[-1]['lastY'] > 20 or color != groups[-1]['color']:
            groups.append({'lines': [], 'lastY': line['y'], 'color': color})
        groups[-1]['lines'].append(line['text'])
        groups[-1]['lastY'] = line['y']
        line_count += 1
    section = sections[-1]
    for group in groups:
        text = '\n'.join(group['lines'])
        assert text.strip()
        assert not re.search(r'[\uE000-\uF8FF\uFFFDⓘⓇ]', text)
        order = len(section['passages']) + 1
        prefix = section['slug'].replace('chapter-', '')
        notes = f'PDF page {number}. Source glyph decoding; not fully proofread. This reference identifies a reading-order text block, not an individual Sanskrit verse.'
        if number in [83, 460, 463]:
            notes += ' Unusual printed reph placement is preserved and requires editorial review.'
        section['passages'].append({'reference': f'{prefix}.{order}', 'text': text, 'sortOrder': order,
                                    'sourcePage': number, 'sourceNotes': notes})
        covered.add(number)
for section in sections:
    section['expectedPassages'] = len(section['passages'])
assert len(sections) == 14 and heading_count == 12
assert covered == set(range(1, 510))
assert line_count + heading_count == sum(len(p['lines']) for p in pages)
edition = {key: document[key] for key in ['scriptureSlug', 'language', 'script', 'isOriginal', 'textDirection', 'license']}
edition.update({
    'title': 'मनुस्मृति — संस्कृत मूल एवं हिन्दी व्याख्या (पाठ-रूपांतरण का मसौदा)',
    'translator': None,
    'source': 'urn:sha256:' + document['sha256'],
    'provenance': 'Converted from the user-selected frontend/dist/library/manusmriti-sampurna.pdf. Its SHA-256 matches the cataloged original /library/manusmriti-sampurna.pdf, originally supplied as मनुस्मृति-सम्पूर्ण.pdf. All 509 source pages are represented: opening pages, contents and introduction (1–10), 12 printed chapters (11–508), and compiler/publisher credits (509). The final page credits compiler श्री मनीष त्यागी, founder and president of श्री हिंदू धर्म वैदिक एजुकेशन फाउंडेशन (www.shdvef.com); translator and reuse rights remain unverified. The embedded ToUnicode maps contain incorrect character assignments. Text was recovered locally from actual Nirmala UI glyph IDs using the installed font’s Unicode cmap and reverse GSUB mappings, with embedded glyph outlines checked against that font. Pre-base i-matras and reph were reordered into logical Unicode. This is deterministic font decoding, not OCR, generated scripture, a substitute edition, or editorial correction. Sanskrit verse blocks, printed verse numbers, Hindi explanations, headings and source line breaks are preserved. Passage boundaries follow printed spacing/color changes and page boundaries; passage references are local reading-order identifiers, not canonical verse numbers. Repeated footer title, page number and www.shdvef.com labels are omitted from passage text and retained here as provenance. Original graphics remain in the PDF. Unusual printed reph placements on pages 83, 460 and 463 remain flagged for review rather than silently corrected. Structural validation and sample visual comparisons do not establish complete textual accuracy. This draft has not been fully proofread and makes no claim that the source constitutes a verified complete Manusmriti.',
    'expectedPassages': sum(s['expectedPassages'] for s in sections),
    'reviewStatus': 'unreviewed-draft',
    'sourceDocument': document['source'],
    'sourceArtifact': 'frontend/dist/library/manusmriti-sampurna.pdf',
    'sourceSha256': document['sha256'],
    'sourcePageCount': 509,
    'illustrationOnlyPages': [],
    'textLanguages': ['sa', 'hi'],
    'extraction': {'method': 'embedded glyph IDs with outline-verified Nirmala UI cmap and reverse GSUB',
                   'fontSha256': hashlib.sha256(Path('C:/Windows/Fonts/Nirmala.ttc').read_bytes()).hexdigest(),
                   'printedChapterStartPages': chapter_pages, 'decodedBodyLines': line_count + heading_count,
                   'fullyProofread': False},
    'sections': sections,
})
output = ROOT / 'library/editions/drafts/manusmriti-hi.json'
assert not output.exists(), 'Preserve any existing edition; review before replacing.'
output.write_text(json.dumps(edition, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps({'file': str(output), 'sourcePages': len(covered), 'printedChapters': heading_count,
                  'sections': len(sections), 'passages': edition['expectedPassages'], 'bodyLines': line_count + heading_count}))
for section in sections: print(section['slug'],section['expectedPassages'])
```

### F. Mahabharata JSON exporter (requires layout cache and convert3.py)

Save as `backend/data/transcription-drafts/export-bal-mahabharat.py`.

```python
"""Export the supplied PDF's embedded text; never attest review or import it."""
from pathlib import Path
import collections
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[3]
WORK = Path(__file__).resolve().parent
sys.path.insert(0, str(WORK / 'walkman-converter'))
from convert3 import convertToUni


def decode(text, heading=False):
    text = ''.join(chr(ord(c) - 0xf000) if 0xf000 <= ord(c) <= 0xf0ff else c for c in text)
    # These are font encodings, not editorial word substitutions.
    if heading:
        text = text.replace('¸', 'Õ').replace('=', 'त्र')
    text = text.replace('±', 'Za').replace('à', 'ह्व').replace('Ï', 'स्र')
    text = re.sub(r'o([ksSaquw`zZ+]*?)Q', lambda m: 'd' + m[1], text)
    text = re.sub(r'i([ksSaquw`zZ+]*?)Q', lambda m: 'फ' + m[1], text)
    text = re.sub(r'I([ksSaquw`zZ+]*?)Q', lambda m: ('फ' if 'k' in m[1] else 'फ्') + m[1].replace('k', ''), text)
    text = text.replace('jQ', 'रु').replace('”k', 'ज़').replace('”', 'ज़्')
    return convertToUni(text, 1)


def line_text(line, heading=False):
    parts = []
    for span in line['spans']:
        text = span['text']
        if span['font'] == 'Chanakya':
            # The PDF switches fonts for four conjunct glyphs.
            text = ''.join({'_': 'ट्ठ', '^': 'ट्ट', 'a': 'ड्ड', 'b': 'ड्ढ'}.get(c, c) for c in text)
        elif span['font'] == 'TT66AT00':
            # End-of-book ornamental square, not the Hindi letter ta.
            text = '□'
        parts.append(text)
    return decode(''.join(parts), heading).strip()


layout = json.loads((WORK / 'bal-mahabharat-layout.json').read_text(encoding='utf-8'))
manifest = json.loads((ROOT / 'library/documents/bal-mahabharat-katha-hi.json').read_text(encoding='utf-8'))
pdf = ROOT / 'frontend/public/library/bal-mahabharat-katha.pdf'
assert hashlib.sha256(pdf.read_bytes()).hexdigest() == manifest['sha256']
sections = []
seen_pages = set()
source_lines = 0
emitted_lines = 0
for page_number, page in enumerate(layout, 1):
    lines = [(block_index, line) for block_index, block in enumerate(page['blocks']) for line in block['lines']]
    headings = [line for _, line in lines if any(s['font'] == 'TT65CT00' for s in line['spans'])]
    numbers = [line for _, line in lines if any(s['font'] == 'Bookman-Demi' and s['size'] >= 18 for s in line['spans'])]
    boundaries = []
    for number in sorted(numbers, key=lambda l: l['bbox'][1]):
        number_text = ''.join(s['text'] for s in number['spans']).strip()
        assert number_text.isdigit(), (page_number, number_text)
        matched = [h for h in headings if abs(h['bbox'][1] - number['bbox'][1]) < 55]
        assert matched, page_number
        boundaries.append({'number': int(number_text), 'y': min(h['bbox'][1] for h in matched),
                           'title': ' '.join(line_text(h, True) for h in sorted(matched, key=lambda l: l['bbox'][1]))})
    body = [(b, l) for b, l in lines if l['bbox'][1] >= 82 and l['bbox'][1] < 655
            and l not in headings and l not in numbers
            and any('Walkman' in s['font'] for s in l['spans'])]
    source_lines += len(body)
    for band in range(len(boundaries) + 1):
        low = boundaries[band - 1]['y'] if band else 82
        high = boundaries[band]['y'] if band < len(boundaries) else 655
        if band:
            heading = boundaries[band - 1]
            assert heading['number'] == len(sections) + 1, heading
            sections.append({'slug': 'chapter-' + str(heading['number']),
                             'title': 'अध्याय ' + str(heading['number']) + ': ' + re.sub(r'\s+', ' ', heading['title']),
                             'sortOrder': heading['number'], 'expectedPassages': 0, 'passages': []})
        selected = [(b, l) for b, l in body if low <= l['bbox'][1] < high]
        selected.sort(key=lambda item: (0 if item[1]['bbox'][0] < 252 else 1, item[1]['bbox'][1], item[1]['bbox'][0]))
        groups = []
        for block, line in selected:
            column = 0 if line['bbox'][0] < 252 else 1
            if not groups or groups[-1]['key'] != (block, column):
                groups.append({'key': (block, column), 'lines': []})
            groups[-1]['lines'].append(line_text(line))
            emitted_lines += 1
        for group in groups:
            assert sections, page_number
            section = sections[-1]
            order = len(section['passages']) + 1
            # Retain physical line breaks, including printed hyphenation.
            text = '\n'.join(group['lines'])
            assert text.strip(), (page_number, group)
            section['passages'].append({'reference': str(section['sortOrder']) + '.' + str(order),
                                        'text': text, 'sortOrder': order,
                                        'sourceNotes': f'PDF page {page_number}; {"left" if group["key"][1] == 0 else "right"} column. Embedded-font conversion; not fully proofread.',
                                        'sourcePage': page_number})
            seen_pages.add(page_number)

assert len(sections) == 41
assert seen_pages == set(range(1, 97)) - {22, 80}
assert source_lines == emitted_lines
for section in sections:
    section['expectedPassages'] = len(section['passages'])
edition = {key: manifest[key] for key in ['scriptureSlug', 'language', 'script', 'isOriginal', 'textDirection', 'license']}
edition.update({'title': 'बाल महाभारत कथा — हिन्दी (NCERT; पाठ-रूपांतरण का मसौदा)',
                'translator': None,
                'source': 'urn:sha256:' + manifest['sha256'],
                'provenance': 'Converted from the user-supplied ghmb101.pdf, preserved locally as ' + manifest['source'] + '. All 96 source pages are represented, with 41 printed chapters in their original order. NCERT markings and Reprint 2024-25 are present in the source. This is a children’s retelling, not the complete Mahabharata. Author/translator and additional reuse rights are unverified. Text was decoded from embedded Walkman Chanakya fonts, not generated or paraphrased. Conversion uses the mapping from https://github.com/assistech-iitdelhi/ePubFontConverter-WalkmanChanakya with PDF-specific font/glyph handling. Two-column reading order restarts beneath each chapter heading. Passages are source text blocks, split at page/column boundaries; references identify chapter and passage, not canonical verses. Running page headers and Reprint footers are excluded from passages; illustrations and image-only copyright/watermark labels remain in the original PDF. Line breaks and printed hyphenation are retained. Structural checks and sample visual comparisons are complete; every page has NOT been proofread. This draft must not be treated as a verified edition or imported automatically.',
                'expectedPassages': sum(s['expectedPassages'] for s in sections),
                'reviewStatus': 'unreviewed-draft', 'sourceDocument': manifest['source'],
                'sourceSha256': manifest['sha256'], 'sourcePageCount': 96,
                'illustrationOnlyPages': [22, 80],
                'sections': sections})
output = ROOT / 'library/editions/drafts/bal-mahabharat-katha-hi.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(edition, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'file': str(output), 'chapters': len(sections), 'passages': edition['expectedPassages'],
                  'pages': len(seen_pages), 'sourceLines': source_lines, 'emittedLines': emitted_lines}))
texts = '\n'.join(p['text'] for s in sections for p in s['passages'])
print('Unexpected characters:', collections.Counter(c for c in texts if not ('\u0900' <= c <= '\u097f' or c in '\n\t .,;:!?-—–“”‘’\"\'()[]{}।०१२३४५६७८९0123456789□' )))
```

### G. Generic API equality verifier (read-only)

Save as `backend/data/transcription-drafts/verify-draft-api.cjs`.

```javascript
// Read-only verification. Run from the repository root with the real API online.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const base = process.env.LIBRARY_API_BASE || 'http://127.0.0.1:3001/api';
async function get(endpoint) {
  const response = await fetch(base + endpoint, { signal: AbortSignal.timeout(30000) });
  assert.ok(response.ok, `API request failed: ${endpoint} (${response.status})`);
  return response.json();
}
async function main() {
  const catalog = await get('/scriptures?search=' + encodeURIComponent(source.scriptureSlug));
  const book = catalog.scriptures.find(item => item.slug === source.scriptureSlug);
  assert.ok(book, 'Book must exist in the API catalog');
  const { scripture } = await get('/scriptures/' + book.id);
  const matches = scripture.editions.filter(e => e.source === source.source && e.language === source.language);
  assert.equal(matches.length, 1, 'Exactly one imported text edition must match');
  const edition = matches[0];
  assert.equal(edition.contentStatus, 'draft');
  assert.equal(edition.expectedPassages, source.expectedPassages);
  assert.ok(scripture.editions.some(e => e.source === source.sourceDocument), 'Original PDF edition must remain');
  const { sections } = await get('/passages/edition/' + edition.id);
  assert.equal(sections.length, source.sections.length);
  const pages = new Set(source.illustrationOnlyPages || []);
  let count = 0;
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    const expected = source.sections[index];
    assert.equal(section.slug, expected.slug);
    assert.equal(section.title, expected.title);
    assert.equal(section._count.passages, expected.expectedPassages);
    const passages = [];
    for (let page = 1; passages.length < expected.expectedPassages; page++) {
      const result = await get(`/passages/section/${section.id}?page=${page}&limit=100`);
      assert.ok(result.passages.length, 'Pagination stopped before all passages were returned');
      passages.push(...result.passages);
    }
    assert.equal(passages.length, expected.passages.length);
    passages.forEach((passage, position) => {
      const original = expected.passages[position];
      assert.equal(passage.text, original.text);
      assert.equal(passage.reference, original.reference);
      assert.equal(passage.sortOrder, original.sortOrder);
      assert.ok(passage.sourceNotes.includes(`page ${original.sourcePage}.`));
      assert.ok(passage.sourceNotes.includes(source.sourceSha256));
      pages.add(original.sourcePage);
    });
    count += passages.length;
  }
  assert.equal(count, source.expectedPassages);
  assert.equal(pages.size, source.sourcePageCount);
  console.log(JSON.stringify({ allTextMatches: true, sections: sections.length, passages: count,
    sourcePages: pages.size, defaultEdition: scripture.editions[0].id === edition.id,
    readerPath: `/reader/${book.id}/${edition.id}` }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
```

# Shiva Purana: reproducible addition (2026-10-16)

For the 845-page Manoj Publications **Shiva Purana** PDF, use the dedicated extractor rather than the Manusmriti or Chanakya converters described above. It produces the same edition/sections/passages JSON schema and uses the same atomic Supabase draft importer.

```powershell
# Run from the repository root. Existing local PyMuPDF environment is sufficient.
backend/.venv-ocr/Scripts/python.exe backend/scripts/extract-shiva-purana.py --write
node backend/scripts/import-draft-edition.cjs library/editions/drafts/shiva-purana-hi.json
node backend/scripts/import-draft-edition.cjs library/editions/drafts/shiva-purana-hi.json --apply
# Requires the application API running on localhost:3001; read-only verification.
node backend/scripts/verify-draft-api.cjs library/editions/drafts/shiva-purana-hi.json
```

- Source SHA-256: `f01e41ced20f14d1d071229078693372035f64d4fb459974b19e9618a02bb666`.
- Output: `library/editions/drafts/shiva-purana-hi.json`; page audit: `shiva-purana-hi.audit.json` in the same directory.
- Result: 4,292 reading blocks, 484 sections: 462 printed chapters, 13 division title sections, nine other front-matter/appendix sections. All 845 pages accounted for: 814 text pages and 31 illustration/decorative-only pages. Image-only text on pages 1, 2, 37 and 844 was manually transcribed from rendered images.
- Font problem: the PDF renders Hindi correctly but its Unicode extraction maps conjuncts and marks to unrelated characters. All 227 regular and 66 bold nonempty glyph outlines matched historical official Noto Sans Devanagari fonts at commit `ad153f5a14c838afb16c83f0a02784c7605f1e21`. The checked-in mapping `backend/data/font-maps/shiva-purana-noto.json` records the font URLs, original/embedded font hashes, and glyph-to-Unicode mappings derived from cmap/GSUB.
- Context matters: glyph 606 is an empty placeholder, shared by contextual i+anusvara, i+reph, and i+reph+anusvara forms. Treating it as a literal anusvara corrupts words such as `निर्विकल्पं`. The extractor handles these variants and reorders pre-base i and reph. Do not reuse a simple global character replacement for another font/PDF.
- Example: source PDF page 101 becomes section `division-55-chapter-22`, with the printed heading `बाईसवां अध्याय` and topic `शिव नैवेद्य और बिल्व माहात्म्य`. Its passage references are local reading-block IDs, not canonical verse numbers. Every passage retains `sourcePage` and source notes.
- The extractor verifies source/font hashes, fails on unknown glyphs or unresolved positioning markers, verifies every decoded line survives grouping, checks the 462 chapter boundaries, and refuses to overwrite a changed existing edition. It does not write the database. The separate importer validates and writes the draft transactionally; the API verifier compares every stored passage against JSON.
- Import as `contentStatus: draft`, preserve the original PDF edition, and keep the not-fully-proofread label. Printed anomalies, such as the chapter label on page 625, are retained rather than silently corrected. Coverage and sample checks are not a full editorial review or a claim of canonical completeness.

The completed Supabase import created edition `97657e7d-08d6-4d1c-8e46-a63c07eeab6f` under scripture `fcd3159a-1662-4009-b29c-26f6f5f89f2c`. Repeating the import returned `unchanged: true`. Its reader route is `/reader/fcd3159a-1662-4009-b29c-26f6f5f89f2c/97657e7d-08d6-4d1c-8e46-a63c07eeab6f`. Desktop/mobile navigation, contents and the final reader page (2266) passed against the live public API, with private-user writes stubbed. Backend compilation passed; 55 of 56 backend tests passed and frontend lint completed with existing warnings. The unrelated missing `frontend/public/library/garuda-purana.pdf` blocked the frontend build and caused the remaining backend asset test failure.

---

