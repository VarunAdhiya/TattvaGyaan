# Account entrance

Mode: Operate.

## Direction

Login and registration share complete devotional artwork with their controls.
The user's October 20 screenshot rejects solid cream header and form rectangles.
Use warm charcoal, gold and vermilion, with transparent form framing and feathered
shading for legibility. Preserve artwork detail: no crop, zoom, blur or recompression.

## Implementation

- `/login`: original 1408 × 768 temple image; `/register`: original Shiva image.
- The desktop header overlays the artwork; it is not sticky over the form.
- The form has no card background, border or shadow. Translucent fields, cream
  labels and gold focus indicators remain readable over localized dark shading.
- At 1000px and below, show the entire artwork above the form on a continuous
  charcoal surface. The mobile account menu retains its solid readable backing.
- Registration pairs name/username and password/confirmation on desktop only.
- Auth requests, validation, loading, errors and dashboard redirects are preserved.
- Styling lives in `frontend/src/auth.css`, scoped to `.auth-route`.

## Evidence

`auth-blend-{login,register}-{1440,390,1917}.png` in `.impeccable/review/`
records desktop, mobile and the user's desktop width. Both source asset hashes
match the supplied PNGs. Browser checks cover error recovery, registration
validation, redirects and guest navigation protection.
