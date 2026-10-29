/* Journey, built with the scroll-craft skill (2026-10-18). Grammar "rewinding atlas", brief in
   experiments/journey/scrollcraft/builds/journey/BRIEF.md.

   One map stays with the visitor the whole way. It opens on the whole of his travels: every plane
   leaves Taiwan at once and lands across the world while the totals settle (the peak). Then the
   trips are read by year, newest first, and the map rewinds with them: a large year counts back,
   countries he had not yet seen go pale, later routes lift off. At 2010 the map is almost empty;
   past it, the map plays forward to the present and holds.

   As the arrival scrolls away the map folds into a globe (2026-10-28, his call): the globe turns
   to the trip being read, over that trip's photograph, and the trips are read on a frosted panel
   where the one in view stays clear. A country on the map opens its latest trip. On the phone the
   globe sits across the top and the photograph in the entry instead.

   The scroll-craft engine (scrollcraft.js, unedited) drives the entries and the year wipes; the
   map, the planes, the totals, the rewind and the print are this page's own code. */
(() => {
  'use strict';

  const K = window.Kit;
  const { esc, $ } = K;
  const S = K.S;
  const main = $('#main');
  const top = $('#top');
  const ll = (p) => [p[1], p[0]];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = d3.easeCubicInOut;
  const PLANE = 'M9,0C9,-0.8 8,-1.1 6.5,-1.1L2,-1.1L-2.5,-7.5L-4.3,-7.5L-1.8,-1.1L-6,-1.1L-7.8,-3.6L-9,-3.6L-8,0L-9,3.6L-7.8,3.6L-6,1.1L-1.8,1.1L-4.3,7.5L-2.5,7.5L2,1.1L6.5,1.1C8,1.1 9,0.8 9,0Z';
  // this page's own name, so the trip page's back word returns here, to the entry it was opened from
  const PAGE = location.pathname.split('/').pop().replace('.html', '') || 'journey';
  const tripHref = (t) => `../wc-sketch/trip/?trip=${encodeURIComponent(t.id)}&from=${PAGE}`;

  const WORDS = {
    en: {
      intro: 'Every trip I have taken with a camera, newest first. Read down and the map goes back in time with you.',
      trips: 'trips', countries: 'countries', photos: 'photographs',
      byThen: (n) => `${n} countries by then`,
      year: (n) => (n === 1 ? '1 trip' : `${n} trips`),
      began: 'Where it began',
      first: (place, y) => `${place}, ${y}.`,
      since: (t, c, y) => `${t} trips and ${c} countries later, the map is back in ${y}.`,
      guides: 'The places themselves are in Guides.',
      insta: 'More as it happens on Instagram, tuan_1127.',
      sep: ' ',
    },
    zh: {
      intro: '每一趟帶著相機的旅行，從最近的開始。往下讀，地圖會陪你回到過去。',
      trips: '趟旅行', countries: '個國家', photos: '張照片',
      byThen: (n) => `那時去過 ${n} 個國家`,
      year: (n) => `${n} 趟`,
      began: '從這裡開始',
      first: (place, y) => `${y} 年，${place}。`,
      since: (t, c, y) => `${t} 趟旅行、${c} 個國家之後，地圖回到 ${y} 年。`,
      guides: '那些地方本身，寫在攻略裡。',
      insta: '最新的在 Instagram，tuan_1127。',
      sep: '',
    },
  };
  const W = () => WORDS[K.lang];

  // the month without the year, inside a year's chapter ("August"; "8 月")
  const month = (t) => {
    const d = K.when(t);
    return K.lang === 'zh' ? d.replace(/^\d{4}\s*(年\s*)?/, '').replace(/^\d{4}$/, '') : d.replace(/\s*\d{4}$/, '').replace(/^\d{4}$/, '');
  };

  /* ------------------------------------------------------------ the facts the map needs */

  const CRAFT = 'craft' in document.body.dataset;   // the scroll-craft round, see dockCraft()
  const HOME_ID = S.countries.find((c) => K.km(c.ll, S.flightsFrom) < 80)?.id || 'taiwan';
  const years = [...new Set(K.trips.map((t) => +t.year))].sort((a, b) => b - a);
  const firstYear = {};                       // country id -> the year he first went
  for (const t of K.trips) for (const c of t.countries) firstYear[c.id] = Math.min(firstYear[c.id] || 9999, +t.year);
  firstYear[HOME_ID] = 0;
  const isoFirst = {};                        // map id -> first year
  for (const [id, y] of Object.entries(firstYear)) if (K.ISO[id]) isoFirst[K.ISO[id]] = y;
  const countriesBy = (y) => Object.values(firstYear).filter((f) => f <= y).length;
  const totalPhotos = Object.keys(S.slides).length;
  const firstTrip = K.trips[K.trips.length - 1];

  /* ------------------------------------------------------------ photographs, as the entries show them */

  // a photograph that opens the viewer, from the pointer or the keyboard
  const shot = (id, sizes, cls = '') => `<button type="button" class="jr-shot ${cls}" data-shot="${id}">${K.img(id, sizes, 'jr-shot__img')}</button>`;
  // the same with its name beneath; --ar lets a row share out its width
  const print = (id, sizes, cls = '') => {
    const s = S.slides[id];
    return `<figure class="jr-print ${cls}" style="--ar: ${(s.w / s.h).toFixed(4)}">${shot(id, sizes)}<figcaption class="jr-print__cap">${esc(s.place[K.lang])}</figcaption></figure>`;
  };
  // on the phone, where the map has no column to lend, the trip's lead print sits in its entry
  const shots = (t) => (t.photos.length ? `<div class="jr-lead" data-set="${t.photos.join(',')}">${print(t.lead || t.photos[0], '92vw')}</div>` : '');
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.jr-shot');
    if (!b || e.target.closest('img')) return;      // an image click is the kit's (it opens the same viewer)
    const set = b.closest('[data-set]');
    K.openViewer(set ? set.dataset.set.split(',') : [b.dataset.shot], b.dataset.shot);
  });

  /* ------------------------------------------------------------ the map */

  // one projection that folds: Natural Earth (a = 0) blended into the orthographic globe (a = 1).
  // The flat map of the arrival becomes the turning globe of the reading (the 8642 Journey's idea)
  function folding() {
    const raw0 = d3.geoNaturalEarth1Raw, raw1 = d3.geoOrthographicRaw;
    const mutate = d3.geoProjectionMutator((a) => (x, y) => {
      const p = raw0(x, y), q = raw1(x, y);
      return [p[0] + a * (q[0] - p[0]), p[1] + a * (q[1] - p[1])];
    });
    let a = 0;
    return Object.assign(mutate(0), { alpha(v) { return arguments.length ? mutate(a = +v) : a; } });
  }
  // the shorter way round from one longitude to another
  const turnBy = (from, to) => ((to - from + 540) % 360) - 180;

  async function makeMap(svgEl) {
    // the whole world, always: drawn into its own fixed frame, which the page then scales to fit
    // (never cropped), whether it fills the screen or sits beside the reading
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    const START = [-150, 0];
    const proj = folding().rotate(START);
    const band = [];
    for (let lon = -180; lon <= 180; lon += 4) band.push([lon, 80], [lon, 0], [lon, -56]);
    const outline = { type: 'MultiPoint', coordinates: band };
    proj.fitWidth(1600, outline);
    const [[x0, y0], [x1, y1]] = d3.geoPath(proj).bounds(outline);
    const pad = 16;
    const vb = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
    svg.attr('viewBox', `${vb.x.toFixed(0)} ${vb.y.toFixed(0)} ${vb.w.toFixed(0)} ${vb.h.toFixed(0)}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    const k0 = proj.scale(), tr0 = proj.translate();
    const k1 = vb.h * 0.49, tr1 = [vb.x + vb.w / 2, vb.y + vb.h / 2];   // the globe fills the frame's height
    const side = k1 * 2.3, vb1 = { x: tr1[0] - side / 2, y: tr1[1] - side / 2, w: side, h: side };
    let unit = 1;   // the size of the frame against the flat map's, so the marks keep their size
    const path = d3.geoPath(proj);

    // two drawings of the world: the fine one for the still arrival, the light one while it moves
    // (a small country missing from the light one is taken from the fine one)
    const fine = await K.world();
    const light = await (window.__world110 || (window.__world110 = fetch('../vendor/countries-110m.json').then((r) => r.json()).then((topo) => ({
      land: topojson.feature(topo, topo.objects.land),
      countries: topojson.feature(topo, topo.objects.countries).features,
      borders: topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b),
    }))));
    const byIso = (w) => Object.fromEntries(w.countries.map((f) => [f.id, f]));
    const fineIso = byIso(fine), lightIso = byIso(light);

    const g = svg.append('g').attr('class', 'world');
    const sphere = g.append('path').attr('class', 'sphere');
    const grat = g.append('path').attr('class', 'grat');
    const graticule = d3.geoGraticule10();
    const land = g.append('path').attr('class', 'land');
    const order = [...new Set(Object.values(isoFirst))].sort((a, b) => a - b);
    // each of his countries knows the year he first went, its order in time (for the replay), and
    // the latest trip that went there (a click on it opens that trip)
    const idOf = Object.fromEntries(Object.entries(K.ISO).map(([id, iso]) => [iso, id]));
    const latest = (iso) => K.trips.find((t) => t.countries.some((c) => c.id === idOf[iso]));
    const visited = g.selectAll('path.visited').data(fine.countries.filter((f) => K.visitedIso.has(f.id))).join('path')
      .attr('class', (f) => `visited${latest(f.id) ? ' has-trip' : ''}`).attr('data-iso', (f) => f.id)
      .attr('data-first', (f) => isoFirst[f.id])
      .attr('style', (f) => `--i: ${order.indexOf(isoFirst[f.id])}`)
      .on('click', (e, f) => {
        const t = latest(f.id);
        if (!t) return;
        if (t.legs.length) { location.href = tripHref(t); return; }
        document.getElementById(`t-${t.id}`)?.scrollIntoView({ behavior: K.reduced ? 'auto' : 'smooth', block: 'center' });
      });
    const border = g.append('path').attr('class', 'border');
    const coast = g.append('path').attr('class', 'coast');

    const legsG = g.append('g');
    const allLegs = K.trips.flatMap((t) => t.legs.map((l) => ({ l, t })));
    const legs = legsG.selectAll('path').data(allLegs).join('path')
      .attr('class', (d) => `leg${d.l.mode === 'flight' ? '' : ' leg--ground'}`);

    // one flight from Taiwan to each country he has been to; p is how far its plane has come
    const home = ll(S.flightsFrom);
    const flights = S.countries.filter((c) => c.id !== HOME_ID).map((c) => {
      const km = K.km(S.flightsFrom, c.ll);
      return { c, to: ll(c.ll), go: d3.geoInterpolate(home, ll(c.ll)), first: firstYear[c.id], dur: 1700 + Math.min(1, km / 13000) * 3600, p: 0 };
    });
    const longest = Math.max(...flights.map((f) => f.dur));
    const sky = g.append('g').attr('class', 'sky');
    const lines = sky.selectAll('path.fly').data(flights).join('path').attr('class', 'fly')
      .attr('style', (f) => `--i: ${order.indexOf(f.first)}`);
    const ends = sky.selectAll('circle.end').data(flights).join('circle').attr('class', 'end').attr('r', 3.4)
      .attr('style', (f) => `--i: ${order.indexOf(f.first)}`);
    const stopsG = sky.append('g');
    const homeDot = g.append('circle').attr('class', 'home').attr('r', 4);
    let planes = null, rings = null;

    /* the pose: how far folded, and which way the globe faces */
    let fold = 0, spin = [-121, -23.5], spinning = 0, nowTrip = null;
    const facing = () => [START[0] + turnBy(START[0], spin[0]) * fold, spin[1] * fold];
    function pose() {
      const a = fold;
      proj.alpha(a).scale(k0 + (k1 - k0) * a).translate([tr0[0] + (tr1[0] - tr0[0]) * a, tr0[1] + (tr1[1] - tr0[1]) * a]).rotate(facing());
      // the frame closes in round the globe as it forms, so the globe fills its column
      const v = [vb.x + (vb1.x - vb.x) * a, vb.y + (vb1.y - vb.y) * a, vb.w + (vb1.w - vb.w) * a, vb.h + (vb1.h - vb.h) * a];
      svg.attr('viewBox', v.map((n) => n.toFixed(1)).join(' '));
      unit = v[2] / vb.w;
      // the far side goes as the map closes round: a cap behind the globe that grows to a hemisphere
      if (a <= 0.001) proj.preclip(d3.geoClipAntimeridian);
      else if (a >= 0.999) proj.preclip(d3.geoClipCircle(Math.PI / 2));   // radians, as d3 takes it here
      else { const cap = d3.geoClipCircle((Math.PI / 180) * (180 - 90 * a)); proj.preclip((s) => d3.geoClipAntimeridian(cap(s))); }
    }
    // a point on the side of the globe that faces us
    const seen = (p) => fold < 0.5 || d3.geoDistance(p, [-facing()[0], -facing()[1]]) < (Math.PI / 180) * (180 - 90 * fold) - 0.02;
    const at2 = (sel, p) => {
      const xy = proj(p);
      sel.setAttribute('cx', xy[0].toFixed(1)); sel.setAttribute('cy', xy[1].toFixed(1));
      sel.setAttribute('visibility', seen(p) ? 'visible' : 'hidden');
      if (!sel.r0) sel.r0 = +sel.getAttribute('r') || 3;
      if (!sel.classList.contains('ring')) sel.setAttribute('r', (sel.r0 * unit).toFixed(2));
    };

    function drawSky() {
      lines.attr('d', (f) => (f.p > 0 ? path({ type: 'LineString', coordinates: [home, f.go(f.p)] }) : null));
      ends.each(function (f) { at2(this, f.to); });
      stopsG.selectAll('circle').each(function (s) { at2(this, s); });
      at2(homeDot.node(), home);
      if (rings) rings.each(function (f) { at2(this, f.to); });
    }
    function draw() {
      pose();
      const still = fold === 0 && !spinning;
      const w = still ? fine : light, iso = still ? fineIso : lightIso;
      sphere.attr('d', path({ type: 'Sphere' })).attr('opacity', fold.toFixed(3));
      grat.attr('d', fold > 0 ? path(graticule) : null).attr('opacity', fold.toFixed(3));
      land.attr('d', path(w.land));
      coast.attr('d', path(w.land));
      border.attr('d', path(w.borders));
      visited.attr('d', (f) => path(iso[f.id] || fineIso[f.id]));
      legs.attr('d', (d) => path(K.legGeo(d.l)));
      drawSky();
    }

    // the globe turns to the trip being read (and back to the first when none is)
    let turnRaf = 0;
    function face(lonlat) {
      const to = [-lonlat[0], -clamp(lonlat[1], -35, 35)];
      to[0] = spin[0] + turnBy(spin[0], to[0]);
      cancelAnimationFrame(turnRaf);
      if (K.reduced || fold === 0) { spin = to; spinning = 0; draw(); return; }
      const from = spin.slice(), t0 = performance.now(), dur = 1100;
      spinning = 1;
      const frame = (now) => {
        const k = clamp((now - t0) / dur, 0, 1), e = ease(k);
        spin = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
        if (k >= 1) spinning = 0;
        draw();
        if (k < 1) turnRaf = requestAnimationFrame(frame);
      };
      turnRaf = requestAnimationFrame(frame);
    }
    // the trip in hand: its legs drawn strong, its stops marked, the globe turned to it
    function trip(t) {
      if (t === nowTrip) return;
      nowTrip = t;
      legs.classed('is-now', (d) => d.t === t);
      const pts = t ? t.stops.map((s) => ll(s.at.ll)) : [];
      stopsG.selectAll('circle').data(pts).join('circle').attr('class', 'stop').attr('r', 2.6);
      // the globe faces the trip's countries (its stops can include the way home)
      const where = (tt) => d3.geoCentroid({ type: 'MultiPoint', coordinates: tt.countries.map((c) => ll(c.ll)) });
      const aim = t && t.countries.length ? where(t) : where(K.trips[0]);
      face(aim);
    }
    // how far folded, from the scroll (0 the flat map, 1 the globe)
    function setFold(a) {
      a = K.reduced ? (a < 0.5 ? 0 : 1) : a;
      if (Math.abs(a - fold) < 0.0005) return;
      fold = a;
      draw();
    }
    trip(null);
    draw();

    // every plane already landed: the lines whole, the ends in (reduced motion, or coming back)
    function settled(onLand) { flights.forEach((f) => { f.p = 1; }); drawSky(); ends.classed('is-in', true); onLand(flights.length, true, 1); }

    // the peak: every plane leaves home at once, once; the countries settle as they land.
    // onLand(n landed, done, p): p is how far the longest flight has come, for the totals
    function flyOut(onLand) {
      if (K.reduced) { settled(onLand); return; }
      planes = sky.selectAll('path.plane').data(flights).join('path').attr('class', 'plane').attr('d', PLANE).attr('opacity', 0);
      rings = sky.selectAll('circle.ring').data(flights).join('circle').attr('class', 'ring').attr('opacity', 0);
      const t0 = performance.now();
      let landed = -1;
      const frame = (now) => {
        const el = now - t0;
        let busy = false, n = 0;
        flights.forEach((f) => { f.p = ease(clamp(el / f.dur, 0, 1)); });
        drawSky();
        planes.each(function (f) {
          const t = el / f.dur;
          if (t >= 1 || !seen(f.go(ease(Math.min(t, 1))))) { this.setAttribute('opacity', 0); if (t >= 1) n++; else busy = true; return; }
          busy = true;
          const e = ease(t);
          const p = proj(f.go(e)), q = proj(f.go(Math.min(1, e + 0.004)));
          this.setAttribute('opacity', 1);
          this.setAttribute('transform', `translate(${p[0].toFixed(1)},${p[1].toFixed(1)}) rotate(${((Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI).toFixed(1)}) scale(1.15)`);
        });
        rings.each(function (f) {
          const k = (el - f.dur) / 1200;
          if (k < 0 || k > 1) { this.setAttribute('opacity', 0); return; }
          busy = true;
          this.setAttribute('opacity', (1 - k).toFixed(3));
          this.setAttribute('r', (3.4 + k * 14).toFixed(2));
        });
        ends.classed('is-in', (f) => el >= f.dur);
        const p = clamp(el / longest, 0, 1);
        if (n !== landed || p < 1) { landed = n; onLand(n, false, p); }
        if (busy) requestAnimationFrame(frame); else onLand(flights.length, true, 1);
      };
      requestAnimationFrame(frame);
    }

    // the rewind: the map as it was at the end of year y (Infinity = now)
    function at(y, hereYear) {
      svg.classed('is-rewound', y !== Infinity);
      g.selectAll('path.visited').classed('is-later', function () { return +this.dataset.first > y; });
      lines.classed('is-later', (f) => f.first > y);
      ends.classed('is-later', (f) => f.first > y);
      legs.classed('is-later', (d) => +d.t.year > y).classed('is-here', (d) => +d.t.year === hereYear);
    }
    // the return: everything comes back in the order he first went
    function forward() {
      svg.classed('is-forward', true);
      at(Infinity, null);
      setTimeout(() => svg.classed('is-forward', false), 2600);
    }
    return { flyOut, settled, at, forward, trip, setFold };
  }

  /* ------------------------------------------------------------ the page */

  let engine = null, map = null, state = null, folioYear = null, folioTimer = 0;

  function render() {
    const w = W(), ww = K.W();
    document.title = `${ww.journey} · tuan photography 陳亮元`;
    top.innerHTML = K.topbar('journey');
    const byYear = years.map((y) => ({ y, trips: K.trips.filter((t) => +t.year === y) }));
    main.innerHTML = `
      <div class="jr">
        <figure class="jr-map map" aria-hidden="true">
          <svg id="jr-svg"></svg>
          <p class="jr-folio"><span class="jr-folio__year" id="jr-year"></span><span class="jr-folio__by" id="jr-by"></span></p>
          <div class="jr-beside">
            <div class="jr-beside__frame"><img class="jr-beside__img" alt=""><img class="jr-beside__img" alt=""></div>
            <p class="jr-beside__cap"><span class="jr-beside__name"></span><span class="jr-beside__where"></span></p>
          </div>
        </figure>
        <div class="jr-panel" aria-hidden="true"></div>
        <div class="jr-text">
          <header class="jr-hero">
            <div class="jr-hero__words">
              <h1 class="jr-hero__title">${esc(ww.journey)}</h1>
              <p class="jr-hero__intro">${esc(w.intro)}</p>
            </div>
            <dl class="jr-totals">
              <div><dt>${esc(w.trips)}</dt><dd class="sc-nums" id="jr-trips">0</dd></div>
              <div><dt>${esc(w.countries)}</dt><dd class="sc-nums" id="jr-countries">1</dd></div>
              <div><dt>${esc(w.photos)}</dt><dd class="sc-nums" id="jr-photos">0</dd></div>
            </dl>
          </header>
          ${CRAFT ? '<div class="jr-hold" aria-hidden="true"></div>' : ''}
          <div class="jr-years">${byYear.map(({ y, trips }) => `
          <section class="jr-year" data-year="${y}">
            <header class="jr-year__head">
              <h2 class="jr-year__n" data-sc-reveal="up">${y}</h2>
              <p class="jr-year__count">${esc(w.year(trips.length))}</p>
            </header>
            <ol class="jr-trips">${trips.map((t) => `
              <li class="jr-trip sc-stack" id="t-${esc(t.id)}" data-trip="${esc(t.id)}" data-sc-in data-sc-stagger="60">
                <${t.legs.length ? `a class="jr-trip__link" href="${tripHref(t)}"` : 'div class="jr-trip__link"'}>
                  ${month(t) ? `<span class="jr-trip__when caps">${esc(month(t))}</span>` : ''}
                  <h3 class="jr-trip__title">${esc(K.title(t))}</h3>
                  <span class="jr-trip__route">${t.legs.length ? esc(K.route(t).join(ww.list)) : esc(ww.noRoute)}</span>
                </${t.legs.length ? 'a' : 'div'}>
                ${shots(t)}
              </li>`).join('')}
            </ol>
          </section>`).join('')}</div>
          <footer class="jr-close">
            <div class="jr-close__words sc-stack" data-sc-in data-sc-stagger="80">
              <p class="jr-close__kicker caps">${esc(w.began)}</p>
              <p class="jr-close__first">${esc(w.first(firstTrip.stops.map((s) => K.nameOf(s.at)).join(ww.list) || K.title(firstTrip), firstTrip.year))}</p>
              <p class="jr-close__since">${esc(w.since(K.trips.length, S.countries.length, years[0]))}</p>
              <p class="jr-close__go"><a href="../../guides.html">${esc(w.guides)}</a>${w.sep}<a href="${esc(S.instagram.url)}" rel="noopener">${esc(w.insta)}</a></p>
            </div>
          </footer>
        </div>
      </div>`;
  }

  // the three totals settle as the planes land; the last one stops with the last plane
  function totals(n, p) {
    const others = S.countries.length - 1;
    $('#jr-countries').textContent = String(1 + Math.min(n, others));
    $('#jr-trips').textContent = String(Math.round(p * K.trips.length));
    $('#jr-photos').textContent = String(Math.round(p * totalPhotos));
  }

  // the year folio counts through every year between, so going back reads as going back
  function folio(y) {
    const yEl = $('#jr-year'), byEl = $('#jr-by');
    const fig = $('.jr-map');
    clearInterval(folioTimer);
    fig.classList.toggle('has-year', y !== null);
    if (y === null) { folioYear = null; return; }
    const show = (v) => { yEl.textContent = v; byEl.textContent = W().byThen(countriesBy(v)); };
    if (folioYear === null || K.reduced) { folioYear = y; show(y); return; }
    const dir = y < folioYear ? -1 : 1;
    folioTimer = setInterval(() => {
      if (folioYear === y) { clearInterval(folioTimer); return; }
      folioYear += dir;
      show(folioYear);
    }, 55);
  }

  // how far the map has glided aside, 0 (the whole screen) to 1 (beside the years); published as
  // a number for the stylesheet, as the engine publishes --sc-p
  // scroll-craft round (2026-10-29), <body data-craft>: the fold is the page's one peak. After the
  // arrival the map holds the whole screen and closes into the globe there, with the most scroll of
  // any part of the page; only then does the globe glide aside and the trips arrive.
  function dockCraft(frame, hold) {
    const H = innerHeight, y = scrollY;
    const arr = clamp(y / (H * 0.45), 0, 1);
    const fold = clamp((y - H * 0.15) / (H * 0.85), 0, 1);
    const d = clamp((y - H * 1.12) / (H * 0.5), 0, 1);
    frame.style.setProperty('--arr', arr.toFixed(4));
    frame.style.setProperty('--dock', d3.easeCubicInOut(d).toFixed(4));
    map.setFold(d3.easeCubicInOut(fold));
  }
  function dock() {
    const frame = $('.jr');
    const hold = CRAFT && $('.jr-hold');
    if (hold && hold.offsetHeight) return dockCraft(frame, hold);
    const hero = $('.jr-hero');
    const d = clamp((scrollY - hero.offsetHeight * 0.15) / (hero.offsetHeight * 0.7), 0, 1);
    frame.style.setProperty('--dock', d3.easeCubicInOut(d).toFixed(4));
    // the map starts gliding aside first, then folds round into the globe as it settles
    map.setFold(d3.easeCubicInOut(clamp((d - 0.15) / 0.85, 0, 1)));
  }

  // the trip at the reading line: the globe turns to it and the print beside the map shows it
  function reading(line) {
    let cur = null;
    for (const el of main.querySelectorAll('.jr-trip')) if (el.getBoundingClientRect().top < line + 40) cur = el;
    return cur && K.byId(cur.dataset.trip);
  }

  // the print under the map: the trip at the reading line is the one whose photograph shows
  let shown = null, turn = 0;
  function beside(t) {
    if (!matchMedia('(min-width: 64rem)').matches) return;
    const photo = t && (t.lead || t.photos[0]);
    if (photo === shown) return;
    shown = photo;
    const box = $('.jr-beside');
    box.classList.toggle('has-print', !!photo);
    if (!photo) return;
    const s = S.slides[photo];
    const imgs = box.querySelectorAll('.jr-beside__img');
    turn ^= 1;
    const im = imgs[turn], old = imgs[turn ^ 1];
    im.srcset = `${K.src(s.file, 640)} 640w, ${K.src(s.file, 1280)} 1280w, ${K.src(s.file)} 2400w`;
    im.sizes = '48vw';
    im.src = K.src(s.file, 1280);
    const show = () => { im.classList.add('is-on'); old.classList.remove('is-on'); };
    if (im.complete) show(); else im.onload = show;
    $('.jr-beside__name', box).textContent = s.place[K.lang];
    $('.jr-beside__where', box).textContent = s.where[K.lang];
  }

  function follow() {
    dock();
    // on a phone the map is pinned across the top: read from its lower edge
    const m = $('.jr-map').getBoundingClientRect();
    const edge = m.top <= 1 && m.width >= innerWidth - 2 ? m.bottom : 0;
    const line = edge + (innerHeight - edge) * 0.35;
    const t = reading(line);
    beside(t);
    map.trip(t);
    // the trip the globe is showing is marked in the list as well
    for (const el of main.querySelectorAll('.jr-trip')) el.classList.toggle('is-reading', !!t && el.dataset.trip === t.id);
    let next = 'now';
    // the return plays when the closing words reach the reading line, not when the close's
    // empty top does: the first trip keeps its near-empty map for a whole screen before it
    if ($('.jr-close__words').getBoundingClientRect().top < edge + (innerHeight - edge) * 0.6) next = 'forward';
    else {
      for (const sec of main.querySelectorAll('.jr-year')) if (sec.getBoundingClientRect().top < line) next = +sec.dataset.year;
    }
    if (next === state) return;
    const was = state;
    state = next;
    if (next === 'now') { map.at(Infinity, null); folio(null); return; }
    if (next === 'forward') { folio(null); if (was !== 'now') map.forward(); return; }
    // inside a year: the map as it stood at the end of that year, that year's routes in hand
    map.at(next, next);
    folio(next);
  }

  // back from a trip (#t=<id>): no replay; the map whole, the totals settled, the entry in view
  function returnTo() {
    const id = (location.hash.match(/^#t=(.+)$/) || [])[1];
    const el = id && document.getElementById(`t-${decodeURIComponent(id)}`);
    if (!el) return false;
    history.replaceState(null, '', location.pathname + location.search);
    const html = document.documentElement;
    html.style.scrollBehavior = 'auto';
    const edge = innerWidth < 1024 ? $('.jr-map').offsetHeight : 0;
    scrollTo(0, el.getBoundingClientRect().top + scrollY - edge - innerHeight * 0.2);
    requestAnimationFrame(() => { html.style.scrollBehavior = ''; });
    return true;
  }

  let onScroll = null;
  async function mount() {
    if (engine && engine.destroy) engine.destroy();
    render();
    engine = window.ScrollCraft.mount(document.body);
    // a page may bring its own map (the 3D globe trial, globe3d.js) that answers the same six words
    map = await (window.JourneyMap || makeMap)($('#jr-svg'));
    state = null; folioYear = null; shown = null;
    if (returnTo()) map.settled(totals); else map.flyOut(totals);
    let raf = 0;
    if (onScroll) removeEventListener('scroll', onScroll);
    onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(follow); };
    addEventListener('scroll', onScroll, { passive: true });
    follow();
  }

  K.onLang(mount);
  mount();
})();
