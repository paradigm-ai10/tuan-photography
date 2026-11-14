/* One breath out, calmer 一口氣拉遠，慢一點 (footprint, round eight, 2026-11-09).
   He gave three of five to One breath out (swift-glide) with three notes: "the font is a bit odd, I feel
   like the previous font is better" (the names on the map, he said); "this is too fast, make it a little
   bit slower"; and "the map was squeezed to the top, I want the map to show in full width length, let the
   numbers down there cover on top is fine". This is that page with the three changes.
   - The names on the map are lettered as round five's wall map (ramp-band) lettered them, the version
     before typeset's lettering came in: each name at its own place from typeset's table as band moved
     it, the three large countries' names inside them with the year set under the name, the small ones
     outside on a paper halo with a fine leader to the place, Western Europe's names in one column, and
     the small countries named on the whole map too. Drawn on the canvas each frame, so they ride the move.
   - The tempo: the page's data-tempo stretches every time in the move (1 is One breath out's 3 s; this
     page's 1.45 rests at about 4.4 s, the calmer page's 1.85 at about 5.5 s).
   - The frame: the whole map in the window, the Arctic shores (Alaska's, Siberia's, North Cape) under the
     top bar and New Zealand at the foot, his countries across the width; the three numbers lie over the
     foot of the map, the southern sea and, on a wide window, the south of Australia and New Zealand.
   - Everything else is One breath out's: the one continuous widening from Taiwan, the colours and the
     flights riding it in the order he went, the numbers climbing with them, the date line, the trip list
     below, and the first scroll, tap or key jumping to the end.
   - data-zoom="none" (2026-11-09, his "what if we don't zoom"): the view never moves; the whole wall map
     is there from the first frame, uncoloured, and only the colours, the flights and the numbers ramp, at
     an even pace in the order he went.
   - ?still and reduced motion show the end at once; ?at=<ms> holds one moment of the move.
   - Since 2026-11-09 (his call, "好 用現在這個新的"), at data-tempo 1.85, the Journey tab's first screen:
     journey.html carries the stage as <div class="fp-stage jr-fp" id="stage">, and arrive.js joins it to
     the page. There the page's own top bar is used (FP.chrome is not) and kept clear of the engraving. */
(() => {
  'use strict';
  const FP = window.FP;
  const EMBED = !!document.querySelector('.jr-fp'); // the Journey tab's first screen (arrive.js)
  if (!EMBED) FP.chrome();
  const query = new URLSearchParams(location.search);
  if (query.get('lang') === 'zh' || query.get('lang') === 'en') FP.setLang(query.get('lang'));
  const AT = query.has('at') ? Math.max(0, parseFloat(query.get('at')) || 0) : null;
  const STILL = AT == null && (FP.still || FP.reduced);

  const stage = document.getElementById('stage');
  const body = document.body;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const MASK = '#000'; // the stencil for shapes worked on off screen; never seen
  const INF = 1e20;
  const RAD = Math.PI / 180;
  const unit = (t, a, d) => (d <= 0 ? (t >= a ? 1 : 0) : clamp((t - a) / d, 0, 1));
  const inOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const spread = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 2.4)); // a wash running out into the paper
  // a cubic-bezier timing curve, as CSS has it
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (u) => ((ax * u + bx) * u + cx) * u, Y = (u) => ((ay * u + by) * u + cy) * u;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1;
      for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (X(m) < x) lo = m; else hi = m; }
      return Y((lo + hi) / 2);
    };
  }

  /* ------------------------------------------------------------ the pace (ms) */

  // the page's tempo: every time in the move stretched by it (1 is One breath out's, resting at about 3 s)
  const TEMPO = clamp(parseFloat(body.dataset.tempo) || 1.45, 1, 3);
  const STAY = body.dataset.zoom === 'none'; // the whole map from the start, the view never moving
  // (data-fp-list) a list of where he went, and when, in a column beside the map (not the pacific form, set on it)
  const LIST = 'fpList' in body.dataset && body.dataset.fpList !== 'pacific';
  const HOLD = 300 * TEMPO; // the landing: close in on Taiwan, home in clay, the numbers at 0
  const GLIDE = 2500 * TEMPO; // the one move out to the whole wall map
  const breath = bezier(0.35, 0, 0.12, 1); // under way at once, half the widening done by 0.75 s, a long soft landing
  const SWEEP = 0.8; // the share of the move the colours are spread over, evenly, in the order he went
  const FSWEEP = 0.66; // and the flights
  const GAP = 60 * TEMPO; // the least time between two countries colouring
  const FGAP = 26 * TEMPO; // and between two flights setting off
  const BLEED = 600 * TEMPO; // a country's wash running out from where he landed
  const NAME = 400 * TEMPO; // its name being lettered in
  const SETTLE = 300 * TEMPO; // a flight's line settling to faint once drawn
  const WAIT = 450; // the longest the move waits, after the landing, for the finer water-lines and washes

  /* ------------------------------------------------------------ words */

  const T = {
    en: {
      label: {
        countries: (n) => (n === 1 ? 'Country' : 'Countries'),
        flights: (n) => (n === 1 ? 'Flight' : 'Flights'),
        photos: (n) => (n === 1 ? 'Photograph' : 'Photographs'),
      },
      sr: (c, share, f, p) => `${FP.w.where}: ${c} countries, ${share}; ${f} flights; ${p} photographs`,
      slide: 'Slide the map sideways to see the rest',
    },
    zh: {
      label: { countries: () => '個國家', flights: () => '段航程', photos: () => '張照片' },
      sr: (c, share, f, p) => `${FP.w.where}：${c} 個國家，${share}；${f} 段航程；${p} 張照片`,
      slide: '左右滑動地圖，看其餘的地方',
    },
  };
  const tw = () => T[FP.lang];
  // "10.3% of the world's 195 countries"; in 中文 the words come first: 「全世界 195 個國家的 10.3%」
  const shareOf = (n) => FP.w.pct((Math.round((n / FP.counts.world) * 1000) / 10).toFixed(1));
  const shareLine = (n) => (FP.lang === 'zh' ? `${FP.w.ofWorld(FP.counts.world)} ${shareOf(n)}` : `${shareOf(n)} ${FP.w.ofWorld(FP.counts.world)}`);

  /* ------------------------------------------------------------ the projection */

  // Gall stereographic, centred (once the atlas is in) on the middle of his countries: the sheet's edge
  // runs down the Atlantic, the widest stretch of longitude he has not been to
  const KG = 1 + Math.SQRT1_2;
  function gall(l, p) { return [l / Math.SQRT2, KG * Math.tan(p / 2)]; }
  gall.invert = (x, y) => [x * Math.SQRT2, 2 * Math.atan(y / KG)];
  const U = 1000; // the unit sheet: x from -XR to XR, y down
  const XR = (Math.PI / Math.SQRT2) * U;
  const DEG = (Math.PI / 180 / Math.SQRT2) * U; // one degree of longitude
  const gy = (lat) => -KG * Math.tan((lat * Math.PI) / 360) * U;
  const latOfY = (y) => (-2 * Math.atan(y / (KG * U)) * 180) / Math.PI;
  let LON0 = 142, SPAN = 302; // the sheet's middle meridian, and the degrees of longitude his countries span
  let projU = null;
  const xOfLon = (lon) => ((((((lon - LON0) % 360) + 540) % 360) - 180) * DEG);

  /* ------------------------------------------------------------ small tools (as bolder has them) */

  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rand(n) { let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function hash2(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function noise(x, y, s, wrap = 0) { // smooth value noise, 0 to 1 (wrapping, for a tile, when asked)
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const W = (q) => (wrap ? ((q % wrap) + wrap) % wrap : q);
    const a = hash2(W(xi), W(yi), s), b = hash2(W(xi + 1), W(yi), s), c = hash2(W(xi), W(yi + 1), s), d = hash2(W(xi + 1), W(yi + 1), s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // squared distance to the nearest zero cell (Felzenszwalb and Huttenlocher), in place
  function edt(g, w, h) {
    const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    const line = (len) => {
      let k2 = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < len; q++) {
        let s = ((f[q] + q * q) - (f[v[k2]] + v[k2] * v[k2])) / (2 * q - 2 * v[k2]);
        while (s <= z[k2]) { k2--; s = ((f[q] + q * q) - (f[v[k2]] + v[k2] * v[k2])) / (2 * q - 2 * v[k2]); }
        k2++; v[k2] = q; z[k2] = s; z[k2 + 1] = INF;
      }
      for (let q = 0, k3 = 0; q < len; q++) { while (z[k3 + 1] < q) k3++; d[q] = (q - v[k3]) * (q - v[k3]) + f[v[k3]]; }
    };
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; line(h); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; line(w); for (let x = 0; x < w; x++) g[y * w + x] = d[x]; }
    return g;
  }
  // three box blurs, close to a gaussian, in place
  function blur(a, w, h, r) {
    const tmp = new Float32Array(a.length);
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
    for (let k2 = 0; k2 < 3; k2++) { pass(a, tmp, w, h, w, 1); pass(tmp, a, h, w, 1, w); }
  }
  const overlap = (a, b, pad = 0) => a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
  const within = (a, b) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
  const join = (b, r) => (!b ? { ...r } : { x0: Math.min(b.x0, r.x0), y0: Math.min(b.y0, r.y0), x1: Math.max(b.x1, r.x1), y1: Math.max(b.y1, r.y1) });
  const ofView = (v) => ({ x0: v.x0, y0: v.y0, x1: v.x0 + v.w, y1: v.y0 + v.h });

  /* ------------------------------------------------------------ the colourist's box (bolder's) */

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function rgb(color) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = MASK;
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  const BOX = ['--tn-ochre', '--tn-terra', '--tn-sage', '--tn-slate', '--tn-mauve', '--tn-verdigris'];
  const OKLCH = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/;
  function tone(token, seed) { // each country turns its colour a little, from its own name
    const raw = cssVar(token);
    const m = raw.match(OKLCH);
    if (!m) return { css: raw, rgb: rgb(raw) };
    const L = +m[1] + (rand(seed) - 0.5) * 5;
    const C = +m[2] * (0.9 + rand(seed + 1) * 0.2);
    const H = +m[3] + (rand(seed + 2) - 0.5) * 12;
    const css = `oklch(${L.toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)})`;
    return { css, rgb: rgb(css) };
  }

  /* ------------------------------------------------------------ his countries, as lettered */

  // [lng, lat] of each name and its anchor: typeset's table as round five's wall map (ramp-band) moved it
  // for a sheet whose left edge runs down the Atlantic west of Spain, so Western Europe is lettered in a
  // column to the east. inside: lettered in the country, no halo. stack: the year under the name. lead: a
  // fine leader to that place. group / col / fix: names kept apart in a column. wrap: two lines.
  const PLACE = {
    taiwan: { at: [123.0, 23.3], a: 'start' },
    usa: { at: [-99, 40.5], a: 'middle', inside: true, size: 'l', stack: true },
    china: { at: [101.5, 35], a: 'middle', inside: true, size: 'l', stack: true },
    australia: { at: [134.5, -24], a: 'middle', inside: true, size: 'l', stack: true },
    uk: { at: [-6.6, 62.0], a: 'start', lead: [-3.6, 57.4] },
    netherlands: { at: [15.8, 55.9], a: 'start', lead: [5.6, 52.3], size: 's', group: 'eu', col: true },
    germany: { at: [15.8, 51.0], a: 'start', group: 'eu', col: true, fix: true },
    france: { at: [1.4, 46.8], a: 'middle', stack: true },
    switzerland: { at: [15.8, 46.3], a: 'start', lead: [8.2, 46.8], size: 's', group: 'eu', col: true },
    andorra: { at: [5.4, 40.2], a: 'start', lead: [1.55, 42.55], size: 's', group: 'eu' },
    spain: { at: [-3.9, 40.6], a: 'middle', stack: true },
    dubai: { at: [64.0, 15.6], a: 'middle', wrap: true, zhCut: 3, lead: [55.6, 24.2], size: 's' },
    myanmar: { at: [87.0, 17.3], a: 'middle', stack: true, size: 's' },
    thailand: { at: [94.5, 2.6], a: 'end', lead: [99.3, 9.2] },
    malaysia: { at: [94.5, -2.3], a: 'end', lead: [101.8, 4.3] },
    singapore: { at: [94.8, -7.2], a: 'end', lead: [103.85, 1.35], size: 's' },
    vietnam: { at: [110.4, 14.6], a: 'start' },
    'hong-kong': { at: [116.2, 19.4], a: 'start', lead: [114.15, 22.35], size: 's' },
    'south-korea': { at: [126.5, 30.0], a: 'start', lead: [127.8, 35.9] },
    japan: { at: [143.4, 37.6], a: 'start' },
    'new-zealand': { at: [179.6, -38.4], a: 'start' },
  };
  const RANK = (c) => (c.home ? 0 : (PLACE[c.id] || {}).size === 'l' ? 1 : (PLACE[c.id] || {}).size === 's' ? 3 : 2);
  // the oceans, lettered lightly where the sea is open (typeset's)
  const SEAS = [
    { id: 'pacific', at: [-138, 13], en: ['PACIFIC', 'OCEAN'], zh: ['太平洋'] },
    { id: 'indian', at: [80, -20], en: ['INDIAN', 'OCEAN'], zh: ['印度洋'] },
  ];

  /* ------------------------------------------------------------ the page */

  const sheet = document.createElement('div'); sheet.className = 'wb-sheet';
  const seaCv = document.createElement('canvas'); seaCv.className = 'wb-sea';
  const mapCv = document.createElement('canvas'); mapCv.className = 'wb-map';
  sheet.append(seaCv, mapCv);
  const KEYS = ['countries', 'flights', 'photos'];
  const FINAL = { countries: FP.counts.countries, flights: FP.counts.flights, photos: FP.counts.photos };
  const row = document.createElement('div');
  row.className = 'wb-row';
  row.innerHTML = '<h1 class="wb-sr"></h1>' + KEYS.map((id) => `<div class="wb-stat wb-stat--${id}" aria-hidden="true">
      <span class="wb-n"></span><span class="wb-side"><span class="wb-label fp-label"></span>${id === 'countries' ? '<span class="wb-share"></span>' : ''}</span></div>`).join('')
    + '<p class="wb-trip fp-label" aria-hidden="true"></p><p class="wb-hint fp-label" aria-hidden="true"></p>';
  const stats = [...row.querySelectorAll('.wb-stat')];
  const num = (id) => row.querySelector(`.wb-stat--${id} .wb-n`);
  const lab = (id) => row.querySelector(`.wb-stat--${id} .wb-label`);
  const shareEl = row.querySelector('.wb-share');
  const tripEl = row.querySelector('.wb-trip');
  const hintEl = row.querySelector('.wb-hint');
  const srEl = row.querySelector('.wb-sr');
  stage.append(sheet, row);
  stage.setAttribute('aria-label', FP.w.where);
  const mctx = mapCv.getContext('2d');
  const washCv = document.createElement('canvas'), wctx = washCv.getContext('2d');
  const hitCtx = document.createElement('canvas').getContext('2d');

  let atlas = null, LAND = null, HOMES = new Map();
  let coastHi = null, coastLo = null, borderHi = null, borderLo = null, landPlain = null;
  let MINE = [], byId = new Map(), ARCS = [], DOTS = [];
  let G = null, P = null, cur = null, started = false, resting = false;
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));

  /* ------------------------------------------------------------ the shapes, once */

  // a ring of points through a geoPath, kept for smoothing: the 50m coast is a little angular close in
  function recorder() {
    const rings = []; let cur2 = null;
    return { rings, moveTo(x, y) { cur2 = [[x, y]]; rings.push(cur2); }, lineTo(x, y) { cur2.push([x, y]); }, closePath() { if (cur2) cur2.closed = true; }, arc() {} };
  }
  function smooth(geo) {
    const rec = recorder();
    d3.geoPath(projU, rec)(geo);
    const p = new Path2D();
    for (const r of rec.rings) {
      const n = r.length;
      if (n < 2) continue;
      if (r.closed && n > 2) {
        const mid = (i) => { const a = r[(i + n) % n], b = r[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
        const s = mid(0); p.moveTo(s[0], s[1]);
        for (let i = 1; i <= n; i++) { const q = r[i % n], e = mid(i); p.quadraticCurveTo(q[0], q[1], e[0], e[1]); }
        p.closePath();
      } else {
        p.moveTo(r[0][0], r[0][1]);
        for (let i = 1; i < n - 1; i++) p.quadraticCurveTo(r[i][0], r[i][1], (r[i][0] + r[i + 1][0]) / 2, (r[i][1] + r[i + 1][1]) / 2);
        p.lineTo(r[n - 1][0], r[n - 1][1]);
      }
    }
    return p;
  }
  const plain = (geo) => { const p = new Path2D(); d3.geoPath(projU, p)(geo); return p; };

  // a country as he knows it (band's): the largest of the shapes the atlas numbers alike and the pieces
  // close to it, within six degrees of it or holding a place he went. So French Guiana and the Canaries
  // stay plain. The United States is the exception: it is coloured whole, Alaska and Hawaii with it.
  const ringPts = (coords, n) => { const r = coords[0]; const st = Math.max(1, Math.floor(r.length / n)); return r.filter((_, i) => i % st === 0); };
  function homeland(c) {
    const all = atlas.features.filter((f) => f.id === c.iso);
    if (!all.length) return null;
    const f = all.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
    if (f.geometry.type !== 'MultiPolygon' || c.id === 'usa') return f;
    const polys = f.geometry.coordinates.map((coordinates) => ({ coordinates, a: d3.geoArea({ type: 'Polygon', coordinates }) }));
    const big = polys.reduce((a, b) => (b.a > a.a ? b : a));
    const bigPts = ringPts(big.coordinates, 400);
    const mine = FP.places.filter((p) => p.country === c.id).map((p) => [p.ll[1], p.ll[0]]);
    const LIMIT = 6 * RAD;
    const near = (q) => {
      if (q === big) return true;
      const own = ringPts(q.coordinates, 60);
      const ce = d3.geoCentroid({ type: 'Polygon', coordinates: q.coordinates });
      if (mine.some((m) => d3.geoContains({ type: 'Polygon', coordinates: q.coordinates }, m) || d3.geoDistance(m, ce) < 1.2 * RAD)) return true;
      const reach = Math.max(...own.map((p) => d3.geoDistance(p, ce)));
      let m = Infinity;
      for (const p of bigPts) { const d = d3.geoDistance(p, ce); if (d < m) m = d; }
      if (m - reach > LIMIT) return false;
      if (m < LIMIT) return true;
      for (const p of own) for (const b of bigPts) if (d3.geoDistance(p, b) < LIMIT) return true;
      return false;
    };
    const keep = polys.filter(near);
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: keep.map((q) => q.coordinates) } };
  }

  // the sheet's middle: opposite the widest stretch of longitude he has not been to (the Atlantic)
  function centre() {
    const lons = [];
    HOMES.forEach((f) => {
      if (!f) return;
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      polys.forEach((p) => p[0].forEach((pt) => lons.push((((pt[0] + 180) % 360) + 360) % 360 - 180)));
    });
    lons.sort((a, b) => a - b);
    let gap = 0, mid = -38;
    for (let i = 0; i < lons.length; i++) {
      const a = lons[i], b = i + 1 < lons.length ? lons[i + 1] : lons[0] + 360;
      if (b - a > gap) { gap = b - a; mid = (a + b) / 2; }
    }
    LON0 = ((((mid + 180) + 180) % 360) + 360) % 360 - 180;
    SPAN = 360 - gap;
    projU = d3.geoProjection(gall).rotate([-LON0, 0]).scale(U).translate([0, 0]).precision(0);
  }

  // where on a trip he first set foot in a country: the city he flew into, or a place of that trip there
  function entryOf(c, step) {
    for (const f of step.flights) { const p = placeByCity.get(f.to.city); if (p && p.country === c.id) return [f.to.lng, f.to.lat]; }
    const pl = FP.places.find((p) => p.country === c.id && p.journeys.includes(step.journey));
    if (pl) return [pl.ll[1], pl.ll[0]];
    const nm = FP.names()[c.iso];
    return nm ? nm.at : [c.ll[1], c.ll[0]];
  }

  // countries that touch, or lie a short sea apart, take different colours (as bolder chooses them)
  function chooseTones() {
    const geoms = atlas.topo.objects.countries.geometries;
    const nb = topojson.neighbors(geoms);
    const touch = new Map();
    geoms.forEach((g, i) => { const set = touch.get(g.id) || new Set(); nb[i].forEach((j) => set.add(geoms[j].id)); touch.set(g.id, set); });
    const outline = new Map(FP.abroad.map((c) => {
      const pts = [];
      const f = HOMES.get(c.id);
      if (f) {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        polys.forEach((p) => p.forEach((ring) => ring.forEach((pt) => pts.push(pt))));
      }
      const step = Math.max(1, Math.floor(pts.length / 260));
      return [c.id, pts.filter((_, i) => i % step === 0).map(([x, y]) => [x * RAD, y * RAD])];
    }));
    // each outline's middle and reach, so that two countries plainly far apart are not measured point by point
    // (the nearest two points cannot be closer than the middles' distance less both reaches)
    const hav = (p, q) => { const h = Math.sin((q[1] - p[1]) / 2) ** 2 + Math.cos(p[1]) * Math.cos(q[1]) * Math.sin((q[0] - p[0]) / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, h))); };
    const disc = new Map([...outline].map(([id, pts]) => {
      if (!pts.length) return [id, null];
      const c = d3.geoCentroid({ type: 'MultiPoint', coordinates: pts.map(([x, y]) => [x / RAD, y / RAD]) });
      const m = [c[0] * RAD, c[1] * RAD];
      return [id, { m, r: Math.max(...pts.map((p) => hav(m, p))) }];
    }));
    const apart = (a, b) => {
      const A = outline.get(a.id), B = outline.get(b.id);
      if (!A || !B || !A.length || !B.length) return Infinity;
      const da = disc.get(a.id), db = disc.get(b.id);
      if (hav(da.m, db.m) - da.r - db.r > 1500) return Infinity; // beyond the 1400 km that counts
      let m = Infinity;
      for (const p of A) for (const q of B) {
        const dl = q[1] - p[1], dn = q[0] - p[0];
        const h = Math.sin(dl / 2) ** 2 + Math.cos(p[1]) * Math.cos(q[1]) * Math.sin(dn / 2) ** 2;
        if (h < m) m = h;
      }
      return 2 * 6371 * Math.asin(Math.sqrt(m));
    };
    const tones = new Map();
    const picked = [], used = BOX.map(() => 0);
    tones.set(FP.home.id, { css: cssVar('--tn-home'), rgb: rgb(cssVar('--tn-home')) });
    FP.abroad.forEach((c) => {
      const near = picked.map((q) => {
        if ((touch.get(c.iso) || new Set()).has(q.c.iso)) return { b: q.b, w: 12 };
        const km = apart(c, q.c);
        return { b: q.b, w: km < 1400 ? 1 + 8 * (1 - km / 1400) : 0 };
      });
      const cost = BOX.map((_, b) => near.reduce((sum, n) => sum + (n.b === b ? n.w : 0), 0) + used[b] * 0.05);
      const b = cost.indexOf(Math.min(...cost));
      picked.push({ c, b }); used[b]++;
      tones.set(c.id, tone(BOX[b], hashStr(c.id)));
    });
    return tones;
  }

  function prepare() {
    coastHi = smooth(LAND); borderHi = smooth(atlas.borders);
    coastLo = plain(LAND); borderLo = plain(atlas.borders);
    landPlain = coastLo;
    const tones = chooseTones();
    const names = FP.names();
    const geoPathU = d3.geoPath(projU);
    MINE = [FP.home, ...FP.abroad].map((c) => {
      const feat = HOMES.get(c.id);
      const nm = names[c.iso];
      const at = nm ? nm.at : [c.ll[1], c.ll[0]];
      const b = feat ? geoPathU.bounds(feat) : null;
      const a = projU(at);
      const bU = b && Number.isFinite(b[0][0]) ? { x0: b[0][0], y0: b[0][1], x1: b[1][0], y1: b[1][1] } : { x0: a[0] - 4, y0: a[1] - 4, x1: a[0] + 4, y1: a[1] + 4 };
      // the piece of the country its name is set against: the one holding its label point, or the nearest
      // (the United States' name goes by the forty-eight states, not across Alaska)
      let nameU = bU;
      if (feat && feat.geometry.type === 'MultiPolygon') {
        const pieces = feat.geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }));
        const hit = pieces.find((g) => d3.geoContains(g, at)) || pieces.reduce((q, g) => (d3.geoDistance(d3.geoCentroid(g), at) < d3.geoDistance(d3.geoCentroid(q), at) ? g : q));
        const pb = geoPathU.bounds(hit);
        if (Number.isFinite(pb[0][0])) nameU = { x0: pb[0][0], y0: pb[0][1], x1: pb[1][0], y1: pb[1][1] };
      }
      return {
        c, id: c.id, home: c.home, feat, pathU: feat ? plain(feat) : null, bU, nameU, anchorU: a,
        area: feat ? geoPathU.area(feat) : 0, tone: tones.get(c.id),
        rank: RANK(c),
        tb: c.home ? -Infinity : Infinity, entryU: null, wash: null, bleed: null, live: null,
      };
    });
    byId = new Map(MINE.map((m) => [m.id, m]));
    // the flights as fine arcs: the great circle, bowed a little toward the pole so every one reads as an arc
    ARCS = FP.flights.map((f) => {
      const ip = d3.geoInterpolate([f.from.lng, f.from.lat], [f.to.lng, f.to.lat]);
      const N = 72, pts = [];
      for (let i = 0; i <= N; i++) pts.push(projU(ip(i / N)));
      const [x0, y0] = pts[0], [x1, y1] = pts[N];
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
      let nx = dy / L, ny = -dx / L;
      if (ny > 0 || (Math.abs(ny) < 1e-6 && nx < 0)) { nx = -nx; ny = -ny; }
      const bow = L * 0.08 * (1 - clamp((L - 250) / 1100, 0, 1)); // a long flight's great circle is already an arc
      pts.forEach((p, i) => { const s = Math.sin((Math.PI * i) / N) * bow; p[0] += nx * s; p[1] += ny * s; });
      const len = [0];
      for (let i = 1; i <= N; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      let b = null; pts.forEach((p) => { b = join(b, { x0: p[0], y0: p[1], x1: p[0], y1: p[1] }); });
      const home = (p) => FP.km([p.lat, p.lng], FP.home.ll) < 60;
      return { f, pts, len, total: len[N], bU: b, homeFrom: home(f.from), homeTo: home(f.to), t0: Infinity, dur: 0 };
    });
  }

  /* ------------------------------------------------------------ the row of numbers (band's) */

  // the figures' own height: the number's box is drawn in to the ink, top and bottom
  // (a canvas draws Playfair's old-style figures, so the lining ones are measured by a capital O)
  const meas = document.createElement('canvas').getContext('2d');
  function inkOf(F) {
    meas.font = `400 ${F}px "Playfair Display"`;
    const m = meas.measureText('O');
    const fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
    if (!(fa > 0)) return { top: F * 0.19, bot: F * 0.07 };
    const base = (F - (fa + fd)) / 2 + fa; // line-height 1
    return { top: base - m.actualBoundingBoxAscent, bot: F - (base + m.actualBoundingBoxDescent) };
  }
  // a number set digit by digit, each in a cell as wide as the widest figure: the bundled Playfair has
  // lining figures but no tabular ones, and the count must not jiggle as it climbs
  function setDigits(node, str) {
    node.innerHTML = [...str].map((ch) => (ch >= '0' && ch <= '9' ? `<span class="wb-d">${ch}</span>` : FP.esc(ch))).join('');
  }
  function widestDigit(node) {
    let m = 0;
    for (let d = 0; d <= 9; d++) { node.textContent = String(d); m = Math.max(m, node.getBoundingClientRect().width); }
    return Math.ceil(m * 10) / 10;
  }
  let pctEl = null, shown = {};
  function words() {
    const n = FP.counts;
    shareEl.innerHTML = FP.lang === 'zh'
      ? `<span class="wb-of fp-label">${FP.esc(FP.w.ofWorld(n.world))}</span><span class="wb-pct"></span>`
      : `<span class="wb-pct"></span><span class="wb-of fp-label">${FP.esc(FP.w.ofWorld(n.world))}</span>`;
    pctEl = shareEl.querySelector('.wb-pct');
    srEl.textContent = tw().sr(FP.fmt(n.countries), shareLine(n.countries), FP.fmt(n.flights), FP.fmt(n.photos));
    hintEl.textContent = tw().slide;
    stage.setAttribute('aria-label', FP.w.where);
    shown = {};
  }
  // the row at type size F: every part held at the widest it will be while counting (the final figures,
  // the plural words, the final per cent), so nothing shifts as the numbers grow
  function measureRow(F) {
    const ik = inkOf(F);
    row.style.setProperty('--f', `${F.toFixed(1)}px`);
    row.style.setProperty('--n-top', `${ik.top.toFixed(1)}px`);
    row.style.setProperty('--n-bot', `${ik.bot.toFixed(1)}px`);
    stats.forEach((st) => { st.style.removeProperty('--nw'); st.style.removeProperty('--lw'); });
    shareEl.style.removeProperty('--pw');
    row.style.setProperty('--dw', `${widestDigit(num('countries'))}px`);
    shareEl.style.setProperty('--pdw', `${widestDigit(pctEl)}px`);
    KEYS.forEach((id) => { setDigits(num(id), FP.fmt(FINAL[id])); lab(id).textContent = tw().label[id](FINAL[id]); });
    setDigits(pctEl, shareOf(FINAL.countries));
    KEYS.forEach((id) => {
      const st = row.querySelector(`.wb-stat--${id}`);
      st.style.setProperty('--nw', `${Math.ceil(num(id).getBoundingClientRect().width)}px`);
      st.style.setProperty('--lw', `${Math.ceil(lab(id).getBoundingClientRect().width)}px`);
    });
    shareEl.style.setProperty('--pw', `${Math.ceil(pctEl.getBoundingClientRect().width)}px`);
    shown = {};
    return { F, ik, inkH: F - ik.top - ik.bot, boxes: stats.map((st) => { const r = st.getBoundingClientRect(); return { w: r.width, h: r.height }; }) };
  }
  // the date line: its first year alone, then the years running, "2010 to 2026" at the end
  const SINCE = FP.counts.since, UNTIL = FP.counts.until;
  const dateText = (y) => (y <= SINCE ? String(SINCE) : FP.w.span(SINCE, y));
  // the date line held at the widest it will show; on a phone the sliding note goes on its own line under it
  function measureTrip(narrow) {
    tripEl.style.removeProperty('--tw'); hintEl.style.removeProperty('--tw');
    let wmax = 0, hmax = 0;
    [dateText(SINCE), dateText(UNTIL)].forEach((s) => {
      tripEl.textContent = s;
      const r = tripEl.getBoundingClientRect();
      wmax = Math.max(wmax, r.width); hmax = Math.max(hmax, r.height);
    });
    tripEl.textContent = '';
    const hr = hintEl.getBoundingClientRect();
    tripEl.style.setProperty('--tw', `${Math.ceil(wmax)}px`);
    hintEl.style.setProperty('--tw', `${Math.ceil(narrow ? hr.width : wmax)}px`);
    shown.date = null;
    return { w: Math.ceil(wmax), h: hmax, hw: Math.ceil(hr.width), hh: hr.height };
  }

  /* ------------------------------------------------------------ the frame */

  const NORTH = 80; // the northern edge: the Arctic shores whole (Alaska's, Siberia's, North Cape), under the top bar
  const SOUTH = -48.5; // the foot of his land: Stewart Island, New Zealand's southern end
  const FOOT_MIN = -74;
  const POLE = 84; // the furthest north a tall window may show

  // a wide window: the map is the window, edge to edge, and the whole of it in view (his call, 2026-11-09:
  // "show in full width length, let the numbers down there cover on top"): his countries across the width
  // (s0) and the Arctic shores to New Zealand top to bottom. A window wider than that keeps the height
  // and shows more of the world at the sides; a taller one shows open sea under New Zealand, then more of
  // the north. The three numbers lie over the map's foot, sized for the window, not for a band.
  function solveWide(wAll, h) {
    // (data-fp-list) a column kept on the right for the list of where he went and when (travel-list.js);
    // the map is framed in the rest
    const colW = LIST ? clamp(wAll * 0.21, 260, 360) : 0, w = wAll - colW;
    const padL = clamp(w * 0.022, 14, 34), padR = clamp(w * 0.018, 12, 28);
    // (with the list) ten more degrees each side of his span, so Ireland, Portugal and the rest of Europe's
    // west, and the American east coast, are not cut at the frame's edges (his note, 2026-11-14)
    // his countries' own extent on the sheet, west to east, with that margin each side
    const ext = LIST && MINE.length ? MINE.reduce((e, m) => [Math.min(e[0], m.bU.x0), Math.max(e[1], m.bU.x1)], [Infinity, -Infinity]) : null;
    const spanU = ext ? ext[1] - ext[0] + 20 * DEG : SPAN * DEG;
    const s0 = (w - padL - padR) / spanU;
    const sMin = w / (2 * XR); // the whole way round, and no further
    let north = NORTH;
    let s = Math.max(sMin, Math.min(s0, h / (gy(SOUTH) - gy(north))));
    // (with the list) a frame taller than the sheet holds keeps his whole span across: the open paper below
    // the map simply runs on under the numbers, rather than the map growing until Europe is cut off
    if (!LIST && gy(north) + h / s > gy(FOOT_MIN)) { // taller than the sheet holds: more of the north, then nearer
      north = Math.min(POLE, latOfY(gy(FOOT_MIN) - h / s));
      if (gy(north) + h / s > gy(FOOT_MIN)) s = h / (gy(FOOT_MIN) - gy(north));
    }
    const vw = w / s, vh = h / s;
    const mid = ext ? (ext[0] + ext[1]) / 2 : 0;   // (with the list) the frame centred on his countries, not the sheet's middle
    const x0 = clamp(mid - ((padL + w - padR) / 2) / s, -XR, XR - vw);
    const W0 = { x0, y0: gy(north), w: vw, h: vh };
    const F = { x: 0, y: 0, w, h };
    return {
      w: wAll, colW, h, sheetH: h, narrow: false, W0, rest: { ...W0 }, sf: s, F, north, bandPx: clamp(h * 0.165, 96, 180), slide: false,
      k: clamp(w / 1380, 0.7, 1.15), sp: clamp(w / 1380, 0.66, 1.1),
    };
  }

  // a phone: the map across the width and taller than his whole span would allow, cropped to his part of
  // the world; the numbers in a row under it; the whole set a little above the middle of the screen
  function solveNarrow(w, h) {
    const north = 72, south = -50, padU = 2.5 * DEG;
    const W0 = { x0: -(SPAN * DEG) / 2 - padU, y0: gy(north), w: SPAN * DEG + 2 * padU, h: gy(south) - gy(north) };
    const edge = 16, colGap = 16;
    const colW = (w - 2 * edge - 2 * colGap) / 3;
    measureRow(100); // the figures' widths at a size of 100, to scale from
    const widest = Math.max(...KEYS.map((id) => num(id).getBoundingClientRect().width), 1);
    // the figures fill four fifths of their column, so the three read as three, not as one long number
    const F1 = clamp((0.8 * colW / widest) * 100, 40, 96);
    const m = measureRow(F1);
    const shareH = shareEl.getBoundingClientRect().height + 12; // set under the row on a phone
    const rowH = Math.max(...m.boxes.map((b) => b.h)) + shareH;
    const tb = measureTrip(true);
    const gap1 = 28, gap2 = 18, top0 = 58, hintGap = 8;
    const below = gap1 + rowH + gap2 + tb.h + hintGap + tb.hh;
    let mapH = Math.max(Math.min(w * 0.82, h - top0 - below - 28), w * 0.6);
    let s = mapH / W0.h, slide = true;
    if (w / s >= W0.w) { s = w / W0.w; mapH = W0.h * s; slide = false; } // a wide screen holds it all
    const blockH = mapH + below;
    const top = top0 + Math.max(0, (h - top0 - blockH - 16) * 0.42);
    const F = { x: 0, y: top, w, h: mapH };
    const rest = slide ? { x0: 0, y0: W0.y0, w: w / s, h: W0.h } : { ...W0, w: w / s, h: mapH / s };
    const tripY = top + mapH + gap1 + rowH + gap2;
    return {
      w, h, sheetH: Math.max(h, Math.ceil(top + blockH + 2)), narrow: true, W0, rest, sf: s, F, slide,
      k: 0.7, sp: 0.66, row: m, trip: tb, colW, colGap, edge,
      rowY: top + mapH + gap1, tripY, hintY: tripY + tb.h + hintGap, roomH: top + blockH + 24,
    };
  }
  // a phone's resting view: as many of his countries as it holds, home not pushed to the very edge
  function restX() {
    const R = G.rest, W0 = G.W0;
    const lo = W0.x0, hi = W0.x0 + W0.w - R.w;
    const homeX = byId.get(FP.home.id).anchorU[0];
    let best = lo, bs = -Infinity;
    for (let x = lo; x <= hi + 1e-6; x += DEG / 2) {
      const m = DEG;
      let n = 0;
      MINE.forEach((q) => { if (q.bU.x0 >= x + m && q.bU.x1 <= x + R.w - m) n += 1; });
      const off = Math.abs(homeX - (x + R.w / 2)) / R.w;
      const sc = n - 3 * Math.max(0, off - 0.2);
      if (sc > bs + 1e-9) { bs = sc; best = x; }
    }
    return best;
  }

  // the numbers set in the band, as large as it allows, the trip line at its end (a wide window); or in
  // three columns under the map (a phone)
  let boxes = [], tripBox = null, hintBox = null;
  function placeRow() {
    boxes = [];
    const W = G.F.w, H = G.h;   // (the map's own width: on a wide window with the list, short of the column)
    if (G.narrow) {
      stats.forEach((st, i) => {
        const x = G.edge + i * (G.colW + G.colGap) + (G.colW - G.row.boxes[i].w) / 2, y = G.rowY;
        st.style.setProperty('--x', `${x.toFixed(1)}px`); st.style.setProperty('--y', `${y.toFixed(1)}px`);
        boxes.push({ x, y, w: G.row.boxes[i].w, h: G.row.boxes[i].h });
      });
      tripBox = { x: W - G.edge - G.trip.w, y: G.tripY, w: G.trip.w, h: G.trip.h };
      hintBox = { x: W - G.edge - G.trip.hw, y: G.hintY, w: G.trip.hw, h: G.trip.hh };
      G.F1 = G.row.F;
    } else {
      const band = G.bandPx;
      const edge = clamp(W * 0.032, 16, 40);
      const padB = clamp(band * 0.15, 12, 30), padT = clamp(band * 0.16, 12, 34);
      const ik = inkOf(100), per = (100 - ik.top - ik.bot) / 100;
      let F = Math.min((band - padT - padB) / per, H * 0.2);
      const tb = measureTrip(false);
      let m = null, gap = 0;
      for (let i = 0; i < 16; i++) {
        m = measureRow(F);
        gap = clamp(F * 0.62, 30, 120);
        const need = edge + m.boxes.reduce((s, b) => s + b.w, 0) + 2 * gap + Math.max(40, gap * 0.6) + tb.w + edge;
        if (need <= W || F < 30) break;
        F *= 0.94;
      }
      const base = H - padB; // the figures' line
      const y = base - m.inkH;
      // spread along the band: the free width shared between the two gaps, within reason
      const free = W - 2 * edge - m.boxes.reduce((s, b) => s + b.w, 0) - tb.w - Math.max(40, gap * 0.6);
      gap = clamp(free / 2.4, gap, F * 1.7);
      let x = edge;
      stats.forEach((st, i) => {
        st.style.setProperty('--x', `${x.toFixed(1)}px`); st.style.setProperty('--y', `${y.toFixed(1)}px`);
        boxes.push({ x, y, w: m.boxes[i].w, h: m.boxes[i].h });
        x += m.boxes[i].w + gap;
      });
      // its baseline on the figures' line, near enough: the small capitals sit a little above the box's foot
      tripBox = { x: W - edge - tb.w, y: base - tb.h + 3, w: tb.w, h: tb.h };
      hintBox = tripBox;
      G.F1 = F;
    }
    tripEl.style.setProperty('--x', `${tripBox.x.toFixed(1)}px`); tripEl.style.setProperty('--y', `${tripBox.y.toFixed(1)}px`);
    hintEl.style.setProperty('--x', `${hintBox.x.toFixed(1)}px`); hintEl.style.setProperty('--y', `${hintBox.y.toFixed(1)}px`);
    G.clear = clearings();
    // the share of the window's height the views keep each new place above
    G.band = G.narrow ? 0 : clamp((H - Math.min(...boxes.map((b) => b.y)) + 16) / H, 0, 0.4);
  }

  // the paper kept clear on a wide window: round the numbers, the trip line and the top bar's words, each
  // a box with the margin the engraving keeps from it and the width over which it thins away
  function clearings() {
    if (G.narrow) return null;
    const F = G.F1 || 80;
    const pad = Math.max(6, F * 0.06), soft = Math.max(14, F * 0.16);
    const list = boxes.map((b) => ({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad, soft, veil: true }));
    list.push({ x: tripBox.x - 5, y: tripBox.y - 5, w: tripBox.w + 10, h: tripBox.h + 10, soft: 14 });
    const sr = stage.getBoundingClientRect();
    document.querySelectorAll('.fp-top__name, .fp-lang, .top__name, .top__nav a, .top__lang button').forEach((n) => {
      const r = n.getBoundingClientRect();
      if (!r.width || r.bottom <= sr.top || r.top >= sr.bottom) return;
      list.push({ x: r.left - sr.left - 6, y: r.top - sr.top - 6, w: r.width + 12, h: r.height + 12, soft: 16 });
    });
    return list;
  }

  /* ------------------------------------------------------------ the plan: one move, then who colours when */

  function plan() {
    const { F, band, narrow } = G;
    const REST = G.rest;
    const A = F.w / F.h;
    const topF = narrow ? 0 : clamp(52 / F.h, 0, 0.1); // the top bar's words
    if (narrow && G.slide) REST.x0 = restX();
    const V1 = { ...REST }; // it rests on band's wall map (on a phone, on its resting view)
    // the first view: close in on Taiwan, East Asia filling the window, home a little right of the middle,
    // and wholly inside the last view, so that the move only ever widens
    const twU = projU([121.0, 23.7]);
    const w0 = Math.min(V1.w, DEG * (narrow ? 40 : 62)), h0 = w0 / A;
    const V0 = STAY ? { ...V1 } : {
      x0: clamp(twU[0] - w0 * 0.55, V1.x0, V1.x0 + V1.w - w0),
      y0: clamp(twU[1] - (topF + (1 - band - topF) * 0.57) * h0, V1.y0, V1.y0 + V1.h - h0),
      w: w0, h: h0,
    };
    P = { V0, V1, A, viewEnd: HOLD + GLIDE };

    // when a box on the sheet is first wholly in view as the view widens, its middle above the numbers
    const sees = (v, b) => {
      const mx = v.w * 0.015, my = v.h * 0.015;
      return b.x0 >= v.x0 + mx && b.x1 <= v.x0 + v.w - mx && b.y0 >= v.y0 + my && b.y1 <= v.y0 + v.h - my
        && (b.y0 + b.y1) / 2 <= v.y0 + (1 - band) * v.h;
    };
    const firstIn = (b) => {
      for (let t = HOLD; t < HOLD + GLIDE + 8; t += 8) { const tt = Math.min(t, HOLD + GLIDE); if (sees(viewAt(tt), b)) return tt; }
      return Infinity; // never on screen (on a phone, the far side of the sheet)
    };
    // the turns at an even pace: a line from the first to the last, bent only where the view has not yet
    // reached enough of them (the least concave curve over the moments they come into view), so the count
    // climbs as one sweep; then, at each turn, the earliest trip among those the view already holds
    const queue = (items, from, to, gap) => {
      const N = items.length;
      if (!N) return;
      const R = items.map((o) => (Number.isFinite(o.reach) ? o.reach : to)).sort((a, b) => a - b);
      const pts = R.map((r, k) => [k, Math.max(r, from)]);
      pts[N - 1][1] = Math.max(pts[N - 1][1], to);
      const hull = [];
      pts.forEach((q) => {
        while (hull.length >= 2) {
          const [a, b] = hull.slice(-2);
          if ((b[1] - a[1]) * (q[0] - a[0]) <= (q[1] - a[1]) * (b[0] - a[0])) hull.pop(); else break;
        }
        hull.push(q);
      });
      const T = [];
      for (let k = 0, h = 0; k < N; k++) {
        while (h < hull.length - 2 && hull[h + 1][0] < k) h++;
        const [a, b] = hull.length > 1 ? [hull[h], hull[h + 1]] : [hull[0], hull[0]];
        T.push(b[0] === a[0] ? a[1] : lerp(a[1], b[1], (k - a[0]) / (b[0] - a[0])));
        if (k) T[k] = Math.max(T[k], T[k - 1] + gap);
      }
      const left = items.slice();
      T.forEach((t) => {
        let ready = left.filter((o) => o.reach <= t);
        if (!ready.length) ready = left.filter((o) => !Number.isFinite(o.reach));
        if (!ready.length) ready = left;
        const o = ready[0];
        o.at = t;
        left.splice(left.indexOf(o), 1);
      });
    };

    MINE.forEach((m) => { if (!m.home) { m.tb = Infinity; m.wash = null; m.bleed = null; m.live = null; } });
    ARCS.forEach((a) => { a.t0 = Infinity; });
    const lands = [], flights = [];
    FP.ramp.forEach((st) => {
      st.fresh.forEach((c) => {
        const m = byId.get(c.id);
        if (!m) return;
        m.entryU = projU(entryOf(c, st));
        lands.push({ m, reach: firstIn(m.nameU) });
      });
      st.flights.forEach((f) => {
        const a = ARCS.find((x) => x.f === f);
        if (!a) return;
        a.dur = clamp(360 + f.km * 0.02, 420, 620) * TEMPO;
        const pt = (p) => ({ x0: p[0] - 1, y0: p[1] - 1, x1: p[0] + 1, y1: p[1] + 1 });
        // under way once its start is in view, timed to reach its far end as the view does
        const reach = Math.max(firstIn(pt(a.pts[0])), firstIn(pt(a.pts[a.pts.length - 1])) - a.dur);
        flights.push({ a, reach });
      });
    });
    queue(lands, HOLD + 60, HOLD + GLIDE * SWEEP, GAP);
    queue(flights, HOLD + 30, HOLD + GLIDE * FSWEEP, FGAP);

    // the counts: each a list of small climbs, eased in and out, so together they read as one sweep
    const inc = { c: [], f: [], p: [] };
    if (FP.home.photos) inc.p.push({ t0: HOLD - 120 * TEMPO, dur: 520 * TEMPO, n: FP.home.photos });
    lands.forEach(({ m, at }) => {
      m.tb = at;
      inc.c.push({ t0: at, dur: 300 * TEMPO, n: 1 });
      if (m.c.photos) inc.p.push({ t0: at + 80 * TEMPO, dur: 440 * TEMPO, n: m.c.photos });
    });
    flights.forEach(({ a, at }) => {
      a.t0 = at;
      inc.f.push({ t0: at + a.dur - 200 * TEMPO, dur: 240 * TEMPO, n: 1 });
    });
    P.inc = inc;
    P.lastLand = Math.max(...lands.map((o) => o.at));
    // the places he landed: a small dot as the pen first reaches them, or leaves them
    const dots = new Map();
    ARCS.forEach((a) => {
      if (!Number.isFinite(a.t0)) return;
      const ends = [[a.f.from, a.pts[0], a.t0, a.homeFrom], [a.f.to, a.pts[a.pts.length - 1], a.t0 + a.dur, a.homeTo]];
      ends.forEach(([p, u, t, home]) => {
        if (home) return;
        const d = dots.get(p.city);
        if (!d || t < d.t) dots.set(p.city, { u, t });
      });
    });
    DOTS = [...dots.values()];
    const ends = [P.viewEnd];
    MINE.forEach((m) => { if (Number.isFinite(m.tb)) ends.push(m.tb + BLEED, m.tb + BLEED * 0.3 + NAME); });
    ARCS.forEach((a) => { if (Number.isFinite(a.t0)) ends.push(a.t0 + a.dur + SETTLE); });
    Object.values(inc).forEach((l) => l.forEach((x) => ends.push(x.t0 + x.dur)));
    P.END = Math.max(...ends) + 80;
    const total = (l) => l.reduce((s, x) => s + x.n, 0);
    if (total(inc.c) !== FINAL.countries || total(inc.f) !== FINAL.flights || total(inc.p) !== FINAL.photos) {
      console.warn('glide-calm: the counted totals differ from FP.counts', total(inc.c), total(inc.f), total(inc.p));
    }
  }

  // the view at a moment: one move from the first view to the last, the scale changing evenly
  // (geometrically) and every edge moving outward with it
  function between(a, b, e) {
    if (Math.abs(a.w - b.w) < 1e-6) return { x0: lerp(a.x0, b.x0, e), y0: lerp(a.y0, b.y0, e), w: a.w, h: a.h };
    const w = a.w * Math.pow(b.w / a.w, e);
    const g = (w - a.w) / (b.w - a.w);
    return { x0: lerp(a.x0, b.x0, g), y0: lerp(a.y0, b.y0, g), w, h: w / P.A };
  }
  // a phone's resting view, where a finger has slid it
  let pan = 0, slid = false;
  function restView() {
    const v = P.V1;
    if (!G.slide) return v;
    return { ...v, x0: clamp(v.x0 + pan, G.W0.x0, G.W0.x0 + G.W0.w - v.w) };
  }
  function viewAt(t) {
    if (t <= HOLD) return P.V0;
    if (t >= HOLD + GLIDE) return restView();
    return between(P.V0, P.V1, breath(unit(t, HOLD, GLIDE)));
  }
  const zOf = (v) => P.V1.w / v.w; // the zoom against the resting view
  const countAt = (list, t) => Math.round(list.reduce((s, x) => s + x.n * inOut(unit(t, x.t0, x.dur)), 0));
  // the date line's year: from the first year to the last as the colours run, landing softly on it
  const yearAt = (t) => SINCE + Math.floor((UNTIL - SINCE + 0.999) * (1 - Math.pow(1 - unit(t, HOLD + 60, P.lastLand - HOLD - 60), 1.25)));

  /* ------------------------------------------------------------ the washes (bolder's, laid on the unit sheet) */

  // one sheet of wash per country, made at the scale it is first seen coloured: the shape a little off
  // the line, the edge uneven, pigment pooled along it, mottled in the middle (the paper's tooth is laid
  // over all of them on the screen)
  function makeWash(m, s1) {
    const col = m.tone.rgb, seed = hashStr(m.id) & 0xffff;
    let R = s1 * DPR; // texture px per unit
    const padU = 4 / s1;
    const bx0 = m.bU.x0 - padU, by0 = m.bU.y0 - padU, bw = m.bU.x1 - m.bU.x0 + 2 * padU, bh = m.bU.y1 - m.bU.y0 + 2 * padU;
    if (Math.max(bw, bh) * R > 2048) R = 2048 / Math.max(bw, bh);
    const w = Math.max(2, Math.ceil(bw * R)), h = Math.max(2, Math.ceil(bh * R));
    const lift = s1 / R; // css px (as first seen) per texture px
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const off = [((rand(seed) - 0.5) * 2.2) / s1, ((rand(seed + 9) - 0.5) * 2.2) / s1]; // the colourist's hand, a little off
    ctx.setTransform(R, 0, 0, R, (-bx0 + off[0]) * R, (-by0 + off[1]) * R);
    ctx.fillStyle = MASK;
    if (m.pathU) ctx.fill(m.pathU);
    const img = ctx.getImageData(0, 0, w, h), px = img.data, N = w * h;
    const din = new Float64Array(N), dout = new Float64Array(N);
    for (let i = 0; i < N; i++) { const inside = px[i * 4 + 3] >= 128; din[i] = inside ? INF : 0; dout[i] = inside ? 0 : INF; }
    edt(din, w, h); edt(dout, w, h);
    const [r, gg, bb] = col;
    const gx0 = bx0 * s1, gy0 = by0 * s1;
    for (let y = 0, i = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i++) {
        const a = px[i * 4 + 3] / 255;
        let sd = a > 0.02 && a < 0.98 ? a - 0.5 : a >= 0.5 ? Math.sqrt(din[i]) - 0.5 : 0.5 - Math.sqrt(dout[i]);
        sd *= lift;
        if (sd < -2.5) { px[i * 4 + 3] = 0; continue; }
        const gx = gx0 + x * lift, gy2 = gy0 + y * lift;
        const ne = noise(gx / 5.5, gy2 / 5.5, seed) * 0.65 + noise(gx / 1.9, gy2 / 1.9, seed + 7) * 0.35;
        const e = sd + (ne - 0.5) * 1.9 + 0.15;
        const cov = clamp(e / lift + 0.5, 0, 1);
        if (cov <= 0) { px[i * 4 + 3] = 0; continue; }
        const pool = Math.exp(-Math.max(e, 0) / 1.25);
        const mott = noise(gx / 24, gy2 / 24, seed + 3) * 0.6 + noise(gx / 8, gy2 / 8, seed + 5) * 0.4;
        const al = 0.62 + 0.18 * mott + 0.3 * pool;
        const dk = 1 - 0.2 * pool;
        px[i * 4] = r * dk; px[i * 4 + 1] = gg * dk; px[i * 4 + 2] = bb * dk;
        px[i * 4 + 3] = clamp(cov * al, 0, 1) * 255;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(img, 0, 0);
    m.wash = { cv, x: bx0, y: by0, w: w / R, h: h / R, R };
    if (m.home) return;
    // the order the wash reaches each part: out from where he landed, its front a little uneven, the same every time
    const q = clamp(Math.ceil(Math.max(w, h) / 200), 1, 6);
    const qw = Math.ceil(w / q), qh = Math.ceil(h / q);
    const ex = (m.entryU[0] - bx0) * R, ey = (m.entryU[1] - by0) * R;
    const tm = new Float32Array(qw * qh);
    let far = 1;
    for (let y = 0; y < qh; y++) for (let x = 0; x < qw; x++) {
      const sx = Math.min(w - 1, x * q + (q >> 1)), sy = Math.min(h - 1, y * q + (q >> 1));
      const d = Math.hypot(sx - ex, sy - ey);
      tm[y * qw + x] = d;
      if (px[(sy * w + sx) * 4 + 3] > 8 && d > far) far = d;
    }
    for (let y = 0; y < qh; y++) for (let x = 0; x < qw; x++) {
      const i = y * qw + x;
      tm[i] = (0.8 * tm[i]) / far + 0.2 * noise(((x * q) * lift + gx0) / 38, ((y * q) * lift + gy0) / 38, seed + 21);
    }
    const mcv = document.createElement('canvas'); mcv.width = qw; mcv.height = qh;
    const mc = mcv.getContext('2d');
    m.bleed = { tm, cv: mcv, ctx: mc, img: mc.createImageData(qw, qh) };
    const lv = document.createElement('canvas'); lv.width = w; lv.height = h;
    m.live = lv;
  }
  // the wash part way out: the sheet masked by how far the colour has run
  function bleeding(m, p) {
    const B = m.bleed, data = B.img.data, a = 1.25 * p;
    for (let i = 0; i < B.tm.length; i++) data[i * 4 + 3] = 255 * clamp((a - B.tm[i]) / 0.25, 0, 1);
    B.ctx.putImageData(B.img, 0, 0);
    const lc = m.live.getContext('2d');
    lc.globalCompositeOperation = 'copy'; lc.imageSmoothingEnabled = true;
    lc.drawImage(B.cv, 0, 0, m.live.width, m.live.height);
    lc.globalCompositeOperation = 'source-in';
    lc.drawImage(m.wash.cv, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    return m.live;
  }

  // the paper's tooth: a small tile of fine noise, rubbed out of the washes on the screen
  let tooth = null;
  function makeTooth() {
    const S = 184, cells = 160; // 1.15 css px a cell, wrapping
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = noise((x / S) * cells, (y / S) * cells, 4242, cells);
      img.data[(y * S + x) * 4 + 3] = 255 * 0.3 * n * n * n;
    }
    ctx.putImageData(img, 0, 0);
    tooth = wctx.createPattern(cv, 'repeat');
  }

  /* ------------------------------------------------------------ the water-lining, on the graphics card */

  // bolder's water-lines (rings at a set distance from every coast, closer near the shore, fading out
  // to sea), drawn from a distance field on the sheet, so their spacing stays the same on the screen
  // while the view widens. Three fields, finer close in.
  const sea = { gl: null };
  const NCLR = 8;
  const VS = '#version 300 es\nin vec2 pos; void main() { gl_Position = vec4(pos, 0.0, 1.0); }';
  const FS = `#version 300 es
precision highp float;
uniform sampler2D tA, tB, tC, tD;
uniform vec4 rA, rB, rC, rD;
uniform vec4 clr[${NCLR}];
uniform vec3 view, col;
uniform vec2 lev, soft, has;
uniform float H, zoom, dpr, sp, lines, clearOn;
out vec4 o;
bool inR(vec2 u, vec4 r) { return u.x >= r.x && u.y >= r.y && u.x <= r.z && u.y <= r.w; }
vec2 uvR(vec2 u, vec4 r) { return (u - r.xy) / (r.zw - r.xy); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, H - gl_FragCoord.y);
  vec2 u = (p - view.xy) / view.z;
  float D;
  if (has.x > 0.5 && zoom >= lev.x && inR(u, rA)) D = texture(tA, uvR(u, rA)).r;
  else if (has.y > 0.5 && zoom >= lev.y && inR(u, rB)) D = texture(tB, uvR(u, rB)).r;
  else D = texture(tC, uvR(u, rC)).r;
  float d = D * view.z / dpr;
  if (d <= 0.0) discard;
  float a = 0.16 * sp, b = 2.35 * sp, c = 1.7 * sp;
  float fi = (-b + sqrt(max(b * b - 4.0 * a * (c - d), 0.0))) / (2.0 * a);
  float i = floor(fi + 0.5);
  if (i < 0.0 || i > lines - 1.0) discard;
  float ri = c + b * i + a * i * i;
  float dist = abs(d - ri) * dpr;
  float cov = clamp(0.275 * dpr + 0.5 - dist, 0.0, 1.0);
  float al = 0.66 * pow(1.0 - i / lines, 1.4) * cov;
  float den = texture(tD, uvR(u, rD)).r;
  float near = 0.6 * exp(-d / (5.5 * sp));
  al *= clamp(max(near, pow(clamp(den / 0.045, 0.0, 1.0), 0.8)), 0.0, 1.0);
  if (clearOn > 0.5) {
    float g = 1.0;
    for (int k = 0; k < ${NCLR}; k++) { vec2 q = max(max(clr[k].xy - p, p - clr[k].zw), 0.0); g = min(g, smoothstep(soft.x, soft.x + soft.y, length(q))); }
    al *= g;
  }
  float lat = degrees(-2.0 * atan(u.y / (${KG.toFixed(6)} * ${U.toFixed(1)})));
  al *= 1.0 - 0.6 * smoothstep(62.0, 80.0, abs(lat)); // the polar seas left plainer, as the old plates have them
  o = vec4(col * al, al);
}`;
  function initSea() {
    const gl = seaCv.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return; }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'pos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    const u = {};
    ['tA', 'tB', 'tC', 'tD', 'rA', 'rB', 'rC', 'rD', 'clr[0]', 'view', 'col', 'lev', 'soft', 'has', 'H', 'zoom', 'dpr', 'sp', 'lines', 'clearOn'].forEach((n) => { u[n] = gl.getUniformLocation(prog, n); });
    u.clr = u['clr[0]'];
    gl.uniform1i(u.tA, 0); gl.uniform1i(u.tB, 1); gl.uniform1i(u.tC, 2); gl.uniform1i(u.tD, 3);
    sea.gl = gl; sea.u = u; sea.prog = prog;
    sea.blank = upload(new Float32Array([0]), 1, 1);
    seaCv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); sea.gl = null; });
  }
  function upload(data, w, h) {
    const gl = sea.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  // the land drawn on a grid over a part of the sheet; then each sea cell's distance to the nearest coast, in units
  function rasterLand(rect, texel, cap) {
    let tw2 = Math.ceil(rect.w / texel), th = Math.ceil(rect.h / texel);
    if (Math.max(tw2, th) > cap) { texel *= Math.max(tw2, th) / cap; tw2 = Math.ceil(rect.w / texel); th = Math.ceil(rect.h / texel); }
    const cv = document.createElement('canvas'); cv.width = tw2; cv.height = th;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(1 / texel, 0, 0, 1 / texel, -rect.x0 / texel, -rect.y0 / texel);
    ctx.fillStyle = MASK; ctx.fill(landPlain);
    return { d: ctx.getImageData(0, 0, tw2, th).data, tw: tw2, th, texel, rect: [rect.x0, rect.y0, rect.x0 + tw2 * texel, rect.y0 + th * texel] };
  }
  function field(rect, texel) {
    const L = rasterLand(rect, texel, 3072);
    const g = new Float32Array(L.tw * L.th);
    for (let i = 0; i < g.length; i++) g[i] = L.d[i * 4 + 3] > 127 ? 0 : INF;
    edt(g, L.tw, L.th);
    for (let i = 0; i < g.length; i++) g[i] = g[i] > 0 ? Math.min(6e4, Math.max(0.02, Math.sqrt(g[i]) - 0.5) * L.texel) : 0;
    return { tex: upload(g, L.tw, L.th), rect: L.rect };
  }
  // an island alone in the ocean keeps two or three rings; a long coast keeps them all
  function density() {
    const W0 = G.W0, texel = 4 / G.sf, padU = 60 / G.sf;
    const L = rasterLand({ x0: W0.x0 - padU, y0: W0.y0 - padU, w: W0.w + 2 * padU, h: W0.h + 2 * padU }, texel, 2048);
    const g = new Float32Array(L.tw * L.th);
    for (let i = 0; i < g.length; i++) g[i] = L.d[i * 4 + 3] > 110 ? 1 : 0;
    blur(g, L.tw, L.th, Math.round(38 / 4));
    return { tex: upload(g, L.tw, L.th), rect: L.rect };
  }
  // the parts of the sheet seen at each band of zoom, each with a grid fine enough for it
  function seaLevels() {
    const { W0, sf } = G;
    const z0 = zOf(P.V0);
    const zA = Math.min(3, z0 * 0.75), zB = Math.min(1.5, zA * 0.6);
    const pad = (z) => (56 * G.sp) / (z * sf);
    const union = (lo, hi) => {
      let b = null;
      for (let t = 0; t <= P.viewEnd + 16; t += 16) { const v = viewAt(t), z = zOf(v); if (z >= lo && z < hi) b = join(b, ofView(v)); }
      return b;
    };
    const grow = (b, p) => { const x0 = Math.max(W0.x0 - p, b.x0 - p), y0 = Math.max(W0.y0 - p, b.y0 - p); return { x0, y0, w: Math.min(W0.x0 + W0.w + p, b.x1 + p) - x0, h: Math.min(W0.y0 + W0.h + p, b.y1 + p) - y0 }; };
    const want = [];
    const a = union(zA, Infinity), b = union(zB, zA);
    if (a && z0 > 1.05) want.push(['A', grow(a, pad(zA)), 1.25 / (z0 * sf)]);
    if (b) want.push(['B', grow(b, pad(zB)), 1.25 / (zA * sf)]);
    want.push(['C', grow(ofView(W0), pad(1)), 1.25 / (Math.max(zB, STAY ? 1.5 : 1) * sf)]); // as fine as the moving pages' whole map
    return { zA, zB, want };
  }
  function drawSea(c) {
    const gl = sea.gl;
    if (!gl || !sea.C) return;
    const u = sea.u, F = G.F;
    gl.viewport(0, 0, seaCv.width, seaCv.height);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(Math.floor(F.x * DPR), Math.floor(seaCv.height - (F.y + F.h) * DPR), Math.ceil(F.w * DPR), Math.ceil(F.h * DPR));
    gl.useProgram(sea.prog);
    const bind = (unitN, lv) => { gl.activeTexture(gl.TEXTURE0 + unitN); gl.bindTexture(gl.TEXTURE_2D, lv ? lv.tex : sea.blank); };
    bind(0, sea.A); bind(1, sea.B); bind(2, sea.C); bind(3, sea.D);
    const r4 = (lv) => (lv ? lv.rect : [0, 0, 1, 1]);
    gl.uniform4fv(u.rA, r4(sea.A)); gl.uniform4fv(u.rB, r4(sea.B)); gl.uniform4fv(u.rC, r4(sea.C)); gl.uniform4fv(u.rD, r4(sea.D));
    gl.uniform2f(u.has, sea.A ? 1 : 0, sea.B ? 1 : 0);
    gl.uniform2f(u.lev, sea.zA, sea.zB);
    gl.uniform3f(u.view, c.ox * DPR, c.oy * DPR, c.s * DPR);
    gl.uniform1f(u.H, seaCv.height); gl.uniform1f(u.zoom, c.z); gl.uniform1f(u.dpr, DPR);
    gl.uniform1f(u.sp, G.sp); gl.uniform1f(u.lines, G.narrow ? 8 : 12);
    gl.uniform3fv(u.col, sea.col);
    const cl = G.clear;
    gl.uniform1f(u.clearOn, cl ? 1 : 0);
    if (cl) {
      const arr = new Float32Array(NCLR * 4);
      for (let k = 0; k < NCLR; k++) { const r = cl[Math.min(k, cl.length - 1)]; arr.set([r.x * DPR, r.y * DPR, (r.x + r.w) * DPR, (r.y + r.h) * DPR], k * 4); }
      gl.uniform4fv(u.clr, arr); gl.uniform2f(u.soft, 2 * DPR, Math.max(...cl.map((r) => r.soft)) * DPR);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ------------------------------------------------------------ the lettering (typeset's) */

  const canLS = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;
  function spaced(ctx, s, ls) { // the width of a spaced line, without the space after its last letter
    if (canLS) { ctx.letterSpacing = `${ls}px`; const w = ctx.measureText(s).width - ls; ctx.letterSpacing = '0px'; return w; }
    let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls;
    return w - ls;
  }
  function spacedText(ctx, s, x, y, ls, halo) {
    if (canLS) {
      ctx.letterSpacing = `${ls}px`;
      if (halo) ctx.strokeText(s, x, y);
      ctx.fillText(s, x, y);
      ctx.letterSpacing = '0px';
      return;
    }
    for (const ch of s) { if (halo) ctx.strokeText(ch, x, y); ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + ls; }
  }
  const SERIF = '"Playfair Display", "Noto Serif TC", serif';
  // a country's lettering, as band set it: spaced serif capitals in three sizes, the year in old-style
  // figures after the name or under it (home: its word, in clay)
  function styleOf(m) {
    const k = G.narrow ? 0.7 : G.k, zh = FP.lang === 'zh';
    const size = m.home ? 'm' : (PLACE[m.id] || {}).size || 'm';
    const fs = zh
      ? (size === 'l' ? Math.max(10.4, 13.5 * k) : size === 's' ? Math.max(9, 10 * k) : Math.max(9.6, 11 * k))
      : (size === 'l' ? Math.max(10, 13 * k) : size === 's' ? Math.max(8, 9.25 * k) : Math.max(8.6, 10.5 * k));
    const em = m.home ? (zh ? 0.12 : 0.18) : zh
      ? (size === 'l' ? 0.6 * k - 0.1 : size === 's' ? 0.08 : 0.1)
      : (size === 'l' ? 0.32 * k - 0.08 : size === 's' ? 0.12 : 0.16);
    return { fs, ls: fs * em, size };
  }
  const metrics = new Map();
  function measure(m) {
    const key = `${FP.lang}|${m.id}|${G.k}|${G.narrow}`;
    if (metrics.has(key)) return metrics.get(key);
    const ctx = mctx, zh = FP.lang === 'zh', st = styleOf(m), p = PLACE[m.id] || {};
    const name = m.home ? m.c.name[FP.lang] : m.c.country[FP.lang];
    const cap = zh ? name : name.toUpperCase();
    const nameFont = `${zh ? 500 : 400} ${st.fs}px ${SERIF}`;
    ctx.font = nameFont;
    let lines = [cap];
    if (p.wrap) { // two lines, the year after the second
      const parts = zh ? [cap.slice(0, p.zhCut || 2), cap.slice(p.zhCut || 2)] : cap.split(' ');
      const cut = Math.ceil(parts.length / 2), sep = zh ? '' : ' ';
      lines = [parts.slice(0, cut).join(sep), parts.slice(cut).join(sep)];
    }
    const lw = lines.map((l) => spaced(ctx, l, st.ls));
    let tail, tfs, tailFont, tailLs;
    if (m.home) {
      tail = zh ? FP.w.home : FP.w.home.toUpperCase();
      tfs = st.fs * (zh ? 0.86 : 0.66);
      tailFont = zh ? `500 ${tfs}px "Noto Sans TC", sans-serif` : `600 ${tfs}px "Geist", sans-serif`;
      tailLs = tfs * (zh ? 0.04 : 0.16);
    } else {
      tail = String(m.c.first);
      tfs = st.fs * (st.size === 'l' ? 0.74 : 0.8);
      tailFont = `400 ${tfs}px ${SERIF}`;
      tailLs = tfs * (st.size === 'l' ? 0.06 : 0.03);
    }
    ctx.font = tailFont;
    const wt = spaced(ctx, tail, tailLs);
    const out = {
      lines, lw, tail, wt, tfs, gap: st.fs * (zh ? 0.3 : 0.45), lh: st.fs * 1.2, stack: !!p.stack, anchor: p.a || 'middle',
      halo: !p.inside, fs: st.fs, ls: st.ls, nameFont, tailFont, tailLs, small: st.size === 's',
    };
    metrics.set(key, out);
    return out;
  }
  // a name set at (x, y), its anchor as the table has it: each piece's place and the box round them all
  function setName(me, x, y) {
    const left = (w) => (me.anchor === 'middle' ? x - w / 2 : me.anchor === 'end' ? x - w : x);
    const ops = [];
    let yy = y, x0 = Infinity, x1 = -Infinity;
    const last = me.lines.length - 1;
    me.lines.forEach((l, i) => {
      if (i) yy += me.lh;
      const inline = i === last && !me.stack;
      const w = me.lw[i] + (inline ? me.gap + me.wt : 0), lx = left(w);
      ops.push({ s: l, font: me.nameFont, ls: me.ls, x: lx, y: yy, tail: false });
      if (inline) ops.push({ s: me.tail, font: me.tailFont, ls: me.tailLs, x: lx + me.lw[i] + me.gap, y: yy, tail: true });
      x0 = Math.min(x0, lx); x1 = Math.max(x1, lx + w);
    });
    let foot = yy + me.fs * 0.22;
    if (me.stack) {
      yy += me.tfs * 1.15;
      const lx = left(me.wt);
      ops.push({ s: me.tail, font: me.tailFont, ls: me.tailLs, x: lx, y: yy, tail: true });
      x0 = Math.min(x0, lx); x1 = Math.max(x1, lx + me.wt);
      foot = yy + me.tfs * 0.22;
    }
    const top = y - me.fs * 0.78;
    return { ops, tight: { x: x0, y: top, w: x1 - x0, h: foot - top }, box: { x: x0 - 2, y: top - 1, w: x1 - x0 + 4, h: foot - top + 2 } };
  }
  // Western Europe's names, kept a clear line apart in their column
  function settle(at) {
    const out = new Map(), zh = FP.lang === 'zh', k = G.narrow ? 0.7 : G.k;
    const gap = Math.max(zh ? 9.6 : 8.6, (zh ? 11 : 10.5) * k) * 2.5;
    const groups = {};
    Object.entries(PLACE).forEach(([id, p]) => { if (p.group) (groups[p.group] = groups[p.group] || []).push({ id, p, xy: at(p.at) }); });
    Object.values(groups).forEach((list) => {
      const fixed = list.find((q) => q.p.fix) || list[0];
      list.forEach((q) => { q.x = q.p.col ? fixed.xy[0] : q.xy[0]; q.y = q.xy[1]; });
      list.sort((a, b) => a.y - b.y);
      const fi = list.indexOf(fixed);
      for (let i = fi - 1; i >= 0; i--) list[i].y = Math.min(list[i].y, list[i + 1].y - gap);
      for (let i = fi + 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + gap);
      list.forEach((q) => out.set(q.id, [q.x, q.y]));
    });
    return out;
  }
  function measureSea(s) {
    const key = `${FP.lang}|sea|${s.id}|${G.k}`;
    if (metrics.has(key)) return metrics.get(key);
    const zh = FP.lang === 'zh', fs = Math.max(zh ? 9 : 8, (zh ? 10.5 : 9.5) * G.k), ls = fs * (zh ? 1.1 : 0.62);
    const font = `${zh ? 500 : 400} ${fs}px ${SERIF}`;
    mctx.font = font;
    const lines = s[FP.lang], ws = lines.map((l) => spaced(mctx, l, ls));
    const out = { lines, ws, w: Math.max(...ws), fs, ls, font, lh: fs * 1.5 };
    metrics.set(key, out);
    return out;
  }

  const LBL = new Map(); // per name: how far faded in
  function drawLabels(ctx, c, t, dt) {
    const F = G.F, frame = { x: F.x + 4, y: F.y + 4, w: F.w - 8, h: F.h - 8 };
    const k = G.narrow ? 0.7 : G.k;
    const pad = 3 + 2.5 * clamp((1 - k) / 0.38, 0, 1);
    const few = k < 0.8; // a smaller map leaves the small countries unlettered: pointing names them
    const taken = G.clear ? G.clear.map((r) => ({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 })) : [];
    const ease = AT != null || dt > 1000 ? 1 : 1 - Math.exp(-dt / 170);
    const at = (ll) => { const u = projU(ll); return [c.ox + u[0] * c.s, c.oy + u[1] * c.s]; };
    const spots = settle(at);
    const names = FP.names();
    const items = [];
    MINE.forEach((m) => {
      const fade = m.home ? 1 : inOut(unit(t, m.tb + BLEED * 0.3, NAME));
      // on a phone's narrow map the small ones wait for the view to come close
      const close = m.home || !G.narrow ? 1 : m.rank < 3 ? clamp((c.s - 0.13) / 0.03, 0, 1) : clamp((c.s - 0.3) / 0.06, 0, 1);
      if (fade * close > 0 && (m.home || m.wash)) items.push({ m, fade: fade * close });
    });
    items.sort((a, b) => (a.m.rank - b.m.rank) || (b.m.area - a.m.area));
    const shows = [];
    items.forEach(({ m, fade }) => {
      const nm = names[m.c.iso];
      const p = PLACE[m.id] || { at: nm ? nm.at : [m.c.ll[1], m.c.ll[0]] };
      const me = measure(m);
      const [x, y] = spots.get(m.id) || at(p.at);
      const L = setName(me, x, y);
      const lead = p.lead ? at(p.lead) : null;
      const end = lead ? { x: lead[0] - 2, y: lead[1] - 2, w: 4, h: 4 } : null;
      const fits = m.home || (within(L.box, frame) && !(few && m.rank === 3)
        && !taken.some((o) => overlap(L.box, o, pad) || (end && overlap(end, o, 0))));
      const st = LBL.get(m.id) || { a: 0 };
      LBL.set(m.id, st);
      st.a += ((fits ? 1 : 0) - st.a) * ease;
      if (fits) taken.push(L.box);
      if (st.a * fade > 0.01) shows.push({ m, me, L, lead, a: st.a * fade });
    });
    // the oceans give way to everything
    const seas = [];
    SEAS.forEach((s) => {
      if (G.narrow) return;
      const me = measureSea(s);
      const [x, y] = at(s.at);
      const H2 = me.lh * (me.lines.length - 1) + me.fs;
      const box = { x: x - me.w / 2 - 3, y: y - me.fs, w: me.w + 6, h: H2 + 4 };
      const fits = within(box, frame) && !taken.some((o) => overlap(box, o, 8));
      const st = LBL.get(`sea|${s.id}`) || { a: 0 };
      LBL.set(`sea|${s.id}`, st);
      st.a += ((fits ? 1 : 0) - st.a) * ease;
      if (st.a > 0.01) seas.push({ me, x, y, a: st.a });
    });
    const PAPER = cssVar('--paper'), INK = cssVar('--ink'), INK2 = cssVar('--ink-2'), LINK = cssVar('--link');
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    seas.forEach(({ me, x, y, a }) => {
      ctx.globalAlpha = a * 0.72; ctx.font = me.font; ctx.fillStyle = cssVar('--tn-water');
      ctx.strokeStyle = PAPER; ctx.lineWidth = 3;
      me.lines.forEach((l, i) => spacedText(ctx, l, x - me.ws[i] / 2, y + i * me.lh, me.ls, true));
    });
    shows.forEach(({ m, me, L, lead, a }) => {
      ctx.globalAlpha = a * weight(m.id);
      // a fine leader from the nearest edge of the lettering to the place, and a dot there
      if (lead) {
        const b = L.tight, mg = 2.5, [lx, ly] = lead;
        const outside = lx < b.x || lx > b.x + b.w;
        const sx = outside ? clamp(lx, b.x - mg, b.x + b.w + mg) : clamp(lx, b.x, b.x + b.w);
        const sy = outside ? clamp(ly, b.y + b.h * 0.2, b.y + b.h * 0.8) : (ly < b.y ? b.y - 1 : b.y + b.h + 1);
        ctx.strokeStyle = INK2; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.fillStyle = INK2; ctx.beginPath(); ctx.arc(lx, ly, 1.1, 0, Math.PI * 2); ctx.fill();
      }
      // the paper halo under the whole name first, then the letters, so no letter's halo cuts its neighbour
      if (me.halo) {
        ctx.strokeStyle = PAPER; ctx.lineWidth = 3;
        L.ops.forEach((o) => { ctx.font = o.font; strokeSpaced(ctx, o.s, o.x, o.y, o.ls); });
      }
      L.ops.forEach((o) => {
        ctx.font = o.font;
        ctx.fillStyle = m.home ? LINK : o.tail || me.small ? INK2 : INK;
        spacedText(ctx, o.s, o.x, o.y, o.ls, false);
      });
    });
    ctx.restore();
  }
  function strokeSpaced(ctx, s, x, y, ls) {
    if (canLS) { ctx.letterSpacing = `${ls}px`; ctx.strokeText(s, x, y); ctx.letterSpacing = '0px'; return; }
    for (const ch of s) { ctx.strokeText(ch, x, y); x += ctx.measureText(ch).width + ls; }
  }

  /* ------------------------------------------------------------ one frame */

  function draw(t, dt) {
    const v = viewAt(t);
    const s = G.F.w / v.w;
    cur = { s, ox: G.F.x - v.x0 * s, oy: G.F.y - v.y0 * s, z: zOf(v), t };
    drawSea(cur);
    drawMap(cur, t, dt);
    showCounts(t);
    if (FP.onDraw) FP.onDraw(t);
  }

  // (data-fp-list) pointing at a year or a country in the list beside the map (travel-list.js, FP.focus):
  // those countries, their names and their flights stay; the rest step back, over about a fifth of a second
  let focusSet = null, focusK = 0, focusWant = 0, focusAt = 0, focusRaf = 0;
  const tripsOf = new Map(FP.journeys.map((j) => [j.id, j.countries]));
  const weight = (id) => (focusSet && !focusSet.has(id) ? 1 - 0.78 * focusK : 1);
  // the country a flight lands in (the shape holding its end, or the nearest of his within 600 km)
  const arcTo = (a) => {
    if (a.toId !== undefined) return a.toId;
    const pt = [a.f.to.lng, a.f.to.lat];
    let id = null;
    for (const m of MINE) if (m.feat && d3.geoContains(m.feat, pt)) { id = m.id; break; }
    if (!id) {
      let best = Infinity;
      MINE.forEach((m) => { const d = FP.km([pt[1], pt[0]], m.c.ll); if (d < best) { best = d; id = m.id; } });
      if (best > 600) id = null;
    }
    return (a.toId = id);
  };
  // (focus) a small plane flies each flight that lands in the countries pointed at, drawing its line as it goes
  const FLY_FADE = 600;
  let planes = [], planesEnd = 0;
  // (year) only that year's trips: a country pointed at under 2015 flies only the 2015 flights there
  // (trips, 2026-11-14: "照順序 ... 不用兩台飛機一起起飛 ... 然後要飛回台灣") a trip pointed at is flown as he
  // flew it: one plane, leg after leg in order, home at the end; a stretch he went by land is a dotted line
  let focusYear = null, focusKey = '', focusJ = null;
  const yearOfJ = (id) => +String(id).slice(0, 4);
  const inYear = (a) => (focusJ ? focusJ.has(a.f.journey) : focusYear == null || yearOfJ(a.f.journey) === focusYear);
  FP.focus = (ids, year, jids) => {
    const now = performance.now();
    if (ids && ids.length) {
      const key = `${ids.join(',')}@${year ?? ''}@${(jids || []).join(',')}`, was = focusWant ? focusKey : '';
      focusSet = new Set(ids); focusWant = 1; focusYear = year ?? null; focusKey = key;
      focusJ = jids && jids.length ? new Set(jids) : null;
      if (key !== was) {
        const legs = focusJ
          ? ARCS.filter((a) => Number.isFinite(a.t0) && focusJ.has(a.f.journey))
          : ARCS.filter((a) => Number.isFinite(a.t0) && inYear(a) && focusSet.has(arcTo(a)));
        const px = cur ? cur.s : 1;
        let at = now;
        planes = legs.map((a, i) => {
          const dur = clamp(380 + a.total * px * 1.5, 620, 1500);
          const p = { a, t0: at, dur, prev: i && legs[i - 1].f.journey === a.f.journey ? legs[i - 1] : null };
          at += dur + 140;
          return p;
        });
        planesEnd = planes.length ? at + FLY_FADE : 0;
      }
    } else { focusWant = 0; planes = []; planesEnd = 0; }
    if (!focusRaf) { focusAt = now; focusRaf = requestAnimationFrame(focusStep); }
  };
  function focusStep(now) {
    const d = Math.min(64, now - focusAt); focusAt = now;
    focusK = FP.reduced ? focusWant : focusK + (focusWant - focusK) * (1 - Math.exp(-d / 70));
    if (Math.abs(focusWant - focusK) < 0.01) focusK = focusWant;
    if (!focusK && !focusWant) focusSet = null;
    if (!raf && started && P) draw(AT != null ? AT : STILL || resting ? P.END + 1 : performance.now() - t0, 1e6);
    focusRaf = focusK !== focusWant || now < planesEnd ? requestAnimationFrame(focusStep) : 0;
  }

  function drawMap(c, t, dt) {
    const ctx = mctx, F = G.F, { s, ox, oy } = c;
    const INK = cssVar('--ink');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, mapCv.width, mapCv.height);
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.beginPath(); ctx.rect(F.x, F.y, F.w, F.h); ctx.clip();

    // the graticule, every fifteen degrees, the equator a shade firmer
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    for (let lon = -180; lon < 180; lon += 15) {
      const x = ox + xOfLon(lon) * s;
      if (x > F.x && x < F.x + F.w) { ctx.moveTo(x, F.y); ctx.lineTo(x, F.y + F.h); }
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      if (!lat) continue;
      const y = oy + gy(lat) * s;
      if (y > F.y && y < F.y + F.h) { ctx.moveTo(F.x, y); ctx.lineTo(F.x + F.w, y); }
    }
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    const ye = oy + gy(0) * s;
    ctx.beginPath(); ctx.moveTo(F.x, ye); ctx.lineTo(F.x + F.w, ye); ctx.stroke();
    ctx.globalAlpha = 1;

    // the washes, laid on their own sheet, the paper's tooth rubbed out of them, then multiplied in
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, washCv.width, washCv.height);
    wctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * ox, DPR * oy);
    wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'high';
    const dabs = [];
    MINE.forEach((m) => {
      const p = m.home ? 1 : spread(unit(t, m.tb, BLEED));
      if (p <= 0 || !m.wash) return;
      if (Math.max(m.bU.x1 - m.bU.x0, m.bU.y1 - m.bU.y0) * s < 7) { dabs.push({ m, p }); return; }
      const src = p >= 1 || !m.bleed ? m.wash.cv : bleeding(m, p);
      wctx.globalAlpha = weight(m.id);
      wctx.drawImage(src, m.wash.x, m.wash.y, m.wash.w, m.wash.h);
    });
    wctx.globalAlpha = 1;
    if (tooth) {
      wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      wctx.globalCompositeOperation = 'destination-out';
      wctx.fillStyle = tooth; wctx.fillRect(F.x, F.y, F.w, F.h);
      wctx.globalCompositeOperation = 'source-over';
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(washCv, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    // the engraving: borders, then coasts, smoothed close in
    const hi = s >= 0.6;
    ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * ox, DPR * oy);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.5; ctx.lineWidth = 0.4 / s; ctx.stroke(hi ? borderHi : borderLo);
    ctx.globalAlpha = 1; ctx.lineWidth = 0.72 / s; ctx.stroke(hi ? coastHi : coastLo);

    // a country too small to see: a dab of its colour in a fine ring
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    dabs.forEach(({ m, p }) => {
      const x = ox + m.anchorU[0] * s, y = oy + m.anchorU[1] * s, r = clamp(3.2 * G.k, 2.6, 3.8);
      ctx.globalAlpha = 0.85 * p * weight(m.id); ctx.fillStyle = m.tone.css; ctx.globalCompositeOperation = 'multiply';
      ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = p; ctx.lineWidth = 0.7; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    });

    // (focus) the countries pointed at lift off the sheet: a little larger, raised, a soft shadow under them
    if (focusSet && focusK > 0) {
      const PAPER = cssVar('--paper'), lift = 6 * focusK, grow = 1 + 0.04 * focusK;
      MINE.forEach((m) => {
        if (!focusSet.has(m.id) || !m.wash || !m.pathU) return;
        if ((m.home ? 1 : spread(unit(t, m.tb, BLEED))) < 1) return;
        const small = Math.max(m.bU.x1 - m.bU.x0, m.bU.y1 - m.bU.y0) * s < 7;
        ctx.save();
        ctx.shadowColor = `rgba(46, 36, 26, ${0.3 * focusK})`; ctx.shadowBlur = 16 * DPR * focusK; ctx.shadowOffsetY = 8 * DPR * focusK;
        if (small) {
          // a country too small to see: its dab grows and rises
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          const x = ox + m.anchorU[0] * s, y = oy + m.anchorU[1] * s - lift, r = clamp(3.2 * G.k, 2.6, 3.8) * (1 + 0.9 * focusK);
          ctx.fillStyle = m.tone.css; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          ctx.shadowColor = 'transparent'; ctx.lineWidth = 0.8; ctx.strokeStyle = INK; ctx.stroke();
        } else {
          const cx = (m.bU.x0 + m.bU.x1) / 2, cy = (m.bU.y0 + m.bU.y1) / 2, S = s * grow;
          ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * (ox + cx * s - cx * S), DPR * (oy + cy * s - cy * S - lift));
          ctx.fillStyle = PAPER; ctx.fill(m.pathU);
          ctx.shadowColor = 'transparent';
          ctx.globalCompositeOperation = 'multiply';
          ctx.drawImage(m.wash.cv, m.wash.x, m.wash.y, m.wash.w, m.wash.h);
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 0.9 / S; ctx.stroke(m.pathU);
        }
        ctx.restore();
      });
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    // the flights: fine arcs at low strength, drawn like a pen, settling faint
    const ROUTE = cssVar('--route'), INK2 = cssVar('--ink-2');
    ctx.lineWidth = 0.8; ctx.strokeStyle = ROUTE; ctx.lineCap = 'round';
    ARCS.forEach((a) => {
      const q = inOut(unit(t, a.t0, a.dur));
      if (q <= 0) return;
      ctx.globalAlpha = q < 1 ? 0.62 : lerp(0.62, 0.34, inOut(unit(t, a.t0 + a.dur, SETTLE)));
      if (focusSet) {
        const on = inYear(a) && (tripsOf.get(a.f.journey) || []).some((id) => focusSet.has(id));
        ctx.globalAlpha *= on ? 1 + 0.7 * focusK : 1 - 0.85 * focusK;
      }
      const L = q * a.total;
      ctx.beginPath();
      ctx.moveTo(ox + a.pts[0][0] * s, oy + a.pts[0][1] * s);
      for (let i = 1; i < a.pts.length; i++) {
        if (a.len[i] <= L) { ctx.lineTo(ox + a.pts[i][0] * s, oy + a.pts[i][1] * s); continue; }
        const f = (L - a.len[i - 1]) / (a.len[i] - a.len[i - 1] || 1);
        ctx.lineTo(ox + lerp(a.pts[i - 1][0], a.pts[i][0], f) * s, oy + lerp(a.pts[i - 1][1], a.pts[i][1], f) * s);
        break;
      }
      ctx.stroke();
    });
    // (focus) the planes: each line drawn firm behind its plane, the plane gone a moment after it lands
    if (planes.length && focusSet) {
      const now = performance.now();
      planes.forEach(({ a, t0: p0, dur, prev }, idx) => {
        const k = clamp((now - p0) / dur, 0, 1);
        if (now < p0) return;
        // the stretch between the last leg's landing and this one's take-off, if he went it by land
        if (prev) {
          const e = prev.pts[prev.pts.length - 1], b0 = a.pts[0];
          if (Math.hypot(e[0] - b0[0], e[1] - b0[1]) * s > 3) {
            ctx.save(); ctx.globalAlpha = 0.8 * focusK; ctx.setLineDash([2, 3]); ctx.lineWidth = 1; ctx.strokeStyle = INK;
            ctx.beginPath(); ctx.moveTo(ox + e[0] * s, oy + e[1] * s); ctx.lineTo(ox + b0[0] * s, oy + b0[1] * s); ctx.stroke(); ctx.restore();
          }
        }
        const q = inOut(k), L = q * a.total;
        let px = a.pts[0][0], py = a.pts[0][1], ang = 0;
        ctx.globalAlpha = 0.95 * focusK; ctx.lineWidth = 1.6; ctx.strokeStyle = ROUTE;
        ctx.beginPath(); ctx.moveTo(ox + px * s, oy + py * s);
        for (let i = 1; i < a.pts.length; i++) {
          const [x0, y0] = a.pts[i - 1], [x1, y1] = a.pts[i];
          if (a.len[i] <= L) { ctx.lineTo(ox + x1 * s, oy + y1 * s); px = x1; py = y1; ang = Math.atan2(y1 - y0, x1 - x0); continue; }
          const f = (L - a.len[i - 1]) / (a.len[i] - a.len[i - 1] || 1);
          px = lerp(x0, x1, f); py = lerp(y0, y1, f); ang = Math.atan2(y1 - y0, x1 - x0);
          ctx.lineTo(ox + px * s, oy + py * s);
          break;
        }
        ctx.stroke();
        // one plane in the air: it shows on its own leg only, and lingers a moment after the last landing
        const last = idx === planes.length - 1;
        const fade = k < 1 ? 1 : last ? 1 - clamp((now - p0 - dur) / FLY_FADE, 0, 1) : 0;
        if (fade <= 0) return;
        ctx.save();
        ctx.translate(ox + px * s, oy + py * s); ctx.rotate(ang);
        const sc = clamp(1.35 * G.k, 1.1, 1.55); ctx.scale(sc, sc);
        ctx.globalAlpha = fade * focusK; ctx.fillStyle = INK; ctx.strokeStyle = cssVar('--paper'); ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(8, 0); ctx.lineTo(3, -1.1); ctx.lineTo(-0.5, -7); ctx.lineTo(-2.4, -7); ctx.lineTo(-0.6, -1.2);
        ctx.lineTo(-5, -1.1); ctx.lineTo(-6.6, -3.4); ctx.lineTo(-7.6, -3.4); ctx.lineTo(-6.6, 0);
        ctx.lineTo(-7.6, 3.4); ctx.lineTo(-6.6, 3.4); ctx.lineTo(-5, 1.1); ctx.lineTo(-0.6, 1.2);
        ctx.lineTo(-2.4, 7); ctx.lineTo(-0.5, 7); ctx.lineTo(3, 1.1); ctx.closePath();
        ctx.stroke(); ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = INK2;
    DOTS.forEach((d) => {
      const a = inOut(unit(t, d.t, 400));
      if (a <= 0) return;
      ctx.globalAlpha = 0.6 * a;
      ctx.beginPath(); ctx.arc(ox + d.u[0] * s, oy + d.u[1] * s, 1.35, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    drawLabels(ctx, c, t, dt);

    // the clearings round the date line and the top bar's words: rings of rubbing out, wider and fainter
    // outwards, so the lines thin away. Round the numbers only a veil: the map goes on under them, about
    // half as strong (his call, 2026-11-09: "let the numbers down there cover on top is fine")
    if (G.clear) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      const N = 14;
      for (const veil of [false, true]) {
        const list = G.clear.filter((r) => !!r.veil === veil);
        for (let i = 0; i < N && list.length; i++) {
          ctx.globalAlpha = veil ? 0.045 : 0.28;
          ctx.beginPath();
          list.forEach((r) => {
            const grow = 2 + r.soft * (1 - i / (N - 1));
            if (ctx.roundRect) ctx.roundRect(r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow, grow); else ctx.rect(r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow);
          });
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // a phone: the map is a block across the page, a fine rule closing it above and below
    if (G.narrow) {
      ctx.save();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 0.55; ctx.strokeStyle = INK; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0, F.y + 0.3); ctx.lineTo(F.w, F.y + 0.3); ctx.moveTo(0, F.y + F.h - 0.3); ctx.lineTo(F.w, F.y + F.h - 0.3); ctx.stroke();
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------ the numbers and the date line */

  function showCounts(t) {
    const vals = { countries: countAt(P.inc.c, t), flights: countAt(P.inc.f, t), photos: countAt(P.inc.p, t) };
    KEYS.forEach((id) => {
      if (shown[id] === vals[id]) return;
      setDigits(num(id), FP.fmt(vals[id]));
      lab(id).textContent = tw().label[id](vals[id]);
      shown[id] = vals[id];
    });
    if (shown.pct !== vals.countries && pctEl) { setDigits(pctEl, shareOf(vals.countries)); shown.pct = vals.countries; }
    // the years running as the colours do, then resting on the whole span
    const txt = dateText(t >= P.END ? UNTIL : yearAt(t));
    if (shown.date !== txt) { tripEl.textContent = txt; shown.date = txt; }
    tripEl.classList.add('is-on');
    hintEl.classList.toggle('is-on', !!(G.slide && t >= P.END - 300 && !slid));
  }

  /* ------------------------------------------------------------ pointing, tapping and sliding */

  function countryAt(e, reach) {
    if (!cur || !G) return null;
    const r = mapCv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, F = G.F;
    if (x < F.x || x > F.x + F.w || y < F.y || y > F.y + F.h) return null;
    if (G.clear && G.clear.some((q) => x > q.x && x < q.x + q.w && y > q.y && y < q.y + q.h)) return null;
    const on = MINE.filter((m) => m.home || spread(unit(cur.t, m.tb, BLEED)) > 0.4);
    hitCtx.setTransform(cur.s, 0, 0, cur.s, cur.ox, cur.oy);
    for (const m of on) if (m.pathU && hitCtx.isPointInPath(m.pathU, x, y)) return m;
    let best = null, bd = reach;
    on.forEach((m) => { const d = Math.hypot(cur.ox + m.anchorU[0] * cur.s - x, cur.oy + m.anchorU[1] * cur.s - y); if (d < bd) { bd = d; best = m; } });
    return best;
  }
  const inMap = (e) => {
    if (!G) return false;
    const r = mapCv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, F = G.F;
    return x >= F.x && x <= F.x + F.w && y >= F.y && y <= F.y + F.h;
  };
  let pointed = null, tipT = 0, drag = null, slideRaf = 0;
  const restT = () => (AT != null ? AT : P.END + 1);
  function slideTo(p) {
    pan = p;
    if (slideRaf) return;
    slideRaf = requestAnimationFrame(() => { slideRaf = 0; draw(restT(), 1e6); });
  }
  stage.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { drag.moved = true; FP.tip(0, 0, null); }
      if (drag.moved) { slideTo(drag.pan0 - dx / cur.s); if (!slid) { slid = true; hintEl.classList.remove('is-on'); } }
      return;
    }
    if (e.pointerType === 'touch') return;
    const m = countryAt(e, 10);
    pointed = m;
    FP.tip(e.clientX, e.clientY, m ? FP.about(m.c) : null);
  });
  stage.addEventListener('pointerleave', () => { pointed = null; FP.tip(0, 0, null); });
  stage.addEventListener('pointerdown', (e) => {
    if (started && !resting && inMap(e)) finish(); // a click or a tap on the map: straight to the end
    if (G && G.slide && resting && inMap(e)) {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, pan0: pan, moved: false };
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      return;
    }
    if (e.pointerType === 'mouse') return;
    const m = countryAt(e, 26);
    clearTimeout(tipT);
    FP.tip(e.clientX, e.clientY, m ? FP.about(m.c) : null);
    if (m) tipT = setTimeout(() => FP.tip(0, 0, null), 2600);
  });
  const endDrag = (e, tap) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (tap && !d.moved && e.pointerType !== 'mouse') {
      const m = countryAt(e, 26);
      clearTimeout(tipT);
      FP.tip(e.clientX, e.clientY, m ? FP.about(m.c) : null);
      if (m) tipT = setTimeout(() => FP.tip(0, 0, null), 2600);
    }
  };
  stage.addEventListener('pointerup', (e) => endDrag(e, true));
  stage.addEventListener('pointercancel', (e) => endDrag(e, false));

  /* ------------------------------------------------------------ putting it together */

  // the stage's own size: the first screen (below.css), less what a phone's block has asked of it
  function stageSize() {
    stage.style.removeProperty('--room');
    return { w: stage.clientWidth, h: stage.clientHeight };
  }
  // the layout and everything sized by it; `quick` leaves the slower parts (the finer water fields and the
  // washes not needed at once) to be made during the landing, in the order the move needs them
  let pending = [], sized = null;
  function layout(quick) {
    words();
    const { w, h } = stageSize();
    if (w < 120 || h < 160) return false; // a window too small (or still hidden): wait for it
    sized = { w, h };
    const narrow = w < 640 || w / h < 1.15;
    body.classList.toggle('is-narrow', narrow);
    G = narrow ? solveNarrow(w, h) : solveWide(w, h);
    body.classList.toggle('is-slide', !!G.slide);
    placeRow();
    // a phone whose block is taller than the screen: the first screen grows to hold it, and the page scrolls
    if (narrow) stage.style.setProperty('--room', `${Math.ceil(Math.max(G.roomH, hintBox.y + hintBox.h + 24))}px`);
    sheet.style.setProperty('--sheet-w', `${G.w}px`);
    sheet.style.setProperty('--sheet-h', `${G.sheetH}px`);
    for (const cv of [mapCv, seaCv, washCv]) { cv.width = Math.round(G.w * DPR); cv.height = Math.round(G.sheetH * DPR); }
    metrics.clear(); LBL.clear(); shown = {};
    plan();
    publish();
    // (data-fp-list) when each of his countries colours in, and in what colour, for the list beside the map
    FP.reveal = { col: G.colW || 0, at: new Map(MINE.map((m) => [m.id, m.tb])), tone: new Map(MINE.map((m) => [m.id, m.tone ? m.tone.css : null])) };
    dispatchEvent(new Event('fp-plan'));
    // the work: the water fields, then each wash at the scale it is first seen; each with the moment it is needed
    const jobs = [];
    const needAt = (z) => { for (let t = HOLD; t <= P.viewEnd; t += 16) if (zOf(viewAt(t)) < z) return t; return P.viewEnd; };
    if (sea.gl) {
      sea.col = rgb(cssVar('--tn-water')).map((x) => x / 255);
      const L = seaLevels();
      sea.zA = L.zA; sea.zB = L.zB; sea.A = sea.B = sea.C = sea.D = null;
      jobs.push({ at: -2, run: () => { sea.D = density(); } });
      // the closest field and the whole map's are made before the first frame (the landing and the rest);
      // the one between, during the landing
      L.want.forEach(([name, rect, texel], i) => jobs.push({
        at: i === 0 || name === 'C' ? -1 : needAt(L.zA) - 200,
        run: () => { sea[name] = field(rect, texel); },
      }));
    }
    MINE.forEach((m) => {
      const t = m.home ? 0 : m.tb;
      if (!Number.isFinite(t)) return;
      jobs.push({ at: m.home ? -1 : t - 120, run: () => makeWash(m, G.F.w / viewAt(t).w) });
    });
    if (!tooth) makeTooth();
    jobs.sort((a, b) => a.at - b.at);
    if (!quick) { jobs.forEach((j) => j.run()); pending = []; return true; }
    // first what the landing shows (the density, the closest field, home's wash), the rest just after
    jobs.filter((j) => j.at < 0).forEach((j) => j.run());
    pending = jobs.filter((j) => j.at >= 0);
    return true;
  }
  function work() {
    if (!pending.length) return;
    pending.shift().run();
    if (pending.length) setTimeout(work, 0);
  }

  // (the Journey tab) where the map lies on the screen at rest, and his countries' colours, for the globe
  // beneath to be laid out and painted as the same sheet (globe3d.js, data-globe="join-…"): its middle
  // meridian, a place's point on the screen, the pixels to a radian of longitude, the colour of each country
  // by its map id. Sent again whenever the map is laid out again (fp-view).
  function publish() {
    if (!EMBED) return;
    const v = restView(), s = G.F.w / v.w, ox = G.F.x - v.x0 * s, oy = G.F.y - v.y0 * s;
    const sr = stage.getBoundingClientRect();
    FP.view = {
      lon0: LON0, narrow: !!G.narrow, k: (s * U) / Math.SQRT2,
      at: (lon, lat) => { const u = projU([lon, lat]); return [sr.left + ox + u[0] * s, sr.top + oy + u[1] * s]; },
      tones: new Map(MINE.map((m) => [m.c.iso, m.tone.css])),
    };
    dispatchEvent(new Event('fp-view'));
  }

  // at rest: the last frame, and a mark for whoever times the page
  function rest() {
    resting = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    draw(P.END + 1, 1e6);
    body.classList.add('is-resting');
    try { performance.mark('fp-rest'); } catch (e) { /* no marks */ }
  }

  let t0 = 0, raf = 0, lastNow = 0, waited = 0;
  function loop(now) {
    const dt = now - lastNow; lastNow = now;
    // the move waits at the landing, a little at most, for anything it will need on the way
    if (pending.length && now - t0 >= HOLD - 40 && waited < WAIT) { t0 += dt; waited += dt; }
    const t = now - t0;
    if (t >= P.END) { rest(); return; }
    draw(t, dt);
    raf = requestAnimationFrame(loop);
  }

  // moving on (a wheel, a touch, a key, a scroll) or a click on the map: the end, at once
  let done = false;
  function finish() {
    if (done || STILL || AT != null) return;
    done = true;
    if (!started || resting) return; // not yet drawn: it starts at the end (see go)
    pending.splice(0).forEach((j) => j.run());
    body.classList.add('is-done', 'is-ready');
    rest();
  }
  if (window.FPBelow) FPBelow.onFirstMove(finish);

  const fontsIn = Promise.race([
    Promise.all([
      document.fonts.load('400 120px "Playfair Display"', '0123456789%'),
      document.fonts.load('400 12px "Playfair Display"', 'JAPAN TAIWAN PACIFIC OCEAN 2024'),
      document.fonts.load('500 12px "Geist"', 'COUNTRIES FLIGHTS PHOTOGRAPHS of the world 195 2010 to 2026'),
      document.fonts.load('600 12px "Geist"', 'HOME'),
      document.fonts.load('500 12px "Noto Serif TC"', '台灣日本南韓中國美國太平洋印度洋'),
      document.fonts.load('500 12px "Noto Sans TC"', '個國家段航程張照片家全世界的到左右滑動地圖看其餘方'),
    ]).catch(() => null),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  initSea();
  if (STILL || AT != null) body.classList.add('is-still');
  Promise.all([FP.world('50m'), fontsIn]).then(([a]) => {
    atlas = a;
    // the land without Antarctica: the band along the foot is open sea
    LAND = topojson.merge(a.topo, a.topo.objects.countries.geometries.filter((g) => g.id !== '010'));
    [FP.home, ...FP.abroad].forEach((c) => HOMES.set(c.id, homeland(c)));
    centre();
    prepare();
    const go = () => {
      const live = !STILL && AT == null && !done;
      if (!layout(live)) return false;
      started = true;
      if (!live) {
        if (done) body.classList.add('is-done');
        resting = STILL || done || AT >= P.END;
        draw(STILL || done ? P.END + 1 : AT, 1e6);
        body.classList.add('is-ready');
        if (resting) body.classList.add('is-resting');
        return true;
      }
      draw(0, 1e6);
      try { performance.mark('fp-first'); } catch (e) { /* no marks */ }
      requestAnimationFrame(() => body.classList.add('is-ready'));
      t0 = performance.now(); lastNow = t0;
      setTimeout(work, 0);
      raf = requestAnimationFrame(loop);
      return true;
    };
    if (!go()) {
      const again = () => { if (!started && go()) removeEventListener('resize', again); };
      addEventListener('resize', again);
    }
  });

  // a new window size: everything laid out again, the move carrying on from where it was. A phone's bars
  // coming and going while the page scrolls leave the first screen as it is, so nothing is redone then.
  // (fp-relayout: the page around it changed, as when the Journey tab's top bar is drawn: laid out again
  // whatever the size)
  let rt = 0;
  const relayout = (force) => {
    if (!started) return;
    clearTimeout(rt);
    rt = setTimeout(() => {
      const r = { w: stage.clientWidth, h: stage.clientHeight };
      const was = parseFloat(stage.style.getPropertyValue('--room')) || 0;
      if (!force && sized && r.w === sized.w && (r.h === sized.h || (G.narrow && r.h === Math.max(sized.h, was)))) return;
      const t = AT != null ? AT : STILL || resting ? P.END + 1 : performance.now() - t0;
      pan = 0;
      if (!layout(false)) return;
      draw(Math.min(t, P.END + 1), 1e6);
      if (!STILL && AT == null && !raf && t < P.END) raf = requestAnimationFrame(loop);
    }, 160);
  };
  addEventListener('resize', () => relayout(false));
  addEventListener('fp-relayout', () => relayout(true));
  // a new language: the words and the row measured again; the map keeps its plan
  FP.onLang(() => {
    if (!started) return;
    words();
    if (G.narrow) {
      const t = AT != null ? AT : STILL || resting ? P.END + 1 : performance.now() - t0;
      layout(false);
      if (!raf) draw(Math.min(t, P.END + 1), 1e6);
    } else {
      placeRow();
      metrics.clear(); LBL.clear(); shown = {};
      if (!raf) draw(AT != null ? AT : P.END + 1, 1e6);
    }
    if (pointed) FP.tip(0, 0, null);
  });
})();
