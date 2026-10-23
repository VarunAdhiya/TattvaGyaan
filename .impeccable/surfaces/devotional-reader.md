# Devotional reader

Mode: Read.

Scope: shared chalisa, bhajan, and mantra detail pages in `frontend/src/pages/DevotionalDetail.jsx`.

User-pinned direction: verses inside the supplied Hindu parchment scroll. Adapt the artwork to provide clear space for live source text, retain Ganesha and wooden rollers, and preserve the surrounding charcoal-and-gold navigation.

Implementation: `devotional-scroll.css` uses nine-slice decorative artwork; warm dark ink on light paper, proportional top and bottom decorations, and a separate dark reading toolbar. No new animations. Hindi/transliteration, font controls, reading mode, sharing, related links, and honest unavailable-lyrics states remain available. No database or source-text changes.

Verification: desktop 1440px and mobile 390px, original paragraph equality across all three categories, script switching, maximum font size without horizontal overflow, reading-mode toggle, and existing shared-theme contrast checks.
