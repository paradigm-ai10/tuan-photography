#!/usr/bin/env python3
"""Home opening, a page to share (2026-11-11, his ask: "a sharable artifact for me to share with my friends").

Bundles the opening versions he is choosing between (the manifest's "ask" ids, numbered as on his review list) into one
folder that can be published as an Artifact: the list page (index.html, body only, the Artifact tool wraps it),
one page per version (o1.html ...), and only the styles, scripts, photographs and film they load. The review
bar is left out, the typefaces come from Google Fonts (the one font host an Artifact may load), and links to
the rest of the site lead nowhere.

    python3 tools/share_openings.py <out folder>

Prints the list of files to publish beside index.html. Rerun after the versions change, then republish.
"""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOME = ROOT / "design 2" / "new" / "home-redesign"
WEB = ROOT / "design 1" / "images" / "web"
THUMBS = ROOT / "ideas" / "reviews" / "thumbs" / "home-redesign"
OUT = Path(sys.argv[1]).resolve()

FONTS = ("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;500&family=Geist:wght@400..600"
         "&family=Noto+Sans+TC:wght@400..600&family=Noto+Serif+TC:wght@500..600&family=Playfair+Display&display=swap")

# the ideas, in the order friends see them; names here are plain ones for people who have not followed the rounds
IDEAS = [
    {"ids": ["c-flock-around-reveal", "c-flock-around-night"],
     "en": "Around the name", "zh": "圍著名字",
     "d_en": "The photographs gather round the name, then the film opens in the middle.",
     "d_zh": "照片圍著名字聚起來，影片從中間打開。"},
    {"ids": ["c-flock-cards-slow", "c-flock-cards-slow-night"],
     "en": "The cards", "zh": "卡片",
     "d_en": "Photographs fly in like cards, then turn over into the film.",
     "d_zh": "照片像卡片一樣飛進來，再翻過去變成影片。"},
    {"ids": ["c-flock-camille-smooth", "c-flock-camille-smooth-night"],
     "en": "The wall, in one move", "zh": "照片牆，一氣呵成",
     "d_en": "A wall of photographs slides in while the view closes on one of them, and that one is the film.",
     "d_zh": "一面照片牆滑進來，鏡頭同時推向其中一張，那一張就是影片。"},
    {"ids": ["c-flock-camille-flow", "c-flock-camille-night"],
     "en": "The wall, flowing", "zh": "照片牆，流動版",
     "d_en": "The same wall, slower and longer: the photographs keep flowing as the view closes in.",
     "d_zh": "同一面牆，慢一點、長一點：鏡頭推近的時候照片還在流動。"},
    {"ids": ["c-flock-cards-flip"],
     "en": "The cards, first take", "zh": "卡片，較早的一版",
     "d_en": "An earlier take of the cards: they arrive faster.",
     "d_zh": "卡片比較早的版本，進來得比較快。"},
]

manifest = json.loads((HOME / "review-manifest.json").read_text())
ROUND = manifest["round"]["ids"]
NUM = {vid: i + 1 for i, vid in enumerate(ROUND)}   # the numbers on his review list, so a friend's "7" is his 7
assert sorted(v for idea in IDEAS for v in idea["ids"]) == sorted(ROUND), "IDEAS and the manifest's round differ"
# only the versions he is choosing between now (the manifest's "ask"; his word, 2026-11-11: "那五個就好了吧")
SHOWN = set(manifest["ask"]["ids"])
IDEAS = [{**idea, "ids": [v for v in idea["ids"] if v in SHOWN]} for idea in IDEAS]
IDEAS = sorted((idea for idea in IDEAS if idea["ids"]), key=lambda idea: min(NUM[v] for v in idea["ids"]))

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
used = set()   # photographs the pages name, as paths under images/web


def version_page(vid, idea):
    n = NUM[vid]
    s = (HOME / f"{vid}.html").read_text()
    dark = 'data-ground="dark"' in s
    s = re.sub(r'<link rel="stylesheet" href="review-kit/bar\.css">\n<script src="review-kit/words\.js"></script>\n'
               r'<script src="review-kit/store\.js"></script>\n<script src="review-kit/bar\.js"[^>]*></script>\n', "", s)
    assert "review-kit" not in s, vid
    s = s.replace('<link rel="icon" href="../../../favicon.ico">\n', "")
    s = s.replace('<link rel="stylesheet" href="../../../css/fonts.css">', f'<link rel="stylesheet" href="{FONTS}">')
    s = s.replace('href="../../../css/style.css"', 'href="style.css"')
    s = re.sub(r' srcset="[^"]*" sizes="[^"]*"', "", s)
    for m in re.finditer(r'\.\./\.\./\.\./images/web/([^"\s]+\.jpg)', s):
        used.add(m.group(1))
        if m.group(1).startswith("640/"):
            used.add("1280/" + m.group(1)[4:])   # the large panels swap to the larger copies
    s = s.replace("../../../images/web/", "img/")
    s = re.sub(r'href="(\.\./\.\./\.\./[^"]*|\./)"', 'href="#"', s)
    assert "../" not in s, (vid, re.findall(r'[^"]*\.\./[^"]*', s)[:3])
    ground = ("black", "黑底") if dark else ("white", "白底")
    s = re.sub(r"<title>.*?</title>", f"<title>{n} · {idea['en']} ({ground[0]}) {idea['zh']}（{ground[1]}） · tuan photography</title>", s, count=1)
    (OUT / f"o{n}.html").write_text(s)
    return {"n": n, "dark": dark}


rows, table = [], {}
for idea in IDEAS:
    vs = [version_page(vid, idea) for vid in idea["ids"]]
    for v in vs:
        twin = next((o["n"] for o in vs if o["n"] != v["n"]), None)
        table[v["n"]] = {"en": idea["en"], "zh": idea["zh"], "dark": v["dark"], "twin": twin}
    cards = "".join(f"""
      <button class="card" type="button" data-play="{v['n']}">
        <span class="card__still"><img src="still/{v['n']}.jpg" alt="" width="960" height="600" loading="lazy" decoding="async"></span>
        <span class="card__line"><b class="card__n">{v['n']}</b><span class="caps card__ground">{'<span lang="en">Black</span><span lang="zh-Hant">黑底</span>' if v['dark'] else '<span lang="en">White</span><span lang="zh-Hant">白底</span>'}</span><span class="caps card__go"><span lang="en">Play</span><span lang="zh-Hant">播放</span></span></span>
      </button>""" for v in vs)
    both = (f"""
    <p class="idea__both"><button class="word" type="button" data-both="{vs[0]['n']}-{vs[1]['n']}"><span lang="en">Play {vs[0]['n']} and {vs[1]['n']} side by side</span><span lang="zh-Hant">{vs[0]['n']} 和 {vs[1]['n']} 並排播放</span></button></p>"""
            if len(vs) == 2 else "")
    rows.append(f"""
  <section class="idea{'' if len(vs) == 2 else ' idea--one'}">
    <header class="idea__head"><h2><span lang="en">{idea['en']}</span><span lang="zh-Hant">{idea['zh']}</span></h2>
      <p><span lang="en">{idea['d_en']}</span><span lang="zh-Hant">{idea['d_zh']}</span></p></header>
    <div class="idea__pair">{cards}
    </div>{both}
  </section>""")

# what the pages load
for name in ("home.css", "home.js", "flock.js"):
    shutil.copy(HOME / name, OUT / name)
shutil.copy(ROOT / "design 1" / "css" / "style.css", OUT / "style.css")
(OUT / "media").mkdir()
for name in ("barcelona.mp4", "road-first.jpg"):
    shutil.copy(HOME / "media" / name, OUT / "media" / name)
for rel in sorted(used):
    src = WEB / rel
    if not src.exists():
        continue
    (OUT / "img" / rel).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, OUT / "img" / rel)
(OUT / "still").mkdir()
for vid, n in NUM.items():
    if vid in SHOWN:
        shutil.copy(THUMBS / f"{vid}.jpg", OUT / "still" / f"{n}.jpg")

page = (Path(__file__).with_name("share_openings.html")).read_text()
page = page.replace("@@FONTS@@", FONTS).replace("@@ROWS@@", "".join(rows)).replace("@@TABLE@@", json.dumps(table, ensure_ascii=False))
assert "@@" not in page
(OUT / "index.html").write_text(page)

files = sorted(str(p.relative_to(OUT)) for p in OUT.rglob("*") if p.is_file() and p.name != "index.html" and not p.name.startswith("_"))
(OUT / "_files.json").write_text(json.dumps([{"path": f} for f in files]))
total = sum((OUT / f).stat().st_size for f in files)
print(f"{len(files)} files beside index.html, {total / 1e6:.1f} MB, largest {max((OUT / f).stat().st_size for f in files) / 1e6:.1f} MB")
print(OUT / "_files.json")
