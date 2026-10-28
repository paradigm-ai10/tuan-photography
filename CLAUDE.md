# tuan photography 陳亮元 — project instructions

Personal travel-photography site for Thomas Chen (陳亮元). Plain HTML/CSS/JS, no framework.
Bilingual EN / 繁體中文. Owner is not a developer — explain in plain English, handle all tech.

## Design 3 was dropped (his call, 2026-10-28)

Design 3 ("One day of light", the dark one-camera site on 8650, built 2026-10-19) was removed at his
word: "drop 8650 entirely". The whole folder, `tools/build3.py` and its server entry are gone; the code
is at the tag `design3-dropped-2026-10-28` (earlier home versions at `home-film-2026-10-19`,
`counting-openings-ten-2026-10-19`, `counting-openings-three-2026-10-19`). Do not propose it again.
Design 1 on 8642 is the site, and the rules below are in force.

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
| Ground | warm paper and a stone band alternate by section. **Light only**, no dark theme, except the Gallery page's own Dark word (his call, 2026-10-07) |
| Colour | eleven tokens in `design 1/css/style.css` `:root`. Never hard-code a colour |
| Earth colours | clay, olive, slate: whole flat blocks only (the three doors, the footer) |
| Links | deep clay is the only colour that means "this can be followed" |
| Names and headings | Playfair Display, weight 400, centred (中文: Noto Serif TC, 500) |
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
  unedited; brief in `scrollcraft/`). `design 2/new/` (the review list, `index.html`) keeps a Good /
  Not for me and notes line for it, saved to `ideas/reviews/journey.json`. A trip opens on
  `design 2/wc-sketch/trip/?trip=<id>&from=journey`, whose back word returns to that entry. The
  pen-and-wash Journey is still at `/journey/wc-sketch/` (before the merge: tag
  `before-journey-merge-2026-10-29`); the trial's other versions are at the tags
  `journey-looks-and-highlights-2026-10-29`, `journey-five-versions-2026-10-18`,
  `journey-versions-trimmed-2026-10-18`. Design 2's pen-and-wash rules do not bind `design 2/new/`;
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

## Ideas inbox — IDEAS.md

`IDEAS.md` is where his loose ideas and links to sites he likes are collected (started
2026-09-28). When he drops a URL or an idea, add it there in 繁體中文 with the date and **what
he likes about it** in his own words — ask if he didn't say. Collecting is not a request to
build: don't change the site because of an entry until he asks. A liked site is a source of
qualities, never a template to copy.

Two kinds of entry: (1) ideas about this site, (2) collected links / images / videos.
Image and video files go in `ideas/`, which is **gitignored** — the GitHub repo is public and
saved references are usually other people's work, so they stay on his Mac. Only the notes in
`IDEAS.md` are pushed. Videos can't be watched by Claude: record the link and ask him which
moment he liked.

He reads the list as a Word file, `ideas/靈感整理.docx`. It is generated:
**after every change to `IDEAS.md`, rerun `python3 tools/ideas_doc.py`** and never edit the
Word file by hand. Each entry is a `###` heading followed by `- 欄位: 內容` lines; `類型` sets
the group and `圖片` names a file in `ideas/`.

He asked (2026-09-28) for the Word file to be **readable at a glance**: one table per 類型,
one row per entry, showing only 名稱, 重點, 狀態 and a link. He also wants it **dense**
(about 20 rows a page: single line spacing, small type), tables with a **full drawn frame**,
and the contents table at the top **linked** to each type's table. So every entry needs a `重點`
line, written as **one short phrase** (about 15 characters), and `狀態` is one or two words
(已安裝, 已存檔, 已移除, 未註冊, 收集中). Longer explanation goes in other fields, which stay
in `IDEAS.md` and are not shown in Word. Don't add the same thing twice: check the list first
and merge into the existing entry.

## Build list 建置進度 — TODO.md

`TODO.md` is his list of what the site still needs and how far each thing has got (started
2026-09-29, at his request). The three lists have different jobs: `IDEAS.md` is what he has
seen and liked, `TODO.md` is what he has decided to do, `PROGRESS.md` is where the last session
stopped. When he says he wants to do something, add it here in 繁體中文 with the date. An idea
moves from `IDEAS.md` to here only on his word.

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
- What he writes there is a note to himself, not an order. Nothing moves into `TODO.md` or
  `IDEAS.md`, and nothing on the site changes, until he says so in the chat.
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
file in the chat. **The report is a menu, not the inbox:** nothing from it goes into `IDEAS.md`
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
