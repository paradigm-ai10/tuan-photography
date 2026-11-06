/* Scratch map and ledger 刮刮地圖＋印章一年一年排 (2026-11-06, round two). From his notes on the
   first round: the scratch map's look (the world printed under a champagne foil, his countries
   scratched clean one after another in the order he first went), the count set large, the share of
   the world shown twice, and the passport stamps taken off the countries and laid in one ledger
   strip along the foot of the map, year by year.

   As each country is scratched, its square of the tally is scratched to gold and its stamp is
   pressed into its place in the ledger. Pointing at a country lights its stamp and its square;
   pointing at a stamp or a square lights its country. The number itself never moves.

   The foil, its grain and the coin's strokes are the scratch map's code (scratch.js); the stamps
   are the passport stamps' drawing (stamps.js), copied here so the two stay as they are. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  const query = new URLSearchParams(location.search);
  if (query.get('lang') === 'zh' || query.get('lang') === 'en') FP.setLang(query.get('lang'));

  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const px = (node, k, v) => node.style.setProperty(k, `${Math.round(v * 100) / 100}px`);

  /* ------------------------------------------------------------ words */

  const WORDS = {
    en: {
      home: 'Home', year: (y) => String(y),
      map: (n) => `A scratch map of the world with ${n} countries scratched clean`,
      tally: (n, w) => `A tally of the world's ${w} countries, ${n} squares scratched`,
      ledger: 'Entry stamps, in the order I went',
      arrived: 'Arrived', rail: 'By rail', road: 'By road',
    },
    zh: {
      home: '家', year: (y) => `${y} 年`,
      map: (n) => `一張刮刮世界地圖，刮開了 ${n} 個國家`,
      tally: (n, w) => `全世界 ${w} 個國家，一國一格，刮開了 ${n} 格`,
      ledger: '入境章，照我去的先後',
      arrived: '入境', rail: '火車入境', road: '陸路入境',
    },
  };
  const t = () => WORDS[FP.lang];
  const caps = (s) => (FP.lang === 'zh' ? s : s.toUpperCase());
  const C = FP.counts;

  /* ------------------------------------------------------------ colours, from the stylesheet */

  const rootStyle = getComputedStyle(document.documentElement);
  const PAL = {};
  ['paper', 'paper-2', 'ink', 'ink-2', 'ink-3', 'hair', 'route', 'clay', 'olive', 'slate', 'ochre', 'foil', 'foil-lo', 'foil-hi', 'sl-gold']
    .forEach((k) => { PAL[k] = rootStyle.getPropertyValue('--' + k).trim(); });
  const CONTINENT = { asia: 'clay', europe: 'slate', oceania: 'olive', 'north-america': 'ochre' };
  const colourOf = (c) => PAL[c.home ? 'route' : CONTINENT[c.continent] || 'clay'];

  // a colour as red, green, blue, whatever the stylesheet wrote it in
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function rgb(css) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  // the same scratches on every visit
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let r = Math.imul(a ^ (a >>> 15), 1 | a);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

  /* ------------------------------------------------------------ his countries, in the order he went */

  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));

  // the first time he crossed into a country: the leg, how, and where
  function entryOf(c) {
    const j = journeyById.get(c.journeys[0]);
    for (const l of j.legs) {
      const to = placeByCity.get(l.to.city), from = placeByCity.get(l.from.city);
      if (to && to.country === c.id && !(from && from.country === c.id)) {
        const via = l.mode === 'flight' ? 'air' : l.mode === 'train' ? 'rail' : 'road';
        return { j, via, code: via === 'air' ? l.to.code || null : null };
      }
    }
    return { j, via: null, code: null };
  }
  // by his first trip there, then as that trip reached them
  const visitKey = (c) => `${c.journeys[0]}|${String(journeyById.get(c.journeys[0]).countries.indexOf(c.id)).padStart(2, '0')}`;
  const visits = FP.abroad.slice().sort((a, b) => visitKey(a).localeCompare(visitKey(b)))
    .map((c, i) => ({ c, i, year: c.first, ...entryOf(c), rot: (hash(c.id) - 0.5) * 8, pressed: false }));

  // the ledger's years: only those with a stamp
  const groups = [];
  for (const v of visits) {
    let g = groups[groups.length - 1];
    if (!g || g.year !== v.year) groups.push((g = { year: v.year, list: [] }));
    g.list.push(v);
  }

  // shapes and inks: varied, never the same as the stamps just before
  const SHAPES = ['ring', 'rect', 'oval', 'octagon', 'round', 'hex'];
  const INKS = ['clay', 'olive', 'slate', 'umber', 'blue'];
  const FAMILY = { clay: 'warm', umber: 'warm', olive: 'green', slate: 'cool', blue: 'cool' };
  (() => {
    const usedS = {}, usedI = {};
    SHAPES.forEach((s) => { usedS[s] = 0; }); INKS.forEach((s) => { usedI[s] = 0; });
    const pick = (opts, used, bad, seed) => {
      const ok = opts.filter((o) => !bad.has(o));
      const pool = ok.length ? ok : opts;
      const min = Math.min(...pool.map((o) => used[o]));
      const least = pool.filter((o) => used[o] === min);
      return least[Math.floor(seed * least.length)];
    };
    visits.forEach((v, i) => {
      const before = visits.slice(Math.max(0, i - 3), i);
      const badS = new Set(before.map((o) => o.shape));
      const badI = new Set(before.slice(-2).map((o) => o.ink));
      if (i) INKS.filter((k) => FAMILY[k] === FAMILY[visits[i - 1].ink]).forEach((k) => badI.add(k));
      v.shape = pick(SHAPES, usedS, badS, hash(v.c.id + 's')); usedS[v.shape]++;
      v.ink = pick(INKS, usedI, badI, hash(v.c.id + 'i')); usedI[v.ink]++;
    });
  })();

  /* ------------------------------------------------------------ the page */

  const stage = document.getElementById('stage');
  stage.innerHTML = `<div class="sl-page">
      <div class="sl-row">
        <div class="sl-sheet">
          <canvas class="sl-base" aria-hidden="true"></canvas>
          <canvas class="sl-edge" aria-hidden="true"></canvas>
          <canvas class="sl-foil" aria-hidden="true"></canvas>
          <canvas class="sl-dust" role="img"></canvas>
          <canvas class="sl-hl" aria-hidden="true"></canvas>
          <p class="sl-title" aria-hidden="true"></p>
          <p class="sl-home fp-label"></p>
        </div>
        <section class="sl-count">
          <div class="sl-count__head">
            <h1 class="sl-count__label fp-label"></h1>
            <p class="sl-count__n"><span></span></p>
            <p class="sl-count__w"></p>
          </div>
          <div class="sl-count__foot">
            <p class="sl-share"></p>
            <div class="sl-tally">
              <canvas class="sl-base" aria-hidden="true"></canvas>
              <canvas class="sl-edge" aria-hidden="true"></canvas>
              <canvas class="sl-foil" aria-hidden="true"></canvas>
              <canvas class="sl-dust" role="img"></canvas>
              <span class="sl-tally__mark" aria-hidden="true"></span>
            </div>
          </div>
        </section>
      </div>
      <section class="sl-ledger"></section>
    </div>`;
  const page = stage.querySelector('.sl-page');
  const sheet = stage.querySelector('.sl-sheet');
  const cv = {
    base: sheet.querySelector('.sl-base'), edge: sheet.querySelector('.sl-edge'),
    foil: sheet.querySelector('.sl-foil'), dust: sheet.querySelector('.sl-dust'), hl: sheet.querySelector('.sl-hl'),
  };
  const homeEl = sheet.querySelector('.sl-home');
  const titleEl = sheet.querySelector('.sl-title');
  const count = stage.querySelector('.sl-count');
  const head = count.querySelector('.sl-count__head');
  const foot = count.querySelector('.sl-count__foot');
  const numEl = count.querySelector('.sl-count__n span');
  const tally = count.querySelector('.sl-tally');
  const tv = {
    base: tally.querySelector('.sl-base'), edge: tally.querySelector('.sl-edge'),
    foil: tally.querySelector('.sl-foil'), dust: tally.querySelector('.sl-dust'),
  };
  const markEl = tally.querySelector('.sl-tally__mark');
  const ledger = stage.querySelector('.sl-ledger');

  // the stamps' ink: uneven cover, a slightly rough edge; a few versions so no two print alike
  const FILTERS = 5;
  const inks = el('svg', { class: 'sl-inks', 'aria-hidden': 'true', focusable: 'false' });
  document.body.appendChild(inks);
  const inkDefs = el('defs', null, inks);
  for (let i = 0; i < FILTERS; i++) {
    const f = el('filter', { id: `sl-ink-${i}`, x: '-12%', y: '-12%', width: '124%', height: '124%', 'color-interpolation-filters': 'sRGB' }, inkDefs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.7', numOctaves: '2', seed: String(3 + i * 7), result: 'fine' }, f);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: String(41 + i * 13), result: 'blot' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'fine', scale: '0.8', xChannelSelector: 'R', yChannelSelector: 'G', result: 'rough' }, f);
    el('feColorMatrix', { in: 'fine', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 -4.1', result: 'speck' }, f);
    el('feColorMatrix', { in: 'blot', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.1', result: 'patch' }, f);
    el('feComposite', { in: 'speck', in2: 'patch', operator: 'arithmetic', k1: '1', k2: '0', k3: '0', k4: '0', result: 'cover' }, f);
    el('feComposite', { in: 'rough', in2: 'cover', operator: 'in' }, f);
  }

  // the figures' own height inside their line, so the line box can be trimmed to them
  function trimNumber() {
    const g = probe, size = 200;
    g.font = `400 ${size}px "Playfair Display"`;
    // the page sets the figures lining, which a canvas cannot: they stand as tall as the capitals
    const m = g.measureText('H'), o = g.measureText('0');
    if (!m.fontBoundingBoxAscent) return;
    const fa = m.fontBoundingBoxAscent / size, fd = m.fontBoundingBoxDescent / size;
    const base = (1 - (fa + fd)) / 2 + fa; // the baseline, from the top of a line one em high
    // (and their round tops rise a little above the capitals' flat ones)
    const top = base - m.actualBoundingBoxAscent / size - 0.024, bottom = base + Math.max(0, o.actualBoundingBoxDescent) / size;
    count.style.setProperty('--nt', top.toFixed(4));
    count.style.setProperty('--nb', (1 - bottom).toFixed(4));
  }

  function words() {
    const w = FP.w, zh = FP.lang === 'zh';
    count.querySelector('.sl-count__label').textContent = w.where;
    numEl.textContent = FP.fmt(C.countries);
    count.querySelector('.sl-count__w').textContent = w.countries(C.countries);
    // "10.3% of the world's 195 countries" / 「全世界 195 個國家的 10.3%」
    const pct = `<b>${FP.esc(w.pct(C.share))}</b>`, of = `<span>${FP.esc(w.ofWorld(C.world))}</span>`;
    count.querySelector('.sl-share').innerHTML = zh ? `${of}${pct}` : `${pct}${of}`;
    homeEl.textContent = t().home;
    titleEl.textContent = w.where;
    cv.dust.setAttribute('aria-label', t().map(C.countries));
    tv.dust.setAttribute('aria-label', t().tally(C.countries, C.world));
    ledger.setAttribute('aria-label', t().ledger);
  }

  /* ------------------------------------------------------------ textures (the scratch map's) */

  // fine foil grain, brushed a little along its length
  function grainTile(size, seed) {
    const r = rng(seed), lo = rgb(PAL['foil-lo']), hi = rgb(PAL['foil-hi']);
    const c = canvasOf(size, size), g = c.getContext('2d');
    const img = g.createImageData(size, size), d = img.data, row = new Float32Array(size);
    for (let y = 0; y < size; y++) {
      const lift = (r() * 2 - 1) * 0.35; // each brushed line a touch lighter or darker
      for (let x = 0; x < size; x++) row[x] = r() * 2 - 1;
      for (let x = 0; x < size; x++) {
        let s = 0;
        for (let k = -3; k <= 3; k++) s += row[(x + k + size) % size];
        let v = row[x] * 0.55 + (s / 7) * 1.1 + lift;
        v = Math.max(-1, Math.min(1, v));
        const i = (y * size + x) * 4, src = v > 0 ? hi : lo;
        const glint = r() < 0.01; // now and then a grain catches the light
        d[i] = src[0]; d[i + 1] = src[1]; d[i + 2] = src[2]; d[i + 3] = glint ? 230 : Math.abs(v) * (v > 0 ? 120 : 70);
        if (glint) { d[i] = hi[0]; d[i + 1] = hi[1]; d[i + 2] = hi[2]; }
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  // a very soft sheen: a few broad patches of light and shade, from noise, never a gradient
  function sheenOf(w, h, seed) {
    const r = rng(seed), lo = rgb(PAL['foil-lo']), hi = rgb(PAL['foil-hi']);
    const sw = 10, sh = 5, small = canvasOf(sw, sh), g = small.getContext('2d');
    const img = g.createImageData(sw, sh), d = img.data;
    for (let i = 0; i < sw * sh; i++) {
      const v = r() * 2 - 1, src = v > 0 ? hi : lo;
      d[i * 4] = src[0]; d[i * 4 + 1] = src[1]; d[i * 4 + 2] = src[2]; d[i * 4 + 3] = Math.abs(v) * (v > 0 ? 255 : 120);
    }
    g.putImageData(img, 0, 0);
    const mid = canvasOf(sw * 8, sh * 8), m = mid.getContext('2d');
    m.imageSmoothingQuality = 'high';
    m.drawImage(small, 0, 0, mid.width, mid.height);
    const big = canvasOf(w, h), b = big.getContext('2d');
    b.imageSmoothingQuality = 'high';
    b.drawImage(mid, 0, 0, w, h);
    return big;
  }
  // the paper's own tooth, on the printed colour
  function toothTile(size, seed) {
    const r = rng(seed), ink = rgb(PAL.ink), paper = rgb(PAL.paper);
    const c = canvasOf(size, size), g = c.getContext('2d');
    const img = g.createImageData(size, size), d = img.data;
    for (let i = 0; i < size * size; i++) {
      const v = r() * 2 - 1, src = v > 0 ? paper : ink;
      d[i * 4] = src[0]; d[i * 4 + 1] = src[1]; d[i * 4 + 2] = src[2]; d[i * 4 + 3] = Math.abs(v) * (v > 0 ? 22 : 13);
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  const GRAIN = { tile: null };
  const grain = () => GRAIN.tile || (GRAIN.tile = grainTile(160, 17));
  const TOOTH = { tile: null };
  const tooth = () => TOOTH.tile || (TOOTH.tile = toothTile(128, 7));

  /* ------------------------------------------------------------ the coin (the scratch map's) */

  // a shape as a mask of css pixels, for planning the strokes and for the pointer
  function maskOf(p2d, b) {
    const bx = Math.floor(b[0][0]) - 2, by = Math.floor(b[0][1]) - 2;
    const bw = Math.max(1, Math.ceil(b[1][0]) - bx + 3), bh = Math.max(1, Math.ceil(b[1][1]) - by + 3);
    const c = canvasOf(bw, bh), g = c.getContext('2d', { willReadFrequently: true });
    g.translate(-bx, -by);
    g.fill(p2d);
    const a = g.getImageData(0, 0, bw, bh).data;
    const m = new Uint8Array(bw * bh);
    for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 110 ? 1 : 0;
    return {
      bx, by, bw, bh,
      has: (x, y) => { const i = Math.floor(x - bx), j = Math.floor(y - by); return i >= 0 && j >= 0 && i < bw && j < bh && m[j * bw + i] === 1; },
    };
  }

  // a coin worked back and forth across the shape, a little aslant, the way a right hand goes
  function planStrokes(it, w, r, ring) {
    const m = it.mask;
    if (it.tiny) {
      if (it.pt) it.strokes.push({ dab: true, x: it.pt[0], y: it.pt[1], r: ring + 0.4 });
      return;
    }
    const ang = ((-27 + (r() * 2 - 1) * 11) * Math.PI) / 180;
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const cx = m.bx + m.bw / 2, cy = m.by + m.bh / 2;
    let n0 = Infinity, n1 = -Infinity, d0 = Infinity, d1 = -Infinity;
    for (const [x, y] of [[m.bx, m.by], [m.bx + m.bw, m.by], [m.bx, m.by + m.bh], [m.bx + m.bw, m.by + m.bh]]) {
      const n = (x - cx) * nx + (y - cy) * ny, d = (x - cx) * ux + (y - cy) * uy;
      n0 = Math.min(n0, n); n1 = Math.max(n1, n); d0 = Math.min(d0, d); d1 = Math.max(d1, d);
    }
    const step = w * 0.54;
    const small = it.small;
    let flip = false;
    for (let s = n0 + step * 0.4; s < n1; s += step * (0.92 + r() * 0.16)) {
      // where this line runs over the shape
      const runs = [];
      let inside = false, from = 0, gap = 0;
      for (let d = d0; d <= d1 + 1; d += 0.75) {
        const x = cx + nx * s + ux * d, y = cy + ny * s + uy * d;
        const on = d <= d1 && m.has(x, y);
        if (on) { if (!inside) { if (runs.length && d - runs[runs.length - 1][1] < 2.2) { from = runs.pop()[0]; } else from = d; inside = true; } gap = d; }
        else if (inside) { runs.push([from, gap]); inside = false; }
      }
      for (const [a0, a1] of runs) {
        // most strokes overrun the border and are stopped by it; some fall short and leave foil
        const short = () => { const q = r(); return small ? -2 : q < 0.5 ? -2.5 : q < 0.84 ? r() * w * 0.9 : w * (0.9 + r() * 1.5); };
        let e0 = a0 + short(), e1 = a1 - short();
        if (a1 - a0 < 2) { e0 = a0 - 1.5; e1 = a1 + 1.5; }
        if (e1 - e0 < 0.8) continue;
        const jig = (r() * 2 - 1) * Math.min((2.5 * Math.PI) / 180, Math.atan((w * 0.22) / Math.max(1, (e1 - e0) / 2))); // the hand is not a ruler
        const mx = (e0 + e1) / 2, half = (e1 - e0) / 2;
        const vx = Math.cos(ang + jig), vy = Math.sin(ang + jig);
        const ox = cx + nx * s + ux * mx, oy = cy + ny * s + uy * mx;
        let ax = ox - vx * half, ay = oy - vy * half, bx = ox + vx * half, by = oy + vy * half;
        if (flip) [ax, ay, bx, by] = [bx, by, ax, ay];
        // the coin's edge leaves a few finer lines along each side and a ragged end
        const sub = [{ o: 0, w: w * 0.62, a: 1, s0: 0, s1: 0 }];
        for (let k = 0; k < 5; k++) {
          const o = (-0.5 + (k + 0.5) / 5) * w * 0.94;
          sub.push({ o, w: w * (0.16 + r() * 0.16), a: 0.72 + r() * 0.28, s0: (r() * 2 - 1) * w * 0.35, s1: (r() * 2 - 1) * w * 0.45 });
        }
        // the coin also scuffs the print: two or three hairlines along the stroke
        const scuffs = [];
        for (let q = 0, n = 1 + Math.floor(r() * 3); q < n; q++) scuffs.push({ o: (r() * 2 - 1) * w * 0.45, a: r() * 0.25, b: 0.75 + r() * 0.25, al: 0.12 + r() * 0.14 });
        const stroke = { ax, ay, bx, by, sub, scuffs, crumbs: [] };
        // a crumb or two of foil pushed off the end where the coin stopped short
        if (e1 < a1 - 1 && r() < 0.16) {
          const n = 1 + Math.floor(r() * 2);
          for (let k = 0; k < n; k++) {
            const along = 1.5 + r() * 3.5, side = (r() * 2 - 1) * w * 0.6, rad = 0.5 + r() * 0.9;
            const ex = flip ? ax : bx, ey = flip ? ay : by, sx = flip ? -vx : vx, sy = flip ? -vy : vy;
            const pts = [];
            const corners = 4 + Math.floor(r() * 2);
            for (let q = 0; q < corners; q++) {
              const th = (q / corners) * Math.PI * 2 + r() * 0.8, rr = rad * (0.6 + r() * 0.6);
              pts.push([ex + sx * along + nx * side + Math.cos(th) * rr, ey + sy * along + ny * side + Math.sin(th) * rr]);
            }
            stroke.crumbs.push(pts);
          }
        }
        it.strokes.push(stroke);
        flip = !flip;
      }
    }
  }

  // cut the foil (and its edge) up to the k-th stroke of a shape, on the map or on the tally
  function cutTo(X, it, k) {
    const { foil, edge, dust, dpr } = X;
    for (const g of [foil, edge]) {
      g.save();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'destination-out';
      g.strokeStyle = PAL.ink;
      g.fillStyle = PAL.ink;
      g.lineCap = 'round';
      const strokes = it.strokes.slice(it.done, k);
      const dabs = strokes.filter((s) => s.dab);
      for (const s of dabs) { g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill(); }
      if (dabs.length !== strokes.length) {
        g.clip(it.p);
        for (const s of strokes) {
          if (s.dab) continue;
          const dx = s.bx - s.ax, dy = s.by - s.ay, len = Math.hypot(dx, dy) || 1;
          const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
          for (const q of s.sub) {
            g.globalAlpha = q.a;
            g.lineWidth = q.w;
            g.beginPath();
            g.moveTo(s.ax + nx * q.o - ux * q.s0, s.ay + ny * q.o - uy * q.s0);
            g.lineTo(s.bx + nx * q.o + ux * q.s1, s.by + ny * q.o + uy * q.s1);
            g.stroke();
          }
        }
      }
      g.restore();
    }
    // the scuffs, on the print the coin has just bared
    const fresh = it.strokes.slice(it.done, k).filter((st) => st.scuffs);
    if (fresh.length) {
      dust.save();
      dust.setTransform(dpr, 0, 0, dpr, 0, 0);
      dust.clip(it.p);
      dust.strokeStyle = PAL['foil-hi'];
      dust.lineWidth = 0.45;
      for (const st of fresh) {
        const dx = st.bx - st.ax, dy = st.by - st.ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        for (const q of st.scuffs) {
          dust.globalAlpha = q.al;
          dust.beginPath();
          dust.moveTo(st.ax + dx * q.a + nx * q.o, st.ay + dy * q.a + ny * q.o);
          dust.lineTo(st.ax + dx * q.b + nx * q.o, st.ay + dy * q.b + ny * q.o);
          dust.stroke();
        }
      }
      dust.restore();
    }
    // the crumbs lie on top of everything
    dust.save();
    dust.setTransform(dpr, 0, 0, dpr, 0, 0);
    dust.fillStyle = PAL.foil;
    dust.strokeStyle = PAL['foil-lo'];
    dust.lineWidth = 0.4;
    for (const s of it.strokes.slice(it.done, k)) {
      for (const pts of s.crumbs || []) {
        dust.beginPath();
        pts.forEach(([x, y], i) => (i ? dust.lineTo(x, y) : dust.moveTo(x, y)));
        dust.closePath();
        dust.fill();
        dust.stroke();
      }
    }
    dust.restore();
    it.done = k;
  }

  /* ------------------------------------------------------------ a stamp (the passport stamps' drawing) */

  let defs = null; // the stamp being drawn keeps its curved lines in its own svg
  let arcN = 0;
  // shrink a line of text until it fits
  function fit(tx, max) {
    const len = tx.getComputedTextLength();
    if (len > max) tx.setAttribute('font-size', (parseFloat(tx.getAttribute('font-size')) * (max / len)).toFixed(2));
    return tx;
  }
  function text(g, cls, str, x, y, size, max) {
    const tx = el('text', { class: cls, x, y, 'font-size': size.toFixed(2), 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
    tx.textContent = str;
    return max ? fit(tx, max) : tx;
  }
  function arcText(g, cls, str, r, top, size, maxAngle) {
    const id = `sl-arc-${arcN++}`;
    el('path', { id, d: top ? `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0` : `M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0`, fill: 'none' }, defs);
    const tx = el('text', { class: cls, 'font-size': size.toFixed(2), 'dominant-baseline': 'central' }, g);
    const tp = el('textPath', { href: `#${id}`, startOffset: '50%', 'text-anchor': 'middle' }, tx);
    tp.textContent = str;
    return fit(tx, r * maxAngle);
  }
  const poly = (n, r, turn = 0) => Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');

  // the words on a stamp, in the current language
  function wordsOf(v) {
    const s = t();
    const name = caps(v.c.country[FP.lang]);
    if (v.code) return { name, big: v.code, date: caps(v.j.date[FP.lang]), mark: caps(s.arrived) };
    const mark = v.via === 'rail' ? s.rail : v.via === 'road' ? s.road : s.arrived;
    return { name, big: String(v.c.first), date: caps(mark), mark: '' };
  }

  // each shape draws itself around (0, 0) at size S
  const DRAW = {
    ring(g, S, w) {
      const R = S / 2, ri = R * 0.66, rm = (R + ri) / 2 - S * 0.005;
      el('circle', { class: 'st-edge', r: R - S * 0.017 }, g);
      el('circle', { class: 'st-line', r: ri }, g);
      arcText(g, 'st-name', w.name, rm, true, S * 0.105, 2.35);
      arcText(g, 'st-date', w.date, rm, false, S * 0.082, 2.2);
      el('circle', { class: 'st-fill', cx: -rm, cy: 0, r: S * 0.016 }, g);
      el('circle', { class: 'st-fill', cx: rm, cy: 0, r: S * 0.016 }, g);
      if (w.mark) text(g, 'st-mark', w.mark, 0, -ri * 0.48, S * 0.062, ri * 1.3);
      text(g, 'st-big', w.big, 0, w.mark ? ri * 0.16 : 0, S * (w.big.length > 3 ? 0.2 : 0.25), ri * 1.6);
    },
    rect(g, S, w) {
      const W = S * 1.34, H = S * 0.84, i = S * 0.065;
      el('rect', { class: 'st-edge', x: -W / 2, y: -H / 2, width: W, height: H }, g);
      el('rect', { class: 'st-line', x: -W / 2 + i, y: -H / 2 + i, width: W - 2 * i, height: H - 2 * i }, g);
      text(g, 'st-name', w.name, 0, -H * 0.27, S * 0.105, W - 4 * i);
      el('line', { class: 'st-line', x1: -W / 2 + i, x2: W / 2 - i, y1: -H * 0.12, y2: -H * 0.12 }, g);
      text(g, 'st-big', w.big, 0, H * 0.08, S * 0.24, W - 4 * i);
      text(g, 'st-date', w.date, 0, H * 0.3, S * 0.078, W - 4 * i);
    },
    oval(g, S, w) {
      const rx = S * 0.68, ry = S * 0.45;
      el('ellipse', { class: 'st-edge', rx, ry }, g);
      el('ellipse', { class: 'st-line', rx: rx - S * 0.075, ry: ry - S * 0.075 }, g);
      text(g, 'st-name', w.name, 0, -ry * 0.48, S * 0.098, rx * 1.15);
      text(g, 'st-big', w.big, 0, ry * 0.06, S * 0.21, rx * 1.3);
      text(g, 'st-date', w.date, 0, ry * 0.5, S * 0.074, rx * 1.05);
    },
    octagon(g, S, w) {
      const R = S * 0.54;
      el('polygon', { class: 'st-edge', points: poly(8, R, Math.PI / 8) }, g);
      el('polygon', { class: 'st-line', points: poly(8, R * 0.85, Math.PI / 8) }, g);
      if (w.mark) text(g, 'st-mark', w.mark, 0, -R * 0.5, S * 0.06, R * 1.1);
      text(g, 'st-name', w.name, 0, w.mark ? -R * 0.25 : -R * 0.34, S * 0.098, R * 1.5);
      text(g, 'st-big', w.big, 0, R * 0.1, S * 0.2, R * 1.4);
      text(g, 'st-date', w.date, 0, R * 0.44, S * 0.072, R * 1.25);
    },
    round(g, S, w) {
      const W = S * 1.16, H = S * 0.92, rr = S * 0.15;
      el('rect', { class: 'st-edge', x: -W / 2, y: -H / 2, width: W, height: H, rx: rr }, g);
      el('line', { class: 'st-line', x1: -W / 2 + S * 0.04, x2: W / 2 - S * 0.04, y1: -H * 0.14, y2: -H * 0.14 }, g);
      el('line', { class: 'st-line', x1: -W / 2 + S * 0.04, x2: W / 2 - S * 0.04, y1: H * 0.24, y2: H * 0.24 }, g);
      text(g, 'st-name', w.name, 0, -H * 0.32, S * 0.1, W - S * 0.16);
      text(g, 'st-big', w.big, 0, H * 0.05, S * 0.23, W - S * 0.2);
      text(g, 'st-date', w.date, 0, H * 0.37, S * 0.074, W - S * 0.2);
    },
    hex(g, S, w) {
      const R = S * 0.6;
      el('polygon', { class: 'st-edge', points: poly(6, R) }, g);
      el('polygon', { class: 'st-line', points: poly(6, R * 0.84) }, g);
      text(g, 'st-name', w.name, 0, -R * 0.36, S * 0.096, R * 1.15);
      text(g, 'st-big', w.big, 0, R * 0.05, S * 0.21, R * 1.3);
      text(g, 'st-date', w.date, 0, R * 0.42, S * 0.07, R * 1.0);
    },
  };
  // each shape's width and height, as a share of S
  const DIMS = { ring: [1, 1], rect: [1.34, 0.84], oval: [1.36, 0.9], octagon: [1, 1], round: [1.16, 0.92], hex: [1.2, 1.04] };
  // the box a stamp needs, turned a little as it was pressed, with room for its heavy edge
  function boxOf(v) {
    const th = (v.rot * Math.PI) / 180, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    const [dw, dh] = DIMS[v.shape];
    return [c * dw + s * dh + 0.05, s * dw + c * dh + 0.05];
  }
  visits.forEach((v) => { [v.fw, v.fh] = boxOf(v); });
  const tallest = Math.max(...visits.map((v) => v.fh));
  const widest = Math.max(...visits.map((v) => v.fw));
  // the ledger in two rows: each year's stamps fill the top row first, a lone stamp sits between the rows
  const colsOf = (g) => Math.ceil(g.list.length / 2);
  function ledgerWidthFactor() {
    let sum = 0, inner = 0;
    for (const g of groups) {
      const n = colsOf(g);
      for (let j = 0; j < n; j++) sum += Math.max(g.list[j].fw, g.list[j + n] ? g.list[j + n].fw : 0);
      inner += n - 1;
    }
    return { sum, inner };
  }

  /* ------------------------------------------------------------ the ledger */

  function drawLedger(S, narrow) {
    ledger.replaceChildren();
    arcN = 0;
    px(ledger, '--st-heavy', S * 0.03);
    px(ledger, '--st-thin', clamp(S * 0.011, 0.7, 1.1));
    for (const g of groups) {
      const box = document.createElement('div');
      box.className = 'sl-year' + (g.list.length === 1 ? ' sl-year--one' : '');
      box.style.setProperty('--cols', narrow ? 1 : colsOf(g));
      const label = document.createElement('p');
      label.className = 'sl-year__label fp-label';
      label.textContent = t().year(g.year);
      const list = document.createElement('ul');
      list.className = 'sl-year__stamps';
      box.append(label, list);
      ledger.appendChild(box);
      for (const v of g.list) {
        const li = document.createElement('li');
        li.className = 'sl-stamp';
        li.setAttribute('aria-label', `${v.c.country[FP.lang]}${FP.lang === 'zh' ? '，' : ', '}${FP.w.first(v.c.first)}`);
        list.appendChild(li);
        const bw = Math.ceil(v.fw * S), bh = Math.ceil(v.fh * S);
        const svg = el('svg', { width: bw, height: bh, viewBox: `${-bw / 2} ${-bh / 2} ${bw} ${bh}`, 'aria-hidden': 'true', focusable: 'false' }, li);
        defs = el('defs', null, svg);
        const turn = el('g', { transform: `rotate(${v.rot.toFixed(1)})` }, svg);
        const press = el('g', { class: `st-press ink-${v.ink}${v.pressed ? ' is-on' : ''}` }, turn);
        const inked = el('g', { filter: `url(#sl-ink-${v.i % FILTERS})` }, press);
        DRAW[v.shape](inked, S, wordsOf(v));
        v.node = press; v.li = li;
        stampPointer(li, v);
      }
    }
  }

  // a stamp presses into its place: a short, quiet scale and fade
  function press(v, animate) {
    if (v.pressed) return;
    v.pressed = true;
    if (!v.node) return;
    v.node.classList.add('is-on');
    if (animate && !FP.reduced) {
      v.node.animate(
        [{ opacity: 0, transform: 'scale(1.07)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 340, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
    }
  }

  /* ------------------------------------------------------------ the layout */

  const EXTENT = [[-180, -57], [180, 84]];
  const frame = d3.geoGraticule().extent(EXTENT).outline();
  function mapHeight(w) {
    const p = d3.geoNaturalEarth1().fitWidth(w, frame);
    const b = d3.geoPath(p).bounds(frame);
    return b[1][1] - b[0][1];
  }
  const topH = () => (document.querySelector('.fp-top') || {}).offsetHeight || 58;

  // the tally's squares, as wide as the count
  const COLS = 39;
  const ROWS = Math.ceil(C.world / COLS);
  function setTally(w) {
    const cell = w / COLS;
    const th = ROWS * cell - cell * 0.2;
    px(tally, '--tw', w);
    px(tally, '--th', th);
    px(count, '--cell', cell);
    return { cell, th };
  }

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const top = topH();
    const edge = Math.round(clamp(innerWidth * 0.032, 16, 40));
    const narrow = W < 700 || W / H < 1.12;
    document.body.classList.toggle('is-narrow', narrow);
    px(page, '--top', top);
    px(page, '--edge-x', edge);
    const avail = W - 2 * edge;

    // a short window: the gaps between things close up a little, so the count keeps its size
    const tight = !narrow && H < 640;
    page.classList.toggle('is-tight', tight);
    if (!narrow) {
      // the ledger first: two rows of stamps as wide as the page allows
      const G = Math.round(clamp(W * 0.017, 14, 30)), g = Math.round(clamp(W * 0.0062, 5, 9));
      const lw = ledgerWidthFactor();
      let S = (avail - (groups.length - 1) * G - lw.inner * g) / lw.sum;
      S = Math.floor(clamp(Math.min(S, H * 0.092), 30, 84));
      px(ledger, '--lg', G);
      px(ledger, '--sg', g);
      px(ledger, '--row', Math.ceil(tallest * S));
      drawLedger(S, false);
      const Lh = ledger.offsetHeight;
      const gapRL = Math.round(clamp(H * 0.032, tight ? 10 : 12, 34));
      const footPad = Math.round(clamp(H * 0.018, 6, 18));
      px(page, '--gap-rl', gapRL);
      px(page, '--foot', footPad);
      const Hr = Math.floor(H - top - 4 - gapRL - Lh - footPad);

      // then the count, as large as the room beside the map allows
      const fitCount = (labelled) => {
        count.classList.toggle('is-short', !labelled);
        count.style.removeProperty('--cw');
        let f = Math.min(W * 0.27, 480), cw = 0, colH = 0;
        for (let i = 0; i < 40; i++) {
          px(count, '--f', f);
          cw = Math.ceil(numEl.getBoundingClientRect().width);
          setTally(cw);
          px(count, '--cw', cw);
          colH = head.offsetHeight + foot.offsetHeight + Math.round(f * (tight ? 0.03 : 0.05));
          if (colH <= Hr) break;
          f *= clamp(Hr / colH, 0.9, 0.985);
        }
        const pw = avail - cw - cg;
        const pad = Math.round(clamp(pw * 0.02, 12, 20));
        const mapH = mapHeight(pw - 2 * pad);
        const ph = Math.min(Hr, Math.max(colH, Math.ceil(mapH + 2 * pad)));
        return { f, cw, colH, pw, pad, ph, free: ph - 2 * pad - mapH };
      };
      const cg = Math.round(clamp(W * 0.034, 24, 56));
      // the words "Where I have been" are the poster's title when it has paper enough above the map,
      // and otherwise a small label over the count (when even that has no room, for screen readers only)
      const titleH = titleEl.offsetHeight;
      let k = fitCount(false);
      const titled = k.free >= titleH + 22;
      if (!titled && Hr >= 430) k = fitCount(true);
      px(page, '--cg', cg);
      px(page, '--rowh', k.ph);
      px(sheet, '--pw', k.pw);
      px(sheet, '--ph', k.ph);
      return { narrow, W, H, pw: k.pw, ph: k.ph, pad: k.pad, S, f: k.f, titled, band: titled ? k.free * 0.75 : 0 };
    }

    // phones and tall windows: the poster with its title, the count, then the ledger, one under another
    const pad = 10;
    const pw = avail;
    const band = titleEl.offsetHeight + 22;
    const ph = Math.ceil(mapHeight(pw - 2 * pad) + 2 * pad + band);
    count.classList.add('is-short');
    count.style.removeProperty('--cw');
    let f = Math.min(avail / 1.06, H * 0.42, 360);
    for (let i = 0; i < 40; i++) {
      px(count, '--f', f);
      if (numEl.getBoundingClientRect().width <= avail) break;
      f *= 0.98;
    }
    setTally(avail);
    const g = 8;
    const S = Math.floor(clamp((avail - 3 * g) / (4 * widest), 50, 84));
    px(ledger, '--sg', g);
    drawLedger(S, true);
    px(page, '--rowh', 0);
    px(sheet, '--pw', pw);
    px(sheet, '--ph', ph);
    return { narrow, W, H, pw, ph, pad, S, f, titled: true, band };
  }

  /* ------------------------------------------------------------ the map and the tally */

  let W0 = null; // the world's shapes
  let M = null;  // the map as drawn now
  let T = null;  // the tally as drawn now
  let run = 0;   // the arrival in progress

  // France and the Netherlands without their lands overseas: he went to the European part
  const EUROPE = [[-12, 34], [32, 62]];
  function homeland(f) {
    if (!f || (f.id !== '250' && f.id !== '528') || f.geometry.type !== 'MultiPolygon') return f;
    const keep = f.geometry.coordinates.filter((p) => {
      const [x, y] = d3.geoCentroid({ type: 'Polygon', coordinates: p });
      return x > EUROPE[0][0] && x < EUROPE[1][0] && y > EUROPE[0][1] && y < EUROPE[1][1];
    });
    return { ...f, geometry: { type: 'MultiPolygon', coordinates: keep } };
  }

  function sizeCanvases(set, w, h, dpr) {
    for (const k in set) { set[k].width = Math.round(w * dpr); set[k].height = Math.round(h * dpr); }
  }

  function buildMap(lay) {
    const { pw, ph, pad } = lay;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(pw * dpr), chd = Math.round(ph * dpr);
    sizeCanvases(cv, pw, ph, dpr);
    const free = lay.narrow ? 0 : Math.max(0, ph - 2 * pad - mapHeight(pw - 2 * pad)) - lay.band;
    const projection = d3.geoNaturalEarth1().precision(0.25)
      .fitExtent([[pad, pad + lay.band], [pw - pad, ph - pad - (lay.titled ? free : 0)]], frame);
    const path = d3.geoPath(projection);
    // the title, in the band of paper above the map
    sheet.classList.toggle('has-title', lay.titled);
    if (lay.titled) px(titleEl, '--ty', (4 + path.bounds(frame)[0][1]) / 2 - titleEl.offsetHeight / 2);
    const P = (g) => { const s = path(g); return s ? new Path2D(s) : null; };

    const frameP = P(frame);
    const landP = P(W0.landNoPole);
    // the larger shores, for the waterline: an islet does not get one
    const shores = new Path2D();
    for (const f of W0.landNoPole.features) {
      const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      for (const poly of polys) {
        const part = { type: 'Polygon', coordinates: poly };
        if (path.area(part) > 60) shores.addPath(P(part));
      }
    }
    const bordersP = P(W0.borders);
    const gratP = P(d3.geoGraticule().extent(EXTENT).step([30, 30])());
    const scale = projection.scale();
    const coin = Math.max(2.6, Math.min(6, scale / 42)); // the coin's edge, in css pixels
    const ring = Math.max(2, Math.min(2.7, coin * 0.6)); // the printed ring of the smallest countries

    // Taiwan first, then his countries in the order he went
    const list = [{ c: FP.home, v: null }, ...visits.map((v) => ({ c: v.c, v }))];
    const items = list.map(({ c, v }, i) => {
      const f = homeland(c.home ? W0.home : W0.visited.find((x) => x.id === c.iso));
      const area = path.area(f);
      const pt = projection([c.ll[1], c.ll[0]]);
      const it = { c, v, f, p: P(f), area, pt, colour: colourOf(c), tiny: area < 9, small: area < 70, strokes: [], done: 0 };
      it.mask = maskOf(it.p, path.bounds(f));
      planStrokes(it, coin, rng(1009 * (i + 3)), ring);
      if (v) v.item = it;
      return it;
    });

    /* the print: the sea, the lines, and the colour beneath the foil */
    const base = cv.base.getContext('2d');
    base.setTransform(dpr, 0, 0, dpr, 0, 0);
    base.clearRect(0, 0, pw, ph);
    base.fillStyle = PAL['paper-2'];
    base.fill(frameP);
    base.save();
    base.clip(frameP);
    base.lineJoin = 'round';
    base.strokeStyle = PAL.hair;
    base.lineWidth = 0.6;
    base.stroke(gratP);
    // an engraved waterline round every coast
    const d = coin * 0.8;
    base.globalAlpha = 0.7;
    base.strokeStyle = PAL.hair; base.lineWidth = d * 2; base.stroke(shores);
    base.globalAlpha = 1;
    base.strokeStyle = PAL['paper-2']; base.lineWidth = d * 2 - 1; base.stroke(shores);
    base.restore();
    base.fillStyle = PAL.paper;
    base.fill(landP);
    for (const it of items) { base.fillStyle = it.colour; base.fill(it.p); }
    // the paper's tooth in the printed colour, then the borders printed in paper
    const printed = new Path2D();
    items.forEach((it) => printed.addPath(it.p));
    base.save();
    base.clip(printed);
    base.setTransform(1, 0, 0, 1, 0, 0);
    base.fillStyle = base.createPattern(tooth(), 'repeat');
    base.fillRect(0, 0, cw, chd);
    base.restore();
    base.strokeStyle = PAL.paper;
    base.lineWidth = 0.7;
    base.stroke(bordersP);
    // the smallest countries are printed as a dot in a ring, as the posters do
    for (const it of items) {
      if (!it.tiny || !it.pt) continue;
      base.beginPath(); base.arc(it.pt[0], it.pt[1], ring * 0.5, 0, Math.PI * 2);
      base.fillStyle = it.colour; base.fill();
      base.beginPath(); base.arc(it.pt[0], it.pt[1], ring, 0, Math.PI * 2);
      base.strokeStyle = PAL.paper; base.lineWidth = 0.8; base.stroke();
    }
    base.strokeStyle = PAL['ink-3'];
    base.lineWidth = 0.75;
    base.stroke(frameP);

    /* the foil, laid over every country, and its edge */
    const foil = cv.foil.getContext('2d');
    foil.setTransform(dpr, 0, 0, dpr, 0, 0);
    foil.clearRect(0, 0, pw, ph);
    foil.fillStyle = PAL.foil;
    foil.fill(landP);
    foil.save();
    foil.setTransform(1, 0, 0, 1, 0, 0);
    foil.globalCompositeOperation = 'source-atop';
    foil.drawImage(sheenOf(cw, chd, 31), 0, 0);
    foil.fillStyle = foil.createPattern(grain(), 'repeat');
    foil.fillRect(0, 0, cw, chd);
    foil.restore();
    // the borders and coasts printed on the foil
    foil.strokeStyle = PAL['foil-lo'];
    foil.lineWidth = 0.55;
    foil.stroke(bordersP);
    foil.lineWidth = 0.7;
    foil.stroke(landP);
    for (const it of items) { // the rings of the smallest, printed on the foil too
      if (!it.tiny || !it.pt) continue;
      foil.beginPath(); foil.arc(it.pt[0], it.pt[1], ring, 0, Math.PI * 2);
      foil.fillStyle = PAL.foil; foil.fill(); foil.stroke();
    }

    const edge = cv.edge.getContext('2d');
    edge.setTransform(dpr, 0, 0, dpr, 0, 0);
    edge.clearRect(0, 0, pw, ph);
    edge.fillStyle = PAL['foil-lo'];
    edge.fill(landP);
    for (const it of items) if (it.tiny && it.pt) { edge.beginPath(); edge.arc(it.pt[0], it.pt[1], ring, 0, Math.PI * 2); edge.fill(); }

    const dust = cv.dust.getContext('2d');
    dust.setTransform(dpr, 0, 0, dpr, 0, 0);
    dust.clearRect(0, 0, pw, ph);
    const hl = cv.hl.getContext('2d');
    hl.setTransform(dpr, 0, 0, dpr, 0, 0);
    hl.clearRect(0, 0, pw, ph);

    M = { dpr, items, foil, edge, dust, hl, path, projection, pw, ph };
    placeHome(lay);
  }

  function buildTally(lay) {
    const w = parseFloat(tally.style.getPropertyValue('--tw')) || 0;
    const cell = w / COLS;
    const h = parseFloat(tally.style.getPropertyValue('--th')) || 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    sizeCanvases(tv, w, h, dpr);
    const snap = (v) => Math.round(v * dpr) / dpr;
    const side = snap(Math.max(2, cell * 0.8));
    const squares = [];
    for (let i = 0; i < C.world; i++) {
      const x = snap((i % COLS) * cell), y = snap(Math.floor(i / COLS) * cell);
      const p = new Path2D();
      p.rect(x, y, side, side);
      squares.push({ i, x, y, s: side, p, strokes: [], done: 0, small: true, tiny: false });
    }
    const all = new Path2D();
    squares.forEach((q) => all.addPath(q.p));

    // beneath: gold, with the paper's tooth
    const base = tv.base.getContext('2d');
    base.setTransform(dpr, 0, 0, dpr, 0, 0);
    base.clearRect(0, 0, w, h);
    base.fillStyle = PAL['sl-gold'];
    base.fill(all);
    base.save();
    base.clip(all);
    base.setTransform(1, 0, 0, 1, 0, 0);
    base.fillStyle = base.createPattern(tooth(), 'repeat');
    base.fillRect(0, 0, tv.base.width, tv.base.height);
    base.restore();
    // the foil, its sheen and grain, and a line printed round each square
    const foil = tv.foil.getContext('2d');
    foil.setTransform(dpr, 0, 0, dpr, 0, 0);
    foil.clearRect(0, 0, w, h);
    foil.fillStyle = PAL.foil;
    foil.fill(all);
    foil.save();
    foil.setTransform(1, 0, 0, 1, 0, 0);
    foil.globalCompositeOperation = 'source-atop';
    foil.drawImage(sheenOf(tv.foil.width, tv.foil.height, 53), 0, 0);
    foil.fillStyle = foil.createPattern(grain(), 'repeat');
    foil.fillRect(0, 0, tv.foil.width, tv.foil.height);
    foil.restore();
    foil.strokeStyle = PAL['foil-lo'];
    foil.lineWidth = 0.5;
    for (const q of squares) foil.strokeRect(q.x + 0.25, q.y + 0.25, q.s - 0.5, q.s - 0.5);
    const edge = tv.edge.getContext('2d');
    edge.setTransform(dpr, 0, 0, dpr, 0, 0);
    edge.clearRect(0, 0, w, h);
    edge.fillStyle = PAL['foil-lo'];
    edge.fill(all);
    const dust = tv.dust.getContext('2d');
    dust.setTransform(dpr, 0, 0, dpr, 0, 0);
    dust.clearRect(0, 0, w, h);

    // the squares of his countries, one by one in the order he went, are the ones the coin will take
    const coin = Math.max(1.5, side * 0.42);
    for (const v of visits) {
      const q = squares[v.i];
      q.mask = maskOf(q.p, [[q.x, q.y], [q.x + q.s, q.y + q.s]]);
      planStrokes(q, coin, rng(733 * (v.i + 5)), 0);
      v.square = q;
    }
    T = { dpr, squares, foil, edge, dust, cell, side };
    void lay;
  }

  /* ------------------------------------------------------------ Taiwan's mark */

  function placeHome(lay) {
    const tw = M.items[0];
    if (!tw.pt) return;
    const b = M.path.bounds(tw.f);
    homeEl.classList.toggle('is-under', lay.narrow);
    if (lay.narrow) {
      px(homeEl, '--hx', tw.pt[0]);
      px(homeEl, '--hy', b[1][1] + 3);
    } else {
      px(homeEl, '--hx', b[1][0] + 4);
      px(homeEl, '--hy', tw.pt[1] - homeEl.offsetHeight / 2);
    }
  }

  /* ------------------------------------------------------------ the arrival */

  function build(animate) {
    const my = ++run;
    if (!animate) visits.forEach((v) => { v.pressed = true; });
    const lay = layout();
    buildMap(lay);
    buildTally(lay);
    light(null);

    // Taiwan, then each country in the order he first went; its square and its stamp go with it
    const total = 3600, lead = 420;
    const weights = M.items.map((it) => 70 + 20 * Math.sqrt(it.strokes.length + 1));
    const sum = weights.reduce((a, b) => a + b, 0);
    let at = lead;
    M.items.forEach((it, i) => { it.start = at; it.dur = (weights[i] / sum) * total; at += it.dur; });

    const step = (ms, moving) => {
      let busy = false;
      for (const it of M.items) {
        if (ms < it.start) { busy = true; continue; }
        const fr = Math.min(1, (ms - it.start) / it.dur);
        const k = Math.round(fr * it.strokes.length);
        if (k > it.done) cutTo(M, it, k);
        if (it.v) {
          const q = it.v.square, kq = Math.round(fr * q.strokes.length);
          if (kq > q.done) cutTo(T, q, kq);
          if (fr >= 1) press(it.v, moving);
        }
        if (fr < 1) busy = true;
      }
      return busy;
    };

    if (!animate) { step(Infinity, false); return; }
    const at0 = +query.get('at');
    if (at0) { step(at0, false); return; } // the arrival held still at that moment, for checking it
    const t0 = performance.now();
    const tick = (now) => {
      if (my !== run) return;
      if (step(now - t0, true)) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------ pointing */

  // one country lit at a time: on the map, its square in the tally and its stamp in the ledger
  let lit = null;
  function light(it) {
    lit = it;
    if (M) {
      const g = M.hl;
      g.clearRect(0, 0, M.pw, M.ph);
      if (it) {
        // the others pale a little, the one pointed at drawn round in ink
        g.save();
        g.globalAlpha = 0.5;
        g.fillStyle = PAL.paper;
        for (const o of M.items) {
          if (o === it || o.done < o.strokes.length) continue;
          g.fill(o.p);
          if (o.tiny && o.pt) { g.beginPath(); g.arc(o.pt[0], o.pt[1], 3, 0, Math.PI * 2); g.fill(); }
        }
        g.restore();
        g.strokeStyle = PAL.ink;
        g.lineJoin = 'round';
        g.lineWidth = 1.1;
        g.stroke(it.p);
        if (it.small && it.pt) { g.beginPath(); g.arc(it.pt[0], it.pt[1], 7, 0, Math.PI * 2); g.lineWidth = 1; g.stroke(); }
      }
      cv.hl.classList.toggle('is-on', !!it);
    }
    const v = it && it.v;
    ledger.classList.toggle('is-lit', !!v);
    for (const o of visits) if (o.li) o.li.classList.toggle('is-on', o === v);
    if (v && v.square) {
      px(markEl, '--mx', v.square.x);
      px(markEl, '--my', v.square.y);
      px(markEl, '--ms', v.square.s);
    }
    markEl.classList.toggle('is-on', !!(v && v.square));
  }
  const ready = (it) => it && it.strokes.length && it.done >= it.strokes.length;

  function hitMap(x, y) {
    if (!M) return null;
    const done = M.items.filter(ready);
    for (const it of done) if (it.small && it.pt && Math.hypot(x - it.pt[0], y - it.pt[1]) < 7) return it;
    for (const it of done) if (it.mask.has(x, y)) return it;
    return null;
  }
  function onMap(e) {
    const r = cv.dust.getBoundingClientRect();
    const it = hitMap(e.clientX - r.left, e.clientY - r.top);
    if (it !== lit) light(it);
    if (it) FP.tip(e.clientX, e.clientY, FP.about(it.c)); else FP.tip();
  }
  cv.dust.addEventListener('pointermove', onMap);
  cv.dust.addEventListener('pointerdown', onMap);
  cv.dust.addEventListener('pointerleave', () => { light(null); FP.tip(); });

  function onTally(e) {
    if (!T) return;
    const r = tv.dust.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const i = Math.floor(y / T.cell) * COLS + Math.floor(x / T.cell);
    const v = visits[i];
    const it = v && v.pressed && v.item ? v.item : null;
    if (it !== lit) light(it);
    if (it) FP.tip(e.clientX, e.clientY, FP.about(it.c)); else FP.tip();
  }
  tv.dust.addEventListener('pointermove', onTally);
  tv.dust.addEventListener('pointerdown', onTally);
  tv.dust.addEventListener('pointerleave', () => { light(null); FP.tip(); });

  function stampPointer(li, v) {
    const show = (e) => {
      if (!v.pressed || !v.item) return;
      if (lit !== v.item) light(v.item);
      FP.tip(e.clientX, e.clientY, FP.about(v.c));
    };
    li.addEventListener('pointerenter', show);
    li.addEventListener('pointermove', show);
    li.addEventListener('pointerdown', show);
    li.addEventListener('pointerleave', () => { light(null); FP.tip(); });
  }

  /* ------------------------------------------------------------ start */

  words();
  const fontsIn = Promise.all([
    document.fonts.load('400 120px "Playfair Display"', '0123456789%'),
    document.fonts.load('400 40px "Playfair Display"', 'countries'),
    document.fonts.load('600 11px "Geist"', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    document.fonts.load('500 11px "Geist"', 'of the world 0123456789'),
    document.fonts.load('500 40px "Noto Serif TC"', '個國家'),
    document.fonts.load('500 11px "Noto Sans TC"', '全世界個國家的我去過地方年入境火車陸路家'),
    document.fonts.load('600 11px "Noto Sans TC"', '馬來西亞荷蘭美國緬甸泰國德瑞士英阿拉伯聯合大公日本香港韓澳洲紐西蘭新加坡中法班牙安道爾越南'),
  ]).catch(() => null);
  Promise.all([FP.world('50m'), fontsIn, document.fonts ? document.fonts.ready : null]).then(([world]) => {
    W0 = {
      ...world,
      landNoPole: { type: 'FeatureCollection', features: world.features.filter((f) => f.id !== '010') },
    };
    trimNumber();
    build(!(FP.still || FP.reduced));
    let wait = 0;
    let size = `${stage.clientWidth}x${stage.clientHeight}`;
    addEventListener('resize', () => {
      clearTimeout(wait);
      wait = setTimeout(() => {
        const now = `${stage.clientWidth}x${stage.clientHeight}`;
        if (now !== size) { size = now; build(false); }
      }, 160);
    });
    FP.onLang(() => { words(); build(false); });
  });
})();
