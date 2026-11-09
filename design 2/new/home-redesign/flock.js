/* The photographs arrive (2026-11-09). His pick from the references was Mathilde de Chiara's opening: many
   small photographs flying in with the logo, gathering into a shape, breaking apart. Here the shape is made
   of his own photographs and the ending is the Barcelona film, which the home page lands on: one tile among
   the stills is alive (the film, small, in slow motion) and it is the one that grows to the whole screen.
   Fifteen choreographies, chosen by <html data-flock="…">, all plain JS and the Web Animations API: a layout
   (where the tiles settle), an entry (how they come), a hold, and a leaving (how the many become the one).
   home.js runs the loading screen (the line, TUAN, PHOTOGRAPHY) and then hands over to HRFlock.run().
   The tiles' photographs are set here from data-src, so a version loads only the ones it uses.
   The high-end round (2026-11-09, 'luxe-…'): he scored "the photographs become the film" 4 and asked for 高級感, read as
   few things moving, slowly, in order, nothing random. Nothing flies: the photographs rise into hairline grids, the grid
   becomes the film's first frame piece by piece, and the frame moves. The seven he scored 1 (stairs, strips, table,
   columns, sweep, stack, letters) lost their pages the same day; their configs stay here. */
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
  const cellSize = () => clamp(Math.min(W, H) * 0.11, 44, 120);

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
  let chosen = photos;   // the photographs in the order this version wants them (spec.pick may reorder)
  function place(plan, shape, ars) {
    const slots = plan.slots, film = Math.min(plan.film, slots.length - 1);   // a short layout (a narrow phone) still gets its film tile
    const n = slots.length - 1;
    const used = chosen.slice(0, n);
    photos.forEach((p) => { if (!used.includes(p)) p.remove(); });
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
  const ars = () => chosen.map((p) => Number(p.querySelector('img').dataset.ar) || 1.5);
  const finished = (anims) => Promise.all(anims.map((a) => a.finished.catch(() => {})));

  // the tiles fly in from one side, every tile the same flight, the delays spread along the flock
  function flyIn({ from, rank, spread = 900, dur = 1700, tilt = 4, scale = 0.9, ease = OUT }) {
    return finished(tiles.map((t, i) => {
      const r0 = t.slot.r, k = 0.72 + 0.56 * rnd();   // a flock, not a block: each its own distance, all landing together
      return t.el.animate([
        { opacity: 1, transform: tf(from.x * k, from.y * k, r0 + (i % 2 ? tilt : -tilt) * k, scale) },
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
    setTimeout(() => { if (!html.classList.contains('hr-shown')) html.classList.add('hr-out'); }, delay + dur * 0.35);   // the corner mark crosses from dark to the page's own
    if (tv && api_.video) { try { api_.video.currentTime = tv.currentTime + (delay + dur) / 1000 * (tv.playbackRate || 0.3); } catch (e) { /* not yet seekable */ } }   // pre-seek: the final nudge is tiny
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
      n: 24, shape: 'square', mark: 'corner', hold: 700,
      layout: () => diamond(),
      enter() { return flyIn({ from: { x: W * 0.8, y: -H * 0.8 }, rank: diagonalRank(tiles.map((t) => t.slot)) }); },
      leave() {
        const f = centre(tiles.find((t) => t.film).slot), d = tiles.map((t) => dist(centre(t.slot), f)), m = Math.max(...d);
        return peel({ dir: { x: -W * 0.9, y: H * 0.9 }, order: d.map((v) => 1 - v / m), growDelay: 150 });
      }
    },
    // 2 a ribbon: the same diamond, but the prints come single file from the corner, a long train that coils into place
    'ribbon': {
      n: 24, shape: 'square', mark: 'corner', hold: 700,
      layout: () => diamond(),
      enter() {
        const rank = diagonalRank(tiles.map((t) => t.slot));
        const order = rank.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map((p, k) => [p[1], k]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
        return flyIn({ from: { x: W * 0.85, y: -H * 0.85 }, rank: order.map((k) => k / (tiles.length - 1)), spread: 1700, dur: 1500, tilt: 2 });
      },
      leave() {
        const rank = diagonalRank(tiles.map((t) => t.slot));
        return peel({ dir: { x: -W * 0.9, y: H * 0.9 }, order: rank, spread: 700, dur: 1100, growDelay: 250 });
      }
    },
    // 3 into one column: the diamond lands, then falls into one column down the middle that slides up through the
    //   screen; the live one stops in the middle and grows (her ending)
    'column': {
      n: 24, shape: 'square', mark: 'corner', hold: 600,
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
        ], { duration: 850, delay: Math.min(k, 8) * 22, easing: INOUT, fill: 'both' })));
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
      n: 11, shape: 'own', mark: 'line', hold: 800,
      layout() {
        const line = document.querySelector('.hr-load__line').getBoundingClientRect();
        const rh = clamp(H * 0.2, 70, 210), a = ars(), gap = rh * 0.08;
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
      n: 33, shape: 'own', mark: 'corner', hold: 700,
      layout() {
        const rows = W < 700 ? 6 : 4;
        const rh = (H - topY() - 40) / rows * 0.84, a = ars();
        const list = a.slice(0, 33); list.splice(10, 0, W / H);   // the film among them, second row
        const slots = rowsOwn(rows, rh, list, W * 0.94);
        const film = Math.min(10, slots.length - 1);
        if (!slots[film] || Math.abs(slots[film].w / slots[film].h - W / H) > 0.01) { const f = slots[film]; f.w = f.h * W / H; }   // its slot keeps the window's shape
        return { slots, film };
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
          { transform: tf(0, 0, 0, 1) }, { transform: tf(t.slot.row % 2 === 0 ? W * 1.1 : -W * 1.1, 0, 0, 1) }   // on through, out the other side
        ], { duration: 1300, delay: (3 - t.slot.row) * 120 + (i % 8) * 30, easing: INOUT, fill: 'both' })).filter(Boolean);
        return Promise.all([finished(anims), grow(200, 1700)]);
      }
    },
    // 6 stairs: five rows of squares, each a step further across, rising from below; then all of them gather onto
    //   the live one
    'stairs': {
      n: 29, shape: 'square', mark: 'corner', hold: 700,
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
          { opacity: 0, transform: tf(0, H * 0.45, 0, 0.96), easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }, { opacity: 1, transform: tf(0, H * 0.3, 0, 0.98), offset: 0.22, easing: OUT }, { opacity: 1, transform: tf(0, 0, 0, 1) }
        ], { duration: 1500, delay: t.slot.row * 150 + t.slot.col * 45, fill: 'both' })));
      },
      leave() {
        const f = centre(tiles.find((t) => t.film).slot), d = tiles.map((t) => dist(centre(t.slot), f)), m = Math.max(...d);
        return converge({ order: d.map((v) => 1 - v / m), spread: 500, dur: 1200, growDelay: 500, growDur: 1600 });
      }
    },
    // 7 strips passing: three strips of film run across the screen, the middle one the other way, and slow to a stop with
    //   the live frame in the middle; the outer strips part and it grows
    'strips': {
      n: 32, shape: 'own', mark: 'corner', hold: 300,
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
        ], { duration: 2600, delay: t.slot.row * 120, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'both' })));
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
      n: 16, shape: 'own', mark: 'corner', hold: 700,
      layout() {
        const narrow = W < 700, count = narrow ? 9 : 16;
        const a = ars(), rh = clamp(H * (narrow ? 0.11 : 0.16), 56, 170), slots = [];
        const fw = rh * W / H;
        const film = { x: W / 2 - fw / 2, y: topY() + (H - topY()) / 2 - rh / 2, w: fw, h: rh, r: -2.5 };
        const taken = [film];
        const fits = (s) => taken.every((t) => s.x + s.w + 14 < t.x || t.x + t.w + 14 < s.x || s.y + s.h + 14 < t.y || t.y + t.h + 14 < s.y);
        for (let k = 0; k < count; k++) {
          const w = rh * a[k], h = rh;
          let s = null;
          for (let tries = 0; tries < 400 && !s; tries++) {
            const c = { x: between(16, W - w - 16), y: between(topY(), H - h - 16), w, h, r: between(-7, 7) };
            if (fits(c)) s = c;
          }
          if (!s) s = { x: between(16, W - w - 16), y: between(topY(), H - h - 16), w, h, r: between(-7, 7) };
          taken.push(s); slots.push(s);
        }
        const at = Math.floor(count / 2);
        slots.splice(at, 0, film);
        return { slots, film: at };
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
        return Promise.all([finished(anims), grow(150, 1700)]);
      }
    },
    // 9 around the name: the logo stays in the middle and the prints settle in a ring around it; then the ring closes
    //   onto the live one, which grows over the name
    'ring': {
      n: 18, shape: 'own', mark: 'stay', hold: 800,
      layout() {
        const narrow = W < 700;
        const a = ars(), rh = clamp(H * (narrow ? 0.075 : 0.125), 44, 130), slots = [];
        const rx = W * 0.5 - rh * (narrow ? 1.1 : 0.9), ry = H * 0.5 - rh * 0.75;
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
      n: 24, shape: 'own', mark: 'corner', hold: 300,
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
        ], { duration: 2400 + (t.slot.col % 3) * 300, delay: 0, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'both' })));
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
      n: 39, shape: 'wall', mark: 'corner', hold: 600, mosaic: true, markGone: true, still: true,
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
      n: 39, shape: 'wall', mark: 'corner', hold: 600, mosaic: true, markGone: true, still: true,
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
      n: 39, shape: 'screen', mark: 'corner', hold: 700, still: true,
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
        html.classList.add('hr-markgone');   // the wall passes over the corner as the view moves in
        setTimeout(() => html.classList.add('hr-out'), 900);
        layer.style.transformOrigin = `${c.x}px ${c.y}px`;
        tiles.forEach((t) => { if (!t.film) t.el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { duration: 1900, easing: 'linear', fill: 'both' }); });
        await layer.animate([{ transform: 'none' }, { transform: `translate(${W / 2 - c.x}px, ${H / 2 - c.y}px) scale(${k.toFixed(4)})` }],
          { duration: 1900, easing: PART, fill: 'both' }).finished.catch(() => {});
      }
    },
    // 14 a stack, dealt: the prints drop into one pile in the middle; the top one is flicked away to the left, the next to the
    //    right, each showing the next, until the last in the pile is the live one, and it grows
    'stack': {
      n: 17, shape: 'own', mark: 'corner', hold: 400,
      layout() {
        const a = ars(), rh = Math.min(clamp(H * 0.42, 160, 420), (W - 40) / 1.6), slots = [];
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
          { opacity: 0, transform: tf(0, -110, t.slot.r - 2, 1.04), easing: 'linear' }, { opacity: 1, transform: tf(0, -90, t.slot.r - 2, 1.04), offset: 0.12, easing: OUT }, { opacity: 1, transform: tf(0, 0, t.slot.r, 1) }
        ], { duration: 520, delay: (tiles.length - 1 - i) * 95, fill: 'both' })));
      },
      leave() {
        const anims = tiles.map((t, i) => t.film ? null : t.el.animate([
          { transform: tf(0, 0, t.slot.r, 1) }, { transform: tf((i % 2 ? -1 : 1) * (W / 2 + t.slot.w / 2 + 60), between(-60, 60), t.slot.r + (i % 2 ? -14 : 14), 1) }
        ], { duration: 420, delay: i * 125, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'both' })).filter(Boolean);
        return Promise.all([finished(anims), grow(13 * 125, 1600)]);
      }
    },
    // 15 TUAN, in photographs: the prints fly in and spell his name in the middle of the paper, letter by letter; then the
    //    letters gather onto the live one
    'letters': {
      n: 41, shape: 'square', mark: 'corner', hold: 800,
      layout() {
        const L = ['XXX|.X.|.X.|.X.|.X.', 'X.X|X.X|X.X|X.X|XXX', '.X.|X.X|XXX|X.X|X.X', 'X...X|XX..X|X.X.X|X..XX|X...X'];
        const widths = L.map((l) => l.split('|')[0].length);
        const twoLines = W < 700;   // TU over AN on a narrow screen
        const lines = twoLines ? [[0, 1], [2, 3]] : [[0, 1, 2, 3]];
        const lineCols = lines.map((ln) => ln.reduce((s, li) => s + widths[li], 0) + ln.length - 1);
        const cols = Math.max(...lineCols), rows = lines.length * 5 + (lines.length - 1);
        const cell = Math.min((W - 88) / (cols * 1.14), (H - topY() - 40) / (rows * 1.14) * 0.9, 110);
        const gap = cell * 0.14, pitch = cell + gap;
        const y0 = topY() + (H - topY() - (rows * pitch - gap)) / 2;
        const slots = [];
        let filmAt = { x: 0, y: 0 };
        lines.forEach((ln, k) => {
          const x0 = W / 2 - (lineCols[k] * pitch - gap) / 2, yl = y0 + k * 6 * pitch;
          let cx = 0;
          ln.forEach((li) => {
            if (li === 2) filmAt = { x: x0 + (cx + 1) * pitch, y: yl + 2 * pitch };   // the A's crossbar, its middle cell
            L[li].split('|').forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'X') slots.push({ x: x0 + (cx + c) * pitch, y: yl + r * pitch, w: cell, h: cell, r: 0, letter: li, row: r }); }));
            cx += widths[li] + 1;
          });
        });
        const film = slots.findIndex((s) => Math.abs(s.x - filmAt.x) < 1 && Math.abs(s.y - filmAt.y) < 1);
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
  // each tile turns into its own piece of the film's first frame, in the order given (0 first); the frame covers `rect`
  // (the window unless told otherwise), fitted as the page's own film is (object-fit: cover)
  // where the film's first frame sits when it covers `rect` the way the page's film does (object-fit: cover)
  function frameFit(rect) {
    const sc = Math.max(rect.w / 1920, rect.h / 1080), dw = 1920 * sc, dh = 1080 * sc;
    return { dw, dh, ox: rect.x + (rect.w - dw) / 2, oy: rect.y + (rect.h - dh) / 2 };
  }
  function paintFrame(el, rect, dx = 0, dy = 0) {
    const f = frameFit(rect);
    el.style.backgroundImage = `url("${filmEl.dataset.poster}")`;
    el.style.backgroundSize = `${f.dw.toFixed(1)}px ${f.dh.toFixed(1)}px`;
    el.style.backgroundPosition = `${(f.ox - dx).toFixed(1)}px ${(f.oy - dy).toFixed(1)}px`;
  }
  // each piece comes up as a dissolve, or, on large panels where a dissolve shows two pictures at once, as a wipe
  // ('right' or 'down') that continues the version's own order
  async function sliceIn(api, order, spread, rect = FULL(), dissolve = 650, wipe = null) {
    tiles.forEach((t) => {
      const s = document.createElement('span');
      s.className = 'hr-tile__slice';
      paintFrame(s, rect, t.slot.x, t.slot.y);
      t.el.appendChild(s);
      t.slice = s;
    });
    const from = wipe === 'down' ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)';
    await finished(tiles.map((t, i) => t.slice.animate(
      wipe ? [{ opacity: 1, clipPath: from }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }] : [{ opacity: 0 }, { opacity: 1 }],
      { duration: dissolve, delay: order[i] * spread, easing: wipe ? OUT : 'ease', fill: 'both' })));
  }
  // the frame is whole and covers the window: the real film starts from the same frame beneath, held almost still, and
  // the wall lifts away (the paper with it, over the same time, so a margin or a hairline dissolves into the film rather
  // than snapping); then the film eases up to its own pace, so the frame the visitor was brought to is not gone at once
  async function filmTakesOver(api, fade = 700, beat = 350) {
    const v = api.video;
    if (v) { v.currentTime = 0; v.playbackRate = 0.35; }
    if (beat) { await wait(beat); if (api.isDone()) return; }
    const paper = document.querySelector('.hr-load__paper');
    if (paper) { paper.style.transition = `opacity ${fade}ms ease`; paper.style.opacity = '0'; }
    if (v) v.play().catch(() => {});   // the frame beneath is the poster's own until this moment
    html.classList.add('hr-out');
    await layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fade, easing: 'ease', fill: 'both' }).finished.catch(() => {});
    if (api.isDone()) return;
    if (v) api.speed(0.35, 1, 1600);
    api.mosaicDone = true;
  }
  async function becomeFilm(api, order, spread, opts = {}) {
    await sliceIn(api, order, spread, opts.rect, opts.dissolve, opts.wipe);
    if (api.isDone()) return;
    await filmTakesOver(api);
  }
  // the whole layer grows as one from `rect` (which has the window's shape) to the window: what was a print in a margin
  // is the whole screen, its hairlines with it
  function growLayer(rect, dur = 1800, delay = 0) {
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, k = W / rect.w;
    layer.style.transformOrigin = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
    setTimeout(() => { if (!html.classList.contains('hr-shown')) html.classList.add('hr-out'); }, delay + dur * 0.35);
    return layer.animate([{ transform: 'none' }, { transform: `translate(${(W / 2 - cx).toFixed(1)}px, ${(H / 2 - cy).toFixed(1)}px) scale(${k.toFixed(4)})` }],
      { duration: dur, delay, easing: PART, fill: 'both' }).finished.catch(() => {});
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------- the high-end round: hairline grids, rising in order, becoming the film ---------------- */
  const FULL = () => ({ x: 0, y: 0, w: W, h: H });
  const narrow = () => W < 700;
  const HAIR = () => clamp(Math.round(Math.min(W, H) * 0.004), 2, 4);   // the paper between the photographs
  function hairGrid(cols, rows, gap, rect) {
    const cw = (rect.w - (cols - 1) * gap) / cols, ch = (rect.h - (rows - 1) * gap) / rows;
    return grid(cols, rows, cw, ch, gap, rect.x, rect.y);
  }
  // a rectangle of the window's shape, `frac` of its width, centred in the paper below the mark
  function matRect(frac) {
    const room = H - topY() - 24;
    const w = Math.min(W * frac, room * W / H), h = w * H / W;
    return { x: (W - w) / 2, y: topY() + (room - h) / 2, w, h };
  }
  const centreRank = (list, c) => { const d = list.map((t) => dist(centre(t.slot), c)), m = Math.max(...d) || 1; return d.map((v) => v / m); };
  // 0, 1, 2 … from the middle outward, ties broken left to right then top to bottom, so it is truly one at a time
  function orderFromCentre(list) {
    const c = { x: W / 2, y: H / 2 };
    const idx = list.map((_, i) => i).sort((a, b) => dist(centre(list[a].slot), c) - dist(centre(list[b].slot), c) || list[a].slot.col - list[b].slot.col || list[a].slot.row - list[b].slot.row);
    const rank = []; idx.forEach((i, k) => { rank[i] = k; });
    return rank;
  }
  // some tiles rise into place, each after the one before: the lift on the strong curve, the fade on a gentle one of its
  // own, so a tile comes up over its whole time instead of popping and then waiting
  const SOFT = 'cubic-bezier(0.33, 1, 0.68, 1)';
  function rise(list, { step = 90, dur = 1100, lift = 14, start = 0, order = null } = {}) {
    return finished(list.flatMap((t, k) => {
      const delay = start + (order ? order[k] : k) * step;
      return [
        t.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur * 0.85, delay, easing: SOFT, fill: 'both' }),
        t.el.animate([{ transform: tf(0, lift, 0, 0.985) }, { transform: tf(0, 0, 0, 1) }], { duration: dur, delay, easing: OUT, fill: 'both' })
      ];
    }));
  }
  // the upright photographs first (his order kept among them: the train first), or the wide ones first
  function pickUpright(ps, upright) {
    const fits = (p) => (Number(p.querySelector('img').dataset.ar) < 0.85) === upright ? 0 : 1;
    return [...ps].sort((a, b) => fits(a) - fits(b));
  }
  const wallGrid = () => hairGrid(narrow() ? 3 : 6, narrow() ? 8 : 4, HAIR(), FULL());
  const wallFilm = (slots) => { const cols = Math.max(...slots.map((s) => s.col)) + 1, rows = Math.max(...slots.map((s) => s.row)) + 1; return Math.floor(rows / 2) * cols + Math.floor(cols / 2) - 1; };
  Object.assign(V, {
    // 16 the wall, slowly: 24 photographs rise into a wall with hairlines of paper between them, in reading order; from the
    //    middle outward each turns into its piece of the film's first frame, the hairlines dissolve, and the frame moves
    'luxe-wall': {
      n: 23, shape: 'wall', mark: 'fade', hold: 800, mosaic: true, markGone: true, still: true,
      layout() { const slots = wallGrid(); return { slots, film: wallFilm(slots) }; },
      enter() { return rise(tiles, { step: 70, dur: 1100 }); },
      leave(api) { return becomeFilm(api, centreRank(tiles, { x: W / 2, y: H / 2 }), 1500, { dissolve: 600 }); }
    },
    // 17 row by row: the same wall, each row rising as one, top to bottom; it becomes the film row by row the same way
    'luxe-rows': {
      n: 23, shape: 'wall', mark: 'fade', hold: 1000, mosaic: true, markGone: true, still: true,
      layout() { const slots = wallGrid(); return { slots, film: wallFilm(slots) }; },
      enter() { return rise(tiles, { step: narrow() ? 190 : 380, dur: 1200, order: tiles.map((t) => t.slot.row) }); },
      leave(api) {   // the film comes up from the middle rows (the towers) outward, not from a band of sky at the top
        const rows = Math.max(...tiles.map((t) => t.slot.row)), mid = rows / 2;
        return becomeFilm(api, tiles.map((t) => Math.abs(t.slot.row - mid) / mid), 1400, { dissolve: 700 });
      }
    },
    // 18 eight, large: eight photographs only, each a quarter of the width, rising from the middle outward; the film comes
    //    up through them the same way
    'luxe-eight': {
      n: 7, shape: 'wall', mark: 'fade', hold: 1000, mosaic: true, filmAsPhoto: true, big: true, markGone: true, still: true,
      layout() { const slots = hairGrid(narrow() ? 2 : 4, narrow() ? 4 : 2, HAIR(), FULL()); return { slots, film: narrow() ? 3 : 5 }; },
      enter() { return rise(tiles, { step: 300, dur: 1400, lift: 16, order: orderFromCentre(tiles) }); },
      leave(api) { const r = orderFromCentre(tiles); return becomeFilm(api, r.map((v) => v / (tiles.length - 1)), 1300, { dissolve: 700, wipe: 'down' }); }
    },
    // 19 three panels: three tall photographs, the height of the screen, rise one after another left to right; each becomes
    //    its third of the film, left to right
    'luxe-triptych': {
      n: 2, shape: 'wall', mark: 'fade', hold: 1000, mosaic: true, filmAsPhoto: true, big: true, markGone: true, still: true,
      pick: (ps) => pickUpright(ps, innerWidth >= 700),   // upright photographs for the tall panels, wide ones when they are stacked on a phone
      layout() { const slots = narrow() ? hairGrid(1, 3, HAIR(), FULL()) : hairGrid(3, 1, HAIR(), FULL()); return { slots, film: 1 }; },
      enter() { return rise(tiles, { step: 420, dur: 1400, lift: 18 }); },
      leave(api) {   // a wipe, left to right (on a phone the middle panel, the towers, first), never two pictures at once on a panel this size
        const order = narrow() ? [0.5, 0, 1] : [0, 0.5, 1];
        return becomeFilm(api, order, 1100, { dissolve: 800, wipe: narrow() ? 'down' : 'right' });
      }
    },
    // 20 inside the mat: twelve photographs rise into a small wall set in a wide paper margin, like a print matted on a wall;
    //    the wall becomes the film's first frame, then the margin recedes until the frame is the whole screen
    'luxe-mat': {
      n: 11, shape: 'wall', mark: 'corner', hold: 1000, mosaic: true, still: true,
      layout() {
        const r = this.rect = matRect(narrow() ? 0.76 : 0.6), cols = narrow() ? 2 : 4;
        return { slots: hairGrid(cols, 3, HAIR() / (W / r.w), r), film: cols + Math.floor(cols / 2) };   // the hairlines are drawn thinner, so they land at their size when the mat grows
      },
      enter() { return rise(tiles, { step: 110, dur: 1100 }); },
      async leave(api) {
        const r = this.rect;
        await sliceIn(api, centreRank(tiles, { x: r.x + r.w / 2, y: r.y + r.h / 2 }), 1300, r, 700); if (api.isDone()) return;
        await growLayer(r, 1800); if (api.isDone()) return;
        await filmTakesOver(api, 700, 0);
      }
    },
    // 21 one print: a single photograph in a wide margin, changing slowly to the next, and the next; the fourth is the film's
    //    first frame, and the margin recedes until it is the whole screen
    'luxe-one': {
      n: 3, shape: 'wall', mark: 'corner', hold: 500, mosaic: true, big: true, still: true,
      pick: (ps) => pickUpright(ps, innerWidth < 700),   // on a phone the one print is upright, so upright photographs
      layout() { const r = this.rect = matRect(narrow() ? 0.78 : 0.5); return { slots: Array.from({ length: 4 }, () => ({ ...r, r: 0 })), film: 3 }; },
      async enter(api) {
        tiles.forEach((t, i) => { t.el.style.zIndex = String(i + 1); });   // each above the one before
        await rise([tiles[0]], { dur: 1200 }); if (api.isDone()) return;
        for (let i = 1; i < tiles.length; i++) {
          await api.wait(650); if (api.isDone()) return;
          await finished([tiles[i].el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 750, easing: 'ease', fill: 'both' })]); if (api.isDone()) return;
        }
      },
      async leave(api) { await growLayer(this.rect, 1700); if (api.isDone()) return; await filmTakesOver(api, 700, 0); }
    },
    // 22 the line opens into a band: the logo's line runs to both edges and a band of four photographs unfolds from it; the band
    //    becomes the film's middle, then opens to the whole height
    'luxe-band': {
      n: 3, shape: 'wall', mark: 'line', hold: 900, mosaic: true, filmAsPhoto: true, big: true, still: true,
      layout() {
        const line = document.querySelector('.hr-load__line').getBoundingClientRect();
        const cols = narrow() ? 2 : 4, bh = clamp(H * 0.36, 160, 440);
        this.band = { x: 0, y: line.top + line.height / 2 - bh / 2, w: W, h: bh };   // the photographs are the band's height, centred on the line
        return { slots: hairGrid(cols, 1, HAIR(), this.band), film: cols / 2 };
      },
      enter() {
        const b = this.band, mid = (tiles.length - 1) / 2;
        // the whole first frame waits behind the band, clipped to it, to be opened out to the full height at the end
        this.clip = `inset(${b.y.toFixed(1)}px 0 ${(H - b.y - b.h).toFixed(1)}px 0)`;
        const back = this.back = document.createElement('div');
        back.className = 'hr-flock__back';
        paintFrame(back, FULL());
        back.style.clipPath = this.clip;
        layer.prepend(back);
        return finished(tiles.map((t, i) => t.el.animate([
          { opacity: 1, clipPath: 'inset(49.5% 0 49.5% 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }
        ], { duration: 1200, delay: 200 + Math.abs(i - mid) * 320, easing: OUT, fill: 'both' })));
      },
      async leave(api) {
        const mid = (tiles.length - 1) / 2;
        this.back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 2000, easing: 'ease', fill: 'both' });   // the hairlines fill with the film as the band does
        await sliceIn(api, tiles.map((t, i) => Math.abs(i - mid) / Math.max(1, mid)), 1200, FULL(), 800, 'right'); if (api.isDone()) return;
        await api.wait(300); if (api.isDone()) return;
        setTimeout(() => { if (!html.classList.contains('hr-shown')) html.classList.add('hr-out'); }, 600);
        await this.back.animate([{ clipPath: this.clip }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1700, easing: PART, fill: 'both' }).finished.catch(() => {});
        if (api.isDone()) return;
        await filmTakesOver(api, 700, 0);
      }
    },
    // 23 around the name, then the wall: the logo stays in the middle; photographs rise one by one round it, clockwise from the
    //    top left; then the name goes and the two places it kept fill, and the whole wall becomes the film from the middle
    'luxe-around': {
      n: 11, shape: 'wall', mark: 'stay', hold: 700, mosaic: true, still: true,
      layout() {
        const cols = narrow() ? 2 : 4, rows = narrow() ? 5 : 3;
        const slots = hairGrid(cols, rows, HAIR(), FULL());
        const midRow = Math.floor(rows / 2), keep = narrow() ? [0, 1] : [1, 2];
        slots.forEach((s) => { s.late = s.row === midRow && keep.includes(s.col); });
        return { slots, film: slots.findIndex((s) => s.late && s.col === keep[1]) };
      },
      async enter(api) {
        const ring = tiles.filter((t) => !t.slot.late);
        const key = (t) => { const c = centre(t.slot); return (Math.atan2(c.y - H / 2, c.x - W / 2) + Math.PI * 0.75 + Math.PI * 2) % (Math.PI * 2); };
        ring.sort((a, b) => key(a) - key(b));
        await rise(ring, { step: 140, dur: 1100 }); if (api.isDone()) return;
        await api.wait(400); if (api.isDone()) return;
        html.classList.add('hr-markgone');   // the name goes first, wholly, and only then do its two places fill
        await rise(tiles.filter((t) => t.slot.late), { step: 240, dur: 1100, lift: 0, start: 900 });
      },
      leave(api) { return becomeFilm(api, centreRank(tiles, { x: W / 2, y: H / 2 }), 1200, { dissolve: 700 }); }
    },
    // 24 the photographs part: the wall rises column by column; then the paper beneath goes (the film shows in the hairlines)
    //    and the columns lift away one after another, left to right, uncovering the film already playing
    'luxe-curtain': {
      n: 23, shape: 'wall', mark: 'fade', hold: 900, mosaic: true, markGone: true, still: true,
      layout() { const slots = wallGrid(); return { slots, film: wallFilm(slots) }; },
      enter() { return rise(tiles, { step: narrow() ? 300 : 160, dur: 1200, order: tiles.map((t) => t.slot.col) }); },
      async leave(api) {
        const v = api.video;
        if (v) { v.currentTime = 0; v.playbackRate = 0.35; }   // alive under the lifting columns, but slowly, so the frame is still whole when the last one clears
        const paper = document.querySelector('.hr-load__paper');
        if (paper) { paper.style.transition = 'opacity 600ms ease'; paper.style.opacity = '0'; }
        await api.wait(300); if (api.isDone()) return;
        if (v) v.play().catch(() => {});
        html.classList.add('hr-out');
        const cols = Math.max(...tiles.map((t) => t.slot.col)) + 1, step = narrow() ? 300 : 220;
        setTimeout(() => { if (v && !api.isDone()) api.speed(0.35, 1, 1600); }, (cols - 1) * step + 900);   // up to its own pace as the last column goes
        await finished(tiles.map((t) => t.el.animate([{ transform: 'none' }, { transform: tf(0, -H * 1.05, 0, 1) }],
          { duration: 1500, delay: t.slot.col * step, easing: INOUT, fill: 'both' })));
        api.mosaicDone = true;
      }
    }
  });

  /* ---------------- ready, run ---------------- */
  const spec = V[NAME];
  if (!spec) return;
  if (/[?&]still\b/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // home.js shows the end at once; load nothing
  // choose the photographs now, so only the ones this version uses are loaded
  if (spec.pick) chosen = spec.pick(photos);
  const needed = chosen.slice(0, spec.n + (spec.filmAsPhoto ? 1 : 0));
  const srcOf = (p) => { const s = p.querySelector('img').dataset.src; return spec.big ? s.replace('/640/', '/1280/') : s; };   // large panels take the larger copies
  needed.forEach((p) => { p.querySelector('img').src = srcOf(p); });
  let fim = null;
  if (!spec.mosaic) { tv.src = tv.dataset.src; tv.load(); }
  else {   // no live tile: the film's tile is a still, the film's first frame, or one more photograph where a still of the film would give the ending away
    tv.remove(); fim = document.createElement('img'); fim.alt = '';
    fim.src = spec.filmAsPhoto ? srcOf(chosen[spec.n]) : filmEl.dataset.poster;
    filmEl.appendChild(fim);
  }
  const loaded = (im) => im.complete && im.naturalWidth > 0;
  function ready() {
    return needed.every((p) => loaded(p.querySelector('img'))) && (spec.mosaic ? loaded(fim) : tv.readyState >= 2);
  }

  let api_ = {};
  async function run(api) {
    api_ = api;
    W = innerWidth; H = innerHeight;
    const plan = spec.layout();
    place(plan);
    html.classList.add('hr-arrive');   // the moment the tiles start (stills and films are timed from it)
    if (spec.mark === 'corner') { markToCorner(1000); await api.wait(560); if (api.isDone()) return; }   // the name is on its way before any tile comes
    else if (spec.mark === 'fade') { html.classList.add('hr-markgone'); await api.wait(700); if (api.isDone()) return; }   // a wall edge to edge would cover it: the name simply goes, and only then do the photographs rise
    else if (spec.mark === 'stay') { await api.wait(300); if (api.isDone()) return; }   // a beat with the name alone first
    else if (spec.mark === 'line') {
      const line = document.querySelector('.hr-load__line');
      document.querySelector('.hr-load').style.setProperty('--wide', (W / Math.max(1, line.offsetWidth) * 1.02).toFixed(3));
      html.classList.add('hr-horizon');
      await api.wait(1000); if (api.isDone()) return;
      html.classList.add('hr-rowopen');
    }
    if (!spec.mosaic && tv) { tv.playbackRate = 0.3; tv.play().catch(() => {}); }   // the live tile: the film, small, in slow motion
    await spec.enter(api); if (api.isDone()) return;
    if (!spec.still) {   // the hold breathes: the formation drifts up a little, and eases back as the film grows, so the end lands square
      const T = spec.hold + 1900;
      layer.animate([{ transform: 'none' }, { transform: `translateY(${(-H * 0.012).toFixed(1)}px)`, offset: spec.hold / T }, { transform: 'none' }],
        { duration: T, easing: 'linear', fill: 'none' });
    }
    if (spec.markGone) html.classList.add('hr-markgone');   // the wall is about to cover the corner: the mark goes with the paper
    await api.wait(spec.hold); if (api.isDone()) return;
    await spec.leave(api); if (api.isDone()) return;
    // the film fills the window: the page's own film takes over from the tile's at the same moment of the same frame
    const v = api.video;
    if (!api.mosaicDone && v && tv) {
      tv.pause();
      const at = tv.currentTime;
      if (Math.abs(v.currentTime - at) > 0.04) await new Promise((res) => { const on = () => { v.removeEventListener('seeked', on); res(); }; v.addEventListener('seeked', on); v.currentTime = at; setTimeout(res, 300); });
      if (api.isDone()) return;
      v.playbackRate = 0.3;
      v.play().catch(() => {});
      api.speed(0.3, 1, 1400);
    }
    html.classList.add('hr-shown');
    api.finish();
  }
  window.HRFlock = { ready, run };
})();
