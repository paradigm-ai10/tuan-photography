/* Pins and thread 圖釘與紅線 (2026-11-06), one of the ten footprint maps.
   A paper wall map, centred on the Pacific as maps are printed in Taiwan, with a pin pushed in at
   every place he has been, coloured by when he first went; the home pin at Taipei bigger and red;
   and a red wool thread that runs from home through each trip's places in order and back, trip by
   trip, so the lines he has travelled most are the thickest bundles. The counts are on a small card
   pinned in the South Pacific (below the map on a phone). On arrival the pins go in trip by trip,
   oldest first, each with a small press, then the thread is wound (about 4 s in all). */
(() => {
  'use strict';
  const FP = window.FP;
  const d3 = window.d3;
  const esc = FP.esc;
  FP.chrome();

  const stage = document.getElementById('stage');
  const NS = 'http://www.w3.org/2000/svg';

  const WORDS = {
    en: {
      years: (ys) => ys.join(' and '),
      map: 'A wall map with a pin at every place I have been, and a red thread for every trip from home',
    },
    zh: {
      years: (ys) => ys.map((y) => `${y} 年`).join('和'),
      map: '一張牆上的地圖，去過的每個地方都釘了一根圖釘，每趟旅行從家出發都繞上一條紅線',
    },
  };
  const own = () => WORDS[FP.lang];

  const CENTRE = 155;  // the Pacific in the middle; the cut runs down the Atlantic, west of Iceland
  const SOUTH = -58;   // Antarctica is left off: the sheet ends below Cape Horn
  const yearOf = (id) => +String(id).slice(0, 4);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ------------------------------------------------------------ the pins and the trips */

  const near = (ll) => FP.km(ll, FP.home.ll) < 60; // Taipei and Taoyuan are home
  const home = { name: FP.home.name, ll: FP.home.ll, country: FP.home, home: true, years: [], journeys: [] };
  const byCity = new Map(FP.places.map((p) => [p.name.en, p]));
  const pins = FP.places.map((p) => ({
    name: p.name, ll: p.ll, country: FP.byId.get(p.country) || null,
    years: [...new Set(p.years)], journeys: p.journeys.slice(),
  }));
  const pinOf = new Map(FP.places.map((p, i) => [p, pins[i]]));
  // a trip with no route kept (the Netherlands, Myanmar) gets one pin at the country itself
  for (const c of FP.abroad) {
    if (pins.some((p) => p.country === c)) continue;
    pins.push({ name: c.name, ll: c.ll, country: c, years: c.years.slice(), journeys: c.journeys.slice(), whole: true });
  }

  const trips = FP.journeys.map((j) => {
    const seq = [];
    const add = (p) => { if (p && seq[seq.length - 1] !== p) seq.push(p); };
    const at = (pt) => (near([pt.lat, pt.lng]) ? home : pinOf.get(byCity.get(pt.city)));
    if (!j.legs.length) {
      add(home);
      j.countries.forEach((id) => add(pins.find((p) => p.country && p.country.id === id)));
      add(home);
    } else {
      j.legs.forEach((l) => { add(at(l.from)); add(at(l.to)); });
    }
    return { id: j.id, year: yearOf(j.id), seq };
  });
  // each pin goes in on the trip that first reached it, in the order the trip reached it
  const order = [];
  const placed = new Set([home]);
  trips.forEach((t, ti) => {
    t.fresh = [];
    for (const p of t.seq) if (!placed.has(p)) { placed.add(p); p.trip = ti; t.fresh.push(p); order.push(p); }
  });
  for (const p of pins) if (!placed.has(p)) { p.trip = trips.length - 1; order.push(p); } // nothing is left out

  // the colours of the pins: the last two years each their own, the years before split at the longest pause
  const tripYears = [...new Set(trips.map((t) => t.year))].sort((a, b) => a - b);
  const ERAS = (() => {
    const ys = tripYears;
    if (ys.length <= 4) return ys.map((y) => [y, y]);
    const rest = ys.slice(0, -2);
    let cut = 1, gap = -1;
    for (let i = 1; i < rest.length; i++) if (rest[i] - rest[i - 1] > gap) { gap = rest[i] - rest[i - 1]; cut = i; }
    return [[rest[0], rest[cut - 1]], [rest[cut], rest[rest.length - 1]], ...ys.slice(-2).map((y) => [y, y])];
  })();
  const eraOf = (y) => Math.max(0, ERAS.findIndex((e) => y >= e[0] && y <= e[1]));
  for (const p of pins) p.era = eraOf(yearOf(p.journeys[0] || trips[p.trip].id));

  // a small seeded random, so the thread has the same small irregularities every time
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ------------------------------------------------------------ the map */

  // the part of the world on the sheet: every longitude, from the pole down to 58 degrees south
  const outline = (() => {
    const pts = [];
    for (let o = -179.9; o <= 179.9; o += 2) { pts.push([CENTRE + o, 90], [CENTRE + o, SOUTH]); }
    for (let lat = SOUTH; lat <= 90; lat += 2) { pts.push([CENTRE - 179.9, lat], [CENTRE + 179.9, lat]); }
    return { type: 'MultiPoint', coordinates: pts };
  })();
  const ASPECT = (() => {
    const pr = d3.geoNaturalEarth1().rotate([-CENTRE, 0]).fitWidth(1000, outline);
    const b = d3.geoPath(pr).bounds(outline);
    return (b[1][0] - b[0][0]) / (b[1][1] - b[0][1]);
  })();

  const el = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  let world = null;
  let anim = null;      // the arrival, while it runs
  let started = false;  // the arrival plays once; a rebuild after it draws the finished map
  let svg = null, card = null;

  function makeCard() {
    const w = FP.w, c = FP.counts;
    const span = (e) => (e[0] === e[1] ? String(e[0]) : w.span(e[0], e[1]));
    const count = (n, label) => `<p class="pn-count"><span class="pn-count__n">${esc(FP.fmt(n))}</span><span class="pn-count__l">${esc(label)}</span></p>`;
    const box = document.createElement('aside');
    box.className = 'pn-card';
    box.innerHTML = `<span class="pn-card__pin" aria-hidden="true"></span>
      <h1 class="pn-card__title">${esc(w.where)}</h1>
      <p class="fp-label pn-card__span">${esc(w.span(c.since, c.until))}</p>
      <div class="pn-card__counts">
        ${count(c.countries, w.countries(c.countries))}
        ${count(c.trips, w.trips(c.trips))}
        ${count(pins.length, w.cities(pins.length))}
      </div>
      <ul class="pn-card__key">
        <li><i class="pn-bead pn-bead--home" aria-hidden="true"></i>${esc(w.home)}</li>
        ${ERAS.map((e, i) => `<li><i class="pn-bead pn-era-${i}" aria-hidden="true"></i>${esc(span(e))}</li>`).join('')}
      </ul>`;
    return box;
  }

  function build() {
    if (!world) return;
    const W = stage.clientWidth, H = stage.clientHeight;
    size = `${W}x${H}`;
    const narrow = W < 720 || W / H < 1.1;
    stage.textContent = '';
    stage.classList.toggle('is-narrow', narrow);

    card = makeCard();
    stage.appendChild(card);
    const cw = card.offsetWidth, ch = card.offsetHeight;

    // the map's box: under the top bar, as large as the window allows
    const TOP = 66;
    const side = narrow ? 16 : clamp(W * 0.03, 16, 40);
    let x0, y0, x1, y1;
    if (narrow) {
      const mw = W - 2 * side, mh = mw / ASPECT, gap = 30;
      const total = mh + gap + ch;
      y0 = Math.max(TOP + 6, TOP + (H - TOP - 8 - total) / 2);
      x0 = side; x1 = W - side; y1 = y0 + mh;
    } else {
      x0 = side; x1 = W - side; y0 = TOP + 2; y1 = H - 14;
      const bw = x1 - x0, bh = y1 - y0;
      if (bw / bh > ASPECT) { const mw = bh * ASPECT; x0 = (W - mw) / 2; x1 = x0 + mw; } else { const mh = bw / ASPECT; y0 += (bh - mh) / 2; y1 = y0 + mh; }
    }
    const pad = Math.round(clamp((x1 - x0) * 0.008, 4, 12));
    const proj = d3.geoNaturalEarth1().rotate([-CENTRE, 0]).fitExtent([[x0 + pad, y0 + pad], [x1 - pad, y1]], outline);
    const southY = proj([CENTRE, SOUTH])[1];
    const frame = { x0, y0, x1, y1: southY };
    proj.clipExtent([[frame.x0, frame.y0], [frame.x1, frame.y1]]);
    const path = d3.geoPath(proj);
    const mapW = frame.x1 - frame.x0;
    const r = clamp(mapW / 330, 2.1, 4.4);  // a pin head
    const S = clamp(mapW / 1300, 0.55, 1.1); // the thread and the shadows, in step with the map

    svg = el('svg', { class: 'pn-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': own().map });
    const defs = el('defs', {}, svg);
    const soft = el('filter', { id: 'pn-soft', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
    el('feGaussianBlur', { stdDeviation: (0.5 * S + 0.3).toFixed(2) }, soft);

    // the printed map
    const map = el('g', { class: 'pn-map' }, svg);
    el('path', { class: 'pn-grat', d: path(d3.geoGraticule().step([30, 30])()) }, map);
    el('path', { class: 'pn-sphere', d: path({ type: 'Sphere' }) }, map);
    const lands = el('g', { class: 'pn-lands' }, map);
    for (const f of world.features) {
      if (f.id === '010') continue; // Antarctica
      const c = world.mine(f);
      if (!c) { const d = path(f); if (d) el('path', { class: 'pn-land', d }, lands); continue; }
      // the parts of a country far from home ground (French Guiana, the Falklands) are not where he went
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const nearBy = (poly) => c.id === 'usa' || FP.km((([x, y]) => [y, x])(d3.geoCentroid({ type: 'Polygon', coordinates: poly })), c.ll) < 3500;
      const far = polys.filter((q) => !nearBy(q)), mine = polys.filter(nearBy);
      if (far.length) { const d = path({ type: 'MultiPolygon', coordinates: far }); if (d) el('path', { class: 'pn-land', d }, lands); }
      const d = path({ type: 'MultiPolygon', coordinates: mine });
      if (!d) continue;
      const p = el('path', { class: c.home ? 'pn-land pn-visited pn-home' : 'pn-land pn-visited', d }, lands);
      p.dataset.country = c.id;
    }
    el('rect', { class: 'pn-frame', x: frame.x0, y: frame.y0, width: mapW, height: frame.y1 - frame.y0 }, map);
    const o = Math.max(3, Math.round(4 * S));
    el('rect', { class: 'pn-frame pn-frame--outer', x: frame.x0 - o, y: frame.y0 - o, width: mapW + 2 * o, height: frame.y1 - frame.y0 + 2 * o }, map);

    // where each pin goes in, and where its head sits: crowded pins lean on each other a little
    const all = [home, ...pins];
    for (const p of all) {
      const xy = proj([p.ll[1], p.ll[0]]);
      p.x = xy[0]; p.y = xy[1]; p.hx = p.x; p.hy = p.y;
      p.r = p.home ? r * 1.6 : r;
    }
    for (let it = 0; it < 90; it++) {
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i], b = all[j];
          let dx = b.hx - a.hx, dy = b.hy - a.hy, d = Math.hypot(dx, dy);
          const need = (a.r + b.r) * 0.7;
          if (d >= need) continue;
          if (d < 1e-3) { const ang = (i * 2.4 + j * 0.7) % (Math.PI * 2); dx = Math.cos(ang); dy = Math.sin(ang); d = 1; } else { dx /= d; dy /= d; }
          const push = need - d;
          if (a.home) { b.hx += dx * push; b.hy += dy * push; } else if (b.home) { a.hx -= dx * push; a.hy -= dy * push; } else {
            a.hx -= dx * push / 2; a.hy -= dy * push / 2; b.hx += dx * push / 2; b.hy += dy * push / 2;
          }
        }
      }
      for (const p of all) {
        if (p.home) { p.hx = p.x; p.hy = p.y; continue; }
        p.hx += (p.x - p.hx) * 0.04; p.hy += (p.y - p.hy) * 0.04;
        const ox = p.hx - p.x, oy = p.hy - p.y, off = Math.hypot(ox, oy), max = p.r * 2.2;
        if (off > max) { p.hx = p.x + ox / off * max; p.hy = p.y + oy / off * max; }
      }
    }

    // the thread, trip by trip: drawn as a fine line with a little give, sagging a hair between pins
    const threadG = el('g', { class: 'pn-threads' }, svg);
    const threadShadow = el('g', { class: 'pn-thread-shadows' }, threadG);
    const threadLine = el('g', { class: 'pn-thread-lines' }, threadG);
    let total = 0;
    trips.forEach((t, ti) => {
      const rnd = rng(9173 + ti * 131);
      const pts = [];
      for (let i = 0; i < t.seq.length - 1; i++) {
        const a = t.seq[i], b = t.seq[i + 1];
        // the thread goes round the pin's shank, a hair to one side of the hole
        const ax = a.x, ay = a.y, bx = b.x, by = b.y;
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
        if (len < 0.5) continue;
        const nx = -dy / len, ny = dx / len;
        const n = Math.max(2, Math.ceil(len / 4));
        const f1 = 0.6 + rnd() * 1.4, p1 = rnd() * 6.283, f2 = 3 + rnd() * 5, p2 = rnd() * 6.283;
        const amp = Math.min(1.3, 0.3 + len * 0.0022) * S;
        const sag = len * 0.004;
        for (let k = pts.length ? 1 : 0; k <= n; k++) {
          const u = k / n, env = Math.sin(Math.PI * u);
          const wob = env * amp * (0.75 * Math.sin(6.283 * f1 * u + p1) + 0.25 * Math.sin(6.283 * f2 * u + p2));
          pts.push([ax + dx * u + nx * wob, ay + dy * u + ny * wob + env * sag]);
        }
      }
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      t.pts = pts; t.cum = cum; t.len = cum[cum.length - 1] || 0;
      t.from = total; total += t.len;
      // its shadow: a wide faint stroke under a narrow one, soft without a blur to redraw on every frame
      const sh = el('g', { transform: `translate(${(0.9 * S).toFixed(2)} ${(1.5 * S).toFixed(2)})` }, threadShadow);
      t.shadow = el('path', { class: 'pn-thread-shadow' }, sh);
      t.shadow2 = el('path', { class: 'pn-thread-shadow pn-thread-shadow--core' }, sh);
      t.line = el('path', { class: 'pn-thread' }, threadLine);
      t.twist = el('path', { class: 'pn-thread-twist' }, threadLine);
    });
    trips.total = total;
    stage.style.setProperty('--pn-s', S.toFixed(3));

    // the pins: shadows on the paper first, then the shanks where a head leans aside, then the heads
    const shadows = el('g', { class: 'pn-pin-shadows' }, svg);
    const shanks = el('g', { class: 'pn-shanks' }, svg);
    const heads = el('g', { class: 'pn-heads' }, svg);
    const drawOrder = [home, ...order];
    drawOrder.forEach((p, i) => {
      p.i = i;
      p.sh = el('g', { filter: 'url(#pn-soft)' }, shadows);
      p.shDot = el('circle', { class: 'pn-pin-shadow', r: (p.r * 0.95).toFixed(2) }, p.sh);
      p.shLine = el('line', { class: 'pn-pin-shadow-shank' }, p.sh);
      const lean = Math.hypot(p.hx - p.x, p.hy - p.y);
      p.shank = lean > 0.6 ? el('line', { class: 'pn-shank', x1: p.x, y1: p.y, x2: p.hx, y2: p.hy }, shanks) : null;
      p.g = el('g', { class: `pn-pin ${p.home ? 'pn-pin--home' : `pn-era-${p.era}`}` }, heads);
      el('circle', { class: 'pn-head', r: p.r.toFixed(2) }, p.g);
      el('circle', { class: 'pn-hi', r: (p.r * 0.34).toFixed(2), cx: (-p.r * 0.36).toFixed(2), cy: (-p.r * 0.38).toFixed(2) }, p.g);
      el('circle', { class: 'pn-hit', r: (Math.max(p.r, 5) * 1.15).toFixed(2), 'data-pin': i }, p.g);
    });

    stage.appendChild(svg);
    stage.appendChild(card); // the card above the map

    // the card: pinned in the South Pacific, between New Zealand and South America; below the map on a phone
    if (narrow) {
      card.style.setProperty('--x', `${Math.round((W - cw) / 2)}px`);
      card.style.setProperty('--y', `${Math.round(frame.y1 + 30)}px`);
    } else {
      const a = proj([-160, 0]), b = proj([-80, 0]); // the open ocean, as wide as it is here
      const room = b[0] - a[0];
      const x = clamp(a[0] + (room - cw) * 0.38, frame.x0 + 12, frame.x1 - cw - 12);
      const y = clamp(frame.y1 - ch - Math.max(14, (frame.y1 - frame.y0) * 0.035), frame.y0 + 12, H - ch - 8);
      card.style.setProperty('--x', `${Math.round(x)}px`);
      card.style.setProperty('--y', `${Math.round(y)}px`);
    }

    state = { all: drawOrder, S };
    if (!started && !FP.still && !FP.reduced) { started = true; play(); } else { started = true; finish(); }
  }

  let state = null;

  /* ------------------------------------------------------------ drawing a pin and the thread */

  const SHX = 0.62, SHY = 0.95; // the light comes from the upper left: shadows fall down and to the right
  function setPin(p, k) { // k: 0 just above the paper, 1 pushed home
    const e = easeOut(clamp(k, 0, 1));
    const lift = 1 - e;
    const s = 1 + 0.38 * lift;
    p.g.setAttribute('transform', `translate(${p.hx.toFixed(2)} ${p.hy.toFixed(2)}) scale(${s.toFixed(3)})`);
    p.g.setAttribute('opacity', clamp(k * 6, 0, 1).toFixed(3));
    const m = (1 + 2.2 * lift) * p.r;
    const sx = p.hx + SHX * m, sy = p.hy + SHY * m;
    p.shDot.setAttribute('cx', sx.toFixed(2)); p.shDot.setAttribute('cy', sy.toFixed(2));
    p.shLine.setAttribute('x1', p.x.toFixed(2)); p.shLine.setAttribute('y1', p.y.toFixed(2));
    p.shLine.setAttribute('x2', sx.toFixed(2)); p.shLine.setAttribute('y2', sy.toFixed(2));
    p.sh.setAttribute('opacity', (clamp(k * 3, 0, 1) * (0.55 + 0.45 * e)).toFixed(3));
    if (p.shank) p.shank.setAttribute('opacity', e.toFixed(3));
  }

  function partial(t, L) {
    if (L <= 0 || !t.pts.length) return '';
    const { pts, cum } = t;
    let i = 1;
    while (i < pts.length && cum[i] < L) i++;
    const out = pts.slice(0, i);
    if (i < pts.length) {
      const u = (L - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]);
    }
    return 'M' + out.map((q) => `${q[0].toFixed(2)},${q[1].toFixed(2)}`).join('L');
  }
  function setThread(t, L) {
    const d = partial(t, Math.min(L, t.len));
    t.line.setAttribute('d', d); t.twist.setAttribute('d', d); t.shadow.setAttribute('d', d); t.shadow2.setAttribute('d', d);
  }

  /* ------------------------------------------------------------ the arrival */

  // home first; then each trip's new pins, oldest trip first; then the thread wound at an even pace
  const T = { home: 0.05, from: 0.32, gap: 0.118, each: 0.034, press: 0.28, wind: 1.35 };
  function timeline() {
    home.at = T.home;
    trips.forEach((t, ti) => { t.fresh.forEach((p, k) => { p.at = T.from + ti * T.gap + k * T.each; }); });
    for (const p of pins) if (p.at == null) p.at = T.from + trips.length * T.gap;
    const pinsEnd = Math.max(...state.all.map((p) => p.at)) + T.press + 0.08;
    return { pinsEnd, end: pinsEnd + T.wind };
  }
  function play() {
    for (const p of pins) p.at = null;
    const tl = timeline();
    const t0 = performance.now();
    state.all.forEach((p) => setPin(p, 0));
    trips.forEach((t) => setThread(t, 0));
    const frame = () => {
      const s = (performance.now() - t0) / 1000;
      for (const p of state.all) setPin(p, (s - p.at) / T.press);
      const wound = clamp((s - tl.pinsEnd) / T.wind, 0, 1) * trips.total;
      for (const t of trips) setThread(t, wound - t.from);
      if (s < tl.end + 0.05) anim = requestAnimationFrame(frame); else { anim = null; finish(); }
    };
    anim = requestAnimationFrame(frame);
  }
  function finish() {
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    state.all.forEach((p) => setPin(p, 1));
    trips.forEach((t) => setThread(t, Infinity));
  }

  /* ------------------------------------------------------------ hover */

  function pinNote(p) {
    if (p.home) return FP.about(FP.home);
    const L = FP.lang;
    const years = own().years(p.years);
    if (p.whole) return `<b>${esc(p.country.country[L])}</b><span>${esc(years)}</span>`;
    const where = p.country ? p.country.country[L] : '';
    return `<b>${esc(p.name[L])}</b><span>${esc(where ? `${where} · ${years}` : years)}</span>`;
  }
  stage.addEventListener('pointermove', (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.pin != null && state) { FP.tip(e.clientX, e.clientY, pinNote(state.all[+t.dataset.pin])); return; }
    if (t.dataset && t.dataset.country) { FP.tip(e.clientX, e.clientY, FP.about(FP.byId.get(t.dataset.country))); return; }
    FP.tip(0, 0, null);
  });
  stage.addEventListener('pointerleave', () => FP.tip(0, 0, null));

  /* ------------------------------------------------------------ start */

  let rt = 0;
  let size = '';
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const now = `${stage.clientWidth}x${stage.clientHeight}`;
      if (!world || now === size) return;
      if (anim) finish();
      build();
    }, 120);
  });
  FP.onLang(() => { if (!world) return; if (anim) finish(); build(); });
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([FP.world('50m'), fontsReady]).then(([wd]) => { world = wd; build(); });
})();
