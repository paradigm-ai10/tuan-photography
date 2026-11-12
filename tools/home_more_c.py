#!/usr/bin/env python3
"""Home page content, batch C of twenty quick versions (2026-11-12): print and object.

    wc1  the photobook        an open book on the stone ground; the scroll turns its pages
    wc2  postcards            a row of postcards on a ledge, travelling sideways; each turns over as it arrives
    wc3  one horizon          wide photographs set so their horizons make one line across a long strip
    wc4  the exhibition room  framed photographs on a gallery wall, a caption card beside each; the scroll walks the room
    wc5  index cards          a drawer of cards, one per place, the tabs of all of them showing; the scroll pulls each up

Each is the live home page (film, Aoraki, footer, viewer, language switch) with its own page under Aoraki, written
by home_content.write_version to design 2/new/home-redesign/wc<n>.html. Styles: more-c.css (every class mc-…,
scoped under .mc). Script: more-c.js.

    python3 tools/home_more_c.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import home_content as H   # noqa: E402

B = H.B
e = B.e


def facts(sid, en, zh):
    """A photograph's true facts as strings in both languages: place (sp_), where (sw_), the line under it (sa_,
    its description), the country's name (mcC_) and the date of the trip (mcD_)."""
    s = B.SLIDES[sid]
    B.strings(s, en, zh)
    c = B.COUNTRIES[s["country"]]
    en[f"sw_{sid}"], zh[f"sw_{sid}"] = s["where"]["en"], s["where"]["zh"]
    en[f"mcD_{sid}"], zh[f"mcD_{sid}"] = c["date"]["en"], c["date"]["zh"]
    en[f"mcC_{c['id']}"], zh[f"mcC_{c['id']}"] = c["en"], c["zh"]
    return s, c


def t(key, sid, en, tag="span", cls=""):
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c} data-i18n="{key}">{e(en[key])}</{tag}>'


def photo(sid, en, zh, sizes, cls=""):
    s = B.SLIDES[sid]
    c = f' class="{cls}"' if cls else ""
    return f'<a{c} {B.opens(sid, "", en, zh)}>{B.img(s, "", sizes, soon=True)}</a>'


def ways(en, zh):
    return '<nav class="wrap hc-ways" aria-label="Site">' + "".join(H.way(*w[:2], en, zh, *w[2:]) for w in H.WAYS) + "</nav>"


def opening(en, zh):
    return f'<section class="hc-leaf hc-leaf--line mc-open">{H.line(en, zh)}</section>'


# ---------------------------------------------------------------- wc1: the photobook

BOOK = ["queensboro-train", "matterhorn-lake", "fuji-lake", "sapa-terraces", "tekapo-stars", "golden-gate-fog",
        "peak-night", "calanque"]


def book(en, zh):
    """An open photobook seen flat. Each spread is a photograph on one page and, on the facing page, its place, the
    country, the trip's date and the photograph's own description. The scroll turns the pages, one leaf at a time,
    round the gutter (on a phone the book stands upright and the pages turn up, like a calendar)."""
    def ph(sid):
        return f'<div class="mc-bk-photo">{photo(sid, en, zh, "(max-width: 48rem) 80vw, 40vw")}</div>'

    def words(sid):
        s, c = facts(sid, en, zh)
        return (f'<div class="mc-bk-words"><p class="caps mc-bk-head">{t("mcC_" + c["id"], sid, en)}</p>'
                f'<h3>{t("sp_" + sid, sid, en)}</h3>'
                f'<p class="mc-bk-where">{t("sw_" + sid, sid, en)}<span class="mc-bk-date" data-i18n="mcD_{sid}">{e(en["mcD_" + sid])}</span></p>'
                f'<p class="mc-bk-line">{t("sa_" + sid, sid, en)}</p></div>')

    n = len(BOOK)
    for sid in BOOK:
        facts(sid, en, zh)
    leaves = "".join(
        f'<div class="mc-lf" style="--i: {i}"><div class="mc-face mc-front">{words(BOOK[i])}</div>'
        f'<div class="mc-face mc-back">{ph(BOOK[i + 1])}</div></div>' for i in range(n - 1))
    en["mcBook"], zh["mcBook"] = "A book of places", "地方之書"
    en["mcPrev"], zh["mcPrev"] = "Back a page", "往回翻"
    en["mcNext"], zh["mcNext"] = "Turn the page", "翻下一頁"
    return f"""<div class="leaf mc mc-book">
{opening(en, zh)}
<section class="mc-run" data-n="{n}" aria-label="A book of places" data-i18n-aria="mcBook">
  <div class="mc-stage">
    <div class="mc-bk">
      <div class="mc-pg mc-pg--a">{ph(BOOK[0])}</div>
      <div class="mc-pg mc-pg--b">{words(BOOK[-1])}</div>
      {leaves}
    </div>
    <p class="mc-steps"><button type="button" class="caps" data-step="-1" data-i18n="mcPrev">Back a page</button><button type="button" class="caps" data-step="1" data-i18n="mcNext">Turn the page</button></p>
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wc2: postcards

POSTCARDS = ["queensboro-train", "matterhorn-lake", "otaru-canal", "hoi-an-night", "calanque", "tekapo-church",
             "fushimi-inari", "tower-bridge", "golden-gate-fog", "kinkaku", "sapa-dusk", "marseille-port"]


def postcards(en, zh):
    """Each place as a postcard standing on a ledge. The row travels sideways as the page is scrolled; a card comes
    in showing its back (the place, the country, the trip's date, a printed stamp box and an empty address side) and
    turns over to its photograph as it reaches the middle. Turn over turns any card by hand."""
    en["mcTurn"], zh["mcTurn"] = "Turn over", "翻面"
    en["mcStamp"], zh["mcStamp"] = "Postcard", "明信片"
    en["mcCards"], zh["mcCards"] = "Postcards", "明信片"
    cards = []
    for i, sid in enumerate(POSTCARDS):
        s, c = facts(sid, en, zh)
        ar = s["w"] / s["h"]
        tall = " mc-pc--tall" if ar < 1 else ""
        back = (f'<div class="mc-pc-caption"><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>'
                f'<span class="caps" data-i18n="sw_{sid}">{e(s["where"]["en"])}</span></div>'
                f'<div class="mc-pc-stamp"><span class="caps" data-i18n="mcC_{c["id"]}">{e(c["en"])}</span>'
                f'<span class="mc-pc-date" data-i18n="mcD_{sid}">{e(en["mcD_" + sid])}</span></div>'
                f'<span class="mc-pc-mark" data-i18n="mcD_{sid}">{e(en["mcD_" + sid])}</span>'
                f'<span class="mc-pc-rule"></span><span class="mc-pc-rules"><i></i><i></i><i></i><i></i></span>'
                f'<span class="caps mc-pc-word" data-i18n="mcStamp">Postcard</span>')
        cards.append(f'<div class="mc-pc{tall}" style="--ar: {ar:.4f}; --i: {i}"><div class="mc-pc-card"><div class="mc-flip">'
                     f'<div class="mc-face mc-front">{photo(sid, en, zh, "(max-width: 48rem) 84vw, 46vw")}</div>'
                     f'<div class="mc-face mc-back">{back}</div></div></div>'
                     f'<button type="button" class="caps mc-pc-turn" data-i18n="mcTurn">Turn over</button></div>')
    return f"""<div class="leaf mc mc-post">
{opening(en, zh)}
<section class="mc-run" data-n="{len(POSTCARDS)}" aria-label="Postcards" data-i18n-aria="mcCards">
  <div class="mc-stage">
    <div class="mc-track">{"".join(cards)}</div>
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wc3: one horizon

HORIZON = [   # (photograph, where its horizon lies as a share of its height from the top, its height in the strip)
    ("fuji-lake", 0.57, 40), ("matterhorn-lake", 0.57, 48), ("lower-manhattan-reflection", 0.52, 38),
    ("bunkers", 0.42, 46), ("kinkaku", 0.61, 36), ("aurora", 0.78, 44), ("westminster-bridge", 0.82, 40),
    ("empire-state-sunset", 0.53, 48), ("otaru-canal", 0.60, 36), ("mall-from-above", 0.38, 44),
    ("hoi-an-night", 0.66, 38), ("fuji-shinkansen", 0.57, 46),
]


def horizon(en, zh):
    """Twelve wide photographs set side by side at different sizes, each raised or lowered so that its horizon (a
    lake's edge, the sea, a city's skyline) falls on one line; a fine line carries that horizon across the paper
    between them. The strip travels sideways as the page is scrolled; names beneath each."""
    en["mcHz"], zh["mcHz"] = "One horizon", "同一條地平線"
    figs = []
    for i, (sid, f, h) in enumerate(HORIZON):
        s, c = facts(sid, en, zh)
        figs.append(f'<figure class="mc-hz-photo" style="--f: {f}; --h: {h}; --ar: {s["w"] / s["h"]:.4f}">'
                    f'{photo(sid, en, zh, "(max-width: 48rem) 70vw, 45vw")}'
                    f'<figcaption><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>'
                    f'<span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span></figcaption></figure>')
    return f"""<div class="leaf mc mc-hz">
{opening(en, zh)}
<section class="mc-run" data-n="{len(HORIZON)}" aria-label="One horizon" data-i18n-aria="mcHz">
  <div class="mc-stage">
    <div class="mc-track">{"".join(figs)}</div>
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wc4: the exhibition room

ROOMS = [   # (country, its photographs)
    ("usa", ["queensboro-train", "lower-manhattan-reflection", "golden-gate-fog"]),
    ("switzerland", ["matterhorn-lake", "zermatt-dusk"]),
    ("japan", ["fuji-lake", "fushimi-inari", "otaru-canal"]),
    ("new-zealand", ["tekapo-stars", "roys-peak"]),
]


def room(en, zh):
    """A gallery seen from the front: a paper wall, a floor line, rooms one after another with the country's name
    lettered on the wall, a doorway between them. The photographs hang in thin dark frames on a mat, each with a
    small caption card beside it at eye level. The scroll walks along the room."""
    en["mcRoom"], zh["mcRoom"] = "The exhibition", "展覽"
    out, k = [], 0
    for r, (cid, ids) in enumerate(ROOMS):
        c = B.COUNTRIES[cid]
        en[f"mcC_{cid}"], zh[f"mcC_{cid}"] = c["en"], c["zh"]
        en[f"mcRD_{cid}"], zh[f"mcRD_{cid}"] = c["date"]["en"], c["date"]["zh"]
        if r:
            out.append('<div class="mc-door" aria-hidden="true"></div>')
        out.append(f'<div class="mc-wall-text"><h3 data-i18n="mcC_{cid}">{e(c["en"])}</h3>'
                   f'<p class="caps" data-i18n="mcRD_{cid}">{e(c["date"]["en"])}</p></div>')
        for sid in ids:
            s, _ = facts(sid, en, zh)
            out.append(f'<figure class="mc-hang" style="--ar: {s["w"] / s["h"]:.4f}; --i: {k}">'
                       f'<div class="mc-frame">{photo(sid, en, zh, "(max-width: 48rem) 60vw, 34vw")}</div>'
                       f'<figcaption class="mc-label"><b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b>'
                       f'<span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span>'
                       f'<span class="mc-label-date" data-i18n="mcD_{sid}">{e(en["mcD_" + sid])}</span></figcaption></figure>')
            k += 1
    return f"""<div class="leaf mc mc-room">
{opening(en, zh)}
<section class="mc-run" data-n="{k}" aria-label="The exhibition" data-i18n-aria="mcRoom">
  <div class="mc-stage">
    <div class="mc-ceiling" aria-hidden="true"></div>
    <div class="mc-track">{"".join(out)}</div>
    <div class="mc-floor" aria-hidden="true"></div>
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wc5: index cards

BLANK = '<li aria-hidden="true"></li>'   # the card's empty ruled lines


def cards(en, zh):
    """A drawer of index cards, one card to a place, every card's tab showing above the drawer's front, so every
    place is in view at once. The scroll (or Previous and Next, or a tab) pulls one card up out of the drawer: its
    photograph, its name and its facts written on the ruled lines; the card before falls forward."""
    en["mcDrawer"], zh["mcDrawer"] = "Places", "地方"
    en["mcPrevC"], zh["mcPrevC"] = "Previous", "上一張"
    en["mcNextC"], zh["mcNextC"] = "Next", "下一張"
    en["mcGo"], zh["mcGo"] = "Go there", "去看看"
    out = []
    for i, (sid, name, href) in enumerate(H.PLACES):
        s, c = facts(sid, en, zh)
        en[f"hcP_{sid}"], zh[f"hcP_{sid}"] = name
        out.append(f'<article class="mc-card" style="--i: {i}; --tab: {i % 4}">'
                   f'<button type="button" class="caps mc-tab" data-i18n="hcP_{sid}">{e(name[0])}</button>'
                   f'<div class="mc-card-in"><header><h3 data-i18n="sp_{sid}">{e(s["place"]["en"])}</h3>'
                   f'<span class="caps" data-i18n="mcD_{sid}">{e(en["mcD_" + sid])}</span></header>'
                   f'<div class="mc-card-body"><div class="mc-card-photo">{photo(sid, en, zh, "(max-width: 48rem) 40vw, 16rem")}</div>'
                   f'<ul class="mc-card-lines"><li data-i18n="sw_{sid}">{e(s["where"]["en"])}</li>'
                   f'<li data-i18n="mcC_{c["id"]}">{e(c["en"])}</li>'
                   f'<li class="mc-card-alt" data-i18n="sa_{sid}">{e(s["alt"]["en"])}</li>'
                   f'<li><a href="{href}" data-i18n="mcGo">Go there</a></li>{BLANK * 4}</ul></div></div></article>')
    return f"""<div class="leaf mc mc-cards">
{opening(en, zh)}
<section class="mc-run" data-n="{len(H.PLACES)}" aria-label="Places" data-i18n-aria="mcDrawer">
  <div class="mc-stage">
    <div class="mc-drawer">
      <div class="mc-pack">{"".join(out)}</div>
      <div class="mc-front-board"><span class="caps" data-i18n="mcDrawer">Places</span></div>
    </div>
    <p class="mc-steps"><button type="button" class="caps" data-step="-1" data-i18n="mcPrevC">Previous</button><button type="button" class="caps" data-step="1" data-i18n="mcNextC">Next</button></p>
  </div>
</section>
{ways(en, zh)}
</div>"""


VERSIONS = [
    ("wc1", book, "The photobook", "攝影集"),
    ("wc2", postcards, "Postcards", "明信片"),
    ("wc3", horizon, "One horizon", "同一條地平線"),
    ("wc4", room, "The exhibition room", "展覽室"),
    ("wc5", cards, "Index cards", "索引卡"),
]

if __name__ == "__main__":
    for name, body_of, t_en, t_zh in VERSIONS:
        H.write_version(name, body_of, t_en, t_zh, css=("more-c.css",), js=("more-c.js",))
