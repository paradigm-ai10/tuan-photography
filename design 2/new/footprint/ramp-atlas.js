/* Ramp, atlas 地圖集：三個數字＋一個章 (footprint, round five, 2026-11-06).
   His brief this round: the map bigger, little white paper left; three numbers (countries, flights,
   photographs); the landing starts with his countries uncoloured, and as the numbers pump up the
   places he has been gain their colour, the flights drawn quietly: a ramp.
   - The hand-tinted atlas of footprint-imp-bolder (its washes and its stamp colours), drawn as large
     as the window allows: the whole plate, edge to edge, the top bar sitting in its empty corners.
   - The atlas lettering of footprint-imp-typeset: names in spaced capitals by size, years in
     old-style figures, home in clay, the oceans lightly lettered.
   - The three numbers set as one atlas title block in the open South Pacific, over the sea, the
     engraving rubbed out beneath it: countries first and largest, then flights, then photographs,
     each with a small spaced-capital label, and under countries its share of the world.
   - The one passport stamp of footprint-tinted-onestamp in the opposite corner.
   The arrival is one slow sequence in order (as footprint-imp-animate made it), on one clock:
     0 s      the plate, uncoloured but for home, Taiwan, in clay; the numbers at 0; home's stamp;
     0.9 s    the ramp, trip by trip, oldest first (FP.ramp), over 8 s, easing in and out: the numbers
              count up to each trip's totals; each country the count reaches bleeds in its wash and is
              lettered; each trip's flights are drawn as fine arcs, like a pen, darker while wet and
              drying faint; the stamp presses each trip's newest country;
     ~10 s    everything rests. The stamp's country takes a second coat; pointing at a country (or
              tapping it) shows its note and presses its stamp.
   ?still and reduced motion show the end at once; ?at=<ms> holds the sequence at that moment.
   Nothing flies or scatters, nothing random: every front and every arc is the same each time. */
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
  const rad = (d) => (d * Math.PI) / 180;
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const MASK = '#000'; // the stencil for shapes worked on off screen; never seen

  /* ------------------------------------------------------------ words */

  const T = {
    en: {
      nth: (i, n) => `${i} of ${n}`,
      arrived: 'Arrived', rail: 'By rail', road: 'By road',
      stamp: (name, date) => `${name}, ${date}`,
      sr: (c, f, p, share) => `${FP.w.where}: ${c}, ${f}, ${p}. ${share}`,
      share: (pct, n) => `${FP.w.pct(pct)} ${FP.w.ofWorld(n)}`,
    },
    zh: {
      nth: (i, n) => `第 ${i} 個，共 ${n} 個`,
      arrived: '入境', rail: '火車入境', road: '陸路入境',
      stamp: (name, date) => `${name}，${date}`,
      sr: (c, f, p, share) => `${FP.w.where}：${c}，${f}，${p}。${share}`,
      share: (pct, n) => `${FP.w.ofWorld(n)} ${FP.w.pct(pct)}`,
    },
  };
  const t = () => T[FP.lang];
  const caps = (s) => (FP.lang === 'zh' ? s : s.toUpperCase());
  // the oceans, lettered lightly where the sea is open (as footprint-imp-typeset letters them)
  const SEAS = [
    { id: 'pacific', at: [-138, 13], en: ['PACIFIC', 'OCEAN'], zh: ['太平洋'] },
    { id: 'atlantic', at: [-40, 28], en: ['ATLANTIC', 'OCEAN'], zh: ['大西洋'] },
    { id: 'indian', at: [78, -22], en: ['INDIAN', 'OCEAN'], zh: ['印度洋'] },
  ];

  /* ------------------------------------------------------------ the colourist's box */

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
  // the stamp's ink: a deep shade of the country's own wash
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
  const inOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2); // a pen: starts and ends softly
  const outCubic = (u) => 1 - (1 - u) ** 3;

  /* ------------------------------------------------------------ where each name is lettered */

  // [lng, lat] of the lettering, its anchor, and where a fine leader runs to when it sits away from a
  // country too small or too crowded to letter beside (footprint-imp-typeset's table); the names of
  // Europe's crowded corner are spaced evenly about Germany (`group`)
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

  /* ------------------------------------------------------------ the stamps */

  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));

  // the first time he crossed into a country: the leg, how, and where (as stamps.js has it)
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
  // in the order he first went: by his first trip there, then as that trip reached them
  const visitKey = (c) => `${c.journeys[0]}|${String(journeyById.get(c.journeys[0]).countries.indexOf(c.id)).padStart(2, '0')}`;
  const ORDER = FP.abroad.slice().sort((a, b) => visitKey(a).localeCompare(visitKey(b)))
    .map((c, i) => ({ c, i, ...entryOf(c), rot: (hash01(c.id) - 0.5) * 10, shape: SHAPES[i % SHAPES.length], filter: i % 5 }));
  // home's stamp: the airport he flies out of
  const homeFlight = FP.flights.find((f) => FP.km([f.from.lat, f.from.lng], FP.home.ll) < 60);
  const HOME = { c: FP.home, home: true, code: homeFlight ? homeFlight.from.code : '', rot: -4, shape: 'ring', filter: 1 };
  const stampOf = new Map([...ORDER.map((st) => [st.c.id, st]), [FP.home.id, HOME]]);

  // the ink: uneven cover, a slightly rough edge; a few versions so no two stamps print alike
  const FILTERS = 5;
  const defsSvg = el('svg', { class: 'os-defs', 'aria-hidden': 'true', width: 0, height: 0 });
  const inkDefs = el('defs', {}, defsSvg);
  for (let i = 0; i < FILTERS; i++) {
    const f = el('filter', { id: `ra-ink-${i}`, x: '-12%', y: '-12%', width: '124%', height: '124%', 'color-interpolation-filters': 'sRGB' }, inkDefs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.7', numOctaves: '2', seed: String(3 + i * 7), result: 'fine' }, f);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: String(41 + i * 13), result: 'blot' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'fine', scale: '0.9', xChannelSelector: 'R', yChannelSelector: 'G', result: 'rough' }, f);
    el('feColorMatrix', { in: 'fine', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -1.5', result: 'speck' }, f);
    el('feColorMatrix', { in: 'blot', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.7 0 0 0 0.22', result: 'patch' }, f);
    el('feComposite', { in: 'speck', in2: 'patch', operator: 'arithmetic', k1: '1', k2: '0', k3: '0', k4: '0', result: 'cover' }, f);
    el('feComposite', { in: 'rough', in2: 'cover', operator: 'in' }, f);
  }
  body.appendChild(defsSvg);

  // shrink a line of text until it fits
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
    const id = `ra-arc-${arcN++}`;
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

  // the words on a stamp, in the current language
  function wordsOf(st) {
    if (st.home) return { name: caps(st.c.country[FP.lang]), big: caps(FP.w.home), date: st.code, mark: '' };
    const year = String(st.c.first);
    const date = caps(st.j.date[FP.lang]);
    const mark = st.via === 'rail' ? t().rail : st.via === 'road' ? t().road : t().arrived;
    if (st.code) return { name: caps(st.c.country[FP.lang]), big: st.code, date, mark: caps(t().arrived) };
    return { name: caps(st.c.country[FP.lang]), big: year, date: caps(mark), mark: '' };
  }

  // each shape draws itself around (0, 0) at size S (as footprint-imp-bolder draws them)
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

  /* ------------------------------------------------------------ the ramp, on one clock */

  // FP.ramp: one step per trip, oldest first, with the running totals. The steps come at an even pace
  // that eases in and out (half steady, half a slow sine), so no step stalls and none rushes.
  const RAMP = FP.ramp, STEPS = RAMP.length;
  const TL = { start: 900, dur: 8000, bleed: 1100, dry: 1400 };
  const ease = (u) => 0.5 * u + 0.25 * (1 - Math.cos(Math.PI * u));
  const pAt = (ms) => STEPS * ease(clamp((ms - TL.start) / TL.dur, 0, 1));
  function tAt(p) { // when the ramp reaches step position p
    const goal = clamp(p / STEPS, 0, 1);
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (ease(m) < goal) lo = m; else hi = m; }
    return TL.start + TL.dur * hi;
  }
  const ZERO = { countries: 0, flightsSoFar: 0, photos: 0 };
  const before = (i) => (i > 0 ? RAMP[i - 1] : ZERO);
  // the three numbers at a point of the ramp: each counts from the trip before's totals to this one's
  function totalsAt(p) {
    if (p >= STEPS) { const r = RAMP[STEPS - 1]; return { c: r.countries, f: r.flightsSoFar, p: r.photos }; }
    const i = Math.floor(p), fr = p - i, a = before(i), b = RAMP[i];
    const lerp = (x, y) => Math.floor(x + (y - x) * fr + 1e-6);
    return { c: lerp(a.countries, b.countries), f: lerp(a.flightsSoFar, b.flightsSoFar), p: lerp(a.photos, b.photos) };
  }
  // a country gains its colour the moment the count reaches it; the stamp presses each trip's newest
  const REACH = new Map(), PRESS = [], FLY = new Map();
  RAMP.forEach((r, i) => {
    const m = r.fresh.length;
    r.fresh.forEach((c, j) => REACH.set(c.id, tAt(i + (j + 1) / m)));
    if (m) PRESS.push({ t: tAt(i + 1), st: stampOf.get(r.fresh[m - 1].id) });
    r.flights.forEach((f, k) => FLY.set(f, tAt(i + k / r.flights.length))); // each leg sets off as the count of flights does
  });

  /* ------------------------------------------------------------ the page */

  const sheet = document.createElement('div'); sheet.className = 'tn-sheet';
  const sea = document.createElement('canvas'); sea.className = 'tn-sea';
  const washCv = document.createElement('canvas'); washCv.className = 'tn-wash'; // every wash, on one sheet
  const deeps = [0, 1].map(() => { const c = document.createElement('canvas'); c.className = 'os-deep'; return c; });
  // the engraving, the flights and the lettering each on a sheet of their own, so a line being drawn
  // or a name being lettered never makes the coasts be drawn again
  const ink = el('svg', { class: 'tn-ink', 'aria-hidden': 'true' });
  const flSvg = el('svg', { class: 'ra-fl', 'aria-hidden': 'true' });
  const labSvg = el('svg', { class: 'ra-lab', 'aria-hidden': 'true' });
  const rings = el('svg', { class: 'os-rings', 'aria-hidden': 'true' });
  sheet.append(sea, washCv, ...deeps, rings, ink, flSvg, labSvg);

  // the title block: three numbers, each with its label; under countries, its share of the world
  const title = document.createElement('div');
  title.className = 'ra-title';
  title.innerHTML = `<h1 class="ra-sr"></h1>
    <div class="ra-n ra-n--c" aria-hidden="true"></div><p class="ra-l ra-l--c fp-label" aria-hidden="true"></p><p class="ra-share" aria-hidden="true"></p>
    <div class="ra-n ra-n--f" aria-hidden="true"></div><p class="ra-l ra-l--f fp-label" aria-hidden="true"></p>
    <div class="ra-n ra-n--p" aria-hidden="true"></div><p class="ra-l ra-l--p fp-label" aria-hidden="true"></p>`;
  const q = (s) => title.querySelector(s);
  const NUM = { c: q('.ra-n--c'), f: q('.ra-n--f'), p: q('.ra-n--p') };
  const LAB = { c: q('.ra-l--c'), f: q('.ra-l--f'), p: q('.ra-l--p') };
  const shareEl = q('.ra-share');

  const seal = document.createElement('div');
  seal.className = 'os-seal';
  seal.innerHTML = '<div class="os-seal__spot" role="img"></div><p class="os-seal__n fp-label"></p>';
  const spot = seal.querySelector('.os-seal__spot'), sealN = seal.querySelector('.os-seal__n');

  const room = document.createElement('div'); room.className = 'os-room';
  stage.append(sheet, title, seal, room);
  stage.setAttribute('aria-label', FP.w.where);

  let W = 0, H = 0, narrow = false, G = null;
  let proj = null, path = null, frame = null, k = 1;
  let atlas = null, landRaster = null, washes = [], lines = [];
  const tones = new Map();
  let started = false, rested = false, T0 = 0, raf = 0, TEND = 0;

  /* ------------------------------------------------------------ the numbers' words */

  const shareOf = (n) => (Math.round((n / FP.counts.world) * 1000) / 10).toFixed(1);
  function setNumbers(tot) {
    const w = FP.w;
    NUM.c.textContent = String(tot.c); NUM.f.textContent = String(tot.f); NUM.p.textContent = String(tot.p);
    LAB.c.textContent = w.countries(tot.c); LAB.f.textContent = w.flights(tot.f); LAB.p.textContent = w.photos(tot.p);
    shareEl.textContent = t().share(shareOf(tot.c), FP.counts.world);
  }
  const FINAL = { c: FP.counts.countries, f: FP.counts.flights, p: FP.counts.photos };
  function words() {
    const n = FP.counts, w = FP.w;
    q('.ra-sr').textContent = t().sr(`${n.countries} ${w.countries(n.countries)}`, `${n.flights} ${w.flights(n.flights)}`,
      `${n.photos} ${w.photos(n.photos)}`, t().share(n.share.toFixed(1), n.world));
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
      for (const p of A) for (const qq of B) {
        const dl = qq[1] - p[1], dn = qq[0] - p[0];
        const h = Math.sin(dl / 2) ** 2 + Math.cos(p[1]) * Math.cos(qq[1]) * Math.sin(dn / 2) ** 2;
        if (h < m) m = h;
      }
      return 2 * 6371 * Math.asin(Math.sqrt(m));
    };
    const picked = [], used = BOX.map(() => 0);
    tones.set(FP.home.id, { css: cssVar('--tn-home'), rgb: rgb(cssVar('--tn-home')) });
    FP.abroad.forEach((c) => {
      const near = picked.map((qq) => {
        if ((touch.get(c.iso) || new Set()).has(qq.c.iso)) return { b: qq.b, w: 12 };
        const km = apart(c, qq.c);
        return { b: qq.b, w: km < 1400 ? 1 + 8 * (1 - km / 1400) : 0 };
      });
      const cost = BOX.map((_, b) => near.reduce((sum, n) => sum + (n.b === b ? n.w : 0), 0) + used[b] * 0.05);
      const b = cost.indexOf(Math.min(...cost));
      picked.push({ c, b }); used[b]++;
      tones.set(c.id, tone(BOX[b], hashStr(c.id)));
    });
    ORDER.forEach((st) => { st.ink = deepInk(tones.get(st.c.id).css); });
    HOME.ink = cssVar('--route');
  }

  /* ------------------------------------------------------------ the frame: the plate as large as the window allows */

  const SOUTH = -60; // the old atlases stop here
  const UNIT = d3.geoEqualEarth().scale(1).translate([0, 0]);
  const XR = UNIT([179.9999, 0])[0], YT = UNIT([0, 90])[1], YB = UNIT([0, SOUTH])[1];
  const MW = 2 * XR, MH = YB - YT;
  const RIM = 6; // the neatline's heavy outer rule lies this far outside the map's edge
  // the plate's half width at each height, read off its edge (lng 180), north to south, in units
  const EDGE = d3.range(90, SOUTH - 0.01, -0.5).map((lat) => UNIT([179.9999, lat]));
  function halfAt(yu) {
    if (yu <= EDGE[0][1]) return EDGE[0][0];
    if (yu >= EDGE[EDGE.length - 1][1]) return EDGE[EDGE.length - 1][0];
    let lo = 0, hi = EDGE.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (EDGE[m][1] < yu) lo = m; else hi = m; }
    const a = EDGE[lo], b = EDGE[hi];
    return a[0] + (b[0] - a[0]) * ((yu - a[1]) / (b[1] - a[1] || 1));
  }
  // does a rectangle touch the plate (at scale s about ox, oy), with pad pixels round it?
  function onPlate(r, s, ox, oy, pad) {
    if (r.y + r.h < oy + YT * s - RIM - pad || r.y > oy + YB * s + RIM + pad) return false;
    const yy = clamp(oy, r.y, r.y + r.h); // the plate is widest at the equator
    const hw = s * halfAt((yy - oy) / s) + RIM + pad;
    return r.x < ox + hw && r.x + r.w > ox - hw;
  }
  // does a rectangle lie wholly inside the map's edge, pad pixels in?
  function insidePlate(r, s, ox, oy, pad) {
    if (r.y < oy + YT * s + pad || r.y + r.h > oy + YB * s - pad) return false;
    const hw = Math.min(halfAt((r.y - oy) / s), halfAt((r.y + r.h - oy) / s)) * s - pad;
    return r.x >= ox - hw && r.x + r.w <= ox + hw;
  }

  // the land, drawn once at a fixed scale, as a table that says at once whether a rectangle on the
  // screen covers any land, for any size and place the map is drawn at
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
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += d[(y * w + x) * 4 + 3] > 40 ? 1 : 0;
        sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + row;
      }
    }
    landRaster = { R, w, h, sat };
  }
  function landIn(r, s, ox, oy, m) {
    const { R, w, h, sat } = landRaster;
    const qq = R / s;
    const x0 = clamp(Math.floor((r.x - m - ox) * qq + XR * R + 1), 0, w), x1 = clamp(Math.ceil((r.x + r.w + m - ox) * qq + XR * R + 1), 0, w);
    const y0 = clamp(Math.floor((r.y - m - oy) * qq - YT * R + 1), 0, h), y1 = clamp(Math.ceil((r.y + r.h + m - oy) * qq - YT * R + 1), 0, h);
    if (x1 <= x0 || y1 <= y0) return false;
    const W1 = w + 1;
    return sat[y1 * W1 + x1] - sat[y0 * W1 + x1] - sat[y1 * W1 + x0] + sat[y0 * W1 + x0] > 0;
  }

  // the figures' own height: the number's box is drawn in to the ink, top and bottom (a canvas draws
  // Playfair's old-style figures, so the lining ones are measured by a capital O, as tall and as low)
  const meas = document.createElement('canvas').getContext('2d');
  function inkOf(F) {
    meas.font = `400 ${F}px "Playfair Display"`;
    const m = meas.measureText('O');
    const fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
    if (!(fa > 0)) return { top: F * 0.19, bot: F * 0.07 };
    const base = (F - (fa + fd)) / 2 + fa; // line-height 1
    return { top: base - m.actualBoundingBoxAscent, bot: F - (base + m.actualBoundingBoxDescent) };
  }

  // the title block at size F, in a row, a tight stack, or (on a phone) a row with the share under all
  // three; its columns are fixed at the widths of the final numbers, so nothing moves while it counts
  function setTitle(F, mode) {
    const ik = inkOf(200);
    title.style.setProperty('--it', `${(ik.top / 200).toFixed(4)}em`);
    title.style.setProperty('--ib', `${(ik.bot / 200).toFixed(4)}em`);
    title.style.setProperty('--f', `${F.toFixed(1)}px`);
    title.classList.toggle('is-stack', mode === 'stack');
    title.classList.toggle('is-wide', mode === 'wide');
    title.style.removeProperty('--cols');
    Object.values(NUM).forEach((n) => n.style.removeProperty('--mw'));
    setNumbers(FINAL);
    Object.values(NUM).forEach((n) => n.style.setProperty('--mw', `${Math.ceil(n.getBoundingClientRect().width)}px`));
    title.style.setProperty('--cols', getComputedStyle(title).gridTemplateColumns);
    const r = title.getBoundingClientRect();
    return { w: r.width, h: r.height, F, mode };
  }
  function setSeal(S, beside) {
    const vw = Math.round(S * 1.5), vh = Math.round(S * 1.16);
    seal.style.setProperty('--sw', `${vw}px`);
    seal.style.setProperty('--sh', `${vh}px`);
    seal.classList.toggle('is-beside', beside);
    const prev = sealN.textContent;
    sealN.textContent = t().nth(ORDER.length, ORDER.length); // the widest the line will be
    const r = seal.getBoundingClientRect(), lr = sealN.getBoundingClientRect();
    sealN.textContent = prev;
    return { S, vw, vh, w: r.width, h: r.height, lab: { dx: lr.left - r.left, dy: lr.top - r.top, w: lr.width, h: lr.height } };
  }

  // the labels that must keep their place (home, the large and the middling countries), as boxes on
  // the screen for a map drawn at scale s about (ox, oy). Widths per pixel of type, as the stylesheet sets them.
  const FONT = {
    en: { m: [8.6, 10.5, 0.16], l: [10, 13, 0.24], dx: 0.45 },
    zh: { m: [9.6, 11, 0.1], l: [10.4, 13.5, 0.5], dx: 0.3 },
  };
  const keep = {};
  function keepers() {
    const lang = FP.lang;
    if (keep[lang]) return keep[lang];
    const fam = '"Playfair Display", "Noto Serif TC", serif';
    keep[lang] = [FP.home, ...FP.abroad].filter((c) => RANK(c) <= 2 && PLACE[c.id] && !PLACE[c.id].wrap).map((c) => {
      const p = PLACE[c.id], size = p.size === 'l' ? 'l' : 'm', [min, base, ls] = FONT[lang][size];
      const name = c.home ? c.name[lang] : c.country[lang], cap = lang === 'zh' ? name : name.toUpperCase();
      const year = c.home ? caps(FP.w.home) : String(c.first);
      meas.font = `400 100px ${fam}`;
      const wn = meas.measureText(cap).width + ls * 100 * [...cap].length;
      meas.font = `400 80px ${fam}`;
      const wy = meas.measureText(year).width;
      return { u: UNIT(p.at), a: p.a, min, base, lines: p.stack ? 2.2 : 1, per: (wn + (p.stack ? 0 : FONT[lang].dx * 100 + wy)) / 100 };
    });
    return keep[lang];
  }
  function labelsIn(r, s, ox, oy) {
    const kk = clamp(s / 251, 0.62, 1.2);
    return keepers().some((qq) => {
      const fs = Math.max(qq.min, qq.base * kk), w = qq.per * fs;
      const x = ox + qq.u[0] * s, y = oy + qq.u[1] * s;
      const box = { x: qq.a === 'start' ? x : qq.a === 'end' ? x - w : x - w / 2, y: y - 0.8 * fs, w, h: (qq.lines + 0.05) * fs };
      return overlap(box, r, 6);
    });
  }

  const at = (box, x, y) => ({ x, y, w: box.w, h: box.h });
  function topBar() {
    const sr = stage.getBoundingClientRect();
    return ['.fp-top__name', '.fp-lang'].map((sel) => {
      const b = document.querySelector(sel).getBoundingClientRect();
      return { x: b.left - sr.left, y: b.top - sr.top, w: b.width, h: b.height };
    });
  }

  function solve() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 640) return solveNarrow(w, h);
    const side = clamp(w * 0.012, 12, 22), bottom = 10, top = 10;
    const bar = topBar();
    // the plate, whole, as large as the window allows: as wide as it is, or as tall; centred, and
    // lowered only if the top bar's words would touch its edge (they sit in its empty corners)
    let m = null;
    for (let s = Math.min((w - 2 * (side + RIM)) / MW, (h - top - bottom - 2 * RIM) / MH), n = 0; n < 50 && !m; n++, s *= 0.985) {
      const span = MH * s + 2 * RIM, y0 = top, y1 = h - bottom - span;
      if (y1 < y0) continue;
      for (let y = (y0 + y1) / 2; y <= y1 + 1e-6; y += 2) {
        const oy = y + RIM - YT * s;
        if (!bar.some((r) => onPlate(r, s, w / 2, oy, 10))) { m = { s, ox: w / 2, oy }; break; }
      }
    }
    if (!m) return null;
    const { s, ox, oy } = m;
    // the title block in the open South Pacific: the largest that lies over the sea, inside the map's
    // edge, clear of the land and the kept names; in a row or a tight stack, whichever is larger there
    const goal = UNIT([-121, -30]).map((v, i) => (i ? oy : ox) + v * s);
    let tb = null;
    for (let F = Math.min(s * 0.62, 240); F >= 34 && !tb; F *= 0.95) {
      for (const mode of ['row', 'stack']) {
        const box = setTitle(F, mode);
        const pad = Math.max(12, F * 0.07);
        let pick = null, pd = Infinity;
        for (let x = ox - XR * s; x <= ox - box.w * 0.5; x += 4) {
          for (let y = oy - 0.1 * s; y + box.h <= oy + YB * s; y += 4) {
            const r = { x, y, w: box.w, h: box.h };
            if (!insidePlate(r, s, ox, oy, 16) || landIn(r, s, ox, oy, pad) || labelsIn(r, s, ox, oy)) continue;
            const d = Math.hypot(x + box.w / 2 - goal[0], y + box.h / 2 - goal[1]);
            if (d < pd) { pd = d; pick = r; }
          }
        }
        if (pick && (!tb || box.w * box.h > tb.r.w * tb.r.h)) tb = { F, mode, r: pick };
      }
    }
    if (!tb) { const box = setTitle(34, 'stack'); tb = { F: 34, mode: 'stack', r: at(box, side, h - bottom - box.h) }; }
    // the stamp in the opposite corner, under the language words: as large as the paper there allows,
    // over paper or open sea only, clear of the kept names
    const lang = bar[1], y0 = lang.y + lang.h + 8;
    let sl = null;
    for (let S = clamp(s * 0.58, 104, 168); S >= 80 && !sl; S *= 0.94) {
      const sb = setSeal(S, false);
      for (let dy = 0; dy <= 48; dy += 6) {
        const r = at(sb, w - side - sb.w, y0 + dy);
        if (landIn(r, s, ox, oy, 10) || labelsIn(r, s, ox, oy) || overlap(r, tb.r, 20)) continue;
        sl = { S, sb, r }; break;
      }
    }
    if (!sl) { const sb = setSeal(80, false); sl = { S: 80, sb, r: at(sb, w - side - sb.w, y0) }; }
    const lr = { x: sl.r.x + sl.sb.lab.dx, y: sl.r.y + sl.sb.lab.dy, w: sl.sb.lab.w, h: sl.sb.lab.h };
    return { w, h, s, ox, oy, F: tb.F, mode: tb.mode, tr: tb.r, S: sl.S, sb: sl.sb, sr: sl.r, lr };
  }

  // a phone: the map across the top, at full width; under it the three numbers in a row (the share of
  // the world under them all); the stamp under that, its line beside it
  function solveNarrow(w, h) {
    const side = 8, top = 64, edge = 16;
    const s = (w - 2 * (side + RIM)) / MW;
    const ox = w / 2, oy = top + RIM - YT * s;
    const mapBottom = oy + YB * s + RIM;
    let box = null;
    for (let F = w * 0.3; F >= 30; F *= 0.95) { box = setTitle(F, 'wide'); if (box.w <= w - 2 * edge) break; }
    const sb = setSeal(Math.round(clamp(w * 0.34, 112, 146)), true);
    // where the screen is taller than the three need, the gaps between them open a little, so the paper
    // left over does not all fall at the foot
    const spare = Math.max(0, h - (mapBottom + 30 + box.h + 30 + sb.h + 24));
    const gap = 30 + Math.min(64, spare * 0.3);
    const tr = at(box, edge, mapBottom + gap);
    const sr = at(sb, w - edge - sb.w, tr.y + tr.h + gap);
    return { w, h, narrow: true, s, ox, oy, F: box.F, mode: 'wide', tr, S: sb.S, sb, sr, room: sr.y + sr.h + 24 };
  }

  /* ------------------------------------------------------------ the sea: graticule, water-lining, neatline */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else ctx.rect(x, y, w, h);
  }
  // the paper left clear under the title block and the stamp: the engraving fades out round them
  function clearings() {
    if (narrow) return [];
    return [{ ...G.tr, pad: Math.max(8, G.F * 0.05), soft: Math.max(18, G.F * 0.14) }, { ...G.sr, pad: 4, soft: 20 }];
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
    ctx.globalAlpha = 0.15;
    ctx.beginPath(); gpath(d3.geoGraticule().step([15, 15]).extentMinor([[-180, SOUTH - 1], [180, 90]])()); ctx.stroke();
    ctx.globalAlpha = 0.28;
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
    const nl = narrow ? 7 : 12;
    const th = d3.range(nl).map((i) => (1.7 + 2.35 * i + 0.16 * i * i) * sp);
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
      lc.globalAlpha = 0.66 * Math.pow(1 - i / nl, 1.4);
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
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const N = 14;
    for (let i = 0; i < N; i++) {
      ctx.globalAlpha = 0.28;
      clearings().forEach((r) => {
        const grow = r.pad + r.soft * (1 - i / (N - 1));
        roundRect(ctx, r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow, grow);
        ctx.fill();
      });
    }
    ctx.restore();

    // the neatline, whole: a heavy rule outside, a fine one on the edge of the map (a stamp that
    // reaches over it is printed on top)
    ctx.globalAlpha = 1; ctx.strokeStyle = inkC;
    ctx.lineWidth = 0.6; ctx.stroke(framePath);
    const gap = narrow ? 2.5 : 3.5 * k;
    const outer = d3.geoEqualEarth().scale(L.s).translate([L.ox, L.oy]).precision(0.2);
    const sx = (XR * L.s + gap) / (XR * L.s), syT = (-YT * L.s + gap) / (-YT * L.s), syB = (YB * L.s + gap) / (YB * L.s);
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
    ctx.lineWidth = narrow ? 1.4 : 2.4; ctx.stroke();

    // where the stamp's small line falls on the frame, the frame is broken for it, as an engraver
    // breaks a line for lettering
    if (!narrow && G.lr) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 8; i++) {
        ctx.globalAlpha = 0.4;
        const grow = 4 + 6 * (1 - i / 7);
        roundRect(ctx, G.lr.x - grow, G.lr.y - grow, G.lr.w + 2 * grow, G.lr.h + 2 * grow, grow);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------ the flights: fine arcs, drawn like a pen */

  const toV = ([lng, lat]) => { const l = rad(lng), p = rad(lat); return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]; };
  const toLL = ([x, y, z]) => [(Math.atan2(y, x) * 180) / Math.PI, (Math.asin(clamp(z, -1, 1)) * 180) / Math.PI];
  // the way flown, bowed a little to its left (so a flight out and its flight home are two lines)
  function arcOf(a, b) {
    const A = toV(a), B = toV(b);
    const d = Math.acos(clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1));
    if (d < 1e-4) return [a, b];
    let n = [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
    const nl = Math.hypot(n[0], n[1], n[2]); n = n.map((v) => v / nl);
    const bow = 0.085 * d, steps = Math.max(12, Math.ceil(d / rad(1.5)));
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, sa = Math.sin((1 - u) * d) / Math.sin(d), sb = Math.sin(u * d) / Math.sin(d);
      const P = [0, 1, 2].map((j) => sa * A[j] + sb * B[j]);
      const al = bow * Math.sin(Math.PI * u), ca = Math.cos(al), si = Math.sin(al);
      out.push(toLL([0, 1, 2].map((j) => ca * P[j] + si * n[j])));
    }
    return out;
  }
  function drawFlights(g) {
    lines = [];
    FP.flights.forEach((f) => {
      const d = path({ type: 'LineString', coordinates: arcOf([f.from.lng, f.from.lat], [f.to.lng, f.to.lat]) });
      if (!d) return;
      // a flight across the Pacific leaves the plate at its east edge and comes back in at the west:
      // two pieces, drawn one after the other
      const pieces = d.split(/(?=M)/).map((pd) => {
        const e = el('path', { class: 'ra-flight', d: pd, pathLength: 1 }, g);
        return { el: e, len: e.getTotalLength() };
      }).filter((pc) => pc.len > 0.5);
      const L = pieces.reduce((sum, pc) => sum + pc.len, 0);
      if (!L) return;
      let acc = 0;
      pieces.forEach((pc) => { pc.a = acc / L; acc += pc.len; pc.b = acc / L; pc.d = -1; pc.o = -1; });
      lines.push({ f, pieces, t0: FLY.get(f) || TL.start, dur: clamp(320 + L * 1.1, 520, 1300) });
    });
    TEND = Math.max(...lines.map((ln) => ln.t0 + ln.dur + TL.dry), ...[...REACH.values()].map((r) => r + TL.bleed), tAt(STEPS)) + 80;
  }

  /* ------------------------------------------------------------ the ink: coasts, borders, flights, lettering */

  let labelLayer = null, hitLayer = null, ringLayer = null, seaNames = [];
  function drawInk() {
    ink.replaceChildren();
    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const defs = el('defs', {}, ink);
    // the coasts and borders inside the frame, but not under the title block or the stamp
    let d = frame;
    const rr = (x, y, w, h, r) => `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
    d += clearings().map((c) => { const p = c.pad + c.soft * 0.35; return rr(c.x - p, c.y - p, c.w + 2 * p, c.h + 2 * p, Math.min(p, (c.w + 2 * p) / 2, (c.h + 2 * p) / 2)); }).join('');
    const clip = el('clipPath', { id: 'ra-frame' }, defs);
    el('path', { d, 'clip-rule': 'evenodd' }, clip);
    const g = el('g', { 'clip-path': 'url(#ra-frame)' }, ink);
    el('path', { class: 'tn-border', d: path(atlas.borders) }, g);
    el('path', { class: 'tn-coast', d: path(atlas.land) }, g);
    // the flights' sheet: the same frame, the same clearings
    [flSvg, labSvg].forEach((sv) => { sv.replaceChildren(); sv.setAttribute('viewBox', `0 0 ${W} ${H}`); sv.setAttribute('width', W); sv.setAttribute('height', H); });
    const clip2 = el('clipPath', { id: 'ra-frame-fl' }, el('defs', {}, flSvg));
    el('path', { d, 'clip-rule': 'evenodd' }, clip2);
    const g2 = el('g', { 'clip-path': 'url(#ra-frame-fl)' }, flSvg);
    // the small ones get a ring, so a dab of colour has something to sit in (left out until reached)
    washes.filter((w) => w.dab).forEach((w) => {
      w.dot = el('circle', { class: 'tn-dot', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] }, g2);
      if (!w.c.home) w.dot.classList.add('is-waiting');
    });
    drawFlights(el('g', { class: 'ra-flights' }, g2));
    // the ring round a small country while its stamp is shown: on its own sheet, so it alone is redrawn
    rings.replaceChildren();
    rings.setAttribute('viewBox', `0 0 ${W} ${H}`);
    rings.setAttribute('width', W); rings.setAttribute('height', H);
    ringLayer = rings;
    washes.filter((w) => w.small).forEach((w) => {
      const r = el('circle', { class: 'os-ring', cx: w.at[0].toFixed(1), cy: w.at[1].toFixed(1), r: w.small.toFixed(1) }, ringLayer);
      r.dataset.ring = w.c.id;
    });
    hitLayer = el('g', {}, ink);
    labelLayer = el('g', {}, labSvg);
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
    const bare = G.s / 251 < 0.72; // on a small map the names go without their years: the stamp gives the date
    const spot2 = settle();
    // the oceans first, under the countries' names: light, widely spaced, in the water-lines' ink
    seaNames = SEAS.map((s) => {
      const [x, y] = proj(s.at);
      const tx = el('text', { class: 'tn-ocean', x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle' }, labelLayer);
      s[lang].forEach((line, i) => { el('tspan', { x: x.toFixed(1), dy: i ? '1.5em' : '0' }, tx).textContent = line; });
      return tx;
    });
    washes.forEach((w) => {
      const c = w.c, nm = names[c.iso];
      const p = PLACE[c.id] || { at: nm ? nm.at : [c.ll[1], c.ll[0]], a: 'middle', inside: true };
      const [x, y] = spot2.get(c.id) || proj(p.at);
      const g = el('g', { class: 'tn-label' + (c.home ? '' : ' is-waiting') }, labelLayer);
      const tx = el('text', { class: 'tn-name tn-name--' + (p.size || 'm') + (p.inside ? '' : ' is-halo') + (c.home ? ' is-home' : ''), x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': p.a }, g);
      const name = c.home ? c.name[lang] : c.country[lang];
      const cap = lang === 'zh' ? name : name.toUpperCase();
      const year = c.home ? caps(FP.w.home) : String(c.first);
      if (p.wrap) { // two lines, the year on the second
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
      w.label = g; w.text = tx; w.lit = !!c.home;
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

  // Europe's crowded corner: the names in a group are spaced evenly, two and a half lines apart, about
  // the one that holds its place (Germany); those marked col start at one left edge, east of Germany
  function settle() {
    const out = new Map();
    const zh = FP.lang === 'zh';
    const em = Math.max(zh ? 9.6 : 8.6, (zh ? 11 : 10.5) * k);
    const gap = em * 2.5;
    const groups = {};
    Object.entries(PLACE).forEach(([id, p]) => { if (p.group) (groups[p.group] = groups[p.group] || []).push({ id, p, at: proj(p.at) }); });
    Object.values(groups).forEach((list) => {
      const fixed = list.find((qq) => qq.p.fix) || list[0];
      const colX = proj(fixed.p.at)[0];
      list.forEach((qq) => { qq.x = qq.p.col ? colX : qq.at[0]; qq.y = qq.at[1]; });
      list.sort((a, b) => a.y - b.y);
      const fi = list.indexOf(fixed);
      for (let i = fi - 1; i >= 0; i--) list[i].y = Math.min(list[i].y, list[i + 1].y - gap);
      for (let i = fi + 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + gap);
      list.forEach((qq) => out.set(qq.id, [qq.x, qq.y]));
    });
    return out;
  }

  // leave out the labels that have no room: those that run into a larger one, the title or the stamp
  function cull() {
    const pad = 3 + 2.5 * clamp((1 - k) / 0.38, 0, 1); // a little more air between names on a smaller map
    const few = k < 0.8; // on a smaller map the small countries go unlettered: the stamp names them
    const taken = [{ x: G.tr.x - 8, y: G.tr.y - 8, w: G.tr.w + 16, h: G.tr.h + 16 }, G.sr];
    const list = washes.filter((w) => w.label).sort((a, b) => (RANK(a.c) - RANK(b.c)) || (b.area - a.area));
    for (const w of list) {
      const b = w.text.getBBox();
      const box = { x: b.x, y: b.y, w: b.width, h: b.height };
      const end = w.leadAt ? { x: w.leadAt[0] - 2, y: w.leadAt[1] - 2, w: 4, h: 4 } : null;
      const hit = taken.some((o) => overlap(box, o, pad) || (end && overlap(end, o, 0)));
      if ((hit || (few && RANK(w.c) === 3)) && !w.c.home) { w.label.classList.add('is-cut'); continue; }
      taken.push(box);
    }
    // an ocean's name gives way to everything, and keeps well clear of the title block
    seaNames.forEach((tx) => {
      const b = tx.getBBox(), box = { x: b.x, y: b.y, w: b.width, h: b.height };
      if (taken.some((o) => overlap(box, o, 8)) || overlap(box, G.tr, 28)) tx.classList.add('is-cut');
    });
  }

  /* ------------------------------------------------------------ the washes */

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
    const size = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]);
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
    return { c, feature, cv, img, x0, y0, w: x1 - x0, h: y1 - y0, dab, area, at: atPt, small, label: null, text: null, dot: null };
  }

  // a country as he knows it: the largest of the shapes the atlas numbers alike, without the far-off
  // pieces (French Guiana is France on paper, but he has not been to South America)
  function homeland(c) {
    const all = atlas.features.filter((f) => f.id === c.iso);
    if (!all.length) return null;
    const f = all.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
    if (f.geometry.type !== 'MultiPolygon') return f;
    const nm = FP.names()[c.iso];
    const p = proj(nm ? nm.at : [c.ll[1], c.ll[0]]);
    const polys = f.geometry.coordinates.map((coordinates) => ({ coordinates, a: d3.geoArea({ type: 'Polygon', coordinates }), c: path.centroid({ type: 'Polygon', coordinates }) }));
    const total = polys.reduce((s, qq) => s + qq.a, 0);
    const far = 0.2 * (2 * proj.scale() * XR);
    const kept = polys.filter((qq) => qq.a / total > 0.15 || Math.hypot(qq.c[0] - p[0], qq.c[1] - p[1]) < far);
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: kept.map((qq) => qq.coordinates) } };
  }

  // every wash is laid on one sheet (one blend with the paper below); each country keeps a small
  // sheet of its own for while it is bleeding, and is left clear until the count reaches it
  function layWashes() {
    washCv.width = Math.round(W * DPR); washCv.height = Math.round(H * DPR);
    washes.forEach((w) => {
      w.state = -1; w.src = null;
      if (w.c.home) return;
      w.wet = document.createElement('canvas');
      w.wet.width = w.cv.width; w.wet.height = w.cv.height;
      front(w);
    });
  }
  // the sheet made again where these countries lie: their boxes cleared, and every wash that reaches
  // into them laid again, in the same order as always
  function compose(dirty) {
    if (!dirty.length) return;
    const ctx = washCv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    dirty.forEach((d) => {
      const box = { x: d.x0, y: d.y0, w: d.w, h: d.h };
      ctx.save();
      ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      ctx.clearRect(box.x, box.y, box.w, box.h);
      washes.forEach((w) => { if (w.src && overlap({ x: w.x0, y: w.y0, w: w.w, h: w.h }, box)) ctx.drawImage(w.src, w.x0, w.y0, w.w, w.h); });
      ctx.restore();
    });
  }
  // a wash bleeding out from the middle of its country (as footprint-imp-animate lays it): the pigment
  // reaches each part in turn, nearest first, the front a little uneven (the same every time, from the
  // country's name), a shade richer while wet. Only its alpha moves: the colour is its own throughout.
  // Says whether the country looks different from before.
  function paintWash(w, u) {
    if (u <= 0) { if (w.state === 0) return false; w.state = 0; w.src = null; return true; }
    if (u >= 1) { if (w.state === 1) return false; w.state = 1; w.src = w.cv; return true; }
    const ctx = w.wet.getContext('2d');
    const N = w.cv.width * w.cv.height, src = w.img.data;
    if (!w.arr) front(w);
    const arr = w.arr, dst = w.out.data, soft = 0.18;
    const p = outCubic(u); // quick while the brush is wet, slowing as it dries
    const fr = p * (1 + soft), wet = 1 - u;
    for (let i = 0; i < N; i++) {
      const a = arr[i];
      if (a < 0) continue;
      const k2 = clamp((fr - a) / soft, 0, 1);
      dst[i * 4 + 3] = Math.min(255, src[i * 4 + 3] * k2 * (1 + 1.3 * k2 * (1 - k2) * wet));
    }
    ctx.putImageData(w.out, 0, 0);
    w.state = u; w.src = w.wet;
    return true;
  }
  // the order the pigment reaches each part of a country in: nearest its middle first, the front a
  // little uneven; worked out when the page is laid out, so nothing heavy happens while it runs
  function front(w) {
    const W2 = w.cv.width, H2 = w.cv.height, N = W2 * H2, src = w.img.data;
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
    w.out = new ImageData(W2, H2);
    const dst = w.out.data;
    for (let i = 0; i < N * 4; i += 4) { dst[i] = src[i]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i + 2]; }
  }

  /* ------------------------------------------------------------ the stamp */

  let cur = null, curSvg = null, oldSvg = null, pressedAt = null;

  function makeStamp(st) {
    const { S, vw, vh } = G.sb;
    const svg = el('svg', { class: 'os-stamp', viewBox: `${-vw / 2} ${-vh / 2} ${vw} ${vh}`, 'aria-hidden': 'true' });
    svg.style.setProperty('--os-ink', st.ink);
    svg.style.setProperty('--st-heavy', `${(S * 0.034).toFixed(2)}px`);
    svg.style.setProperty('--st-thin', `${clamp(S * 0.01, 1, 1.7).toFixed(2)}px`);
    spot.appendChild(svg); // in the page before the words are measured
    arcDefs = el('defs', {}, svg);
    const turned = el('g', { transform: `rotate(${st.rot.toFixed(1)})` }, svg);
    DRAW[st.shape](el('g', { filter: `url(#ra-ink-${st.filter})` }, turned), S, wordsOf(st));
    return svg;
  }
  // the stamp st, pressed at t0 on the clock (null: simply there), as it is at time now: the one
  // before lifts away, this one comes down onto the page; no overshoot
  function stampAt(st, t0, now) {
    if (st !== cur || !curSvg) {
      if (oldSvg) oldSvg.remove();
      oldSvg = curSvg; cur = st; pressedAt = t0;
      curSvg = makeStamp(st);
      sealN.textContent = st.home ? FP.w.home : t().nth(st.i + 1, ORDER.length);
      const name = st.home ? st.c.name[FP.lang] : st.c.country[FP.lang];
      spot.setAttribute('aria-label', t().stamp(name, st.home ? FP.w.home : st.j.date[FP.lang]));
    }
    const local = pressedAt == null ? Infinity : now - pressedAt;
    const a = outCubic(clamp((local - 90) / 300, 0, 1));
    curSvg.style.setProperty('--a', a.toFixed(3));
    curSvg.style.setProperty('--sc', (1 + 0.04 * (1 - a)).toFixed(4));
    if (oldSvg) {
      const b = clamp(local / 160, 0, 1);
      if (b >= 1) { oldSvg.remove(); oldSvg = null; } else oldSvg.style.setProperty('--a', (1 - b).toFixed(3));
    }
    return local < 400;
  }

  // the country shown at rest: its wash a little deeper, and a fine ring round it when it is too small to see
  let flip = 0;
  function deepen(st) {
    const w = washes.find((x) => x.c.id === st.c.id);
    flip ^= 1;
    const next = deeps[flip], prev = deeps[flip ^ 1];
    if (w) {
      next.width = w.cv.width; next.height = w.cv.height;
      next.style.setProperty('--dx', `${w.x0}px`); next.style.setProperty('--dy', `${w.y0}px`);
      next.style.setProperty('--dw', `${w.w}px`); next.style.setProperty('--dh', `${w.h}px`);
      next.getContext('2d').drawImage(w.cv, 0, 0);
    } else next.width = next.width;
    next.classList.add('is-on'); prev.classList.remove('is-on');
    if (ringLayer) ringLayer.querySelectorAll('.os-ring').forEach((r) => {
      const on = r.dataset.ring === st.c.id;
      if (on) r.style.setProperty('--os-ink', st.ink);
      r.classList.toggle('is-on', on);
    });
  }

  /* ------------------------------------------------------------ one frame of the ramp */

  let shown = null;
  function frame2(ms) {
    const tot = totalsAt(pAt(ms));
    if (!shown || tot.c !== shown.c || tot.f !== shown.f || tot.p !== shown.p) { setNumbers(tot); shown = tot; }
    const dirty = [];
    washes.forEach((w) => {
      if (w.c.home) { if (paintWash(w, 1)) dirty.push(w); return; }
      const t0 = REACH.get(w.c.id);
      const u = t0 == null ? 1 : (ms - t0) / TL.bleed;
      if (paintWash(w, u)) dirty.push(w);
      const lit = u > 0;
      if (lit !== w.lit) {
        w.lit = lit;
        if (w.label) w.label.classList.toggle('is-waiting', !lit);
        if (w.dot) w.dot.classList.toggle('is-waiting', !lit);
      }
    });
    compose(dirty);
    // the flights: each drawn along its way, darker while the ink is wet, then drying faint
    lines.forEach((ln) => {
      const v = inOut(clamp((ms - ln.t0) / ln.dur, 0, 1));
      const dry = clamp((ms - ln.t0 - ln.dur) / TL.dry, 0, 1);
      const o = v <= 0 ? 0 : 1 - 0.55 * outCubic(dry);
      ln.pieces.forEach((pc) => {
        const d = +(1 - clamp((v - pc.a) / (pc.b - pc.a), 0, 1)).toFixed(4), oo = +o.toFixed(3);
        if (d !== pc.d) { pc.el.style.setProperty('--d', String(d)); pc.d = d; }
        if (oo !== pc.o) { pc.el.style.setProperty('--o', String(oo)); pc.o = oo; }
      });
    });
    // the stamp: the newest country of the latest trip the ramp has reached (home before the first)
    let pr = null;
    for (const x of PRESS) { if (x.t <= ms) pr = x; else break; }
    if (rested && cur && cur !== (pr ? pr.st : HOME)) return; // at rest, the country pointed at keeps the stamp
    stampAt(pr ? pr.st : HOME, pr ? pr.t : null, ms);
  }

  function tick() {
    raf = 0;
    const ms = performance.now() - T0;
    frame2(ms);
    if (ms < TEND) raf = requestAnimationFrame(tick);
    else rest();
  }
  function rest() {
    rested = true;
    body.classList.remove('is-running');
    frame2(Infinity);
    if (cur) deepen(cur);
  }

  /* ------------------------------------------------------------ pointing and tapping */

  // at rest, the country pointed at presses its stamp; at any time, its note follows the pointer
  let live = 0;
  function pressLive(st) {
    if (!rested || st === cur) return;
    const t0 = performance.now();
    stampAt(st, t0, t0);
    deepen(st);
    cancelAnimationFrame(live);
    const step = () => { if (stampAt(st, t0, performance.now())) live = requestAnimationFrame(step); };
    live = requestAnimationFrame(step);
  }
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
  let pointed = null, dwell = 0;
  function note(id, e) {
    const c = id ? FP.byId.get(id) : null;
    FP.tip(e.clientX, e.clientY, c ? FP.about(c) : null);
  }
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const id = idAt(e);
    note(id, e);
    if (id === pointed) return;
    pointed = id;
    clearTimeout(dwell);
    if (id) dwell = setTimeout(() => pressLive(stampOf.get(id)), 90); // a pointer passing over Europe does not set off every stamp
  });
  stage.addEventListener('pointerleave', () => { pointed = null; clearTimeout(dwell); FP.tip(0, 0, null); });
  stage.addEventListener('pointerdown', (e) => {
    const id = idAt(e) || (e.pointerType === 'mouse' ? null : nearest(e));
    note(id, e);
    if (id) pressLive(stampOf.get(id));
  });
  stage.addEventListener('scroll', () => FP.tip(0, 0, null), { passive: true });

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

    // the title block and the stamp in their places, at the sizes the frame chose
    setTitle(g.F, g.mode);
    setSeal(g.S, narrow);
    title.style.setProperty('--x', `${g.tr.x.toFixed(1)}px`);
    title.style.setProperty('--y', `${g.tr.y.toFixed(1)}px`);
    seal.style.setProperty('--x', `${g.sr.x.toFixed(1)}px`);
    seal.style.setProperty('--y', `${g.sr.y.toFixed(1)}px`);
    stage.style.setProperty('--room', narrow ? `${Math.ceil(g.room)}px` : '0px');

    sheet.style.setProperty('--sheet-w', `${W}px`);
    sheet.style.setProperty('--sheet-h', `${H}px`);
    ink.setAttribute('width', W); ink.setAttribute('height', H);
    washes = [FP.home, ...FP.abroad].map((c) => makeWash(c, homeland(c)));
    drawSea(L);
    drawInk();
    drawLabels();
    layWashes();
    // the stamp drawn again at its new size, in the new words
    spot.replaceChildren(); curSvg = null; oldSvg = null;
    const keepSt = cur; cur = null;
    shown = null;
    if (started) {
      const ms = rested ? Infinity : SEEK != null ? SEEK : performance.now() - T0;
      if (rested && keepSt) { frame2(Infinity); stampAt(keepSt, null, 0); deepen(keepSt); } else frame2(ms);
    }
    return true;
  }

  const fontsIn = Promise.race([
    Promise.all([
      document.fonts.load('400 120px "Playfair Display"', '0123456789%'),
      document.fonts.load('400 40px "Playfair Display"', 'COUNTRIES ARRIVED'),
      document.fonts.load('400 13px "Geist"', 'of the world 0123456789%'),
      document.fonts.load('500 11px "Geist"', 'COUNTRIES FLIGHTS PHOTOGRAPHS'),
      document.fonts.load('600 11px "Geist"', 'JAPAN'),
      document.fonts.load('500 40px "Noto Serif TC"', '個國家全世界的太平洋'),
      document.fonts.load('500 11px "Noto Sans TC"', '第個共入境火車陸路段航程張照片'),
    ]).catch(() => null),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  if (STILL || SEEK != null) body.classList.add('is-still');
  Promise.all([FP.world('50m'), FP.world('110m'), fontsIn]).then(([a, lite]) => {
    atlas = a;
    buildLandRaster(topojson.merge(lite.topo, lite.topo.objects.countries.geometries.filter((gg) => gg.id !== '010')));
    chooseTones();
    const go = () => {
      if (!render()) return false;
      started = true;
      if (STILL) { rest(); body.classList.add('is-ready'); return true; }
      if (SEEK != null) { frame2(SEEK); if (SEEK >= TEND) rest(); body.classList.add('is-ready'); return true; }
      frame2(0);
      requestAnimationFrame(() => {
        body.classList.add('is-ready', 'is-running');
        T0 = performance.now();
        raf = requestAnimationFrame(tick);
      });
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
    clearTimeout(rt);
    if (STILL) render(); else rt = setTimeout(render, 140);
  });
  FP.onLang(() => { if (!started) return; stage.setAttribute('aria-label', FP.w.where); render(); });
})();
