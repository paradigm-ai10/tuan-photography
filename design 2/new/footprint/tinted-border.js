/* Hand-tinted atlas with a border of stamps 手工上色＋邊框印章 (footprint, round two, 2026-11-06).
   Round one's two favourites put together. The map is footprint-tinted's: Equal Earth cut at 60° south,
   the coasts engraved and the seas water-lined, his countries laid in watercolour. The stamps are
   footprint-stamps', but none sits on a country: they are set in the margin round the map, as the
   decorated frame of an old atlas sheet, each on the side nearest its country (the Americas on the
   left, Europe along the top, Asia and Oceania down the right and along the bottom), and a fine
   engraved hairline leads from each to the place he arrived. The lines are faint and darken when a
   stamp or a country is pointed at. The cartouche has grown to hold the count, set larger than on
   footprint-only, and the share of the world's countries.
   On arrival each country's wash is laid and its stamp pressed, one by one in the order he first went.
   On a phone the map comes first, then the cartouche, then the stamps in rows; a tapped stamp shows
   its line. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  const query = new URLSearchParams(location.search);
  if (query.get('lang') === 'zh' || query.get('lang') === 'en') FP.setLang(query.get('lang'));

  const stage = document.getElementById('stage');
  const body = document.body;
  const NS = 'http://www.w3.org/2000/svg';
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const STILL = FP.still || FP.reduced;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const MASK = '#000'; // the stencil for shapes worked on off screen; never seen

  /* ------------------------------------------------------------ the colourist's box (from footprint-tinted) */

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function rgb(color) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = MASK;
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  const BOX = ['--tb-ochre', '--tb-terra', '--tb-sage', '--tb-slate', '--tb-mauve', '--tb-verdigris'];
  // each country turns its colour a little: lightness and hue, from its own name
  function tone(token, seed) {
    const raw = cssVar(token);
    const m = raw.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/);
    if (!m) return { css: raw, rgb: rgb(raw) };
    const L = +m[1] + (rand(seed) - 0.5) * 5;
    const C = +m[2] * (0.9 + rand(seed + 1) * 0.2);
    const Hh = +m[3] + (rand(seed + 2) - 0.5) * 12;
    const css = `oklch(${L.toFixed(1)}% ${C.toFixed(3)} ${Hh.toFixed(1)})`;
    return { css, rgb: rgb(css) };
  }

  /* ------------------------------------------------------------ small tools */

  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const hashF = (s) => hashStr(s) / 4294967296; // 0 to 1, from a name
  function rand(n) { let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function hash2(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function noise(x, y, s) { // smooth value noise, 0 to 1
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // squared distance to the nearest zero cell (Felzenszwalb and Huttenlocher), in place
  const INF = 1e20;
  function edt(g, w, h) {
    const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    const line = (len) => {
      let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < len; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      for (let q = 0, k2 = 0; q < len; q++) { while (z[k2 + 1] < q) k2++; d[q] = (q - v[k2]) * (q - v[k2]) + f[v[k2]]; }
    };
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; line(h); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; line(w); for (let x = 0; x < w; x++) g[y * w + x] = d[x]; }
    return g;
  }
  // three box blurs, close to a gaussian, in place
  function blur(a, w, h, r) {
    const t = new Float32Array(a.length);
    const pass = (src, dst, n, m, stride, step) => {
      for (let j = 0; j < m; j++) {
        const o = j * stride;
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += src[o + clamp(i, 0, n - 1) * step];
        for (let i = 0; i < n; i++) {
          dst[o + i * step] = acc / (2 * r + 1);
          acc += src[o + Math.min(n - 1, i + r + 1) * step] - src[o + Math.max(0, i - r) * step];
        }
      }
    };
    for (let k2 = 0; k2 < 3; k2++) { pass(a, t, w, h, w, 1); pass(t, a, h, w, 1, w); }
  }
  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ------------------------------------------------------------ the frame's shape */

  const SOUTH = -60; // the old atlases stop here
  const UNIT = d3.geoEqualEarth().scale(1).translate([0, 0]);
  const XR = UNIT([179.9999, 0])[0], YT = UNIT([0, 90])[1], YB = UNIT([0, SOUTH])[1];
  const MW = 2 * XR, MH = YB - YT;
  const NEAT = 5; // the heavy outer rule stands this far off the map's edge
  // the map's half width at each height, to keep the stamps off it
  const RIM = d3.range(90, SOUTH - 0.01, -0.5).map((lat) => { const p = UNIT([179.9999, lat]); return [p[1], p[0]]; });
  function halfAt(uy) {
    if (uy <= RIM[0][0]) return RIM[0][1];
    for (let i = 1; i < RIM.length; i++) {
      if (RIM[i][0] >= uy) { const a = RIM[i - 1], b = RIM[i]; return a[1] + (b[1] - a[1]) * ((uy - a[0]) / (b[0] - a[0] || 1)); }
    }
    return RIM[RIM.length - 1][1];
  }
  // does a box [x0, y0, x1, y1] come within `pad` of the map?
  function hitsMap(r, pad, F) {
    const top = F.oy + YT * F.s - pad, bot = F.oy + YB * F.s + pad;
    const y0 = Math.max(r[1], top), y1 = Math.min(r[3], bot);
    for (let y = y0; y <= y1 + 1.99; y += 2) {
      const yy = Math.min(y, y1);
      const half = halfAt(clamp((yy - F.oy) / F.s, YT, YB)) * F.s + pad;
      if (r[0] < F.ox + half && r[2] > F.ox - half) return true;
    }
    return false;
  }
  // does the line from p to q pass through the box [x0, y0, x1, y1], grown by pad?
  function lineMeets(p, q, b, pad) {
    const x0 = b[0] - pad, y0 = b[1] - pad, x1 = b[2] + pad, y1 = b[3] + pad;
    for (let i = 0; i <= 40; i++) {
      const x = p[0] + (q[0] - p[0]) * (i / 40), y = p[1] + (q[1] - p[1]) * (i / 40);
      if (x > x0 && x < x1 && y > y0 && y < y1) return true;
    }
    return false;
  }
  const meets = (a, b, pad = 0) => a[0] < b[2] + pad && a[2] > b[0] - pad && a[1] < b[3] + pad && a[3] > b[1] - pad;

  /* ------------------------------------------------------------ the stamps (from footprint-stamps) */

  const SAY = {
    arrived: { en: 'Arrived', zh: '入境' },
    rail: { en: 'By rail', zh: '火車入境' },
    road: { en: 'By road', zh: '陸路入境' },
  };
  const say = (k) => SAY[k][FP.lang];
  const caps = (s) => (FP.lang === 'zh' ? s : s.toUpperCase());

  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));

  // the first time he crossed into a country: the leg, how, and where
  function entryOf(c) {
    const j = journeyById.get(c.journeys[0]);
    for (const l of j.legs) {
      const to = placeByCity.get(l.to.city), from = placeByCity.get(l.from.city);
      if (to && to.country === c.id && !(from && from.country === c.id)) {
        const via = l.mode === 'flight' ? 'air' : l.mode === 'train' ? 'rail' : 'road';
        return { j, via, code: via === 'air' ? l.to.code || null : null, at: to.ll };
      }
    }
    return { j, via: null, code: null, at: c.ll };
  }

  const SHAPES = ['ring', 'rect', 'oval', 'octagon', 'round', 'hex'];
  const INKS = ['clay', 'olive', 'slate', 'umber', 'blue'];
  const FAMILY = { clay: 'warm', umber: 'warm', home: 'warm', olive: 'green', slate: 'cool', blue: 'cool' };
  const DIMS = { ring: [1, 1], rect: [1.34, 0.84], oval: [1.36, 0.9], octagon: [1, 1], round: [1.16, 0.92], hex: [1.2, 1.04] };

  // in the order he first went: by his first trip there, then as that trip reached them
  const visitKey = (c) => `${c.journeys[0]}|${String(journeyById.get(c.journeys[0]).countries.indexOf(c.id)).padStart(2, '0')}`;
  const stamps = [
    { c: FP.home, home: true, at: FP.home.ll, code: 'TPE', rot: -3, shape: 'ring', ink: 'home' },
    ...FP.abroad.slice().sort((a, b) => visitKey(a).localeCompare(visitKey(b)))
      .map((c) => ({ c, ...entryOf(c), rot: (hashF(c.id) - 0.5) * 9 })),
  ];

  // shapes and inks: varied, and never the same as a close neighbour
  (function dress() {
    const usedS = {}, usedI = {};
    SHAPES.forEach((s) => { usedS[s] = 0; }); INKS.forEach((s) => { usedI[s] = 0; });
    for (const st of stamps) {
      if (st.home) continue;
      // by distance on the ground, so a country keeps its stamp at every window size
      const close = stamps.filter((o) => o !== st && (o.shape || o.home) && FP.km(o.at, st.at) < 1600);
      const badS = new Set(close.map((o) => o.shape)), badI = new Set(close.map((o) => o.ink));
      // and the closest neighbours not even in the same family of ink (the reds, the blues)
      for (const o of close) if (FP.km(o.at, st.at) < 1100) INKS.filter((k) => FAMILY[k] === FAMILY[o.ink]).forEach((k) => badI.add(k));
      const pick = (opts, used, bad, seed) => {
        const ok = opts.filter((o) => !bad.has(o));
        const pool = ok.length ? ok : opts;
        const min = Math.min(...pool.map((o) => used[o]));
        const least = pool.filter((o) => used[o] === min);
        return least[Math.floor(seed * least.length)];
      };
      st.shape = pick(SHAPES, usedS, badS, hashF(st.c.id + 's')); usedS[st.shape]++;
      st.ink = pick(INKS, usedI, badI, hashF(st.c.id + 'i')); usedI[st.ink]++;
    }
  })();

  // the side of the sheet each stamp is set on: the Americas left, Europe along the top, Asia and
  // Oceania down the right or along the bottom, whichever their place is nearer
  stamps.forEach((st) => {
    const ct = st.c.continent;
    if (ct === 'north-america' || ct === 'south-america') st.pref = 'left';
    else if (ct === 'europe' || ct === 'africa') st.pref = 'top';
    else {
      const [ux, uy] = UNIT([st.at[1], st.at[0]]);
      st.pref = XR - ux <= YB - uy ? 'right' : 'bottom';
    }
    st.pressed = false;
  });

  function sizeStamp(st, size) {
    st.size = size;
    const th = (st.rot * Math.PI) / 180, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
    const [dw, dh] = DIMS[st.shape];
    const w = dw * size, h = dh * size;
    st.hw = (c * w + s * h) / 2; st.hh = (s * w + c * h) / 2;
  }

  // the words on a stamp, in the current language
  function wordsOf(st) {
    if (st.home) return { name: caps(st.c.country[FP.lang]), big: caps(FP.w.home), date: st.code, mark: '' };
    const year = String(st.c.first);
    const date = caps(st.j.date[FP.lang]);
    const mark = st.via === 'rail' ? say('rail') : st.via === 'road' ? say('road') : say('arrived');
    if (st.code) return { name: caps(st.c.country[FP.lang]), big: st.code, date, mark: caps(say('arrived')) };
    return { name: caps(st.c.country[FP.lang]), big: year, date: caps(mark), mark: '' };
  }

  /* ------------------------------------------------------------ the page */

  const wrap = document.createElement('div'); wrap.className = 'tb-wrap';
  const sheet = document.createElement('div'); sheet.className = 'tb-sheet';
  const sea = document.createElement('canvas'); sea.className = 'tb-sea';
  const washCv = document.createElement('canvas'); washCv.className = 'tb-wash';
  const ink = el('svg', { class: 'tb-ink', 'aria-hidden': 'true' });
  sheet.append(sea, washCv, ink);
  const lines = el('svg', { class: 'tb-lines', 'aria-hidden': 'true' });
  const cart = document.createElement('div'); cart.className = 'tb-cart';
  // each stamp is its own small drawing in its own box, so pressing one moves only that box and the
  // ink (an SVG filter) is never painted again while it does
  const stampLayer = document.createElement('div'); stampLayer.className = 'tb-stamps'; stampLayer.setAttribute('aria-hidden', 'true');
  const inkSvg = el('svg', { class: 'tb-inks', width: 0, height: 0, 'aria-hidden': 'true' });
  const sdefs = el('defs', {}, inkSvg);
  wrap.append(sheet, lines, cart, stampLayer, inkSvg);
  stage.append(wrap);
  stage.setAttribute('aria-label', FP.w.where);

  // the ink of a stamp: uneven cover, a slightly rough edge; a few versions so no two print alike
  const FILTERS = 5;
  for (let i = 0; i < FILTERS; i++) {
    const f = el('filter', { id: `tb-ink-${i}`, x: '-12%', y: '-12%', width: '124%', height: '124%', 'color-interpolation-filters': 'sRGB' }, sdefs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.7', numOctaves: '2', seed: String(3 + i * 7), result: 'fine' }, f);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: String(41 + i * 13), result: 'blot' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'fine', scale: '0.9', xChannelSelector: 'R', yChannelSelector: 'G', result: 'rough' }, f);
    el('feColorMatrix', { in: 'fine', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 -4.1', result: 'speck' }, f);
    el('feColorMatrix', { in: 'blot', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.1', result: 'patch' }, f);
    el('feComposite', { in: 'speck', in2: 'patch', operator: 'arithmetic', k1: '1', k2: '0', k3: '0', k4: '0', result: 'cover' }, f);
    el('feComposite', { in: 'rough', in2: 'cover', operator: 'in' }, f);
  }

  let W = 0, H = 0, CH = 0, SH = 0, narrow = false;
  let proj = null, path = null, frame = null, k = 1, G = null;
  let atlas = null, bigLand = null, washes = [];
  const tones = new Map();
  let started = false, waiting = false, t0 = 0, raf = 0, timers = [];
  let active = null;

  /* ------------------------------------------------------------ the colours (from footprint-tinted) */

  // countries that touch, or lie a short sea apart, take different colours; among the free ones,
  // the colour least used so far
  function chooseTones() {
    const geoms = atlas.topo.objects.countries.geometries;
    const nb = topojson.neighbors(geoms);
    const touch = new Map();
    geoms.forEach((g, i) => { const set = touch.get(g.id) || new Set(); nb[i].forEach((j) => set.add(geoms[j].id)); touch.set(g.id, set); });
    const outline = new Map(FP.abroad.map((c) => {
      const all = atlas.features.filter((f) => f.id === c.iso);
      const pts = [];
      all.forEach((f) => {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
        polys.forEach((poly) => poly.forEach((ring) => ring.forEach((pt) => pts.push(pt))));
      });
      const step = Math.max(1, Math.floor(pts.length / 260));
      return [c.id, pts.filter((_, i) => i % step === 0).map(([x, y]) => [x * Math.PI / 180, y * Math.PI / 180])];
    }));
    const apart = (a, b) => { // km, roughly the narrowest sea between them
      const A = outline.get(a.id), B = outline.get(b.id);
      if (!A || !B || !A.length || !B.length) return Infinity;
      let m = Infinity;
      for (const p of A) for (const q of B) {
        const dl = q[1] - p[1], dn = q[0] - p[0];
        const h = Math.sin(dl / 2) ** 2 + Math.cos(p[1]) * Math.cos(q[1]) * Math.sin(dn / 2) ** 2;
        if (h < m) m = h;
      }
      return 2 * 6371 * Math.asin(Math.sqrt(m));
    };
    const picked = [], count = BOX.map(() => 0);
    tones.set(FP.home.id, { css: cssVar('--tb-home'), rgb: rgb(cssVar('--tb-home')) });
    FP.abroad.forEach((c) => {
      const near = picked.map((q) => {
        if ((touch.get(c.iso) || new Set()).has(q.c.iso)) return { b: q.b, w: 12 };
        const km = apart(c, q.c);
        return { b: q.b, w: km < 1400 ? 1 + 8 * (1 - km / 1400) : 0 };
      });
      const cost = BOX.map((_, b) => near.reduce((sum, n) => sum + (n.b === b ? n.w : 0), 0) + count[b] * 0.05);
      const b = cost.indexOf(Math.min(...cost));
      picked.push({ c, b }); count[b]++;
      tones.set(c.id, tone(BOX[b], hashStr(c.id)));
    });
  }

  /* ------------------------------------------------------------ the cartouche */

  function fillCart(lang) {
    const w = FP.WORDS[lang], n = FP.counts, zh = lang === 'zh';
    const pct = `<b>${FP.esc(w.pct(n.share))}</b>`, of = `<span>${FP.esc(w.ofWorld(n.world))}</span>`;
    cart.lang = zh ? 'zh-Hant' : 'en';
    cart.innerHTML = `<div class="tb-cart__in">
      <h1 class="tb-cart__title">${FP.esc(w.where)}</h1>
      <div class="tb-cart__rule"></div>
      <p class="tb-cart__n">${n.countries}</p>
      <p class="tb-cart__w">${FP.esc(w.countries(n.countries))}</p>
      <p class="tb-cart__share">${zh ? of + pct : pct + of}</p>
      <p class="tb-cart__more">${n.continents} ${FP.esc(w.continents(n.continents))}${zh ? '，' : ', '}${n.trips} ${FP.esc(w.trips(n.trips))}</p>
      <p class="tb-cart__span">${FP.esc(w.span(n.since, n.until))}</p>
    </div>`;
  }

  // the cartouche's size with the number at F, the larger of its two languages, so it never moves
  // when the language changes
  const sizes = new Map();
  function cartSize(F) {
    const key = Math.round(F * 2) / 2;
    if (sizes.has(key)) return sizes.get(key);
    cart.classList.add('is-measure');
    cart.style.setProperty('--F', `${key}px`);
    let w = 0, h = 0;
    for (const lang of ['en', 'zh']) { fillCart(lang); w = Math.max(w, cart.offsetWidth); h = Math.max(h, cart.offsetHeight); }
    cart.classList.remove('is-measure');
    fillCart(FP.lang);
    const r = { w: Math.ceil(w) + 2, h: Math.ceil(h) + 2 };
    sizes.set(key, r);
    return r;
  }

  // the land the cartouche keeps off: every coast but the small islands, which it may cover, as the
  // cartouches of the old maps covered the Pacific's
  function bigLandOf(topo) {
    const m = topojson.merge(topo, topo.objects.countries.geometries.filter((g) => g.id !== '010'));
    const area = (p) => { const a = d3.geoArea({ type: 'Polygon', coordinates: p }); return Math.min(a, 4 * Math.PI - a); };
    return { type: 'MultiPolygon', coordinates: m.coordinates.filter((p) => area(p) > 0.0006) };
  }

  /* ------------------------------------------------------------ the desk layout */

  // set things along a line: each wants a place, takes its own length, keeps `gap` from the next and
  // stays within [lo, hi]; the least shift from where each wants to be (pool adjacent violators)
  function spread(items, want, len, lo, hi, gap, keepOrder = false) {
    const n = items.length;
    if (!n) return true;
    if (!keepOrder) items.sort((a, b) => want(a) - want(b));
    const c = [0];
    for (let i = 1; i < n; i++) c[i] = c[i - 1] + len(items[i - 1]) / 2 + gap + len(items[i]) / 2;
    const blocks = [];
    items.forEach((it, i) => {
      blocks.push({ sum: want(it) - c[i], n: 1 });
      while (blocks.length > 1) {
        const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
        if (a.sum / a.n <= b.sum / b.n) break;
        a.sum += b.sum; a.n += b.n; blocks.pop();
      }
    });
    const ylo = lo + len(items[0]) / 2, yhi = hi - len(items[n - 1]) / 2 - c[n - 1];
    let i = 0;
    blocks.forEach((b) => { for (let j = 0; j < b.n; j++, i++) items[i].pos = clamp(b.sum / b.n, ylo, Math.max(ylo, yhi)) + c[i]; });
    return ylo <= yhi;
  }

  function deskLayout() {
    const edge = Math.round(clamp(W * 0.028, 16, 40));
    const top = 62, foot = 12;
    const S = Math.round(clamp(Math.min(W * 0.05, H * 0.088), 44, 76));
    stamps.forEach((st) => sizeStamp(st, st.home ? S * 0.96 : S));
    const gS = Math.max(7, Math.round(S * 0.16)); // between two stamps
    const gap = Math.round(clamp(S * 0.2, 9, 15)) + NEAT; // between the stamps and the map
    const rb = stamps.filter((st) => st.pref === 'right' || st.pref === 'bottom');
    const P = {
      edge, top, foot, S, gS, gap,
      colW: Math.ceil(Math.max(...rb.map((st) => 2 * st.hw))),
      rowTop: Math.ceil(Math.max(...stamps.filter((st) => st.pref === 'top').map((st) => 2 * st.hh))),
      rowBot: Math.ceil(Math.max(...rb.map((st) => 2 * st.hh))),
    };
    P.colLeft = W - edge - P.colW;
    const s0 = Math.min((P.colLeft - gap - edge) / MW, (H - top - foot - P.rowTop - P.rowBot - 2 * gap) / MH);

    // the number is set larger than footprint-only sets it (about 0.36 to 0.38 of the window's height)
    const Fneed = 0.418 * H, Ftop = 0.44 * H, Fmin = 0.22 * H;
    // the largest map that leaves room for it: the sheet in the middle of the window, or, when that
    // is not enough, the sheet up under the top bar so the cartouche can reach further down
    let pick = null;
    for (let i = 0, s = s0; i < 36 && s > 24 && !pick; i++, s *= 0.985) {
      for (const align of ['middle', 'top']) {
        const F = frameAt(s, P, align);
        const find = finder(F, P);
        let got = null;
        for (let f = Ftop; f >= Fneed - 0.01; f -= (Ftop - Fneed) / 3) {
          const sz = cartSize(f), at = find(sz);
          if (at) { got = { f, sz, at }; break; }
        }
        if (got) { pick = { s, align, got }; break; }
      }
    }
    if (!pick) { // the window is too small for the full number: the largest that fits, at a smaller map
      const s = s0 * 0.75, F = frameAt(s, P, 'top'), find = finder(F, P);
      for (let f = Fneed; f >= Fmin; f *= 0.96) { const sz = cartSize(f), at = find(sz); if (at) { pick = { s, align: 'top', got: { f, sz, at } }; break; } }
      if (!pick) pick = { s, align: 'top', got: { f: Fmin, sz: cartSize(Fmin), at: { x: edge, y: H - foot - cartSize(Fmin).h } } };
    }
    const F = frameAt(pick.s, P, pick.align);
    const c = pick.got;
    F.cart = { x: c.at.x, y: c.at.y, w: c.sz.w, h: c.sz.h, F: c.f };
    // in a tall window it may sit wholly under the sheet: then in the middle, under the map
    if (F.cart.y >= F.blockBottom - 1) F.cart.x = Math.round(F.ox - F.cart.w / 2);
    placeLeft(F, P);
    // the whole sheet sits in the middle of the window, side to side
    const boxes = [[F.cart.x, F.cart.x + F.cart.w], [F.ox - XR * F.s - NEAT, F.ox + XR * F.s + NEAT], ...stamps.map((st) => [st.x - st.hw, st.x + st.hw])];
    const minX = Math.min(...boxes.map((b) => b[0])), maxX = Math.max(...boxes.map((b) => b[1]));
    const shift = Math.round((W - minX - maxX) / 2);
    if (shift > 0) { F.ox += shift; F.cart.x += shift; stamps.forEach((st) => { st.x += shift; }); }
    if (F.cart.y >= F.blockBottom - 1) F.cart.x = Math.round((W - F.cart.w) / 2);
    F.contentH = H;
    F.S = S;
    return F;
  }

  // the map at scale s, and the stamps on the right, the top and the bottom round it
  function frameAt(s, P, align) {
    const blockH = P.rowTop + P.gap + MH * s + P.gap + P.rowBot;
    const blockTop = P.top + (align === 'top' ? 0 : Math.max(0, (H - P.top - P.foot - blockH) / 2));
    const mapTop = blockTop + P.rowTop + P.gap;
    const oy = mapTop - YT * s, mapBottom = oy + YB * s;
    const blockBottom = mapBottom + P.gap + P.rowBot;
    const ox = P.colLeft - P.gap - XR * s;
    const pj = d3.geoEqualEarth().scale(s).translate([ox, oy]);
    stamps.forEach((st) => { st.a = pj([st.at[1], st.at[0]]); st.side = st.pref; });
    // down the right; when the column is full, the southernmost go along the bottom
    const right = stamps.filter((st) => st.pref === 'right');
    const bottom = stamps.filter((st) => st.pref === 'bottom');
    const putR = (st) => { st.side = 'right'; st.x = P.colLeft + P.colW / 2; st.y = st.pos; };
    while (right.length && !lay(right, (st) => st.a[1], (st) => 2 * st.hh, blockTop, blockBottom, P.gS, putR)) {
      const south = right.reduce((a, b) => (b.a[1] > a.a[1] ? b : a));
      right.splice(right.indexOf(south), 1);
      bottom.push(south);
    }
    const topRow = stamps.filter((st) => st.pref === 'top');
    lay(topRow, (st) => st.a[0], (st) => 2 * st.hw, P.edge, P.colLeft - P.gS, P.gS,
      (st) => { st.side = 'top'; st.x = st.pos; st.y = blockTop + P.rowTop / 2; });
    const layBottom = () => lay(bottom, (st) => st.a[0], (st) => 2 * st.hw, P.edge, P.colLeft - P.gS, P.gS,
      (st) => { st.side = 'bottom'; st.x = st.pos; st.y = blockBottom - P.rowBot / 2; });
    layBottom();
    // a line from the column that crosses one from the bottom row: that stamp goes along the bottom too
    for (let n = 0; n < 6; n++) {
      const bad = right.filter((r) => bottom.some((b) => crosses(leadFrom(r), r.a, leadFrom(b), b.a)));
      if (!bad.length) break;
      const low = bad.reduce((a, b) => (b.y > a.y ? b : a));
      right.splice(right.indexOf(low), 1);
      bottom.push(low);
      lay(right, (st) => st.a[1], (st) => 2 * st.hh, blockTop, blockBottom, P.gS, putR);
      layBottom();
    }
    return { s, ox, oy, mapTop, mapBottom, blockTop, blockBottom, pj };
  }

  // a stamp's line starts at its inner edge, the side that faces the map
  function leadFrom(st) {
    if (st.side === 'top') return [st.x, st.y + st.hh + 2];
    if (st.side === 'right') return [st.x - st.hw - 2, st.y];
    if (st.side === 'left') return [st.x + st.hw + 2, st.y];
    return [st.x, st.y - st.hh - 2]; // the bottom row, and the rows under the map on a phone
  }
  function crosses(p1, p2, p3, p4) {
    const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    return ((d(p3, p4, p1) > 0) !== (d(p3, p4, p2) > 0)) && ((d(p1, p2, p3) > 0) !== (d(p1, p2, p4) > 0));
  }
  // a side's stamps in the order of their places, then any two neighbours whose lines cross swapped
  function lay(list, want, len, lo, hi, gap, put) {
    let ok = spread(list, want, len, lo, hi, gap);
    list.forEach(put);
    for (let pass = 0; pass < 12; pass++) {
      let swapped = false;
      for (let i = 0; i + 1 < list.length; i++) {
        const a = list[i], b = list[i + 1];
        if (crosses(leadFrom(a), a.a, leadFrom(b), b.a)) { list[i] = b; list[i + 1] = a; swapped = true; i++; }
      }
      if (!swapped) break;
      ok = spread(list, want, len, lo, hi, gap, true);
      list.forEach(put);
    }
    return ok;
  }

  // where the cartouche can go: a small map of what is taken (the land, the stamps, their lines, the
  // edges), and the free place nearest the sheet's lower left corner
  function finder(F, P) {
    const kk = 0.25, cw = Math.ceil(W * kk), ch = Math.ceil(H * kk);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.scale(kk, kk);
    ctx.fillStyle = MASK; ctx.strokeStyle = MASK; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 22;
    ctx.beginPath(); d3.geoPath(F.pj, ctx)(bigLand); ctx.fill(); ctx.stroke();
    // it may lie over the map's lower left corner, but the upper part of the curved edge stays in
    // sight, so the map reads as whole beneath it
    ctx.lineWidth = 26;
    ctx.beginPath();
    d3.range(90, 29, -2).forEach((lat, i) => { const [x, y] = F.pj([-179.9999, lat]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.fillRect(0, 0, W, P.top);
    ctx.fillRect(0, 0, P.edge, H); ctx.fillRect(W - P.edge, 0, P.edge, H); ctx.fillRect(0, H - P.foot, W, P.foot);
    ctx.fillRect(P.colLeft - P.gS, 0, W, H);
    ctx.lineWidth = 2 * P.gS;
    stamps.forEach((st) => {
      if (st.side !== 'top' && st.side !== 'bottom') return;
      ctx.fillRect(st.x - st.hw - P.gS, st.y - st.hh - P.gS, 2 * (st.hw + P.gS), 2 * (st.hh + P.gS));
      ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.lineTo(st.a[0], st.a[1]); ctx.stroke();
    });
    const px = ctx.getImageData(0, 0, cw, ch).data;
    const T = new Int32Array((cw + 1) * (ch + 1));
    for (let y = 0; y < ch; y++) {
      let row = 0;
      for (let x = 0; x < cw; x++) {
        row += px[(y * cw + x) * 4 + 3] > 10 ? 1 : 0;
        T[(y + 1) * (cw + 1) + x + 1] = T[y * (cw + 1) + x + 1] + row;
      }
    }
    const taken = (x0, y0, x1, y1) => T[y1 * (cw + 1) + x1] - T[y0 * (cw + 1) + x1] - T[y1 * (cw + 1) + x0] + T[y0 * (cw + 1) + x0];
    const maxC = F.ox - 0.9 * F.s; // it keeps to the Americas' side of the sheet
    // how far its right edge (and its paper margin) reaches past the map's curved left edge
    const reach = (X, Y, sz) => {
      let m = -Infinity;
      for (let y = Y; y <= Y + sz.h; y += 6) {
        if (y < F.mapTop - NEAT || y > F.mapBottom + NEAT) continue;
        m = Math.max(m, X + sz.w + 7 - (F.ox - halfAt(clamp((y - F.oy) / F.s, YT, YB)) * F.s - NEAT));
      }
      return m;
    };
    return (sz) => {
      const bw = Math.ceil(sz.w * kk) + 1, bh = Math.ceil(sz.h * kk) + 1;
      let best = null, bestD = Infinity;
      for (let y = 0; y + bh <= ch; y++) {
        for (let x = 0; x + bw <= cw; x++) {
          if ((x + bw / 2) / kk > maxC) break;
          if (taken(x, y, x + bw, y + bh)) continue;
          const X = x / kk, Y = y / kk;
          const r = reach(X, Y, sz);
          if (r > -14 && r < 40) continue; // it either lies well over the map's corner or clear of it, never grazing it
          const d = Math.abs(X - P.edge) + Math.abs(Y + sz.h - F.blockBottom);
          if (d < bestD) { bestD = d; best = { x: X, y: Y }; }
        }
      }
      if (best) { // square it up with the edge and the bottom row when it is that close
        if (Math.abs(best.x - P.edge) < 2 / kk) best.x = P.edge;
        if (Math.abs(best.y + sz.h - F.blockBottom) < 2 / kk) best.y = F.blockBottom - sz.h;
      }
      return best;
    };
  }

  // the Americas, in the left margin above the cartouche, as near their place's height as they can be
  function placeLeft(F, P) {
    const cartBox = [F.cart.x, F.cart.y, F.cart.x + F.cart.w, F.cart.y + F.cart.h];
    const done = stamps.filter((st) => st.side !== 'left');
    stamps.filter((st) => st.side === 'left').sort((a, b) => a.a[1] - b.a[1]).forEach((st) => {
      let best = null;
      for (let x = F.cart.x + st.hw; x <= F.cart.x + st.hw + 4 * P.S && !best; x += P.S / 2) {
        for (let y = P.top + 4 + st.hh; y <= H - P.foot - st.hh; y += 2) {
          const r = [x - st.hw, y - st.hh, x + st.hw, y + st.hh];
          if (hitsMap(r, P.gap, F) || meets(r, cartBox, P.gS) || r[1] < P.top) continue;
          if (done.some((o) => meets(r, [o.x - o.hw, o.y - o.hh, o.x + o.hw, o.y + o.hh], P.gS))) continue;
          if (lineMeets([x + st.hw + 2, y], st.a, cartBox, 10)) continue; // its line never passes under the cartouche
          const d = Math.abs(y - st.a[1]);
          if (!best || d < best.d) best = { x, y, d };
        }
      }
      if (best) { st.x = best.x; st.y = best.y; } else { // no room: at the left end of the top row
        const first = stamps.filter((o) => o.side === 'top').sort((a, b) => a.x - b.x)[0];
        st.side = 'top'; st.x = (first ? first.x - first.hw : W / 2) - P.gS - st.hw; st.y = first ? first.y : F.blockTop + st.hh;
      }
      done.push(st);
    });
  }

  /* ------------------------------------------------------------ the phone layout */

  function phoneLayout() {
    const side = 14, edge = 12;
    const s = (W - 2 * side) / MW;
    const mapTop = 14; // the stage starts under the top bar on a phone
    const oy = mapTop - YT * s, ox = W / 2, mapBottom = oy + YB * s;
    // the cartouche across the screen, the number as wide as it allows
    const cw = W - 2 * edge;
    let f = Math.min(cw / 1.15, H * 0.42);
    for (let i = 0; i < 4; i++) f = Math.min(f * (cw / cartSize(f).w), H * 0.42);
    f = Math.floor(f * 0.995);
    while (cartSize(f).w > cw) f -= 1;
    const sz = cartSize(f);
    const cart = { x: edge, y: Math.round(mapBottom + 26), w: cw, h: sz.h, F: f };
    // the stamps in rows of four, in the order he went, each as large as its column allows
    const cols = W < 350 ? 3 : 4;
    const gx = 16, cellW = (W - 2 * gx) / cols;
    const S = clamp(cellW / 1.08, 56, 96);
    stamps.forEach((st) => {
      sizeStamp(st, S);
      const fitW = (cellW * 0.94) / (2 * st.hw / S);
      sizeStamp(st, Math.min(S, fitW));
    });
    let y = cart.y + cart.h + 30;
    for (let i = 0; i < stamps.length; i += cols) {
      const row = stamps.slice(i, i + cols);
      const rh = Math.max(...row.map((st) => 2 * st.hh));
      row.forEach((st, j) => { st.side = 'below'; st.col = j; st.rowTop = y; st.x = gx + cellW * (j + 0.5); st.y = y + rh / 2; });
      y += rh + 16;
    }
    return { s, ox, oy, mapTop, mapBottom, cart, cols, contentH: Math.ceil(y + 18), S };
  }

  /* ------------------------------------------------------------ the sea: graticule, water-lining, neatline (from footprint-tinted) */

  function drawSea(L) {
    sea.width = Math.round(W * DPR); sea.height = Math.round(SH * DPR);
    const ctx = sea.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const water = cssVar('--tb-water'), inkC = cssVar('--ink');
    const framePath = new Path2D(frame);

    ctx.save();
    ctx.clip(framePath);

    // the graticule, every fifteen degrees, the equator a shade firmer
    const gpath = d3.geoPath(proj, ctx);
    ctx.strokeStyle = inkC; ctx.lineWidth = 0.4;
    ctx.globalAlpha = 0.22;
    ctx.beginPath(); gpath(d3.geoGraticule().step([15, 15]).extentMinor([[-180, SOUTH - 1], [180, 90]])()); ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); gpath({ type: 'LineString', coordinates: d3.range(-180, 181, 2).map((x) => [x, 0]) }); ctx.stroke();

    // the water-lining: lines at a set distance from every coast, closer near the shore, fading out
    // to sea. Distances are measured on the screen, as the engraver measured his plate.
    const g = narrow ? 1 : 1.25; // css px per cell
    const pad = 6;
    const x0 = L.ox - XR * L.s - pad * g, y0 = L.mapTop - pad * g;
    const gw = Math.ceil((2 * XR * L.s) / g) + 2 * pad, gh = Math.ceil((L.mapBottom - L.mapTop) / g) + 2 * pad;
    const mask = document.createElement('canvas'); mask.width = gw; mask.height = gh;
    const mc = mask.getContext('2d', { willReadFrequently: true });
    mc.setTransform(1 / g, 0, 0, 1 / g, -x0 / g, -y0 / g);
    mc.beginPath(); d3.geoPath(proj, mc)(atlas.land); mc.fillStyle = MASK; mc.fill();
    const md = mc.getImageData(0, 0, gw, gh).data;
    const field = new Float64Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) field[i] = md[i * 4 + 3] > 110 ? 0 : INF;
    edt(field, gw, gh);
    for (let i = 0; i < gw * gh; i++) field[i] = Math.sqrt(field[i]) * g;

    const sp = clamp(L.s / 251, 0.62, 1.15);
    const count = narrow ? 7 : 12;
    const th = d3.range(count).map((i) => (1.7 + 2.35 * i + 0.16 * i * i) * sp);
    const contours = d3.contours().size([gw, gh]).thresholds(th)(field);
    // an island alone in the ocean keeps two or three rings; a long coast keeps them all
    const dens = new Float32Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) dens[i] = md[i * 4 + 3] > 110 ? 1 : 0;
    blur(dens, gw, gh, Math.round(38 / g));
    const fade = document.createElement('canvas'); fade.width = gw; fade.height = gh;
    const fc = fade.getContext('2d');
    const fd = fc.createImageData(gw, gh);
    for (let i = 0; i < gw * gh; i++) {
      const near = 0.6 * Math.exp(-field[i] / (5.5 * sp));
      fd.data[i * 4 + 3] = 255 * clamp(Math.max(near, Math.pow(clamp(dens[i] / 0.045, 0, 1), 0.8)), 0, 1);
    }
    fc.putImageData(fd, 0, 0);
    const lay = document.createElement('canvas'); lay.width = sea.width; lay.height = sea.height;
    const lc = lay.getContext('2d');
    lc.setTransform(DPR * g, 0, 0, DPR * g, DPR * x0, DPR * y0);
    const cpath = d3.geoPath(null, lc);
    lc.strokeStyle = water; lc.lineWidth = (narrow ? 0.45 : 0.55) / g; lc.lineJoin = 'round';
    contours.forEach((c, i) => {
      lc.globalAlpha = 0.66 * Math.pow(1 - i / count, 1.4);
      lc.beginPath(); cpath(c); lc.stroke();
    });
    lc.globalAlpha = 1; lc.globalCompositeOperation = 'destination-in';
    lc.imageSmoothingEnabled = true;
    lc.drawImage(fade, 0, 0, gw, gh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(lay, 0, 0);
    ctx.restore();

    // the neatline: a heavy rule outside, a fine one on the edge of the map
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1; ctx.strokeStyle = inkC;
    ctx.lineWidth = 0.6; ctx.stroke(framePath);
    const gapN = narrow ? 2.5 : 3.5 * k;
    const outer = d3.geoEqualEarth().scale(L.s).translate([L.ox, L.oy]).precision(0.2);
    const f = L.s;
    const sx = (XR * f + gapN) / (XR * f), syT = (-YT * f + gapN) / (-YT * f), syB = (YB * f + gapN) / (YB * f);
    ctx.beginPath();
    const ring = [];
    for (let lat = 90; lat >= SOUTH; lat -= 1) ring.push(outer([180, lat]));
    for (let lat = SOUTH; lat <= 90; lat += 1) ring.push(outer([-180, lat]));
    ring.forEach(([x, y], i) => {
      const dx = (x - L.ox) * sx, dy = y - L.oy;
      const yy = L.oy + dy * (dy < 0 ? syT : syB);
      if (i) ctx.lineTo(L.ox + dx, yy); else ctx.moveTo(L.ox + dx, yy);
    });
    ctx.closePath();
    ctx.lineWidth = narrow ? 1 : 1.5; ctx.stroke();
  }

  /* ------------------------------------------------------------ the ink: coasts, borders, lettering */

  let labelLayer = null;
  function drawInk() {
    ink.replaceChildren();
    ink.setAttribute('viewBox', `0 0 ${W} ${SH}`);
    const clip = el('clipPath', { id: 'tb-frame' }, el('defs', {}, ink));
    el('path', { d: frame }, clip);
    const g = el('g', { 'clip-path': 'url(#tb-frame)' }, ink);
    el('path', { class: 'tb-border', d: path(atlas.borders) }, g);
    el('path', { class: 'tb-coast', d: path(atlas.land) }, g);
    // the small ones get a ring, so a dab of colour has something to sit in
    washes.filter((w) => w.dab).forEach((w) => el('circle', { class: 'tb-dot', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] }, g));
    const hits = el('g', {}, ink);
    labelLayer = el('g', {}, ink);
    washes.forEach((w) => {
      const h = w.dab ? el('circle', { class: 'tb-hit', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] + 6 }, hits)
        : el('path', { class: 'tb-hit', d: path(w.feature) }, hits);
      h.dataset.id = w.c.id;
    });
  }

  // the stamps name every country, so the map letters only the three that hold their names inside
  const LETTER = {
    usa: [-99, 39],
    china: [101.5, 33.5],
    australia: [134.5, -25.5],
  };
  function drawLabels() {
    if (!labelLayer) return;
    labelLayer.replaceChildren();
    if (narrow) return;
    const lang = FP.lang;
    washes.forEach((w) => {
      const at = LETTER[w.c.id];
      if (!at || !w.feature) return;
      const [x, y] = proj(at);
      const g = el('g', { class: 'tb-label' + (w.shown ? '' : ' is-wait') }, labelLayer);
      const t = el('text', { class: 'tb-name', x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle' }, g);
      const name = w.c.country[lang];
      t.appendChild(document.createTextNode(lang === 'zh' ? name : name.toUpperCase())); // the stamps carry the dates
      // only where it sits inside the country with room to spare at both ends
      const half = t.getComputedTextLength() / 2 + 4, cap = 8 * k;
      const inside = [[x - half, y], [x + half, y], [x - half, y - cap], [x + half, y - cap]]
        .every((p) => { const ll = proj.invert(p); return ll && d3.geoContains(w.feature, ll); });
      if (!inside) { g.remove(); return; }
      w.label = g;
    });
  }

  function drawCart() {
    const c = G.cart;
    cart.style.setProperty('--F', `${c.F}px`);
    cart.style.setProperty('--cw', `${c.w}px`);
    cart.style.setProperty('--ch', `${c.h}px`);
    cart.style.setProperty('--x', `${Math.round(c.x)}px`);
    cart.style.setProperty('--y', `${Math.round(c.y)}px`);
    fillCart(FP.lang);
  }

  /* ------------------------------------------------------------ the washes (from footprint-tinted) */

  // one sheet of wash per country, made once per layout: the shape a little off the line, the edge
  // uneven, pigment pooled along it, mottled in the middle, the paper's tooth showing through
  function makeWash(c, feature) {
    const id = c.id, seed = hashStr(id) & 0xffff;
    const col = tones.get(id).rgb;
    const area = feature ? path.area(feature) : 0;
    const nm = FP.names()[c.iso];
    let dab = null;
    if (!feature || area < 30) {
      const at = proj(nm ? nm.at : [c.ll[1], c.ll[0]]);
      dab = [at[0], at[1], clamp(3.2 * k, 2.6, 4)];
    }
    let b = feature ? path.bounds(feature) : [[dab[0], dab[1]], [dab[0], dab[1]]];
    if (dab) b = [[Math.min(b[0][0], dab[0] - dab[2]), Math.min(b[0][1], dab[1] - dab[2])], [Math.max(b[1][0], dab[0] + dab[2]), Math.max(b[1][1], dab[1] + dab[2])]];
    const pad = 4;
    const x0 = Math.floor(b[0][0] - pad), y0 = Math.floor(b[0][1] - pad);
    const x1 = Math.ceil(b[1][0] + pad), y1 = Math.ceil(b[1][1] + pad);
    const w = Math.max(2, Math.round((x1 - x0) * DPR)), h = Math.max(2, Math.round((y1 - y0) * DPR));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const off = [(rand(seed) - 0.5) * 2.2 * k, (rand(seed + 9) - 0.5) * 2.2 * k]; // the colourist's hand, a little off
    ctx.setTransform(DPR, 0, 0, DPR, (-x0 + off[0]) * DPR, (-y0 + off[1]) * DPR);
    ctx.fillStyle = MASK;
    if (feature) { ctx.beginPath(); d3.geoPath(proj, ctx)(feature); ctx.fill(); }
    if (dab) { ctx.beginPath(); ctx.arc(dab[0] - off[0], dab[1] - off[1], dab[2] * 0.92, 0, Math.PI * 2); ctx.fill(); }
    const img = ctx.getImageData(0, 0, w, h), px = img.data, N = w * h;
    const din = new Float64Array(N), dout = new Float64Array(N);
    for (let i = 0; i < N; i++) { const inside = px[i * 4 + 3] >= 128; din[i] = inside ? INF : 0; dout[i] = inside ? 0 : INF; }
    edt(din, w, h); edt(dout, w, h);
    const [r, gg, bb] = col;
    const lift = 1 / DPR;
    for (let y = 0, i = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i++) {
        const a = px[i * 4 + 3] / 255;
        let sd = a > 0.02 && a < 0.98 ? a - 0.5 : a >= 0.5 ? Math.sqrt(din[i]) - 0.5 : 0.5 - Math.sqrt(dout[i]);
        sd *= lift; // css px, positive inside
        if (sd < -2.5) { px[i * 4 + 3] = 0; continue; }
        const gx = x0 + x * lift, gy = y0 + y * lift;
        const ne = noise(gx / 5.5, gy / 5.5, seed) * 0.65 + noise(gx / 1.9, gy / 1.9, seed + 7) * 0.35;
        const e = sd + (ne - 0.5) * 1.9 + 0.15;
        const cov = clamp(e * DPR + 0.5, 0, 1);
        if (cov <= 0) { px[i * 4 + 3] = 0; continue; }
        const pool = Math.exp(-Math.max(e, 0) / 1.25);
        const mott = noise(gx / 24, gy / 24, seed + 3) * 0.6 + noise(gx / 8, gy / 8, seed + 5) * 0.4;
        const tooth = noise(gx / 1.15, gy / 1.15, 4242);
        let al = 0.44 + 0.22 * mott + 0.36 * pool;
        al *= 1 - 0.38 * tooth * tooth * tooth;
        const dk = 1 - 0.14 * pool;
        px[i * 4] = r * dk; px[i * 4 + 1] = gg * dk; px[i * 4 + 2] = bb * dk;
        px[i * 4 + 3] = clamp(cov * al, 0, 1) * 255;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(img, 0, 0);
    // the wash spreads from the place he went to
    const from = proj([c.ll[1], c.ll[0]]) || [(x0 + x1) / 2, (y0 + y1) / 2];
    const corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
    const reach = Math.max(...corners.map(([cx, cy]) => Math.hypot(cx - from[0], cy - from[1])));
    return { c, feature, cv, x0, y0, w: x1 - x0, h: y1 - y0, from, reach, dab, seed, shown: false, label: null };
  }

  // a country as he knows it: the largest of the shapes the atlas numbers alike, without the far-off
  // pieces (French Guiana is France on paper, but he has not been to South America)
  function homeland(c) {
    const all = atlas.features.filter((f) => f.id === c.iso);
    if (!all.length) return null;
    const f = all.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
    if (f.geometry.type !== 'MultiPolygon') return f;
    const nm = FP.names()[c.iso];
    const at = proj(nm ? nm.at : [c.ll[1], c.ll[0]]);
    const polys = f.geometry.coordinates.map((coordinates) => ({ coordinates, a: d3.geoArea({ type: 'Polygon', coordinates }), c: path.centroid({ type: 'Polygon', coordinates }) }));
    const total = polys.reduce((s, p) => s + p.a, 0);
    const far = 0.2 * (2 * proj.scale() * 2.7066);
    const keep = polys.filter((p) => p.a / total > 0.15 || Math.hypot(p.c[0] - at[0], p.c[1] - at[1]) < far);
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: keep.map((p) => p.coordinates) } };
  }

  /* ------------------------------------------------------------ the stamps on the sheet */

  let arcN = 0;
  function fitText(t, max) {
    const len = t.getComputedTextLength();
    if (len > max) t.setAttribute('font-size', (parseFloat(t.getAttribute('font-size')) * (max / len)).toFixed(2));
    return t;
  }
  function text(g, cls, str, x, y, size, max) {
    const t = el('text', { class: cls, x, y, 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
    t.textContent = str;
    return max ? fitText(t, max) : t;
  }
  function arcText(g, cls, str, r, top, size, maxAngle) {
    const id = `tb-arc-${arcN++}`;
    el('path', { id, d: top ? `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0` : `M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0`, fill: 'none' }, g.ownerSVGElement.querySelector('defs'));
    const t = el('text', { class: cls, 'font-size': size, 'dominant-baseline': 'central' }, g);
    const tp = el('textPath', { href: `#${id}`, startOffset: '50%', 'text-anchor': 'middle' }, t);
    tp.textContent = str;
    return fitText(t, r * maxAngle);
  }
  const poly = (n, r, turn = 0) => Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');

  // each shape draws itself around (0, 0) at size S
  const DRAW = {
    ring(g, S, w) {
      const R = S / 2, ri = R * 0.66, rm = (R + ri) / 2 - S * 0.005;
      el('circle', { class: 'tb-edge', r: R - S * 0.017 }, g);
      el('circle', { class: 'tb-line', r: ri }, g);
      arcText(g, 'tb-sname', w.name, rm, true, S * 0.105, 2.35);
      arcText(g, 'tb-date', w.date, rm, false, S * 0.082, 2.2);
      el('circle', { class: 'tb-fill', cx: -rm, cy: 0, r: S * 0.016 }, g);
      el('circle', { class: 'tb-fill', cx: rm, cy: 0, r: S * 0.016 }, g);
      if (w.mark) text(g, 'tb-mark', w.mark, 0, -ri * 0.48, S * 0.062, ri * 1.3);
      text(g, 'tb-big', w.big, 0, w.mark ? ri * 0.16 : 0, S * (w.big.length > 3 ? 0.2 : 0.25), ri * 1.6);
    },
    rect(g, S, w) {
      const Wd = S * 1.34, Hd = S * 0.84, i = S * 0.065;
      el('rect', { class: 'tb-edge', x: -Wd / 2, y: -Hd / 2, width: Wd, height: Hd }, g);
      el('rect', { class: 'tb-line', x: -Wd / 2 + i, y: -Hd / 2 + i, width: Wd - 2 * i, height: Hd - 2 * i }, g);
      text(g, 'tb-sname', w.name, 0, -Hd * 0.27, S * 0.105, Wd - 4 * i);
      el('line', { class: 'tb-line', x1: -Wd / 2 + i, x2: Wd / 2 - i, y1: -Hd * 0.12, y2: -Hd * 0.12 }, g);
      text(g, 'tb-big', w.big, 0, Hd * 0.08, S * 0.24, Wd - 4 * i);
      text(g, 'tb-date', w.date, 0, Hd * 0.3, S * 0.078, Wd - 4 * i);
    },
    oval(g, S, w) {
      const rx = S * 0.68, ry = S * 0.45;
      el('ellipse', { class: 'tb-edge', rx, ry }, g);
      el('ellipse', { class: 'tb-line', rx: rx - S * 0.075, ry: ry - S * 0.075 }, g);
      text(g, 'tb-sname', w.name, 0, -ry * 0.48, S * 0.098, rx * 1.15);
      text(g, 'tb-big', w.big, 0, ry * 0.06, S * 0.21, rx * 1.3);
      text(g, 'tb-date', w.date, 0, ry * 0.5, S * 0.074, rx * 1.05);
    },
    octagon(g, S, w) {
      const R = S * 0.54;
      el('polygon', { class: 'tb-edge', points: poly(8, R, Math.PI / 8) }, g);
      el('polygon', { class: 'tb-line', points: poly(8, R * 0.85, Math.PI / 8) }, g);
      if (w.mark) text(g, 'tb-mark', w.mark, 0, -R * 0.5, S * 0.06, R * 1.1);
      text(g, 'tb-sname', w.name, 0, w.mark ? -R * 0.25 : -R * 0.34, S * 0.098, R * 1.5);
      text(g, 'tb-big', w.big, 0, R * 0.1, S * 0.2, R * 1.4);
      text(g, 'tb-date', w.date, 0, R * 0.44, S * 0.072, R * 1.25);
    },
    round(g, S, w) {
      const Wd = S * 1.16, Hd = S * 0.92, rr = S * 0.15;
      el('rect', { class: 'tb-edge', x: -Wd / 2, y: -Hd / 2, width: Wd, height: Hd, rx: rr }, g);
      el('line', { class: 'tb-line', x1: -Wd / 2 + S * 0.04, x2: Wd / 2 - S * 0.04, y1: -Hd * 0.14, y2: -Hd * 0.14 }, g);
      el('line', { class: 'tb-line', x1: -Wd / 2 + S * 0.04, x2: Wd / 2 - S * 0.04, y1: Hd * 0.24, y2: Hd * 0.24 }, g);
      text(g, 'tb-sname', w.name, 0, -Hd * 0.32, S * 0.1, Wd - S * 0.16);
      text(g, 'tb-big', w.big, 0, Hd * 0.05, S * 0.23, Wd - S * 0.2);
      text(g, 'tb-date', w.date, 0, Hd * 0.37, S * 0.074, Wd - S * 0.2);
    },
    hex(g, S, w) {
      const R = S * 0.6;
      el('polygon', { class: 'tb-edge', points: poly(6, R) }, g);
      el('polygon', { class: 'tb-line', points: poly(6, R * 0.84) }, g);
      text(g, 'tb-sname', w.name, 0, -R * 0.36, S * 0.096, R * 1.15);
      text(g, 'tb-big', w.big, 0, R * 0.05, S * 0.21, R * 1.3);
      text(g, 'tb-date', w.date, 0, R * 0.42, S * 0.07, R * 1.0);
    },
  };

  function drawStamps() {
    stampLayer.replaceChildren();
    arcN = 0;
    stampLayer.style.setProperty('--st-heavy', `${clamp(G.S * 0.03, 1.4, 2.6).toFixed(2)}px`);
    stampLayer.style.setProperty('--st-thin', `${clamp(G.S * 0.011, 0.7, 1.05).toFixed(2)}px`);
    stamps.forEach((st, i) => {
      const pad = 3; // room for the rough edge of the ink
      const w = 2 * (st.hw + pad), h = 2 * (st.hh + pad);
      const box = document.createElement('div');
      box.className = 'tb-st' + (st.pressed ? '' : ' is-wait') + (st.c.id === active ? ' is-on' : '');
      box.dataset.id = st.c.id;
      box.style.setProperty('--x', `${(st.x - w / 2).toFixed(1)}px`);
      box.style.setProperty('--y', `${(st.y - h / 2).toFixed(1)}px`);
      box.style.setProperty('--w', `${w.toFixed(1)}px`);
      box.style.setProperty('--h', `${h.toFixed(1)}px`);
      stampLayer.appendChild(box);
      const svg = el('svg', { viewBox: `${(-w / 2).toFixed(1)} ${(-h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`, width: w.toFixed(1), height: h.toFixed(1) }, box);
      el('defs', {}, svg);
      const press = el('g', { class: `ink-${st.ink}`, transform: `rotate(${st.rot.toFixed(1)})` }, svg);
      DRAW[st.shape](el('g', { filter: `url(#tb-ink-${i % FILTERS})` }, press), st.size, wordsOf(st));
      st.node = box;
    });
  }

  // a fine hairline from the stamp's inner edge to the place he arrived, a dot at its end
  function drawLeaders() {
    lines.replaceChildren();
    lines.setAttribute('viewBox', `0 0 ${W} ${CH}`);
    lines.setAttribute('width', W); lines.setAttribute('height', CH);
    stamps.forEach((st) => {
      const g = el('g', { class: 'tb-leader' + (st.pressed ? '' : ' is-wait') + (st.c.id === active ? ' is-on' : '') }, lines);
      g.dataset.id = st.c.id;
      const [ax, ay] = st.a;
      const [sx, sy] = leadFrom(st);
      let d = `M${sx.toFixed(1)},${sy.toFixed(1)}L${ax.toFixed(1)},${ay.toFixed(1)}`;
      if (st.side === 'below') { // on a phone: up to the gap over its row, out to the page's edge, up the margin, in to the place
        const gx = st.col < G.cols / 2 ? 5 : W - 5;
        d = `M${sx.toFixed(1)},${sy.toFixed(1)}V${(st.rowTop - 9).toFixed(1)}H${gx}V${ay.toFixed(1)}H${ax.toFixed(1)}`;
      }
      el('path', { class: 'tb-lead', d }, g);
      el('circle', { class: 'tb-lead-end', cx: ax.toFixed(1), cy: ay.toFixed(1), r: 1.7 }, g);
      st.leader = g;
    });
  }

  /* ------------------------------------------------------------ arrival: wash, press, one by one */

  // Taiwan first, then each country in the order he first went
  const T_HOME = 0.2, T_FIRST = 0.6, T_STEP = 0.15, T_SPREAD = 0.8;
  const startOf = (i) => (i === 0 ? T_HOME : T_FIRST + (i - 1) * T_STEP);
  const easeOut = (t) => 1 - Math.pow(1 - t, 2.4); // quick to wet, slow to reach the edge

  function blob(ctx, w, r, inner) {
    const n = 96, s = w.seed;
    const p1 = rand(s + 11) * 6.3, p2 = rand(s + 12) * 6.3, p3 = rand(s + 13) * 6.3;
    const pt = (j, rr) => {
      const a = (j / n) * Math.PI * 2;
      const q = rr * (1 + 0.075 * Math.sin(3 * a + p1) + 0.045 * Math.sin(5 * a + p2) + 0.025 * Math.sin(11 * a + p3) + 0.012 * Math.sin(23 * a + p1 * 2));
      return [w.from[0] + Math.cos(a) * q, w.from[1] + Math.sin(a) * q];
    };
    ctx.beginPath();
    for (let j = 0; j <= n; j++) { const [x, y] = pt(j, r); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    if (inner != null) for (let j = n; j >= 0; j--) { const [x, y] = pt(j, inner); if (j === n) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath();
  }

  function paint(time) {
    washCv.width = washCv.width; // clear
    const ctx = washCv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let busy = false;
    washes.forEach((w, i) => {
      const p = time == null ? 1 : clamp((time - startOf(i)) / T_SPREAD, 0, 1);
      if (p <= 0) { busy = true; return; }
      if (!w.shown && (time == null || time - startOf(i) > 0.18)) {
        w.shown = true;
        if (w.label) w.label.classList.remove('is-wait');
      }
      if (p >= 1) { ctx.drawImage(w.cv, w.x0, w.y0, w.w, w.h); return; }
      busy = true;
      const r = Math.max(2, w.reach * 1.12 * easeOut(p));
      ctx.save(); blob(ctx, w, r); ctx.clip();
      ctx.drawImage(w.cv, w.x0, w.y0, w.w, w.h);
      ctx.restore();
      // the wet edge: pigment carried to the front, darker while it moves
      ctx.save(); blob(ctx, w, r, r * 0.86); ctx.clip('evenodd');
      ctx.globalAlpha = 0.75 * (1 - p);
      ctx.drawImage(w.cv, w.x0, w.y0, w.w, w.h);
      ctx.restore();
    });
    return busy;
  }
  function frameLoop(now) {
    if (paint((now - t0) / 1000)) raf = requestAnimationFrame(frameLoop);
    else raf = 0;
  }

  function press(st) {
    st.pressed = true;
    if (st.node) st.node.classList.remove('is-wait');
    if (st.leader) st.leader.classList.remove('is-wait');
  }

  /* ------------------------------------------------------------ pointing and tapping */

  function setActive(id) {
    if (id === active) return;
    active = id;
    lines.querySelectorAll('.tb-leader').forEach((g) => g.classList.toggle('is-on', g.dataset.id === id));
    stampLayer.querySelectorAll('.tb-st').forEach((g) => g.classList.toggle('is-on', g.dataset.id === id));
  }
  function idAt(e) {
    const t = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
    return t ? t.dataset.id : null;
  }
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const id = idAt(e);
    setActive(id);
    if (id) FP.tip(e.clientX, e.clientY, FP.about(FP.byId.get(id))); else FP.tip();
  });
  stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { setActive(null); FP.tip(); } });
  stage.addEventListener('click', (e) => { // a tap shows that one line, and the note
    const id = idAt(e);
    if (e.pointerType === 'mouse' && !narrow) return;
    setActive(id);
    if (id) FP.tip(e.clientX, e.clientY, FP.about(FP.byId.get(id))); else FP.tip();
  });
  stage.addEventListener('scroll', () => FP.tip(), { passive: true });

  /* ------------------------------------------------------------ putting it together */

  function render(animate) {
    W = stage.clientWidth; H = stage.clientHeight;
    if (W < 120 || H < 120) { waiting = true; return; } // a window too small (or still hidden): wait for it
    waiting = false;
    narrow = W < 640;
    body.classList.toggle('is-narrow', narrow);
    sizes.clear();
    timers.forEach(clearTimeout); timers = [];
    G = narrow ? phoneLayout() : deskLayout();
    CH = G.contentH;
    SH = narrow ? Math.ceil(G.mapBottom + 12) : H;
    proj = d3.geoEqualEarth().scale(G.s).translate([G.ox, G.oy]).precision(0.15)
      .clipExtent([[G.ox - XR * G.s - 1, G.oy + YT * G.s - 1], [G.ox + XR * G.s + 1, G.oy + YB * G.s]]);
    path = d3.geoPath(proj);
    frame = path({ type: 'Sphere' });
    k = clamp(G.s / 251, 0.66, 1.2);
    document.documentElement.style.setProperty('--tb-k', k.toFixed(3));
    stamps.forEach((st) => { st.a = proj([st.at[1], st.at[0]]); });
    wrap.style.setProperty('--content-h', `${CH}px`);
    sheet.style.setProperty('--sw', `${W}px`); sheet.style.setProperty('--sh', `${SH}px`);
    ink.setAttribute('width', W); ink.setAttribute('height', SH);
    washCv.width = Math.round(W * DPR); washCv.height = Math.round(SH * DPR);
    if (!animate) stamps.forEach((st) => { st.pressed = true; });
    washes = stamps.map((st) => makeWash(st.c, homeland(st.c)));
    if (!animate) washes.forEach((w) => { w.shown = true; });
    drawSea({ s: G.s, ox: G.ox, oy: G.oy, mapTop: G.oy + YT * G.s, mapBottom: G.oy + YB * G.s });
    drawInk();
    drawLabels();
    drawCart();
    drawStamps();
    drawLeaders();
    cancelAnimationFrame(raf); raf = 0;
    const at = parseFloat(query.get('at')); // one frame of the arrival, for checking it
    if (at >= 0) {
      paint(at);
      stamps.forEach((st, i) => { st.pressed = false; st.node.classList.add('is-wait'); st.leader.classList.add('is-wait'); if (at >= startOf(i) + 0.1) press(st); });
      return;
    }
    if (animate) {
      t0 = performance.now();
      raf = requestAnimationFrame(frameLoop);
      // each stamp pressed as its country's wash goes down
      stamps.forEach((st, i) => timers.push(setTimeout(() => press(st), (startOf(i) + 0.1) * 1000)));
    } else {
      paint(null);
    }
  }

  const fontsIn = Promise.all([
    document.fonts.load('400 120px "Playfair Display"', '0123456789'),
    document.fonts.load('400 20px "Playfair Display"', 'Where I have been countries'),
    document.fonts.load('600 10px "Geist"', 'ARRIVED'),
    document.fonts.load('500 10px "Geist"', 'JANUARY 2026'),
    document.fonts.load('500 30px "Noto Serif TC"', '我去過的地方個國家全世界的大洲趟旅行到'),
    document.fonts.load('400 30px "Noto Serif TC"', '我去過的地方個國家全世界的大洲趟旅行到'),
  ]).catch(() => null);
  const fontsSoon = Promise.race([fontsIn.then(() => document.fonts.ready), new Promise((r) => setTimeout(r, 1500))]);

  Promise.all([FP.world('50m'), FP.world('110m'), fontsSoon]).then(([a, lite]) => {
    atlas = a;
    bigLand = bigLandOf(lite.topo);
    chooseTones();
    render(!STILL);
    started = true;
    let size = `${stage.clientWidth}x${stage.clientHeight}`;
    let rt = 0;
    addEventListener('resize', () => {
      clearTimeout(rt);
      const go = () => {
        const now = `${stage.clientWidth}x${stage.clientHeight}`;
        if (now === size && !waiting) return; // the review bar arriving is not a resize
        size = now;
        render(waiting && !STILL);
      };
      if (STILL || waiting) go(); else rt = setTimeout(go, 140);
    });
  });

  FP.onLang(() => {
    if (!started || !G) return;
    stage.setAttribute('aria-label', FP.w.where);
    fillCart(FP.lang);
    drawStamps();
    drawLabels();
  });
})();
