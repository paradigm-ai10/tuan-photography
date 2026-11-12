#!/usr/bin/env python3
"""Batch D of twenty trial versions of the home page's content (2026-11-12): the unexpected ones.

    python3 tools/home_more_d.py

wd1  by colour: every photograph as a small print, ordered warm to cool by its own colour, a larger proof beside
wd2  the trail: moving across a calm paper field leaves a slow trail of photographs; the last one stays, named
wd3  one photograph, closer: Queensboro Plaza and Bunkers del Carmel, the frame moving into their details and back
wd4  the map line: a line map, a dot per place, the scroll travelling one route between them, the photograph beside
wd5  matched pairs: two photographs that share a colour or a shape, their inner edges faded into each other

Styles: design 2/new/home-redesign/more-d.css. Script: more-d.js. Pages written by home_content.write_version.
"""
import colorsys
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import home_content as H   # noqa: E402

from PIL import Image   # noqa: E402

B = H.B
e = B.e
WEB = B.ROOT / "design 1" / "images" / "web"


def where(sid, en, zh):
    s = B.SLIDES[sid]
    B.strings(s, en, zh)
    en[f"sw_{sid}"], zh[f"sw_{sid}"] = s["where"]["en"], s["where"]["zh"]
    return s


def ways(en, zh):
    return f'<nav class="wrap hc-ways" aria-label="Site">{"".join(H.way(*w[:2], en, zh, *w[2:]) for w in H.WAYS)}</nav>'


# ---------------------------------------------------------------- wd1: by colour

def warmth(s):
    """Where a photograph sits between warm and cool: the hue of its strongest colours (each pixel weighted by how
    saturated and how bright it is), turned so the scale runs red, orange, yellow, green, cyan, blue."""
    im = Image.open(WEB / "640" / s["file"]).convert("RGB").resize((48, 48))
    x = y = w = 0.0
    for r, g, b in im.getdata():
        h, sat, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        k = sat * sat * v
        x += k * math.cos(2 * math.pi * h)
        y += k * math.sin(2 * math.pi * h)
        w += k
    hue = math.degrees(math.atan2(y, x)) % 360
    return (hue + 25) % 360   # magenta-red first, the blues last


def colour(en, zh):
    order = sorted(B.DATA["slides"], key=warmth)
    rows, i = [], 0
    for row in B.rows_of([x["id"] for x in order], per_row=10):   # rows of even width, so no print is trimmed
        cells = []
        for sid in row:
            x = where(sid, en, zh)
            cells.append(f'<a class="md-c-p" style="--ar: {B.ratio(x)}; --i: {i}" {B.opens(sid, "", en, zh)} data-k="{sid}">'
                         f'{B.img(x, "", "(max-width: 48rem) 30vw, 12vw")}</a>')
            i += 1
        rows.append(f'<div class="md-c-row">{"".join(cells)}</div>')
    first = B.SLIDES["queensboro-train"]
    en["mdcSay"] = "Every photograph, laid out by its own colour, from the warmest light to the coolest."
    zh["mdcSay"] = "所有照片，依照片本身的顏色排開，從最暖的光到最冷的光。"
    en["mdcWarm"], zh["mdcWarm"] = "Warm", "暖"
    en["mdcCool"], zh["mdcCool"] = "Cool", "冷"
    en["mdcPoint"], zh["mdcPoint"] = "Point at a print to see it larger", "指向一張照片，看大一點"
    en["mdcTap"], zh["mdcTap"] = "Tap a print to see it larger", "點一張照片，看大一點"
    H.line(en, zh)   # for its two strings; the heading is an h2 here
    return f"""<div class="leaf md md-colour" data-md="colour">
<section class="wrap md-c" aria-labelledby="md-c-h">
  <div class="md-c-head">
    <h2 class="md-c-title" id="md-c-h" data-i18n-html="hcLine">Travel like a photographer.</h2>
    <p class="md-c-say" data-i18n="mdcSay">{e(en["mdcSay"])}</p>
  </div>
  <div class="md-c-body">
    <div class="md-c-field">
      <p class="caps md-c-ends"><span data-i18n="mdcWarm">Warm</span><span class="md-c-hint md-c-hint--point" data-i18n="mdcPoint">{e(en["mdcPoint"])}</span><span class="md-c-hint md-c-hint--tap" data-i18n="mdcTap">{e(en["mdcTap"])}</span><span data-i18n="mdcCool">Cool</span></p>
      <div class="md-c-prints">{"".join(rows)}</div>
    </div>
    <figure class="md-c-proof">
      <a class="md-c-big" {B.opens(first["id"], "", en, zh)}>{B.img(first, "", "(max-width: 48rem) 92vw, 34vw", soon=True)}</a>
      <figcaption><b data-i18n="sp_{first["id"]}">{e(first["place"]["en"])}</b><span data-i18n="sw_{first["id"]}">{e(first["where"]["en"])}</span></figcaption>
    </figure>
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wd2: the trail

TRAIL = ["queensboro-train", "matterhorn-lake", "fuji-lake", "sapa-terraces", "tekapo-stars", "golden-gate-fog", "calanque",
         "peak-night", "bunkers", "hoi-an-night", "otaru-canal", "roys-peak", "aurora", "kinkaku"]


def trail(en, zh):
    figs = []
    for i, sid in enumerate(TRAIL):
        s = where(sid, en, zh)
        figs.append(f'<figure class="md-t-p{" is-on is-last" if i == 0 else ""}" style="--ar: {B.ratio(s)}">'
                    f'<a {B.opens(sid, "", en, zh)}>{B.img(s, "", "(max-width: 48rem) 60vw, 30vw", soon=True)}</a>'
                    f'<figcaption><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b><span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span></figcaption></figure>')
    en["mdtMove"], zh["mdtMove"] = "Move slowly across the page", "在頁面上慢慢移動"
    en["mdtTap"], zh["mdtTap"] = "Tap anywhere on the page", "點頁面上任何地方"
    en["mdtAria"], zh["mdtAria"] = "Photographs", "照片"
    return f"""<div class="leaf md md-trail" data-md="trail">
<section class="md-t" aria-label="Photographs" data-i18n-aria="mdtAria">
  <div class="md-t-words">
    {H.line(en, zh)}
    <p class="caps md-t-hint md-t-hint--move" data-i18n="mdtMove">{e(en["mdtMove"])}</p>
    <p class="caps md-t-hint md-t-hint--tap" data-i18n="mdtTap">{e(en["mdtTap"])}</p>
  </div>
  <div class="md-t-field">{"".join(figs)}</div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wd3: one photograph, closer

CLOSER = [   # (photograph, [(x, y, zoom, (en, zh)) ... ]): x, y are the detail's centre as a share of the photograph
    ("queensboro-train", [
        (0.47, 0.66, 2.3, ("The 7 train, pulling into Queensboro Plaza.", "7 號線列車，正駛進 Queensboro Plaza。")),
        (0.34, 0.28, 2.0, ("Manhattan's towers behind it, against an orange sky.", "後面是曼哈頓的高樓，襯著橘色的天空。")),
        (0.75, 0.68, 3.0, ("A red signal at the edge of the platform.", "月台邊的一盞紅色號誌燈。")),
    ]),
    ("bunkers", [
        (0.51, 0.50, 3.0, ("The Sagrada Família, a crane still on its tower.", "聖家堂，塔上還立著一座起重機。")),
        (0.21, 0.45, 3.2, ("Two towers by the sea, and sails out on the water.", "海邊的兩棟高樓，海面上有帆船。")),
        (0.56, 0.80, 2.4, ("Rooftops in the golden-hour light.", "黃金時刻光線裡的屋頂。")),
    ]),
]


def closer(en, zh):
    en["mdzWhole"], zh["mdzWhole"] = "The whole frame again, as it was taken.", "再看一次整張，拍下時的樣子。"
    en["mdzSay"], zh["mdzSay"] = "Two photographs, looked at closely.", "兩張照片，靠近一點看。"
    runs = []
    for n, (sid, parts) in enumerate(CLOSER):
        s = where(sid, en, zh)
        notes = [f'<li class="md-z-note is-on" data-x="0.5" data-y="0.5" data-z="1"><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>'
                 f'<span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span></li>']
        for k, (x, y, z, words) in enumerate(parts):
            key = f"mdz{n}_{k}"
            en[key], zh[key] = words
            notes.append(f'<li class="md-z-note" data-x="{x}" data-y="{y}" data-z="{z}"><span class="md-z-say" data-i18n="{key}">{e(words[0])}</span></li>')
        notes.append('<li class="md-z-note" data-x="0.5" data-y="0.5" data-z="1"><span class="md-z-say" data-i18n="mdzWhole">'
                     f'{e(en["mdzWhole"])}</span></li>')
        runs.append(f"""<section class="md-z" aria-label="{e(s["place"]["en"])}">
  <div class="md-z-stage">
    <figure class="md-z-frame" style="--ar: {B.ratio(s)}"><a {B.opens(sid, "", en, zh)}>{B.img(s, "", "(max-width: 48rem) 240vw, 150vw", soon=True)}</a></figure>
    <ol class="md-z-notes">{"".join(notes)}</ol>
  </div>
</section>""")
    return f"""<div class="leaf md md-closer" data-md="closer">
<section class="hc-leaf md-z-intro">{H.line(en, zh)}<p class="hc-say" data-i18n="mdzSay">{e(en["mdzSay"])}</p></section>
{runs[0]}
<div class="md-z-gap" aria-hidden="true"></div>
{runs[1]}
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wd4: the map line

ROUTE = [   # (photograph, the place as a plain name), west to east across a map cut in the Pacific
    ("golden-gate-fog", ("San Francisco", "舊金山")),
    ("queensboro-train", ("New York", "紐約")),
    ("tower-bridge", ("London", "倫敦")),
    ("bunkers", ("Barcelona", "巴塞隆納")),
    ("calanque", ("Cassis", "卡西斯")),
    ("matterhorn-lake", ("Zermatt", "策馬特")),
    ("burj-khalifa", ("Dubai", "杜拜")),
    ("marina-bay", ("Singapore", "新加坡")),
    ("hoi-an-night", ("Hội An", "會安")),
    ("peak-night", ("Hong Kong", "香港")),
    ("taipei-101", ("Taipei", "台北")),
    ("fuji-lake", ("Mount Fuji", "富士山")),
    ("tekapo-stars", ("Lake Tekapo", "蒂卡波湖")),
]
MID, LEFT, TOP, BOTTOM, K, SY = 20, -160, 68, -48, 3.0, 1.12   # the map: middle meridian, edges, units a degree


def proj(lon, lat):
    x = (lon - MID + 540) % 360 - 180
    return round((x - LEFT) * K, 1), round((TOP - lat) * K * SY, 1)


def coast():
    """The land's outlines from Natural Earth (world-atlas 110m, design 2/vendor), as one SVG path. Each arc is drawn
    once; where a line crosses the map's cut it is broken instead of drawn across the map."""
    t = json.loads((B.ROOT / "design 2" / "vendor" / "countries-110m.json").read_text())
    (sx, sy), (tx, ty) = t["transform"]["scale"], t["transform"]["translate"]
    used = set()
    for g in t["objects"]["land"]["geometries"]:
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        for poly in polys:
            for ring in poly:
                used.update(a if a >= 0 else ~a for a in ring)
    out = []
    for a in sorted(used):
        qx = qy = 0
        last = None
        for dx, dy in t["arcs"][a]:
            qx += dx
            qy += dy
            lon, lat = qx * sx + tx, qy * sy + ty
            p = proj(lon, lat)
            if last and abs(p[0] - last[0]) < 300:
                if p != last:
                    out.append(f"L{p[0]} {p[1]}")
            else:
                out.append(f"M{p[0]} {p[1]}")
            last = p
    return "".join(out)


def route_dots(points):
    """The route as a dotted line: a gentle arc from each place to the next, a dot every few units. Each dot carries
    u, how far along the route it is (2.5 = half way from the third place to the fourth)."""
    dots = []
    for i in range(len(points) - 1):
        (x0, y0), (x1, y1) = points[i], points[i + 1]
        dx, dy = x1 - x0, y1 - y0
        d = math.hypot(dx, dy)
        cx, cy = (x0 + x1) / 2 + dy * 0.18, (y0 + y1) / 2 - abs(dx) * 0.18 - 2   # bowed upward, like a flight
        steps = max(3, int(d / 4.2))
        for k in range(1 if i else 0, steps + 1):
            t = k / steps
            x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
            y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1
            dots.append(f'<circle class="md-m-d" cx="{x:.1f}" cy="{y:.1f}" r="1.15" data-u="{i + t:.3f}"/>')
    return "".join(dots)


def maps(en, zh):
    w, h = round((165 - LEFT) * K), round((TOP - BOTTOM) * K * SY)
    pts, places, figs, labels, run = [], [], [], [], []
    for i, (sid, name) in enumerate(ROUTE):
        s = where(sid, en, zh)
        lat, lon = s["ll"]
        x, y = proj(lon, lat)
        pts.append((x, y))
        date = B.COUNTRIES[s["country"]]["date"]
        en[f"mdmN{i}"], zh[f"mdmN{i}"] = name
        en[f"mdmW{i}"], zh[f"mdmW{i}"] = f'{s["where"]["en"]}, {date["en"]}', f'{s["where"]["zh"]}，{date["zh"]}'
        on = " is-on" if i == 0 else ""
        places.append(f'<circle class="md-m-place{on}" cx="{x}" cy="{y}" r="3"/>')
        end = x > w - 160
        labels.append(f'<text class="md-m-label{on}" x="{x + (-9 if end else 9)}" y="{y + 4}" text-anchor="{"end" if end else "start"}" '
                      f'data-i18n="mdmN{i}">{e(name[0])}</text>')
        figs.append(f'<figure class="md-m-photo{on}"><a {B.opens(sid, "", en, zh)}>{B.img(s, "", "(max-width: 48rem) 92vw, 34vw", soon=True)}</a>'
                    f'<figcaption><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b><span data-i18n="mdmW{i}">{e(en[f"mdmW{i}"])}</span></figcaption></figure>')
        run.append(f'<li><button type="button" class="caps{on}" data-i18n="mdmN{i}">{e(name[0])}</button></li>')
    en["mdmSay"], zh["mdmSay"] = "Every place, joined by one line.", "每一個地方，用一條線連起來。"
    en["mdmMap"], zh["mdmMap"] = "A line map of the places", "這些地方的線條地圖"
    en["hxPlaces"], zh["hxPlaces"] = "Places", "地方"
    eq = proj(0, 0)[1]
    return f"""<div class="leaf md md-map" data-md="map">
<section class="hc-leaf md-m-intro">{H.line(en, zh)}<p class="hc-say" data-i18n="mdmSay">{e(en["mdmSay"])}</p></section>
<section class="md-m" aria-label="Places" data-i18n-aria="hxPlaces">
  <div class="md-m-stage">
    <div class="md-m-left">
      <svg class="md-m-svg" viewBox="0 0 {w} {h}" role="img" aria-label="{e(en["mdmMap"])}" data-i18n-aria="mdmMap">
        <defs><filter id="md-m-hand" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></defs>
        <line class="md-m-eq" x1="0" y1="{eq}" x2="{w}" y2="{eq}"/>
        <path class="md-m-coast" d="{coast()}"/>
        <g class="md-m-route">{route_dots(pts)}</g>
        <g class="md-m-places">{"".join(places)}</g>
        <circle class="md-m-mark" r="6.5" cx="0" cy="0"/>
        <g class="md-m-labels">{"".join(labels)}</g>
      </svg>
      <ol class="md-m-index">{"".join(run)}</ol>
    </div>
    <div class="md-m-photos">{"".join(figs)}</div>
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wd5: matched pairs, faded edges

PAIRS = [   # (left, right, what they share)
    ("fuji-lake", "matterhorn-lake", ("Still water", "靜止的水面")),
    ("queensboro-train", "train-street", ("A train coming round the curve", "轉過彎道迎面而來的列車")),
    ("greenwich", "capitol-front", ("A white dome under blue sky", "藍天下的白色圓頂")),
    ("golden-gate-fog", "fushimi-inari", ("The same red", "同一種紅")),
    ("lower-manhattan-reflection", "chongqing-raffles", ("Lights doubled at night", "夜裡倒映的燈")),
    ("empire-state-spire", "burj-khalifa", ("One tower, rising", "一座往上的高塔")),
]


def matched(en, zh):
    out = []
    for i, (a, b, share) in enumerate(PAIRS):
        sa, sb = where(a, en, zh), where(b, en, zh)
        en[f"mdpK{i}"], zh[f"mdpK{i}"] = share
        on = " is-on" if i == 0 else ""

        def half(s, side):
            return (f'<figure class="md-p-{side}" style="--ar: {B.ratio(s)}"><a {B.opens(s["id"], "", en, zh)}>'
                    f'{B.img(s, "", "(max-width: 48rem) 92vw, 46vw", soon=True)}</a></figure>')
        out.append(f"""<div class="md-p-pair{on}">
      <div class="md-p-two">{half(sa, "a")}{half(sb, "b")}</div>
      <p class="md-p-line"><span class="caps md-p-k" data-i18n="mdpK{i}">{e(share[0])}</span>
        <span class="md-p-names"><b data-i18n="sp_{a}">{e(sa["place"]["en"])}</b><span data-i18n="sw_{a}">{e(sa["where"]["en"])}</span><span class="md-p-dot" aria-hidden="true">·</span><b data-i18n="sp_{b}">{e(sb["place"]["en"])}</b><span data-i18n="sw_{b}">{e(sb["where"]["en"])}</span></span></p>
    </div>""")
    en["mdpAria"], zh["mdpAria"] = "Pairs", "成對的照片"
    en["mdpSay"], zh["mdpSay"] ="Two photographs from far apart that share a colour or a shape.", "兩張相隔很遠的照片，有同一種顏色或形狀。"
    return f"""<div class="leaf md md-pairs" data-md="pairs">
<section class="hc-leaf md-p-intro">{H.line(en, zh)}<p class="hc-say" data-i18n="mdpSay">{e(en["mdpSay"])}</p></section>
<section class="md-p" aria-label="Pairs" data-i18n-aria="mdpAria">
  <div class="md-p-stage">
    {"".join(out)}
  </div>
</section>
{ways(en, zh)}
</div>"""


VERSIONS = [
    ("wd1", colour, "By colour", "依顏色排列"),
    ("wd2", trail, "The trail", "照片的足跡"),
    ("wd3", closer, "One photograph, closer", "一張照片，靠近一點看"),
    ("wd4", maps, "The map line", "地圖上的一條線"),
    ("wd5", matched, "Matched pairs", "成對的照片"),
]

if __name__ == "__main__":
    for name, body_of, t_en, t_zh in VERSIONS:
        H.write_version(name, body_of, t_en, t_zh, css=("more-d.css",), js=("more-d.js",))
