#!/usr/bin/env python3
"""Version Review kit: a small still picture of every version, for the hub's contact sheet.

    python3 tools/review_thumbs.py --manifest "design 2/new/review-manifest.json" \\
        --base http://localhost:8642/journey/new/ --out ideas/reviews/thumbs/journey [--all | <id> ...] [--marks]

Headless Chrome opens each version with ?still (the review bar draws nothing then), waits the
version's "still.wait" in virtual time (and shows "still.view", a review-bar view, if given) (20 s by default: WebGL pages need it), and saves a 1440 x 900 picture; sips makes
it a 960 px JPEG, <id>.jpg. "still.crop": [x, y, w, h] as fractions of the window keeps only the
work (the atlas pages' globe, without their list of places). A version is redone only if its .html,
or a script or stylesheet that page loads (its own <script src> and <link href>, wherever they are),
is newer than its still; --all redoes everything. A picture that comes out blank (one flat colour:
WebGL had not drawn yet) is taken again on its own with twice the time, and if it is still blank no
still is kept, so the hub shows the numbered block rather than an empty card. --marks also pictures each mark that kept a view,
as <id>-<mark id>.jpg. thumbs.json lists what exists: {id: {taken, w, h}}.
It never touches the review notes. Without Chrome it says so in one line and stops.
"""
import argparse
import concurrent.futures as cf
import base64
import json
import os
import re
import subprocess
import sys
import tempfile
import time

CHROME = os.environ.get('CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def page_sources(folder, html):
    """The files a version's page loads: itself, its scripts and stylesheets (and their @imports)."""
    page = os.path.join(folder, html)
    out, todo = {page}, []
    try:
        with open(page, encoding='utf-8') as fh:
            text = fh.read()
    except OSError:
        return None
    for m in re.finditer(r'<script[^>]*\ssrc="([^"#?]+)|<link[^>]*\shref="([^"#?]+\.css)', text):
        ref = m.group(1) or m.group(2)
        if re.match(r'^[a-z]+:|^//', ref):
            continue
        # the review kit itself draws nothing in a still: a change to it is no reason to redo one
        if re.search(r'(^|/)(review\.(js|css)|review-kit/)', ref):
            continue
        todo.append(os.path.normpath(os.path.join(folder, ref)))
    while todo:
        f = todo.pop()
        if f in out or not os.path.exists(f):
            continue
        out.add(f)
        if f.endswith('.css'):
            try:
                with open(f, encoding='utf-8') as fh:
                    css = fh.read()
            except OSError:
                continue
            for m in re.finditer(r'@import\s+(?:url\()?["\']?([^"\')\s]+)', css):
                if not re.match(r'^[a-z]+:|^//', m.group(1)):
                    todo.append(os.path.normpath(os.path.join(os.path.dirname(f), m.group(1))))
    return out


def newest_source(folder, html):
    files = page_sources(folder, html)
    if files is None:   # the page could not be read: fall back to everything beside it
        files = [os.path.join(folder, f) for f in os.listdir(folder) if f.endswith(('.js', '.css', '.html'))]
    return max((os.path.getmtime(f) for f in files if os.path.exists(f)), default=0)


def blank(png):
    """True when the picture is one flat colour (nothing drawn yet)."""
    try:
        from PIL import Image, ImageStat
        with Image.open(png) as im:
            st = ImageStat.Stat(im.convert('L').resize((240, 150)))
        return st.stddev[0] < 2.0
    except ImportError:
        return os.path.getsize(png) < 40_000   # a flat 1440 x 900 PNG is a few kB
    except OSError:
        return True


def shoot(url, png, wait):
    with tempfile.TemporaryDirectory() as prof:
        cmd = [CHROME, '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
               '--window-size=1440,900', f'--virtual-time-budget={wait}', f'--user-data-dir={prof}',
               '--no-first-run', '--no-default-browser-check', '--mute-audio', f'--screenshot={png}', url]
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=max(60, wait / 1000 * 4 + 30))
        except subprocess.TimeoutExpired:
            return False
    return os.path.exists(png) and os.path.getsize(png) > 0


def crop(png, box):
    """Keep only [x, y, w, h] (fractions) of the picture."""
    if not box:
        return
    x, y, w, h = (float(v) for v in box)
    try:
        from PIL import Image
        with Image.open(png) as im:
            W, H = im.size
            im.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H))).save(png)
    except ImportError:
        W, H = 1440, 900
        subprocess.run(['sips', '-c', str(round(h * H)), str(round(w * W)), '--cropOffset', str(round(y * H)), str(round(x * W)), png],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)


def to_jpg(png, jpg, box=None):
    crop(png, box)
    subprocess.run(['sips', '-Z', '960', '-s', 'format', 'jpeg', '-s', 'formatOptions', '70', png, '--out', jpg],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    os.remove(png)
    out = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', jpg], capture_output=True, text=True).stdout
    w = h = 0
    for line in out.splitlines():
        if 'pixelWidth' in line:
            w = int(line.split()[-1])
        if 'pixelHeight' in line:
            h = int(line.split()[-1])
    return w, h


def with_still(url):
    base, _, frag = url.partition('#')
    base += ('&' if '?' in base else '?') + 'still'
    return base + ('#' + frag if frag else '')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--manifest', required=True)
    ap.add_argument('--base', required=True, help='the address the versions are served at, ending in /')
    ap.add_argument('--out', required=True)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--marks', action='store_true')
    ap.add_argument('--reviews', help='the review file, for --marks (default: <out>/../../<name>.json)')
    ap.add_argument('ids', nargs='*')
    a = ap.parse_args()

    if not os.path.exists(CHROME):
        print('review_thumbs: Chrome not found, no stills made (the hub shows numbered blocks).')
        return 0
    with open(a.manifest, encoding='utf-8') as fh:
        M = json.load(fh)
    folder = os.path.dirname(os.path.abspath(a.manifest))
    os.makedirs(a.out, exist_ok=True)
    index_f = os.path.join(a.out, 'thumbs.json')
    try:
        with open(index_f, encoding='utf-8') as fh:
            index = json.load(fh)
    except (OSError, ValueError):
        index = {}

    items = []
    for it in M.get('items', []):
        href = it['href']
        iid = it.get('id') or href.rsplit('.', 1)[0]
        st = it.get('still') or {}
        frag = st.get('hash', '')
        if st.get('view'):   # a view to show, handed to the page the way the review bar hands one on
            frag = '#rv=' + base64.urlsafe_b64encode(json.dumps(st['view']).encode('utf-8')).decode().rstrip('=')
        items.append((iid, href, int(st.get('wait', 20000)), frag, st.get('crop')))
    if a.ids:
        items = [x for x in items if x[0] in a.ids]

    jobs = []
    for iid, href, wait, frag, box in items:
        jpg = os.path.join(a.out, iid + '.jpg')
        fresh = os.path.exists(jpg) and os.path.getmtime(jpg) >= newest_source(folder, href)
        if a.all or a.ids or not fresh:
            jobs.append((iid, with_still(a.base + href + (frag or '')), wait, jpg, box))

    if a.marks:
        rf = a.reviews or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(a.out))), M.get('name', 'journey') + '.json')
        try:
            with open(rf, encoding='utf-8') as fh:
                R = json.load(fh)
        except (OSError, ValueError):
            R = {}
        for iid, href, wait, frag, box in items:
            for m in (R.get('items', {}).get(iid, {}).get('marks') or []):
                if m.get('gone') or not m.get('view'):
                    continue
                jpg = os.path.join(a.out, f"{iid}-{m['id']}.jpg")
                if os.path.exists(jpg) and not a.all:
                    continue
                v = json.dumps(m['view'], ensure_ascii=False).encode('utf-8')
                rv = base64.urlsafe_b64encode(v).decode().rstrip('=')
                jobs.append((f"{iid}-{m['id']}", with_still(a.base + href) + '#rv=' + rv, wait + 2000, jpg, None))

    done = 0

    def run(job, slow=False):
        iid, url, wait, jpg, box = job
        png = jpg[:-4] + '.png'
        if not shoot(url, png, wait * 2 if slow else wait):
            return iid, None
        if blank(png):
            os.remove(png)
            return iid, 'blank'
        return iid, to_jpg(png, jpg, box)

    def record(iid, wh):
        nonlocal done
        done += 1
        index[iid] = {'taken': time.strftime('%Y-%m-%dT%H:%M:%S'), 'w': wh[0], 'h': wh[1]}
        print(f'  {iid}  {wh[0]}x{wh[1]}')

    retry = []
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        for job, (iid, wh) in zip(jobs, ex.map(run, jobs)):
            if wh == 'blank':
                retry.append(job)
            elif wh:
                record(iid, wh)
            else:
                print(f'  {iid}  not made (Chrome gave no picture in time)')
    # blank ones again, one Chrome at a time and with twice the time
    for job in retry:
        iid, wh = run(job, slow=True)
        if wh and wh != 'blank':
            record(iid, wh)
        else:
            # no blank picture is kept: an older still stays if it shows something, otherwise the hub
            # shows the numbered block
            f = job[3]
            if os.path.exists(f) and blank(f):
                os.remove(f)
                index.pop(iid, None)
            print(f'  {iid}  blank (nothing drawn in time); not kept')
    tmp = index_f + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, index_f)
    redo = len([j for j in jobs if j[0] in {x[0] for x in items}])
    print(f'review_thumbs: {done} made, {len(items) - redo} of {len(items)} versions already up to date.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
