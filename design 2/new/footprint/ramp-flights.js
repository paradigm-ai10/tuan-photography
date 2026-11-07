/* Flight by flight 一段一段航程 (footprint, round five, 2026-11-06). His brief this round: the map
   bigger with little white on the display; three numbers (countries, flights, photographs); the
   landing starts with his countries uncoloured, and as the numbers pump up the places he has been gain
   their colour, the flights shown quietly: a ramp.
   This version lets the flights drive it. The hand-tinted atlas of imp-bolder (its six earth washes, its
   stamp inks), lettered as imp-typeset letters it, arriving as one slow sequence as imp-animate does:
     0 s       the atlas, every country plain paper but home, which is in clay; 0 countries, 0 flights,
               home's photographs; home's stamp in the lower right;
     1.2 s     his 41 flights, oldest first, each drawn as a hairline from where it left to where it
               landed in about 0.15 to 0.2 s, on a pace that eases in and out (about 8 s in all). As each
               lands the flights figure ticks up by one; when it lands in a country he had not been to,
               that country's wash bleeds in, its name is lettered, the countries figure steps up, the
               photographs figure climbs by that country's photographs, and its stamp is pressed. A country
               he reached by rail or road (Switzerland, Andorra), or on a trip with no legs recorded (the
               Netherlands, Myanmar), takes its own beat in the same order, with no line drawn.
     ~10 s     everything rests: 41 faint routes, his coloured countries, 20 / 41 / 93.
   The map is drawn as large as the window allows, trimmed if need be at the two Pacific edges where
   none of his places lie; the three numbers sit in one row along its foot, over the southern sea, the
   countries largest. Pointing at a country (tapping it on a phone) shows its note, and after the ramp
   presses its stamp. ?still and reduced motion show the end at once; ?at=<ms> holds one moment. */
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
  const SEEK = query.has('at') ? Math.max(0, +query.get('at') || 0) : null;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const MASK = '#000'; // the stencil for shapes worked on off screen; never seen
  const RAD = Math.PI / 180;

  // this version's measures
  const LAY = {
    side: (w) => clamp(w * 0.011, 10, 22), top: 46, bottom: 6,
    keep: { l: 0.74, r: 0.92 }, // the least of each half of the map kept when the window is too narrow for all of it
    row: (s) => clamp(s * 0.4, 44, 150), rowMin: (s) => Math.max(30, s * 0.17), // the countries figure's type size
    seal: (w, h) => clamp(Math.min(w * 0.05, h * 0.1), 60, 84),
    phone: { row: (w) => clamp(w * 0.22, 54, 96), seal: (w) => clamp(w * 0.24, 80, 104) },
  };
  // the ramp's clock, in ms from the start
  const TIME = {
    lead: 1200,   // the plain atlas, held, before the first flight
    span: 8000,   // from the first flight leaving to the last
    swing: 0.3,   // how much slower the pace is at either end than in the middle
    draw: [150, 200], // one flight, drawn
    bleed: 800,   // a wash bleeding in
    photos: 450,  // the photographs figure climbing
    rest: 1000,   // a flight fading from its drawing strength to its resting one
  };
  const ROUTE = { drawing: 0.62, resting: 0.36 }; // the flights' strength: quiet while drawn, fainter at rest

  /* ------------------------------------------------------------ words */

  const T = {
    en: {
      arrived: 'Arrived', rail: 'By rail', road: 'By road',
      stamp: (name, date) => `${name}, ${date}`,
      sr: (a, b, c) => `${FP.w.where}: ${a}, ${b}, ${c}`,
    },
    zh: {
      arrived: '入境', rail: '火車入境', road: '陸路入境',
      stamp: (name, date) => `${name}，${date}`,
      sr: (a, b, c) => `${FP.w.where}：${a}，${b}，${c}`,
    },
  };
  const t = () => T[FP.lang];
  const caps = (s) => (FP.lang === 'zh' ? s : s.toUpperCase());
  // the oceans, lettered lightly where the sea is open: [lng, lat], and their names (as typeset has them)
  const SEAS = [
    { id: 'pacific', at: [-121, -7], en: ['PACIFIC', 'OCEAN'], zh: ['太平洋'] },
    { id: 'atlantic', at: [-40, 28], en: ['ATLANTIC', 'OCEAN'], zh: ['大西洋'] },
    { id: 'indian', at: [78, -20], en: ['INDIAN', 'OCEAN'], zh: ['印度洋'] },
  ];

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
  function deepInk(css) {
    const m = css.match(OKLCH);
    if (!m) return cssVar('--ink');
    return `oklch(37% ${clamp(+m[2] * 1.45, 0.09, 0.16).toFixed(3)} ${(+m[3]).toFixed(1)})`;
  }

  /* ------------------------------------------------------------ small tools */

  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const hash01 = (s) => hashStr(s) / 4294967296;
  function rand(n) { let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function hash2(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function noise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
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
  const easeOut = (u) => 1 - (1 - u) ** 3;
  const easePen = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u); // a pen starting and finishing a line

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
    // in the Tasman Sea, south of Tasmania: the corner below New Zealand is the stamp's
    'new-zealand': { at: [165.4, -47.6], a: 'end' },
  };
  const RANK = (c) => (c.home ? 0 : (PLACE[c.id] || {}).size === 'l' ? 1 : (PLACE[c.id] || {}).size === 's' ? 3 : 2);

  /* ------------------------------------------------------------ the stamps (bolder's) */

  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));

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

  const SHAPES = ['ring', 'rect', 'oval', 'octagon', 'round', 'hex'];
  const visitKey = (c) => `${c.journeys[0]}|${String(journeyById.get(c.journeys[0]).countries.indexOf(c.id)).padStart(2, '0')}`;
  const ORDER = FP.abroad.slice().sort((a, b) => visitKey(a).localeCompare(visitKey(b)))
    .map((c, i) => ({ c, i, ...entryOf(c), rot: (hash01(c.id) - 0.5) * 10, shape: SHAPES[i % SHAPES.length], filter: i % 5 }));
  const homeFlight = FP.flights.find((f) => FP.km([f.from.lat, f.from.lng], FP.home.ll) < 60);
  const HOME = { c: FP.home, home: true, code: homeFlight ? homeFlight.from.code : '', rot: -4, shape: 'ring', filter: 1 };
  const stampOf = new Map([...ORDER.map((st) => [st.c.id, st]), [FP.home.id, HOME]]);

  const FILTERS = 5;
  const defsSvg = el('svg', { class: 'os-defs', 'aria-hidden': 'true', width: 0, height: 0 });
  const inkDefs = el('defs', {}, defsSvg);
  for (let i = 0; i < FILTERS; i++) {
    const f = el('filter', { id: `os-ink-${i}`, x: '-12%', y: '-12%', width: '124%', height: '124%', 'color-interpolation-filters': 'sRGB' }, inkDefs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.7', numOctaves: '2', seed: String(3 + i * 7), result: 'fine' }, f);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: String(41 + i * 13), result: 'blot' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'fine', scale: '0.6', xChannelSelector: 'R', yChannelSelector: 'G', result: 'rough' }, f);
    // a small stamp read up close: the ink thins in patches but never breaks a letter
    el('feColorMatrix', { in: 'fine', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  8 0 0 0 -1', result: 'speck' }, f);
    el('feColorMatrix', { in: 'blot', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.4 0 0 0 0.34', result: 'patch' }, f);
    el('feComposite', { in: 'speck', in2: 'patch', operator: 'arithmetic', k1: '1', k2: '0', k3: '0', k4: '0', result: 'cover' }, f);
    el('feComposite', { in: 'rough', in2: 'cover', operator: 'in' }, f);
  }
  body.appendChild(defsSvg);

  function fit(tx, max) {
    const len = tx.getComputedTextLength();
    if (len > max) tx.setAttribute('font-size', (parseFloat(tx.getAttribute('font-size')) * (max / len)).toFixed(2));
    return tx;
  }
  function text(g, cls, str, x, y, size, max) {
    const tx = el('text', { class: cls, x, y, 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
    tx.textContent = str;
    return max ? fit(tx, max) : tx;
  }
  let arcN = 0, arcDefs = null;
  function arcText(g, cls, str, r, top, size, maxAngle) {
    const id = `os-arc-${arcN++}`;
    el('path', { id, d: top ? `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0` : `M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0`, fill: 'none' }, arcDefs);
    const tx = el('text', { class: cls, 'font-size': size, 'dominant-baseline': 'central' }, g);
    const tp = el('textPath', { href: `#${id}`, startOffset: '50%', 'text-anchor': 'middle' }, tx);
    tp.textContent = str;
    return fit(tx, r * maxAngle);
  }
  const poly = (n, r, turn = 0) => Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');

  function wordsOf(st) {
    if (st.home) return { name: caps(st.c.country[FP.lang]), big: caps(FP.w.home), date: st.code, mark: '' };
    const year = String(st.c.first);
    const date = caps(st.j.date[FP.lang]);
    const mark = st.via === 'rail' ? t().rail : st.via === 'road' ? t().road : t().arrived;
    if (st.code) return { name: caps(st.c.country[FP.lang]), big: st.code, date, mark: caps(t().arrived) };
    return { name: caps(st.c.country[FP.lang]), big: year, date: caps(mark), mark: '' };
  }

  const DRAW = {
    ring(g, S, w) {
      const R = S / 2, ri = R * 0.66, rm = (R + ri) / 2 - S * 0.005;
      el('circle', { class: 'st-edge', r: R - S * 0.017 }, g);
      el('circle', { class: 'st-line', r: ri }, g);
      arcText(g, 'st-name', w.name, rm, true, S * 0.105, 2.35);
      arcText(g, 'st-date', w.date, rm, false, S * 0.088, 2.2);
      el('circle', { class: 'st-fill', cx: -rm, cy: 0, r: S * 0.016 }, g);
      el('circle', { class: 'st-fill', cx: rm, cy: 0, r: S * 0.016 }, g);
      if (w.mark) text(g, 'st-mark', w.mark, 0, -ri * 0.48, S * 0.068, ri * 1.3);
      text(g, 'st-big', w.big, 0, w.mark ? ri * 0.16 : 0, S * (w.big.length > 3 ? 0.2 : 0.25), ri * 1.6);
    },
    rect(g, S, w) {
      const W = S * 1.34, H = S * 0.84, i = S * 0.065;
      el('rect', { class: 'st-edge', x: -W / 2, y: -H / 2, width: W, height: H }, g);
      el('rect', { class: 'st-line', x: -W / 2 + i, y: -H / 2 + i, width: W - 2 * i, height: H - 2 * i }, g);
      text(g, 'st-name', w.name, 0, -H * 0.27, S * 0.105, W - 4 * i);
      el('line', { class: 'st-line', x1: -W / 2 + i, x2: W / 2 - i, y1: -H * 0.12, y2: -H * 0.12 }, g);
      text(g, 'st-big', w.big, 0, H * 0.08, S * 0.24, W - 4 * i);
      text(g, 'st-date', w.date, 0, H * 0.3, S * 0.084, W - 4 * i);
    },
    oval(g, S, w) {
      const rx = S * 0.68, ry = S * 0.45;
      el('ellipse', { class: 'st-edge', rx, ry }, g);
      el('ellipse', { class: 'st-line', rx: rx - S * 0.075, ry: ry - S * 0.075 }, g);
      text(g, 'st-name', w.name, 0, -ry * 0.48, S * 0.098, rx * 1.15);
      text(g, 'st-big', w.big, 0, ry * 0.06, S * 0.21, rx * 1.3);
      text(g, 'st-date', w.date, 0, ry * 0.5, S * 0.08, rx * 1.05);
    },
    octagon(g, S, w) {
      const R = S * 0.54;
      el('polygon', { class: 'st-edge', points: poly(8, R, Math.PI / 8) }, g);
      el('polygon', { class: 'st-line', points: poly(8, R * 0.85, Math.PI / 8) }, g);
      if (w.mark) text(g, 'st-mark', w.mark, 0, -R * 0.5, S * 0.064, R * 1.1);
      text(g, 'st-name', w.name, 0, w.mark ? -R * 0.25 : -R * 0.34, S * 0.098, R * 1.5);
      text(g, 'st-big', w.big, 0, R * 0.1, S * 0.2, R * 1.4);
      text(g, 'st-date', w.date, 0, R * 0.44, S * 0.078, R * 1.25);
    },
    round(g, S, w) {
      const W = S * 1.16, H = S * 0.92, rr = S * 0.15;
      el('rect', { class: 'st-edge', x: -W / 2, y: -H / 2, width: W, height: H, rx: rr }, g);
      el('line', { class: 'st-line', x1: -W / 2 + S * 0.04, x2: W / 2 - S * 0.04, y1: -H * 0.14, y2: -H * 0.14 }, g);
      el('line', { class: 'st-line', x1: -W / 2 + S * 0.04, x2: W / 2 - S * 0.04, y1: H * 0.24, y2: H * 0.24 }, g);
      text(g, 'st-name', w.name, 0, -H * 0.32, S * 0.1, W - S * 0.16);
      text(g, 'st-big', w.big, 0, H * 0.05, S * 0.23, W - S * 0.2);
      text(g, 'st-date', w.date, 0, H * 0.37, S * 0.08, W - S * 0.2);
    },
    hex(g, S, w) {
      const R = S * 0.6;
      el('polygon', { class: 'st-edge', points: poly(6, R) }, g);
      el('polygon', { class: 'st-line', points: poly(6, R * 0.84) }, g);
      text(g, 'st-name', w.name, 0, -R * 0.36, S * 0.096, R * 1.15);
      text(g, 'st-big', w.big, 0, R * 0.05, S * 0.21, R * 1.3);
      text(g, 'st-date', w.date, 0, R * 0.42, S * 0.076, R * 1.0);
    },
  };

  /* ------------------------------------------------------------ the record, flight by flight */

  // every leg of every trip, oldest first: each flight is a beat; so is a country first reached by rail
  // or road, and a country on a trip with no legs recorded. FP.flights is in this same order.
  const countryAt = (p) => { const pl = placeByCity.get(p.city); return pl ? pl.country : null; }; // null: home
  const BEATS = [];
  {
    const seen = new Set();
    let fi = 0;
    for (const step of FP.ramp) {
      const j = journeyById.get(step.journey);
      const fresh = new Set(step.fresh.map((c) => c.id));
      const reach = (id) => (id && fresh.has(id) && !seen.has(id) ? (seen.add(id), id) : null);
      for (const l of j.legs) {
        const to = countryAt(l.to);
        if (l.mode === 'flight') {
          const f = FP.flights[fi++];
          BEATS.push({ j, f, fresh: reach(to) });
        } else {
          const id = reach(to);
          if (id) BEATS.push({ j, f: null, fresh: id });
        }
      }
      step.fresh.forEach((c) => { const id = reach(c.id); if (id) BEATS.push({ j, f: null, fresh: id }); });
    }
    BEATS.forEach((b) => { b.photos = b.fresh ? FP.byId.get(b.fresh).photos : 0; });
    // the totals must come out as the page's numbers do
    const end = FP.ramp[FP.ramp.length - 1];
    const sum = { c: BEATS.filter((b) => b.fresh).length, f: BEATS.filter((b) => b.f).length, p: FP.home.photos + BEATS.reduce((n, b) => n + b.photos, 0) };
    if (fi !== FP.flights.length || sum.c !== end.countries || sum.f !== end.flightsSoFar || sum.p !== end.photos) {
      console.warn('ramp-flights: the beats do not add up to the record', sum, end);
    }
  }
  // when each beat begins and lands: the pace eases in and out, slower at either end
  {
    const n = BEATS.length;
    const at = (x) => TIME.lead + TIME.span * (x + (TIME.swing * Math.sin(2 * Math.PI * x)) / (2 * Math.PI));
    BEATS.forEach((b, i) => { b.start = at(n > 1 ? i / (n - 1) : 0); });
    BEATS.forEach((b, i) => {
      const gap = i < n - 1 ? BEATS[i + 1].start - b.start : b.start - BEATS[i - 1].start;
      b.dur = clamp(gap * 1.1, TIME.draw[0], TIME.draw[1]);
      b.land = b.start + (b.f ? b.dur : TIME.draw[0]);
    });
  }
  const landOf = new Map(BEATS.filter((b) => b.fresh).map((b) => [b.fresh, b.land]));
  const END = BEATS[BEATS.length - 1].land + Math.max(TIME.bleed, TIME.photos) + 150;
  const FINAL = { countries: FP.counts.countries, flights: FP.counts.flights, photos: FP.counts.photos };

  /* ------------------------------------------------------------ the page */

  const sheet = document.createElement('div'); sheet.className = 'tn-sheet';
  const sea = document.createElement('canvas'); sea.className = 'tn-sea';
  const washBox = document.createElement('div'); washBox.className = 'rf-washes';
  const deeps = [0, 1].map(() => { const c = document.createElement('canvas'); c.className = 'os-deep'; return c; });
  const routesSvg = el('svg', { class: 'rf-routes', 'aria-hidden': 'true' });
  const rings = el('svg', { class: 'os-rings', 'aria-hidden': 'true' });
  const ink = el('svg', { class: 'tn-ink', 'aria-hidden': 'true' });
  sheet.append(sea, washBox, ...deeps, routesSvg, rings, ink);

  const title = document.createElement('h1'); title.className = 'rf-sr';
  const row = document.createElement('div');
  row.className = 'rf-row';
  row.setAttribute('aria-hidden', 'true');
  const KINDS = ['countries', 'flights', 'photos'];
  row.innerHTML = KINDS.map((k2) => `<div class="rf-item rf-item--${k2}"><span class="rf-n"></span><span class="rf-w"></span></div>`).join('');
  const items = KINDS.map((k2) => { const it = row.querySelector(`.rf-item--${k2}`); return { k: k2, it, n: it.querySelector('.rf-n'), w: it.querySelector('.rf-w'), shown: null }; });

  const seal = document.createElement('div');
  seal.className = 'os-seal';
  seal.innerHTML = '<div class="os-seal__spot" role="img"></div>';
  const spot = seal.querySelector('.os-seal__spot');

  const room = document.createElement('div'); room.className = 'os-room';
  stage.append(title, sheet, row, seal, room);
  stage.setAttribute('aria-label', FP.w.where);

  let W = 0, H = 0, narrow = false, G = null;
  let proj = null, path = null, frame = null, k = 1;
  let atlas = null, landRaster = null, washes = [], routes = [];
  const tones = new Map();
  let started = false;

  /* ------------------------------------------------------------ the three numbers */

  const wordFor = (k2, n) => (k2 === 'countries' ? FP.w.countries(n) : k2 === 'flights' ? FP.w.flights(n) : FP.w.photos(n));
  function setNum(i, n) {
    const it = items[i];
    if (it.shown === n) return;
    it.shown = n;
    it.n.textContent = FP.fmt(n);
    it.w.textContent = wordFor(it.k, n);
  }
  function words() {
    const lang = FP.lang;
    const say = (k2) => (lang === 'zh' ? `${FP.fmt(FINAL[k2])} ${wordFor(k2, FINAL[k2])}` : `${FP.fmt(FINAL[k2])} ${wordFor(k2, FINAL[k2])}`);
    title.textContent = t().sr(say('countries'), say('flights'), say('photos'));
  }

  /* ------------------------------------------------------------ the colourist's choice (bolder's) */

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
    ORDER.forEach((st) => { st.ink = deepInk(tones.get(st.c.id).css); });
    HOME.ink = cssVar('--route');
  }

  /* ------------------------------------------------------------ the frame */

  const SOUTH = -60; // the old atlases stop here
  const UNIT = d3.geoEqualEarth().scale(1).translate([0, 0]);
  const RAW = d3.geoEqualEarthRaw;
  const XR = UNIT([179.9999, 0])[0], YT = UNIT([0, 90])[1], YB = UNIT([0, SOUTH])[1];
  const MW = 2 * XR, MH = YB - YT;

  // the land at a fixed scale, as a table that counts at once how much land a rectangle on the screen covers
  function buildLandRaster(land) {
    const R = 170;
    const w = Math.ceil(MW * R) + 2, h = Math.ceil(MH * R) + 2;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const p = d3.geoEqualEarth().scale(R).translate([XR * R + 1, -YT * R + 1]);
    ctx.fillStyle = MASK; ctx.beginPath(); d3.geoPath(p, ctx)(land); ctx.fill();
    const d = ctx.getImageData(0, 0, w, h).data;
    const sat = new Int32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let rowSum = 0;
      for (let x = 0; x < w; x++) {
        rowSum += d[(y * w + x) * 4 + 3] > 40 ? 1 : 0;
        sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + rowSum;
      }
    }
    landRaster = { R, w, h, sat };
  }
  function landIn(r, s, ox, oy, m) { // the land under a rectangle, in cells of the table
    const { R, w, h, sat } = landRaster;
    const q = R / s;
    const x0 = clamp(Math.floor((r.x - m - ox) * q + XR * R + 1), 0, w), x1 = clamp(Math.ceil((r.x + r.w + m - ox) * q + XR * R + 1), 0, w);
    const y0 = clamp(Math.floor((r.y - m - oy) * q - YT * R + 1), 0, h), y1 = clamp(Math.ceil((r.y + r.h + m - oy) * q - YT * R + 1), 0, h);
    if (x1 <= x0 || y1 <= y0) return 0;
    const W1 = w + 1;
    return sat[y1 * W1 + x1] - sat[y0 * W1 + x1] - sat[y1 * W1 + x0] + sat[y0 * W1 + x0];
  }
  const ISLE = 14; // a speck of an island the numbers may sit over (Kerguelen, South Georgia): rubbed out under them

  // the figures' own height: a capital O stands as tall and dips as low as the lining figures
  const meas = document.createElement('canvas').getContext('2d');
  function inkOf(F) {
    meas.font = `400 ${F}px "Playfair Display"`;
    const m = meas.measureText('O');
    const fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
    if (!(fa > 0)) return { top: F * 0.19, bot: F * 0.07 };
    const base = (F - (fa + fd)) / 2 + fa;
    return { top: base - m.actualBoundingBoxAscent, bot: F - (base + m.actualBoundingBoxDescent) };
  }

  // the row at type size F: each figure as wide as its final value, each word as wide as its widest form,
  // so nothing in the row moves while it counts. Its parts, for keeping clear of the land.
  function setRow(F, stack) {
    const ik = inkOf(F);
    row.style.setProperty('--f', `${F.toFixed(1)}px`);
    row.style.setProperty('--n-top', `${ik.top.toFixed(1)}px`);
    row.style.setProperty('--n-bot', `${ik.bot.toFixed(1)}px`);
    row.classList.toggle('is-stack', stack);
    items.forEach((it, i) => {
      const n = FINAL[KINDS[i]];
      it.it.style.removeProperty('--nw'); it.it.style.removeProperty('--ww');
      it.n.textContent = FP.fmt(n);
      const nw = it.n.getBoundingClientRect().width;
      let ww = 0;
      [1, n].forEach((v) => { it.w.textContent = wordFor(it.k, v); ww = Math.max(ww, it.w.getBoundingClientRect().width); });
      it.it.style.setProperty('--nw', `${Math.ceil(nw)}px`);
      it.it.style.setProperty('--ww', `${Math.ceil(ww)}px`);
      it.shown = null;
    });
    const r = row.getBoundingClientRect();
    const parts = items.map((it) => { const b = it.it.getBoundingClientRect(); return { dx: b.left - r.left, dy: b.top - r.top, w: b.width, h: b.height }; });
    return { w: r.width, h: r.height, parts };
  }
  function setSeal(S) {
    const vw = Math.round(S * 1.5), vh = Math.round(S * 1.16);
    seal.style.setProperty('--sw', `${vw}px`);
    seal.style.setProperty('--sh', `${vh}px`);
    return { S, vw, vh, w: vw, h: vh };
  }
  const at = (box, x, y) => ({ x, y, w: box.w, h: box.h, parts: (box.parts || [{ dx: 0, dy: 0, w: box.w, h: box.h }]).map((p) => ({ x: x + p.dx, y: y + p.dy, w: p.w, h: p.h })) });

  // the labels that must keep their place, as boxes on the screen for a map at scale s about (ox, oy)
  const FONT = {
    en: { m: [8.6, 10.5, 0.16], l: [10, 13, 0.24], dx: 0.45 },
    zh: { m: [9.6, 11, 0.1], l: [10.4, 13.5, 0.5], dx: 0.3 },
  };
  const keep = {};
  function keepers() {
    const lang = FP.lang;
    if (keep[lang]) return keep[lang];
    const fam = '"Playfair Display", "Noto Serif TC", serif';
    keep[lang] = [FP.home, ...FP.abroad].filter((c) => RANK(c) <= 2 && PLACE[c.id] && !PLACE[c.id].wrap && !PLACE[c.id].stack && !PLACE[c.id].group).map((c) => {
      const p = PLACE[c.id], size = p.size === 'l' ? 'l' : 'm', [min, base, ls] = FONT[lang][size];
      const name = c.home ? c.name[lang] : c.country[lang], cap = lang === 'zh' ? name : name.toUpperCase();
      const year = c.home ? FP.w.home : String(c.first);
      meas.font = `400 100px ${fam}`;
      const wn = meas.measureText(cap).width + ls * 100 * [...cap].length;
      meas.font = `400 82px ${fam}`;
      const wy = meas.measureText(year).width + 0.04 * 82 * [...year].length;
      return { u: UNIT(p.at), a: p.a, min, base, per: (wn + FONT[lang].dx * 100 + wy) / 100 };
    });
    return keep[lang];
  }
  function labelsIn(r, s, ox, oy) {
    const kk = clamp(s / 251, 0.62, 1.2);
    return keepers().some((q) => {
      const fs = Math.max(q.min, q.base * kk), w = q.per * fs;
      const x = ox + q.u[0] * s, y = oy + q.u[1] * s;
      const box = { x: q.a === 'start' ? x : q.a === 'end' ? x - w : x - w / 2, y: y - 0.8 * fs, w, h: 1.05 * fs };
      return overlap(box, r, 12);
    });
  }

  // the map as large as the room allows; when the window is too narrow for the whole world, it is trimmed
  // at the two Pacific edges, the open ocean west of the Americas first (nothing of his lies there)
  function sheetIn(w, top, bottom, side, availH) {
    const availW = w - 2 * side;
    const s = Math.min(availH / MH, availW / ((LAY.keep.l + LAY.keep.r) * XR));
    const full = 2 * XR * s;
    let ox, x0, x1;
    if (full <= availW) { ox = w / 2; x0 = ox - XR * s; x1 = ox + XR * s; }
    else {
      const o = full - availW;
      const cutL = Math.min(o, (1 - LAY.keep.l) * XR * s);
      x0 = side; x1 = w - side; ox = side - cutL + XR * s;
    }
    const oy = top + (Number.isFinite(availH) ? Math.max(0, (availH - MH * s) / 2) : 0) - YT * s;
    return { s, ox, oy, x0, x1, mapTop: oy + YT * s, mapBottom: oy + YB * s };
  }
  // is a point on the screen inside the plate?
  function inPlate(L, x, y) {
    if (x < L.x0 || x > L.x1 || y > L.mapBottom || y < L.mapTop) return false;
    const p = RAW.invert((x - L.ox) / L.s, (L.oy - y) / L.s);
    return p && Math.abs(p[0]) <= Math.PI + 1e-6;
  }

  function solve() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 640) return solveNarrow(w, h);
    const side = LAY.side(w), top = LAY.top, bottom = LAY.bottom;
    const L = sheetIn(w, top, bottom, side, h - top - bottom);
    const { s, ox, oy } = L;

    // the row first: the largest that sits over the southern sea, inside the plate, clear of the land
    // (a speck of an island aside) and of the names
    const pref = { x: (L.ox + UNIT([-48, -52])[0] * s + L.ox + UNIT([128, -52])[0] * s) / 2, y: L.mapBottom - 0.05 * s };
    let best = null;
    for (let F = LAY.row(s); F >= LAY.rowMin(s) && !best; F *= 0.95) {
      const rb = setRow(F, false);
      const m = Math.max(10, F * 0.08);
      let pick = null, pd = Infinity;
      const yLow = L.mapBottom - Math.max(6, 0.02 * s);
      for (let yb = yLow; yb >= L.mapBottom - 0.26 * s; yb -= 4) {
        for (let x = L.x0 + 6; x + rb.w <= L.x1 - 6; x += 6) {
          const cr = at(rb, x, yb - rb.h);
          const d = Math.abs(x + rb.w / 2 - pref.x) + 2.2 * Math.abs(yb - pref.y);
          if (d >= pd) continue;
          if (!inPlate(L, cr.x, yb - 1) || !inPlate(L, cr.x + cr.w, yb - 1)) continue;
          if (cr.parts.some((p) => landIn(p, s, ox, oy, m) > ISLE)) continue;
          if (cr.parts.some((p) => labelsIn(p, s, ox, oy))) continue;
          pd = d; pick = cr;
        }
      }
      if (pick) best = { F, cr: pick, rb };
    }
    if (!best) { // nothing clears: the smallest row, under the middle of the map
      const F = LAY.rowMin(s), rb = setRow(F, false);
      best = { F, rb, cr: at(rb, clamp(pref.x - rb.w / 2, side, w - side - rb.w), L.mapBottom - 6 - rb.h) };
    }

    // then the stamp: small, as far into the lower right corner as the land, the names and the row allow
    const sb = setSeal(Math.round(LAY.seal(w, h)));
    let sr = null, sd = Infinity;
    for (let dx = 0; dx <= w * 0.5; dx += 6) {
      for (let dy = 0; dy <= h * 0.6; dy += 6) {
        const d = dx + dy * 1.6;
        if (d >= sd) continue;
        const r = { x: w - side - sb.w - dx, y: h - bottom - sb.h - dy, w: sb.w, h: sb.h };
        if (best.cr.parts.some((p) => overlap(p, r, 24))) continue;
        if (landIn(r, s, ox, oy, 6) > ISLE || labelsIn(r, s, ox, oy)) continue;
        sd = d; sr = r;
      }
    }
    if (!sr) sr = { x: w - side - sb.w, y: h - bottom - sb.h, w: sb.w, h: sb.h };
    return { w, h, ...L, F: best.F, stack: false, cr: best.cr, sr, sb };
  }

  // a phone: the map across the top, then the three numbers, then the stamp
  function solveNarrow(w, h) {
    const side = 8, top = 64, edge = 16;
    const L = sheetIn(w, top, 0, side, Infinity);
    const F = LAY.phone.row(w);
    let rb = setRow(F, true);
    let FF = F;
    for (let i = 0; i < 12 && rb.w > w - 2 * edge; i++) { FF *= 0.93; rb = setRow(FF, true); }
    const sb = setSeal(Math.round(LAY.phone.seal(w)));
    // the three in one block, set above the middle of the screen when it is taller than they are
    const tall = (L.mapBottom - L.mapTop) + 40 + rb.h + 34 + sb.h;
    const lift = Math.max(0, (h - top - 24 - tall) * 0.3);
    L.oy += lift; L.mapTop += lift; L.mapBottom += lift;
    const cr = at(rb, edge, L.mapBottom + 40);
    const sr = { x: w - edge - sb.w, y: cr.y + cr.h + 34, w: sb.w, h: sb.h };
    return { w, h, ...L, narrow: true, F: FF, stack: true, cr, sr, sb, room: sr.y + sr.h + 24 };
  }

  /* ------------------------------------------------------------ the sea: graticule, water-lining, neatline */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else ctx.rect(x, y, w, h);
  }
  // the paper left clear under the numbers and the stamp: the engraving fades out round them
  function clearings() {
    if (narrow) return [];
    // the row as one piece, so no speck of an island is left between its figures
    const ps = G.cr.parts, x0 = Math.min(...ps.map((p) => p.x)), y0 = Math.min(...ps.map((p) => p.y));
    const x1 = Math.max(...ps.map((p) => p.x + p.w)), y1 = Math.max(...ps.map((p) => p.y + p.h));
    const out = [{ x: x0, y: y0, w: x1 - x0, h: y1 - y0, pad: G.F * 0.04, soft: G.F * 0.09 }];
    if (inPlate(G, G.sr.x, G.sr.y) || inPlate(G, G.sr.x + G.sr.w, G.sr.y) || inPlate(G, G.sr.x, G.sr.y + G.sr.h)) out.push({ ...G.sr, pad: 2, soft: 16 });
    return out;
  }
  // a ring of points clipped to the band x0..x1 (the trimmed sides cut straight)
  function clipX(pts, xmin, xmax) {
    const edge = (list, inside, cut) => {
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const p = list[i], q = list[(i + 1) % list.length];
        const pi = inside(p), qi = inside(q);
        if (pi) out.push(p);
        if (pi !== qi) out.push(cut(p, q));
      }
      return out;
    };
    const cutAt = (X) => (p, q) => [X, p[1] + ((q[1] - p[1]) * (X - p[0])) / (q[0] - p[0])];
    return edge(edge(pts, (p) => p[0] >= xmin, cutAt(xmin)), (p) => p[0] <= xmax, cutAt(xmax));
  }

  function drawSea() {
    const L = G;
    sea.width = Math.round(W * DPR); sea.height = Math.round(H * DPR);
    const ctx = sea.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const water = cssVar('--tn-water'), inkC = cssVar('--ink');
    const framePath = new Path2D(frame);

    ctx.save();
    ctx.clip(framePath);
    const gpath = d3.geoPath(proj, ctx);
    ctx.strokeStyle = inkC; ctx.lineWidth = 0.4;
    ctx.globalAlpha = 0.13;
    ctx.beginPath(); gpath(d3.geoGraticule().step([15, 15]).extentMinor([[-180, SOUTH - 1], [180, 90]])()); ctx.stroke();
    ctx.globalAlpha = 0.26;
    ctx.beginPath(); gpath({ type: 'LineString', coordinates: d3.range(-180, 181, 2).map((x) => [x, 0]) }); ctx.stroke();

    // the water-lining, measured on the screen as the engraver measured his plate (bolder's)
    const g = narrow ? 1 : 1.25;
    const pad = 6;
    const x0 = L.x0 - pad * g, y0 = L.mapTop - pad * g;
    const gw = Math.ceil((L.x1 - L.x0) / g) + 2 * pad, gh = Math.ceil((L.mapBottom - L.mapTop) / g) + 2 * pad;
    const mask = document.createElement('canvas'); mask.width = gw; mask.height = gh;
    const mc = mask.getContext('2d', { willReadFrequently: true });
    mc.setTransform(1 / g, 0, 0, 1 / g, -x0 / g, -y0 / g);
    const free = d3.geoEqualEarth().scale(L.s).translate([L.ox, L.oy]).precision(0.15);
    mc.beginPath(); d3.geoPath(free, mc)(atlas.land); mc.fillStyle = MASK; mc.fill();
    const md = mc.getImageData(0, 0, gw, gh).data;
    const field = new Float64Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) field[i] = md[i * 4 + 3] > 110 ? 0 : INF;
    edt(field, gw, gh);
    for (let i = 0; i < gw * gh; i++) field[i] = Math.sqrt(field[i]) * g;
    const sp = clamp(L.s / 251, 0.62, 1.15);
    const lines = narrow ? 7 : 12;
    const th = d3.range(lines).map((i) => (1.7 + 2.35 * i + 0.16 * i * i) * sp);
    const contours = d3.contours().size([gw, gh]).thresholds(th)(field);
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
      lc.globalAlpha = 0.6 * Math.pow(1 - i / lines, 1.4);
      lc.beginPath(); cpath(c); lc.stroke();
    });
    lc.globalAlpha = 1; lc.globalCompositeOperation = 'destination-in';
    lc.imageSmoothingEnabled = true;
    lc.drawImage(fade, 0, 0, gw, gh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(lay, 0, 0);
    ctx.restore();

    // the clearings: rings of rubbing out, wider and fainter outwards, so the lines thin away
    const cl = clearings();
    if (cl.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const N = 14;
      for (let i = 0; i < N; i++) {
        ctx.globalAlpha = 0.28;
        cl.forEach((r) => {
          const grow = r.pad + r.soft * (1 - i / (N - 1));
          roundRect(ctx, r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow, grow);
          ctx.fill();
        });
      }
      ctx.restore();
    }
    // the neatline, after the rubbing out so the frame stays whole: a heavy rule outside, a fine one on
    // the edge of the map, cut straight where trimmed
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1; ctx.strokeStyle = inkC;
    ctx.lineWidth = 0.6; ctx.stroke(framePath);
    const gap = narrow ? 2.5 : 3.5 * k;
    const sx = (XR * L.s + gap) / (XR * L.s), syT = (-YT * L.s + gap) / (-YT * L.s), syB = (YB * L.s + gap) / (YB * L.s);
    const ring = [];
    for (let lat = 90; lat >= SOUTH; lat -= 1) ring.push(free([180, lat]));
    for (let lat = SOUTH; lat <= 90; lat += 1) ring.push(free([-180, lat]));
    const grown = ring.map(([x, y]) => { const dy = y - L.oy; return [L.ox + (x - L.ox) * sx, L.oy + dy * (dy < 0 ? syT : syB)]; });
    const cut = clipX(grown, L.x0 - gap, L.x1 + gap);
    ctx.beginPath();
    cut.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.lineWidth = narrow ? 1.3 : 2.2; ctx.stroke();
  }

  /* ------------------------------------------------------------ the ink: coasts, borders, lettering */

  let labelLayer = null, hitLayer = null, seaNames = [];
  function drawInk() {
    ink.replaceChildren();
    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    ink.setAttribute('width', W); ink.setAttribute('height', H);
    const defs = el('defs', {}, ink);
    let d = frame;
    const rr = (x, y, w, h, r) => `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
    d += clearings().map((c) => { const p = c.pad + c.soft * 0.35; return rr(c.x - p, c.y - p, c.w + 2 * p, c.h + 2 * p, Math.min(p, (c.w + 2 * p) / 2, (c.h + 2 * p) / 2)); }).join('');
    const clip = el('clipPath', { id: 'rf-frame' }, defs);
    el('path', { d, 'clip-rule': 'evenodd' }, clip);
    const g = el('g', { 'clip-path': 'url(#rf-frame)' }, ink);
    el('path', { class: 'tn-border', d: path(atlas.borders) }, g);
    el('path', { class: 'tn-coast', d: path(atlas.land) }, g);
    washes.filter((w) => w.dab).forEach((w) => el('circle', { class: 'tn-dot', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] }, g));
    rings.replaceChildren();
    rings.setAttribute('viewBox', `0 0 ${W} ${H}`);
    rings.setAttribute('width', W); rings.setAttribute('height', H);
    washes.filter((w) => w.small).forEach((w) => {
      const r = el('circle', { class: 'os-ring', cx: w.at[0].toFixed(1), cy: w.at[1].toFixed(1), r: w.small.toFixed(1) }, rings);
      r.dataset.ring = w.c.id;
    });
    hitLayer = el('g', {}, ink);
    labelLayer = el('g', {}, ink);
    washes.forEach((w) => {
      const h = w.dab ? el('circle', { class: 'tn-hit', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] + 6 }, hitLayer)
        : el('path', { class: 'tn-hit', d: path(w.feature) }, hitLayer);
      h.dataset.id = w.c.id;
    });
  }

  function drawLabels() {
    if (!labelLayer) return;
    labelLayer.replaceChildren();
    seaNames = [];
    if (narrow) return;
    const lang = FP.lang, names = FP.names();
    const bare = G.s / 251 < 0.72;
    const spot2 = settle();
    seaNames = SEAS.map((s0) => {
      const [x, y] = proj(s0.at);
      const tx = el('text', { class: 'tn-ocean', x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle' }, labelLayer);
      s0[lang].forEach((line, i) => { el('tspan', { x: x.toFixed(1), dy: i ? '1.5em' : '0' }, tx).textContent = line; });
      return tx;
    });
    washes.forEach((w) => {
      const c = w.c, nm = names[c.iso];
      const p = PLACE[c.id] || { at: nm ? nm.at : [c.ll[1], c.ll[0]], a: 'middle', inside: true };
      const [x, y] = spot2.get(c.id) || proj(p.at);
      const g = el('g', { class: 'tn-label' }, labelLayer);
      const tx = el('text', { class: 'tn-name tn-name--' + (p.size || 'm') + (p.inside ? '' : ' is-halo') + (c.home ? ' is-home' : ''), x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': p.a }, g);
      const name = c.home ? c.name[lang] : c.country[lang];
      const cap = lang === 'zh' ? name : name.toUpperCase();
      const year = c.home ? caps(FP.w.home) : String(c.first);
      if (p.wrap) {
        const words2 = lang === 'zh' ? [cap.slice(0, p.zhCut || 2), cap.slice(p.zhCut || 2)] : cap.split(' ');
        const cut = Math.ceil(words2.length / 2), sep = lang === 'zh' ? '' : ' ';
        el('tspan', { x: x.toFixed(1), dy: '0' }, tx).textContent = words2.slice(0, cut).join(sep);
        el('tspan', { x: x.toFixed(1), dy: '1.2em' }, tx).textContent = words2.slice(cut).join(sep);
      } else {
        tx.appendChild(document.createTextNode(cap));
      }
      if (bare && !c.home) { /* no year */ }
      else if (p.stack) el('tspan', { class: 'tn-year', x: x.toFixed(1), dy: '1.15em' }, tx).textContent = year;
      else el('tspan', { class: 'tn-year', dx: lang === 'zh' ? '0.3em' : '0.45em' }, tx).textContent = year;
      tx.dataset.id = c.id;
      w.label = g; w.text = tx;
      if (p.lead) {
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

  // Europe's crowded corner: the names in a group spaced evenly about the one that holds its place
  function settle() {
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

  // leave out the labels with no room: those that run into a larger one, the numbers or the stamp
  function cull() {
    const pad = 3 + 2.5 * clamp((1 - k) / 0.38, 0, 1);
    const few = k < 0.8;
    const taken = G.cr.parts.map((p) => ({ x: p.x - 6, y: p.y - 6, w: p.w + 12, h: p.h + 12 })).concat([G.sr]);
    const list = washes.filter((w) => w.label).sort((a, b) => (RANK(a.c) - RANK(b.c)) || (b.area - a.area));
    for (const w of list) {
      const b = w.text.getBBox();
      const box = { x: b.x, y: b.y, w: b.width, h: b.height };
      const end = w.leadAt ? { x: w.leadAt[0] - 2, y: w.leadAt[1] - 2, w: 4, h: 4 } : null;
      const out = b.x < G.x0 || b.x + b.width > G.x1;
      const hit = out || taken.some((o) => overlap(box, o, pad) || (end && overlap(end, o, 0)));
      if ((hit || (few && RANK(w.c) === 3)) && !w.c.home) { w.label.classList.add('is-cut'); continue; }
      taken.push(box);
    }
    seaNames.forEach((tx) => {
      const b = tx.getBBox();
      const out = b.x < G.x0 + 8 || b.x + b.width > G.x1 - 8;
      if (out || taken.some((o) => overlap({ x: b.x, y: b.y, w: b.width, h: b.height }, o, 8))) tx.classList.add('is-cut');
    });
  }

  /* ------------------------------------------------------------ the washes */

  // one sheet of wash per country (bolder's pigment): the shape a little off the line, the edge uneven,
  // pigment pooled along it, mottled in the middle, the paper's tooth showing through
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
    const size = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]);
    const pad = 4;
    const x0 = Math.floor(b[0][0] - pad), y0 = Math.floor(b[0][1] - pad);
    const x1 = Math.ceil(b[1][0] + pad), y1 = Math.ceil(b[1][1] + pad);
    const w = Math.max(2, Math.round((x1 - x0) * DPR)), h = Math.max(2, Math.round((y1 - y0) * DPR));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const off = [(rand(seed) - 0.5) * 2.2 * k, (rand(seed + 9) - 0.5) * 2.2 * k];
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
        sd *= lift;
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
    const ctr = dab ? [dab[0], dab[1]] : path.centroid(feature);
    const atPt = Number.isFinite(ctr[0]) ? ctr : proj([c.ll[1], c.ll[0]]);
    const small = !c.home && (dab || size < (narrow ? 24 : 14)) ? Math.max(6.5, size / 2 + 4) : 0;
    return { c, feature, cv, img, x0, y0, w: x1 - x0, h: y1 - y0, dab, area, at: atPt, small, label: null, text: null, el: null, state: null, arr: null };
  }

  function homeland(c) {
    const all = atlas.features.filter((f) => f.id === c.iso);
    if (!all.length) return null;
    const f = all.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
    if (f.geometry.type !== 'MultiPolygon') return f;
    const nm = FP.names()[c.iso];
    const p = proj(nm ? nm.at : [c.ll[1], c.ll[0]]);
    const polys = f.geometry.coordinates.map((coordinates) => ({ coordinates, a: d3.geoArea({ type: 'Polygon', coordinates }), c: path.centroid({ type: 'Polygon', coordinates }) }));
    const total = polys.reduce((s, q) => s + q.a, 0);
    const far = 0.2 * (2 * proj.scale() * XR);
    const keepIt = polys.filter((q) => q.a / total > 0.15 || Math.hypot(q.c[0] - p[0], q.c[1] - p[1]) < far);
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: keepIt.map((q) => q.coordinates) } };
  }

  // each country's wash on a small sheet of its own, so it can bleed in when a flight reaches it
  function layWashes() {
    washBox.replaceChildren();
    washes.forEach((w) => {
      const cv = document.createElement('canvas');
      cv.className = 'rf-wash is-waiting';
      cv.width = w.cv.width; cv.height = w.cv.height;
      cv.style.setProperty('--dx', `${w.x0}px`); cv.style.setProperty('--dy', `${w.y0}px`);
      cv.style.setProperty('--dw', `${w.w}px`); cv.style.setProperty('--dh', `${w.h}px`);
      w.el = cv;
      washBox.appendChild(cv);
    });
  }
  // the wash at u (0 to 1) of its bleeding in: the pigment reaches each part from the middle outward, the
  // front a little uneven (the same every time), a shade richer while wet; the colour its own throughout
  function bleedTo(w, u) {
    const cv = w.el;
    if (!cv) return;
    if (u <= 0) { if (w.state !== 'wait') { cv.classList.add('is-waiting'); w.state = 'wait'; } return; }
    if (u >= 1) {
      if (w.state !== 'full') { cv.getContext('2d').putImageData(w.img, 0, 0); cv.classList.remove('is-waiting'); w.state = 'full'; }
      return;
    }
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
      // only the pixels the wash covers are worked each frame (a country's box is mostly empty paper)
      let n = 0;
      for (let i = 0; i < N; i++) if (arr[i] >= 0) n++;
      w.idx = new Int32Array(n);
      for (let i = 0, j = 0; i < N; i++) if (arr[i] >= 0) w.idx[j++] = i;
      w.out = cv.getContext('2d').createImageData(W2, H2);
      const dst0 = w.out.data;
      for (let i = 0; i < N * 4; i += 4) { dst0[i] = src[i]; dst0[i + 1] = src[i + 1]; dst0[i + 2] = src[i + 2]; }
    }
    const arr = w.arr, idx = w.idx, dst = w.out.data;
    const soft = 0.18;
    const p = easeOut(u);
    const front = p * (1 + soft), wet = 1 - u;
    for (let j = 0; j < idx.length; j++) {
      const i = idx[j], a = arr[i];
      const k2 = clamp((front - a) / soft, 0, 1);
      dst[i * 4 + 3] = Math.min(255, src[i * 4 + 3] * k2 * (1 + 1.3 * k2 * (1 - k2) * wet));
    }
    cv.getContext('2d').putImageData(w.out, 0, 0);
    w.state = u;
  }

  /* ------------------------------------------------------------ the flights */

  // a flight's line: the great circle from where it left to where it landed, bowed a little to the left
  // of its way (so a flight out and the flight back lie side by side), as many points as it needs
  const vec = ([lng, lat]) => [Math.cos(lat * RAD) * Math.cos(lng * RAD), Math.cos(lat * RAD) * Math.sin(lng * RAD), Math.sin(lat * RAD)];
  const lngLat = ([x, y, z]) => [Math.atan2(y, x) / RAD, Math.asin(clamp(z, -1, 1)) / RAD];
  function routeLine(f) {
    const A = vec([f.from.lng, f.from.lat]), B = vec([f.to.lng, f.to.lat]);
    const cos = clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1), ang = Math.acos(cos);
    let N = [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
    const nl = Math.hypot(...N);
    N = nl > 1e-9 ? N.map((v) => v / nl) : [0, 0, 1];
    const bow = Math.min(ang * 0.11, 3.2 * RAD);
    const n = Math.max(8, Math.ceil(ang / (1.2 * RAD)));
    const coords = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const sa = Math.sin(ang) || 1;
      const a1 = ang > 1e-9 ? Math.sin((1 - u) * ang) / sa : 1 - u, b1 = ang > 1e-9 ? Math.sin(u * ang) / sa : u;
      const P = [A[0] * a1 + B[0] * b1, A[1] * a1 + B[1] * b1, A[2] * a1 + B[2] * b1];
      const d = bow * Math.sin(Math.PI * u), cd = Math.cos(d), sd = Math.sin(d);
      coords.push(lngLat([P[0] * cd + N[0] * sd, P[1] * cd + N[1] * sd, P[2] * cd + N[2] * sd]));
    }
    return { type: 'LineString', coordinates: coords };
  }
  // every flight on the sheet, each in one or more pieces (a flight over the Pacific leaves one edge of
  // the map and comes back in at the other); a piece is drawn in its share of the flight's time
  function drawRoutes() {
    routesSvg.replaceChildren();
    routesSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    routesSvg.setAttribute('width', W); routesSvg.setAttribute('height', H);
    routes = [];
    BEATS.forEach((b) => {
      if (!b.f) return;
      const d = path(routeLine(b.f));
      if (!d) return;
      const pieces = d.split(/(?=M)/).filter((s) => /L/.test(s)).map((pd) => {
        const p = el('path', { class: 'rf-arc', d: pd, pathLength: 1, 'stroke-dashoffset': 1, 'stroke-opacity': ROUTE.drawing }, routesSvg);
        return { el: p, len: Math.max(0.01, p.getTotalLength()), shown: -1, op: -1 };
      });
      const total = pieces.reduce((s, q) => s + q.len, 0);
      let acc = 0;
      pieces.forEach((q) => { q.a = acc / total; acc += q.len; q.b = acc / total; });
      routes.push({ b, pieces });
    });
  }

  /* ------------------------------------------------------------ one stamp at a time */

  let current = null, flip = 0;

  function makeStamp(st) {
    const { S, vw, vh } = G.sb;
    const svg = el('svg', { class: 'os-stamp', viewBox: `${-vw / 2} ${-vh / 2} ${vw} ${vh}`, 'aria-hidden': 'true' });
    svg.style.setProperty('--os-ink', st.ink);
    svg.style.setProperty('--st-heavy', `${(S * 0.03).toFixed(2)}px`);
    svg.style.setProperty('--st-thin', `${clamp(S * 0.01, 0.8, 1.3).toFixed(2)}px`);
    spot.appendChild(svg);
    arcDefs = el('defs', {}, svg);
    const turned = el('g', { transform: `rotate(${st.rot.toFixed(1)})` }, svg);
    DRAW[st.shape](el('g', { filter: `url(#os-ink-${st.filter})` }, turned), S, wordsOf(st));
    return svg;
  }

  // the country shown, after the ramp: a second coat of its wash, and a fine ring round it when it is small
  function deepen(st) {
    const w = st ? washes.find((x) => x.c.id === st.c.id) : null;
    flip ^= 1;
    const next = deeps[flip], prev = deeps[flip ^ 1];
    if (w) {
      next.width = w.cv.width; next.height = w.cv.height;
      next.style.setProperty('--dx', `${w.x0}px`); next.style.setProperty('--dy', `${w.y0}px`);
      next.style.setProperty('--dw', `${w.w}px`); next.style.setProperty('--dh', `${w.h}px`);
      const ctx = next.getContext('2d');
      ctx.globalAlpha = 0.8;
      ctx.drawImage(w.cv, 0, 0);
      next.classList.add('is-on');
    } else next.classList.remove('is-on');
    prev.classList.remove('is-on');
    rings.querySelectorAll('.os-ring').forEach((r) => {
      const on = !!st && r.dataset.ring === st.c.id;
      if (on) r.style.setProperty('--os-ink', st.ink);
      r.classList.toggle('is-on', on);
    });
  }

  function show(st, animate) {
    current = st;
    const old = [...spot.querySelectorAll('.os-stamp')];
    old.filter((o) => o.classList.contains('is-lifting')).forEach((o) => o.remove());
    const last = old.find((o) => !o.classList.contains('is-lifting'));
    const svg = makeStamp(st);
    const moving = animate && !FP.reduced && !document.hidden;
    if (moving && last) {
      last.classList.add('is-lifting');
      last.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'ease-out', fill: 'forwards' });
      setTimeout(() => last.remove(), 150);
      svg.animate([{ opacity: 0, transform: 'scale(1.05)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, delay: 90, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' });
    } else if (moving) {
      svg.animate([{ opacity: 0, transform: 'scale(1.05)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' });
    } else if (last) last.remove();
    const name = st.home ? st.c.name[FP.lang] : st.c.country[FP.lang];
    spot.setAttribute('aria-label', t().stamp(name, st.home ? FP.w.home : st.j.date[FP.lang]));
  }

  /* ------------------------------------------------------------ the ramp */

  let clock = 0, raf = 0, t0 = 0, rested = false, rampShown = undefined, pointedStamp = null;

  // the whole sheet as it is at time t (ms from the start): drawn the same way live and for ?at
  function frameAt(tm, live) {
    clock = tm;
    // the flights: drawn like a pen, then fading to their resting strength
    routes.forEach(({ b, pieces }) => {
      const u = clamp((tm - b.start) / b.dur, 0, 1), p = easePen(u);
      const since = tm - b.land;
      const op = since <= 0 ? ROUTE.drawing : ROUTE.resting + (ROUTE.drawing - ROUTE.resting) * (1 - easeOut(clamp(since / TIME.rest, 0, 1)));
      pieces.forEach((q) => {
        const v = clamp((p - q.a) / (q.b - q.a), 0, 1);
        const shown = Math.round(v * 1000) / 1000;
        if (shown !== q.shown) { q.el.setAttribute('stroke-dashoffset', (1 - shown).toFixed(3)); q.el.setAttribute('visibility', shown > 0 ? 'visible' : 'hidden'); q.shown = shown; }
        const o = Math.round(op * 100) / 100;
        if (o !== q.op) { q.el.setAttribute('stroke-opacity', o); q.op = o; }
      });
    });
    // the three numbers
    let cN = 0, fN = 0, pN = FP.home.photos, latest = null;
    BEATS.forEach((b) => {
      if (tm >= b.land) { if (b.f) fN++; if (b.fresh) { cN++; latest = b.fresh; } }
      if (b.photos) pN += b.photos * easeOut(clamp((tm - b.land) / TIME.photos, 0, 1));
    });
    setNum(0, cN); setNum(1, fN); setNum(2, Math.round(pN));
    // the washes and the names
    washes.forEach((w) => {
      if (w.c.home) { bleedTo(w, 1); return; }
      const land = landOf.get(w.c.id);
      bleedTo(w, land == null ? 1 : (tm - land) / TIME.bleed);
      if (w.label) w.label.classList.toggle('is-waiting', land != null && tm < land);
    });
    // the stamp: the newest country, until he points at one
    if (latest !== rampShown) {
      rampShown = latest;
      if (!pointedStamp) show(latest ? stampOf.get(latest) : HOME, live);
    }
  }

  function rest() {
    cancelAnimationFrame(raf); raf = 0;
    frameAt(END, false);
    rested = true;
    body.classList.remove('is-running');
    deepen(current);
  }
  function play() {
    body.classList.add('is-running');
    t0 = performance.now() - clock;
    const tick = (now) => {
      const tm = now - t0;
      if (tm >= END) { rest(); return; }
      frameAt(tm, true);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------ pointing and tapping */

  function pick(id) {
    const st = stampOf.get(id);
    if (!st || !rested) return;
    pointedStamp = st;
    if (st !== current) show(st, true);
    deepen(st);
  }
  const idAt = (e) => {
    const h = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
    return h && hitLayer && hitLayer.contains(h) ? h.dataset.id : null;
  };
  function nearest(e) {
    const r = sheet.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 26;
    washes.forEach((w) => { const d = Math.hypot(w.at[0] - x, w.at[1] - y); if (d < bd) { bd = d; best = w.c.id; } });
    return best;
  }
  const note = (id, e) => FP.tip(e.clientX, e.clientY, FP.about(FP.byId.get(id)));
  let pointed = null, dwell = 0;
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const id = idAt(e);
    if (!id) { if (pointed) { pointed = null; clearTimeout(dwell); FP.tip(0, 0, null); } return; }
    note(id, e);
    if (id === pointed) return;
    pointed = id;
    clearTimeout(dwell);
    dwell = setTimeout(() => pick(id), 90); // a pointer passing over Europe does not set off every stamp
  });
  stage.addEventListener('pointerleave', () => { pointed = null; clearTimeout(dwell); FP.tip(0, 0, null); });
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const id = idAt(e) || nearest(e);
    if (id) { note(id, e); pick(id); } else FP.tip(0, 0, null);
  });

  /* ------------------------------------------------------------ putting it together */

  function render() {
    words();
    const g = solve();
    if (!g || g.w < 120 || g.h < 120 || !(g.s > 20)) return false;
    G = g; W = g.w; H = g.h; narrow = !!g.narrow;
    body.classList.toggle('is-narrow', narrow);
    proj = d3.geoEqualEarth().scale(g.s).translate([g.ox, g.oy]).precision(0.15)
      .clipExtent([[g.x0, g.mapTop - 1], [g.x1, g.mapBottom]]);
    path = d3.geoPath(proj);
    frame = path({ type: 'Sphere' });
    k = clamp(g.s / 251, 0.62, 1.2);
    document.documentElement.style.setProperty('--tn-k', k.toFixed(3));

    setSeal(g.S || g.sb.S);
    setRow(g.F, g.stack);
    row.style.setProperty('--x', `${g.cr.x.toFixed(1)}px`);
    row.style.setProperty('--y', `${g.cr.y.toFixed(1)}px`);
    seal.style.setProperty('--x', `${g.sr.x.toFixed(1)}px`);
    seal.style.setProperty('--y', `${g.sr.y.toFixed(1)}px`);
    stage.style.setProperty('--room', narrow ? `${Math.ceil(g.room)}px` : '0px');

    sheet.style.setProperty('--sheet-w', `${W}px`);
    sheet.style.setProperty('--sheet-h', `${H}px`);
    sea.style.setProperty('--sheet-w', `${W}px`);
    washes = [FP.home, ...FP.abroad].map((c) => makeWash(c, homeland(c)));
    layWashes();
    drawSea();
    drawInk();
    drawLabels();
    drawRoutes();
    spot.replaceChildren();
    const keepShown = pointedStamp || null;
    rampShown = undefined; current = null;
    frameAt(clock, false);
    if (keepShown) { show(keepShown, false); }
    if (rested) deepen(current);
    return true;
  }

  const fontsIn = Promise.race([
    Promise.all([
      document.fonts.load('400 120px "Playfair Display"', '0123456789'),
      document.fonts.load('400 11px "Playfair Display"', 'JAPAN OCEAN 2026'),
      document.fonts.load('500 11px "Geist"', 'countries flights photographs'),
      document.fonts.load('600 11px "Geist"', 'JAPAN ARRIVED'),
      document.fonts.load('400 11px "Noto Serif TC"', '日本太平洋臺灣'),
      document.fonts.load('500 11px "Noto Sans TC"', '個國家段航程張照片入境'),
    ]).catch(() => null),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  if (STILL) body.classList.add('is-still');
  Promise.all([FP.world('50m'), FP.world('110m'), fontsIn]).then(([a, lite]) => {
    atlas = a;
    buildLandRaster(topojson.merge(lite.topo, lite.topo.objects.countries.geometries.filter((g) => g.id !== '010')));
    chooseTones();
    clock = STILL ? END : SEEK != null ? Math.min(SEEK, END) : 0;
    const go = () => {
      if (!render()) return false;
      started = true;
      requestAnimationFrame(() => body.classList.add('is-ready'));
      if (STILL || (SEEK != null && SEEK >= END)) rest();
      else if (SEEK == null) play();
      return true;
    };
    if (!go()) {
      const again = () => { if (!started && go()) removeEventListener('resize', again); };
      addEventListener('resize', again);
    }
  });

  let rt = 0;
  addEventListener('resize', () => {
    if (!started) return;
    clearTimeout(rt);
    if (STILL || rested) render(); else rt = setTimeout(render, 140);
  });
  FP.onLang(() => { if (!started) return; stage.setAttribute('aria-label', FP.w.where); render(); });
})();
