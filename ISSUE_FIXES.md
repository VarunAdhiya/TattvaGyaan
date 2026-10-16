# Issue fixes

Implemented against the current `issues.md`.

| Issue | Result |
| --- | --- |
| 1 | The database contains one tradition and the six requested works, with Hindi editions only. Catalog metadata and attributed import files live in `library/`; application code queries PostgreSQL. Legacy excluded editions and dependent records were backed up before removal. |
| 3 | Explanation and chat requests carry selected text/passage/section IDs. The API rejects an edition-only summary request, validates ownership of passages/sections, and isolates conversation history by selection. |
| 11 | Clicking note content opens its paragraph, including across editions. Separate pencil and trash buttons edit/delete notes without navigation. |
| 12, 19 | Native text selection, touch scrolling, and bookmark controls no longer trigger page turns. A floating selection toolbar sends only the selected text to AI. |
| 14 | Search runs against indexed database metadata, supports Hindi and English title aliases, cancels stale requests, and shows loading, empty, error, and retry states. |
| 16 | General, authentication, and AI API limiters and their dependency were removed. Upstream AI provider quotas still apply. |
| 18 | Desktop/mobile library search and the in-reader search control are absent while reading. |
| 20 | A persistent page-number input jumps directly to any valid page. Page numbers remain stable across viewport/font changes; notes/bookmarks resolve their position without loading the full book. |

## Content availability

The complete attributed Hindi Gita has 700 verses. Retained Hindi Upanishads samples are labeled partial/unverified. Mahabharata, Ramayana, Vedas, and Manusmriti have catalog entries but await verified Hindi source editions. No missing scripture was fabricated.

## Validation and operations

- Both application builds pass. Frontend lint exits successfully; existing warnings remain in authentication, profile, and reading-plan components.
- 34 backend tests cover provider errors, selection scope, source validation, and reading-plan scheduling.
- 10 browser checks cover desktop/mobile reading, selection, bookmarks, notes, direct navigation, search, and a read-only live database flow.
- Database checks confirm catalog/language restrictions, all title aliases, paginated passage retrieval, and passage positions. Repeating catalog synchronization removes zero further editions.
- The API was restarted on port 3001; the existing frontend serves on port 5173.
- A live Gemini check returned a Hindi summary confined to the selected first chapter. The first attempt encountered a provider 503; retry succeeded, and provider errors remain visible to the user.

See [library/README.md](library/README.md) for migrations, imports, recovery snapshot locations, and adding source editions. Run the optional live provider check with `node scripts/check-ai-selection.cjs` from `backend/`; it writes no user records.
