# Personal profile

Mode: Operate. Primary target: `frontend/src/pages/ProfilePage.jsx`.

The profile inherits the shared charcoal, cream, gold, Cormorant and Hind design
system. Its desktop composition pairs an editable account panel with an open
reading journal; mobile stacks the two without changing their reading order.
A small lotus ornament follows the site's existing devotional icon language.

Account fields save through the authenticated profile API. Display name updates
the shared auth context and navbar; Hindi/English preferences initialize new AI
explanations. Legacy language preferences remain visible. Email and username are
read-only. Save, cancel, pending, error and success states are explicit.

The journal uses `/api/auth/profile/activity`: actual bookmarks, notes, completed
plans and distinct books with saved progress. Entries group by scripture ID,
preserving separate books even if their titles match. Progress describes a saved
position, not verified reading completion. Loading failures never become zero
counts. Each entry links to its reader; annotation tools remain in the reader.

No database migration is needed. Existing rows and account identifiers are kept.
Authentication details expose only Google/password availability, never hashes or
Google subject identifiers. Profile updates allow only named, validated fields.

Verification: `frontend/tests/profile.spec.js`, `backend/tests/profile.test.cjs`,
and desktop/mobile captures in `frontend/test-results/profile-{1440,390}.png`.
The shipped palette and typography match `DESIGN.md`; no global token changes.
