# Signed-in home and sacred interface

Mode: Operate for navigation, collections and account tools; Read for scripture and prayers. The signed-in home at `/dashboard` introduces these activities.

## Direction contract

The user rejected the previous restrained design and public homepage. Replace its visual system across the application while retaining content and behavior. Guests see login/registration only; all content pages require sign-in. `/library` holds the existing six-book library. Use the supplied temple, Himalayan river, lamps and sage artwork as the dashboard background. The reference is https://www.hinduaarti.com/aartis for religious character and devotional navigation, not copied branding or editorial text.

- FORM: a temple-inspired reading sanctuary, with a photographic dashboard and split-image account welcome, followed by practical collection and reading surfaces.
- MATERIAL: saturated deep temple green, vermilion, saffron, cream paper, fine gold geometry. Self-host Cinzel display lettering and Hind interface text. Keep calibrated scripture typography and original texts intact.
- FIRST VIEWPORT: the supplied temple scene dominates the dashboard; clearly visible library and prayer actions lead into the signed-in collection. Login uses the temple scene beside an accessible form without exposing content navigation.
- INTERACTION: responsive account navigation, keyboard-dismissable mobile menus, real searches and category filters, preserved reader themes/pagination/notes/AI controls, restrained page arrival and hover motion, reduced-motion support.
- TRUTH: preserve all passages, translations, source records, draft labels, IDs and database behavior. Calendar data is the imported New Delhi/IST source with explicit unavailable states. No invented efficacy claims or statistics.

## Quality bar and evidence

Code-led implementation: 12ui was attempted but needs external authentication, so no approved/generated comp exists. The supplied image and user's latest screenshot/request are the visual authorities. The prior public-home screenshot review is obsolete.

Validate 1440px desktop and 390px mobile across login, registration, dashboard, library, devotional collection/reader, calendar, profile, plans, scripture detail and book reader. Also check dashboard at 850px tablet and the user's 1902px viewport. Keep text contrast, mobile wrapping and all primary actions readable; the actual scripture is on quiet paper. Final evidence is `.impeccable/review/<surface>-<width>.png` and matching `-viewport.png` files. Use the 53-test browser suite for regression coverage.
