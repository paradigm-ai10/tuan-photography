/* Footprint, passport stamps (2026-11-06): the world printed light, and on every country he has
   been to, the entry stamp he would have got there, pressed at its place: its name in capitals,
   the airport he flew into, the date of the first trip. Stamps come down one by one in the order
   he first went. Home gets its own stamp in red; one large stamp in the corner holds the count.
   Below 600 px wide the map stays on top and the stamps are pressed onto a passport page under it. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  const query = new URLSearchParams(location.search);
  if (query.get('lang')) FP.setLang(query.get('lang'));

  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };

  const WORDS = {
    arrived: { en: 'Arrived', zh: '入境' },
    rail: { en: 'By rail', zh: '火車入境' },
    road: { en: 'By road', zh: '陸路入境' },
  };
  const say = (k) => WORDS[k][FP.lang];
  const caps = (s) => (FP.lang === 'zh' ? s : s.toUpperCase());

  /* ------------------------------------------------------------ what each stamp says */

  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));

  // the first time he crossed into a country: the leg, how, and where
  function entryOf(c) {
    const j = journeyById.get(c.journeys[0]);
    for (const l of j.legs) {
      const to = placeByCity.get(l.to.city), from = placeByCity.get(l.from.city);
      if (to && to.country === c.id && !(from && from.country === c.id)) {
        const via = l.mode === 'flight' ? 'air' : l.mode === 'train' ? 'rail' : 'road';
        return { j, via, code: via === 'air' ? l.to.code || null : null, at: to.ll };
      }
    }
    return { j, via: null, code: null, at: c.ll };
  }

  const SHAPES = ['ring', 'rect', 'oval', 'octagon', 'round', 'hex'];
  const INKS = ['clay', 'olive', 'slate', 'umber', 'blue'];
  const FAMILY = { clay: 'warm', umber: 'warm', home: 'warm', olive: 'green', slate: 'cool', blue: 'cool' };

  // in the order he first went: by his first trip there, then as that trip reached them
  const visitKey = (c) => `${c.journeys[0]}|${String(journeyById.get(c.journeys[0]).countries.indexOf(c.id)).padStart(2, '0')}`;
  const stamps = FP.abroad.slice().sort((a, b) => visitKey(a).localeCompare(visitKey(b)))
    .map((c) => ({ c, ...entryOf(c), rot: (hash(c.id) - 0.5) * 15 }));
  const home = { c: FP.home, home: true, at: FP.home.ll, code: 'TPE', rot: -4, shape: 'ring', ink: 'home' };

  /* ------------------------------------------------------------ the page */

  const stage = document.getElementById('stage');
  const svg = el('svg', { class: 'st-svg' }, stage);
  svg.setAttribute('aria-hidden', 'true');
  const defs = el('defs', null, svg);
  const gMap = el('g', { class: 'st-map' }, svg);
  const gLand = el('path', { class: 'st-land' }, gMap);
  const gTints = el('g', null, gMap);
  const gBorders = el('path', { class: 'st-borders' }, gMap);
  const gCoast = el('path', { class: 'st-coast' }, gMap);
  const gPage = el('g', { class: 'st-page' }, svg);
  const gDots = el('g', null, svg);
  const gStamps = el('g', { class: 'st-stamps' }, svg);
  const label = document.createElement('h1');
  label.className = 'st-title';
  stage.appendChild(label);

  // the ink: uneven cover, a slightly rough edge; a few versions so no two stamps print alike
  const FILTERS = 5;
  for (let i = 0; i < FILTERS; i++) {
    const f = el('filter', { id: `st-ink-${i}`, x: '-12%', y: '-12%', width: '124%', height: '124%', 'color-interpolation-filters': 'sRGB' }, defs);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.7', numOctaves: '2', seed: String(3 + i * 7), result: 'fine' }, f);
    el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: '2', seed: String(41 + i * 13), result: 'blot' }, f);
    el('feDisplacementMap', { in: 'SourceGraphic', in2: 'fine', scale: '0.9', xChannelSelector: 'R', yChannelSelector: 'G', result: 'rough' }, f);
    el('feColorMatrix', { in: 'fine', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  14 0 0 0 -4.1', result: 'speck' }, f);
    el('feColorMatrix', { in: 'blot', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.1', result: 'patch' }, f);
    el('feComposite', { in: 'speck', in2: 'patch', operator: 'arithmetic', k1: '1', k2: '0', k3: '0', k4: '0', result: 'cover' }, f);
    el('feComposite', { in: 'rough', in2: 'cover', operator: 'in' }, f);
  }

  /* ------------------------------------------------------------ drawing a stamp */

  // shrink a line of text until it fits
  function fit(t, max) {
    const len = t.getComputedTextLength();
    if (len > max) t.style.setProperty('font-size', `${parseFloat(t.getAttribute('font-size')) * (max / len)}px`);
    return t;
  }
  function text(g, cls, str, x, y, size, max) {
    const t = el('text', { class: cls, x, y, 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
    t.textContent = str;
    return max ? fit(t, max) : t;
  }
  let arcN = 0;
  function arcText(g, cls, str, r, top, size, maxAngle) {
    const id = `st-arc-${arcN++}`;
    el('path', { id, d: top ? `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0` : `M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0`, fill: 'none' }, defs);
    const t = el('text', { class: cls, 'font-size': size, 'dominant-baseline': 'central' }, g);
    const tp = el('textPath', { href: `#${id}`, startOffset: '50%', 'text-anchor': 'middle' }, t);
    tp.textContent = str;
    return fit(t, r * maxAngle);
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
    const mark = st.via === 'rail' ? say('rail') : st.via === 'road' ? say('road') : say('arrived');
    if (st.code) return { name: caps(st.c.country[FP.lang]), big: st.code, date, mark: caps(say('arrived')) };
    return { name: caps(st.c.country[FP.lang]), big: year, date: caps(mark), mark: '' };
  }

  // each shape draws itself around (0, 0) at size S and returns its reach, for spacing
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
      return R;
    },
    rect(g, S, w) {
      const W = S * 1.34, H = S * 0.84, i = S * 0.065;
      el('rect', { class: 'st-edge', x: -W / 2, y: -H / 2, width: W, height: H }, g);
      el('rect', { class: 'st-line', x: -W / 2 + i, y: -H / 2 + i, width: W - 2 * i, height: H - 2 * i }, g);
      text(g, 'st-name', w.name, 0, -H * 0.27, S * 0.105, W - 4 * i);
      el('line', { class: 'st-line', x1: -W / 2 + i, x2: W / 2 - i, y1: -H * 0.12, y2: -H * 0.12 }, g);
      text(g, 'st-big', w.big, 0, H * 0.08, S * 0.24, W - 4 * i);
      text(g, 'st-date', w.date, 0, H * 0.3, S * 0.078, W - 4 * i);
      return Math.hypot(W, H) / 2 * 0.86;
    },
    oval(g, S, w) {
      const rx = S * 0.68, ry = S * 0.45;
      el('ellipse', { class: 'st-edge', rx, ry }, g);
      el('ellipse', { class: 'st-line', rx: rx - S * 0.075, ry: ry - S * 0.075 }, g);
      text(g, 'st-name', w.name, 0, -ry * 0.48, S * 0.098, rx * 1.15);
      text(g, 'st-big', w.big, 0, ry * 0.06, S * 0.21, rx * 1.3);
      text(g, 'st-date', w.date, 0, ry * 0.5, S * 0.074, rx * 1.05);
      return (rx + ry) / 2 * 1.02;
    },
    octagon(g, S, w) {
      const R = S * 0.54;
      el('polygon', { class: 'st-edge', points: poly(8, R, Math.PI / 8) }, g);
      el('polygon', { class: 'st-line', points: poly(8, R * 0.85, Math.PI / 8) }, g);
      if (w.mark) text(g, 'st-mark', w.mark, 0, -R * 0.5, S * 0.06, R * 1.1);
      text(g, 'st-name', w.name, 0, w.mark ? -R * 0.25 : -R * 0.34, S * 0.098, R * 1.5);
      text(g, 'st-big', w.big, 0, R * 0.1, S * 0.2, R * 1.4);
      text(g, 'st-date', w.date, 0, R * 0.44, S * 0.072, R * 1.25);
      return R * 0.97;
    },
    round(g, S, w) {
      const W = S * 1.16, H = S * 0.92, rr = S * 0.15;
      el('rect', { class: 'st-edge', x: -W / 2, y: -H / 2, width: W, height: H, rx: rr }, g);
      el('line', { class: 'st-line', x1: -W / 2 + S * 0.04, x2: W / 2 - S * 0.04, y1: -H * 0.14, y2: -H * 0.14 }, g);
      el('line', { class: 'st-line', x1: -W / 2 + S * 0.04, x2: W / 2 - S * 0.04, y1: H * 0.24, y2: H * 0.24 }, g);
      text(g, 'st-name', w.name, 0, -H * 0.32, S * 0.1, W - S * 0.16);
      text(g, 'st-big', w.big, 0, H * 0.05, S * 0.23, W - S * 0.2);
      text(g, 'st-date', w.date, 0, H * 0.37, S * 0.074, W - S * 0.2);
      return Math.hypot(W, H) / 2 * 0.86;
    },
    hex(g, S, w) {
      const R = S * 0.6;
      el('polygon', { class: 'st-edge', points: poly(6, R) }, g);
      el('polygon', { class: 'st-line', points: poly(6, R * 0.84) }, g);
      text(g, 'st-name', w.name, 0, -R * 0.36, S * 0.096, R * 1.15);
      text(g, 'st-big', w.big, 0, R * 0.05, S * 0.21, R * 1.3);
      text(g, 'st-date', w.date, 0, R * 0.42, S * 0.07, R * 1.0);
      return R * 0.92;
    },
  };

  const REACH = { ring: 0.5, rect: 0.56, oval: 0.56, octagon: 0.53, round: 0.53, hex: 0.56 };
  const DIMS = { ring: [1, 1], rect: [1.34, 0.84], oval: [1.36, 0.9], octagon: [1, 1], round: [1.16, 0.92], hex: [1.2, 1.04] };

  // stamps keep apart by their real outlines (boxes turned with the stamp), overlapping a little
  function boxCollide(k, strength) {
    let ns = [];
    function force() {
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
        const a = ns[i], b = ns[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const ox = (a.hw + b.hw) * k - Math.abs(dx), oy = (a.hh + b.hh) * k - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        const wa = a.fixed ? 0 : b.fixed ? 1 : 0.5, wb = 1 - wa;
        if (ox < oy) { const m = ox * strength * (dx < 0 ? -1 : 1); a.vx -= m * wa; b.vx += m * wb; }
        else { const m = oy * strength * (dy < 0 ? -1 : 1); a.vy -= m * wa; b.vy += m * wb; }
      }
    }
    force.initialize = (n) => { ns = n; };
    return force;
  }

  function drawCount(g, R) {
    const n = FP.counts.countries, trips = FP.counts.trips;
    const ri = R * 0.63, rm = (R - R * 0.07 + ri) / 2;
    el('circle', { class: 'st-edge', r: R - 2 }, g);
    el('circle', { class: 'st-line', r: R - R * 0.07 }, g);
    el('circle', { class: 'st-line', r: ri }, g);
    arcText(g, 'st-name', caps(FP.w.where), rm, true, R * 0.105, 2.3);
    arcText(g, 'st-name', caps(FP.w.span(FP.counts.since, FP.counts.until)), rm, false, R * 0.105, 2.2);
    el('circle', { class: 'st-fill', cx: -rm, cy: 0, r: R * 0.024 }, g);
    el('circle', { class: 'st-fill', cx: rm, cy: 0, r: R * 0.024 }, g);
    text(g, 'st-big', FP.fmt(n), 0, -ri * 0.2, R * 0.5, ri * 1.4);
    text(g, 'st-mark st-mark--count', caps(FP.w.countries(n)), 0, ri * 0.42, R * 0.105, ri * 1.5);
    text(g, 'st-date', caps(`${FP.fmt(trips)} ${FP.w.trips(trips)}`), 0, ri * 0.66, R * 0.085, ri * 1.1);
    return R;
  }

  /* ------------------------------------------------------------ the world */

  let world = null, land = null, landLite = null, proj = null, path = null;
  let built = false;
  const tints = new Map();

  function nearParts(f, c) {
    if (c.continent !== 'europe' || f.geometry.type !== 'MultiPolygon') return f;
    const keep = f.geometry.coordinates.filter((p) => {
      const [lng, lat] = d3.geoCentroid({ type: 'Polygon', coordinates: p });
      return FP.km(c.ll, [lat, lng]) < 3000;
    });
    return { ...f, geometry: { ...f.geometry, coordinates: keep } };
  }

  function landIn(cx, cy, r) {
    const s = 0.5, x = cx - r, y = cy - r, w = 2 * r;
    const cv = document.createElement('canvas');
    cv.width = cv.height = Math.max(1, Math.ceil(w * s));
    const ctx = cv.getContext('2d');
    ctx.scale(s, s); ctx.translate(-x, -y);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.beginPath(); d3.geoPath(proj, ctx)(landLite); ctx.fill();
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 60) n++;
    return n > 30;
  }

  /* ------------------------------------------------------------ layout */

  let geo = {};
  const nodes = [];

  function build() {
    land = topojson.merge(world.topo, world.topo.objects.countries.geometries.filter((g) => g.id !== '010'));
    proj = d3.geoEqualEarth().rotate([-10, 0]);
    path = d3.geoPath(proj);
    const byC = new Map();
    for (const f of [...world.visited, world.home]) {
      const c = FP.byIso.get(f.id);
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      if (!byC.has(c)) byC.set(c, { type: 'Feature', id: f.id, properties: {}, geometry: { type: 'MultiPolygon', coordinates: [] } });
      byC.get(c).geometry.coordinates.push(...polys);
    }
    for (const [c, f] of byC) tints.set(c, { feature: nearParts(f, c), node: el('path', { class: 'st-tint' }, gTints) });
    built = true;
  }

  // shapes and inks: varied, and never the same as a close neighbour
  function dress(list) {
    const usedS = {}, usedI = {};
    SHAPES.forEach((s) => { usedS[s] = 0; }); INKS.forEach((s) => { usedI[s] = 0; });
    for (const nd of list) {
      if (nd.st.home) continue;
      // by distance on the ground, so a country keeps its stamp at every window size
      const close = list.filter((o) => o !== nd && (o.st.shape || o.st.home) && FP.km(o.st.at, nd.st.at) < 1600);
      const badS = new Set(close.map((o) => o.st.shape)), badI = new Set(close.map((o) => o.st.ink));
      // and the closest neighbours not even in the same family of ink (the reds, the blues)
      for (const o of close) if (FP.km(o.st.at, nd.st.at) < 1100) INKS.filter((k) => FAMILY[k] === FAMILY[o.st.ink]).forEach((k) => badI.add(k));
      const pick = (opts, used, bad, seed) => {
        const ok = opts.filter((o) => !bad.has(o));
        const pool = ok.length ? ok : opts;
        const min = Math.min(...pool.map((o) => used[o]));
        const least = pool.filter((o) => used[o] === min);
        return least[Math.floor(seed * least.length)];
      };
      if (!nd.st.shape) { nd.st.shape = pick(SHAPES, usedS, badS, hash(nd.st.c.id + 's')); usedS[nd.st.shape]++; }
      if (!nd.st.ink) { nd.st.ink = pick(INKS, usedI, badI, hash(nd.st.c.id + 'i')); usedI[nd.st.ink]++; }
    }
  }

  function layout() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const narrow = W < 600;
    stage.classList.toggle('is-narrow', narrow);
    const edge = Math.round(clamp(W * 0.032, 16, 40));
    const top = 64;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let S, R, cx, cy;

    if (!narrow) {
      // the map as large as the window allows, the count stamp in the empty South Pacific
      R = Math.round(clamp(Math.min(W * 0.085, H * 0.128), 56, 112));
      cx = edge + R + 4; cy = H - 14 - R;
      proj.fitExtent([[edge, top], [W - edge, H - 12]], land);
      const s0 = proj.scale(), t0 = proj.translate();
      let done = false;
      for (let k = 1; k >= 0.6 && !done; k -= 0.02) {
        proj.scale(s0 * k).translate(t0);
        const b = path.bounds(landLite);
        const dy = (top + H - 12) / 2 - (b[0][1] + b[1][1]) / 2;
        const dxC = W / 2 - (b[0][0] + b[1][0]) / 2, dxR = W - edge - b[1][0];
        for (let i = 0; i <= 8; i++) {
          proj.translate([t0[0] + (dxC + (dxR - dxC) * (i / 8)), t0[1] + dy]);
          if (!landIn(cx, cy, R + 8)) { done = true; break; }
        }
      }
      const mb = path.bounds(landLite);
      S = Math.round(clamp((mb[1][0] - mb[0][0]) * 0.068, 52, 104));
    } else {
      // phones: the map on top, then a passport page
      proj.fitWidth(W - 2 * edge, land);
      const b = path.bounds(land);
      const [tx, ty] = proj.translate();
      proj.translate([tx, ty + (top + 8 - b[0][1])]);
      S = Math.floor(clamp((W - 2 * edge) / 4.35, 64, 96));
      R = S * 0.62;
    }
    geo = { W, H, edge, top, narrow, S, R, cx, cy };

    gLand.setAttribute('d', path(land));
    gCoast.setAttribute('d', path(land));
    gBorders.setAttribute('d', path(topojson.mesh(world.topo, world.topo.objects.countries, (a, b) => a !== b)));
    svg.style.setProperty('--st-heavy', `${(S * 0.03).toFixed(2)}px`);
    svg.style.setProperty('--st-thin', `${clamp(S * 0.011, 0.7, 1.1).toFixed(2)}px`);
    for (const [, t] of tints) t.node.setAttribute('d', path(t.feature));

    placeStamps();
    draw();
  }

  function placeStamps() {
    const { W, H, edge, top, narrow, S, R } = geo;
    nodes.length = 0;
    const all = [home, ...stamps];
    for (const st of all) {
      const [ax, ay] = proj([st.at[1], st.at[0]]);
      const europe = st.c.continent === 'europe';
      st.size = Math.round(S * (narrow ? 1 : europe ? 0.8 : st.home ? 0.86 : 1));
      nodes.push({ st, ax, ay, x: ax, y: ay, r: st.size * 0.55 });
    }
    dress(nodes);
    for (const n of nodes) {
      n.r = n.st.size * REACH[n.st.shape];
      const th = (n.st.rot * Math.PI) / 180;
      const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
      const [dw, dh] = DIMS[n.st.shape];
      // on the passport page every stamp fits its column
      if (narrow) n.st.size = Math.min(n.st.size, Math.floor(((W - 2 * edge) / 4) * 1.02 / (c * dw + s * dh)));
      const w = dw * n.st.size, h = dh * n.st.size;
      n.hw = (c * w + s * h) / 2; n.hh = (s * w + c * h) / 2;
    }
    if (!narrow) {
      // spread the crowded ones apart a little, each held towards its place: start each one
      // a step out from the middle of its crowd, so a cluster opens like a fan, not a column
      for (const n of nodes) {
        const near = nodes.filter((o) => Math.hypot(o.ax - n.ax, o.ay - n.ay) < n.r * 3.2);
        if (near.length < 2) continue;
        const mx = d3.mean(near, (o) => o.ax), my = d3.mean(near, (o) => o.ay);
        let dx = n.ax - mx, dy = n.ay - my, d = Math.hypot(dx, dy);
        if (d < 1) { const a = hash(n.st.c.id + 'a') * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
        const push = n.r * Math.sqrt(near.length) * 0.8;
        n.x = n.ax + (dx / d) * push; n.y = n.ay + (dy / d) * push;
      }
      const fixed = { fx: geo.cx, fy: geo.cy, x: geo.cx, y: geo.cy, r: R + 6, hw: R + 8, hh: R + 8, fixed: true };
      const sim = d3.forceSimulation([...nodes, fixed])
        .force('x', d3.forceX((d) => (d.fixed ? d.fx : d.ax)).strength(0.11))
        .force('y', d3.forceY((d) => (d.fixed ? d.fy : d.ay)).strength(0.11))
        .force('collide', boxCollide(0.88, 0.5))
        .stop();
      for (let i = 0; i < 420; i++) {
        sim.tick();
        for (const n of nodes) {
          n.y = clamp(n.y, top + n.hh * 0.9, H - 10 - n.hh * 0.9);
          n.x = clamp(n.x, edge + n.hw * 0.9, W - edge - n.hw * 0.9);
        }
      }
    } else {
      // a passport page: four to a row, in the order he went, pressed a little crooked
      const mb = path.bounds(land);
      const y0 = mb[1][1] + 22, cols = 4;
      const cellW = (W - 2 * edge) / cols;
      const rows = Math.ceil((nodes.length + 2) / cols);
      const cellH = Math.min(S * 1.02, (H - 12 - y0) / rows);
      geo.page = { y0, cellW, cellH, rows };
      nodes.forEach((n, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        n.x = edge + cellW * (col + 0.5) + (hash(n.st.c.id + 'x') - 0.5) * cellW * 0.12;
        n.y = y0 + cellH * (row + 0.5) + (hash(n.st.c.id + 'y') - 0.5) * cellH * 0.1;
      });
      const last = nodes.length;
      const col = last % cols, row = Math.floor(last / cols);
      geo.R = Math.min(geo.R, cellH * 0.62, ((cols - col) * cellW) / 2 - 4);
      geo.cx = edge + cellW * col + ((cols - col) * cellW) / 2;
      geo.cy = y0 + cellH * (row + 0.5) + 4;
    }
  }

  /* ------------------------------------------------------------ draw and press */

  const pressed = new Set();
  function draw() {
    gStamps.replaceChildren();
    gDots.replaceChildren();
    gPage.replaceChildren();
    defs.querySelectorAll('[id^="st-arc-"]').forEach((n) => n.remove());
    arcN = 0;
    if (geo.narrow) {
      const { y0, rows, cellH } = geo.page;
      el('line', { class: 'st-page-rule', x1: geo.edge, x2: geo.W - geo.edge, y1: y0 - 10, y2: y0 - 10 }, gPage);
      void rows; void cellH;
    }
    for (const t of tints.values()) t.node.setAttribute('class', 'st-tint');
    nodes.forEach((n, i) => {
      const st = n.st;
      const t = tints.get(st.c);
      if (t) t.node.setAttribute('class', `st-tint tint-${st.ink}`);
      if (t) t.node.classList.toggle('is-on', pressed.has(st));
      const dot = el('g', { class: `st-at ink-${st.ink}${pressed.has(st) ? ' is-on' : ''}` }, gDots);
      el('circle', { cx: n.ax, cy: n.ay, r: geo.narrow ? 1.8 : 2.2 }, dot);
      if (!geo.narrow) {
        const dx = n.x - n.ax, dy = n.y - n.ay, d = Math.hypot(dx, dy);
        // stop at the stamp's outline (its turned box, a little inside)
        const reach = d ? Math.min(Math.abs(n.hw / (dx || 1e-6)), Math.abs(n.hh / (dy || 1e-6))) * d * 0.86 : 0;
        if (d - reach > 6) el('line', { class: 'st-lead', x1: n.ax, y1: n.ay, x2: n.ax + (dx / d) * (d - reach), y2: n.ay + (dy / d) * (d - reach) }, dot);
      }
      const outer = el('g', { class: 'st', transform: `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)}) rotate(${st.rot.toFixed(1)})` }, gStamps);
      const press = el('g', { class: `st-press ink-${st.ink}${pressed.has(st) ? ' is-on' : ''}` }, outer);
      const inked = el('g', { filter: `url(#st-ink-${i % FILTERS})` }, press);
      const reach = DRAW[st.shape](inked, st.size, wordsOf(st));
      el('circle', { class: 'st-hit', r: reach }, outer);
      st.node = press; st.outer = outer; st.tint = t; st.dot = dot;
      hover(outer, st);
    });
    const count = el('g', { class: 'st st--count', transform: `translate(${geo.cx.toFixed(1)} ${geo.cy.toFixed(1)}) rotate(-6)` }, gStamps);
    const cp = el('g', { class: `st-press ink-blue${pressed.has('count') ? ' is-on' : ''}` }, count);
    drawCount(el('g', { filter: 'url(#st-ink-1)' }, cp), geo.R);
    countNode = cp;
    label.textContent = `${FP.w.where}${FP.lang === 'zh' ? '：' : ': '}${FP.fmt(FP.counts.countries)} ${FP.w.countries(FP.counts.countries)}`;
  }
  let countNode = null;

  function hover(g, st) {
    const show = (e) => {
      if (!pressed.has(st)) return;
      FP.tip(e.clientX, e.clientY, FP.about(st.c));
      if (g !== g.parentNode.lastChild) g.parentNode.appendChild(g); // the stamp under the pointer comes to the top of the pile
    };
    g.addEventListener('pointerenter', show);
    g.addEventListener('pointermove', (e) => { if (pressed.has(st)) FP.tip(e.clientX, e.clientY, FP.about(st.c)); });
    g.addEventListener('pointerdown', show);
    g.addEventListener('pointerleave', () => FP.tip());
  }

  // the node is looked up when the stamp comes down, so a redraw in between (language, window) is safe
  function press(st, delay) {
    const go = () => {
      const node = st === 'count' ? countNode : st.node;
      pressed.add(st);
      node.classList.add('is-on');
      if (st.tint) st.tint.node.classList.add('is-on');
      if (st.dot) st.dot.classList.add('is-on');
      if (delay == null || FP.reduced) return;
      node.animate(
        [{ transform: 'scale(1.12)', opacity: 0.45 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: st === 'count' ? 150 : 120, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
      );
    };
    if (delay == null) go(); else setTimeout(go, delay);
  }

  function arrive() {
    const order = [home, ...stamps];
    if (FP.still || FP.reduced) {
      order.forEach((st) => press(st));
      press('count');
      return;
    }
    // one by one in the order he went, the count last: about three and a half seconds
    const gap = 3300 / (order.length + 1);
    order.forEach((st, i) => press(st, 380 + i * gap));
    press('count', 380 + order.length * gap + 120);
  }

  /* ------------------------------------------------------------ start */

  FP.onLang(() => { if (built) draw(); });

  Promise.all([FP.world('50m'), FP.world('110m'), document.fonts ? document.fonts.ready : null]).then(([wd, lite]) => {
    world = wd;
    landLite = topojson.merge(lite.topo, lite.topo.objects.countries.geometries.filter((g) => g.id !== '010'));
    build();
    layout();
    arrive();
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 140); });
  });
})();
