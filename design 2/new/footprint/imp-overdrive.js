/* The count as the atlas 數字就是地圖 (footprint, round four, 2026-11-06). Impeccable: overdrive.
   His favourite, the hand-tinted atlas with one stamp at a time (tinted-onestamp.js), pushed to one strong
   idea: the numerals "20" are set so large that they become windows cut in the paper, and through them
   lies the hand-tinted atlas itself, printed as an old atlas prints its inset maps (a pale sea, the
   graticule, the water-lining along the coasts, his countries in their washes, Taiwan in clay). The count
   IS the atlas: the whole world is laid across the figures, the Americas in the 2, the Old World in the 0,
   so wherever the figures' strokes fall, his countries show through in their own colour. The full map
   still sits beside them, top right, smaller and quieter, so every country is readable and lettered; the
   words and the share of the world stand on the figures' baseline; the one stamp is pressed beside the 0
   (in a row with the words, or midway up when the column is tall).
   Pointing at a country, on the map or inside the figures, presses its stamp and deepens its wash in both.
   On arrival the stamps press through his countries in the order he first went, about one a second, and
   rest on the latest; the figures never count or move.
   (overdrive.md asks for directions to be put to the owner before building; the direction was chosen in
   the brief for this round, so this is that direction, built and checked in the browser.)
   The figures are an SVG mask (the paper with "20" cut out of it, in Playfair's lining figures) over
   canvases of the inset; nothing here needs WebGL. With ?still or reduced motion, the finished page. */
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

  /* ------------------------------------------------------------ words */

  const T = {
    en: {
      nth: (i, n) => `${i} of ${n}`,
      arrived: 'Arrived', rail: 'By rail', road: 'By road',
      stamp: (name, date) => `${name}, ${date}`,
      sr: (n, w, pct, of) => `${FP.w.where}: ${n} ${w}, ${pct} ${of}`,
    },
    zh: {
      nth: (i, n) => `第 ${i} 個，共 ${n} 個`,
      arrived: '入境', rail: '火車入境', road: '陸路入境',
      stamp: (name, date) => `${name}，${date}`,
      sr: (n, w, pct, of) => `${FP.w.where}：${n} ${w}，${of} ${pct}`,
    },
  };
  const t = () => T[FP.lang];
  const caps = (s) => (FP.lang === 'zh' ? s : s.toUpperCase());

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
  // the stamp's ink: a deep shade of the country's own wash
  function deepInk(css) {
    const m = css.match(OKLCH);
    if (!m) return cssVar('--ink');
    return `oklch(41% ${clamp(+m[2] * 1.5, 0.07, 0.135).toFixed(3)} ${(+m[3]).toFixed(1)})`;
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

  /* ------------------------------------------------------------ where each name is lettered */

  // [lng, lat] of the lettering, its anchor, and where a fine leader runs to when it sits away
  // from a country too small or too crowded to letter beside (as tinted.js has them)
  const PLACE = {
    taiwan: { at: [123.0, 23.3], a: 'start' },
    usa: { at: [-99, 39], a: 'middle', inside: true, size: 'l' },
    china: { at: [101.5, 33.5], a: 'middle', inside: true, size: 'l' },
    australia: { at: [134.5, -25.5], a: 'middle', inside: true, size: 'l' },
    uk: { at: [-12.0, 56.2], a: 'end' },
    netherlands: { at: [7.8, 57.9], a: 'start', lead: [5.5, 52.4], size: 's' },
    germany: { at: [15.8, 51.0], a: 'start' },
    france: { at: [-4.6, 46.6], a: 'end' },
    // (Switzerland and Andorra lettered over land to the east and south, clear of the coasts they crowded)
    switzerland: { at: [19.6, 47.0], a: 'start', lead: [8.2, 46.8], size: 's' },
    andorra: { at: [2.2, 33.4], a: 'middle', lead: [1.55, 42.55], size: 's' },
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
    const f = el('filter', { id: `os-ink-${i}`, x: '-12%', y: '-12%', width: '124%', height: '124%', 'color-interpolation-filters': 'sRGB' }, inkDefs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.7', numOctaves: '2', seed: String(3 + i * 7), result: 'fine' }, f);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: String(41 + i * 13), result: 'blot' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'fine', scale: '0.9', xChannelSelector: 'R', yChannelSelector: 'G', result: 'rough' }, f);
    // gentler than stamps.js: this stamp is read up close, so the ink thins in patches but never
    // breaks a letter (a broken I reads as an i)
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

  // the words on a stamp, in the current language
  function wordsOf(st) {
    if (st.home) return { name: caps(st.c.country[FP.lang]), big: caps(FP.w.home), date: st.code, mark: '' };
    const year = String(st.c.first);
    const date = caps(st.j.date[FP.lang]);
    const mark = st.via === 'rail' ? t().rail : st.via === 'road' ? t().road : t().arrived;
    if (st.code) return { name: caps(st.c.country[FP.lang]), big: st.code, date, mark: caps(t().arrived) };
    return { name: caps(st.c.country[FP.lang]), big: year, date: caps(mark), mark: '' };
  }

  // each shape draws itself around (0, 0) at size S (as stamps.js draws them; the small lines a
  // little larger, since this one stamp is meant to be read)
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


  /* ------------------------------------------------------------ the page */

  // the full map: sea, washes, the shown country's deeper wash, the rings, the ink
  const sheet = document.createElement('div'); sheet.className = 'tn-sheet';
  const sea = document.createElement('canvas'); sea.className = 'tn-sea';
  const washCv = document.createElement('canvas'); washCv.className = 'tn-wash';
  const deeps = [0, 1].map(() => { const c = document.createElement('canvas'); c.className = 'os-deep'; return c; });
  const ink = el('svg', { class: 'tn-ink', 'aria-hidden': 'true' });
  const rings = el('svg', { class: 'os-rings', 'aria-hidden': 'true' });
  sheet.append(sea, washCv, ...deeps, rings, ink);

  // the count: the figures, a window onto the atlas, and its words
  const count = document.createElement('div');
  count.className = 'os-count od-count';
  count.innerHTML = `<h1 class="os-sr"></h1>
    <div class="od-num" aria-hidden="true"><canvas class="od-sea"></canvas><canvas class="od-wash"></canvas><canvas class="od-deep"></canvas><canvas class="od-deep"></canvas><canvas class="od-ink"></canvas></div>
    <div class="od-words" aria-hidden="true"><div class="os-count__w"></div><div class="os-share"></div></div>`;
  const num = count.querySelector('.od-num'), countSide = count.querySelector('.od-words');
  const inSea = num.querySelector('.od-sea'), inWash = num.querySelector('.od-wash'), inInk = num.querySelector('.od-ink');
  const inDeeps = [...num.querySelectorAll('.od-deep')];
  const cut = el('svg', { class: 'od-cut' }, num);

  const seal = document.createElement('div');
  seal.className = 'os-seal';
  seal.innerHTML = '<div class="os-seal__spot" role="img"></div><p class="os-seal__n fp-label"></p>';
  const spot = seal.querySelector('.os-seal__spot'), sealN = seal.querySelector('.os-seal__n');

  const room = document.createElement('div'); room.className = 'os-room';
  stage.append(sheet, count, seal, room);
  stage.setAttribute('aria-label', FP.w.where);

  let W = 0, H = 0, narrow = false, G = null;
  let proj = null, path = null, frame = null, k = 1;
  let atlas = null, washes = [];
  const tones = new Map();
  let started = false;
  // the inset inside the figures: its projection and its washes
  const IN = { proj: null, path: null, k: 1, washes: [], frame: '', box: null };

  /* ------------------------------------------------------------ the count's words */

  function words() {
    const n = FP.counts, w = FP.w;
    const numS = FP.fmt(n.countries), word = w.countries(n.countries);
    const pct = w.pct(n.share), of = w.ofWorld(n.world);
    count.querySelector('.os-count__w').textContent = word;
    // "10.3% / of the world's 195 countries"; in 中文 the words come first: 「全世界 195 個國家的 / 10.3%」
    const big = `<span class="os-share__pct">${FP.esc(pct)}</span>`;
    const small = `<p class="os-share__of fp-label">${FP.esc(of)}</p>`;
    count.querySelector('.os-share').innerHTML = FP.lang === 'zh' ? small + big : big + small;
    count.querySelector('.os-sr').textContent = t().sr(numS, word, pct, of);
    return numS;
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
    ORDER.forEach((st) => { st.ink = deepInk(tones.get(st.c.id).css); });
    HOME.ink = cssVar('--route');
  }


  /* ------------------------------------------------------------ the layout: the figures, the column beside them */

  const SOUTH = -60; // the old atlases stop here
  const UNIT = d3.geoEqualEarth().scale(1).translate([0, 0]);
  const XR = UNIT([179.9999, 0])[0], YT = UNIT([0, 90])[1], YB = UNIT([0, SOUTH])[1];
  const MW = 2 * XR, MH = YB - YT;

  // the figures' own measure, per px of type: the width they take, and the height of their ink (a canvas
  // draws Playfair's old-style figures, so the lining ones are measured in SVG, their height by a capital O,
  // which stands as tall and dips as low)
  const meas = document.createElement('canvas').getContext('2d');
  const probeSvg = el('svg', { class: 'od-probe', 'aria-hidden': 'true', width: 10, height: 10 });
  document.body.appendChild(probeSvg);
  const probeT = el('text', { class: 'od-glyph', x: 0, y: 100, 'font-size': 100 }, probeSvg);
  let figs = null;
  function figures(str) {
    if (figs && figs.str === str) return figs;
    probeT.textContent = str;
    const adv = probeT.getComputedTextLength() / 100;
    meas.font = '400 100px "Playfair Display"';
    const m = meas.measureText('O');
    const asc = (m.actualBoundingBoxAscent || 72) / 100, desc = (m.actualBoundingBoxDescent || 1.5) / 100;
    figs = { str, wide: adv, asc, desc, stand: asc + desc };
    return figs;
  }
  // the words at size fw (the size of "countries"); their box
  function setWords(fw, maxW) {
    countSide.style.setProperty('--fw', `${fw.toFixed(1)}px`);
    countSide.style.setProperty('--wmax', maxW ? `${Math.floor(maxW)}px` : 'none');
    const r = countSide.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }
  function setSeal(S) {
    const vw = Math.round(S * 1.5), vh = Math.round(S * 1.16);
    seal.style.setProperty('--sw', `${vw}px`);
    seal.style.setProperty('--sh', `${vh}px`);
    const prev = sealN.textContent;
    sealN.textContent = t().nth(ORDER.length, ORDER.length); // the widest the line will be
    const r = seal.getBoundingClientRect();
    sealN.textContent = prev;
    return { S, vw, vh, w: r.width, h: r.height };
  }

  function solve(str) {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 640) return solveNarrow(w, h, str);
    const side = clamp(w * 0.032, 16, 40), top = 70, bottom = 20;
    const R = figures(str);
    // the figures as large as the window lets them be: no taller than the room under the top bar, and no
    // wider than a little over half the page, so the column beside them keeps room for the map
    let F = Math.min((h - top - bottom) / R.stand, ((w - 2 * side) * 0.56) / R.wide);
    let out = null;
    for (let n = 0; n < 14; n++, F *= 0.96) {
      const nw = R.wide * F, gap = Math.max(36, F * 0.085);
      const cx = side + nw + gap, cw = w - side - cx;
      // the stamp and the words in a row along the figures' baseline: the stamp beside the figures, the
      // words beyond it
      const S = Math.round(clamp(Math.min(cw * 0.27, h * 0.19), 92, 150));
      const sb = setSeal(S);
      const fw = clamp(Math.min(cw * 0.085, h * 0.062), 24, 50);
      const wb = setWords(fw, cw - sb.w - 26);
      const rowH = Math.max(sb.h, wb.h);
      const rowFits = sb.w + 26 + wb.w <= cw + 0.5;
      // the map at the top of the column, as wide as the column, unless the row leaves it less height
      const mapRoom = h - top - bottom - rowH - 34;
      const s = Math.min(cw / MW, mapRoom / MH);
      out = { w, h, side, top, bottom, F, R, nw, cx, cw, sb, S, fw, wb, s };
      if (rowFits && s * MW >= Math.min(cw, 300) * 0.92) break;
    }
    const { F: Ff, R: Rf, cx, cw, sb, wb, s } = out;
    const base = h - bottom; // the figures' baseline, and the row's
    const numBox = { x: side, y: base - Rf.asc * Ff, w: Rf.wide * Ff, h: Rf.stand * Ff };
    const ox = cx + XR * s, oy = top - YT * s;
    let sr = { x: cx, y: base - sb.h, w: sb.w, h: sb.h };
    let wr = { x: cx + sb.w + 26, y: base - wb.h, w: wb.w, h: wb.h };
    // a tall column: the words alone on the baseline, the stamp pressed higher, midway between them and
    // the map, beside the 0
    const mapBottom = oy + YB * s, free = base - wb.h - mapBottom;
    if (free > sb.h * 1.5 + 40) {
      wr = { x: cx, y: base - wb.h, w: wb.w, h: wb.h };
      sr = { x: cx, y: Math.round(mapBottom + (free - sb.h) / 2), w: sb.w, h: sb.h };
    }
    return { ...out, numBox, ox, oy, sr, wr };
  }

  // a phone: the map across the top, the figures under it (the atlas again, larger), then the stamp and the
  // words; the page may scroll
  function solveNarrow(w, h, str) {
    const side = 14, top = 70, edge = 16;
    const s = (w - 2 * side) / MW;
    const ox = w / 2, oy = top - YT * s;
    const mapBottom = oy + YB * s;
    const R = figures(str);
    const F = (w - 2 * edge) / R.wide;
    const numBox = { x: edge, y: mapBottom + 30, w: R.wide * F, h: R.stand * F };
    const sb = setSeal(Math.round(clamp(w * 0.27, 92, 116)));
    const fw = clamp(w * 0.075, 24, 32);
    let wb = setWords(fw, w - 2 * edge - sb.w - 18);
    const below = numBox.y + numBox.h + 30;
    let sr, wr;
    if (wb.w + 18 + sb.w <= w - 2 * edge) {
      wr = { x: edge, y: below, w: wb.w, h: wb.h };
      sr = { x: w - edge - sb.w, y: below + Math.max(0, (wb.h - sb.h) / 2), w: sb.w, h: sb.h };
    } else {
      wb = setWords(fw, w - 2 * edge);
      wr = { x: edge, y: below, w: wb.w, h: wb.h };
      sr = { x: w - edge - sb.w, y: below + wb.h + 22, w: sb.w, h: sb.h };
    }
    const end = Math.max(wr.y + wr.h, sr.y + sr.h);
    return { w, h, narrow: true, F, R, s, ox, oy, numBox, sb, S: sb.S, fw, wb, sr, wr, room: end + 26 };
  }


  /* ------------------------------------------------------------ the sea: graticule, water-lining, neatline */

  // the sea of one map, on canvas `cv` (w by h css px) for the projection in use: for the full map, the
  // graticule, the water-lining and the neatline; for the inset in the figures, first a pale sea and the
  // land left as paper, as an atlas prints its insets
  function drawSea(cv, w, h, L, o = {}) {
    cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
    const ctx = cv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const water = cssVar('--tn-water'), inkC = cssVar('--ink');
    const framePath = new Path2D(o.frame || frame);
    if (o.tint) {
      ctx.fillStyle = o.tint; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = o.paper; ctx.beginPath(); d3.geoPath(proj, ctx)(atlas.land); ctx.fill();
    }
    ctx.save();
    ctx.clip(framePath);

    // the graticule, every fifteen degrees, the equator a shade firmer
    const gpath = d3.geoPath(proj, ctx);
    ctx.strokeStyle = inkC; ctx.lineWidth = o.tint ? 0.5 : 0.4;
    ctx.globalAlpha = o.tint ? 0.26 : 0.22;
    ctx.beginPath(); gpath(d3.geoGraticule().step([15, 15]).extentMinor([[-180, SOUTH - 1], [180, 90]])()); ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); gpath({ type: 'LineString', coordinates: d3.range(-180, 181, 2).map((x) => [x, 0]) }); ctx.stroke();

    // the water-lining: lines at a set distance from every coast, closer near the shore, fading out to
    // sea. Distances are measured on the screen, as the engraver measured his plate. Only the part of the
    // map inside this canvas is worked (with a margin, so a coast just outside still has its lines).
    const g = narrow ? 1 : 1.25; // css px per cell
    const pad = 6, margin = 40;
    const left = Math.max(L.ox - XR * L.s, -margin), right = Math.min(L.ox + XR * L.s, w + margin);
    const topY = Math.max(L.mapTop, -margin), botY = Math.min(L.mapBottom, h + margin);
    const x0 = left - pad * g, y0 = topY - pad * g;
    const gw = Math.ceil((right - left) / g) + 2 * pad, gh = Math.ceil((botY - topY) / g) + 2 * pad;
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
    const lines = o.lines || (narrow ? 7 : 12);
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
    const lay = document.createElement('canvas'); lay.width = cv.width; lay.height = cv.height;
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(lay, 0, 0);
    ctx.restore();
    if (!o.neat) return;

    // the neatline: a heavy rule outside, a fine one on the edge of the map
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1; ctx.strokeStyle = inkC;
    ctx.lineWidth = 0.6; ctx.stroke(framePath);
    const gap = narrow ? 2.5 : 3 * k;
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
    ctx.lineWidth = narrow ? 1 : 1.25; ctx.stroke();
  }

  /* ------------------------------------------------------------ the ink: coasts, borders, lettering */

  let labelLayer = null, hitLayer = null, ringLayer = null;
  function drawInk() {
    ink.replaceChildren();
    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const defs = el('defs', {}, ink);
    // the coasts and borders inside the frame (the count and the stamp are beside the map, not on it)
    const d = frame;
    const clip = el('clipPath', { id: 'os-frame' }, defs);
    el('path', { d, 'clip-rule': 'evenodd' }, clip);
    const g = el('g', { 'clip-path': 'url(#os-frame)' }, ink);
    el('path', { class: 'tn-border', d: path(atlas.borders) }, g);
    el('path', { class: 'tn-coast', d: path(atlas.land) }, g);
    // the small ones get a ring, so a dab of colour has something to sit in
    washes.filter((w) => w.dab).forEach((w) => el('circle', { class: 'tn-dot', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] }, g));
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
    if (narrow) return;
    const lang = FP.lang, names = FP.names();
    const bare = G.s / 251 < 0.72; // on a small map the names go without their years: the stamp gives the date
    washes.forEach((w) => {
      const c = w.c, nm = names[c.iso];
      const p = PLACE[c.id] || { at: nm ? nm.at : [c.ll[1], c.ll[0]], a: 'middle', inside: true };
      const [x, y] = proj(p.at);
      const g = el('g', { class: 'tn-label' }, labelLayer);
      const tx = el('text', { class: 'tn-name tn-name--' + (p.size || 'm') + (p.inside ? '' : ' is-halo') + (c.home ? ' is-home' : ''), x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': p.a }, g);
      const name = c.home ? c.name[lang] : c.country[lang];
      const cap = lang === 'zh' ? name : name.toUpperCase();
      const year = c.home ? FP.w.home : String(c.first);
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
      tx.dataset.id = c.id;
      w.label = g; w.text = tx;
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

  // leave out the labels that have no room: those that run into a larger one
  function cull() {
    const pad = 3 + 2.5 * clamp((1 - k) / 0.38, 0, 1); // a little more air between names on a smaller map
    const few = k < 0.8; // on a smaller map the small countries go unlettered: the stamp names them
    const taken = [];
    const list = washes.filter((w) => w.label).sort((a, b) => (RANK(a.c) - RANK(b.c)) || (b.area - a.area));
    for (const w of list) {
      const b = w.text.getBBox();
      const box = { x: b.x, y: b.y, w: b.width, h: b.height };
      const end = w.leadAt ? { x: w.leadAt[0] - 2, y: w.leadAt[1] - 2, w: 4, h: 4 } : null;
      const hit = taken.some((o) => overlap(box, o, pad) || (end && overlap(end, o, 0)));
      if ((hit || (few && RANK(w.c) === 3)) && !w.c.home) { w.label.classList.add('is-cut'); continue; }
      taken.push(box);
    }
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
        let al = 0.44 + 0.22 * mott + 0.36 * pool;
        al *= 1 - 0.38 * tooth * tooth * tooth;
        const dk = 1 - 0.14 * pool;
        px[i * 4] = r * dk; px[i * 4 + 1] = gg * dk; px[i * 4 + 2] = bb * dk;
        px[i * 4 + 3] = clamp(cov * al, 0, 1) * 255;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(img, 0, 0);
    // where it is on the screen: for a tap that lands near it, and the ring of a small one
    const ctr = dab ? [dab[0], dab[1]] : path.centroid(feature);
    const atPt = Number.isFinite(ctr[0]) ? ctr : proj([c.ll[1], c.ll[0]]);
    const small = !c.home && (dab || size < (narrow ? 24 : 14)) ? Math.max(6.5, size / 2 + 4) : 0;
    return { c, feature, cv, x0, y0, w: x1 - x0, h: y1 - y0, dab, area, at: atPt, small, label: null, text: null };
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
    const total = polys.reduce((s, q) => s + q.a, 0);
    const far = 0.2 * (2 * proj.scale() * XR);
    const keep = polys.filter((q) => q.a / total > 0.15 || Math.hypot(q.c[0] - p[0], q.c[1] - p[1]) < far);
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: keep.map((q) => q.coordinates) } };
  }

  // every wash is laid from the start; colour stays the same from first to last
  function paintAll(cv, list, w, h) {
    cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
    const ctx = cv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    list.forEach((x) => ctx.drawImage(x.cv, x.x0, x.y0, x.w, x.h));
  }

  /* ------------------------------------------------------------ the figures: windows onto the atlas */

  // the world laid across the figures: the map nearly as tall as their ink, its middle on their middle,
  // turned so the Americas fall in the 2 and the Old World in the 0
  // (chosen by eye from several framings: the US in the 2's ball, Europe and Africa down the 0's left
  // side, China, Japan, South East Asia and Australia down its right)
  const INSET = { lon: 18, zh: 0.94, cx: 0.5, cy: 0.5 };
  const swap = (m) => { const was = { proj, path, k }; proj = m.proj; path = m.path; k = m.k; return was; };

  function drawFigures(str) {
    const R = G.R, F = G.F, b = G.numBox;
    // room round the ink for the outline and the overshoot; the box on whole pixels, so the paper and
    // the atlas under it meet exactly
    const nx = Math.round(b.x) - Math.ceil(F * 0.02) - 2, ny = Math.round(b.y) - Math.ceil(F * 0.02) - 2;
    const m = Math.round(b.x) - nx;
    const bw = Math.ceil(b.w) + 2 * m, bh = Math.ceil(b.h) + 2 * m;
    num.style.setProperty('--x', `${nx}px`);
    num.style.setProperty('--y', `${ny}px`);
    num.style.setProperty('--nw', `${bw}px`);
    num.style.setProperty('--nh', `${bh}px`);
    // the paper, with the figures cut out of it, and their edge
    cut.replaceChildren();
    cut.setAttribute('viewBox', `0 0 ${bw} ${bh}`);
    cut.setAttribute('width', bw); cut.setAttribute('height', bh);
    const defs = el('defs', {}, cut);
    const hole = el('mask', { id: 'od-hole', maskUnits: 'userSpaceOnUse', x: -4, y: -4, width: bw + 8, height: bh + 8 }, defs);
    el('rect', { x: -4, y: -4, width: bw + 8, height: bh + 8, fill: 'white' }, hole);
    const base = m + R.asc * F;
    const glyph = (cls, parent, extra = {}) => { const tx = el('text', { class: 'od-glyph ' + cls, x: m, y: base.toFixed(2), 'font-size': F.toFixed(2), ...extra }, parent); tx.textContent = str; return tx; };
    glyph('od-glyph--hole', hole, { fill: 'black' });
    el('rect', { class: 'od-paper', x: -4, y: -4, width: bw + 8, height: bh + 8, mask: 'url(#od-hole)' }, cut);
    glyph('od-glyph--edge', cut);

    // the inset: the world across the figures' ink box
    const ib = { x: m, y: m, w: b.w, h: b.h };
    const s = (INSET.zh * ib.h) / MH;
    const ox = ib.x + INSET.cx * ib.w, oy = ib.y + INSET.cy * ib.h - ((YT + YB) / 2) * s;
    IN.proj = d3.geoEqualEarth().rotate([-INSET.lon, 0]).scale(s).translate([ox, oy]).precision(0.2)
      .clipExtent([[Math.max(-2, ox - XR * s - 1), Math.max(-2, oy + YT * s - 1)], [Math.min(bw + 2, ox + XR * s + 1), Math.min(bh + 2, oy + YB * s)]]);
    IN.path = d3.geoPath(IN.proj);
    IN.k = clamp(s / 251, 0.62, 1.2);
    IN.frame = IN.path({ type: 'Sphere' });
    IN.box = { bw, bh, m, s, ox, oy };
    const was = swap(IN);
    const wasNarrow = narrow; narrow = false;
    const L = { s, ox, oy, mapTop: oy + YT * s, mapBottom: oy + YB * s };
    drawSea(inSea, bw, bh, L, { frame: IN.frame, tint: cssVar('--od-sea'), paper: cssVar('--paper'), lines: 10 });
    IN.washes = [FP.home, ...FP.abroad].map((c) => makeWash(c, homeland(c)));
    paintAll(inWash, IN.washes, bw, bh);
    // the coasts and borders, engraved
    inInk.width = Math.round(bw * DPR); inInk.height = Math.round(bh * DPR);
    const ctx = inInk.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.save(); ctx.clip(new Path2D(IN.frame));
    const ip = d3.geoPath(IN.proj, ctx);
    ctx.strokeStyle = cssVar('--ink'); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.55; ctx.lineWidth = 0.5; ctx.beginPath(); ip(atlas.borders); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = clamp(0.8 * IN.k, 0.6, 1); ctx.beginPath(); ip(atlas.land); ctx.stroke();
    ctx.restore();
    narrow = wasNarrow;
    swap(was);
  }

  // which of his countries lies under a point in the figures
  function insetAt(e) {
    if (!IN.proj) return null;
    const r = num.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const ll = IN.proj.invert([x, y]);
    if (!ll || !Number.isFinite(ll[0])) return null;
    for (const w of IN.washes) {
      if (w.feature && d3.geoContains(w.feature, ll)) return w.c.id;
      if (w.dab && Math.hypot(w.dab[0] - x, w.dab[1] - y) < w.dab[2] + 5) return w.c.id;
    }
    return null;
  }

  /* ------------------------------------------------------------ one stamp at a time */

  let current = null, flip = 0;

  function makeStamp(st) {
    const { S, vw, vh } = G.sb;
    const svg = el('svg', { class: 'os-stamp', viewBox: `${-vw / 2} ${-vh / 2} ${vw} ${vh}`, 'aria-hidden': 'true' });
    svg.style.setProperty('--os-ink', st.ink);
    svg.style.setProperty('--st-heavy', `${(S * 0.026).toFixed(2)}px`);
    svg.style.setProperty('--st-thin', `${clamp(S * 0.009, 0.8, 1.2).toFixed(2)}px`);
    spot.appendChild(svg); // in the page before the words are measured
    arcDefs = el('defs', {}, svg);
    const turned = el('g', { transform: `rotate(${st.rot.toFixed(1)})` }, svg);
    DRAW[st.shape](el('g', { filter: `url(#os-ink-${st.filter})` }, turned), S, wordsOf(st));
    return svg;
  }

  // the country shown: its wash a little deeper, on the map and in the figures alike, and a fine ring
  // round it on the map when it is too small to see
  function deepen(st) {
    flip ^= 1;
    [[washes, deeps], [IN.washes, inDeeps]].forEach(([list, pair]) => {
      const w = list.find((x) => x.c.id === st.c.id);
      const next = pair[flip], prev = pair[flip ^ 1];
      // a small sheet over the country alone, so only that much of the page is blended again
      if (w) {
        next.width = w.cv.width; next.height = w.cv.height;
        next.style.setProperty('--dx', `${w.x0}px`); next.style.setProperty('--dy', `${w.y0}px`);
        next.style.setProperty('--dw', `${w.w}px`); next.style.setProperty('--dh', `${w.h}px`);
        const ctx = next.getContext('2d');
        ctx.globalAlpha = 0.65;
        ctx.drawImage(w.cv, 0, 0);
      } else next.width = next.width;
      next.classList.add('is-on'); prev.classList.remove('is-on');
    });
    if (ringLayer) ringLayer.querySelectorAll('.os-ring').forEach((r) => {
      const on = r.dataset.ring === st.c.id;
      if (on) r.style.setProperty('--os-ink', st.ink);
      r.classList.toggle('is-on', on);
    });
  }

  function show(st, animate) {
    current = st;
    // only ever one stamp: any still lifting from before goes at once, the last one lifts now
    const old = [...spot.querySelectorAll('.os-stamp')];
    old.filter((o) => o.classList.contains('is-lifting')).forEach((o) => o.remove());
    const last = old.find((o) => !o.classList.contains('is-lifting'));
    const svg = makeStamp(st);
    if (animate && !FP.reduced && !document.hidden && last) {
      // the last one lifts, this one comes down: a short, quiet scale and fade
      last.classList.add('is-lifting');
      last.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
      setTimeout(() => last.remove(), 170);
      svg.animate([{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 340, delay: 110, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' });
    } else if (animate && !FP.reduced && !document.hidden) {
      svg.animate([{ opacity: 0, transform: 'scale(1.06)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 340, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' });
    } else if (last) {
      last.remove();
    }
    sealN.textContent = st.home ? FP.w.home : t().nth(st.i + 1, ORDER.length);
    const name = st.home ? st.c.name[FP.lang] : st.c.country[FP.lang];
    spot.setAttribute('aria-label', t().stamp(name, st.home ? FP.w.home : st.j.date[FP.lang]));
    deepen(st);
  }

  // on arrival: through his countries in the order he first went, about one a second, then rest on the latest
  let runT = 0;
  function run() {
    if (STILL) { show(ORDER[ORDER.length - 1], false); return; }
    let i = 0;
    const step = () => {
      show(ORDER[i], true);
      i++;
      runT = i < ORDER.length ? setTimeout(step, 1000) : 0;
    };
    runT = setTimeout(step, 900);
  }
  function stopRun() { clearTimeout(runT); runT = 0; }

  /* ------------------------------------------------------------ pointing and tapping */

  function pick(id) {
    const st = stampOf.get(id);
    if (!st) return;
    stopRun();
    if (st !== current) show(st, true);
  }
  const idAt = (e) => {
    if (e.target && num.contains(e.target)) return insetAt(e); // inside the figures: the atlas there
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
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const id = idAt(e);
    if (id === pointed) return;
    pointed = id;
    clearTimeout(dwell);
    if (id) dwell = setTimeout(() => pick(id), 90); // a pointer passing over Europe does not set off every stamp
  });
  stage.addEventListener('pointerleave', () => { pointed = null; clearTimeout(dwell); });
  stage.addEventListener('pointerdown', (e) => {
    const id = idAt(e) || (e.pointerType === 'mouse' ? null : nearest(e));
    if (id) pick(id);
  });


  /* ------------------------------------------------------------ putting it together */

  function render() {
    const str = words();
    const g = solve(str);
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

    // the words and the stamp in their places
    setWords(g.fw, g.wr.w + 1);
    setSeal(g.S);
    countSide.style.setProperty('--x', `${g.wr.x.toFixed(1)}px`);
    countSide.style.setProperty('--y', `${g.wr.y.toFixed(1)}px`);
    seal.style.setProperty('--x', `${g.sr.x.toFixed(1)}px`);
    seal.style.setProperty('--y', `${g.sr.y.toFixed(1)}px`);
    stage.style.setProperty('--room', narrow ? `${Math.ceil(g.room)}px` : '0px');

    // the full map, every layer at the window's size in pixels
    sheet.style.setProperty('--sheet-w', `${W}px`);
    sheet.style.setProperty('--sheet-h', `${H}px`);
    ink.setAttribute('width', W); ink.setAttribute('height', H);
    washes = [FP.home, ...FP.abroad].map((c) => makeWash(c, homeland(c)));
    drawSea(sea, W, H, L, { neat: true, lines: narrow ? 6 : 9 });
    drawInk();
    drawLabels();
    paintAll(washCv, washes, W, H);
    // the figures, and the atlas through them
    drawFigures(str);
    if (current) show(current, false);
    return true;
  }

  const fontsIn = Promise.race([
    Promise.all([
      document.fonts.load('400 120px "Playfair Display"', '0123456789%'),
      document.fonts.load('400 40px "Playfair Display"', 'countries ARRIVED'),
      document.fonts.load('500 11px "Geist"', 'of the world 195'),
      document.fonts.load('600 11px "Geist"', 'JAPAN'),
      document.fonts.load('500 40px "Noto Serif TC"', '個國家全世界的'),
      document.fonts.load('500 11px "Noto Sans TC"', '第個共入境火車陸路日本'),
    ]).catch(() => null),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  if (STILL) body.classList.add('is-still');
  Promise.all([FP.world('50m'), fontsIn]).then(([a]) => {
    atlas = a;
    chooseTones();
    const go = () => {
      if (!render()) return false;
      started = true;
      requestAnimationFrame(() => body.classList.add('is-ready'));
      run();
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
