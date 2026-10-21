---
name: "TattvaGyaan"
description: "A temple-inspired Hindi scripture and devotional reading sanctuary."
colors:
  canvas: "#191715"
  temple-stone: "#1d1a17"
  surface: "#24201b"
  raised-surface: "#302820"
  ink: "#f5ead8"
  muted-ink: "#d5c7b3"
  gold: "#e9bc77"
  gold-line: "#594a37"
  control-line: "#958064"
  vermilion: "#a73826"
  auth-red: "#c13321"
  auth-charcoal: "#28201e"
  auth-cream: "#fff4df"
  auth-gold: "#ffd18b"
typography:
  display:
    fontFamily: "'Tattva Cormorant', Georgia, serif"
    fontSize: "clamp(48px, 4.6vw, 72px)"
    fontWeight: 500
    lineHeight: 1.03
    letterSpacing: "0"
  dashboard-headline:
    fontFamily: "'Tattva Cormorant', Georgia, serif"
    fontSize: "38px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "0"
  dashboard-title:
    fontFamily: "'Tattva Cormorant', Georgia, serif"
    fontSize: "29px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "0"
  headline:
    fontFamily: "'Tattva Cormorant', 'Sacred Hind', Georgia, serif"
    fontSize: "clamp(36px, 4vw, 48px)"
    fontWeight: 500
    lineHeight: 1.16
  title:
    fontFamily: "'Tattva Cormorant', 'Sacred Hind', Georgia, serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "'Sacred Hind', 'Nirmala UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "'Sacred Hind', 'Nirmala UI', sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
  prayer:
    fontFamily: "'Noto Serif Devanagari', 'Nirmala UI', serif"
    fontSize: "22px"
    lineHeight: 1.95
  scripture:
    fontFamily: "'Noto Sans Devanagari', 'Siddham', 'Tiro Devanagari Sanskrit', serif"
    fontSize: "18px"
    lineHeight: 1.9
rounded:
  control: "5px"
  search: "6px"
  devotional-control: "7px"
  panel-small: "8px"
  panel: "12px"
  pill: "9999px"
spacing:
  icon-gap: "8px"
  inline-gap: "12px"
  control-gap: "16px"
  grid-gap: "20px"
  mobile-panel: "24px"
  form-panel: "28px"
  collection-header: "40px 24px; mobile 24px 0"
components:
  auth-submit:
    backgroundColor: "{colors.auth-red}"
    textColor: "{colors.auth-cream}"
    rounded: "4px"
    height: "54px"
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    padding: "10px 0"
    height: "49px"
  button-primary-hover:
    backgroundColor: "{colors.gold}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "48px"
  button-hero:
    backgroundColor: "{colors.gold}"
    textColor: "#302116"
    rounded: "{rounded.control}"
    padding: "14px 22px"
    height: "50px"
  button-hero-hover:
    backgroundColor: "#f6d69f"
  card-dashboard:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  input:
    backgroundColor: "{colors.temple-stone}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "48px"
  navigation:
    backgroundColor: "#1b1714"
    textColor: "{colors.ink}"
    height: "96px; 78px on mobile"
  chip-complete:
    backgroundColor: "{colors.raised-surface}"
    textColor: "{colors.gold}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  card-devotional:
    backgroundColor: "#292019"
    rounded: "14px"
    padding: "0; body 23px 25px 18px"
  reader-language-selected:
    backgroundColor: "#f2b952"
    textColor: "#1f392e"
    rounded: "{rounded.search}"
    padding: "9px 14px"
---

# Design System: TattvaGyaan

## Overview

**Creative North Star: "The Temple Reading Sanctuary"**

Warm charcoal and temple-stone surfaces frame cream text, gold accents and the supplied devotional artwork. Cormorant gives headings a quiet literary character; Hind keeps Hindi and interface controls approachable. Collection introductions center the title, Hindi subtitle, and description without header images. Descriptions are capped at 65ch; individual prayer cards retain their illustrations.

The dashboard, collections, calendar and personal workspaces share one palette. Account pages retain their full-frame artwork and warm translucent controls. The book reader retains its calibrated typography and user-selected paper themes.

The shared implementation is `frontend/src/site-theme.css`, layered after `sacred-theme.css`. Account and dashboard styles load afterward. Journey styles use the same semantic tokens. Older palette literals are superseded by this layer; new application surfaces should use the shared roles.

## Colors

- **Canvas / temple stone:** dark warm backgrounds for pages, navigation and footer.
- **Surface / raised surface:** brown layers for cards, prayer text, forms and menus.
- **Ink / muted ink:** cream titles and softer cream supporting text.
- **Gold:** primary actions, current tabs, links, selected dates and keyboard focus.
- **Gold line / control line:** quiet separators and higher-contrast interactive borders.
- **Vermilion:** account actions and warm emphasis; error states use coral text on dark red.

Status labels and icons retain their meaning without relying on green. Availability badges use gold or muted cream on brown. Inputs, placeholders and body copy must meet 4.5:1 contrast; large display text must meet 3:1.

Reader themes remain scoped. The sacred layer changes light-reader background/paper/accent to `#eaddc1` / `#fffbea` / `#923821` and sepia accent to `#8c3824`. Other sepia values remain `#f4ecd8` background, `#fbf0d9` paper, `#432818` text and `#e0d0b1` border. Dark mode retains `#121316` background, `#1c1e24` paper, `#e2e8f0` text, `#2d3139` border and `#f59e0b` accent. Reader selection highlights, scan filters and book material effects remain controlled by the reader, not the application palette.

## Typography

Account headings use the self-hosted Cormorant Garamond Medium face at 44px
(43px on phones), with Hind for labels and controls. This entrance treatment follows the user's red, gold and charcoal devotional entrance direction.

**Display Font:** self-hosted Cormorant Garamond Medium, registered as Tattva Cormorant, with Hind for Hindi and Georgia fallback. **Body Font:** self-hosted Hind Regular and Medium, registered as Sacred Hind, with Nirmala UI fallback. Font files and licenses are recorded in the landing asset README.

Cormorant supplies English headings; Hind supports the practical interface and Hindi card titles. The supplied Hind Medium file is registered for weights 500?900; this is one medium font file, not a set of distinct bold masters. Do not infer additional font assets from utility weights.

### Hierarchy

- **Display:** the frontmatter display role is the desktop dashboard heading. At 700px and below it becomes `clamp(42px, 11vw, 56px)`. Dashboard headings use sentence case and zero letter spacing.
- **Dashboard headline / title:** section headings use the dashboard-headline role, reducing to 32px on mobile. Prayer cards use Cormorant at 28px (27px on mobile), weight 500, and 1.16 line height.
- **Headline:** collection introductions use Cormorant at `clamp(42px, 4.5vw, 58px)`, 42px on mobile, with 1.05 line height. Personal pages use 36px titles, reduced to 28px on mobile. Authentication titles retain their existing sizing.
- **Title:** devotional, scripture, reading-plan and dashboard prayer cards use Cormorant at 28px with Hind fallback. Cream title text (`#fff0d8`) leads; 19px Hindi labels use warm `#dfbd88`. Metadata uses 13px `#d1bfa7` and reading links use 15px gold.
- **Body:** collection descriptions use 16px and 1.75 line height; dashboard and supporting prose vary from 14?17px with 1.8?1.9 line height. This is a role-based hierarchy, not a single mathematical type scale.
- **Label:** form labels and navigation are approximately 15px. Card footers and metadata use 12?14px. Calendar figures and profile statistics use tabular numerals.
- **Prayer:** Hindi prayer text retains Noto Serif Devanagari / Nirmala UI / serif, starting at 22px with 1.95 line height and user adjustment from 18?34px.
- **Scripture:** Indic book text retains Noto Sans Devanagari / Siddham / Tiro Devanagari Sanskrit / serif, starting at 18px with 1.9 line height and user adjustment from 14?28px. Arabic support retains Amiri / Traditional Arabic / Scheherazade New / serif and RTL direction.

**The Reading Type Rule.** Preserve the reader font stacks, user size controls, line heights and pagination measurements independently of interface typography.

Explicit Nirmala UI styling remains on the dashboard hero Hindi line and some inherited landing labels. The dashboard brand retains Cinzel; its content headings deliberately use Cormorant. Inherited Georgia reader contents and utility serif badges do not change either route's display system.

## Shared application theme (21 October 2026)

The dashboard palette now applies to Library, Chalisas, Bhajans, Mantras,
Calendar, scripture details, reading plans, profile, and Journey controls.
`frontend/src/site-theme.css` owns the shared semantic roles and loads after
`sacred-theme.css`, before the account and dashboard overrides. The
`.workspace-route` class scopes legacy utility remapping away from scripture
readers and the immersive Journey. `journeys.css` and `journey-game.css` use
the same tokens; their photographic and 3D scenes retain their original colors.

Use Cormorant for English display headings and Hind for Hindi and controls.
Gold identifies links, selected tabs, keyboard focus and primary actions.
Error surfaces use warm red with light coral text. Preserve explicit status
labels and icons. Reader light, sepia and dark paper modes remain independent.
Never apply workspace color remapping to the reader's calibrated pages.

## Layout

The dashboard hero preserves the supplied image's full 1408:768 composition.
Desktop copy sits left of the central sculpture, with localized warm shading.
At 1000px and below, text sits below the complete image. Never blur or crop this
asset to fill the viewport; the surrounding charcoal surface accommodates
different screen proportions.

The signed-in `SiteHeader` is a single row shared by the dashboard and content pages. Its inner width is 90%, capped at 1600px, with 96px minimum height (78px on mobile). Collections remain centered within 1280px, with 32px desktop gutters and 38px top spacing. Their introductions pair copy and a complete 3:2 image in a 1.35fr / 1fr grid with 48px gap, stacking below 700px. The three-column card grid becomes two columns at 800px and one at 560px; mobile gutters are 18px.

Dashboard content sections and Panchang share `min(88%, 1240px)`. The hero copy keeps its separate 90% width (88% below 520px), with no maximum-width cap; the shared header caps at 1600px. Ganesha copy and complete illustration form a .85fr / 1.15fr grid with a 48px gap. Prayer cards use three equal columns and 24px gaps. At 1000px the journey becomes equal columns with a 28px gap; at 700px journey, prayer cards and the scripture section stack. The Ganesha illustration precedes its copy on mobile. Main section vertical padding ranges from 52–64px on desktop and 36–40px on mobile.

Account pages use full-width, uncropped artwork behind a transparent form and an overlaid header. Localized warm shading supplies contrast without blurring the image. The form caps at 440px with 32px padding; at 1000px and below the full artwork stacks above a centered form capped at 500px. Mobile form padding is 32px 26px 40px. Registration pairs fields on desktop only.

Signed-in navigation collapses into an expandable two-column menu at 1200px. Search is available from an icon on content pages and opens a labeled, focused search field; Escape dismisses it and restores focus. Mobile account actions move into the navigation menu. Calendar content stacks at 1000px. The account and book-reader headers retain their specialized layouts.

Spacing follows recurring 8, 12, 16, 20, 24 and 28px gaps rather than an enforced global scale. Larger header and page spacing are explicitly component-specific.

## Elevation & Depth

Most surfaces use fine warm borders and tonal layers. Interactive devotional, scripture, dashboard prayer and reading-plan cards lift by 4px on fine pointers with brighter borders and warmer fill. The book reader retains layered paper edges, spine gradients, a wooden stand, beads and a ribbon.

### Shadow Vocabulary

- **Form ambient:** `0 14px 36px -25px #38251266`.
- **Interactive card hover:** no shadow; `#35271c` fill and `#d9b376` border. The reading arrow gains a gold background; imagery stays still and sharp.
- **Dashboard mobile menu:** `0 18px 36px #0d160d40` inherited from the landing component.

**The Material Depth Rule.** Use fine borders and tonal contrast for ordinary panels; reserve dimensional paper, binding and stand effects for the book reader.

Collection and library pages appear without entrance motion. Card transform transitions take 280ms with `cubic-bezier(.16, 1, .3, 1)`; border, background and title colors transition over 220ms. Hover also moves reading arrows 4px. Reduced-motion preference removes transforms, transitions and smooth scrolling. Reader page-turn timing and geometry remain independent.

## Shapes

Containers, form cards and collection banners use soft 12px corners; search surfaces use 6?8px corners; primary account and dashboard actions use 5px corners. Devotional actions retain 7px corners, and language tabs use 6px corners. Availability badges are pills. Brand medallions are circular. Lotus ornaments are original geometric SVGs clipped into peripheral corners, never substitutes for interaction icons.

Gold borders are usually 1px; the active desktop navigation link has a 1px underline. Book pages retain their asymmetric corners and inset double border.

## Components

### Buttons

Account primary actions use auth red, cream text, a 54px minimum height and 4px corners. Hover deepens the red; disabled actions use opaque muted brown. Secondary account actions are underlined gold links. Dashboard hero actions use saffron, dark text, 50px minimum height and 14px by 22px padding; mobile padding becomes 12px by 18px. The sacred selector fixes the hero's background, so the earlier lower-specificity hover background in landing.css is not an effective theme variant.

Devotional actions use 8px by 14px padding, 44px minimum height and 7px corners. Primary actions use gold with dark text; hover lightens the gold to `#f4d29b`. General application focus uses a 3px gold outline and 4px offset; devotional page rules retain a 2px outline and 3px offset through greater specificity. Preserve both visible focus treatments when extending those components.

### Chips

Complete / Partial / Metadata Only badges communicate actual edition availability with text and icons, styled in gold and muted cream on brown surfaces. Complete badges use a check-circle SVG plus text, 12px type, 4px by 10px padding and pill corners. Theme tags remain small, quiet stone utility labels. These are informational, not clickable filter pills.

### Cards / Containers

Dashboard prayer cards use dark brown fill, fine translucent gold borders and 12px corners. Their full 3:2 artwork uses contain sizing, followed by 22px by 24px by 20px content padding and a separate collection-browse row. Prayer title hover warms the text; focus within outlines the card in gold. These cards preserve their full illustration and separate collection-browse link.

Devotional cards lead with full, uncropped artwork in a 3:2 frame. Each prayer slug selects its own photographic-style generated illustration from `frontend/src/data/devotional-artwork.json`; broad deity tags do not determine the image. The subject and generation prompt are recorded in `library/devotionals/artwork-plan.json`. These illustrations are not documentary photographs. Images load lazily at their original resolution. A fine inset gold frame connects the image to a warm `#292019` body, 14px corners, and 23px 25px 18px content padding (22px 22px 18px on mobile). The title, Hindi label and deity remain intact. A divider and circular gold arrow finish the reading action. The entire card remains one accessible link, with a gold focus outline and reduced-motion support.

Scripture cards pair a warm book-cover panel with dark brown content, 25px padding and 12px corners. Cover colors cycle vermilion, bronze and brown; fine gold frames and a low-opacity lotus establish their material. Availability, language and reading-time metadata remain readable. Account panels and workspace cards retain some Tailwind layout, border and spacing utilities under sacred overrides.

### Inputs / Fields

Authentication inputs have dark translucent fill, a gold border, 4px corners, 16px type and 54px minimum height (48px in registration). Focus shifts the border and adds a 2px gold outline offset by 2px; existing Tailwind focus ring utilities remain layered underneath. Labels are visible above fields. The collection search is a larger, 60px minimum-height composite with an 8px radius; the dark navbar search uses translucent fill, a gold border and a 2px gold focus-within outline. Error blocks retain the existing rose utility treatment, not the ceremonial red header treatment.

### Navigation

`SiteHeader` provides one consistent brand, six section links and account actions. The dashboard version overlays its supplied image; other signed-in pages use a warm charcoal background. The current section has gold text and a thin underline. Search, mobile menus, reading plans, profile and logout remain available. Mobile menus support Escape and restore focus; route navigation closes open panels.

### Prayer toolbar and book reader

The prayer toolbar is dark stone with cream labels and gold selected language buttons. The selected state uses `aria-pressed`, reinforced by color. Size, reading-mode and link controls use real SVG icons. Prayer copy uses cream text on a dark brown reading surface, with generous vertical spacing and preserved line breaks. Book reading retains light, sepia and dark choices, selectable passages, navigation, saved notes and its calibrated page-turn surface.

## Do's and Don'ts

### Do:
- **Do** use the supplied temple artwork and original lotus ornament with the source record in frontend/src/assets/landing/README.md.
- **Do** retain distinct display, interface, prayer and scripture type roles.
- **Do** keep metadata below titles and retain truthful availability labels.
- **Do** provide visible keyboard focus, readable selected states and the reduced-motion behavior already implemented.
- **Do** inspect the final CSS cascade before extending components that still carry Tailwind utilities.
- **Do** preserve the dashboard's complete Durga, Ganesha and prayer illustrations without blur, recompression or cover cropping.

### Don't:
- **Don't** apply interface fonts or a global color override to calibrated scripture pages.
- **Do** use the shared charcoal, cream, and gold palette on all application routes; keep scripture paper themes scoped to the reader.
- **Don't** reintroduce oversized all-capital dashboard headings, cropped Ganesha artwork or cream section slabs.
- **Don't** place decorative artwork behind sustained scripture text.
- **Don't** turn remaining ornamental glyphs or legacy eyebrow selectors into reusable navigation icons or heading patterns.

Not canonized: the shipped source still contains ornamental text glyphs, legacy eyebrow selectors, scattered explicit system-serif labels and redundant older palette/type rules. They are recorded as implementation drift, not patterns for new surfaces; this documentation pass does not change UI code or content. The prayer-detail metadata has already been moved below its title and is not an eyebrow pattern.
