# The road to the Sagrada Família as drawable lines for the home redesign's version D (2026-11-05):
# the edges of the film's first frame as SVG paths, in drawing order from the towers outward, each
# carrying when it starts (--d) and how long it takes (--t). Needs OpenCV (pip install opencv-python-headless).
#   python3 tools/home_redesign_trace.py <first frame.png> "design 2/new/home-redesign/media/road-lines.svg" 1500
import cv2, numpy as np, sys, math
src, out = sys.argv[1], sys.argv[2]
im = cv2.imread(src, cv2.IMREAD_GRAYSCALE)
im = cv2.resize(im, (1920, 1080), interpolation=cv2.INTER_AREA)
im = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8)).apply(im)
sm = cv2.bilateralFilter(im, 9, 40, 9)
sm = cv2.GaussianBlur(sm, (3, 3), 0)
ed = cv2.Canny(sm, 50, 130)
cs, _ = cv2.findContours(ed, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
items = []
for c in cs:
    L = cv2.arcLength(c, False)
    if L < 45: continue
    a = cv2.approxPolyDP(c, 1.1, False).reshape(-1, 2)
    if len(a) < 2: continue
    # a closed outline from findContours runs there and back: keep the first half
    if len(a) > 6 and np.linalg.norm(a[0] - a[-1]) < 3: a = a[: len(a) // 2 + 1]
    cx, cy = a[:, 0].mean(), a[:, 1].mean()
    items.append((L, cx, cy, a))
items.sort(key=lambda t: -t[0])
items = items[: int(sys.argv[3]) if len(sys.argv) > 3 else 1100]
# drawing order: from the towers outward, the way a hand starts with the subject
TX, TY = 960, 330
items.sort(key=lambda t: math.hypot((t[1] - TX) * 0.8, t[2] - TY))
n = len(items)
TOTAL = 4.2   # seconds over which lines begin
paths = []
for k, (L, cx, cy, a) in enumerate(items):
    d = "M" + " L".join(f"{x},{y}" for x, y in a)
    delay = TOTAL * (k / n) ** 0.85
    dur = min(1.1, 0.25 + L / 900)
    paths.append(f'<path d="{d}" pathLength="1" style="--d: {delay:.2f}s; --t: {dur:.2f}s"/>')
svg = ('<svg class="hr-load__trace" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
       + "".join(paths) + "</svg>")
open(out, "w").write(svg)
print(n, "paths", len(svg) // 1024, "KB")
