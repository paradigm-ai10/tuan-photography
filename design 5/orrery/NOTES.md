# Orrery (design 5, direction 3), 2026-11-02

**The idea.** A brass-and-paper instrument stands on the paper page: a small engraved earth (paper
coloured sea in fine horizontal lines, plain land, his countries washed in sepia) held on a tilted
axis inside a ticked brass meridian, on a turned brass stem and a walnut foot. Around the earth are
sixteen thin brass rings, one per trip in `SITE.journeys`, oldest inside. Each ring carries a tiny
mounted print of that trip's first photograph, or a brass bead when the trip has no photographs on
the site yet. The page itself catches the instrument's shadow.

**The two big moments.**
1. Arrival: the rings start out of line and swing into one plane, inner first, settling like
   gimbals, while the instrument comes round from the left and the canvas fades in.
2. Scrolling turns it through time. The instrument moves to the left and the trips pass beside it.
   Each trip's ring rises out of the plane, faces the reader and comes forward, its print swings to
   the lower right and grows, the other rings dim, and the earth turns to that trip's first country.
   The trip's photographs (up to five) open out as a fan of small prints, with its date and
   countries below. The beads move round their rings as you scroll, inner ones faster, like an orrery.
   The trips before the first one with photographs (2010 to 2023) come forward together as one step.

Then three quiet sections built from `window.SITE`: Portfolio (seven landscape photographs in two
justified rows, a sideways strip on a phone), Guides (Barcelona: lead photograph, facts, four spot
names), Trips (every trip, grouped 2026, 2025, 2024, Earlier). Links go to the existing pages
(gallery, the Barcelona guide, each trip's page, the Journey map).

**Look.** Paper `#eee8dc`, ink `#24211c`, one accent (marine ink `#2b4a72`, links only), square
corners everywhere. Names in Cormorant Garamond 500 (an instrument maker's engraved serif; Noto Serif
TC for 中文), reading text in Geist (Noto Sans TC for 中文). No eyebrows, no numbers, no scroll cue.

**Modes.** `gl` (moving), `still` (prefers-reduced-motion: the instrument once at rest, then the trips as
a plain list with the fans open), `nogl` (no WebGL: a photograph of Taipei in place of the instrument,
the same list). `?still` and `?nogl` in the address show the quiet versions on any machine.

**Files.** `index.html`, `orrery.css`, `orrery.js` (data, words, sections, and the three.js
instrument; its environment is a small built-in warm room, as three.js's RoomEnvironment addon is
not in the vendor folder). Notes box: `data-name="design5" data-id="orrery"`.

**Unfinished or uncertain.**
- Cormorant Garamond comes from Google Fonts; offline it falls back to Noto Serif TC.
- Photographs are given to trips by country and the day taken (`taken`); US photographs without a
  date go to the 2025 summer trip. Korea (August 2025) has no photographs yet and says so.
- The rings' presentation reads best on a large screen; on a phone the instrument sits in the top
  half and the trips scroll beneath it.
- Not tuned for very short landscape windows (under about 600 px tall).
