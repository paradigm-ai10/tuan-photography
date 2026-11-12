#!/usr/bin/env python3
"""Trial versions of the home page's content: everything under the Barcelona film and the Aoraki photograph.

Started 2026-11-12 (his ask: "please redesign my homepage content", with Impeccable). His answers that day: everything
under Aoraki is open, forget Singita, Belmond and Jimmy Chin, and the one thing that would make it wrong is looking
like a template. Each version is the live home page (the same top bar, film, opening photograph, footer, viewer and
language switch, all written by tools/build.py) with a different page between Aoraki and the footer. They are written
to design 2/new/home-redesign/ for the review list and never touch design 1.

    python3 tools/home_content.py

A note on a version is answered with a new version beside it (add to VERSIONS), never an edit in place.
Styles: design 2/new/home-redesign/content.css. Script: content.js.
"""
import re
import tempfile
from pathlib import Path

import build as B

OUT = B.ROOT / "design 2" / "new" / "home-redesign"
UP = "../../../"   # design 1, as seen from the review folder on 8642
e = B.e


def rel(html):
    """design 1's addresses, which are relative to design 1/, as seen from design 2/new/home-redesign/."""
    keep = ("http", "#", "/", "mailto:", "data:", "../", "javascript:")
    fix = lambda u: u if u.startswith(keep) else UP + u
    many = lambda s: ", ".join(fix(part.strip()) for part in s.split(","))
    html = re.sub(r'\b(href|src|poster)="([^"]*)"', lambda m: f'{m.group(1)}="{fix(m.group(2))}"', html)
    html = re.sub(r'\bsrcset="([^"]*)"', lambda m: f'srcset="{many(m.group(1))}"', html)
    return re.sub(r'"srcset":\s*"([^"]*)"', lambda m: f'"srcset": "{many(m.group(1))}"', html)


def held(sid, en, zh):
    """A window onto a photograph kept whole: it stays where it is, untrimmed, on the stone ground, its name beneath
    it, while the paper passes over. For upright photographs, which a full-width window would cut in half."""
    s = B.SLIDES[sid]
    B.strings(s, en, zh)
    en[f"sw_{sid}"], zh[f"sw_{sid}"] = s["where"]["en"], s["where"]["zh"]
    return (f'<figure class="hc-hold"><a {B.opens(sid, "", en, zh)}>{B.img(s, "", "(max-width: 48rem) 92vw, 60vh", soon=True)}</a>'
            f'<figcaption><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>'
            f'<span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span></figcaption></figure>')


def way(key, href, en, zh, word, say):
    """One way in: the tab's name, set large, is the link; one small line under it."""
    en[f"hc{key}"], zh[f"hc{key}"] = word
    en[f"hc{key}Say"], zh[f"hc{key}Say"] = say
    return (f'<p class="hc-way"><a href="{href}" data-i18n="hc{key}">{e(word[0])}</a>'
            f'<span data-i18n="hc{key}Say">{e(say[0])}</span></p>')


WAYS = [
    ("Gallery", "gallery.html", ("Gallery", "作品集"), ("Every photograph, on one wall.", "每一張照片，在同一面牆上。")),
    ("Journey", "journey/", ("Journey", "旅程"), ("Where I have been, trip by trip.", "我去過的地方，一趟一趟看。")),
    ("Guides", "guides.html", ("Guides", "攻略"), ("How to stand where these were taken.", "怎麼站到拍下這些照片的地方。")),
]


def line(en, zh):
    en["hcLine"] = "Travel like a photographer."
    zh["hcLine"] = '<span class="nb">像攝影師</span><span class="nb">一樣旅行。</span>'
    return '<h1 class="hc-line" data-i18n-html="hcLine">Travel like a photographer.</h1>'


# ---------------------------------------------------------------- A: the photograph stays, the paper passes

def stays(en, zh):
    """Mostly photograph. Under Aoraki the page is four photographs that stay where they are, and between them the
    paper passes as a short leaf carrying one thing: the line, then one way in at a time."""
    g, j, gd = (way(*w[:2], en, zh, *w[2:]) for w in WAYS)
    return f"""<div class="leaf hc-a">
<section class="hc-leaf hc-leaf--line">{line(en, zh)}</section>
{held("queensboro-train", en, zh)}
<section class="hc-leaf">{g}</section>
{B.window("matterhorn-lake", "", en, zh)}
<section class="hc-leaf">{j}</section>
{B.window("bunkers", "", en, zh)}
<section class="hc-leaf">{gd}</section>
{held("tekapo-stars", en, zh)}
</div>"""


# ---------------------------------------------------------------- B: the index of places

PLACES = [   # (photograph, the place as a plain name, where its name leads)
    ("queensboro-train", ("New York", "紐約"), "countries/usa.html"),
    ("matterhorn-lake", ("Zermatt", "策馬特"), "countries/switzerland.html"),
    ("fuji-lake", ("Mount Fuji", "富士山"), "countries/japan.html"),
    ("sapa-terraces", ("Sa Pa", "沙壩"), "countries/vietnam.html"),
    ("tekapo-stars", ("Lake Tekapo", "蒂卡波湖"), "countries/new-zealand.html"),
    ("golden-gate-fog", ("San Francisco", "舊金山"), "countries/usa.html"),
    ("calanque", ("Cassis", "卡西斯"), "countries/france.html"),
    ("peak-night", ("Hong Kong", "香港"), "countries/hong-kong.html"),
    ("bunkers", ("Barcelona", "巴塞隆納"), "posts/barcelona.html"),
    ("hoi-an-night", ("Hội An", "會安"), "countries/vietnam.html"),
    ("otaru-canal", ("Otaru", "小樽"), "countries/japan.html"),
    ("roys-peak", ("Wanaka", "瓦納卡"), "countries/new-zealand.html"),
]


def index(en, zh):
    """The page is a list of places in large type. The photograph of the place being read stays beside the list,
    whole; the name is the way to that place."""
    names, prints = [], []
    for i, (sid, name, href) in enumerate(PLACES):
        s = B.SLIDES[sid]
        B.strings(s, en, zh)
        en[f"hcP_{sid}"], zh[f"hcP_{sid}"] = name
        en[f"sw_{sid}"], zh[f"sw_{sid}"] = s["where"]["en"], s["where"]["zh"]
        names.append(f'<li><a href="{href}" data-print="{sid}"><b data-i18n="hcP_{sid}">{e(name[0])}</b>'
                     f'<span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span></a></li>')
        prints.append(f'<figure class="hc-print{" is-on" if i == 0 else ""}" data-print="{sid}"><a {B.opens(sid, "", en, zh)}>'
                      f'{B.img(s, "", "(max-width: 56rem) 92vw, 55vw", soon=True)}</a></figure>')
    en["hcEvery"], zh["hcEvery"] = "Every place", "所有地方"
    en["hcAll"], zh["hcAll"] = "Every photograph", "所有照片"
    en["hcTrips"], zh["hcTrips"] = "Every trip", "每一趟旅行"
    en["hcIndex"], zh["hcIndex"] = "Places", "地方"
    return f"""<div class="leaf hc-b">
<section class="wrap hc-index" aria-labelledby="hc-index-h">
  <div class="hc-index__text">
    {line(en, zh)}
    <h2 class="hc-hidden" id="hc-index-h" data-i18n="hcIndex">Places</h2>
    <ol class="hc-names">
      {"".join(names)}
    </ol>
    <p class="hc-onward"><a class="caps" href="guides.html" data-i18n="hcEvery">Every place</a><a class="caps" href="gallery.html" data-i18n="hcAll">Every photograph</a><a class="caps" href="journey/" data-i18n="hcTrips">Every trip</a></p>
  </div>
  <div class="hc-frame" aria-hidden="false">
    {"".join(prints)}
  </div>
</section>
</div>"""


# ---------------------------------------------------------------- C: pairs, a landscape and a city

PAIRS = [   # (layout, left photograph, right photograph)
    ("mirror", "fuji-lake", "lower-manhattan-reflection"),
    ("rails", "queensboro-train", "fuji-shinkansen"),
    ("lights", "peak-night", "zermatt-dusk"),
    ("tiers", "sapa-terraces", "mong-kok"),
]


def pairs(en, zh):
    """A landscape and a city from his trips, hung side by side because they rhyme: two reflections, two trains,
    two valleys of lights, two sets of tiers. One pair to a screen, each hung differently, whole, names beneath."""
    en["hcPairsSay"], zh["hcPairsSay"] = "Landscapes and cities, from the same trips.", "同一趟旅途上的風景與城市。"
    out = []
    for kind, a, b in PAIRS:
        fa = B.piece(a, "", en, zh, "(max-width: 48rem) 92vw, 55vw").replace('class="piece"', 'class="piece hc-one"', 1)
        fb = B.piece(b, "", en, zh, "(max-width: 48rem) 80vw, 40vw").replace('class="piece"', 'class="piece hc-two"', 1)
        out.append(f'<section class="wrap hc-pair hc-pair--{kind}">{fa}{fb}</section>')
    ways = "".join(way(*w[:2], en, zh, *w[2:]) for w in WAYS)
    return f"""<div class="leaf hc-c">
<section class="hc-leaf hc-leaf--line">{line(en, zh)}<p class="hc-say" data-i18n="hcPairsSay">Landscapes and cities, from the same trips.</p></section>
{"".join(out)}
<nav class="wrap hc-ways" aria-label="Site">{ways}</nav>
</div>"""


# ---------------------------------------------------------------- the index, taken further (2026-11-12)
# He scored the index 2 ("looks plain or flat") but likes its concept and asked for variations made with skills.
# What he has scored 5 elsewhere always moves with craft, so these are the index as one held stage the scroll
# conducts: a place at a time, its name set very large, its photograph uncovered from its foot (the site's own
# "uncover"), the list itself reduced to a small running index. From top-design (type as architecture, one
# signature moment, clip-path reveals, asymmetry) and animate (purpose: spatial consistency and state; transform,
# opacity and clip-path only; a strong ease-out; reduced motion). Eight places, a short hold: a long pinned scroll
# is one of the things he has called overwhelming.

STAGE = [   # (photograph, a wide one for the version that fills the window, name, where the name leads)
    ("queensboro-train", "empire-state-sunset", ("New York", "紐約"), "countries/usa.html"),
    ("matterhorn-lake", "matterhorn-lake", ("Zermatt", "策馬特"), "countries/switzerland.html"),
    ("fuji-lake", "fuji-lake", ("Mount Fuji", "富士山"), "countries/japan.html"),
    ("sapa-terraces", "sapa-valley", ("Sa Pa", "沙壩"), "countries/vietnam.html"),
    ("tekapo-stars", "aurora", ("Lake Tekapo", "蒂卡波湖"), "countries/new-zealand.html"),
    ("golden-gate-fog", "golden-gate-fog", ("San Francisco", "舊金山"), "countries/usa.html"),
    ("peak-night", "peak-night", ("Hong Kong", "香港"), "countries/hong-kong.html"),
    ("bunkers", "bunkers", ("Barcelona", "巴塞隆納"), "posts/barcelona.html"),
]


def stage(kind, en, zh, wide=False):
    photos, names, run = [], [], []
    for i, (tall, flat, name, href) in enumerate(STAGE):
        sid = flat if wide else tall
        x = B.SLIDES[sid]
        B.strings(x, en, zh)
        date = B.COUNTRIES[x["country"]]["date"]["en"]
        en[f"hxN{i}"], zh[f"hxN{i}"] = name
        en[f"hxW{i}"], zh[f"hxW{i}"] = f'{x["where"]["en"]}, {date}', f'{x["where"]["zh"]}，{date}'
        on = " is-on" if i == 0 else ""
        photos.append(f'<figure class="hx-photo{on}"><a {B.opens(sid, "", en, zh)}>'
                      f'{B.img(x, "", "100vw" if wide else "(max-width: 48rem) 92vw, 56vw", soon=True)}</a></figure>')
        names.append(f'<a class="hx-name{on}" href="{href}"><b data-i18n="hxN{i}">{e(name[0])}</b>'
                     f'<span data-i18n="hxW{i}">{e(en[f"hxW{i}"])}</span></a>')
        run.append(f'<li><button type="button" class="caps{on}" data-i18n="hxN{i}">{e(name[0])}</button></li>')
    ways = "".join(way(*w[:2], en, zh, *w[2:]) for w in WAYS)
    en["hxPlaces"], zh["hxPlaces"] = "Places", "地方"
    return f"""<div class="leaf hx" data-hx="{kind}">
<section class="hc-leaf hc-leaf--line">{line(en, zh)}</section>
<section class="hx-run" aria-label="Places" data-i18n-aria="hxPlaces">
  <div class="hx-stage">
    <div class="hx-photos">{"".join(photos)}</div>
    <div class="hx-names">{"".join(names)}</div>
    <ol class="hx-index">{"".join(run)}</ol>
  </div>
</section>
<nav class="wrap hc-ways" aria-label="Site">{ways}</nav>
</div>"""


def fine(en, zh):
    """The first index, kept as a list you read down, but ruled, with the place set large and its line at the far
    side of the rule, and the photograph uncovered from its foot instead of faded."""
    return index(en, zh).replace('class="leaf hc-b"', 'class="leaf hc-b hc-b--fine"', 1)


# ---------------------------------------------------------------- the index, travelling sideways (2026-11-12)
# His words on the four stagings: he wants what the first index had, every place in view while the photographs
# change ("I can see how many places I have been to, I can see other places"), and he likes the one line of names
# because the scroll turns from vertical to horizontal. So three versions where every place stays on screen and the
# photographs travel sideways as one strip, following the scroll (content.js eases the strip toward the scroll).

def across(kind, en, zh):
    figs, names, jump = [], [], []
    for i, (sid, name, href) in enumerate(PLACES):
        x = B.SLIDES[sid]
        B.strings(x, en, zh)
        date = B.COUNTRIES[x["country"]]["date"]["en"]
        en[f"hcP_{sid}"], zh[f"hcP_{sid}"] = name
        en[f"hyW_{sid}"], zh[f"hyW_{sid}"] = f'{x["where"]["en"]}, {date}', f'{x["where"]["zh"]}，{date}'
        on = " is-on" if i == 0 else ""
        figs.append(f'<figure class="hy-photo{on}"><a {B.opens(sid, "", en, zh)}>{B.img(x, "", "(max-width: 48rem) 88vw, 60vw", soon=True)}</a>'
                    f'<figcaption><b data-i18n="sp_{sid}">{e(x["place"]["en"])}</b><span data-i18n="hyW_{sid}">{e(en[f"hyW_{sid}"])}</span></figcaption></figure>')
        names.append(f'<li><a class="hy-name{on}" href="{href}" data-i18n="hcP_{sid}">{e(name[0])}</a></li>')
        jump.append(f'<li><button type="button" class="caps{on}" data-i18n="hcP_{sid}">{e(name[0])}</button></li>')
    ways = "".join(way(*w[:2], en, zh, *w[2:]) for w in WAYS)
    en["hxPlaces"], zh["hxPlaces"] = "Places", "地方"
    index_row = f'\n    <ol class="hy-index">{"".join(jump)}</ol>' if kind == "lines" else ""
    return f"""<div class="leaf hy" data-hy="{kind}">
<section class="hc-leaf hc-leaf--line">{line(en, zh)}</section>
<section class="hy-run" aria-label="Places" data-i18n-aria="hxPlaces">
  <div class="hy-stage">
    <ol class="hy-names">{"".join(names)}</ol>
    <div class="hy-view"><div class="hy-track">{"".join(figs)}</div></div>{index_row}
  </div>
</section>
<nav class="wrap hc-ways" aria-label="Site">{ways}</nav>
</div>"""


VERSIONS = [   # (file, the body, title en, title zh)
    ("v-stays", stays, "The photograph stays, the paper passes", "照片不動，紙從上面經過"),
    ("v-index", index, "The index of places", "地方的索引"),
    ("v-pairs", pairs, "Pairs: a landscape and a city", "一對一對：一張風景，一張城市"),
    ("v-index-stage", lambda en, zh: stage("wipe", en, zh), "The index, a place at a time", "索引：一次一個地方"),
    ("v-index-window", lambda en, zh: stage("window", en, zh, wide=True), "The index, the whole window", "索引：整個畫面"),
    ("v-index-line", lambda en, zh: stage("line", en, zh), "The index, one line of names", "索引：一行地名"),
    ("v-index-fine", fine, "The index, ruled and uncovered", "索引：加上細線，照片揭開"),
    ("v-across-list", lambda en, zh: across("list", en, zh), "Every place in view, the photographs travel sideways", "所有地方都看得到，照片往旁邊走"),
    ("v-across-strip", lambda en, zh: across("strip", en, zh), "A strip of photographs over the list of places", "一長條照片，下面是所有地方"),
    ("v-across-lines", lambda en, zh: across("lines", en, zh), "Two lines travelling: the names and the photographs", "兩行一起走：地名和照片"),
]


def build():
    lead = B.DATA["lead"]
    with tempfile.TemporaryDirectory() as tmp:
        site, B.OUT = B.OUT, Path(tmp)
        try:
            for name, body_of, t_en, t_zh in VERSIONS:
                en, zh = {}, {}
                body = f'{B.home_film(en, zh)}\n\n{B.cover(lead, "", en, zh, first=False)}\n\n{body_of(en, zh)}'
                B.write("index.html", f"{t_en} · home content", f"{t_zh} · 首頁內容", "A trial version of the home page's content.",
                        None, body, en, zh, over=True, scripts=("opening.js",),
                        head_extra=f'  <link rel="stylesheet" href="css/opening.css?v={B.STAMP}">\n')
                html = rel((Path(tmp) / "index.html").read_text(encoding="utf-8"))
                html = html.replace('<html lang="en" data-root="">', f'<html lang="en" data-root="{UP}" data-hc="{name}">', 1)
                html = html.replace("</head>", f'  <link rel="stylesheet" href="content.css?v={B.STAMP}">\n  <meta name="robots" content="noindex">\n</head>', 1)
                html = html.replace("</body>", f'<script src="content.js?v={B.STAMP}"></script>\n<link rel="stylesheet" href="review-kit/bar.css">\n'
                                    '<script src="review-kit/words.js"></script>\n<script src="review-kit/store.js"></script>\n'
                                    '<script src="review-kit/bar.js" data-name="home-redesign"></script>\n</body>', 1)
                (OUT / f"{name}.html").write_text(html, encoding="utf-8")
                print("wrote", f"design 2/new/home-redesign/{name}.html")
        finally:
            B.OUT = site


if __name__ == "__main__":
    build()
