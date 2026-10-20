# Dashboard: warm charcoal devotional entrance

Mode: Operate. Reconciled with the built dashboard on 20 October 2026.

The page moves from the complete Durga temple hero through today's Panchang,
Ganesha's illustrated journey, three daily prayers, the scripture library and a
quiet closing invitation. Sentence-case Cormorant headings and Hind interface
copy sit on a continuous warm-charcoal ground with restrained gold accents.
The user rejected oversized all-capital headings, cream section slabs and the
cropped Ganesha treatment.

`frontend/src/dashboard-theme.css` scopes the variation to `.dashboard-route`.
Content sections and Panchang share `min(88%, 1240px)`; the hero copy and header
retain their separate inherited alignment. Other routes keep their styling.

The original 1408 x 768 Durga PNG is displayed without recompression, blur or
cover cropping. Desktop copy sits left of the central figure; at 1000px and
below it follows the complete image. Source and repository asset SHA-256:
`75f95dd7d345f024ba89fa320cf402bcc566e26e01e5b79d5b68533ee6a2c85b`.
The complete 1536 x 1024 Ganesha image is paired with journey copy and moves
above it at 700px. Prayer art retains its complete 3:2 composition.

Daily prayer cards pair catalog destinations and their matching deity:

- Hanuman Chalisa / Hanuman / `/chalisas/hanuman-chalisa`
- Achyutam Keshavam / Krishna / `/bhajans/achyutam-keshavam`
- Mahamrityunjay Mantra / Shiva / `/mantras/mahamrityunjay-mantra`

Each card retains a separate link to its complete collection. Preserve account
access, profile and reading-plan links, logout, calendar data, all collection
destinations and Journeys. Never invent calendar timings or source passages.

Reference evidence is in `../references/hinduaarti.md`. Rendered review captures
are `../review/dashboard-refined-1440.png`, `../review/dashboard-refined-390.png`
and `../review/dashboard-refined-1917.png`. The final review reported no visual
fixes; the changed JSX/CSS detector returned no findings and five landing
browser tests passed, including source metadata and image aspect-ratio checks.
