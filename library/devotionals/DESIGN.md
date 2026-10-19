# Devotional section design

## Reference and scope

Reference: [Hindu Aarti](https://www.hinduaarti.com/), especially its
[Chalisa collection](https://www.hinduaarti.com/chalisa) and
[calendar](https://www.hinduaarti.com/hindu-calendar).
The collection was captured and visually inspected on 19 October 2026.
The captured source used its dark theme; TattvaGyaan retains its existing light
cream, brown, and saffron identity. No source logos or deity artwork are copied.

## Observed patterns

- Separate top-level devotional categories and calendar navigation.
- Three-column desktop collection cards with English/Hindi titles and links
  to the complete prayer; compact stacked cards at narrow widths.
- A prominent collection heading, devotional symbol, and introductory copy.
- Hindi and Roman reading options, generous verse spacing, and clear attribution.
- Month navigation, day selection, festivals, and daily Panchang information.

Firecrawl reported Inter body text, Noto Sans Devanagari, a 48px collection
heading, and approximately 12px card corners. These are source observations,
not requirements to replace TattvaGyaan's established typography.

## Implementation tokens and behavior

`frontend/src/devotionals.css` scopes the new surfaces. Headings use the existing
serif direction; Hindi prayers use Noto Serif Devanagari/Nirmala UI. Ink is
`#432818`, primary controls `#92400e`, warm surfaces `#fffefa`, and borders
`#e8dfd1`. The content width is 1216px with 32px desktop and 16px mobile padding.

The library stays a separate route. Public devotional pages provide search,
deity filters, pagination, script switching, text size, and reading mode.
All five section links fit on mobile. Calendar dates have accessible labels;
small screens show date numbers and festival dots with full details below.
Keyboard focus and reduced-motion preferences are supported.

At the user's request, source names, attribution footers, and external source
links are hidden from the UI. Import snapshots and database provenance remain
intact. Entries without stored lyrics show an explicit unavailable state.

The 12ui CLI installation failed with `spawn EINVAL` on this Windows environment.
Validation therefore used the captured reference and actual Chrome screenshots,
including 390px mobile views, rather than a generated design artifact.
