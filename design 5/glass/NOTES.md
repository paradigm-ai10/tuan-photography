# Glass block (design 5, direction 2)

**The idea.** His photographs printed on thin panes of glass, 32 of them stacked tight into one
solid block that stands on a dark floor, softly lit, with a faint reflection. The block is the
home page. Warm off-black ground, one accent (the green of a glass edge, used for links), square
corners, Geist Light for names and headings, Noto Sans TC for 中文.

**Two moments, nothing else moves.**
1. On arrival the block sits still, nearly face on: you see one photograph (Matterhorn reflected)
   and a thin green edge. The first screen of scroll turns it slowly and opens the stack a little,
   so its side shows as many panes, each a sliver of another photograph.
2. Then five panes (Roys Peak, Otaru Canal, Bunkers del Carmel, Golden Gate in fog, Hội An at
   night), from different depths, slide out sideways one at a time, come up flat and large, the
   place name below the glass (never on it), and slide back in. Each takes about half a screen.

Then three quiet sections, each a different layout: Portfolio (one sideways row of prints at their
own shapes, names below), Guides (the Barcelona guide: cover large, its real facts beside it),
Trips (the latest four trips with photographs: date, countries, a glimpse of three prints, one per
country). Clicking any pane, print or glimpse opens it large with place, note, best light and the
camera data from the file. Links go to the existing site pages for now.

**Rules kept.** Native scroll (sticky stage, 4 screens, eased toward the scroll position, no wheel
hijack); English and 繁體中文 with a word switch; nothing on a photograph; no dashes, eyebrows,
counters, scroll cue or glows. Reduced motion shows the turned block as one still picture and the
five photographs as plain prints below it. Without WebGL the front photograph stands in its place,
same prints below. Test with `?still` and `?nogl`. Phone (390 px) has its own camera framing.

**Files.** `index.html`, `glass.css`, `glass.js` (three.js r186 from `../../journey/vendor/three/`,
data from `../../journey/data.js`). Notes box: `data-name="design5" data-id="glass"`.

**How it is cheap.** One custom shader for every pane (print with a clear rim, polished edge line,
green edge faces with a single highlight, soft studio reflection, no MeshPhysicalMaterial and no
lights), one shared box geometry, the reflection drawn as a mirrored copy that fades with depth,
a floor shader that carries the light pool and contact shadow. About 65 draw calls, two shader
programs. DPR capped at 1.75. Prints load at 640 px, front first, four at a time; the pane that
comes up large swaps to 1280. It only draws when the scroll position or a texture changes, and
not at all once the stage is off screen.

**Unfinished or uncertain.**
- The 32 panes are a fixed, hand-picked list of landscape-shaped photographs; portrait photographs
  would be trimmed on a 3:2 pane, so they are left out of the block (they appear in the Portfolio row).
- At small sizes the top of the turned block (32 thin edges) can shimmer a little.
- On wide screens the pane sliding out passes briefly past the right edge before it comes to the middle.
- Portfolio, Guides and Trips links point at the current site's pages (no inner pages for design 5 yet).
- Not checked in Safari or on a real phone; checked in the preview at 1440 x 900 and 390 x 844.
