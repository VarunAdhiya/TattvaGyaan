# Devotional card illustrations

These are original, AI-generated illustrations in a photographic style, created
with the built-in image-generation tool. They are not documentary photographs
of real temples, historic artifacts, ceremonies, or people.

Each filename matches one catalog slug. Images are selected by the prayer's
specific subject, not by the catalog's broad deity grouping. Every card receives
its own generated composition; images are not crops or recolors of one shared
deity picture. Original PNG output is retained without resizing or recompression.

The complete prompt and subject plan is in
`library/devotionals/artwork-plan.json`. The generated file index, dimensions,
and SHA-256 hashes are in `frontend/src/data/devotional-artwork.json`.

After adding an image, run `node scripts/sync-devotional-artwork.mjs` from
`frontend/`. Preserve the title, text, source attribution, and existing IDs of
the prayer. Do not assume a general deity tag identifies its precise subject.
