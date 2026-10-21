# Divine Journeys

Mode: Experience, with short Read moments.

Primary target: `frontend/src/pages/DivineJourneys.jsx`
Related targets: `frontend/src/components/JourneyGame.jsx`, `frontend/src/journey-game.css`,
`frontend/src/lib/sacredWorld.js`, `frontend/src/lib/sacredTableaux.js`,
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

The journey is a Three.js island world with eight photographic-style devotional
tableaux, replacing the toy-like procedural figures at the user's request.
Each chapter has its own transparent artwork: Parvati and the human child,
Shiva and Nandi at the threshold, the reunited family, Ganapati with ganas,
Ganesha walking around his parents, the scribe with Vyasa, the symbols and mouse,
and the festival farewell. The original alpha contours appear on shallow curved
camera-facing surfaces within real 3D terrain. These are illustrated tableaux,
not fully modeled figures; no roofs or rectangular frames surround them.
Dragging orbits the terrain while the artwork remains legible. All eight islands
remain visible in the world during chapter focus, travel and orbit. Wider camera
framing and additional zoom-out range reveal neighbouring stages.
The optional illustration viewer uses each chapter's new artwork. Existing scenic
illustrations remain the fallback when WebGL or a chapter texture is unavailable.
Asset prompts and medium are recorded in `frontend/public/journeys/realistic/prompts.json`.

The selected chapter's readable DOM panel is projected beside its island with
a connecting line and viewport bounds. On phones it sits directly beneath
the island, above the navigation. Bright blue water uses vertex-displaced waves,
analytical normals, highlights, crests and shore ripples. Terrain receives shadows;
figure lighting and contact shadows are part of the generated artwork.

A requested bell uses synthesized audio only on user action.
Reduced motion and the pause control freeze water and ambient animation. Browser storage is versioned,
validated, and scoped to the authenticated user; unavailable storage leaves
session exploration usable.

12ui was attempted but required external sign-in, so no approved comp was
available. Implementation uses the existing design authority and generated art.
Review evidence: `.impeccable/review/realism-*.png`. Validate desktop and mobile,
all chapters, free navigation, reload, history, wave pause, orbit, sources,
WebGL fallback, unavailable storage and authentication.
