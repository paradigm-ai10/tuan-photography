/* Hand-tinted atlas 手工上色地圖 (footprint, 2026-11-06).
   A nineteenth-century engraved world map, coloured by hand where he has been. Equal Earth, cut at
   60° south as the old atlases left the far south out; a fine graticule; every coast drawn in ink and
   the seas water-lined along it, the lines widening and fading out to sea as an engraver cut them;
   borders in finer ink, no fill. His countries are laid in watercolour, one wash each from a few earth
   colours, a little off the line, the pigment pooled at the edge and the paper's tooth showing through.
   Taiwan is clay and lettered Home. A cartouche holds the title and the counts.
   On arrival the washes are laid one by one in the order he first went, each spreading from the place
   he went to, about three seconds in all. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  if (new URLSearchParams(location.search).get('lang') === 'zh') FP.setLang('zh');

  const stage = document.getElementById('stage');
  const body = document.body;
  const NS = 'http://www.w3.org/2000/svg';
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const STILL = FP.still || FP.reduced;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const MASK = '#000'; // the stencil for shapes worked on off screen; never seen

  /* ------------------------------------------------------------ the colourist's box */

  // the earth washes, read once from tinted.css, as [r, g, b] for the pixel work
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
  // each country turns its colour a little: lightness and hue, from its own name
  function tone(token, seed) {
    const raw = cssVar(token);
    const m = raw.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/);
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

  /* ------------------------------------------------------------ where each name is lettered */

  // [lng, lat] of the lettering, its anchor, and where a fine leader runs to when it sits away
  // from a country too small or too crowded to letter beside. Read at 1440 and 1000 wide.
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

  /* ------------------------------------------------------------ the page */

  const sheet = document.createElement('div'); sheet.className = 'tn-sheet';
  const sea = document.createElement('canvas'); sea.className = 'tn-sea';
  const washCv = document.createElement('canvas'); washCv.className = 'tn-wash';
  const ink = el('svg', { class: 'tn-ink', 'aria-hidden': 'true' });
  sheet.append(sea, washCv, ink);
  const cart = document.createElement('div'); cart.className = 'tn-cart';
  const key = document.createElement('ol'); key.className = 'tn-key';
  stage.append(sheet, cart, key);
  stage.setAttribute('aria-label', FP.w.where);

  let W = 0, H = 0, narrow = false;
  let proj = null, path = null, frame = null, k = 1;
  let atlas = null, washes = [], tones = new Map();
  let started = false, waiting = false, t0 = 0, raf = 0;

  // the colourist's choice: neighbours never share a colour
  // the colourist's choice: countries that touch, or lie a short sea apart, take different colours;
  // among the free ones, the colour least used so far
  function chooseTones() {
    const geoms = atlas.topo.objects.countries.geometries;
    const nb = topojson.neighbors(geoms);
    const touch = new Map();
    geoms.forEach((g, i) => { const set = touch.get(g.id) || new Set(); nb[i].forEach((j) => set.add(geoms[j].id)); touch.set(g.id, set); });
    // a few hundred points round each country, to measure the sea between two of them
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
    tones.set(FP.home.id, { css: cssVar('--tn-home'), rgb: rgb(cssVar('--tn-home')) });
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



  /* ------------------------------------------------------------ the frame and the projection */

  const SOUTH = -60; // the old atlases stop here
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    narrow = W < 640;
    body.classList.toggle('is-narrow', narrow);
    const unit = d3.geoEqualEarth().scale(1).translate([0, 0]);
    const xr = unit([179.9999, 0])[0], yt = unit([0, 90])[1], yb = unit([0, SOUTH])[1];
    const mw = 2 * xr, mh = yb - yt;
    const side = narrow ? 14 : clamp(W * 0.032, 16, 40);
    const top = narrow ? 70 : 66, bottom = narrow ? 12 : 14;
    const aw = W - 2 * side, ah = H - top - bottom;
    const s = narrow ? aw / mw : Math.min(aw / mw, ah / mh);
    const ox = W / 2, oy = narrow ? top - yt * s : top + (ah - mh * s) / 2 - yt * s;
    proj = d3.geoEqualEarth().scale(s).translate([ox, oy]).precision(0.15)
      .clipExtent([[ox - xr * s - 1, oy + yt * s - 1], [ox + xr * s + 1, oy + yb * s]]);
    path = d3.geoPath(proj);
    frame = path({ type: 'Sphere' });
    k = clamp(s / 251, 0.66, 1.2);
    document.documentElement.style.setProperty('--tn-k', k.toFixed(3));
    return { s, ox, oy, xr, yt, yb, mapTop: oy + yt * s, mapBottom: oy + yb * s };
  }

  /* ------------------------------------------------------------ the sea: graticule, water-lining, neatline */

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
    const x0 = L.ox - L.xr * L.s - pad * g, y0 = L.mapTop - pad * g;
    const gw = Math.ceil((2 * L.xr * L.s) / g) + 2 * pad, gh = Math.ceil((L.mapBottom - L.mapTop) / g) + 2 * pad;
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
    const sx = (L.xr * f + gap) / (L.xr * f), syT = (-L.yt * f + gap) / (-L.yt * f), syB = (L.yb * f + gap) / (L.yb * f);
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

  let labelLayer = null, hitLayer = null;
  function drawInk() {
    ink.replaceChildren();
    ink.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const clip = el('clipPath', { id: 'tn-frame' }, el('defs', {}, ink));
    el('path', { d: frame }, clip);
    const g = el('g', { 'clip-path': 'url(#tn-frame)' }, ink);
    el('path', { class: 'tn-border', d: path(atlas.borders) }, g);
    el('path', { class: 'tn-coast', d: path(atlas.land) }, g);
    // the small ones get a ring, so a dab of colour has something to sit in
    washes.filter((w) => w.dab).forEach((w) => el('circle', { class: 'tn-dot', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] }, g));
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
    washes.forEach((w) => {
      const c = w.c, nm = names[c.iso];
      const p = PLACE[c.id] || { at: nm ? nm.at : [c.ll[1], c.ll[0]], a: 'middle', inside: true };
      const [x, y] = proj(p.at);
      const g = el('g', { class: 'tn-label' + (w.shown ? '' : ' is-wait') }, labelLayer);
      const t = el('text', { class: 'tn-name tn-name--' + (p.size || 'm') + (p.inside ? '' : ' is-halo') + (c.home ? ' is-home' : ''), x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': p.a }, g);
      const name = c.home ? c.name[lang] : c.country[lang];
      const caps = lang === 'zh' ? name : name.toUpperCase();
      const year = c.home ? FP.w.home : String(c.first);
      if (p.wrap) { // two lines, the year on the second
        const words = lang === 'zh' ? [caps.slice(0, p.zhCut || 2), caps.slice(p.zhCut || 2)] : caps.split(' ');
        const cut = Math.ceil(words.length / 2), sep = lang === 'zh' ? '' : ' ';
        el('tspan', { x: x.toFixed(1), dy: '0' }, t).textContent = words.slice(0, cut).join(sep);
        el('tspan', { x: x.toFixed(1), dy: '1.2em' }, t).textContent = words.slice(cut).join(sep);
      } else {
        t.appendChild(document.createTextNode(caps));
      }
      if (p.stack) el('tspan', { class: 'tn-year', x: x.toFixed(1), dy: '1.15em' }, t).textContent = year;
      else el('tspan', { class: 'tn-year', dx: lang === 'zh' ? '0.3em' : '0.45em' }, t).textContent = year;
      t.dataset.id = c.id;
      w.label = g;
      if (p.lead) { // a fine leader from the nearest edge of the lettering to the place
        const [lx, ly] = proj(p.lead);
        const b = t.getBBox(), m = 2.5;
        const qx = clamp(lx, b.x - m, b.x + b.width + m), qy = clamp(ly, b.y + b.height * 0.2, b.y + b.height * 0.8);
        const sx = lx < b.x || lx > b.x + b.width ? qx : clamp(lx, b.x, b.x + b.width);
        const sy = lx < b.x || lx > b.x + b.width ? qy : (ly < b.y ? b.y - 1 : b.y + b.height + 1);
        g.insertBefore(el('path', { class: 'tn-lead', d: `M${sx.toFixed(1)},${sy.toFixed(1)}L${lx.toFixed(1)},${ly.toFixed(1)}` }), t);
        g.insertBefore(el('circle', { class: 'tn-lead-end', cx: lx.toFixed(1), cy: ly.toFixed(1), r: 1.1 }), t);
      }
    });
  }

  /* ------------------------------------------------------------ the cartouche and the key */

  function drawCart(L) {
    const w = FP.w, n = FP.counts;
    cart.innerHTML = `<div class="tn-cart__in">
      <h1 class="tn-cart__title">${FP.esc(w.where)}</h1>
      <div class="tn-cart__rule"></div>
      <p class="tn-cart__lead"><b>${FP.fmt(n.countries)}</b><span>${FP.esc(w.countries(n.countries))}</span></p>
      <p class="tn-cart__more"><b>${FP.fmt(n.continents)}</b> ${FP.esc(w.continents(n.continents))}${FP.lang === 'zh' ? '，' : ', '}<b>${FP.fmt(n.trips)}</b> ${FP.esc(w.trips(n.trips))}</p>
      <p class="tn-cart__span">${FP.esc(w.span(n.since, n.until))}</p>
    </div>`;
    if (narrow) {
      cart.style.setProperty('--x', `${W / 2}px`);
      cart.style.setProperty('--y', `${L.mapBottom + 22}px`);
      key.style.setProperty('--key-y', `${L.mapBottom + 22 + cart.offsetHeight + 18}px`);
    } else {
      // in the South Pacific, where the old maps kept their titles
      const [cx, cy] = proj([-128, -31]);
      cart.style.setProperty('--x', `${cx.toFixed(1)}px`);
      cart.style.setProperty('--y', `${cy.toFixed(1)}px`);
    }
  }

  function drawKey() {
    key.replaceChildren();
    if (!narrow) return;
    key.style.setProperty('--rows', Math.ceil((FP.abroad.length + 1) / 2));
    const lang = FP.lang;
    [FP.home, ...FP.abroad].forEach((c) => {
      const li = document.createElement('li');
      if (c.home) li.className = 'is-home';
      li.style.setProperty('--tone', tones.get(c.id).css);
      li.innerHTML = `<span class="tn-key__swatch"></span><span class="tn-key__name">${FP.esc(c.home ? c.name[lang] : c.country[lang])}</span><span class="tn-key__year">${FP.esc(c.home ? FP.w.home : String(c.first))}</span>`;
      li.dataset.id = c.id;
      key.appendChild(li);
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

  // a country as he knows it: the largest of the shapes the atlas numbers alike (Australia shares
  // its number with two reefs), without the far-off pieces (French Guiana is France on paper, but
  // he has not been to South America)
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

  function buildWashes() {
    washes = [FP.home, ...FP.abroad].map((c) => makeWash(c, homeland(c)));
  }

  /* ------------------------------------------------------------ laying the washes */

  // Taiwan first, then each country in the order he first went
  const T_HOME = 0.15, T_FIRST = 0.5, T_STEP = 0.135, T_SPREAD = 0.8;
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
    const t = (now - t0) / 1000;
    if (paint(t)) raf = requestAnimationFrame(frameLoop);
    else raf = 0;
  }

  /* ------------------------------------------------------------ hover */

  function hover(e) {
    const t = e.target.closest ? e.target.closest('[data-id]') : null;
    const c = t ? FP.byId.get(t.dataset.id) : null;
    if (c) FP.tip(e.clientX, e.clientY, FP.about(c)); else FP.tip();
  }
  stage.addEventListener('pointermove', hover);
  stage.addEventListener('pointerdown', hover);
  stage.addEventListener('pointerleave', () => FP.tip());

  /* ------------------------------------------------------------ putting it together */

  function render(animate) {
    const L = layout();
    if (W < 120 || H < 120 || !(L.s > 20)) { waiting = true; return; } // a window too small (or still hidden): wait for it
    waiting = false;
    // every layer at the window's size in pixels, so a window that changes before the next
    // drawing never stretches one layer against another
    [sea, washCv].forEach((cv) => { cv.style.width = `${W}px`; cv.style.height = `${H}px`; });
    ink.setAttribute('width', W); ink.setAttribute('height', H);
    washCv.width = Math.round(W * DPR); washCv.height = Math.round(H * DPR);
    buildWashes();
    if (!animate) washes.forEach((w) => { w.shown = true; });
    drawSea(L);
    drawInk();
    drawLabels();
    drawCart(L);
    drawKey();
    if (narrow) drawCart(L); // the key sits under the cartouche, which needs its height first
    // on a phone, the map, the cartouche and the key sit a little lower when there is room
    const slack = narrow ? H - 16 - (key.offsetTop + key.offsetHeight) : 0;
    stage.style.setProperty('--shift', `${Math.round(clamp(slack * 0.4, 0, 60))}px`);
    const at = parseFloat(new URLSearchParams(location.search).get('at')); // a frame of the arrival, for checking it
    if (at >= 0) { cancelAnimationFrame(raf); paint(at); return; }
    if (animate) { t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frameLoop); }
    else { cancelAnimationFrame(raf); raf = 0; paint(null); }
  }

  FP.world('50m').then((a) => {
    atlas = a;
    chooseTones();
    const go = () => { render(!STILL); started = true; };
    // the cartouche and the lettering are set in Playfair: wait for it, briefly
    const fonts = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
    fonts.then(go);
  });

  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    if (!started) return;
    if (STILL || waiting) render(waiting && !STILL); // a still is taken at once
    else rt = setTimeout(() => render(false), 120);
  });
  FP.onLang(() => { if (!started) return; stage.setAttribute('aria-label', FP.w.where); drawLabels(); drawCart(layoutCache()); drawKey(); if (narrow) drawCart(layoutCache()); });
  function layoutCache() { // the frame's numbers without redrawing anything
    const unit = d3.geoEqualEarth().scale(1).translate([0, 0]);
    const yb = unit([0, SOUTH])[1];
    const s = proj.scale(), [, oy] = proj.translate();
    return { mapBottom: oy + yb * s };
  }
})();
