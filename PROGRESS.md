# tuan photography 陳亮元 — Project Memo 專案備忘錄

*Last updated: 2026-11-11, afternoon, handoff note. Read this first, then check the files to confirm.*

## 接下來 Next up (2026-11-11, late night)

Home opening: his TUAN PHOTOGRAPHY loader stays; the open question is the move from it into the home page (the
Barcelona film). Specs are in `design 2/new/home-redesign/flock.js`, pages `c-flock-<name>.html` from `FLOCKS` in
`tools/home_redesign.py`. This round on the list (http://localhost:8642/journey/new/home-redesign/), four left:
1 `cards-flip` (the film now runs behind the cards, each back drawn live from it), 2 `around-reveal` (**5, Love it**),
3 `camille-flow` (zoom 4.3 s, columns still drifting through it), 4 `camille-night` (the same on black, the name white;
`data-ground="dark"` on the page, `FLOCK_DARK` in the generator: his own "try this", an exception to light-only).
He flagged Reject on every tilted-wall version (`tilted-rows`, `-lift`, `-part`, `-flat-flip`) and on `camille-code`;
they are crossed out under Earlier rounds. Do not bring the tilted wall back unless he asks.
- Read ALL of his review each time, to the end ("Anything else", and the flags: `flag: reject`).
- Standing notes: TUAN arrives slowly, holds, fades slowly, gone before any photograph; no pause and no flash between
  "Barcelona whole" and "Barcelona moving"; the film should already be running while a wall gives way to it.
First move next time: `python3 tools/read_reviews.py ideas/reviews/home-redesign.json --manifest "design 2/new/home-redesign/review-manifest.json" --since 2026-11-11`, read to the end; if he settles on one, ask before making it the live home page.

## 現在狀態 Where things stand

- **Design 1 on localhost:8642 is the site.** Its Journey tab is `design 2/new/journey.html` (`/journey/`
  forwards there). The live home page still opens with the logo loading screen (1C, motion 21); nothing
  from the home redesign is on the live page yet.
- **Home opening, where it stands (2026-11-09).** Everything drawn or brushed is over (40 to 49 crossed out).
  He wants photographs arriving and the home page landing on the Barcelona film. From the fifteen "photographs
  arrive" versions (after Mathilde de Chiara) he scored **mosaic 4** (the wall of photographs that becomes the
  film), line, contact and ring 3, diamond, ribbon and window 2, and seven at 1, which were removed (tag
  `flock-fifteen-2026-11-09`; configs stay in `flock.js`). He then asked for **高級感, sophisticated and
  high-end**, so round nine was built from the 4-star idea: `c-flock-luxe-*.html`, group `opening9`, review
  list numbers **58 to 66**, marked "Your pick". Nothing flies: his photographs rise in order into hairline
  grids, the grid becomes the film's first frame piece by piece, the film plays. Nine: the wall slowly, row by
  row, eight large, three panels, inside the mat, one print, the line opens into a band, around the name then
  the wall, the photographs part (a curtain drawn off the film).
- **Journey footprint map (another desk's work):** round six, five wall maps (`footprint-wall-*`), waiting
  for his scores; see CLAUDE.md for the whole history. Untracked `footprint-swift-*` files in `design 2/new/`
  belong to that session; do not commit them from here.
- **93 photographs, 21 countries.** 22 US photographs have no camera data.
- **Review tooling.** `ideas/reviews/home-redesign.json` holds his scores; `tools/read_reviews.py` reads
  them. Films and stills of these openings are made with headless Chrome on the GPU (`--use-angle=metal`),
  timed from `html.hr-arrive`; the scripts live in the session scratchpad (`gal/filmfl.py`, `gal/stillfl.py`),
  rewrite them if lost.

## 上次做到哪 Where we left off

2026-11-09, the morning session on the Home opening:
- Read his scores on 50 to 64, removed the seven he scored 1, built the high-end round of nine in `flock.js`
  (new helpers `sliceIn`, `filmTakesOver`, `growLayer`, `rise`, `hairGrid`, `matRect`; `mark: 'fade'`;
  `filmAsPhoto`), filmed all nine on desktop and at phone width, had a motion designer review them, took the
  stills, registered them on the review list with `ask` set. From the review: the rise fades on its own gentle
  curve, large panels wipe instead of dissolving, the film starts at 0.35 speed and eases up so the frame it was
  built to is held, the band was rebuilt (band-height tiles, the whole frame behind them opened out at the end),
  PHOTOGRAPHY now fades with the name in line mode (the letters carry the fade-in), and `media/barcelona.mp4` was
  re-encoded yuv420p (it was 4:4:4, which iPhones cannot decode; 6.3 MB).
- TODO.md's home entry carries the whole story; docx rebuilt.

## 接下來 Next up

Open http://localhost:8642/journey/new/home-redesign/ and read his scores on 58 to 66:
`python3 tools/read_reviews.py ideas/reviews/home-redesign.json --manifest "design 2/new/home-redesign/review-manifest.json" --since 2026-11-09`.
Remove the ones he scores 1 (his rule), refine the ones he likes: the nine are the `luxe-*` configs in
`flock.js` (`Object.assign(V, …)` near the end), each a `layout`, `enter`, `hold`, `leave`;
`tools/home_redesign.py` (`FLOCKS`) writes the pages. When he picks one, it goes on the live home page through
`tools/build.py`'s `loader()` (the live loading screen is `design 1/js/loader.js`).

## 等你決定 Waiting on you

- **Home opening 58 to 66:** scores and notes. Also: should the opening play on every visit or once per visit
  (the live loading screen plays once).
- **Journey footprint round six** (other desk): scores on the five wall maps.
- **Camera data for the 22 US photographs:** re-export from Lightroom with metadata, or drop the raw files in.
- **Boston** has a book but no photographs yet.
- **Older items:** the second guide (Vietnam and Japan have the most photos); Barcelona's SIM row;
  newsletter sign-up; 紐西蘭暫緩.

## 如何接續 How to resume

Say **"continue the travel website"**. Double-click **`start.command`**: the site on 8642.
