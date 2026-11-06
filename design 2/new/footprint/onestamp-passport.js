/* One stamp at a time, in a passport 一次一個章＋護照翻頁 (footprint, round three, 2026-11-06).
   The hand-tinted atlas of tinted-onestamp.js (Equal Earth cut at 60° south, water-lining, his
   countries in watercolour, Taiwan in clay, the count set large in a corner with the share of the
   world under it), with the one stamp given a home: a small open passport in the opposite corner.
   - The passport is two facing visa pages: paper with a fine wave pattern, "Visas / 簽證" at the head
     of each page, page numbers at the foot, a stitch line down the middle, square, a hairline edge.
   - Home, Taiwan, is page 1, stamped in red; his countries follow in the order he first went, one
     page each. The right page carries the country shown, the left page the country before it, so two
     stamps are seen side by side and never stacked. The page numbers stand in for "20 of 20".
   - On arrival home is stamped, then the right page turns over about the spine (0.6 s) once per
     country, about one a second, and the next stamp is pressed onto the fresh page; it rests on the
     latest. Pointing at a country (tapping it on a phone) turns to its page: however far, one turn,
     forward onto a fresh page that is then stamped, or back to a page already stamped.
   - Reduced motion and ?still: no turning, the latest pages at once.
   The map makes room for the count and the passport: it is drawn as large as it can be with neither
   touching land, the count made a little smaller when that lets the map be drawn near full size. On a
   phone the map is on top, the count under it, no taller than the map, and the passport under that. */
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
      visas: 'Visas', page: (n) => `Page ${n}`,
      arrived: 'Arrived', rail: 'By rail', road: 'By road',
      stamp: (name, date, page) => `${name}, ${date}, page ${page}`,
      sr: (n, w, pct, of) => `${FP.w.where}: ${n} ${w}, ${pct} ${of}`,
    },
    zh: {
      visas: '簽證', page: (n) => `第 ${n} 頁`,
      arrived: '入境', rail: '火車入境', road: '陸路入境',
      stamp: (name, date, page) => `${name}，${date}，第 ${page} 頁`,
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
    switzerland: { at: [14.2, 45.0], a: 'start', lead: [8.2, 46.8], size: 's' },
    andorra: { at: [5.4, 40.2], a: 'start', lead: [1.55, 42.55], size: 's' },
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
  // the passport's pages: home first, then his countries as he first went, one page each
  const PAGES = [HOME, ...ORDER];
  PAGES.forEach((st, i) => { st.page = i + 1; st.prev = i ? PAGES[i - 1] : null; });

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

  const sheet = document.createElement('div'); sheet.className = 'tn-sheet';
  const sea = document.createElement('canvas'); sea.className = 'tn-sea';
  const washCv = document.createElement('canvas'); washCv.className = 'tn-wash';
  const deeps = [0, 1].map(() => { const c = document.createElement('canvas'); c.className = 'os-deep'; return c; });
  const ink = el('svg', { class: 'tn-ink', 'aria-hidden': 'true' });
  const rings = el('svg', { class: 'os-rings', 'aria-hidden': 'true' });
  sheet.append(sea, washCv, ...deeps, rings, ink);

  const count = document.createElement('div');
  count.className = 'os-count';
  count.innerHTML = `<h1 class="os-sr"></h1><div class="os-count__n" aria-hidden="true"></div>
    <div class="os-count__side" aria-hidden="true"><div class="os-count__w"></div><div class="os-share"></div></div>`;
  const countN = count.querySelector('.os-count__n'), countSide = count.querySelector('.os-count__side');

  // the passport: two facing pages, and the leaf that turns between them
  const book = document.createElement('div');
  book.className = 'pp';
  book.innerHTML = `<div class="pp-book" role="img">
      <section class="pp-page pp-page--l"></section><section class="pp-page pp-page--r"></section>
      <div class="pp-leaf"><section class="pp-face pp-face--front"></section><section class="pp-face pp-face--back"></section></div>
      <span class="pp-fold"></span></div>`;
  const bookIn = book.querySelector('.pp-book');
  const pageL = book.querySelector('.pp-page--l'), pageR = book.querySelector('.pp-page--r');
  const leaf = book.querySelector('.pp-leaf');
  const faceF = book.querySelector('.pp-face--front'), faceB = book.querySelector('.pp-face--back');

  const room = document.createElement('div'); room.className = 'os-room';
  stage.append(sheet, count, book, room);
  stage.setAttribute('aria-label', FP.w.where);

  let W = 0, H = 0, narrow = false, G = null;
  let proj = null, path = null, frame = null, k = 1;
  let atlas = null, landRaster = null, washes = [];
  const tones = new Map();
  let started = false;

  /* ------------------------------------------------------------ the count's words */

  function words() {
    const n = FP.counts, w = FP.w;
    const num = FP.fmt(n.countries), word = w.countries(n.countries);
    const pct = w.pct(n.share), of = w.ofWorld(n.world);
    countN.textContent = num;
    count.querySelector('.os-count__w').textContent = word;
    // "10.3% / of the world's 195 countries"; in 中文 the words come first: 「全世界 195 個國家的 / 10.3%」
    const big = `<span class="os-share__pct">${FP.esc(pct)}</span>`;
    const small = `<p class="os-share__of fp-label">${FP.esc(of)}</p>`;
    count.querySelector('.os-share').innerHTML = FP.lang === 'zh' ? small + big : big + small;
    count.querySelector('.os-sr').textContent = t().sr(num, word, pct, of);
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

  /* ------------------------------------------------------------ the frame: making room for two corners */

  const SOUTH = -60; // the old atlases stop here
  const UNIT = d3.geoEqualEarth().scale(1).translate([0, 0]);
  const XR = UNIT([179.9999, 0])[0], YT = UNIT([0, 90])[1], YB = UNIT([0, SOUTH])[1];
  const MW = 2 * XR, MH = YB - YT;

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
    const q = R / s;
    const x0 = clamp(Math.floor((r.x - m - ox) * q + XR * R + 1), 0, w), x1 = clamp(Math.ceil((r.x + r.w + m - ox) * q + XR * R + 1), 0, w);
    const y0 = clamp(Math.floor((r.y - m - oy) * q - YT * R + 1), 0, h), y1 = clamp(Math.ceil((r.y + r.h + m - oy) * q - YT * R + 1), 0, h);
    if (x1 <= x0 || y1 <= y0) return false;
    const W1 = w + 1;
    return sat[y1 * W1 + x1] - sat[y0 * W1 + x1] - sat[y1 * W1 + x0] + sat[y0 * W1 + x0] > 0;
  }

  // the figures' own height: the number's box is drawn in to the ink, top and bottom
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

  // the count at size F, its words beside the number or under it; its parts, for keeping clear
  // (beside: the words beside the number; tight: the same, the small line in two; stack: under it)
  function setCount(F, lay) {
    const ik = inkOf(F);
    count.style.setProperty('--n-top', `${ik.top.toFixed(1)}px`);
    count.style.setProperty('--n-bot', `${ik.bot.toFixed(1)}px`);
    count.style.setProperty('--f', `${F.toFixed(1)}px`);
    count.classList.toggle('is-stack', lay === 'stack');
    count.classList.toggle('is-tight', lay === 'tight');
    const r = count.getBoundingClientRect();
    const part = (n, top = 0, bot = 0) => { const b = n.getBoundingClientRect(); return { dx: b.left - r.left, dy: b.top - r.top + top, w: b.width, h: b.height - top - bot }; };
    return { w: r.width, h: r.height, parts: [part(countN, ik.top, ik.bot), part(countSide)] };
  }
  // the passport at a width P: two pages a little less tall than a real one's, the stamp as large
  // as the page lets it be between the running head and the page number
  function setBook(P) {
    const pw = Math.round(P / 2), ph = Math.round(pw / 0.8);
    const m = Math.round(pw * 0.05);
    const type = clamp(pw * 0.066, 8.5, 10.5);
    const top = Math.round(ph * 0.07 + type * 1.6), bot = Math.round(ph * 0.06 + type * 1.6);
    const vw = pw - 2 * m, vh = ph - top - bot;
    const S = Math.floor(Math.min(vw / 1.4, vh / 1.12));
    const set = (n, v) => book.style.setProperty(n, v);
    set('--pw', `${pw}px`); set('--ph', `${ph}px`); set('--pp-m', `${m}px`);
    set('--pp-top', `${top}px`); set('--pp-bot', `${bot}px`); set('--pp-type', `${type.toFixed(2)}px`);
    return { S, vw, vh, w: 2 * pw, h: ph };
  }
  // the labels that must keep their place (home, the large and the middling countries), as boxes on
  // the screen for a map drawn at scale s about (ox, oy): the two corners stay clear of them too.
  // Widths per pixel of type, measured once per language, as the stylesheet sets them.
  const FONT = {
    en: { m: [8.6, 10.5, 0.13], l: [9.6, 12, 0.16], dx: 0.45 },
    zh: { m: [9.6, 11, 0.08], l: [9.6, 12, 0.16], dx: 0.3 },
  };
  const keep = {};
  // (in both languages: the count and the passport keep their places when the language changes)
  function keepers(lang) {
    if (keep[lang]) return keep[lang];
    const fam = '"Playfair Display", "Noto Serif TC", serif';
    keep[lang] = [FP.home, ...FP.abroad].filter((c) => RANK(c) <= 2 && PLACE[c.id] && !PLACE[c.id].wrap && !PLACE[c.id].stack).map((c) => {
      const p = PLACE[c.id], size = p.size === 'l' ? 'l' : 'm', [min, base, ls] = FONT[lang][size];
      const name = c.home ? c.name[lang] : c.country[lang], cap = lang === 'zh' ? name : name.toUpperCase();
      const year = c.home ? FP.WORDS[lang].home : String(c.first);
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
    if (!keep.both) keep.both = keepers('en').concat(keepers('zh'));
    return keep.both.some((q) => {
      const fs = Math.max(q.min, q.base * kk), w = q.per * fs;
      const x = ox + q.u[0] * s, y = oy + q.u[1] * s;
      const box = { x: q.a === 'start' ? x : q.a === 'end' ? x - w : x - w / 2, y: y - 0.8 * fs, w, h: 1.05 * fs };
      return overlap(box, r, 6);
    });
  }

  const at = (box, x, y) => ({ x, y, w: box.w, h: box.h, parts: (box.parts || [{ dx: 0, dy: 0, w: box.w, h: box.h }]).map((p) => ({ x: x + p.dx, y: y + p.dy, w: p.w, h: p.h })) });

  // the largest map, at scale s0 * f (no smaller than fMin), whose land and labels keep clear of the
  // count and the passport
  function place(s0, w, h, side, top, bottom, cr, pr, m, fMin) {
    for (let f = 1; f >= Math.max(0.7, fMin) - 1e-9; f -= 0.02) {
      const s = s0 * f;
      const ox0 = side + XR * s, ox1 = w - side - XR * s;
      const oy0 = top - YT * s, oy1 = h - bottom - YB * s;
      const cx = (ox0 + ox1) / 2, cy = (oy0 + oy1) / 2;
      let pick = null, pd = Infinity;
      for (let a = 0; a <= 16; a++) {
        const ox = ox0 + (ox1 - ox0) * (a / 16);
        for (let b = 0; b <= 10; b++) {
          const oy = oy0 + (oy1 - oy0) * (b / 10);
          if (cr.parts.some((p) => landIn(p, s, ox, oy, m)) || landIn(pr, s, ox, oy, 10)) continue;
          if (labelsIn(pr, s, ox, oy) || cr.parts.some((p) => labelsIn(p, s, ox, oy))) continue;
          const d = Math.abs(ox - cx) + Math.abs(oy - cy);
          if (d < pd) { pd = d; pick = { ox, oy }; }
        }
      }
      if (pick) return { f, s, ...pick };
    }
    return null;
  }

  // what a layout is worth: the map most of all, up to near its full size; then the count's size, then
  // the passport's; the passport best in the top right, opposite the count
  const MAPW = 4, FULL = 0.92;
  const gain = (f) => MAPW * Math.min(f, FULL) + 1.5 * Math.max(0, Math.min(f, 1) - FULL);
  const fFor = (g) => (g <= MAPW * FULL ? g / MAPW : FULL + (g - MAPW * FULL) / 1.5);
  const CORNER = [0, 0.16, 0.24]; // top right, bottom right, top left
  const LAYOUT = { beside: 0, tight: 0.03, stack: 0.05 };

  function solve() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 640) return solveNarrow(w, h);
    const side = clamp(w * 0.032, 16, 40), top = 58, bottom = 14;
    const s0 = Math.min((w - 2 * side) / MW, (h - top - bottom) / MH);
    const P0 = Math.round(clamp(Math.min(w * 0.2, h * 0.46), 232, 316));
    const books = [P0, Math.max(210, Math.round(P0 * 0.9))].map((P) => ({ P, pb: setBook(P) }));
    const F0 = Math.min(h * 0.47, w * 0.27);
    let best = null;
    for (const q of [1, 0.94, 0.88, 0.82, 0.76, 0.7]) {
      const F = F0 * q;
      for (const lay of ['beside', 'tight', 'stack']) {
        const cb = setCount(F, lay);
        const cr = at(cb, side, h - bottom - cb.h);
        for (const { P, pb } of books) {
          const corners = [at(pb, w - side - pb.w, top + 6), at(pb, w - side - pb.w, h - bottom - pb.h), at(pb, side, top + 6)];
          corners.forEach((pr, ci) => {
            if (overlap(cr, pr, 24)) return;
            const fixed = 0.8 * q + 0.6 * (P / P0) - CORNER[ci] - LAYOUT[lay];
            if (best && gain(1) + fixed <= best.score) return;
            const fMin = best ? fFor(best.score - fixed) + 1e-6 : 0;
            const fit = place(s0, w, h, side, top, bottom, cr, pr, Math.max(14, F * 0.05), fMin);
            if (!fit) return;
            const score = gain(fit.f) + fixed;
            if (!best || score > best.score) best = { F, lay, P, ci, cr, pr, ...fit, score };
          });
        }
      }
    }
    if (!best) { // nothing clears the land: the map smaller, centred
      const F = F0 * 0.7, cb = setCount(F, 'stack'), s = s0 * 0.7, pb = books[0].pb;
      best = { F, lay: 'stack', P: P0, f: 0.7, s, ox: w / 2, oy: (top - YT * s + h - bottom - YB * s) / 2, cr: at(cb, side, h - bottom - cb.h), pr: at(pb, w - side - pb.w, top + 6) };
    }
    return { w, h, ...best, pb: setBook(best.P) };
  }

  // a phone: the map across the top; the count under it, beside its words and no taller than the
  // map; the passport under that
  function solveNarrow(w, h) {
    const side = 14, top = 70, edge = 16;
    const s = (w - 2 * side) / MW;
    const ox = w / 2, oy = top - YT * s;
    const mapBottom = oy + YB * s, mapH = (YB - YT) * s;
    let F = mapH / 0.7, cb = null;
    for (let i = 0; i < 6; i++) {
      cb = setCount(F, 'tight');
      const q = Math.min((w - 2 * edge) / cb.w, mapH / cb.h);
      if (q >= 1 && q < 1.015) break;
      F *= q > 1 ? Math.min(q, 1.1) : q * 0.995;
    }
    while (cb.w > w - 2 * edge || cb.h > mapH) { F *= 0.98; cb = setCount(F, 'tight'); }
    const cr = at(cb, edge, mapBottom + 30);
    const pb = setBook(Math.min(w - 2 * edge, 300));
    const pr = at(pb, Math.round((w - pb.w) / 2), Math.round(cr.y + cr.h + 30));
    return { w, h, narrow: true, F, lay: 'tight', f: 1, s, ox, oy, cr, pr, pb, room: pr.y + pr.h + 24 };
  }

  /* ------------------------------------------------------------ the sea: graticule, water-lining, neatline */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else ctx.rect(x, y, w, h);
  }
  // the paper left clear under the count and the passport: the engraving fades out round them, no edge
  function clearings() {
    const [n, words2] = G.cr.parts;
    const c = [{ ...n, pad: G.F * 0.035, soft: G.F * 0.07 }, { ...words2, pad: 8, soft: 16 }];
    return c.concat([{ ...G.pr, pad: 6, soft: 24 }]);
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
    ctx.globalAlpha = 0.22;
    ctx.beginPath(); gpath(d3.geoGraticule().step([15, 15]).extentMinor([[-180, SOUTH - 1], [180, 90]])()); ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); gpath({ type: 'LineString', coordinates: d3.range(-180, 181, 2).map((x) => [x, 0]) }); ctx.stroke();

    // the water-lining: lines at a set distance from every coast, closer near the shore,
    // fading out to sea. Distances are measured on the screen, as the engraver measured his plate.
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(lay, 0, 0);
    ctx.restore();

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
    if (!narrow) {
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
    }
  }

  /* ------------------------------------------------------------ the ink: coasts, borders, lettering */

  let labelLayer = null, hitLayer = null, ringLayer = null;
  function drawInk() {
    ink.replaceChildren();
    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const defs = el('defs', {}, ink);
    // the coasts and borders inside the frame, but not under the count or the stamp (a speck of an
    // island there): the clearings cut out of the frame, a plain clip, nothing to redraw
    let d = frame;
    if (!narrow) {
      const rr = (x, y, w, h, r) => `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
      d += clearings().map((c) => { const p = c.pad + c.soft * 0.35; return rr(c.x - p, c.y - p, c.w + 2 * p, c.h + 2 * p, Math.min(p, (c.w + 2 * p) / 2, (c.h + 2 * p) / 2)); }).join('');
    }
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

  // leave out the labels that have no room: those that run into a larger one, the count or the stamp
  function cull() {
    const pad = 3 + 2.5 * clamp((1 - k) / 0.38, 0, 1); // a little more air between names on a smaller map
    const few = k < 0.8; // on a smaller map the small countries go unlettered: the stamp names them
    const taken = G.cr.parts.map((p) => ({ x: p.x - 6, y: p.y - 6, w: p.w + 12, h: p.h + 12 })).concat([{ x: G.pr.x - 2, y: G.pr.y - 2, w: G.pr.w + 4, h: G.pr.h + 4 }]);
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
  function paintAll() {
    washCv.width = washCv.width; // clear
    const ctx = washCv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    washes.forEach((w) => ctx.drawImage(w.cv, w.x0, w.y0, w.w, w.h));
  }

  /* ------------------------------------------------------------ the passport's paper */

  // the security printing of a visa page: fine waves crossing in chains, a hairline in the slate
  // earth colour, as a small tile the pages repeat
  function guilloche() {
    const [r, g, b] = rgb(cssVar('--slate'));
    const TW = 36, TH = 12, A = TH * 0.38;
    let d = '';
    for (let y0 = -TH; y0 <= TH * 2; y0 += TH / 2) {
      for (const ph of [0, Math.PI]) {
        d += 'M' + d3.range(0, TW + 0.01, 1).map((x) => `${x},${(y0 + A * Math.sin((2 * Math.PI * x) / TW + ph)).toFixed(2)}`).join('L');
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}"><path d="${d}" fill="none" stroke="rgb(${r},${g},${b})" stroke-opacity="0.34" stroke-width="0.45"/></svg>`;
    book.style.setProperty('--pp-pattern', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  }

  /* ------------------------------------------------------------ the passport's pages */

  let current = null, flip = 0;

  // a country's stamp, inked onto a page's stamp area (in the page before its words are measured);
  // each a little off centre, as a hand would set it down, the same every time
  function makeStamp(st, spotEl) {
    const { S, vw, vh } = G.pb;
    const nx = (hash01(st.c.id + 'x') - 0.5) * (vw - 1.36 * S) * 0.8;
    const ny = (hash01(st.c.id + 'y') - 0.5) * (vh - 1.04 * S) * 0.8;
    const svg = el('svg', { class: 'os-stamp', viewBox: `${(-vw / 2 - nx).toFixed(1)} ${(-vh / 2 - ny).toFixed(1)} ${vw} ${vh}`, 'aria-hidden': 'true' });
    svg.style.setProperty('--os-ink', st.ink);
    svg.style.setProperty('--st-heavy', `${(S * 0.026).toFixed(2)}px`);
    svg.style.setProperty('--st-thin', `${clamp(S * 0.009, 0.75, 1.2).toFixed(2)}px`);
    spotEl.appendChild(svg);
    arcDefs = el('defs', {}, svg);
    const turned = el('g', { transform: `rotate(${st.rot.toFixed(1)})` }, svg);
    DRAW[st.shape](el('g', { filter: `url(#os-ink-${st.filter})` }, turned), S, wordsOf(st));
    return svg;
  }

  // one page: the running head, the stamp area and the page number. Without a stamp it is a fresh
  // page waiting for one (its stamp area is returned); with no page at all, the inside of the cover.
  function fill(face, st, inked) {
    face.replaceChildren();
    face.classList.toggle('is-cover', !st);
    face.classList.toggle('is-home', !!(st && st.home));
    if (!st) return null;
    const head = document.createElement('p'); head.className = 'pp-head'; head.textContent = caps(t().visas);
    const spotEl = document.createElement('div'); spotEl.className = 'pp-spot';
    const no = document.createElement('p'); no.className = 'pp-no'; no.textContent = caps(t().page(st.page));
    face.append(head, spotEl, no);
    if (inked) makeStamp(st, spotEl);
    return spotEl;
  }

  // the country shown: its wash a little deeper, and a fine ring round it when it is too small to see
  function deepen(st) {
    const w = washes.find((x) => x.c.id === st.c.id);
    flip ^= 1;
    const next = deeps[flip], prev = deeps[flip ^ 1];
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
    if (ringLayer) ringLayer.querySelectorAll('.os-ring').forEach((r) => {
      const on = r.dataset.ring === st.c.id;
      if (on) r.style.setProperty('--os-ink', st.ink);
      r.classList.toggle('is-on', on);
    });
  }

  function describe(st) {
    const name = st.home ? st.c.name[FP.lang] : st.c.country[FP.lang];
    bookIn.setAttribute('aria-label', t().stamp(name, st.home ? FP.w.home : st.j.date[FP.lang], st.page));
  }

  /* ------------------------------------------------------------ turning a page */

  const TURN = 600; // the leaf, about its spine
  const PRESS = 340; // the stamp coming down
  const STEP = 1100; // one country to the next on arrival
  let busy = false, want = null, moving = [], pressT = 0;

  // the spread at once, no turning: the country before on the left, this one on the right
  function settle(st) {
    moving.forEach((a) => a.cancel()); moving = [];
    clearTimeout(pressT); busy = false; want = null;
    leaf.classList.remove('is-on');
    fill(pageL, st.prev, true);
    fill(pageR, st, true);
  }

  // the passport is still again: on to the country asked for meanwhile, or the arrival's next page
  function done() {
    busy = false;
    const next = want; want = null;
    if (next && next !== current) goTo(next, true); else nextRun();
  }

  // the stamp pressed onto the fresh right page, and the map answering
  function press(st, spotEl) {
    const svg = makeStamp(st, spotEl);
    moving.push(svg.animate([{ opacity: 0, transform: 'scale(1.07)' }, { opacity: 1, transform: 'scale(1)' }], { duration: PRESS, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' }));
    deepen(st);
    pressT = setTimeout(done, PRESS);
  }

  // the leaf from one side of the spine to the other; its two faces darken a shade as they turn away
  function turn(from, to, end) {
    leaf.classList.add('is-on');
    const ease = 'cubic-bezier(0.45, 0.05, 0.25, 1)';
    const a = leaf.animate([{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }], { duration: TURN, easing: ease, fill: 'both' });
    const fwd = to < from;
    const dim = (face) => face.querySelector('.pp-shade') || face.appendChild(Object.assign(document.createElement('span'), { className: 'pp-shade' }));
    const sF = dim(faceF), sB = dim(faceB);
    const up = [{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 1 }], down = [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }];
    moving = [a,
      sF.animate(fwd ? up : down, { duration: TURN, easing: ease, fill: 'both' }),
      sB.animate(fwd ? down : up, { duration: TURN, easing: ease, fill: 'both' })];
    // finished once, by the animation or, where frames are held back (a tab out of sight), the clock
    let over = false;
    const mine = moving;
    const finish = () => {
      if (over || moving !== mine) return;
      over = true; clearTimeout(pressT);
      leaf.classList.remove('is-on'); mine.forEach((m) => m.cancel()); moving = [];
      end();
    };
    a.onfinish = finish;
    pressT = setTimeout(finish, TURN + 120);
  }

  // to a country's page: at once, or by one turn however many pages lie between
  function goTo(st, animate) {
    if (busy) { want = st; return; }
    if (st === current) return;
    const from = current;
    current = st;
    describe(st);
    const motion = animate && !FP.reduced && !document.hidden;
    if (!motion) { settle(st); deepen(st); return; }
    busy = true;
    if (!from) { // the passport just opened: home's page, fresh, then its stamp
      fill(pageL, null, false);
      press(st, fill(pageR, st, false));
      return;
    }
    if (st.page > from.page) {
      // forward: the right page turns over to the left, a fresh page under it, then the stamp
      fill(faceF, from, true); fill(faceB, st.prev, true);
      const spotEl = fill(pageR, st, false);
      turn(0, -180, () => { fill(pageL, st.prev, true); press(st, spotEl); });
    } else {
      // back: the left page turns over to the right, already stamped
      fill(faceB, from.prev, true); fill(faceF, st, true);
      fill(pageL, st.prev, true);
      turn(-180, 0, () => { fill(pageR, st, true); deepen(st); done(); });
    }
  }

  // on arrival: home, then through his countries in the order he first went, then rest on the latest.
  // Each page waits for the one before it to be stamped, so none is skipped on a slow machine.
  let runI = -1, runT = 0, stepAt = 0;
  const LAST = PAGES[PAGES.length - 1];
  function run() {
    if (STILL) { goTo(LAST, false); return; }
    runI = 0;
    runT = setTimeout(stepRun, 700);
  }
  function stepRun() {
    if (runI < 0) return;
    if (document.hidden) { runI = -1; goTo(LAST, false); return; } // out of sight: straight to the latest
    stepAt = performance.now();
    goTo(PAGES[runI], true);
  }
  function nextRun() {
    if (runI < 0) return;
    if (runI >= PAGES.length - 1) { runI = -1; return; }
    runI++;
    const gap = runI === 1 ? STEP + 300 : STEP;
    runT = setTimeout(stepRun, Math.max(150, gap - (performance.now() - stepAt)));
  }
  function stopRun() { clearTimeout(runT); runT = 0; runI = -1; }

  /* ------------------------------------------------------------ pointing and tapping */

  function pick(id) {
    const st = stampOf.get(id);
    if (!st) return;
    stopRun();
    goTo(st, true);
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

    // the count and the passport in their corners
    setCount(g.F, g.lay);
    count.style.setProperty('--x', `${g.cr.x.toFixed(1)}px`);
    count.style.setProperty('--y', `${g.cr.y.toFixed(1)}px`);
    book.style.setProperty('--x', `${g.pr.x.toFixed(1)}px`);
    book.style.setProperty('--y', `${g.pr.y.toFixed(1)}px`);
    stage.style.setProperty('--room', narrow ? `${Math.ceil(g.room)}px` : '0px');

    // every layer at the window's size in pixels
    sheet.style.setProperty('--sheet-w', `${W}px`);
    sheet.style.setProperty('--sheet-h', `${H}px`);
    washCv.width = Math.round(W * DPR); washCv.height = Math.round(H * DPR);
    ink.setAttribute('width', W); ink.setAttribute('height', H);
    washes = [FP.home, ...FP.abroad].map((c) => makeWash(c, homeland(c)));
    drawSea(L);
    drawInk();
    drawLabels();
    paintAll();
    if (current) { settle(current); describe(current); deepen(current); if (runI >= 0 && current === PAGES[runI]) nextRun(); }
    return true;
  }

  const fontsIn = Promise.race([
    Promise.all([
      document.fonts.load('400 120px "Playfair Display"', '0123456789%'),
      document.fonts.load('400 40px "Playfair Display"', 'countries ARRIVED'),
      document.fonts.load('500 11px "Geist"', 'of the world 195 VISAS PAGE'),
      document.fonts.load('600 11px "Geist"', 'JAPAN'),
      document.fonts.load('500 40px "Noto Serif TC"', '個國家全世界的'),
      document.fonts.load('500 11px "Noto Sans TC"', '第頁簽證入境火車陸路日本'),
    ]).catch(() => null),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  if (STILL) body.classList.add('is-still');
  Promise.all([FP.world('50m'), FP.world('110m'), fontsIn]).then(([a, lite]) => {
    atlas = a;
    buildLandRaster(topojson.merge(lite.topo, lite.topo.objects.countries.geometries.filter((g) => g.id !== '010')));
    chooseTones();
    guilloche();
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
