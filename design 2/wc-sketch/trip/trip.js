/* A trip, told along its route (trial 2026-10-13; on the Journey page since 2026-10-15).

   One journey from data/site.json (through design 2's data.js), told stop by stop on the left
   while the Journey page's own painted map follows it on the right. Scrolling draws each leg
   in pen with a vermilion wash under it, flies the map along the leg, then settles on the
   place and rings it. The photograph being read throws a pale wash across to where it was
   made. A stop with no photograph yet shows a hatched frame where one will go.

   The painting itself is design 2's (WC.paint in wc-sketch/paint.js), laid in a few textures:
   the whole trip, then finer ones close to the stops. Coasts, borders, lakes, the route and
   the lettering are drawn live over them every frame. */
(() => {
  'use strict';

  const S = window.SITE;
  const WC = window.WC;
  const ask = new URLSearchParams(location.search);
  const J = S.journeys.find((j) => j.id === ask.get('trip')) || S.journeys.find((j) => j.id === '2026-01') || S.journeys[0];
  // a photograph that belongs to a stop other than the nearest one
  const BELONGS = { aoraki: 'Twizel (Mt Cook)' };

  const SY = 1.25;
  const $ = (s, el = document) => el.querySelector(s);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ss = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const narrow = matchMedia('(max-width: 47.99rem)');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const INK = (a) => WC.ink(a);
  const PAPER = `rgb(${WC.PAPER.join(',')})`;
  const WARM = '#d4523c';                         // vermilion-head
  const WASH = (a) => `rgba(226, 122, 98, ${a})`; // route-wash
  const LETTER = '#686058';                       // country-lettering

  /* ------------------------------------------------------------ words */

  const WORDS = {
    en: {
      blank: 'No photograph yet',
      home: 'Home',
      and: ' and ', list: ', ',
      mode: { flight: 'by air', car: 'by car', train: 'by train', bus: 'by bus' },
      leg: (m, f) => `${m} from ${f}`,
      then: ', then ',
      tally: (p, n) => `${p} places, ${n} photographs`,
      back: 'Back to Flights',
      log: 'All trips',
    },
    zh: {
      blank: '還沒有照片',
      home: '回家',
      and: '與', list: '、',
      mode: { flight: '搭飛機', car: '開車', train: '搭火車', bus: '搭巴士' },
      leg: (m, f) => `從${f}${m}`,
      then: '，再',
      tally: (p, n) => `${p} 個地方，${n} 張照片`,
      back: '回到飛過的航線',
      log: '所有旅程',
    },
  };
  // the language is the Journey page's own choice, remembered on the browser
  let lang = 'en';
  try { lang = localStorage.getItem('tlap-lang') === 'zh' ? 'zh' : 'en'; } catch (e) { /* storage blocked */ }
  if (ask.get('lang')) lang = ask.get('lang') === 'zh' ? 'zh' : 'en';
  const W_ = () => WORDS[lang];
  const nameOf = (p) => (lang === 'zh' ? p.zh || p.city : p.city);

  /* ------------------------------------------------------------ the trip, from the facts */

  const countries = J.countries.map((id) => S.countries.find((c) => c.id === id));

  // one point per town: where a town is both an airport and a town, the town
  const places = new Map();
  for (const leg of J.legs) {
    for (const end of [leg.from, leg.to]) {
      const had = places.get(end.city);
      if (!had || (had.code && !end.code)) places.set(end.city, { city: end.city, zh: end.zh, ll: [end.lat, end.lng], code: end.code });
    }
  }
  const legs = J.legs.map((l) => ({ mode: l.mode, from: places.get(l.from.city), to: places.get(l.to.city) }));
  const home = legs[0].from;

  // a chapter for each place reached; a town only passed back through joins the next one
  const chapters = [];
  {
    const seen = new Set([home.city]);
    let pending = [];
    legs.forEach((leg, i) => {
      pending.push(leg);
      const next = legs[i + 1];
      if (seen.has(leg.to.city) && next && next.from === leg.to) return;
      // the last stop is home when the trip ends where it began, or back in Taipei (his home)
      const athome = leg.to === home || (S.flightsFrom && Math.hypot(leg.to.ll[0] - S.flightsFrom[0], leg.to.ll[1] - S.flightsFrom[1]) < 0.6);
      chapters.push({ legs: pending, at: leg.to, home: !next && athome, photos: [] });
      seen.add(leg.to.city);
      pending = [];
    });
  }
  const stops = chapters.filter((c) => !c.home);
  const countryOf = (ll) => {
    let best = null, bd = Infinity;
    for (const c of countries) { const d = Math.hypot(c.ll[0] - ll[0], c.ll[1] - ll[1]); if (d < bd) { bd = d; best = c; } }
    return best;
  };

  // the trip's own photographs: its countries', taken while it lasted (the months of its legs,
  // and the one after, for a trip that ran on past its last dated leg). A photograph whose file
  // carries no date belongs here only if no other journey went to its country.
  const months = J.legs.map((l) => l.month).filter(Boolean).sort();
  const nextMonth = (m) => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; };
  const from = months[0], till = months.length ? nextMonth(months[months.length - 1]) : null;
  const ours = (id) => {
    const s = S.slides[id];
    if (!s) return false;
    if (s.taken) return from ? (s.taken.slice(0, 7) >= from && s.taken.slice(0, 7) <= till) : s.taken.slice(0, 4) === J.id.slice(0, 4); // no months: its year
    return S.journeys.filter((j) => (j.countries || []).includes(s.country)).length === 1;
  };
  // each goes to the stop it was made nearest to
  const photoIds = countries.flatMap((c) => c.photos).filter(ours);
  for (const id of photoIds) {
    const s = S.slides[id];
    if (!s || !s.ll) continue;
    let ch = BELONGS[id] && stops.find((c) => c.at.city === BELONGS[id]);
    if (!ch) {
      let bd = Infinity;
      for (const c of stops) { const d = Math.hypot(c.at.ll[0] - s.ll[0], (c.at.ll[1] - s.ll[1]) * Math.cos((s.ll[0] * Math.PI) / 180)); if (d < bd) { bd = d; ch = c; } }
    }
    if (ch) ch.photos.push(id);
  }

  /* ------------------------------------------------------------ the story */

  const story = $('#story');
  const legLine = (c) => c.legs.map((l, i) => {
    const w = W_();
    const s = w.leg(w.mode[l.mode] || l.mode, nameOf(l.from));
    return i === 0 ? s : w.then + s;
  }).join('');
  const src = (f, n) => `../../images/web/${n ? n + '/' : ''}${f}`;

  function renderStory() {
    const w = W_();
    const zh = lang === 'zh';
    document.documentElement.lang = zh ? 'zh-Hant' : 'en';
    const names = countries.map((c) => c.name[lang]);
    const title = names.length > 2 ? names.slice(0, -1).join(w.list) + w.and + names[names.length - 1] : names.join(w.and);
    document.title = `${title} · tuan photography 陳亮元`;
    // opened from the Journey page (design 2/new), it leads back there
    const from = /^[a-z][a-z-]*$/.test(ask.get('from') || '') ? ask.get('from') : null;
    if (from) $('#back').href = `../../new/${from}.html#t=${encodeURIComponent(J.id)}`;   // back to the entry it was opened from
    $('#back').textContent = from ? w.log : w.back;
    let html = `<section class="intro" data-i="-1">
      <p class="intro__when caps">${esc((J.date || J.label)[lang])}</p>
      <h1 class="intro__title">${esc(title)}</h1>
      <p class="intro__route">${stops.map((c) => `<span>${esc(nameOf(c.at))}</span>`).join(esc(w.list))}</p>
    </section>`;
    chapters.forEach((c, i) => {
      if (c.home) {
        html += `<section class="coda" data-i="${i}">
          <p class="stop__how caps">${esc(legLine(c))}</p>
          <h2 class="stop__name">${esc(w.home)}, ${esc(nameOf(c.at))}</h2>
          <p class="coda__tally">${esc(w.tally(stops.length, stops.reduce((n, s) => n + s.photos.length, 0)))}</p>
        </section>`;
        return;
      }
      const country = countryOf(c.at.ll);
      const shots = c.photos.length
        ? c.photos.map((id) => {
          const s = S.slides[id];
          return `<figure class="shot" data-ll="${s.ll.join(',')}">
            <img style="--ar: ${(s.w / s.h).toFixed(4)}" src="${src(s.file, 1280)}" srcset="${src(s.file, 640)} 640w, ${src(s.file, 1280)} 1280w, ${src(s.file)} 2400w" sizes="(max-width: 47.99rem) 92vw, 40vw" width="${s.w}" height="${s.h}" alt="${esc(s.alt[lang])}" loading="lazy" decoding="async">
            <figcaption><span class="shot__name">${esc(s.place[lang])}</span><span class="shot__where">${esc(s.where[lang])}</span></figcaption>
          </figure>`;
        }).join('')
        : `<figure class="shot" data-ll="${c.at.ll.join(',')}"><div class="blank"><span class="caps">${esc(w.blank)}</span></div></figure>`;
      html += `<section class="stop" data-i="${i}">
        <p class="stop__how caps">${esc(legLine(c))}</p>
        <h2 class="stop__name">${esc(nameOf(c.at))}</h2>
        <p class="stop__where">${esc(country ? country.name[lang] : '')}</p>
        <div class="stop__photos">${shots}</div>
      </section>`;
    });
    story.innerHTML = html;
    sections = [...story.querySelectorAll('[data-i]')];
    story.querySelectorAll('img').forEach((im) => im.addEventListener('load', queue));
    labels.clear();
    queue();
  }
  let sections = [];

  document.querySelectorAll('.lang__btn').forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try { localStorage.setItem('tlap-lang', lang); } catch (e) { /* storage blocked */ }
    document.querySelectorAll('.lang__btn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderStory();
  }));

  /* ------------------------------------------------------------ the map's frame */

  const mapEl = $('#map');
  const nowEl = $('#now');
  const canvas = $('#paint');
  const ctx = canvas.getContext('2d');
  const view = { W: 1, H: 1, dpr: 1 };
  // world units are stretched degrees east of LON0 (u) and south (v = -lat * SY); LON0 is the
  // middle of the trip, so a journey across the Pacific is never cut in two
  const LON0 = (() => {
    let x = 0, y = 0;
    for (const p of places.values()) { const a = (p.ll[1] * Math.PI) / 180; x += Math.cos(a); y += Math.sin(a); }
    return Math.round((Math.atan2(y, x) * 180) / Math.PI);
  })();
  const U = (ll) => { const u = ((((ll[1] - LON0) % 360) + 540) % 360) - 180; return [u, -ll[0] * SY]; };
  const projDeg = WC.plate(SY).rotate([-LON0, 0]).scale(180 / Math.PI).translate([0, 0]).precision(0);
  const pathDeg = (geo) => { const p = new Path2D(); d3.geoPath(projDeg, p)(geo); return p; };

  function size() {
    view.W = Math.max(1, mapEl.clientWidth);
    view.H = Math.max(1, mapEl.clientHeight);
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(view.W * view.dpr);
    canvas.height = Math.round(view.H * view.dpr);
    $('#beam').setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    queue();
  }

  /* ------------------------------------------------------------ the route, as lines in world units */

  for (const leg of legs) {
    const a = U(leg.from.ll), b = U(leg.to.ll);
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const pts = [];
    if (leg.mode === 'flight') {
      // a flight bows away from the straight line, always toward the north
      let nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
      if (ny > 0) { nx = -nx; ny = -ny; }
      const bow = Math.min(d * 0.12, 5);
      const c = [(a[0] + b[0]) / 2 + nx * bow, (a[1] + b[1]) / 2 + ny * bow];
      for (let i = 0; i <= 64; i++) {
        const t = i / 64, m = 1 - t;
        pts.push([m * m * a[0] + 2 * m * t * c[0] + t * t * b[0], m * m * a[1] + 2 * m * t * c[1] + t * t * b[1]]);
      }
    } else {
      // a road: the straight way, with a hand's small wander in it
      const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
      for (let i = 0; i <= 28; i++) {
        const t = i / 28, wob = Math.sin(t * Math.PI) * Math.sin(t * 9.4 + d) * d * 0.035;
        pts.push([lerp(a[0], b[0], t) + nx * wob, lerp(a[1], b[1], t) + ny * wob]);
      }
    }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    leg.pts = pts; leg.cum = cum; leg.len = cum[cum.length - 1];
  }

  /* ------------------------------------------------------------ the camera's stations */

  const box = (pts, min = 0) => {
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    for (const [u, v] of pts) { u0 = Math.min(u0, u); v0 = Math.min(v0, v); u1 = Math.max(u1, u); v1 = Math.max(v1, v); }
    return { u0, v0, u1, v1, min };
  };
  // a box as [centre u, centre v, width in world units] fitted to the map's frame
  const fit = (b, pad = b.pad == null ? 0.16 : b.pad) => {
    const bw = Math.max(b.u1 - b.u0, b.min), bh = Math.max(b.v1 - b.v0, b.min * 0.8);
    const w = Math.max(bw * (1 + pad * 2), (bh * (1 + pad * 2) * view.W) / view.H);
    return [(b.u0 + b.u1) / 2, (b.v0 + b.v1) / 2, w];
  };
  const allPts = legs.flatMap((l) => l.pts);
  const whole = box(allPts);
  chapters.forEach((c) => {
    c.travel = box([...c.legs.flatMap((l) => l.pts), U(c.at.ll)], 2.5);
    const spots = c.photos.map((id) => U(S.slides[id].ll));
    // close enough to see the place, far enough to see where it lies
    c.arrive = c.home ? { ...whole } : box([U(c.at.ll), ...spots], spots.length ? 4 : 6);
    c.arrive.pad = 0.08;
  });

  /* ------------------------------------------------------------ the painting */

  const state = {
    land50: null, travel: [], coast: null, borders: null, lakes: null, lakesAll: null, lakesPath: null, lakesXPath: null,
    relief: null, reliefFine: null, bands: [], names: [],
  };
  // the textures, in world units: the whole trip, then for each stop the leg that reaches it and
  // the place itself, each fine enough for the view that shows it. Painted in the order the reader
  // will need them (see paintBands)
  const PX = 1700;   // about how many pixels across the map is, at its finest (desktop, Retina)
  const MAXPX = 4.2e6;
  const specs = [];
  // (a painting already made that holds most of this one, fine enough, will do)
  const covered = (sp) => {
    const mu = (sp.u1 - sp.u0) * 0.18, mv = (sp.v1 - sp.v0) * 0.18;
    return specs.some((o) => o.r >= sp.r * 0.7 && o.u0 <= sp.u0 + mu && o.v0 <= sp.v0 + mv && o.u1 >= sp.u1 - mu && o.v1 >= sp.v1 - mv);
  };
  const addSpec = (cu, cv, w, h, rNeed, ch, base) => {
    let r = Math.max(6, Math.min(rNeed, 300));
    while (w * r * h * r > MAXPX && r > 6) r *= 0.9;
    const sp = { u0: cu - w / 2, v0: cv - h / 2, u1: cu + w / 2, v1: cv + h / 2, r, ch, base: !!base };
    if (!base && covered(sp)) return;
    specs.push(sp);
  };
  const env = {
    LON0, LAT_N: 90, LAT_S: -90, SY,
    land: () => state.land50,
    // the route alone carries the vermilion, at every distance: the countries keep their own
    // washes. (A rose wash on the far paintings only showed as a hard-edged block wherever a
    // closer painting, without it, lay over part of a country.)
    travel: () => [],
    lakes: (r) => (r >= 45 && state.lakesAll ? state.lakesAll : state.lakes),
    relief: (r) => (r >= 22 && state.reliefFine ? state.reliefFine : state.relief),
  };
  const feather = (c, f) => {
    const m = document.createElement('canvas');
    m.width = c.width; m.height = c.height;
    const g = m.getContext('2d');
    g.filter = `blur(${f / 2.5}px)`;
    g.fillStyle = '#fff';
    g.fillRect(f, f, c.width - f * 2, c.height - f * 2);
    const cg = c.getContext('2d');
    cg.globalCompositeOperation = 'destination-in';
    cg.drawImage(m, 0, 0);
    cg.globalCompositeOperation = 'source-over';
    return c;
  };
  function planBands() {
    // the whole trip, wide enough for the opening view whatever the window's shape
    const [cu, cv, cw] = fit(whole);
    const bw = cw * 1.6;
    const bh = Math.max(cw * 1.4, (whole.v1 - whole.v0) * 1.6);
    addSpec(cu, cv, bw, bh, Math.min(12, 2400 / bw), -1, true);
    chapters.forEach((c, i) => {
      // the leg: its view, half as much again around it
      const [tu, tv, tw] = fit(c.travel);
      addSpec(tu, tv, tw * 1.5, tw * 1.5, (PX / tw) * 0.8, i);
      // the place: its arrival view, with room around it
      if (!c.home) {
        const [au, av, aw] = fit(c.arrive);
        addSpec(au, av, Math.max(aw * 1.45, 8), Math.max(aw * 1.45, 8), (PX / aw) * 0.75, i);
      }
    });
  }
  async function paintBands() {
    planBands();
    const todo = [...specs];
    while (todo.length) {
      // the next is the one the reader needs soonest: the base first, then the chapter being read
      // and those just ahead of it
      const here = Math.max(0, reading().i);
      todo.sort((p, q) => (p.base ? -1 : q.base ? 1 : 0) || Math.abs(p.ch - here - 0.4) - Math.abs(q.ch - here - 0.4) || p.r - q.r);
      const b = todo.shift();
      if (b.r >= 22) await state.fineReady;
      const job = { r: b.r, u0: b.u0, v0: b.v0, w: Math.round((b.u1 - b.u0) * b.r), h: Math.round((b.v1 - b.v0) * b.r) };
      try {
        const c = await WC.paint(job, env);
        state.bands.push({ ...job, base: b.base, canvas: feather(c, b.base ? 90 : 56), born: performance.now() });
        state.bands.sort((p, q) => p.r - q.r);
        queue();
      } catch (e) { /* a band that fails leaves the coarser one showing */ }
    }
  }

  // the drawing kept to the trip's part of the world (with a wide margin), so each frame is quick
  const regionOf = (line) => line.some(([lon, lat]) => {
    const [u, v] = U([lat, lon]);
    return u > whole.u0 - 60 && u < whole.u1 + 60 && v > whole.v0 - 45 && v < whole.v1 + 45;
  });
  const keep = (mesh) => ({ type: 'MultiLineString', coordinates: mesh.coordinates.filter(regionOf) });

  async function load() {
    // (on the load event rather than decode(), which a hidden tab may put off indefinitely)
    const image = (url) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
    const reliefReady = image('../../vendor/relief/SR_50M-4096.jpg').then((im) => { state.relief = im; });
    state.fineReady = image('../../vendor/relief/SR_50M-10800.jpg').then((im) => { state.reliefFine = im; });

    const [w50, lk, lx] = await Promise.all([
      fetch('../../vendor/countries-50m.json').then((r) => r.json()),
      fetch('../map/lakes-50m.json').then((r) => r.json()).catch(() => null),
      fetch('../map/lakes-10m-extra.json').then((r) => r.json()).catch(() => null),
    ]);
    state.land50 = topojson.feature(w50, w50.objects.land);
    state.coast = WC.pressure(keep(topojson.mesh(w50, w50.objects.land))).map(pathDeg);
    state.borders = pathDeg(keep(topojson.mesh(w50, w50.objects.countries, (a, b) => a !== b)));
    // (the same numbers as the Journey page's map)
    const ISO = { spain: '724', uk: '826', france: '250', germany: '276', switzerland: '756', taiwan: '158', japan: '392', 'south-korea': '410', 'hong-kong': '344', china: '156', singapore: '702', vietnam: '704', dubai: '784', australia: '036', 'new-zealand': '554', usa: '840', thailand: '764', myanmar: '104', netherlands: '528', malaysia: '458', andorra: '020' };
    const want = new Set(J.countries.map((c) => ISO[c]).filter(Boolean));
    state.travel = w50.objects.countries.geometries.filter((g) => want.has(String(g.id).padStart(3, '0'))).map((g) => topojson.feature(w50, g));
    // the countries of the trip lettered on the land, where the land is widest
    state.names = J.countries.map((id) => {
      const f = state.travel.find((t) => String(t.id).padStart(3, '0') === ISO[id]);
      const c = S.countries.find((x) => x.id === id);
      if (!f || !c) return null;
      // the largest piece of the country carries its name
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      const big = polys.map((p) => ({ type: 'Polygon', coordinates: p })).sort((a, b) => d3.geoArea(b) - d3.geoArea(a))[0];
      const [lon, lat] = d3.geoCentroid(big);
      return { c, ll: [lat, lon] };
    }).filter(Boolean);
    if (lk) {
      state.lakes = { type: 'FeatureCollection', features: lk.features.filter((f) => regionOf(f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0])) };
      state.lakesPath = pathDeg(state.lakes);
    }
    if (lx) {
      const dec = (r) => {
        const o = [];
        let x = 0, y = 0;
        for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; o.push([x / 1000, y / 1000]); }
        o.push(o[0]);
        return o;
      };
      const fc = { type: 'FeatureCollection', features: lx.lakes.map(([name, polys]) => ({ type: 'Feature', properties: { name }, geometry: { type: 'MultiPolygon', coordinates: polys.map((p) => p.map(dec)) } })) };
      fc.features = fc.features.filter((f) => regionOf(f.geometry.coordinates[0][0]));
      state.lakesAll = { type: 'FeatureCollection', features: [...(state.lakes ? state.lakes.features : []), ...fc.features] };
      state.lakesXPath = pathDeg(fc);
    }
    queue();
    await reliefReady;
    paintBands();
  }

  /* ------------------------------------------------------------ where the reader is */

  // which section the reading line has reached, and how far through it
  function reading() {
    const H = innerHeight;
    const top = narrow.matches ? mapEl.getBoundingClientRect().bottom : 0;
    const line = top + (H - top) * (narrow.matches ? 0.4 : 0.6);
    let i = -1, t = 0;
    sections.forEach((s, n) => {
      const r = s.getBoundingClientRect();
      // the last can only rise until the page ends, so it is measured over what can be read
      const h = n === sections.length - 1 ? Math.max(1, r.height - (H - line)) : r.height;
      if (r.top <= line) { i = +s.dataset.i; t = clamp((line - r.top) / h, 0, 1); }
    });
    return { i, t };
  }

  const camOf = (b) => fit(b);
  function camera(i, t) {
    if (i < 0) return camOf(whole);
    const c = chapters[i];
    const prev = i === 0 ? camOf(whole) : camOf(chapters[i - 1].arrive);
    const travel = camOf(c.travel), arrive = camOf(c.arrive);
    if (t < 0.3) return d3.interpolateZoom(prev, travel)(ss(0, 0.3, t));
    if (t < 0.5) return travel;
    return d3.interpolateZoom(travel, arrive)(ss(0.5, 0.72, t));
  }

  /* ------------------------------------------------------------ drawing */

  const labels = new Map();
  const letter = (text, o) => {
    const key = `${text}|${o.size}|${o.colour}|${lang}`;
    let l = labels.get(key);
    if (!l) { l = WC.letter(text, { dpr: view.dpr, zh: lang === 'zh', halo: 3.2, weight: 500, seed: text.length * 7 + 3, ...o }); labels.set(key, l); }
    return l;
  };
  const strokeTo = (pts, upto) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    return upto;
  };
  // the part of a leg drawn so far, in screen points; and where its head is
  const partOf = (leg, f, S_) => {
    const want = leg.len * f;
    const out = [S_(leg.pts[0])];
    for (let i = 1; i < leg.pts.length; i++) {
      if (leg.cum[i] <= want) { out.push(S_(leg.pts[i])); continue; }
      const k = (want - leg.cum[i - 1]) / (leg.cum[i] - leg.cum[i - 1] || 1);
      out.push(S_([lerp(leg.pts[i - 1][0], leg.pts[i][0], k), lerp(leg.pts[i - 1][1], leg.pts[i][1], k)]));
      break;
    }
    return out;
  };
  const ring = (x, y, prog, r = 12) => {
    if (prog <= 0) return;
    ctx.beginPath();
    const turns = 1.1 * prog, n = Math.max(2, Math.round(60 * turns));
    for (let i = 0; i <= n; i++) {
      const a = -2.1 + (i / n) * turns * Math.PI * 2;
      const rr = r * (1 + 0.07 * Math.sin(a * 3 + 1.3)) + i * 0.012;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.92;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineWidth = 1.1; ctx.strokeStyle = INK(0.85); ctx.stroke();
  };
  const mark = (x, y) => {
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = PAPER; ctx.fill();
    ctx.lineWidth = 1.1; ctx.strokeStyle = INK(0.95); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = WARM; ctx.fill();
  };

  const nameRects = [];
  let queued = false;
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };

  function draw() {
    queued = false;
    const { W, H, dpr } = view;
    const { i: ci, t } = reading();
    const [cu, cv, cw] = camera(ci, t);
    const k = W / cw;
    const X0 = W / 2 - cu * k, Y0 = H / 2 - cv * k;
    const S_ = ([u, v]) => [X0 + u * k, Y0 + v * k];
    const now = performance.now();
    let again = false;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    // the paintings: the whole trip beneath, the closer ones over it once the map is near enough
    ctx.imageSmoothingQuality = 'high';
    for (const b of state.bands) {
      const x = X0 + b.u0 * k, y = Y0 + b.v0 * k, w = (b.w / b.r) * k, h = (b.h / b.r) * k;
      if (x > W || y > H || x + w < 0 || y + h < 0) continue;
      const fade = clamp((now - b.born) / 700, 0, 1);
      if (fade < 1) again = true;
      const a = (b.base ? 1 : ss(b.r * 0.22, b.r * 0.45, k * dpr)) * fade;
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(b.canvas, x, y, w, h);
    }
    ctx.globalAlpha = 1;

    // the pen: borders broken and light, coasts swelling and thinning, lake shores a little lighter
    if (state.coast) {
      ctx.save();
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * X0, dpr * Y0);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.setLineDash([2.2 / k, 2.8 / k]);
      ctx.strokeStyle = INK(k > 14 ? 0.46 : 0.38); ctx.lineWidth = (k > 14 ? 0.7 : 0.6) / k;
      ctx.stroke(state.borders);
      ctx.setLineDash([]);
      const w = Math.min(1.35, 0.78 + k * 0.005);
      ctx.strokeStyle = INK(0.9);
      state.coast.forEach((p, n) => { ctx.lineWidth = (w * [0.55, 0.78, 1, 1.26, 1.6][n]) / k; ctx.stroke(p); });
      if (state.lakesPath) {
        ctx.strokeStyle = INK(0.82); ctx.lineWidth = (w * 0.82) / k; ctx.stroke(state.lakesPath);
        if (state.lakesXPath && k > 40) ctx.stroke(state.lakesXPath);
      }
      ctx.restore();
    }

    // the countries of the trip, lettered quietly, while the map is far enough out to need them
    const nameA = 1 - ss(30, 60, k);
    if (nameA > 0) {
      ctx.globalAlpha = nameA;
      // kept off the route (all of it, drawn or not, so a name never jumps as the line arrives)
      // and off the places: the first spot near the middle of the land that is clear
      nameRects.length = 0;
      const keepOff = [...legs.flatMap((l) => l.pts.map(S_)), ...stops.map((c) => S_(U(c.at.ll)))];
      // and off where the places' own names will stand (to the right of each mark)
      const placeBoxes = [home, ...stops.map((c) => c.at)].map((p) => {
        const pl = letter(nameOf(p), { size: lang === 'zh' ? 12 : 12.5, colour: 'rgba(38, 34, 33, 0.92)', track: 0.08 });
        const [x, y] = S_(U(p.ll));
        return { x: x + 3, y: y - pl.h / 2 - 2, w: pl.w + 6, h: pl.h + 4 };
      });
      for (const n of state.names) {
        const l = letter(n.c.name[lang], { size: 13, colour: LETTER, track: 0.24 });
        const [x0, y0] = S_(U(n.ll));
        const hits = (x, y, r) => r.x < x + l.w / 2 && r.x + r.w > x - l.w / 2 && r.y < y + l.h / 2 && r.y + r.h > y - l.h / 2;
        const clear = (x, y) => !keepOff.some(([px, py]) => px > x - l.w / 2 - 6 && px < x + l.w / 2 + 6 && py > y - l.h / 2 - 4 && py < y + l.h / 2 + 4)
          && !placeBoxes.some((r) => hits(x, y, r));
        let at = [x0, y0];
        for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [-0.6, 0], [0.6, 0], [0, -2], [0, 2], [-0.6, -1], [0.6, 1], [-0.6, 1], [0.6, -1]]) {
          const x = x0 + dx * l.w, y = y0 + dy * l.h * 1.1;
          if (clear(x, y)) { at = [x, y]; break; }
        }
        ctx.drawImage(l.c, at[0] - l.w / 2, at[1] - l.h / 2, l.w, l.h);
        nameRects.push({ x: at[0] - l.w / 2 + 4, y: at[1] - l.h / 2 + 3, w: l.w - 8, h: l.h - 6 });
      }
      ctx.globalAlpha = 1;
    }

    // the route so far: each leg in turn, a vermilion wash under a fine ink line
    const done = (j) => (ci < 0 ? 0 : j < ci ? 1 : j > ci ? 0 : ss(0.04, 0.5, t));
    const finale = ci === chapters.length - 1 && chapters[ci].home ? ss(0.62, 0.95, t) : 0;
    chapters.forEach((c, j) => {
      const f = done(j);
      if (f <= 0) return;
      const total = c.legs.reduce((s, l) => s + l.len, 0);
      let left = f * total;
      for (const leg of c.legs) {
        if (left <= 0) break;
        const lf = clamp(left / leg.len, 0, 1);
        left -= leg.len;
        const pts = partOf(leg, lf, S_);
        ctx.save();
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.translate(1.2, 1.6);
        strokeTo(pts);
        ctx.strokeStyle = WASH(0.34 + finale * 0.2); ctx.lineWidth = 4.6 + finale * 2.4; ctx.stroke();
        ctx.translate(-1.2, -1.6);
        strokeTo(pts);
        if (leg.mode !== 'flight') ctx.setLineDash(leg.mode === 'car' ? [2.6, 2.2] : [4.4, 3.4]);
        ctx.strokeStyle = INK(0.9); ctx.lineWidth = 1.05 + finale * 0.35; ctx.stroke();
        ctx.restore();
        if (lf < 1) {
          const [hx, hy] = pts[pts.length - 1];
          ctx.beginPath(); ctx.arc(hx, hy, 4.4, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill();
          ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI * 2); ctx.fillStyle = WARM; ctx.fill();
          ctx.lineWidth = 0.9; ctx.strokeStyle = INK(0.9); ctx.stroke();
        }
      }
    });

    // where each photograph of the stops reached was made
    chapters.forEach((c, j) => {
      const a = ci < 0 ? 0 : j < ci ? 0.75 : j === ci ? ss(0.5, 0.7, t) : 0;
      if (a <= 0) return;
      ctx.globalAlpha = a;
      for (const id of c.photos) {
        const [x, y] = S_(U(S.slides[id].ll));
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 250, 245, 0.92)'; ctx.fill();
        ctx.lineWidth = 0.9; ctx.strokeStyle = INK(0.8); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = WARM; ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    // the places: home a small ink dot; the rest marked once reached, pencilled until then
    // the places' names keep clear of the countries' names
    const taken = nameA > 0 ? [...nameRects] : [];
    const free = (r) => !taken.some((q) => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y);
    const order = stops.map((c) => chapters.indexOf(c))
      .sort((a, b) => (a === ci ? -1 : b === ci ? 1 : (a <= ci ? 0 : 1) - (b <= ci ? 0 : 1) || a - b));
    const placeLabel = (p, x, y, strong) => {
      const l = letter(nameOf(p), { size: lang === 'zh' ? 12 : 12.5, colour: strong ? 'rgba(38, 34, 33, 0.92)' : 'rgba(38, 34, 33, 0.5)', track: 0.08 });
      for (const [dx, dy] of [[7, -l.by + 4.5], [-7 - l.w + l.bx * 2, -l.by + 4.5], [-l.w / 2 + l.bx, -l.by - 6], [-l.w / 2 + l.bx, 12 - l.by + l.size]]) {
        const r = { x: x + dx - l.bx, y: y + dy, w: l.w, h: l.h };
        if (free(r)) { taken.push(r); ctx.drawImage(l.c, r.x, r.y, l.w, l.h); return; }
      }
    };
    {
      const [x, y] = S_(U(home.ll));
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fillStyle = INK(0.9); ctx.fill();
      taken.push({ x: x - 5, y: y - 5, w: 10, h: 10 });
    }
    for (const j of order) {
      const c = chapters[j];
      const [x, y] = S_(U(c.at.ll));
      const reached = j < ci || (j === ci && t >= 0.45);
      if (reached) mark(x, y);
      else { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fillStyle = INK(0.35); ctx.fill(); }
      taken.push({ x: x - 5, y: y - 5, w: 10, h: 10 });
    }
    {
      const [x, y] = S_(U(home.ll));
      placeLabel(home, x, y, true);
    }
    for (const j of order) {
      const c = chapters[j];
      const [x, y] = S_(U(c.at.ll));
      placeLabel(c.at, x, y, j < ci || (j === ci && t >= 0.45));
    }
    // the stop being read, ringed by the pen as the route reaches it
    if (ci >= 0 && !chapters[ci].home) {
      const [x, y] = S_(U(chapters[ci].at.ll));
      ring(x, y, ss(0.5, 0.74, t));
    }

    // (phones) the place being read, under the map
    const nowText = ci < 0 ? '' : chapters[ci].home ? nameOf(home) : nameOf(chapters[ci].at);
    if (nowEl.textContent !== nowText) nowEl.textContent = nowText;

    beam(ci, t, X0, Y0, k);
    if (again) queue();
  }

  /* ------------------------------------------------------------ the beam */

  const beamShape = $('#beam-shape');
  function beam(ci, t, X0, Y0, k) {
    let best = null, bd = Infinity;
    const H = innerHeight;
    if (!narrow.matches && ci >= 0 && t > 0.5) {
      const sec = sections.find((s) => +s.dataset.i === ci);
      for (const f of sec ? sec.querySelectorAll('.shot') : []) {
        const el = f.querySelector('img, .blank');
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > H) continue;
        const d = Math.abs((r.top + r.bottom) / 2 - H * 0.5);
        if (d < bd) { bd = d; best = { r, f, blank: !f.querySelector('img') }; }
      }
    }
    let a = 0;
    if (best) {
      const ll = best.f.dataset.ll.split(',').map(Number);
      const m = mapEl.getBoundingClientRect();
      const [u, v] = U(ll);
      const x = m.left + X0 + u * k, y = m.top + Y0 + v * k;
      if (x > m.left && x < m.right && y > m.top && y < m.bottom) {
        const r = best.r;
        beamShape.setAttribute('points', `${r.right},${r.top} ${r.right},${r.bottom} ${x},${y}`);
        a = (1 - clamp(bd / (H * 0.6), 0, 1)) * ss(0.55, 0.75, t) * (best.blank ? 0.55 : 1);
      }
    }
    beamShape.style.setProperty('--a', a.toFixed(3));
  }

  /* ------------------------------------------------------------ start */

  window.__trip = state;
  const tooth = WC.toothTile(384);
  tooth.toBlob((b) => { if (b) document.documentElement.style.setProperty('--tooth', `url(${URL.createObjectURL(b)})`); });
  if (lang === 'zh') document.querySelectorAll('.lang__btn').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.lang === 'zh')));
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', size);
  narrow.addEventListener('change', size);
  renderStory();
  size();
  load();
})();
