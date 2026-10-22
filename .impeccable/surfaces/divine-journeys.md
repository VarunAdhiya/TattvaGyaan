# Divine Journeys

Mode: Experience, with short Read moments.

Primary target: `frontend/src/pages/DivineJourneys.jsx`
Related targets: `frontend/src/components/JourneyGame.jsx`, `frontend/src/journey-game.css`,
`frontend/src/lib/sacredWorld.js`, `frontend/src/lib/sacredTableaux.js`,
`frontend/src/data/divineJourneys.js`.

Extends the established temple-green, saffron, vermilion and cream identity,
using the existing self-hosted Sacred Cinzel and Hind fonts. The user requested
a religious, game-like journey inspired by a playable island portfolio.

An illustrated entrance leads to eight chapters for each of Ganesha, Krishna,
Shiva, Hanuman and Ram, and a winding island trail.
Each chapter contains an original short retelling, optional source disclosure,
a reflection, previous/next navigation and a revisitable map. Every chapter is
available immediately; visiting records progress without a collection gate.
Ganesha's completion celebrates continuing devotion; it does not invent a final death.
Krishna's selected path follows Mathura, Gokul, Vrindavan, Govardhan, the reunion
in Mathura, Sudama's visit to Dwarka, the Gita, and the farewell at Prabhasa.
Each chapter includes an original retelling and a linked Bhagavata/Gita source.
Its separate landscape uses a generated Vrindavan riverbank and broadleaf trees.
Both worlds preserve the travelling diya, golden trail, waves and open navigation.
Progress is scoped to both authenticated account and deity; switching deity remounts
the experience so saved chapters cannot leak into another journey.
Shiva's path begins with timeless presence and closes with Nataraja; Hanuman's
ends with continuing service; Ram's follows selected Ramayana episodes through
the Uttara Kanda departure tradition. Each has eight distinct new tableaux and
source-linked retellings. Shiva retains Kailash; Hanuman has a Kishkindha-inspired
forest skyline, and Ram has an imaginative Ayodhya–Sarayu riverfront.
The selector accommodates five deities at desktop and phone widths. All journeys
use the same open chapter navigation and deity/account-specific saved progress.

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
Islands are spaced at least 52 world units apart, with open water between stages.
Each tableau and terrace share the island's centre; alpha bounds centre the visible
artwork and limit its size to the terrace. A generated, distant Kailash range
replaces small cone-shaped peaks, and softly irregular coasts and subdued shore
foam reduce visual clutter. A visible golden trail connects the front edges of
the islands; a small diya travels along it and rests in view at each chapter.
The world map fits the expanded
archipelago to the viewport; its backdrop is omitted to keep chapter pins clear.
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
validated, and scoped to the authenticated user and deity; unavailable storage leaves
session exploration usable.

12ui was attempted but required external sign-in, so no approved comp was
available. Implementation uses the existing design authority and generated art.
Review evidence: `.impeccable/review/realism-*.png`. Validate desktop and mobile,
all chapters, free navigation, reload, history, wave pause, orbit, sources,
WebGL fallback, unavailable storage and authentication.

Krishna review evidence: `.impeccable/review/krishna-*.png` (desktop chapters,
mobile chapter and world map). Asset provenance: `frontend/public/journeys/krishna/prompts.json`.

Expanded journey evidence: `.impeccable/review/{shiva,hanuman,ram}-*.png` and
`five-deities-mobile.png`. Chapter and landscape prompts are preserved in
`frontend/public/journeys/expanded-prompts.json` and `expanded-scenic-prompts.json`.
Verify the 24 chapters, source panels, completion, all five progress saves,
small-phone deity selection, mobile maps, fallback navigation and account gate.
