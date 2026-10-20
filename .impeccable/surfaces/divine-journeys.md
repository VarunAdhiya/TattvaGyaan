# Divine Journeys

Mode: Experience, with short Read moments.

Primary target: `frontend/src/pages/DivineJourneys.jsx`
Related targets: `frontend/src/components/JourneyGame.jsx`, `frontend/src/journey-game.css`,
`frontend/src/lib/sacredWorld.js`, `frontend/src/lib/sacredDioramas.js`,
`frontend/src/data/divineJourneys.js`.

Extends the established temple-green, saffron, vermilion and cream identity,
using the existing self-hosted Sacred Cinzel and Hind fonts. The user requested
a religious, game-like journey inspired by a playable island portfolio.

An illustrated entrance leads to eight Ganesha chapters and a winding island trail.
Each chapter contains an original short retelling, optional source disclosure,
a reflection, previous/next navigation and a revisitable map. Every chapter is
available immediately; visiting records progress without a collection gate.
Completion celebrates continuing devotion; it does not invent a final death.
Other deity profiles show real availability and link to existing prayers.

The journey is an actual Three.js world with original stylized mesh sculptures:
Parvati and the human child, Shiva and Nandi, the reunited family, Ganesha's
blessing, the circle of family, the scribe with Vyasa and manuscripts, Ganesha's
symbols and mouse, and festival devotees. No roofs, pillars, picture panels or
image frames surround the figures. Dragging permits viewing them from all sides.
Original generated illustrations remain available in the optional illustration
viewer and as a fallback when WebGL is unavailable.

The selected chapter's readable DOM panel is projected beside its island with
a connecting line and viewport bounds. On phones it sits directly beneath
the island, above the navigation. Bright blue water uses vertex-displaced waves,
analytical normals, highlights, crests and shore ripples. Shadows ground the figures.

A requested bell uses synthesized audio only on user action.
Reduced motion and the pause control freeze water and ambient animation. Browser storage is versioned,
validated, and scoped to the authenticated user; unavailable storage leaves
session exploration usable.

12ui was attempted but required external sign-in, so no approved comp was
available. Implementation uses the existing design authority and generated art.
Review evidence: `.impeccable/review/sculpture-*.png`. Validate desktop and mobile,
all chapters, free navigation, reload, history, wave pause, orbit, sources,
WebGL fallback, unavailable storage and authentication.
