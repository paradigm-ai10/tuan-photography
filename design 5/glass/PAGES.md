# Glass block: the full site (brief for each page, 2026-11-02)

He picked **Glass block** (`design 5/glass/`, the home page). Now the site's other pages, in the same
language. Read `design 5/BRIEF.md` (shared rules: data, three.js path, bilingual, anti-slop, no dashes,
reduced motion, phone, no WebGL fallback) and `design 5/glass/NOTES.md` (the home page's look).

## Shared kit, use it on every page

- `kit/kit.css`: tokens (warm off-black `--bg #121110`, `--ink`, `--ink-2`, `--ink-3`, `--hair`, one accent
  `--accent #9cc4b5` for links only), base type (Geist light headings, Noto Sans TC for 中文), the top
  bar, links (`.more a`), footer, the photo viewer, `.page-head`. Square corners everywhere.
- `kit/kit.js`: `import { Kit, esc } from '../kit/kit.js'` (from `glass/<page>/`, adjust the depth).
  `Kit({ here: 'portfolio'|'guides'|'trips', words: { en: {...}, zh: {...} }, render(k) {...} })` draws the
  top bar, footer and viewer, handles the 中文 / EN switch (render is called again on every switch) and
  gives `k.tr(key)`, `k.pick({en, zh})`, `k.img(file, 640|1280|'')`, `k.link('portfolio/')`,
  `k.open(ids, id, opener)`. Any element with `data-open="photoId"` (and `data-list="id id id"`) opens
  the viewer. Mark visible strings with `data-k="key"` and they are filled from `words`.
- A page's head: `<link rel="stylesheet" href="../../../css/fonts.css">`, `../kit/kit.css`, its own css,
  `../../../journey/new/review.css`; importmap `"three": "../../../journey/vendor/three/three.module.js"`
  (one level deeper for guides/barcelona/); `<script src="../../../journey/data.js">`; before `</body>` the
  Notes box `<script src="../../../journey/new/review.js" data-name="design5" data-id="glass-<page>" data-back=""></script>`.
- The home page's glass look (one ShaderMaterial for a pane: print with a clear rim, polished edge line,
  green edge faces; mirrored copy for the floor reflection; floor shader with a light pool) is in
  `glass.js` lines ~265-400: reuse its ideas or code by copying into the page's own js.
- Served at `http://localhost:8642/next/glass/<page>/`. Use your OWN browser tab (tabs_create) so you
  do not disturb other builders; the preview pane is hidden, so rAF may not run: render on demand to check.

## The pages

- **portfolio/**: every photograph, by country. One small glass block per country (its photographs as
  panes) standing in a row on the dark floor, with the country name beneath each block. Choosing a block
  (click or keyboard) makes its panes fan out in front of it, large enough to see; choosing a pane opens
  the viewer with that country's photographs. A plain list of countries (real links/buttons) mirrors the
  blocks for keyboard and screen readers, and is the whole page without WebGL. Order countries by the
  most recent trip first. 21 countries, 93 photographs; countries with no photographs are left out.
- **trips/**: his call: a quiet timeline with a route map. A dark map (Natural Earth from
  `../../../journey/vendor/countries-110m.json` with d3/topojson, drawn in 2D or as a flat plane, routes
  from `SITE.journeys[].legs` as thin accent lines from Taipei), and the trips in date order beside it;
  each trip shows its date, countries and its photographs as small glass panes (2D CSS panes with the
  glass rim are fine; 3D only if it earns it). The trip in view highlights its route on the map. Trips
  without photographs are short lines. Photographs belong to a trip by country plus `slides[].taken`.
- **guides/** and **guides/barcelona/**: the list page shows the guide(s) that exist (only Barcelona so
  far, `SITE.guides.barcelona`, `SITE.books` with `guide`) large, and the other countries quietly as
  "photographs first, guide later". The Barcelona page opens with its photographs as a small glass stack
  (a modest 3D moment, or CSS 3D), then reads easily: the guide's text from `SITE.guides.barcelona.html`
  (ready HTML in both languages via its `i18n`; inspect the object to see how the html and i18n fit),
  facts, photo spots with their photographs (click opens the viewer), best light, map links
  (`slides[].map`). Long-form reading comfort matters most: 65ch measure, generous line height.
