/* Engraved, then coloured 先刻版，再上色 (footprint, round five, 2026-11-06).
   His brief for round five: a bigger map with little white left, three numbers (countries, flights,
   photographs), a landing where his countries carry no colour yet, then a ramp: the numbers count up,
   the places he has been gain their colour, the flights are drawn quietly.
   This version is the arrival he scored well (imp-animate) made into that ramp. One timeline, in order:
     0 s      the plate: graticule and neatline come up, with the three numbers at 0 and home's clay;
     0.15 s   the coasts are engraved, each along its own line, from Taiwan outward, within 1.5 s;
     1.1 s    the borders and the water-lining settle in round the coasts;
     1.8 s    the ramp: his sixteen trips, oldest first (FP.ramp). Each trip's flights are drawn one
              after another as hairlines, like a pen; as a flight lands in a country he had not been to,
              that country's wash bleeds in from its middle, its name is lettered and the count ticks
              on. The flights count as they land, the photographs count up with their countries. The
              cursor through the trips eases in and out over about 7.6 s; a trip with more flights
              takes a little longer than one with none. Then everything rests.
   Washes in bolder's colours (more chroma, laid denser), lettering as typeset's. The map is drawn as
   large as the window allows while every country he has been to stays in it: on a wide window its
   Pacific edges run off the sides. The three numbers stand in a column in the open sea, wherever the sea
   holds them largest (the South Pacific on a 1440 wide window). On a phone, the map at full width and the
   three in a row under it. Pointing at or tapping one of his countries shows the note.
   ?still and reduced motion: the finished sheet. ?at=<ms>: the sheet held at that moment.
   Plain CSS, JavaScript and the Web Animations API; nothing random (every unevenness comes from a name). */
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
  const smooth = (x) => { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); };

  /* ------------------------------------------------------------ words */

  const T = {
    en: { sr: (a, b, c) => `${FP.w.where}: ${a}, ${b}, ${c}` },
    zh: { sr: (a, b, c) => `${FP.w.where}：${a}，${b}，${c}` },
  };
  const t = () => T[FP.lang];
  // the oceans, lettered lightly where the sea is open: [lng, lat], and their names
  const SEAS = [
    // (the Pacific runs off the sides of a wide window: its name tries a few places in the open water)
    { id: 'pacific', at: [-122, 6], alt: [[-140, 26], [-128, 22], [-118, -16], [-112, -44], [-160, 6]], en: ['PACIFIC', 'OCEAN'], zh: ['太平洋'] },
    { id: 'atlantic', at: [-40, 28], en: ['ATLANTIC', 'OCEAN'], zh: ['大西洋'] },
    { id: 'indian', at: [78, -22], en: ['INDIAN', 'OCEAN'], zh: ['印度洋'] },
  ];

  /* ------------------------------------------------------------ the colourist's box */

  // the earth washes, read once from the stylesheet, as [r, g, b] for the pixel work
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
  // each country turns its colour a little: lightness and hue, from its own name
  function tone(token, seed) {
    const raw = cssVar(token);
    const m = raw.match(OKLCH);
    if (!m) return { css: raw, rgb: rgb(raw) };
    const L = +m[1] + (rand(seed) - 0.5) * 5;
    const C = +m[2] * (0.9 + rand(seed + 1) * 0.2);
    const H = +m[3] + (rand(seed + 2) - 0.5) * 12;
    const css = `oklch(${L.toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)})`;
    return { css, rgb: rgb(css) };
  }

  /* ------------------------------------------------------------ small tools */

  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
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
  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS(NS, name);
    for (const key in attrs) e.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const overlap = (a, b, pad = 0) => a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;

  /* ------------------------------------------------------------ where each name is lettered (typeset's) */

  const PLACE = {
    taiwan: { at: [123.0, 23.3], a: 'start' },
    usa: { at: [-99, 40.5], a: 'middle', inside: true, size: 'l', stack: true },
    china: { at: [101.5, 35], a: 'middle', inside: true, size: 'l', stack: true },
    australia: { at: [134.5, -24], a: 'middle', inside: true, size: 'l', stack: true },
    uk: { at: [-12.0, 56.2], a: 'end' },
    netherlands: { at: [15.8, 55.9], a: 'start', lead: [5.6, 52.3], size: 's', group: 'eu', col: true },
    germany: { at: [15.8, 51.0], a: 'start', group: 'eu', col: true, fix: true },
    france: { at: [-4.6, 46.6], a: 'end' },
    switzerland: { at: [15.8, 46.3], a: 'start', lead: [8.2, 46.8], size: 's', group: 'eu', col: true },
    andorra: { at: [5.4, 40.2], a: 'start', lead: [1.55, 42.55], size: 's', group: 'eu' },
    spain: { at: [-10.4, 40.0], a: 'end' },
    dubai: { at: [64.0, 15.6], a: 'middle', wrap: true, zhCut: 3, lead: [55.6, 24.2], size: 's' },
    myanmar: { at: [87.0, 17.3], a: 'middle', stack: true, size: 's' },
    thailand: { at: [94.5, 2.6], a: 'end', lead: [99.3, 9.2] },
    malaysia: { at: [94.5, -2.3], a: 'end', lead: [101.8, 4.3] },
    singapore: { at: [94.8, -7.2], a: 'end', lead: [103.85, 1.35], size: 's' },
    vietnam: { at: [110.4, 14.6], a: 'start' },
    'hong-kong': { at: [116.2, 19.4], a: 'start', lead: [114.15, 22.35], size: 's' },
    'south-korea': { at: [126.5, 30.0], a: 'start', lead: [127.8, 35.9] },
    japan: { at: [143.4, 37.6], a: 'start' },
    'new-zealand': { at: [176.5, -49.6], a: 'end' },
  };
  // which labels give way first when there is no room: home never, the large ones last, the small ones first
  const RANK = (c) => (c.home ? 0 : (PLACE[c.id] || {}).size === 'l' ? 1 : (PLACE[c.id] || {}).size === 's' ? 3 : 2);

  /* ------------------------------------------------------------ the flights, as lines on the globe */

  // each flight: the great circle from the one airport to the other, bowed a little to the left of the
  // way it went (so a trip out and the trip back lie side by side), cut where it crosses the date line
  function flightLine(f) {
    const N = 72;
    const gi = d3.geoInterpolate([f.from.lng, f.from.lat], [f.to.lng, f.to.lat]);
    const pts = d3.range(N + 1).map((i) => gi(i / N).slice());
    for (let i = 1; i <= N; i++) { // the longitudes made continuous across the date line
      while (pts[i][0] - pts[i - 1][0] > 180) pts[i][0] -= 360;
      while (pts[i][0] - pts[i - 1][0] < -180) pts[i][0] += 360;
    }
    const A = pts[0], B = pts[N];
    const dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, bow = clamp(len * 0.085, 0.45, 5.5);
    pts.forEach((p, i) => { const s = Math.sin((Math.PI * i) / N) * bow; p[0] += nx * s; p[1] += ny * s; });
    const wrap = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
    const pieces = [[]];
    pts.forEach((p, i) => {
      const q = [wrap(p[0]), p[1]];
      if (i) {
        const prev = pts[i - 1], pw = wrap(prev[0]);
        if (Math.abs(q[0] - pw) > 180) { // over the date line: end this piece at the edge, start the next at the other
          const edge = Math.round((prev[0] + p[0]) / 2 / 180) * 180; // the unwrapped longitude of the line crossed
          const u = (edge - prev[0]) / (p[0] - prev[0]);
          const lat = prev[1] + (p[1] - prev[1]) * u;
          const side = pw > 0 ? 1 : -1;
          pieces[pieces.length - 1].push([side * 179.999, lat]);
          pieces.push([[-side * 179.999, lat]]);
        }
      }
      pieces[pieces.length - 1].push(q);
    });
    return pieces.filter((p) => p.length > 1);
  }
  const LINES = new Map(FP.flights.map((f) => [f, flightLine(f)]));

  /* ------------------------------------------------------------ the ramp, as one timeline */

  // every trip, in order, as a short score: each flight drawn, and each country he had not been to
  // reached as the flight into it lands (or, with no flight, in the order of the trip)
  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));
  const LEAD = 0.35, SLOT = 0.42, TAIL = 0.3; // in beats: before the first event, between events, after
  const STEPS = FP.ramp.map((st, i) => {
    const j = journeyById.get(st.journey);
    const left = new Set(st.fresh.map((c) => c.id));
    const ev = [];
    (j ? j.legs : []).forEach((l) => {
      if (l.mode === 'flight') {
        const f = st.flights.find((x) => x.from === l.from && x.to === l.to);
        if (f) ev.push({ kind: 'fly', f });
      }
      const to = placeByCity.get(l.to.city);
      if (to && left.has(to.country)) { ev.push({ kind: 'reach', c: FP.byId.get(to.country), after: ev[ev.length - 1] }); left.delete(to.country); }
    });
    st.flights.forEach((f) => { if (!ev.some((e) => e.f === f)) ev.push({ kind: 'fly', f }); });
    st.fresh.forEach((c) => { if (left.has(c.id)) ev.push({ kind: 'reach', c }); });
    // the trip's photographs, carried by the countries it reaches; any left over (home's, on the first
    // trip) come in as the trip begins
    const added = st.photos - (i ? FP.ramp[i - 1].photos : 0);
    let carried = 0;
    ev.forEach((e) => { if (e.kind === 'reach') { e.photos = e.c.photos; carried += e.photos; } });
    return { st, ev, extra: added - carried, span: LEAD + SLOT * Math.max(0, ev.length - 1) + TAIL + 0.3 };
  });

  const AT = { plate: 0, sea: 1100, ramp: 1800 };
  const RAMP = 7600; // the cursor's time through all sixteen trips
  const BLEED = 900; // a wash bleeding out
  const RELAX = 1200; // a flight's ink drying to its faint strength after it lands
  const WET = 0.72, DRY = 0.3;
  const flyMs = (f) => 380 + 520 * clamp(f.km / 12000, 0, 1);
  // the cursor eases in and out: slower over the first and last trips, steady between
  const ease = (u) => 0.55 * u + 0.45 * (0.5 - 0.5 * Math.cos(Math.PI * u));
  function inv(y) { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; }
  const BEATS = STEPS.reduce((n, s) => n + s.span, 0);
  const EVENTS = [];
  {
    let A = 0;
    const when = (beat) => AT.ramp + inv(clamp(beat / BEATS, 0, 1)) * RAMP;
    STEPS.forEach((s) => {
      if (s.extra) EVENTS.push({ kind: 'photos', n: s.extra, t: when(A) });
      s.ev.forEach((e, k) => {
        e.t = when(A + LEAD + SLOT * k);
        if (e.kind === 'fly') e.d = flyMs(e.f);
        // a country takes its colour as the flight into it lands
        if (e.kind === 'reach' && e.after && e.after.kind === 'fly') e.t = Math.max(e.t, e.after.t + e.after.d * 0.88);
        EVENTS.push(e);
      });
      A += s.span;
    });
  }
  const END = Math.max(...EVENTS.map((e) => e.t + (e.kind === 'fly' ? e.d + RELAX : BLEED))) + 60;
  const FINAL = { c: FP.counts.countries, f: FP.counts.flights, p: FP.counts.photos };

  // the three numbers at a moment of the ramp
  function countsAt(ms) {
    let c = 0, f = 0, p = 0;
    for (const e of EVENTS) {
      if (e.t > ms) continue;
      if (e.kind === 'reach') { c++; p += e.photos * smooth((ms - e.t) / BLEED); }
      else if (e.kind === 'fly') { if (ms >= e.t + e.d * 0.88) f++; }
      else p += e.n * smooth((ms - e.t) / 700);
    }
    return { c, f, p: Math.round(p) };
  }

  /* ------------------------------------------------------------ the page */

  const sheet = document.createElement('div'); sheet.className = 'tn-sheet';
  const sea = document.createElement('canvas'); sea.className = 'tn-sea';
  const waterCv = document.createElement('canvas'); waterCv.className = 'ia-water';
  const washBox = document.createElement('div'); washBox.className = 'ia-washes';
  const flightsSvg = el('svg', { class: 're-flights', 'aria-hidden': 'true' });
  const ink = el('svg', { class: 'tn-ink', 'aria-hidden': 'true' });
  sheet.append(sea, waterCv, washBox, flightsSvg, ink);

  const column = document.createElement('div');
  column.className = 're-count';
  column.innerHTML = '<h1 class="os-sr"></h1>' + ['c', 'f', 'p'].map((k) => `<div class="re-num re-num--${k}" aria-hidden="true"><span class="re-num__n"></span><span class="re-num__rule"></span><p class="re-num__w"></p></div>`).join('');
  const NUMS = ['c', 'f', 'p'].map((k) => {
    const box = column.querySelector(`.re-num--${k}`);
    return { k, box, n: box.querySelector('.re-num__n'), rule: box.querySelector('.re-num__rule'), w: box.querySelector('.re-num__w'), shown: null, word: null };
  });

  const room = document.createElement('div'); room.className = 'os-room';
  stage.append(sheet, column, room);
  stage.setAttribute('aria-label', FP.w.where);

  let W = 0, H = 0, narrow = false, G = null;
  let proj = null, path = null, frame = null, k = 1;
  let atlas = null, raster = null, washes = [], NEED = null;
  const washOf = new Map();
  const tones = new Map();
  let started = false;

  /* ------------------------------------------------------------ the numbers' words */

  const wordFor = (key, n) => (key === 'c' ? FP.w.countries(n) : key === 'f' ? FP.w.flights(n) : FP.w.photos(n));
  function setNumbers(c, f, p) {
    [c, f, p].forEach((v, i) => {
      const N = NUMS[i];
      if (N.shown !== v) { N.shown = v; N.n.textContent = FP.fmt(v); }
      const word = wordFor(N.k, v);
      if (N.word !== word) { N.word = word; N.w.textContent = word; }
    });
  }
  // the words, and each figure's box held at the width of its final number, so nothing moves while it counts
  function words() {
    const a = `${FP.fmt(FINAL.c)} ${FP.w.countries(FINAL.c)}`, b = `${FP.fmt(FINAL.f)} ${FP.w.flights(FINAL.f)}`, c = `${FP.fmt(FINAL.p)} ${FP.w.photos(FINAL.p)}`;
    column.querySelector('.os-sr').textContent = t().sr(a, b, c);
    NUMS.forEach((N) => { N.shown = null; N.word = null; N.n.style.removeProperty('--nw'); });
    setNumbers(FINAL.c, FINAL.f, FINAL.p);
    NUMS.forEach((N) => {
      const fs = parseFloat(getComputedStyle(N.n).fontSize) || 1;
      N.n.style.setProperty('--nw', `${(N.n.getBoundingClientRect().width / fs + 0.02).toFixed(3)}em`);
    });
  }

  /* ------------------------------------------------------------ the colourist's choice */

  // countries that touch, or lie a short sea apart, take different colours; among the free ones,
  // the colour least used so far (as tinted.js chooses them)
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
        polys.forEach((p) => p.forEach((ring) => ring.forEach((pt) => pts.push(pt))));
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
  }

  /* ------------------------------------------------------------ the frame: as large as the window allows */

  const SOUTH = -60; // the old atlases stop here
  const UNIT = d3.geoEqualEarth().scale(1).translate([0, 0]);
  const XR = UNIT([179.9999, 0])[0], YT = UNIT([0, 90])[1], YB = UNIT([0, SOUTH])[1];
  const MW = 2 * XR, MH = YB - YT;

  // a country as he knows it: the largest of the shapes the atlas numbers alike, without the far-off
  // pieces (French Guiana is France on paper, but he has not been to South America)
  function homeland(c, pj) {
    const all = atlas.features.filter((f) => f.id === c.iso);
    if (!all.length) return null;
    const f = all.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
    if (f.geometry.type !== 'MultiPolygon') return f;
    const gp = d3.geoPath(pj);
    const nm = FP.names()[c.iso];
    const p = pj(nm ? nm.at : [c.ll[1], c.ll[0]]);
    const polys = f.geometry.coordinates.map((coordinates) => ({ coordinates, a: d3.geoArea({ type: 'Polygon', coordinates }), c: gp.centroid({ type: 'Polygon', coordinates }) }));
    const total = polys.reduce((s, q) => s + q.a, 0);
    const far = 0.2 * (2 * pj.scale() * XR);
    const keep = polys.filter((q) => q.a / total > 0.15 || Math.hypot(q.c[0] - p[0], q.c[1] - p[1]) < far);
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: keep.map((q) => q.coordinates) } };
  }

  // what must stay in the window, in the map's own units: every country he has been to and every airport
  function needBounds() {
    const gp = d3.geoPath(UNIT);
    let x0 = Infinity, x1 = -Infinity;
    const add = (a, b) => { x0 = Math.min(x0, a); x1 = Math.max(x1, b); };
    [FP.home, ...FP.abroad].forEach((c) => { const f = homeland(c, UNIT); if (f) { const b = gp.bounds(f); add(b[0][0], b[1][0]); } });
    FP.flights.forEach((f) => [f.from, f.to].forEach((p) => { const q = UNIT([p.lng, p.lat]); add(q[0], q[0]); }));
    // and a little air for the lettering beside the farthest of them
    return { x0: x0 - 0.02, x1: x1 + 0.02 };
  }

  // what the column of numbers must keep clear of, drawn once at a fixed scale: the land, the paper
  // outside the map, and the flights; as a table that says at once whether a rectangle on the screen
  // touches any of it, for any size and place the map is drawn at
  function buildRaster(land) {
    const R = 150;
    const w = Math.ceil(MW * R) + 2, h = Math.ceil(MH * R) + 2;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const p = d3.geoEqualEarth().scale(R).translate([XR * R + 1, -YT * R + 1]);
    const gp = d3.geoPath(p, ctx);
    ctx.fillStyle = MASK; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); gp({ type: 'Sphere' }); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillRect(0, Math.floor(MH * R), w, h);
    ctx.beginPath(); gp(land); ctx.fill();
    ctx.strokeStyle = MASK; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    LINES.forEach((pieces) => pieces.forEach((pc) => { ctx.beginPath(); gp({ type: 'LineString', coordinates: pc }); ctx.stroke(); }));
    const d = ctx.getImageData(0, 0, w, h).data;
    const sat = new Int32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += d[(y * w + x) * 4 + 3] > 40 ? 1 : 0;
        sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + row;
      }
    }
    raster = { R, w, h, sat };
  }
  function blocked(r, s, ox, oy, m) {
    const { R, w, h, sat } = raster;
    const q = R / s;
    const x0 = Math.floor((r.x - m - ox) * q + XR * R + 1), x1 = Math.ceil((r.x + r.w + m - ox) * q + XR * R + 1);
    const y0 = Math.floor((r.y - m - oy) * q - YT * R + 1), y1 = Math.ceil((r.y + r.h + m - oy) * q - YT * R + 1);
    if (x0 < 0 || y0 < 0 || x1 > w || y1 > h) return true; // off the map is not open sea
    const W1 = w + 1;
    return sat[y1 * W1 + x1] - sat[y0 * W1 + x1] - sat[y1 * W1 + x0] + sat[y0 * W1 + x0] > 0;
  }

  // the figures' own height: each number's box is drawn in to the ink, top and bottom
  const meas = document.createElement('canvas').getContext('2d');
  // (a canvas draws Playfair's old-style figures, so the lining ones are measured by a capital O,
  // which stands as tall and dips as low)
  function inkOf(F) {
    meas.font = `400 ${F}px "Playfair Display"`;
    const m = meas.measureText('O');
    const fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
    if (!(fa > 0)) return { top: F * 0.19, bot: F * 0.07 };
    const base = (F - (fa + fd)) / 2 + fa; // line-height 1
    return { top: base - m.actualBoundingBoxAscent, bot: F - (base + m.actualBoundingBoxDescent) };
  }

  // the column at size F (a row, on a phone): its size and its parts, the figures and the rule with
  // its label, each kept clear on its own; each label spaced out to its figures' width, as a title line is
  const colCache = new Map();
  function setColumn(F, row, rw = 0) {
    const key = `${FP.lang}|${row ? 'r' : 'c'}|${F.toFixed(1)}|${rw}`;
    const ik = inkOf(100);
    column.style.setProperty('--n-top', `${(ik.top / 100).toFixed(4)}em`);
    column.style.setProperty('--n-bot', `${(ik.bot / 100).toFixed(4)}em`);
    column.style.setProperty('--f', `${F.toFixed(1)}px`);
    column.classList.toggle('is-row', row);
    if (row) column.style.setProperty('--rw', `${rw}px`); else column.style.removeProperty('--rw');
    if (colCache.has(key)) {
      const c = colCache.get(key);
      NUMS.forEach((N, i) => N.w.style.setProperty('--ls', c.ls[i]));
      return c.box;
    }
    const ls = NUMS.map((N) => {
      N.w.style.setProperty('--ls', '0px');
      const fs = parseFloat(getComputedStyle(N.w).fontSize);
      const chars = [...N.w.textContent].length;
      const fig = N.n.getBoundingClientRect().width * 0.94;
      const natural = N.w.getBoundingClientRect().width;
      const v = FP.lang === 'zh' ? 0.5 * fs : chars > 1 ? clamp((fig - natural) / (chars - 1), 0.16 * fs, 0.5 * fs) : 0;
      const css = `${v.toFixed(2)}px`;
      N.w.style.setProperty('--ls', css);
      return css;
    });
    const r = column.getBoundingClientRect();
    const rel = (b) => ({ dx: b.left - r.left, dy: b.top - r.top, w: b.width, h: b.height });
    const parts = [];
    NUMS.forEach((N) => {
      parts.push(rel(N.n.getBoundingClientRect()));
      const a = N.rule.getBoundingClientRect(), b = N.w.getBoundingClientRect();
      const x0 = Math.min(a.left, b.left), x1 = Math.max(a.right, b.right);
      parts.push(rel({ left: x0, top: a.top, width: x1 - x0, height: b.bottom - a.top }));
    });
    const box = { w: r.width, h: r.height, parts };
    colCache.set(key, { box, ls });
    return box;
  }

  // the names that must keep their place, as boxes on the screen for a map at scale s about (ox, oy)
  const FONT = {
    en: { m: [8.6, 10.5, 0.16], l: [10, 13, 0.3], dx: 0.45 },
    zh: { m: [9.6, 11, 0.1], l: [10.4, 13.5, 0.6], dx: 0.3 },
  };
  function keepBoxes(s, ox, oy) {
    const lang = FP.lang, kk = clamp(s / 251, 0.62, 1.2);
    const fam = '"Playfair Display", "Noto Serif TC", serif';
    return [FP.home, ...FP.abroad].filter((c) => RANK(c) <= 2 && PLACE[c.id]).map((c) => {
      const p = PLACE[c.id], size = p.size === 'l' ? 'l' : 'm', [min, base, ls] = FONT[lang][size];
      const fs = Math.max(min, base * kk);
      const name = c.home ? c.name[lang] : c.country[lang], cap = lang === 'zh' ? name : name.toUpperCase();
      meas.font = `400 ${fs}px ${fam}`;
      const w = meas.measureText(cap).width + ls * fs * [...cap].length + (p.stack ? 0 : 3.2 * fs);
      const u = UNIT(p.at), x = ox + u[0] * s, y = oy + u[1] * s;
      return { x: p.a === 'start' ? x : p.a === 'end' ? x - w : x - w / 2, y: y - 0.8 * fs, w, h: (p.stack ? 2.2 : 1.05) * fs };
    });
  }

  const at = (box, x, y) => ({ x, y, w: box.w, h: box.h, parts: box.parts.map((p) => ({ x: x + p.dx, y: y + p.dy, w: p.w, h: p.h })) });

  // where the column stands largest in the open sea, for a map at scale s about (ox, oy)
  function fitColumn(L, w, h, F0) {
    const edge = 16, top = 66, bottom = 10, step = 8;
    const keeps = keepBoxes(L.s, L.ox, L.oy);
    for (let F = F0; F >= F0 * 0.42; F *= 0.95) {
      const cb = setColumn(F, false);
      const m = Math.max(12, F * 0.07);
      const cols = Math.floor((w - 2 * edge - cb.w) / step) + 1, rows = Math.floor((h - top - bottom - cb.h) / step) + 1;
      if (cols < 1 || rows < 1) continue;
      const ok = new Uint8Array(cols * rows);
      let any = false;
      for (let b = 0; b < rows; b++) {
        for (let a = 0; a < cols; a++) {
          const x = edge + a * step, y = top + b * step;
          let clear = true;
          for (const p of cb.parts) {
            const r = { x: x + p.dx, y: y + p.dy, w: p.w, h: p.h };
            if (blocked(r, L.s, L.ox, L.oy, m) || keeps.some((q) => overlap(q, r, 8))) { clear = false; break; }
          }
          if (clear) { ok[b * cols + a] = 1; any = true; }
        }
      }
      if (!any) continue;
      // the stretches of open sea that hold it at this size; the widest of them, then the one lowest
      // and furthest left; the column at its middle
      const seen = new Uint8Array(cols * rows);
      let best = null;
      for (let i = 0; i < cols * rows; i++) {
        if (!ok[i] || seen[i]) continue;
        const cells = [], queue = [i]; seen[i] = 1;
        while (queue.length) {
          const c = queue.pop(); cells.push(c);
          const ca = c % cols, cb2 = (c - ca) / cols;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const na = ca + dx, nb = cb2 + dy;
            if (na < 0 || nb < 0 || na >= cols || nb >= rows) continue;
            const n = nb * cols + na;
            if (ok[n] && !seen[n]) { seen[n] = 1; queue.push(n); }
          }
        }
        let sx = 0, sy = 0;
        cells.forEach((c) => { sx += c % cols; sy += Math.floor(c / cols); });
        const mx = sx / cells.length, my = sy / cells.length;
        const score = cells.length + 0.02 * (my - mx);
        if (!best || score > best.score) {
          const mid = cells.reduce((p, c) => (Math.hypot(c % cols - mx, Math.floor(c / cols) - my) < Math.hypot(p % cols - mx, Math.floor(p / cols) - my) ? c : p));
          best = { score, x: edge + (mid % cols) * step, y: top + Math.floor(mid / cols) * step };
        }
      }
      return { F, cr: at(cb, best.x, best.y) };
    }
    return null;
  }

  // the map placed at scale s: as wide as the window, centred, but never with one of his countries cut
  function placeMap(s, w, h, edge, top, bottom) {
    const lo = edge - NEED.x0 * s, hi = w - edge - NEED.x1 * s;
    const ox = lo <= hi ? clamp(w / 2, lo, hi) : (lo + hi) / 2;
    const oy = top - YT * s + Math.max(0, (h - top - bottom - MH * s) / 2);
    return { s, ox, oy };
  }

  function solve() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 640) return solveNarrow(w, h);
    const edge = clamp(w * 0.011, 10, 18), top = 62, bottom = 10;
    const s0 = Math.min((h - top - bottom) / MH, (w - 2 * edge) / (NEED.x1 - NEED.x0));
    const F0 = clamp(Math.min(h * 0.19, w * 0.11), 70, 190);
    let best = null;
    for (let f = 1; f >= 0.8 - 1e-9; f -= 0.025) {
      const L = placeMap(s0 * f, w, h, edge, top, bottom);
      const col = fitColumn(L, w, h, F0);
      if (!col) continue;
      const worth = f + 0.35 * (col.F / F0);
      if (!best || worth > best.worth) best = { ...L, ...col, worth };
      if (col.F >= F0 * 0.86) break; // the map as large as it can be with the column near its full size
    }
    if (!best) { // no sea holds it: the map smaller, the column in the bottom left corner
      const L = placeMap(s0 * 0.8, w, h, edge, top, bottom);
      const F = F0 * 0.6, cb = setColumn(F, false);
      best = { ...L, F, cr: at(cb, edge + 8, h - bottom - cb.h - 8) };
    }
    setColumn(best.F, false);
    return { w, h, ...best };
  }

  // a phone: the map across the top at full width, the three numbers in a row under it
  function solveNarrow(w, h) {
    const edge = 8, top = 66, rowEdge = 16;
    const s = (w - 2 * edge) / (NEED.x1 - NEED.x0);
    const L = placeMap(s, w, h, edge, top, 0);
    const mapH = MH * s;
    const F = clamp(w * 0.25, 70, 128);
    const rw = w - 2 * rowEdge;
    const cb = setColumn(F, true, rw);
    const gap = 30;
    const drop = Math.max(0, (h - top - 28 - (mapH + gap + cb.h)) * 0.3);
    const oy = top - YT * s + drop;
    const cr = at(cb, rowEdge, oy + YB * s + gap);
    return { w, h, narrow: true, s, ox: L.ox, oy, F, rw, cr, room: cr.y + cr.h + 28 };
  }

  /* ------------------------------------------------------------ the sea: graticule, water-lining, neatline */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else ctx.rect(x, y, w, h);
  }
  // the paper left clear under the numbers: the engraving fades out round them, no edge
  function clearings() {
    if (narrow) return [];
    return G.cr.parts.map((p, i) => (i % 2 === 0 ? { ...p, pad: G.F * (i ? 0.02 : 0.03), soft: G.F * (i ? 0.05 : 0.08) } : { ...p, pad: 6, soft: 16 }));
  }

  function drawSea(L) {
    sea.width = Math.round(W * DPR); sea.height = Math.round(H * DPR);
    const ctx = sea.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const water = cssVar('--tn-water'), inkC = cssVar('--ink');
    const framePath = new Path2D(frame);

    ctx.save();
    ctx.clip(framePath);
    // the graticule, every fifteen degrees, the equator a shade firmer
    const gpath = d3.geoPath(proj, ctx);
    ctx.strokeStyle = inkC; ctx.lineWidth = 0.4;
    ctx.globalAlpha = 0.18;
    ctx.beginPath(); gpath(d3.geoGraticule().step([15, 15]).extentMinor([[-180, SOUTH - 1], [180, 90]])()); ctx.stroke();
    ctx.globalAlpha = 0.34;
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
    const lines = narrow ? 7 : 12;
    const th = d3.range(lines).map((i) => (1.7 + 2.35 * i + 0.16 * i * i) * sp);
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
      lc.globalAlpha = 0.66 * Math.pow(1 - i / lines, 1.4);
      lc.beginPath(); cpath(c); lc.stroke();
    });
    lc.globalAlpha = 1; lc.globalCompositeOperation = 'destination-in';
    lc.imageSmoothingEnabled = true;
    lc.drawImage(fade, 0, 0, gw, gh);
    ctx.restore();
    waterCv.width = sea.width; waterCv.height = sea.height;
    const wc = waterCv.getContext('2d');
    wc.save();
    wc.setTransform(DPR, 0, 0, DPR, 0, 0);
    wc.clip(framePath);
    wc.setTransform(1, 0, 0, 1, 0, 0);
    wc.drawImage(lay, 0, 0);
    wc.restore();

    // the neatline: a heavy rule outside, a fine one on the edge of the map
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1; ctx.strokeStyle = inkC;
    ctx.lineWidth = 0.6; ctx.stroke(framePath);
    const gap = narrow ? 2.5 : 3.5 * k;
    const outer = d3.geoEqualEarth().scale(L.s).translate([L.ox, L.oy]).precision(0.2);
    const f = L.s; // grow the outline by `gap` all round
    const sx = (XR * f + gap) / (XR * f), syT = (-YT * f + gap) / (-YT * f), syB = (YB * f + gap) / (YB * f);
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

    // the clearings: rings of rubbing out, wider and fainter outwards, so the lines thin away
    if (!narrow) [ctx, wc].forEach((cx2) => {
      cx2.save();
      cx2.setTransform(DPR, 0, 0, DPR, 0, 0);
      cx2.globalCompositeOperation = 'destination-out';
      const N = 14;
      for (let i = 0; i < N; i++) {
        cx2.globalAlpha = 0.28;
        clearings().forEach((r) => {
          const grow = r.pad + r.soft * (1 - i / (N - 1));
          roundRect(cx2, r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow, grow);
          cx2.fill();
        });
      }
      cx2.restore();
    });
  }

  /* ------------------------------------------------------------ the ink: coasts, borders, lettering */

  let labelLayer = null, hitLayer = null, seaNames = [], borderEl = null, homeLabel = null;
  function drawInk() {
    ink.replaceChildren();
    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const defs = el('defs', {}, ink);
    // the coasts and borders inside the frame, but not under the numbers (a speck of an island there)
    let d = frame;
    const rr = (x, y, w, h, r) => `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
    d += clearings().map((c) => { const p = c.pad + c.soft * 0.35; return rr(c.x - p, c.y - p, c.w + 2 * p, c.h + 2 * p, Math.min(p, (c.w + 2 * p) / 2, (c.h + 2 * p) / 2)); }).join('');
    const clip = el('clipPath', { id: 're-frame' }, defs);
    el('path', { d, 'clip-rule': 'evenodd' }, clip);
    const g = el('g', { 'clip-path': 'url(#re-frame)' }, ink);
    borderEl = el('path', { class: 'tn-border', d: path(atlas.borders) }, g);
    if (arrived) { el('path', { class: 'tn-coast', d: path(atlas.land) }, g); specksEl = null; drawn = []; }
    else engraving(g);
    // the small ones get a ring, so a dab of colour has something to sit in; it waits for the colour
    washes.filter((w) => w.dab && !w.c.home).forEach((w) => {
      w.dot = el('circle', { class: 'tn-dot' + (arrived || opened.has(w.c.id) ? '' : ' is-waiting'), cx: w.dab[0], cy: w.dab[1], r: w.dab[2] }, g);
    });
    hitLayer = el('g', {}, ink);
    labelLayer = el('g', {}, ink);
    washes.forEach((w) => {
      const hh = w.dab ? el('circle', { class: 'tn-hit', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] + 6 }, hitLayer)
        : el('path', { class: 'tn-hit', d: path(w.feature) }, hitLayer);
      hh.dataset.id = w.c.id;
    });
  }

  // the small countries of a crowded corner lettered in one column, spaced apart (typeset's)
  function europe() {
    const out = new Map();
    const zh = FP.lang === 'zh';
    const em = Math.max(zh ? 9.6 : 8.6, (zh ? 11 : 10.5) * k);
    const gap = em * 2.5;
    const groups = {};
    Object.entries(PLACE).forEach(([id, p]) => { if (p.group) (groups[p.group] = groups[p.group] || []).push({ id, p, at: proj(p.at) }); });
    Object.values(groups).forEach((list) => {
      const fixed = list.find((q) => q.p.fix) || list[0];
      const colX = proj(fixed.p.at)[0];
      list.forEach((q) => { q.x = q.p.col ? colX : q.at[0]; q.y = q.at[1]; });
      list.sort((a, b) => a.y - b.y);
      const fi = list.indexOf(fixed);
      for (let i = fi - 1; i >= 0; i--) list[i].y = Math.min(list[i].y, list[i + 1].y - gap);
      for (let i = fi + 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + gap);
      list.forEach((q) => out.set(q.id, [q.x, q.y]));
    });
    return out;
  }

  function drawLabels() {
    seaNames = []; homeLabel = null;
    if (!labelLayer) return;
    labelLayer.replaceChildren();
    if (narrow) return;
    const lang = FP.lang, names = FP.names();
    const spot = europe();
    // the oceans first, under the countries' names
    seaNames = SEAS.map((s2) => {
      const [x, y] = proj(s2.at);
      const tx = el('text', { class: 'tn-ocean', x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle' }, labelLayer);
      s2[lang].forEach((line, i) => { el('tspan', { x: x.toFixed(1), dy: i ? '1.5em' : '0' }, tx).textContent = line; });
      tx.spots = [s2.at, ...(s2.alt || [])].map((ll) => proj(ll));
      return tx;
    });
    washes.forEach((w) => {
      const c = w.c, nm = names[c.iso];
      const p = PLACE[c.id] || { at: nm ? nm.at : [c.ll[1], c.ll[0]], a: 'middle', inside: true };
      const [x, y] = spot.get(c.id) || proj(p.at);
      const g = el('g', { class: 'tn-label' }, labelLayer);
      const tx = el('text', { class: 'tn-name tn-name--' + (p.size || 'm') + (p.inside ? '' : ' is-halo') + (c.home ? ' is-home' : ''), x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': p.a }, g);
      const name = c.home ? c.name[lang] : c.country[lang];
      const cap = lang === 'zh' ? name : name.toUpperCase();
      const year = c.home ? (lang === 'zh' ? FP.w.home : FP.w.home.toUpperCase()) : String(c.first);
      if (p.wrap) { // two lines, the year on the second
        const words2 = lang === 'zh' ? [cap.slice(0, p.zhCut || 2), cap.slice(p.zhCut || 2)] : cap.split(' ');
        const cut = Math.ceil(words2.length / 2), sep = lang === 'zh' ? '' : ' ';
        el('tspan', { x: x.toFixed(1), dy: '0' }, tx).textContent = words2.slice(0, cut).join(sep);
        el('tspan', { x: x.toFixed(1), dy: '1.2em' }, tx).textContent = words2.slice(cut).join(sep);
      } else {
        tx.appendChild(document.createTextNode(cap));
      }
      if (p.stack) el('tspan', { class: 'tn-year', x: x.toFixed(1), dy: '1.15em' }, tx).textContent = year;
      else el('tspan', { class: 'tn-year', dx: lang === 'zh' ? '0.3em' : '0.45em' }, tx).textContent = year;
      tx.dataset.id = c.id;
      w.label = g; w.text = tx;
      if (c.home) homeLabel = g;
      else if (!arrived && !opened.has(c.id)) g.classList.add('is-waiting');
      if (p.lead) { // a fine leader from the nearest edge of the lettering to the place
        const [lx, ly] = proj(p.lead);
        const b = tx.getBBox(), m = 2.5;
        const qx = clamp(lx, b.x - m, b.x + b.width + m), qy = clamp(ly, b.y + b.height * 0.2, b.y + b.height * 0.8);
        const sx = lx < b.x || lx > b.x + b.width ? qx : clamp(lx, b.x, b.x + b.width);
        const sy = lx < b.x || lx > b.x + b.width ? qy : (ly < b.y ? b.y - 1 : b.y + b.height + 1);
        g.insertBefore(el('path', { class: 'tn-lead', d: `M${sx.toFixed(1)},${sy.toFixed(1)}L${lx.toFixed(1)},${ly.toFixed(1)}` }), tx);
        g.insertBefore(el('circle', { class: 'tn-lead-end', cx: lx.toFixed(1), cy: ly.toFixed(1), r: 1.1 }), tx);
        w.leadAt = [lx, ly];
      } else w.leadAt = null;
    });
    cull();
  }

  // leave out the labels that have no room: those that run into a larger one, the numbers, the edge
  function cull() {
    const pad = 3 + 2.5 * clamp((1 - k) / 0.38, 0, 1);
    const taken = G.cr.parts.map((p) => ({ x: p.x - 8, y: p.y - 8, w: p.w + 16, h: p.h + 16 }));
    const inside = (b) => b.x >= 6 && b.x + b.w <= W - 6 && b.y >= 56 && b.y + b.h <= H - 4;
    const list = washes.filter((w) => w.label).sort((a, b) => (RANK(a.c) - RANK(b.c)) || (b.area - a.area));
    for (const w of list) {
      const b = w.text.getBBox();
      const box = { x: b.x, y: b.y, w: b.width, h: b.height };
      const end = w.leadAt ? { x: w.leadAt[0] - 2, y: w.leadAt[1] - 2, w: 4, h: 4 } : null;
      const hit = taken.some((o) => overlap(box, o, pad) || (end && overlap(end, o, 0)));
      if ((hit || !inside(box)) && !w.c.home) { w.label.classList.add('is-cut'); continue; }
      taken.push(box);
    }
    // an ocean's name gives way to everything, and keeps inside the window: where it has no room, it
    // tries its other places in the open water, and is left out if none has room
    const land = (b) => G.s && raster && blocked(b, G.s, G.ox, G.oy, 4);
    const cols = G.cr.parts; // and stands well apart from the numbers, so it never reads as one of their labels
    seaNames.forEach((tx) => {
      const fits = tx.spots.some(([x, y]) => {
        tx.setAttribute('x', x.toFixed(1)); tx.setAttribute('y', y.toFixed(1));
        tx.querySelectorAll('tspan').forEach((ts) => ts.setAttribute('x', x.toFixed(1)));
        const b = tx.getBBox(), box = { x: b.x, y: b.y, w: b.width, h: b.height };
        return inside(box) && !taken.some((o) => overlap(box, o, 10)) && !cols.some((o) => overlap(box, o, 56)) && !land(box);
      });
      if (fits) { const b = tx.getBBox(); taken.push({ x: b.x, y: b.y, w: b.width, h: b.height }); } else tx.classList.add('is-cut');
    });
  }

  /* ------------------------------------------------------------ the washes (bolder's: denser, deeper) */

  // one sheet of wash per country, made once per layout: the shape a little off the line, the edge
  // uneven, pigment pooled along it, mottled in the middle, the paper's tooth showing through
  function makeWash(c, feature) {
    const id = c.id, seed = hashStr(id) & 0xffff;
    const col = tones.get(id).rgb;
    const area = feature ? path.area(feature) : 0;
    const nm = FP.names()[c.iso];
    let dab = null;
    if (!feature || area < 30) {
      const p = proj(nm ? nm.at : [c.ll[1], c.ll[0]]);
      dab = [p[0], p[1], clamp(3.2 * k, 2.6, 4)];
    }
    let b = feature ? path.bounds(feature) : [[dab[0], dab[1]], [dab[0], dab[1]]];
    if (dab) b = [[Math.min(b[0][0], dab[0] - dab[2]), Math.min(b[0][1], dab[1] - dab[2])], [Math.max(b[1][0], dab[0] + dab[2]), Math.max(b[1][1], dab[1] + dab[2])]];
    const pad = 4;
    // only the part on the screen is laid (a country can run off the side of the window)
    const x0 = Math.floor(Math.max(-pad, b[0][0] - pad)), y0 = Math.floor(Math.max(-pad, b[0][1] - pad));
    const x1 = Math.ceil(Math.min(W + pad, b[1][0] + pad)), y1 = Math.ceil(Math.min(H + pad, b[1][1] + pad));
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
        let al = 0.62 + 0.18 * mott + 0.3 * pool;
        al *= 1 - 0.3 * tooth * tooth * tooth;
        const dk = 1 - 0.2 * pool;
        px[i * 4] = r * dk; px[i * 4 + 1] = gg * dk; px[i * 4 + 2] = bb * dk;
        px[i * 4 + 3] = clamp(cov * al, 0, 1) * 255;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(img, 0, 0);
    // where it is on the screen: for a tap that lands near it, and where its colour bleeds out from
    const ctr = dab ? [dab[0], dab[1]] : path.centroid(feature);
    const atPt = Number.isFinite(ctr[0]) ? ctr : proj([c.ll[1], c.ll[0]]);
    return { c, feature, cv, img, x0, y0, w: x1 - x0, h: y1 - y0, dab, area, at: atPt, label: null, text: null, state: 0 };
  }

  // each country's wash on a small sheet of its own: home's laid from the start, the others left clear
  // until the count reaches them
  function layWashes() {
    washBox.replaceChildren();
    washes.forEach((w) => {
      const cv = document.createElement('canvas');
      cv.className = 'ia-wash';
      cv.width = w.cv.width; cv.height = w.cv.height;
      cv.style.setProperty('--dx', `${w.x0}px`); cv.style.setProperty('--dy', `${w.y0}px`);
      cv.style.setProperty('--dw', `${w.w}px`); cv.style.setProperty('--dh', `${w.h}px`);
      w.el = cv;
      if (arrived || w.c.home || opened.has(w.c.id)) { cv.getContext('2d').drawImage(w.cv, 0, 0); w.state = 2; }
      else cv.classList.add('is-waiting');
      washBox.appendChild(cv);
    });
  }

  // a wash bleeding out from the middle of its country: the pigment reaches each part of it in turn, the
  // nearest first, the front a little uneven (the same unevenness every time, from the country's name),
  // and a shade richer while it is wet. Only its alpha moves: the colour is its own from the first moment.
  function bleedAt(w, u) {
    const cv = w.el;
    if (!cv) return;
    cv.classList.remove('is-waiting');
    const W2 = w.cv.width, H2 = w.cv.height, N = W2 * H2, src = w.img.data;
    if (!w.arr) {
      const cx = (w.at[0] - w.x0) * DPR, cy = (w.at[1] - w.y0) * DPR, seed = (hashStr(w.c.id) & 0xffff) + 11;
      const arr = new Float32Array(N);
      let max = 1;
      for (let y = 0, i = 0; y < H2; y++) for (let x = 0; x < W2; x++, i++) {
        if (src[i * 4 + 3] === 0) { arr[i] = -1; continue; }
        const d = Math.hypot(x - cx, y - cy);
        arr[i] = d; if (d > max) max = d;
      }
      for (let y = 0, i = 0; y < H2; y++) for (let x = 0; x < W2; x++, i++) {
        if (arr[i] < 0) continue;
        arr[i] = (arr[i] / max) * 0.84 + noise(x / DPR / 7, y / DPR / 7, seed) * 0.16;
      }
      w.arr = arr;
      w.out = cv.getContext('2d').createImageData(W2, H2);
      const dst = w.out.data;
      for (let i = 0; i < N * 4; i += 4) { dst[i] = src[i]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i + 2]; }
    }
    const ctx = cv.getContext('2d');
    if (u >= 1) { ctx.putImageData(w.img, 0, 0); return; }
    const arr = w.arr, dst = w.out.data, soft = 0.18;
    const p = 1 - (1 - u) ** 3; // quick while the brush is wet, slowing as it dries
    const front = p * (1 + soft), wet = 1 - u;
    for (let i = 0; i < N; i++) {
      const a = arr[i];
      if (a < 0) continue;
      const k2 = clamp((front - a) / soft, 0, 1);
      dst[i * 4 + 3] = Math.min(255, src[i * 4 + 3] * k2 * (1 + 1.3 * k2 * (1 - k2) * wet));
    }
    ctx.putImageData(w.out, 0, 0);
  }

  /* ------------------------------------------------------------ the flights, drawn */

  const FLY = EVENTS.filter((e) => e.kind === 'fly');
  function drawFlights() {
    flightsSvg.replaceChildren();
    flightsSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    flightsSvg.setAttribute('width', W); flightsSvg.setAttribute('height', H);
    const g = el('g', {}, flightsSvg);
    FLY.forEach((e) => {
      e.lines = LINES.get(e.f).map((pc) => {
        const d = path({ type: 'LineString', coordinates: pc });
        if (!d) return null;
        const p = el('path', { class: 're-flight', d }, g);
        return { el: p, len: p.getTotalLength() };
      }).filter(Boolean);
      e.total = e.lines.reduce((n, L) => n + L.len, 0);
      e.state = arrived ? 2 : 0;
      e.lines.forEach((L) => {
        if (arrived) { L.el.setAttribute('stroke-opacity', DRY); return; }
        L.el.setAttribute('stroke-dasharray', `${L.len.toFixed(2)} ${(L.len + 4).toFixed(2)}`);
        L.el.setAttribute('stroke-dashoffset', L.len.toFixed(2));
        L.el.setAttribute('stroke-opacity', WET);
      });
    });
  }
  // a flight at a moment: drawn along its line as far as the pen has gone; once landed, its ink dries
  // to a faint line. A flight over the date line leaves one edge of the map and comes in at the other.
  function flightAt(e, ms) {
    if (e.state === 2 || ms <= e.t) return;
    const p = (ms - e.t) / e.d;
    const drawn = smooth(p) * e.total;
    let acc = 0;
    e.lines.forEach((L) => {
      const local = clamp(drawn - acc, 0, L.len);
      L.el.setAttribute('stroke-dashoffset', (L.len - local).toFixed(2));
      acc += L.len;
    });
    const r = (ms - e.t - e.d) / RELAX;
    const op = p < 1 ? WET : DRY + (WET - DRY) * (1 - smooth(r));
    e.lines.forEach((L) => L.el.setAttribute('stroke-opacity', op.toFixed(3)));
    if (r >= 1) {
      e.state = 2;
      e.lines.forEach((L) => { L.el.removeAttribute('stroke-dasharray'); L.el.removeAttribute('stroke-dashoffset'); });
    } else e.state = 1;
  }

  /* ------------------------------------------------------------ the engraving, line by line */

  // the coasts, each ring its own line (pathLength 1, so every one is drawn in the same time), held
  // back by how far it lies from home: the engraving spreads outward from Taiwan. Specks of islands too
  // small to draw come up together with the sea lines.
  const ENGRAVE = { start: 150, span: 1500, each: 750 };
  let drawn = [], specksEl = null;
  function engraving(g) {
    const geoms = atlas.land.type === 'FeatureCollection' ? atlas.land.features.map((f) => f.geometry) : [atlas.land.geometry || atlas.land];
    const all = [];
    geoms.forEach((gm) => {
      const polys = gm.type === 'Polygon' ? [gm.coordinates] : gm.type === 'MultiPolygon' ? gm.coordinates : [];
      polys.forEach((p) => p.forEach((ring) => all.push(ring)));
    });
    const hp = proj([FP.home.ll[1], FP.home.ll[0]]);
    const specks = [], lines2 = [];
    all.forEach((ring) => {
      const ls = { type: 'LineString', coordinates: ring };
      const d = path(ls);
      if (!d) return;
      if (d3.geoLength(ls) * G.s < 22) { specks.push(d); return; }
      const b = path.bounds(ls);
      lines2.push({ d, far: Math.hypot((b[0][0] + b[1][0]) / 2 - hp[0], (b[0][1] + b[1][1]) / 2 - hp[1]) });
    });
    const most = Math.max(1, ...lines2.map((l) => l.far));
    drawn = lines2.map((l) => ({ el: el('path', { class: 'tn-coast ia-draw', d: l.d, pathLength: 1 }, g), delay: (l.far / most) * (ENGRAVE.span - ENGRAVE.each) }));
    specksEl = specks.length ? el('path', { class: 'tn-coast', d: specks.join('') }, g) : null;
  }

  /* ------------------------------------------------------------ the arrival and the ramp */

  const SEEK = query.has('at') ? Math.max(0, +query.get('at') || 0) : null;
  let arrived = STILL, anims = [], raf = 0, T0 = 0;
  const opened = new Set([FP.home.id]);
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

  // the sheet at a moment of the ramp (ms from the start)
  function paint(ms) {
    const n = countsAt(ms);
    setNumbers(n.c, n.f, n.p);
    for (const e of EVENTS) {
      if (e.kind === 'fly') { flightAt(e, ms); continue; }
      if (e.kind !== 'reach' || ms < e.t) continue;
      const w = washOf.get(e.c.id);
      if (!w || w.state === 2) continue;
      if (!opened.has(e.c.id)) {
        opened.add(e.c.id);
        if (w.label) w.label.classList.remove('is-waiting');
        if (w.dot) w.dot.classList.remove('is-waiting');
      }
      const u = (ms - e.t) / BLEED;
      bleedAt(w, u);
      w.state = u >= 1 ? 2 : 1;
    }
  }

  function arrive() {
    if (arrived) { setNumbers(FINAL.c, FINAL.f, FINAL.p); return; }
    body.classList.add('is-running');
    setNumbers(0, 0, 0);
    const fade = (els, delay, dur) => els.filter(Boolean).forEach((e) => anims.push(e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, delay, easing: EASE, fill: 'both' })));
    // the plate, the three numbers at nought, and home in clay
    const home = washOf.get(FP.home.id);
    fade([sea, column, home && home.el, homeLabel], AT.plate, 900);
    // the coasts, engraved from home outward
    drawn.forEach((d) => anims.push(d.el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ENGRAVE.each, delay: ENGRAVE.start + d.delay, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'both' })));
    // the borders, the specks of islands and the sea lines, and the oceans' names
    fade([waterCv, borderEl, specksEl, ...seaNames], AT.sea, 1000);
    if (SEEK != null) {
      anims.forEach((a) => { a.pause(); a.currentTime = SEEK; });
      paint(SEEK);
      if (SEEK >= END) settle();
      return;
    }
    T0 = performance.now();
    const loop = (now) => {
      const ms = now - T0;
      paint(ms);
      if (ms >= END) settle(); else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  // at rest: every line engraved, every wash laid, every flight dry, every name lettered
  function settle() {
    cancelAnimationFrame(raf); raf = 0;
    if (arrived) return;
    arrived = true;
    anims.forEach((a) => a.cancel()); anims = [];
    washes.forEach((w) => {
      if (w.el && w.state !== 2) { w.el.getContext('2d').putImageData(w.img, 0, 0); w.el.classList.remove('is-waiting'); }
      w.state = 2;
      if (w.label) w.label.classList.remove('is-waiting');
      if (w.dot) w.dot.classList.remove('is-waiting');
      opened.add(w.c.id);
    });
    FLY.forEach((e) => {
      e.state = 2;
      (e.lines || []).forEach((L) => { L.el.removeAttribute('stroke-dasharray'); L.el.removeAttribute('stroke-dashoffset'); L.el.setAttribute('stroke-opacity', DRY); });
    });
    setNumbers(FINAL.c, FINAL.f, FINAL.p);
    body.classList.remove('is-running');
  }

  /* ------------------------------------------------------------ pointing and tapping */

  const idAt = (e) => {
    const h = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
    return h && hitLayer && hitLayer.contains(h) ? h.dataset.id : null;
  };
  // a finger is wide: the nearest of his countries within reach of the tap
  function nearest(e) {
    const r = sheet.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 26;
    washes.forEach((w) => { const d = Math.hypot(w.at[0] - x, w.at[1] - y); if (d < bd) { bd = d; best = w.c.id; } });
    return best;
  }
  // the note, for a country that has its colour
  function note(id, e) {
    if (!id || !(arrived || opened.has(id))) { FP.tip(null); return; }
    FP.tip(e.clientX, e.clientY, FP.about(FP.byId.get(id)));
  }
  stage.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') note(idAt(e), e); });
  stage.addEventListener('pointerleave', () => FP.tip(null));
  stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') note(idAt(e) || nearest(e), e); });
  stage.addEventListener('scroll', () => FP.tip(null), { passive: true });

  /* ------------------------------------------------------------ putting it together */

  function render() {
    words();
    const g = solve();
    if (!g || g.w < 120 || g.h < 120 || !(g.s > 20)) return false; // a window too small (or still hidden): wait for it
    G = g; W = g.w; H = g.h; narrow = !!g.narrow;
    body.classList.toggle('is-narrow', narrow);
    proj = d3.geoEqualEarth().scale(g.s).translate([g.ox, g.oy]).precision(0.15)
      .clipExtent([[g.ox - XR * g.s - 1, g.oy + YT * g.s - 1], [g.ox + XR * g.s + 1, g.oy + YB * g.s]]);
    path = d3.geoPath(proj);
    frame = path({ type: 'Sphere' });
    k = clamp(g.s / 251, 0.62, 1.2);
    document.documentElement.style.setProperty('--tn-k', k.toFixed(3));
    const L = { s: g.s, ox: g.ox, oy: g.oy, mapTop: g.oy + YT * g.s, mapBottom: g.oy + YB * g.s };

    // the numbers in their place
    if (narrow) setColumn(g.F, true, g.rw); else setColumn(g.F, false);
    column.style.setProperty('--x', `${g.cr.x.toFixed(1)}px`);
    column.style.setProperty('--y', `${g.cr.y.toFixed(1)}px`);
    stage.style.setProperty('--room', narrow ? `${Math.ceil(g.room)}px` : '0px');

    // every layer at the window's size in pixels
    sheet.style.setProperty('--sheet-w', `${W}px`);
    sheet.style.setProperty('--sheet-h', `${H}px`);
    ink.setAttribute('width', W); ink.setAttribute('height', H);
    washes = [FP.home, ...FP.abroad].map((c) => makeWash(c, homeland(c, proj)));
    washOf.clear(); washes.forEach((w) => washOf.set(w.c.id, w));
    drawSea(L);
    drawInk();
    drawLabels();
    layWashes();
    drawFlights();
    if (arrived) setNumbers(FINAL.c, FINAL.f, FINAL.p);
    return true;
  }

  const fontsIn = Promise.race([
    Promise.all([
      document.fonts.load('400 120px "Playfair Display"', '0123456789'),
      document.fonts.load('400 12px "Playfair Display"', 'UNITED STATES 2014'),
      document.fonts.load('500 11px "Geist"', 'COUNTRIES FLIGHTS PHOTOGRAPHS'),
      document.fonts.load('600 11px "Geist"', 'HOME'),
      document.fonts.load('400 12px "Noto Serif TC"', '美國中國日本太平洋'),
      document.fonts.load('500 11px "Noto Sans TC"', '個國家段航程張照片'),
    ]).catch(() => null),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  if (STILL) body.classList.add('is-still');
  Promise.all([FP.world('50m'), FP.world('110m'), fontsIn]).then(([a, lite]) => {
    atlas = a;
    NEED = needBounds();
    buildRaster(topojson.merge(lite.topo, lite.topo.objects.countries.geometries.filter((g) => g.id !== '010')));
    chooseTones();
    const go = () => {
      if (!render()) return false;
      started = true;
      requestAnimationFrame(() => body.classList.add('is-ready'));
      arrive();
      return true;
    };
    if (!go()) { // still hidden: try again when it has a size
      const again = () => { if (!started && go()) removeEventListener('resize', again); };
      addEventListener('resize', again);
    }
  });

  let rt = 0;
  addEventListener('resize', () => {
    if (!started) return;
    settle(); // a window changing size mid-way: the finished sheet
    clearTimeout(rt);
    if (STILL) render(); else rt = setTimeout(render, 140);
  });
  FP.onLang(() => { if (!started) return; settle(); stage.setAttribute('aria-label', FP.w.where); render(); });
})();
