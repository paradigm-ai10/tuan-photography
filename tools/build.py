#!/usr/bin/env python3
"""Build the site's pages.

    python3 tools/build.py

Reads data/site.json (photographs, countries, guides) and content/ (hand-written
page bodies), and writes plain HTML files into design 1/. Nothing here runs on the live
site: the output is ordinary static pages. design 1/ is the whole website and nothing else.

To add a photograph: put the web-sized file in design 1/images/web/, add an entry to
"slides" in data/site.json, and run this script again.
"""
import hashlib
import html
import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design 1"   # the website itself: everything a visitor receives
DATA = json.loads((ROOT / "data" / "site.json").read_text(encoding="utf-8"))
SLIDES = {s["id"]: s for s in DATA["slides"]}
COUNTRIES = {c["id"]: c for c in DATA["countries"]}
CONTINENTS = {c["id"]: c for c in DATA["continents"]}
IG = DATA["instagram"]
# his email, published on About only (his call, 2026-10-15), written as character codes so the
# address reads and clicks normally but simple address-collecting bots do not find it
MAIL = "".join(f"&#{ord(ch)};" for ch in DATA["email"])
SIZES = (640, 1280)
SRGB = "/System/Library/ColorSync/Profiles/sRGB Profile.icc"
SITE = "tuan photography 陳亮元"
STAMP = time.strftime("%Y%m%d%H%M")   # added to the stylesheet and script addresses so browsers never show a stale copy

PAPER = "#f7f2e9"   # the page ground, for the browser's own bars

# what each tab is for: PRODUCT.md, "Tabs 定位"
NAV = [("gallery", "navGallery", "Gallery", "gallery.html"),
       ("journey", "navJourney", "Journey", "journey/"),   # design 2, the pen-and-wash map: design 1/journey is a link to the design 2 folder
       ("guides", "navGuides", "Guides", "guides.html"),
       ("about", "navAbout", "About", "about.html")]


def e(text):
    return html.escape(text, quote=True)


# ------------------------------------------------------------------ punctuation

CJK = r"[　-〿㐀-鿿＀-￯]"
PAIRS = {",": "，", ":": "：", ";": "；", "!": "！", "?": "？"}


def zh_punct(text):
    """Chinese text is set with full-width punctuation. Numbers, times and Latin words keep theirs."""
    text = re.sub(rf"(?<={CJK})[,:;!?]|[,:;!?](?={CJK})", lambda m: PAIRS[m.group(0)], text)

    def bracket(m):
        before, inner, after = m.group(1), m.group(2), m.group(3)
        if re.search(CJK, before + inner + after):
            return f"{before}（{inner}）{after}"
        return m.group(0)
    return re.sub(r"(.?)\(([^()<>]*)\)(.?)", bracket, text)


def no_dash_en(text):
    """No long dashes. A dash that introduces something becomes a colon; one that adds on becomes a comma."""
    if text.strip() in ("—", "–"):
        return "-"
    text = re.sub(r">\s*[—–]\s*<", ">-<", text)      # a table cell that only holds a dash
    text = text.replace(" – ", " - ").replace("–", "-")

    def fix(m):
        left = m.string[:m.start()]
        start = max(left.rfind(". "), left.rfind(">"), left.rfind("! "), left.rfind("? "))
        sentence = left[start + 1:]
        rest = m.string[m.end():]
        if re.match(r"(and|or|but|because|so)\b", rest):
            return ", "
        if ":" in sentence:
            return ". " + "\x00"          # marker: capitalise what follows
        return ": "
    text = re.sub(r"\s*—\s*", fix, text)
    return re.sub("\x00(.)", lambda m: m.group(1).upper(), text)


def no_dash_zh(text):
    if text.strip() in ("—", "–"):
        return "-"
    text = text.replace("–", "-")

    def fix(m):
        left = m.string[:m.start()]
        start = max(left.rfind("。"), left.rfind(">"), left.rfind("！"), left.rfind("？"))
        sentence = left[start + 1:]
        rest = m.string[m.end():]
        if rest[:1] in "而或但也因所":
            return "，"
        if len(sentence) <= 14 and not re.search("[，：,:]", sentence):
            return "："
        return "，"
    return re.sub(r"\s*—+\s*", fix, text)


def few_dots(text, zh=False):
    """One middle dot a line at most. Lists of places read as lists."""
    if zh:
        return text.replace("・", "、") if "・" in text else (text.replace(" · ", "、") if text.count("·") > 1 else text)
    return text.replace(" · ", ", ") if text.count("·") > 1 else text


def clean_en(text):
    return few_dots(no_dash_en(text))


def clean_zh(text):
    return zh_punct(few_dots(no_dash_zh(text), zh=True))


# ------------------------------------------------------------------ photographs

def make_sizes():
    """Smaller copies of each photograph for phones and grids, converted to sRGB.

    A copy is remade only when its photograph has changed. That is judged by the photograph's
    contents, noted in data/sizes.json, because file dates change whenever the project
    is copied or restored and would remake every copy for nothing.
    """
    web = OUT / "images" / "web"
    note = ROOT / "data" / "sizes.json"
    made = json.loads(note.read_text(encoding="utf-8")) if note.exists() else {}
    for s in DATA["slides"]:
        src = web / s["file"]
        mark = hashlib.sha1(src.read_bytes()).hexdigest()
        for width in SIZES:
            out = web / str(width) / s["file"]
            if out.exists() and made.get(s["file"]) == mark:
                continue
            out.parent.mkdir(exist_ok=True)
            subprocess.run(["sips", "--resampleWidth", str(width), "-m", SRGB,
                            "--setProperty", "formatOptions", "68", str(src), "--out", str(out)],
                           check=True, capture_output=True)
        made[s["file"]] = mark
    note.write_text(json.dumps(made, indent=1, sort_keys=True) + "\n", encoding="utf-8")


def ratio(s):
    return f"{s['w'] / s['h']:.4f}"


def srcset(s, root):
    base = f"{root}images/web/"
    return ", ".join([f"{base}{w}/{s['file']} {w}w" for w in SIZES] + [f"{base}{s['file']} {s['w']}w"])


def img(s, root, sizes, first=False, soon=False, named=True):
    """first: the page's lead photograph. soon: in the first window, fetched without waiting.
    named=False: the photograph stands beside its own name (a tile, a feature), so it is not described twice."""
    base = f"{root}images/web/"
    load = 'fetchpriority="high"' if first else ('decoding="async"' if soon else 'loading="lazy" decoding="async"')
    alt = f'alt="{e(s["alt"]["en"])}" data-i18n-alt="sa_{s["id"]}"' if named else 'alt=""'
    return (f'<img src="{base}1280/{s["file"]}" srcset="{srcset(s, root)}" sizes="{sizes}" '
            f'width="{s["w"]}" height="{s["h"]}" {alt} {load}>')


def strings(s, en, zh):
    sid = s["id"]
    for lang, d in (("en", en), ("zh", zh)):
        d[f"sp_{sid}"] = s["place"][lang]
        d[f"sa_{sid}"] = s["alt"][lang]
    en[f"sl_{sid}"] = f'{s["place"]["en"]}: how this was made'
    zh[f"sl_{sid}"] = f'{s["place"]["zh"]}：這張怎麼拍'


def opens(sid, root, en, zh):
    """Attributes for a link that opens a photograph."""
    return (f'href="{root}gallery.html#s-{sid}" data-slide="{sid}" '
            f'aria-label="{e(en[f"sl_{sid}"])}" data-i18n-aria="sl_{sid}"')


def camera(s):
    if "focal" not in s:   # a photograph whose file lost its camera data shows none: nothing is invented
        return ""
    parts = [s["focal"], s["aperture"], s["shutter"], "ISO " + s["iso"]]
    return '<span class="data">' + "".join(f"<span>{e(p)}</span>" for p in parts) + "</span>"


def piece(sid, root, en, zh, sizes, first=False, anchor=False, flex=False, data=False):
    """A photograph with its place name under it. Opening it shows how it was made."""
    s = SLIDES[sid]
    strings(s, en, zh)
    en[f"sw_{sid}"], zh[f"sw_{sid}"] = s["where"]["en"], s["where"]["zh"]
    attrs = (f' id="s-{sid}"' if anchor else "") + (f' style="--ar: {ratio(s)}"' if flex else "")
    second = camera(s) if data else f'<span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span>'
    return (f'<figure class="piece"{attrs}><a {opens(sid, root, en, zh)}>{img(s, root, sizes, first)}</a>'
            f'<figcaption><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>{second}</figcaption></figure>')


def rows_of(ids, per_row=3.2):
    """Split photographs into rows of nearly equal total width, so every row fills the page
    and no photograph is cropped. per_row is how many 'widths of a square' a row should hold."""
    ars = [SLIDES[i]["w"] / SLIDES[i]["h"] for i in ids]
    n = len(ids)
    k = max(1, min(n, round(sum(ars) / per_row)))
    goal = sum(ars) / k
    best = {(0, 0): (0.0, [])}
    for i in range(1, n + 1):
        for j in range(1, min(i, k) + 1):
            for p in range(j - 1, i):
                if (p, j - 1) not in best or (n > 1 and i - p < 2):   # no photograph alone in a row
                    continue
                cost = best[(p, j - 1)][0] + (sum(ars[p:i]) - goal) ** 2
                if (i, j) not in best or cost < best[(i, j)][0]:
                    best[(i, j)] = (cost, best[(p, j - 1)][1] + [ids[p:i]])
    return best[(n, k)][1]


def wall(ids, root, en, zh, per_row=3.2, anchors=False):
    out = []
    for row in rows_of(ids, per_row):
        items = ["    " + piece(sid, root, en, zh, "(max-width: 40rem) 92vw, 45vw", anchor=anchors, flex=True)
                 for sid in row]
        out.append('  <div class="wall__row">\n' + "\n".join(items) + "\n  </div>")
    return '<div class="wall">\n' + "\n".join(out) + "\n</div>"


def grid(ids, root, en, zh):
    """The portfolio: a tight grid of even openings with no captions. Opening one shows it whole."""
    cells = []
    for n, sid in enumerate(ids):
        s = SLIDES[sid]
        strings(s, en, zh)
        cells.append(f'    <figure><a {opens(sid, root, en, zh)}>'
                     f'{img(s, root, "(max-width: 52rem) 46vw, 22vw", first=n == 0, soon=n < 8)}</a></figure>')
    return '<div class="grid">\n' + "\n".join(cells) + "\n  </div>"


def country_tile(c, root, en, zh):
    """A country shown as its first photograph with its name under it."""
    cid = c["id"]
    ph = next(s for s in DATA["slides"] if s["country"] == cid)
    strings(ph, en, zh)
    en[f"cn_{cid}"], zh[f"cn_{cid}"] = c["en"], c["zh"]
    return (f'<li><a class="tile" href="{root}countries/{cid}.html"><span class="tile__photo">'
            f'{img(ph, root, "(max-width: 40rem) 92vw, 30vw", named=False)}</span>'
            f'<span class="tile__name" data-i18n="cn_{cid}">{e(c["en"])}</span></a></li>')


def shot(sid, root, en, zh):
    """A photograph inside a guide, with its camera data under it."""
    return piece(sid, root, en, zh, "(max-width: 50rem) 92vw, 50rem", anchor=True, flex=True, data=True)


def cover(sid, root, en, zh):
    """The opening photograph of the home page: the whole window, nothing written across it."""
    s = SLIDES[sid]
    strings(s, en, zh)
    en[f"sw_{sid}"], zh[f"sw_{sid}"] = s["where"]["en"], s["where"]["zh"]
    # the photograph is cropped to the window's height, so on a tall narrow screen it is wider than the window
    sizes = "max(100vw, " + str(round(100 * s["w"] / s["h"])) + "vh)"
    return (f'<figure class="cover arrive"><a {opens(sid, root, en, zh)}>{img(s, root, sizes, first=True)}</a>'
            f'<figcaption><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>'
            f'<span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span></figcaption></figure>')


def window(sid, root, en, zh):
    """A second window onto a photograph, part way down the home page: it fills the window's
    width and stays where it is while the page is drawn over it, like the opening one."""
    s = SLIDES[sid]
    strings(s, en, zh)
    en[f"sw_{sid}"], zh[f"sw_{sid}"] = s["where"]["en"], s["where"]["zh"]
    return (f'<figure class="window"><a {opens(sid, root, en, zh)}>{img(s, root, "100vw", soon=True)}</a>'
            f'<figcaption><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>'
            f'<span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span></figcaption></figure>')


# ------------------------------------------------------------------ page frame

def head(title, desc, root, attrs="", extra=""):
    """attrs: more attributes for <html>; extra: more lines for the <head> (the home page's own stylesheet)."""
    return f"""<!DOCTYPE html>
<html lang="en" data-root="{root}"{attrs}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{e(title)}</title>
  <meta name="description" content="{e(clean_en(desc))}">
  <meta name="theme-color" content="{PAPER}">
  <link rel="icon" type="image/png" href="{root}icons/favicon-96x96.png" sizes="96x96">
  <link rel="icon" type="image/svg+xml" href="{root}icons/favicon.svg">
  <link rel="shortcut icon" href="{root}favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="{root}icons/apple-touch-icon.png">
  <meta name="apple-mobile-web-app-title" content="PT">
  <link rel="manifest" href="{root}site.webmanifest">
  <link rel="stylesheet" href="{root}css/fonts.css?v={STAMP}">
  <link rel="stylesheet" href="{root}css/style.css?v={STAMP}">
{extra}</head>
<body>
"""


def header(root, current, over=False):
    items = "\n".join(
        f'        <li><a href="{href if href.startswith("http") else root + href}" data-i18n="{key}"'
        + (' aria-current="page"' if current == nid else "") + f">{label}</a></li>"
        for nid, key, label, href in NAV)
    cls = {False: "wrap top", True: "wrap top top--over", "ink": "wrap top top--over top--ink"}[over]
    return f"""<a class="skip btn" href="#main" data-i18n="skip">Skip to the content</a>
<header class="{cls}">
  <a class="name" href="{root}index.html">tuan photography <span>陳亮元</span></a>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-i18n="navMenu">Menu</button>
  <nav class="menu" id="menu" aria-label="Site">
    <ul>
{items}
    </ul>
    <div class="lang" role="group" aria-label="Language">
      <button id="lang-en" type="button" aria-pressed="true" lang="en">EN</button><i></i><button id="lang-zh" type="button" aria-pressed="false" lang="zh-Hant">中文</button>
    </div>
  </nav>
</header>
"""


def footer(root, used, en, zh, foot=True, scripts=()):
    """The footer block, then the page's data and scripts. foot=False leaves the block out (the
    photo wall fills the window); scripts are the page's own, loaded after main.js."""
    links = "\n".join(f'        <li><a href="{href if href.startswith("http") else root + href}" data-i18n="{key}">{label}</a></li>'
                      for _, key, label, href in NAV)
    data = []
    for sid in used:
        s = json.loads(json.dumps(SLIDES[sid]))
        s["srcset"] = srcset(s, root)
        for field in ("place", "where", "alt", "best", "note"):
            if field in s:
                s[field]["en"] = clean_en(s[field]["en"])
                s[field]["zh"] = clean_zh(s[field]["zh"])
        data.append(s)
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    page = json.dumps({"en": en, "zh": zh}, ensure_ascii=False, indent=1).replace("</", "<\\/")
    block = f"""
<footer class="foot">
  <div class="wrap">
    <a class="foot__handle" href="{IG['url']}" target="_blank" rel="noopener">@{IG['handle']}</a>
    <p><a class="btn" href="{IG['url']}" target="_blank" rel="noopener" data-i18n="followCta">Follow on Instagram</a></p>
    <div class="foot__small">
      <ul>
{links}
      </ul>
      <p data-i18n="footNote">© 2026 tuan photography 陳亮元. All photographs are my own.</p>
    </div>
  </div>
</footer>
""" if foot else "\n"
    own = "".join(f'\n<script src="{root}js/{name}?v={STAMP}"></script>' for name in scripts)
    return block + f"""
<script type="application/json" id="slides-data">{blob}</script>
<script>
window.pageI18n = {page};
</script>
<script src="{root}js/main.js?v={STAMP}"></script>{own}
</body>
</html>
"""


def write(path, title, zh_title, desc, current, body, en, zh, over=False, foot=True, scripts=(), first=""):
    root = "../" * (len(Path(path).parts) - 1)
    en["docTitle"], zh["docTitle"] = title, zh_title
    for k in list(en):
        en[k] = clean_en(en[k])
    for k in list(zh):
        zh[k] = clean_zh(zh[k])
    body = no_dash_en(body)
    # the dictionaries are the one source of truth: the page's first (English) text comes from them
    body = re.sub(r'(<[^>]*\bdata-i18n="([^"]+)"[^>]*>)([^<]*)(?=</)',
                  lambda m: m.group(1) + (e(en[m.group(2)]) if m.group(2) in en else m.group(3)), body)
    body = re.sub(r'(<(\w+)[^>]*\bdata-i18n-html="([^"]+)"[^>]*>)(.*?)(?=</\2>)',
                  lambda m: m.group(1) + (en[m.group(3)] if m.group(3) in en else m.group(4)), body, flags=re.S)
    body = re.sub(r'alt="[^"]*" data-i18n-alt="([^"]+)"',
                  lambda m: f'alt="{e(en[m.group(1)])}" data-i18n-alt="{m.group(1)}"', body)
    body = re.sub(r'aria-label="[^"]*" data-i18n-aria="([^"]+)"',
                  lambda m: f'aria-label="{e(en[m.group(1)])}" data-i18n-aria="{m.group(1)}"', body)
    used = list(dict.fromkeys(re.findall(r'data-slide="([^"]+)"', body)))
    out = head(title, desc, root) + first + header(root, current, over) + '<main id="main" tabindex="-1">\n' + body + "\n</main>\n" \
        + footer(root, used, en, zh, foot, scripts)
    (OUT / path).write_text(out, encoding="utf-8")
    print("  wrote", path)


def page_top(title_key, title, sub_key=None, sub="", path="", extra=""):
    p = f'\n    <p data-i18n="{sub_key}">{e(sub)}</p>' if sub_key else ""
    return f"""<div class="wrap">
  <header class="page-top">{path}
    <h1 data-i18n="{title_key}">{e(title)}</h1>{p}{extra}
  </header>
"""


def crumbs(items):
    lis = "".join(f'<li><a href="{href}" data-i18n="{key}">{e(label)}</a></li>' for href, key, label in items)
    return f'\n    <ol class="path">{lis}</ol>'


def has_work(c):
    return any(s["country"] == c["id"] for s in DATA["slides"]) or any(g["country"] == c["id"] for g in DATA["guides"])


def feature(g, root, en, zh, with_country=True):
    """A guide shown large: its photograph beside its name."""
    gid = g["id"]
    c = COUNTRIES[g["country"]]
    ph = SLIDES[g["lead"]]
    strings(ph, en, zh)
    en[f"g_{gid}"], zh[f"g_{gid}"] = g["title"]["en"], g["title"]["zh"]
    en[f"gf_{gid}"] = (c["en"] + ", " if with_country else "") + g["facts"]["en"].replace(" · ", ", ")
    zh[f"gf_{gid}"] = (c["zh"] + "、" if with_country else "") + g["facts"]["zh"].replace(" · ", "、")
    en["guideOpen"], zh["guideOpen"] = "Read the guide", "閱讀攻略"
    return f"""<a class="feature" href="{root}{g['href']}">
      <span class="feature__photo">{img(ph, root, "(max-width: 52rem) 92vw, 56vw", named=False)}</span>
      <span class="feature__say">
        <span class="feature__name" data-i18n="g_{gid}">{e(g['title']['en'])}</span>
        <span class="feature__facts num" data-i18n="gf_{gid}">{e(en[f'gf_{gid}'])}</span>
        <span class="feature__go" data-i18n="guideOpen">Read the guide</span>
      </span>
    </a>"""


def shelf(root, en, zh):
    """The guides as books on a ring that never ends, seen from the front like a coverflow: one
    book per shelf entry (a country, or a city within one), in the owner's order. The script turns the ring and places each book.
    A written guide is a book that opens the guide; the others open the country's photographs."""
    en.update(bandGuide="A photographer's guide", bandPhotos="Photographs", bandNone="No photographs yet",
              bookOpen="Read the guide", bookNot="Guide not written yet", series="tuan photography")
    zh.update(bandGuide="攝影師的攻略", bandPhotos="作品", bandNone="還沒有照片",
              bookOpen="閱讀攻略", bookNot="攻略還沒寫", series="tuan photography")
    tones = ("clay", "olive", "slate")
    books = []
    for i, b in enumerate(DATA["shelf"]):
        tone = tones[i % len(tones)]
        if "guide" in b:
            g = next(x for x in DATA["guides"] if x["id"] == b["guide"])
            key, title, href = f"bk_{g['id']}", g["title"], f"{root}{g['href']}"
            sid, band, status = b.get("photo") or g["lead"], "bandGuide", "bookOpen"
        else:
            # A book for one city (the four US cities) is keyed by its place and opens its
            # country's page; its photographs are the slides marked with that city.
            c, place = COUNTRIES[b["country"]], b.get("place")
            key, title, href = f"bk_{place or c['id']}", b.get("title") or {"en": c["en"], "zh": c["zh"]}, f"{root}countries/{c['id']}.html"
            mine = (lambda x: x.get("city") == place) if place else (lambda x: x["country"] == c["id"])
            sid = b.get("photo") or next((x["id"] for x in DATA["slides"] if mine(x)), None)
            band, status = ("bandPhotos" if sid else "bandNone"), "bookNot"
        en[key], zh[key] = title["en"], title["zh"]
        en[f"bo_{key}"] = f"{title['en']}: {en[status].lower() if status == 'bookOpen' else en[status]}"
        zh[f"bo_{key}"] = f"{title['zh']}：{zh[status]}"
        t = e(title["en"])
        if sid:
            strings(SLIDES[sid], en, zh)
            face = f'<span class="book__face">{img(SLIDES[sid], root, "11rem", soon=True, named=False)}'
        else:
            face = f'<span class="book__face book__face--blank"><b data-i18n="{key}">{t}</b>'
        books.append(f'<a class="book book--{tone}" href="{href}" aria-label="{e(en[f"bo_{key}"])}" data-i18n-aria="bo_{key}"><span class="book__box">'
                     f'<span class="book__spine"><b data-i18n="{key}">{t}</b><i data-i18n="series">tuan photography</i></span>'
                     f'{face}<span class="book__band"><b data-i18n="{key}">{t}</b><span data-i18n="{band}">{e(en[band])}</span></span></span>'
                     f'<span class="book__back"><i data-i18n="series">tuan photography</i></span><span class="book__edge"></span>'
                     f'<span class="book__top"></span><span class="book__shadow"></span><span class="book__veil"></span></span>'
                     f'<span class="book__name"><b data-i18n="{key}">{t}</b><span data-i18n="{status}">{e(en[status])}</span></span></a>')
    return '<div class="shelf"><div class="stack">' + "".join(books) + "</div></div>"


def timed_cards(root, en, zh):
    """Experiment timed-cards: the guides as a row of photo cards in front of one full-window
    photograph, after Giulio Cuscito's "Timed Cards Opening". Every few seconds the first card
    lifts out of the row and grows into the new background, and the name of that place rises in
    at the left. The first place is drawn here as plain HTML; the script runs the rest."""
    en.update(tcGuide="Read the guide", tcPhotos="See the photographs", tcPrev="Previous", tcNext="Next",
              tcLabel="Guides, one place at a time", tcPause="Pause", tcPlay="Play")
    zh.update(tcGuide="閱讀攻略", tcPhotos="看照片", tcPrev="上一個", tcNext="下一個",
              tcLabel="攻略，一次一個地方", tcPause="暫停", tcPlay="播放")
    conts = {c["id"]: c for c in DATA["continents"]}
    places = []
    for b in DATA["shelf"]:
        if "guide" in b:
            g = next(x for x in DATA["guides"] if x["id"] == b["guide"])
            c = COUNTRIES[g["country"]]
            name, href, btn = g["title"], g["href"], "tcGuide"
        else:
            c = COUNTRIES[b["country"]]
            name = b.get("title") or {"en": c["en"], "zh": c["zh"]}
            href, btn = f"countries/{c['id']}.html", "tcPhotos"
        # the small line above every name is one kind of thing: the continent
        k = conts[c["continent"]]
        where = {"en": k["en"], "zh": k["zh"]}
        sid = b.get("cover") or b.get("photo")
        if sid == DATA["lead"]:   # the opening photograph is not shown a second time as a card
            sid = b.get("photo")
        if not sid:
            continue
        x = SLIDES[sid]
        # the line under the name says what his photographs there show: up to three subjects,
        # each only once ("Matterhorn" and "Matterhorn reflected" are one subject)
        if "guide" in b:
            mine = lambda y, c=c: y["country"] == c["id"]
        elif b.get("place"):
            mine = lambda y, pl=b["place"]: y.get("city") == pl
        else:
            mine = lambda y, c=c: y["country"] == c["id"]
        def subject(y):   # "The Capitol at dusk" and "The Capitol" are one subject: its first two words
            w = [t for t in re.split(r"[\s,/]+", y["place"]["en"].lower()) if t and t != "the"]
            return " ".join(w[:2]) if len(w) > 1 and w[1] not in ("at", "in", "from", "of", "over") else w[0]
        picked, seen = [], set()
        for y in DATA["slides"]:
            if mine(y) and len(picked) < 3 and not any(subject(y).startswith(o) or o.startswith(subject(y)) for o in seen):
                seen.add(subject(y)); picked.append(y)
        en_names, zh_names = [q["place"]["en"] for q in picked], [q["place"]["zh"] for q in picked]
        en_list = en_names[0] if len(en_names) == 1 else ", ".join(en_names[:-1]) + " and " + en_names[-1]
        note = {"en": f"Photographs of {en_list}.", "zh": "照片：" + "、".join(zh_names) + "。"}
        places.append({"f": x["file"], "w": x["w"], "h": x["h"], "href": root + href, "btn": btn,
                       "name": name, "where": where,
                       "note": {"en": clean_en(note["en"]), "zh": clean_zh(note["zh"])}})
    first, n = places[0], len(places)
    data = json.dumps(places, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    lines = "".join(f'<span class="tc__line"><span>{e(w)}</span></span>' for w in first["name"]["en"].split())
    cards = "".join(
        f'<li class="tc__card" data-j="{j}"><img src="{root}images/web/640/{p["f"]}" alt="" loading="lazy" decoding="async">'
        f'<span class="tc__foot"><i></i><small>{e(p["where"]["en"])}</small><b>{e(p["name"]["en"])}</b></span></li>'
        for j, p in enumerate(places[1:]))
    chev = lambda d: (f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="{d}" fill="none" '
                      f'stroke="currentColor" stroke-width="1.6"/></svg>')
    return f"""<section class="tc" aria-label="{e(en['tcLabel'])}" data-i18n-aria="tcLabel">
  <div class="tc__bg"><div class="tc__layer"><img src="{root}images/web/1280/{first['f']}" srcset="{root}images/web/1280/{first['f']} 1280w, {root}images/web/{first['f']} {first['w']}w" sizes="100vw" alt=""><i class="tc__shade"></i></div></div>
  <div class="tc__text" aria-live="off">
    <i class="tc__rule"></i>
    <p class="tc__where">{e(first['where']['en'])}</p>
    <h3 class="tc__title">{lines}</h3>
    <p class="tc__note">{e(first['note']['en'])}</p>
    <a class="tc__btn" href="{first['href']}">{e(en[first['btn']])}</a>
  </div>
  <ol class="tc__cards" aria-hidden="true">{cards}</ol>
  <div class="tc__nav">
    <button class="tc__arrow" type="button" data-go="-1" aria-label="Previous" data-i18n-aria="tcPrev">{chev("M14.5 6 8.5 12l6 6")}</button>
    <button class="tc__arrow" type="button" data-go="1" aria-label="Next" data-i18n-aria="tcNext">{chev("M9.5 6l6 6-6 6")}</button>
    <button class="tc__pause" type="button" aria-pressed="false" data-i18n="tcPause">Pause</button>
    <span class="tc__bar"><i></i></span>
    <span class="tc__count num"><span>01</span><small>/ {n:02d}</small></span>
  </div>
  <script type="application/json" id="tc-data">{data}</script>
</section>"""


# ------------------------------------------------------------------ pages

# ------------------------------------------------------------------ the home page
# Since 2026-11-12 the home page is the one from the home redesign rounds (design 2/new/home-redesign, his review
# list): the TUAN photography loading screen, a wall of his photographs that slides in while the view closes on the
# middle one ("the wall, in one move", on black: number 9 of the last round, his pick), and that middle one is the
# short film of Barcelona the page opens on. Under the film: two thoughts on flat blocks of the earth colours with
# photographs set into them, and the three ways in. Its styles are css/home.css and its script js/home.js; the page
# before it is at the tag before-home-redesign-live-2026-11-12.
HOME_WALL = ["matterhorn-lake", "queensboro-train", "fuji-lake", "roys-peak", "sapa-terraces", "tekapo-stars", "aurora",
             "golden-gate-fog", "dumbo-bridge", "otaru-canal", "kifune", "gordes", "calanque", "zermatt-dusk", "hoi-an-gate",
             "peak-night", "neuschwanstein", "bunkers", "aoraki", "tekapo-church", "fuji-shinkansen", "sapa-valley",
             "lower-manhattan-reflection", "empire-state-sunset"]   # 24 photographs round the film, in this order
# the film's four scenes (media/barcelona.mp4, 12.1 s; cross-fades near 3, 6 and 9 s): when each caption shows, in
# seconds of the film. The first shot holds until 3.2 s.
HOME_SPAIN = ("Barcelona, July 2026", "巴塞隆納，2026 年 7 月")
HOME_SCENES = [
    (0.5, 2.9, ("Sagrada Família", "聖家堂")),
    (3.5, 5.6, ("Barcelona from Tibidabo", "從提比達波看巴塞隆納")),
    (6.5, 8.6, ("The wheel on Tibidabo", "提比達波的摩天輪")),
    (9.5, 11.7, ("Inside the Sagrada Família", "聖家堂裡面")),
]
HOME_DOORS = [
    ("gallery.html", "Gallery", "作品集", "Every photograph.", "所有的照片。"),
    ("journey/", "Journey", "旅程", "Every trip, along its route.", "每一趟旅程，沿著路線看。"),
    ("guides.html", "Guides", "攻略", "Where to stand and when, place by place.", "每個地方，站在哪裡、什麼時候去。"),
]


def both(en, zh):
    """One string in both languages; css/home.css shows the one the page is in."""
    return f'<span lang="en">{clean_en(en)}</span><span lang="zh-Hant">{clean_zh(zh)}</span>'


def home_mark(cls):
    """The logo, 1C: TUAN, a line, PHOTOGRAPHY spread to TUAN's width."""
    return (f'<span class="{cls}__name">TUAN</span><span class="{cls}__line"></span>'
            f'<span class="{cls}__sub">{"".join(f"<span>{c}</span>" for c in "photography")}</span>')


def home_fig(sid, cls="", sizes="(max-width: 48rem) 92vw, 60vw"):
    s = SLIDES[sid]
    f = s["file"]
    alt = s.get("alt", {})
    return (f'<figure class="hr-fig hr-in {cls}"><a href="gallery.html">'
            f'<img src="images/web/1280/{f}" srcset="images/web/640/{f} 640w, images/web/1280/{f} 1280w, images/web/{f} {max(s["w"], s["h"])}w" '
            f'sizes="{sizes}" width="{s["w"]}" height="{s["h"]}" alt="{e(alt.get("en", ""))}" data-alt-en="{e(alt.get("en", ""))}" '
            f'data-alt-zh="{e(alt.get("zh", ""))}" loading="lazy" decoding="async"></a>'
            f'<figcaption><b>{both(e(s["place"]["en"]), e(s["place"]["zh"]))}</b>'
            f'<span>{both(e(s["where"]["en"]), e(s["where"]["zh"]))}</span></figcaption></figure>')


def build_home():
    title_en = f"{SITE} - Landscape photographs and how each one was made"
    title_zh = f"{SITE} - 風景攝影，以及每一張是怎麼拍的"
    desc = ("Landscape photographs by 陳亮元 Thomas Chen, each with the account of how it was made: camera data, "
            "where to stand, and the guide to the place.")
    tuan = "".join(f'<span style="--i: {i}">{c}</span>' for i, c in enumerate("TUAN"))
    wall = "".join(f'<div class="hr-tile"><img data-src="images/web/640/{SLIDES[s]["file"]}" alt=""></div>' for s in HOME_WALL)
    film_tile = '<div class="hr-tile hr-tile--film"><video muted playsinline loop preload="auto" data-src="media/barcelona.mp4"></video></div>'
    # the loading screen and the opening. The small script runs before anything is drawn, so the page never shows
    # first: once per visit, never under "reduce motion"; ?opening plays it again
    opening = f"""<div class="hr-load" aria-hidden="true">
  <div class="hr-load__paper"></div>
  <div class="hr-flock">{wall}{film_tile}</div>
  <div class="hr-load__mark"><span class="hr-load__name">{tuan}</span><span class="hr-load__line"></span><span class="hr-load__sub">{"".join(f"<span>{c}</span>" for c in "photography")}</span></div>
</div>
<script>(function () {{ var seen = null; try {{ seen = sessionStorage.getItem("tuan-opening"); }} catch (e) {{}} if ((!seen || /[?&]opening\\b/.test(location.search)) && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("hr-loading"); }})();</script>
"""
    menu = "".join(f'<a class="caps" href="{href}">{both(en, zh)}</a>'
                   for href, en, zh, _, _ in HOME_DOORS + [("about.html", "About", "關於我", "", "")])
    top = f"""<header class="hr-top">
  <a class="hr-mark" href="./" aria-label="tuan photography">{home_mark("hr-mark")}</a>
  <nav class="hr-menu" aria-label="Menu" data-label-en="Menu" data-label-zh="選單">{menu}
    <span class="hr-lang"><button class="caps" type="button" data-lang="en">EN</button><button class="caps" type="button" data-lang="zh">中文</button></span>
  </nav>
</header>"""
    caps = "".join(f'<span class="hr-cap__one" data-from="{a}" data-to="{b}"><b>{both(*name)}</b><small class="caps">{both(*HOME_SPAIN)}</small></span>'
                   for a, b, name in HOME_SCENES)
    film = ('<section class="hr-open" aria-label="Barcelona" data-label-en="Barcelona" data-label-zh="巴塞隆納">'
            '<video muted loop playsinline preload="auto" poster="media/road-first.jpg" aria-hidden="true">'
            '<source src="media/barcelona.mp4" type="video/mp4"></video>'
            f'<p class="hr-cap" data-cut="3.2" aria-hidden="true">{caps}</p></section>')
    say1 = both("Landscape photographs by Thomas Chen.", "陳亮元的風景攝影。")
    say2 = both("Open any one to see how it was made.", "點開任何一張，看它是怎麼拍的。")
    body = "\n".join([
        f'<section class="hr-block"><p class="hr-in">{say1}</p>{home_fig("sapa-terraces", sizes="(max-width: 48rem) 92vw, 22vw")}{home_fig("matterhorn-lake", sizes="(max-width: 48rem) 92vw, 22vw")}</section>',
        '<div class="hr-paper">',
        home_fig("fuji-lake", "hr-wide", "(max-width: 48rem) 92vw, 76rem"),
        f'<div class="hr-pair">{home_fig("tekapo-stars", sizes="(max-width: 48rem) 66vw, 22vw")}{home_fig("roys-peak", sizes="(max-width: 48rem) 92vw, 54vw")}</div>',
        "</div>",
        f'<section class="hr-block hr-block--slate"><p class="hr-in">{say2}</p>{home_fig("golden-gate-fog", sizes="(max-width: 48rem) 92vw, 50vw")}</section>',
    ])
    doors = "".join(f'<li><a class="hr-door hr-in" href="{href}"><b>{both(en, zh)}</b><span>{both(den, dzh)}</span></a></li>'
                    for href, en, zh, den, dzh in HOME_DOORS)
    foot = f"""<footer class="hr-foot">
  <span class="hr-mark" aria-hidden="true">{home_mark("hr-mark")}</span>
  <a href="{IG["url"]}" target="_blank" rel="noopener">@{IG["handle"]}</a>
  <small>{both("© 2026 tuan photography 陳亮元. All photographs are my own.", "© 2026 tuan photography 陳亮元。所有照片都是我自己拍的。")}</small>
</footer>"""
    attrs = (f' data-home="f" data-counts data-flock="wall" data-ground="dark" data-title-en="{e(title_en)}" data-title-zh="{e(title_zh)}"')
    extra = f'  <meta name="color-scheme" content="light">\n  <link rel="stylesheet" href="css/home.css?v={STAMP}">\n'
    out = (head(title_en, desc, "", attrs, extra) + opening + top + '\n<main id="main">\n' + film + '\n<div class="hr-leaf">\n' + body
           + f'\n<nav class="hr-doors" aria-label="The way in" data-label-en="The way in" data-label-zh="三個入口"><ul>{doors}</ul></nav>\n'
           + foot + f'\n</div>\n</main>\n<script src="js/home.js?v={STAMP}"></script>\n</body>\n</html>\n')
    (OUT / "index.html").write_text(out, encoding="utf-8")
    print("  wrote index.html")


def build_gallery():
    """The photo wall: every photograph on the site as a small print on one screen, in close
    rows that drift sideways; the cursor parts the wall, a click opens the viewer. Five bars
    bottom right (size, gap, tilt, speed, vary) and a Dark/Light word top right. Tried first as
    elements/gallery/ and merged on 2026-10-07 at the owner's word. The behaviour is js/wall.js."""
    en, zh = {}, {}
    root = ""
    en.update(pTitle="Gallery", pSub="Move across the wall. Click a photograph to open it.",
              wallKicker="A photography wall", wallSize="Size", wallGap="Gap", wallTilt="Tilt",
              wallSpeed="Speed", wallVary="Vary", wallDark="Dark", wallLight="Light", wallLabel="Photographs")
    zh.update(pTitle="作品集", pSub="滑過這面牆。點一張照片打開它。",
              wallKicker="一面照片牆", wallSize="大小", wallGap="間距", wallTilt="歪斜",
              wallSpeed="速度", wallVary="差異", wallDark="深色", wallLight="淺色", wallLabel="照片")
    lead = DATA["lead"]
    ids = [lead] + [s["id"] for s in DATA["slides"] if s["id"] != lead]
    tiles = []
    for sid in ids:
        s = SLIDES[sid]
        strings(s, en, zh)
        tiles.append(f'<figure class="print"><a {opens(sid, root, en, zh)}>'
                     f'<img src="images/web/640/{s["file"]}" width="{s["w"]}" height="{s["h"]}" '
                     f'alt="{e(s["alt"]["en"])}" data-i18n-alt="sa_{sid}" decoding="async"></a></figure>')
    def bar(key, label, attrs, shown):
        return (f'    <label class="bar" for="wall-{key}"><span data-i18n="wall{key.capitalize()}">{label}</span>'
                f'<input type="range" id="wall-{key}" {attrs}><output id="wall-{key}-out" for="wall-{key}">{shown}</output></label>')
    body = f"""<section class="pwall" aria-label="Photographs" data-i18n-aria="wallLabel">
  <div class="pwall__tiles">
    {"".join(tiles)}
  </div>
  <div class="pwall__ramp"></div>
  <header class="pwall__head">
    <p class="pwall__kicker caps" data-i18n="wallKicker">A photography wall</p>
    <h1 data-i18n="pTitle">Gallery</h1>
    <p class="pwall__hint" data-i18n="pSub">Move across the wall. Click a photograph to open it.</p>
  </header>
  <div class="pwall__tools">
    <button type="button" class="caps" id="wall-theme" data-i18n="wallDark">Dark</button>
  </div>
  <div class="pwall__bars">
{bar("size", "Size", 'min="0.6" max="2.4" step="0.1" value="1.2"', "×1.2")}
{bar("gap", "Gap", 'min="0" max="60" step="1" value="12"', "12px")}
{bar("tilt", "Tilt", 'min="0" max="8" step="0.5" value="1.5"', "1.5°")}
{bar("speed", "Speed", 'min="0" max="3" step="0.1" value="0.8"', "×0.8")}
{bar("vary", "Vary", 'min="0" max="3" step="0.1" value="1"', "×1.0")}
  </div>
  <figcaption class="pwall__cap" aria-live="polite"><b></b><span></span></figcaption>
</section>"""
    write("gallery.html", f"Gallery - {SITE}", f"作品集 - {SITE}",
          "Every landscape photograph by 陳亮元 Thomas Chen on one wall. Open any one to see how it was made.",
          "gallery", body, en, zh, over="ink", foot=False, scripts=("wall.js",))


def build_guides():
    """What he learned, for a reader planning a trip: the continents travelled, each a square,
    then the General part (what fits any trip; once the Skills tab), then the continents not
    travelled, as names."""
    en, zh = {}, {}
    root = ""
    n_c, guides = len(COUNTRIES), DATA["guides"]
    if len(guides) == 1:
        tail_en = f"One guide so far: {guides[0]['title']['en']}."
        tail_zh = f"攻略目前只有一篇：{guides[0]['title']['zh']}。"
    else:
        tail_en = f"{len(guides)} guides so far."
        tail_zh = f"攻略目前有 {len(guides)} 篇。"
    en.update(pTitle="Guides", pSub=f"{n_c} countries, by continent. {tail_en}",
              noPhoto="No photographs yet", restTitle="Not travelled yet",
              genTitle="General", genSub="For any trip, wherever it goes.", notYet="Not written yet",
              g1="How I plan a photography trip (my full SOP)",
              g2="Finding photo spots before you've ever been there",
              g3="What's in my camera bag (and what stays home)")
    zh.update(pTitle="攻略", pSub=f"{n_c} 個國家，依大洲排列。{tail_zh}",
              noPhoto="還沒有照片", restTitle="還沒去過",
              genTitle="通用篇", genSub="不分國家，每趟旅行都用得上。", notYet="還沒寫",
              g1="我如何規劃一趟攝影旅行（完整 SOP）", g2="出發前就找到攝影點的方法",
              g3="我的相機包裡有什麼（以及什麼留在家）")
    general = "\n".join(f'      <li><span data-i18n="g{i}">{e(en[f"g{i}"])}</span>'
                        f'<span data-i18n="notYet">Not written yet</span></li>' for i in (1, 2, 3))
    tiles, names = [], []
    for k in DATA["continents"]:
        kid = k["id"]
        own = [c for c in DATA["countries"] if c["continent"] == kid]
        en[f"k_{kid}"], zh[f"k_{kid}"] = k["en"], k["zh"]
        if not own:
            names.append(f'<span data-i18n="k_{kid}">{e(k["en"])}</span>')
            continue
        en[f"kn_{kid}"] = "1 country" if len(own) == 1 else f"{len(own)} countries"
        zh[f"kn_{kid}"] = f"{len(own)} 個國家"
        # the photograph named for the continent, or the first one from any of its countries
        sid = k.get("photo") or next((s["id"] for c in own for s in DATA["slides"] if s["country"] == c["id"]), None)
        photo = '<span class="tile__none" data-i18n="noPhoto">No photographs yet</span>'
        if sid:
            strings(SLIDES[sid], en, zh)
            photo = img(SLIDES[sid], root, "(max-width: 56rem) 46vw, 22vw", soon=True, named=False)
        tiles.append(f"""      <li><a class="tile" href="continents/{kid}.html">
        <span class="tile__photo">{photo}</span>
        <h2 class="tile__name" data-i18n="k_{kid}">{e(k['en'])}</h2>
        <span class="tile__count num" data-i18n="kn_{kid}">{e(en[f'kn_{kid}'])}</span>
      </a></li>""")
    body = page_top("pTitle", "Guides", "pSub", en["pSub"]) + f"""  <section class="part">
    <ul class="tiles tiles--four">
{chr(10).join(tiles)}
    </ul>
  </section>
  <section class="part" aria-labelledby="gen-h">
    <div class="part__head">
      <h2 id="gen-h" data-i18n="genTitle">General</h2>
      <p data-i18n="genSub">{e(en['genSub'])}</p>
    </div>
    <ul class="plain">
{general}
    </ul>
  </section>
  <section class="part bleed" aria-labelledby="rest-h">
    <div class="part__head"><h2 id="rest-h" data-i18n="restTitle">Not travelled yet</h2></div>
    <div class="names">{''.join(names)}</div>
  </section>
</div>"""
    write("guides.html", f"Guides - {SITE}", f"攻略 - {SITE}",
          "Travel and photography guides by 陳亮元 Thomas Chen, by country, plus what fits any trip.",
          "guides", body, en, zh)


def back(root, en, zh):
    en.setdefault("backBtn", "Back to guides")
    zh.setdefault("backBtn", "回到攻略")
    return f'<a class="btn btn--line" href="{root}guides.html" data-i18n="backBtn">Back to guides</a>'


def build_continents():
    for k in DATA["continents"]:
        en, zh = {}, {}
        root = "../"
        kid = k["id"]
        own = [c for c in DATA["countries"] if c["continent"] == kid]
        sub = k.get("sub") or k["state"]
        en.update(pTitle=k["en"], pSub=sub["en"], pathDest="Guides")
        zh.update(pTitle=k["zh"], pSub=sub["zh"], pathDest="攻略")
        top = page_top("pTitle", k["en"], "pSub", sub["en"],
                       crumbs([(f"{root}guides.html", "pathDest", "Guides")]))
        if own:
            tiles, names = [], []
            for c in own:
                cid = c["id"]
                en[f"cn_{cid}"], zh[f"cn_{cid}"] = c["en"], c["zh"]
                photos = [s for s in DATA["slides"] if s["country"] == cid]
                href = f"{root}countries/{cid}.html"
                if photos:
                    tiles.append(country_tile(c, root, en, zh))
                else:
                    names.append(f'<a href="{href}" data-i18n="cn_{cid}">{e(c["en"])}</a>')
            body = top
            if tiles:
                body += f'  <section class="part">\n    <ul class="tiles">{"".join(tiles)}</ul>\n  </section>\n'
            if names:
                en["restTitle"], zh["restTitle"] = "Not photographed for the site yet", "還沒有放上照片的地方"
                body += f"""  <section class="part bleed" aria-labelledby="rest-h">
    <div class="part__head"><h2 id="rest-h" data-i18n="restTitle">Not photographed for the site yet</h2></div>
    <div class="names">{''.join(names)}</div>
  </section>
"""
            body += "</div>"
        else:
            en.update(emptyText="There are no photographs or guides from this continent yet.")
            zh.update(emptyText="這個大洲還沒有照片，也還沒有攻略。")
            body = top + f"""  <section class="part">
    <div class="empty">
      <p data-i18n="emptyText">{e(en['emptyText'])}</p>
      {back(root, en, zh)}
    </div>
  </section>
</div>"""
        write(f"continents/{kid}.html", f"{k['en']} - {SITE}", f"{k['zh']} - {SITE}",
              f"{k['en']}: countries photographed by 陳亮元 Thomas Chen.", "guides", body, en, zh)


def build_countries():
    for c in DATA["countries"]:
        en, zh = {}, {}
        root = "../"
        cid = c["id"]
        k = CONTINENTS[c["continent"]]
        own = [s["id"] for s in DATA["slides"] if s["country"] == cid]
        guides = [g for g in DATA["guides"] if g["country"] == cid]
        en.update(pTitle=c["en"], pSub=c["note"]["en"], statLabel=c["date"]["en"],
                  pathDest="Guides", pathCont=k["en"])
        zh.update(pTitle=c["zh"], pSub=c["note"]["zh"], statLabel=c["date"]["zh"],
                  pathDest="攻略", pathCont=k["zh"])
        path = crumbs([(f"{root}guides.html", "pathDest", "Guides"),
                       (f"{root}continents/{k['id']}.html", "pathCont", k["en"])])
        when = f'\n    <p class="when num" data-i18n="statLabel">{e(c["date"]["en"])}</p>'
        parts = [page_top("pTitle", c["en"], "pSub", c["note"]["en"], path, when)]
        if guides:
            en["guidesTitle"], zh["guidesTitle"] = "Guides", "攻略"
            rows = "\n".join(feature(g, root, en, zh, with_country=False) for g in guides)
            parts.append(f"""  <section class="part" aria-labelledby="guides-h">
    <div class="part__head"><h2 id="guides-h" data-i18n="guidesTitle">Guides</h2></div>
    <div class="features">
    {rows}
    </div>
  </section>""")
        if own:
            en["workTitle"], zh["workTitle"] = "Photographs", "作品"
            parts.append(f"""  <section class="part" aria-labelledby="work-h">
    <div class="part__head"><h2 id="work-h" data-i18n="workTitle">Photographs</h2></div>
    {wall(own, root, en, zh)}
  </section>""")
        if not guides:
            if own:
                en["wipText"], zh["wipText"] = "The guide for this country is not written yet.", "這個國家的攻略還沒寫。"
            else:
                en["wipText"] = "The guide for this country is not written yet, and there are no photographs from it on the site."
                zh["wipText"] = "這個國家的攻略還沒寫，網站上也還沒有這裡的照片。"
            parts.append(f"""  <section class="part">
    <div class="empty">
      <p data-i18n="wipText">{e(en['wipText'])}</p>
      {back(root, en, zh)}
    </div>
  </section>""")
        parts.append("</div>")
        write(f"countries/{cid}.html", f"{c['en']} - {SITE}", f"{c['zh']} - {SITE}",
              f"{c['en']}: photographs and guides by 陳亮元 Thomas Chen.", "guides", "\n".join(parts), en, zh)


def build_about():
    en, zh = {}, {}
    cams = sorted({s["camera"] for s in DATA["slides"] if "camera" in s})
    lenses = sorted({s["lens"] for s in DATA["slides"] if "lens" in s})
    # his words, drafted from what he had told us and approved by him on 2026-10-16
    en.update(abName="Thomas Chen", abLine="Landscape photographer, Taiwan",
              abWho=f"I photograph the places I travel to, natural landscapes and cities both, and the photograph is always about the place: its scale and its light. I live in Taiwan and have been to {len(COUNTRIES)} countries, the first of them Malaysia, when I was eight.",
              abLook="I go out for the hour when the light suits a place, and I'll wait for it. I leave myself out of the frame, and I'm not interested in spots that are famous only for being photographed.",
              abTrust="Every trip starts before I leave, in planning documents: where each spot is, when the sun sets there, how to get there, what to eat nearby. Then I go and stand in those places. The guides here are written afterwards, from what actually happened. I walked every spot in them myself, and every photograph on this site is mine. Some spots get an exact pin; fragile ones are left as a general area on purpose.",
              abReach="Questions about a place or a photograph: write to me.",
              fCountries="Countries", fCountriesV=f"{len(COUNTRIES)} so far",
              fHome="Home base", fHomeV="Taiwan",
              fCamera="Camera", fLens="Lenses", fMail="Email")
    zh.update(abName="陳亮元", abLine="風景攝影，台灣",
              abWho=f"我拍旅途中的風景，自然與城市都拍，但照片拍的永遠是那個地方本身：它的尺度，它的光。我住在台灣，去過 {len(COUNTRIES)} 個國家，第一個是八歲那年的馬來西亞。",
              abLook="我出門是為了等一個地方光線最對的那個時刻，願意為它等。我不把自己放進畫面，也對「只因為被拍過才有名」的景點沒興趣。",
              abTrust="每趟旅行在出發前就開始了，寫在規劃文件裡：每個機位在哪、那裡幾點日落、怎麼去、附近吃什麼。然後我出發，親自站到那些地方。這裡的攻略都是回來之後，照實際發生的寫成。裡面每個機位我都親自走過，網站上每張照片都是我拍的。有些機位給精確座標，脆弱的地方則刻意只給大概範圍。",
              abReach="想問某個地方或某張照片，歡迎來信。",
              fCountries="國家數", fCountriesV=f"目前 {len(COUNTRIES)} 個",
              fHome="大本營", fHomeV="台灣",
              fCamera="相機", fLens="鏡頭", fMail="電子郵件")
    body = f"""<div class="wrap">
  <section class="about arrive">
    <h1 class="rise" style="--i: 0" data-i18n="abName">{e(en['abName'])}</h1>
    <p class="about__line rise" style="--i: 1" data-i18n="abLine">{e(en['abLine'])}</p>
    <div class="about__cols">
    <div class="about__say rise" style="--i: 2">
      <p class="lede" data-i18n="abWho">{e(en['abWho'])}</p>
      <p data-i18n="abLook">{e(en['abLook'])}</p>
      <p data-i18n="abTrust">{e(en['abTrust'])}</p>
      <div class="about__reach">
        <p data-i18n="abReach">{e(en['abReach'])}</p>
        <div class="about__ways">
          <a class="btn" href="{IG['url']}" target="_blank" rel="noopener" data-i18n="followCta">Follow on Instagram</a>
          <a href="mailto:{MAIL}">{MAIL}</a>
        </div>
      </div>
    </div>
    <dl class="facts rise" style="--i: 3">
      <div><dt data-i18n="fHome">Home base</dt><dd data-i18n="fHomeV">Taiwan</dd></div>
      <div><dt data-i18n="fCountries">Countries</dt><dd class="num" data-i18n="fCountriesV">{e(en['fCountriesV'])}</dd></div>
      <div><dt data-i18n="fCamera">Camera</dt><dd>{e(', '.join(cams))}</dd></div>
      <div><dt data-i18n="fLens">Lenses</dt><dd>{'<br>'.join(e(x) for x in lenses)}</dd></div>
    </dl>
    </div>
  </section>
</div>"""
    write("about.html", f"About - {SITE}", f"關於我 - {SITE}",
          "About 陳亮元 Thomas Chen, landscape photographer.", "about", body, en, zh)


def build_guide(name, title_en, title_zh, desc):
    d = json.loads((ROOT / "content" / f"{name}.i18n.json").read_text(encoding="utf-8"))
    en, zh = d["en"], d["zh"]
    root = "../"
    body = (ROOT / "content" / f"{name}.body.html").read_text(encoding="utf-8")
    body = body.replace("{root}", root)

    body = re.sub(r"[ \t]*<tr><td data-i18n=\"(\w+)\">[^<]*</td><td data-i18n=\"(\w+)\">[^<]*</td></tr>\n",
                  lambda m: "" if en.get(m.group(2), "").strip() in ("", "-", "—", "–") else m.group(0), body)
    body = re.sub(r"\{plate:([a-z0-9-]+)\}",
                  lambda m: piece(m.group(1), root, en, zh, "(max-width: 80rem) 92vw, 74rem", first=True, anchor=True, data=True), body)
    body = re.sub(r"\{side:([a-z0-9-]+)\}",
                  lambda m: piece(m.group(1), root, en, zh, "(max-width: 46rem) 92vw, 30rem", anchor=True, data=True), body)
    body = body.replace('<div class="shots">', '<div class="wall__row shots">')
    body = re.sub(r"\{shot:([a-z0-9-]+)\}", lambda m: shot(m.group(1), root, en, zh), body)
    body = re.sub(r"\{map:([^}]+)\}",
                  lambda m: f'<a href="{m.group(1)}" target="_blank" rel="noopener" data-i18n="mapLink">Map</a>', body)
    body = body.replace("{ate}", '<span class="ate" data-i18n="ate">eaten</span>')
    for a, b in (('<table class="sheet">', '<table class="sheet" role="table">'), ("<thead>", '<thead role="rowgroup">'),
                 ("<tbody>", '<tbody role="rowgroup">'), ("<tr>", '<tr role="row">')):
        body = body.replace(a, b)
    body = re.sub(r"<th(?=[ >])(?![^>]*role=)", '<th role="columnheader"', body)
    body = re.sub(r"<td(?=[ >])(?![^>]*role=)", '<td role="cell"', body)
    write(f"posts/{name}.html", title_en, title_zh, desc, "guides", body, en, zh)


if __name__ == "__main__":
    print("Making photo sizes…")
    make_sizes()
    print("Writing pages…")
    build_home()
    build_gallery()
    build_guides()
    build_continents()
    build_countries()
    build_about()
    build_guide("barcelona", f"Barcelona - {SITE}", f"巴賽隆納 - {SITE}",
                "A photographer's real 4-day Barcelona guide: Gaudí photo spots with best light, Bunkers del Carmel sunset, Tibidabo, day-by-day route, and a tested tapas list.")
    print("Done.")
    # the owner's private photo list follows the site; a problem there never stops a build
    if (ROOT / "originals").is_dir():
        subprocess.run([sys.executable, str(ROOT / "tools" / "photo_list.py")], check=False)
