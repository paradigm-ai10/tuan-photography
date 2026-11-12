#!/usr/bin/env python3
"""Home page content, batch A of twenty (2026-11-12): type and places.

Five trial versions of the page under the Barcelona film and the Aoraki photograph, written beside the others in
design 2/new/home-redesign/ by home_content.write_version. Never touches design 1.

    python3 tools/home_more_a.py

wa1 the timetable, wa2 the contact sheet, wa3 the gazetteer, wa4 the sentence, wa5 the day in light.
Styles: design 2/new/home-redesign/more-a.css (every class ma-…). Script: more-a.js.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import home_content as H   # noqa: E402

B = H.B
e = B.e
CSS, JS = ("more-a.css",), ("more-a.js",)


def date_of(sid):
    c = B.COUNTRIES[B.SLIDES[sid]["country"]]["date"]
    return c["en"], c["zh"]


def country_of(sid):
    c = B.COUNTRIES[B.SLIDES[sid]["country"]]
    return c["en"], c["zh"]


def page_of(sid):
    cid = B.SLIDES[sid]["country"]
    return f"countries/{cid}.html" if (B.ROOT / "design 1" / "countries" / f"{cid}.html").exists() else "guides.html"


def ways(en, zh):
    return f'<nav class="wrap hc-ways" aria-label="Site">{"".join(H.way(*w[:2], en, zh, *w[2:]) for w in H.WAYS)}</nav>'


def where_when(sid, en, zh, key):
    """'Barcelona, Spain, 2026.7' in both languages, under the key given."""
    s = B.SLIDES[sid]
    d = date_of(sid)
    en[key], zh[key] = f'{s["where"]["en"]}, {d[0]}', f'{s["where"]["zh"]}，{d[1]}'
    return en[key]


# ---------------------------------------------------------------- 1. the timetable

BOARD = [   # (photograph, the place as a plain name), latest trip first, as the countries' dates say
    ("hoi-an-night", ("Hội An", "會安")),
    ("sapa-terraces", ("Sa Pa", "沙壩")),
    ("bunkers", ("Barcelona", "巴塞隆納")),
    ("calanque", ("Cassis", "卡西斯")),
    ("gordes", ("Gordes", "戈爾德")),
    ("bund-night", ("Shanghai", "上海")),
    ("westminster-bridge", ("London", "倫敦")),
    ("supertrees", ("Singapore", "新加坡")),
    ("tekapo-stars", ("Lake Tekapo", "蒂卡波湖")),
    ("roys-peak", ("Wanaka", "瓦納卡")),
    ("peak-night", ("Hong Kong", "香港")),
    ("queensboro-train", ("New York", "紐約")),
    ("golden-gate-fog", ("San Francisco", "舊金山")),
    ("fuji-lake", ("Mount Fuji", "富士山")),
    ("otaru-canal", ("Otaru", "小樽")),
    ("matterhorn-lake", ("Zermatt", "策馬特")),
    ("neuschwanstein", ("Bavaria", "巴伐利亞")),
    ("burj-khalifa", ("Dubai", "杜拜")),
]


def timetable(en, zh):
    rows, prints = [], []
    for i, (sid, name) in enumerate(BOARD):
        s = B.SLIDES[sid]
        B.strings(s, en, zh)
        cn, d = country_of(sid), date_of(sid)
        en[f"maT{i}"], zh[f"maT{i}"] = name
        en[f"maTc{i}"], zh[f"maTc{i}"] = cn
        en[f"maTd{i}"], zh[f"maTd{i}"] = d
        where_when(sid, en, zh, f"maTw{i}")
        on = " is-on" if i == 0 else ""
        rows.append(f'<li><a class="ma-t-row{on}" href="{page_of(sid)}" data-print="{i}">'
                    f'<span class="ma-t-place" data-i18n="maT{i}">{e(name[0])}</span>'
                    f'<span class="ma-t-country" data-i18n="maTc{i}">{e(cn[0])}</span>'
                    f'<span class="ma-t-when" data-i18n="maTd{i}">{e(d[0])}</span></a></li>')
        prints.append(f'<figure class="ma-t-print{on}" data-print="{i}"><a {B.opens(sid, "", en, zh)}>'
                      f'{B.img(s, "", "(max-width: 56rem) 92vw, 46vw", soon=True)}</a>'
                      f'<figcaption><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>'
                      f'<span data-i18n="maTw{i}">{e(en[f"maTw{i}"])}</span></figcaption></figure>')
    en["maTHead"], zh["maTHead"] = "Places, the latest first", "去過的地方，由近到遠"
    en["maTPlace"], zh["maTPlace"] = "Place", "地方"
    en["maTCountry"], zh["maTCountry"] = "Country", "國家"
    en["maTWhen"], zh["maTWhen"] = "When", "時間"
    return f"""<div class="leaf ma ma-t">
<section class="wrap ma-t-wrap" aria-labelledby="ma-t-h">
  <div class="ma-t-board">
    {H.line(en, zh)}
    <p class="caps ma-t-head" id="ma-t-h" data-i18n="maTHead">Places, the latest first</p>
    <p class="caps ma-t-cols" aria-hidden="true"><span data-i18n="maTPlace">Place</span><span data-i18n="maTCountry">Country</span><span data-i18n="maTWhen">When</span></p>
    <ol class="ma-t-rows">{"".join(rows)}</ol>
  </div>
  <div class="ma-t-frame">{"".join(prints)}</div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- 2. the contact sheet

SHEET = ["queensboro-train", "empire-state-sunset", "golden-gate-fog", "matterhorn-lake", "zermatt-dusk", "neuschwanstein",
         "fuji-lake", "otaru-canal", "kinkaku", "peak-night", "temple-street", "bund-night",
         "sapa-terraces", "sapa-dusk", "hoi-an-night", "tekapo-stars", "roys-peak", "aurora",
         "bunkers", "stained-glass", "calanque", "gordes", "westminster-bridge", "supertrees"]


def contact(en, zh):
    frames, proofs = [], []
    for i, sid in enumerate(SHEET):
        s = B.SLIDES[sid]
        B.strings(s, en, zh)
        where_when(sid, en, zh, f"maCw{i}")
        on = " is-on" if i == 0 else ""
        frames.append(f'<li class="ma-c-cell"><a class="ma-c-frame{on}" {B.opens(sid, "", en, zh)} data-frame="{i}">'
                      f'<span class="ma-c-pic">{B.img(s, "", "(max-width: 48rem) 22vw, 9vw", soon=True)}</span>'
                      f'<span class="ma-c-cap" data-i18n="sp_{sid}">{e(s["place"]["en"])}</span></a></li>')
        proofs.append(f'<figure class="ma-c-proof{on}" data-frame="{i}"><a {B.opens(sid, "", en, zh)}>'
                      f'{B.img(s, "", "(max-width: 48rem) 92vw, 40vw", soon=True)}</a>'
                      f'<figcaption><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>'
                      f'<span data-i18n="maCw{i}">{e(en[f"maCw{i}"])}</span></figcaption></figure>')
    en["maCHead"], zh["maCHead"] = "Contact sheet", "印樣"
    en["maCPoint"], zh["maCPoint"] = "Point at a frame to see it larger.", "指向一格，旁邊會放大。"
    en["maCTap"], zh["maCTap"] = "Tap a frame to see it larger.", "點一格，上面會放大。"
    return f"""<div class="leaf ma ma-c">
<section class="wrap ma-c-wrap" aria-labelledby="ma-c-h">
  <div class="ma-c-left">
    {H.line(en, zh)}
    <p class="ma-c-top"><span class="caps" id="ma-c-h" data-i18n="maCHead">Contact sheet</span><span class="ma-c-hint ma-c-hint--point" data-i18n="maCPoint">Point at a frame to see it larger.</span><span class="ma-c-hint ma-c-hint--tap" data-i18n="maCTap">Tap a frame to see it larger.</span></p>
    <div class="ma-c-sheet">
      <ol class="ma-c-grid">{"".join(frames)}</ol>
      <span class="ma-c-mark" aria-hidden="true"></span>
    </div>
  </div>
  <div class="ma-c-desk">{"".join(proofs)}</div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- 3. the gazetteer

PLATES = {"calanque", "golden-gate-fog", "hoi-an-night", "matterhorn-lake", "otaru-canal", "queensboro-train", "sapa-terraces"}


def gazetteer(en, zh):
    def key(sid):
        n = B.SLIDES[sid]["place"]["en"]
        return (n[4:] if n.startswith("The ") else n).lower()
    ids = sorted(B.SLIDES, key=key)
    out, letter = [], None
    for sid in ids:
        s = B.SLIDES[sid]
        B.strings(s, en, zh)
        first = key(sid)[0].upper()
        if first != letter:
            letter = first
            out.append(f'<li class="ma-g-letter" id="ma-g-{letter}" aria-hidden="true">{letter}</li>')
        d = date_of(sid)
        en[f"maGw_{sid}"], zh[f"maGw_{sid}"] = s["where"]["en"], s["where"]["zh"]
        en[f"maGd_{sid}"], zh[f"maGd_{sid}"] = d
        out.append(f'<li class="ma-g-entry"><a {B.opens(sid, "", en, zh)}>'
                   f'<span class="ma-g-name"><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b><i aria-hidden="true"></i>'
                   f'<span class="ma-g-year" data-i18n="maGd_{sid}">{e(d[0])}</span></span>'
                   f'<span class="ma-g-where" data-i18n="maGw_{sid}">{e(s["where"]["en"])}</span></a></li>')
        if sid in PLATES:
            shape = " is-tall" if s["h"] > s["w"] else ""
            out.append(f'<li class="ma-g-plate{shape}"><figure><a {B.opens(sid, "", en, zh)}>'
                       f'{B.img(s, "", "(max-width: 48rem) 92vw, 26vw", named=True)}</a>'
                       f'<figcaption><span class="caps" data-i18n="maGPlate">Plate</span>'
                       f'<b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b></figcaption></figure></li>')
    have = {key(s)[0].upper() for s in ids}
    thumbs = "".join(f'<a href="#ma-g-{c}">{c}</a>' if c in have else f'<span>{c}</span>' for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    en["maGHead"], zh["maGHead"] = "Gazetteer", "地名索引"
    en["maGSay"], zh["maGSay"] = "Every place in these photographs, from A to Z, with the country and the year I was there.", \
        "這些照片裡的每一個地方，從 A 到 Z，附上國家和我去的年份。"
    en["maGPlate"], zh["maGPlate"] = "Plate", "圖版"
    return f"""<div class="leaf ma ma-g">
<section class="wrap ma-g-wrap" aria-labelledby="ma-g-h">
  <header class="ma-g-top">
    <h2 class="ma-g-title" id="ma-g-h" data-i18n="maGHead">Gazetteer</h2>
    <p class="ma-g-say" data-i18n="maGSay">{e(en["maGSay"])}</p>
    <nav class="ma-g-thumbs caps" aria-label="A to Z">{thumbs}</nav>
  </header>
  <ol class="ma-g-list">{"".join(out)}</ol>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- 4. the sentence

SENTENCE = [   # (photograph, the clause in English, the clause in 中文); only what the photograph itself shows
    ("bunkers", "above Barcelona on the Bunkers del Carmel", "巴塞隆納的 Bunkers del Carmel 觀景點上"),
    ("matterhorn-lake", "beside a lake holding the Matterhorn's reflection", "在倒映著馬特洪峰的湖邊"),
    ("fuji-lake", "at the lake under Mount Fuji at first light", "在清晨富士山下的湖畔"),
    ("queensboro-train", "on the platform at Queensboro Plaza", "在皇后區廣場站的月台上"),
    ("golden-gate-fog", "in the fog at the Golden Gate Bridge", "在霧裡的金門大橋"),
    ("sapa-terraces", "among the rice terraces of Sa Pa", "在沙壩的梯田之間"),
    ("tekapo-stars", "under the Milky Way at Lake Tekapo", "在蒂卡波湖的銀河下"),
    ("roys-peak", "on the ridge of Roys Peak above Lake Wanaka", "在瓦納卡湖上方的羅伊峰稜線上"),
    ("calanque", "high above the Calanque d'En-Vau", "在昂沃峽灣的崖頂"),
    ("otaru-canal", "beside Otaru Canal in the snow", "在下著雪的小樽運河邊"),
    ("peak-night", "above Victoria Harbour at night", "在夜晚的維多利亞港上方"),
    ("hoi-an-night", "by the river in Hội An after dark", "在入夜的會安河邊"),
    ("stained-glass", "and under the stained glass of the Sagrada Família", "還有聖家堂的彩色玻璃下"),
]


def sentence(en, zh):
    parts = []
    last = len(SENTENCE) - 1
    en["maSOpen"], zh["maSOpen"] = "I have stood ", "我曾經站在"
    en["maSComma"], zh["maSComma"] = ",", "，"
    en["maSGap"], zh["maSGap"] = " ", ""
    en["maSStop"], zh["maSStop"] = ".", "。"
    for i, (sid, t_en, t_zh) in enumerate(SENTENCE):
        s = B.SLIDES[sid]
        B.strings(s, en, zh)
        # the clause's last word, its photograph and its comma are kept on one line
        head_en, tail_en = t_en.rsplit(" ", 1)
        en[f"maS{i}"], zh[f"maS{i}"] = head_en + " ", t_zh[:-2]
        en[f"maSl{i}"], zh[f"maSl{i}"] = tail_en + " ", t_zh[-2:]
        mark = "maSStop" if i == last else "maSComma"
        parts.append(f'<span class="ma-s-c"><span data-i18n="maS{i}">{e(head_en)} </span>'
                     f'<span class="ma-s-tie"><span data-i18n="maSl{i}">{e(tail_en)} </span>'
                     f'<a class="ma-s-pic" {B.opens(sid, "", en, zh)} style="--ar: {B.ratio(s)}">'
                     f'{B.img(s, "", "12rem", soon=True)}</a>'
                     f'<span data-i18n="{mark}">{e(en[mark])}</span></span><span data-i18n="maSGap"> </span></span>')
    en["maSHead"], zh["maSHead"] = "Where I have stood", "我站過的地方"
    en["maSSay"], zh["maSSay"] = "Every photograph in this sentence opens larger.", "句子裡的每一張照片，點開都能放大。"
    return f"""<div class="leaf ma ma-s">
<section class="wrap ma-s-wrap" aria-labelledby="ma-s-h">
  <h2 class="caps ma-s-head" id="ma-s-h" data-i18n="maSHead">Where I have stood</h2>
  <p class="ma-s-text"><span class="ma-s-c is-read"><span data-i18n="maSOpen">I have stood </span></span>{"".join(parts)}</p>
  <p class="ma-s-say" data-i18n="maSSay">Every photograph in this sentence opens larger.</p>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- 5. the day in light

DAY = [   # (the hour band in both languages, its photographs), as the photographs show the light
    (("Morning", "早晨"), ["fuji-lake", "osaka-castle", "fuji-shinkansen"]),
    (("Midday", "正午"), ["matterhorn-lake", "burj-khalifa", "calanque"]),
    (("Afternoon", "午後"), ["otaru-canal", "sapa-terraces", "roys-peak"]),
    (("Dusk", "黃昏"), ["bunkers", "queensboro-train", "zermatt-dusk"]),
    (("Night", "夜晚"), ["peak-night", "tekapo-stars", "hoi-an-night"]),
]


def day(en, zh):
    bands, words, tones = [], [], []
    for i, ((w_en, w_zh), ids) in enumerate(DAY):
        en[f"maD{i}"], zh[f"maD{i}"] = w_en, w_zh
        on = " is-on" if i == 0 else ""
        words.append(f'<li><button type="button" class="ma-d-word{on}" data-band="{i}" data-i18n="maD{i}">{e(w_en)}</button></li>')
        tones.append(f'<i class="ma-d-tone ma-d-tone--{i}"></i>')
        pieces = []
        for k, sid in enumerate(ids):
            s = B.SLIDES[sid]
            shape = "tall" if s["h"] > s["w"] else "wide"
            p = B.piece(sid, "", en, zh, "(max-width: 48rem) 92vw, 50vw")
            pieces.append(p.replace('class="piece"', f'class="piece ma-d-p ma-d-p{k + 1} is-{shape}"', 1))
        side = "a" if i % 2 == 0 else "b"
        bands.append(f'<section class="ma-d-band ma-d-band--{side}" data-band="{i}" aria-labelledby="ma-d-h{i}">'
                     f'<h2 class="ma-d-name" id="ma-d-h{i}" data-i18n="maD{i}">{e(w_en)}</h2>{"".join(pieces)}</section>')
    en["maDSay"], zh["maDSay"] = "One day, from first light to night, in photographs from many.", "一天，從清晨到夜晚，用很多天的照片拼成。"
    en["maDHours"], zh["maDHours"] = "The hour", "時刻"
    return f"""<div class="leaf ma ma-d">
<section class="ma-d-run">
  <div class="ma-d-sky" aria-hidden="true">{"".join(tones)}</div>
  <div class="wrap ma-d-body">
    <nav class="ma-d-hours" aria-label="The hour" data-i18n-aria="maDHours"><ol>{"".join(words)}</ol><span class="ma-d-rule" aria-hidden="true"></span></nav>
    <div class="ma-d-bands">
      <p class="ma-d-say" data-i18n="maDSay">{e(en["maDSay"])}</p>
      {"".join(bands)}
    </div>
  </div>
</section>
{ways(en, zh)}
</div>"""


VERSIONS = [
    ("wa1", timetable, "The timetable", "時刻表"),
    ("wa2", contact, "The contact sheet", "印樣"),
    ("wa3", gazetteer, "The gazetteer", "地名索引"),
    ("wa4", sentence, "The sentence", "一句話"),
    ("wa5", day, "The day in light", "一天的光"),
]

if __name__ == "__main__":
    for name, body_of, t_en, t_zh in VERSIONS:
        H.write_version(name, body_of, t_en, t_zh, css=CSS, js=JS)
