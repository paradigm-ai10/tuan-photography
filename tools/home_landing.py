#!/usr/bin/env python3
"""Trial ways into the home page, built on the live page (started 2026-11-12).

His ask that day: "https://spaincollection.com/ omg i actually like this landing page, open an experiment for this".
Each version is the live home page as tools/build.py wrote it (design 1/index.html: the same top bar, opening
photograph, page, footer, viewer and language switch) with its way in replaced: the loading screen keeps his name, and
the wall and the film's first screen give way to the trial's first screen. They are written to
design 2/new/home-redesign/ for the openings' review list (openings.html) and never touch design 1.

    python3 tools/build.py && python3 tools/home_landing.py

A note on a version is answered with a new version beside it (add to VERSIONS), never an edit in place.
Styles: design 2/new/home-redesign/spain.css. Script: spain.js.
"""
import re

import build as B
from home_content import OUT, UP, rel

# the five photographs round the sentence, in her order: left top, the wide one at the top, right top, left foot, right foot
FRAME = ["queensboro-train", "fuji-lake", "tekapo-stars", "sapa-terraces", "zermatt-dusk"]
LINE = ("Landscape photographs by Thomas Chen", "陳亮元的風景攝影")

# the second pass (w-true), after the original and w-frame were photographed side by side at the same moments: her
# sentence is three lines with underlined links and a button under it, and a large title lies over the film
SAY = ('<a href="gallery.html">Landscape photographs</a> by Thomas Chen. Open any one to see <a href="guides.html">how it was made</a>',
       '陳亮元的<a href="gallery.html">風景攝影</a>。點開任何一張，看它是<a href="guides.html">怎麼拍的</a>')
ACT = ("gallery.html", "See the gallery", "看全部作品")
TITLE = (("Barcelona", "巴塞隆納"), ("July 2026", "2026 年 7 月"))

VERSIONS = [   # (file, ground, kind, title en, title zh)
    ("w-frame", "day", "", "Photographs round a sentence, the film grows (white)", "照片圍著一句話，影片長大（白底）"),
    ("w-frame-night", "night", "", "Photographs round a sentence, the film grows (black)", "照片圍著一句話，影片長大（黑底）"),
    ("w-true", "day", "true", "Round a sentence, closer to the original (white)", "圍著一句話，更像原版（白底）"),
    ("w-true-night", "night", "true", "Round a sentence, closer to the original (black)", "圍著一句話，更像原版（黑底）"),
    # third pass, his word: "i feel like putting the Tuan Photography as the mid caption". His logo in the middle
    # where the sentence was, at its loading-screen size and place, so the name stays and the photographs open round it
    ("w-mark", "day", "mark", "Round your name (white)", "圍著你的名字（白底）"),
    ("w-mark-night", "night", "mark", "Round your name (black)", "圍著你的名字（黑底）"),
    # fourth pass, his words: the film should start when he starts to scroll (its first scene was already gone), and
    # the old captions back in place of the large title, at the top of the film, which is the part in view first
    ("w-hold", "day", "hold", "Round your name, the film waits for the scroll (white)", "圍著你的名字，影片等你捲才開始（白底）"),
    ("w-hold-night", "night", "hold", "Round your name, the film waits for the scroll (black)", "圍著你的名字，影片等你捲才開始（黑底）"),
    # fifth pass, his words, choosing between the live opening and w-hold-night: "make both of it animation not
    # scrolling". The same screen and move, playing by itself; the page then scrolls on from the film as the live one
    ("w-play", "day", "play", "Round your name, it plays by itself (white)", "圍著你的名字，自己播（白底）"),
    ("w-play-night", "night", "play", "Round your name, it plays by itself (black)", "圍著你的名字，自己播（黑底）"),
    # sixth pass, his notes on w-play: the photographs nearer the middle so each shows whole, the name centred, and
    # less waiting after the name is up (spain-near.css)
    ("w-near", "day", "near", "Round your name, photographs nearer, quicker (white)", "圍著你的名字，照片靠近、快一點（白底）"),
    ("w-near-night", "night", "near", "Round your name, photographs nearer, quicker (black)", "圍著你的名字，照片靠近、快一點（黑底）"),
    # seventh pass, his notes on w-near: symmetric top to foot and side to side, each photograph running past the
    # screen's edge (spain-edge.css). Black only from here on, his word the same evening
    ("w-edge-night", "night", "edge", "Round your name, symmetric, past the edges (black)", "圍著你的名字，對稱、超出邊緣（黑底）"),
    # eighth pass, his note on w-edge with a screenshot of the original: every photograph whole, flush to the edge
    ("w-flush-night", "night", "flush", "Round your name, symmetric, flush to the edges (black)", "圍著你的名字，對稱、貼齊邊緣（黑底）"),
    # ninth pass, his note on w-flush: the photographs should appear all at once, as in the original
    ("w-together-night", "night", "together", "Round your name, flush, all appearing at once (black)", "圍著你的名字，貼齊邊緣，同時出現（黑底）"),
    # tenth pass, his note on w-together: "pics bigger"
    ("w-big-night", "night", "big", "Round your name, larger photographs (black)", "圍著你的名字，照片大一點（黑底）"),
    # eleventh pass, his note on w-big: "appear fade slower a little bit"
    ("w-slow-night", "night", "slow", "Round your name, larger, a slower fade (black)", "圍著你的名字，照片大、淡入慢一點（黑底）"),
]

# the live opening with his note on its timing (less waiting after the name), as a trial page beside the live one
WALL = [("w-wall-quick-night", "night", "The wall, quicker after the name (black)", "照片牆，名字之後快一點（黑底）"),
        ("w-wall-quick", "day", "The wall, quicker after the name (white)", "照片牆，名字之後快一點（白底）")]


# each kind of version is the one before it plus one layer (a stylesheet, a mark on <html>); "" is the first pass,
# "true" the second, and from "mark" on each adds its own. LAYERS[kind] is every layer up to and including kind.
_STEPS = [("true", "spain-true.css", "true"), ("mark", "spain-mark.css", "mark"), ("hold", "spain-hold.css", "hold"),
          ("play", "spain-play.css", "play"), ("near", "spain-near.css", "near"), ("edge", "spain-edge.css", "edge"),
          ("flush", "spain-flush.css", "flush"), ("together", "spain-together.css", "together"), ("big", "spain-big.css", "big"),
          ("slow", "spain-slow.css", "slow")]
_SKIP = {"flush": {"edge"}, "together": {"edge"}, "big": {"edge"}, "slow": {"edge"}}   # flush and on replace edge, not add to it
LAYERS = {}
for _i, (_k, _c, _a) in enumerate(_STEPS):
    LAYERS[_k] = [s for s in _STEPS[:_i + 1] if s[0] not in _SKIP.get(_k, set())]


def has(kind, layer):
    return any(s[0] == layer for s in LAYERS.get(kind, []))


def letters(text, lang, key):
    return f'<span lang="{lang}" data-set="{key}">' + "".join(f'<span class="sp-ch">{B.e(c)}</span>' for c in text) + "</span>"


def first_screen(kind=""):
    en, zh = {}, {}
    film = B.home_film(en, zh)
    video = re.search(r"<video.*?</video>", film, re.S).group(0)
    caps = re.search(r'<p class="hr-cap".*?</p>', film, re.S).group(0)
    photos = "".join(
        f'<figure class="sp__p sp__p--{i}" style="--i: {i}"><img src="images/web/1280/{B.SLIDES[s]["file"]}" alt="" decoding="async"></figure>'
        for i, s in enumerate(FRAME))
    if kind:
        title = "".join(f'<span class="sp-title__l{" sp-title__l--2" if i else ""}">{letters(a, "en", "en")}{letters(b, "zh-Hant", "zh")}</span>'
                        for i, (a, b) in enumerate(TITLE))
        logo = ('<div class="sp-words"><p class="sp-mark" role="img" aria-label="tuan photography"><span class="sp-mark__name">'
                + "".join(f"<span>{c}</span>" for c in "TUAN") + '</span><span class="sp-mark__line"></span><span class="sp-mark__sub">'
                + "".join(f"<span>{c}</span>" for c in "photography") + "</span></p></div>")
        say = logo if has(kind, "mark") else (f'<div class="sp-words"><div class="sp-say"><h1><span lang="en">{SAY[0]}</span><span lang="zh-Hant">{SAY[1]}</span></h1>'
               f'<a class="btn" href="{ACT[0]}">{B.both(*ACT[1:])}</a></div></div>')
        over = "" if has(kind, "hold") else f'<div class="sp__veil"></div><p class="sp-title">{title}</p>'
        return (f'<section class="sp" aria-label="{B.e(en["filmLabel"])}" data-i18n-aria="filmLabel">{photos}'
                f'<div class="sp__film" style="--i: 5">{video}{over}{caps}</div>{say}</section>\n'
                '<div class="sp-run" aria-hidden="true"></div>')
    return (f'<section class="sp" aria-label="{B.e(en["filmLabel"])}" data-i18n-aria="filmLabel">{photos}'
            f'<div class="sp__film" style="--i: 5">{video}{caps}</div></section>\n'
            f'<div class="sp-words"><h1>{B.both(*LINE)}</h1></div>\n<div class="sp-run" aria-hidden="true"></div>')


def build():
    live = (B.ROOT / "design 1" / "index.html").read_text(encoding="utf-8")
    mark = re.search(r'<div class="hr-load__mark">.*?</div>', live, re.S).group(0)
    load = (f'<div class="hr-load" aria-hidden="true">\n  <div class="hr-load__paper"></div>\n  {mark}\n</div>\n'
            '<script>if (!/[?&]still\\b/.test(location.search) && !matchMedia("(prefers-reduced-motion: reduce)").matches) '
            'document.documentElement.classList.add("hr-loading");</script>\n')
    page, n = re.subn(r'<div class="hr-load" aria-hidden="true">.*?</script>\n', lambda m: load, live, count=1, flags=re.S)
    assert n == 1, "the loading screen was not found"
    assert len(re.findall(r'<section class="hr-open".*?</section>', page, flags=re.S)) == 1, "the film's first screen was not found"
    page, n = re.subn(r'<script src="js/opening\.js[^"]*"[^>]*></script>', "", page, count=1)
    assert n == 1, "the opening's script was not found"
    base = page
    for name, ground, kind, t_en, t_zh in VERSIONS:
        page = rel(re.sub(r'<section class="hr-open".*?</section>', lambda m: first_screen(kind), base, count=1, flags=re.S))
        css = "".join(f'  <link rel="stylesheet" href="{f}?v={B.STAMP}">\n' for f in ["spain.css"] + [s[1] for s in LAYERS.get(kind, [])])
        js = "spain-true.js" if kind else "spain.js"
        mark = "".join(' data-sp-kind="true"' if s[2] == "true" else f' data-sp-{s[2]}' for s in LAYERS.get(kind, []))
        html = page.replace('<html lang="en" data-root="">', f'<html lang="en" data-root="{UP}" data-sp="{ground}"{mark}>', 1)
        assert html != page
        html = re.sub(r"<title>.*?</title>", f"<title>{B.e(t_en)} {B.e(t_zh)} · tuan photography 陳亮元</title>", html, count=1)
        html = html.replace("</head>", f'{css}  <meta name="robots" content="noindex">\n</head>', 1)
        html = html.replace("</body>", f'<script src="{js}?v={B.STAMP}"></script>\n<link rel="stylesheet" href="review-kit/bar.css">\n'
                            '<script src="review-kit/words.js"></script>\n<script src="review-kit/store.js"></script>\n'
                            '<script src="review-kit/bar.js" data-name="home-redesign" data-manifest="review-manifest-openings.json"></script>\n</body>', 1)
        (OUT / f"{name}.html").write_text(html, encoding="utf-8")
        print("wrote", f"design 2/new/home-redesign/{name}.html")
    # the live page itself, its opening playing on every load, with the quicker copy of its script
    for name, ground, t_en, t_zh in WALL:
        page, n = re.subn(r'<div class="hr-load" aria-hidden="true">.*?</script>\n', lambda m: re.search(r'<div class="hr-load" aria-hidden="true">.*?</script>\n', live, re.S).group(0).replace(
            re.search(r"<script>.*?</script>", live, re.S).group(0), '<script>if (!/[?&]still\\b/.test(location.search) && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("hr-loading");</script>'), live, count=1, flags=re.S)
        assert n == 1
        page, n = re.subn(r'<script src="js/opening\.js[^"]*"[^>]*></script>', f'<script src="opening-quick.js?v={B.STAMP}"></script>', page, count=1)
        assert n == 1
        page = re.sub(r'data-src="(?!http|/|\.\./)([^"]*)"', lambda m: f'data-src="{UP}{m.group(1)}"', rel(page))   # the wall's photographs and film load late, from data-src
        html = page.replace('<html lang="en" data-root="">', f'<html lang="en" data-root="{UP}" data-wall="{ground}">', 1)
        assert html != page
        html = html.replace(f'src="{UP}opening-quick.js', 'src="opening-quick.js', 1)   # the trial's own copy, beside the page
        html = re.sub(r"<title>.*?</title>", f"<title>{B.e(t_en)} {B.e(t_zh)} · tuan photography 陳亮元</title>", html, count=1)
        html = html.replace("</head>", f'  <link rel="stylesheet" href="wall-quick.css?v={B.STAMP}">\n  <meta name="robots" content="noindex">\n</head>', 1)
        html = html.replace("</body>", '<link rel="stylesheet" href="review-kit/bar.css">\n<script src="review-kit/words.js"></script>\n<script src="review-kit/store.js"></script>\n'
                            '<script src="review-kit/bar.js" data-name="home-redesign" data-manifest="review-manifest-openings.json"></script>\n</body>', 1)
        (OUT / f"{name}.html").write_text(html, encoding="utf-8")
        print("wrote", f"design 2/new/home-redesign/{name}.html")


if __name__ == "__main__":
    build()
