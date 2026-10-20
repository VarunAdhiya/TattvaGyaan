# Divine Journeys

Mode: Experience, with short Read moments.

Primary target: `frontend/src/pages/DivineJourneys.jsx`
Related targets: `frontend/src/journeys.css`, `frontend/src/data/divineJourneys.js`,
`frontend/src/pages/LandingPage.jsx`, `frontend/src/components/SectionNavigation.jsx`.

Extends the established temple-green, saffron, vermilion and cream identity,
using the existing self-hosted Sacred Cinzel and Hind fonts. The user requested
a religious, game-like journey inspired by a playable island portfolio.

An illustrated entrance leads to eight Ganesha chapters and a winding trail.
Each chapter contains an original short retelling, an optional source disclosure,
a reflective wisdom petal, previous/next navigation and a revisitable map.
Completion celebrates continuing devotion; it does not invent a final death.
Other deity profiles show real availability and link to existing prayers.

Art is generated 3D-style raster imagery with subtle pointer parallax, not a
rotatable mesh. A requested bell uses synthesized audio only on user action.
Reduced motion disables ambient animation. Browser storage is versioned,
validated, and scoped to the authenticated user; unavailable storage leaves
session exploration usable.

12ui was attempted but required external sign-in, so no approved comp was
available. Implementation uses the existing design authority and generated art.
Review evidence: `.impeccable/review/journey-*.png`. Validate desktop and mobile,
all chapter unlocks, reload, history, corrupted storage, missing art and auth.
