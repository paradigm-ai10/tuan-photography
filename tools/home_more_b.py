#!/usr/bin/env python3
"""Twenty versions of the home page's content, batch B (scroll and motion), 2026-11-12.

His ask: twenty distinct versions of the page under the Barcelona film and the Aoraki photograph, built quickly,
in the hope of a happy accident. This batch is five of them, each a way for the scroll to move his photographs:

    wb1  The long wall          a short held stretch where scrolling down walks sideways along one exhibition wall
    wb2  Into the photograph    each photograph grows from small to the whole window; the next waits in its middle
    wb3  The pile               prints laid one over another, each a little off the last, the earlier edges showing
    wb4  Two directions         two columns of photographs travelling opposite ways, the names in a gutter between
    wb5  The blind              the photograph changes through slats that turn like a Venetian blind

    python3 tools/home_more_b.py

Pages: design 2/new/home-redesign/wb1.html to wb5.html, written by home_content.write_version (the live home page with
these bodies under Aoraki). Styles: more-b.css (classes mb-…, all under .mb). Script: more-b.js.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import home_content as H   # noqa: E402

B = H.B
e = B.e


def said(s, en, zh):
    """The slide's own names, and its country's dates, as strings for both languages."""
    sid, c = s["id"], s["country"]
    B.strings(s, en, zh)
    en[f"sw_{sid}"], zh[f"sw_{sid}"] = s["where"]["en"], s["where"]["zh"]
    d = B.COUNTRIES[c]["date"]
    en[f"mbD_{c}"], zh[f"mbD_{c}"] = d["en"], d["zh"]


def label(s):
    """The place, where it is, when he was there: three short lines."""
    sid, c = s["id"], s["country"]
    return (f'<b data-i18n="sp_{sid}">{e(s["place"]["en"])}</b><span data-i18n="sw_{sid}">{e(s["where"]["en"])}</span>'
            f'<span class="caps" data-i18n="mbD_{c}">{e(B.COUNTRIES[c]["date"]["en"])}</span>')


def ways(en, zh):
    return f'<nav class="wrap hc-ways" aria-label="Site">{"".join(H.way(*w[:2], en, zh, *w[2:]) for w in H.WAYS)}</nav>'


def ar(s):
    return B.ratio(s)


# ---------------------------------------------------------------- wb1: the long wall

WALL = [   # (photograph, height in hundredths of the window, how far below the rail it hangs)
    ("queensboro-train", 56, 7),
    ("matterhorn-lake", 33, 21),
    ("sapa-terraces", 48, 12),
    ("golden-gate-fog", 29, 31),
    ("tekapo-stars", 58, 5),
    ("hoi-an-night", 37, 16),
    ("sheung-wan-tram", 44, 24),
    ("fuji-lake", 39, 10),
    ("calanque", 31, 27),
    ("roys-peak", 45, 14),
]


def long_wall(en, zh):
    """One long exhibition wall seen from in front of it. The scroll walks along it: a thin rail runs the length of
    the wall, every photograph hangs from it on two fine wires at its own height and size, and its label is pinned to
    the wall beside it, never on it. The wall's own title is lettered at its start, as in a gallery."""
    items = []
    for i, (sid, h, y) in enumerate(WALL):
        s = B.SLIDES[sid]
        said(s, en, zh)
        items.append(f'<figure class="mb-wall__item" style="--ar: {ar(s)}; --h: {h}; --y: {y}">'
                     f'<a class="mb-wall__photo" {B.opens(sid, "", en, zh)}>{B.img(s, "", f"{round(h * float(ar(s)))}vh", soon=True)}</a>'
                     f'<figcaption class="mb-label">{label(s)}</figcaption></figure>')
    en["mbWallSay"], zh["mbWallSay"] = "Ten photographs, hung along one wall.", "十張照片，掛在同一面牆上。"
    en["mbPlaces"], zh["mbPlaces"] = "Places", "地方"
    return f"""<div class="leaf mb mb-wall">
<section class="mb-wall__run" aria-label="Places" data-i18n-aria="mbPlaces">
  <div class="mb-wall__stage">
    <div class="mb-wall__track">
      <span class="mb-wall__rail" aria-hidden="true"></span>
      <div class="mb-wall__title">{H.line(en, zh)}<p data-i18n="mbWallSay">Ten photographs, hung along one wall.</p></div>
      {"".join(items)}
      <span class="mb-wall__end" aria-hidden="true"></span>
    </div>
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wb2: into the photograph

ZOOM = ["queensboro-train", "matterhorn-lake", "tekapo-stars", "golden-gate-fog", "sapa-terraces", "hoi-an-night"]


def into(en, zh):
    """A photograph small in the middle of the paper, its name beneath. Scrolling, it grows until it fills the
    window; as it fills, the next one is already small in its middle, and when the first is gone the next one's name
    is there beneath it, on the paper. Names only ever stand on paper."""
    photos, names = [], []
    for i, sid in enumerate(ZOOM):
        s = B.SLIDES[sid]
        said(s, en, zh)
        photos.append(f'<figure class="mb-zoom__ph" style="--ar: {ar(s)}; --i: {i}"><a {B.opens(sid, "", en, zh)}>'
                      f'{B.img(s, "", "100vw", soon=True)}</a></figure>')
        names.append(f'<p class="mb-zoom__name" style="--ar: {ar(s)}; --i: {i}">{label(s)}</p>')
    en["mbPlaces"], zh["mbPlaces"] = "Places", "地方"
    return f"""<div class="leaf mb mb-zoom">
<section class="hc-leaf hc-leaf--line">{H.line(en, zh)}</section>
<section class="mb-zoom__run" aria-label="Places" data-i18n-aria="mbPlaces">
  <div class="mb-zoom__stage">
    {"".join(photos)}
    {"".join(names)}
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wb3: the pile

PILE = [   # (photograph, where it comes to rest off the middle: across, up, a turn in tenths of a degree)
    ("matterhorn-lake", 0, 0, 0),
    ("peak-night", 16, -12, 4),
    ("queensboro-train", -22, 8, -3),
    ("otaru-canal", 10, 14, -5),
    ("roys-peak", -14, -10, 3),
    ("hoi-an-gate", 20, 6, -2),
    ("golden-gate-fog", -8, -16, 5),
]


def pile(en, zh):
    """Prints laid on a pile: each one slides up from the foot of the window and settles over the last, a little off
    it, so the edges of the earlier ones show round it. Each print has a thin paper edge instead of a shadow. The
    name of the one on top is the line beneath the pile."""
    prints, names = [], []
    for i, (sid, dx, dy, r) in enumerate(PILE):
        s = B.SLIDES[sid]
        said(s, en, zh)
        prints.append(f'<figure class="mb-pile__print" style="--ar: {ar(s)}; --dx: {dx}; --dy: {dy}; --r: {r}; --i: {i}">'
                      f'<a {B.opens(sid, "", en, zh)}>{B.img(s, "", "(max-width: 48rem) 92vw, 78vw", soon=True)}</a></figure>')
        names.append(f'<p class="mb-pile__name{" is-on" if i == 0 else ""}">{label(s)}</p>')
    en["mbPlaces"], zh["mbPlaces"] = "Places", "地方"
    return f"""<div class="leaf mb mb-pile">
<section class="hc-leaf hc-leaf--line">{H.line(en, zh)}</section>
<section class="mb-pile__run" aria-label="Places" data-i18n-aria="mbPlaces">
  <div class="mb-pile__stage">
    <div class="mb-pile__heap">{"".join(prints)}</div>
    <div class="mb-pile__names">{"".join(names)}</div>
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wb4: two directions

LEFT = ["queensboro-train", "matterhorn-lake", "sapa-terraces", "hoi-an-night", "tekapo-stars", "golden-gate-fog"]
RIGHT = ["mong-kok", "fuji-lake", "calanque-tall", "peak-night", "the-chair", "roys-peak"]


def two_ways(en, zh):
    """The window split in two. Scrolling, the left column of photographs rises and the right one falls, so they
    pass each other; in the narrow gutter between them a fine rule marks the middle, with the name of the left
    photograph crossing it just above the rule and the right one's just below."""
    def column(ids, side):
        figs, names = [], []
        for sid in ids:
            s = B.SLIDES[sid]
            said(s, en, zh)
            figs.append(f'<figure class="mb-two__ph" style="--ar: {ar(s)}"><a {B.opens(sid, "", en, zh)}>'
                        f'{B.img(s, "", "(max-width: 48rem) 40vw, 38vw", soon=True)}</a></figure>')
            names.append(f'<li>{label(s)}</li>')
        return (f'<div class="mb-two__col mb-two__col--{side}"><div class="mb-two__track">{"".join(figs)}</div></div>',
                f'<div class="mb-two__names mb-two__names--{side}"><ol>{"".join(names)}</ol></div>')
    lc, ln = column(LEFT, "left")
    rc, rn = column(RIGHT, "right")
    en["mbPlaces"], zh["mbPlaces"] = "Places", "地方"
    return f"""<div class="leaf mb mb-two">
<section class="hc-leaf hc-leaf--line">{H.line(en, zh)}</section>
<section class="mb-two__run" aria-label="Places" data-i18n-aria="mbPlaces">
  <div class="mb-two__stage">
    {lc}
    <div class="mb-two__gutter">{ln}<span class="mb-two__rule" aria-hidden="true"></span>{rn}</div>
    {rc}
  </div>
</section>
{ways(en, zh)}
</div>"""


# ---------------------------------------------------------------- wb5: the blind

BLIND = ["peak-night", "otaru-canal", "calanque", "roys-peak", "kinkaku", "sapa-valley", "hoi-an-night", "neuschwanstein"]
SLATS = 12


def blind(en, zh):
    """One place at a time, in one frame. Scrolling, the photograph turns away in horizontal slats, like a Venetian
    blind tilting from the top down, and the next is on the other side of them. Every place is listed small along
    the side; the one in the frame is in ink, and its name is set beneath the frame."""
    photos, names, run = [], [], []
    for i, sid in enumerate(BLIND):
        s = B.SLIDES[sid]
        said(s, en, zh)
        on = " is-on" if i == 0 else ""
        photos.append(f'<figure class="mb-blind__ph{on}" data-src="{H.UP}images/web/1280/{s["file"]}">'
                      f'<a {B.opens(sid, "", en, zh)}>{B.img(s, "", "(max-width: 48rem) 92vw, 62vw", soon=True)}</a></figure>')
        names.append(f'<p class="mb-blind__name{on}">{label(s)}</p>')
        run.append(f'<li><button type="button" class="{on.strip()}" data-i18n="sp_{sid}">{e(s["place"]["en"])}</button></li>')
    first, second = (f'{H.UP}images/web/1280/{B.SLIDES[x]["file"]}' for x in BLIND[:2])
    slats = "".join(f'<span class="mb-blind__slat" style="--i: {i}"><span class="mb-blind__face"><img src="{first}" alt="" decoding="async"></span>'
                    f'<span class="mb-blind__face mb-blind__face--back"><img src="{second}" alt="" decoding="async"></span></span>'
                    for i in range(SLATS))
    en["mbPlaces"], zh["mbPlaces"] = "Places", "地方"
    return f"""<div class="leaf mb mb-blind">
<section class="hc-leaf hc-leaf--line">{H.line(en, zh)}</section>
<section class="mb-blind__run" aria-label="Places" data-i18n-aria="mbPlaces">
  <div class="mb-blind__stage">
    <ol class="mb-blind__list">{"".join(run)}</ol>
    <div class="mb-blind__frame" style="--n: {SLATS}">
      {"".join(photos)}
      <div class="mb-blind__slats" aria-hidden="true">{slats}</div>
    </div>
    <div class="mb-blind__names">{"".join(names)}</div>
  </div>
</section>
{ways(en, zh)}
</div>"""


VERSIONS = [   # (file, the body, title en, title zh)
    ("wb1", long_wall, "The long wall", "一面長長的牆"),
    ("wb2", into, "Into the photograph", "走進照片裡"),
    ("wb3", pile, "The pile", "一疊照片"),
    ("wb4", two_ways, "Two directions", "兩個方向"),
    ("wb5", blind, "The blind", "百葉窗"),
]


if __name__ == "__main__":
    for name, body_of, t_en, t_zh in VERSIONS:
        H.write_version(name, body_of, t_en, t_zh, css=("more-b.css",), js=("more-b.js",))
