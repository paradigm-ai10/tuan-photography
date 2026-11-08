/* Wall map, a year a step 一年一步 (footprint, round seven, 2026-11-09).
   He gave round six's wall-widen-band three of five and asked for a faster tempo: "it's a landing page.
   I want the people to actually start the scrolling a little bit faster." This version keeps that page's
   concept and steps it by year instead of by trip: his sixteen trips fall in nine years (2010, 2012,
   2014, 2015, 2022 to 2026), and each year is one beat of about a third of a second.
   - The landing: home close in, Taiwan in clay, held for a moment while the sheet comes up.
   - Each beat: the year's new countries bleed in together from where he landed, its flights are drawn
     together as fine pen lines, the three numbers step up by the year's count, and the date line names
     the year. Nine beats, then rest, at about three and a quarter seconds from the first paint.
   - The view: one continuous move out from home to the wall map, through each widening a year asks for
     (2010 Borneo, 2012 west to Europe, 2014 east to the Americas), reached as its beat lands. Its scale,
     its left and right and its up and down each follow a smooth curve through those views that never
     overshoots, starting and ending at rest; where the pan turns back it slows and turns while the scale
     keeps opening. Its edges only move outward. A beat that widens it is a little longer (350 ms).
   - Moving on (a wheel, a touch, a key, a scroll), or a click or tap on the map, finishes the ramp at
     once (FPBelow.onFirstMove), and the page scrolls on to the list of his trips (below.js), the map
     being its first screen.
   - Everything else is wall-widen-band's: Gall's sheet centred on his countries, bolder's washes and
     water-lining, typeset's lettering, the whole United States coloured, the faint pen lines of the
     flights, ?still, reduced motion, ?at=<ms>, hover notes and both languages.
   - A phone: the taller map with the numbers under it. At this pace it no longer chases each year
     across the sheet: the view widens as far as it holds, then settles on Europe to New Zealand, and a
     place beyond it (the Americas) is coloured there unseen; once it rests, the map slides sideways
     under a finger to the rest (a quiet line says so until it has been slid). */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
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
  // a smooth curve through values at given times that never overshoots them (Fritsch and Carlson's monotone
  // cubic, with Brodlie's weights), at rest at both ends: where the values turn back, it stops there
  function monotone(xs, ys) {
    const n = xs.length;
    if (n === 1) return () => ys[0];
    const d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) continue;
      const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i];
      const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
    return (x) => {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }

  /* ------------------------------------------------------------ the pace (ms) */

  const HOLD = 250; // the landing: home close in, the numbers at 0
  const BEAT = 300; // a year
  const WIDE = 45; // what a year that widens the view adds to its beat, at most
  const REACH = 0.7; // how far into its beat the view reaches the year's places
  const BLEED = 540; // a country's wash running out from where he landed
  const NAME = 360; // its name being lettered in
  const DRAW = [340, 440]; // a flight's line drawn, a short flight to a long one
  const SETTLE = 220; // a flight's line settling to faint once drawn

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
  const yearLabel = (y) => (FP.lang === 'zh' ? `${y} 年` : String(y));
  const YEARS = [...new Set(FP.ramp.map((st) => st.year))];
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

  const BIG = new Set(['usa', 'china', 'australia']);
  const SMALL = new Set(['netherlands', 'switzerland', 'andorra', 'dubai', 'singapore', 'hong-kong', 'myanmar']);
  // which side a name goes when it cannot sit inside its country, first choice first
  const SIDE = {
    taiwan: ['start', 'below', 'end'], japan: ['start', 'below', 'end'], 'south-korea': ['below', 'end', 'start'],
    'hong-kong': ['below', 'end', 'start'], vietnam: ['below', 'end', 'start'], thailand: ['below', 'end', 'start'],
    malaysia: ['below', 'start', 'end'], singapore: ['below', 'end', 'start'], myanmar: ['end', 'above', 'below'],
    uk: ['end', 'above', 'start'], netherlands: ['start', 'above', 'end'], germany: ['start', 'below', 'above'],
    france: ['end', 'below', 'start'], switzerland: ['below', 'start', 'end'], andorra: ['below', 'end', 'start'],
    spain: ['end', 'below', 'start'], dubai: ['below', 'end', 'start'], 'new-zealand': ['end', 'below', 'start'],
  };
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
    const apart = (a, b) => {
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
        rank: c.home ? 0 : BIG.has(c.id) ? 1 : SMALL.has(c.id) ? 3 : 2,
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
  // the trip line held at the widest date it will show (on a phone, its slot also holds the sliding note)
  function measureTrip(narrow) {
    tripEl.style.removeProperty('--tw'); hintEl.style.removeProperty('--tw');
    let wmax = 0, hmax = 0;
    YEARS.forEach((y) => {
      tripEl.textContent = yearLabel(y);
      const r = tripEl.getBoundingClientRect();
      wmax = Math.max(wmax, r.width); hmax = Math.max(hmax, r.height);
    });
    tripEl.textContent = '';
    if (narrow) { const r = hintEl.getBoundingClientRect(); wmax = Math.max(wmax, r.width); hmax = Math.max(hmax, r.height); }
    tripEl.style.setProperty('--tw', `${Math.ceil(wmax)}px`);
    hintEl.style.setProperty('--tw', `${Math.ceil(wmax)}px`);
    return { w: Math.ceil(wmax), h: hmax };
  }

  /* ------------------------------------------------------------ the frame */

  const BAND_TOP = -48.6; // the band's top: just south of New Zealand
  const NORTH = 72; // the northern edge it would choose: just north of Alaska's north shore and North Cape
  const FOOT_MIN = -74;

  // a wide window: the map is the window, edge to edge. The scale keeps all his countries inside (s0), the
  // north edge sits about North Cape, and the southern ocean under New Zealand is left for the band; the
  // scale and the north edge are chosen together, the cheapest that fills it (band's way, on Gall's sheet).
  function solveWide(w, h) {
    const padL = clamp(w * 0.022, 14, 34), padR = clamp(w * 0.018, 12, 28);
    const spanU = SPAN * DEG;
    const s0 = (w - padL - padR) / spanU;
    const sMin = w / (2 * XR); // the whole way round, and no further
    const bandMin = clamp(h * 0.12, 70, 130), bandIdeal = clamp(h * 0.165, 96, 180);
    const yB = gy(BAND_TOP);
    let best = null;
    for (let north = 62; north <= 82; north += 0.5) {
      const yN = gy(north);
      for (let s of [s0, (h - bandIdeal) / (yB - yN), (h - bandMin) / (yB - yN), h / (gy(FOOT_MIN) - yN), sMin]) {
        if (!(s > 0)) continue;
        s = clamp(s, sMin, s0 * 1.08);
        const band = h - s * (yB - yN);
        const yF = yN + h / s;
        if (band < 56 || yF > gy(FOOT_MIN) + 0.01) continue;
        const sf = s / s0;
        const cost = (sf > 1 ? (sf - 1) * 600 : (1 - sf) * 140)
          + Math.abs(band - bandIdeal) * 0.22 + (band < bandMin ? (bandMin - band) * 2 : 0)
          + (north < NORTH ? (NORTH - north) * 16 : (north - NORTH) * 1.2);
        if (!best || cost < best.cost) best = { cost, s, north, band };
      }
    }
    // a window too wide for its height to hold the whole way round above the band: the sheet drawn smaller,
    // in the middle, with paper either side
    if (!best) { const north = 66, s = clamp((h - bandMin) / (yB - gy(north)), 0.02, s0); best = { s, north, band: h - s * (yB - gy(north)) }; }
    const { s, north, band } = best;
    const vw = w / s, vh = h / s;
    const x0 = vw > 2 * XR ? -vw / 2 : clamp(-((padL + w - padR) / 2) / s, -XR, XR - vw);
    const W0 = { x0, y0: gy(north), w: vw, h: vh };
    const F = { x: 0, y: 0, w, h };
    return {
      w, h, sheetH: h, narrow: false, W0, rest: { ...W0 }, sf: s, F, north, bandPx: band, slide: false,
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
    const gap1 = 28, gap2 = 18, top0 = 58;
    const below = gap1 + rowH + gap2 + tb.h;
    let mapH = Math.max(Math.min(w * 0.82, h - top0 - below - 28), w * 0.6);
    let s = mapH / W0.h, slide = true;
    if (w / s >= W0.w) { s = w / W0.w; mapH = W0.h * s; slide = false; } // a wide screen holds it all
    const blockH = mapH + below;
    const top = top0 + Math.max(0, (h - top0 - blockH - 16) * 0.42);
    const F = { x: 0, y: top, w, h: mapH };
    const rest = slide ? { x0: 0, y0: W0.y0, w: w / s, h: W0.h } : { ...W0, w: w / s, h: mapH / s };
    return {
      w, h, sheetH: Math.max(h, Math.ceil(top + mapH + 2)), narrow: true, W0, rest, sf: s, F, slide,
      k: 0.7, sp: 0.66, row: m, trip: tb, colW, colGap, edge,
      rowY: top + mapH + gap1, tripY: top + mapH + gap1 + rowH + gap2, roomH: top + blockH + 24,
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
  let boxes = [], tripBox = null;
  function placeRow() {
    boxes = [];
    const W = G.w, H = G.h;
    if (G.narrow) {
      stats.forEach((st, i) => {
        const x = G.edge + i * (G.colW + G.colGap) + (G.colW - G.row.boxes[i].w) / 2, y = G.rowY;
        st.style.setProperty('--x', `${x.toFixed(1)}px`); st.style.setProperty('--y', `${y.toFixed(1)}px`);
        boxes.push({ x, y, w: G.row.boxes[i].w, h: G.row.boxes[i].h });
      });
      tripBox = { x: W - G.edge - G.trip.w, y: G.tripY, w: G.trip.w, h: G.trip.h };
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
      G.F1 = F;
    }
    [tripEl, hintEl].forEach((n) => { n.style.setProperty('--x', `${tripBox.x.toFixed(1)}px`); n.style.setProperty('--y', `${tripBox.y.toFixed(1)}px`); });
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
    const list = boxes.map((b) => ({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad, soft }));
    list.push({ x: tripBox.x - 5, y: tripBox.y - 5, w: tripBox.w + 10, h: tripBox.h + 10, soft: 14 });
    // the top bar's words on the stage, measured as the page scrolls (a top bar held in the window is
    // taken where it stands with the page at its top)
    const sr = stage.getBoundingClientRect();
    const bar = document.querySelector('.fp-top');
    const held = !!bar && getComputedStyle(bar).position === 'fixed' ? scrollY : 0;
    document.querySelectorAll('.fp-top__name, .fp-lang').forEach((n) => {
      const r = n.getBoundingClientRect();
      list.push({ x: r.left - sr.left - 6, y: r.top - sr.top - held - 6, w: r.width + 12, h: r.height + 12, soft: 16 });
    });
    return list;
  }

  /* ------------------------------------------------------------ the plan: views, times, counts */

  function plan() {
    const { W0, F, band, narrow } = G;
    const REST = G.rest;
    const A = F.w / F.h;
    const topF = narrow ? 0 : clamp(52 / F.h, 0, 0.1); // the top bar's words
    // a view kept on the sheet, and never larger than the resting one (which on a phone may stand anywhere along it)
    const fit = (v) => {
      const w = Math.min(v.w, REST.w), h = Math.min(v.h, REST.h);
      return { x0: clamp(v.x0, W0.x0, W0.x0 + W0.w - w), y0: clamp(v.y0, W0.y0, W0.y0 + W0.h - h), w, h };
    };
    // the first view: close in on Taiwan, East Asia filling the window, home a little right of the middle
    const twU = projU([121.0, 23.7]);
    const w0 = Math.min(REST.w, DEG * (narrow ? 40 : 62)), h0 = w0 / A;
    const V = [fit({ x0: twU[0] - w0 * 0.55, y0: twU[1] - (topF + (1 - band - topF) * 0.57) * h0, w: w0, h: h0 })];
    // then each trip widens it, if it must, to take in its new countries and its flights, above the numbers
    const inside = (b) => ({ x0: Math.max(b.x0, W0.x0), y0: Math.max(b.y0, W0.y0), x1: Math.min(b.x1, W0.x0 + W0.w), y1: Math.min(b.y1, W0.y0 + W0.h) });
    const boxOf = (st, flights) => {
      let b = null;
      st.fresh.forEach((c) => { const m = byId.get(c.id); if (m) b = join(b, m.bU); });
      if (flights) st.flights.forEach((f) => { const a = ARCS.find((x) => x.f === f); if (a) b = join(b, a.bU); });
      return b ? inside(b) : null;
    };
    const margin = (C) => { const m = 0.07 * Math.max(C.x1 - C.x0, C.y1 - C.y0) + DEG * 1.6; return inside({ x0: C.x0 - m, y0: C.y0 - m, x1: C.x1 + m, y1: C.y1 + m }); };
    const shows = (v, c) => c.x0 >= v.x0 && c.x1 <= v.x0 + v.w && c.y0 >= v.y0 + topF * v.h && c.y1 <= v.y0 + (1 - band) * v.h;
    // on a phone, a place the widest view cannot take in with the rest leaves it where it is: at this pace
    // the view no longer chases each trip along the sheet
    const widen = (prev, st) => {
      const C = boxOf(st, true);
      if (!C) return prev;
      const c = margin(C);
      if (shows(prev, c)) return prev;
      const Pv = ofView(prev);
      const B = join(Pv, c);
      // the height that holds the last view and the new place, the place between the top bar and the numbers
      const h = Math.max(Pv.y1 - Pv.y0, (B.x1 - B.x0) / A, (c.y1 - c.y0) / (1 - band - topF), (Pv.y1 - c.y0) / (1 - topF), (c.y1 - Pv.y0) / (1 - band));
      const w = h * A;
      if (w > REST.w + 1e-6) return narrow ? prev : { ...REST };
      const lo = Math.max(Pv.y1 - h, c.y1 - (1 - band) * h), hi = Math.min(Pv.y0, c.y0 - topF * h);
      return fit({ x0: (B.x0 + B.x1) / 2 - w / 2, y0: lo <= hi ? (lo + hi) / 2 : hi, w, h });
    };
    const n = FP.ramp.length;
    FP.ramp.forEach((st, i) => V.push(widen(V[i], st)));
    if (narrow && G.slide) REST.x0 = restX();
    V[n] = { ...REST }; // it rests on band's wall map (on a phone, on its resting view)

    // the years, each a beat: its trips, the view once they have been taken in, and how much it widened
    const yrs = YEARS.map((y) => ({ y, trips: FP.ramp.map((st, i) => (st.year === y ? i : -1)).filter((i) => i >= 0) }));
    const Y = yrs.length;
    const Vy = [V[0]];
    yrs.forEach((yr) => Vy.push(V[yr.trips[yr.trips.length - 1] + 1]));
    const D = yrs.map((yr, k) => BEAT + Math.min(WIDE, 70 * Math.abs(Math.log(Vy[k + 1].w / Vy[k].w))));
    const B = [HOLD];
    for (let k = 0; k < Y; k++) B.push(B[k] + D[k]);
    // the view's one move: through each distinct view, reached as its year's beat lands
    const same = (a, b) => Math.abs(Math.log(a.w / b.w)) < 1e-6 && Math.abs(a.x0 - b.x0) < 1e-3 && Math.abs(a.y0 - b.y0) < 1e-3;
    const K = [{ t: HOLD, v: V[0] }];
    // (a phone settles on its resting view as the last year ends)
    for (let k = 1; k <= Y; k++) if (!same(Vy[k], K[K.length - 1].v)) K.push({ t: k === Y && narrow ? B[Y] : B[k - 1] + REACH * D[k - 1], v: Vy[k] });
    const kt = K.map((k) => k.t);
    // a stretch is nested when the later view holds the earlier: then the earlier stays inside all the way
    K.forEach((k, j) => {
      const b = K[j + 1] && K[j + 1].v, a = k.v;
      k.nested = !!b && b.w >= a.w && b.x0 <= a.x0 + 1e-6 && b.x0 + b.w >= a.x0 + a.w - 1e-6 && b.y0 <= a.y0 + 1e-6 && b.y0 + b.h >= a.y0 + a.h - 1e-6;
    });
    P = {
      V, K, A, n, B, D, viewEnd: kt[kt.length - 1],
      lw: monotone(kt, K.map((k) => Math.log(k.v.w))),
      cx: monotone(kt, K.map((k) => k.v.x0 + k.v.w / 2)),
      cy: monotone(kt, K.map((k) => k.v.y0 + k.v.h / 2)),
    };

    // when a box on the sheet is first wholly in view (above the numbers) between two moments, or null
    const inView = (bx, lo, hi) => {
      for (let t = lo; t <= hi; t += 16) {
        const v = ofView(viewAt(t)), mx = (v.x1 - v.x0) * 0.03, my = (v.y1 - v.y0) * 0.03;
        if (bx.x0 >= v.x0 + mx && bx.x1 <= v.x1 - mx && bx.y0 >= v.y0 + my && bx.y1 <= v.y0 + (1 - band) * (v.y1 - v.y0)) return t;
      }
      return null;
    };
    const pt = (p) => ({ x0: p[0] - 1, y0: p[1] - 1, x1: p[0] + 1, y1: p[1] + 1 });
    // the counts: one step a year, eased in and out
    const inc = { c: [], f: [], p: [] };
    if (FP.home.photos) inc.p.push({ t0: HOLD, dur: 400, n: FP.home.photos });
    MINE.forEach((m) => { if (!m.home) { m.tb = Infinity; m.wash = null; m.bleed = null; m.live = null; } });
    ARCS.forEach((a) => { a.t0 = Infinity; });
    let lastT = HOLD;
    yrs.forEach((yr, k) => {
      const lo = B[k], hi = B[k + 1] + 40;
      const fresh = [], flights = [];
      yr.trips.forEach((i) => {
        const st = FP.ramp[i];
        st.fresh.forEach((c) => { const m = byId.get(c.id); if (m) { fresh.push(m); m.entryU = projU(entryOf(c, st)); } });
        st.flights.forEach((f) => { const a = ARCS.find((x) => x.f === f); if (a) flights.push(a); });
      });
      // the year's new countries, together, once all are in view (a place the view never reaches, as the beat ends)
      let tc = Math.max(B[k] + 30, lastT + 60);
      fresh.forEach((m) => { const seen = inView(m.nameU, lo, hi); tc = Math.max(tc, (seen == null ? B[k + 1] - 60 : seen) + 30); });
      if (fresh.length) {
        fresh.forEach((m) => { m.tb = tc; });
        lastT = tc;
        inc.c.push({ t0: tc, dur: 260, n: fresh.length });
        const ph = fresh.reduce((s2, m) => s2 + (m.c.photos || 0), 0);
        if (ph) inc.p.push({ t0: tc + 60, dur: 380, n: ph });
      }
      // its flights, drawn together as the pen can see both ends
      let tf = B[k] + 20;
      flights.forEach((a) => {
        a.dur = clamp(DRAW[0] + a.f.km * 0.014, DRAW[0], DRAW[1]);
        const s0 = inView(pt(a.pts[0]), lo, hi), s1 = inView(pt(a.pts[a.pts.length - 1]), lo, hi);
        tf = Math.max(tf, s0 == null ? B[k + 1] - 60 : s0, (s1 == null ? B[k + 1] - 60 : s1) - a.dur * 0.8);
      });
      if (flights.length) {
        flights.forEach((a) => { a.t0 = tf; });
        const land = tf + flights.reduce((s2, a) => s2 + a.dur, 0) / flights.length;
        inc.f.push({ t0: land - 220, dur: 260, n: flights.length });
      }
    });
    P.inc = inc;
    // the date line: the year, as its beat begins
    P.dates = yrs.map((yr, k) => ({ t: B[k], i: k }));
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
    P.END = Math.max(...ends) + 60;
    const total = (l) => l.reduce((s, x) => s + x.n, 0);
    if (total(inc.c) !== FINAL.countries || total(inc.f) !== FINAL.flights || total(inc.p) !== FINAL.photos) {
      console.warn('swift-year: the counted totals differ from FP.counts', total(inc.c), total(inc.f), total(inc.p));
    }
  }

  // the view at a moment: on its one move, its scale and its middle each on their smooth curve; it keeps the
  // view it last passed through inside it while the next holds that one too, so its edges only move outward
  function viewAt(t) {
    const K = P.K;
    if (t >= P.viewEnd) return restView();
    if (t <= K[0].t) return K[0].v;
    const w = Math.exp(P.lw(t)), h = w / P.A;
    let x0 = P.cx(t) - w / 2, y0 = P.cy(t) - h / 2;
    let k = 0;
    while (k + 1 < K.length && K[k + 1].t <= t) k++;
    const a = K[k].v;
    if (K[k].nested && w >= a.w) { x0 = clamp(x0, a.x0 + a.w - w, a.x0); y0 = clamp(y0, a.y0 + a.h - h, a.y0); }
    const W0 = G.W0;
    return { x0: clamp(x0, W0.x0, W0.x0 + W0.w - w), y0: clamp(y0, W0.y0, W0.y0 + W0.h - h), w, h };
  }
  // a phone's resting view, where a finger has slid it
  let pan = 0, slid = false;
  function restView() {
    const v = P.V[P.n];
    if (!G.slide) return v;
    return { ...v, x0: clamp(v.x0 + pan, G.W0.x0, G.W0.x0 + G.W0.w - v.w) };
  }
  const zOf = (v) => P.V[P.n].w / v.w; // the zoom against the resting view
  const countAt = (list, t) => Math.round(list.reduce((s, x) => s + x.n * inOut(unit(t, x.t0, x.dur)), 0));

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
    const z0 = zOf(P.V[0]);
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
    if (a) want.push(['A', grow(a, pad(zA)), 1.25 / (z0 * sf)]);
    if (b) want.push(['B', grow(b, pad(zB)), 1.25 / (zA * sf)]);
    want.push(['C', grow(ofView(W0), pad(1)), 1.25 / (Math.max(zB, 1) * sf)]);
    return { zA, zB, want };
  }
  function drawSea(c) {
    const gl = sea.gl;
    if (!gl || !(sea.C || sea.A) || !sea.D) return;
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
  // a country's lettering: its name in spaced capitals by size, then its year (home: its word, in clay)
  function styleOf(m) {
    const k = G.k, zh = FP.lang === 'zh';
    const size = m.rank === 1 ? 'l' : m.rank === 3 ? 's' : 'm';
    const fs = zh ? { l: 13.5, m: 11, s: 10 }[size] * k : { l: 12.5, m: 10.5, s: 9.25 }[size] * k;
    const em = zh ? { l: 0.22, m: 0.1, s: 0.08 }[size] : { l: 0.24, m: 0.16, s: 0.12 }[size];
    return { fs: Math.max(zh ? 9.6 : 8.6, fs), ls: Math.max(zh ? 9.6 : 8.6, fs) * (m.home ? (zh ? 0.12 : 0.18) : em), size };
  }
  const metrics = new Map();
  function measure(m) {
    const key = `${FP.lang}|${m.id}|${G.k}`;
    if (metrics.has(key)) return metrics.get(key);
    const ctx = mctx, zh = FP.lang === 'zh', st = styleOf(m);
    const name = m.home ? m.c.name[FP.lang] : m.c.country[FP.lang];
    const cap = zh ? name : name.toUpperCase();
    ctx.font = `${zh ? 500 : 400} ${st.fs}px ${SERIF}`;
    const wn = spaced(ctx, cap, st.ls);
    let tail, tailFont, tailLs;
    if (m.home) {
      tail = zh ? FP.w.home : FP.w.home.toUpperCase();
      tailFont = zh ? `500 ${st.fs * 0.86}px "Noto Sans TC", sans-serif` : `600 ${st.fs * 0.66}px "Geist", sans-serif`;
      tailLs = zh ? st.fs * 0.03 : st.fs * 0.66 * 0.16;
    } else {
      tail = String(m.c.first);
      tailFont = `400 ${st.fs * 0.8}px ${SERIF}`;
      tailLs = st.fs * 0.8 * 0.03;
    }
    ctx.font = tailFont;
    const wt = spaced(ctx, tail, tailLs);
    const gap = st.fs * (zh ? 0.35 : 0.45);
    const out = { cap, tail, wn, wt, gap, w: wn + gap + wt, fs: st.fs, ls: st.ls, tailFont, tailLs, nameFont: `${zh ? 500 : 400} ${st.fs}px ${SERIF}`, small: st.size === 's' };
    metrics.set(key, out);
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

  const LBL = new Map(); // per label: the place it took, how far faded in
  function labelBox(m, cand, c, me) {
    const A = { x: c.ox + m.anchorU[0] * c.s, y: c.oy + m.anchorU[1] * c.s };
    const nb = m.nameU, bw = (nb.x1 - nb.x0) * c.s, bh = (nb.y1 - nb.y0) * c.s;
    const w = me.w, h = me.fs;
    const ry = clamp(bh / 2, 3, 30);
    let x, y;
    if (cand === 'in') { if (m.rank !== 1 || bw < w * 1.1 || bh < h * 2.4) return null; x = A.x - w / 2; y = A.y + h * 0.35; }
    else if (cand === 'start') { x = Math.max(A.x + 3, c.ox + nb.x1 * c.s) + 5; y = A.y + h * 0.35; }
    else if (cand === 'end') { x = Math.min(A.x - 3, c.ox + nb.x0 * c.s) - 5 - w; y = A.y + h * 0.35; }
    else if (cand === 'below') { x = A.x - w / 2; y = A.y + ry + 4 + h * 0.8; }
    else { x = A.x - w / 2; y = A.y - ry - 5; }
    return { x: x - 2, y: y - h * 0.82 - 1, w: w + 4, h: h * 1.1 + 2, tx: x, base: y, halo: cand !== 'in' };
  }
  function drawLabels(ctx, c, t, dt) {
    const F = G.F, frame = { x: F.x + 4, y: F.y + 4, w: F.w - 8, h: F.h - 8 };
    const taken = G.clear ? G.clear.map((r) => ({ x: r.x - 4, y: r.y - 4, w: r.w + 8, h: r.h + 8 })) : [];
    const ease = AT != null || dt > 1000 ? 1 : 1 - Math.exp(-dt / 170);
    const items = [];
    MINE.forEach((m) => {
      const fade = m.home ? 1 : inOut(unit(t, m.tb + BLEED * 0.3, NAME));
      // on the whole map the small ones go unlettered (as bolder has them): their names fade as the view widens
      const close = m.home ? 1 : G.narrow ? (m.rank < 3 ? clamp((c.s - 0.13) / 0.03, 0, 1) : clamp((c.s - 0.3) / 0.06, 0, 1)) : m.rank < 3 ? 1 : clamp((c.z - 1.4) / 0.35, 0, 1);
      if (fade * close > 0 && (m.home || m.wash)) items.push({ m, fade: fade * close });
    });
    items.sort((a, b) => (a.m.rank - b.m.rank) || (b.m.area - a.m.area));
    const PAPER = cssVar('--paper'), INK = cssVar('--ink'), INK2 = cssVar('--ink-2'), LINK = cssVar('--link');
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.lineJoin = 'round'; ctx.strokeStyle = PAPER; ctx.lineWidth = 3;
    const place = (key, cands, boxOf) => {
      const st = LBL.get(key) || { cand: null, a: 0 };
      LBL.set(key, st);
      const free = (b) => b && within(b, frame) && !taken.some((o) => overlap(b, o, 2));
      let box = st.cand ? boxOf(st.cand) : null, fits = free(box);
      if (!fits && st.a < 0.03) { // only a name faded out may move to another side
        for (const cd of cands) { const b = boxOf(cd); if (free(b)) { st.cand = cd; box = b; fits = true; break; } }
      }
      st.a += ((fits ? 1 : 0) - st.a) * ease;
      if (fits) taken.push(box);
      return { st, box };
    };
    // the oceans, light and widely spaced, under the countries' names in rank but drawn among them
    const seaDraw = [];
    SEAS.forEach((s) => {
      if (G.narrow) return;
      const me = measureSea(s);
      const u = projU(s.at), x = c.ox + u[0] * c.s, y = c.oy + u[1] * c.s;
      const H2 = me.lh * (me.lines.length - 1) + me.fs;
      seaDraw.push({ s, me, x, y, box: { x: x - me.w / 2 - 3, y: y - me.fs, w: me.w + 6, h: H2 + 4 } });
    });
    const shows = [];
    items.forEach((it) => {
      const me = measure(it.m);
      const cands = ['in', ...(SIDE[it.m.id] || ['start', 'end', 'below', 'above'])];
      const { st, box } = place(it.m.id, cands, (cd) => labelBox(it.m, cd, c, me));
      if (box && st.a * it.fade > 0.01) shows.push({ it, me, box, a: st.a * it.fade });
    });
    seaDraw.forEach((d) => {
      const { st, box } = place(`sea|${d.s.id}`, ['in'], () => d.box);
      if (box && st.a > 0.01) {
        ctx.globalAlpha = st.a * 0.72; ctx.font = d.me.font; ctx.fillStyle = cssVar('--tn-water');
        d.me.lines.forEach((l, i) => spacedText(ctx, l, d.x - d.me.ws[i] / 2, d.y + i * d.me.lh, d.me.ls, true));
      }
    });
    shows.forEach(({ it, me, box, a }) => {
      ctx.globalAlpha = a;
      const home = it.m.home;
      ctx.font = me.nameFont; ctx.fillStyle = home ? LINK : me.small ? INK2 : INK;
      spacedText(ctx, me.cap, box.tx, box.base, me.ls, box.halo);
      ctx.font = me.tailFont; ctx.fillStyle = home ? LINK : INK2;
      spacedText(ctx, me.tail, box.tx + me.wn + me.gap, box.base, me.tailLs, box.halo);
    });
    ctx.restore();
  }

  /* ------------------------------------------------------------ one frame */

  function draw(t, dt) {
    const v = viewAt(t);
    const s = G.F.w / v.w;
    cur = { s, ox: G.F.x - v.x0 * s, oy: G.F.y - v.y0 * s, z: zOf(v), t };
    drawSea(cur);
    drawMap(cur, t, dt);
    showCounts(t);
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
      wctx.drawImage(src, m.wash.x, m.wash.y, m.wash.w, m.wash.h);
    });
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
      ctx.globalAlpha = 0.85 * p; ctx.fillStyle = m.tone.css; ctx.globalCompositeOperation = 'multiply';
      ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = p; ctx.lineWidth = 0.7; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    });

    // the flights: fine arcs at low strength, drawn like a pen, settling faint
    const ROUTE = cssVar('--route'), INK2 = cssVar('--ink-2');
    ctx.lineWidth = 0.8; ctx.strokeStyle = ROUTE; ctx.lineCap = 'round';
    ARCS.forEach((a) => {
      const q = inOut(unit(t, a.t0, a.dur));
      if (q <= 0) return;
      ctx.globalAlpha = q < 1 ? 0.62 : lerp(0.62, 0.34, inOut(unit(t, a.t0 + a.dur, SETTLE)));
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
    ctx.fillStyle = INK2;
    DOTS.forEach((d) => {
      const a = inOut(unit(t, d.t, 400));
      if (a <= 0) return;
      ctx.globalAlpha = 0.6 * a;
      ctx.beginPath(); ctx.arc(ox + d.u[0] * s, oy + d.u[1] * s, 1.35, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    drawLabels(ctx, c, t, dt);

    // the clearings round the numbers, the trip line and the top bar's words: rings of rubbing out, wider
    // and fainter outwards, so the lines thin away
    if (G.clear) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      const N = 14;
      for (let i = 0; i < N; i++) {
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        G.clear.forEach((r) => {
          const grow = 2 + r.soft * (1 - i / (N - 1));
          if (ctx.roundRect) ctx.roundRect(r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow, grow); else ctx.rect(r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow);
        });
        ctx.fill();
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

  /* ------------------------------------------------------------ the numbers and the trip line */

  function showCounts(t) {
    const vals = { countries: countAt(P.inc.c, t), flights: countAt(P.inc.f, t), photos: countAt(P.inc.p, t) };
    KEYS.forEach((id) => {
      if (shown[id] === vals[id]) return;
      setDigits(num(id), FP.fmt(vals[id]));
      lab(id).textContent = tw().label[id](vals[id]);
      shown[id] = vals[id];
    });
    if (shown.pct !== vals.countries && pctEl) { setDigits(pctEl, shareOf(vals.countries)); shown.pct = vals.countries; }
    // the year being counted, while the ramp runs
    let step = -1;
    for (const d of P.dates) if (d.t <= t) step = d.i;
    const running = step >= 0 && t < P.END - 300;
    if (step >= 0 && shown.step !== step) { tripEl.textContent = yearLabel(YEARS[step]); shown.step = step; }
    tripEl.classList.toggle('is-on', running);
    hintEl.classList.toggle('is-on', !!(G.slide && !running && t >= P.END - 300 && !slid));
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
    finish(); // a click or tap on the map: the ramp ends at once
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

  // the layout and everything sized by it; `quick` makes only what the landing shows (the density, the
  // closest water field, home's wash) and leaves the rest to be made just after, in the order it is needed
  let pending = [];
  function layout(quick) {
    words();
    stage.style.setProperty('--room', '0px'); // the stage at its own height, before any room is asked for
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 120 || h < 160) return false; // a window too small (or still hidden): wait for it
    const narrow = w < 640 || w / h < 1.15;
    body.classList.toggle('is-narrow', narrow);
    G = narrow ? solveNarrow(w, h) : solveWide(w, h);
    body.classList.toggle('is-slide', !!G.slide);
    placeRow();
    // a phone short enough that the map and its numbers need more than the screen: the stage grows to hold them
    stage.style.setProperty('--room', narrow ? `${Math.ceil(Math.max(G.roomH, tripBox.y + tripBox.h + 24))}px` : '0px');
    sheet.style.setProperty('--sheet-w', `${G.w}px`);
    sheet.style.setProperty('--sheet-h', `${G.sheetH}px`);
    for (const cv of [mapCv, seaCv, washCv]) { cv.width = Math.round(G.w * DPR); cv.height = Math.round(G.sheetH * DPR); }
    metrics.clear(); LBL.clear(); shown = {};
    plan();
    // the work, each piece with the moment it is first needed: the water fields, then each wash at the
    // scale it is first seen
    const jobs = [];
    const firstAt = (test) => { for (let t = 0; t <= P.viewEnd + 16; t += 16) if (test(zOf(viewAt(t)))) return t; return P.viewEnd; };
    if (sea.gl) {
      sea.col = rgb(cssVar('--tn-water')).map((x) => x / 255);
      const L = seaLevels();
      sea.zA = L.zA; sea.zB = L.zB; sea.A = sea.B = sea.C = sea.D = null;
      jobs.push({ need: -2, first: true, fn: () => { sea.D = density(); } });
      L.want.forEach(([name, rect, texel], i) => jobs.push({
        need: i === 0 ? -1 : name === 'B' ? firstAt((z) => z < L.zA) : firstAt((z) => z < L.zB) - 1,
        first: i === 0, fn: () => { sea[name] = field(rect, texel); },
      }));
    }
    MINE.forEach((m) => {
      const t = m.home ? 0 : m.tb;
      if (!Number.isFinite(t)) return;
      jobs.push({ need: m.home ? -1 : t, first: m.home, fn: () => makeWash(m, G.F.w / viewAt(t).w) });
    });
    if (!tooth) makeTooth();
    jobs.sort((x, y) => x.need - y.need);
    if (!quick) { jobs.forEach((j) => j.fn()); pending = []; return true; }
    jobs.filter((j) => j.first).forEach((j) => j.fn());
    pending = jobs.filter((j) => !j.first);
    return true;
  }
  function work() {
    if (!pending.length) return;
    pending.shift().fn();
    if (pending.length) setTimeout(work, 0);
  }

  let t0 = 0, raf = 0, lastNow = 0;
  function rest() {
    resting = true;
    body.classList.add('is-resting');
    draw(P.END + 1, 1e6);
  }
  function loop(now) {
    const t = now - t0;
    const dt = now - lastNow; lastNow = now;
    if (t >= P.END) { raf = 0; rest(); return; }
    draw(t, dt);
    raf = requestAnimationFrame(loop);
  }
  // moving on (a wheel, a touch, a key, a scroll) or a click or tap on the map: the ramp ends at once, with
  // whatever was still to be made made now
  let skip = false;
  function finish() {
    if (STILL || AT != null || resting) return;
    if (!started) { skip = true; return; }
    while (pending.length) pending.shift().fn();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    t0 = performance.now() - P.END - 1;
    rest();
  }
  if (window.FPBelow) window.FPBelow.onFirstMove(finish);

  const fontsIn = Promise.race([
    Promise.all([
      document.fonts.load('400 120px "Playfair Display"', '0123456789%'),
      document.fonts.load('400 12px "Playfair Display"', 'JAPAN TAIWAN PACIFIC OCEAN 2024'),
      document.fonts.load('500 12px "Geist"', 'COUNTRIES FLIGHTS PHOTOGRAPHS of the world 195'),
      document.fonts.load('600 12px "Geist"', 'HOME'),
      document.fonts.load('500 12px "Noto Serif TC"', '台灣日本南韓中國美國太平洋印度洋'),
      document.fonts.load('500 12px "Noto Sans TC"', '個國家段航程張照片家全世界的暑假年月左右滑動地圖看其餘方'),
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
      const live = !STILL && AT == null && !skip;
      if (!layout(live)) return false;
      started = true;
      if (!live) {
        if (AT != null) { resting = AT >= P.END; draw(AT, 1e6); } else { t0 = performance.now() - P.END - 1; rest(); }
        body.classList.add('is-ready');
        return true;
      }
      draw(0, 1e6);
      requestAnimationFrame(() => body.classList.add('is-ready'));
      t0 = performance.now(); lastNow = t0;
      setTimeout(work, 30);
      raf = requestAnimationFrame(loop);
      return true;
    };
    if (!go()) {
      const again = () => { if (!started && go()) removeEventListener('resize', again); };
      addEventListener('resize', again);
    }
  });

  // a new window size: everything laid out again, the ramp carrying on from where it was
  let rt = 0;
  // the stage's own size, without the room a short phone asks for (a phone's bar of controls coming and
  // going as the page scrolls changes the window, not the stage)
  function sameSize() {
    const r = stage.style.getPropertyValue('--room');
    stage.style.setProperty('--room', '0px');
    const same = !!G && stage.clientWidth === G.w && stage.clientHeight === G.h;
    stage.style.setProperty('--room', r);
    return same;
  }
  addEventListener('resize', () => {
    if (!started) return;
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (sameSize()) return;
      const t = AT != null ? AT : STILL || resting ? P.END + 1 : performance.now() - t0;
      pan = 0;
      if (!layout(false)) return;
      draw(Math.min(t, P.END + 1), 1e6);
      if (!STILL && AT == null && !raf && t < P.END) raf = requestAnimationFrame(loop);
    }, 160);
  });
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
