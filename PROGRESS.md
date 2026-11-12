# tuan photography 陳亮元 — Project Memo 專案備忘錄

*Last updated: 2026-11-12, handoff note. Read this first, then check the files to confirm.*

## 接下來 Next up (2026-11-12)

**The home page is the old one, with the new opening in front** (live since 2026-11-12). He chose only the way in:
opening 9 of the last round (`camille-smooth-night`: his logo on black, the wall in one move) ending on the Barcelona
film, which now fills the first screen where the opening photograph was. Everything under the film is the home page
as it was (the line and buttons, the windows, the wall, the Guides cards). His words: "what I'm actually deciding is
the landing page version ... The homepage hasn't been designed yet, so keep it as the old one. Only keep the videos
from the very start through the Barcelona set."
- **What went wrong first:** Claude put the whole redesigned page live with the opening. He had picked an opening,
  not a home page. That state is at the tag `home-redesign-whole-page-live-2026-11-12`; the page before any of it at
  `before-home-redesign-live-2026-11-12`.
- Live files: `home_opening()`, `home_film()`, `build_home()` in `tools/build.py` (`HOME_WALL`, `HOME_SCENES`),
  `design 1/css/opening.css`, `design 1/js/opening.js` (the opening cut down to that one version), `design 1/media/`.
  The trial copies in `design 2/new/home-redesign/` do not feed the site.
- `?opening` in the address plays the opening again (http://localhost:8642/?opening); it plays once per visit.
- The home page itself is still to be designed. None of the page bodies from the redesign rounds is approved.
- A page for friends (versions 5 to 9): https://claude.ai/artifact/Dek81J9SRPEQsve9wGgzRC , rebuilt by
  `tools/share_openings.py`. The review list keeps all versions; 9 is marked Main.
- His standing rules for this work: a note on a version gets a NEW version beside it; every candidate in white and
  black (the list's "Side by side, playing" row, manifest `pairs`); read his whole review, "Anything else" included.
First move next time: ask how the opening feels on his own screen and phone, and whether the old opening photograph
(Aoraki) should stay somewhere on the page now that the film has its screen.

## 現在狀態 Where things stand

- **Design 1 on localhost:8642 is the site.** Its Journey tab is `design 2/new/journey.html` (`/journey/`
  forwards there). Since 2026-11-12 the live home page opens with his logo on black, the wall of
  photographs in one move (opening 9) and the Barcelona film on the first screen; the page under it is the old one.
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
`tools/home_redesign.py` (`FLOCKS`) writes the pages. (He picked on 2026-11-12: it is live through `home_opening()` in
`tools/build.py` and `design 1/js/opening.js`.)

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
