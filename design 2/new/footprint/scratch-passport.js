/* Scratch map with a passport page 刮刮地圖＋護照內頁 (2026-11-06, round two of the footprint maps).
   He liked the scratch map's look, the passport stamps (but not piled on the countries) and the
   large count of footprint-only, with the share of the world added. So: the scratch poster, his
   countries scratched clean one after another in the order he first went, Taiwan first as home;
   in the poster's band under the map, the count set large with the share of the world's
   countries; and beside the poster a passport visa page, where an entry stamp is pressed for each
   country as it is scratched, in the same order, each in its own place on the page. Pointing at a
   stamp lights its country on the map, pointing at a country lights its stamp; on a phone a tap
   does the same, and the map stays at the top while the page scrolls under it.

   The foil, its textures and the coin's strokes are copied from scratch.js; the stamps are drawn
   as in stamps.js. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  const query = new URLSearchParams(location.search);
  const asked = query.get('lang'); // ?lang=zh opens it in 中文
  if (asked === 'zh' || asked === 'en') FP.setLang(asked);

  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };

  /* ------------------------------------------------------------ words */

  const WORDS = {
    en: {
      visas: 'Visas', arrived: 'Arrived', rail: 'By rail', road: 'By road',
      map: (n) => `A scratch map of the world with ${n} countries scratched clean`,
      page: (n) => `A passport page with an entry stamp for each of the ${n} countries, in the order I first went`,
    },
    zh: {
      visas: '簽證', arrived: '入境', rail: '火車入境', road: '陸路入境',
      map: (n) => `一張刮刮世界地圖，刮開了 ${n} 個國家`,
      page: (n) => `一頁護照，${n} 個國家各蓋一個入境章，照第一次去的順序`,
    },
  };
  const t = () => WORDS[FP.lang];
  const caps = (s) => (FP.lang === 'zh' ? s : s.toUpperCase());
  const PAGE_NO = '8'; // the page of the passport, as printed in its corner

  /* ------------------------------------------------------------ the order he went */

  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));
  // by his first trip there, then as that trip reached them; home first of all
  const visitKey = (c) => `${c.journeys[0]}|${String(journeyById.get(c.journeys[0]).countries.indexOf(c.id)).padStart(2, '0')}`;
  const LIST = [FP.home, ...FP.abroad.slice().sort((a, b) => visitKey(a).localeCompare(visitKey(b)))];

  // the first time he crossed into a country: the leg, how, and where (as stamps.js)
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
  // home's airport: where his flights leave from
  const homeFlight = FP.flights.find((f) => FP.km([f.from.lat, f.from.lng], FP.home.ll) < 60);
  const homeCode = homeFlight && homeFlight.from.code ? homeFlight.from.code : '';

  const STAMPS = LIST.map((c) => (c.home
    ? { c, home: true, code: homeCode, rot: -4, shape: 'ring', ink: 'home', pressed: false }
    : { c, ...entryOf(c), rot: (hash(c.id) - 0.5) * 11, pressed: false }));

  // shapes and inks: varied, and never the same as the stamps just before it on the page
  const SHAPES = ['ring', 'rect', 'oval', 'octagon', 'round', 'hex'];
  const INKS = ['clay', 'olive', 'slate', 'umber', 'blue'];
  const FAMILY = { clay: 'warm', umber: 'warm', home: 'warm', olive: 'green', slate: 'cool', blue: 'cool' };
  (function dress() {
    const usedS = {}, usedI = {};
    SHAPES.forEach((s) => { usedS[s] = 0; });
    INKS.forEach((s) => { usedI[s] = 0; });
    const pick = (opts, used, bad, seed, last) => {
      let pool = opts.filter((o) => !bad.has(o));
      if (!pool.length) pool = opts.filter((o) => o !== last);
      const min = Math.min(...pool.map((o) => used[o]));
      const least = pool.filter((o) => used[o] === min);
      return least[Math.floor(seed * least.length)];
    };
    STAMPS.forEach((st, i) => {
      if (st.home) return;
      const prev = STAMPS.slice(Math.max(0, i - 4), i);
      const last = prev[prev.length - 1];
      const badS = new Set(prev.map((p) => p.shape));
      const badI = new Set(prev.slice(-3).map((p) => p.ink));
      if (last) INKS.filter((k) => FAMILY[k] === FAMILY[last.ink]).forEach((k) => badI.add(k));
      st.shape = pick(SHAPES, usedS, badS, hash(st.c.id + 's'), last && last.shape); usedS[st.shape]++;
      st.ink = pick(INKS, usedI, badI, hash(st.c.id + 'i'), last && last.ink); usedI[st.ink]++;
    });
  })();

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
  stage.innerHTML = `<div class="sp">
      <div class="sp-hold"><div class="sp-sheet">
        <canvas class="sc-base" aria-hidden="true"></canvas>
        <canvas class="sc-edge" aria-hidden="true"></canvas>
        <canvas class="sc-foil" aria-hidden="true"></canvas>
        <canvas class="sc-dust" role="img"></canvas>
        <svg class="sp-lit" aria-hidden="true"><path class="sp-lit__veil"></path><path class="sp-lit__line"></path></svg>
        <p class="sp-home fp-label"></p>
        <i class="sp-rule" aria-hidden="true"></i>
      </div></div>
      <section class="sp-count">
        <div class="sp-count__n"></div>
        <div class="sp-count__side">
          <h1 class="sp-count__where fp-label"></h1>
          <p class="sp-count__w"></p>
          <p class="sp-count__share"></p>
          <p class="sp-count__trips fp-label"></p>
        </div>
      </section>
      <figure class="sp-pass"><svg class="sp-page" role="img"></svg></figure>
    </div>`;
  const sp = stage.querySelector('.sp');
  const sheet = stage.querySelector('.sp-sheet');
  const cv = {
    base: sheet.querySelector('.sc-base'), edge: sheet.querySelector('.sc-edge'),
    foil: sheet.querySelector('.sc-foil'), dust: sheet.querySelector('.sc-dust'),
  };
  const litSvg = sheet.querySelector('.sp-lit');
  const veil = litSvg.querySelector('.sp-lit__veil');
  const outline = litSvg.querySelector('.sp-lit__line');
  const homeEl = sheet.querySelector('.sp-home');
  const count = stage.querySelector('.sp-count');
  const nEl = count.querySelector('.sp-count__n');
  const page = stage.querySelector('.sp-page');
  const px = (node, k, v) => node.style.setProperty(k, `${Math.round(v * 100) / 100}px`);

  const C = FP.counts;
  function words() {
    const w = FP.w, s = t(), zh = FP.lang === 'zh';
    nEl.textContent = FP.fmt(C.countries);
    count.querySelector('.sp-count__where').textContent = w.where;
    count.querySelector('.sp-count__w').textContent = w.countries(C.countries);
    // "10.3% of the world's 195 countries", 「全世界 195 個國家的 10.3%」
    const pct = `<b>${FP.esc(w.pct(C.share))}</b>`, of = `<span>${FP.esc(w.ofWorld(C.world))}</span>`;
    count.querySelector('.sp-count__share').innerHTML = zh ? `${of} ${pct}` : `${pct} ${of}`;
    const a = `${C.trips} ${w.trips(C.trips)}`, b = `${C.continents} ${w.continents(C.continents)}`;
    count.querySelector('.sp-count__trips').textContent = zh ? `${a}，${b}，${w.span(C.since, C.until)}` : `${a}, ${b}, ${w.span(C.since, C.until)}`;
    homeEl.textContent = w.home;
    cv.dust.setAttribute('aria-label', s.map(C.countries));
    page.setAttribute('aria-label', s.page(C.countries));
  }

  /* ------------------------------------------------------------ textures (as scratch.js) */

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

  /* ------------------------------------------------------------ where everything goes */

  const EXTENT = [[-180, -57], [180, 84]];
  const FRAME = d3.geoGraticule().extent(EXTENT).outline();
  // the map's width over its height
  const R_MAP = (() => {
    const p = d3.geoNaturalEarth1();
    p.fitWidth(1000, FRAME);
    const b = d3.geoPath(p).bounds(FRAME);
    return (b[1][0] - b[0][0]) / (b[1][1] - b[0][1]);
  })();

  // the count at size F, its words wrapping inside `side` if given; what it measures
  // (the words never break inside a phrase; the line of trips is left out if it cannot fit)
  const trips = count.querySelector('.sp-count__trips');
  function sizeCount(F, side) {
    count.style.setProperty('--f', `${F.toFixed(1)}px`);
    count.classList.remove('is-short');
    if (side) count.style.setProperty('--side', `${Math.floor(side)}px`);
    else count.style.removeProperty('--side');
    if (side && trips.scrollWidth > trips.clientWidth + 1) count.classList.add('is-short');
    // the narrowest the words can be: their longest unbreakable phrase
    let least = 0;
    const range = document.createRange();
    count.querySelectorAll('.sp-count__where, .sp-count__w, .sp-count__share span').forEach((n) => {
      range.selectNodeContents(n);
      least = Math.max(least, range.getBoundingClientRect().width);
    });
    const r = count.getBoundingClientRect(), n = nEl.getBoundingClientRect();
    return { w: r.width, h: r.height, nw: n.width, gap: F * 0.07, least };
  }

  function plan() {
    const top = (document.querySelector('.fp-top') || {}).offsetHeight || 58;
    document.documentElement.style.setProperty('--top', `${top}px`);
    stage.classList.remove('is-stack');
    sp.classList.remove('is-stack');
    const W = stage.clientWidth, H = stage.clientHeight;
    const stack = W < 760 || W / H < 1.15;
    stage.classList.toggle('is-stack', stack);
    sp.classList.toggle('is-stack', stack);
    return stack ? planStack(stage.clientWidth, stage.clientHeight) : planWide(W, H, top);
  }

  // wide windows: the poster on the left (the map, and the count in the band under it), the
  // passport page on the right, the full height of the poster
  function planWide(W, H, top) {
    const edge = Math.round(clamp(W * 0.032, 16, 40));
    const gap = Math.round(clamp(W * 0.026, 20, 40));
    const availH = H - top - 14;
    const pad = Math.round(clamp(availH * 0.022, 12, 18));
    const air = Math.round(clamp(availH * 0.026, 12, 18)); // between the rule and the count, and under it
    const room = W - 2 * edge - gap;
    const pMin = clamp(availH * 0.55, 250, 600), pMax = availH * 0.8;
    let got = null;
    for (let F = H * 0.445; F >= 90 && !got; F *= 0.97) {
      let b = sizeCount(F, null);
      const band = (bh) => bh + 2 * air + 4;
      let mapH = availH - band(b.h) - 2 * pad;
      let sw = mapH * R_MAP + 2 * pad;
      if (room - sw < pMin) { sw = room - pMin; mapH = (sw - 2 * pad) / R_MAP; }
      if (mapH < 110) continue;
      // the count starts under the map's left edge and stops short of the sheet's right side
      const lead = Math.max(pad + 6, pad + (sw - 2 * pad - mapH * R_MAP) / 2 + 2);
      const inner = sw - lead - pad - 8;
      if (b.w > inner) { // let its words wrap beside the number
        const side = inner - b.nw - b.gap;
        if (side < b.least) continue;
        b = sizeCount(F, side);
        if (b.w > inner || band(b.h) > availH - mapH - 2 * pad) continue;
      }
      got = { F, b, mapH, sw: Math.floor(sw) };
    }
    if (!got) { // a very small window: the smallest count, the map in what is left
      const F = 90, b = sizeCount(F, 160);
      const sw = Math.floor(room - pMin);
      got = { F, b, mapH: Math.max(60, Math.min((sw - 2 * pad) / R_MAP, availH - b.h - 2 * pad - 20)), sw };
    }
    const { b, mapH, sw } = got;
    const pw = Math.floor(Math.min(room - sw, pMax));
    const ox = edge + Math.floor((room - sw - pw) / 2);
    const ch = Math.round(mapH + 2 * pad);
    const projection = d3.geoNaturalEarth1().precision(0.25);
    projection.fitExtent([[pad, pad], [sw - pad, ch - pad]], FRAME);
    const mb = d3.geoPath(projection).bounds(FRAME);
    const grid = pageGrid(pw, availH);
    return {
      stack: false, edge, top, pad, sx: ox, sy: top, sw, sh: availH, ch, projection,
      cx: ox + Math.max(pad + 6, Math.round(mb[0][0]) + 2), cy: top + ch + Math.round((availH - 4 - ch - b.h) / 2),
      px: ox + sw + gap, py: top, pw, ph: availH, grid,
    };
  }

  // phones: the map on top (it stays there), the count under it, then the passport page
  function planStack(W, H) {
    const edge = Math.round(clamp(W * 0.04, 16, 40));
    const pad = 10;
    const sw = W - 2 * edge;
    const projection = d3.geoNaturalEarth1().precision(0.25);
    projection.fitWidth(sw - 2 * pad, FRAME);
    const b0 = d3.geoPath(projection).bounds(FRAME);
    const tr = projection.translate();
    projection.translate([tr[0] + pad, tr[1] + pad - b0[0][1]]);
    const ch = Math.ceil(b0[1][1] - b0[0][1] + 2 * pad);
    // the number as wide as the column, and no taller than about a third of the screen
    let F = Math.min(H * 0.45, 640);
    for (let i = 0; i < 60; i++) {
      const b = sizeCount(F, sw);
      if (b.nw <= sw * 0.985) break;
      F *= 0.98;
    }
    const pw = Math.min(sw, 520);
    const grid = pageGrid(pw, null);
    return { stack: true, edge, top: 0, pad, sw, sh: ch, ch, projection, pw, ph: grid.ph, grid };
  }

  /* ------------------------------------------------------------ the passport page's grid */

  const DIMS = { ring: [1, 1], rect: [1.34, 0.84], oval: [1.36, 0.9], octagon: [1, 1], round: [1.16, 0.92], hex: [1.2, 1.04] };
  // a stamp's box, turned as it is pressed
  function boxOf(shape, rot) {
    const [w, h] = DIMS[shape], a = (rot * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    return [c * w + s * h, s * w + c * h];
  }
  const fitIn = (cw, ch, bw, bh) => Math.min((cw * 0.86) / bw, (ch * 0.84) / bh);

  // rows and columns for every stamp: on a phone three or four to a row and the page as long as
  // it needs; on a wide window whichever gives the largest stamps on a page of the given height
  function pageGrid(pw, ph) {
    const m = {
      l: Math.round(clamp(pw * 0.075, 20, 34)), r: Math.round(clamp(pw * 0.045, 12, 22)),
      t: Math.round(clamp(pw * 0.11, 38, 54)), b: Math.round(clamp(pw * 0.05, 14, 26)),
    };
    const n = STAMPS.length, iw = pw - m.l - m.r;
    const worst = (cw, ch) => Math.min(...SHAPES.map((s) => { const [bw, bh] = boxOf(s, 6); return fitIn(cw, ch, bw, bh); }));
    let best = null;
    for (let cols = ph ? 2 : 3; cols <= (ph ? 7 : 4); cols++) {
      const rows = Math.ceil(n / cols), cw = iw / cols;
      const ch = ph ? (ph - m.t - m.b) / rows : cw * 0.8;
      const s = worst(cw, ch);
      if (!best || s > best.s + 0.5) best = { cols, rows, cw, ch, s };
    }
    const h = ph || Math.ceil(m.t + m.b + best.rows * best.ch);
    // each stamp in its cell, a little off centre and a little crooked, never past its cell
    const sizes = STAMPS.map((st) => { const [bw, bh] = boxOf(st.shape, st.rot); return fitIn(best.cw, best.ch, bw, bh); });
    const cap = Math.min(...sizes) * 1.16;
    STAMPS.forEach((st, i) => {
      const s = Math.min(sizes[i], cap);
      const [bw, bh] = boxOf(st.shape, st.rot);
      const col = i % best.cols, row = Math.floor(i / best.cols);
      const fx = Math.max(0, best.cw - s * bw - 4), fy = Math.max(0, best.ch - s * bh - 4);
      st.place = {
        s,
        x: m.l + best.cw * (col + 0.5) + (hash(st.c.id + 'x') - 0.5) * fx * 0.75,
        y: m.t + best.ch * (row + 0.5) + (hash(st.c.id + 'y') - 0.5) * fy * 0.75,
      };
    });
    return { ...best, m, pw, ph: h, s: d3.median(sizes.map((v) => Math.min(v, cap))) };
  }

  /* ------------------------------------------------------------ the map (as scratch.js) */

  let W = null; // the world's shapes
  let L = null; // the current layout and everything drawn for it
  let run = 0;  // the arrival in progress

  function setVars(l) {
    px(sp, '--edge', l.edge);
    px(sp, '--sw', l.sw); px(sp, '--sh', l.sh);
    px(sp, '--cw', l.sw); px(sp, '--ch', l.ch);
    px(sp, '--pw', l.pw); px(sp, '--ph', l.ph);
    if (!l.stack) {
      px(sp, '--sx', l.sx); px(sp, '--sy', l.sy); px(sp, '--ry', l.ch);
      px(sp, '--cx', l.cx); px(sp, '--cy', l.cy);
      px(sp, '--px', l.px); px(sp, '--py', l.py);
    }
  }

  function build(animate) {
    const my = ++run;
    light(null);
    FP.tip();
    const lay = plan();
    setVars(lay);
    const { sw, ch, projection } = lay;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(sw * dpr), chd = Math.round(ch * dpr);
    const path = d3.geoPath(projection);
    const P = (g) => { const s = path(g); return s ? new Path2D(s) : null; };

    for (const k in cv) { cv[k].width = cw; cv[k].height = chd; }
    litSvg.setAttribute('viewBox', `0 0 ${sw} ${ch}`);

    const frameP = P(FRAME);
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
    const items = LIST.map((c, i) => {
      const f = homeland(c.home ? W.home : W.visited.find((v) => v.id === c.iso));
      const area = path.area(f);
      const pt = projection([c.ll[1], c.ll[0]]);
      const it = { c, f, p: P(f), area, pt, colour: colourOf(c), tiny: area < 9, small: area < 70, strokes: [], done: 0, stamp: STAMPS[i] };
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
    const d0 = coin * 0.8;
    base.globalAlpha = 0.7;
    base.strokeStyle = PAL.hair; base.lineWidth = d0 * 2; base.stroke(shores);
    base.globalAlpha = 1;
    base.strokeStyle = PAL['paper-2']; base.lineWidth = d0 * 2 - 1; base.stroke(shores);
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
    placeHome();
    drawPage();

    /* the arrival: Taiwan, then each country in the order he first went, its stamp pressed as
       its foil comes off */
    const total = 3300, lead = 380;
    const weights = items.map((it) => 70 + 20 * Math.sqrt(it.strokes.length + 1));
    const sum = weights.reduce((a, b) => a + b, 0);
    let at = lead;
    items.forEach((it, i) => { it.start = at; it.dur = (weights[i] / sum) * total; at += it.dur; });

    if (!animate) { items.forEach((it) => { cutTo(it, it.strokes.length); press(it.stamp, false); }); return; }
    const at0 = +query.get('at');
    if (at0) { // the arrival held still at that moment, for checking it
      items.forEach((it) => {
        cutTo(it, Math.round(Math.max(0, Math.min(1, (at0 - it.start) / it.dur)) * it.strokes.length));
        if (at0 >= it.start + it.dur) press(it.stamp, false);
      });
      return;
    }
    STAMPS.forEach((st) => { st.pressed = false; if (st.node) st.node.classList.remove('is-on'); });
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
        else if (!it.stamp.pressed) press(it.stamp, true);
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

  // Taiwan's mark, out in the Pacific; on a phone, under the island
  function placeHome() {
    const tw = L.items[0];
    if (!tw.pt) return;
    const b = L.path.bounds(tw.f);
    homeEl.classList.toggle('is-under', L.stack);
    if (L.stack) { px(homeEl, '--hx', tw.pt[0]); px(homeEl, '--hy', b[1][1] + 3); }
    else { px(homeEl, '--hx', b[1][0] + 4); px(homeEl, '--hy', tw.pt[1] - homeEl.offsetHeight / 2); }
  }

  /* ------------------------------------------------------------ drawing a stamp (as stamps.js) */

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
  let defs = null, arcN = 0;
  function arcText(g, cls, str, r, top, size, maxAngle) {
    const id = `sp-arc-${arcN++}`;
    el('path', { id, d: top ? `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0` : `M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0`, fill: 'none' }, defs);
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
    const s = t();
    if (st.home) return { name: caps(st.c.country[FP.lang]), big: caps(FP.w.home), date: st.code, mark: '' };
    const year = String(st.c.first);
    const date = caps(st.j.date[FP.lang]);
    const mark = st.via === 'rail' ? s.rail : st.via === 'road' ? s.road : s.arrived;
    if (st.code) return { name: caps(st.c.country[FP.lang]), big: st.code, date, mark: caps(s.arrived) };
    return { name: caps(st.c.country[FP.lang]), big: year, date: caps(mark), mark: '' };
  }

  // each shape draws itself around (0, 0) at size S
  const DRAW = {
    ring(g, S, w) {
      const R = S / 2, ri = R * 0.66, rm = (R + ri) / 2 - S * 0.005;
      el('circle', { class: 'st-edge', r: R - S * 0.017 }, g);
      el('circle', { class: 'st-line', r: ri }, g);
      arcText(g, 'st-name', w.name, rm, true, S * 0.105, 2.35);
      arcText(g, 'st-date', w.date, rm, false, S * 0.082, 2.2);
      el('circle', { class: 'st-fill', cx: -rm, cy: 0, r: S * 0.016 }, g);
      el('circle', { class: 'st-fill', cx: rm, cy: 0, r: S * 0.016 }, g);
      if (w.mark) text(g, 'st-mark', w.mark, 0, -ri * 0.48, S * 0.062, ri * 1.3);
      text(g, 'st-big', w.big, 0, w.mark ? ri * 0.16 : 0, S * (w.big.length > 3 ? 0.2 : 0.25), ri * 1.6);
    },
    rect(g, S, w) {
      const W = S * 1.34, H = S * 0.84, i = S * 0.065;
      el('rect', { class: 'st-edge', x: -W / 2, y: -H / 2, width: W, height: H }, g);
      el('rect', { class: 'st-line', x: -W / 2 + i, y: -H / 2 + i, width: W - 2 * i, height: H - 2 * i }, g);
      text(g, 'st-name', w.name, 0, -H * 0.27, S * 0.105, W - 4 * i);
      el('line', { class: 'st-line', x1: -W / 2 + i, x2: W / 2 - i, y1: -H * 0.12, y2: -H * 0.12 }, g);
      text(g, 'st-big', w.big, 0, H * 0.08, S * 0.24, W - 4 * i);
      text(g, 'st-date', w.date, 0, H * 0.3, S * 0.078, W - 4 * i);
    },
    oval(g, S, w) {
      const rx = S * 0.68, ry = S * 0.45;
      el('ellipse', { class: 'st-edge', rx, ry }, g);
      el('ellipse', { class: 'st-line', rx: rx - S * 0.075, ry: ry - S * 0.075 }, g);
      text(g, 'st-name', w.name, 0, -ry * 0.48, S * 0.098, rx * 1.15);
      text(g, 'st-big', w.big, 0, ry * 0.06, S * 0.21, rx * 1.3);
      text(g, 'st-date', w.date, 0, ry * 0.5, S * 0.074, rx * 1.05);
    },
    octagon(g, S, w) {
      const R = S * 0.54;
      el('polygon', { class: 'st-edge', points: poly(8, R, Math.PI / 8) }, g);
      el('polygon', { class: 'st-line', points: poly(8, R * 0.85, Math.PI / 8) }, g);
      if (w.mark) text(g, 'st-mark', w.mark, 0, -R * 0.5, S * 0.06, R * 1.1);
      text(g, 'st-name', w.name, 0, w.mark ? -R * 0.25 : -R * 0.34, S * 0.098, R * 1.5);
      text(g, 'st-big', w.big, 0, R * 0.1, S * 0.2, R * 1.4);
      text(g, 'st-date', w.date, 0, R * 0.44, S * 0.072, R * 1.25);
    },
    round(g, S, w) {
      const W = S * 1.16, H = S * 0.92, rr = S * 0.15;
      el('rect', { class: 'st-edge', x: -W / 2, y: -H / 2, width: W, height: H, rx: rr }, g);
      el('line', { class: 'st-line', x1: -W / 2 + S * 0.04, x2: W / 2 - S * 0.04, y1: -H * 0.14, y2: -H * 0.14 }, g);
      el('line', { class: 'st-line', x1: -W / 2 + S * 0.04, x2: W / 2 - S * 0.04, y1: H * 0.24, y2: H * 0.24 }, g);
      text(g, 'st-name', w.name, 0, -H * 0.32, S * 0.1, W - S * 0.16);
      text(g, 'st-big', w.big, 0, H * 0.05, S * 0.23, W - S * 0.2);
      text(g, 'st-date', w.date, 0, H * 0.37, S * 0.074, W - S * 0.2);
    },
    hex(g, S, w) {
      const R = S * 0.6;
      el('polygon', { class: 'st-edge', points: poly(6, R) }, g);
      el('polygon', { class: 'st-line', points: poly(6, R * 0.84) }, g);
      text(g, 'st-name', w.name, 0, -R * 0.36, S * 0.096, R * 1.15);
      text(g, 'st-big', w.big, 0, R * 0.05, S * 0.21, R * 1.3);
      text(g, 'st-date', w.date, 0, R * 0.42, S * 0.07, R * 1.0);
    },
  };

  // the ink: uneven cover, a slightly rough edge; a few versions so no two stamps print alike
  const FILTERS = 5;
  function inkFilters() {
    for (let i = 0; i < FILTERS; i++) {
      const f = el('filter', { id: `sp-ink-${i}`, x: '-12%', y: '-12%', width: '124%', height: '124%', 'color-interpolation-filters': 'sRGB' }, defs);
      el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.7', numOctaves: '2', seed: String(3 + i * 7), result: 'fine' }, f);
      el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: String(41 + i * 13), result: 'blot' }, f);
      el('feDisplacementMap', { in: 'SourceGraphic', in2: 'fine', scale: '0.9', xChannelSelector: 'R', yChannelSelector: 'G', result: 'rough' }, f);
      el('feColorMatrix', { in: 'fine', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 -4.1', result: 'speck' }, f);
      el('feColorMatrix', { in: 'blot', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.1', result: 'patch' }, f);
      el('feComposite', { in: 'speck', in2: 'patch', operator: 'arithmetic', k1: '1', k2: '0', k3: '0', k4: '0', result: 'cover' }, f);
      el('feComposite', { in: 'rough', in2: 'cover', operator: 'in' }, f);
    }
  }

  /* ------------------------------------------------------------ the passport page */

  // the fine printing of a visa page: two waves crossing on every line, and a rosette
  function guilloche(g, w, h, m) {
    const lam = Math.max(70, w / 3.4), amp = clamp(w * 0.016, 4, 7.5), step = clamp(w * 0.017, 6, 8.5);
    let d = '';
    for (let y = -amp, k = 0; y < h + amp; y += step, k++) {
      for (const ph of [0, Math.PI]) {
        for (let x = 0; x <= w + 6; x += 6) {
          const yy = y + amp * Math.sin((x / lam) * Math.PI * 2 + ph + k * 0.42);
          d += `${x ? 'L' : 'M'}${x} ${yy.toFixed(1)}`;
        }
      }
    }
    el('path', { class: 'sp-gu', d }, g);
    const cx = m.l + (w - m.l - m.r) / 2, cy = m.t + (h - m.t - m.b) / 2;
    const R0 = Math.min(w - m.l - m.r, h - m.t - m.b) * 0.38;
    let r = '';
    for (const [rad, n, a, copies] of [[R0, 18, 0.085, 9], [R0 * 0.62, 11, 0.13, 7]]) {
      for (let c = 0; c < copies; c++) {
        const off = (c / copies) * ((Math.PI * 2) / n);
        for (let i = 0; i <= 540; i++) {
          const th = (i / 540) * Math.PI * 2;
          const rr = rad * (1 + a * Math.sin(n * (th + off)));
          r += `${i ? 'L' : 'M'}${(cx + Math.cos(th) * rr).toFixed(1)} ${(cy + Math.sin(th) * rr).toFixed(1)}`;
        }
      }
    }
    el('path', { class: 'sp-rose', d: r }, g);
  }

  function drawPage() {
    const G = L.grid;
    const { pw, ph, m } = G;
    page.setAttribute('viewBox', `0 0 ${pw} ${ph}`);
    page.replaceChildren();
    arcN = 0;
    defs = el('defs', null, page);
    inkFilters();
    const clip = el('clipPath', { id: 'sp-clip' }, defs);
    el('rect', { width: pw, height: ph }, clip);
    el('rect', { class: 'sp-page__paper', x: 0.5, y: 0.5, width: pw - 1, height: ph - 1 }, page);
    guilloche(el('g', { 'clip-path': 'url(#sp-clip)', 'aria-hidden': 'true' }, page), pw, ph, m);
    // sewn into the passport along its left edge
    el('line', { class: 'sp-stitch', x1: 8, x2: 8, y1: 8, y2: ph - 8 }, page);
    // the page's heading and its number, in the top corners
    const hy = Math.round(m.t * 0.48);
    el('text', { class: 'sp-head', x: m.l, y: hy, 'dominant-baseline': 'central' }, page).textContent = caps(t().visas);
    el('text', { class: 'sp-num', x: pw - m.r, y: hy, 'text-anchor': 'end', 'dominant-baseline': 'central' }, page).textContent = PAGE_NO;
    page.style.setProperty('--st-heavy', `${(G.s * 0.03).toFixed(2)}px`);
    page.style.setProperty('--st-thin', `${clamp(G.s * 0.011, 0.7, 1.1).toFixed(2)}px`);
    const stamps = el('g', { class: 'sp-stamps' }, page);
    STAMPS.forEach((st, i) => {
      const p = st.place;
      const outer = el('g', { class: 'st', transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${st.rot.toFixed(1)})`, tabindex: '0', role: 'img', 'aria-label': aboutText(st.c) }, stamps);
      const press = el('g', { class: `st-press ink-${st.ink}${st.pressed ? ' is-on' : ''}` }, outer);
      DRAW[st.shape](el('g', { filter: `url(#sp-ink-${i % FILTERS})` }, press), p.s, wordsOf(st));
      const [dw, dh] = DIMS[st.shape];
      el('rect', { class: 'st-hit', x: (-dw * p.s) / 2, y: (-dh * p.s) / 2, width: dw * p.s, height: dh * p.s }, outer);
      st.outer = outer; st.node = press;
      bind(outer, st);
    });
  }
  function aboutText(c) {
    const w = FP.w, sep = FP.lang === 'zh' ? '，' : ', ';
    return c.home ? `${c.name[FP.lang]}${sep}${w.home}` : `${c.name[FP.lang]}${sep}${w.first(c.first)}${sep}${w.times(c.trips)}`;
  }

  // a stamp comes down: a short, quiet scale and fade where it lands
  function press(st, anim) {
    if (st.pressed) return;
    st.pressed = true;
    if (!st.node) return;
    st.node.classList.add('is-on');
    if (anim && !FP.reduced) {
      st.node.animate(
        [{ transform: 'scale(1.07)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: 260, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
      );
    }
  }

  /* ------------------------------------------------------------ a country and its stamp, lit together */

  let lit = null;
  const circle = (p, r) => `M${(p[0] - r).toFixed(1)} ${p[1].toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  function light(c) {
    if (lit === c) return;
    lit = c;
    const it = c && L ? L.items.find((x) => x.c === c) : null;
    if (it) {
      const ringed = it.small && it.pt;
      const shape = ringed ? circle(it.pt, 10) : L.path(it.f);
      veil.setAttribute('d', `M0 0H${L.sw}V${L.ch}H0Z${shape}`);
      outline.setAttribute('d', ringed ? `${L.path(it.f) || ''}${circle(it.pt, 9)}` : shape);
    }
    litSvg.classList.toggle('is-on', !!it);
    page.classList.toggle('is-lit', !!c);
    STAMPS.forEach((s) => { if (s.outer) s.outer.classList.toggle('is-lit', s.c === c); });
  }

  const mouse = (e) => e.pointerType === 'mouse';
  // a tap lights it, a second tap or a tap elsewhere puts it out
  function tap(c, e) {
    if (!c || c === lit) { light(null); FP.tip(); return; }
    light(c);
    FP.tip(e.clientX, e.clientY, FP.about(c));
  }

  function bind(g, st) {
    g.addEventListener('pointerenter', (e) => { if (mouse(e) && st.pressed) { light(st.c); FP.tip(e.clientX, e.clientY, FP.about(st.c)); } });
    g.addEventListener('pointermove', (e) => { if (mouse(e) && st.pressed) FP.tip(e.clientX, e.clientY, FP.about(st.c)); });
    g.addEventListener('pointerleave', (e) => { if (mouse(e)) { light(null); FP.tip(); } });
    g.addEventListener('focus', () => {
      if (!st.pressed) return;
      light(st.c);
      const r = g.getBoundingClientRect();
      FP.tip(r.right - 8, r.top + 8, FP.about(st.c));
    });
    g.addEventListener('blur', () => { light(null); FP.tip(); });
  }

  // the countries already scratched, under the pointer
  function hit(x, y) {
    if (!L) return null;
    const ready = L.items.filter((it) => it.strokes.length && it.done >= it.strokes.length);
    for (const it of ready) if (it.small && it.pt && Math.hypot(x - it.pt[0], y - it.pt[1]) < 7) return it;
    for (const it of ready) if (it.mask.has(x, y)) return it;
    return null;
  }
  const mapAt = (e) => { const r = cv.dust.getBoundingClientRect(); return hit(e.clientX - r.left, e.clientY - r.top); };
  cv.dust.addEventListener('pointermove', (e) => {
    if (!mouse(e)) return;
    const it = mapAt(e);
    light(it ? it.c : null);
    if (it) FP.tip(e.clientX, e.clientY, FP.about(it.c));
    else FP.tip();
  });
  cv.dust.addEventListener('pointerleave', (e) => { if (mouse(e)) { light(null); FP.tip(); } });
  // a finger: a tap (not the start of a scroll) on a stamp or a country lights both
  let down = null;
  document.addEventListener('pointerdown', (e) => { down = mouse(e) ? null : { x: e.clientX, y: e.clientY }; });
  document.addEventListener('pointercancel', () => { down = null; });
  document.addEventListener('pointerup', (e) => {
    if (mouse(e) || !down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8;
    down = null;
    if (moved) return;
    const hitEl = e.target.closest ? e.target.closest('.st') : null;
    const st = hitEl && STAMPS.find((s) => s.outer === hitEl);
    if (st) { if (st.pressed) tap(st.c, e); return; }
    if (e.target === cv.dust) { const it = mapAt(e); tap(it ? it.c : null, e); return; }
    if (e.target.closest && e.target.closest('.fp-top, .rv-bar, [class^="rv"]')) return;
    light(null);
    FP.tip();
  });
  stage.addEventListener('scroll', () => FP.tip(), { passive: true });

  /* ------------------------------------------------------------ start */

  const fontsIn = Promise.all([
    document.fonts.load('400 120px "Playfair Display"', '0123456789%'),
    document.fonts.load('400 40px "Playfair Display"', 'countries'),
    document.fonts.load('500 12px "Geist"', 'Aa'),
    document.fonts.load('600 12px "Geist"', 'Aa'),
    document.fonts.load('500 40px "Noto Serif TC"', '個國家'),
    document.fonts.load('600 20px "Noto Serif TC"', '家'),
    document.fonts.load('500 12px "Noto Sans TC"', '我去過的地方全世界個國家的趟旅行大洲到簽證，'),
    document.fonts.load('600 12px "Noto Sans TC"', LIST.map((c) => c.country.zh).join('') + '入境火車陸路'),
  ]).catch(() => null);

  words();
  Promise.all([FP.world('50m'), fontsIn]).then(([world]) => {
    W = {
      ...world,
      landNoPole: { type: 'FeatureCollection', features: world.features.filter((f) => f.id !== '010') },
    };
    build(!(FP.still || FP.reduced));
    FP.onLang(() => { words(); build(false); });
    // redraw only when the stage really changes size (the review bar arriving is not a resize)
    let wait = 0, size = `${innerWidth}x${innerHeight}`;
    addEventListener('resize', () => {
      clearTimeout(wait);
      wait = setTimeout(() => {
        const now = `${innerWidth}x${innerHeight}`;
        if (now !== size) { size = now; build(false); }
      }, 160);
    });
  });
})();
