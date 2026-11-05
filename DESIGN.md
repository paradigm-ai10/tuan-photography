---
name: tuan photography 陳亮元
description: A travel journal set like a printed magazine. One photograph opens the site with nothing written across it; everything else is serif names and small sans on warm paper.
colors:
  bg: "oklch(96.6% 0.011 82)"
  band: "oklch(91.8% 0.013 80)"
  card: "oklch(98.8% 0.005 85)"
  line: "oklch(84.5% 0.015 78)"
  text: "oklch(25% 0.012 60)"
  text-2: "oklch(45% 0.017 62)"
  accent: "oklch(46% 0.092 47)"
  paper: "oklch(97.5% 0.008 85)"
  clay: "oklch(53% 0.088 47)"
  olive: "oklch(49% 0.052 95)"
  slate: "oklch(41% 0.03 195)"
typography:
  display:
    fontFamily: "Playfair Display, Noto Serif TC, Georgia, serif"
    fontSize: "clamp(2.3rem, 1.45rem + 3.4vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Playfair Display, Noto Serif TC, Georgia, serif"
    fontSize: "clamp(1.75rem, 1.3rem + 1.5vw, 2.4rem)"
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: "0.005em"
  title:
    fontFamily: "Playfair Display, Noto Serif TC, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.005em"
  lead:
    fontFamily: "Playfair Display, Noto Serif TC, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Geist, Noto Sans TC, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  small:
    fontFamily: "Geist, Noto Sans TC, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  caption:
    fontFamily: "Geist, Noto Sans TC, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    fontFeature: "tnum, lnum"
  capitals:
    fontFamily: "Geist, Noto Sans TC, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.1em"
rounded:
  none: "0"
spacing:
  s-1: "0.5rem"
  s-2: "1rem"
  s-3: "1.5rem"
  s-4: "2.5rem"
  s-5: "5rem"
  s-6: "clamp(6rem, 11vw, 9.5rem)"
  gap: "0.75rem"
  col-gap: "clamp(1rem, 2.4vw, 2.5rem)"
  edge: "clamp(1.15rem, 4.5vw, 4rem)"
  wide: "88rem"
components:
  top-bar:
    textColor: "{colors.text}"
    typography: "{typography.capitals}"
    height: "5.5rem"
  top-bar-over-photograph:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    typography: "{typography.capitals}"
    height: "5.5rem"
  button-primary:
    backgroundColor: "{colors.text}"
    textColor: "{colors.paper}"
    typography: "{typography.capitals}"
    rounded: "{rounded.none}"
    padding: "1rem 1.7rem"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.capitals}"
    rounded: "{rounded.none}"
    padding: "1rem 1.7rem"
  button-line-hover:
    backgroundColor: "{colors.text}"
    textColor: "{colors.paper}"
  button-footer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.slate}"
    typography: "{typography.capitals}"
    rounded: "{rounded.none}"
    padding: "1rem 1.7rem"
  button-footer-hover:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
  photograph:
    backgroundColor: "{colors.band}"
    textColor: "{colors.text}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
  opening-photograph:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    height: "100svh"
  intro:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    typography: "{typography.display}"
    padding: "clamp(5.5rem, 12vw, 10rem) 0"
  feature:
    textColor: "{colors.text}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
  wall:
    backgroundColor: "{colors.band}"
    rounded: "{rounded.none}"
  grid:
    backgroundColor: "{colors.band}"
    rounded: "{rounded.none}"
  continent:
    backgroundColor: "{colors.band}"
    textColor: "{colors.text}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    width: "72rem"
  tile:
    backgroundColor: "{colors.band}"
    textColor: "{colors.text}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
  names:
    textColor: "{colors.text-2}"
    typography: "{typography.lead}"
    width: "52rem"
  guide-column:
    textColor: "{colors.text}"
    typography: "{typography.body}"
    width: "50rem"
  contents-list:
    backgroundColor: "{colors.band}"
    textColor: "{colors.text}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "1.75rem 2rem 1.6rem"
  contents-list-current:
    textColor: "{colors.accent}"
  quick-facts-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "2rem 2.1rem 1.5rem"
  sheet:
    textColor: "{colors.text}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "0.9rem 1.1rem 0.9rem 0"
  note:
    backgroundColor: "{colors.band}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "1.6rem 1.8rem 1.7rem"
  day:
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "1.75rem 0"
  viewer:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
  footer:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.paper}"
    typography: "{typography.display}"
    padding: "clamp(6rem, 11vw, 9.5rem) 0 1.5rem"
---

# Design System: tuan photography 陳亮元

This file was written on 2026-09-28 from the built site (`design 1/css/style.css`, `tools/build.py`, `design 1/js/main.js` and the pages they produce), after the rebuild that followed the owner's reference sites. It replaces the record of the earlier dark build, which is kept at the git tag `exhibition-hang-v2`. Where this file and the stylesheet ever disagree, the stylesheet is right and this file needs updating.

## Overview

**Creative North Star: "The Printed Travel Journal"**

The site is a travel journal set like a printed magazine. It opens with one photograph that fills the whole window, with no headline, no sentence and no button on it. After that, everything is quiet: place names and headings in a serif, centred; reading text in a plain sans; the menu and the buttons in small spaced capitals; all of it on warm paper. The owner chose this direction on 2026-09-28, naming Along Dusty Roads and The Common Wanderer as the template, a warm light ground, and the whole site.

The site is light only, with one exception the owner made on 2026-10-07: the Gallery page carries a Dark word, and that page alone can turn its paper near-black (the eleven tokens are redefined under `[data-theme="dark"]`, which only `js/wall.js` sets). The stylesheet declares `color-scheme: light`; visitors whose devices are set to dark still see the warm paper site everywhere else.

Colour is used in two ways. The ground alternates between warm paper and a slightly darker stone band, section by section. Three earth colours (clay, olive and slate) appear as flat blocks: the spines of the books on the home page's shelf, and the footer. Links and hover states are a deep clay. There are no icons: every control is a word.

Photographs are shown bare. In a row they keep their own shape and are never trimmed; their names sit beneath them, never on them. Opening any photograph shows it whole, with the account of how it was made beside it.

**Key Characteristics:**
- One opening photograph fills the window; nothing is written across it.
- Warm paper and a stone band alternate by section. Light only, except the Gallery's own Dark word.
- Serif for names and headings, centred. Plain sans for reading. Small spaced capitals for the menu, buttons and labels.
- Clay, olive and slate as flat blocks: the book spines and the footer.
- Every corner is square. Buttons are rectangles with capital labels.
- Photographs are bare and untrimmed in rows, with captions beneath.
- No icons. Every control is a word, in both languages.
- Both languages are first-class. Chinese has its own sizes, spacing, weight and punctuation.
- Motion has three reasons only: arriving, leaving the opening photograph, and walking the wall. All of it stops under "reduce motion".

## Colors

A warm, low-colour palette: paper, stone and ink that all lean toward brown, one deep clay for links, and three muted earth colours for flat blocks. The values in the front matter are the ones in `design 1/css/style.css` and are the only source.

### Primary
- **Deep Clay** (`accent`): links inside guide text, the colour a link or word control turns under the pointer, the fill a primary button turns under the pointer, the keyboard focus ring, the section being read in the contents list, and the map link in the viewer.

### Secondary
- **Clay** (`clay`): a book spine on the shelf, and the ground of selected text.
- **Olive** (`olive`): a book spine on the shelf.
- **Slate** (`slate`): a book spine on the shelf, the footer that closes every page, and the colour behind the opening photograph and the window while their files load.

### Neutral
- **Warm Paper** (`bg`): the page ground, the viewer's ground, and the top bar when the phone menu is opened over the opening photograph.
- **Stone** (`band`): the alternating band, the contents box and the notes in a guide, the resting colour of a photograph's place while its file loads, and the square of a continent that has countries but no photograph yet.
- **Card Paper** (`card`): the quick facts card in a guide, and nothing else.
- **Hairline** (`line`): 1px rules between rows, the resting underline of a link, the slash in the breadcrumb.
- **Warm Ink** (`text`): reading text, headings, the fill of the primary button, the outline of the line button, the rule under a table's header row.
- **Second Ink** (`text-2`): quiet text. Sentences under titles, dates, the second line of a caption, camera data, table headers, labels, the count under a continent, the line inside an empty square, the count in the viewer, the language not in use, and the names of places that have no work yet.
- **Paper White** (`paper`): lettering on a colour block, on an ink button, and on the opening photograph; the fill of the footer button; the band on a book's cover.

Measured contrast, worked out from the built tokens. Warm Ink on Warm Paper is about 14.5:1, on Stone 12.6:1, on Card Paper 15.5:1. Second Ink is about 6.8:1 on Warm Paper, 5.9:1 on Stone and 7.2:1 on Card Paper. Deep Clay is about 6.7:1 on Warm Paper and 5.8:1 on Stone. Paper White is about 5.1:1 on Clay, 5.8:1 on Olive, 8.1:1 on Slate and 14.9:1 on Warm Ink. The small print in the footer is about 5.9:1 on Slate. Hairline measures 1.3:1 to 1.5:1 against its ground and is decoration only; nothing depends on it to be understood.

### Named Rules
**The Light Only Rule.** The site has one theme, light, on warm paper. The one exception is the Gallery page's Dark word (the owner's call, 2026-10-07), which the browser remembers for that page only. It is not a licence to add a theme switch anywhere else.

**The Paper And Stone Rule.** Sections alternate between Warm Paper and Stone. A change of ground is how one section is told from the next; there are no boxes drawn around sections and no rules between them.

**The Flat Block Rule.** Clay, Olive and Slate are used as whole flat blocks with Paper White lettering: the spines of the books on the shelf, and the footer. (The three doors that carried them on the home page were removed on 2026-10-01.) They are not used for text on paper, for borders, for tints or for gradients. The build has two small exceptions for Clay, recorded under Open Decisions.

**The One Link Colour Rule.** Deep Clay is the only colour that means "this can be followed". It appears on links in reading text and on hover. It is never used as a fill at rest.

## Typography

**Display Font:** Playfair Display (with Noto Serif TC for Chinese, then Georgia, serif)
**Body Font:** Geist (with Noto Sans TC for Chinese, then system-ui, sans-serif)
**Label/Mono Font:** none. Labels are Geist in small spaced capitals. **The one exception:** the Guides cards on the home page name their places in Bebas Neue, capitals (his call, 2026-10-13); nowhere else. Figures use lining numerals, and tabular numerals wherever numbers line up.

**Character:** A high-contrast book serif for the names of places, against a plain modern sans for everything that is read. The serif is always weight 400 in English; emphasis comes from size and from centring, not from bold.

The pages load Playfair Display at weight 400, Geist at 400 to 600, Noto Serif TC at 500 to 600 and Noto Sans TC at 400 to 600. The files are kept with the site in `design 1/fonts/` and named in `design 1/css/fonts.css`, which `tools/fonts.py` writes; no page contacts Google Fonts. The Chinese faces are cut into about a hundred slices each, and a browser fetches only the slices a page needs.

### Hierarchy
- **Display** (serif, 400, `clamp(2.3rem, 1.45rem + 3.4vw, 4.25rem)`, line-height 1.14): page titles, the home page line, the name of a guide shown as a feature (line-height 1.1), the Instagram handle in the footer (line-height 1).
- **Headline** (serif, 400, `clamp(1.75rem, 1.3rem + 1.5vw, 2.4rem)`, line-height 1.14): section headings, headings inside a guide, the place name in the viewer.
- **Title** (serif, 400, 1.5rem, line-height 1.2): the name under a tile (a country or a continent), the heading of the quick facts card. Smaller serif names step down from here: sub-headings in a guide (1.4rem), day numbers and note headings (1.3rem), the site name in the top bar (1.45rem), a photograph's name in its caption (1.05rem to 1.15rem).
- **Lead** (serif, 400, 1.25rem, line-height 1.4): the flowing list of place names without work, and plain rows. The opening paragraph of About is the same voice at 1.45rem.
- **Body** (sans, 400, 1.0625rem, line-height 1.65): reading text. Paragraphs in a guide are at most 40rem wide; sentences under a title are held to between 42 and 54 characters a line. Emphasis is weight 600.
- **Small** (sans, 400, 0.9375rem): tables (line-height 1.55), dates under a title, captions (line-height 1.4), the contents list, viewer data.
- **Caption** (sans, 400, 0.8125rem, Second Ink, tabular figures): the second line of a caption, camera data, the area under a day number, the footer's small print. At weight 500, in capitals with 0.08em spacing, it labels a fact (quick facts, About's facts, "How it was made").
- **Capitals** (sans, 500, 0.78rem, 0.1em spacing, capitals, line-height 1.3): the menu, the language switch, the word "Menu", buttons, the breadcrumb, the small line on a door, the count under a continent, the line inside an empty square, the count in the viewer, "Read the guide" on a feature, table header cells, the contents heading, the viewer's Previous, Next and Close.

### Chinese
Chinese is set by its own rules, switched on when the page language is `zh-Hant`. These are built, not planned.

- Reading text opens to line-height 1.9; tables to 1.75.
- Headings use Noto Serif TC at weight 500, with 0.05em spacing and line-height 1.35. Every serif name in the system (feature, tile, door, caption, day, quick facts heading) steps to weight 500 and gains 0.04em to 0.08em spacing in Chinese.
- Small capitals become 0.875rem with 0.14em spacing, since Chinese has no capitals and needs the size.
- 陳亮元 beside the site name is Noto Serif TC at weight 500, 0.9rem, 0.22em spacing, in Second Ink.
- Chinese strings are set with full-width punctuation and brackets; numbers, times and Latin words keep their own. The build does this for every string (`zh_punct` in `tools/build.py`).
- A phrase that must not break across lines is held together (`.nb`), as in the home page line, which can only break between 像攝影師 and 一樣旅行。

### Named Rules
**The Plain Name Rule.** A title is the place's name: "Barcelona", "Spain", "Europe". Descriptive detail goes in the small line under it.

**The Serif For Names Rule.** The serif is for names and headings, and they are centred. Reading text, tables, labels and controls are sans. The serif is not used for paragraphs, except the one opening paragraph on About.

**The Words Not Icons Rule.** Controls are words: "Menu", "Previous", "Next", "Close", "Read the guide", "Map". There are no icons, arrows or pictograms on controls anywhere in the build.

**The Real Figures Rule.** Camera data, times, dates and prices use tabular lining figures, and every camera value shown is read from the photograph's own file. The capture clock time is not shown.

**The Quiet Punctuation Rule.** No long dashes in either language: a dash that introduces becomes a colon, one that adds on becomes a comma, and ranges use a plain hyphen. At most one middle dot in a line; a list of places reads as a list, with commas. The build applies this to every string (`no_dash_en`, `no_dash_zh`, `few_dots` in `tools/build.py`).

**The Logo Exception.** His logo, 1C (his choice, 2026-11-04), is set in Cormorant Garamond: TUAN at weight 300 with wide spacing, a thin line, PHOTOGRAPHY in capitals at weight 500 spread to TUAN's width. Cormorant appears only in the logo, on the loading screen; it is never used for names, headings or text.

**The Two Languages Rule.** Every string exists in English and in 繁體中文, and neither is a translation afterthought. Nothing ships in one language only.

## Layout

Content sits in one centred column, 88rem at its widest, with a side margin that grows with the window (`clamp(1.15rem, 4.5vw, 4rem)`). Most things inside it are centred and narrower than the column, so the page reads like a magazine spread with wide margins. Spacing uses a six-step scale (0.5, 1, 1.5, 2.5, 5rem, and a large step of 6rem to 9.5rem that grows with the window).

- **Sections:** padded by the large step top and bottom. A section's heading is centred and sits 5rem above its content. Two sections that follow each other on the same ground share one gap, not two.
- **Bands:** a Stone band always reaches both edges of the window, even when the section sits inside the page column.
- **Home:** the opening photograph, which stays in place while the rest of the page is drawn up over it; then the centred intro on paper (its second button goes straight to the guide while there is only one), a window onto a photograph, the wall of photographs on paper (a dozen, one from each country in turn), a second window, the guides as timed cards (one place's photograph filling the window, the next places as a row of cards in front of it), a third window, the footer. Photographs first, then the way in (experiment `home-impeccable`, 2026-10-16). No photograph is shown twice on the page: the wall leaves out the cards' photographs, and a card never repeats the opening photograph. The three colour doors were removed on 2026-10-01 at his call (the menu already leads there); the shelf and the window were added the same day, after the home page of Hello Emilie.
- **Rows of photographs:** rows are worked out when the pages are built (`rows_of()` in `tools/build.py`). Photographs are split into rows of nearly equal total width, about 3.2 square widths each, never one photograph alone in a row, and every photograph grows in proportion to its own shape, so each row fills the column at one height and nothing is trimmed. The gap between photographs is 0.75rem; rows are 2.5rem apart to leave room for captions. A photograph alone in its row is held to 58rem and centred.
- **Gallery:** the portfolio first, a dozen photographs in a tight grid four across with 0.5rem between them; then every country with photographs, each its own wall of rows under its name and count (2026-10-01, his call: divided by country); then the names of the places not photographed yet, on stone.
- **Guides** (once Destinations): the continents travelled, four to a row in a 72rem column, each a square with its name and a count beneath, centred as a group; then the General part (articles for any trip, in a plain list); then the continents not travelled, as names on stone.
- **Feature:** a twelve-column grid. The photograph takes seven columns and the name takes four, with one column of air between them. Every second feature is mirrored.
- **Guide:** the title and lead photograph (up to 74rem wide), then one centred column of 50rem. Paragraphs, lists and notes inside it are held to 40rem. Rows of photographs in a guide break out of the column to 74rem.
- **About:** his name centred as the heading, a line in Second Ink beneath it, then a twelve-column grid: the text on six columns and the facts (home base, countries, camera, lenses) on three. The text is the opening paragraph in the serif, two plain paragraphs, then, below a hairline, one line inviting questions with the Instagram button and his email beside it.

How the layout changes on smaller windows, as built:

| Window width | What changes |
|---|---|
| below 60rem | About's text and facts stack |
| below 56rem | the menu collapses behind the word "Menu"; the viewer stacks, photograph first |
| below 56rem | the continents go two to a row, and stay two to a row on phones; the viewer's words move to a bar at the bottom |
| below 52rem | features become one column; the portfolio grid goes two across |
| below 46rem | the quick facts card sits under its photograph instead of overlapping it |
| below 40rem | photographs stack one per row; tables become short stacks; days become one column |
| below 36rem | continent names step down in size |
| below 34rem | the contents list becomes one column |
| below 26rem | the site name steps down in size |

## Elevation & Depth

The system is flat. Nothing casts a shadow, at rest or on hover, except the cards of the Guides section on the home page, by the owner's choice (2026-10-13; they replaced the books, which had the shadow before). Otherwise depth comes from four things only: the change of ground between paper and stone, the page drawn up over the opening photograph, the quick facts card laid over the edge of a photograph, and the viewer, which replaces the page with the same paper ground.

There is one place with gradients: the opening photograph has a soft darkening at its top edge (14rem tall) and at its bottom edge (12rem tall), so the site name, the menu and the place name can be read in Paper White on any photograph. These are warm near-black fading to nothing (`oklch(20% 0.02 60)` at 50% and 80%). They are not decoration and are not used anywhere else.

### Motion
Motion has three reasons only, in the stylesheet's own words: arriving, leaving the opening photograph, and walking the wall. Everything uses one ease-out curve, `cubic-bezier(0.16, 1, 0.3, 1)`.

- **Arriving, the photograph:** on the home page the opening photograph settles into place once, from very slightly enlarged to its true size, over 2.2 seconds. At the top of a guide the lead photograph is uncovered from its top edge over 1.1 seconds while it settles over 1.6 seconds.
- **Arriving, the words:** the words under or beside that photograph rise into place after it (0.9 seconds each, the first after 0.2 seconds, each next one 0.09 seconds later). Used for the home intro, the guide's title block and About.
- **Leaving the opening photograph:** on the home page the opening photograph stays where it is while the rest of the page, one leaf of paper, is drawn up over it. As that happens the photograph rises slowly, at about a third of the page's speed. The owner asked for this on 2026-09-30; it is carried over from the site as it was before the redesign. The slow rise is tied to scrolling itself and only happens in browsers that support it; in others the photograph simply stays in place.
- **The window:** part way down the home page a second photograph fills the window's width; it is fixed to the screen and the figure is a window cut in the page, so the page is drawn over it, and it drifts slowly upward as the window passes (the script sets `--drift` from the window's place on the screen). Under "reduce motion" it is simply a photograph in the page.
- **Walking the wall:** photographs in a wall or in the portfolio grid, features and tiles rise gently as they enter the window.
- **The Guides cards:** every 4 seconds the first card in the row opens out from its place until it is the whole window (1.2 seconds, clip-path and transform only), the place's name rises in line by line, the row closes up and the counter and white progress line move. The arrows step either way (back shrinks the photograph into the first slot). It waits while out of view, while the tab is hidden, while a photograph is open in the viewer, while the pointer is over it or the keyboard is inside it, and while Pause is pressed; it says nothing to a screen reader while it plays by itself and announces a step the visitor asked for; under "reduce motion" it changes only on the arrows, at once.
- **Under the pointer:** a photograph enlarges very slightly inside its own frame (2%, over 0.9 seconds); a button changes fill; links change colour. Pressing a button moves it down 1px.
- **Opening a photograph:** the photograph travels from its place in the row to its place in the viewer (0.46 seconds; from the photo wall, 0.56 seconds and back again on close). Stepping to the next photograph dims the one on screen to 35% until the next file has arrived.
- **The photo wall:** the one place on the site that moves on its own. Its rows drift sideways without end and the wall parts around the cursor; the owner chose this on 2026-10-07 after Motion's "Moments". It stops under "reduce motion" and the Speed bar can hold it still.
- **Reduce motion:** when the visitor's device asks for reduced motion, none of the above happens. Arriving and rising are not loaded at all, every transition is switched off, and the viewer opens at once.

### Named Rules
**The Flat Rule.** No shadows. Separation is made with a change of ground first, space second, and a 1px hairline third.

**The Three Reasons Rule.** Something moves only when the visitor arrives, when the page is drawn up over the opening photograph, or when a photograph comes into view, plus the small answers to the pointer. Nothing loops and nothing moves on its own, with two exceptions the owner made: the photo wall's drift (2026-10-07) and the Guides cards (2026-10-13). All of it stops under "reduce motion".

## Shapes

Every corner is square. Photographs, buttons, cards, notes, the contents box, the viewer and the focus ring all have no rounding. The one exception is the Guides section on the home page (2026-10-13): its cards are rounded (0.75rem), its button is a pill and its two arrows are circles, a copy of the reference he chose.

Lines are 1px. They separate rows in a list or table, and divide the language switch. The only boxes drawn with an outline are the buttons. The rule under a table's header row is Warm Ink; every other rule is Hairline.

Keyboard focus is a 2px Deep Clay outline set 3px away from the element; on the Slate footer it is Paper White, and on the opening photograph it sits 4px inside the frame, where it can be seen.

## Components

### Top bar
The site name at the left in the serif with 陳亮元 beside it; five menu words and the language switch at the right in small capitals. The bar is 5.5rem tall and scrolls away with the page.
- **Current page:** a 1px underline beneath the word. The same underline appears under a word on hover.
- **Language switch:** EN and 中文 divided by a 1px line. The one in use is Warm Ink, the other Second Ink (on the opening photograph, Paper White at 75%).
- **Over the photograph (home page only):** the bar sits on top of the opening photograph with all its lettering in Paper White and no ground of its own.
- **Small windows (below 56rem):** the word "Menu" opens the menu as a full-width stack under a hairline. On the home page the bar then turns to Warm Paper with Warm Ink lettering so the menu can be read. "Menu" and the language words are at least 2.75rem tall there, and footer links at least 24px tall at every size.
- **Skip link:** the first stop for the keyboard on every page is "Skip to the content", a primary button at the top left that is out of sight until it has focus.
- **Breadcrumb:** on continent, country and guide pages, the way back up (Destinations / Europe / Spain) sits above the title in small capitals, Second Ink, divided by typed slashes. Each word is a link.

### Buttons
Rectangles with capital labels. Padding 1rem by 1.7rem, a 1px outline, labels never wrap.
- **Primary:** Warm Ink fill, Paper White label. Turns Deep Clay under the pointer. Used for "Follow on Instagram" and, in the viewer, "Read the guide".
- **Line:** no fill, Warm Ink outline and label. Fills with Warm Ink under the pointer. Used for the second action on the home page, "See the gallery", and the way out of an empty page.
- **Footer:** Paper White fill with a Slate label. Under the pointer it empties to an outline with a Paper White label.
- **Word controls:** the menu, the language switch and the viewer's Previous, Next and Close are words only, with no fill or outline.

### Photograph with caption
The unit of the whole site. A bare photograph, no frame, no border, no rounding, nothing on top of it. Beneath it, its name in the serif and a second line in small Second Ink: the country on listing pages, the camera data (focal length, aperture, shutter, ISO) inside a guide. Every photograph is a real link to its place in the gallery, so it works without the script; with the script it opens the viewer.

### Opening photograph
The first thing on the home page. It fills the window edge to edge and top to bottom (never shorter than 34rem, never taller than 75rem). Nothing is written across it: no headline, no sentence, no button, no panel. The only lettering on it is the top bar, and one small line at the bottom left giving the place and the country. It opens the viewer like any other photograph. It stays in place as the visitor moves down, and the rest of the page is drawn up over it (see Motion). When the keyboard reaches it from further down the page, the page returns to the top so what has focus can be seen.

### Loading screen
The first thing a visitor sees on the home page, once per visit (version 21 of the logo motion round, his choice on 2026-11-05). On the paper, a thin line runs from left to right as the opening photograph loads: it is the loading bar, it takes at least 2.2 seconds and it waits for the photograph and the logo's face. When it is full, TUAN rises letter by letter above it and PHOTOGRAPHY follows a beat later below it (see The Logo Exception). The paper then thins and the opening photograph shows through it, soft; then the logo and the paper fade and the photograph comes into focus, settling as it always does. About seven seconds in all; a click or a key opens it at once. It is not shown again in the same visit (`sessionStorage`), and never under "reduce motion". The top bar and the photograph's name wait until it opens. Markup from `loader()` in `tools/build.py`, look in the `.loader` section of `style.css`, timing in `js/loader.js`. The other versions are on the review list at `/journey/new/logo-motion/`.

### Window
Full-window photographs dealt out down the home page, one after the intro, one after the wall and one after the guides, so a photograph is behind the page all the way down (his idea, 2026-10-01). Each fills the whole window like the opening one (never shorter than 34rem, never taller than 75rem) and is named in `data/site.json` (`"windows"`, in order; since 2026-10-16 the aurora over New Zealand, Mount Fuji with the bullet train, and the Matterhorn, the last thing before the footer). A window's subject must sit in the middle quarter of the photograph: on a phone only that much of a landscape photograph shows. Like the opening photograph, nothing is written across it but one small line at the bottom left with its place and country, over the same darkening foot; it opens the viewer. The photograph is fixed to the screen and the figure is a window cut in the page, so the page is drawn over it; as the window passes, the photograph drifts slowly upward, at a fraction of the page's speed, like the opening one (the script sets `--drift` from the window's place on the screen on each scroll; nothing moves under "reduce motion"). It is left out of the wall below.

### Intro
Directly under the opening photograph, on paper, centred: the line "Travel like a photographer." at Display size, one sentence in Second Ink held to 42 characters a line, and two buttons (primary and line) side by side.

### Doors (removed)
Three flat colour blocks to Gallery, Destinations and About stood on the home page until 2026-10-01, when the owner removed them: the menu already leads to the same pages. The earth colours now appear only on the shelf's spines and the footer.

### Timed cards (the guides on the home page)
Since 2026-10-13, his call, after Giulio Cuscito's "Timed Cards Opening" (Dribbble): a copy of that reference, kept as experiment `timed-cards`. The section fills the window (never shorter than 38rem, never taller than 75rem) on a Stone band under the heading "Guides". One place's photograph (the shelf entry's `cover`) fills it, darkened from the left. At the left, a short white rule, the continent (always the continent, so every card's small line is the same kind of thing), the place's name in Bebas Neue capitals one word to a line (中文: Noto Sans TC 600), one line saying what his photographs there show ("Photographs of …", built from the photographs' own names, each subject once), and a pill button: "Read the guide" for a written guide, "See the photographs" otherwise. From 41% across, the next places as cards (2:3, rounded 0.75rem, a soft shadow), each with a short rule, its continent and its name in Bebas Neue on its foot; the row runs off the right edge. Clicking a card brings its place forward (the cards are hidden from screen readers; the arrows do the same). Under the cards, two round arrows, the word Pause (暫停; Play / 播放 while paused), a white progress line and the counter ("02 / 18"), on a second shade that rises from the foot so they read on any photograph. Barcelona is first and arrives without motion; places without a photograph are left out. Motion is under Motion. Built by `timed_cards()` in `tools/build.py` (the first state as plain HTML, the rest as data); the script sets `--j`, each card's slot. On phones the words sit at the top and the cards below them. The shelf of books it replaced (`.shelf`, `.book`, `shelf()`) is retired; its classes remain, unused; the last look is at the tag `before-timed-cards-2026-10-13`.

### Feature (a guide)
A guide shown large: its photograph beside its plain name at Display size, one line of facts in Second Ink, and the words "Read the guide" in small capitals with a rule beneath. The whole block is the link. The photograph keeps its own shape.

### Wall of rows
Rows of photographs with captions, as described under Layout. In a row every caption is set the same way: the name, then the place under it. Used on the home page (where a guide's lead photograph is left to the shelf and not repeated), the gallery (one wall per country) and country pages.

### Photo wall (the Gallery page)
Since 2026-10-07 the Gallery page is one screen: every photograph on the site as a small print, in close rows that run past every edge of the window and drift sideways without end, one row to the left, the next to the right, each at its own slow pace (about 9 to 13px a second at the default speed). Prints keep their own shape and sit 12px apart with a hairline edge, each leaning up to 1.5° either way, the same lean on every visit. The cursor parts the wall as it moves and the print nearest it rises toward it, a third of the screen across, its name and place beneath it, never on it. A click opens it in the viewer, the print growing from the wall into place and shrinking back on close. Bottom left, a small capital line ("A photography wall"), the title and one sentence, on a ramp of the page's own paper that is solid behind the words and fades into the wall over about 58rem across and 30rem up (his call of 2026-10-08: the veil is only here, and it is a gradient, not a cut). The top bar and the bars sit on the bare wall. Bottom right, five bars, each a word, a hairline and a number: Size (×0.6 to ×2.4, starts ×1.2; bigger prints re-lay the wall in fewer rows, never overlapping), Gap (0 to 60px, starts 12), Tilt (0° to 8°, starts 1.5°), Speed (×0 to ×3, starts ×0.8), Vary (×0 to ×3, starts ×1: how far the rows' paces differ from one another; at ×0 every row moves at the same 11px a second). Under the top bar at the right, a Dark word. The defaults came from a taste pass on 2026-10-07 over eight frames. The top bar sits over the wall in ink (`.top--ink`); there is no footer on this page. Under "reduce motion" the rows stand still and nothing parts. Tried first as `elements/gallery/`, merged at the owner's word, the test copy removed on 2026-10-08. The script sets `--x --y --w --h --r --op` on each print.

### Portfolio grid (retired 2026-10-07)
Until the photo wall, the first thing in the gallery was every photograph in a tight grid, four across, each fitted to a 3 by 2 opening. The classes (`.grid`) remain in the stylesheet for the country pages' use.

### Continents (guides)
Guides shows the continents travelled as tiles, four to a row: a square opening, the continent's name centred beneath as a heading in the serif, and a count in small capitals ("5 countries"), worked out by the build. The photograph is the one named for the continent in `data/site.json` (`"photo"`), or the first from any of its countries. A continent with countries but no photograph yet keeps its place as a plain Stone square that says so ("No photographs yet"): no stand-in image. The continents not travelled are not tiles and not links: they are names on a Stone band under "Not travelled yet". The page sentence states the counts the build knows ("16 countries, by continent. One guide so far: Barcelona."). The seven-square grid with taglines was replaced on 2026-10-01 after the critique found five blank squares and copy about places not visited.

### Tiles
On a continent page and in the gallery, each country with work is a photograph in a 3 by 2 opening with its name centred beneath in the serif. Tiles are a list. Under the pointer the name turns Deep Clay, so a tile with no photograph answers too. A photograph beside its own name carries no spoken description of its own (`alt=""`), so a link is read as the place, not as a sentence about the photograph. Tiles are 20rem to 28rem wide and centred as a group.

### Names
A centred, flowing list of place names in the serif, in Second Ink, on a Stone band. It lists the places that have no photographs on the site yet, under a plain heading that says so. Names that lead somewhere are links with the hairline underline every text link has; the continents not travelled are plain names.

### Guide column
A guide is one centred column: breadcrumb, serif title, the dates in small Second Ink, a wide lead photograph with its caption, the contents list, then sections. Section headings are centred serif at Headline size with generous space above. Links in the text are Deep Clay with a lighter underline. Plain lists are rows divided by hairlines.

### Contents list
A Stone box at the top of a guide. A small capital heading, then the sections numbered with tabular figures in two columns. The section being read turns Deep Clay.

### Quick facts card
The guide's quick facts are a Card Paper card laid over the right edge of a portrait photograph, set 3rem lower than the photograph's top. Inside: a serif heading, then each fact as a small capital label with its answer beneath, divided by hairlines. Below 46rem the card sits under the photograph. A fact with no answer is left out by the build.

### Sheet (table)
Comparison tables in a guide. No fills, no vertical lines, no outer border. Header cells in small capitals over a Warm Ink rule; a hairline between rows; the first column at weight 500. The recommended cell is marked by weight 500 only. Times and prices do not wrap and use tabular figures. Below 40rem each row becomes a short stack and the header row is hidden from sight but kept for screen readers.

### Notes
An aside in a guide: a Stone box with square corners and no border, a serif heading (1.3rem) and text beneath.

### Days
The route, one block per day, divided by hairlines. At the left in an 8.5rem column, the day in the serif with its area beneath in small Second Ink; at the right the text, then a quiet line of light times in tabular figures.

### Viewer
Opening a photograph shows it whole on the page's own paper ground, filling the window. The photograph is at the left, as large as the window allows. At the right, a column 17rem to 23rem wide: Previous, Next and Close as words, the place name at Headline size, where it is, then "How it was made" as a ruled list (best time, focal length, aperture, shutter, ISO, lens, camera). Below that a short note, the primary button to the guide, and a Deep Clay link to the map pin. Between Previous and Next, a count ("3 / 8") in Second Ink. The photograph is served in the same sized copies the pages use. Arrow keys step between photographs, a sideways swipe steps on touch, every photograph has its own address (`#view-<id>`), opening adds one step to the history so the phone's Back closes the photograph instead of leaving the site, focus lands on Close, the place name is announced when it changes, and closing returns focus to the photograph it came from. Below 56rem the photograph comes first, the word bar sits fixed at the bottom of the window with its words 2.75rem tall, and the way to the guide comes directly under the place name, before the camera data.

### Footer
A flat Slate block closes every page. Centred: the Instagram handle at Display size in the serif, the footer button beneath it, then a thin rule and a small row with the menu at the left and the copyright line at the right.

### Empty state and plain rows
A page with no work says so in one centred sentence in Second Ink, at most 46 characters a line, with a line button that leads somewhere with work. Planned articles are plain rows: the title in the serif at the left, "Not written yet" at the right, divided by hairlines. No stand-in images.

## Do's and Don'ts

### Do:
- **Do** keep the opening photograph clear: the top bar and one small place line are the only lettering on it.
- **Do** show photographs bare, with their names beneath them.
- **Do** let `rows_of()` lay out any row of photographs, so each row fills the column and no photograph is trimmed.
- **Do** call a place by its plain name, and put detail in the small line under it.
- **Do** write every string in both languages, and set Chinese by its own rules: open line-height, weight 500 serif, full-width punctuation.
- **Do** alternate paper and stone to tell sections apart.
- **Do** use clay, olive and slate as whole flat blocks with Paper White lettering.
- **Do** take every colour from the eleven tokens in the stylesheet.
- **Do** keep every corner square.
- **Do** label every control with a word.
- **Do** set camera data, times, dates and prices in tabular lining figures, and show only values read from the photograph's file.
- **Do** say plainly, in one sentence, when work does not exist yet.
- **Do** keep all motion inside the "reduce motion" switch.
- **Do** edit `data/site.json`, `content/` and `tools/build.py`, then rebuild; the HTML pages are written out by the build.

### Don't:
- **Don't** write a headline, a sentence, a button or a panel across the opening photograph. The owner asked for this on his original site because the words blocked the image.
- **Don't** set names, labels or badges on top of any photograph. (The Guides cards are a copy of a reference he chose, 2026-10-13: the place's name, a line and a button sit on its photograph, and each card's name sits on its foot. The photo wall's title sits on a ramp of paper over the wall, the owner's call of 2026-10-07 and 10-08; no word is set on a single photograph.)
- **Don't** trim a photograph in a row to make a grid even. The portfolio grid and the square openings are the only even grids.
- **Don't** frame, round, border or shadow a photograph.
- **Don't** add a dark theme or a theme switch, beyond the Gallery page's own Dark word (2026-10-07).
- **Don't** add icons, arrows or pictograms to controls (the Guides cards' two arrows are the one exception, 2026-10-13).
- **Don't** round anything, including buttons, outside the Guides cards.
- **Don't** add shadows, or gradients other than the two on the opening photograph.
- **Don't** use clay, olive or slate for reading text or as tints.
- **Don't** put a small capital line above a heading as decoration. The only line that sits above a title is the breadcrumb, and it is made of real links.
- **Don't** add a third typeface, or bold the serif in English. (Bebas Neue lives only in the Guides cards.)
- **Don't** add motion that loops or plays on its own, beyond the photo wall's drift (2026-10-07) and the Guides cards (2026-10-13).
- **Don't** use long dashes, or more than one middle dot in a line.
- **Don't** fill an empty place with a stand-in image, an invented guide, invented camera data, or a claim the site cannot yet support.

## Open Decisions and Known Gaps

These are recorded as open. None of them is a settled part of the system.

### Waiting on the owner
- **Destinations lead sentence and continent taglines.** Rewritten on 2026-10-01 in the experiment to what the build can state ("16 countries, by continent. One guide so far: Barcelona."); the taglines for Africa, Antarctica and South America were removed and the tiles no longer carry a sentence. The owner approved the wording on 2026-10-01.
- **The guide's "SIM / data" fact.** It has no value yet. The build leaves the row out of the page until he supplies one, so the quick facts card shows only facts that have answers.
- **Carried from the product notes:** which country gets the next guide, and whether a newsletter sign-up is wanted.

### Decided by the owner on 2026-09-28
- **Typeface hosting.** The typefaces are kept with the site, in `design 1/fonts/`.
- **About biography.** Rewritten on 2026-10-16 from facts he had given, approved by him: who he is, what he shoots and leaves out, why the guides can be trusted. Change it only at his word.
- **Contact email.** Published on About only, beside the Instagram button at the end of the text (his call, 2026-10-15).

### Recorded as built, not as rules to extend
- **Where a photograph is trimmed.** Four places. The opening photograph is fitted to the window, so its edges are trimmed to the window's shape (on a phone held upright, a good deal of its width). Country tiles are fitted to a 3 by 2 opening. The portfolio grid fits every photograph to a 3 by 2 opening, and the continents to a square; both are the owner's own request of 2026-09-30. The feature photograph is not trimmed; it keeps its own shape, as do the guide's lead photograph, the quick facts photograph and every photograph in a row. The whole photograph is always available in the viewer. None of these is a licence to trim elsewhere.
- **The hover enlargement.** A photograph grows 2% inside its frame under the pointer, which hides a sliver of its edges for that moment.
- **Clay outside the blocks.** The stylesheet's own rule says clay, olive and slate appear only as flat blocks. Clay is also the ground of selected text. It is small and built; it is not a reason to use the earth colours as accents.
- **The breadcrumb on continent pages.** There it holds one word ("Guides") in small capitals above the title, and at a glance it looks like a decorative label. It is a working link back to Guides. It is recorded as navigation only.
- **Rising on scroll, and the slow rise of the opening photograph.** Both depend on a browser feature that not every browser has. Where it is missing, photographs are simply in place, and the opening photograph stays still while the page is drawn over it.
- **The browser's bar colour.** Each page sets it with a typed value (`#f7f2e9`) in `tools/build.py`. It is a close match to Warm Paper, not taken from the token.
- **The darkening on the opening photograph.** Its colour is typed into the stylesheet and is not one of the eleven tokens.
- **Unused helpers.** The stylesheet defines a small helper (`.quiet`) that no page uses at present; `.caps` is used by the photo wall's words.
- **Planned titles.** The General part of Guides lists three planned articles, each marked "Not written yet".
