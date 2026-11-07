/* Wall map, the places 走過的地方 (footprint, round six, 2026-11-07).
   Built on the wall map he liked in round five (ramp-band): the map is the window, edge to edge,
   centred on the Pacific with Taiwan near the middle; the three numbers (countries, flights,
   photographs) stand in the map's own southern ocean along the foot; bolder's earth washes, typeset's
   lettering. The ramp is band's: on landing his countries are as plain as every other and the numbers
   stand at nought; then trip by trip, oldest first, the numbers count up, each country takes its wash
   as the count reaches it, the flights are drawn as faint pen hairlines, and a quiet line names the
   trip being counted. About eight seconds, then everything rests. Taiwan, home, is in clay from the start.
   What this version adds is one more layer of truth: the places he actually stood. Each of the 62
   towns and cities of his trips (FP.places) is a tiny open ink circle, laid where it is, appearing
   quietly as the ramp reaches the trip that first took him there: the moment the pen lands for a
   place reached by air, one after another along the road for the places reached on the ground. So at
   rest the coloured countries carry the points of where in them he went. The flights now run from point
   to point (home is a point too, Taipei, there from the start). Pointing at a point names the place and
   the trips that took him there; pointing at a country still shows its note. On a large map a few big
   cities keep a small name, only where it crowds nothing. The whole United States is coloured, Alaska
   and Hawaii with the rest.
   On a phone the map no longer sits small in a field of paper: the wall map is cut in two in the open
   sea between Australia and New Zealand and the halves are hung one above the other (Europe, Africa,
   Asia and Australia; then New Zealand, the Pacific and America), each cropped to the latitudes he has
   been to, so the map is drawn about twice as large; the flights to New Zealand and America run off the
   first and on into the second. The numbers stand in a row under it.
   ?still and reduced motion show the end at once; ?at=<ms> holds one frame of the ramp. Plain
   JavaScript, d3 for the shapes. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  const query = new URLSearchParams(location.search);
  if (query.get('lang') === 'zh' || query.get('lang') === 'en') FP.setLang(query.get('lang'));

  const stage = document.getElementById('stage');
  const body = document.body;
  const NS = 'http://www.w3.org/2000/svg';
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const STILL = FP.still || FP.reduced;
  const SEEK = !STILL && query.has('at') ? Math.max(0, +query.get('at') || 0) : null;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const MASK = '#000'; // the stencil for shapes worked on off screen; never seen
  const RAD = Math.PI / 180;

  /* ------------------------------------------------------------ words */

  const T = {
    en: {
      label: {
        countries: (n) => (n === 1 ? 'Country' : 'Countries'),
        flights: (n) => (n === 1 ? 'Flight' : 'Flights'),
        photos: (n) => (n === 1 ? 'Photograph' : 'Photographs'),
      },
      sr: (c, share, f, p) => `${FP.w.where}: ${c} countries, ${share}; ${f} flights; ${p} photographs`,
      map: 'The countries he has been to',
      pts: 'The places he went',
      and: ', ',
    },
    zh: {
      label: { countries: () => '國家', flights: () => '航程', photos: () => '張照片' },
      sr: (c, share, f, p) => `${FP.w.where}：${c} 個國家，${share}；${f} 段航程；${p} 張照片`,
      map: '他去過的國家',
      pts: '他去過的地方',
      and: '、',
    },
  };
  const t = () => T[FP.lang];
  const caps = (s) => (FP.lang === 'zh' ? s : s.toUpperCase());
  // "10.3% of the world's 195 countries"; in 中文 the words come first: 「全世界 195 個國家的 10.3%」
  const shareOf = (n) => FP.w.pct((Math.round((n / FP.counts.world) * 1000) / 10).toFixed(1));
  const shareLine = (n) => (FP.lang === 'zh' ? `${FP.w.ofWorld(FP.counts.world)} ${shareOf(n)}` : `${shareOf(n)} ${FP.w.ofWorld(FP.counts.world)}`);

  /* ------------------------------------------------------------ the colourist's box (bolder's) */

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
  const OKLCH = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/;
  // each country turns its colour a little: lightness and hue, from its own name
  function tone(token, seed) {
    const raw = cssVar(token);
    const m = raw.match(OKLCH);
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
      let k2 = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < len; q++) {
        let s = ((f[q] + q * q) - (f[v[k2]] + v[k2] * v[k2])) / (2 * q - 2 * v[k2]);
        while (s <= z[k2]) { k2--; s = ((f[q] + q * q) - (f[v[k2]] + v[k2] * v[k2])) / (2 * q - 2 * v[k2]); }
        k2++; v[k2] = q; z[k2] = s; z[k2 + 1] = INF;
      }
      for (let q = 0, k3 = 0; q < len; q++) { while (z[k3 + 1] < q) k3++; d[q] = (q - v[k3]) * (q - v[k3]) + f[v[k3]]; }
    };
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; line(h); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; line(w); for (let x = 0; x < w; x++) g[y * w + x] = d[x]; }
    return g;
  }
  // three box blurs, close to a gaussian, in place
  function blur(a, w, h, r) {
    const tmp = new Float32Array(a.length);
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
    for (let k2 = 0; k2 < 3; k2++) { pass(a, tmp, w, h, w, 1); pass(tmp, a, h, w, 1, w); }
  }
  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS(NS, name);
    for (const key in attrs) e.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const overlap = (a, b, pad = 0) => a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
  const smooth = (x) => x * x * (3 - 2 * x);
  const inOut = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));

  /* ------------------------------------------------------------ the projection: a cylinder of the Miller family */

  // y = ln(tan(pi/4 + k phi / 2)) / k. k = 1 is Mercator, k = 0.8 Miller's; the smaller k, the flatter
  // the high latitudes. Every member draws the meridians as straight, even lines, so x is the longitude.
  const LIM = 85 * RAD;
  const Y = (phi, k) => Math.log(Math.tan(Math.PI / 4 + (k * clamp(phi, -LIM, LIM)) / 2)) / k;
  const LAT = (y, k) => (2 * Math.atan(Math.exp(k * y)) - Math.PI / 2) / k;
  function cylinder(k) {
    const f = (l, p) => [l, Y(p, k)];
    f.invert = (x, y) => [x, LAT(y, k)];
    return f;
  }

  /* ------------------------------------------------------------ where each name is lettered */

  // [lng, lat] of the lettering and its anchor (typeset's, moved where this map's edges need it: the
  // left edge runs down the Atlantic just west of Spain, so Western Europe is lettered inside or north)
  const PLACE = {
    taiwan: { at: [123.0, 23.3], a: 'start' },
    usa: { at: [-99, 40.5], a: 'middle', inside: true, size: 'l', stack: true },
    china: { at: [101.5, 35], a: 'middle', inside: true, size: 'l', stack: true },
    australia: { at: [134.5, -24], a: 'middle', inside: true, size: 'l', stack: true },
    uk: { at: [-6.6, 62.0], a: 'start', lead: [-3.6, 57.4] },
    netherlands: { at: [15.8, 55.9], a: 'start', lead: [5.6, 52.3], size: 's', group: 'eu', col: true },
    germany: { at: [15.8, 51.0], a: 'start', group: 'eu', col: true, fix: true },
    france: { at: [1.4, 46.8], a: 'middle', stack: true },
    switzerland: { at: [15.8, 46.3], a: 'start', lead: [8.2, 46.8], size: 's', group: 'eu', col: true },
    andorra: { at: [5.4, 40.2], a: 'start', lead: [1.55, 42.55], size: 's', group: 'eu' },
    spain: { at: [-3.9, 40.6], a: 'middle', stack: true },
    dubai: { at: [64.0, 15.6], a: 'middle', wrap: true, zhCut: 3, lead: [55.6, 24.2], size: 's' },
    myanmar: { at: [87.0, 17.3], a: 'middle', stack: true, size: 's' },
    thailand: { at: [94.5, 2.6], a: 'end', lead: [99.3, 9.2] },
    malaysia: { at: [94.5, -2.3], a: 'end', lead: [101.8, 4.3] },
    singapore: { at: [94.8, -7.2], a: 'end', lead: [103.85, 1.35], size: 's' },
    vietnam: { at: [110.4, 14.6], a: 'start' },
    'hong-kong': { at: [116.2, 19.4], a: 'start', lead: [114.15, 22.35], size: 's' },
    'south-korea': { at: [126.5, 30.0], a: 'start', lead: [127.8, 35.9] },
    japan: { at: [143.4, 37.6], a: 'start' },
    'new-zealand': { at: [179.6, -38.4], a: 'start' },
  };
  // the few big cities that may keep a small name on a large map, first choice first, with the places
  // round its point the name may go, as an atlas sets them (r right, l left, b below, a above, and the
  // corners between: br, bl, ar, al); each only where it crowds nothing
  const TOWNS = [
    { city: 'New York', side: ['r', 'br', 'b'] },
    { city: 'Los Angeles', side: ['l', 'bl', 'b'] },
    { city: 'Tokyo', side: ['br', 'b', 'r'] },
    { city: 'Sydney', side: ['r', 'br', 'b'] },
    { city: 'Bangkok', side: ['l', 'bl', 'al'] },
    { city: 'Shanghai', side: ['r', 'br', 'b'] },
    { city: 'Chengdu', side: ['l', 'al', 'bl'] },
    { city: 'Melbourne', side: ['b', 'bl', 'l'] },
  ];
  const TOWNS_MAX = 5; // and one to a country
  const RANK = (c) => (c.home ? 0 : (PLACE[c.id] || {}).size === 'l' ? 1 : (PLACE[c.id] || {}).size === 's' ? 3 : 2);
  // the oceans in view, lettered lightly where the sea is open
  const SEAS = [
    { id: 'pacific', at: [-138, 13], en: ['PACIFIC', 'OCEAN'], zh: ['太平洋'] },
    { id: 'indian', at: [78, -22], en: ['INDIAN', 'OCEAN'], zh: ['印度洋'] },
  ];

  /* ------------------------------------------------------------ the ramp: one timeline, in order */

  // times in ms from the landing. The atlas rests a moment at nought, then the trips are counted in
  // slots eased in and out; a trip's slot is as long as it has things to count.
  const HOLD = 1100, SPAN_MS = 7000, BLEED = 1000, ROLL = 650, SETTLE = 1400;
  const EASE = (x) => 0.42 * x + 0.58 * (0.5 - 0.5 * Math.cos(Math.PI * x));
  function unEase(c) { let a = 0, b = 1; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (EASE(m) < c) a = m; else b = m; } return (a + b) / 2; }
  const at = (c) => HOLD + SPAN_MS * unEase(clamp(c, 0, 1));

  const journeyById = new Map(FP.journeys.map((j) => [j.id, j]));
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));
  // home is a point too, where his flights leave from (Taipei); FP.places leaves it out
  const HOME_PT = (() => {
    const f = FP.flights.find((x) => !placeByCity.has(x.from.city) && FP.km([x.from.lat, x.from.lng], FP.home.ll) < 60);
    return f ? { name: { en: f.from.city, zh: f.from.zh || f.from.city }, ll: [f.from.lat, f.from.lng], country: FP.home.id, journeys: [], home: true }
      : { name: FP.home.name, ll: FP.home.ll, country: FP.home.id, journeys: [], home: true };
  })();
  // where a flight's end is drawn: on the point of its place, so the flights run from point to point
  const endOf = (pt) => {
    const pl = placeByCity.get(pt.city);
    if (pl) return [pl.ll[1], pl.ll[0]];
    if (FP.km([pt.lat, pt.lng], FP.home.ll) < 60) return [HOME_PT.ll[1], HOME_PT.ll[0]];
    return [pt.lng, pt.lat];
  };
  const EV = { country: [], flight: [], photo: [], place: [], steps: [], end: 0 };
  const REACH = new Map([[FP.home.id, -Infinity]]); // when each country takes its colour
  const STEP_AT = new Map(); // when each trip starts being counted
  const PT_AT = new Map([[HOME_PT, -Infinity]]); // when each place's point appears
  {
    // each trip's events in the order of its legs: a flight, then the country it lands in, if new, then
    // the place, if he had not stood there before
    const seen = new Set();
    const seqs = FP.ramp.map((r) => {
      const j = journeyById.get(r.journey);
      const fresh = new Map(r.fresh.map((c) => [c.id, c]));
      const seq = [];
      let fi = 0;
      const reach = (city, air) => {
        const pl = city ? placeByCity.get(city) : null;
        if (!pl) return;
        const c = fresh.get(pl.country);
        if (c) { fresh.delete(c.id); seq.push({ kind: 'country', c }); }
        if (!seen.has(pl)) { seen.add(pl); seq.push({ kind: 'place', p: pl, air }); }
      };
      (j ? j.legs : []).forEach((l) => {
        reach(l.from.city, false);
        const flown = l.mode === 'flight' && fi < r.flights.length;
        if (flown) seq.push({ kind: 'flight', f: r.flights[fi++] });
        reach(l.to.city, flown);
      });
      fresh.forEach((c) => seq.push({ kind: 'country', c }));
      while (fi < r.flights.length) seq.push({ kind: 'flight', f: r.flights[fi++] });
      return seq;
    });
    // a trip's slot is as long as it has things to count (a place adds a little)
    const main = seqs.map((q) => q.filter((e) => e.kind !== 'place'));
    const wts = seqs.map((q, i) => 0.9 + 0.32 * main[i].length + 0.05 * (q.length - main[i].length));
    const total = wts.reduce((a, b) => a + b, 0);
    const longest = Math.max(...FP.flights.map((f) => f.km));
    // home's own photographs are there when the counting starts
    const homePhotos = FP.ramp.length ? FP.ramp[0].photos - FP.ramp[0].fresh.reduce((n, c) => n + c.photos, 0) : 0;
    let acc = 0, lastC = -Infinity;
    seqs.forEach((q, i) => {
      const c0 = acc / total, c1 = (acc + wts[i]) / total;
      acc += wts[i];
      EV.steps.push({ t: at(c0), r: FP.ramp[i] });
      STEP_AT.set(FP.ramp[i].journey, at(c0));
      if (i === 0 && homePhotos > 0) EV.photo.push({ t: at(c0) + 120, n: homePhotos });
      const m = main[i].length;
      const times = new Array(q.length).fill(null), evs = new Array(q.length).fill(null);
      let flew = null, n = -1;
      q.forEach((e, k) => {
        if (e.kind === 'place') return;
        n++;
        let te = at(c0 + (c1 - c0) * ((n + 0.35) / m));
        if (e.kind === 'country') {
          // landed by the flight before it: the colour comes up as the line nears it
          if (flew) te = Math.max(te, flew.t + Math.min(0.45 * flew.dur, 420));
          te = Math.max(te, lastC + 70);
          lastC = te; flew = null;
          EV.country.push({ t: te, c: e.c });
          REACH.set(e.c.id, te);
          if (e.c.photos > 0) EV.photo.push({ t: te + 90, n: e.c.photos });
        } else {
          flew = { t: te, f: e.f, dur: 520 + 760 * Math.sqrt(e.f.km / longest) };
          EV.flight.push(flew);
          evs[k] = flew;
        }
        times[k] = te;
      });
      // the places: one reached by air shows as the pen lands on it; those reached on the ground
      // follow one by one, along the road, until the next thing counted
      const slotEnd = at(c1);
      for (let a = 0; a < q.length;) {
        if (q[a].kind !== 'place') { a++; continue; }
        let b = a;
        while (b < q.length && q[b].kind === 'place') b++;
        let L = at(c0) + 120;
        for (let z = a - 1; z >= 0; z--) if (times[z] != null) { L = times[z] + (evs[z] ? 0 : 140); break; }
        if (q[a].air) for (let z = a - 1; z >= 0; z--) if (evs[z]) { L = Math.max(L, evs[z].t + 0.9 * evs[z].dur); break; }
        let R = slotEnd;
        for (let z = b; z < q.length; z++) if (times[z] != null) { R = times[z]; break; }
        const step = Math.max(90, (R - L) / (b - a));
        for (let k = a; k < b; k++) {
          const tp = L + (k - a) * step;
          EV.place.push({ t: tp, p: q[k].p });
          PT_AT.set(q[k].p, tp);
        }
        a = b;
      }
    });
    EV.end = Math.max(
      ...EV.country.map((e) => e.t + BLEED),
      ...EV.flight.map((e) => e.t + e.dur + SETTLE),
      ...EV.photo.map((e) => e.t + ROLL),
      ...EV.place.map((e) => e.t + 900),
    ) + 200;
    const photos = EV.photo.reduce((n, e) => n + e.n, 0);
    if (EV.country.length !== FP.counts.countries || EV.flight.length !== FP.counts.flights || photos !== FP.counts.photos || EV.place.length !== FP.places.length) {
      console.warn('wall-places: the counted totals differ from FP.counts', EV.country.length, EV.flight.length, photos, EV.place.length);
    }
  }

  /* ------------------------------------------------------------ the page */

  // the sheet holds one plate (on a phone, two), each a window onto the same map with its own sea,
  // washes, engraving and flights; over them all one layer for the names, the points and pointing.
  // The engraving is drawn once, on its own layer; the flights and the names change during the ramp,
  // so they have layers of their own and never make the engraving be painted again
  const sheet = document.createElement('div'); sheet.className = 'tn-sheet';
  const nameSvg = el('svg', { class: 'rb-lab' });
  sheet.append(nameSvg);

  const KEYS = ['countries', 'flights', 'photos'];
  const FINAL = { countries: FP.counts.countries, flights: FP.counts.flights, photos: FP.counts.photos };
  const row = document.createElement('div');
  row.className = 'rb-row';
  row.innerHTML = `<h1 class="rb-sr"></h1>` + KEYS.map((id) => `<div class="rb-stat rb-stat--${id}" data-stat="${id}" aria-hidden="true">
      <span class="rb-n"></span><span class="rb-side"><span class="rb-label fp-label"></span>${id === 'countries' ? '<span class="rb-share"></span>' : ''}</span></div>`).join('')
    + '<p class="rb-trip fp-label" aria-hidden="true"></p>';
  const stats = [...row.querySelectorAll('.rb-stat')];
  const num = (id) => row.querySelector(`.rb-stat--${id} .rb-n`);
  const lab = (id) => row.querySelector(`.rb-stat--${id} .rb-label`);
  const shareEl = row.querySelector('.rb-share');
  const tripEl = row.querySelector('.rb-trip');
  const room = document.createElement('div'); room.className = 'rb-room';
  stage.append(sheet, row, room);
  stage.setAttribute('aria-label', FP.w.where);

  let W = 0, H = 0, SH = 0, narrow = false, G = null;
  let proj = null, path = null, ks = 1, plates = [], PLAN = null;
  let atlas = null, LAND = null, HOMES = new Map();
  let washes = [], hitLayer = null, labelLayer = null, dotLayer = null, ptLayer = null, townLayer = null, seaNames = [], pts = [];
  let LC = 141.9, SPAN = 302.4 * RAD;
  const tones = new Map();
  let started = false;

  /* ------------------------------------------------------------ the words of the row */

  let pctEl = null;
  function words() {
    const n = FP.counts;
    // the share line: the per cent in Playfair, its words in small capitals
    shareEl.innerHTML = FP.lang === 'zh'
      ? `<span class="rb-of fp-label">${FP.esc(FP.w.ofWorld(n.world))}</span><span class="rb-pct"></span>`
      : `<span class="rb-pct"></span><span class="rb-of fp-label">${FP.esc(FP.w.ofWorld(n.world))}</span>`;
    pctEl = shareEl.querySelector('.rb-pct');
    row.querySelector('.rb-sr').textContent = t().sr(FP.fmt(n.countries), shareLine(n.countries), FP.fmt(n.flights), FP.fmt(n.photos));
    shown = {};
  }

  /* ------------------------------------------------------------ his countries as he knows them */

  // the largest of the shapes the atlas numbers alike and the pieces close to it: within six degrees
  // of it, or holding a place he went. So French Guiana and the Canaries stay plain (the Canaries would
  // also push Spain off the map's edge). The United States is taken whole, Alaska and Hawaii too.
  const ringPts = (coords, n) => { const r = coords[0]; const st = Math.max(1, Math.floor(r.length / n)); return r.filter((_, i) => i % st === 0); };
  function homeland(c) {
    const all = atlas.features.filter((f) => f.id === c.iso);
    if (!all.length) return null;
    const f = all.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
    if (f.geometry.type !== 'MultiPolygon' || c.id === 'usa') return f; // the whole United States, Alaska and Hawaii too
    const polys = f.geometry.coordinates.map((coordinates) => ({ coordinates, a: d3.geoArea({ type: 'Polygon', coordinates }) }));
    const big = polys.reduce((a, b) => (b.a > a.a ? b : a));
    const bigPts = ringPts(big.coordinates, 400);
    const mine = FP.places.filter((p) => p.country === c.id).map((p) => [p.ll[1], p.ll[0]]);
    const LIMIT = 6 * RAD;
    const near = (q) => {
      if (q === big) return true;
      const own = ringPts(q.coordinates, 60);
      const ce = d3.geoCentroid({ type: 'Polygon', coordinates: q.coordinates });
      if (mine.some((m) => d3.geoContains({ type: 'Polygon', coordinates: q.coordinates }, m) || d3.geoDistance(m, ce) < 1.2 * RAD)) return true;
      const reach = Math.max(...own.map((p) => d3.geoDistance(p, ce)));
      let m = Infinity;
      for (const p of bigPts) { const d = d3.geoDistance(p, ce); if (d < m) m = d; }
      if (m - reach > LIMIT) return false;
      if (m < LIMIT) return true;
      for (const p of own) for (const b of bigPts) if (d3.geoDistance(p, b) < LIMIT) return true;
      return false;
    };
    const keep = polys.filter(near);
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: keep.map((q) => q.coordinates) } };
  }

  // the map's centre: opposite the widest stretch of longitude he has not been to (the Atlantic)
  function centre() {
    const lons = [];
    HOMES.forEach((f) => {
      if (!f) return;
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      polys.forEach((p) => p[0].forEach((pt) => lons.push((((pt[0] + 180) % 360) + 360) % 360 - 180)));
    });
    lons.sort((a, b) => a - b);
    let gap = 0, mid = -38;
    for (let i = 0; i < lons.length; i++) {
      const a = lons[i], b = i + 1 < lons.length ? lons[i + 1] : lons[0] + 360;
      if (b - a > gap) { gap = b - a; mid = (a + b) / 2; }
    }
    LC = ((((mid + 180) + 180) % 360) + 360) % 360 - 180;
    SPAN = (360 - gap) * RAD;
  }

  // a country's largest piece, where its wash starts to bleed and which half of a phone's map it hangs in
  function mainPart(f) {
    if (!f || f.geometry.type !== 'MultiPolygon') return f;
    let best = null, ba = -1;
    f.geometry.coordinates.forEach((coordinates) => { const a = d3.geoArea({ type: 'Polygon', coordinates }); if (a > ba) { ba = a; best = coordinates; } });
    return { type: 'Feature', id: f.id, geometry: { type: 'Polygon', coordinates: best } };
  }

  // a phone: where to cut the wall map in two. The widest stretch of open sea between his countries a
  // little east of the middle of his world (between Australia and New Zealand); each half cropped to the
  // latitudes his countries and places reach, the Arctic and the far south left off
  const relOf = (lon, w0) => { let r = ((((lon - w0) % 360) + 360) % 360); if (r > 350) r -= 360; return r; };
  function cutPlan() {
    const spanD = SPAN / RAD, W0 = LC - spanD / 2;
    const ivs = [], parts = [];
    HOMES.forEach((f) => {
      if (!f) return;
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const areas = polys.map((coordinates) => d3.geoArea({ type: 'Polygon', coordinates }));
      const big = Math.max(...areas);
      polys.forEach((poly, i) => {
        let lo = Infinity, hi = -Infinity, s = Infinity, n = -Infinity;
        poly[0].forEach(([x, y]) => { const r = relOf(x, W0); lo = Math.min(lo, r); hi = Math.max(hi, r); s = Math.min(s, y); n = Math.max(n, y); });
        if (hi - lo > 180) return;
        ivs.push([lo, hi]);
        if (areas[i] >= big * 0.005) parts.push({ mid: (lo + hi) / 2, s, n });
      });
    });
    const spots = [...FP.places, HOME_PT].map((p) => ({ mid: relOf(p.ll[1], W0), s: p.ll[0], n: p.ll[0] }));
    spots.forEach((q) => ivs.push([q.mid, q.mid]));
    ivs.sort((a, b) => a[0] - b[0]);
    let reach = -Infinity, best = null;
    for (const [lo, hi] of ivs) {
      if (reach > -Infinity && lo - reach > 2.5) {
        const mid = (lo + reach) / 2;
        if (mid > spanD * 0.5 && mid < spanD * 0.68 && (!best || lo - reach > best.gap)) best = { gap: lo - reach, mid };
      }
      reach = Math.max(reach, hi);
    }
    if (!best) return null;
    const w0 = W0 - 2, cut = W0 + best.mid;
    const band = (inA) => {
      const list = parts.concat(spots).filter((q) => (q.mid < best.mid) === inA);
      const n = Math.max(...list.map((q) => q.n)), s = Math.min(...list.map((q) => q.s));
      return { n: Math.min(66.5, n + 1.4), s: Math.max(-52, s - 1.4) };
    };
    return { W0, w0, cut, cutRel: best.mid, a: band(true), b: band(false) };
  }
  // which plate a longitude hangs in
  const plateAt = (lon) => (plates.length < 2 ? plates[0] : relOf(lon, PLAN.W0) < PLAN.cutRel ? plates[0] : plates[1]);

  // countries that touch, or lie a short sea apart, take different colours (bolder's choice)
  function chooseTones() {
    const geoms = atlas.topo.objects.countries.geometries;
    const nb = topojson.neighbors(geoms);
    const touch = new Map();
    geoms.forEach((g, i) => { const set = touch.get(g.id) || new Set(); nb[i].forEach((j) => set.add(geoms[j].id)); touch.set(g.id, set); });
    const outline = new Map(FP.abroad.map((c) => {
      const pts = [];
      const f = HOMES.get(c.id);
      if (f) {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        polys.forEach((p) => p.forEach((ring) => ring.forEach((pt) => pts.push(pt))));
      }
      const step = Math.max(1, Math.floor(pts.length / 260));
      return [c.id, pts.filter((_, i) => i % step === 0).map(([x, y]) => [x * RAD, y * RAD])];
    }));
    const apart = (a, b) => {
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
    const picked = [], used = BOX.map(() => 0);
    tones.set(FP.home.id, { css: cssVar('--tn-home'), rgb: rgb(cssVar('--tn-home')) });
    FP.abroad.forEach((c) => {
      const near = picked.map((q) => {
        if ((touch.get(c.iso) || new Set()).has(q.c.iso)) return { b: q.b, w: 12 };
        const km = apart(c, q.c);
        return { b: q.b, w: km < 1400 ? 1 + 8 * (1 - km / 1400) : 0 };
      });
      const cost = BOX.map((_, b) => near.reduce((sum, n) => sum + (n.b === b ? n.w : 0), 0) + used[b] * 0.05);
      const b = cost.indexOf(Math.min(...cost));
      picked.push({ c, b }); used[b]++;
      tones.set(c.id, tone(BOX[b], hashStr(c.id)));
    });
  }

  /* ------------------------------------------------------------ measuring the row */

  // the figures' own height: the number's box is drawn in to the ink, top and bottom
  // (a canvas draws Playfair's old-style figures, so the lining ones are measured by a capital O)
  const meas = document.createElement('canvas').getContext('2d');
  function inkOf(F) {
    meas.font = `400 ${F}px "Playfair Display"`;
    const m = meas.measureText('O');
    const fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
    if (!(fa > 0)) return { top: F * 0.19, bot: F * 0.07 };
    const base = (F - (fa + fd)) / 2 + fa; // line-height 1
    return { top: base - m.actualBoundingBoxAscent, bot: F - (base + m.actualBoundingBoxDescent) };
  }
  // a number set digit by digit, each in a cell as wide as the widest figure: the bundled Playfair has
  // lining figures but no tabular ones, and the count must not jiggle as it climbs
  function setDigits(node, str) {
    node.innerHTML = [...str].map((ch) => (ch >= '0' && ch <= '9' ? `<span class="rb-d">${ch}</span>` : FP.esc(ch))).join('');
  }
  function widestDigit(node) {
    let m = 0;
    for (let d = 0; d <= 9; d++) { node.textContent = String(d); m = Math.max(m, node.getBoundingClientRect().width); }
    return Math.ceil(m * 10) / 10;
  }
  // the row at type size F: every part held at the widest it will be while counting (the final
  // figures, the plural words, the final per cent), so nothing shifts as the numbers grow
  function measureRow(F) {
    const ik = inkOf(F);
    row.style.setProperty('--f', `${F.toFixed(1)}px`);
    row.style.setProperty('--n-top', `${ik.top.toFixed(1)}px`);
    row.style.setProperty('--n-bot', `${ik.bot.toFixed(1)}px`);
    stats.forEach((st) => { st.style.removeProperty('--nw'); st.style.removeProperty('--lw'); });
    shareEl.style.removeProperty('--pw');
    row.style.setProperty('--dw', `${widestDigit(num('countries'))}px`);
    shareEl.style.setProperty('--pdw', `${widestDigit(pctEl)}px`);
    KEYS.forEach((id) => { setDigits(num(id), FP.fmt(FINAL[id])); lab(id).textContent = t().label[id](FINAL[id]); });
    setDigits(pctEl, shareOf(FINAL.countries));
    KEYS.forEach((id) => {
      const st = row.querySelector(`.rb-stat--${id}`);
      st.style.setProperty('--nw', `${Math.ceil(num(id).getBoundingClientRect().width)}px`);
      st.style.setProperty('--lw', `${Math.ceil(lab(id).getBoundingClientRect().width)}px`);
    });
    shareEl.style.setProperty('--pw', `${Math.ceil(pctEl.getBoundingClientRect().width)}px`);
    shown = {};
    return { F, ik, inkH: F - ik.top - ik.bot, boxes: stats.map((st) => { const r = st.getBoundingClientRect(); return { w: r.width, h: r.height }; }) };
  }
  // the trip line held at the widest date it will show
  function measureTrip() {
    tripEl.style.removeProperty('--tw');
    let wmax = 0, hmax = 0;
    EV.steps.forEach((s) => {
      tripEl.textContent = s.r.date[FP.lang];
      const r = tripEl.getBoundingClientRect();
      wmax = Math.max(wmax, r.width); hmax = Math.max(hmax, r.height);
    });
    tripEl.textContent = '';
    tripEl.style.setProperty('--tw', `${Math.ceil(wmax)}px`);
    return { w: Math.ceil(wmax), h: hmax };
  }

  /* ------------------------------------------------------------ the frame */

  // a wide window: the map is the whole window. Its scale keeps all his countries inside (s0), its top
  // edge sits just north of Europe's North Cape, and the southern ocean under New Zealand is left for the band. The
  // member of the family, the scale and the north edge are chosen together, the cheapest that fills it.
  const NORTH = 70, BAND_TOP = -48.6, FOOT = -64;
  function solveWide(w, h) {
    const padL = clamp(w * 0.022, 14, 34), padR = clamp(w * 0.018, 12, 28);
    const s0 = (w - padL - padR) / SPAN;
    const sMin = w / (2 * Math.PI); // the whole way round, and no further
    const bandMin = clamp(h * 0.12, 70, 130), bandIdeal = clamp(h * 0.165, 96, 180);
    let best = null;
    for (const north of [70, 71, 72.5, 74, 76, 78, 80, 69, 68, 66, 64.5]) {
      for (let k = 1; k >= 0.5 - 1e-9; k -= 0.025) {
        const yN = Y(north * RAD, k), yB = Y(BAND_TOP * RAD, k), yF = Y(FOOT * RAD, k);
        for (let s of [s0, (h - bandIdeal) / (yN - yB), (h - bandMin) / (yN - yB), h / (yN - yF)]) {
          if (!(s > 0)) continue;
          s = Math.max(s, sMin);
          const band = h - s * (yN - yB);
          const foot = LAT(yN - h / s, k) / RAD;
          if (band < 56 || foot < FOOT - 0.01) continue;
          const sf = s / s0;
          const cost = (sf > 1 ? (sf - 1) * 600 : (1 - sf) * 140)
            + Math.abs(band - bandIdeal) * 0.22 + (band < bandMin ? (bandMin - band) * 2 : 0)
            + (north < NORTH ? (NORTH - north) * 9 : (north - NORTH) * 1.2)
            + (1 - k) * 14;
          if (!best || cost < best.cost) best = { cost, k, s, north, band, foot };
        }
      }
    }
    if (!best) { // a window too wide for anything: the whole way round, Mercator, as much as fits
      const k = 1, s = sMin, north = 62;
      best = { k, s, north, band: h - s * (Y(north * RAD, k) - Y(BAND_TOP * RAD, k)), foot: LAT(Y(north * RAD, k) - h / s, k) / RAD };
    }
    const { k, s, north, band } = best;
    const tx = clamp((padL + w - padR) / 2, w - Math.PI * s, Math.PI * s);
    const ty = s * Y(north * RAD, k);
    return { w, h, k, s, tx, ty, north, band, mapTop: 0, mapBottom: h };
  }

  // a phone: the wall map cut in two (cutPlan) and the halves hung one above the other, as wide as the
  // screen, the numbers in a row under them, the whole set a little above the middle of the screen. A
  // window with room enough for the map whole (a tablet) keeps it in one piece across the width.
  function solveNarrow(w, h) {
    const k = 1, top = 58;
    const edge = 16, colGap = 16;
    const colW = (w - 2 * edge - 2 * colGap) / 3;
    measureRow(100); // the figures' widths at a size of 100, to scale from
    const widest = Math.max(...KEYS.map((id) => num(id).getBoundingClientRect().width), 1);
    // the figures fill three quarters of their column, so the three read as three, not as one long number
    const F = clamp((0.75 * colW / widest) * 100, 40, 96);
    const m = measureRow(F);
    const shareH = shareEl.getBoundingClientRect().height + 12; // set under the row on a phone
    const rowH = Math.max(...m.boxes.map((b) => b.h)) + shareH;
    const tb = measureTrip();
    const gap1 = 26, gap2 = 16;
    const rest = gap1 + rowH + gap2 + tb.h + 18;
    const yOf = (lat) => Y(lat * RAD, k);
    const out = { w, h, k, narrow: true, row: m, trip: tb, colW, colGap, edge };
    // in one piece: the whole of his world across the width (band's phone)
    const north = 71.5, south = -50.5, pad = 6;
    const s1 = (w - 2 * pad) / SPAN;
    let two = null;
    if (PLAN) {
      const spanR = (PLAN.cut - PLAN.w0) * RAD;
      const hA = yOf(PLAN.a.n) - yOf(PLAN.a.s), hB = yOf(PLAN.b.n) - yOf(PLAN.b.s), gapP = 12;
      let s = w / spanR;
      const avail = h - top - rest - 4;
      if (s * (hA + hB) + gapP > avail) s = Math.max(s * 0.88, (avail - gapP) / (hA + hB));
      if (s > s1 * 1.3) two = { s, spanR, hA: s * hA, hB: s * hB, gapP };
    }
    if (!two) {
      const mapH = s1 * (yOf(north) - yOf(south));
      const y0 = top + Math.max(0, (h - top - mapH - rest) * 0.36);
      const bottom = y0 + mapH;
      return { ...out, s: s1, tx: w / 2, ty: y0 + s1 * yOf(north), mapTop: y0, mapBottom: bottom, rowY: bottom + gap1, tripY: bottom + gap1 + rowH + gap2 };
    }
    const { s, spanR, hA, hB, gapP } = two;
    const pw = s * spanR, px = (w - pw) / 2, lc = PLAN.w0 + 180;
    const y0 = top + Math.max(0, (h - top - (hA + gapP + hB) - rest) * 0.36);
    const yB = y0 + hA + gapP, bottom = yB + hB;
    const plates2 = [
      { x: px, y: y0, w: pw, h: hA, lc, tx: px + s * Math.PI, ty: y0 + s * yOf(PLAN.a.n) },
      { x: px, y: yB, w: pw, h: hB, lc, tx: px + s * Math.PI - pw, ty: yB + s * yOf(PLAN.b.n) },
    ];
    return { ...out, s, plates: plates2, mapTop: y0, mapBottom: bottom, rowY: bottom + gap1, tripY: bottom + gap1 + rowH + gap2 };
  }

  // the numbers set in the band, as large as it allows; the trip line at its end
  let boxes = [], tripBox = null;
  function placeRow() {
    boxes = [];
    if (G.narrow) {
      stats.forEach((st, i) => {
        const x = G.edge + i * (G.colW + G.colGap) + (G.colW - G.row.boxes[i].w) / 2, y = G.rowY;
        st.style.setProperty('--x', `${x.toFixed(1)}px`); st.style.setProperty('--y', `${y.toFixed(1)}px`);
        boxes.push({ x, y, w: G.row.boxes[i].w, h: G.row.boxes[i].h });
      });
      tripBox = { x: W - G.edge - G.trip.w, y: G.tripY, w: G.trip.w, h: G.trip.h };
    } else {
      const band = G.band;
      const edge = clamp(W * 0.032, 16, 40);
      const padB = clamp(band * 0.15, 12, 30), padT = clamp(band * 0.16, 12, 34);
      const ik = inkOf(100), per = (100 - ik.top - ik.bot) / 100;
      let F = Math.min((band - padT - padB) / per, H * 0.2);
      const tb = measureTrip();
      let m = null, gap = 0;
      for (let i = 0; i < 16; i++) {
        m = measureRow(F);
        gap = clamp(F * 0.62, 30, 120);
        const need = edge + m.boxes.reduce((s, b) => s + b.w, 0) + 2 * gap + Math.max(40, gap * 0.6) + tb.w + edge;
        if (need <= W || F < 30) break;
        F *= 0.94;
      }
      const base = H - padB; // the figures' line
      const y = base - m.inkH;
      // spread along the band: the free width shared between the two gaps, within reason
      const free = W - 2 * edge - m.boxes.reduce((s, b) => s + b.w, 0) - tb.w - Math.max(40, gap * 0.6);
      gap = clamp(free / 2.4, gap, F * 1.7);
      let x = edge;
      stats.forEach((st, i) => {
        st.style.setProperty('--x', `${x.toFixed(1)}px`); st.style.setProperty('--y', `${y.toFixed(1)}px`);
        boxes.push({ x, y, w: m.boxes[i].w, h: m.boxes[i].h });
        x += m.boxes[i].w + gap;
      });
      // its baseline on the figures' line, near enough: the small capitals sit a little above the box's foot
      tripBox = { x: W - edge - tb.w, y: base - tb.h + 3, w: tb.w, h: tb.h };
      G.F = F;
    }
    tripEl.style.setProperty('--x', `${tripBox.x.toFixed(1)}px`);
    tripEl.style.setProperty('--y', `${tripBox.y.toFixed(1)}px`);
  }

  // the paper kept clear: round the numbers, the trip line and (on the map) the top bar's words
  function clearings() {
    if (G.narrow) return [];
    const F = G.F || 80;
    const list = boxes.map((b) => ({ ...b, pad: Math.max(6, F * 0.06), soft: Math.max(14, F * 0.16) }));
    list.push({ ...tripBox, pad: 5, soft: 14 });
    document.querySelectorAll('.fp-top__name, .fp-lang').forEach((n) => {
      const r = n.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      list.push({ x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height, pad: 6, soft: 16 });
    });
    return list;
  }

  /* ------------------------------------------------------------ the sea: graticule and water-lining */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else ctx.rect(x, y, w, h);
  }

  // one plate's sea, drawn on its own canvas in the page's coordinates
  function drawSea(pl) {
    const sea = pl.sea;
    sea.width = Math.round(pl.w * DPR); sea.height = Math.round(pl.h * DPR);
    const ctx = sea.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, -pl.x * DPR, -pl.y * DPR);
    const water = cssVar('--tn-water'), inkC = cssVar('--ink');

    // the graticule, every fifteen degrees, the equator a shade firmer
    const gpath = d3.geoPath(pl.proj, ctx);
    ctx.strokeStyle = inkC; ctx.lineWidth = 0.4;
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); gpath(d3.geoGraticule().step([15, 15]).extentMinor([[-180, -84], [180, 84]]).extentMajor([[-180, -84], [180, 84]])()); ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); gpath({ type: 'LineString', coordinates: d3.range(-180, 181, 2).map((x) => [x, 0]) }); ctx.stroke();

    // the water-lining: lines at a set distance from every coast, closer near the shore, fading out
    // to sea; measured on the screen, as the engraver measured his plate (bolder's)
    const g = narrow ? 1 : 1.25; // css px per cell
    const pad = 8;
    const x0 = pl.x - pad * g, y0 = pl.y - pad * g;
    const gw = Math.ceil(pl.w / g) + 2 * pad, gh = Math.ceil(pl.h / g) + 2 * pad;
    const mask = document.createElement('canvas'); mask.width = gw; mask.height = gh;
    const mc = mask.getContext('2d', { willReadFrequently: true });
    mc.setTransform(1 / g, 0, 0, 1 / g, -x0 / g, -y0 / g);
    mc.beginPath(); d3.geoPath(pl.proj, mc)(LAND); mc.fillStyle = MASK; mc.fill();
    const md = mc.getImageData(0, 0, gw, gh).data;
    const field = new Float64Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) field[i] = md[i * 4 + 3] > 110 ? 0 : INF;
    edt(field, gw, gh);
    for (let i = 0; i < gw * gh; i++) field[i] = Math.sqrt(field[i]) * g;

    const sp = clamp(G.s / 262, 0.6, 1.15);
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
    lc.setTransform(DPR * g, 0, 0, DPR * g, DPR * (x0 - pl.x), DPR * (y0 - pl.y));
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

    ctx.setTransform(DPR, 0, 0, DPR, -pl.x * DPR, -pl.y * DPR);
    if (narrow) {
      // on a phone each plate is a block across the page: a fine rule closes it above and below
      ctx.globalAlpha = 0.55; ctx.strokeStyle = inkC; ctx.lineWidth = 0.6;
      const t0 = pl.y + 0.3, t1 = pl.y + pl.h - 0.3;
      ctx.beginPath(); ctx.moveTo(pl.x, t0); ctx.lineTo(pl.x + pl.w, t0); ctx.moveTo(pl.x, t1); ctx.lineTo(pl.x + pl.w, t1); ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // the clearings: rings of rubbing out, wider and fainter outwards, so the lines thin away
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const N = 14;
      for (let i = 0; i < N; i++) {
        ctx.globalAlpha = 0.28;
        clearings().forEach((r) => {
          const grow = r.pad + r.soft * (1 - i / (N - 1));
          roundRect(ctx, r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow, grow);
          ctx.fill();
        });
      }
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------ the ink: coasts, borders, flights, lettering */

  function drawInk() {
    const vb = (svg, x, y, w, h) => {
      svg.replaceChildren();
      svg.setAttribute('viewBox', `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
      svg.setAttribute('width', w.toFixed(2)); svg.setAttribute('height', h.toFixed(2));
    };
    vb(nameSvg, 0, 0, W, SH);
    const ndefs = el('defs', {}, nameSvg);
    plates.forEach((pl) => {
      vb(pl.ink, pl.x, pl.y, pl.w, pl.h);
      vb(pl.fly, pl.x, pl.y, pl.w, pl.h);
      let g = pl.ink;
      if (!narrow) {
        // the engraving rubbed out round the numbers, the trip line and the top bar's words
        const defs = el('defs', {}, pl.ink);
        const rr = (x, y, w, h, r) => `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
        const d = `M${pl.x},${pl.y}H${pl.x + pl.w}V${pl.y + pl.h}H${pl.x}Z` + clearings().map((c) => { const q = c.pad + c.soft * 0.35; return rr(c.x - q, c.y - q, c.w + 2 * q, c.h + 2 * q, Math.min(q, (c.w + 2 * q) / 2, (c.h + 2 * q) / 2)); }).join('');
        const clip = el('clipPath', { id: `wp-frame-${pl.i}` }, defs);
        el('path', { d, 'clip-rule': 'evenodd' }, clip);
        g = el('g', { 'clip-path': `url(#wp-frame-${pl.i})` }, pl.ink);
      }
      el('path', { class: 'tn-border', d: pl.path(atlas.borders) || '' }, g);
      el('path', { class: 'tn-coast', d: pl.path(LAND) || '' }, g);
      // the flights, each one fine arc drawn from the point he left, bowed to the north as a great circle
      // is (drawn on the sheet, not along the great circle itself: New York's would leave over the top
      // edge). Every plate draws them all: on a phone a flight runs off the first plate into the second
      const fl = el('g', { class: 'rb-flights' }, pl.fly);
      pl.flightEls = EV.flight.map((e) => el('path', { class: 'rb-flight', pathLength: '1', d: arc(e.f, pl) }, fl));
      // what pointing finds is kept to its own plate
      const cp = el('clipPath', { id: `wp-plate-${pl.i}` }, ndefs);
      el('rect', { x: pl.x.toFixed(1), y: pl.y.toFixed(1), width: pl.w.toFixed(1), height: pl.h.toFixed(1) }, cp);
    });
    // the small ones' rings, drawn when they are reached
    dotLayer = el('g', { 'aria-hidden': 'true' }, nameSvg);
    washes.forEach((w) => { w.dot = w.dab ? el('circle', { class: 'tn-dot', cx: w.dab[0].toFixed(1), cy: w.dab[1].toFixed(1), r: w.dab[2].toFixed(1) }, dotLayer) : null; });
    hitLayer = el('g', { 'aria-label': t().map }, nameSvg);
    const hitIn = plates.map((pl) => el('g', { 'clip-path': `url(#wp-plate-${pl.i})` }, hitLayer));
    labelLayer = el('g', { 'aria-hidden': 'true' }, nameSvg);
    washes.forEach((w) => {
      const h = w.dab ? el('circle', { class: 'tn-hit', cx: w.dab[0], cy: w.dab[1], r: w.dab[2] + 6 }, hitIn[w.pl.i])
        : el('path', { class: 'tn-hit', d: w.pl.path(w.feature) || '' }, hitIn[w.pl.i]);
      h.dataset.id = w.c.id;
      w.hit = h;
    });
    // the places he stood: a tiny open circle each, over the washes and the flights
    ptLayer = el('g', { class: 'wp-pts', 'aria-label': t().pts }, nameSvg);
    townLayer = el('g', { 'aria-hidden': 'true' }, nameSvg);
    const r = narrow ? 1.5 : clamp(1.8 * ks, 1.5, 2.1);
    pts = [HOME_PT, ...FP.places].map((p) => {
      const pl = plateAt(p.ll[1]);
      const xy = pl.proj([p.ll[1], p.ll[0]]);
      const inside = xy && xy[0] >= pl.x && xy[0] <= pl.x + pl.w && xy[1] >= pl.y && xy[1] <= pl.y + pl.h;
      if (!inside) return null;
      const c = el('circle', { class: 'wp-pt' + (p.home ? ' is-home' : ''), cx: xy[0].toFixed(1), cy: xy[1].toFixed(1), r: r.toFixed(2) }, ptLayer);
      return { p, xy, r, el: c, label: null, t: PT_AT.has(p) ? PT_AT.get(p) : Infinity, on: null };
    }).filter(Boolean);
  }

  // a flight's arc on a plate: from, the bend, to
  function arcPts(f, pl) {
    const a = pl.proj(endOf(f.from)), b = pl.proj(endOf(f.to));
    if (!a || !b) return null;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < 0.5) return null;
    let nx = -dy / L, ny = dx / L; // square to the line; turned to the north, or east for one running north and south
    if (ny > 0 || (Math.abs(ny) < 0.25 && nx < 0)) { nx = -nx; ny = -ny; }
    const bow = Math.min(L * 0.17, 150);
    return [a, [(a[0] + b[0]) / 2 + nx * bow, (a[1] + b[1]) / 2 + ny * bow], b];
  }
  function arc(f, pl) {
    const q = arcPts(f, pl);
    if (!q) return '';
    const r = (v) => v.toFixed(1);
    return `M${r(q[0][0])},${r(q[0][1])}Q${r(q[1][0])},${r(q[1][1])} ${r(q[2][0])},${r(q[2][1])}`;
  }

  // Europe's crowded corner: the names in a group spaced evenly about the one that holds its place
  // (typeset's)
  function settle() {
    const out = new Map();
    const zh = FP.lang === 'zh';
    const em = Math.max(zh ? 9.6 : 8.6, (zh ? 11 : 10.5) * ks);
    const gap = em * 2.5;
    const groups = {};
    Object.entries(PLACE).forEach(([id, p]) => { if (p.group) (groups[p.group] = groups[p.group] || []).push({ id, p, at: proj(p.at) }); });
    Object.values(groups).forEach((list) => {
      if (list.some((q) => !q.at)) return;
      const fixed = list.find((q) => q.p.fix) || list[0];
      const colX = proj(fixed.p.at)[0];
      list.forEach((q) => { q.x = q.p.col ? colX : q.at[0]; q.y = q.at[1]; });
      list.sort((a, b) => a.y - b.y);
      const fi = list.indexOf(fixed);
      for (let i = fi - 1; i >= 0; i--) list[i].y = Math.min(list[i].y, list[i + 1].y - gap);
      for (let i = fi + 1; i < list.length; i++) list[i].y = Math.max(list[i].y, list[i - 1].y + gap);
      list.forEach((q) => out.set(q.id, [q.x, q.y]));
    });
    return out;
  }

  function drawLabels() {
    labelLayer.replaceChildren();
    townLayer.replaceChildren();
    seaNames = [];
    washes.forEach((w) => { w.label = null; w.text = null; });
    pts.forEach((q) => { q.label = null; });
    if (narrow) return;
    const lang = FP.lang, names = FP.names();
    const spots = settle();
    seaNames = SEAS.map((s) => {
      const p = proj(s.at);
      if (!p) return null;
      const tx = el('text', { class: 'tn-ocean', x: p[0].toFixed(1), y: p[1].toFixed(1), 'text-anchor': 'middle' }, labelLayer);
      s[lang].forEach((line, i) => { el('tspan', { x: p[0].toFixed(1), dy: i ? '1.5em' : '0' }, tx).textContent = line; });
      return tx;
    }).filter(Boolean);
    washes.forEach((w) => {
      const c = w.c, nm = names[c.iso];
      const p = PLACE[c.id] || { at: nm ? nm.at : [c.ll[1], c.ll[0]], a: 'middle', inside: true };
      const xy = spots.get(c.id) || proj(p.at);
      if (!xy) return;
      const [x, y] = xy;
      const g = el('g', { class: 'tn-label' }, labelLayer);
      const tx = el('text', { class: 'tn-name tn-name--' + (p.size || 'm') + (p.inside ? '' : ' is-halo') + (c.home ? ' is-home' : ''), x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': p.a }, g);
      const name = c.home ? c.name[lang] : c.country[lang];
      const cap = lang === 'zh' ? name : name.toUpperCase();
      const year = c.home ? caps(FP.w.home) : String(c.first);
      if (p.wrap) { // two lines, the year on the second
        const parts = lang === 'zh' ? [cap.slice(0, p.zhCut || 2), cap.slice(p.zhCut || 2)] : cap.split(' ');
        const cut = Math.ceil(parts.length / 2), sep = lang === 'zh' ? '' : ' ';
        el('tspan', { x: x.toFixed(1), dy: '0' }, tx).textContent = parts.slice(0, cut).join(sep);
        el('tspan', { x: x.toFixed(1), dy: '1.2em' }, tx).textContent = parts.slice(cut).join(sep);
      } else {
        tx.appendChild(document.createTextNode(cap));
      }
      if (p.stack) el('tspan', { class: 'tn-year', x: x.toFixed(1), dy: '1.15em' }, tx).textContent = year;
      else el('tspan', { class: 'tn-year', dx: lang === 'zh' ? '0.3em' : '0.45em' }, tx).textContent = year;
      w.label = g; w.text = tx;
      if (p.lead) { // a fine leader from the nearest edge of the lettering to the place
        const [lx, ly] = proj(p.lead);
        const b = tx.getBBox(), m = 2.5;
        const qx = clamp(lx, b.x - m, b.x + b.width + m), qy = clamp(ly, b.y + b.height * 0.2, b.y + b.height * 0.8);
        const sx = lx < b.x || lx > b.x + b.width ? qx : clamp(lx, b.x, b.x + b.width);
        const sy = lx < b.x || lx > b.x + b.width ? qy : (ly < b.y ? b.y - 1 : b.y + b.height + 1);
        g.insertBefore(el('path', { class: 'tn-lead', d: `M${sx.toFixed(1)},${sy.toFixed(1)}L${lx.toFixed(1)},${ly.toFixed(1)}` }), tx);
        g.insertBefore(el('circle', { class: 'tn-lead-end', cx: lx.toFixed(1), cy: ly.toFixed(1), r: 1.1 }), tx);
        w.leadAt = [lx, ly];
      } else w.leadAt = null;
    });
    drawTowns(cull());
  }

  // a few big cities keep a small name on a large map, beside their point, where it crowds nothing:
  // not the countries' names, the numbers, the oceans' names, another point or the window's edge
  function drawTowns(taken) {
    if (ks < 0.9) return;
    const lang = FP.lang;
    const busy = taken.slice();
    seaNames.forEach((tx) => { if (!tx.classList.contains('is-cut')) { const b = tx.getBBox(); busy.push({ x: b.x, y: b.y, w: b.width, h: b.height }); } });
    washes.forEach((w) => { if (w.leadAt && w.label && !w.label.classList.contains('is-cut')) busy.push({ x: w.leadAt[0] - 3, y: w.leadAt[1] - 3, w: 6, h: 6 }); });
    // the flights, as points along each arc: a name is not set across a hairline
    const along = [];
    EV.flight.forEach((e) => {
      const q = arcPts(e.f, plates[0]);
      if (!q) return;
      const L = Math.hypot(q[2][0] - q[0][0], q[2][1] - q[0][1]), n2 = Math.max(8, Math.ceil(L / 3));
      for (let i = 0; i <= n2; i++) {
        const u = i / n2, v = 1 - u;
        along.push([v * v * q[0][0] + 2 * u * v * q[1][0] + u * u * q[2][0], v * v * q[0][1] + 2 * u * v * q[1][1] + u * u * q[2][1]]);
      }
    });
    // (the name's halo covers a hairline that only grazes its top or foot)
    const crossed = (b) => along.some(([x, y]) => x > b.x - 1 && x < b.x + b.w + 1 && y > b.y + 2 && y < b.y + b.h - 2);
    const named = new Set();
    let n = 0;
    for (const town of TOWNS) {
      if (n >= TOWNS_MAX) break;
      const q = pts.find((x) => x.p.name.en === town.city);
      if (!q || named.has(q.p.country)) continue;
      const others = pts.filter((x) => x !== q).map((x) => ({ x: x.xy[0] - x.r - 1, y: x.xy[1] - x.r - 1, w: 2 * x.r + 2, h: 2 * x.r + 2 }));
      const [x, y] = q.xy, gap = q.r + 3.5, d = gap * 0.7;
      for (const side of town.side) {
        const at = side === 'r' ? { x: x + gap, y: y + 3.4, a: 'start' } : side === 'l' ? { x: x - gap, y: y + 3.4, a: 'end' }
          : side === 'b' ? { x, y: y + gap + 7.5, a: 'middle' } : side === 'a' ? { x, y: y - gap - 1.5, a: 'middle' }
            : { x: side[1] === 'r' ? x + d : x - d, y: side[0] === 'b' ? y + d + 7.5 : y - d - 1, a: side[1] === 'r' ? 'start' : 'end' };
        const tx = el('text', { class: 'wp-town', x: at.x.toFixed(1), y: at.y.toFixed(1), 'text-anchor': at.a }, townLayer);
        tx.textContent = q.p.name[lang];
        const b = tx.getBBox(), box = { x: b.x, y: b.y, w: b.width, h: b.height }, ink = { x: b.x, y: b.y + 2, w: b.width, h: b.height - 4 };
        const out = box.x < 6 || box.x + box.w > W - 6 || box.y < 6 || box.y + box.h > H - 6;
        if (out || busy.some((o) => overlap(box, o, 4)) || others.some((o) => overlap(ink, o, 0.5)) || crossed(box)) { tx.remove(); continue; }
        busy.push(box); q.label = tx; n++; named.add(q.p.country);
        break;
      }
    }
  }

  // leave out the labels that have no room: those that run into a larger one, the numbers, the top
  // bar's words or the window's edge; an ocean's name gives way to everything
  function cull() {
    const pad = 3 + 2.5 * clamp((1 - ks) / 0.38, 0, 1);
    const few = ks < 0.8; // on a smaller map the small countries go unlettered: pointing names them
    const taken = clearings().map((c) => ({ x: c.x - 6, y: c.y - 6, w: c.w + 12, h: c.h + 12 }));
    const list = washes.filter((w) => w.label).sort((a, b) => (RANK(a.c) - RANK(b.c)) || (b.area - a.area));
    for (const w of list) {
      const b = w.text.getBBox();
      const box = { x: b.x, y: b.y, w: b.width, h: b.height };
      const end = w.leadAt ? { x: w.leadAt[0] - 2, y: w.leadAt[1] - 2, w: 4, h: 4 } : null;
      const out = box.x < 4 || box.x + box.w > W - 4 || box.y < 4 || box.y + box.h > H - 4;
      const hit = out || taken.some((o) => overlap(box, o, pad) || (end && overlap(end, o, 0)));
      if ((hit || (few && RANK(w.c) === 3)) && !w.c.home) { w.label.classList.add('is-cut'); continue; }
      taken.push(box);
    }
    seaNames.forEach((tx) => {
      const b = tx.getBBox();
      if (taken.some((o) => overlap({ x: b.x, y: b.y, w: b.width, h: b.height }, o, 8))) tx.classList.add('is-cut');
    });
    return taken;
  }

  /* ------------------------------------------------------------ the washes */

  // one sheet of wash per country, made once per layout: the shape a little off the line, the edge
  // uneven, pigment pooled along it, mottled in the middle, the paper's tooth showing through (bolder's)
  function makeWash(c, feature, pl) {
    const { proj, path } = pl;
    const id = c.id, seed = hashStr(id) & 0xffff;
    const col = tones.get(id).rgb;
    const area = feature ? path.area(feature) : 0;
    const nm = FP.names()[c.iso];
    let dab = null;
    if (!feature || area < 30) {
      const p = proj(nm ? nm.at : [c.ll[1], c.ll[0]]);
      dab = [p[0], p[1], clamp(3.2 * ks, 2.6, 4)];
    }
    let b = feature && area > 0 ? path.bounds(feature) : [[dab[0], dab[1]], [dab[0], dab[1]]];
    if (dab) b = [[Math.min(b[0][0], dab[0] - dab[2]), Math.min(b[0][1], dab[1] - dab[2])], [Math.max(b[1][0], dab[0] + dab[2]), Math.max(b[1][1], dab[1] + dab[2])]];
    const size = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]);
    const pad = 4;
    const x0 = Math.floor(b[0][0] - pad), y0 = Math.floor(b[0][1] - pad);
    const x1 = Math.ceil(b[1][0] + pad), y1 = Math.ceil(b[1][1] + pad);
    const w = Math.max(2, Math.round((x1 - x0) * DPR)), h = Math.max(2, Math.round((y1 - y0) * DPR));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const off = [(rand(seed) - 0.5) * 2.2 * ks, (rand(seed + 9) - 0.5) * 2.2 * ks]; // the colourist's hand, a little off
    ctx.setTransform(DPR, 0, 0, DPR, (-x0 + off[0]) * DPR, (-y0 + off[1]) * DPR);
    ctx.fillStyle = MASK;
    if (feature && !dab) { ctx.beginPath(); d3.geoPath(proj, ctx)(feature); ctx.fill(); }
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
        let al = 0.62 + 0.18 * mott + 0.3 * pool;
        al *= 1 - 0.3 * tooth * tooth * tooth;
        const dk = 1 - 0.2 * pool;
        px[i * 4] = r * dk; px[i * 4 + 1] = gg * dk; px[i * 4 + 2] = bb * dk;
        px[i * 4 + 3] = clamp(cov * al, 0, 1) * 255;
      }
    }
    const ctr = dab ? [dab[0], dab[1]] : path.centroid(mainPart(feature)); // the wash starts in its largest piece
    const atPt = Number.isFinite(ctr[0]) ? ctr : proj([c.ll[1], c.ll[0]]);
    return { c, feature, pl, img, x0, y0, w: x1 - x0, h: y1 - y0, dab, area, at: atPt, size, u: -1, el: null, arr: null, label: null, text: null, on: null };
  }

  // a wash bleeding out from the middle of its country: the pigment reaches each part in turn, the
  // nearest first, the front a little uneven (the same every time), a shade richer while it is wet.
  // Only its alpha moves: the colour is its own from the first moment (animate's).
  function bleed(w, u) {
    if (!w.el) return;
    u = clamp(u, 0, 1);
    if (u === w.u) return;
    const ctx = w.el.getContext('2d');
    if (u <= 0) { ctx.clearRect(0, 0, w.el.width, w.el.height); w.u = 0; return; }
    if (u >= 1) { ctx.putImageData(w.img, 0, 0); w.u = 1; return; }
    const W2 = w.img.width, H2 = w.img.height, N = W2 * H2, src = w.img.data;
    if (!w.arr) {
      const cx = (w.at[0] - w.x0) * DPR, cy = (w.at[1] - w.y0) * DPR, seed = (hashStr(w.c.id) & 0xffff) + 11;
      const arr = new Float32Array(N);
      let max = 1;
      for (let y = 0, i = 0; y < H2; y++) for (let x = 0; x < W2; x++, i++) {
        if (src[i * 4 + 3] === 0) { arr[i] = -1; continue; }
        const d = Math.hypot(x - cx, y - cy);
        arr[i] = d; if (d > max) max = d;
      }
      for (let y = 0, i = 0; y < H2; y++) for (let x = 0; x < W2; x++, i++) {
        if (arr[i] < 0) continue;
        arr[i] = (arr[i] / max) * 0.84 + noise(x / DPR / 7, y / DPR / 7, seed) * 0.16;
      }
      w.arr = arr;
      w.out = ctx.createImageData(W2, H2);
      const dst = w.out.data;
      for (let i = 0; i < N * 4; i += 4) { dst[i] = src[i]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i + 2]; }
    }
    const arr = w.arr, dst = w.out.data, soft = 0.18;
    const p = 1 - (1 - u) ** 3; // quick while the brush is wet, slowing as it dries
    const front = p * (1 + soft), wet = 1 - u;
    for (let i = 0; i < N; i++) {
      const a = arr[i];
      if (a < 0) { dst[i * 4 + 3] = 0; continue; }
      const k2 = clamp((front - a) / soft, 0, 1);
      dst[i * 4 + 3] = Math.min(255, src[i * 4 + 3] * k2 * (1 + 1.3 * k2 * (1 - k2) * wet));
    }
    ctx.putImageData(w.out, 0, 0);
    w.u = u;
  }

  function layWashes() {
    plates.forEach((pl) => pl.washBox.replaceChildren());
    washes.forEach((w) => {
      const cv = document.createElement('canvas');
      cv.className = 'rb-wash';
      cv.width = w.img.width; cv.height = w.img.height;
      cv.style.setProperty('--dx', `${(w.x0 - w.pl.x).toFixed(1)}px`); cv.style.setProperty('--dy', `${(w.y0 - w.pl.y).toFixed(1)}px`);
      cv.style.setProperty('--dw', `${w.w}px`); cv.style.setProperty('--dh', `${w.h}px`);
      w.el = cv; w.u = -1;
      w.pl.washBox.appendChild(cv);
    });
  }

  /* ------------------------------------------------------------ one moment of the ramp */

  let shown = {};
  function paint(now) {
    // the three numbers
    let nc = 0, nf = 0, np = 0;
    for (const e of EV.country) if (e.t <= now) nc++;
    for (const e of EV.flight) if (e.t <= now) nf++;
    for (const e of EV.photo) np += e.n * clamp((now - e.t) / ROLL, 0, 1);
    np = Math.round(np);
    const vals = { countries: nc, flights: nf, photos: np };
    KEYS.forEach((id) => {
      if (shown[id] === vals[id]) return;
      setDigits(num(id), FP.fmt(vals[id]));
      lab(id).textContent = t().label[id](vals[id]);
      shown[id] = vals[id];
    });
    if (shown.pct !== nc && pctEl) { setDigits(pctEl, shareOf(nc)); shown.pct = nc; }

    // the trip being counted, while the ramp runs
    let step = -1;
    for (let i = 0; i < EV.steps.length; i++) if (EV.steps[i].t <= now) step = i;
    const running = step >= 0 && now < EV.end - 500;
    if (step >= 0 && shown.step !== step) { tripEl.textContent = EV.steps[step].r.date[FP.lang]; shown.step = step; }
    tripEl.classList.toggle('is-on', running);

    // the washes, the names and the small ones' rings
    washes.forEach((w) => {
      const te = REACH.has(w.c.id) ? REACH.get(w.c.id) : Infinity;
      bleed(w, te === -Infinity ? 1 : (now - te) / BLEED);
      const on = now >= te;
      if (w.on !== on) {
        w.on = on;
        if (w.label) w.label.classList.toggle('is-on', on);
        if (w.dot) w.dot.classList.toggle('is-on', on);
        if (w.hit) w.hit.classList.toggle('is-on', on);
      }
    });

    // the flights: drawn like a pen, a little stronger while the ink is wet, then left faint
    EV.flight.forEach((e, i) => {
      const p = clamp((now - e.t) / e.dur, 0, 1);
      const o = p <= 0 ? 0 : p < 1 ? 0.62 : 0.3 + 0.32 * (1 - smooth(clamp((now - e.t - e.dur) / SETTLE, 0, 1)));
      const key = `${p.toFixed(3)}|${o.toFixed(3)}`;
      if (e.key === key) return;
      e.key = key;
      plates.forEach((pl) => {
        const pe = pl.flightEls[i];
        if (!pe) return;
        pe.style.setProperty('--p', inOut(p).toFixed(4));
        pe.style.setProperty('--o', o.toFixed(3));
      });
    });

    // the places he stood, each as the trip that first took him there reaches it
    pts.forEach((q) => {
      const on = now >= q.t;
      if (q.on === on) return;
      q.on = on;
      q.el.classList.toggle('is-on', on);
      if (q.label) q.label.classList.toggle('is-on', on);
    });
  }

  /* ------------------------------------------------------------ the clock */

  let t0 = null, raf = 0;
  const clock = () => (STILL ? Infinity : SEEK != null ? SEEK : t0 == null ? 0 : performance.now() - t0);
  function loop() {
    raf = 0;
    const t = clock();
    paint(t);
    if (t >= EV.end) { body.classList.add('is-rest'); return; }
    if (SEEK == null && !STILL) raf = requestAnimationFrame(loop);
  }
  function startClock() {
    if (STILL || SEEK != null) { body.classList.add('is-held'); loop(); return; }
    t0 = performance.now();
    loop();
  }

  /* ------------------------------------------------------------ pointing and tapping */

  const reached = (id) => clock() >= (REACH.has(id) ? REACH.get(id) : Infinity);
  const idAt = (e) => {
    const h = e.target && e.target.closest ? e.target.closest('[data-id]') : null;
    return h && hitLayer && hitLayer.contains(h) ? h.dataset.id : null;
  };
  const local = (e) => { const r = sheet.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  // the point under the pointer: the nearest of those already reached, within reach
  function pointAt(e, within) {
    const [x, y] = local(e), now = clock();
    let best = null, bd = within;
    pts.forEach((q) => { if (now < q.t) return; const d = Math.hypot(q.xy[0] - x, q.xy[1] - y); if (d < bd) { bd = d; best = q; } });
    return best;
  }
  // a finger is wide: the nearest of his countries within reach of the tap
  function nearest(e) {
    const [x, y] = local(e);
    let best = null, bd = 26;
    washes.forEach((w) => { const d = Math.hypot(w.at[0] - x, w.at[1] - y); if (d < bd && reached(w.c.id)) { bd = d; best = w.c.id; } });
    return best;
  }
  // a place's note: its name, and the trips that took him there (those counted so far)
  function aboutPlace(q) {
    const lang = FP.lang, p = q.p;
    if (p.home) return `<b>${FP.esc(p.name[lang])}</b><span>${FP.esc(FP.w.home)}</span>`;
    const now = clock();
    const dates = p.journeys.filter((id) => (STEP_AT.has(id) ? STEP_AT.get(id) : Infinity) <= now || now >= EV.end)
      .map((id) => journeyById.get(id)).filter(Boolean).map((j) => j.date[lang]);
    return `<b>${FP.esc(p.name[lang])}</b><span>${FP.esc(dates.join(t().and))}</span>`;
  }
  const note = (e, id) => FP.tip(e.clientX, e.clientY, FP.about(FP.byId.get(id)));
  const hide = () => FP.tip(0, 0, null);
  let pointed = null, tipT = 0;
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const q = pointAt(e, 7);
    if (q) { pointed = q; FP.tip(e.clientX, e.clientY, aboutPlace(q)); return; }
    const id = idAt(e);
    if (id && reached(id)) { pointed = id; note(e, id); } else if (pointed) { pointed = null; hide(); }
  });
  stage.addEventListener('pointerleave', () => { pointed = null; hide(); });
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    clearTimeout(tipT);
    const q = pointAt(e, 13);
    if (q) { FP.tip(e.clientX, e.clientY, aboutPlace(q)); tipT = setTimeout(hide, 2600); return; }
    const id = idAt(e) || nearest(e);
    if (id && reached(id)) { note(e, id); tipT = setTimeout(hide, 2600); } else hide();
  });

  /* ------------------------------------------------------------ putting it together */

  // the plates' own layers: a sea, the washes, the engraving, the flights
  function buildPlates(specs) {
    sheet.querySelectorAll('.wp-plate').forEach((n) => n.remove());
    plates = specs.map((sp, i) => {
      const proj = d3.geoProjection(cylinder(G.k)).rotate([-sp.lc, 0]).scale(G.s).translate([sp.tx, sp.ty]).precision(0.15)
        .clipExtent([[sp.x - 12, sp.y - 12], [sp.x + sp.w + 12, sp.y + sp.h + 12]]);
      const box = document.createElement('div'); box.className = 'wp-plate';
      box.style.setProperty('--x', `${sp.x.toFixed(2)}px`); box.style.setProperty('--y', `${sp.y.toFixed(2)}px`);
      box.style.setProperty('--w', `${sp.w.toFixed(2)}px`); box.style.setProperty('--h', `${sp.h.toFixed(2)}px`);
      const sea = document.createElement('canvas'); sea.className = 'tn-sea';
      const washBox = document.createElement('div'); washBox.className = 'rb-washes';
      const ink = el('svg', { class: 'tn-ink', 'aria-hidden': 'true' });
      const fly = el('svg', { class: 'rb-fly', 'aria-hidden': 'true' });
      box.append(sea, washBox, ink, fly);
      sheet.insertBefore(box, nameSvg);
      return { ...sp, i, proj, path: d3.geoPath(proj), el: box, sea, washBox, ink, fly, flightEls: [] };
    });
    proj = plates[0].proj; path = plates[0].path;
  }

  function render() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 120 || h < 120) return false; // a window too small (or still hidden): wait for it
    W = w; H = h;
    narrow = w < 640 || w / h < 1.15;
    body.classList.toggle('is-narrow', narrow);
    words();
    G = narrow ? solveNarrow(w, h) : solveWide(w, h);
    buildPlates(G.plates || [{ x: 0, y: G.mapTop, w: W, h: G.mapBottom - G.mapTop, lc: LC, tx: G.tx, ty: G.ty }]);
    ks = clamp(G.s / 262, 0.62, 1.2);
    document.documentElement.style.setProperty('--tn-k', ks.toFixed(3));

    placeRow();
    SH = Math.max(H, ...plates.map((pl) => pl.y + pl.h));
    stage.style.setProperty('--room', narrow ? `${Math.ceil(tripBox.y + tripBox.h + 24)}px` : '0px');
    sheet.style.setProperty('--sheet-w', `${W}px`);
    sheet.style.setProperty('--sheet-h', `${SH}px`);

    washes = [FP.home, ...FP.abroad].map((c) => {
      const f = HOMES.get(c.id), m = mainPart(f);
      const lon = m ? d3.geoCentroid(m)[0] : c.ll[1];
      return makeWash(c, f, plateAt(lon));
    });
    plates.forEach(drawSea);
    drawInk();
    drawLabels();
    layWashes();
    shown = {};
    flightKeys();
    return true;
  }
  const flightKeys = () => EV.flight.forEach((e) => { e.key = null; });

  const fontsIn = Promise.race([
    Promise.all([
      document.fonts.load('400 120px "Playfair Display"', '0123456789%'),
      document.fonts.load('400 12px "Playfair Display"', 'UNITED STATES JAPAN PACIFIC OCEAN'),
      document.fonts.load('500 12px "Geist"', 'COUNTRIES FLIGHTS PHOTOGRAPHS of the world 195'),
      document.fonts.load('600 11px "Geist"', 'HOME'),
      document.fonts.load('400 12px "Noto Serif TC"', '日本美國中國台灣太平洋印度洋'),
      document.fonts.load('500 12px "Noto Sans TC"', '國家航程張照片全世界個的暑假年月'),
    ]).catch(() => null),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  Promise.all([FP.world('50m'), fontsIn]).then(([a]) => {
    atlas = a;
    // the land without Antarctica: the band stops short of it, and its rings would crowd the foot
    LAND = topojson.merge(a.topo, a.topo.objects.countries.geometries.filter((g) => g.id !== '010'));
    [FP.home, ...FP.abroad].forEach((c) => HOMES.set(c.id, homeland(c)));
    centre();
    PLAN = cutPlan();
    chooseTones();
    const go = () => {
      if (!render()) return false;
      started = true;
      if (STILL || SEEK != null) body.classList.add('is-held');
      requestAnimationFrame(() => body.classList.add('is-ready'));
      startClock();
      return true;
    };
    if (!go()) { // still hidden: try again when it has a size
      const again = () => { if (!started && go()) removeEventListener('resize', again); };
      addEventListener('resize', again);
    }
  });

  let rt = 0;
  const redraw = () => {
    if (!render()) return;
    paint(clock());
    if (!raf && SEEK == null && !STILL && clock() < EV.end) raf = requestAnimationFrame(loop);
  };
  addEventListener('resize', () => {
    if (!started) return;
    clearTimeout(rt);
    rt = setTimeout(redraw, STILL ? 0 : 140);
  });
  FP.onLang(() => {
    if (!started) return;
    stage.setAttribute('aria-label', FP.w.where);
    redraw();
  });
})();
