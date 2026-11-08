# tuan photography 陳亮元 — Project Memo 專案備忘錄

*Last updated: 2026-11-09, late night, handoff note. Read this first, then check the files to confirm.*

## 現在狀態 Where things stand

- **Design 1 on localhost:8642 is the site.** Its Journey tab is `design 2/new/journey.html` (`/journey/`
  forwards there). The live home page still opens with the logo loading screen (1C, motion 21); nothing
  from the home redesign is on the live page yet.
- **Home opening, where it stands (2026-11-09).** Everything drawn or brushed is over: he said the sketch
  turning into the film "is not actually what I want" (40 to 49 crossed out). He wants photographs
  arriving (scattered, in rows, flying in) and the home page still landing on the Barcelona film. From the
  14 references on `design 2/new/home-gallery.html` he marked only **Mathilde de Chiara** Good, so fifteen
  versions of that family were built overnight: `design 2/new/home-redesign/c-flock-*.html`, one engine
  `flock.js` (plain JS, Web Animations), review list numbers **50 to 64**, group `opening8`, marked
  "Your pick". Each: the logo shrinks into the corner, his photographs fly in and form a shape (diamond,
  ribbon, column, a row out of the logo's line, contact sheet, stairs, strips, table, ring, columns, a wall
  that becomes the film, a wall swept, into one window, a dealt stack, TUAN in photographs), one tile is the
  film alive in slow motion, and it grows to the whole screen where the page's video takes over.
- **Journey footprint map (another desk's work):** round six, five wall maps (`footprint-wall-*`), waiting
  for his scores; see CLAUDE.md for the whole history. Untracked `footprint-swift-*` files in `design 2/new/`
  belong to that session; do not commit them from here.
- **93 photographs, 21 countries.** 22 US photographs have no camera data.
- **Review tooling.** `ideas/reviews/home-redesign.json` holds his scores; `tools/read_reviews.py` reads
  them. Films and stills of these openings are made with headless Chrome on the GPU (`--use-angle=metal`),
  timed from `html.hr-arrive`; the scripts live in the session scratchpad (`gal/filmfl.py`, `gal/stillfl.py`),
  rewrite them if lost. The server (`tools/reviews_mixin.py`) now also serves `.mp4` clips under
  `/__reviews/<name>/thumbs/` with byte ranges, for the reference page's recordings.

## 上次做到哪 Where we left off

2026-11-09, one long night session on the Home opening:
- He dropped the sketch-into-film idea and asked for photo-led reference sites. About 60 filmed, 14 kept on
  `home-gallery.html` with a looping recording of each opening; he marked Mathilde de Chiara Good.
- He asked for 10 to 20 bold versions in that feeling, to review in the morning ("use any skills"). Fifteen
  built, reviewed by two agents (a visitor's eye, a motion designer) and by me frame by frame on desktop and
  at phone width; fixed on the way: a class clash that blanked the page, the mosaic flashing white before the
  film, the stack's translucent pile, phone layouts (table, ring, stack, TUAN on two lines).
- TODO.md updated (the home entry carries the whole story); docx rebuilt.

## 接下來 Next up

Open http://localhost:8642/journey/new/home-redesign/ and read his scores on 50 to 64:
`python3 tools/read_reviews.py ideas/reviews/home-redesign.json --manifest "design 2/new/home-redesign/review-manifest.json"`.
Remove the ones he scores 1 (his rule), keep the family, and refine the ones he likes: `flock.js` holds the
fifteen as named configs (`V`), each a `layout`, `enter`, `hold`, `leave`; `tools/home_redesign.py`
(`FLOCKS`, `FLOCK_PHOTOS`) writes the pages. When he picks one, it goes on the live home page through
`tools/build.py`'s `loader()` (the live loading screen is `design 1/js/loader.js`).

## 等你決定 Waiting on you

- **Home opening 50 to 64:** scores and notes. Also: should the opening play on every visit or once per visit
  (the live loading screen plays once).
- **Journey footprint round six** (other desk): scores on the five wall maps.
- **Camera data for the 22 US photographs:** re-export from Lightroom with metadata, or drop the raw files in.
- **Boston** has a book but no photographs yet.
- **Older items:** the second guide (Vietnam and Japan have the most photos); Barcelona's SIM row;
  newsletter sign-up; 紐西蘭暫緩.

## 如何接續 How to resume

Say **"continue the travel website"**. Double-click **`start.command`**: the site on 8642.
