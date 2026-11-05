/* Footprint, "The world from home / 從台灣量起" (2026-11-06).
   An azimuthal equidistant chart centred on Taipei: the whole world as one disc, home at its
   centre, every place at its true distance and true bearing. Rings every thousand kilometres
   (every five thousand labelled), a bezel of degrees with the four bearings in words, like a
   navigator's chart. Unvisited land pale; his countries solid in earth colours; from Taipei a
   straight line to each (a great circle, in this projection), ending in a small tick. Each line's
   bearing is notched on the bezel and named outside it, with the distance. */
(() => {
  'use strict';

  const FP = window.FP;
  const NS = 'http://www.w3.org/2000/svg';
  const stage = document.getElementById('stage');
  const q = new URLSearchParams(location.search);

  FP.chrome();
  if (q.get('lang') === 'zh' || q.get('lang') === 'en') FP.setLang(q.get('lang'));

  /* ------------------------------------------------------------ words */

  const T = {
    en: {
      from: 'Measured from Taipei',
      farthest: 'Farthest from home',
      flown: 'Flown',
      round: (n) => `more than ${n} times round the earth`,
      key: 'Distances from Taipei in kilometres, as the crow flies. Rings every 1,000 km.',
      bearings: ['N', 'E', 'S', 'W'],
      home: 'Taipei',
    },
    zh: {
      from: '從台北量起',
      farthest: '離家最遠',
      flown: '飛過的距離',
      round: (n) => `繞地球超過 ${n} 圈`,
      key: '從台北起算的直線距離，單位公里。每一圈相隔 1,000 公里。',
      bearings: ['北', '東', '南', '西'],
      home: '台北',
    },
  };
  const t = () => T[FP.lang];

  /* ------------------------------------------------------------ geometry */

  const HOME = [FP.home.ll[1], FP.home.ll[0]]; // [lng, lat]
  const EARTH_HALF = Math.PI * 6371;           // km from home to the rim (the far side of the earth)
  const EARTH_ROUND = 2 * EARTH_HALF;
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;
  function bearing(a, b) { // [lat, lng] to [lat, lng], degrees clockwise from north
    const p1 = rad(a[0]), p2 = rad(b[0]), dl = rad(b[1] - a[1]);
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (deg(Math.atan2(y, x)) + 360) % 360;
  }

  // the countries with their distance and bearing from Taipei, nearest first
  const mine = FP.abroad.map((c) => ({ c, km: FP.km(FP.home.ll, c.ll), b: bearing(FP.home.ll, c.ll) }))
    .sort((p, q2) => p.km - q2.km);
  mine.forEach((m, i) => { m.rank = i; });

  // his farthest place, from every stop of every trip
  const far = FP.places.map((p) => ({ p, km: FP.km(FP.home.ll, p.ll) })).sort((a, b) => b.km - a.km)[0];

  const TONE = { asia: 'clay', europe: 'olive', 'north-america': 'slate', oceania: 'ochre' };

  // keep only the part of a country he could have stood on (no French Guiana, Alaska, Hawaii)
  function trim(f) {
    if (!f || f.geometry.type !== 'MultiPolygon') return f;
    const polys = f.geometry.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }));
    let main = polys[0], best = -1;
    for (const p of polys) { const a = d3.geoArea(p); if (a > best) { best = a; main = p; } }
    const mc = d3.geoCentroid(main);
    const keep = polys.filter((p) => { const c = d3.geoCentroid(p); return FP.km([mc[1], mc[0]], [c[1], c[0]]) < 2600; });
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: keep.map((p) => p.coordinates) } };
  }

  /* ------------------------------------------------------------ helpers */

  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const html = (tag, cls, parent, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };
  const km = (n) => FP.fmt(Math.round(n));

  /* ------------------------------------------------------------ the page */

  let W = null;
  let drawn = false;
  const settled = FP.still || FP.reduced;

  const svg = el('svg', { class: 'fh-map' }, stage);
  const card = html('section', 'fh-card', stage);

  function words() {
    const c = FP.counts, w = FP.w;
    card.textContent = '';
    html('p', 'fh-card__kicker fp-label', card, `${w.where}`);
    html('p', 'fh-card__from', card, t().from);
    const big = html('p', 'fh-card__big', card);
    html('span', 'fh-card__n', big, FP.fmt(c.countries));
    html('span', 'fh-card__w', big, w.countries(c.countries));
    const row = html('p', 'fh-card__row', card);
    for (const [n, word] of [[c.trips, w.trips(c.trips)], [c.continents, w.continents(c.continents)]]) {
      const s = html('span', 'fh-card__pair', row);
      html('span', 'fh-card__m', s, FP.fmt(n));
      html('span', 'fh-card__mw', s, word);
    }
    // the four earth colours, one for each continent; home in ink
    const key = html('p', 'fh-card__tones', card);
    for (const id of ['asia', 'europe', 'north-america', 'oceania']) {
      const s = html('span', `fh-tone is-${TONE[id]}`, key);
      html('span', 'fh-tone__w', s, w.continent[id]);
    }
    const f1 = html('div', 'fh-card__fact', card);
    html('p', 'fp-label', f1, t().farthest);
    html('p', 'fh-card__place', f1, far.p.name[FP.lang]);
    html('p', 'fh-card__km', f1, `${km(far.km)} ${w.km}`);
    const f2 = html('div', 'fh-card__fact', card);
    html('p', 'fp-label', f2, t().flown);
    html('p', 'fh-card__place', f2, `${FP.fmt(c.km)} ${w.km}`);
    html('p', 'fh-card__km', f2, t().round(Math.floor(c.km / EARTH_ROUND)));
    html('p', 'fh-card__key', card, t().key);
  }

  function draw() {
    const w = stage.clientWidth, h = stage.clientHeight;
    const narrow = w < 720 || w / h < 1.0;
    const edge = Math.max(16, Math.min(40, w * 0.03));
    const top = 64;

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.textContent = '';
    if (!drawn && !settled) stage.classList.add('is-arriving'); // the first drawing is born hidden, then arrives

    /* --- the size of the chart and where it sits */
    const labelPx = w >= 1200 ? 10.5 : 10;
    svg.style.setProperty('--lab', `${labelPx}px`);
    card.classList.toggle('is-below', narrow);
    card.classList.toggle('is-compact', !narrow && h < 680);
    let R, bz, cx, cy, Rl, slots = null;
    if (narrow) {
      bz = 12;
      R = Math.min((w - edge * 2) / 2 - bz, (h - top) * 0.3);
      cx = w / 2;
      cy = top + 6 + R + bz;
      card.style.setProperty('--cx', `${edge}px`);
      card.style.setProperty('--cy', `${Math.round(cy + R + bz + 28)}px`);
      card.style.setProperty('--cw', `${w - edge * 2}px`);
    } else {
      // As tall as the page allows; smaller only if the names, the disc and the card do not fit
      // across. The card sits right of the disc and steps aside for any name on that side.
      const availH = h - top - 16;
      bz = Math.max(13, Math.min(20, availH * 0.024));
      const gap = Math.max(28, w * 0.028);
      const cardW = Math.round(Math.max(220, Math.min(290, w * 0.2)));
      card.style.setProperty('--cw', `${cardW}px`);
      // a short window sets the card smaller, then leaves out its two quiet lines
      card.classList.remove('is-tight');
      if (card.getBoundingClientRect().height > availH) card.classList.add('is-compact');
      if (card.getBoundingClientRect().height > availH) card.classList.add('is-tight');
      const cardH = card.getBoundingClientRect().height;
      R = availH / 2 - (bz + 16 + labelPx * 1.2);
      let left = 0, right = 0, cardX = 0;
      for (let i = 0; i < 40; i++) {
        Rl = R + bz + 16;
        slots = place(Rl, labelPx);
        left = Math.max(R + bz, ...slots.filter((L) => L.dir < 0).map((L) => -L.x + 2 + L.w));
        cardX = R + bz + gap;
        for (const L of slots) {
          if (L.dir > 0 && Math.abs(L.y) < cardH / 2 + labelPx) cardX = Math.max(cardX, L.x + 2 + L.w + gap * 0.75);
        }
        right = Math.max(cardX + cardW, ...slots.filter((L) => L.dir > 0).map((L) => L.x + 2 + L.w));
        if (left + right <= w - edge * 2 || R < 140) break;
        R *= 0.97;
      }
      Rl = R + bz + 16;
      cx = edge + (w - edge * 2 - (left + right)) / 2 + left;
      cy = top + availH / 2 + 4;
      card.style.setProperty('--cx', `${Math.round(cx + cardX)}px`);
      card.style.setProperty('--cy', `${Math.round(Math.max(cy, top + 4 + cardH / 2))}px`);
    }

    const proj = d3.geoAzimuthalEquidistant().rotate([-HOME[0], -HOME[1]]).clipAngle(179.999)
      .scale(R / Math.PI).translate([cx, cy]).precision(0.3);
    const path = d3.geoPath(proj);
    const pxPerKm = R / EARTH_HALF;
    const at = (b, r) => [cx + r * Math.sin(rad(b)), cy - r * Math.cos(rad(b))];

    /* --- the disc: the sea, then the land, pale */
    const disc = el('g', { class: 'fh-disc' }, svg);
    el('circle', { cx, cy, r: R, class: 'fh-sea' }, disc);
    el('path', { d: path(W.land), class: 'fh-land' }, disc);

    /* --- his countries, solid */
    const fills = el('g', { class: 'fh-fills' }, svg);
    for (const m of mine) {
      const f = trim(W.visited.find((g) => g.id === m.c.iso));
      if (!f) continue;
      const p = el('path', { d: path(f), class: `fh-fill is-${TONE[m.c.continent] || 'clay'}`, 'data-id': m.c.id }, fills);
      hover(p, m);
    }
    const hp = el('path', { d: path(W.home), class: 'fh-fill is-home' }, fills);
    hover(hp, { c: FP.home });

    /* --- the rings, every 1,000 km; every 5,000 labelled */
    const rings = el('g', { class: 'fh-rings', transform: `translate(${cx} ${cy})` }, svg);
    const ringLabels = el('g', { class: 'fh-ringlabels' }, svg);
    const step = 1000;
    const RING_B = 112; // the labels sit along this bearing, across the open Pacific
    let ri = 0;
    for (let d = step; d < EARTH_HALF - 300; d += step) {
      const major = d % 5000 === 0;
      if (!major && R < 200 && d % 2000) continue; // a small chart keeps every other ring
      const c = el('circle', { cx: 0, cy: 0, r: d * pxPerKm, class: 'fh-ring' + (major ? ' is-major' : '') }, rings);
      c.style.setProperty('--i', ri++);
      if (major) {
        const p = at(RING_B, d * pxPerKm);
        const tx = el('text', { x: p[0], y: p[1], class: 'fh-ringlabel' }, ringLabels);
        tx.textContent = `${FP.fmt(d)} ${FP.w.km}`;
        tx.style.setProperty('--i', ri - 1);
      }
    }
    svg.insertBefore(rings, fills); // the rings run under his countries, so they stay solid

    /* --- the bezel: two circles, ticks every degree, the four bearings in words */
    const bezel = el('g', { class: 'fh-bezel' }, svg);
    el('circle', { cx, cy, r: R, class: 'fh-rim' }, bezel);
    el('circle', { cx, cy, r: R + bz, class: 'fh-rim is-outer' }, bezel);
    let ticks = '';
    const every = R > 260 ? 1 : 2;
    for (let a = 0; a < 360; a += every) {
      if (a % 90 === 0 || Math.min(a % 90, 90 - (a % 90)) < (R > 260 ? 3 : 5)) continue; // room for the words
      const len = a % 10 === 0 ? bz * 0.5 : a % 5 === 0 ? bz * 0.32 : bz * 0.18;
      const p0 = at(a, R + bz), p1 = at(a, R + bz - len);
      ticks += `M${p0[0].toFixed(1)},${p0[1].toFixed(1)}L${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
    }
    el('path', { d: ticks, class: 'fh-ticks' }, bezel);
    t().bearings.forEach((word, i) => {
      const p = at(i * 90, R + bz / 2);
      el('text', { x: p[0], y: p[1], class: 'fh-cardinal' }, bezel).textContent = word;
    });

    /* --- the lines from home, nearest first; each ends in a tick */
    const route = el('g', { class: 'fh-lines' }, svg);
    const notch = el('g', { class: 'fh-notches' }, svg);
    for (const m of mine) {
      const end = proj([m.c.ll[1], m.c.ll[0]]);
      const len = Math.hypot(end[0] - cx, end[1] - cy);
      const g = el('g', { class: 'fh-line' }, route);
      g.style.setProperty('--i', m.rank);
      m.dur = (0.35 + Math.min(1, len / R) * 0.45).toFixed(2); // longer lines take a little longer
      g.style.setProperty('--len', m.dur);
      el('line', { x1: cx, y1: cy, x2: end[0], y2: end[1], pathLength: 1, class: 'fh-ray' }, g);
      // the tick across the end of the line, as on a measured drawing
      const ux = (end[0] - cx) / (len || 1), uy = (end[1] - cy) / (len || 1);
      const tk = narrow ? 2.5 : 3.5;
      el('line', { x1: end[0] - uy * tk, y1: end[1] + ux * tk, x2: end[0] + uy * tk, y2: end[1] - ux * tk, class: 'fh-end' }, g);
      // its bearing, notched on the bezel
      const n0 = at(m.b, R), n1 = at(m.b, R + bz);
      const ng = el('g', { class: 'fh-notch' }, notch);
      ng.style.setProperty('--i', m.rank);
      ng.style.setProperty('--len', m.dur);
      el('line', { x1: n0[0], y1: n0[1], x2: n1[0], y2: n1[1] }, ng);
      g.setAttribute('data-id', m.c.id);
      ng.setAttribute('data-id', m.c.id);
      m.end = end;
    }

    /* --- home, at the centre */
    const homeG = el('g', { class: 'fh-home' }, svg);
    el('circle', { cx, cy, r: 3.2, class: 'fh-home__ring' }, homeG);
    el('circle', { cx, cy, r: 1.2, class: 'fh-home__dot' }, homeG);

    /* --- the names outside the bezel, at each line's bearing */
    if (slots) drawLabels(slots, { cx, cy, R, bz, labelPx, at });

    if (!drawn && !settled) {
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-in')));
      setTimeout(() => stage.classList.remove('is-arriving'), 4200);
    } else {
      stage.classList.add('is-in');
    }
    drawn = true;

    function hover(node, m) {
      node.addEventListener('pointermove', (e) => { on(m, true); FP.tip(e.clientX, e.clientY, FP.about(m.c)); });
      node.addEventListener('pointerleave', () => { on(m, false); FP.tip(); });
    }
  }

  // the line, notch and name of one country lit together
  function on(m, yes) {
    svg.classList.toggle('is-on', yes);
    svg.querySelectorAll(`[data-id="${m.c.id}"]`).forEach((n) => n.classList.toggle('is-on', yes));
  }

  /* ------------------------------------------------------------ the names */

  // Names sit outside the bezel, on the left for bearings west of north and south, on the right
  // for the rest. Where bearings crowd (Europe lies in one direction from Taipei), they are spread
  // apart up and down, each joined to its notch by a fine leader. Measured before drawing, so
  // the chart can be sized to fit them.
  const meas = document.createElement('canvas').getContext('2d');
  function textW(str, px, weight, em) {
    meas.font = `${weight} ${px}px Geist, "Noto Sans TC", sans-serif`;
    meas.letterSpacing = `${(em * px).toFixed(2)}px`;
    return meas.measureText(str).width;
  }
  function labelW(m, px) {
    const zh = FP.lang === 'zh';
    const n = zh ? m.c.name.zh : m.c.name.en.toUpperCase();
    return textW(n, px, 500, zh ? 0.08 : 0.12) + px * 0.55 + textW(km(m.km), px, 400, 0.04);
  }

  // where each name goes, relative to the centre of the disc
  function place(Rl, px) {
    const gap = px * 1.5;
    const sides = [[], []];
    for (const m of mine) sides[m.b < 180 ? 1 : 0].push({ m, y0: -Rl * Math.cos(rad(m.b)), w: labelW(m, px) });
    const out = [];
    sides.forEach((side, s) => {
      side.forEach((L) => { L.y = L.y0; });
      side.sort((a, b) => a.y0 - b.y0);
      const lo = -Rl - px * 0.4, hi = Rl + px * 0.4;
      for (let pass = 0; pass < 60; pass++) {
        for (let i = 1; i < side.length; i++) if (side[i].y - side[i - 1].y < gap) side[i].y = side[i - 1].y + gap;
        if (side.length && side[side.length - 1].y > hi) side[side.length - 1].y = hi;
        for (let i = side.length - 2; i >= 0; i--) if (side[i + 1].y - side[i].y < gap) side[i].y = side[i + 1].y - gap;
        if (side.length && side[0].y < lo) side[0].y = lo;
      }
      const dir = s === 1 ? 1 : -1;
      for (const L of side) {
        const dx = Math.sqrt(Math.max(0, Rl * Rl - L.y * L.y));
        L.dir = dir;
        L.x = dir * Math.max(dx, px * 1.2);
        out.push(L);
      }
    });
    return out;
  }

  function drawLabels(slots, { cx, cy, R, bz, labelPx, at }) {
    const g = el('g', { class: 'fh-labels' }, svg);
    for (const L of slots) {
      const m = L.m, dir = L.dir;
      const ax = cx + L.x, ay = cy + L.y;
      const n1 = at(m.b, R + bz);
      const n2 = at(m.b, R + bz + 5);
      const lg = el('g', { class: 'fh-label', 'data-id': m.c.id }, g);
      lg.style.setProperty('--i', m.rank);
      lg.style.setProperty('--len', m.dur);
      el('path', { d: `M${n1[0]},${n1[1]}L${n2[0]},${n2[1]}L${ax - dir * 3},${ay}`, class: 'fh-leader' }, lg);
      const tx = el('text', { x: ax + dir * 2, y: ay, class: 'fh-name', 'text-anchor': dir > 0 ? 'start' : 'end' }, lg);
      el('tspan', { class: 'fh-name__n' }, tx).textContent = m.c.name[FP.lang];
      el('tspan', { class: 'fh-name__km', dx: labelPx * 0.55 }, tx).textContent = km(m.km);
      // a generous target for the pointer
      const x0 = dir > 0 ? ax : ax - L.w - 6;
      const hit = el('rect', { class: 'fh-hit', x: x0 - 2, y: ay - labelPx, width: L.w + 10, height: labelPx * 2 }, lg);
      hit.addEventListener('pointermove', (e) => { on(m, true); FP.tip(e.clientX, e.clientY, FP.about(m.c)); });
      hit.addEventListener('pointerleave', () => { on(m, false); FP.tip(); });
    }
  }

  /* ------------------------------------------------------------ start */

  const fontsIn = Promise.all([
    document.fonts.load('400 60px "Playfair Display"', '0123456789countries'),
    document.fonts.load('500 11px "Geist"', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,'),
    document.fonts.load('400 11px "Geist"', '0123456789,'),
    // every Chinese character the page may set, so each is measured in its own face
    document.fonts.load('500 11px "Noto Sans TC"', FP.countries.map((c) => c.name.zh).join('') + Object.values(T.zh).filter((v) => typeof v === 'string').join('') + T.zh.bearings.join('') + T.zh.round(4) + '我去過的地方公里亞洲歐洲北美洲大洋洲'),
    document.fonts.load('500 40px "Noto Serif TC"', '個國家趟旅行大洲從台北量起華盛頓特區' + FP.places.map((p) => p.name.zh).join('')),
  ]).catch(() => null);

  words();
  Promise.all([FP.world('50m'), fontsIn]).then(([world]) => {
    W = world;
    draw();
    let tm = 0;
    // redraw only when the stage really changes size (the review bar arriving is not a resize)
    let size = `${stage.clientWidth}x${stage.clientHeight}`;
    addEventListener('resize', () => {
      clearTimeout(tm);
      tm = setTimeout(() => {
        const now = `${stage.clientWidth}x${stage.clientHeight}`;
        if (now !== size) { size = now; draw(); }
      }, 120);
    });
    FP.onLang(() => { words(); draw(); });
  });
})();
