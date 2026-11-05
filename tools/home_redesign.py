#!/usr/bin/env python3
"""Writes the three home-page directions of the home redesign (2026-11-05) into
design 2/new/home-redesign/: a-film.html, b-prints.html, c-drawn.html,
c-traced.html (D) and c-counted.html (E).

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


# The film's four scenes (media/barcelona.mp4, 12.1 s; the cuts are cross-fades near 3, 6 and 9 s):
# when each caption shows, in seconds of the film, and its two lines.
SPAIN = ("Barcelona, July 2026", "巴塞隆納，2026 年 7 月")
CAPTIONS = [
    (0.5, 2.6, ("Sagrada Família", "聖家堂"), SPAIN),
    (3.5, 5.6, ("Barcelona from Tibidabo", "從提比達波看巴塞隆納"), SPAIN),
    (6.5, 8.6, ("The wheel on Tibidabo", "提比達波的摩天輪"), SPAIN),
    (9.5, 11.7, ("Inside the Sagrada Família", "聖家堂裡面"), SPAIN),
]


MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
COUNTRY = {c["id"]: c for c in SITE["countries"]}


def when(sid):
    """When the photograph's country was visited, from data/site.json: '2025.1' reads 'January 2025'."""
    d = COUNTRY.get(SLIDES[sid]["country"], {}).get("date", {})
    en, zh = d.get("en", ""), d.get("zh", "")
    if en.count(".") == 1 and en.replace(".", "").isdigit():
        y, m = en.split(".")
        return f"{MONTHS[int(m) - 1]} {y}", f"{y} 年 {int(m)} 月"
    if en.endswith(" summer"):
        return f"Summer {en.split()[0]}", f"{en.split()[0]} 年夏天"
    return en, zh


def srcset(sid):
    s = SLIDES[sid]
    f = s["file"]
    return f'{IMG}640/{f} 640w, {IMG}1280/{f} 1280w, {IMG}{f} {max(s["w"], s["h"])}w'


def caption(sid):
    s = SLIDES[sid]
    w_en, w_zh = when(sid)
    return (f'<figcaption><b>{both(e(s["place"]["en"]), e(s["place"]["zh"]))}</b>'
            f'<span>{both(e(s["where"]["en"]) + ", " + w_en, e(s["where"]["zh"]) + "，" + w_zh)}</span></figcaption>')


def sketched(sid, cls="", sizes="(max-width: 48rem) 92vw, 60vw"):
    """F: a photograph that is first its own pencil drawing (media/sketch/<id>.jpg), then turns real in view."""
    s = SLIDES[sid]
    alt = e(s["alt"]["en"]) if "alt" in s else ""
    return (f'<figure class="hr-fig hr-sk hr-in {cls}"><a href="{PAGES}gallery.html">'
            f'<img src="{IMG}1280/{s["file"]}" srcset="{srcset(sid)}" sizes="{sizes}" width="{s["w"]}" height="{s["h"]}" alt="{alt}" loading="lazy" decoding="async">'
            f'<img class="hr-sk__pencil" src="media/sketch/{sid}.jpg" alt="" loading="lazy" decoding="async"></a>{caption(sid)}</figure>')


def page(home, name, title_en, title_zh, opening, body, extra="", attrs="", way=None, foot_html=None, scripts=""):
    return f"""<!doctype html>
<html lang="en" data-home="{home}"{attrs}>
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
{doors() if way is None else way}
{foot() if foot_html is None else foot_html}
</div>
</main>
<script src="home.js"></script>
{scripts}<link rel="stylesheet" href="review-kit/bar.css">
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
    # E, traced and counted: as D, the trip so far counting up while the lines are drawn, and a caption
    # for each scene of the film (his ask, 2026-11-05). The counts are read from data/site.json, so they
    # stay true as places, flights and photographs are added.
    counts = [
        (len(SITE["countries"]), "Countries", "國家"),
        (sum(1 for j in SITE["journeys"] for l in j["legs"] if l["mode"] == "flight"), "Flights", "航班"),
        (len(SITE["slides"]), "Photographs", "照片"),
    ]
    tally = "".join(f'<p><b data-to="{n}">0</b><span class="caps">{both(en, zh)}</span></p>' for n, en, zh in counts)
    counted = traced + f'\n  <div class="hr-load__counts">{tally}</div>'
    caps = "".join(f'<span class="hr-cap__one" data-from="{a}" data-to="{b}"><b>{both(*name)}</b><small class="caps">{both(*where)}</small></span>'
                   for a, b, name, where in CAPTIONS)
    film_e = FILM.replace("</video></section>", f'</video><p class="hr-cap" aria-hidden="true">{caps}</p></section>')
    (OUT / "c-counted.html").write_text(page("d", "c-counted", "Traced and counted", "勾出來，數一數", film_e, c, counted, " data-counts"), encoding="utf-8")
    # Round two (his ask, 2026-11-05: "continue designing the rest of the home page"): E's opening kept,
    # three ways for everything under the film.
    rest = lambda r: " data-counts" + f' data-rest="{r}"'

    # F, drawn, then real, all the way down: each photograph arrives as its pencil drawing and turns real
    f = "\n".join([
        say(*SAY1),
        '<div class="hr-seq">',
        sketched("matterhorn-lake", "hr-wide", "(max-width: 48rem) 92vw, 76rem"),
        f'<div class="hr-pair">{sketched("calanque-tall", sizes="(max-width: 48rem) 66vw, 22vw")}{sketched("fuji-lake", sizes="(max-width: 48rem) 92vw, 54vw")}</div>',
        "</div>",
        say(*SAY2),
        '<div class="hr-seq">',
        sketched("roys-peak", "hr-bleed", "100vw"),
        sketched("golden-gate-fog", "hr-right", "(max-width: 48rem) 92vw, 56rem"),
        "</div>",
    ])
    (OUT / "f-drawn-down.html").write_text(page("d", "f-drawn-down", "Drawn, then real, all the way down", "一路先畫再變真", film_e, f, counted, rest("f")), encoding="utf-8")

    # G, prints on the table: one photograph to a screen, each laid over the last like prints in a pile;
    # the way in as three photographs
    pile = ["matterhorn-lake", "fuji-lake", "roys-peak", "sapa-valley", "golden-gate-fog"]
    prints_g = "".join(
        f'<figure class="hr-fig hr-pile__one"><a href="{PAGES}gallery.html"><img src="{IMG}1280/{SLIDES[p]["file"]}" srcset="{srcset(p)}" '
        f'sizes="(max-width: 48rem) 92vw, 80rem" width="{SLIDES[p]["w"]}" height="{SLIDES[p]["h"]}" alt="{e(SLIDES[p]["alt"]["en"]) if "alt" in SLIDES[p] else ""}" loading="lazy" decoding="async"></a>{caption(p)}</figure>'
        for p in pile)
    g = say(*SAY1) + f'\n<div class="hr-pile">{prints_g}</div>\n' + say(*SAY2)
    ways = [(SITE["lead"], DOORS[0]), ("hoi-an-night", DOORS[1]), ("sagrada-plaza", DOORS[2])]
    way_g = '<nav class="hr-pdoors" aria-label="The way in"><ul>' + "".join(
        f'<li><a class="hr-pdoor hr-in" href="{PAGES}{href}"><span class="hr-pdoor__img"><img src="{IMG}640/{SLIDES[p]["file"]}" alt="" loading="lazy" decoding="async"></span>'
        f'<b>{both(en, zh)}</b><span>{both(den, dzh)}</span></a></li>'
        for p, (href, en, zh, den, dzh) in ways) + "</ul></nav>"
    (OUT / "g-pile.html").write_text(page("d", "g-pile", "Prints on the table", "桌上的照片", film_e, g, counted, rest("g"), way_g), encoding="utf-8")

    # H, the journal: spreads of a printed travel journal, the photograph on one page and on the other
    # its place, when, and how it was made (the camera data read from the file); the way in as contents
    HOW = [("camera", "Camera", "相機"), ("lens", "Lens", "鏡頭"), ("focal", "Focal length", "焦距"),
           ("aperture", "Aperture", "光圈"), ("shutter", "Shutter", "快門"), ("iso", "ISO", "ISO")]
    spreads = []
    for k, sid in enumerate(["fuji-lake", "sapa-terraces", "matterhorn-lake", "tekapo-stars"]):
        s = SLIDES[sid]
        tall = s["h"] > s["w"]
        w_en, w_zh = when(sid)
        cn = COUNTRY[s["country"]]
        how = "".join(f'<div><dt class="caps">{both(en, zh)}</dt><dd>{e(s[key])}</dd></div>' for key, en, zh in HOW if s.get(key))
        spreads.append(
            f'<article class="hr-spread hr-in{" hr-spread--tall" if tall else ""}{" hr-spread--flip" if k % 2 else ""}">'
            f'<figure class="hr-spread__photo"><a href="{PAGES}gallery.html"><img src="{IMG}1280/{s["file"]}" srcset="{srcset(sid)}" sizes="(max-width: 48rem) 92vw, 60vw" '
            f'width="{s["w"]}" height="{s["h"]}" alt="{e(s["alt"]["en"]) if "alt" in s else ""}" loading="lazy" decoding="async"></a></figure>'
            f'<div class="hr-spread__words"><p class="caps">{both(e(s["where"]["en"]), e(s["where"]["zh"]))}</p>'
            f'<h2>{both(e(s["place"]["en"]), e(s["place"]["zh"]))}</h2><p class="hr-spread__when">{both(w_en, w_zh)}</p>'
            f'<dl class="hr-spread__how">{how}</dl>'
            f'<a class="hr-spread__more" href="{PAGES}countries/{cn["id"]}.html">{both("More from " + e(cn["en"]), "更多" + e(cn["zh"]) + "的照片")}</a></div></article>')
    h = say(*SAY1) + '\n<div class="hr-journal">' + "".join(spreads) + "</div>\n" + say(*SAY2)
    n_photos, n_countries = len(SITE["slides"]), len(SITE["countries"])
    n_guides = len(SITE["guides"])
    contents = [(DOORS[0], f"{n_photos} photographs", f"{n_photos} 張照片"),
                (DOORS[1], f"{n_countries} countries, {counts[1][0]} flights", f"{n_countries} 個國家，{counts[1][0]} 趟航班"),
                (DOORS[2], f"{n_guides} guide so far, Barcelona" if n_guides == 1 else f"{n_guides} guides", "目前一篇，巴塞隆納" if n_guides == 1 else f"{n_guides} 篇")]
    way_h = '<nav class="hr-doors hr-contents" aria-label="The way in"><ul>' + "".join(
        f'<li><a class="hr-door hr-in" href="{PAGES}{href}"><b>{both(en, zh)}</b><span>{both(den, dzh)}<small>{both(cen, czh)}</small></span></a></li>'
        for (href, en, zh, den, dzh), cen, czh in contents) + "</ul></nav>"
    (OUT / "h-journal.html").write_text(page("d", "h-journal", "The journal", "旅行手帳", film_e, h, counted, rest("h"), way_h), encoding="utf-8")
    # Round three (2026-11-06), from the references he marked Good on home-lower.html: Singita (one sentence
    # beside one big photograph, sides swapping), Belmond (tall photographs like windows, one place each) and
    # Jimmy Chin (one big photograph, the way in as three huge words). Each keeps E's opening.
    def img(sid, sizes, cls=""):
        x = SLIDES[sid]
        alt = e(x["alt"]["en"]) if "alt" in x else ""
        return (f'<img{f" class={chr(34)}{cls}{chr(34)}" if cls else ""} src="{IMG}1280/{x["file"]}" srcset="{srcset(sid)}" sizes="{sizes}" '
                f'width="{x["w"]}" height="{x["h"]}" alt="{alt}" loading="lazy" decoding="async">')

    def plain(sid, cls="", sizes="(max-width: 48rem) 92vw, 60vw"):
        return f'<figure class="hr-fig {cls}"><a href="{PAGES}gallery.html">{img(sid, sizes)}</a>{caption(sid)}</figure>'

    def windows(items, cls):
        """Tall photographs like windows, one place or one way in each, the name beneath."""
        return f'<ul class="hr-windows {cls}">' + "".join(
            f'<li><a class="hr-window hr-in" href="{href}" style="--i: {k}"><span class="hr-window__img">{img(sid, "(max-width: 48rem) 46vw, 18vw")}</span>'
            f'<b>{both(*name)}</b><span>{both(*line)}</span></a></li>'
            for k, (sid, href, name, line) in enumerate(items)) + "</ul>"

    def words(lead_sid):
        """The way in as three huge words on the paper just under one big photograph (after Jimmy Chin)."""
        items = "".join(f'<li><a class="hr-word" href="{PAGES}{href}">{both(en, zh)}</a></li>' for href, en, zh, _, _ in DOORS)
        return (f'<nav class="hr-words" aria-label="The way in"><figure class="hr-words__photo">{img(lead_sid, "100vw")}</figure>'
                f'<ul>{items}</ul></nav>')

    n_c = len(SITE["countries"])
    SAY_HOME = (f"{n_c} countries so far, from a home in Taiwan.", f"以台灣為家，到目前為止走過 {n_c} 個國家。")
    win_doors = [("tekapo-stars", f"{PAGES}gallery.html", ("Gallery", "作品集"), ("Every photograph.", "所有的照片。")),
                 ("fuji-shinkansen", f"{PAGES}journey/", ("Journey", "旅程"), ("Every trip, along its route.", "每一趟旅程，沿著路線看。")),
                 ("sagrada-plaza", f"{PAGES}guides.html", ("Guides", "攻略"), ("Where to stand and when, place by place.", "每個地方，站在哪裡、什麼時候去。"))]

    # I, words beside photographs: three big photographs, one short line beside each, sides swapping;
    # the way in as three tall windows
    rows = [("matterhorn-lake", SAY1, ""), ("sapa-terraces", SAY_HOME, " hr-beside__row--tall hr-beside__row--flip"), ("roys-peak", SAY2, "")]
    i = '<div class="hr-beside">' + "".join(
        f'<section class="hr-beside__row{cls}">{plain(sid, "hr-in", "(max-width: 48rem) 92vw, 56vw")}<p class="hr-in">{both(*say_)}</p></section>'
        for sid, say_, cls in rows) + "</div>"
    way_i = '<nav class="hr-windows-way" aria-label="The way in">' + windows(win_doors, "hr-windows--3") + "</nav>"
    (OUT / "i-beside.html").write_text(page("d", "i-beside", "Words beside photographs", "照片旁邊一句話", film_e, i, counted, rest("i"), way_i), encoding="utf-8")

    # J, windows: one row of tall photographs, one place each, the country and when beneath; then the three words
    places = ["matterhorn-lake", "fuji-lake", "tekapo-church", "sapa-terraces", "calanque-tall", "golden-gate-fog"]
    place_items = []
    for sid in places:
        cn = COUNTRY[SLIDES[sid]["country"]]
        place_items.append((sid, f"{PAGES}countries/{cn['id']}.html", (e(cn["en"]), e(cn["zh"])), when(sid)))
    j = say(*SAY1) + '\n<section class="hr-windows-row">' + windows(place_items, "hr-windows--6") + "</section>\n" + say(*SAY2)
    (OUT / "j-windows.html").write_text(page("d", "j-windows", "Windows", "一扇一扇窗", film_e, j, counted, rest("j"), words("roys-peak")), encoding="utf-8")

    # K, three words: a few big photographs, then one that fills the screen with GALLERY, JOURNEY, GUIDES
    # set huge on the paper just beneath it
    k_body = "\n".join([
        say(*SAY1),
        '<div class="hr-seq">',
        plain("matterhorn-lake", "hr-wide hr-in", "(max-width: 48rem) 92vw, 76rem"),
        plain("fuji-lake", "hr-right hr-in", "(max-width: 48rem) 92vw, 56rem"),
        "</div>",
    ])
    (OUT / "k-three-words.html").write_text(page("d", "k-three-words", "Three words", "三個字", film_e, k_body, counted, rest("k"), words(SITE["lead"])), encoding="utf-8")
    # L, his current home and the three words (his ask, 2026-11-06: "merging the three words and my current
    # ones"): E's opening, then the live home page's own sections as design 1 builds them (the line and its
    # two buttons, the aurora, the Photographs wall, Fuji, the Guides cards), read from design 1/index.html
    # at build time so they stay current; its last photograph, the Matterhorn and the flag, becomes the
    # three-words screen; the live footer with Instagram closes it. design 1's main.js runs the wall's viewer
    # and the Guides cards (data-root points it at design 1's folders).
    import re
    live = (ROOT / "design 1" / "index.html").read_text(encoding="utf-8")
    leaf = live.split('<div class="leaf">', 1)[1].split("</main>", 1)[0]
    leaf = leaf[: leaf.rfind("</div>")]                                          # the leaf's own closing tag
    leaf = re.sub(r'\n<figure class="window"><a href="gallery.html#s-matterhorn-flag".*?</figure>', "", leaf, flags=re.S)
    live_foot = re.search(r'<footer class="foot">.*?</footer>', live, re.S).group(0)

    def rel(html):
        """design 1's addresses, which are relative to design 1/, as seen from design 2/new/home-redesign/."""
        keep = ("http", "#", "/", "mailto:", "data:", "../", "javascript:")
        fix = lambda u: u if u.startswith(keep) else PAGES + u
        html = re.sub(r'\b(href|src)="([^"]*)"', lambda m: f'{m.group(1)}="{fix(m.group(2))}"', html)
        html = re.sub(r'\bsrcset="([^"]*)"', lambda m: 'srcset="' + ", ".join(fix(part.strip()) for part in m.group(1).split(",")) + '"', html)
        html = re.sub(r'"srcset":\s*"([^"]*)"', lambda m: '"srcset":"' + ", ".join(fix(part.strip()) for part in m.group(1).split(",")) + '"', html)
        return re.sub(r'"href":\s*"([^"]*)"', lambda m: f'"href":"{fix(m.group(1))}"', html)

    data = rel("\n".join(re.findall(r'<script type="application/json" id="slides-data">.*?</script>|<script>\nwindow\.pageI18n = .*?</script>', live, re.S)))
    l_body = rel(leaf)
    (OUT / "l-current-words.html").write_text(page(
        "d", "l-current-words", "Your current home and the three words", "現在的首頁加三個字", film_e, l_body, counted,
        rest("l") + f' data-root="{PAGES}"', words("matterhorn-flag"), rel(live_foot),
        data + f'\n<script src="{PAGES}js/main.js"></script>\n'), encoding="utf-8")
    print("wrote a-film.html, b-prints.html, c-drawn.html, c-traced.html, c-counted.html, f-drawn-down.html, g-pile.html, h-journal.html,",
          "i-beside.html, j-windows.html, k-three-words.html, l-current-words.html")


if __name__ == "__main__":
    build()
