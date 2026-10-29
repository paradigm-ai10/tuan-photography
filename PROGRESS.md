# tuan photography 陳亮元 — Project Memo 專案備忘錄

*Last updated: 2026-10-30, handoff note. Read this first, then check the files to confirm.*

## 現在狀態 Where things stand

- **Design 1 on localhost:8642 is the site.** Its Journey tab is now the new page,
  `design 2/new/journey.html` (`/journey/` forwards there): flat map, click a country for its latest
  trip, the map folds into a globe over the trip's photograph, a frosted list where the trip in view
  stays clear. Merged 2026-10-29; 8644 and every experiment are closed.
- **Design 3 (8650) was dropped on 2026-10-28** at his word, "drop 8650 entirely". Folder,
  `tools/build3.py` and server entry removed; the code is at the tag `design3-dropped-2026-10-28`.
  `start.command` now starts and opens 8642 only.
- **93 photographs, 21 countries.** 22 US photographs have no camera data.
- **Code-tab sidebar, decided 2026-10-29, he does the moving himself.** One sidebar group,
  旅遊網站, holding one long-lived "desk" session per site tab (首頁 Home, 作品集 Gallery, 旅程 Journey,
  攻略 Guides, 關於我 About) plus four outside the tabs: 靈感 Ideas, 照片 Photos, 網站整體 Site-wide,
  報告 Reports (the automatic report runs). Every experiment for a tab is a side session started from
  that tab's desk, so it nests under it; keep or drop archives the experiment and the desk stays.
  Desks are created the first time that tab is worked on, not before. Existing sessions: "journey tab
  design" becomes the Journey desk, "3D globe" sits beside it, "ideas" is the Ideas desk, "Travel website
  session cleanup" is Site-wide. The 20 old report-run sessions (AI 情報報告, 網頁設計雷達, 週報, one
  reminder) can go: every report is saved in `ideas/weekly/`. Do not create groups or move sessions
  for him; he asked to do it himself.

## 上次做到哪 Where we left off

2026-10-29 to 10-30, all on the Journey globe (live page unchanged except "polish only", which went
live: arcs closer to the globe, "Read the trip", easier faded trips). Round after round of globe
trials; what he said that decides the next step:
- He likes **the wrap**: the flat map closing into the globe around Taiwan (A4's movement).
- He dislikes: a blue map "pasted" on white; **a rectangle lifting off the background** (fixed by the
  whole-page wrap: the map fills the page and its edges fade into the paper); his photographs inside
  the countries ("weird", dropped); the globe being "plain, boring".
- "Realistic" did **not** mean a real earth: he meant the design factor is missing. He proposed giving
  references; I agreed (one per problem: globe look, transition, arrival, each with what he likes).
- Review mechanism rebuilt: a Notes box on every version page (drag, minimize, N key, 1 to 5 score,
  pins), the review page a plain list with scores.
- Skills installed both places at his word: top-design, editorial-portfolio-chapters, shader-glsl
  (and the 13 three.js ones the day before). Skills list page: 48.

## 接下來 Next up

Open http://localhost:8642/journey/new/index.html: the three he gave 5 stars (the live page, marked
Main; 2 Sea chart, scroll-craft; 3 Paper, the whole page wraps). Next he **brings 2 or 3 references**
(or asks for an Awwwards shortlist), and the globe is designed from those. Code: `design 2/new/`
`globe3d.js` (configs `paperwrap`, `ink`, `earth`, `chart`), `earth.css`, `craft.css`, `journey.js`
(`dockCraft`).

## 等你決定 Waiting on you

- **Journey globe** (2026-10-30): kept the three with 5 stars, the live one as main; next, references
  for the globe's look, the wrap and the arrival. Front-end research report written the same night. Removed trials are at tags
  `globe3d-five-versions-2026-10-29`, `journey-panels-three-2026-10-29`, `journey-artists-a1-a3-2026-10-29`,
  `journey-photo-countries-2026-10-30`, `journey-earth-ink-2026-10-30`.

- **Sea photograph** on the old Journey map: which photographs besides Aoraki, if any?
- **Camera data for the 22 US photographs:** re-export from Lightroom with metadata, or drop the
  raw files in.
- **Boston** has a book but no photographs yet.
- **Older items:** the second guide (Vietnam and Japan have the most photos); Barcelona's SIM row;
  newsletter sign-up; the old three Barcelona layouts; 紐西蘭暫緩.

## 如何接續 How to resume

Say **"continue the travel website"**. Double-click **`start.command`**: the site on 8642.
