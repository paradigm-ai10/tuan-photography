/* Scratch map 刮刮地圖 (2026-11-06). The world printed under a thin champagne foil, the way the
   scratch-off posters are sold. The countries he has been to are scratched clean, one after
   another in the order he first went, showing the printed colour map beneath; Taiwan is scratched
   first and marked Home. The poster's legend box carries the count.

   Four canvases are stacked: the print (the sea, the lines, the colour beneath), the foil's cut
   edge (a darker copy, a hair lower and to the right, so the foil reads as a layer), the foil, and
   the crumbs of foil the coin pushed aside. Every stroke cuts the foil and its edge alike. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  const asked = new URLSearchParams(location.search).get('lang'); // ?lang=zh opens it in 中文
  if (asked === 'zh' || asked === 'en') FP.setLang(asked);

  /* ------------------------------------------------------------ words */

  const WORDS = {
    en: {
      scratched: 'countries scratched', world: (n) => `of ${n} in the world`,
      foil: 'Under the foil', home: 'Home', taiwan: 'Taiwan, home',
      map: (n) => `A scratch map of the world with ${n} countries scratched clean`,
    },
    zh: {
      scratched: '個國家已經刮開', world: (n) => `全世界共 ${n} 個`,
      foil: '還沒刮開', home: '家', taiwan: '台灣，家',
      map: (n) => `一張刮刮世界地圖，刮開了 ${n} 個國家`,
    },
  };
  const t = () => WORDS[FP.lang];

  /* ------------------------------------------------------------ colours, from the stylesheet */

  const root = getComputedStyle(document.documentElement);
  const PAL = {};
  ['paper', 'paper-2', 'ink', 'ink-2', 'ink-3', 'hair', 'route', 'clay', 'olive', 'slate', 'ochre', 'foil', 'foil-lo', 'foil-hi']
    .forEach((k) => { PAL[k] = root.getPropertyValue('--' + k).trim(); });
  const CONTINENT = { asia: 'clay', europe: 'slate', oceania: 'olive', 'north-america': 'ochre' };
  const colourOf = (c) => PAL[c.home ? 'route' : CONTINENT[c.continent] || 'clay'];

  // a colour as red, green, blue, whatever the stylesheet wrote it in
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function rgb(css) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }

  // the same scratches on every visit
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let r = Math.imul(a ^ (a >>> 15), 1 | a);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  /* ------------------------------------------------------------ the page */

  const stage = document.getElementById('stage');
  stage.innerHTML = `<div class="sc-sheet">
      <canvas class="sc-base" aria-hidden="true"></canvas>
      <canvas class="sc-edge" aria-hidden="true"></canvas>
      <canvas class="sc-foil" aria-hidden="true"></canvas>
      <canvas class="sc-dust" role="img"></canvas>
      <h1 class="sc-title"></h1>
      <p class="sc-home fp-label"></p>
      <aside class="sc-key"></aside>
    </div>`;
  const sheet = stage.querySelector('.sc-sheet');
  const cv = {
    base: sheet.querySelector('.sc-base'), edge: sheet.querySelector('.sc-edge'),
    foil: sheet.querySelector('.sc-foil'), dust: sheet.querySelector('.sc-dust'),
  };
  const homeEl = sheet.querySelector('.sc-home');
  const titleEl = sheet.querySelector('.sc-title');
  const keyEl = sheet.querySelector('.sc-key');
  const px = (el, k, v) => el.style.setProperty(k, `${Math.round(v * 100) / 100}px`);

  const C = FP.counts;
  const perContinent = {};
  FP.abroad.forEach((c) => { perContinent[c.continent] = (perContinent[c.continent] || 0) + 1; });
  const order = Object.keys(perContinent).sort((a, b) => perContinent[b] - perContinent[a]);

  function words() {
    const w = FP.w, s = t();
    keyEl.innerHTML = `
      <p class="fp-label">${FP.esc(w.where)}</p>
      <div class="sc-key__count"><span class="sc-key__n">${C.countries}</span>
        <span class="sc-key__of"><span>${FP.esc(s.scratched)}</span><span>${FP.esc(s.world(C.world))}</span></span></div>
      <p class="sc-key__trips">${FP.esc(trips())}</p>
      <ul class="sc-key__list">
        ${order.map((k) => `<li><span class="sc-sw sc-sw--${k}"></span><span>${FP.esc(w.continent[k])}</span><b>${perContinent[k]}</b></li>`).join('')}
        <li><span class="sc-sw sc-sw--home"></span><span>${FP.esc(s.taiwan)}</span></li>
        <li><span class="sc-sw sc-sw--foil"></span><span>${FP.esc(s.foil)}</span><b>${C.world - C.countries}</b></li>
      </ul>`;
    homeEl.textContent = s.home;
    titleEl.textContent = w.where;
    cv.dust.setAttribute('aria-label', s.map(C.countries));
  }
  function trips() {
    const w = FP.w, zh = FP.lang === 'zh';
    const a = `${C.trips} ${w.trips(C.trips)}`, b = `${C.continents} ${w.continents(C.continents)}`;
    return zh ? `${a}，${b}，${w.span(C.since, C.until)}` : `${a}, ${b}, ${w.span(C.since, C.until)}`;
  }

  /* ------------------------------------------------------------ textures */

  // fine foil grain, brushed a little along its length
  function grainTile(size, seed) {
    const r = rng(seed), lo = rgb(PAL['foil-lo']), hi = rgb(PAL['foil-hi']);
    const c = canvasOf(size, size), g = c.getContext('2d');
    const img = g.createImageData(size, size), d = img.data, row = new Float32Array(size);
    for (let y = 0; y < size; y++) {
      const lift = (r() * 2 - 1) * 0.35; // each brushed line a touch lighter or darker
      for (let x = 0; x < size; x++) row[x] = r() * 2 - 1;
      for (let x = 0; x < size; x++) {
        let s = 0;
        for (let k = -3; k <= 3; k++) s += row[(x + k + size) % size];
        let v = row[x] * 0.55 + (s / 7) * 1.1 + lift;
        v = Math.max(-1, Math.min(1, v));
        const i = (y * size + x) * 4, src = v > 0 ? hi : lo;
        const glint = r() < 0.01; // now and then a grain catches the light
        d[i] = src[0]; d[i + 1] = src[1]; d[i + 2] = src[2]; d[i + 3] = glint ? 230 : Math.abs(v) * (v > 0 ? 120 : 70);
        if (glint) { d[i] = hi[0]; d[i + 1] = hi[1]; d[i + 2] = hi[2]; }
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  // a very soft sheen: a few broad patches of light and shade, from noise, never a gradient
  function sheenOf(w, h, seed) {
    const r = rng(seed), lo = rgb(PAL['foil-lo']), hi = rgb(PAL['foil-hi']);
    const sw = 10, sh = 5, small = canvasOf(sw, sh), g = small.getContext('2d');
    const img = g.createImageData(sw, sh), d = img.data;
    for (let i = 0; i < sw * sh; i++) {
      const v = r() * 2 - 1, src = v > 0 ? hi : lo;
      d[i * 4] = src[0]; d[i * 4 + 1] = src[1]; d[i * 4 + 2] = src[2]; d[i * 4 + 3] = Math.abs(v) * (v > 0 ? 255 : 120);
    }
    g.putImageData(img, 0, 0);
    const mid = canvasOf(sw * 8, sh * 8), m = mid.getContext('2d');
    m.imageSmoothingQuality = 'high';
    m.drawImage(small, 0, 0, mid.width, mid.height);
    const big = canvasOf(w, h), b = big.getContext('2d');
    b.imageSmoothingQuality = 'high';
    b.drawImage(mid, 0, 0, w, h);
    return big;
  }
  // the paper's own tooth, on the printed colour
  function toothTile(size, seed) {
    const r = rng(seed), ink = rgb(PAL.ink), paper = rgb(PAL.paper);
    const c = canvasOf(size, size), g = c.getContext('2d');
    const img = g.createImageData(size, size), d = img.data;
    for (let i = 0; i < size * size; i++) {
      const v = r() * 2 - 1, src = v > 0 ? paper : ink;
      d[i * 4] = src[0]; d[i * 4 + 1] = src[1]; d[i * 4 + 2] = src[2]; d[i * 4 + 3] = Math.abs(v) * (v > 0 ? 22 : 13);
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* ------------------------------------------------------------ the map */

  const EXTENT = [[-180, -57], [180, 84]];
  let W = null; // the world's shapes
  let L = null; // the current layout and everything drawn for it
  let run = 0;  // the arrival in progress

  function layout() {
    const sw0 = stage.clientWidth, sh0 = stage.clientHeight;
    const edge = Math.max(16, Math.min(40, innerWidth * 0.032));
    const top = (document.querySelector('.fp-top') || {}).offsetHeight || 58;
    const narrow = sw0 < 700;
    const sx = edge, sw = sw0 - 2 * edge;
    const avail = sh0 - top - (narrow ? 12 : 14);
    const pad = narrow ? 10 : 18;

    const frame = d3.geoGraticule().extent(EXTENT).outline();
    const projection = d3.geoNaturalEarth1().precision(0.25);
    let sh, ch;
    if (narrow) { // the title, then the map, then the legend
      const head = pad + 8 + titleEl.offsetHeight + 12;
      projection.fitWidth(sw - 2 * pad, frame);
      const tr = projection.translate();
      projection.translate([tr[0] + pad, tr[1] + head]);
      ch = Math.ceil(d3.geoPath(projection).bounds(frame)[1][1] + pad * 0.6);
      sh = ch; // grows once the legend is measured
    } else {
      sh = avail;
      ch = sh;
      projection.fitExtent([[pad, pad], [sw - pad, sh - pad]], frame);
    }
    return { narrow, sx, sy: top, sw, sh, ch, avail, top, pad, projection, frame };
  }

  function build(animate) {
    const my = ++run;
    const lay = layout();
    const { sw, ch, projection, frame } = lay;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(sw * dpr), chd = Math.round(ch * dpr);
    const path = d3.geoPath(projection);
    const P = (g) => { const s = path(g); return s ? new Path2D(s) : null; };

    px(sheet, '--sw', sw);
    px(sheet, '--sx', lay.sx);
    for (const k in cv) {
      cv[k].width = cw; cv[k].height = chd;
      cv[k].style.setProperty('width', `${sw}px`);
      cv[k].style.setProperty('height', `${ch}px`);
    }

    const frameP = P(frame);
    const landP = P(W.landNoPole);
    // the larger shores, for the waterline: an islet does not get one
    const shores = new Path2D();
    for (const f of W.landNoPole.features) {
      const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      for (const poly of polys) {
        const part = { type: 'Polygon', coordinates: poly };
        if (path.area(part) > 60) shores.addPath(P(part));
      }
    }
    const bordersP = P(W.borders);
    const gratP = P(d3.geoGraticule().extent(EXTENT).step([30, 30])());
    const scale = projection.scale();
    const coin = Math.max(2.6, Math.min(6, scale / 42)); // the coin's edge, in css pixels
    const ring = Math.max(2, Math.min(2.7, coin * 0.6)); // the printed ring of the smallest countries

    // his countries, Taiwan first, then in the order he first went
    const list = [FP.home, ...FP.abroad];
    const items = list.map((c, i) => {
      const f = homeland(c.home ? W.home : W.visited.find((v) => v.id === c.iso));
      const area = path.area(f);
      const pt = projection([c.ll[1], c.ll[0]]);
      const it = { c, f, p: P(f), area, pt, colour: colourOf(c), tiny: area < 9, small: area < 70, strokes: [], done: 0, crumbs: [] };
      it.mask = maskOf(it.p, path.bounds(f));
      planStrokes(it, coin, rng(1009 * (i + 3)), ring);
      return it;
    });

    /* the print: the sea, the lines, and the colour beneath the foil */
    const base = cv.base.getContext('2d');
    base.setTransform(dpr, 0, 0, dpr, 0, 0);
    base.clearRect(0, 0, sw, ch);
    base.fillStyle = PAL['paper-2'];
    base.fill(frameP);
    base.save();
    base.clip(frameP);
    base.lineJoin = 'round';
    base.strokeStyle = PAL.hair;
    base.lineWidth = 0.6;
    base.stroke(gratP);
    // an engraved waterline round every coast
    for (const [d, a] of [[coin * 0.8, 0.7]]) {
      base.globalAlpha = a;
      base.strokeStyle = PAL.hair; base.lineWidth = d * 2; base.stroke(shores);
      base.globalAlpha = 1;
      base.strokeStyle = PAL['paper-2']; base.lineWidth = d * 2 - 1; base.stroke(shores);
    }
    base.restore();
    base.fillStyle = PAL.paper;
    base.fill(landP);
    for (const it of items) { base.fillStyle = it.colour; base.fill(it.p); }
    // the paper's tooth in the printed colour, then the borders printed in paper
    const printed = new Path2D();
    items.forEach((it) => printed.addPath(it.p));
    base.save();
    base.clip(printed);
    base.setTransform(1, 0, 0, 1, 0, 0);
    base.fillStyle = base.createPattern(toothTile(128, 7), 'repeat');
    base.fillRect(0, 0, cw, chd);
    base.restore();
    base.strokeStyle = PAL.paper;
    base.lineWidth = 0.7;
    base.stroke(bordersP);
    // the smallest countries are printed as a dot in a ring, as the posters do
    for (const it of items) {
      if (!it.tiny || !it.pt) continue;
      base.beginPath(); base.arc(it.pt[0], it.pt[1], ring * 0.5, 0, Math.PI * 2);
      base.fillStyle = it.colour; base.fill();
      base.beginPath(); base.arc(it.pt[0], it.pt[1], ring, 0, Math.PI * 2);
      base.strokeStyle = PAL.paper; base.lineWidth = 0.8; base.stroke();
    }
    base.strokeStyle = PAL['ink-3'];
    base.lineWidth = 0.75;
    base.stroke(frameP);

    /* the foil, laid over every country, and its edge */
    const foil = cv.foil.getContext('2d');
    foil.setTransform(dpr, 0, 0, dpr, 0, 0);
    foil.clearRect(0, 0, sw, ch);
    foil.fillStyle = PAL.foil;
    foil.fill(landP);
    foil.save();
    foil.setTransform(1, 0, 0, 1, 0, 0);
    foil.globalCompositeOperation = 'source-atop';
    foil.drawImage(sheenOf(cw, chd, 31), 0, 0);
    foil.fillStyle = foil.createPattern(grainTile(160, 17), 'repeat');
    foil.fillRect(0, 0, cw, chd);
    foil.restore();
    // the borders and coasts printed on the foil
    foil.strokeStyle = PAL['foil-lo'];
    foil.lineWidth = 0.55;
    foil.stroke(bordersP);
    foil.lineWidth = 0.7;
    foil.stroke(landP);
    for (const it of items) { // the rings of the smallest, printed on the foil too
      if (!it.tiny || !it.pt) continue;
      foil.beginPath(); foil.arc(it.pt[0], it.pt[1], ring, 0, Math.PI * 2);
      foil.fillStyle = PAL.foil; foil.fill(); foil.stroke();
    }

    const edge = cv.edge.getContext('2d');
    edge.setTransform(dpr, 0, 0, dpr, 0, 0);
    edge.clearRect(0, 0, sw, ch);
    edge.fillStyle = PAL['foil-lo'];
    edge.fill(landP);
    for (const it of items) if (it.tiny && it.pt) { edge.beginPath(); edge.arc(it.pt[0], it.pt[1], ring, 0, Math.PI * 2); edge.fill(); }

    const dust = cv.dust.getContext('2d');
    dust.setTransform(dpr, 0, 0, dpr, 0, 0);
    dust.clearRect(0, 0, sw, ch);

    L = { ...lay, dpr, items, foil, edge, dust, path };
    place();

    /* the arrival: Taiwan, then each country in the order he first went */
    const total = 3300, lead = 380;
    const weights = items.map((it) => 70 + 20 * Math.sqrt(it.strokes.length + 1));
    const sum = weights.reduce((a, b) => a + b, 0);
    let at = lead;
    items.forEach((it, i) => { it.start = at; it.dur = (weights[i] / sum) * total; at += it.dur; });

    if (!animate) { items.forEach((it) => cutTo(it, it.strokes.length)); return; }
    const at0 = +new URLSearchParams(location.search).get('at');
    if (at0) { // the arrival held still at that moment, for checking it
      items.forEach((it) => cutTo(it, Math.round(Math.max(0, Math.min(1, (at0 - it.start) / it.dur)) * it.strokes.length)));
      return;
    }
    const t0 = performance.now();
    const tick = (now) => {
      if (my !== run) return;
      const el = now - t0;
      let busy = false;
      for (const it of items) {
        if (el < it.start) { busy = true; continue; }
        const k = Math.round(Math.min(1, (el - it.start) / it.dur) * it.strokes.length);
        if (k > it.done) cutTo(it, k);
        if (it.done < it.strokes.length) busy = true;
      }
      if (busy) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // France and the Netherlands without their lands overseas: he went to the European part
  const EUROPE = [[-12, 34], [32, 62]];
  function homeland(f) {
    if (!f || (f.id !== '250' && f.id !== '528') || f.geometry.type !== 'MultiPolygon') return f;
    const keep = f.geometry.coordinates.filter((poly) => {
      const [x, y] = d3.geoCentroid({ type: 'Polygon', coordinates: poly });
      return x > EUROPE[0][0] && x < EUROPE[1][0] && y > EUROPE[0][1] && y < EUROPE[1][1];
    });
    return { ...f, geometry: { type: 'MultiPolygon', coordinates: keep } };
  }

  // a country as a mask of css pixels, for planning the strokes and for the pointer
  function maskOf(p2d, b) {
    const bx = Math.floor(b[0][0]) - 2, by = Math.floor(b[0][1]) - 2;
    const bw = Math.max(1, Math.ceil(b[1][0]) - bx + 3), bh = Math.max(1, Math.ceil(b[1][1]) - by + 3);
    const c = canvasOf(bw, bh), g = c.getContext('2d', { willReadFrequently: true });
    g.translate(-bx, -by);
    g.fill(p2d);
    const a = g.getImageData(0, 0, bw, bh).data;
    const m = new Uint8Array(bw * bh);
    for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 110 ? 1 : 0;
    return {
      bx, by, bw, bh,
      has: (x, y) => { const i = Math.floor(x - bx), j = Math.floor(y - by); return i >= 0 && j >= 0 && i < bw && j < bh && m[j * bw + i] === 1; },
    };
  }

  // a coin worked back and forth across the country, a little aslant, the way a right hand goes
  function planStrokes(it, w, r, ring) {
    const m = it.mask;
    if (it.tiny) {
      if (it.pt) it.strokes.push({ dab: true, x: it.pt[0], y: it.pt[1], r: ring + 0.4 });
      return;
    }
    const ang = ((-27 + (r() * 2 - 1) * 11) * Math.PI) / 180;
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    const cx = m.bx + m.bw / 2, cy = m.by + m.bh / 2;
    let n0 = Infinity, n1 = -Infinity, d0 = Infinity, d1 = -Infinity;
    for (const [x, y] of [[m.bx, m.by], [m.bx + m.bw, m.by], [m.bx, m.by + m.bh], [m.bx + m.bw, m.by + m.bh]]) {
      const n = (x - cx) * nx + (y - cy) * ny, d = (x - cx) * ux + (y - cy) * uy;
      n0 = Math.min(n0, n); n1 = Math.max(n1, n); d0 = Math.min(d0, d); d1 = Math.max(d1, d);
    }
    const step = w * 0.54;
    const small = it.small;
    let flip = false;
    for (let s = n0 + step * 0.4; s < n1; s += step * (0.92 + r() * 0.16)) {
      // where this line runs over the country
      const runs = [];
      let inside = false, from = 0, gap = 0;
      for (let d = d0; d <= d1 + 1; d += 0.75) {
        const x = cx + nx * s + ux * d, y = cy + ny * s + uy * d;
        const on = d <= d1 && m.has(x, y);
        if (on) { if (!inside) { if (runs.length && d - runs[runs.length - 1][1] < 2.2) { from = runs.pop()[0]; } else from = d; inside = true; } gap = d; }
        else if (inside) { runs.push([from, gap]); inside = false; }
      }
      for (const [a0, a1] of runs) {
        // most strokes overrun the border and are stopped by it; some fall short and leave foil
        const short = () => { const q = r(); return small ? -2 : q < 0.5 ? -2.5 : q < 0.84 ? r() * w * 0.9 : w * (0.9 + r() * 1.5); };
        let e0 = a0 + short(), e1 = a1 - short();
        if (a1 - a0 < 2) { e0 = a0 - 1.5; e1 = a1 + 1.5; }
        if (e1 - e0 < 0.8) continue;
        const jig = (r() * 2 - 1) * Math.min((2.5 * Math.PI) / 180, Math.atan((w * 0.22) / Math.max(1, (e1 - e0) / 2))); // the hand is not a ruler
        const mx = (e0 + e1) / 2, half = (e1 - e0) / 2;
        const vx = Math.cos(ang + jig), vy = Math.sin(ang + jig);
        const ox = cx + nx * s + ux * mx, oy = cy + ny * s + uy * mx;
        let ax = ox - vx * half, ay = oy - vy * half, bx = ox + vx * half, by = oy + vy * half;
        if (flip) [ax, ay, bx, by] = [bx, by, ax, ay];
        // the coin's edge leaves a few finer lines along each side and a ragged end
        const sub = [{ o: 0, w: w * 0.62, a: 1, s0: 0, s1: 0 }];
        for (let k = 0; k < 5; k++) {
          const o = (-0.5 + (k + 0.5) / 5) * w * 0.94;
          sub.push({ o, w: w * (0.16 + r() * 0.16), a: 0.72 + r() * 0.28, s0: (r() * 2 - 1) * w * 0.35, s1: (r() * 2 - 1) * w * 0.45 });
        }
        // the coin also scuffs the print: two or three hairlines along the stroke
        const scuffs = [];
        for (let q = 0, n = 1 + Math.floor(r() * 3); q < n; q++) scuffs.push({ o: (r() * 2 - 1) * w * 0.45, a: r() * 0.25, b: 0.75 + r() * 0.25, al: 0.12 + r() * 0.14 });
        const stroke = { ax, ay, bx, by, sub, scuffs, crumbs: [] };
        // a crumb or two of foil pushed off the end where the coin stopped short
        if (e1 < a1 - 1 && r() < 0.16) {
          const n = 1 + Math.floor(r() * 2);
          for (let k = 0; k < n; k++) {
            const along = 1.5 + r() * 3.5, side = (r() * 2 - 1) * w * 0.6, rad = 0.5 + r() * 0.9;
            const ex = flip ? ax : bx, ey = flip ? ay : by, sx = flip ? -vx : vx, sy = flip ? -vy : vy;
            const pts = [];
            const corners = 4 + Math.floor(r() * 2);
            for (let q = 0; q < corners; q++) {
              const th = (q / corners) * Math.PI * 2 + r() * 0.8, rr = rad * (0.6 + r() * 0.6);
              pts.push([ex + sx * along + nx * side + Math.cos(th) * rr, ey + sy * along + ny * side + Math.sin(th) * rr]);
            }
            stroke.crumbs.push(pts);
          }
        }
        it.strokes.push(stroke);
        flip = !flip;
      }
    }
  }

  // cut the foil (and its edge) up to the k-th stroke of a country
  function cutTo(it, k) {
    const { foil, edge, dust, dpr } = L;
    for (const g of [foil, edge]) {
      g.save();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'destination-out';
      g.strokeStyle = PAL.ink;
      g.fillStyle = PAL.ink;
      g.lineCap = 'round';
      const strokes = it.strokes.slice(it.done, k);
      const dabs = strokes.filter((s) => s.dab);
      for (const s of dabs) { g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill(); }
      if (dabs.length !== strokes.length) {
        g.clip(it.p);
        for (const s of strokes) {
          if (s.dab) continue;
          const dx = s.bx - s.ax, dy = s.by - s.ay, len = Math.hypot(dx, dy) || 1;
          const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
          for (const q of s.sub) {
            g.globalAlpha = q.a;
            g.lineWidth = q.w;
            g.beginPath();
            g.moveTo(s.ax + nx * q.o - ux * q.s0, s.ay + ny * q.o - uy * q.s0);
            g.lineTo(s.bx + nx * q.o + ux * q.s1, s.by + ny * q.o + uy * q.s1);
            g.stroke();
          }
        }
      }
      g.restore();
    }
    // the scuffs, on the print the coin has just bared
    const fresh = it.strokes.slice(it.done, k).filter((st) => st.scuffs);
    if (fresh.length) {
      dust.save();
      dust.setTransform(dpr, 0, 0, dpr, 0, 0);
      dust.clip(it.p);
      dust.strokeStyle = PAL['foil-hi'];
      dust.lineWidth = 0.45;
      for (const st of fresh) {
        const dx = st.bx - st.ax, dy = st.by - st.ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        for (const q of st.scuffs) {
          dust.globalAlpha = q.al;
          dust.beginPath();
          dust.moveTo(st.ax + dx * q.a + nx * q.o, st.ay + dy * q.a + ny * q.o);
          dust.lineTo(st.ax + dx * q.b + nx * q.o, st.ay + dy * q.b + ny * q.o);
          dust.stroke();
        }
      }
      dust.restore();
    }
    // the crumbs lie on top of everything
    dust.save();
    dust.setTransform(dpr, 0, 0, dpr, 0, 0);
    dust.fillStyle = PAL.foil;
    dust.strokeStyle = PAL['foil-lo'];
    dust.lineWidth = 0.4;
    for (const s of it.strokes.slice(it.done, k)) {
      for (const pts of s.crumbs || []) {
        dust.beginPath();
        pts.forEach(([x, y], i) => (i ? dust.lineTo(x, y) : dust.moveTo(x, y)));
        dust.closePath();
        dust.fill();
        dust.stroke();
      }
    }
    dust.restore();
    it.done = k;
  }

  /* ------------------------------------------------------------ the words on the poster */

  function place() {
    if (!L) return;
    const { narrow, sw, ch, avail, top, pad, projection, items } = L;
    // Taiwan's mark, out in the Pacific
    const tw = items[0];
    if (tw.pt) {
      const b = L.path.bounds(tw.f);
      px(homeEl, '--hx', b[1][0] + 4);
      px(homeEl, '--hy', tw.pt[1] - homeEl.offsetHeight / 2);
    }
    keyEl.classList.toggle('is-below', narrow);
    homeEl.classList.toggle('is-under', narrow);
    if (narrow && tw.pt) {
      const b = L.path.bounds(tw.f);
      px(homeEl, '--hx', tw.pt[0]);
      px(homeEl, '--hy', b[1][1] + 3);
    }
    keyEl.classList.remove('is-compact');
    // the title, in the band above the map when there is room for it
    const mapTop = L.path.bounds(L.frame)[0][1];
    const titled = narrow || mapTop - pad >= titleEl.offsetHeight + 28;
    sheet.classList.toggle('has-title', titled);
    px(titleEl, '--ty', narrow ? pad + 8 : (pad + mapTop) / 2 - titleEl.offsetHeight / 2);
    if (narrow) {
      px(keyEl, '--kx', pad);
      px(keyEl, '--kw', sw - 2 * pad);
      px(keyEl, '--ky', ch + 4);
      const sh = ch + 4 + keyEl.offsetHeight + pad + 4;
      px(sheet, '--sh', sh);
      px(sheet, '--sy', top + Math.max(0, (avail - sh) * 0.42));
      return;
    }
    px(sheet, '--sh', L.sh);
    px(sheet, '--sy', top);
    keyEl.style.removeProperty('--kw');
    // the corner of the South Pacific: left of South America, below Hawaii
    const room = (full) => {
      keyEl.classList.toggle('is-compact', !full);
      const y = ch - pad - 6 - keyEl.offsetHeight;
      const lat = projection.invert([sw / 2, y])[1]; // the legend's top edge, as a latitude
      const right = projection([-76.5, Math.min(-15, lat)])[0] - 14; // short of Chile's coast at that height
      const roof = projection([-157, 17])[1] + 18; // and below Hawaii
      const x = pad + 6; // in the sheet's corner, as far in from its side as from its foot
      return { ok: x + keyEl.offsetWidth <= right && y >= roof, x, y };
    };
    let r = room(true);
    if (!r.ok) r = room(false);
    if (!r.ok) { // too tight even so: in the very corner of the sheet
      r.x = pad + 6;
      r.y = ch - pad - 6 - keyEl.offsetHeight;
    }
    px(keyEl, '--kx', r.x);
    px(keyEl, '--ky', r.y);
  }

  /* ------------------------------------------------------------ the pointer */

  function hit(x, y) {
    if (!L) return null;
    const ready = L.items.filter((it) => it.strokes.length && it.done >= it.strokes.length);
    for (const it of ready) if (it.small && it.pt && Math.hypot(x - it.pt[0], y - it.pt[1]) < 7) return it;
    for (const it of ready) if (it.mask.has(x, y)) return it;
    return null;
  }
  cv.dust.addEventListener('pointermove', (e) => {
    const r = cv.dust.getBoundingClientRect();
    const it = hit(e.clientX - r.left, e.clientY - r.top);
    if (it) FP.tip(e.clientX, e.clientY, FP.about(it.c));
    else FP.tip();
  });
  cv.dust.addEventListener('pointerleave', () => FP.tip());

  /* ------------------------------------------------------------ start */

  words();
  FP.onLang(() => { words(); if (L && L.narrow) build(false); else place(); });
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.all([FP.world('50m'), fonts]).then(([world]) => {
    W = {
      ...world,
      landNoPole: { type: 'FeatureCollection', features: world.features.filter((f) => f.id !== '010') },
    };
    build(!(FP.still || FP.reduced));
    let wait = 0;
    addEventListener('resize', () => { clearTimeout(wait); wait = setTimeout(() => build(false), 160); });
  });
})();
