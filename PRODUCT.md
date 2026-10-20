# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

TattvaGyaan is a Hindi scripture library with a book reader, passage explanations,
reading plans, and personal notes. Its signed-in devotional sections provide
Chalisas, Bhajans, Mantras, and a Hindu calendar.

## Capabilities and Constraints

The React/Vite frontend uses an Express/Prisma backend and six retained text
editions. Login and registration are public; the landing page at `/dashboard`,
book library at `/library`, devotional collections and personal features require
sign-in. Calendar coverage depends on imported dates with New Delhi timings in
IST. Preserve source text, IDs, draft labels, provenance, and reader behavior.

## Brand Commitments

The user requested a complete Hindu/Sanatan visual redesign with bold religious
colors and supplied the temple, river, Himalayan mountain and sage artwork.
Most routes use deep temple green, vermilion, saffron, cream paper, Cinzel
headings and Hind interface text. The dashboard uses continuous warm charcoal,
gold accents, sentence-case Cormorant headings and complete deity illustrations.
Book typesetting keeps its established fonts.
Source-provider branding is not displayed in the devotional UI as requested.

## Evidence on Hand

The library catalog and devotional snapshots contain the published content.
The background and font origins are recorded in `frontend/src/assets/landing/`.
No testimonials, usage statistics, or efficacy claims have been provided.
