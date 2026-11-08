/* The photographs arrive (2026-11-09). His pick from the references was Mathilde de Chiara's opening: many
   small photographs flying in with the logo, gathering into a shape, breaking apart. Here the shape is made
   of his own photographs and the ending is the Barcelona film, which the home page lands on: one tile among
   the stills is alive (the film, small, in slow motion) and it is the one that grows to the whole screen.
   Fifteen choreographies, chosen by <html data-flock="…">, all plain JS and the Web Animations API: a layout
   (where the tiles settle), an entry (how they come), a hold, and a leaving (how the many become the one).
   home.js runs the loading screen (the line, TUAN, PHOTOGRAPHY) and then hands over to HRFlock.run().
   The tiles' photographs are set here from data-src, so a version loads only the ones it uses. */
(() => {
  'use strict';
  const html = document.documentElement;
  const NAME = html.dataset.flock;
  const layer = document.querySelector('.hr-flock');
  if (!NAME || !layer) return;
  const OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';      // a strong ease-out: arrivals
  const INOUT = 'cubic-bezier(0.77, 0, 0.175, 1)';   // on-screen moves and departures
  const PART = 'cubic-bezier(0.7, 0, 0.2, 1)';       // the page's own: the one that grows
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const tf = (tx = 0, ty = 0, r = 0, s = 1) => `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`;
  // a seeded random, so a version looks the same on every load
  let seed = 11;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const between = (a, b) => a + (b - a) * rnd();

  const photos = [...layer.querySelectorAll('.hr-tile:not(.hr-tile--film)')];
  const filmEl = layer.querySelector('.hr-tile--film');
  const tv = filmEl.querySelector('video');
  let W = innerWidth, H = innerHeight;
  const topY = () => clamp(H * 0.15, 76, 136);          // under the small mark in the corner
  const cellSize = () => clamp(Math.min(W, H) * 0.095, 44, 104);

  /* ---------------- layouts: each returns { slots, film } with slots as { x, y, w, h, r } (top-left, rest tilt) ---------------- */
  // a diamond of upright squares, rows 1 3 5 7 5 3 1 (horizons stay level)
  function diamond() {
    const rows = [1, 3, 5, 7, 5, 3, 1];
    const cell = Math.min(cellSize(), (W - 32) / (7 * 1.12), (H - topY() - 24) / (7 * 1.12));
    const gap = cell * 0.12, pitch = cell + gap;
    const cy = topY() + (H - topY()) / 2, y0 = cy - (rows.length * pitch - gap) / 2;
    const slots = [];
    rows.forEach((count, r) => {
      const x0 = W / 2 - (count * pitch - gap) / 2;
      for (let c = 0; c < count; c++) slots.push({ x: x0 + c * pitch, y: y0 + r * pitch, w: cell, h: cell, r: 0 });
    });
    return { slots, film: 12, cell };
  }
  // rows of photographs at their own shapes, each row filled to the width and centred
  function rowsOwn(nRows, rh, ars, spanW = W * 0.9, gap = null) {
    gap = gap === null ? rh * 0.1 : gap;
    const slots = [];
    const total = nRows * rh + (nRows - 1) * gap * 1.6;
    const y0 = topY() + (H - topY() - total) / 2;
    let k = 0;
    for (let r = 0; r < nRows; r++) {
      const row = [];
      let w = 0;
      while (w < spanW && k < ars.length) { const tw = rh * ars[k]; row.push(tw); w += tw + gap; k++; }
      w -= gap;
      let x = W / 2 - w / 2;
      row.forEach((tw) => { slots.push({ x, y: y0 + r * (rh + gap * 1.6), w: tw, h: rh, r: 0, row: r }); x += tw + gap; });
    }
    return slots;
  }
  function grid(cols, rows, cw, ch, gap, x0, y0) {
    const slots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push({ x: x0 + c * (cw + gap), y: y0 + r * (ch + gap), w: cw, h: ch, r: 0, col: c, row: r });
    return slots;
  }
  const centre = (s) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // rank 0..1 of each slot along the diagonal from bottom-left (0) to top-right (1)
  function diagonalRank(slots) {
    const u = slots.map((s) => { const c = centre(s); return c.x / W - c.y / H; });
    const lo = Math.min(...u), hi = Math.max(...u);
    return u.map((v) => (hi > lo ? (v - lo) / (hi - lo) : 0));
  }

  /* ---------------- the pieces of every choreography ---------------- */
  let tiles = [];   // [{ el, slot, film, img }] in slot order
  function place(plan, shape, ars) {
    const { slots, film } = plan;
    const n = slots.length - 1;
    const used = photos.slice(0, n);
    photos.slice(n).forEach((p) => p.remove());
    used.forEach((p) => { const im = p.querySelector('img'); if (!im.src) im.src = im.dataset.src; });
    tiles = [];
    let k = 0;
    slots.forEach((s, i) => {
      const isFilm = i === film;
      const el = isFilm ? filmEl : used[k++];
      el.style.left = s.x + 'px'; el.style.top = s.y + 'px'; el.style.width = s.w + 'px'; el.style.height = s.h + 'px';
      el.style.transform = tf(0, 0, s.r, 1);
      tiles.push({ el, slot: s, film: isFilm, i });
    });
    return tiles;
  }
  const ars = () => photos.map((p) => Number(p.querySelector('img').dataset.ar) || 1.5);
  const finished = (anims) => Promise.all(anims.map((a) => a.finished.catch(() => {})));

  // the tiles fly in from one side, every tile the same flight, the delays spread along the flock
  function flyIn({ from, rank, spread = 900, dur = 1700, tilt = 4, scale = 0.9, ease = OUT }) {
    return finished(tiles.map((t, i) => {
      const r0 = t.slot.r;
      return t.el.animate([
        { opacity: 1, transform: tf(from.x, from.y, r0 + (i % 2 ? tilt : -tilt), scale) },
        { opacity: 1, transform: tf(0, 0, r0, 1) }
      ], { duration: dur, delay: rank[i] * spread, easing: ease, fill: 'both' });
    }));
  }
  // the tiles appear where they are: a short rise, no flight
  function fadeIn({ order, step = 60, dur = 800, lift = 24, ease = OUT }) {
    return finished(tiles.map((t, i) => t.el.animate([
      { opacity: 0, transform: tf(0, lift, t.slot.r, 0.97) },
      { opacity: 1, transform: tf(0, 0, t.slot.r, 1) }
    ], { duration: dur, delay: order[i] * step, easing: ease, fill: 'both' })));
  }
  // the many leave along one direction, the farthest from the film first, and the film grows as they go
  function peel({ dir, order, spread = 700, dur = 1200, ease = INOUT, growDelay = 350, growDur = 1700 }) {
    const anims = tiles.map((t, i) => t.film ? null : t.el.animate([
      { opacity: 1, transform: tf(0, 0, t.slot.r, 1) },
      { opacity: 1, transform: tf(dir.x, dir.y, t.slot.r + (i % 2 ? 3 : -3), 0.96) }
    ], { duration: dur, delay: order[i] * spread, easing: ease, fill: 'both' })).filter(Boolean);
    return Promise.all([finished(anims), grow(growDelay, growDur)]);
  }
  // the many gather onto the one: each slides toward the film tile, shrinking and fading under it
  function converge({ order, spread = 500, dur = 1100, growDelay = 300, growDur = 1700 }) {
    const f = centre(tiles.find((t) => t.film).slot);
    const anims = tiles.map((t, i) => {
      if (t.film) return null;
      const c = centre(t.slot);
      return t.el.animate([
        { opacity: 1, transform: tf(0, 0, t.slot.r, 1) },
        { opacity: 0.9, transform: tf((f.x - c.x) * 0.7, (f.y - c.y) * 0.7, t.slot.r, 0.6), offset: 0.75 },
        { opacity: 0, transform: tf(f.x - c.x, f.y - c.y, t.slot.r, 0.4) }
      ], { duration: dur, delay: order[i] * spread, easing: INOUT, fill: 'both' });
    }).filter(Boolean);
    return Promise.all([finished(anims), grow(growDelay, growDur)]);
  }
  // the film tile grows from its slot to the whole window (the one move that animates the box itself)
  function grow(delay = 0, dur = 1700) {
    const t = tiles.find((x) => x.film);
    const s = t.slot;
    t.el.style.zIndex = '3';
    return t.el.animate([
      { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', height: s.h + 'px', transform: tf(0, 0, s.r, 1) },
      { left: '0px', top: '0px', width: W + 'px', height: H + 'px', transform: 'none' }
    ], { duration: dur, delay, easing: PART, fill: 'both' }).finished.catch(() => {});
  }
  // the loading screen's logo becomes the small mark in the corner, where the page keeps it
  function markToCorner(ms = 1100) {
    const mark = document.querySelector('.hr-load__mark'), target = document.querySelector('.hr-top .hr-mark');
    if (!mark || !target) return;
    const a = mark.querySelector('.hr-load__name').getBoundingClientRect(), b = mark.querySelector('.hr-load__sub').getBoundingClientRect();
    const L = { left: Math.min(a.left, b.left), top: a.top, width: Math.max(a.right, b.right) - Math.min(a.left, b.left) };
    const T = target.getBoundingClientRect();
    mark.style.transformOrigin = `${L.left}px ${L.top}px`;
    mark.animate([{ transform: 'none' }, { transform: `translate(${T.left - L.left}px, ${T.top - L.top}px) scale(${(T.width / L.width).toFixed(4)})` }],
      { duration: ms, easing: PART, fill: 'both' });
  }

  /* ---------------- the fifteen ---------------- */
  const V = {
    // 1 the diamond: the flock flies in along the diagonal and lands as a diamond; the far tiles peel away down the other
    //   diagonal while the live one grows
    'diamond': {
      n: 24, shape: 'square', mark: 'corner', hold: 1150,
      layout: () => diamond(),
      enter() { return flyIn({ from: { x: W * 0.8, y: -H * 0.8 }, rank: diagonalRank(tiles.map((t) => t.slot)) }); },
      leave() {
        const f = centre(tiles.find((t) => t.film).slot), d = tiles.map((t) => dist(centre(t.slot), f)), m = Math.max(...d);
        return peel({ dir: { x: -W * 0.9, y: H * 0.9 }, order: d.map((v) => 1 - v / m) });
      }
    },
    // 2 a ribbon: the same diamond, but the prints come single file from the corner, a long train that coils into place
    'ribbon': {
      n: 24, shape: 'square', mark: 'corner', hold: 1000,
      layout: () => diamond(),
      enter() {
        const rank = diagonalRank(tiles.map((t) => t.slot));
        const order = rank.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((p, k) => [p[1], k]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
        return flyIn({ from: { x: W * 0.85, y: -H * 0.85 }, rank: order.map((k) => k / (tiles.length - 1)), spread: 1700, dur: 1500, tilt: 2 });
      },
      leave() {
        const rank = diagonalRank(tiles.map((t) => t.slot));
        return peel({ dir: { x: -W * 0.9, y: H * 0.9 }, order: rank, spread: 1000, dur: 1100, growDelay: 600 });
      }
    },
    // 3 into one column: the diamond lands, then falls into one column down the middle that slides up through the
    //   screen; the live one stops in the middle and grows (her ending)
    'column': {
      n: 24, shape: 'square', mark: 'corner', hold: 900,
      layout: () => diamond(),
      enter() { return flyIn({ from: { x: W * 0.8, y: -H * 0.8 }, rank: diagonalRank(tiles.map((t) => t.slot)) }); },
      async leave(api) {
        const cell = tiles[0].slot.w, pitch = cell * 1.12;
        const order = [...tiles].sort((a, b) => a.slot.y - b.slot.y || a.slot.x - b.slot.x);   // top row first
        const fk = order.findIndex((t) => t.film);
        const x = W / 2 - cell / 2, yTop = topY();
        // phase one: each tile to its place in the column, the film tile's place kept in the middle of the window later
        const col = order.map((t, k) => ({ x: x - t.slot.x, y: yTop + k * pitch - t.slot.y }));
        await finished(order.map((t, k) => t.el.animate([
          { transform: tf(0, 0, 0, 1) }, { transform: tf(col[k].x, col[k].y, 0, 1) }
        ], { duration: 950, delay: k * 22, easing: INOUT, fill: 'both' })));
        if (api.isDone()) return;
        // phase two: the column slides up until the film tile sits in the middle; the rest run on out of the top
        const rise = (yTop + fk * pitch) - (H / 2 - cell / 2);
        const slide = order.map((t, k) => t.el.animate([
          { transform: tf(col[k].x, col[k].y, 0, 1) }, { transform: tf(col[k].x, col[k].y - rise, 0, 1) }
        ], { duration: 1250, easing: INOUT, fill: 'both' }));
        await finished(slide);
        if (api.isDone()) return;
        const f = tiles.find((t) => t.film);
        f.slot = { x: x, y: H / 2 - cell / 2, w: cell, h: cell, r: 0 };
        f.el.style.left = f.slot.x + 'px'; f.el.style.top = f.slot.y + 'px';
        slide.forEach((a) => a.cancel());
        order.forEach((t, k) => { if (!t.film) t.el.style.transform = tf(col[k].x, col[k].y - rise, 0, 1); });
        const away = order.map((t, k) => t.film ? null : t.el.animate([
          { transform: tf(col[k].x, col[k].y - rise, 0, 1) }, { transform: tf(col[k].x, col[k].y - rise - H * 1.1, 0, 1) }
        ], { duration: 1300, delay: Math.abs(k - fk) * 18, easing: INOUT, fill: 'both' })).filter(Boolean);
        await Promise.all([finished(away), grow(150, 1600)]);
      }
    },
    // 4 the line becomes a row: the logo's line runs to both edges and opens into one long row of photographs; the row
    //   parts and the live one grows
    'line': {
      n: 11, shape: 'own', mark: 'line', hold: 1000,
      layout() {
        const line = document.querySelector('.hr-load__line').getBoundingClientRect();
        const rh = clamp(H * 0.17, 70, 190), a = ars(), gap = rh * 0.08;
        const slots = [];
        let w = 0; const ws = [];
        for (let k = 0; k < 12; k++) { const tw = k === 6 ? rh * W / H : rh * a[k < 6 ? k : k - 1]; ws.push(tw); w += tw + gap; }
        let x = W / 2 - ws[6] / 2; for (let k = 0; k < 6; k++) x -= ws[k] + gap;
        const y = line.top + line.height / 2 - rh / 2;
        ws.forEach((tw) => { slots.push({ x, y, w: tw, h: rh, r: 0 }); x += tw + gap; });
        return { slots, film: 6 };
      },
      enter() {
        return finished(tiles.map((t, i) => t.el.animate([
          { opacity: 1, clipPath: 'inset(49.5% 0 49.5% 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }
        ], { duration: 800, delay: 150 + Math.abs(i - 6) * 95, easing: OUT, fill: 'both' })));
      },
      leave() {
        const anims = tiles.map((t, i) => t.film ? null : t.el.animate([
          { transform: tf(0, 0, 0, 1) }, { transform: tf(i < 6 ? -W * 0.8 : W * 0.8, 0, 0, 1) }
        ], { duration: 1300, delay: (5 - Math.abs(i - 6)) * 90, easing: INOUT, fill: 'both' })).filter(Boolean);
        return Promise.all([finished(anims), grow(300, 1700)]);
      }
    },
    // 5 a contact sheet: four rows slide in from alternate sides and fill the screen; they slide back out the way
    //   they came and the live one grows
    'contact': {
      n: 33, shape: 'own', mark: 'corner', hold: 1200,
      layout() {
        const rh = (H - topY() - 40) / 4 * 0.84, a = ars();
        const list = a.slice(0, 33); list.splice(10, 0, W / H);   // the film among them, second row
        const slots = rowsOwn(4, rh, list, W * 0.94);
        return { slots, film: 10 };
      },
      enter() {
        return finished(tiles.map((t, i) => {
          const fromLeft = t.slot.row % 2 === 0;
          return t.el.animate([
            { opacity: 1, transform: tf(fromLeft ? -W * 1.1 : W * 1.1, 0, 0, 1) }, { opacity: 1, transform: tf(0, 0, 0, 1) }
          ], { duration: 1500, delay: t.slot.row * 160 + (fromLeft ? i % 8 : 7 - i % 8) * 40, easing: OUT, fill: 'both' });
        }));
      },
      leave() {
        const anims = tiles.map((t, i) => t.film ? null : t.el.animate([
          { transform: tf(0, 0, 0, 1) }, { transform: tf(t.slot.row % 2 === 0 ? -W * 1.1 : W * 1.1, 0, 0, 1) }
        ], { duration: 1300, delay: (3 - t.slot.row) * 120 + (i % 8) * 30, easing: INOUT, fill: 'both' })).filter(Boolean);
        return Promise.all([finished(anims), grow(400, 1700)]);
      }
    },
    // 6 stairs: five rows of squares, each a step further across, rising from below; then all of them gather onto
    //   the live one
    'stairs': {
      n: 29, shape: 'square', mark: 'corner', hold: 1000,
      layout() {
        const cell = Math.min(cellSize() * 1.15, (H - topY() - 30) / (5 * 1.14), (W - 40) / (6 + 2.4) / 1.1);
        const gap = cell * 0.14, pitch = cell + gap, step = cell * 0.6;
        const x0 = W / 2 - (6 * pitch - gap + 4 * step) / 2, y0 = topY() + (H - topY() - (5 * pitch - gap)) / 2;
        const slots = [];
        for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) slots.push({ x: x0 + c * pitch + r * step, y: y0 + r * pitch, w: cell, h: cell, r: 0, row: r, col: c });
        return { slots, film: 2 * 6 + 2 };
      },
      enter() {
        return finished(tiles.map((t) => t.el.animate([
          { opacity: 0, transform: tf(0, H * 0.5, 0, 0.96) }, { opacity: 1, transform: tf(0, H * 0.1, 0, 1), offset: 0.3 }, { opacity: 1, transform: tf(0, 0, 0, 1) }
        ], { duration: 1500, delay: t.slot.row * 150 + t.slot.col * 45, easing: OUT, fill: 'both' })));
      },
      leave() {
        const f = centre(tiles.find((t) => t.film).slot), d = tiles.map((t) => dist(centre(t.slot), f)), m = Math.max(...d);
        return converge({ order: d.map((v) => 1 - v / m), spread: 500, dur: 1200, growDelay: 500, growDur: 1600 });
      }
    },
    // 7 strips passing: three strips of film run across the screen, the middle one the other way, and slow to a stop with
    //   the live frame in the middle; the outer strips part and it grows
    'strips': {
      n: 32, shape: 'own', mark: 'corner', hold: 800,
      layout() {
        const rh = (H - topY() - 30) / 3 * 0.78, a = ars(), gap = rh * 0.07, slots = [];
        const yGap = ((H - topY() - 30) - 3 * rh) / 2;
        let k = 0;
        for (let r = 0; r < 3; r++) {
          const ws = [];
          for (let c = 0; c < 11; c++) ws.push(r === 1 && c === 5 ? rh * W / H : rh * a[k++]);
          const total = ws.reduce((s, w) => s + w + gap, -gap);
          let x = r === 1 ? W / 2 - ws[5] / 2 - ws.slice(0, 5).reduce((s, w) => s + w + gap, 0) : W / 2 - total / 2;
          ws.forEach((tw, c) => { slots.push({ x, y: topY() + 10 + r * (rh + yGap), w: tw, h: rh, r: 0, row: r, col: c }); x += tw + gap; });
        }
        return { slots, film: 11 + 5 };
      },
      enter() {
        return finished(tiles.map((t) => t.el.animate([
          { opacity: 1, transform: tf(t.slot.row === 1 ? W * 1.15 : -W * 1.15, 0, 0, 1) }, { opacity: 1, transform: tf(0, 0, 0, 1) }
        ], { duration: 2800, delay: t.slot.row * 120, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' })));
      },
      leave() {
        const anims = tiles.map((t) => t.film ? null : t.el.animate([
          { transform: tf(0, 0, 0, 1) },
          { transform: t.slot.row === 1 ? tf(t.slot.col < 5 ? -W : W, 0, 0, 1) : tf(0, t.slot.row === 0 ? -H * 0.6 : H * 0.6, 0, 1) }
        ], { duration: 1300, delay: t.slot.row === 1 ? 0 : 150, easing: INOUT, fill: 'both' })).filter(Boolean);
        return Promise.all([finished(anims), grow(250, 1700)]);
      }
    },
    // 8 laid on the table: prints dropped onto the paper one after another, a little tilted, never overlapping; then
    //   they slide off the table's edges and the live one straightens and grows
    'table': {
      n: 16, shape: 'own', mark: 'corner', hold: 1200,
      layout() {
        const a = ars(), rh = clamp(H * 0.16, 64, 170), slots = [];
        const fw = rh * W / H;
        const film = { x: W / 2 - fw / 2, y: topY() + (H - topY()) / 2 - rh / 2, w: fw, h: rh, r: -2.5 };
        const taken = [film];
        const fits = (s) => taken.every((t) => s.x + s.w + 14 < t.x || t.x + t.w + 14 < s.x || s.y + s.h + 14 < t.y || t.y + t.h + 14 < s.y);
        for (let k = 0; k < 16; k++) {
          const w = rh * a[k], h = rh;
          let s = null;
          for (let tries = 0; tries < 400 && !s; tries++) {
            const c = { x: between(16, W - w - 16), y: between(topY(), H - h - 16), w, h, r: between(-7, 7) };
            if (fits(c)) s = c;
          }
          if (!s) s = { x: between(16, W - w - 16), y: between(topY(), H - h - 16), w, h, r: between(-7, 7) };
          taken.push(s); slots.push(s);
        }
        slots.splice(8, 0, film);
        return { slots, film: 8 };
      },
      enter() {
        const order = tiles.map((_, i) => i).sort(() => rnd() - 0.5);
        const rank = order.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
        return finished(tiles.map((t, i) => t.el.animate([
          { opacity: 0, transform: tf(0, -H * 0.22, t.slot.r - 4, 1.08) }, { opacity: 1, transform: tf(0, 0, t.slot.r, 1) }
        ], { duration: 950, delay: rank[i] * 130, easing: OUT, fill: 'both' })));
      },
      leave() {
        const f = centre(tiles.find((t) => t.film).slot), d = tiles.map((t) => dist(centre(t.slot), f)), m = Math.max(...d);
        const anims = tiles.map((t, i) => {
          if (t.film) return null;
          const c = centre(t.slot), vx = c.x - f.x, vy = c.y - f.y, L = Math.hypot(vx, vy) || 1;
          return t.el.animate([
            { transform: tf(0, 0, t.slot.r, 1) }, { transform: tf(vx / L * W * 1.1, vy / L * H * 1.1, t.slot.r * 1.5, 1) }
          ], { duration: 1300, delay: (1 - d[i] / m) * 500, easing: INOUT, fill: 'both' });
        }).filter(Boolean);
        return Promise.all([finished(anims), grow(400, 1700)]);
      }
    },
    // 9 around the name: the logo stays in the middle and the prints settle in a ring around it; then the ring closes
    //   onto the live one, which grows over the name
    'ring': {
      n: 18, shape: 'own', mark: 'stay', hold: 1200,
      layout() {
        const a = ars(), rh = clamp(H * 0.125, 54, 130), slots = [];
        const rx = W * 0.5 - rh * 0.9, ry = H * 0.5 - rh * 0.75;
        const N = 19;
        for (let k = 0; k < N; k++) {
          const ang = -Math.PI / 2 + k / N * Math.PI * 2 + 0.12;
          const isFilm = k === Math.round(N / 2);
          const w = isFilm ? rh * W / H : rh * a[k < Math.round(N / 2) ? k : k - 1];
          const r2 = k % 2 ? 0.86 : 1;
          slots.push({ x: W / 2 + Math.cos(ang) * rx * r2 - w / 2, y: H / 2 + Math.sin(ang) * ry * r2 - rh / 2, w, h: rh, r: 0, k });
        }
        return { slots, film: Math.round(N / 2) };
      },
      enter() {
        return finished(tiles.map((t, i) => {
          const c = centre(t.slot), vx = c.x - W / 2, vy = c.y - H / 2;
          return t.el.animate([
            { opacity: 0, transform: tf(vx * 0.35, vy * 0.35, 0, 0.96) }, { opacity: 1, transform: tf(0, 0, 0, 1) }
          ], { duration: 1300, delay: i * 70, easing: OUT, fill: 'both' });
        }));
      },
      leave() {
        html.classList.add('hr-markgone');
        return converge({ order: tiles.map((t, i) => i / tiles.length), spread: 400, dur: 1200, growDelay: 350, growDur: 1700 });
      }
    },
    // 10 columns rising: five columns of photographs rise from below at different speeds, like the slow columns of a
    //    gallery, and stop with the live one in the middle; the rest carry on out of the top
    'columns': {
      n: 24, shape: 'own', mark: 'corner', hold: 700,
      layout() {
        const cols = W < 700 ? 3 : 5, gap = clamp(W * 0.012, 8, 18);
        const cw = (W - gap * (cols + 1)) / cols, a = ars(), slots = [];
        const mid = Math.floor(cols / 2);
        let k = 0;
        for (let c = 0; c < cols; c++) {
          const per = Math.ceil(25 / cols);
          let y = topY() + (c % 2 ? -cw * 0.3 : cw * 0.25);
          for (let j = 0; j < per && (k < 24 || (c === mid && j === 2)); j++) {
            const isFilm = c === mid && j === 2;
            const h = isFilm ? cw * H / W : cw / a[k];
            slots.push({ x: gap + c * (cw + gap), y, w: cw, h, r: 0, col: c, j, isFilm });
            if (!isFilm) k++;
            y += h + gap;
          }
        }
        const film = slots.findIndex((s) => s.isFilm);
        // the middle column's film tile sits in the middle of the window: shift that column
        const fs = slots[film], dy = (H / 2 - fs.h / 2) - fs.y;
        slots.forEach((s) => { if (s.col === fs.col) s.y += dy; });
        return { slots, film };
      },
      enter() {
        return finished(tiles.map((t) => t.el.animate([
          { opacity: 1, transform: tf(0, H * (1.1 + (t.slot.col % 2) * 0.35), 0, 1) }, { opacity: 1, transform: tf(0, 0, 0, 1) }
        ], { duration: 2600 + (t.slot.col % 3) * 300, delay: 0, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' })));
      },
      leave() {
        const anims = tiles.map((t) => t.film ? null : t.el.animate([
          { transform: tf(0, 0, 0, 1) }, { transform: tf(0, -H * 1.3, 0, 1) }
        ], { duration: 1500 + (t.slot.col % 3) * 150, easing: INOUT, fill: 'both' })).filter(Boolean);
        return Promise.all([finished(anims), grow(450, 1600)]);
      }
    },
    // 11 the photographs become the film: a wall of them fills the screen edge to edge, then from the live one outward each
    //    turns into its own piece of the film's first frame, until the wall is the frame and it moves
    'mosaic': {
      n: 39, shape: 'wall', mark: 'corner', hold: 1000, mosaic: true,
      layout() { return wallPlan(); },
      enter() { return flyIn({ from: { x: W * 0.6, y: -H * 0.6 }, rank: diagonalRank(tiles.map((t) => t.slot)), spread: 800, dur: 1600, tilt: 0, scale: 0.94 }); },
      leave(api) {
        const f = centre(tiles.find((t) => t.film).slot), d = tiles.map((t) => dist(centre(t.slot), f)), m = Math.max(...d);
        return becomeFilm(api, d.map((v) => v / m), 1300);
      }
    },
    // 12 ... swept from the corner: the wall arrives row by row from the sides, and the film comes up across it on the
    //    diagonal, top left to bottom right
    'sweep': {
      n: 39, shape: 'wall', mark: 'corner', hold: 1000, mosaic: true,
      layout() { return wallPlan(); },
      enter() {
        return finished(tiles.map((t) => {
          const fromLeft = t.slot.row % 2 === 0;
          return t.el.animate([
            { opacity: 1, transform: tf(fromLeft ? -W * 1.1 : W * 1.1, 0, 0, 1) }, { opacity: 1, transform: tf(0, 0, 0, 1) }
          ], { duration: 1500, delay: t.slot.row * 140 + (fromLeft ? t.slot.col : 7 - t.slot.col) * 35, easing: OUT, fill: 'both' });
        }));
      },
      leave(api) {
        const u = tiles.map((t) => (t.slot.col + t.slot.row)), m = Math.max(...u);
        return becomeFilm(api, u.map((v) => v / m), 1500);
      }
    },
    // 13 into one window: a wall of small screens lights up window by window; then the view moves in on the live one until
    //    it is the whole screen
    'window': {
      n: 39, shape: 'screen', mark: 'corner', hold: 1100,
      layout() {
        const cols = W < 700 ? 4 : 8, rows = 5, gap = clamp(W * 0.01, 6, 14);
        const cw = Math.min((W - 32 - gap * (cols - 1)) / cols, (H - topY() - 24 - gap * (rows - 1)) / rows * W / H);
        const ch = cw * H / W;
        const x0 = W / 2 - (cols * cw + (cols - 1) * gap) / 2, y0 = topY() + (H - topY() - 24 - (rows * ch + (rows - 1) * gap)) / 2;
        const slots = grid(cols, rows, cw, ch, gap, x0, y0);
        return { slots, film: 2 * cols + Math.floor(cols / 2) - (cols % 2 ? 0 : 1) };
      },
      enter() {
        const order = tiles.map((_, i) => i).sort(() => rnd() - 0.5);
        const rank = order.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
        return finished(tiles.map((t, i) => t.el.animate([
          { opacity: 0, transform: tf(0, 0, 0, 0.94) }, { opacity: 1, transform: tf(0, 0, 0, 1) }
        ], { duration: 700, delay: rank[i] * 45, easing: OUT, fill: 'both' })));
      },
      async leave(api) {
        const f = tiles.find((t) => t.film), c = centre(f.slot), k = W / f.slot.w;
        layer.style.transformOrigin = `${c.x}px ${c.y}px`;
        tiles.forEach((t) => { if (!t.film) t.el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { duration: 1900, easing: 'linear', fill: 'both' }); });
        await layer.animate([{ transform: 'none' }, { transform: `translate(${W / 2 - c.x}px, ${H / 2 - c.y}px) scale(${k.toFixed(4)})` }],
          { duration: 1900, easing: PART, fill: 'both' }).finished.catch(() => {});
      }
    },
    // 14 a stack, dealt: the prints drop into one pile in the middle; the top one is flicked away to the left, the next to the
    //    right, each showing the next, until the last in the pile is the live one, and it grows
    'stack': {
      n: 17, shape: 'own', mark: 'corner', hold: 500,
      layout() {
        const a = ars(), rh = clamp(H * 0.42, 160, 420), slots = [];
        const cy = topY() + (H - topY()) / 2;
        for (let k = 0; k < 18; k++) {
          const isFilm = k === 17, w = isFilm ? rh * W / H : rh * a[k];
          slots.push({ x: W / 2 - w / 2 + (isFilm ? 0 : between(-8, 8)), y: cy - rh / 2 + (isFilm ? 0 : between(-6, 6)), w, h: rh, r: isFilm ? 0 : between(-3.5, 3.5), k });
        }
        return { slots, film: 17 };
      },
      enter() {
        // the pile builds from the bottom (the film first, then each print on top): later tiles above earlier ones
        tiles.forEach((t, i) => { t.el.style.zIndex = String(tiles.length - i); });
        return finished(tiles.map((t, i) => t.el.animate([
          { opacity: 0, transform: tf(0, -110, t.slot.r - 2, 1.04) }, { opacity: 1, transform: tf(0, -90, t.slot.r - 2, 1.04), offset: 0.12 }, { opacity: 1, transform: tf(0, 0, t.slot.r, 1) }
        ], { duration: 520, delay: (tiles.length - 1 - i) * 95, easing: OUT, fill: 'both' })));
      },
      leave() {
        const anims = tiles.map((t, i) => t.film ? null : t.el.animate([
          { transform: tf(0, 0, t.slot.r, 1) }, { transform: tf(i % 2 ? -W * 0.85 : W * 0.85, between(-60, 60), t.slot.r + (i % 2 ? -14 : 14), 1) }
        ], { duration: 480, delay: i * 125, easing: 'cubic-bezier(0.55, 0, 0.6, 1)', fill: 'both' })).filter(Boolean);
        return Promise.all([finished(anims), grow(16 * 125 + 200, 1500)]);
      }
    },
    // 15 TUAN, in photographs: the prints fly in and spell his name in the middle of the paper, letter by letter; then the
    //    letters gather onto the live one
    'letters': {
      n: 41, shape: 'square', mark: 'corner', hold: 1300,
      layout() {
        const L = ['XXX|.X.|.X.|.X.|.X.', 'X.X|X.X|X.X|X.X|XXX', '.X.|X.X|XXX|X.X|X.X', 'X...X|XX..X|X.X.X|X..XX|X...X'];
        const widths = L.map((l) => l.split('|')[0].length), cols = widths.reduce((s, w) => s + w, 0) + 3;
        const cell = Math.min((W - 32) / (cols * 1.14), (H - topY() - 40) / (5 * 1.14) * 0.9, 110);
        const gap = cell * 0.14, pitch = cell + gap;
        const x0 = W / 2 - (cols * pitch - gap) / 2, y0 = topY() + (H - topY() - (5 * pitch - gap)) / 2;
        const slots = [];
        let cx = 0;
        L.forEach((l, li) => {
          l.split('|').forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'X') slots.push({ x: x0 + (cx + c) * pitch, y: y0 + r * pitch, w: cell, h: cell, r: 0, letter: li, row: r }); }));
          cx += widths[li] + 1;
        });
        const film = slots.findIndex((s) => s.letter === 2 && s.row === 2 && Math.abs(s.x - (x0 + (widths[0] + 1 + widths[1] + 1 + 1) * pitch)) < 1);
        return { slots, film: film < 0 ? 20 : film };
      },
      enter() {
        const within = {};
        const rank = tiles.map((t) => { const k = within[t.slot.letter] = (within[t.slot.letter] || 0) + 1; return (t.slot.letter * 9 + k) / 50; });
        return flyIn({ from: { x: W * 0.75, y: -H * 0.75 }, rank, spread: 2300, dur: 1300, tilt: 3 });
      },
      leave() {
        return converge({ order: tiles.map((t) => t.slot.letter / 4 + t.slot.row / 20), spread: 700, dur: 1100, growDelay: 500, growDur: 1600 });
      }
    }
  };

  // a wall of squares edge to edge, no gaps: each tile a different photograph, later each the film's own piece
  function wallPlan() {
    const cols = W < 700 ? 4 : 8, rows = W < 700 ? 10 : 5;
    const cw = W / cols, ch = H / rows;
    const slots = grid(cols, rows, Math.ceil(cw) + 0.5, Math.ceil(ch) + 0.5, 0, 0, 0);
    slots.forEach((s) => { s.x = s.col * cw; s.y = s.row * ch; });
    return { slots, film: 2 * cols + Math.floor(cols / 2) - 1 };
  }
  // each tile turns into its own piece of the film's first frame, in the order given (0 first); then the frame moves
  async function becomeFilm(api, order, spread) {
    const poster = filmEl.dataset.poster;
    const sc = Math.max(W / 1920, H / 1080), dw = 1920 * sc, dh = 1080 * sc, ox = (W - dw) / 2, oy = (H - dh) / 2;
    tiles.forEach((t) => {
      const s = document.createElement('span');
      s.className = 'hr-tile__slice';
      s.style.backgroundImage = `url("${poster}")`;
      s.style.backgroundSize = `${dw.toFixed(1)}px ${dh.toFixed(1)}px`;
      s.style.backgroundPosition = `${(ox - t.slot.x).toFixed(1)}px ${(oy - t.slot.y).toFixed(1)}px`;
      t.el.appendChild(s);
      t.slice = s;
    });
    await finished(tiles.map((t, i) => t.slice.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, delay: order[i] * spread, easing: 'ease', fill: 'both' })));
    if (api.isDone()) return;
    // the frame is whole: the real film starts from the same frame beneath, and the wall lifts away
    const v = api.video;
    if (v) { v.currentTime = 0; v.playbackRate = 1; v.play().catch(() => {}); }
    if (tv) tv.pause();
    await wait(350);
    const paper = document.querySelector('.hr-load__paper');
    if (paper) paper.style.opacity = '0';   // the wall now covers the window: the paper under it goes, so what shows through is the film
    await layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'ease', fill: 'both' }).finished.catch(() => {});
    api.mosaicDone = true;
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------- ready, run ---------------- */
  const spec = V[NAME];
  if (!spec) return;
  // choose the photographs now, so only the ones this version uses are loaded
  const needed = photos.slice(0, spec.n);
  needed.forEach((p) => { const im = p.querySelector('img'); im.src = im.dataset.src; });
  if (!spec.mosaic) { tv.src = tv.dataset.src; tv.load(); } else { tv.remove(); const im = document.createElement('img'); im.src = filmEl.dataset.poster; im.alt = ''; filmEl.appendChild(im); }
  function ready() {
    return needed.every((p) => { const im = p.querySelector('img'); return im.complete && im.naturalWidth > 0; }) && (spec.mosaic || tv.readyState >= 2);
  }

  async function run(api) {
    W = innerWidth; H = innerHeight;
    const plan = spec.layout();
    place(plan);
    html.classList.add('hr-arrive');   // the moment the tiles start (stills and films are timed from it)
    if (spec.mark === 'corner') markToCorner(1100);
    else if (spec.mark === 'line') {
      const line = document.querySelector('.hr-load__line');
      document.querySelector('.hr-load').style.setProperty('--wide', (W / Math.max(1, line.offsetWidth) * 1.02).toFixed(3));
      html.classList.add('hr-horizon');
      await api.wait(1000); if (api.isDone()) return;
      html.classList.add('hr-rowopen');
    }
    if (!spec.mosaic && tv) { tv.playbackRate = 0.3; tv.play().catch(() => {}); }   // the live tile: the film, small, in slow motion
    await spec.enter(api); if (api.isDone()) return;
    await api.wait(spec.hold); if (api.isDone()) return;
    await spec.leave(api); if (api.isDone()) return;
    // the film fills the window: the page's own film takes over from the tile's at the same moment of the same frame
    const v = api.video;
    if (!api.mosaicDone && v && tv) {
      tv.pause();
      const at = tv.currentTime;
      await new Promise((res) => { const on = () => { v.removeEventListener('seeked', on); res(); }; v.addEventListener('seeked', on); v.currentTime = at; setTimeout(res, 400); });
      v.playbackRate = 0.3;
      v.play().catch(() => {});
      api.speed(0.3, 1, 1400);
    }
    html.classList.add('hr-shown');
    api.finish();
  }
  window.HRFlock = { ready, run };
})();
