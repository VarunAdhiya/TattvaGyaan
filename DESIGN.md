---
name: "TattvaGyaan"
description: "A temple-inspired Hindi scripture and devotional reading sanctuary."
colors:
  auth-red: "#c13321"
  auth-red-hover: "#982516"
  auth-charcoal: "#28201e"
  auth-cream: "#fff4df"
  auth-gold: "#ffd18b"
  temple-green: "#103f3a"
  vermilion: "#a53a26"
  vermilion-hover: "#7a251c"
  ceremonial-red: "#883426"
  saffron: "#f4b449"
  hero-saffron: "#f6b244"
  canvas: "#f4ebd8"
  paper: "#fffaf0"
  card-paper: "#fffcf1"
  form-paper: "#fffdf7"
  field-paper: "#fffcf4"
  ink: "#243c34"
  heading-ink: "#174638"
  muted-ink: "#68553e"
  gold-line: "#cfbb94"
  focus: "#d17219"
  button-text: "#fff4df"
  nav-paper: "#fff6e3"
  nav-text: "#45584c"
  nav-active: "#a43827"
  card-sage: "#f1f5e6"
  card-peach: "#fff0db"
  success-paper: "oklch(95% 0.052 163.051)"
  success-ink: "oklch(43.2% 0.095 166.913)"
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
    fontFamily: "'Sacred Cinzel', 'Sacred Hind', serif"
    fontSize: "clamp(30px, 3.5vw, 46px)"
    fontWeight: 500
    lineHeight: 1.16
  title:
    fontFamily: "'Sacred Cinzel', 'Sacred Hind', serif"
    fontSize: "23px"
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
  collection-header: "38px 42px"
components:
  auth-submit:
    backgroundColor: "{colors.auth-red}"
    textColor: "{colors.auth-cream}"
    rounded: "4px"
    height: "54px"
  button-primary:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.control}"
    padding: "10px 0"
    height: "49px"
  button-primary-hover:
    backgroundColor: "{colors.vermilion-hover}"
  button-secondary:
    backgroundColor: "#f3f6e9"
    textColor: "#174b3b"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "48px"
  button-hero:
    backgroundColor: "{colors.dashboard-gold}"
    textColor: "#302116"
    rounded: "{rounded.control}"
    padding: "14px 22px"
    height: "50px"
  button-hero-hover:
    backgroundColor: "#f6d69f"
  card-dashboard:
    backgroundColor: "{colors.dashboard-card}"
    rounded: "{rounded.panel}"
  input:
    backgroundColor: "{colors.field-paper}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "48px"
  navigation:
    backgroundColor: "{colors.nav-paper}"
    textColor: "{colors.nav-text}"
    height: "58px"
  chip-complete:
    backgroundColor: "{colors.success-paper}"
    textColor: "{colors.success-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  card-devotional:
    backgroundColor: "{colors.card-paper}"
    rounded: "{rounded.panel}"
    padding: "27px"
  reader-language-selected:
    backgroundColor: "#f2b952"
    textColor: "#1f392e"
    rounded: "{rounded.search}"
    padding: "9px 14px"
---

# Design System: TattvaGyaan

## Overview

**Creative North Star: "The Temple Reading Sanctuary"**

A saturated temple-green and vermilion interface frames warm paper, saffron accents, and the supplied temple, river, Himalayan mountain and sage artwork. Cinzel gives navigation and headings a ceremonial character; Hind keeps controls and bilingual interface copy approachable. Collection screens carry ornament at their edges while scripture remains on quiet, selectable paper.

This is the implemented October 2026 visual system. The dashboard has a distinct continuous warm-charcoal treatment, sentence-case Cormorant headings, Hind interface text and complete deity illustrations. Its restrained gold accents connect it to the other routes without changing their green, vermilion and paper palette. Reading has its own calibrated type and user-selected paper themes.

**Key Characteristics:**
- Bold temple green, vermilion and saffron against cream paper.
- Ceremonial display type paired with clear Hindi-capable interface text.
- Supplied artwork and peripheral lotus geometry; quiet reading surfaces.
- Fine borders, restrained hover lift and reduced-motion support.
- A route-scoped charcoal dashboard with sentence-case Cormorant and uncropped artwork.

The normative implementation is `frontend/src/sacred-theme.css`, layered over `landing.css`, `devotionals.css`, `index.css` and existing Tailwind utilities, with `frontend/src/dashboard-theme.css` defining the dashboard variation. Tokens above summarize reused implemented values; they are not a claim that every value is centralized in CSS custom properties. The six `--sacred-*` declarations are only a partial palette, and most theme rules currently use literals. The sidecar extends these tokens with motion, breakpoints and isolated component previews.

## Colors

Account routes override the green interface palette with auth charcoal, cream,
gold and red. Their header and form share the artwork through translucent warm
shading; inputs have dark translucent fills and gold outlines. The broader
library and reading palette remains unchanged.

The palette combines dark vegetal green, red temple pigment, lamp-like saffron and warm cream rather than a neutral application shell.

### Primary

- **Temple green:** navigation, scripture section backgrounds and the dark frame around account and reading tools.
- **Vermilion:** primary form and collection actions. The deeper hover color belongs to authentication buttons; devotional primary buttons retain their own deeper red hover.
- **Ceremonial red:** broad devotional collection headers, with pale text and a low-opacity lotus at the edge.

### Secondary

- **Saffron:** selection, highlights and warm emphasis; the hero action has its own slightly stronger saffron.
- **Gold line:** thin separators, card borders and field outlines.

### Tertiary

- **Card sage / card peach:** alternating devotional card surfaces, in a three-card sequence with card paper.
- **Success paper / success ink:** the retained Tailwind availability badge for complete editions. Partial and metadata-only badges remain their existing amber and stone utilities; these are semantic status exceptions, not the core brand palette.

### Neutral

- **Canvas:** the warm page ground.
- **Paper / card paper / form paper / field paper:** subtly distinct surfaces for tools, collections, forms and inputs.
- **Ink / heading ink / muted ink:** green-brown text hierarchy on light paper.
- **Navigation paper / navigation text / navigation active:** the light devotional navigation strip and its red selected state.

**The Quiet Paper Rule.** Keep sustained scripture and prayer reading on its own paper surface; place saturated color and ornament around the reading area.

Reader themes remain scoped. The sacred layer changes light-reader background/paper/accent to `#eaddc1` / `#fffbea` / `#923821` and sepia accent to `#8c3824`. Other sepia values remain `#f4ecd8` background, `#fbf0d9` paper, `#432818` text and `#e0d0b1` border. Dark mode retains `#121316` background, `#1c1e24` paper, `#e2e8f0` text, `#2d3139` border and `#f59e0b` accent. Reader selection highlights, scan filters and book material effects remain controlled by the reader, not the application palette.

## Typography

Account headings use the self-hosted Cormorant Garamond Medium face at 44px
(43px on phones), with Hind for labels and controls. This account-specific
exception follows the user's red, gold and charcoal devotional entrance direction.

**Display Font:** self-hosted Cinzel Medium, registered as Sacred Cinzel, with Georgia fallback. **Body Font:** self-hosted Hind Regular and Medium, registered as Sacred Hind, with Nirmala UI fallback. Font files and licenses are recorded in the landing asset README.

Cinzel's engraved capitals mark entry points and English collection titles; Hind supports the practical interface and Hindi card titles. The supplied Hind Medium file is registered for weights 500?900; this is one medium font file, not a set of distinct bold masters. Do not infer additional font assets from utility weights.

### Hierarchy

- **Display:** the frontmatter display role is the desktop dashboard heading. At 700px and below it becomes `clamp(42px, 11vw, 56px)`. Dashboard headings use sentence case and zero letter spacing.
- **Dashboard headline / title:** section headings use the dashboard-headline role, reducing to 32px on mobile; the Ganesha heading uses `clamp(32px, 3vw, 44px)` and 34px on mobile. Prayer-card titles use dashboard-title, 25px from 701–1000px and 30px at 700px and below.
- **Headline:** collection headers use the recorded headline role; mobile collection titles are 30px. Personal pages use 36px titles, reduced to 28px on mobile. Authentication titles are 32px, reduced to 28px.
- **Title:** devotional collection cards on other routes use the recorded title role. Their Hindi card labels use Hind at 21px; scripture titles use Hind at 24px. Dashboard card Hindi labels use Hind at 18px.
- **Body:** collection descriptions use 16px and 1.75 line height; dashboard and supporting prose vary from 14?17px with 1.8?1.9 line height. This is a role-based hierarchy, not a single mathematical type scale.
- **Label:** form labels and navigation are approximately 15px. Card footers and metadata use 12?14px. Calendar figures and profile statistics use tabular numerals.
- **Prayer:** Hindi prayer text retains Noto Serif Devanagari / Nirmala UI / serif, starting at 22px with 1.95 line height and user adjustment from 18?34px.
- **Scripture:** Indic book text retains Noto Sans Devanagari / Siddham / Tiro Devanagari Sanskrit / serif, starting at 18px with 1.9 line height and user adjustment from 14?28px. Arabic support retains Amiri / Traditional Arabic / Scheherazade New / serif and RTL direction.

**The Reading Type Rule.** Preserve the reader font stacks, user size controls, line heights and pagination measurements independently of interface typography.

Explicit Nirmala UI styling remains on the dashboard hero Hindi line and some inherited landing labels. The dashboard brand retains Cinzel; its content headings deliberately use Cormorant. Inherited Georgia reader contents and utility serif badges do not change either route's display system.

## Layout

The dashboard hero preserves the supplied image's full 1408:768 composition.
Desktop copy sits left of the central sculpture, with localized warm shading.
At 1000px and below, text sits below the complete image. Never blur or crop this
asset to fill the viewport; the surrounding charcoal surface accommodates
different screen proportions.

The application navbar is sticky, with a maximum inner width of 1360px, 82px minimum height and 28px horizontal padding. Devotional content is centered within 1280px, with 32px desktop gutters and 38px top spacing. Its three-column collection grid uses a 20px gap, changes to two columns at 800px and one at 560px. The 700px sacred override sets collection gutters to 18px and top spacing to 24px; do not read the older base media queries in isolation.

Dashboard content sections and Panchang share `min(88%, 1240px)`. The hero copy keeps its separate 90% width (88% below 520px), with no maximum-width cap; the inherited 1600px header rule uses a 1440px measure. Ganesha copy and complete illustration form a .85fr / 1.15fr grid with a 48px gap. Prayer cards use three equal columns and 24px gaps. At 1000px the journey becomes equal columns with a 28px gap; at 700px journey, prayer cards and the scripture section stack. The Ganesha illustration precedes its copy on mobile. Main section vertical padding ranges from 52–64px on desktop and 36–40px on mobile.

Account pages use full-width, uncropped artwork behind a transparent form and an overlaid header. Localized warm shading supplies contrast without blurring the image. The form caps at 440px with 32px padding; at 1000px and below the full artwork stacks above a centered form capped at 500px. Mobile form padding is 32px 26px 40px. Registration pairs fields on desktop only.

The general account menu collapses at 700px; the dashboard menu collapses at 1100px. Mobile devotional navigation remains a six-column row with icon above label, 62px minimum height and 11px labels. Desktop nav search disappears at 900px. Calendar content stacks at 1000px. Book layout retains its own 599px, 639px and 1199px adjustments and measurement-driven page geometry.

Spacing follows recurring 8, 12, 16, 20, 24 and 28px gaps rather than an enforced global scale. Larger header and page spacing are explicitly component-specific.

## Elevation & Depth

Most surfaces use fine warm borders and tonal layers. Devotional cards lift by 4px without a shadow; scripture cards add a soft hover shadow. Forms have a restrained ambient shadow. The book reader intentionally uses layered paper edges, spine gradients, a wooden stand, beads and a ribbon; preserve that material treatment as a reader-specific exception.

### Shadow Vocabulary

- **Form ambient:** `0 14px 36px -25px #38251266`.
- **Scripture card hover:** `0 15px 28px -21px #2b261e88`.
- **Dashboard mobile menu:** `0 18px 36px #0d160d40` inherited from the landing component.

**The Material Depth Rule.** Use fine borders and tonal contrast for ordinary panels; reserve dimensional paper, binding and stand effects for the book reader.

Page arrival fades from .65 opacity while moving upward 10px over .55s with `cubic-bezier(.16, 1, .3, 1)`. Action color transitions take .2s; devotional card lift and border transitions take .25s. Reduced-motion preference disables application animation, transition and smooth scrolling. Reader page-turn timing and geometry remain its own subsystem.

## Shapes

Containers, form cards and collection banners use soft 12px corners; search surfaces use 6?8px corners; primary account and dashboard actions use 5px corners. Devotional actions retain 7px corners, and language tabs use 6px corners. Availability badges are pills. Brand medallions are circular. Lotus ornaments are original geometric SVGs clipped into peripheral corners, never substitutes for interaction icons.

Gold borders are usually 1px; the selected devotional navigation tab has a 3px bottom rule. Book pages retain their asymmetric corners and inset double border. The system has no blanket prohibition on gradients: photo shading and dimensional paper use them intentionally.

## Components

### Buttons

Account primary actions use auth red, cream text, a 54px minimum height and 4px corners. Hover deepens the red; disabled actions use opaque muted brown. Secondary account actions are underlined gold links. Dashboard hero actions use saffron, dark text, 50px minimum height and 14px by 22px padding; mobile padding becomes 12px by 18px. The sacred selector fixes the hero's background, so the earlier lower-specificity hover background in landing.css is not an effective theme variant.

Devotional actions use 8px by 14px padding, 44px minimum height and 7px corners. Their primary hover is `#7f281e`, distinct from account buttons. General application focus uses a 3px warm orange outline and 4px offset; devotional page rules retain a 2px outline and 3px offset through greater specificity. Preserve both visible focus treatments when extending those components.

### Chips

Complete / Partial / Metadata Only badges communicate actual edition availability and retain their emerald / amber / stone Tailwind colors. Complete badges use a check-circle SVG plus text, 12px type, 4px by 10px padding and pill corners. Theme tags remain small, quiet stone utility labels. These are informational, not clickable filter pills.

### Cards / Containers

Dashboard prayer cards use dark brown fill, fine translucent gold borders and 12px corners. Their full 3:2 artwork uses contain sizing, followed by 22px by 24px by 20px content padding and a separate collection-browse row. Prayer title hover warms the text; focus within outlines the card in gold. These cards do not inherit the collection cards' hover lift or cream surfaces.

Devotional cards use cream, sage or peach paper with a gold border, 27px padding and 238px minimum height. At 700px they use 25px padding and 215px minimum height. Titles lead; deity metadata sits below the title and Hindi label. The footer sits at the bottom behind a fine divider. Hover lifts the whole card; keyboard focus remains visible.

Scripture cards pair a saturated book-cover panel with cream content, 25px padding and 12px corners. Cover colors cycle red, green and brown; fine gold frames and a low-opacity lotus establish their material. Availability, language and reading-time metadata remain readable. Account panels and workspace cards retain some Tailwind layout, border and spacing utilities under sacred overrides.

### Inputs / Fields

Authentication inputs have warm near-white fill, a gold border, 5px corners, 16px type and 48px minimum height. Focus shifts the border and adds a 2px gold outline offset by 2px; existing Tailwind focus ring utilities remain layered underneath. Labels are visible above fields. The collection search is a larger, 60px minimum-height composite with an 8px radius; the dark navbar search uses translucent fill, a gold border and a 2px gold focus-within outline. Error blocks retain the existing rose utility treatment, not the ceremonial red header treatment.

### Navigation

A dark green sticky navbar holds the medallion brand, desktop search and account actions. Below it, a cream devotional strip uses green-gray labels, red active text and a red bottom rule. The active tab also has medium-heavy text and a corresponding icon color. Mobile menus are expandable and keyboard-dismissable; retain those behaviors and current route indicators. The dashboard has a separate image-overlay header, using the same brand and menu grammar.

### Prayer toolbar and book reader

The prayer toolbar is dark green with light labels and saffron selected language buttons. The selected state uses `aria-pressed`, reinforced by color. Size, reading-mode and link controls use real SVG icons. Prayer copy remains on cream paper with generous vertical spacing and preserved line breaks. Book reading retains light, sepia and dark choices, selectable passages, navigation, saved notes and its calibrated page-turn surface.

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
- **Don't** extend the dashboard's Cormorant and charcoal palette to other routes without a separate design decision.
- **Don't** reintroduce oversized all-capital dashboard headings, cropped Ganesha artwork or cream section slabs.
- **Don't** place decorative artwork behind sustained scripture text.
- **Don't** turn remaining ornamental glyphs or legacy eyebrow selectors into reusable navigation icons or heading patterns.

Not canonized: the shipped source still contains ornamental text glyphs, legacy eyebrow selectors, scattered explicit system-serif labels and redundant older palette/type rules. They are recorded as implementation drift, not patterns for new surfaces; this documentation pass does not change UI code or content. The prayer-detail metadata has already been moved below its title and is not an eyebrow pattern.
