# tuan photography 陳亮元 — project instructions

Personal travel-photography site for Thomas Chen (陳亮元). Plain HTML/CSS/JS, no framework.
Bilingual EN / 繁體中文. Owner is not a developer — explain in plain English, handle all tech.

## Design 3 was dropped (his call, 2026-10-28)

Design 3 ("One day of light", the dark one-camera site on 8650, built 2026-10-19) was removed at his
word: "drop 8650 entirely". The whole folder, `tools/build3.py` and its server entry are gone; the code
is at the tag `design3-dropped-2026-10-28` (earlier home versions at `home-film-2026-10-19`,
`counting-openings-ten-2026-10-19`, `counting-openings-three-2026-10-19`). Do not propose it again.
Design 1 on 8642 is the site, and the rules below are in force.

## Designs 4 and 5 were dropped (his call, 2026-11-05)

Design 4 ("Where they were taken", the three.js atlas on `/world/`, built 2026-11-02) and design 5 (the
whole new site, three directions on `/next/`: Relief, Glass block, Orrery) were removed at his word:
"這個不做了 關掉" and "這個也不做了 刪掉". The folders `design 4/`, `design 5/` and the links
`design 1/world`, `design 1/next` are gone; the code is at the tags `design4-dropped-2026-11-05` and
`design5-dropped-2026-11-05` (earlier: `before-design4-2026-11-02`, `before-design5-2026-11-02`,
`glass-block-dropped-2026-11-04`). Do not propose them again.

## The home page: only the way in was chosen (his call, 2026-11-12)

From the home redesign rounds (2026-11-05 to 2026-11-12) he chose the **opening** only, number 9 of the last round:
his logo on black, a wall of his photographs sliding in while the view closes on the middle one, which is the short
film of Barcelona. His words: "what I'm actually deciding is the landing page version, transitioning from the
photography one to the actual homepage. The homepage hasn't been designed yet, so keep it as the old one. Only keep
the videos from the very start through the Barcelona set." So the home page is the old one (2026-10-16) with the
opening in front, the film on its first screen and the opening photograph (Aoraki) as the second. **The page under the film has not
been redesigned and none of the redesign rounds' page bodies is approved**: never replace it because an opening was
picked. Files: `home_opening()`, `home_film()` and `build_home()` in `tools/build.py`, `design 1/css/opening.css`,
`design 1/js/opening.js`, `design 1/media/`; once per visit, `?opening` plays it again. Tags:
`before-home-redesign-live-2026-11-12` (the page before), `home-redesign-whole-page-live-2026-11-12` (the whole
redesigned page, live for a few hours by Claude's mistake). The trial versions and his review list stay in
`design 2/new/home-redesign/` and do not feed the site. The black ground is the opening's alone. `DESIGN.md` → Home
opening has the details.

## The brief (owner-decided — these win over any generic guidance)

- **Who he is:** a landscape photographer (旅途中的風景 — nature and cities). Not a travel
  blogger, not a studio for hire. The photograph is the entrance; the guide is what it leads to.
- **Look:** "The Printed Travel Journal" — a travel journal set like a printed magazine, on
  warm paper. He chose this on 2026-09-28 after comparing it with the earlier site, naming
  Along Dusty Roads and The Common Wanderer as the bar for craft.
- **Restraint:** clean, minimal, generous white space. Photos talk; text stays quiet.
  When in doubt, remove an element rather than add one. His biggest fear is the design
  upstaging the photographs.
- **Nothing is written across the opening photograph.** No headline, sentence or button on it.
- **Titles:** plain place names ("Barcelona", not "Barcelona for Photographers: Four Days of…").
  Descriptive detail belongs in the small line under it.
- **References are sources of qualities, never templates.** He rejected an earlier look for
  copying wilhelmchang.com. The site keeps its own identity.
- **Contact: Instagram `tuan_1127`, and his email on About only** (thomaslychen@gmail.com,
  his call 2026-10-15, reversing "no email" of 2026-09-28; the build writes it as character
  codes). The About biography stays as written (his call, 2026-09-28).
- **Every tab has one job**, set in `PRODUCT.md` → "Tabs 定位" (his call, 2026-10-15). Check a
  design for a tab against it. Journey is about time (his trips), Guides about place (what to do there).

## Design system — `DESIGN.md` and `PRODUCT.md`

The design is recorded in two files at the root. **Read them before any visual change.**

| File | What it holds |
|---|---|
| `DESIGN.md` | colours, type, layout, motion, every component, the do's and don'ts |
| `PRODUCT.md` | who the site is for, what it promises, what evidence exists |

Where `DESIGN.md` and `design 1/css/style.css` disagree, the stylesheet is right and `DESIGN.md` needs
updating in the same commit. The short version:

| Thing | Rule |
|---|---|
| Ground | warm paper and a stone band alternate by section. **Light only**, no dark theme, except the Gallery page's own Dark word (his call, 2026-10-07) and the home page's opening, which plays on black (his call, 2026-11-12) |
| Colour | eleven tokens in `design 1/css/style.css` `:root`. Never hard-code a colour |
| Earth colours | clay, olive, slate: whole flat blocks only (the three doors, the footer) |
| Links | deep clay is the only colour that means "this can be followed" |
| Names and headings | Playfair Display, weight 400, centred (中文: Noto Serif TC, 500). His logo alone is Cormorant Garamond, on the home loading screen (2026-11-05) |
| Reading text | Geist (中文: Noto Sans TC) |
| Labels, menu, buttons | Geist in small spaced capitals. No mono face |
| Corners | square, everywhere, except the Guides cards on the home page (rounded, with a soft shadow; his call, 2026-10-13) |
| Controls | words, never icons or arrows, except the two round arrows of the Guides cards (2026-10-13) |
| Photographs | bare, untrimmed in rows, names beneath and never on top. The continent squares are trimmed to even openings (his call, 2026-09-30). The Gallery page is the photo wall: every photograph as a small drifting print, the title and four bars floating over faint prints (his call, 2026-10-07) |
| Punctuation | no long dashes; at most one middle dot in a line; 中文 uses full-width marks |

### Rules

- **Build from the components in `DESIGN.md`.** A new page should introduce almost no new CSS.
- **Never use inline `style="…"` to style anything.** Inline styling is how a page silently
  drifts away from the stylesheet and stops responding to design changes. The build writes two
  values this way and only these: `--ar` (a photograph's shape, for the rows) and `--i` (the
  order things arrive in). They carry a number to the stylesheet; they are not styling.
- If something genuinely new is needed, add it to `design 1/css/style.css` as a **reusable class**, and
  record it in `DESIGN.md` in the same commit.

## Folder layout — his things, the website, what it is built from

Arranged on 2026-09-28 at his request, so the top level reads at a glance. Keep it this way:
**nothing new at the top level without a reason he would recognise.**

| At the top level | Whose | What it is |
|---|---|---|
| `start.command`, `photo-list.command`, `建置進度.command` | his | double-click launchers |
| `originals/`, `ideas/`, `IDEAS.md`, `TODO.md`, `我的筆記.txt`, `experiments/` | his | his photos, his ideas, his to-do list, his own notes, trials |
| `design 1/` | visitors' | **the current website (was `site/`) and nothing else.** Served on 8642 |
| `design 2/` | visitors' | **the complete redesign**, built beside it. Since 2026-10-13 it is the site's Journey page: `design 1/journey` is a link to this folder, so it is served on 8642 at `/journey/` and has no server of its own |
| `data/`, `content/`, `tools/` | Claude's | what the pages are built from, and the scripts |
| `elements/` | visitors' (tests) | **single elements tried on their own**, apart from both designs, to be merged later if kept (his plan, 2026-10-07). Served on 8647 (`elements` in launch.json). Links to design 1's photos, fonts and css and to design 2's `data.js`, so nothing is copied. The first, `gallery/` (the photo wall), was merged into design 1's Gallery page on 2026-10-07 and the test copy removed the next day at his word; `design 1/js/wall.js` is the only copy. The second, `trip/` (the trip along its route), joined the Journey page on 2026-10-15 and the test copy was removed the same day at his word |
| `CLAUDE.md`, `DESIGN.md`, `PRODUCT.md`, `PROGRESS.md` | Claude's | notes. They stay at the top: tools look for them there |
| `index.html` | visitors' | **the front door on GitHub Pages only** (his call, 2026-10-25): it forwards the bare address https://paradigm-ai10.github.io/tuan-photography/ to `design 1/`. The local servers never serve it. The repo moved to the `paradigm-ai10` account; Pages is on and public from `main`, and the repo's About link points at design 1 |

- **Two designs, one set of facts** (his call, 2026-10-01). `site/` was renamed `design 1/`
  and a complete redesign is built in `design 2/`, kept beside it rather than as an experiment, so
  he can compare the two for as long as he likes and later choose which one is "the" site. Both
  are built from the same `data/`, `content/` and photographs: a new photo or a corrected name
  reaches both on the next build. If design 2 needs a new fact, add it to the shared files without
  breaking design 1. Design 2 keeps four rules of the brief, his choice: nothing written across the
  opening photograph, light only, Instagram as the only contact, English plus 中文. Everything
  else about its look starts fresh; `DESIGN.md` describes design 1 only. Both folders are hidden
  in Finder (Cmd+Shift+. shows them).
- **How design 2 is made** (set up 2026-10-01). `python3 tools/build2.py` reads the shared facts
  and writes `design 2/data.js` (`window.SITE`: countries, photographs, books, journeys, the guide as
  ready HTML, words in both languages) and `design 2/fonts.css`. Rerun it whenever `data/` or
  `content/` changes, as with `tools/build.py`. `design 2/images` and `design 2/fonts` are links
  to design 1's folders, so photographs and typefaces are never copied. Map shapes and libraries
  live in `design 2/vendor/` (d3, topojson-client, Natural Earth via world-atlas, country names,
  shaded relief; licences beside them); pages never contact a map or font server. Every country
  and photograph in `data/site.json` carries `ll` [lat, lng]: the place's public location,
  approximate, for the map. It is not the camera's GPS (the files carry none).
- **Design 2 is "Pen and wash"**, `design 2/wc-sketch/` (his choice, 2026-10-02, after four rounds
  of variants). Its own design system is `design 2/wc-sketch/DESIGN.md` (the root `DESIGN.md` is
  design 1). It passed the Impeccable finish review (ship). `localhost:8642/journey/` opens it
  (until 2026-10-29 `design 2/index.html` forwarded there; now it forwards to `new/journey.html`). The other 18 versions were removed on 2026-10-03 at his
  word; they are at the tag `design2-all-versions-2026-10-03`. `?opening` replays the opening.
  `start.command` starts the one server, 8642. Port 8645 was retired on 2026-10-13 at his word:
  `tools/check_site.py` judges "inside the site" by the address, not the resolved file, so pages
  reached through the `journey` link count as the site's own.
- **The Journey tab is `design 2/new/journey.html`** (his call, 2026-10-29: "close 8644 entirely,
  make this the new main"; the experiment `journey` was merged and closed). `design 2/index.html`
  forwards `localhost:8642/journey/` there. The page: the full flat map on arrival with every flight
  from Taiwan, and a country you click opens its latest trip; scrolling folds the map into a globe
  (one d3 projection blending Natural Earth into orthographic, plain JS, no GSAP) that turns to the
  trip being read; the trip's photograph fills the screen behind; the trips are read on a frosted
  panel where the one the globe shows stays clear and the others fade ("Fade"). Files: `journey.js`,
  `journey.css`, `kit.js`, `kit.css`, the scroll-craft engine (`scrollcraft.js`, `.css`, copied
  unedited; brief in `scrollcraft/`). `design 2/new/` (the review list, `index.html`) is the version-review kit (redesigned 2026-11-04 at his ask, now also the skill `version-review` on both sides): a still of each version with its score and notes (he chose small previews, reversing the words-only list of 2026-10-29), Compare two, and on every version page a slim bar (previous / next with , and ., 1 to 5, N notes, M mark a spot). The versions are listed in `review-manifest.json` (choose.js is gone); the kit is `review-kit/`, `review.js` is a shim to it; stills by `tools/review_thumbs.py`, his notes read with `tools/read_reviews.py`; every round the manifest's `ask` names the versions he should score now (a 請你挑 band at the top of the list, those cards framed until scored, "Your pick" on their bars; his rule 2026-11-05); localhost only; all of it saves to `ideas/reviews/journey.json`. A trip opens on
  `design 2/wc-sketch/trip/?trip=<id>&from=journey`, whose back word returns to that entry. The
  pen-and-wash Journey is still at `/journey/wc-sketch/` (before the merge: tag
  `before-journey-merge-2026-10-29`); the trial's other versions are at the tags
  `journey-looks-and-highlights-2026-10-29`, `journey-five-versions-2026-10-18`,
  `journey-versions-trimmed-2026-10-18`. A 3D globe trial (2026-10-29) sits beside it: first five versions (paper, relief, high, raised, roll; he scored raised 4, high 3, the rest 1, and they were removed at his word the same day, tag `globe3d-five-versions-2026-10-29`), then `globe-mix` (raised, arcs lower, high's globe size) with three right-panel step-ups; he kept only the one with the trips on one line, and made it the live `journey.html` the same day (`globe3d.js` with `data-globe="mix"`, `panel.js`, `panel.css` with `data-panel="line"`; the others at tag `journey-panels-three-2026-10-29`, the drawn-globe page before it at `before-globe-live-2026-10-29`). An Impeccable critique of it (2026-10-29) gave three variations; he kept "polish only" and it is now the live page (`vary.css`, `vary.js`, `data-vary="polish"`, globe `mixlow`; before it at tag `before-polish-live-2026-10-29`). Then a round from two artist sub-agents (2026-10-29; its `journey-chart`, `-cut`, `-motion` pages were dropped at his word, tag `journey-artists-a1-a3-2026-10-29`; their globe configs stay in globe3d.js) and `journey-craft` (scroll-craft and animate skills: `data-craft`, `craft.css`, `dockCraft()` in journey.js, a held 128svh stretch where the fold is the peak, home pulse, sliding panel; he liked the concept, not the look: "not very photography oriented", a blue map "pasted" on white), then `journey-photo` and `journey-print` (his photographs filling the countries; dropped 2026-10-30 at his word, "weird", tag `journey-photo-countries-2026-10-30`), then `journey-earth` (globe config `earth` and `earth.css`: a realistic earth painted from the relief and land shapes, clouds, atmosphere, sun glint, light running along the trip; the map fills the whole page and its edges fade into the paper so the page itself wraps up), and on 2026-10-30 `journey-paperwrap` (the live paper globe with the whole-page wrap) and `journey-ink`. He gave 5 stars to the live page, `journey-craft` and `journey-paperwrap`, which are the three kept, the live one marked Main; `journey-earth` and `journey-ink` were removed (tag `journey-earth-ink-2026-10-30`; their globe configs stay in globe3d.js), one module `globe3d.js` (three.js r186 in `design 2/vendor/three/`, MIT) that journey.js uses through `window.JourneyMap` in place of its SVG map; listed on the review page. On 2026-10-31, from the references he picked (Bellerby & Co's hand-painted globes and the gores they are pasted from), `journey-gores` was added fourth: globe config `gores` (paint `globe`: aged paper, watercolour washes, engraved waterlines and ocean names in both languages; the sheet in twelve strips, `goreSheet()` and `gorePlace()`, cut and then pasted round Taiwan; `pen`: the routes drawn in ink and each country washed as its line lands; before it at tag `before-journey-globemaker-2026-10-30`). The same day, at his ask for his photographs in the transition, three variations of it (`journey-gores-through`, `-prints`, `-backs`; globe configs of the same names, `CFG.photos`, `gores.css`): the trip's photograph under the map, seen through the cuts and opening out to the reading's background; a small print per trip down both sides of the desk; a photograph printed down each strip's back. He scored 4 to 6 three stars and found the strips "kinda strange"; he asked for a smoother change with "the feeling of galleries folding into the globe" and chose, from a researched shortlist (photoooooos' wall of prints gathering into a ball, Meridew, Codrops Image Unroll, tdi.photos, Orbi), `journey-gallery` (2026-10-31, globe config `gallery`, `tiles: [24, 12]`, `tileSheet()` and `tilePlace()`): the same painted globe and ink, the grand map whole on arrival, a thin paper line opening between square prints on the first scroll, then each print lifting off whole and laid on the ball, Taiwan's first, the gaps closing; its `setFold` takes the page's cubic ease back off so the fold keeps the scroll's even pace (before it at tag `before-journey-gallery-2026-10-31`). He liked it and made it the live `journey.html` the same day (`data-globe="gallery" data-craft`, with `craft.css` and `earth.css`; the paper-globe live page before it at tag `before-gallery-live-2026-10-31`). Then, at his ask for images in it, three variations of the live page (rows 8 to 10 on the review list; globe configs `gallery-backs`, `-edges`, `-ring`, `CFG.photos` `tileBacks`, `tileEdges`, `ring`): his photographs on the prints' backs (a six by six atlas, `uTilePhotos`), on both sides of the wall's top and bottom rows while they are in the air, and one print per trip hung in a ring round the closed globe that turns the trip being read to the bottom (`hung`, `placeRing()`). He scored the backs 4 and found the ring "odd"; he liked "the scattering prints of images" but they were hard to see, so `journey-gallery-scatter` (row 11, globe config `gallery-scatter`: `flip`, `tileLift`, `scatter`) tosses each print higher and a little aside and turns it over in the air, so a cloud of his photographs fills the screen mid-fold; at his word ("flip back too fast, make it persist at least till the globe is formed") they land photograph up, the globe forms as a ball of his photographs by 0.73 of the fold (`TILE_RATE` 2.2), and they turn back to the map from 0.82, Taiwan's first (`ub`; each turns about its across or up and down, `tileTurn`, so it lands the same shape). Then, at his ask ("what if the entire globe is always the pic prints"), `journey-gallery-photoball` (row 12, `stay`): they never turn back, each is pressed onto the ball still turned over (mirrored across its turn) so the globe stays a ball of his photographs while every trip is read, the routes at their true places over them, from 0.8 of the fold. He did not want it always photographs either ("可不可以找個平衡點"), so three balances (rows 20 to 22 of the review list, `uTileMode` 2 to 4; a print turning between photograph and map is lifted clear and pressed back down either way up): `journey-gallery-hold` (`hold`: the ball holds through the glide aside and turns back to the map once the first trip is read, `holdTurn()`, `uTurn`), `journey-gallery-some` (`keep: 0.25`: one print in four stays a photograph) and `journey-gallery-window` (`window: 40`: the front of the ball round the trip being read turns back to the map, photographs round its edge, `windowTo()`, `uWin`). Then, at his ask for the scatter to last longer and be grander ("想像地圖被拆成那些照片 隨風飄散 然後慢慢卷回地球的過程中再慢慢翻回地球的樣子"), `journey-gallery-wind` (23rd on the review list, globe config `gallery-wind`, `uTileMode` 5, `data-fold="long"`: the fold given 2.2 times the scroll in `dockCraft()` and a 230svh hold in `craft.css`): the prints are blown off the wall west first, tumble over and hang in a drifting cloud that rocks in the air (`uTime`, drawn on every frame while aloft), then are drawn back Taiwan's first in a spiral round the ball's axis, turning back to the map as they come; the shader alone flies them, so the routes and dots are put away while they are aloft. Then (2026-11-04), at his ask for an adjustment tab, something behind the white and several bold versions, the wind became five figures (16 to 20 on the review list, group "Prints in the air"; globe configs `gallery-wind`, `-murmur`, `-deck`, `-vortex`, `-tide` from `WIND`, `uWind.w`): a gust, a murmuration (a ribbon along a moving curve, banking and flashing), a deck (one pile, fanned in three rows, dealt back), a whirlwind (a turning column), a tide (turned over in place into a contact sheet that ripples, then rolls up). His landscapes show behind them (`CFG.backdrop`, `wind.css`). `adjust.js` is the Adjust tab, on localhost only: scroll length (`--fold-len`, read by `dockCraft()` and `craft.css`), when the prints start back, the wind, the rocking, the photographs' strength, saved per page to `ideas/reviews/journey-adjust.json`; read that file and bake his values into the defaults when he settles. MotionScore (the motion skill's local audit, `--no-upload`) gave the gust page S, 95/100. On 2026-11-05 he rejected all five ("forbid all of these designs", tag `journey-air-five-2026-11-05`; taken off the review list, pages and configs kept): do not propose scattering, flocking or flying prints again. He asked for 高級感 instead, read as few things moving, slowly, in order, nothing random: three versions (4 to 6 on the review list, group "High-end"; configs from `LUXE`, `glide` 0.07 for a heavier follow): `journey-luxe-unveil` (`unveil`: the one sheet folds into the globe off the trip's photograph beneath, its faded edges thinning away, the photograph under a paper veil, `--veil`), `journey-luxe-print` (`hang` on one tile: the map turns over once about its across to the Matterhorn reflection in a wide paper margin, holds, turns back, then folds) and `journey-luxe-hang` (`hang` on `[6, 3]`: eighteen prints, a diagonal turn to one photograph per trip, hold, turn back, fold). `uTileMode` 6 and `uHang` in globe3d.js; the whole wall stays framed until 0.66 of the fold. Then six high-end references from Awwwards on `journey-references.html` (Good / Not for me and notes, saved to `ideas/reviews/journey-references.json`); he left the choice to me ("你自己看你覺得哪幾個不錯 你就用那個概念來design", the flat-map-to-globe stage only), so three more, 7 to 9 on the list: `journey-luxe-clouds` (after Velaa: three banks of paper-white mist pass the eye while the sheet folds, `mist`, `.g3-over` and `.g3-mist` in `wind.css`), `journey-luxe-drift` (after Cartier: five of his photographs rise past at three depths, `drift`, `.g3-print`) and `journey-luxe-develop` (after Odyssée and Jon McCormack: the map a soft monochrome print whose colour comes up from Taiwan as it curves, `mono`, `vDev`). He scored unveil, hang and develop 4 and print, clouds and drift 1 (2026-11-05), so three mixes, 10 to 12 on the list (group "High-end, mixed"; before them, tag `before-luxe-mix-2026-11-05`): `journey-luxe-unveil-develop` (`unveil` with `mono`: the photograph beneath also comes up from grey, `--mono` and `.g3-under.is-mono` in `wind.css`), `journey-luxe-hang-develop` (`hang` with `mono`: the prints' photographs turn over grey and come up to colour while they hold, then the grey map colours from Taiwan as it folds; `vDev` follows the fold in `uTileMode` 6) and `journey-luxe-hang-whole` (`hang.whole`, `uWhole`: the eighteen prints turn to one photograph between them, the newest trip's, cut two to one; the globe then folds over that same photograph beneath, veiled as in unveil). On 2026-11-06 he liked none of the three (marked Not using on the list): the colour stays the same from start to finish, no grey or monochrome start ("一開始不用沒有顏色 從頭到尾顏色可以一樣"), so do not propose a print that develops from grey again. Then, at his word that the arrival map had lost its job ("that should show my footprint, where I've been", 2026-11-06; the first screen only, the fold left for later), ten footprint maps built beside it, group "Where I have been" at 4 to 13 on the list: `footprint-scratch` (foil scratched off), `-tinted` (engraved, hand-coloured), `-fromhome` (azimuthal from Taipei), `-only` (only his countries drawn), `-popup` (three.js card cut-outs), `-years` (a year ruler that plays once), `-names` (country names only), `-stamps` (entry stamps), `-pins` (pins and red thread), `-stitch` (cross-stitch sampler). He scored only, stamps, pins and stitch 3, scratch, tinted and popup 2, and fromhome, years and names 1; at his word the three scored 1 were removed (tag `footprint-ten-2026-11-06`), then, rescored, popup and stitch 1, so they went too (tag `footprint-seven-2026-11-06`): five remain (scratch, tinted, only, stamps, pins). His notes: he likes the style of the scratch and tinted maps; on only, a bigger count and the share of the world's countries he has been to; on stamps, the stamps but not on the countries, where they pile up. The manifest's `round` (`{"groups": ["footprint"]}`) makes the review list show this round only, numbered from 1, with everything else behind "Earlier rounds" (his rule 2026-11-06; point `round` at each new round). From those notes, round two (group `footprint-2`, the round now, 1 to 5 on the list): `footprint-scratch-passport` (stamps on a passport visa page beside the map), `-tinted-border` (stamps round the sheet's margin, hairlines to their countries), `-scratch-ledger` (stamps in a row by year along the foot, a 195-square tally), `-tinted-onestamp` (one stamp at a time in a corner, run through once in order, then the one pointed at), `-only-tinted` (only his countries, hand-tinted, a row of small stamps); every one with the count far larger and the share of the world (`FP.counts.share`, 10.3% of 195, Hong Kong counted as the site counts it). He liked `-tinted-onestamp` most ("i like this the most", 3) and scored none of the others, so round three (group `footprint-3`; the round is that group plus `-tinted-onestamp` as 1) is four ways of it: `footprint-onestamp-route` (each trip's flights drawn in ink while its stamp shows, earlier ones left faint), `-plate` (the map as one plate centred on 150°E, count and stamp printed on the sea), `-index` (an atlas index of the 20 countries and years beside the stamp, tap a name), `-passport` (the stamp in a small open passport whose page turns). He then asked for about fifteen versions with Impeccable or other fitting skills, reviewed by others: eleven more (group `footprint-4`, `footprint-imp-<command>`), one per Impeccable command (bolder, quieter, distill, typeset, colorize, polish, layout-column, layout-spread, animate, delight, overdrive), so the round is the original as 1 and fifteen ways, 2 to 16. Three reviewer agents critiqued all fifteen by Impeccable's critique heuristics (out of 32, heuristics 7 and 10 n/a); their score and a one-line verdict are in each card's description, full reports in `ideas/reviews/footprint-critique/`. Only route and bolder were judged better than the original; the reviewers' main point was that most versions made the count smaller, not bigger. He scored ten of the fifteen 1 (removed, tag `footprint-fifteen-2026-11-06`) and kept the original, bolder ("i like the color of this, but not the size"), typeset and animate at 3. His brief for round five (2026-11-06): a bigger map with little white, three numbers (countries, flights, photographs), and a ramp: his countries start uncoloured and gain colour trip by trip while the numbers count up, flights shown quietly. Counting up and the uncoloured start are his explicit ask for this map only. `FP.ramp` in `footprint/base.js` holds the trip-by-trip running totals (ending 20 / 41 / 93; a country's photographs join when it first does). Five ramps (group `footprint-5`, the round now, 1 to 5): `footprint-ramp-atlas` (title block of three numbers in the South Pacific, one stamp), `-band` (map to the window's edges, Pacific-centred, numbers in a row along the foot, no stamp), `-engrave` (the engraving draws in from Taiwan, then the ramp), `-flights` (41 flights drawn one by one, a small stamp), `-widen` (opens close on Taiwan, the view widens trip by trip to the whole world). He scored band and widen 3 ("I like the feeling of those") and atlas, engrave and flights 1 (removed, tag `footprint-ramps-2026-11-07`). Round six (group `footprint-6`; the round is that group plus band and widen as 1 and 2), five wall maps from those two, all edge to edge, Pacific-centred, no stamp, the whole US coloured, a taller phone map: `footprint-wall-widen-band` (widen's opening ending on band's foot row), `-relief` (Natural Earth shaded relief reprojected under the washes), `-numbers` (a taller foot band, the three figures about 190 px, the sea ruled round them), `-places` (the 62 places as small ink circles appearing trip by trip, named on pointing), `-follow` (the view frames each trip in turn, about 14 s, a click skips). He scored `-widen-band` 3 and asked for it faster ("it's a landing page, I want the people to start the scrolling a little bit faster", 2026-11-09). Round seven (group `footprint-7`; `-widen-band` as 1): `footprint/below.js` and `below.css` put his trips as a plain list under the map so the page scrolls, and `FPBelow.onFirstMove()` jumps the ramp to its end on the first wheel, touch, key or scroll (the top bar scrolls away with the map). Five faster ways, resting in about 3 to 3.6 s instead of 10: `footprint-swift-even` (the same moves compressed), `-year` (nine beats, one per year), `-glide` (one continuous widen), `-numbers-lead` (the numbers done in 1.2 s, the map from East Asia behind them), `-peek` (the top of the trip list shows under the numbers). He scored `-glide` 3 ("quite good") with three notes (2026-11-09): the names on the map looked odd and "the previous font is better" (round five's band lettering, not typeset's), "too fast, make it a little bit slower", and the map "squeezed to the top", to be shown whole with the numbers lying over it. Round eight (group `footprint-8`; `-glide` as 1): `footprint-glide-calm` and `-calmer`, one script `footprint/glide-calm.js` with the page's `data-tempo` (1.45 rests at about 4.7 s, 1.85 at about 6 s); band's `PLACE` table drawn on the canvas each frame (year under the large names, leaders to the small ones); the frame from 80°N to New Zealand's foot (`solveWide`), the numbers over the map with only a veil round them (`veil` clearings). At his "what if we don't zoom", two more in the same round, `footprint-whole-calm` and `-calmer` (`data-zoom="none"`: the whole wall map still from the first frame, only the colours, flights and numbers ramping, at the same two tempos). He scored `-glide-calmer` 5 ("Love it"), `-whole-calm` 3 and `-whole-calmer` 1 (removed, tag `footprint-whole-calmer-2026-11-09`); `-glide-calm` was left unscored. At his word ("好 用現在這個新的"), `-glide-calmer` became the live Journey tab's first screen the same day (before it at tag `before-footprint-live-2026-11-09`): `journey.html` carries the stage `<div class="fp-stage jr-fp" id="stage">` with `data-arrive="footprint" data-tempo="1.85"`, loads `footprint/base.js`, `arrive.js`, `glide-calm.js`, `swift-glide.css` and `arrive.css`; the page's own heading and totals are hidden (the heading kept for screen readers); on a wide window the map fades over the first 0.3 screen of scroll while the gallery globe beneath already folds (`ARRIVE` in journey.js starts the fold at 0); on a phone the map is the first block and the globe strip arrives already folded. Until round nine the join into the fold was a dissolve on the live page. Round nine (group `footprint-9`, his "Yes, design it", 2026-11-09; the live page as 1): three join versions, `journey-join-wrap`, `-prints`, `-unveil` (globe configs of the same names from `JOIN` in globe3d.js), where the map and the globe are one sheet: the globe painted as the footprint map is (paint `footprint`, `footprintBase()` and `paintFootprint()`; the paper, sea rings and graticule painted off the page in `footprint/sea-worker.js`; his countries in the map's own colours from `FP.view.tones`), the flat sheet laid out in Gall's stereographic (`gall`, `gy()` in the JS and the shader) and placed by the camera exactly under the map (`match`: `FP.view` from `publish()` in glide-calm.js, its middle meridian as `START`, the lens anchor and scale blended to the globe's frame in `frameCamera()`); the map fades over 0.12 of a screen (`data-fade`) and the fold starts at 0.1 (`data-fold-at`); the globe's routes and dots wait for the fold. wrap curls the sheet round in one piece, prints is the live gallery fold, unveil curls it away off his newest photograph (`wind.css`). He chose unveil ("lets run it then", 2026-11-09) and it is the live page's join the same day (`data-globe="join-unveil" data-fade="0.12" data-fold-at="0.1" data-spring="11"`, with `wind.css`; before it at tag `before-join-unveil-live-2026-11-09`), smoothed with the animation-performance, threejs-performance and apple-design skills: the footprint painter keeps every outline as a `Path2D` (`fpPath()`), so the repaint as each trip is read costs a few milliseconds instead of about 80 (about 15 freezes of 50 to 100 ms in one scroll down the page before, none after); the fold follows the scroll as a spring with no bounce (`data-spring`, per second, `SPRING` in globe3d.js; the other pages keep `CFG.glide`, now counted in time rather than frames, as are the routes' fades), and `arrive.js` fades the map with the same spring, so a mouse wheel's step lifts the names away over a moment; its first-move listeners go once they have heard one. On 2026-11-14 he saw the globe black in the in-app browser (the paper and sea gone, only the routes): a browser may drop a picture made off the page, or a canvas's picture, while the page is hidden. The worker's picture is now copied into an ordinary canvas at once, and `heal()` (with `fpHolds()`) paints a blank sheet again when the page is shown, refocused or its drawing context comes back. Round eleven (group `journey-panel`, 2026-11-14, from his marks on the live page: the panel's font and frosting not high-end, the photograph to show more, room kept on the right): `journey-panel-glass`, `-cormorant`, `-mist`, one stylesheet `panel-luxe.css` with `<body data-luxe>`, wide windows only. Each panel ends a seventh short of the right edge (`--lx-right`), the trip names, years and the year folio in a serif (`--lx-serif`), the years as numerals rather than black blocks; glass is Playfair on 30% paper with a 7px blur and hairline edges, cormorant is Cormorant Garamond (his logo's face, `@font-face` in that file) on 22% and 12px, mist is Playfair on 12% paper with a 26px blur. His notes the same day ("too transparent", the names too big, slower: "i scroll a little and a lot of countries pass by") gave a second pass beside them, `journey-panel-glass-2`, `-cormorant-2`, `-mist-2` (`data-luxe2`): 54, 50 and 46% paper, the names a size smaller, each trip at least a third of a screen tall (`min-height: 33svh`) so the trips pass three times slower; then a frontend-design review set the month and "Read the trip" as ordinary small words instead of tracked capitals. His note on it ("I don't want the lines to split that far away. Only the scrolling should get slower") gave a third pass, `journey-panel-glass-3`, `-cormorant-3`, `-mist-3` (`data-luxe3 data-slow="3"`): the old spacing, and `panel-slow.js` moves `.jr-years` at a third of the scroll once its top reaches the reading line (`--slow`), a `.jr-slow-room` after it giving the page the length. The same day, `journey-fp-list` (group `journey-fp-list`, his ask for "a where I travelled (and when) journey list on the right side of the landing page map ... the same way the countries come in, with color"): `<body data-fp-list>`, `footprint/travel-list.js` and `.css`; `solveWide()` in glide-calm.js keeps a right column (`colW`) and frames the map in the rest, `FP.reveal` gives each country's wash time and tone, `FP.onDraw` lets the key's lines come up as their countries colour in. Wide windows only. He found it "not high-end enough", so three quieter forms beside it (group `journey-fp-list-2`, `data-fp-list="ledger"`, `"index"`, `"pacific"`): ledger, a year then that year's countries as serif text, each underlined in its colour as it comes in; index, alphabetical with dotted leaders to the first year and a dot of colour; pacific, no column (the map edge to edge), the ledger in a double-ruled cartouche in the South Pacific, placed from `FP.view.at()` and kept clear of the numbers. Round ten (group `journey-cam`, his "play around with this" with the build-threejs-scroll-worlds skill, 2026-11-09; the live page as 1): `journey-cam-turn`, `-closer`, `-horizon` (globe configs `join-unveil-turn`, `-closer`, `-horizon`, from `UNVEIL`, with `CFG.cam`), the live opening and fold, then his trips as the chapters of one camera move the scroll conducts (`chapter()` and `camStep()` in globe3d.js): the chapter is which `.jr-trip` has reached the reading line and how far the next has come, eased by a spring (`CAM.spring`, 7 a second), the globe held on a trip while it is read and travelling in the last part of the way, a long passage rising higher (`far`, `cam.alt`, `CAM.rise`); wide windows only, a phone keeps the live page. turn keeps the whole globe; closer brings the camera in 1.9 times over each trip's countries; horizon comes 2.5 times closer with a wider lens (34 degrees), the globe tipped back 38 degrees and set low (`lift`, `drop`), so its curve is a horizon under his photograph. Dots and rings keep their size on screen (`markK`). On 2026-11-11 he kept the live page ("ill stick with the one on the main page"): the three are marked Not using on the list (`out`), the pages and the `cam` configs kept, the live page unchanged. The same day, at his word, the six older versions scored 1 (`journey-luxe-print`, `-clouds`, `-drift`, `journey-gallery-ring`, `-scatter`, `-photoball`) were taken off the list and their pages removed (tag `journey-six-scored-one-2026-11-06`; their globe configs stay in globe3d.js). Their scripts and styles are in `design 2/new/footprint/`; `footprint/base.js` (`window.FP`) holds the shared counts, places, flights, words and top bar, read from data.js, never typed in. All the high-end versions keep the forming globe whole inside the part of its box on screen (`fit`: drawn smaller and moved in `frameCamera()`), after he saw its top cut off in a 1000 px wide window, and so does the live page since 2026-11-05 at his word (`gallery: { ...GALLERY, fit: true }`; before it at tag `before-live-fit-2026-11-05`); below 1024 px wide the page has no long hold (`craft.css`), so the change there is quick. The review kit's headless stills come out blank for these pages at a scrolled view, so their stills are screenshots from the in-app browser. `CFG.lift` is the routes' arc height, not the prints'. Design 2's pen-and-wash rules do not bind `design 2/new/`;
  light only, nothing written on photographs, both languages and no long dashes do.
- **Inside `design 2/wc-sketch/`, the opening and the map are kept apart** (his call, 2026-10-04,
  so he can collect opening candidates and choose later): `opening/` holds one file per candidate
  (`globe.js`, the globe that unrolls into the map, and `photoball.js`, its photo-ball look),
  chosen from the address with `?opening=…`; `map/flights.js` is the map's own globes; `paint.js` the
  shared brushes; `app.js` the page and the glue between them. A new opening is a new file in
  `opening/`, never more code in `app.js`. The file table is in that folder's `DESIGN.md`.
- **In Finder he sees only what he opens himself** (his request, 2026-09-29: the full list
  felt cluttered). Six things: `originals/`, `ideas/`, the three launchers, `我的筆記.txt`.
  Everything else is flagged hidden for Finder by `python3 tools/finder_view.py`. Nothing is
  moved or renamed, so every path in this file still holds. **Rerun it after adding or
  replacing anything at the top level, and at sign-off:** a file written afresh loses the
  flag. The launchers rerun it too. A new working file goes in its `HIDE` list. `--show` brings
  everything back. `experiments/` comes into view by itself while a trial is open.
- Anything a visitor's browser needs goes in `design 1/`. Anything else stays out of it: no
  notes, no originals, no scripts, no README.
- After any change to the layout, run `python3 tools/check_site.py`. It follows every link,
  photo, font and icon on every page and reports what leads nowhere. Before a risky change use
  `--save <file>`, after it `--compare <file>`, with the file in the scratchpad, not in the
  project.

## Structure — the pages are built, not hand-written

Nav (since 2026-10-15): Gallery 作品集 · Journey 旅程 · Guides 攻略 · About 關於我. Blog and Skills
were removed: trip stories belong to Journey, general tips to the General part of Guides.
Guides (`guides.html`, once `destinations.html`) drills down: 7 continents → country pages → guides (`design 1/posts/`).

**Every `.html` page in `design 1/` is written out by `python3 tools/build.py`. Never hand-edit the
HTML** —
the next build overwrites it. Change the source, then rebuild:

| To change | Edit |
|---|---|
| photographs, countries, continents, guides, shared wording | `data/site.json` |
| a guide's text | `content/<name>.body.html` and `content/<name>.i18n.json` |
| page layout, the `<head>`, top bar, footer | `tools/build.py` |
| how anything looks | `design 1/css/style.css` |
| behaviour (language switch, photo viewer) | `design 1/js/main.js` |

**Typefaces live with the site**, in `design 1/fonts/` (his permission, 2026-09-28). Pages never contact
Google Fonts. `design 1/css/fonts.css` is written by `tools/fonts.py`; don't edit it by hand. To change
a typeface or weight, edit `FAMILIES` in that script, delete `design 1/fonts/`, and rerun it. Each
folder keeps its `OFL.txt`, which the font licence requires.

**Site icon — "PT"** (photography tuan), settled 2026-09-28 after three rounds. It sits in his
bookmarks bar beside FinTuan's FT and BodyTuan's BT, so it shares their format — rounded
square, two geometric sans letters — and adds a strip of landscape: a dark ridgeline traced
from the Aoraki photo, a red sun, warm paper sky. Both halves are his call: plain
dark-and-gold letters read as "too techy", and a full illustrated scene with serif letters
didn't look like a sibling of the other two. The icon keeps its own colours, set in
`tools/icons.py`; they are not the site's tokens. Files live in `design 1/icons/`, plus
`design 1/favicon.ico` and `design 1/site.webmanifest`. Don't edit the images by hand: change
`tools/icons.py` and rerun it. The `<head>` tags that point at the icon are written by `tools/build.py`.

## Bilingual rule

**Every user-facing string goes in BOTH languages** — never ship English-only copy. Strings
live in `data/site.json` and `content/*.i18n.json` as `en` / `zh` pairs; wording shared by
every page (menu, footer, viewer) is in `design 1/js/main.js` (`i18n.en` / `i18n.zh`). The build writes
each page's strings into a `window.pageI18n` block and fixes 中文 punctuation on the way.

## Photos — `originals/` is his, `design 1/images/` is the site's

Split by owner on 2026-09-28, at his request, so he can tell at a glance which photo is for
what.

| Folder | Whose | What it holds |
|---|---|---|
| `originals/<country>/` | **his** | full-res files he drops in. **Gitignored** — they stay on his Mac |
| `originals/portfolio/` | **his** | shots he most wants in the Gallery |
| `design 1/images/web/` | the site's | web-sized copies, made by Claude. He never needs to open it |

- **Keep every country folder, empty or not.** He asked for this: the empty ones are where he
  will drop photos later. Don't tidy them away. A new country gets a new folder.
- Web copies are named `<country>-<subject>.jpg`, long edge 2400px, JPEG quality ~62 (aim under
  ~1 MB). `sips -Z 2400 in.jpeg --setProperty formatOptions 62 --out "design 1/images/web/name.jpg"`
- To publish one: make the web copy, add an entry under `"slides"` in `data/site.json`,
  rebuild. The build makes the smaller copies in `design 1/images/web/640/` and `design 1/images/web/1280/`.
- **The photo list** — `originals/photo-list.html`, written by `tools/photo_list.py`. For each
  photo on the site it shows the original it came from and the pages that use it, then the
  originals not yet used, then a count per folder. It is private (it can show unpublished
  photos) and is refreshed by every build. He opens it by double-clicking
  `photo-list.command`. **Rerun it whenever he adds originals.** Originals are matched to web
  copies by the capture time both files carry, so never strip that from a web copy.
- A photograph belongs to a city's book (the US is four: `new-york`, `boston`, `san-francisco`, `los-angeles`, each a `shelf` entry with a `place`) through an optional `"city": "<place>"` on its slide; without it, it belongs to its country's book.
- Camera data shown on the site is read from the photograph's own file. Never invent it.
- Only publish photos he confirms are his own — some "sample pic" links in his planning docs
  are other people's reference shots.

## What the design must never drift toward

The brief and the two `DESIGN.md` files decide every visual question (typeface, light only,
flat paper, square corners, motion). When a new page or experiment is built, these are the
defaults that creep in unnoticed and are not this site: Inter, Roboto, Space Grotesk or system
fonts; purple or any gradient background; dark themes; pill buttons, rounded cards, drop
shadows; numbered "01 / 02 / 03" section labels; italic accent words in headings; a hero with
text over the photograph. Check a new build against this list before showing it to him.

## Session log — PROGRESS.md (READ FIRST, WRITE LAST)

- **At the start of every session: read `PROGRESS.md` before doing anything else.** It is the
  handoff note from the last day of work — where we stopped, and what's queued next.
  Treat it as a claim to verify, not gospel: skim the actual files / `git log` to confirm it's
  still true, and correct it if it drifted.
- **When he calls it a day** — "that's it for today", "收工", "done for now", "let's stop here",
  or any similar sign-off — update `PROGRESS.md` *before* the final commit, without being asked.
  Rewrite these sections so they describe today, not history:
  - **現在狀態 / Where things stand** — what actually exists and works right now.
  - **上次做到哪 / Where we left off** — what shipped this session, in his words not commit-speak.
  - **接下來 / Next up** — the concrete first action for next time. One clear starting move,
    not a wish list. Include the file(s) involved so the next session opens fast.
  - **等你決定 / Waiting on you** — anything blocked on his call, so it isn't silently dropped.
  - Stamp the date at the top and keep the file short. Prune anything already done; this is a
    handoff note, not a changelog — `git log` is the changelog.
- Then commit and push it along with the day's work.

## Ideas inbox — the Paradigm tool list (IDEAS.md is the old record)

**Everything he collects lives in the Paradigm tool list** (his call, 2026-10-30: "全部都整理過去", one
main AI center to get everything from). It is the Google Sheet 「工具清單」 in the shared
`paradigm_mainshare` folder, used by his team (its id is in Claude's memory, `reference-paradigm-tool-list`):
one tab per area (影片製作, 設計與品牌, 內容與社群, 會議與協作, 開發與網站, 靈感來源, AI 服務與帳號) plus 首頁
(counts) and 工具筆記 (longer notes, one section per tool, linked from each tab's 筆記 column).

- **Where things go.** Inspiration sites, photographer and travel-guide sites, scroll, map and other
  effects: 靈感來源, grouped by 小類 (網站, 網站＋UI, UI 介面, 攝影師網站, 旅遊攻略網站, 捲動與地圖, 互動效果).
  Skills, tools, tutorials and how-to tips: their area's tab, longer text in 工具筆記.
- **Travel-site items are marked**: the 備註 starts with 「旅遊網站」 (his call, 2026-10-30: screen each one
  and mark what is about the travel site). Use it for what was collected for, tried on or used in this site.
- **Its rules are on its 首頁**: one tool in one tab only, the name as `=HYPERLINK`, 狀態 from the dropdown
  (已在用, 已裝未試, 用別的代替, 沒有, 收藏參考 for reference sites), same 小類 kept together and grouped so it
  folds (first row visible). New rows copy the format and the 狀態 validation of the row above
  (PASTE_FORMAT, then PASTE_DATA_VALIDATION). Neutral team wording, not his private comments.
- **When he drops a URL or an idea**, add it to the sheet with what he likes about it (ask if he didn't say),
  after checking it isn't there already. Collecting is not a request to build: don't change the site because
  of an entry until he asks. A liked site is a source of qualities, never a template to copy.
- **To look anything up, read the sheet.** `IDEAS.md` keeps the 53 entries as they were on 2026-10-30, each
  with a `搬到` line naming its tab, plus the full history (Claude's notes, trial records). It is no longer
  updated. The Excel file `ideas/靈感整理.xlsx` was retired the same day; `tools/ideas_xlsx.py` is kept.
- Image and video files he saves still go in `ideas/`, which is **gitignored** (other people's work, public
  repo). Videos can't be watched by Claude: record the link and ask him which moment he liked.

## Build list 建置進度 — TODO.md

`TODO.md` is his list of what the site still needs and how far each thing has got (started
2026-09-29, at his request). The three lists have different jobs: the Paradigm tool list is what he has
seen and liked, `TODO.md` is what he has decided to do, `PROGRESS.md` is where the last session
stopped. When he says he wants to do something, add it here in 繁體中文 with the date. An idea
moves from the Paradigm sheet to here only on his word.

Same format as `IDEAS.md`, same generator. He reads it as `ideas/建置進度.docx`:
**after every change to `TODO.md`, rerun
`python3 tools/ideas_doc.py TODO.md ideas/建置進度.docx --progress`.** He opens it by
double-clicking `建置進度.command`, which rebuilds it first. `--progress` draws the bar at the
top: entries with `狀態` 完成 out of all entries. It counts entries, not effort, so don't
present it as more exact than that. `類型` is the area of work (攻略內容,
網站文字, 功能, 上線). `狀態` is one of 待做, 進行中, 等你決定, 暫緩, 完成. When something is
finished, set `狀態` to 完成 and `類型` to 已完成 and move it to the Done section, in the same
commit as the work. At sign-off, check the list against what the day actually did.

## His own notes 我的筆記 — `我的筆記.txt`

A plain text file at the top level where he writes for himself (started 2026-09-29, at his
request). It opens in TextEdit on a double-click. **It is his: never edit, tidy, reformat or
overwrite it**, not even to mark something as handled. It is **gitignored**: the repo is
public and his notes are private unless he says otherwise.

- **Read it at the start of every session**, right after `PROGRESS.md`, and tell him in a
  line or two what is new since last time.
- What he writes there is a note to himself, not an order. Nothing moves into `TODO.md` or the Paradigm sheet
  and nothing on the site changes, until he says so in the chat.
- The generated Word files are overwritten on every run, so they are never the place for his
  own writing. If he wants a note attached to one item of the build list, add it to that entry
  in `TODO.md` as a `筆記` field.

## Experiments 試作 — `experiments/`

He is the manager: he discovers a skill or an idea, has it tried on a **copy** of the site,
reviews it, then says keep or drop (set up 2026-09-28). The real site is never the test bed.

- **Start** — when he says "try X as an experiment", or when a change is big and he isn't sure
  he'll keep it, don't edit the real site. From this folder run
  `git worktree add experiments/<name> -b exp/<name>`. One folder and one branch per experiment.
- **Preview** — each experiment gets its own port, counting up from 8643, as an entry in
  `.claude/launch.json`: `"runtimeArgs": ["tools/serve.py", "<port>", "experiments/<name>/design 1"]`.
  The real site stays on 8642 so he can compare side by side.
- **Inside an experiment** — put a short note at the top of its `CLAUDE.md`: what is being
  tried, which skill, and which rules of this file are suspended there. Commit on its branch.
  Branches stay **local** unless he asks for a backup — the GitHub repo is public.
- **Keep** — only on his word. Merge `exp/<name>` into `main`, check the real site in the
  preview, then remove the folder and the branch.
- **Drop** — `git worktree remove experiments/<name>` and `git branch -D exp/<name>`.
  Never drag the folder to the Trash; that leaves a broken link behind.
- `experiments/` is gitignored on `main`, and anything that scans the site for pages must skip
  it (`tools/build.py` only writes the pages it names).
- Ask for a verdict while an experiment is fresh: the longer it sits while `main` moves on, the
  harder it is to merge. List the open ones under 等你決定 in `PROGRESS.md`.

Open now: none.

Decided experiments. Rejected ideas are not proposed again; the tags hold the code.

| Experiment | Verdict | Date | Where the code is |
|---|---|---|---|
| `impeccable` (full rebuild, Impeccable + Taste skills) | kept, now the site | 2026-09-28 | earlier looks: `light-table-v1`, `exhibition-hang-v2` |
| `merge-old-layouts` (portfolio grid, seven continent squares, opening photo staying put) | kept | 2026-09-30 | before: `before-merge-old-layouts-2026-09-30` |
| `skills-review` (shortened Impeccable pass) | dropped | 2026-09-30 | none |
| `impeccable-full` (dual-agent critique 23/32, three P1 fixes, phone viewer, keyboard and screen-reader access) | kept | 2026-10-01 | before: `before-impeccable-full-2026-10-01`; record in `.impeccable/critique/` |
| `taste-review` (removed the three doors, the intro buttons, the "Portfolio" heading) | dropped: the doors and buttons stay | 2026-10-01 | none |
| `bookshelf` (five 3D books on the home page) | kept, then replaced by coverflow | 2026-10-01 | before: `before-bookshelf-2026-10-01` |
| `coverflow` (all sixteen books as a fanned row) | kept | 2026-10-01 | before: `before-coverflow-2026-10-01` |
| `marked-photo` (a circled spot on the home photo, a line to a close print, coordinates) | dropped | 2026-10-01 | reflog only |
| `earth`, `scope`, `cssglobe` (three globe openings for design 2) | dropped | 2026-10-03 | reflog only |
| `scroll` (books on shelves flying to their places on scroll; became `opening/shelf.js`, tried beside the corridor) | dropped with the corridor; only the globe stays | 2026-10-04 | `before-drop-openings-2026-10-04`, `exp-scroll-dropped-2026-10-04` |
| `taste2` (Taste skill audit-first on design 2: phone bottom-right row, the word on the cover photo, the place page opening line, dates as months, the Speed label) | kept | 2026-10-07 | merged into `main` |
| `timed-cards` (the Guides shelf replaced by a copy of Giulio Cuscito's "Timed Cards Opening": a full-window photograph, rounded photo cards, the first card grows into the next background every 4 s, Bebas Neue names, arrows, 02 / 18) | kept | 2026-10-13 | merged into `main`; the books before it at `before-timed-cards-2026-10-13` |
| `taste-trip` (Taste skill audit-first on the trip page `elements/trip/`: one wash for both countries with vermilion for the route only, smaller blank frames, no coordinates, no scroll hint, even title lines; then the place name under the phone map and country names kept off the route) | kept | 2026-10-15 | merged into `main` |
| `trip-link` (the trip story page moved into `design 2/wc-sketch/trip/` (`?trip=<journey id>`), one link per journey in Flights, "The trip, along its route / 沿著路線看這趟"; `tools/build2.py` writes each photo's `taken` day so a trip shows only its own photos; "Flights" keeps its name) | kept | 2026-10-15 | merged into `main` |
| `destinations-map` (the Journey map moved onto Destinations, a book's dive ending on the country page, Journey as the Flights list) | dropped: the map means "where I've been", which is Journey's job | 2026-10-15 | tag `exp-destinations-map-dropped-2026-10-15`; the dive into the country page may come back as the Journey to Guides link |
| `journey` (the Journey tab rebuilt: Logbook, then scroll-craft's rewinding atlas, the print beside the map, then the map folding into a globe over the trip's photograph, a frosted panel with Fade) | kept, now the Journey tab; 8644 closed | 2026-10-29 | merged into `main`; before it at `before-journey-merge-2026-10-29`; versions at `journey-looks-and-highlights-2026-10-29` |
| `opening` (home-page openings for design 1; three left: aperture, contact sheet 2, letters 4) and `opening-graph` (openings from his agent graph; ridgeline left) | dropped, both | 2026-10-15 | tags `exp-opening-dropped-2026-10-15`, `exp-opening-graph-dropped-2026-10-15` |
| `about` (About rewritten from facts he gave and approved word for word: his name as the heading, three paragraphs on who he is, what he shoots and leaves out, why the guides hold; a contact line with Instagram and email; home base, countries, camera and lenses beside it) | kept | 2026-10-16 | merged into `main`; before it at `before-about-2026-10-16` |
| `gallery` (the Gallery as the photo wall alone: no title, no words, no hover name, no bars, no Dark word) | dropped: the old Gallery stays for now | 2026-10-16 | tag `exp-gallery-dropped-2026-10-16`; the Gallery before it at `gallery-wall-with-controls-2026-10-16` |
| `home` (Home as a sequence of eight photographs at changing sizes, then four square photograph doors to the tabs) | dropped: "get rid of it" | 2026-10-16 | tag `exp-home-dropped-2026-10-16` |
| `home-impeccable` (Impeccable critique of Home, 21/32, and its five fixes: the Guides cards hold still on hover, focus and a Pause word, a card click jumps, continent labels, honest wording, photographs before the guides, three new full-width photographs, the Matterhorn last) | kept | 2026-10-16 | merged into `main`; before it at `before-home-impeccable-2026-10-16` |
| `home-variations` (ten whole home pages from the Impeccable redesign round, same paper look, "every photograph has a story": facing pages, two roads, the caption grows, the back of the print, one photograph all the way, exposure, one at a time, margin notes, the fold, same place twice) | dropped: none caught his eye; next time he brings home pages he likes and we build from those | 2026-10-16 | tag `exp-home-variations-dropped-2026-10-16`. Its stars-and-notes review list (1 to 5 stars and a note per version, kept in the browser, "Copy everything" for the chat) is reusable: `tools/home_variants/run.py`, `kit.py`, `design 1/js/home-variants/index.js`, `design 1/css/home-variants/index.css` at that tag |

**Weekly report 週報** (set up 2026-09-28). A scheduled task, `weekly-web-design-report`, runs
every Monday about 9:00 and searches the web for the week's new AI web-design tools, skills,
plugins and news. It writes `ideas/weekly/<date>.md` and builds `ideas/weekly/<date>.docx` with
the same generator (`python3 tools/ideas_doc.py <list.md> <out.docx>`), then hands him the Word
file in the chat. **The report is a menu, not the inbox:** nothing from it goes into the Paradigm 工具清單
until he says he is interested in an item. Nothing it finds gets installed without his say.

## Working habits

- Commit and push after every meaningful change (owner treats GitHub as autosave).
- After changing `data/`, `content/` or `tools/build.py`, run `python3 tools/build.py` before
  looking at the result.
- Verify visually in the preview before saying something is done.
- **Local server:** `tools/serve.py` on port 8642 — `http.server` plus a no-cache header, so a
  plain reload shows the latest CSS/JS. It serves `design 1/` only, so notes and originals are out
  of its reach, and it is bound to 127.0.0.1 on purpose (site isn't public). He starts it
  himself by double-clicking `start.command`.
- Preview: `.claude/launch.json` → "travel-site" runs the same `tools/serve.py`. If port 8642 is
  already serving (he launched it himself), open the preview by URL instead of by name.

<!-- claude-reflect: learned rules (saved from the band; edit freely) -->
## Learned rules
- Ask the user before adding GSAP to the project; use plain CSS/JavaScript for animations unless they approve GSAP.
- Keep earlier experiment versions intact; do not delete or overwrite them when creating new experiment directions.
<!-- end claude-reflect -->
