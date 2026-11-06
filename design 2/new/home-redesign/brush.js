/* Home redesign, E's opening brushed by hand (his ask, 2026-11-06: the first brush felt "formalized, very
   strict", not like a person brushing). What a real stroke does, and how it is copied here:
   - one hand: strokes come one after another, never two at once, with a lift between them, a longer pause
     when the brush is dipped again, and each stroke a different length, angle and speed;
   - an arm's movement: each stroke bows along an arc and follows the smooth start and stop of a reaching
     hand (the "minimum jerk" curve), with a slight tremor;
   - pressure: the stroke lands narrower, spreads as the brush presses, and narrows as it lifts off;
   - paint: the bristles grow in clumps, start full and run out along the stroke, the edges first, so the
     paint breaks up on the paper's tooth into dry streaks (飛白) towards the tail, flecks flung off the end;
   - the painter fills the gaps: each stroke goes where the paper still shows, top to bottom, left to right,
     overlapping the last one's tail.
   The paper is a canvas the brush wears away, uncovering the film already playing behind it (slowed while
   the brush works, so its first shot still holds once the paper is gone). <html data-pencil> names the hand:
   hand, hand-loaded, hand-dry. home.js calls HRPencil.start() and gets the timings back. */
(() => {
  'use strict';
  const html = document.documentElement;
  const canvas = document.querySelector('.hr-load__wear');
  const video = document.querySelector('.hr-open video');
  const HANDS = {
    // a wide brush, painted briskly
    hand: { size: 0.3, angle: -5, tilt: 5, dur: [0.24, 0.34], lift: [0.05, 0.11], dip: 3, load: 1.05, spend: 0.55, bow: 0.03, shake: 0.004, flecks: 5, rate: 0.35 },
    // more paint, slower, fuller strokes
    'hand-loaded': { size: 0.34, angle: -3, tilt: 4, dur: [0.32, 0.44], lift: [0.07, 0.13], dip: 4, load: 1.3, spend: 0.4, bow: 0.035, shake: 0.003, flecks: 2, rate: 0.35 },
    // a dry brush, fast and scratchy, more strokes at looser angles
    'hand-dry': { size: 0.27, angle: -7, tilt: 9, dur: [0.18, 0.26], lift: [0.04, 0.09], dip: 3, load: 0.85, spend: 0.75, bow: 0.025, shake: 0.006, flecks: 8, rate: 0.35 },
  };
  const o = HANDS[html.dataset.pencil];
  const SMOOTH = 'smooth' in html.dataset;   // 32 smoothed: the last of the paper dissolves into its grain and lifts away (his ask, 2026-11-06)
  const DISSOLVE = 1.6;
  if (!o || !canvas) return;

  let seed = 1127;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const between = ([a, b]) => a + (b - a) * rnd();
  const reach = (x) => x * x * x * (10 - 15 * x + 6 * x * x);   // a hand reaching: minimum jerk
  const N = 96;   // points along each bristle

  // the paper's tooth, as in pencil.js: white with a random strength at each grain
  function tooth(power) {
    const n = 128, c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d'), im = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { im.data.fill(255, i * 4, i * 4 + 3); im.data[i * 4 + 3] = 255 * Math.pow(rnd(), power); }
    g.putImageData(im, 0, 0);
    return c;
  }

  // one stroke: a bowed path from (x0, y0) at an angle, its bristles in clumps, each with its paint along it
  function stroke(x0, y0, len, ang, B, load, t0, dur, wob = 1) {
    const a = ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const bow = -o.bow * len * (0.6 + 0.4 * rnd()) * (wob > 1 ? 1.6 : 1), ph = rnd() * 6, sh = o.shake * innerHeight;   // one arm, so every stroke arcs the same way (the last, the most)
    const centre = (u) => {
      const along = u * len, side = bow * 4 * u * (1 - u) + sh * Math.sin(u * 11 + ph) * Math.sin(u * 3.7 + ph * 2);
      return [x0 + ux * along + nx * side, y0 + uy * along + ny * side];
    };
    // pressure: lands at about two thirds, spreads, breathes a little, lifts off
    const press = (u) => (u < 0.12 ? 0.62 + 0.38 * Math.sin(u / 0.12 * Math.PI / 2) : u > 0.8 ? 1 - 0.55 * ((u - 0.8) / 0.2) ** 1.5 : 1) + 0.05 * Math.sin(u * 9 + ph);
    // smoothed: the brush lands narrow and spreads over one and a half of its widths, and narrows to a third as it lifts
    // over the last two, so no stroke starts or stops square on the screen
    const uL = Math.min(0.25, 1.5 * B / len), uR = Math.min(0.3, 2 * B / len);
    const spread = (u) => (u < uL ? 0.4 + 0.6 * (1 - (1 - u / uL) ** 2) : u > 1 - uR ? 1 - 0.7 * ((u - 1 + uR) / uR) ** 1.5 : 1) + 0.04 * Math.sin(u * 9 + ph);
    // smoothed: each long side wobbles slowly on its own (a few px), so no side is ruler-straight
    const wA = rnd() * 6, wB = rnd() * 6, wC = rnd() * 6, wD = rnd() * 6;
    const side = (u, top) => wob * (top ? 5 * Math.sin(u * len / 110 + wA) + 2.5 * Math.sin(u * len / 41 + wB) : 5 * Math.sin(u * len / 120 + wC) + 2.5 * Math.sin(u * len / 37 + wD));
    const space = 2.3, bristles = [];
    for (let off = -1; off < 1;) {   // clumps of bristles with small gaps between
      const clump = 2 + Math.floor(rnd() * 6);
      for (let i = 0; i < clump && off < 1; i++) {
        bristles.push(off);
        off += space / (B / 2) * (0.7 + 0.6 * rnd());
      }
      off += space / (B / 2) * (0.05 + rnd() * 0.5);
    }
    const lines = bristles.map((off) => {
      const e = Math.abs(off), cap = 0.8 + 0.4 * rnd(), p1 = rnd() * 6, p2 = rnd() * 6, p3 = rnd() * 6, p4 = rnd() * 6;
      // the brush lands rounded and a little on one corner, and lifts off ragged and tapering
      const u0 = (B * (0.32 * e ** 1.6 + 0.12 * (off + 1) / 2 + 0.05 * rnd())) / len;
      const u1 = 1 - (B * (0.45 * e ** 1.4 + 0.1 * (1 - off) / 2 + 0.12 * rnd())) / len;
      const pts = [], level = [];
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1), [cx, cy] = centre(u), w = B / 2 * (off + 0.025 * Math.sin(u * 13 + p3)) * (SMOOTH ? spread(u) : 0.72 + 0.28 * press(u)) + (SMOOTH ? e * e * side(u, off > 0) : 0);   // bristles wander, so the gaps open and close
        pts.push([cx + nx * w, cy + ny * w]);
        if (u < u0 || u > u1) { level.push(-1); continue; }
        // the paint left on this bristle here: full at the start, spent along the way (the edges sooner),
        // skipping where the brush runs light, and thinner where it lifts
        const fringe = SMOOTH && e > 0.8 ? 3 * (e - 0.8) * Math.max(0, Math.sin(u * len / 55 + p4)) : 0;   // the outer bristles skip now and then along the side
        const paint = (load * cap + (u < 0.06 ? 0.15 : 0) + (SMOOTH && u < uL * 0.6 ? 0.2 : 0) - o.spend * u * (1 + 0.8 * e ** 3) - 0.1 * (0.6 * Math.sin(u * 9 + p1) + 0.4 * Math.sin(u * 23 + p2)) - fringe) * (0.55 + 0.45 * (SMOOTH ? spread(u) : press(u)));
        level.push(paint > 0.5 ? 0 : paint > 0.32 ? 1 : paint > 0.18 ? 2 : paint > 0.08 ? 3 : -1);
      }
      const lag = SMOOTH ? 30 * e ** 1.5 + 0.47 * B * 0.5 * (1 - off) / 2 + 4 * rnd() : B * (0.05 * e * e + 0.06 * rnd());   // smoothed: a rounded nose leaning back
      return { pts, level, i: 0, at: null, lag: lag / len };   // bristles trail the head unevenly, so its front is not a straight line
    });
    const end = centre(1), flecks = [];
    for (let i = 0, n = Math.floor(rnd() * (o.flecks + 1)); i < n; i++) {   // drops flung off the end as it lifts
      const d = 8 + rnd() * 80, s = (rnd() - 0.5) * B * 0.8;
      if (SMOOTH) {   // smoothed: inside the dry tail or on its edge, not out on bare paper
        const u = 0.7 + 0.3 * rnd(), [cx, cy] = centre(u), w = (rnd() - 0.5) * B * 1.1;
        flecks.push([cx + nx * w, cy + ny * w, 0.8 + rnd() * 2, t0 + dur * u + rnd() * 0.05]);
      } else flecks.push([end[0] + ux * d + nx * s, end[1] + uy * d + ny * s, 0.8 + rnd() * 2.6, t0 + dur + rnd() * 0.06]);
    }
    return { lines, flecks, t0, dur };
  }

  // where the paper still shows, in cells of 24 px; a stroke covers the cells its fuller bristles pass
  function plan(W, H, footY, dark) {
    const C = 24, GX = Math.ceil(W / C), GY = Math.ceil(H / C), cov = new Uint8Array(GX * GY), bare = new Uint8Array(GX * GY).fill(1);
    const footRow = Math.min(GY, Math.floor(footY / C));
    const mark = (s) => s.lines.forEach((l) => l.pts.forEach(([x, y], i) => {
      if (l.level[i] < 0) return;
      const gx = Math.floor(x / C), gy = Math.floor(y / C);
      if (gx >= 0 && gx < GX && gy >= 0 && gy < GY) bare[gy * GX + gx] = 0;
      if (l.level[i] > 2) return;
      if (gx >= 0 && gx < GX && gy >= 0 && gy < GY) cov[gy * GX + gx] = 1;
    }));
    const open = (r) => { let n = 0; for (let x = 0; x < GX; x++) n += !cov[r * GX + x]; return n; };
    const strokes = [];
    let t = SMOOTH ? 0.25 : 0, counted = null, n = 0;
    const B0 = Math.sqrt(W * H) * o.size * 0.85;   // the brush suits the screen's size, so a phone gets a narrower one
    const add = (x0, x1, yc, B, quick = 1, wet = 1, fixed = 0, step = null, tilt = null, wob = 1) => {   // one stroke from x0 to x1, its middle at height yc
      const ang = tilt === null ? o.angle + (rnd() - 0.5) * 2 * o.tilt : tilt, ta = Math.tan(ang * Math.PI / 180);
      const len = (x1 - x0) / Math.cos(ang * Math.PI / 180);
      const y0 = yc - ta * (x1 - x0) / 2;
      const dur = (fixed || quick * between(o.dur) * (0.6 + 0.4 * Math.min(1.2, (x1 - x0) / W))) * (0.75 + 0.25 * Math.min(1.6, W / 1440));
      let shade = 0;   // smoothed: more paint where the footage under the stroke is dark, so it reads as the photograph, not black hatching
      if (SMOOTH) for (let i = 0; i < 8; i++) shade += dark(x0 + (x1 - x0) * (i + 0.5) / 8, yc) / 8;
      const load = wet * o.load * (1 - 0.13 * (n % o.dip)) * (0.92 + 0.16 * rnd()) * (1 + 0.6 * shade);   // the brush empties, then is dipped again
      const st = stroke(x0, y0, len, ang, B, load, t, dur, wob);
      if (counted === null) {   // keep clear of the counts until they have stepped aside
        let low = -Infinity;
        st.lines.forEach((l) => l.pts.forEach((q, i) => { if (l.level[i] >= 0) low = Math.max(low, q[1]); }));
        const up = low - footY;
        if (up > 0) { st.lines.forEach((l) => l.pts.forEach((q) => { q[1] -= up; })); st.flecks.forEach((q) => { q[1] -= up; }); }
      }
      strokes.push(st);
      mark(st);
      n++;
      t += step !== null ? step * dur : dur + (n % o.dip === 0 ? between(o.lift) + 0.14 : between(o.lift));
    };
    // band after band from the top, left to right: one long stroke, or two where the first runs dry
    for (let top = -B0 * 0.3; top < H;) {   // the first band starts above the screen, so its dry edge is off it
      const B = B0 * (0.88 + 0.24 * rnd()), yc = top + B / 2;
      if (counted === null && yc + B * 0.3 > footY) {   // the counts step aside, then the foot is painted
        counted = Math.max(1, t - 0.15);
        t = Math.max(t, counted + 0.3);
      }
      const x0 = -W * (0.04 + 0.06 * rnd()) - (SMOOTH ? B * 0.35 : 0);
      const far = () => W * (SMOOTH ? 1.12 + 0.06 * rnd() : 1.04 + 0.06 * rnd());   // smoothed: the dry end lands off the right edge
      if (rnd() < 0.55) add(x0, far(), yc, B);
      else {
        const mid = W * (0.5 + 0.2 * rnd());
        add(x0, mid, yc + (rnd() - 0.5) * B * 0.1, B);
        add(mid - W * (0.12 + 0.08 * rnd()), far(), yc + (rnd() - 0.5) * B * 0.12, B * (0.9 + 0.15 * rnd()));
      }
      top += B * (0.64 + 0.08 * rnd());   // each band covers the last one's dry edge
    }
    if (SMOOTH) {   // smoothed (the reviewers' notes): finish with the brush, wetter sweeps over what shows most, in reading order,
      // the last one along the foot, left to right, so the brush ends at the bottom of the frame
      const span = Math.max(2, Math.round(B0 * 0.8 / C)), foot = GY - span;
      const need = (q) => { let m = 0; for (let x = 0; x < GX; x++) m += (!cov[q * GX + x] + bare[q * GX + x] * 2) * (1 + 2 * dark(x * C + C / 2, q * C + C / 2)); return m; };
      const picked = [];
      for (let k = 0; k < 3; k++) {
        let best = -1, most = GX * span * 0.12;
        for (let r = 0; r + span <= foot; r++) {
          if (picked.some((q) => Math.abs(q - r) < span)) continue;
          let m = 0;
          for (let q = r; q < r + span; q++) m += need(q);
          if (m > most) { most = m; best = r; }
        }
        if (best < 0) break;
        picked.push(best);
      }
      picked.sort((a, b) => a - b).forEach((row) => {
        let lo = GX, hi = -1;
        for (let q = row; q < row + span; q++) for (let x = 0; x < GX; x++) if (!cov[q * GX + x]) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
        if (hi < 0) return;
        let x0 = lo * C - B0 * 1.5, x1 = (hi + 1) * C + B0 * 2;
        if (x1 - x0 < B0 * 3) { const m = (x0 + x1) / 2; x0 = m - B0 * 1.5; x1 = m + B0 * 1.5; }
        add(Math.max(-W * 0.08 - B0 * 0.35, x0), Math.min(W * 1.15, x1), (row + span / 2) * C, B0 * 1.15, 1, 1.45, 0.3, 0.73);
      });
      add(-W * 0.12 - B0 * 0.5, W * 1.15 + 60, H - B0 * 0.3 + 40, B0 * 1.4, 1, 1.5, 0.34, 1, o.angle * 0.3, 2.2);
    } else {
      // then a few quick touches where the paper still shows most
      for (let k = 0; k < 4; k++) {
        let best = -1, bestN = GX * 0.08;
        for (let r = 0; r < GY; r++) { const m = open(r); if (m > bestN) { bestN = m; best = r; } }
        if (best < 0) break;
        let c = 0;
        while (c < GX && cov[best * GX + c]) c++;
        let e = c;
        while (e < GX && !cov[best * GX + e]) e++;
        add(Math.max(-W * 0.05, c * C - W * 0.08), Math.min(W * 1.06, Math.max(c * C + W * 0.3, e * C + W * 0.08)), best * C + C / 2, B0 * 0.8, 0.7);
      }
    }
    const end = strokes.length ? strokes[strokes.length - 1].t0 + strokes[strokes.length - 1].dur + 0.1 : 0.5;
    if (counted === null) counted = Math.max(0.6, end - 0.5);
    const clearAt = strokes.length ? strokes[strokes.length - 1].t0 - 0.1 : end;   // smoothed: the paper starts to thin as the last sweep begins
    return { strokes, plan: { count: Math.max(0.6, counted - 0.15), counted, end, clear: clearAt, out: SMOOTH ? clearAt + DISSOLVE : 0, film: 'now', rate: SMOOTH ? 0.25 : o.rate } };
  }

  let running = false;
  function start() {
    if (running) return null;
    running = true;
    const W = innerWidth, H = innerHeight, k = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.querySelector('.hr-load__paper')).backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';   // the brush takes the paper away
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const counts = document.querySelector('.hr-load__counts');
    // how dark the footage is at each point, from the film's first frame laid over the screen as it is shown (cover)
    let dark = () => 0;
    if (SMOOTH && video && video.readyState >= 2 && video.videoWidth) {
      const g = document.createElement('canvas'), G = 24, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
      g.width = gw; g.height = gh;
      const gc = g.getContext('2d', { willReadFrequently: true }), sc = Math.max(W / video.videoWidth, H / video.videoHeight);
      gc.drawImage(video, (W - video.videoWidth * sc) / 2 / G, (H - video.videoHeight * sc) / 2 / G, video.videoWidth * sc / G, video.videoHeight * sc / G);
      const px = gc.getImageData(0, 0, gw, gh).data;
      dark = (x, y) => {
        const i = (Math.min(gh - 1, Math.max(0, Math.floor(y / G))) * gw + Math.min(gw - 1, Math.max(0, Math.floor(x / G)))) * 4;
        return 1 - (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
      };
    }
    const { strokes, plan: timing } = plan(W, H, counts ? counts.getBoundingClientRect().top : Infinity, dark);
    // how much paint reaches the paper at each level: full, then less and less of the tooth
    const levels = [['#000', 1], [tooth(0.5), 1], [tooth(1.4), 0.95], [tooth(3), 0.85]].map(([s, alpha]) => {
      let style = s;
      if (typeof s !== 'string') { style = ctx.createPattern(s, 'repeat'); style.setTransform(new DOMMatrix().scale(1.3)); }
      return { style, alpha };
    });
    strokes.forEach((st) => st.lines.forEach((l) => { l.at = l.pts[0]; }));
    // smoothed: the paper left thins away all over in short dashes along the brush's direction, drifting gently left to right, a dash at
    // a time, each shrinking from its edges over about 0.2 s, paced to start gently and let the last few linger, the
    // foot a quarter second behind the top so the last sweep is down first. It works alongside the last sweep, so
    // each frame takes away only what more should be gone since the last
    const Q = 4, QW = Math.ceil(W / Q), QH = Math.ceil(H / Q), clear = {};
    if (SMOOTH) {
      let n = new Float32Array(QW * QH).map(() => rnd());
      for (let pass = 0; pass < 2; pass++) {   // drawn out sideways into dashes
        const m = new Float32Array(QW * QH);
        for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) {
          let sum = 0, c = 0;
          for (let d = -4; d <= 4; d++) { const xx = x + d; if (xx >= 0 && xx < QW) { sum += n[y * QW + xx]; c++; } }
          for (let d = -1; d <= 1; d += 2) { const yy = y + d; if (yy >= 0 && yy < QH) { sum += n[yy * QW + x] * 0.5; c += 0.5; } }
          m[y * QW + x] = sum / c;
        }
        n = m;
      }
      const ph = rnd() * 6;
      const key = n.map((v, i) => v * 0.75 + 0.25 * (0.5 + 0.5 * Math.sin((i % QW) / QW * 7 + ph) * Math.sin(Math.floor(i / QW) / QH * 5 + ph * 2)));
      const sorted = Float32Array.from(key).sort();   // spread evenly between 0 and 1
      const rank = (v) => { let lo = 0, hi = sorted.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; } return lo / sorted.length; };
      const from = new Float32Array(QW * QH), was = new Float32Array(QW * QH);
      const pace = (r) => 0.5 - Math.sin(Math.asin(1 - 2 * r) / 3);   // the share gone eases in and out over 0.9 s
      // worked out as the clearing starts, from the paper then left: the middle of the frame (the spire) goes first and
      // the edges last, the foot a little ahead, and paper standing alone (little more of it within a brush's width)
      // goes early, so slivers and wedges crumble right behind the last sweep and the broad streaky fields linger last
      clear.order = () => {
        const look = document.createElement('canvas');
        look.width = QW; look.height = QH;
        const lc = look.getContext('2d', { willReadFrequently: true });
        lc.drawImage(canvas, 0, 0, QW, QH);
        const px = lc.getImageData(0, 0, QW, QH).data, sum = new Float64Array((QW + 1) * (QH + 1));
        for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++)
          sum[(y + 1) * (QW + 1) + x + 1] = px[(y * QW + x) * 4 + 3] / 255 + sum[y * (QW + 1) + x + 1] + sum[(y + 1) * (QW + 1) + x] - sum[y * (QW + 1) + x];
        const R = Math.max(4, Math.round(Math.sqrt(W * H) * o.size * 0.85 / Q / 2));
        for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) {
          const x0 = Math.max(0, x - R), x1 = Math.min(QW, x + R + 1), y0 = Math.max(0, y - R), y1 = Math.min(QH, y + R + 1);
          const d = (sum[y1 * (QW + 1) + x1] - sum[y0 * (QW + 1) + x1] - sum[y1 * (QW + 1) + x0] + sum[y0 * (QW + 1) + x0]) / ((x1 - x0) * (y1 - y0));
          const i = y * QW + x;
          from[i] = timing.clear + 0.3 * Math.abs(2 * x / QW - 1) + 0.15 * (1 - y / QH) + 0.9 * pace(rank(key[i])) - 0.3 * (1 - Math.min(1, d * 2.5));
        }
      };
      const mask = document.createElement('canvas');
      mask.width = QW; mask.height = QH;
      const mc = mask.getContext('2d'), mi = mc.createImageData(QW, QH);
      for (let i = 0; i < QW * QH; i++) mi.data.fill(255, i * 4, i * 4 + 3);
      clear.draw = (t) => {
        if (!clear.ready) { clear.order(); clear.ready = true; }
        for (let i = 0; i < QW * QH; i++) {
          const a = Math.max(0, Math.min(1, (t - from[i]) / 0.2));
          const d = was[i] >= 1 ? 1 : 1 - (1 - a) / (1 - was[i]);   // what more to take, given what is already gone
          was[i] = a;
          mi.data[i * 4 + 3] = d * 255;
        }
        mc.putImageData(mi, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      };
    }
    const t0 = performance.now();
    const frame = (now) => {
      if (!running) return;
      const t = (now - t0) / 1000;
      const paths = levels.map(() => new Path2D());
      for (const s of strokes) {
        if (t < s.t0 || s.done) continue;
        const p = Math.min(1, (t - s.t0) / s.dur), r = reach(p);
        for (const l of s.lines) {
          // smoothed: the trail is held all through the middle of the stroke, so the front keeps its rounded, leaning nose
          const behind = SMOOTH ? l.lag * Math.min(1, 6 * r * (1 - r)) : 0;
          const head = Math.max(0, Math.min(1, SMOOTH ? r - behind : r * (1 + l.lag) - l.lag)) * (N - 1), hi = Math.floor(head), f = head - hi;
          for (let i = l.i + 1; i <= hi; i++) {
            if (l.level[i] >= 0) { paths[l.level[i]].moveTo(l.at[0], l.at[1]); paths[l.level[i]].lineTo(l.pts[i][0], l.pts[i][1]); }
            l.at = l.pts[i];
            l.i = i;
          }
          if (hi < N - 1 && f > 0.05 && l.level[hi + 1] >= 0) {
            const q = [l.pts[hi][0] + (l.pts[hi + 1][0] - l.pts[hi][0]) * f, l.pts[hi][1] + (l.pts[hi + 1][1] - l.pts[hi][1]) * f];
            paths[l.level[hi + 1]].moveTo(l.at[0], l.at[1]);
            paths[l.level[hi + 1]].lineTo(q[0], q[1]);
            l.at = q;
          }
        }
        if (p >= 1) s.done = true;
      }
      ctx.lineWidth = 4.2;
      levels.forEach((lv, i) => { ctx.globalAlpha = lv.alpha; ctx.strokeStyle = lv.style; ctx.stroke(paths[i]); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      for (const s of strokes) for (const fl of s.flecks) {
        if (fl[4] || t < fl[3]) continue;
        ctx.beginPath(); ctx.arc(fl[0], fl[1], fl[2], 0, Math.PI * 2); ctx.fill();
        fl[4] = true;
      }
      if (SMOOTH && t > timing.clear) {   // the last of the paper thins away
        if (t < timing.out) clear.draw(t);
        else ctx.clearRect(0, 0, W, H);
      }
      if (t < (timing.out || timing.end) + 0.3) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return timing;
  }
  window.HRPencil = { start, stop: () => { running = false; } };
})();
