/* Footprint, "Only where I have been, tinted / 只有去過的地方，上色版" (round two, 2026-11-06).
   From his round-one notes: the style of the hand-tinted atlas, the size of the count on "Only where
   I have been", and the stamps, but not on the countries. So only his countries are drawn, at their
   true places on an empty sheet whose coasts are a faint dotted line. Each is engraved in ink,
   water-lined along its coast and laid in watercolour from a colourist's box of earth colours;
   Taiwan is clay, home. The count is the hero, as large as the free paper allows without touching a
   country, with the share of the world's countries beside it. Under it, a short row of small entry
   stamps, one per country in the order he first went, each inked a deeper shade of its country's
   wash: pointing at a stamp lights its country, pointing at a country lights its stamp.
   On arrival the washes are laid one by one in that order, each country's stamp with it. The number
   does not count; it is simply there. The map is centred a little east of Greenwich, so the part of
   the world he has not been to (the Americas' south, Africa, the Indian Ocean) lies together in
   the south-west, and the count is set there. */
(() => {
  'use strict';

  const FP = window.FP;
  const NS = 'http://www.w3.org/2000/svg';
  const stage = document.getElementById('stage');
  const body = document.body;
  const q = new URLSearchParams(location.search);

  FP.chrome();
  if (q.get('lang') === 'zh' || q.get('lang') === 'en') FP.setLang(q.get('lang'));

  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const STILL = FP.still || FP.reduced;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const MASK = '#000'; // the stencil for shapes worked on off screen; never seen
  const LAMBDA = +(q.get('lambda') || 22); // the meridian in the middle

  /* ------------------------------------------------------------ words */

  const T = {
    en: {
      share: (c) => keep(`${FP.w.pct(c.share)} ${FP.w.ofWorld(c.world)}`),
      lines: (c) => [`${c.continents} ${FP.w.continents(c.continents)}, ${c.trips} ${FP.w.trips(c.trips)}`, FP.w.span(c.since, c.until)],
      label: 'The countries I have been to',
      stamps: 'A stamp for each country, in the order I first went',
    },
    zh: {
      share: (c) => `${FP.w.ofWorld(c.world)} ${FP.w.pct(c.share)}`,
      lines: (c) => [`${c.continents} ${FP.w.continents()}，${c.trips} ${FP.w.trips()}`, `${c.since} 到 ${c.until} 年`],
      label: '我去過的國家',
      stamps: '每個國家一枚印章，依第一次去的順序',
    },
  };
  const t = () => T[FP.lang];
  // when a line has to break, the last two words stay together
  function keep(s) { return s.replace(/ (\S+)$/, '\u00a0$1'); }

  /* ------------------------------------------------------------ small tools (from tinted.js) */

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
      let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let p = 1; p < len; p++) {
        let s = ((f[p] + p * p) - (f[v[k]] + v[k] * v[k])) / (2 * p - 2 * v[k]);
        while (s <= z[k]) { k--; s = ((f[p] + p * p) - (f[v[k]] + v[k] * v[k])) / (2 * p - 2 * v[k]); }
        k++; v[k] = p; z[k] = s; z[k + 1] = INF;
      }
      for (let p = 0, k2 = 0; p < len; p++) { while (z[k2 + 1] < p) k2++; d[p] = (p - v[k2]) * (p - v[k2]) + f[v[k2]]; }
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
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ------------------------------------------------------------ the order he went in */

  // by his first trip there, then as that trip reached them (as on the passport-stamp page)
  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const visitKey = (c) => `${c.journeys[0]}|${String(journeyById.get(c.journeys[0]).countries.indexOf(c.id)).padStart(2, '0')}`;
  const ORDER = FP.abroad.slice().sort((a, b) => visitKey(a).localeCompare(visitKey(b)));
  const ALL = [FP.home, ...ORDER]; // home is washed first of all

  /* ------------------------------------------------------------ the colourist's box (from tinted.js) */

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function rgb(color) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = MASK;
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  const BOX = ['--ot-ochre', '--ot-terra', '--ot-sage', '--ot-slate', '--ot-mauve', '--ot-verdigris'];
  // each country turns its colour a little, from its own name; its stamp is the same colour, deeper
  function tone(token, seed) {
    const raw = cssVar(token);
    const m = raw.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/);
    if (!m) return { css: raw, rgb: rgb(raw), ink: raw };
    const L = +m[1] + (rand(seed) - 0.5) * 5;
    const C = +m[2] * (0.9 + rand(seed + 1) * 0.2);
    const H = +m[3] + (rand(seed + 2) - 0.5) * 12;
    const css = `oklch(${L.toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)})`;
    const ink = `oklch(${(L - 34).toFixed(1)}% ${Math.min(0.125, C * 1.6).toFixed(3)} ${H.toFixed(1)})`;
    return { css, rgb: rgb(css), ink };
  }

  /* ------------------------------------------------------------ the shapes */

  let atlas = null;          // FP.world('50m')
  let coastAll = null;       // every coast but Antarctica's, as lines, for the dotted line
  const shapes = new Map();  // id -> { c, geom, feature }
  let outer = null, inner = null, mineAll = null;
  const tones = new Map();

  // A country as he knows it. Australia shares its number with the Ashmore reefs, so the largest
  // shape of that number is the country; then the far-off pieces are dropped (Alaska, Hawaii,
  // French Guiana), as on "Only where I have been". Done on the topology, so the coasts and the
  // borders between his countries can be drawn once each.
  function trimmed(c) {
    const gs = atlas.topo.objects.countries.geometries.filter((g) => g.id === c.iso);
    if (!gs.length) return null;
    let g = gs[0], best = -1;
    for (const x of gs) { const a = d3.geoArea(topojson.feature(atlas.topo, x)); if (a > best) { best = a; g = x; } }
    if (g.type !== 'MultiPolygon') return g;
    const ps = g.arcs.map((arcs) => {
      const f = topojson.feature(atlas.topo, { type: 'Polygon', arcs });
      return { arcs, a: d3.geoArea(f), ctr: d3.geoCentroid(f) };
    });
    const main = ps.reduce((m, p) => (p.a > m.a ? p : m), ps[0]);
    const keep = ps.filter((p) => FP.km([main.ctr[1], main.ctr[0]], [p.ctr[1], p.ctr[0]]) < 2600);
    return { type: 'MultiPolygon', id: g.id, properties: g.properties, arcs: keep.map((p) => p.arcs) };
  }

  function prepare() {
    const topo = atlas.topo;
    // as lines, not shapes, so where the edge of the map cuts Alaska no straight edge is drawn
    coastAll = topojson.mesh(topo, topo.objects.countries, (a, b) => a === b && a.id !== '010');
    for (const c of ALL) {
      const geom = trimmed(c);
      if (geom) shapes.set(c.id, { c, geom, feature: topojson.feature(topo, geom) });
    }
    const coll = { type: 'GeometryCollection', geometries: [...shapes.values()].map((s) => s.geom) };
    outer = topojson.mesh(topo, coll, (a, b) => a === b); // coasts, and the edge against lands he has not been to
    inner = topojson.mesh(topo, coll, (a, b) => a !== b); // borders between two of his countries
    mineAll = { type: 'FeatureCollection', features: [...shapes.values()].map((s) => s.feature) };
    chooseTones();
  }

  // the colourist's choice: countries that touch, or lie a short sea apart, take different colours;
  // among the free ones, the colour least used so far (from tinted.js)
  function chooseTones() {
    const geoms = atlas.topo.objects.countries.geometries;
    const nb = topojson.neighbors(geoms);
    const touch = new Map();
    geoms.forEach((g, i) => { const set = touch.get(g.id) || new Set(); nb[i].forEach((j) => set.add(geoms[j].id)); touch.set(g.id, set); });
    const outline = new Map(ORDER.map((c) => {
      const s = shapes.get(c.id), pts = [];
      if (s) {
        const gm = s.feature.geometry;
        const polys = gm.type === 'Polygon' ? [gm.coordinates] : gm.type === 'MultiPolygon' ? gm.coordinates : [];
        polys.forEach((poly) => poly.forEach((ring) => ring.forEach((pt) => pts.push(pt))));
      }
      const step = Math.max(1, Math.floor(pts.length / 260));
      return [c.id, pts.filter((_, i) => i % step === 0).map(([x, y]) => [x * Math.PI / 180, y * Math.PI / 180])];
    }));
    const apart = (a, b) => { // km, roughly the narrowest sea between them
      const A = outline.get(a.id), B = outline.get(b.id);
      if (!A || !B || !A.length || !B.length) return Infinity;
      let m = Infinity;
      for (const p of A) for (const r of B) {
        const dl = r[1] - p[1], dn = r[0] - p[0];
        const h = Math.sin(dl / 2) ** 2 + Math.cos(p[1]) * Math.cos(r[1]) * Math.sin(dn / 2) ** 2;
        if (h < m) m = h;
      }
      return 2 * 6371 * Math.asin(Math.sqrt(m));
    };
    const picked = [], count = BOX.map(() => 0);
    const homeCss = cssVar('--ot-home');
    tones.set(FP.home.id, { css: homeCss, rgb: rgb(homeCss), ink: homeCss });
    ORDER.forEach((c) => {
      const near = picked.map((p) => {
        if ((touch.get(c.iso) || new Set()).has(p.c.iso)) return { b: p.b, w: 12 };
        const km = apart(c, p.c);
        return { b: p.b, w: km < 1400 ? 1 + 8 * (1 - km / 1400) : 0 };
      });
      // and the stamp beside it in the row: a different colour from the one before
      if (picked.length) near.push({ b: picked[picked.length - 1].b, w: 2 });
      const cost = BOX.map((_, b) => near.reduce((sum, n) => sum + (n.b === b ? n.w : 0), 0) + count[b] * 0.05);
      const b = cost.indexOf(Math.min(...cost));
      picked.push({ c, b }); count[b]++;
      tones.set(c.id, tone(BOX[b], hashStr(c.id)));
    });
  }

  /* ------------------------------------------------------------ the page */

  const sheet = document.createElement('div'); sheet.className = 'ot-sheet';
  const ghost = el('svg', { class: 'ot-ghost', 'aria-hidden': 'true' });
  const sea = document.createElement('canvas'); sea.className = 'ot-sea';
  const washCv = document.createElement('canvas'); washCv.className = 'ot-wash';
  const ink = el('svg', { class: 'ot-ink', 'aria-hidden': 'true' });
  sheet.append(ghost, sea, washCv, ink);

  const block = document.createElement('div');
  block.className = 'ot-count';
  block.innerHTML = `<div class="ot-count__top" aria-hidden="true"><div class="ot-count__n"></div><div class="ot-count__side">
      <div class="ot-count__w"></div><p class="ot-count__share"></p><p class="ot-count__line fp-label"></p></div></div>
    <ol class="ot-stamps"></ol>`;
  const top = block.querySelector('.ot-count__top');
  const list = block.querySelector('.ot-stamps');
  const sr = document.createElement('h1'); sr.className = 'ot-sr';
  stage.append(sheet, block, sr);

  // the stamps' ink: uneven cover, a slightly rough edge, a few versions so no two print alike
  // (from stamps.js, lighter, for stamps this small)
  const FILTERS = 5;
  const inkDefs = el('svg', { class: 'ot-defs', width: 0, height: 0, 'aria-hidden': 'true' });
  document.body.appendChild(inkDefs);
  const defs = el('defs', {}, inkDefs);
  for (let i = 0; i < FILTERS; i++) {
    const f = el('filter', { id: `ot-ink-${i}`, x: '-10%', y: '-10%', width: '120%', height: '120%', 'color-interpolation-filters': 'sRGB' }, defs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: String(3 + i * 7), result: 'fine' }, f);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.07', numOctaves: '2', seed: String(41 + i * 13), result: 'blot' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'fine', scale: '0.55', xChannelSelector: 'R', yChannelSelector: 'G', result: 'rough' }, f);
    el('feColorMatrix', { in: 'fine', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  12 0 0 0 -3.0', result: 'speck' }, f);
    el('feColorMatrix', { in: 'blot', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 0.25', result: 'patch' }, f);
    el('feComposite', { in: 'speck', in2: 'patch', operator: 'arithmetic', k1: '1', k2: '0', k3: '0', k4: '0', result: 'cover' }, f);
    el('feComposite', { in: 'rough', in2: 'cover', operator: 'in' }, f);
  }

  /* ------------------------------------------------------------ the stamps */

  // at this size every shape but the round one is a wide one, so a name has room; the round one
  // carries its name on the arc, and only a short name
  const SHAPES_LONG = ['rect', 'oval', 'octagon', 'hex'];
  const SHAPES_SHORT = ['ring', 'rect', 'oval', 'octagon', 'hex'];
  const DIMS = { ring: 1, rect: 1.4, oval: 1.42, octagon: 1.38, hex: 1.42 }; // width against height

  // the name in capitals, in one line or two
  function nameLines(c) {
    const name = c.country[FP.lang];
    if (FP.lang === 'zh') return name.length > 5 ? [name.slice(0, 3), name.slice(3)] : [name];
    const caps = name.toUpperCase();
    if (caps.length <= 9 || !caps.includes(' ')) return [caps];
    const words = caps.split(' ');
    let bestCut = 1, bestD = Infinity;
    for (let i = 1; i < words.length; i++) {
      const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (d < bestD) { bestD = d; bestCut = i; }
    }
    return [words.slice(0, bestCut).join(' '), words.slice(bestCut).join(' ')];
  }

  const stamps = ORDER.map((c, i) => ({ c, i, rot: (rand(hashStr(c.id) + 5) - 0.5) * 7, li: null, svg: null, shape: null }));
  // shapes: varied along the row, never the same as the one before or the one above it;
  // the long names in the wide ones (by both names, so a stamp keeps its shape in both languages)
  function dress(cols) {
    stamps.forEach((st, i) => {
      const en = st.c.country.en;
      const longName = en.length > 8 || st.c.country.zh.length > 3;
      // a long single word wants the full width at the top, which the pointed hexagon has not
      const pool = longName ? SHAPES_LONG.filter((x) => !(x === 'hex' && en.length > 9 && !en.includes(' '))) : SHAPES_SHORT;
      const avoid = new Set([i > 0 ? stamps[i - 1].shape : null, i >= cols ? stamps[i - cols].shape : null]);
      const ok = pool.filter((s) => !avoid.has(s));
      const from = ok.length ? ok : pool;
      st.shape = from[Math.floor(rand(hashStr(st.c.id) + 17) * from.length)];
    });
  }

  function buildStamps() {
    list.replaceChildren();
    stamps.forEach((st) => {
      const li = document.createElement('li');
      li.className = 'ot-stamp';
      li.tabIndex = 0;
      li.dataset.id = st.c.id;
      li.style.setProperty('--st-ink', tones.get(st.c.id).ink);
      const svg = el('svg', { 'aria-hidden': 'true' }, li);
      st.li = li; st.svg = svg;
      if (shown.has(st.c.id)) li.classList.add('is-in');
      list.appendChild(li);
    });
  }

  // fit a line of text to a width, by shrinking it
  function fit(tx, max) {
    const len = tx.getComputedTextLength();
    if (len > max) tx.setAttribute('font-size', (parseFloat(tx.getAttribute('font-size')) * (max / len)).toFixed(2));
    return tx;
  }
  function text(g, cls, str, x, y, size, max) {
    const tx = el('text', { class: cls, x: x.toFixed(2), y: y.toFixed(2), 'font-size': size.toFixed(2), 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
    tx.textContent = str;
    return max ? fit(tx, max) : tx;
  }

  // name and year in the middle of a shape: one line of name or two, a rule, the year
  function nameYear(g, H, lines, year, at, nameW, yearW) {
    // 中文 names are a few characters: set larger, so they can be read
    const ns = H * (FP.lang === 'zh' ? (lines.length > 1 ? 0.14 : 0.18) : (lines.length > 1 ? 0.12 : 0.135));
    if (lines.length > 1) {
      text(g, 'ot-st-name', lines[0], 0, at.n - ns * 0.62, ns, nameW);
      text(g, 'ot-st-name', lines[1], 0, at.n + ns * 0.62, ns, nameW);
    } else {
      text(g, 'ot-st-name', lines[0], 0, at.n, ns, nameW);
    }
    text(g, 'ot-st-year', year, 0, at.y, H * (at.ys || (lines.length > 1 ? 0.3 : 0.34)), yearW);
  }

  // each shape draws itself around (0, 0) at height H
  const DRAW = {
    rect(g, H, lines, year) {
      const W = H * DIMS.rect, i = H * 0.085;
      el('rect', { class: 'ot-st-edge', x: -W / 2, y: -H / 2, width: W, height: H }, g);
      el('rect', { class: 'ot-st-line', x: -W / 2 + i, y: -H / 2 + i, width: W - 2 * i, height: H - 2 * i }, g);
      const two = lines.length > 1;
      const ruleY = two ? H * 0.0 : -H * 0.06;
      el('line', { class: 'ot-st-line', x1: -W / 2 + i, x2: W / 2 - i, y1: ruleY, y2: ruleY }, g);
      nameYear(g, H, lines, year, { n: two ? -H * 0.19 : -H * 0.21, y: two ? H * 0.2 : H * 0.17 }, W - 4 * i, W - 5 * i);
    },
    oval(g, H, lines, year) {
      const rx = H * DIMS.oval / 2, ry = H / 2;
      el('ellipse', { class: 'ot-st-edge', rx, ry }, g);
      el('ellipse', { class: 'ot-st-line', rx: rx - H * 0.08, ry: ry - H * 0.08 }, g);
      const two = lines.length > 1;
      nameYear(g, H, lines, year, { n: two ? -H * 0.15 : -H * 0.17, y: H * 0.16 }, rx * (two ? 1.15 : 1.25), rx * 1.2);
    },
    ring(g, H, lines, year, id) {
      const R = H / 2, ri = R * 0.6, rm = (R + ri) / 2 - H * 0.012;
      el('circle', { class: 'ot-st-edge', r: R - H * 0.02 }, g);
      el('circle', { class: 'ot-st-line', r: ri }, g);
      const arcId = `ot-arc-${id}`;
      el('path', { id: arcId, d: `M ${-rm} 0 A ${rm} ${rm} 0 0 1 ${rm} 0`, fill: 'none' }, el('defs', {}, g));
      const tx = el('text', { class: 'ot-st-name', 'font-size': (H * (FP.lang === 'zh' ? 0.15 : 0.12)).toFixed(2), 'dominant-baseline': 'central' }, g);
      const tp = el('textPath', { href: `#${arcId}`, startOffset: '50%', 'text-anchor': 'middle' }, tx);
      tp.textContent = lines.join(FP.lang === 'zh' ? '' : ' ');
      fit(tx, rm * 2.5);
      el('circle', { class: 'ot-st-fill', cx: -rm, cy: H * 0.06, r: H * 0.022 }, g);
      el('circle', { class: 'ot-st-fill', cx: rm, cy: H * 0.06, r: H * 0.022 }, g);
      text(g, 'ot-st-year', year, 0, H * 0.02, H * 0.25, ri * 1.66);
    },
    // a rectangle with its corners cut
    octagon(g, H, lines, year) {
      const W = H * DIMS.octagon;
      const cut = (w, h, c) => [[-w / 2 + c, -h / 2], [w / 2 - c, -h / 2], [w / 2, -h / 2 + c], [w / 2, h / 2 - c], [w / 2 - c, h / 2], [-w / 2 + c, h / 2], [-w / 2, h / 2 - c], [-w / 2, -h / 2 + c]]
        .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
      const i = H * 0.085;
      el('polygon', { class: 'ot-st-edge', points: cut(W, H, H * 0.22) }, g);
      el('polygon', { class: 'ot-st-line', points: cut(W - 2 * i, H - 2 * i, H * 0.22 - i * 0.41) }, g);
      const two = lines.length > 1;
      nameYear(g, H, lines, year, { n: two ? -H * 0.15 : -H * 0.18, y: H * 0.17, ys: two ? 0.28 : 0.32 }, W - 4.5 * i, W - 6 * i);
    },
    // a long hexagon, pointed at both ends
    hex(g, H, lines, year) {
      const W = H * DIMS.hex;
      const hx = (w, h, c) => [[-w / 2, 0], [-w / 2 + c, -h / 2], [w / 2 - c, -h / 2], [w / 2, 0], [w / 2 - c, h / 2], [-w / 2 + c, h / 2]]
        .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
      const i = H * 0.085;
      el('polygon', { class: 'ot-st-edge', points: hx(W, H, H * 0.27) }, g);
      el('polygon', { class: 'ot-st-line', points: hx(W - 2.4 * i, H - 2 * i, H * 0.27 - i * 0.2) }, g);
      const two = lines.length > 1;
      nameYear(g, H, lines, year, { n: two ? -H * 0.15 : -H * 0.18, y: H * 0.17, ys: two ? 0.28 : 0.32 }, W - 6.8 * i, W - 7 * i);
    },
  };

  function drawStamps(cw, ch, H) {
    stamps.forEach((st) => {
      const svg = st.svg;
      svg.replaceChildren();
      svg.setAttribute('viewBox', `${(-cw / 2).toFixed(2)} ${(-ch / 2).toFixed(2)} ${cw.toFixed(2)} ${ch.toFixed(2)}`);
      const g = el('g', { transform: `rotate(${st.rot.toFixed(2)})` }, svg);
      const inked = el('g', { filter: `url(#ot-ink-${st.i % FILTERS})` }, g);
      DRAW[st.shape](inked, H, nameLines(st.c), String(st.c.first), st.i);
      st.li.setAttribute('aria-label', `${st.c.country[FP.lang]}, ${st.c.first}`);
    });
    svgStyle(H);
  }
  function svgStyle(H) {
    list.style.setProperty('--st-heavy', `${(H * 0.045).toFixed(2)}px`);
    list.style.setProperty('--st-thin', `${clamp(H * 0.016, 0.6, 1).toFixed(2)}px`);
  }

  /* ------------------------------------------------------------ the count */

  function words() {
    const c = FP.counts;
    block.querySelector('.ot-count__n').textContent = FP.fmt(c.countries);
    block.querySelector('.ot-count__w').textContent = FP.w.countries(c.countries);
    block.querySelector('.ot-count__share').textContent = t().share(c);
    block.querySelector('.ot-count__line').innerHTML = t().lines(c).map((s) => `<span>${FP.esc(s)}</span>`).join('');
    list.setAttribute('aria-label', t().stamps);
    const sep = FP.lang === 'zh' ? '，' : ', ';
    sr.textContent = `${t().label}${FP.lang === 'zh' ? '：' : ': '}${FP.fmt(c.countries)} ${FP.w.countries(c.countries)}${sep}${t().share(c)}${sep}${t().lines(c).join(sep)}`;
  }

  // the block at a given size: the count, and the stamps under it as wide as the count
  // (two rows of ten; on a phone too narrow for ten, four rows of five)
  let grid = null;
  function sizeBlock(f, narrow, avail) {
    block.style.setProperty('--f', `${f.toFixed(1)}px`);
    const tw = top.getBoundingClientRect().width;
    const cols = narrow && avail < 660 ? 5 : 10;
    const cw = narrow ? Math.min(cols === 5 ? 92 : 80, avail / cols) : clamp(tw / cols, 66, 94);
    const H = cw * 0.6;           // a stamp's height; the widest is 1.42 times it
    const ch = Math.round(H * 1.26);
    grid = { cols, cw, ch, H, f };
    block.style.setProperty('--cols', cols);
    block.style.setProperty('--rows', Math.ceil(stamps.length / cols));
    block.style.setProperty('--cw', `${cw.toFixed(2)}px`);
    block.style.setProperty('--ch', `${ch}px`);
    block.style.setProperty('--sgap', `${Math.round(clamp(f * 0.075, 16, 34))}px`);
    return block.getBoundingClientRect();
  }

  /* ------------------------------------------------------------ the layout */

  // the sheet: every longitude, from the far north of Europe to the south of New Zealand
  const FRAME = { type: 'MultiPoint', coordinates: [] };
  for (let lng = -180; lng <= 180; lng += 2.5) for (const lat of [72, 0, -50]) FRAME.coordinates.push([lng, lat]);

  let W = 0, H = 0, narrow = false, edge = 16;
  const TOP = 64; // under the slim top bar
  let proj = null, path = null, k = 1, sp = 1;
  let box = null; // where the count sits, in stage pixels

  // the projection for one way of setting the map: against the top bar or in the middle, at full
  // size or a little smaller (a short window), in the middle of the width or against its right edge
  function projection(align, scale = 1, hx = 'center') {
    const p = d3.geoEqualEarth().rotate([-LAMBDA, 0]).precision(0.2);
    if (narrow) {
      p.fitWidth(W - edge * 2, mineAll);
    } else {
      p.fitSize([W - edge * 2, H - TOP - 12], FRAME);
      p.scale(p.scale() * scale);
    }
    const fb = d3.geoPath(p).bounds(narrow ? mineAll : FRAME);
    const mh = fb[1][1] - fb[0][1], mw = fb[1][0] - fb[0][0];
    const room = H - TOP - 8;
    const y0 = narrow || align === 'top' ? TOP + (narrow ? 14 : 4) : TOP + Math.max(4, (room - mh) / 2);
    const x0 = hx === 'right' ? W - edge - mw : (W - mw) / 2;
    const t0 = p.translate();
    p.translate([t0[0] - fb[0][0] + x0, t0[1] - fb[0][1] + y0]);
    return { p, top: y0, bottom: y0 + mh, scale };
  }

  // Paint his countries (and a margin round them) on a small unseen canvas, then look for the
  // largest count that fits where nothing is, nearest the empty South Atlantic.
  function search(P) {
    const s = 0.25; // a cell is four pixels
    const cw = Math.ceil(W * s), ch = Math.ceil(H * s);
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.scale(s, s);
    ctx.fillStyle = MASK; ctx.strokeStyle = MASK;
    const margin = Math.max(34, W * 0.03);
    ctx.lineWidth = margin * 2; ctx.lineJoin = 'round';
    const p2 = d3.geoPath(P.p, ctx);
    for (const sh of shapes.values()) { ctx.beginPath(); p2(sh.feature); ctx.fill(); ctx.stroke(); }
    // the small ones and the word Home, with the same margin
    for (const c of ALL) {
      const at = P.p([c.ll[1], c.ll[0]]);
      ctx.beginPath(); ctx.arc(at[0], at[1], 6 + margin, 0, Math.PI * 2); ctx.fill();
    }
    const tw = P.p([123.4, 22.4]);
    ctx.fillRect(tw[0] - margin, tw[1] - 8 - margin, 60 + margin * 2, 16 + margin * 2);
    ctx.fillRect(0, 0, W, TOP + 8);
    ctx.fillRect(0, 0, edge, H); ctx.fillRect(W - edge, 0, edge, H);
    ctx.fillRect(0, H - 14, W, 14);
    const px = ctx.getImageData(0, 0, cw, ch).data;
    const S = new Int32Array((cw + 1) * (ch + 1));
    for (let y = 0; y < ch; y++) {
      let row = 0;
      for (let x = 0; x < cw; x++) {
        row += px[(y * cw + x) * 4 + 3] > 10 ? 1 : 0;
        S[(y + 1) * (cw + 1) + x + 1] = S[y * (cw + 1) + x + 1] + row;
      }
    }
    const taken = (x0, y0, x1, y1) => S[y1 * (cw + 1) + x1] - S[y0 * (cw + 1) + x1] - S[y1 * (cw + 1) + x0] + S[y0 * (cw + 1) + x0];
    const want = P.p([-22, -26]);
    const fitAt = (i) => {
      const r = dimsAt(i);
      const bw = Math.ceil(r.width * s) + 1, bh = Math.ceil(r.height * s) + 1;
      let best = null, bestD = Infinity;
      if (bw < cw && bh < ch) {
        for (let y = 0; y + bh <= ch; y++) {
          for (let x = 0; x + bw <= cw; x++) {
            if (taken(x, y, x + bw, y + bh)) continue;
            const d = Math.hypot((x + bw / 2) / s - want[0], (y + bh / 2) / s - want[1]);
            if (d < bestD) { bestD = d; best = [x / s, y / s]; }
          }
        }
      }
      return best;
    };
    // the sizes, largest first; the block only grows with the size, so halve the way to the largest that fits
    const last = sizes.length - 1;
    if (!fitAt(last)) return null;
    let lo = 0, hi = last;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (fitAt(mid)) hi = mid; else lo = mid + 1; }
    return { f: sizes[lo], at: fitAt(lo) };
  }

  // the count's possible sizes, each a little smaller than the one before, and the block's size at
  // each, measured once per layout
  let sizes = [], dims = new Map();
  function dimsAt(i) {
    if (!dims.has(i)) { const r = sizeBlock(sizes[i], false); dims.set(i, { width: r.width, height: r.height }); }
    return dims.get(i);
  }

  function layout() {
    body.classList.remove('is-scroll');
    stage.style.removeProperty('--tall');
    W = stage.clientWidth; H = stage.clientHeight;
    narrow = W < 700 || W / H < 1.05;
    body.classList.toggle('is-narrow', narrow);
    edge = Math.max(16, Math.min(40, W * 0.032));

    let P, place;
    if (!narrow) {
      // the map at full size if the count can still be large; on a short window a little smaller,
      // so the count and its stamps have room. Against the top bar or in the middle, whichever
      // leaves the count larger (the middle unless the top is clearly better).
      const want = H * 0.34;
      sizes = []; dims = new Map();
      for (let f = Math.min((H * 0.52) / 0.74, W * 0.42); f >= 56; f *= 0.96) sizes.push(f);
      let pick = null;
      for (const sc of [1, 0.92, 0.84, 0.76]) {
        const cands = [];
        for (const hx of sc < 1 ? ['center', 'right'] : ['center']) {
          for (const align of ['middle', 'top']) {
            const P1 = projection(align, sc, hx);
            const r = search(P1);
            if (r) cands.push({ P: P1, r });
          }
        }
        if (!cands.length) continue;
        const top1 = cands.reduce((a, b) => (b.r.f > a.r.f * 1.04 ? b : a));
        if (!pick || top1.r.f * Math.pow(sc, 1.5) > pick.r.f * Math.pow(pick.P.scale, 1.5)) pick = top1;
        if (top1.r.f >= want) { pick = top1; break; }
      }
      if (pick) { P = pick.P; place = pick.r; } else { P = projection('middle'); place = null; }
      if (place) { sizeBlock(place.f, false); put(place.at); }
      else { sizeBlock(64, false); put([edge, H - 14 - block.getBoundingClientRect().height]); }
    } else {
      // a phone: the map across the top, then the count as wide as the screen allows, then the stamps
      P = projection('top');
      const avail = W - edge * 2;
      let f = Math.min(avail * 0.62, (H * 0.3) / 0.74);
      for (let i = 0; i < 40; i++) {
        sizeBlock(f, true, avail);
        if (top.getBoundingClientRect().width <= avail) break;
        f *= 0.96;
      }
      // the map, the count and the stamps share the height: the spare room above, between, below
      const gap = Math.max(30, H * 0.04);
      const rb = block.getBoundingClientRect();
      const free = Math.max(0, H - (P.bottom - P.top) - gap - rb.height - TOP - 24);
      if (free > 0) {
        P = projection('top');
        const dy = free * 0.3;
        const tr = P.p.translate();
        P.p.translate([tr[0], tr[1] + dy]);
        P.top += dy; P.bottom += dy;
      }
      const y = P.bottom + gap + free * 0.3;
      put([edge, y]);
      const tall = Math.ceil(y + rb.height + 24);
      if (tall > H) { body.classList.add('is-scroll'); stage.style.setProperty('--tall', `${tall}px`); H = tall; }
    }
    proj = P.p;
    if (narrow) proj.clipExtent([[0, P.top - 26], [W, P.bottom + 26]]);
    path = d3.geoPath(proj);
    k = clamp(proj.scale() / 251, 0.62, 1.2);
    sp = clamp(proj.scale() / 251, 0.62, 1.15);
    const sb = stage.getBoundingClientRect(), rb = block.getBoundingClientRect();
    box = { x: rb.left - sb.left, y: rb.top - sb.top, w: rb.width, h: rb.height };
  }

  function put(at) {
    block.style.setProperty('--x', `${Math.round(at[0])}px`);
    block.style.setProperty('--y', `${Math.round(at[1])}px`);
  }

  /* ------------------------------------------------------------ the faint coast of the world */

  function drawGhost() {
    ghost.replaceChildren();
    ghost.setAttribute('viewBox', `0 0 ${W} ${H}`);
    ghost.setAttribute('width', W); ghost.setAttribute('height', H);
    ghost.style.setProperty('--dot', `${clamp(proj.scale() / 70, 2.2, 3.4).toFixed(2)}`);
    // the dotted coast stops short of the count, so the number stands on clean paper
    const pad = 16;
    const m = el('mask', { id: 'ot-knock', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, el('defs', {}, ghost));
    // mask values, not colours: white keeps, black hides; the far north fades out under the top bar
    const lg = el('linearGradient', { id: 'ot-north', gradientUnits: 'userSpaceOnUse', x1: 0, y1: TOP - 14, x2: 0, y2: TOP + 26 }, m.parentNode);
    el('stop', { offset: 0, 'stop-color': '#000' }, lg);
    el('stop', { offset: 1, 'stop-color': '#fff' }, lg);
    if (narrow) { // on a phone the sheet is cut above and below the map: the coast fades out at both
      const [[, c0], [, c1]] = proj.clipExtent();
      lg.setAttribute('y1', c0); lg.setAttribute('y2', c1);
      lg.replaceChildren();
      [[0, '#000'], [22 / (c1 - c0), '#fff'], [1 - 22 / (c1 - c0), '#fff'], [1, '#000']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, lg));
    }
    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#ot-north)' }, m);
    el('rect', { x: box.x - pad, y: box.y - pad, width: box.w + pad * 2, height: box.h + pad * 2, fill: '#000' }, m);
    el('path', { class: 'ot-coast', d: path(coastAll), mask: 'url(#ot-knock)' }, ghost);
  }

  /* ------------------------------------------------------------ the water-lining (from tinted.js) */

  // lines at a set distance from his coasts, closer near the shore, fading out to sea; only on the
  // water, never over land he has not been to
  let waterLines = null; // the lines before the count's paper is cut from them
  function drawSea() {
    sea.width = Math.round(W * DPR); sea.height = Math.round(H * DPR);
    const ctx = sea.getContext('2d');
    if (!waterLines) waterLines = makeWaterLines();
    ctx.drawImage(waterLines, 0, 0);
    // off the paper under the count
    const pad = 16;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);
  }
  function makeWaterLines() {
    const water = cssVar('--ot-water');
    const g = narrow ? 1 : 1.25; // css px per cell
    const reach = 90 * sp; // well past the last line, so the grid's own edge is never seen
    const mb = path.bounds(mineAll);
    const x0 = Math.floor(mb[0][0] - reach), y0 = Math.floor(mb[0][1] - reach);
    const gw = Math.ceil((mb[1][0] - mb[0][0] + 2 * reach) / g), gh = Math.ceil((mb[1][1] - mb[0][1] + 2 * reach) / g);
    const mask = document.createElement('canvas'); mask.width = gw; mask.height = gh;
    const mc = mask.getContext('2d', { willReadFrequently: true });
    mc.setTransform(1 / g, 0, 0, 1 / g, -x0 / g, -y0 / g);
    mc.beginPath(); d3.geoPath(proj, mc)(mineAll); mc.fillStyle = MASK; mc.fill();
    const md = mc.getImageData(0, 0, gw, gh).data;
    const field = new Float64Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) field[i] = md[i * 4 + 3] > 110 ? 0 : INF;
    edt(field, gw, gh);
    for (let i = 0; i < gw * gh; i++) field[i] = Math.sqrt(field[i]) * g;

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
    lc.save();
    lc.beginPath(); lc.rect(2, 2, gw - 4, gh - 4); lc.clip(); // the contours close along the grid's edge: not drawn
    contours.forEach((c, i) => {
      lc.globalAlpha = 0.66 * Math.pow(1 - i / lines, 1.4);
      lc.beginPath(); cpath(c); lc.stroke();
    });
    lc.restore();
    lc.globalAlpha = 1; lc.globalCompositeOperation = 'destination-in';
    lc.imageSmoothingEnabled = true;
    lc.drawImage(fade, 0, 0, gw, gh);
    // the water only: off every land
    lc.setTransform(DPR, 0, 0, DPR, 0, 0);
    lc.globalCompositeOperation = 'destination-out';
    lc.beginPath(); d3.geoPath(proj, lc)(atlas.land); lc.fillStyle = MASK; lc.fill();
    if (narrow) { lc.fillRect(0, 0, W, Math.max(0, proj.clipExtent()[0][1])); lc.fillRect(0, proj.clipExtent()[1][1], W, H); }
    return lay;
  }

  /* ------------------------------------------------------------ the washes (from tinted.js) */

  let washes = [];
  // one sheet of wash per country: the shape a little off the line, the edge uneven, pigment pooled
  // along it, mottled in the middle, the paper's tooth showing through
  function makeWash(c, feature) {
    const seed = hashStr(c.id) & 0xffff;
    const col = tones.get(c.id).rgb;
    const area = feature ? path.area(feature) : 0;
    let dab = null;
    if (!feature || area < 30) {
      const at = proj([c.ll[1], c.ll[0]]);
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
    const reachW = Math.max(...corners.map(([cx, cy]) => Math.hypot(cx - from[0], cy - from[1])));
    return { c, feature, cv, x0, y0, w: x1 - x0, h: y1 - y0, from, reach: reachW, dab, seed };
  }

  /* ------------------------------------------------------------ laying the washes */

  // Taiwan first, then each country in the order he first went, its stamp with it
  const T_HOME = 0.2, T_FIRST = 0.6, T_STEP = 0.16, T_SPREAD = 0.85;
  const startOf = (i) => (i === 0 ? T_HOME : T_FIRST + (i - 1) * T_STEP);
  const easeOut = (x) => 1 - Math.pow(1 - x, 2.4); // quick to wet, slow to reach the edge

  function blob(ctx, w, r, innerR) {
    const n = 96, s = w.seed;
    const p1 = rand(s + 11) * 6.3, p2 = rand(s + 12) * 6.3, p3 = rand(s + 13) * 6.3;
    const pt = (j, rr) => {
      const a = (j / n) * Math.PI * 2;
      const qq = rr * (1 + 0.075 * Math.sin(3 * a + p1) + 0.045 * Math.sin(5 * a + p2) + 0.025 * Math.sin(11 * a + p3) + 0.012 * Math.sin(23 * a + p1 * 2));
      return [w.from[0] + Math.cos(a) * qq, w.from[1] + Math.sin(a) * qq];
    };
    ctx.beginPath();
    for (let j = 0; j <= n; j++) { const [x, y] = pt(j, r); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    if (innerR != null) for (let j = n; j >= 0; j--) { const [x, y] = pt(j, innerR); if (j === n) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.closePath();
  }

  let focus = null; // the country lit by the pointer
  function paint(time) {
    washCv.width = washCv.width; // clear
    const ctx = washCv.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let busy = false;
    washes.forEach((w, i) => {
      const p = time == null ? 1 : clamp((time - startOf(i)) / T_SPREAD, 0, 1);
      if (p <= 0) { busy = true; return; }
      const lit = focus === w.c.id;
      const a = focus && !lit ? 0.28 : 1;
      if (p >= 1) {
        ctx.globalAlpha = a; ctx.drawImage(w.cv, w.x0, w.y0, w.w, w.h);
        if (lit) { ctx.globalAlpha = 0.6; ctx.drawImage(w.cv, w.x0, w.y0, w.w, w.h); }
        return;
      }
      busy = true;
      const r = Math.max(2, w.reach * 1.12 * easeOut(p));
      ctx.save(); blob(ctx, w, r); ctx.clip();
      ctx.globalAlpha = a; ctx.drawImage(w.cv, w.x0, w.y0, w.w, w.h);
      ctx.restore();
      // the wet edge: pigment carried to the front, darker while it moves
      ctx.save(); blob(ctx, w, r, r * 0.86); ctx.clip('evenodd');
      ctx.globalAlpha = a * 0.75 * (1 - p);
      ctx.drawImage(w.cv, w.x0, w.y0, w.w, w.h);
      ctx.restore();
    });
    return busy;
  }

  let t0 = 0, raf = 0;
  function frameLoop(now) {
    if (paint((now - t0) / 1000)) raf = requestAnimationFrame(frameLoop);
    else { raf = 0; stage.classList.remove('is-arriving'); }
  }

  // the stamps come with their washes
  const shown = new Set();
  const timers = [];
  function arrive() {
    if (STILL) { ORDER.forEach((c) => shown.add(c.id)); stamps.forEach((st) => st.li.classList.add('is-in')); return; }
    stage.classList.add('is-arriving');
    stamps.forEach((st, i) => {
      timers.push(setTimeout(() => {
        shown.add(st.c.id);
        if (st.li) st.li.classList.add('is-in');
      }, (startOf(i + 1) + 0.12) * 1000));
    });
    t0 = performance.now();
    raf = requestAnimationFrame(frameLoop);
  }

  /* ------------------------------------------------------------ the ink: edges, home, the hit areas */

  function drawInk() {
    ink.replaceChildren();
    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    ink.setAttribute('width', W); ink.setAttribute('height', H);
    const g = el('g', {}, ink);
    el('path', { class: 'ot-inner', d: path(inner) || '' }, g);
    el('path', { class: 'ot-outer', d: path(outer) || '' }, g);
    // a country's own outline, drawn heavier while it is lit
    const lit = el('g', {}, ink);
    for (const s of shapes.values()) el('path', { class: 'ot-edge', d: path(s.feature) || '', 'data-edge': s.c.id }, lit);
    // the small ones get a ring, so a dab of colour has something to sit in
    washes.filter((w) => w.dab).forEach((w) => el('circle', { class: 'ot-dot', cx: w.dab[0].toFixed(1), cy: w.dab[1].toFixed(1), r: w.dab[2].toFixed(2), 'data-edge': w.c.id }, g));
    // home, named once, in its own colour, in the open sea east of its southern tip
    const hs = shapes.get(FP.home.id);
    if (hs) {
      const tw = proj([123.4, 22.4]);
      const tb = path.bounds(hs.feature);
      el('text', { x: (Math.max(tw[0], tb[1][0] + (narrow ? 7 : 5))).toFixed(1), y: (tw[1] + (narrow ? 2 : 0)).toFixed(1), class: 'ot-home fp-label' }, g).textContent = FP.w.home;
    }
    const hits = el('g', {}, ink);
    washes.forEach((w) => {
      const h = w.dab ? el('circle', { class: 'ot-hit', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] + 7 }, hits)
        : el('path', { class: 'ot-hit', d: path(w.feature) || '' }, hits);
      h.dataset.id = w.c.id;
    });
  }

  /* ------------------------------------------------------------ lighting a country and its stamp */

  function light(id) {
    if (focus === id) return;
    focus = id || null;
    stage.classList.toggle('is-lit', !!focus);
    stamps.forEach((st) => st.li && st.li.classList.toggle('is-on', st.c.id === focus));
    ink.querySelectorAll('[data-edge]').forEach((n) => n.classList.toggle('is-on', n.getAttribute('data-edge') === focus));
    if (!raf) paint(null);
  }

  ink.addEventListener('pointermove', (e) => {
    const h = e.target.closest ? e.target.closest('[data-id]') : null;
    const c = h ? FP.byId.get(h.dataset.id) : null;
    light(c ? c.id : null);
    if (c) FP.tip(e.clientX, e.clientY, FP.about(c)); else FP.tip();
  });
  ink.addEventListener('pointerleave', () => { light(null); FP.tip(); });
  list.addEventListener('pointermove', (e) => {
    const li = e.target.closest ? e.target.closest('.ot-stamp') : null;
    const c = li ? FP.byId.get(li.dataset.id) : null;
    light(c ? c.id : null);
    if (c) FP.tip(e.clientX, e.clientY, FP.about(c)); else FP.tip();
  });
  list.addEventListener('pointerleave', () => { light(null); FP.tip(); });
  list.addEventListener('focusin', (e) => {
    const li = e.target.closest('.ot-stamp');
    if (!li) return;
    const c = FP.byId.get(li.dataset.id);
    light(c.id);
    const r = li.getBoundingClientRect();
    FP.tip(r.left + r.width / 2, r.top, FP.about(c));
  });
  list.addEventListener('focusout', () => { light(null); FP.tip(); });

  /* ------------------------------------------------------------ putting it together */

  let started = false, waiting = false, madeFor = '';
  function render() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (W < 120 || H < 120) { waiting = true; return false; } // a window too small (or still hidden): wait for it
    waiting = false;
    words();
    layout();
    stamps.forEach((st) => { st.shape = null; });
    dress(grid.cols);
    buildStamps();
    drawStamps(grid.cw, grid.ch, grid.H);
    sheet.style.setProperty('--sw', `${W}px`); sheet.style.setProperty('--sh', `${H}px`);
    washCv.width = Math.round(W * DPR); washCv.height = Math.round(H * DPR);
    // the washes and the water-lining depend only on the map: kept while it stays where it is
    const key = `${W}x${H}|${proj.scale().toFixed(3)}|${proj.translate().map((v) => v.toFixed(2))}|${narrow}`;
    if (key !== madeFor) {
      washes = ALL.filter((c) => shapes.has(c.id)).map((c) => makeWash(c, shapes.get(c.id).feature));
      waterLines = null;
      madeFor = key;
    }
    drawGhost();
    drawSea();
    drawInk();
    if (focus) { const f = focus; focus = null; light(f); }
    block.classList.add('is-set');
    const at = parseFloat(q.get('at')); // a frame of the arrival, for checking it
    if (at >= 0) { stage.classList.add('is-arriving'); paint(at); stamps.forEach((st, i) => st.li.classList.toggle('is-in', at >= startOf(i + 1) + 0.12)); return true; }
    if (!raf) paint(null); // while the washes are being laid, the next frame paints them
    return true;
  }

  const fontsIn = Promise.all([
    document.fonts.load('400 120px "Playfair Display"', '0123456789%'),
    document.fonts.load('400 40px "Playfair Display"', 'countries of the world'),
    document.fonts.load('500 11px "Geist"', 'CONTINENTS TRIPS'),
    document.fonts.load('600 11px "Geist"', 'UNITED KINGDOM'),
    document.fonts.load('500 40px "Noto Serif TC"', '個國家全世界的'),
    document.fonts.load('500 11px "Noto Sans TC"', '個大洲趟旅行到年，家'),
    document.fonts.load('600 11px "Noto Sans TC"', ALL.map((c) => c.country.zh).join('')),
  ]).catch(() => null);
  const fontsBrief = Promise.race([fontsIn, new Promise((r) => setTimeout(r, 2500))]);

  Promise.all([FP.world('50m'), fontsBrief]).then(([world]) => {
    atlas = world;
    prepare();
    if (render()) { started = true; if (!(parseFloat(q.get('at')) >= 0)) arrive(); }
  });

  let rt = 0;
  let size = '';
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const now = `${stage.clientWidth}x${stage.clientHeight}`;
      if (!atlas) return;
      if (waiting) { if (render() && !started) { started = true; arrive(); } return; }
      // redraw only when the stage really changes size (the review bar arriving is not a resize)
      if (now !== size) { size = now; render(); }
    }, 140);
  });
  FP.onLang(() => { if (started) render(); });
  // remember the size the first drawing was made at
  requestAnimationFrame(() => { size = `${stage.clientWidth}x${stage.clientHeight}`; });
})();
