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

VERSIONS = [   # (file, ground, title en, title zh)
    ("w-frame", "day", "Photographs round a sentence, the film grows (white)", "照片圍著一句話，影片長大（白底）"),
    ("w-frame-night", "night", "Photographs round a sentence, the film grows (black)", "照片圍著一句話，影片長大（黑底）"),
]


def first_screen():
    en, zh = {}, {}
    film = B.home_film(en, zh)
    video = re.search(r"<video.*?</video>", film, re.S).group(0)
    caps = re.search(r'<p class="hr-cap".*?</p>', film, re.S).group(0)
    photos = "".join(
        f'<figure class="sp__p sp__p--{i}" style="--i: {i}"><img src="images/web/1280/{B.SLIDES[s]["file"]}" alt="" decoding="async"></figure>'
        for i, s in enumerate(FRAME))
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
    page, n = re.subn(r'<section class="hr-open".*?</section>', lambda m: first_screen(), page, count=1, flags=re.S)
    assert n == 1, "the film's first screen was not found"
    page, n = re.subn(r'<script src="js/opening\.js[^"]*"[^>]*></script>', "", page, count=1)
    assert n == 1, "the opening's script was not found"
    page = rel(page)
    for name, ground, t_en, t_zh in VERSIONS:
        html = page.replace('<html lang="en" data-root="">', f'<html lang="en" data-root="{UP}" data-sp="{ground}">', 1)
        assert html != page
        html = re.sub(r"<title>.*?</title>", f"<title>{B.e(t_en)} {B.e(t_zh)} · tuan photography 陳亮元</title>", html, count=1)
        html = html.replace("</head>", f'  <link rel="stylesheet" href="spain.css?v={B.STAMP}">\n  <meta name="robots" content="noindex">\n</head>', 1)
        html = html.replace("</body>", f'<script src="spain.js?v={B.STAMP}"></script>\n<link rel="stylesheet" href="review-kit/bar.css">\n'
                            '<script src="review-kit/words.js"></script>\n<script src="review-kit/store.js"></script>\n'
                            '<script src="review-kit/bar.js" data-name="home-redesign" data-manifest="review-manifest-openings.json"></script>\n</body>', 1)
        (OUT / f"{name}.html").write_text(html, encoding="utf-8")
        print("wrote", f"design 2/new/home-redesign/{name}.html")


if __name__ == "__main__":
    build()
