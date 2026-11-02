# Design 4: "Where they were taken" 立在拍下的地方

A completely new, 3D design of the site (his ask, 2026-11-02: "focus on 3D vision, an immersive
experience, bold, not confined to older experiences, use anti-slop"). Built beside design 1 and
design 2; nothing in them changes. Served on 8642 at `/world/` (`design 1/world` is a link to this
folder, like `design 1/journey`). Before it: tag `before-design4-2026-11-02`.

## The idea

One persistent 3D world: a misted paper atlas of the earth, seen at the height of a person. Every
photograph stands on it as a real print (white border, thickness, a reflection on the wet ground, a
contact shadow), at the place it was taken. Native scroll is the journey: from high above Taiwan the
camera descends, lands at the first place, walks along its prints, takes off, glides over the atlas
while an ink route draws behind it, and lands at the next. The sky, mist and ground take their colour
from the photograph of the place you are at, so each place re-lights the whole world.

Why this, for him: the photograph is the entrance (it is the only thing that stands up in the
world), the place is the meaning (Guides), the route is the time (Journey). It is bold because the
whole site is one space you move through, and calm because there is only one motion at a time and
the photographs never move.

## Rules kept from the brief

- Nothing written on a photograph. Names sit beneath the prints, never on them.
- Light ground: the palette is paper mixed with each photo's own colour, lightness clamped high.
- English and 中文 for every string; no long dashes; at most one middle dot in a line.
- Plain place names as titles. Instagram as the contact; email stays on About.
- Words, not icons, for every control.

## Anti-slop ledger (from design 3 and the Taste skill)

No counters or numbers as decoration, no dark ground with a neon accent, no mono data labels, no
scroll cue, no viewfinder marks, no wide heavy caps over images, no autoplaying loops, no pinned
scroll hijack (native scroll throughout), no eyebrows, one accent (deep clay) used for the route and
links only.

## World ledger

| Thing | Value |
|---|---|
| Unit | 1 degree of longitude or latitude = 1.6 units; Taiwan at the origin |
| Ground | equirectangular atlas drawn from Natural Earth 110m on a canvas: ocean paper, land a shade darker, coastline, faint 15° graticule; tinted per place |
| Prints | height 1.5, width by the photo's shape, 0.06 white border, 0.03 thick, standing on an arc of radius 9 facing the arc's centre |
| Reflection | the print mirrored under the ground, fading away from the base, 30% |
| Shadow | soft ellipse under each print, 26% |
| Route | ink line (deep clay), drawn up to where the camera is |
| Sky | gradient dome, top and horizon from the place's photograph, fog colour = horizon |
| Fog | linear, near and far grow with the camera's height |

## Camera ledger

| Beat | Camera |
|---|---|
| Opening | 52 above Taiwan, looking down at the region; one line of text bottom left |
| Stop (one per place, cities in the US) | eye height 1.05, walks along an inner arc 5.6 from the prints, looking at each in turn; scroll length grows with the number of prints |
| Flight | eased from one stop to the next, rising by 0.32 × distance (4 to 70), looking ahead |
| End | rises to 230 over the whole route; About line, Instagram, links to the other tabs |

## Interaction ledger

| Target | Hover / focus | Activate |
|---|---|---|
| Print | steps 0.14 toward you, its place and city appear beneath it | opens the viewer: the photograph large, place, city, best light, camera data from the file; Previous, Next, Close; Esc and arrow keys |
| Place in the caption | link colour | country page or guide on design 1 |
| Places (top bar) | | list of every place; choosing one travels there |
| 中文 / EN | | switches every string |

Every print has a real button in the page (in its place's caption), so keyboard and screen readers
reach every photograph. Reduced motion: no smoothing, no hover step, no pointer drift. No WebGL:
each place's caption shows its first photograph instead.

## Files

| File | Job |
|---|---|
| `index.html` | the page and its strings |
| `world.css` | the page's look (tokens at the top) |
| `world.js` | the world, the scroll journey, the viewer |
