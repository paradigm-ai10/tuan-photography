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
  const HANDS = {
    // a wide brush, painted briskly
    hand: { size: 0.3, angle: -5, tilt: 5, dur: [0.24, 0.34], lift: [0.05, 0.11], dip: 3, load: 1.05, spend: 0.55, bow: 0.03, shake: 0.004, flecks: 5, rate: 0.35 },
    // more paint, slower, fuller strokes
    'hand-loaded': { size: 0.34, angle: -3, tilt: 4, dur: [0.32, 0.44], lift: [0.07, 0.13], dip: 4, load: 1.3, spend: 0.4, bow: 0.035, shake: 0.003, flecks: 2, rate: 0.35 },
    // a dry brush, fast and scratchy, more strokes at looser angles
    'hand-dry': { size: 0.27, angle: -7, tilt: 9, dur: [0.18, 0.26], lift: [0.04, 0.09], dip: 3, load: 0.85, spend: 0.75, bow: 0.025, shake: 0.006, flecks: 8, rate: 0.35 },
  };
  const o = HANDS[html.dataset.pencil];
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
  function stroke(x0, y0, len, ang, B, load, t0, dur) {
    const a = ang * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const bow = -o.bow * len * (0.6 + 0.4 * rnd()), ph = rnd() * 6, sh = o.shake * innerHeight;   // one arm, so every stroke arcs the same way
    const centre = (u) => {
      const along = u * len, side = bow * 4 * u * (1 - u) + sh * Math.sin(u * 11 + ph) * Math.sin(u * 3.7 + ph * 2);
      return [x0 + ux * along + nx * side, y0 + uy * along + ny * side];
    };
    // pressure: lands at about two thirds, spreads, breathes a little, lifts off
    const press = (u) => (u < 0.12 ? 0.62 + 0.38 * Math.sin(u / 0.12 * Math.PI / 2) : u > 0.8 ? 1 - 0.55 * ((u - 0.8) / 0.2) ** 1.5 : 1) + 0.05 * Math.sin(u * 9 + ph);
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
      const e = Math.abs(off), cap = 0.8 + 0.4 * rnd(), p1 = rnd() * 6, p2 = rnd() * 6, p3 = rnd() * 6;
      // the brush lands rounded and a little on one corner, and lifts off ragged and tapering
      const u0 = (B * (0.32 * e ** 1.6 + 0.12 * (off + 1) / 2 + 0.05 * rnd())) / len;
      const u1 = 1 - (B * (0.45 * e ** 1.4 + 0.1 * (1 - off) / 2 + 0.12 * rnd())) / len;
      const pts = [], level = [];
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1), [cx, cy] = centre(u), w = B / 2 * (off + 0.025 * Math.sin(u * 13 + p3)) * (0.72 + 0.28 * press(u));   // bristles wander, so the gaps open and close
        pts.push([cx + nx * w, cy + ny * w]);
        if (u < u0 || u > u1) { level.push(-1); continue; }
        // the paint left on this bristle here: full at the start, spent along the way (the edges sooner),
        // skipping where the brush runs light, and thinner where it lifts
        const paint = (load * cap + (u < 0.06 ? 0.15 : 0) - o.spend * u * (1 + 0.8 * e ** 3) - 0.1 * (0.6 * Math.sin(u * 9 + p1) + 0.4 * Math.sin(u * 23 + p2))) * (0.55 + 0.45 * press(u));
        level.push(paint > 0.5 ? 0 : paint > 0.32 ? 1 : paint > 0.18 ? 2 : paint > 0.08 ? 3 : -1);
      }
      return { pts, level, i: 0, at: null };
    });
    const end = centre(1), flecks = [];
    for (let i = 0, n = Math.floor(rnd() * (o.flecks + 1)); i < n; i++) {   // drops flung off the end as it lifts
      const d = 8 + rnd() * 80, s = (rnd() - 0.5) * B * 0.8;
      flecks.push([end[0] + ux * d + nx * s, end[1] + uy * d + ny * s, 0.8 + rnd() * 2.6, t0 + dur + rnd() * 0.06]);
    }
    return { lines, flecks, t0, dur };
  }

  // where the paper still shows, in cells of 24 px; a stroke covers the cells its fuller bristles pass
  function plan(W, H, footY) {
    const C = 24, GX = Math.ceil(W / C), GY = Math.ceil(H / C), cov = new Uint8Array(GX * GY);
    const footRow = Math.min(GY, Math.floor(footY / C));
    const mark = (s) => s.lines.forEach((l) => l.pts.forEach(([x, y], i) => {
      if (l.level[i] < 0 || l.level[i] > 2) return;
      const gx = Math.floor(x / C), gy = Math.floor(y / C);
      if (gx >= 0 && gx < GX && gy >= 0 && gy < GY) cov[gy * GX + gx] = 1;
    }));
    const open = (r) => { let n = 0; for (let x = 0; x < GX; x++) n += !cov[r * GX + x]; return n; };
    const strokes = [];
    let t = 0, counted = null, n = 0;
    const B0 = Math.sqrt(W * H) * o.size * 0.85;   // the brush suits the screen's size, so a phone gets a narrower one
    const add = (x0, x1, yc, B, quick = 1) => {   // one stroke from x0 to x1, its middle at height yc
      const ang = o.angle + (rnd() - 0.5) * 2 * o.tilt, ta = Math.tan(ang * Math.PI / 180);
      const len = (x1 - x0) / Math.cos(ang * Math.PI / 180);
      const y0 = yc - ta * (x1 - x0) / 2;
      const dur = quick * between(o.dur) * (0.6 + 0.4 * Math.min(1.2, (x1 - x0) / W)) * (0.75 + 0.25 * Math.min(1.6, W / 1440));
      const load = o.load * (1 - 0.13 * (n % o.dip)) * (0.92 + 0.16 * rnd());   // the brush empties, then is dipped again
      const st = stroke(x0, y0, len, ang, B, load, t, dur);
      if (counted === null) {   // keep clear of the counts until they have stepped aside
        let low = -Infinity;
        st.lines.forEach((l) => l.pts.forEach((q, i) => { if (l.level[i] >= 0) low = Math.max(low, q[1]); }));
        const up = low - footY;
        if (up > 0) { st.lines.forEach((l) => l.pts.forEach((q) => { q[1] -= up; })); st.flecks.forEach((q) => { q[1] -= up; }); }
      }
      strokes.push(st);
      mark(st);
      n++;
      t += dur + (n % o.dip === 0 ? between(o.lift) + 0.14 : between(o.lift));
    };
    // band after band from the top, left to right: one long stroke, or two where the first runs dry
    for (let top = -B0 * 0.3; top < H;) {   // the first band starts above the screen, so its dry edge is off it
      const B = B0 * (0.88 + 0.24 * rnd()), yc = top + B / 2;
      if (counted === null && yc + B * 0.3 > footY) {   // the counts step aside, then the foot is painted
        counted = Math.max(1, t - 0.15);
        t = Math.max(t, counted + 0.3);
      }
      const x0 = -W * (0.04 + 0.06 * rnd());
      if (rnd() < 0.55) add(x0, W * (1.04 + 0.06 * rnd()), yc, B);
      else {
        const mid = W * (0.5 + 0.2 * rnd());
        add(x0, mid, yc + (rnd() - 0.5) * B * 0.1, B);
        add(mid - W * (0.12 + 0.08 * rnd()), W * (1.04 + 0.06 * rnd()), yc + (rnd() - 0.5) * B * 0.12, B * (0.9 + 0.15 * rnd()));
      }
      top += B * (0.64 + 0.08 * rnd());   // each band covers the last one's dry edge
    }
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
    const end = strokes.length ? strokes[strokes.length - 1].t0 + strokes[strokes.length - 1].dur + 0.1 : 0.5;
    if (counted === null) counted = Math.max(0.6, end - 0.5);
    return { strokes, plan: { count: Math.max(0.6, counted - 0.15), counted, end, film: 'now', rate: o.rate } };
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
    const { strokes, plan: timing } = plan(W, H, counts ? counts.getBoundingClientRect().top : Infinity);
    // how much paint reaches the paper at each level: full, then less and less of the tooth
    const levels = [['#000', 1], [tooth(0.5), 1], [tooth(1.4), 0.95], [tooth(3), 0.85]].map(([s, alpha]) => {
      let style = s;
      if (typeof s !== 'string') { style = ctx.createPattern(s, 'repeat'); style.setTransform(new DOMMatrix().scale(1.3)); }
      return { style, alpha };
    });
    strokes.forEach((st) => st.lines.forEach((l) => { l.at = l.pts[0]; }));
    const t0 = performance.now();
    const frame = (now) => {
      if (!running) return;
      const t = (now - t0) / 1000;
      const paths = levels.map(() => new Path2D());
      for (const s of strokes) {
        if (t < s.t0 || s.done) continue;
        const p = Math.min(1, (t - s.t0) / s.dur), head = reach(p) * (N - 1), hi = Math.floor(head), f = head - hi;
        for (const l of s.lines) {
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
      if (t < timing.end + 0.3) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return timing;
  }
  window.HRPencil = { start, stop: () => { running = false; } };
})();
