/* Footprint, "Only where I have been / 只有去過的地方" (2026-11-06).
   A world map with nothing on it but the countries he has been to: solid ink at their true
   places, Taiwan in clay as home. The rest of the world is paper, its coasts a faint dotted
   line so the shapes keep their place. It reads as an archipelago, his own world. The count is
   set enormous in the emptiest part of the page, found by looking where the shapes are not.
   The map is centred on the Pacific, as maps printed in Taiwan are, so home sits near the middle. */
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
      line: (c) => [`of ${c.world}, on ${c.continents} continents,`, `${c.trips} trips, ${c.since} to ${c.until}`],
      label: 'The countries I have been to',
    },
    zh: {
      line: (c) => [`全世界 ${c.world} 國中的 ${c.countries} 國，${c.continents} 個大洲，`, `${c.trips} 趟旅行，${c.since} 到 ${c.until} 年`],
      label: '我去過的國家',
    },
  };
  const t = () => T[FP.lang];

  // the meridian in the middle: halfway along his world, from Spain eastwards to New York,
  // which puts Taiwan a little left of centre and leaves Europe and America equally far out
  const LAMBDA = +(q.get('lambda') || 138);

  /* ------------------------------------------------------------ helpers */

  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // Keep only the part of a country he could have stood on: drop far-off territories
  // (French Guiana, Alaska, Hawaii, Christmas Island) that would sit alone on an empty continent.
  function trim(f) {
    if (f.geometry.type !== 'MultiPolygon') return f;
    const polys = f.geometry.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }));
    let main = polys[0], best = -1;
    for (const p of polys) { const a = d3.geoArea(p); if (a > best) { best = a; main = p; } }
    const mc = d3.geoCentroid(main);
    const keep = polys.filter((p) => { const c = d3.geoCentroid(p); return FP.km([mc[1], mc[0]], [c[1], c[0]]) < 2600; });
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: keep.map((p) => p.coordinates) } };
  }

  /* ------------------------------------------------------------ the page */

  let W = null;          // the world's shapes
  let coast = null;      // the world's coastline
  let drawn = false;     // the arrival plays once; later draws are the finished state
  const settled = FP.still || FP.reduced;

  const svg = el('svg', { class: 'on-map', 'aria-hidden': 'true' }, stage);
  const count = document.createElement('div');
  count.className = 'on-count';
  count.innerHTML = '<div class="on-count__n"></div><div class="on-count__side"><div class="on-count__w"></div><p class="on-count__line fp-label"></p></div>';
  stage.appendChild(count);
  const sr = document.createElement('h1');
  sr.className = 'on-sr';
  stage.appendChild(sr);

  function words() {
    const c = FP.counts;
    count.querySelector('.on-count__n').textContent = FP.fmt(c.countries);
    count.querySelector('.on-count__w').textContent = FP.w.countries(c.countries);
    // the small line in two halves, so it breaks where the sense does
    count.querySelector('.on-count__line').innerHTML = t().line(c).map((s) => `<span>${FP.esc(s)}</span>`).join(FP.lang === 'zh' ? '' : ' ');
    sr.textContent = `${t().label}: ${FP.fmt(c.countries)} ${FP.w.countries(c.countries)}, ${t().line(c).join(FP.lang === 'zh' ? '' : ' ')}`;
  }

  function draw() {
    const w = stage.clientWidth, h = stage.clientHeight;
    const narrow = w < 700 || w / h < 1.05;
    const edge = Math.max(16, Math.min(40, w * 0.032));
    const top = 64; // under the slim top bar

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.textContent = '';
    if (!drawn && !settled) stage.classList.add('is-arriving'); // the first drawing is born hidden, then arrives

    // his countries, oldest first; home first of all
    const list = [{ c: FP.home, f: W.home }].concat(FP.abroad.map((c) => ({ c, f: W.visited.find((f) => f.id === c.iso) })))
      .filter((it) => it.f).map((it) => ({ c: it.c, f: trim(it.f) }));

    // The frame the map is fitted to: every longitude, from the far north of Europe to the south
    // of New Zealand. On a phone, only as far as his own countries reach, so they are drawn larger.
    const frame = { type: 'MultiPoint', coordinates: [] };
    for (let lng = -180; lng <= 180; lng += 2.5) for (const lat of [72, 0, -50]) frame.coordinates.push([lng, lat]);
    const mine = { type: 'FeatureCollection', features: list.map((it) => it.f) };
    const fit = narrow ? mine : frame;
    const proj = d3.geoEqualEarth().rotate([-LAMBDA, 0]).precision(0.2);
    proj.fitWidth(w - edge * 2, fit);
    const fb = d3.geoPath(proj).bounds(fit);
    const mh = fb[1][1] - fb[0][1];
    const room = h - top - 8;
    let y0;
    if (narrow) {
      // on a phone the map and the count below it sit together, in the middle of the screen
      fitCount(w, edge);
      const bh = count.getBoundingClientRect().height;
      const gap = Math.max(36, h * 0.06);
      y0 = top + Math.max(16, (room - (mh + gap + bh)) / 2);
      count.style.setProperty('--x', `${Math.round(edge)}px`);
      count.style.setProperty('--y', `${Math.round(y0 + mh + gap)}px`);
    } else {
      y0 = top + Math.max(4, (room - mh) / 2);
    }
    const t0 = proj.translate();
    proj.translate([t0[0] + edge, t0[1] - fb[0][1] + y0]);
    svg.style.setProperty('--dot', `${Math.max(2.2, Math.min(3.4, proj.scale() / 70)).toFixed(2)}`);
    proj.clipExtent(narrow ? [[0, y0 - 14], [w, y0 + mh + 14]] : [[0, 0], [w, h]]);
    const path = d3.geoPath(proj);

    // the faint coast of the whole world: a dotted line
    const ghost = el('g', { class: 'on-ghost' }, svg);
    el('path', { d: path(coast), class: 'on-coast' }, ghost);

    const shapes = el('g', { class: 'on-shapes' }, svg);
    const rings = el('g', { class: 'on-shapes on-rings' }, svg); // above every shape
    const marks = el('g', { class: 'on-marks' }, svg);
    const solid = []; // what the count must stay clear of
    list.forEach((it, i) => {
      const f = it.f;
      const g = el('g', { class: 'on-c' + (it.c.home ? ' is-home' : '') }, shapes);
      g.style.setProperty('--i', i);
      el('path', { d: path(f) }, g);
      if (it.c.home) {
        // home, named once, in its own colour
        // set in the open sea east of its southern tip, clear of the Ryukyu islands
        const tw = proj([123.4, 22.4]);
        const tb = path.bounds(f);
        el('text', { x: Math.max(tw[0], tb[1][0] + (narrow ? 7 : 5)), y: tw[1] + (narrow ? 2 : 0), class: 'on-home fp-label' }, g).textContent = FP.w.home;
      }
      const b = path.bounds(f);
      const size = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]);
      let hit = null;
      const both = [g];
      // a country under a few pixels gets a ring, so it is still seen
      if (size < (narrow ? 3.5 : 6)) {
        const p = proj([it.c.ll[1], it.c.ll[0]]);
        const ctr = path.centroid(f);
        const at = Number.isFinite(ctr[0]) ? ctr : p;
        const r = narrow ? 3.2 : 4.5;
        const rg = el('g', { class: g.getAttribute('class') }, rings);
        rg.style.setProperty('--i', i);
        el('circle', { cx: at[0], cy: at[1], r, class: 'on-halo' }, rg);
        el('circle', { cx: at[0], cy: at[1], r, class: 'on-ring' }, rg);
        both.push(rg);
        hit = el('circle', { cx: at[0], cy: at[1], r: 11, class: 'on-hit' }, marks);
        solid.push({ ring: at });
      } else {
        hit = el('path', { d: path(f), class: 'on-hit' }, marks);
      }
      solid.push({ f });
      hit.addEventListener('pointermove', (e) => { both.forEach((n) => n.classList.add('is-on')); svg.classList.add('is-on'); FP.tip(e.clientX, e.clientY, FP.about(it.c)); });
      hit.addEventListener('pointerleave', () => { both.forEach((n) => n.classList.remove('is-on')); svg.classList.remove('is-on'); FP.tip(); });
    });

    if (!narrow) place(w, h, edge, top, solid, proj);

    knock(w, h);

    if (!drawn && !settled) {
      // one at a time, in the order he first went
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-in')));
      setTimeout(() => stage.classList.remove('is-arriving'), 3400);
    } else {
      stage.classList.add('is-in');
    }
    drawn = true;
  }

  /* ------------------------------------------------------------ where the count goes */

  // the dotted coast stops short of the count, so the number stands on clean paper
  function knock(w, h) {
    const sb = stage.getBoundingClientRect();
    const r = count.getBoundingClientRect();
    const pad = 14;
    const defs = el('defs', {}, svg);
    const m = el('mask', { id: 'on-knock', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: w, height: h }, defs);
    el('rect', { x: 0, y: 0, width: w, height: h, fill: '#fff' }, m); // mask values, not colours: white keeps, black hides
    el('rect', { x: r.left - sb.left - pad, y: r.top - sb.top - pad, width: r.width + pad * 2, height: r.height + pad * 2, fill: '#000' }, m);
    svg.querySelector('.on-ghost').setAttribute('mask', 'url(#on-knock)');
  }

  // On a phone: the number as wide as the screen allows, at most a third of its height.
  function fitCount(w, edge) {
    count.classList.add('is-stacked');
    let f = Math.min((stage.clientHeight / 3) / 0.72, 600);
    for (let i = 0; i < 40; i++) {
      count.style.setProperty('--f', `${f}px`);
      if (count.querySelector('.on-count__n').getBoundingClientRect().width <= (w - edge * 2) * 0.86) break;
      f *= 0.96;
    }
    return f;
  }

  // Wider: paint the shapes (and a margin round them) on a small canvas, then look for the
  // largest place the count fits in, nearest the open ocean between New Zealand and Chile.
  function place(w, h, edge, top, solid, proj) {
    const k = 0.25; // a cell is four pixels
    const cw = Math.ceil(w * k), ch = Math.ceil(h * k);
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.scale(k, k);
    ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; // an unseen canvas: only whether a cell is taken matters
    const margin = Math.max(24, w * 0.022);
    ctx.lineWidth = margin * 2; ctx.lineJoin = 'round';
    const p2 = d3.geoPath(proj, ctx);
    for (const s of solid) {
      ctx.beginPath();
      if (s.f) { p2(s.f); ctx.fill(); ctx.stroke(); } else { ctx.arc(s.ring[0], s.ring[1], 6 + margin, 0, Math.PI * 2); ctx.fill(); }
    }
    // the top bar and the side gutters are taken too
    ctx.fillRect(0, 0, w, top + 8);
    ctx.fillRect(0, 0, edge, h); ctx.fillRect(w - edge, 0, edge, h);
    ctx.fillRect(0, h - 10, w, 10);
    const px = ctx.getImageData(0, 0, cw, ch).data;
    // summed-area table of taken cells
    const S = new Int32Array((cw + 1) * (ch + 1));
    for (let y = 0; y < ch; y++) {
      let row = 0;
      for (let x = 0; x < cw; x++) {
        row += px[(y * cw + x) * 4 + 3] > 10 ? 1 : 0;
        S[(y + 1) * (cw + 1) + x + 1] = S[y * (cw + 1) + x + 1] + row;
      }
    }
    const taken = (x0, y0, x1, y1) => S[y1 * (cw + 1) + x1] - S[y0 * (cw + 1) + x1] - S[y1 * (cw + 1) + x0] + S[y0 * (cw + 1) + x0];

    // the open Pacific south of the equator, between Australia and the Americas: his world's
    // own empty ocean. The largest count that fits there; anywhere else only if it must.
    const want = proj([-140, -30]);
    const reach = w * 0.3;
    let f = Math.min((h / 3) / 0.72, w * 0.36);
    count.classList.remove('is-stacked');
    let fallback = null;
    for (let tries = 0; tries < 40; tries++) {
      count.style.setProperty('--f', `${f}px`);
      const r = count.getBoundingClientRect();
      const bw = Math.ceil(r.width * k), bh = Math.ceil(r.height * k);
      let best = null, bestD = Infinity;
      if (bw < cw && bh < ch) {
        for (let y = 0; y + bh <= ch; y++) {
          for (let x = 0; x + bw <= cw; x++) {
            if (taken(x, y, x + bw, y + bh)) continue;
            const d = Math.hypot((x + bw / 2) / k - want[0], (y + bh / 2) / k - want[1]);
            if (d < bestD) { bestD = d; best = [x / k, y / k]; }
          }
        }
      }
      if (best && !fallback) fallback = { f, at: best };
      if (best && bestD < reach) { put(f, best); return; }
      f *= 0.95;
      if (f < 64) break;
    }
    if (fallback) put(fallback.f, fallback.at);
  }

  function put(f, at) {
    count.style.setProperty('--f', `${f}px`);
    count.style.setProperty('--x', `${Math.round(at[0])}px`);
    count.style.setProperty('--y', `${Math.round(at[1])}px`);
  }

  /* ------------------------------------------------------------ start */

  const fontsIn = Promise.all([
    document.fonts.load('400 120px "Playfair Display"', '0123456789'),
    document.fonts.load('400 40px "Playfair Display"', 'countries'),
    document.fonts.load('500 11px "Geist"', 'of 195'),
    document.fonts.load('500 40px "Noto Serif TC"', '個國家'),
    document.fonts.load('500 11px "Noto Sans TC"', '全世界國中的個大洲趟旅行到年，家'),
  ]).catch(() => null);

  words();
  Promise.all([FP.world('50m'), fontsIn]).then(([world]) => {
    W = world;
    // the coast of every land but Antarctica, as one line
    coast = topojson.merge(W.topo, W.topo.objects.countries.geometries.filter((g) => g.id !== '010'));
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
