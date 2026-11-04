# Design 5: a complete redesign, three directions (brief, 2026-11-02)

His words: a complete redesign of the website, "as if the previous site doesn't even exist". Built as
three short home-page directions he scores; the full site is then built from his pick.

## What he decided (in answers, 2026-11-02)

- The site holds: **photo portfolio, travel guides, trips (journey)**. No About page.
- 3D: **a 3D object is the stage**: one striking centrepiece the site is built around.
- Look: **totally free** (colours, fonts, dark or light), but checked with the Taste / anti-slop skills.
- Motion: **between calm and dramatic**: one or two big moments, everything else quiet.
- References: none; we choose.

## Who he is

Thomas Chen (陳亮元), a landscape photographer from Taiwan: nature and cities on the road, 21
countries. Instagram `tuan_1127`. His photographs are the reason anyone comes. Past lessons: he
called a busy dark cinematic redesign "AI slop" and "overwhelming": stat counters, dark ground with
one neon accent and mono data labels, gadgetry (viewfinder marks, REC, coordinates ticking), scroll
hijacked for many screens. "Stunning" never meant "busy". He also dislikes text written across a
photograph.

## The three directions

| Folder | Centrepiece | Look |
|---|---|---|
| `relief/` | real mountains he shot as matte plaster sculptures from real elevation data, on a table, light moving across like a day | light |
| ~~`glass/`~~ | dropped 2026-11-04 at his word ("I don't like this version"); code at tag `glass-block-dropped-2026-11-04` | |
| `orrery/` | a brass-and-paper instrument, the earth at its centre, his trips as rings around it; turning it moves through time | warm paper |

Each is ONE home page (`<folder>/index.html` plus its own css/js), showing the centrepiece, its one or
two big moments, and how a visitor reaches Portfolio, Guides and Trips (each with a short real
preview using his data). It does not need the inner pages.

## Shared rules for all three

- Plain HTML/CSS/JS, ES modules. three.js r186 is at `../../journey/vendor/three/three.module.js`
  (importmap `"three"`); addons available: `../../journey/vendor/three/lines/`. d3 and topojson-client
  and Natural Earth (`countries-50m.json`, `countries-110m.json`) are in `../../journey/vendor/`.
  No npm, no bundler, no CDN scripts.
- Data: `<script src="../../journey/data.js">` gives `window.SITE`: `countries` (id, ll [lat,lng],
  name/note/date in en+zh, photos), `slides` (photo id → file, w, h, ll, place, where, alt, best,
  note, camera data, taken, city), `books` (guides; `guide` set when a guide exists, e.g. barcelona),
  `guides`, `journeys` (trips with dates, countries, legs with lat/lng), `instagram`.
  Photos: `../../images/web/640/<file>`, `../../images/web/1280/<file>`, full `../../images/web/<file>`.
- Fonts: anything that fits except Inter, Roboto, Space Grotesk, Fraunces, Instrument Serif and
  system fonts. Local ones exist via `../../css/fonts.css` (Geist, Playfair Display, Bebas Neue,
  Noto Sans TC, Noto Serif TC). A Google Fonts stylesheet link is fine for these prototypes. 中文
  needs a CJK face (Noto Sans TC / Noto Serif TC).
- Every visible string in **English and 繁體中文** with a language switch (words, not a flag).
- Nothing written on a photograph. Controls are words or very plain marks, not icon soup.
- No em dashes or en dashes anywhere visible. At most one middle dot per line.
- Anti-slop (read `~/.claude/skills/design-taste-frontend/SKILL.md` sections 4, 9, 14): no eyebrows
  over every section, no section numbers, no scroll cue, no counters, no fake precision, no glows,
  no AI-purple, no three-equal-card rows, one accent colour, one corner system.
- Native scroll stays native (no wheel hijack); `prefers-reduced-motion` gets a still, readable page;
  works at phone width (390 px) with its own composition; a no-WebGL fallback that still shows the
  photographs.
- Add his Notes box before `</body>`:
  `<link rel="stylesheet" href="../../journey/new/review.css">` in head and
  `<script src="../../journey/new/review.js" data-name="design5" data-id="<folder>" data-back=""></script>`.
  It reads CSS variables `--f-text --ink --ink-2 --ink-3 --hair --link --paper --paper-2 --route`;
  define them in your page's `:root` (or on `html .rv`) so it matches your page.
- Served at `http://localhost:8642/next/<folder>/` (already running; `design 1/next` links to
  `design 5`). Paths above are relative to `design 5/<folder>/index.html`.
- Leave a short `<folder>/NOTES.md`: the idea, its one or two big moments, files, what is unfinished.
