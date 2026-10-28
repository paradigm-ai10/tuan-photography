---
target: the Journey page (design 2/new/journey.html)
total_score: 20
max_score: 28
na_heuristics: 7,9,10
p0_count: 1
p1_count: 2
target_identity: "file:/Users/chenliangyuan/Desktop/travel website/experiments/journey/design 2/new/journey.html"
target_fingerprint: "sha256:f42f31b8bb3e00d120e4767d45811681aec5ab372e61adab06ae7aaf97564de2"
target_path: /Users/chenliangyuan/Desktop/travel website/experiments/journey/design 2/new/journey.html
timestamp: 2026-10-18T14-40-42Z
slug: design-2-new-journey-html
---
Method: dual-agent (A: design review sub-agent · B: detector sub-agent)

## Design Health Score (Experience mode; 7, 9, 10 n/a)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Folio tells the year; map changes at a 35% line while the eye is below; 2010 state never shows |
| 2 | Match system / real world | 3 | "21 countries" counts Taiwan; "16 trips and 21 countries later" from 2010 is 15 and 20; "UAE · Dubai" in prose |
| 3 | User control and freedom | 2 | No nav for 4,000 px; back from a trip lands at the top with planes replaying; viewer is a dead end |
| 4 | Consistency and standards | 3 | Two line systems on one map; "+12" looks tappable, is a span |
| 5 | Error prevention | 3 | Clipped phone strips and dead "+N" invite taps that do nothing |
| 6 | Recognition over recall | 3 | Viewer names place and count, not the trip |
| 7 | Flexibility | n/a | Experience surface |
| 8 | Aesthetic and minimalist | 3 | Docked map carries fan + legs + dots + tints; 2026 shows five red routes |
| 9 | Error recovery | n/a | Nothing visible can fail |
| 10 | Help | n/a | Experience surface |
| Total | | 20/28 | Good (71%) |

## Design specificity
Substance is only his (Taiwan home, 16 real routes, true totals, the rewind). Skin is the premium-minimal data-editorial costume: one tight sans, big tabular numerals, hairline rules, flat sand map; fewest photographs per screen of any tab. Specific in substance, generic in skin.
Detector: journey.html clean (0). Folder: 27 literal font sizes vs the wrong (design 1) ramp, 1 selection colour, 1 cream palette on the review list, 1 viewer template img: all false positives for this page. Browser overlay: 10 low-contrast (3.2:1) on .jr-year__count and the inactive 中文 button (real), 1 single-font note.

## Priority issues
- [P0] First-trip (2010) state unreachable: follow() flips to forward when .jr-close top < 55% while the year fires at 35%; 2010 window ~1 px at 1440x900 (journey.js:260). Fix: trigger return from the close's text block; last year min-height 60svh; close words aligned to end.
- [P1] Phone: folio written across the sticky map (journey.css:117); strips overflow hidden clip prints and "+N" (journey.css:97). Fix: folio as a row beneath the drawing; strips scroll sideways with every photo.
- [P1] Back from a trip lands at the top and replays the peak. Fix: trip id in the hash; skip flyOut on return; scroll to the entry.
- [P2] Hero trips/photos counters finish at 1.5/1.7 s before the last plane (5.3 s); folio(null) leaks its interval. Fix: drive all three from flyOut; clearInterval before return.
- [P2] Fan (.fly) and legs (.leg) overlap on the docked map. Fix: fan at arrival only; returns with the forward sweep.
- Contrast: .jr-year__count at 3.2:1 needs --ink-2.

## Personas
Jordan: promise broken at 2010; "+12" dead; no nav mid-page. Sam: folio inside aria-hidden figure; trip titles not headings; thumbnails not keyboard-openable; dialog unnamed. Casey: map+folio 22% of every screen; clipped strips; precise taps. Photographer seeking a photo's trip: only 42/93 shown; viewer links nowhere.

## Minor
Empty month row on undated trips; 中文 close half-width space; data-sc-reveal on h2 unverified; 1024px column 382px; Antarctica sliver; intro's second sentence is instruction.

## Questions
1. Why does Journey show less photograph per screen than any other tab? One real print per trip?
2. Fan or legs: which map does the visitor read beside?
3. Does he count Taiwan among 21 countries?
