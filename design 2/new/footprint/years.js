/* Footprint, year by year (2026-11-06): the map fills in the way he did, one year at a time.
   A playhead runs once along a ruler of his years; each country takes its own earth colour the
   year he first went, its name beside it for a moment, and the year with the countries so far
   turns like the pages of a ledger. Afterwards the ruler is his: drag it, click a year, or step
   with the arrow keys. Numbers come from FP.years and FP.counts. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  const query = new URLSearchParams(location.search);
  if (query.get('lang')) FP.setLang(query.get('lang'));

  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const htmlEl = (tag, cls, parent) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (k) => 1 - (1 - k) ** 3;
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const now = () => performance.now();

  const WORDS = {
    none: { en: 'No trips this year', zh: '這一年沒有出門' },
    year: { en: 'Year', zh: '年份' },
    and: { en: ', ', zh: '、' },
  };
  const say = (k) => WORDS[k][FP.lang];
  const countText = (n) => `${FP.fmt(n)} ${FP.w.countries(n)}`;

  const { since, until } = FP.counts;
  const yearRow = new Map(FP.years.map((y) => [y.year, y]));
  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));
  const events = FP.years.filter((y) => y.fresh.length).map((y) => y.year);

  // where he first set foot in a country: the first place of his first trip there
  function anchorOf(c) {
    const j = journeyById.get(c.journeys[0]);
    if (j) for (const l of j.legs) for (const p of [l.from, l.to]) {
      const pl = placeByCity.get(p.city);
      if (pl && pl.country === c.id) return pl.ll;
    }
    return c.ll;
  }

  // the countries new in a year, in the order his trips that year reached them
  const freshOrder = new Map();
  for (const Y of FP.years) {
    const list = [];
    for (const j of Y.trips) for (const id of j.countries) {
      const c = FP.byId.get(id);
      if (c && !c.home && c.first === Y.year && !list.includes(c)) list.push(c);
    }
    for (const c of Y.fresh) if (!list.includes(c)) list.push(c);
    freshOrder.set(Y.year, list);
  }

  /* ------------------------------------------------------------ the page */

  const stage = document.getElementById('stage');
  const root = htmlEl('div', 'yr', stage);
  const map = svgEl('svg', { class: 'yr-map', 'aria-hidden': 'true' }, root);
  const defs = svgEl('defs', null, map);
  const gLand = svgEl('g', { class: 'yr-g-land' }, map);
  const gCountries = svgEl('g', { class: 'yr-g-countries' }, map);
  const gDots = svgEl('g', { class: 'yr-g-dots' }, map);
  const gNames = svgEl('g', { class: 'yr-g-names' }, map);

  const panel = htmlEl('section', 'yr-panel', root);
  const kicker = htmlEl('p', 'fp-label yr-kicker', panel);
  const page = htmlEl('div', 'yr-page', panel);
  const yearEl = htmlEl('p', 'yr-year', page);
  const countEl = htmlEl('p', 'yr-count', page);
  const tripsEl = htmlEl('ol', 'yr-trips', page);

  const ruler = htmlEl('div', 'yr-ruler', root);
  ruler.setAttribute('role', 'slider');
  ruler.tabIndex = 0;
  ruler.setAttribute('aria-valuemin', since);
  ruler.setAttribute('aria-valuemax', until);
  const rsvg = svgEl('svg', { 'aria-hidden': 'true' }, ruler);

  /* ------------------------------------------------------------ state */

  let world = null;     // FP.world's shapes
  let land = null;      // all land but Antarctica
  let landLite = null;  // the same, coarser, for fitting
  let proj = null;
  let path = null;
  let geo = { W: 0, H: 0, edge: 16, top: 66, mapBottom: 0, narrow: false, panel: null };
  let rx = null;        // the ruler's scale, years to pixels
  let shown = null;     // the year on the page
  let pos = since;      // the playhead, in years (fractional while it moves)
  let playing = false;
  let playStart = 0;
  let keys = [];        // the arrival's timeline
  const visited = [];   // one entry per country he has been to
  let homeShape = null;
  const live = new Set(); // names on the map now

  /* ------------------------------------------------------------ one animation loop */

  const tasks = new Set();
  let raf = 0;
  function frame() {
    const t = now(); // one clock for everything that moves
    for (const fn of [...tasks]) if (!fn(t)) tasks.delete(fn);
    raf = tasks.size ? requestAnimationFrame(frame) : 0;
  }
  function run(fn) { tasks.add(fn); if (!raf) raf = requestAnimationFrame(frame); }

  /* ------------------------------------------------------------ colours: one earth ink per country, neighbours apart */

  const TONES = 4;
  function assignTones() {
    const geoms = world.topo.objects.countries.geometries;
    const nb = topojson.neighbors(geoms);
    const idx = new Map(geoms.map((g, i) => [g.id, i]));
    const parts = new Map();
    for (const v of visited) {
      const f = v.feature;
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      parts.set(v, polys.map((p) => d3.geoCentroid({ type: 'Polygon', coordinates: p })));
    }
    const near = (a, b) => {
      const ia = idx.get(a.c.iso), ib = idx.get(b.c.iso);
      if (nb[ia] && nb[ia].includes(ib)) return true;
      for (const p of parts.get(a)) for (const q of parts.get(b)) if (FP.km([p[1], p[0]], [q[1], q[0]]) < 450) return true;
      return false;
    };
    const used = new Array(TONES).fill(0);
    const PREFER = [1, 2, 3, 0]; // olive, slate, ochre, clay: the big shapes take the quieter inks first
    const bySize = visited.slice().sort((a, b) => d3.geoArea(b.feature) - d3.geoArea(a.feature));
    for (const v of bySize) {
      const taken = new Set(visited.filter((o) => o !== v && o.tone != null && near(v, o)).map((o) => o.tone));
      // clay sits too close to home's red: keep it off Taiwan's neighbours
      if (parts.get(v).some((p) => FP.km([p[1], p[0]], FP.home.ll) < 1400)) taken.add(0);
      let best = -1;
      for (const t of PREFER) if (!taken.has(t) && (best < 0 || used[t] < used[best])) best = t;
      if (best < 0) best = v.c.order % TONES;
      v.tone = best;
      used[best]++;
    }
  }

  /* ------------------------------------------------------------ build the map once */

  // a European country's overseas parts (French Guiana, the Caribbean Netherlands) are not where he went
  function nearParts(f, c) {
    if (c.continent !== 'europe' || f.geometry.type !== 'MultiPolygon') return f;
    const keep = f.geometry.coordinates.filter((p) => {
      const [lng, lat] = d3.geoCentroid({ type: 'Polygon', coordinates: p });
      return FP.km(c.ll, [lat, lng]) < 3000;
    });
    return { ...f, geometry: { ...f.geometry, coordinates: keep } };
  }

  function build() {
    land = topojson.merge(world.topo, world.topo.objects.countries.geometries.filter((g) => g.id !== '010'));
    proj = d3.geoEqualEarth().rotate([-10, 0]);
    path = d3.geoPath(proj);

    gLand.replaceChildren();
    svgEl('path', { class: 'yr-land' }, gLand);

    // one shape per country (the atlas lists a few far islands under the same number)
    const byC = new Map();
    for (const f of world.visited) {
      const c = FP.byIso.get(f.id);
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      if (!byC.has(c)) byC.set(c, { type: 'Feature', id: f.id, properties: {}, geometry: { type: 'MultiPolygon', coordinates: [] } });
      byC.get(c).geometry.coordinates.push(...polys);
    }
    for (const [c, f] of byC) visited.push({ c, feature: nearParts(f, c), anchor: anchorOf(c), tone: null, on: false, token: 0 });
    visited.sort((a, b) => a.c.order - b.c.order);
    assignTones();

    for (const v of visited) {
      const id = `yr-clip-${v.c.id}`;
      const cp = svgEl('clipPath', { id }, defs);
      v.clip = svgEl('circle', { r: 0 }, cp);
      v.shape = svgEl('path', { class: `yr-c tone-${v.tone}`, 'clip-path': `url(#${id})` }, gCountries);
      v.dot = svgEl('circle', { class: `yr-dot tone-${v.tone}`, r: 0 }, gDots);
      hover(v.shape, v.c, () => v.on);
      hover(v.dot, v.c, () => v.on);
    }
    homeShape = svgEl('path', { class: 'yr-home' }, gCountries);
    hover(homeShape, FP.home, () => true);
    homeShape.dot = svgEl('circle', { class: 'yr-dot yr-dot--home', r: 0 }, gDots);
    hover(homeShape.dot, FP.home, () => true);
  }

  function hover(node, c, active) {
    node.addEventListener('pointermove', (e) => { if (active()) FP.tip(e.clientX, e.clientY, FP.about(c)); });
    node.addEventListener('pointerleave', () => FP.tip());
  }

  /* ------------------------------------------------------------ layout: the map as large as the window allows */

  // does the land fill part of this box? Tiny islands do not count.
  function landIn(r) {
    const s = 0.5;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(r.w * s)); cv.height = Math.max(1, Math.ceil(r.h * s));
    const ctx = cv.getContext('2d');
    ctx.scale(s, s); ctx.translate(-r.x, -r.y);
    ctx.beginPath(); d3.geoPath(proj, ctx)(landLite); ctx.fill();
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 60) n++;
    return n > 36;
  }

  // the tallest the panel gets, over every year, so the map never moves when the page turns
  function panelHeight() {
    let h = 0;
    for (const Y of FP.years) { fillPage(Y.year); h = Math.max(h, panel.offsetHeight); }
    if (shown != null) fillPage(shown); else clearPage();
    return h;
  }

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const narrow = W < 600;
    root.classList.toggle('is-narrow', narrow);
    // a short window sets the page smaller, so the map can keep its size
    root.classList.toggle('is-short', !narrow && H < 640);
    const edge = Math.round(clamp(W * 0.032, 16, 40));
    const top = 66;
    const rulerH = ruler.offsetHeight;
    const rulerTop = H - 4 - rulerH;
    map.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const pH = panelHeight();
    const pW = panel.offsetWidth;
    let mapBottom, py;

    if (!narrow) {
      mapBottom = rulerTop - 14;
      py = mapBottom - pH;
      const box = { x: edge - 6, y: py - 10, w: pW + 18, h: pH + 16 };
      // full size first, slid from the middle towards the right margin to clear the page;
      // only if that is not enough, a little smaller
      proj.fitExtent([[edge, top], [W - edge, mapBottom]], land);
      const s0 = proj.scale(), t0 = proj.translate();
      let done = false;
      for (let k = 1; k >= 0.5 && !done; k -= 0.02) {
        proj.scale(s0 * k).translate(t0);
        const b = path.bounds(landLite);
        const dy = (top + mapBottom) / 2 - (b[0][1] + b[1][1]) / 2;
        const dxC = W / 2 - (b[0][0] + b[1][0]) / 2, dxR = W - edge - b[1][0];
        for (let i = 0; i <= 8; i++) {
          const dx = dxC + (dxR - dxC) * (i / 8);
          proj.translate([t0[0] + dx, t0[1] + dy]);
          if (!landIn(box)) { done = true; break; }
        }
      }
      geo.panel = { x: edge, y: py, w: pW, h: pH };
    } else {
      // stack: the map, then the year and count, then the ruler
      const gap = 22;
      const room = rulerTop - 18 - top;
      proj.fitWidth(W - 2 * edge, land);
      let b = path.bounds(land);
      let mh = b[1][1] - b[0][1];
      const maxMap = Math.max(120, room - pH - gap);
      if (mh > maxMap) { proj.fitExtent([[edge, top], [W - edge, top + maxMap]], land); b = path.bounds(land); mh = b[1][1] - b[0][1]; }
      const y0 = top + Math.max(0, (room - (mh + gap + pH)) * 0.3);
      const [tx, ty] = proj.translate();
      proj.translate([tx, ty + (y0 - b[0][1])]);
      mapBottom = y0 + mh;
      py = mapBottom + gap;
      geo.panel = { x: edge, y: py, w: pW, h: pH };
    }
    panel.style.setProperty('--py', `${Math.round(py)}px`);
    geo = { ...geo, W, H, edge, top, mapBottom, narrow };

    // draw
    gLand.firstChild.setAttribute('d', path(land));
    for (const v of visited) {
      v.shape.setAttribute('d', path(v.feature));
      const [ax, ay] = proj([v.anchor[1], v.anchor[0]]);
      v.ax = ax; v.ay = ay;
      v.clip.setAttribute('cx', ax); v.clip.setAttribute('cy', ay);
      const b = path.bounds(v.feature);
      v.R = Math.max(...[[b[0][0], b[0][1]], [b[1][0], b[0][1]], [b[0][0], b[1][1]], [b[1][0], b[1][1]]].map(([x, y]) => Math.hypot(x - ax, y - ay))) + 2;
      v.small = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]) < 7;
      v.dot.setAttribute('cx', ax); v.dot.setAttribute('cy', ay);
      v.dotR = v.small ? (narrow ? 2.4 : 3.2) : 0;
      if (v.on) { v.clip.setAttribute('r', v.R); v.dot.setAttribute('r', v.dotR); }
    }
    homeShape.setAttribute('d', path(world.home));
    const hb = path.bounds(world.home);
    const [hx, hy] = proj([FP.home.ll[1], FP.home.ll[0]]);
    homeShape.dot.setAttribute('cx', hx); homeShape.dot.setAttribute('cy', hy);
    homeShape.dot.setAttribute('r', Math.max(hb[1][0] - hb[0][0], hb[1][1] - hb[0][1]) < 7 ? (narrow ? 2.4 : 3.2) : 0);

    for (const n of live) n.remove();
    live.clear();
    drawRuler();
  }

  /* ------------------------------------------------------------ the ledger page */

  function stripYear(s, y) {
    return (FP.lang === 'zh' ? s.replace(new RegExp(`^${y}\\s*年?\\s*`), '') : s.replace(new RegExp(`\\s*${y}$`), '')).trim();
  }

  function fillPage(y) {
    const Y = yearRow.get(y);
    yearEl.textContent = String(y);
    countEl.textContent = countText(Y.total);
    if (!Y.trips.length) { tripsEl.innerHTML = `<li class="yr-none">${FP.esc(say('none'))}</li>`; return; }
    tripsEl.innerHTML = Y.trips.map((j) => {
      const when = stripYear(j.date[FP.lang], y);
      const where = j.countries.map((id) => {
        const c = FP.byId.get(id);
        return `<span${c.first < y ? ' class="is-again"' : ''}>${FP.esc(c.country[FP.lang])}</span>`;
      }).join(say('and'));
      return `<li${when ? '' : ' class="is-wide"'}>${when ? `<span class="yr-when">${FP.esc(when)}</span>` : ''}<span class="yr-where">${where}</span></li>`;
    }).join('');
  }
  function clearPage() { yearEl.textContent = ' '; countEl.textContent = ' '; tripsEl.innerHTML = ''; }

  function turnPage(y, animate) {
    fillPage(y);
    if (!animate || FP.reduced) return;
    page.getAnimations().forEach((a) => a.cancel());
    page.animate(
      [{ opacity: 0.2, transform: 'translateY(0.3rem)' }, { opacity: 1, transform: 'none' }],
      { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  }

  /* ------------------------------------------------------------ the map at a year */

  function reveal(v, delay, dur) {
    const token = ++v.token;
    v.on = true;
    if (!dur) { v.clip.setAttribute('r', v.R); v.dot.setAttribute('r', v.dotR); return; }
    const t0 = now() + delay;
    run((t) => {
      if (v.token !== token) return false;
      const k = clamp((t - t0) / dur, 0, 1);
      const e = easeOut(k);
      v.clip.setAttribute('r', (v.R * e).toFixed(2));
      v.dot.setAttribute('r', (v.dotR * Math.min(1, e * 1.6)).toFixed(2));
      return k < 1;
    });
  }
  function conceal(v, dur) {
    const token = ++v.token;
    v.on = false;
    if (!dur) { v.clip.setAttribute('r', 0); v.dot.setAttribute('r', 0); return; }
    const r0 = +v.clip.getAttribute('r') || 0, d0 = +v.dot.getAttribute('r') || 0;
    const t0 = now();
    run((t) => {
      if (v.token !== token) return false;
      const k = clamp((t - t0) / dur, 0, 1);
      const e = 1 - k * k;
      v.clip.setAttribute('r', (r0 * e).toFixed(2));
      v.dot.setAttribute('r', (d0 * e).toFixed(2));
      return k < 1;
    });
  }

  function setYear(y, { instant = false } = {}) {
    if (y === shown) return;
    shown = y;
    turnPage(y, !instant);
    const coming = visited.filter((v) => v.c.first <= y && !v.on);
    const going = visited.filter((v) => v.c.first > y && v.on);
    // in the order he reached them, a little apart
    const order = (v) => {
      const f = freshOrder.get(v.c.first) || [];
      return v.c.first * 100 + f.indexOf(v.c);
    };
    coming.sort((a, b) => order(a) - order(b));
    const step = coming.length > 5 ? 70 : 120;
    const still = instant || FP.reduced;
    coming.forEach((v, i) => reveal(v, i * step, still ? 0 : 720));
    going.forEach((v) => conceal(v, still ? 0 : 260));
    ruler.setAttribute('aria-valuenow', y);
    ruler.setAttribute('aria-valuetext', `${y}, ${countText(yearRow.get(y).total)}`);
    markRuler();
  }

  /* ------------------------------------------------------------ names beside the countries, for a moment */

  // how much of a box a country's shape covers, sampled on a small grid
  const probe = document.createElement('canvas').getContext('2d');
  function shapeOf(v) {
    if (!v.p2d || v.p2dFor !== v.shape.getAttribute('d')) { v.p2dFor = v.shape.getAttribute('d'); v.p2d = new Path2D(v.p2dFor); }
    return v.p2d;
  }
  function cover(p, r) {
    let n = 0;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) if (probe.isPointInPath(p, r.x + (i + 0.5) * r.w / 6, r.y + (j + 0.5) * r.h / 3)) n++;
    return n / 18;
  }
  function rectsOverlap(a, b, pad = 3) {
    return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
  }
  function placeName(v) {
    const t = svgEl('text', { class: 'yr-name' }, gNames);
    t.textContent = v.c.country[FP.lang];
    const bb = t.getBBox();
    const w = bb.width, h = bb.height;
    const d = geo.narrow ? 5 : 8;
    const cands = [];
    for (const m of [1, 2.4, 4]) {
      const k = d * m;
      cands.push([k, -h / 2], [-k - w, -h / 2], [-w / 2, -k - h], [-w / 2, k], [k * 0.8, -k * 0.8 - h], [k * 0.8, k * 0.8], [-k * 0.8 - w, -k * 0.8 - h], [-k * 0.8 - w, k * 0.8]);
    }
    const area = { x: geo.edge, y: geo.top, w: geo.W - 2 * geo.edge, h: geo.mapBottom - geo.top };
    const others = [...live].map((n) => n.box);
    if (geo.panel) others.push(geo.panel);
    const own = shapeOf(v), filled = visited.filter((o) => o !== v && o.on).map(shapeOf);
    let best = null, bestScore = Infinity;
    cands.forEach(([ox, oy], i) => {
      const r = { x: v.ax + ox, y: v.ay + oy, w, h };
      let score = i * 0.04;
      if (r.x < area.x || r.y < area.y || r.x + r.w > area.x + area.w || r.y + r.h > area.y + area.h) score += 50;
      for (const o of others) if (rectsOverlap(r, o)) score += 10;
      score += cover(own, r) * 6 + filled.reduce((s, p) => s + cover(p, r), 0) * 4;
      if (score < bestScore) { bestScore = score; best = r; }
    });
    t.setAttribute('x', best.x - bb.x);
    t.setAttribute('y', best.y - bb.y);
    t.box = best;
    live.add(t);
    return t;
  }
  function showNames(y, gap) {
    const list = freshOrder.get(y) || [];
    const step = gap || (list.length > 5 ? 70 : 120);
    list.forEach((c, i) => {
      setTimeout(() => {
        const v = visited.find((o) => o.c === c);
        if (!v || !v.on) return;
        const t = placeName(v);
        requestAnimationFrame(() => t.classList.add('is-on'));
        setTimeout(() => {
          t.classList.remove('is-on');
          setTimeout(() => { t.remove(); live.delete(t); }, 520);
        }, 1500 + (list.length - i) * 40);
      }, 160 + i * step);
    });
  }

  /* ------------------------------------------------------------ the ruler */

  let phNode = null;
  const labelNodes = new Map();
  function drawRuler() {
    const w = ruler.clientWidth, h = ruler.clientHeight;
    rsvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    rsvg.replaceChildren();
    labelNodes.clear();
    const pad = geo.narrow ? 16 : 22;
    rx = d3.scaleLinear([since, until], [pad, w - pad]);
    const base = 18;
    svgEl('line', { class: 'yr-r-base', x1: rx(since) - 6, x2: rx(until) + 6, y1: base, y2: base }, rsvg);
    for (const Y of FP.years) {
      const ev = Y.fresh.length > 0;
      const x = rx(Y.year);
      svgEl('line', { class: `yr-r-tick${ev ? ' is-event' : ''}`, x1: x, x2: x, y1: base - (ev ? 7 : 4), y2: base + (ev ? 7 : 4) }, rsvg);
    }
    // the year numbers, as many as fit: the two ends first, then the years something happened
    const order = [since, until, ...FP.years.filter((Y) => Y.fresh.length).sort((a, b) => b.fresh.length - a.fresh.length || b.year - a.year).map((Y) => Y.year), ...FP.years.filter((Y) => !Y.fresh.length).map((Y) => Y.year)];
    const placed = [];
    for (const y of [...new Set(order)]) {
      const ev = yearRow.get(y).fresh.length > 0;
      const t = svgEl('text', { class: `yr-r-label${ev ? ' is-event' : ''}`, x: rx(y), y: base + 25 }, rsvg);
      t.textContent = String(y);
      const bw = t.getComputedTextLength();
      const box = { x: rx(y) - bw / 2, w: bw };
      if (placed.some((b) => box.x < b.x + b.w + 8 && b.x < box.x + box.w + 8)) { t.remove(); continue; }
      placed.push(box);
      labelNodes.set(y, t);
    }
    phNode = svgEl('g', { class: 'yr-ph' }, rsvg);
    svgEl('line', { x1: 0, x2: 0, y1: 2, y2: base + 10 }, phNode);
    svgEl('rect', { x: -3.5, y: 0, width: 7, height: 7 }, phNode);
    setPlayhead(pos);
    markRuler();
  }
  function setPlayhead(p) {
    pos = p;
    if (phNode && rx) phNode.setAttribute('transform', `translate(${rx(p).toFixed(2)},0)`);
  }
  function markRuler() {
    for (const [y, t] of labelNodes) t.classList.toggle('is-now', y === shown);
  }
  function playheadTo(target, dur) {
    const from = pos, t0 = now();
    const token = (playheadTo.token = (playheadTo.token || 0) + 1);
    if (!dur || FP.reduced) { setPlayhead(target); return; }
    run((t) => {
      if (playheadTo.token !== token) return false;
      const k = clamp((t - t0) / dur, 0, 1);
      setPlayhead(from + (target - from) * easeOut(k));
      return k < 1;
    });
  }

  // his hand on the ruler
  let dragging = false, moved = false;
  function yearAt(clientX) {
    const r = ruler.getBoundingClientRect();
    return clamp(rx.invert(clientX - r.left), since, until);
  }
  ruler.addEventListener('pointerdown', (e) => {
    if (!rx) return;
    stopPlay();
    dragging = true; moved = false;
    ruler.setPointerCapture(e.pointerId);
    const p = yearAt(e.clientX);
    playheadTo.token++;
    setPlayhead(p);
    setYear(Math.round(p));
  });
  ruler.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    moved = true;
    const p = yearAt(e.clientX);
    setPlayhead(p);
    setYear(Math.round(p));
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    const y = Math.round(pos);
    playheadTo(y, 160);
    setYear(y);
    showNames(y);
  };
  ruler.addEventListener('pointerup', release);
  ruler.addEventListener('pointercancel', release);
  ruler.addEventListener('keydown', (e) => {
    const cur = shown == null ? until : shown;
    let y = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') y = cur - 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') y = cur + 1;
    else if (e.key === 'Home') y = since;
    else if (e.key === 'End') y = until;
    else if (e.key === 'PageDown') y = [...events].reverse().find((v) => v < cur) ?? since;
    else if (e.key === 'PageUp') y = events.find((v) => v > cur) ?? until;
    if (y == null) return;
    e.preventDefault();
    stopPlay();
    y = clamp(y, since, until);
    playheadTo(y, 200);
    if (y !== shown) { setYear(y); showNames(y); }
  });

  /* ------------------------------------------------------------ the arrival: once along the years */

  const BEAT = 520;
  function timeline() {
    // hold on the years something happened, glide over the empty ones
    const k = [{ t: 0, p: since }];
    let t = BEAT;
    k.push({ t, p: since });
    events.forEach((y, i) => {
      if (i === 0) { t += 300 + 85 * yearRow.get(y).fresh.length; k.push({ t, p: y }); return; }
      const prev = events[i - 1];
      t += 160 + 100 * (y - prev);
      k.push({ t, p: y, glide: true });
      if (i < events.length - 1) { t += 300 + 85 * yearRow.get(y).fresh.length; k.push({ t, p: y }); }
    });
    return k;
  }
  function posAt(t) {
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (t <= b.t) {
        const k = (t - a.t) / Math.max(1, b.t - a.t);
        return a.p + (b.p - a.p) * (b.glide ? easeInOut(k) : k);
      }
    }
    return keys[keys.length - 1].p;
  }
  function play() {
    keys = timeline();
    playing = true;
    playStart = null; // the clock starts with the first frame actually drawn (a tab opened in the background waits)
    clearPage();
    setPlayhead(since);
    run((t) => {
      if (!playing) return false;
      if (playStart == null) playStart = t;
      const el = t - playStart;
      const p = posAt(el);
      setPlayhead(p);
      if (el >= BEAT) {
        // every year in turn, even if a slow frame passed more than one
        const y = Math.floor(p + 1e-6);
        while (shown == null || shown < y) {
          const next = shown == null ? since : shown + 1;
          setYear(next);
          if (yearRow.get(next).fresh.length) showNames(next);
        }
      }
      if (el >= keys[keys.length - 1].t) { stopPlay(); return false; }
      return true;
    });
  }
  function stopPlay() {
    if (!playing) return;
    playing = false;
    panel.setAttribute('aria-live', 'polite');
  }

  /* ------------------------------------------------------------ language */

  FP.onLang(() => {
    kicker.textContent = FP.w.where;
    ruler.setAttribute('aria-label', say('year'));
    if (!world) return;
    layout();
    if (shown != null) {
      fillPage(shown);
      ruler.setAttribute('aria-valuetext', `${shown}, ${countText(yearRow.get(shown).total)}`);
    }
  });

  /* ------------------------------------------------------------ start */

  kicker.textContent = FP.w.where;
  ruler.setAttribute('aria-label', say('year'));
  Promise.all([FP.world('50m'), FP.world('110m'), document.fonts ? document.fonts.ready : null]).then(([wd, lite]) => {
    world = wd;
    landLite = topojson.merge(lite.topo, lite.topo.objects.countries.geometries.filter((g) => g.id !== '010'));
    build();
    layout();
    if (FP.still || FP.reduced) {
      setPlayhead(until);
      setYear(until, { instant: true });
      panel.setAttribute('aria-live', 'polite');
    } else {
      play();
    }
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  });
})();
