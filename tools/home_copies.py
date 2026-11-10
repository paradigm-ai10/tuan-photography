#!/usr/bin/env python3
"""Home page, exact copies (2026-11-10): the two reference sites he kept from the two-directions
page, Mathilde De Chiara and Camille Mormal, rebuilt one to one with his photographs, at his word
("我想要你跟他們做的一模一樣"). Writes, into design 2/new/home-redesign/:

  copy-photos.js     window.COPY: the photographs and places both pages use, read from data/site.json
  copy-mathilde.html the diamond that becomes a column (copy-mathilde.js, .css)
  copy-camille.html  the wall that zooms into one photograph, then a row (copy-camille.js, .css)

Rerun after data/site.json changes:  python3 tools/home_copies.py
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "design 2" / "new" / "home-redesign"
SITE = json.loads((ROOT / "data" / "site.json").read_text())
e = html.escape

COUNTRIES = {c["id"]: c for c in SITE["countries"]}
CONT = {c["id"]: c for c in SITE["continents"]}


def photo(s):
    c = COUNTRIES.get(s["country"], {})
    return {
        "id": s["id"], "file": s["file"], "w": s["w"], "h": s["h"],
        "place": s["place"], "where": s["where"],
        "country": s["country"], "continent": c.get("continent", ""),
        "alt": (s.get("alt") or {}).get("en", ""),
    }


def spread(n):
    """n photographs taken round-robin across countries, so every trip shows."""
    by = {}
    for s in SITE["slides"]:
        by.setdefault(s["country"], []).append(s)
    order, i = [], 0
    while len(order) < n and any(by.values()):
        for k in list(by):
            if by[k]:
                order.append(by[k].pop(0))
                if len(order) == n:
                    break
        i += 1
    return order


def projects():
    """eight 'projects' for the Camille copy: one country each, its first photograph, its count."""
    count = {}
    for s in SITE["slides"]:
        count[s["country"]] = count.get(s["country"], 0) + 1
    seen, out = set(), []
    pick = ["switzerland", "spain", "new-zealand", "japan", "usa", "uk", "vietnam", "france"]
    for cid in pick:
        s = next((x for x in SITE["slides"] if x["country"] == cid), None)
        if s and cid not in seen:
            seen.add(cid)
            c = COUNTRIES[cid]
            out.append({**photo(s), "title": {"en": c["en"], "zh": c["zh"]}, "count": count[cid]})
    return out


data = {
    "photos": [photo(s) for s in spread(30)],
    "wall": [photo(s) for s in spread(48)],
    "projects": projects(),
    "continents": [{"id": c["id"], "en": c["en"], "zh": c["zh"]} for c in SITE["continents"]],
    "img": "../../../images/web/",
    "about": "../../../about.html",
}
(OUT / "copy-photos.js").write_text(
    "/* written by tools/home_copies.py from data/site.json; do not edit */\n"
    "window.COPY = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")


def page(slug, title_en, title_zh, body):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title_en)} {e(title_zh)} · tuan photography 陳亮元</title>
<link rel="icon" href="../../../favicon.ico">
<link rel="stylesheet" href="../../../css/fonts.css">
<link rel="stylesheet" href="copy-{slug}.css">
<script>try {{ if (localStorage.getItem('tlap-lang') === 'zh') document.documentElement.lang = 'zh-Hant'; }} catch (e) {{}}</script>
</head>
<body class="cp cp-{slug}">
{body}
<script src="copy-photos.js"></script>
<script src="copy-{slug}.js"></script>
<link rel="stylesheet" href="review-kit/bar.css">
<script src="review-kit/words.js"></script>
<script src="review-kit/store.js"></script>
<script src="review-kit/bar.js" data-name="home-redesign"></script>
</body>
</html>
"""


def both(en, zh):
    return f'<span lang="en">{en}</span><span lang="zh-Hant">{zh}</span>'


LANG = ('<p class="cp-lang"><button type="button" data-lang="en">EN</button>'
        '<i>/</i><button type="button" data-lang="zh">中文</button></p>')

MATHILDE = f"""<main class="md" id="md" aria-label="Thomas Chen, landscape photographs">
  <h1 class="md-name"><span class="md-mask"><span>Thomas Chen</span></span>
    <span class="md-mask md-sub"><span>{both("Landscape photographer", "風景攝影師 陳亮元")}</span></span></h1>
  <div class="md-stage" id="stage" aria-hidden="true"></div>
  <span class="md-mark" aria-hidden="true"></span>
  <div class="md-ui">
    <p class="md-count"><span id="count">01</span> /<span id="total">30</span></p>
    <span class="md-rule md-rule-l"></span><span class="md-rule md-rule-r"></span>
    <a class="md-about" href="{data['about']}">{both("About", "關於我")}</a>
    <nav class="md-cat" aria-label="Continent"><h2>{both("Continent", "洲")}</h2><ul id="cats"></ul></nav>
    <p class="md-where" id="where"></p>
    <div class="md-mode"><h2>{both("Display mode", "顯示方式")}</h2>
      <p><button type="button" data-mode="slider">{both("Slider", "一列")}</button><i>/</i><button type="button" data-mode="grid">{both("Grid", "全部")}</button></p></div>
    {LANG}
  </div>
</main>"""

CAMILLE = f"""<main class="cm" id="cm" aria-label="Thomas Chen, landscape photographs">
  <p class="cm-load" id="load">0%</p>
  <div class="cm-wall" id="wall" aria-hidden="true"></div>
  <div class="cm-row" id="row"></div>
  <div class="cm-ui">
    <nav class="cm-nav"><a class="is-on" href="#">{both("Work", "作品")}</a><a href="{data['about']}">{both("About", "關於我")}</a></nav>
    <h1 class="cm-title" id="title"></h1>
    <button type="button" class="cm-plus cm-plus-l" id="prev" aria-label="Previous 上一個"></button>
    <button type="button" class="cm-plus cm-plus-r" id="next" aria-label="Next 下一個"></button>
    <p class="cm-count"><span id="num">1</span> — <span id="of">8</span></p>
    <div class="cm-thumbs" id="thumbs"></div>
    {LANG}
  </div>
</main>"""

(OUT / "copy-mathilde.html").write_text(page("mathilde", "After Mathilde De Chiara", "照 Mathilde De Chiara 做", MATHILDE))
(OUT / "copy-camille.html").write_text(page("camille", "After Camille Mormal", "照 Camille Mormal 做", CAMILLE))
print("wrote copy-photos.js, copy-mathilde.html, copy-camille.html")
