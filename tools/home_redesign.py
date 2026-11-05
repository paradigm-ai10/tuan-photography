#!/usr/bin/env python3
"""Writes the three home-page directions of the home redesign (2026-11-05) into
design 2/new/home-redesign/: a-film.html, b-prints.html, c-drawn.html.

    python3 tools/home_redesign.py

His brief: sophisticated, elevated, never AI-made; built from the references he chose
(Martha King for A, Mathilde de Chiara for B, Belgrade Arbor for C). The photographs, names
and places come from data/site.json; the words are the site's own (the home page and the
tab roles in PRODUCT.md), in English and 中文. Rerun after changing a photograph's name.
"""
import json
from html import escape as e
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design 2" / "new" / "home-redesign"
SITE = json.loads((ROOT / "data" / "site.json").read_text(encoding="utf-8"))
SLIDES = {s["id"]: s for s in SITE["slides"]}
IMG = "../../../images/web/"   # design 1's photographs, as served on 8642
PAGES = "../../../"            # design 1's pages


def both(en, zh):
    return f'<span lang="en">{en}</span><span lang="zh-Hant">{zh}</span>'


def fig(sid, cls="", sizes="(max-width: 48rem) 92vw, 60vw"):
    s = SLIDES[sid]
    f = s["file"]
    src = f'{IMG}640/{f} 640w, {IMG}1280/{f} 1280w, {IMG}{f} {max(s["w"], s["h"])}w'
    alt = e(s["alt"]["en"]) if "alt" in s else ""
    return (f'<figure class="hr-fig hr-in {cls}"><a href="{PAGES}gallery.html">'
            f'<img src="{IMG}1280/{f}" srcset="{src}" sizes="{sizes}" width="{s["w"]}" height="{s["h"]}" alt="{alt}" loading="lazy" decoding="async"></a>'
            f'<figcaption><b>{both(e(s["place"]["en"]), e(s["place"]["zh"]))}</b>'
            f'<span>{both(e(s["where"]["en"]), e(s["where"]["zh"]))}</span></figcaption></figure>')


def say(en, zh, cls="hr-say"):
    return f'<section class="{cls}"><p class="hr-in">{both(en, zh)}</p></section>'


SAY1 = ("Landscape photographs by Thomas Chen.", "陳亮元的風景攝影。")
SAY2 = ("Open any one to see how it was made.", "點開任何一張，看它是怎麼拍的。")
DOORS = [
    ("gallery.html", "Gallery", "作品集", "Every photograph.", "所有的照片。"),
    ("journey/", "Journey", "旅程", "Every trip, along its route.", "每一趟旅程，沿著路線看。"),
    ("guides.html", "Guides", "攻略", "Where to stand and when, place by place.", "每個地方，站在哪裡、什麼時候去。"),
]


def letters(word, cls, numbered=False):
    inner = "".join(f'<span style="--i: {i}">{c}</span>' if numbered else f"<span>{c}</span>" for i, c in enumerate(word))
    return f'<span class="{cls}">{inner}</span>'


def mark(cls):
    """The logo, 1C: TUAN, a line, PHOTOGRAPHY spread to TUAN's width."""
    return (f'<span class="{cls}__name">TUAN</span><span class="{cls}__line"></span>'
            f'{letters("photography", cls + "__sub")}')


def loader(extra=""):
    return f"""<div class="hr-load" aria-hidden="true">
  <div class="hr-load__paper"></div>{extra}
  <div class="hr-load__mark">{letters("TUAN", "hr-load__name", True)}<span class="hr-load__line"></span>{letters("photography", "hr-load__sub")}</div>
</div>
<script>if (!/[?&]still\\b/.test(location.search) && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("hr-loading");</script>
"""


def top():
    menu = "".join(f'<a class="caps" href="{PAGES}{href}">{both(en, zh)}</a>'
                   for href, en, zh, _, _ in DOORS + [("about.html", "About", "關於我", "", "")])
    return f"""<header class="hr-top">
  <a class="hr-mark" href="./" aria-label="tuan photography">{mark("hr-mark")}</a>
  <nav class="hr-menu" aria-label="Menu">{menu}
    <span class="hr-lang"><button class="caps" type="button" data-lang="en">EN</button><button class="caps" type="button" data-lang="zh">中文</button></span>
  </nav>
</header>"""


def doors():
    rows = "".join(f'<li><a class="hr-door hr-in" href="{PAGES}{href}"><b>{both(en, zh)}</b><span>{both(den, dzh)}</span></a></li>'
                   for href, en, zh, den, dzh in DOORS)
    return f'<nav class="hr-doors" aria-label="The way in"><ul>{rows}</ul></nav>'


def foot():
    ig = SITE["instagram"]
    return f"""<footer class="hr-foot">
  <span class="hr-mark" aria-hidden="true">{mark("hr-mark")}</span>
  <a href="{ig["url"]}" target="_blank" rel="noopener">@{ig["handle"]}</a>
  <small>{both("© 2026 tuan photography 陳亮元. All photographs are my own.", "© 2026 tuan photography 陳亮元。所有照片都是我自己拍的。")}</small>
</footer>"""


FILM = ('<section class="hr-open" aria-label="Barcelona">'
        '<video muted loop playsinline preload="auto" poster="media/road-first.jpg" aria-hidden="true">'
        '<source src="media/barcelona.mp4" type="video/mp4"></video></section>')


def page(home, name, title_en, title_zh, opening, body, extra=""):
    return f"""<!doctype html>
<html lang="en" data-home="{home}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>{title_en} {title_zh} · tuan photography 陳亮元</title>
<link rel="icon" href="../../../favicon.ico">
<link rel="stylesheet" href="../../../css/fonts.css">
<link rel="stylesheet" href="../../../css/style.css">
<link rel="stylesheet" href="home.css">
</head>
<body>
{loader(extra)}{top()}
<main>
{opening}
<div class="hr-leaf">
{body}
{doors()}
{foot()}
</div>
</main>
<script src="home.js"></script>
<link rel="stylesheet" href="review-kit/bar.css">
<script src="review-kit/words.js"></script>
<script src="review-kit/store.js"></script>
<script src="review-kit/bar.js" data-name="home-redesign"></script>
</body>
</html>
"""


def build():
    # A, a short film: the film is the entrance; then pages of a printed book, sizes and places changing
    a = "\n".join([
        say(*SAY1),
        '<div class="hr-seq">',
        fig("matterhorn-lake", "hr-wide", "(max-width: 48rem) 92vw, 76rem"),
        f'<div class="hr-pair">{fig("tekapo-stars", sizes="(max-width: 48rem) 66vw, 22vw")}{fig("fuji-lake", sizes="(max-width: 48rem) 92vw, 54vw")}</div>',
        fig("sapa-valley", "hr-right", "(max-width: 48rem) 92vw, 56rem"),
        "</div>",
        say(*SAY2),
        '<div class="hr-seq">',
        fig("roys-peak", "hr-bleed", "100vw"),
        f'<div class="hr-pair hr-pair--flip">{fig("golden-gate-fog", sizes="(max-width: 48rem) 92vw, 54vw")}{fig("calanque-tall", sizes="(max-width: 48rem) 66vw, 22vw")}</div>',
        "</div>",
    ])
    (OUT / "a-film.html").write_text(page("a", "a-film", "A short film", "一段短片", FILM, a), encoding="utf-8")

    # B, prints gather: the prints fly in and settle under the name; Aoraki grows into the opening
    lead = SITE["lead"]
    flock = ["matterhorn-lake", "fuji-lake", "roys-peak", "sapa-valley", "tekapo-church", "aurora", "golden-gate-fog",
             "otaru-canal", "kifune", "gordes", lead, "calanque", "zermatt-dusk", "sapa-terraces", "fuji-shinkansen",
             "hoi-an-gate", "lower-manhattan-reflection", "peak-night", "neuschwanstein", "tekapo-stars", "bunkers"]
    cards = "".join(
        f'<div class="hr-print" data-ar="{SLIDES[s]["w"] / SLIDES[s]["h"]:.3f}"{" data-lead" if s == lead else ""}>'
        f'<img src="{IMG}{"1280/" if s == lead else "640/"}{SLIDES[s]["file"]}" alt=""></div>'
        for s in flock)
    prints = f'\n  <div class="hr-prints">{cards}</div>'
    s = SLIDES[lead]
    opening_b = (f'<section class="hr-open" aria-label="{e(s["place"]["en"])}">'
                 f'<img src="{IMG}{s["file"]}" width="{s["w"]}" height="{s["h"]}" alt="{e(s["alt"]["en"]) if "alt" in s else ""}"></section>')
    tall = "(max-width: 48rem) 70vw, 27rem"
    col = "(max-width: 48rem) 92vw, 44rem"
    b = "\n".join([
        '<div class="hr-col">',
        say(*SAY1),
        fig("matterhorn-lake", sizes=col),
        fig("sapa-terraces", "hr-tall", tall),
        fig("fuji-lake", sizes=col),
        say(*SAY2),
        fig("tekapo-stars", "hr-tall", tall),
        fig("roys-peak", sizes=col),
        fig("calanque", sizes=col),
        fig("golden-gate-fog", sizes=col),
        "</div>",
    ])
    (OUT / "b-prints.html").write_text(page("b", "b-prints", "Prints gather", "照片聚集", opening_b, b, prints), encoding="utf-8")

    # C, drawn, then real: blocks of the earth colours, one thought on each, the photographs set into them
    sketch = '\n  <img class="hr-load__sketch" src="media/road-sketch.jpg" alt="">'
    c = "\n".join([
        f'<section class="hr-block"><p class="hr-in">{both(*SAY1)}</p>{fig("sapa-terraces", sizes="(max-width: 48rem) 92vw, 22vw")}{fig("matterhorn-lake", sizes="(max-width: 48rem) 92vw, 22vw")}</section>',
        '<div class="hr-paper">',
        fig("fuji-lake", "hr-wide", "(max-width: 48rem) 92vw, 76rem"),
        f'<div class="hr-pair">{fig("tekapo-stars", sizes="(max-width: 48rem) 66vw, 22vw")}{fig("roys-peak", sizes="(max-width: 48rem) 92vw, 54vw")}</div>',
        "</div>",
        f'<section class="hr-block hr-block--slate"><p class="hr-in">{both(*SAY2)}</p>{fig("golden-gate-fog", sizes="(max-width: 48rem) 92vw, 50vw")}</section>',
    ])
    (OUT / "c-drawn.html").write_text(page("c", "c-drawn", "Drawn, then real", "先畫出來，再變成真的", FILM, c, sketch), encoding="utf-8")
    # D, traced, then real: as C, the drawing traced line by line (media/road-lines.svg, made by
    # tools/home_redesign_trace.py), then shaded, then the film
    lines = (OUT / "media" / "road-lines.svg").read_text(encoding="utf-8")
    traced = '\n  <img class="hr-load__sketch" src="media/road-sketch.jpg" alt="">\n  ' + lines
    (OUT / "c-traced.html").write_text(page("d", "c-traced", "Traced, then real", "一筆一筆勾出來，再變成真的", FILM, c, traced), encoding="utf-8")
    print("wrote a-film.html, b-prints.html, c-drawn.html, c-traced.html")


if __name__ == "__main__":
    build()
