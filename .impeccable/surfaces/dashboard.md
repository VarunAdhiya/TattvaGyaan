# Dashboard reference design

Primary target: `frontend/src/pages/LandingPage.jsx`
Related targets: `frontend/src/dashboard-theme.css`, `frontend/src/App.jsx`
Mode: Operate. The signed-in home introduces the library, prayers, calendar and journeys.

## Visual authority

The four user-supplied WhatsApp screenshots dated 20 October 2026 at
10.50.05, 10.50.18, 10.50.30 and 10.50.40 PM define this route's appearance.
They show successive sections of one page; browser chrome and the Windows
taskbar are outside the design. Use the existing full-resolution artwork.

- Temple hero: `durga-temple.png`, transparent navigation, two-line Cormorant
  heading, gold emphasis and a left-aligned library action.
- Panchang and journey: dark brown ground, compact calendar row, Ganesha copy
  beside the complete landscape illustration.
- Prayers: three illustrated cards for Hanuman Chalisa, Achyutam Keshavam and
  Mahamrityunjay Mantra, with reading and collection links.
- Scripture library: warm charcoal panel, introduction on the left and three
  text entries on the right.

The dashboard palette is paper `#191715`, stone `#1d1a17`, cream `#f5ead8`
and gold `#e9bc77`. Headings use the self-hosted Tattva Cormorant font;
interface text uses Sacred Hind. Phone layouts stack the images and content.

## Integration and verification

Load `dashboard-theme.css` in `App.jsx` after `sacred-theme.css` and `auth.css`.
The `dashboard-route` wrapper is present only on `/dashboard`; the account
routes retain their existing components, artwork and styles.

Keep calendar data dynamic, existing authenticated routes, real prayer
destinations and source descriptions. Screenshots are references, not page
backgrounds. Visual evidence: `.impeccable/review/reference-landing-after-*`.
12ui conversion was attempted but requires an external account connection.
