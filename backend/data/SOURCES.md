# Scripture sources

Downloaded 12 October 2026. Text is preserved verbatim; source footnotes are stored separately. These editions are imported alongside legacy samples so annotations retain their original passage IDs.

| Work | Editions | Validation | Source and permission |
| --- | --- | --- | --- |
| Bhagavad Gita | Sanskrit, Hindi, English | 18 chapters, 700 unique verses per edition; chapter counts validated | [Hansi Gita Bhawan Trust](https://gitabhawan.org.in/gita/research). Sanskrit: public domain. Trust-owned Hindi and English translations: reuse with attribution permitted. Source notes are retained in `sources/gita.json`. |
| Quran | Arabic, Hindi, English | 114 surahs, 6,236 unique verses per edition; every surah count validated | [Quran JSON](https://quran-json.risanb.com/), [Tanzil](https://tanzil.net/docs/text_license), [QuranEnc](https://quranenc.com/en/home/api). Arabic: CC BY 3.0, verbatim-only condition. Translations: QuranEnc republishing grant with author/version credit. Original notices, author, versions, and footnotes remain in the source snapshots and reader. |

Run `node scripts/fetch-scripture-sources.cjs` to fetch missing source snapshots. Run `node scripts/import-library.cjs` for validation only, or append `--apply` to import. Repeating an unchanged import is safe. If a source checksum changes, the importer requires a reviewed update rather than silently replacing annotated text.

Legacy samples for Upanishads, Dhammapada, Guru Granth Sahib, Tattvartha Sutra, and the Bible have not been verified as complete. Their catalog status is partial, and their editions are labeled unverified. Full content must come from identified, reusable source editions; generating missing scripture with AI is not a content import.
