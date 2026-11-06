/* Home redesign, E's opening coloured as it is drawn (his ask, 2026-11-06: "the colour comes with the
   sketching", like a coloured pencil, not out of nowhere). The paper is a canvas that the coloured pencil
   wears away stroke by stroke, so the film's first frame behind it comes through with the drawing; once the
   last line lands the colour is all there and the film starts moving. <html data-pencil> names how the
   colour goes down: lines (the lines themselves in colour, then gone over), hatch (diagonal hatching close
   behind the lines), band (a soft band carried along each line), grain (colour caught in the paper's tooth,
   building up), scribble (quick zigzag scribbles); brush, brush-fine and brush-slant drop the pencil and sweep the
   paper off the film already playing (his idea, 2026-11-06). home.js calls HRPencil.start() as the tracing begins,
   and it answers with its timings. */
(() => {
  'use strict';
  const html = document.documentElement;
  const canvas = document.querySelector('.hr-load__wear');
  const svg = document.querySelector('.hr-load__trace');
  if (!html.dataset.pencil || !canvas) return;

  const VW = 1920, VH = 1080;   // the drawing's own frame, laid over the screen as the film is (cover)
  const END = 2.85;              // seconds after the tracing starts by which every colour stroke is down
  const FOOT = 2.2;              // when the counts have stepped aside and the foot of the picture can be coloured

  // a fixed run of random numbers, so the colour goes down the same way on every visit
  let seed = 1127;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // the grey lines' own easing, cubic-bezier(0.4, 0, 0.2, 1), so a colour line drawn with one keeps its pace
  const ink = (() => {
    const f = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
    return (x) => { let lo = 0, hi = 1; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (f(m, 0.4, 0.2) < x) lo = m; else hi = m; } return f((lo + hi) / 2, 0, 1); };
  })();
  const even = (x) => x * (2 - x);   // a hand stroke: quick off the mark, easing at the end
  const sweep = (x) => 0.5 - Math.cos(Math.PI * x) / 2;   // an arm's sweep: gathers speed, then slows

  // a stroke: its points, the length run so far along them, when it starts and how long it takes
  function stroke(pts, t0, dur, ease) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, L: cum[cum.length - 1] || 1, t0, dur: Math.max(0.05, dur), ease: ease || even, done: 0, stop: Infinity, i: 0, low: Math.max(...pts.map((q) => q[1])) };
  }

  // the grey lines, read from the drawing on the page (their start and length are on each path)
  const pace = svg ? parseFloat(getComputedStyle(svg).getPropertyValue('--pace')) || 1 : 1;
  const lines = [...(svg ? svg.querySelectorAll('path') : [])].map((p) => {
    const n = (p.getAttribute('d').match(/-?\d+(\.\d+)?/g) || []).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
    return { pts, t0: parseFloat(p.style.getPropertyValue('--d')) * pace, dur: parseFloat(p.style.getPropertyValue('--t')) * pace };
  }).filter((l) => l.pts.length > 1);

  // when the pencil first reaches each part of the picture: cells of 40, the time the first line passes
  // through each, and for cells no line crosses (the open sky) the time carried on from the nearest drawn
  // cells at an even pace, so the colour runs on from the drawing into the sky
  const C = 40, GX = Math.ceil(VW / C), GY = Math.ceil(VH / C), STEP = 0.045;
  const field = new Float32Array(GX * GY).fill(1e9);
  const cell = (x, y) => Math.min(GY - 1, Math.max(0, Math.floor(y / C))) * GX + Math.min(GX - 1, Math.max(0, Math.floor(x / C)));
  for (const l of lines) {
    const s = stroke(l.pts, 0, 1);
    s.pts.forEach(([x, y], i) => { const c = cell(x, y); field[c] = Math.min(field[c], l.t0 + l.dur * s.cum[i] / s.L); });
  }
  const relax = (c, d, cost) => { if (field[d] + cost < field[c]) field[c] = field[d] + cost; };
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) {
      const c = y * GX + x;
      if (x > 0) relax(c, c - 1, STEP);
      if (y > 0) { relax(c, c - GX, STEP); if (x > 0) relax(c, c - GX - 1, STEP * 1.41); if (x < GX - 1) relax(c, c - GX + 1, STEP * 1.41); }
    }
    for (let y = GY - 1; y >= 0; y--) for (let x = GX - 1; x >= 0; x--) {
      const c = y * GX + x;
      if (x < GX - 1) relax(c, c + 1, STEP);
      if (y < GY - 1) { relax(c, c + GX, STEP); if (x < GX - 1) relax(c, c + GX + 1, STEP * 1.41); if (x > 0) relax(c, c + GX - 1, STEP * 1.41); }
    }
  }
  const when = (x, y, o) => Math.min(field[cell(x, y)] + o.lag + rnd() * (o.spread || 0), END - o.dur);

  const M = 40;   // strokes run a little past the frame's edge, as a hand would
  const inFrame = (x, y) => x > -M && x < VW + M && y > -M && y < VH + M;

  // colour carried along each grey line, a beat behind it
  const along = (o) => lines.map((l) => {
    const dur = l.dur * (o.slow || 1);
    return stroke(l.pts, Math.min(l.t0 + o.lag, END - dur), dur, ink);
  });
  // parallel diagonal strokes over the whole picture, each put down once the pencil has reached its place
  function hatch(o) {
    const a = o.angle * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const corners = [[-M, -M], [VW + M, -M], [-M, VH + M], [VW + M, VH + M]];
    const ns = corners.map(([x, y]) => x * nx + y * ny), us = corners.map(([x, y]) => x * ux + y * uy);
    const out = [];
    for (let c = Math.min(...ns); c <= Math.max(...ns); c += o.gap * (0.85 + 0.3 * rnd())) {
      for (let u = Math.min(...us) - rnd() * o.len; u < Math.max(...us);) {
        const len = o.len * (0.7 + 0.6 * rnd()), w = (rnd() - 0.5) * o.gap * 0.6;   // a hand's wobble across the line
        const p0 = [c * nx + u * ux, c * ny + u * uy], p1 = [(c + w) * nx + (u + len) * ux, (c + w) * ny + (u + len) * uy];
        const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        if (inFrame(mx, my)) out.push(stroke([p0, p1], when(mx, my, o), o.dur));
        u += len + o.len * 0.1 * rnd();
      }
    }
    return out;
  }
  // a quick zigzag in each patch of the picture, back and forth across it
  function scribble(o) {
    const out = [];
    for (let y = -o.cell / 2; y < VH + o.cell; y += o.cell * 0.8) for (let x = -o.cell / 2; x < VW + o.cell; x += o.cell * 0.8) {
      const cx = x + (rnd() - 0.5) * o.cell * 0.5, cy = y + (rnd() - 0.5) * o.cell * 0.5;
      if (!inFrame(cx, cy)) continue;
      const a = (o.angle + (rnd() - 0.5) * 24) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const w = o.cell * 1.2, h = o.cell * 1.1, pts = [];
      for (let i = 0; i <= o.zigs; i++) {
        const lx = (i % 2 ? 0.5 : -0.5) * w + (rnd() - 0.5) * w * 0.25, ly = (i / o.zigs - 0.5) * h + (rnd() - 0.5) * h * 0.08;
        pts.push([cx + lx * ca - ly * sa, cy + lx * sa + ly * ca]);
      }
      out.push(stroke(pts, when(cx, cy, o), o.dur));
    }
    return out;
  }

  // how each version lays the colour down: layers of strokes, widths in the drawing's own units (1920 wide),
  // alpha how much paper one pass takes away, grain the paper's tooth (higher catches less colour per pass);
  // res is the paper's sharpness and blur softens every stroke (band only)
  const MODES = {
    lines: { res: 1, layers: [
      { make: () => along({ lag: 0 }), width: 3.4, alpha: 1 },
      { make: () => along({ lag: 0.12, slow: 1.2 }), width: 14, alpha: 0.7, grain: 0.6 },
      { make: () => along({ lag: 0.3, slow: 1.4 }), width: 30, alpha: 0.75, grain: 0.5 },
      { make: () => hatch({ angle: -8, gap: 16, len: 240, lag: 0.4, dur: 0.24, spread: 0.12 }), width: 15, alpha: 0.8, grain: 0.5 },
      { make: () => hatch({ angle: 6, gap: 22, len: 260, lag: 0.58, dur: 0.24, spread: 0.1 }), width: 24, alpha: 0.8, grain: 0.4 } ] },
    hatch: { res: 1, layers: [
      { make: () => hatch({ angle: -58, gap: 8, len: 70, lag: 0.1, dur: 0.14, spread: 0.1 }), width: 5.5, alpha: 0.95, grain: 0.6 },
      { make: () => hatch({ angle: 32, gap: 9, len: 70, lag: 0.34, dur: 0.14, spread: 0.1 }), width: 6, alpha: 0.85, grain: 0.6 },
      { make: () => hatch({ angle: -20, gap: 20, len: 140, lag: 0.55, dur: 0.2, spread: 0.1 }), width: 22, alpha: 0.7, grain: 0.4 } ] },
    band: { res: 0.25, blur: 1.6, layers: [
      { make: () => along({ lag: 0.03 }), width: 30, alpha: 0.45, cap: 'round' },
      { make: () => hatch({ angle: -50, gap: 26, len: 160, lag: 0.22, dur: 0.28, spread: 0.15 }), width: 40, alpha: 0.5, cap: 'round' },
      { make: () => hatch({ angle: 25, gap: 30, len: 180, lag: 0.45, dur: 0.28, spread: 0.15 }), width: 52, alpha: 0.75, cap: 'round' } ] },
    grain: { res: 1, layers: [
      { make: () => hatch({ angle: -55, gap: 22, len: 140, lag: 0.06, dur: 0.18, spread: 0.12 }), width: 30, alpha: 1, grain: 2.6 },
      { make: () => hatch({ angle: 35, gap: 22, len: 140, lag: 0.28, dur: 0.18, spread: 0.12 }), width: 30, alpha: 1, grain: 1.3 },
      { make: () => hatch({ angle: -10, gap: 22, len: 140, lag: 0.5, dur: 0.18, spread: 0.12 }), width: 30, alpha: 1, grain: 0.5 } ] },
    scribble: { res: 1, layers: [
      { make: () => scribble({ cell: 64, zigs: 7, angle: -55, lag: 0.1, dur: 0.24, spread: 0.1 }), width: 7, alpha: 0.9, grain: 0.6 },
      { make: () => scribble({ cell: 64, zigs: 7, angle: 40, lag: 0.34, dur: 0.24, spread: 0.1 }), width: 8, alpha: 0.85, grain: 0.6 },
      { make: () => scribble({ cell: 90, zigs: 5, angle: -15, lag: 0.55, dur: 0.24, spread: 0.1 }), width: 20, alpha: 0.7, grain: 0.4 } ] },
    // the brush (his idea, 2026-11-06): no pencil; the film already plays behind the paper and wide strokes
    // uncover it, left to right, row under row, on a slant. size is the brush's width as a share of the screen's
    // height, gap the time between rows, sag how much each stroke bows, fan how round its start is, dry and tail
    // how often and how far a bristle runs out at the end, classes the bristles' [strength, width]
    brush: { res: 1, brush: { size: 0.28, overlap: 0.3, angle: -7, dur: 0.62, gap: 0.42, sag: 0.025, space: 3, fan: 70, dry: 0.2, tail: 240, minCount: 1.1,
      classes: [[1, 2.6], [1, 2], [0.7, 2.2], [0.4, 1.6]] } },
    'brush-fine': { res: 1, brush: { size: 0.15, overlap: 0.26, angle: -10, dur: 0.46, gap: 0.25, sag: 0.018, space: 2.4, fan: 50, dry: 0.25, tail: 180, minCount: 1.1,
      classes: [[1, 2.5], [1, 2], [0.7, 2.1], [0.4, 1.5]] } },
    'brush-slant': { res: 1, brush: { size: 0.26, overlap: 0.3, angle: -22, dur: 0.6, gap: 0.3, sag: 0.02, space: 3, fan: 70, dry: 0.2, tail: 240, minCount: 1.1,
      classes: [[1, 2.6], [1, 2], [0.7, 2.2], [0.4, 1.6]] } },
  };
  const mode = MODES[html.dataset.pencil] || MODES.hatch;
  let layers = (mode.layers || []).map((l) => ({ ...l, list: l.make().sort((a, b) => a.t0 - b.t0), next: 0, active: [] }));

  // the brush's rows, in screen pixels: each row a band of bristles that land together, start ragged and run
  // dry at the end; rows reaching the counts at the foot wait until they have stepped aside
  function brush(o, W, H, footY) {
    const B = H * o.size, a = Math.tan(o.angle * Math.PI / 180), reach = Math.abs(a) * W / 2;
    const x0 = -0.06 * W, x1 = 1.06 * W, dur = o.dur * (0.6 + 0.4 * Math.min(1.6, W / 1440));
    const out = o.classes.map(([alpha, wf]) => ({ alpha, width: o.space * wf, list: [], next: 0, active: [] }));
    let t = 0, counted = null;
    for (let yc = B * 0.4 - reach, r = 0; yc - B / 2 - reach < H; yc += B * (1 - o.overlap), r++) {
      if (counted === null && yc + reach + B / 2 + o.sag * H > footY) { counted = Math.max(o.minCount, t - 0.25); t = Math.max(t, counted + 0.2); }
      const n = Math.round(B / o.space), bow = (r % 2 ? -1 : 1) * o.sag * H;
      for (let j = 0; j < n; j++) {
        const off = (j / (n - 1) - 0.5) * B + (rnd() - 0.5) * o.space, edge = Math.abs(off) / (B / 2), ph = rnd() * 6, pts = [];
        for (let x = x0; x <= x1 + 1; x += 36) {
          const u = (x - x0) / (x1 - x0);
          pts.push([x, yc + a * (x - W / 2) + bow * Math.sin(Math.PI * u) + off * (1 + 0.04 * Math.sin(u * 7 + ph))]);
        }
        const st = stroke(pts, t + rnd() * 0.03, dur, sweep);
        st.done = edge * edge * o.fan * rnd();   // the brush lands rounder than it is wide
        st.stop = st.L - (rnd() < o.dry + edge * 0.4 ? rnd() * o.tail : 0) - edge * edge * o.fan * rnd();   // and runs dry at the end
        out[Math.min(out.length - 1, Math.floor((rnd() * rnd() * 0.6 + edge * edge * 0.55) * out.length))].list.push(st);   // full of paint in the middle, drier at the edges
      }
      t += o.gap;
    }
    out.forEach((l) => l.list.sort((p, q) => p.t0 - q.t0));
    const end = t - o.gap + dur + 0.05;
    if (counted === null) counted = end - 0.4;
    return { layers: out, plan: { count: Math.max(0.6, counted - 0.15), counted, end, film: 'now' } };
  }

  // the paper's tooth: white with a random strength at each grain
  const tooth = {};
  function grain(power) {
    if (tooth[power]) return tooth[power];
    const n = 128, c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d'), im = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { im.data.fill(255, i * 4, i * 4 + 3); im.data[i * 4 + 3] = 255 * Math.pow(rnd(), power); }
    g.putImageData(im, 0, 0);
    return (tooth[power] = c);
  }

  // add the part of a stroke run since the last frame (from length a to b) to the current path
  function piece(ctx, s, a, b) {
    while (s.i < s.pts.length - 2 && s.cum[s.i + 1] <= a) s.i++;
    const at = (d) => {
      let j = s.i;
      while (j < s.pts.length - 2 && s.cum[j + 1] < d) j++;
      const k = (d - s.cum[j]) / ((s.cum[j + 1] - s.cum[j]) || 1);
      return [s.pts[j][0] + (s.pts[j + 1][0] - s.pts[j][0]) * k, s.pts[j][1] + (s.pts[j + 1][1] - s.pts[j][1]) * k];
    };
    const p = at(a);
    ctx.moveTo(p[0], p[1]);
    for (let j = s.i + 1; j < s.pts.length - 1 && s.cum[j] < b; j++) ctx.lineTo(s.pts[j][0], s.pts[j][1]);
    const q = at(b);
    ctx.lineTo(q[0], q[1]);
  }

  let running = false;
  function start() {
    if (running) return;
    running = true;
    const W = innerWidth, H = innerHeight, k = Math.min(devicePixelRatio || 1, 2) * mode.res;
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.querySelector('.hr-load__paper')).backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const s = Math.max(W / VW, H / VH);
    // the counts sit on paper along the foot (nothing written on the photograph): the colour leaves that strip
    // blank while they show, then fills it as they step aside (his note, 2026-11-06: the white band)
    const counts = document.querySelector('.hr-load__counts');
    const footY = counts ? counts.getBoundingClientRect().top : Infinity;
    let plan;
    if (mode.brush) {
      ({ layers, plan } = brush(mode.brush, W, H, footY));
      ctx.setTransform(k, 0, 0, k, 0, 0);
    } else {
      plan = { count: 1.8, counted: FOOT - 0.1, end: END - 0.1, film: 'end' };
      ctx.setTransform(s * k, 0, 0, s * k, (W - VW * s) / 2 * k, (H - VH * s) / 2 * k);
      const foot = (footY - (H - VH * s) / 2) / s;
      if (foot < VH) layers.forEach((l) => {
        l.list.forEach((st) => { if (st.low > foot) st.t0 = Math.max(st.t0, Math.min(FOOT + rnd() * 0.3, END - st.dur)); });
        l.list.sort((a, b) => a.t0 - b.t0);
      });
    }
    ctx.globalCompositeOperation = 'destination-out';   // the pencil takes the paper away
    ctx.lineJoin = 'round';
    if (mode.blur) ctx.filter = `blur(${mode.blur}px)`;   // a soft edge, as colour rubbed in with a finger
    layers.forEach((l) => {
      if (!l.grain) { l.style = '#000'; return; }   // the brush and the band have no tooth
      l.style = ctx.createPattern(grain(l.grain), 'repeat');
      l.style.setTransform(new DOMMatrix().scale(1.3 / s));   // a grain about 1.3 px across on any screen
    });
    const t0 = performance.now();
    const frame = (now) => {
      if (!running) return;
      const t = (now - t0) / 1000;
      for (const l of layers) {
        while (l.next < l.list.length && l.list[l.next].t0 <= t) l.active.push(l.list[l.next++]);
        if (!l.active.length) continue;
        ctx.beginPath();
        l.active = l.active.filter((st) => {
          const p = Math.min(1, (t - st.t0) / st.dur), b = Math.min(st.ease(p) * st.L, st.stop);
          if (b > st.done + 0.01) { piece(ctx, st, st.done, b); st.done = b; }
          return p < 1;
        });
        ctx.lineCap = l.cap || 'butt';   // butt ends, so a stroke's pieces meet without darker beads
        ctx.lineWidth = l.width;
        ctx.globalAlpha = l.alpha;
        ctx.strokeStyle = l.style;
        ctx.stroke();
      }
      if (t < plan.end + 0.2) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return plan;
  }
  window.HRPencil = { start, stop: () => { running = false; } };
})();
