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
]


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
        say = logo if kind == "mark" else (f'<div class="sp-words"><div class="sp-say"><h1><span lang="en">{SAY[0]}</span><span lang="zh-Hant">{SAY[1]}</span></h1>'
               f'<a class="btn" href="{ACT[0]}">{B.both(*ACT[1:])}</a></div></div>')
        return (f'<section class="sp" aria-label="{B.e(en["filmLabel"])}" data-i18n-aria="filmLabel">{photos}'
                f'<div class="sp__film" style="--i: 5">{video}<div class="sp__veil"></div><p class="sp-title">{title}</p>{caps}</div>{say}</section>\n'
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
        css = "".join(f'  <link rel="stylesheet" href="{f}?v={B.STAMP}">\n' for f in (["spain.css"] + (["spain-true.css"] if kind else []) + (["spain-mark.css"] if kind == "mark" else [])))
        js = "spain-true.js" if kind else "spain.js"
        mark = (' data-sp-kind="true"' + (" data-sp-mark" if kind == "mark" else "")) if kind else ""
        html = page.replace('<html lang="en" data-root="">', f'<html lang="en" data-root="{UP}" data-sp="{ground}"{mark}>', 1)
        assert html != page
        html = re.sub(r"<title>.*?</title>", f"<title>{B.e(t_en)} {B.e(t_zh)} · tuan photography 陳亮元</title>", html, count=1)
        html = html.replace("</head>", f'{css}  <meta name="robots" content="noindex">\n</head>', 1)
        html = html.replace("</body>", f'<script src="{js}?v={B.STAMP}"></script>\n<link rel="stylesheet" href="review-kit/bar.css">\n'
                            '<script src="review-kit/words.js"></script>\n<script src="review-kit/store.js"></script>\n'
                            '<script src="review-kit/bar.js" data-name="home-redesign" data-manifest="review-manifest-openings.json"></script>\n</body>', 1)
        (OUT / f"{name}.html").write_text(html, encoding="utf-8")
        print("wrote", f"design 2/new/home-redesign/{name}.html")


if __name__ == "__main__":
    build()
