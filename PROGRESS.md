# tuan photography 陳亮元 — Project Memo 專案備忘錄

*Last updated: 2026-10-29, handoff note. Read this first, then check the files to confirm.*

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

2026-10-29: the Journey tab rebuilt in the 8644 trial and made the real one: "the map should fold
into the globe", "the latest trip", the 8642 Flights layout (photo behind, see-through panel), and
of three marks for the trip in view he chose Fade. "Close 8644 entirely and make this the new 8642".
Then the five 3D globe versions, built beside it. Then the sidebar plan was settled (see 現在狀態).

## 接下來 Next up

**Review the five 3D globes** on http://localhost:8642/journey/new/index.html (see below), or start the
next tab's work. The sidebar tidy-up is decided and he is doing it himself (see 現在狀態).

## 等你決定 Waiting on you

- **3D globe, five versions** (2026-10-29, built while you were away): the Journey page with the map
  as a real 3D object (three.js), beside the live one, which is unchanged. Review them on
  http://localhost:8642/journey/new/index.html (Good / Not for me and a note each; saved to
  `ideas/reviews/journey.json`). Pages: `design 2/new/globe-{paper,relief,high,raised,roll}.html`,
  code `globe3d.js` + `globe3d.css`; before it at tag `before-globe3d-2026-10-29`.

- **Sea photograph** on the old Journey map: which photographs besides Aoraki, if any?
- **Camera data for the 22 US photographs:** re-export from Lightroom with metadata, or drop the
  raw files in.
- **Boston** has a book but no photographs yet.
- **Older items:** the second guide (Vietnam and Japan have the most photos); Barcelona's SIM row;
  newsletter sign-up; the old three Barcelona layouts; 紐西蘭暫緩.

## 如何接續 How to resume

Say **"continue the travel website"**. Double-click **`start.command`**: the site on 8642.
