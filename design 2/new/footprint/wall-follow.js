/* Wall map, following each trip 跟著每一趟走 (footprint, round six, 2026-11-07).
   His brief, kept from round five: a big map with little white; three numbers (countries, flights,
   photographs) that count up; the landing starts with his countries uncoloured, and as the numbers
   climb the places he has been gain their colour and the flights are drawn quietly. "A ramp." Of the
   round-five versions he gave band and widen 3 of 5 ("I like the feeling of those").
   This version is widen's moving view, told trip by trip. The page opens close on Taiwan, home. For
   each trip of FP.ramp, oldest first, the view eases to frame that trip alone: Taiwan and the places
   the trip went (its new countries, its towns, its flights), so a trip to Japan comes back in close
   and a trip to Europe opens wide. It holds there for a beat while the trip's countries take their
   colour, its flights are drawn and the numbers step, then eases on to the next. After the last trip
   (August 2026, Vietnam) it pulls back to the whole world, edge to edge, and rests. About thirteen
   seconds; a click or a tap on the map while it moves takes everything on to the end together.
   - Each move is one eased path of scale and centre (d3's interpolateZoom, after van Wijk and Nuij), so
     a long move rises a little and comes down again rather than sliding across; one move at a time,
     never a jump, never a turn. A move takes as long as its change of scale and place asks, a beat as
     long as what the trip brings asks (new countries, flights), all fitted to the whole.
   - A small, quiet line on the numbers' words line names the trip being shown, its date and its
     countries, in both languages; when the view pulls back it reads the span of the years.
   - The map, the washes, the water-lining and the lettering are widen's: a Gall stereographic world
     centred on the Pacific, bolder's six earth washes bleeding in from where he landed, typeset's
     lettering. The whole United States takes its colour, Alaska and Hawaii too.
   - The three numbers stand large in the bottom left corner of the window and stay put while the map
     moves under them; every trip's frame keeps its places above them.
   - On a phone the window is tall, most of the screen, with the trip line and the numbers in a row
     under it. It rests on his part of the world round Taiwan, and can be dragged sideways to Europe
     and America (the line under it says so).
   - ?still and reduced motion show the end at once; ?at=<ms> holds one moment.
   - Pointing at one of his countries (tapping it on a phone, once the map rests) shows its note. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  const query = new URLSearchParams(location.search);
  if (query.get('lang') === 'zh' || query.get('lang') === 'en') FP.setLang(query.get('lang'));
  const AT = query.has('at') ? Math.max(0, parseFloat(query.get('at')) || 0) : null;
  const STILL = AT == null && (FP.still || FP.reduced);

  const stage = document.getElementById('stage');
  const body = document.body;
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const MASK = '#000'; // the stencil for shapes worked on off screen; never seen
  const INF = 1e20;
  const unit = (t, a, d) => (d <= 0 ? (t >= a ? 1 : 0) : clamp((t - a) / d, 0, 1));
  const inOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const spread = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 2.4)); // a wash running out into the paper

  /* ------------------------------------------------------------ the pace (ms) */

  const HOLD = 700; // the landing: close on Taiwan, his countries uncoloured, the numbers at 0
  const TOUR = 11200; // the sixteen trips, each a move and a beat
  const BACK = 1700; // the pull back to the whole world
  const BLEED = 900; // a country's wash running out from where he landed
  const NAME = 500; // its name being lettered in
  const SETTLE = 1000; // a flight's line settling to faint once drawn
  const SKIP = 900; // a click while it moves: everything eases on to the end together
  let K = 0; // how far such a skip has gone, 0 to 1
  let moving = false, dragging = false; // the view travelling (names then keep their places)
  const up = (x) => (K > 0 ? Math.max(x, K) : x); // a state lifted by the skip
  const glide = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * x)); // a move: slow away, slow in

  /* ------------------------------------------------------------ the projection */

  // Gall stereographic, centred on the Pacific: the sheet's edge runs down the Atlantic at 25°W
  const KG = 1 + Math.SQRT1_2;
  function gall(l, p) { return [l / Math.SQRT2, KG * Math.tan(p / 2)]; }
  gall.invert = (x, y) => [x * Math.SQRT2, 2 * Math.atan(y / KG)];
  const LON0 = 155;
  const U = 1000; // the unit sheet: x from -XR to XR, y down
  const projU = d3.geoProjection(gall).rotate([-LON0, 0]).scale(U).translate([0, 0]).precision(0);
  const XR = (Math.PI / Math.SQRT2) * U;
  const DEG = (Math.PI / 180 / Math.SQRT2) * U; // one degree of longitude
  const gy = (lat) => -KG * Math.tan((lat * Math.PI) / 360) * U;
  const latOfY = (y) => (-2 * Math.atan(y / (KG * U)) * 180) / Math.PI;
  const xOfLon = (lon) => ((((((lon - LON0) % 360) + 540) % 360) - 180) * DEG);

  /* ------------------------------------------------------------ small tools (as bolder has them) */

  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rand(n) { let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function hash2(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function noise(x, y, s, wrap = 0) { // smooth value noise, 0 to 1 (wrapping, for a tile, when asked)
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const W = (q) => (wrap ? ((q % wrap) + wrap) % wrap : q);
    const a = hash2(W(xi), W(yi), s), b = hash2(W(xi + 1), W(yi), s), c = hash2(W(xi), W(yi + 1), s), d = hash2(W(xi + 1), W(yi + 1), s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // squared distance to the nearest zero cell (Felzenszwalb and Huttenlocher), in place
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
  const overlap = (a, b, pad = 0) => a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
  const within = (a, b) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
  const join = (b, r) => (!b ? { ...r } : { x0: Math.min(b.x0, r.x0), y0: Math.min(b.y0, r.y0), x1: Math.max(b.x1, r.x1), y1: Math.max(b.y1, r.y1) });
  const ofView = (v) => ({ x0: v.x0, y0: v.y0, x1: v.x0 + v.w, y1: v.y0 + v.h });

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
  function tone(token, seed) { // each country turns its colour a little, from its own name
    const raw = cssVar(token);
    const m = raw.match(OKLCH);
    if (!m) return { css: raw, rgb: rgb(raw) };
    const L = +m[1] + (rand(seed) - 0.5) * 5;
    const C = +m[2] * (0.9 + rand(seed + 1) * 0.2);
    const H = +m[3] + (rand(seed + 2) - 0.5) * 12;
    const css = `oklch(${L.toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(1)})`;
    return { css, rgb: rgb(css) };
  }

  /* ------------------------------------------------------------ his countries, as lettered */

  const BIG = new Set(['usa', 'china', 'australia']);
  const SMALL = new Set(['netherlands', 'switzerland', 'andorra', 'dubai', 'singapore', 'hong-kong', 'myanmar']);
  // which side a name goes when it cannot sit inside its country, first choice first
  const SIDE = {
    taiwan: ['start', 'below', 'end'], japan: ['start', 'below', 'above'], 'south-korea': ['below', 'end', 'start'],
    'hong-kong': ['below', 'end', 'start'], vietnam: ['start', 'below', 'end'], thailand: ['below', 'end', 'start'],
    malaysia: ['below', 'start', 'end'], singapore: ['below', 'end', 'start'], myanmar: ['end', 'above', 'below'],
    uk: ['end', 'above', 'start'], netherlands: ['start', 'above', 'end'], germany: ['start', 'below', 'above'],
    france: ['end', 'below', 'start'], switzerland: ['below', 'start', 'end'], andorra: ['below', 'end', 'start'],
    spain: ['end', 'below', 'start'], dubai: ['below', 'end', 'start'], 'new-zealand': ['end', 'below', 'start'],
  };
  // the oceans, lettered lightly where the sea is open (typeset's; here on a sheet centred on the Pacific)
  const SEAS = [
    { id: 'pacific', at: [-138, 13], en: ['PACIFIC', 'OCEAN'], zh: ['太平洋'] },
    { id: 'indian', at: [80, -20], en: ['INDIAN', 'OCEAN'], zh: ['印度洋'] },
  ];

  /* ------------------------------------------------------------ the page */

  const sheet = document.createElement('div'); sheet.className = 'wf-sheet';
  const seaCv = document.createElement('canvas'); seaCv.className = 'wf-sea';
  const mapCv = document.createElement('canvas'); mapCv.className = 'wf-map';
  sheet.append(seaCv, mapCv);
  const figs = document.createElement('div'); figs.className = 'wf-figs'; figs.setAttribute('aria-hidden', 'true');
  figs.innerHTML = ['c', 'f', 'p'].map((k) => `<div class="wf-n wf-n--${k}"></div><p class="wf-w fp-label"></p>`).join('');
  const figN = [...figs.querySelectorAll('.wf-n')], figW = [...figs.querySelectorAll('.wf-w')];
  const sr = document.createElement('h1'); sr.className = 'wf-sr';
  const room = document.createElement('div'); room.className = 'wf-room';
  // the line naming the trip being shown (its words in a span of their own, measured for the paper cleared under them)
  const trip = document.createElement('p'); trip.className = 'wf-trip fp-label'; trip.setAttribute('aria-hidden', 'true');
  const tripIn = document.createElement('span'); trip.append(tripIn);
  stage.append(sheet, figs, trip, sr, room);
  stage.setAttribute('aria-label', FP.w.where);
  const mctx = mapCv.getContext('2d');
  const washCv = document.createElement('canvas'), wctx = washCv.getContext('2d');
  const hitCtx = document.createElement('canvas').getContext('2d');

  const TOTAL = FP.ramp[FP.ramp.length - 1];
  const finals = [TOTAL.countries, TOTAL.flightsSoFar, TOTAL.photos];

  let atlas = null, lite = null;
  let coastHi = null, coastLo = null, borderHi = null, borderLo = null, landPlain = null;
  let MINE = [], byId = new Map(), ARCS = [], DOTS = [];
  let G = null, P = null, cur = null, started = false;
  const placeByCity = new Map(FP.places.map((p) => [p.name.en, p]));

  /* ------------------------------------------------------------ the shapes, once */

  // a ring of points through a geoPath, kept for smoothing: the 50m coast is a little angular close in
  function recorder() {
    const rings = []; let cur2 = null;
    return { rings, moveTo(x, y) { cur2 = [[x, y]]; rings.push(cur2); }, lineTo(x, y) { cur2.push([x, y]); }, closePath() { if (cur2) cur2.closed = true; }, arc() {} };
  }
  function smooth(geo) {
    const rec = recorder();
    d3.geoPath(projU, rec)(geo);
    const p = new Path2D();
    for (const r of rec.rings) {
      const n = r.length;
      if (n < 2) continue;
      if (r.closed && n > 2) {
        const mid = (i) => { const a = r[(i + n) % n], b = r[(i + 1) % n]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
        const s = mid(0); p.moveTo(s[0], s[1]);
        for (let i = 1; i <= n; i++) { const q = r[i % n], e = mid(i); p.quadraticCurveTo(q[0], q[1], e[0], e[1]); }
        p.closePath();
      } else {
        p.moveTo(r[0][0], r[0][1]);
        for (let i = 1; i < n - 1; i++) p.quadraticCurveTo(r[i][0], r[i][1], (r[i][0] + r[i + 1][0]) / 2, (r[i][1] + r[i + 1][1]) / 2);
        p.lineTo(r[n - 1][0], r[n - 1][1]);
      }
    }
    return p;
  }
  const plain = (geo) => { const p = new Path2D(); d3.geoPath(projU, p)(geo); return p; };

  // a country as he knows it: the largest of the shapes the atlas numbers alike, without the far-off
  // pieces (French Guiana is France on paper, but he has not been to South America); the United States whole
  function homeland(c) {
    const all = atlas.features.filter((f) => f.id === c.iso);
    if (!all.length) return null;
    const f = all.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
    if (c.id === 'usa') return f; // the whole of it, Alaska and Hawaii too (his word, round six)
    if (f.geometry.type !== 'MultiPolygon') return f;
    const polys = f.geometry.coordinates.map((coordinates) => { const g = { type: 'Polygon', coordinates }; return { coordinates, a: d3.geoArea(g), c: d3.geoCentroid(g) }; });
    const main = polys.reduce((a, b) => (b.a > a.a ? b : a));
    const total = polys.reduce((s, q) => s + q.a, 0);
    const keep = polys.filter((q) => q.a / total > 0.15 || d3.geoDistance(q.c, main.c) * 6371 < 2300);
    return { type: 'Feature', id: f.id, properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: keep.map((q) => q.coordinates) } };
  }

  // where on a trip he first set foot in a country: the city he flew into, or a place of that trip there
  function entryOf(c, step) {
    for (const f of step.flights) { const p = placeByCity.get(f.to.city); if (p && p.country === c.id) return [f.to.lng, f.to.lat]; }
    const pl = FP.places.find((p) => p.country === c.id && p.journeys.includes(step.journey));
    if (pl) return [pl.ll[1], pl.ll[0]];
    const nm = FP.names()[c.iso];
    return nm ? nm.at : [c.ll[1], c.ll[0]];
  }

  // countries that touch, or lie a short sea apart, take different colours (as bolder chooses them)
  function chooseTones() {
    const geoms = atlas.topo.objects.countries.geometries;
    const nb = topojson.neighbors(geoms);
    const touch = new Map();
    geoms.forEach((g, i) => { const set = touch.get(g.id) || new Set(); nb[i].forEach((j) => set.add(geoms[j].id)); touch.set(g.id, set); });
    const outline = new Map(FP.abroad.map((c) => {
      const pts = [];
      atlas.features.filter((f) => f.id === c.iso).forEach((f) => {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
        polys.forEach((p) => p.forEach((ring) => ring.forEach((pt) => pts.push(pt))));
      });
      const step = Math.max(1, Math.floor(pts.length / 260));
      return [c.id, pts.filter((_, i) => i % step === 0).map(([x, y]) => [x * Math.PI / 180, y * Math.PI / 180])];
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
    const tones = new Map();
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
    return tones;
  }

  function prepare() {
    coastHi = smooth(atlas.land); borderHi = smooth(atlas.borders);
    coastLo = plain(atlas.land); borderLo = plain(atlas.borders);
    landPlain = coastLo;
    const tones = chooseTones();
    const names = FP.names();
    const geoPathU = d3.geoPath(projU);
    MINE = [FP.home, ...FP.abroad].map((c) => {
      const feat = homeland(c);
      const nm = names[c.iso];
      const at = nm ? nm.at : [c.ll[1], c.ll[0]];
      const b = feat ? geoPathU.bounds(feat) : null;
      const a = projU(at);
      const bU = b && Number.isFinite(b[0][0]) ? { x0: b[0][0], y0: b[0][1], x1: b[1][0], y1: b[1][1] } : { x0: a[0] - 4, y0: a[1] - 4, x1: a[0] + 4, y1: a[1] + 4 };
      // the piece of the country its name is set against: the one holding its label point, or the nearest
      // (the United States' name goes by the forty-eight states, not across the Aleutians)
      let nameU = bU;
      if (feat && feat.geometry.type === 'MultiPolygon') {
        const pieces = feat.geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }));
        const hit = pieces.find((g) => d3.geoContains(g, at)) || pieces.reduce((q, g) => (d3.geoDistance(d3.geoCentroid(g), at) < d3.geoDistance(d3.geoCentroid(q), at) ? g : q));
        const pb = geoPathU.bounds(hit);
        if (Number.isFinite(pb[0][0])) nameU = { x0: pb[0][0], y0: pb[0][1], x1: pb[1][0], y1: pb[1][1] };
      }
      return {
        c, id: c.id, home: c.home, feat, pathU: feat ? plain(feat) : null, bU, nameU, anchorU: a,
        area: feat ? geoPathU.area(feat) : 0, tone: tones.get(c.id),
        rank: c.home ? 0 : BIG.has(c.id) ? 1 : SMALL.has(c.id) ? 3 : 2,
        tb: c.home ? -Infinity : Infinity, entryU: null, wash: null, bleed: null, live: null,
      };
    });
    byId = new Map(MINE.map((m) => [m.id, m]));
    // the flights as fine arcs: the great circle, bowed a little toward the pole so every one reads as an arc
    ARCS = FP.flights.map((f) => {
      const ip = d3.geoInterpolate([f.from.lng, f.from.lat], [f.to.lng, f.to.lat]);
      const N = 72, pts = [];
      for (let i = 0; i <= N; i++) pts.push(projU(ip(i / N)));
      const [x0, y0] = pts[0], [x1, y1] = pts[N];
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
      let nx = dy / L, ny = -dx / L;
      if (ny > 0 || (Math.abs(ny) < 1e-6 && nx < 0)) { nx = -nx; ny = -ny; }
      const bow = L * 0.08 * (1 - clamp((L - 250) / 1100, 0, 1)); // a long flight's great circle is already an arc
      pts.forEach((p, i) => { const s = Math.sin((Math.PI * i) / N) * bow; p[0] += nx * s; p[1] += ny * s; });
      const len = [0];
      for (let i = 1; i <= N; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      let b = null; pts.forEach((p) => { b = join(b, { x0: p[0], y0: p[1], x1: p[0], y1: p[1] }); });
      const home = (p) => FP.km([p.lat, p.lng], FP.home.ll) < 60;
      return { f, pts, len, total: len[N], bU: b, homeFrom: home(f.from), homeTo: home(f.to), t0: Infinity, dur: 0 };
    });
  }

  /* ------------------------------------------------------------ the window: the frame and the numbers */

  // the three numbers at type size F1; their box, for keeping the corner clear
  function setFigs(F1) {
    figs.style.setProperty('--f', `${F1.toFixed(1)}px`);
    showFigures(finals, true); // measured at their widest
    const r = figs.getBoundingClientRect();
    // each column: its figures' ink (the line box drawn in to the lining figures) and the word under them
    const cols = figN.map((n, i) => {
      const a = n.getBoundingClientRect(), b = figW[i].getBoundingClientRect(), fs = parseFloat(getComputedStyle(n).fontSize);
      const x0 = Math.min(a.left, b.left), x1 = Math.max(a.right, b.right), y0 = a.top + fs * 0.2;
      return { dx: x0 - r.left, dy: y0 - r.top, w: x1 - x0, h: b.bottom - y0 };
    });
    // the trip line goes on the words' line, after the last column
    const lw = figW[2].getBoundingClientRect();
    return { w: r.width, h: r.height, cols, wy: lw.top - r.top, wx: cols[2].dx + cols[2].w };
  }

  // the trip line at its widest, and (on a phone, where it may take two lines) its tallest, in either language
  function measureTrip(narrow, width) {
    trip.classList.toggle('is-wrap', narrow);
    if (narrow) trip.style.setProperty('--tw', `${Math.floor(width)}px`); else trip.style.removeProperty('--tw');
    let wmax = 0, hmax = 0;
    ['en', 'zh'].forEach((l) => tripLines(narrow, l).forEach((s) => {
      tripIn.textContent = s;
      wmax = Math.max(wmax, tripIn.getBoundingClientRect().width);
      hmax = Math.max(hmax, trip.getBoundingClientRect().height);
    }));
    tripIn.textContent = shownTrip;
    return { w: Math.ceil(wmax), h: Math.ceil(hmax) };
  }

  function solve() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 120 || h < 160) return null;
    const narrow = w < 640;
    const top = 58;
    let W0, sf, F, F1, fb, fig, tb, at, clear = null, band = 0, roomH = 0;
    if (!narrow) {
      const side = clamp(w * 0.018, 14, 28);
      const bottom = clamp(h * 0.014, 8, 14);
      const availW = w - 2 * side, availH = h - top - bottom;
      // the latitudes that fill the window (widen's): from 80°N and 62°S the band grows (to 84°N, 68°S) for
      // a taller window and shrinks (to 72°N, 56°S) for a wider one, both edges together
      const need = (2 * XR) / (availW / availH), base = gy(-62) - gy(80);
      const [n1, s1] = need > base ? [84, -68] : [72, -56];
      const f = clamp((need - base) / (gy(s1) - gy(n1) - base), 0, 1);
      const north = latOfY(lerp(gy(80), gy(n1), f)), south = latOfY(lerp(gy(-62), gy(s1), f));
      W0 = { x0: -XR, y0: gy(north), w: 2 * XR, h: gy(south) - gy(north) };
      sf = Math.min(availW / W0.w, availH / W0.h); // css px per unit, at rest
      F = { w: W0.w * sf, h: W0.h * sf, x: 0, y: 0 };
      F.x = side + (availW - F.w) / 2;
      F.y = top + (availH - F.h) / 2;
      // the numbers as large as the corner allows: clear of land when the view rests on the world
      const land = landRaster(W0, F, sf);
      const pad = clamp(F.w * 0.016, 14, 26);
      const colsAt = (b) => b.cols.map((q) => ({ x: F.x + pad + q.dx, y: F.y + F.h - pad - b.h + q.dy, w: q.w, h: q.h }));
      F1 = Math.min(F.h * 0.2, F.w * 0.11);
      for (let i = 0; i < 24; i++) {
        fb = setFigs(F1);
        if (!colsAt(fb).some((r) => land(r, 16)) || F1 < 46) break;
        F1 *= 0.95;
      }
      fig = { x: F.x + pad, y: F.y + F.h - pad - fb.h, w: fb.w, h: fb.h };
      // the paper cleared round them: each column, and one band under the shortest, so no strip of map shows between
      const cols = colsAt(fb).map((r) => ({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 10 }));
      const low = Math.max(...cols.map((r) => r.y)), x0 = Math.min(...cols.map((r) => r.x)), x1 = Math.max(...cols.map((r) => r.x + r.w));
      clear = cols.concat([{ x: x0, y: low, w: x1 - x0, h: Math.max(...cols.map((r) => r.y + r.h)) - low }]);
      band = (F.y + F.h - Math.min(...clear.map((r) => r.y)) + 10) / F.h; // every trip's frame keeps its places above it
      // the trip line on the words' line, after the photographs
      tb = measureTrip(false);
      at = { x: fig.x + fb.wx + Math.max(26, F1 * 0.34), y: fig.y + fb.wy };
    } else {
      // a phone: the window tall, most of the screen; under it the trip line, then the numbers in a row
      const side = 10;
      W0 = { x0: -XR, y0: gy(86), w: 2 * XR, h: gy(-86) - gy(86) }; // the whole sheet the view may travel
      F1 = Math.min(120, w * 0.3);
      for (let i = 0; i < 24; i++) { fb = setFigs(F1); if (fb.w <= w - 32 || F1 < 34) break; F1 *= 0.96; }
      tb = measureTrip(true, w - 32);
      const gapA = 14, gapB = 22, foot = 22;
      const Fw = w - 2 * side;
      const avail = h - top - 4 - gapA - tb.h - gapB - fb.h - foot;
      F = { x: side, y: top + 4, w: Fw, h: Math.round(clamp(avail, Fw * 0.62, Fw * 1.45)) };
      sf = F.w / W0.w;
      at = { x: 16, y: F.y + F.h + gapA };
      fig = { x: 16, y: at.y + tb.h + gapB, w: fb.w, h: fb.h };
      roomH = fig.y + fig.h + foot;
    }
    const k = clamp(F.w / 1380, 0.7, 1.15); // the lettering's scale
    const sp = clamp(F.w / 1380, 0.66, 1.1); // the water-lines' spacing
    return { w, h, narrow, W0, sf, F, k, sp, F1, fig, tb, tripAt: at, base: clear, clear, band, roomH };
  }

  // the land of the world at rest, drawn once small, to say whether a box on the screen covers any
  function landRaster(W0, F, sf) {
    const q = 0.5;
    const cw = Math.ceil(F.w * q), ch = Math.ceil(F.h * q);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(sf * q, 0, 0, sf * q, -W0.x0 * sf * q, -W0.y0 * sf * q);
    ctx.fillStyle = MASK;
    const polys = [];
    const take = (g) => { if (!g) return; if (g.type === 'FeatureCollection') g.features.forEach(take); else if (g.type === 'Feature') take(g.geometry); else if (g.type === 'GeometryCollection') g.geometries.forEach(take); else if (g.type === 'Polygon') polys.push(g.coordinates); else if (g.type === 'MultiPolygon') polys.push(...g.coordinates); };
    take(lite.land);
    const big = { type: 'MultiPolygon', coordinates: polys.filter((c) => d3.geoArea({ type: 'Polygon', coordinates: c }) > 0.001) };
    const p = new Path2D(); d3.geoPath(projU, p)(big); ctx.fill(p);
    const d = ctx.getImageData(0, 0, cw, ch).data;
    return (r, m) => {
      const x0 = clamp(Math.floor((r.x - m - F.x) * q), 0, cw), x1 = clamp(Math.ceil((r.x + r.w + m - F.x) * q), 0, cw);
      const y0 = clamp(Math.floor((r.y - m - F.y) * q), 0, ch), y1 = clamp(Math.ceil((r.y + r.h + m - F.y) * q), 0, ch);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (d[(y * cw + x) * 4 + 3] > 60) return true;
      return false;
    };
  }

  /* ------------------------------------------------------------ the plan: a frame for each trip, the moves between, the times */

  const zoomer = d3.interpolateZoom.rho(1.2);
  const cen = (v) => [v.x0 + v.w / 2, v.y0 + v.h / 2, v.w];
  // a view kept on the sheet: no wider than it, slid back inside it (one taller than it is centred on it)
  function keep(v) {
    const W0 = G.W0, A = G.F.w / G.F.h;
    const w = Math.min(v.w, W0.w), h = w / A;
    const cx = v.x0 + v.w / 2, cy = v.y0 + v.h / 2;
    const x0 = clamp(cx - w / 2, W0.x0, W0.x0 + W0.w - w);
    const y0 = h >= W0.h ? W0.y0 + (W0.h - h) / 2 : clamp(cy - h / 2, W0.y0, W0.y0 + W0.h - h);
    return { x0, y0, w, h };
  }
  function pathView(p, e) { const [cx, cy, w] = p(e), h = (w * G.F.h) / G.F.w; return keep({ x0: cx - w / 2, y0: cy - h / 2, w, h }); }

  // a phone's resting view: his part of the world round Taiwan, from the north of Europe to the south of
  // New Zealand in height, as wide as the tall window then allows, slid to hold the most of his countries
  function restView(A, tt) {
    const W0 = G.W0;
    let h = gy(-50) - gy(64), w = h * A;
    if (w > W0.w) { w = W0.w; h = w / A; }
    let best = null;
    for (let x0 = W0.x0; x0 <= W0.x0 + W0.w - w; x0 += DEG) {
      const tx = (tt[0] - x0) / w;
      if (tx < 0.3 || tx > 0.7) continue;
      const nIn = MINE.filter((m) => m.anchorU[0] > x0 + w * 0.05 && m.anchorU[0] < x0 + w * 0.95).length;
      const score = nIn - Math.abs(tx - 0.5);
      if (!best || score > best.score) best = { x0, score };
    }
    return keep({ x0: best ? best.x0 : tt[0] - w / 2, y0: (gy(64) + gy(-50)) / 2 - h / 2, w, h });
  }

  function plan() {
    const { W0, F, band, narrow } = G;
    const A = F.w / F.h;
    const room = narrow ? 1 : 1 - band; // the part of the window above the numbers
    const n = FP.ramp.length;
    const tt = projU([121.0, 23.7]);
    const MINW = DEG * (narrow ? 22 : 30);
    // what a trip touched: Taiwan, its new countries, the towns it went to, its flights
    const ptU = (ll) => { const p = projU([ll[1], ll[0]]); return { x0: p[0], y0: p[1], x1: p[0], y1: p[1] }; };
    const content = (st) => {
      let b = { ...byId.get(FP.home.id).bU };
      st.fresh.forEach((c) => { const m = byId.get(c.id); if (m) b = join(b, m.nameU); });
      FP.places.forEach((p) => { if (p.journeys.includes(st.journey)) b = join(b, ptU(p.ll)); });
      st.flights.forEach((f) => { const a = ARCS.find((x) => x.f === f); if (a) b = join(b, a.bU); });
      return b;
    };
    // its frame: that, with a margin, centred in the part of the window above the numbers
    const frame = (C) => {
      const m = 0.05 * Math.max(C.x1 - C.x0, C.y1 - C.y0) + DEG * 1.8;
      const c = { x0: C.x0 - m, y0: C.y0 - m, x1: C.x1 + m, y1: C.y1 + m };
      const w = Math.max(c.x1 - c.x0, ((c.y1 - c.y0) / room) * A, MINW), h = w / A;
      return keep({ x0: (c.x0 + c.x1) / 2 - w / 2, y0: (c.y0 + c.y1) / 2 - (room * h) / 2, w, h });
    };
    // the first view, close on Taiwan; one frame per trip; then the whole world (on a phone, his part of it)
    const w0 = MINW * 0.92, h0 = w0 / A;
    const V = [keep({ x0: tt[0] - w0 / 2, y0: tt[1] - (room * h0) / 2, w: w0, h: h0 })];
    FP.ramp.forEach((st) => V.push(frame(content(st))));
    V.push(narrow ? restView(A, tt) : { ...W0 });
    const paths = V.slice(0, -1).map((v, i) => zoomer(cen(v), cen(V[i + 1])));
    // each trip's time: its move as long as its change of scale and place asks, its beat as long as what it brings asks
    const mw = FP.ramp.map((st, i) => 0.5 + 0.42 * (paths[i].duration / 1000));
    const bw = FP.ramp.map((st) => 0.28 + 0.08 * st.fresh.length + 0.03 * st.flights.length);
    const k2 = TOUR / (mw.reduce((a, b) => a + b, 0) + bw.reduce((a, b) => a + b, 0));
    const M = mw.map((x) => x * k2), B = bw.map((x) => x * k2);
    const T0 = [];
    let t = HOLD;
    for (let i = 0; i < n; i++) { T0.push(t); t += M[i] + B[i]; }
    P = { V, paths, T0, M, B, n, A, backAt: t, viewEnd: t + BACK, REST: V[n + 1] };

    // the ramp: when the view has come to a trip's frame its new countries take their colour, one after
    // another, its flights are drawn like a pen, and the counts climb with them
    const inc = { c: [], f: [], p: [] };
    if (FP.home.photos) inc.p.push({ t0: HOLD * 0.35, dur: 520, n: FP.home.photos });
    MINE.forEach((m) => { if (!m.home) { m.tb = Infinity; m.wash = null; m.bleed = null; m.live = null; } });
    ARCS.forEach((a) => { a.t0 = Infinity; });
    FP.ramp.forEach((st, i) => {
      const ta = T0[i] + M[i];
      const gapJ = Math.min(220, (0.55 * B[i]) / Math.max(1, st.fresh.length));
      st.fresh.forEach((c, j) => {
        const m = byId.get(c.id);
        if (!m) return;
        m.tb = ta - 0.16 * M[i] + j * gapJ;
        m.entryU = projU(entryOf(c, st));
        inc.c.push({ t0: m.tb + 60, dur: 320, n: 1 });
        if (c.photos) inc.p.push({ t0: m.tb + 160, dur: 560, n: c.photos });
      });
      const gapK = Math.min(150, (0.6 * B[i]) / Math.max(1, st.flights.length));
      st.flights.forEach((f, k) => {
        const a = ARCS.find((x) => x.f === f);
        if (!a) return;
        a.dur = clamp(380 + f.km * 0.03, 420, 760);
        a.t0 = ta - 0.1 * M[i] + k * gapK;
        inc.f.push({ t0: a.t0 + a.dur - 220, dur: 260, n: 1 });
      });
    });
    P.inc = inc;
    // the places he landed: a small dot as the pen first reaches them, or leaves them
    const dots = new Map();
    ARCS.forEach((a) => {
      if (!Number.isFinite(a.t0)) return;
      const ends = [[a.f.from, a.pts[0], a.t0, a.homeFrom], [a.f.to, a.pts[a.pts.length - 1], a.t0 + a.dur, a.homeTo]];
      ends.forEach(([p, u, tt2, home]) => {
        if (home) return;
        const d = dots.get(p.city);
        if (!d || tt2 < d.t) dots.set(p.city, { u, t: tt2 });
      });
    });
    DOTS = [...dots.values()];
    const ends = [P.viewEnd + 700]; // and a moment at rest for the names to settle where they read best
    MINE.forEach((m) => { if (Number.isFinite(m.tb)) ends.push(m.tb + BLEED, m.tb + BLEED * 0.3 + NAME); });
    ARCS.forEach((a) => { if (Number.isFinite(a.t0)) ends.push(a.t0 + a.dur + SETTLE); });
    Object.values(inc).forEach((l) => l.forEach((x) => ends.push(x.t0 + x.dur)));
    P.END = Math.max(...ends) + 120;
  }

  // whether the view is travelling at a moment (names keep their places while it does)
  function inMove(t) {
    if (K > 0 || dragging) return true;
    for (let i = 0; i < P.n; i++) if (t >= P.T0[i] && t < P.T0[i] + P.M[i]) return true;
    return t >= P.backAt && t < P.viewEnd;
  }
  // the view at a moment: held on a frame through its beat, then one eased path to the next
  function viewAt(t) {
    if (K > 0) return pathView(P.skip, glide(K));
    const { V, paths, T0, M, n } = P;
    for (let i = 0; i < n; i++) {
      if (t < T0[i]) return V[i];
      if (t < T0[i] + M[i]) return pathView(paths[i], glide((t - T0[i]) / M[i]));
    }
    if (t < P.backAt) return V[n];
    if (t < P.viewEnd) return pathView(paths[n], glide((t - P.backAt) / BACK));
    return P.REST;
  }
  const countAt = (list, t) => Math.round(list.reduce((s, x) => s + x.n * up(inOut(unit(t, x.t0, x.dur))), 0));
  // the trip being shown: named halfway through the move to it; from early in the pull back, the span of the years
  function tripOf(t) {
    if (K > 0 || t >= P.backAt + 0.25 * BACK) return 'end';
    let k2 = -1;
    for (let i = 0; i < P.n; i++) if (t >= P.T0[i] + 0.5 * P.M[i]) k2 = i;
    return k2;
  }

  /* ------------------------------------------------------------ the washes (bolder's, laid on the unit sheet) */

  // one sheet of wash per country, made at the scale it is first seen coloured: the shape a little off
  // the line, the edge uneven, pigment pooled along it, mottled in the middle (the paper's tooth is laid
  // over all of them on the screen)
  function makeWash(m, s1) {
    const col = m.tone.rgb, seed = hashStr(m.id) & 0xffff;
    let R = s1 * DPR; // texture px per unit
    const padU = 4 / s1;
    const bx0 = m.bU.x0 - padU, by0 = m.bU.y0 - padU, bw = m.bU.x1 - m.bU.x0 + 2 * padU, bh = m.bU.y1 - m.bU.y0 + 2 * padU;
    if (Math.max(bw, bh) * R > 2048) R = 2048 / Math.max(bw, bh);
    const w = Math.max(2, Math.ceil(bw * R)), h = Math.max(2, Math.ceil(bh * R));
    const lift = s1 / R; // css px (as first seen) per texture px
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const off = [((rand(seed) - 0.5) * 2.2) / s1, ((rand(seed + 9) - 0.5) * 2.2) / s1]; // the colourist's hand, a little off
    ctx.setTransform(R, 0, 0, R, (-bx0 + off[0]) * R, (-by0 + off[1]) * R);
    ctx.fillStyle = MASK;
    if (m.pathU) ctx.fill(m.pathU);
    const img = ctx.getImageData(0, 0, w, h), px = img.data, N = w * h;
    const din = new Float64Array(N), dout = new Float64Array(N);
    for (let i = 0; i < N; i++) { const inside = px[i * 4 + 3] >= 128; din[i] = inside ? INF : 0; dout[i] = inside ? 0 : INF; }
    edt(din, w, h); edt(dout, w, h);
    const [r, gg, bb] = col;
    const gx0 = bx0 * s1, gy0 = by0 * s1;
    for (let y = 0, i = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i++) {
        const a = px[i * 4 + 3] / 255;
        let sd = a > 0.02 && a < 0.98 ? a - 0.5 : a >= 0.5 ? Math.sqrt(din[i]) - 0.5 : 0.5 - Math.sqrt(dout[i]);
        sd *= lift;
        if (sd < -2.5) { px[i * 4 + 3] = 0; continue; }
        const gx = gx0 + x * lift, gy2 = gy0 + y * lift;
        const ne = noise(gx / 5.5, gy2 / 5.5, seed) * 0.65 + noise(gx / 1.9, gy2 / 1.9, seed + 7) * 0.35;
        const e = sd + (ne - 0.5) * 1.9 + 0.15;
        const cov = clamp(e / lift + 0.5, 0, 1);
        if (cov <= 0) { px[i * 4 + 3] = 0; continue; }
        const pool = Math.exp(-Math.max(e, 0) / 1.25);
        const mott = noise(gx / 24, gy2 / 24, seed + 3) * 0.6 + noise(gx / 8, gy2 / 8, seed + 5) * 0.4;
        const al = 0.62 + 0.18 * mott + 0.3 * pool;
        const dk = 1 - 0.2 * pool;
        px[i * 4] = r * dk; px[i * 4 + 1] = gg * dk; px[i * 4 + 2] = bb * dk;
        px[i * 4 + 3] = clamp(cov * al, 0, 1) * 255;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(img, 0, 0);
    m.wash = { cv, x: bx0, y: by0, w: w / R, h: h / R, R };
    if (m.home) return;
    // the order the wash reaches each part: out from where he landed, its front a little uneven, the same every time
    const q = clamp(Math.ceil(Math.max(w, h) / 200), 1, 6);
    const qw = Math.ceil(w / q), qh = Math.ceil(h / q);
    const ex = (m.entryU[0] - bx0) * R, ey = (m.entryU[1] - by0) * R;
    const tm = new Float32Array(qw * qh);
    let far = 1;
    for (let y = 0; y < qh; y++) for (let x = 0; x < qw; x++) {
      const sx = Math.min(w - 1, x * q + (q >> 1)), sy = Math.min(h - 1, y * q + (q >> 1));
      const d = Math.hypot(sx - ex, sy - ey);
      tm[y * qw + x] = d;
      if (px[(sy * w + sx) * 4 + 3] > 8 && d > far) far = d;
    }
    for (let y = 0; y < qh; y++) for (let x = 0; x < qw; x++) {
      const i = y * qw + x;
      tm[i] = (0.8 * tm[i]) / far + 0.2 * noise(((x * q) * lift + gx0) / 38, ((y * q) * lift + gy0) / 38, seed + 21);
    }
    const mcv = document.createElement('canvas'); mcv.width = qw; mcv.height = qh;
    const mc = mcv.getContext('2d');
    m.bleed = { tm, cv: mcv, ctx: mc, img: mc.createImageData(qw, qh) };
    const lv = document.createElement('canvas'); lv.width = w; lv.height = h;
    m.live = lv;
  }
  // the wash part way out: the sheet masked by how far the colour has run
  function bleeding(m, p) {
    const B = m.bleed, data = B.img.data, a = 1.25 * p;
    for (let i = 0; i < B.tm.length; i++) data[i * 4 + 3] = 255 * clamp((a - B.tm[i]) / 0.25, 0, 1);
    B.ctx.putImageData(B.img, 0, 0);
    const lc = m.live.getContext('2d');
    lc.globalCompositeOperation = 'copy'; lc.imageSmoothingEnabled = true;
    lc.drawImage(B.cv, 0, 0, m.live.width, m.live.height);
    lc.globalCompositeOperation = 'source-in';
    lc.drawImage(m.wash.cv, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    return m.live;
  }

  // the paper's tooth: a small tile of fine noise, rubbed out of the washes on the screen
  let tooth = null;
  function makeTooth() {
    const S = 184, cells = 160; // 1.15 css px a cell, wrapping
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const n = noise((x / S) * cells, (y / S) * cells, 4242, cells);
      img.data[(y * S + x) * 4 + 3] = 255 * 0.3 * n * n * n;
    }
    ctx.putImageData(img, 0, 0);
    tooth = wctx.createPattern(cv, 'repeat');
  }

  /* ------------------------------------------------------------ the water-lining, on the graphics card */

  // bolder's water-lines (rings at a set distance from every coast, closer near the shore, fading out
  // to sea), drawn from a distance field on the sheet, so their spacing stays the same on the screen
  // while the view widens. Three fields, finer close in.
  const sea = { gl: null };
  const VS = '#version 300 es\nin vec2 pos; void main() { gl_Position = vec4(pos, 0.0, 1.0); }';
  const FS = `#version 300 es
precision highp float;
uniform sampler2D tA, tB, tC, tD;
uniform vec4 rA, rB, rC, rD;
uniform vec4 clr[6];
uniform vec3 view, col;
uniform vec2 lev, soft, has;
uniform float H, zoom, dpr, sp, lines, clearOn;
out vec4 o;
bool inR(vec2 u, vec4 r) { return u.x >= r.x && u.y >= r.y && u.x <= r.z && u.y <= r.w; }
vec2 uvR(vec2 u, vec4 r) { return (u - r.xy) / (r.zw - r.xy); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, H - gl_FragCoord.y);
  vec2 u = (p - view.xy) / view.z;
  float D;
  if (has.x > 0.5 && zoom >= lev.x && inR(u, rA)) D = texture(tA, uvR(u, rA)).r;
  else if (has.y > 0.5 && zoom >= lev.y && inR(u, rB)) D = texture(tB, uvR(u, rB)).r;
  else D = texture(tC, uvR(u, rC)).r;
  float d = D * view.z / dpr;
  if (d <= 0.0) discard;
  float a = 0.16 * sp, b = 2.35 * sp, c = 1.7 * sp;
  float fi = (-b + sqrt(max(b * b - 4.0 * a * (c - d), 0.0))) / (2.0 * a);
  float i = floor(fi + 0.5);
  if (i < 0.0 || i > lines - 1.0) discard;
  float ri = c + b * i + a * i * i;
  float dist = abs(d - ri) * dpr;
  float cov = clamp(0.275 * dpr + 0.5 - dist, 0.0, 1.0);
  float al = 0.66 * pow(1.0 - i / lines, 1.4) * cov;
  float den = texture(tD, uvR(u, rD)).r;
  float near = 0.6 * exp(-d / (5.5 * sp));
  al *= clamp(max(near, pow(clamp(den / 0.045, 0.0, 1.0), 0.8)), 0.0, 1.0);
  if (clearOn > 0.5) {
    float g = 1.0;
    for (int k = 0; k < 6; k++) { vec2 q = max(max(clr[k].xy - p, p - clr[k].zw), 0.0); g = min(g, smoothstep(soft.x, soft.x + soft.y, length(q))); }
    al *= g;
  }
  float lat = degrees(-2.0 * atan(u.y / (${KG.toFixed(6)} * ${U.toFixed(1)})));
  al *= 1.0 - 0.6 * smoothstep(62.0, 80.0, abs(lat)); // the polar seas left plainer, as the old plates have them
  o = vec4(col * al, al);
}`;
  function initSea() {
    const gl = seaCv.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return; }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'pos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    const u = {};
    ['tA', 'tB', 'tC', 'tD', 'rA', 'rB', 'rC', 'rD', 'clr[0]', 'view', 'col', 'lev', 'soft', 'has', 'H', 'zoom', 'dpr', 'sp', 'lines', 'clearOn'].forEach((n) => { u[n] = gl.getUniformLocation(prog, n); });
    u.clr = u['clr[0]'];
    gl.uniform1i(u.tA, 0); gl.uniform1i(u.tB, 1); gl.uniform1i(u.tC, 2); gl.uniform1i(u.tD, 3);
    sea.gl = gl; sea.u = u; sea.prog = prog;
    sea.blank = upload(new Float32Array([0]), 1, 1);
    seaCv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); sea.gl = null; });
  }
  function upload(data, w, h) {
    const gl = sea.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  // the land drawn on a grid over a part of the sheet; then each sea cell's distance to the nearest coast, in units
  function rasterLand(rect, texel, cap) {
    let tw = Math.ceil(rect.w / texel), th = Math.ceil(rect.h / texel);
    if (Math.max(tw, th) > cap) { texel *= Math.max(tw, th) / cap; tw = Math.ceil(rect.w / texel); th = Math.ceil(rect.h / texel); }
    const cv = document.createElement('canvas'); cv.width = tw; cv.height = th;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(1 / texel, 0, 0, 1 / texel, -rect.x0 / texel, -rect.y0 / texel);
    ctx.fillStyle = MASK; ctx.fill(landPlain);
    return { d: ctx.getImageData(0, 0, tw, th).data, tw, th, texel, rect: [rect.x0, rect.y0, rect.x0 + tw * texel, rect.y0 + th * texel] };
  }
  function field(rect, texel, cap = 3072) {
    const L = rasterLand(rect, texel, cap);
    const g = new Float32Array(L.tw * L.th);
    for (let i = 0; i < g.length; i++) g[i] = L.d[i * 4 + 3] > 127 ? 0 : INF;
    edt(g, L.tw, L.th);
    for (let i = 0; i < g.length; i++) g[i] = g[i] > 0 ? Math.min(6e4, Math.max(0.02, Math.sqrt(g[i]) - 0.5) * L.texel) : 0;
    return { tex: upload(g, L.tw, L.th), rect: L.rect };
  }
  // an island alone in the ocean keeps two or three rings; a long coast keeps them all
  function density() {
    const W0 = G.W0, texel = 4 / G.sf, padU = 60 / G.sf;
    const L = rasterLand({ x0: W0.x0 - padU, y0: W0.y0 - padU, w: W0.w + 2 * padU, h: W0.h + 2 * padU }, texel, 2048);
    const g = new Float32Array(L.tw * L.th);
    for (let i = 0; i < g.length; i++) g[i] = L.d[i * 4 + 3] > 110 ? 1 : 0;
    blur(g, L.tw, L.th, Math.round(38 / 4));
    return { tex: upload(g, L.tw, L.th), rect: L.rect };
  }
  // the parts of the sheet seen at each band of zoom, each with a grid fine enough for it, and when each is first wanted
  function seaLevels() {
    const { W0, sf } = G;
    const seen = [];
    for (let t = 0; t <= P.viewEnd + 16; t += 16) { const v = viewAt(t); seen.push({ t, v, z: W0.w / v.w }); }
    const z0 = Math.max(...seen.map((q) => q.z));
    const zA = Math.max(1.3, z0 * 0.55), zB = Math.max(1, zA * 0.45);
    const pad = (z) => (56 * G.sp) / (z * sf);
    const grow = (b, p) => { const x0 = Math.max(W0.x0 - p, b.x0 - p), y0 = Math.max(W0.y0 - p, b.y0 - p); return { x0, y0, w: Math.min(W0.x0 + W0.w + p, b.x1 + p) - x0, h: Math.min(W0.y0 + W0.h + p, b.y1 + p) - y0 }; };
    const zr = W0.w / P.REST.w;
    const band = (lo, hi) => {
      let b = null, at = Infinity;
      seen.forEach((q) => { if (q.z >= lo && q.z < hi) { b = join(b, ofView(q.v)); at = Math.min(at, q.t); } });
      // on a phone the resting view may be dragged the length of the sheet
      if (G.narrow && zr >= lo && zr < hi) { b = join(b, { x0: W0.x0, y0: P.REST.y0, x1: W0.x0 + W0.w, y1: P.REST.y0 + P.REST.h }); at = Math.min(at, P.viewEnd); }
      return { b, at };
    };
    const a = band(zA, Infinity), b = band(zB, zA), c = band(0, zB);
    const want = [];
    if (a.b) want.push(['A', grow(a.b, pad(zA)), 1.25 / (z0 * sf), a.at, 3072]);
    if (b.b) want.push(['B', grow(b.b, pad(zB)), 1.25 / (zA * sf), b.at, 2048]);
    want.push(['C', grow(ofView(W0), pad(1)), 1.25 / (zB * sf), Math.min(c.at, P.viewEnd), 2048]);
    return { zA, zB, want };
  }
  function drawSea(c) {
    const gl = sea.gl;
    if (!gl || !sea.C) return;
    const u = sea.u, F = G.F;
    gl.viewport(0, 0, seaCv.width, seaCv.height);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(Math.floor(F.x * DPR), Math.floor(seaCv.height - (F.y + F.h) * DPR), Math.ceil(F.w * DPR), Math.ceil(F.h * DPR));
    gl.useProgram(sea.prog);
    const bind = (unitN, lv) => { gl.activeTexture(gl.TEXTURE0 + unitN); gl.bindTexture(gl.TEXTURE_2D, lv ? lv.tex : sea.blank); };
    bind(0, sea.A); bind(1, sea.B); bind(2, sea.C); bind(3, sea.D);
    const r4 = (lv) => (lv ? lv.rect : [0, 0, 1, 1]);
    gl.uniform4fv(u.rA, r4(sea.A)); gl.uniform4fv(u.rB, r4(sea.B)); gl.uniform4fv(u.rC, r4(sea.C)); gl.uniform4fv(u.rD, r4(sea.D));
    gl.uniform2f(u.has, sea.A ? 1 : 0, sea.B ? 1 : 0);
    gl.uniform2f(u.lev, sea.zA, sea.zB);
    gl.uniform3f(u.view, c.ox * DPR, c.oy * DPR, c.s * DPR);
    gl.uniform1f(u.H, seaCv.height); gl.uniform1f(u.zoom, c.z); gl.uniform1f(u.dpr, DPR);
    gl.uniform1f(u.sp, G.sp); gl.uniform1f(u.lines, G.narrow ? 8 : 12);
    gl.uniform3fv(u.col, sea.col);
    const cl = G.clear;
    gl.uniform1f(u.clearOn, cl ? 1 : 0);
    if (cl) {
      const arr = new Float32Array(24);
      for (let k = 0; k < 6; k++) { const r = cl[Math.min(k, cl.length - 1)]; arr.set([r.x * DPR, r.y * DPR, (r.x + r.w) * DPR, (r.y + r.h) * DPR], k * 4); }
      gl.uniform4fv(u.clr, arr); gl.uniform2f(u.soft, 4 * DPR, 22 * DPR);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ------------------------------------------------------------ the lettering (typeset's) */

  const canLS = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;
  function spaced(ctx, s, ls) { // the width of a spaced line, without the space after its last letter
    if (canLS) { ctx.letterSpacing = `${ls}px`; const w = ctx.measureText(s).width - ls; ctx.letterSpacing = '0px'; return w; }
    let w = 0; for (const ch of s) w += ctx.measureText(ch).width + ls;
    return w - ls;
  }
  function spacedText(ctx, s, x, y, ls, halo) {
    if (canLS) {
      ctx.letterSpacing = `${ls}px`;
      if (halo) ctx.strokeText(s, x, y);
      ctx.fillText(s, x, y);
      ctx.letterSpacing = '0px';
      return;
    }
    for (const ch of s) { if (halo) ctx.strokeText(ch, x, y); ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + ls; }
  }
  const SERIF = '"Playfair Display", "Noto Serif TC", serif';
  // a country's lettering: its name in spaced capitals by size, then its year (home: its word, in clay)
  function styleOf(m) {
    const k = G.k, zh = FP.lang === 'zh';
    const size = m.rank === 1 ? 'l' : m.rank === 3 ? 's' : 'm';
    const fs = zh ? { l: 13.5, m: 11, s: 10 }[size] * k : { l: 12.5, m: 10.5, s: 9.25 }[size] * k;
    const em = zh ? { l: 0.22, m: 0.1, s: 0.08 }[size] : { l: 0.24, m: 0.16, s: 0.12 }[size];
    return { fs: Math.max(zh ? 9.6 : 8.6, fs), ls: Math.max(zh ? 9.6 : 8.6, fs) * (m.home ? (zh ? 0.12 : 0.18) : em), size };
  }
  const metrics = new Map();
  function measure(m) {
    const key = `${FP.lang}|${m.id}|${G.k}`;
    if (metrics.has(key)) return metrics.get(key);
    const ctx = mctx, zh = FP.lang === 'zh', st = styleOf(m);
    const name = m.home ? m.c.name[FP.lang] : m.c.country[FP.lang];
    const cap = zh ? name : name.toUpperCase();
    ctx.font = `${zh ? 500 : 400} ${st.fs}px ${SERIF}`;
    const wn = spaced(ctx, cap, st.ls);
    let tail, wt, tailFont, tailLs;
    if (m.home) {
      tail = zh ? FP.w.home : FP.w.home.toUpperCase();
      tailFont = zh ? `500 ${st.fs * 0.86}px "Noto Sans TC", sans-serif` : `600 ${st.fs * 0.66}px "Geist", sans-serif`;
      tailLs = zh ? st.fs * 0.03 : st.fs * 0.66 * 0.16;
    } else {
      tail = String(m.c.first);
      tailFont = `400 ${st.fs * 0.8}px ${SERIF}`;
      tailLs = st.fs * 0.8 * 0.03;
    }
    ctx.font = tailFont;
    wt = spaced(ctx, tail, tailLs);
    const gap = st.fs * (zh ? 0.35 : 0.45);
    const out = { cap, tail, wn, wt, gap, w: wn + gap + wt, fs: st.fs, ls: st.ls, tailFont, tailLs, nameFont: `${zh ? 500 : 400} ${st.fs}px ${SERIF}`, small: st.size === 's' };
    metrics.set(key, out);
    return out;
  }
  function measureSea(s) {
    const key = `${FP.lang}|sea|${s.id}|${G.k}`;
    if (metrics.has(key)) return metrics.get(key);
    const zh = FP.lang === 'zh', fs = Math.max(zh ? 9 : 8, (zh ? 10.5 : 9.5) * G.k), ls = fs * (zh ? 1.1 : 0.62);
    const font = `${zh ? 500 : 400} ${fs}px ${SERIF}`;
    mctx.font = font;
    const lines = s[FP.lang], ws = lines.map((l) => spaced(mctx, l, ls));
    const out = { lines, ws, w: Math.max(...ws), fs, ls, font, lh: fs * 1.5 };
    metrics.set(key, out);
    return out;
  }

  const LBL = new Map(); // per label: the place it took, how far faded in
  function labelBox(m, cand, c, me) {
    const A = { x: c.ox + m.anchorU[0] * c.s, y: c.oy + m.anchorU[1] * c.s };
    const nb = m.nameU, bw = (nb.x1 - nb.x0) * c.s, bh = (nb.y1 - nb.y0) * c.s;
    const w = me.w, h = me.fs;
    const ry = clamp(bh / 2, 3, 30);
    let x, y;
    if (cand === 'in') { if (m.rank !== 1 || bw < w * 1.1 || bh < h * 2.4) return null; x = A.x - w / 2; y = A.y + h * 0.35; }
    else if (cand === 'start') { x = Math.max(A.x + 3, c.ox + nb.x1 * c.s) + 5; y = A.y + h * 0.35; }
    else if (cand === 'end') { x = Math.min(A.x - 3, c.ox + nb.x0 * c.s) - 5 - w; y = A.y + h * 0.35; }
    else if (cand === 'below') { x = A.x - w / 2; y = A.y + ry + 4 + h * 0.8; }
    else { x = A.x - w / 2; y = A.y - ry - 5; }
    return { x: x - 2, y: y - h * 0.82 - 1, w: w + 4, h: h * 1.1 + 2, tx: x, base: y, halo: cand !== 'in' };
  }
  function drawLabels(ctx, c, t, dt) {
    const F = G.F, frame = { x: F.x + 4, y: F.y + 4, w: F.w - 8, h: F.h - 8 };
    const taken = G.clear ? G.clear.map((r) => ({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 })) : [];
    const ease = AT != null || dt > 1000 ? 1 : 1 - Math.exp(-dt / 170);
    const items = [];
    MINE.forEach((m) => {
      const fade = m.home ? 1 : up(inOut(unit(t, m.tb + BLEED * 0.3, NAME)));
      // on the whole world the small ones go unlettered (as bolder has them): their names fade as the view widens
      const close = m.home ? 1 : G.narrow ? clamp((c.ppd - (m.rank < 3 ? 2.2 : 5.4)) / 0.8, 0, 1) : m.rank < 3 ? 1 : clamp((c.z - 1.4) / 0.35, 0, 1);
      if (fade * close > 0 && (m.home || m.wash)) items.push({ m, fade: fade * close });
    });
    items.sort((a, b) => (a.m.rank - b.m.rank) || (b.m.area - a.m.area));
    const PAPER = cssVar('--paper'), INK = cssVar('--ink'), INK2 = cssVar('--ink-2'), LINK = cssVar('--link');
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.lineJoin = 'round'; ctx.strokeStyle = PAPER; ctx.lineWidth = 3;
    const place = (key, cands, boxOf) => {
      const st = LBL.get(key) || { cand: null, a: 0 };
      LBL.set(key, st);
      const free = (b) => b && within(b, frame) && !taken.some((o) => overlap(b, o, 2));
      let box = st.cand ? boxOf(st.cand) : null, fits = free(box);
      // while the view holds still, a name with a better side free fades out and comes back there
      let better = null;
      if (!moving && fits) for (const cd of cands) { if (cd === st.cand) break; const b = boxOf(cd); if (free(b)) { better = cd; break; } }
      if (better && st.a < 0.03) { st.cand = better; box = boxOf(better); } else if (better) fits = false;
      if (!fits && st.a < 0.03) { // only a name faded out may move to another side
        for (const cd of cands) { const b = boxOf(cd); if (free(b)) { st.cand = cd; box = b; fits = true; break; } }
      }
      st.a += ((fits ? 1 : 0) - st.a) * ease;
      if (fits) taken.push(box);
      return { st, box };
    };
    // the oceans first, light and widely spaced, under the countries' names in rank but drawn among them
    const seaDraw = [];
    SEAS.forEach((s) => {
      if (G.narrow) return;
      const me = measureSea(s);
      const u = projU(s.at), x = c.ox + u[0] * c.s, y = c.oy + u[1] * c.s;
      const H2 = me.lh * (me.lines.length - 1) + me.fs;
      seaDraw.push({ s, me, x, y, box: { x: x - me.w / 2 - 3, y: y - me.fs, w: me.w + 6, h: H2 + 4 } });
    });
    const shows = [];
    items.forEach((it) => {
      const me = measure(it.m);
      const cands = ['in', ...(SIDE[it.m.id] || ['start', 'end', 'below', 'above'])];
      const { st, box } = place(it.m.id, cands, (cd) => labelBox(it.m, cd, c, me));
      if (box && st.a * it.fade > 0.01) shows.push({ it, me, box, a: st.a * it.fade });
    });
    seaDraw.forEach((d) => {
      const { st, box } = place(`sea|${d.s.id}`, ['in'], () => d.box);
      if (box && st.a > 0.01) {
        ctx.globalAlpha = st.a * 0.72; ctx.font = d.me.font; ctx.fillStyle = cssVar('--tn-water');
        d.me.lines.forEach((l, i) => spacedText(ctx, l, d.x - d.me.ws[i] / 2, d.y + i * d.me.lh, d.me.ls, true));
      }
    });
    shows.forEach(({ it, me, box, a }) => {
      ctx.globalAlpha = a;
      const home = it.m.home;
      ctx.font = me.nameFont; ctx.fillStyle = home ? LINK : me.small ? INK2 : INK;
      spacedText(ctx, me.cap, box.tx, box.base, me.ls, box.halo);
      ctx.font = me.tailFont; ctx.fillStyle = home ? LINK : INK2;
      spacedText(ctx, me.tail, box.tx + me.wn + me.gap, box.base, me.tailLs, box.halo);
    });
    ctx.restore();
  }

  /* ------------------------------------------------------------ one frame */

  // the paper cleared round the numbers, and under the trip line while it shows
  function clearNow() {
    if (!G.base) return null;
    if (!trip.classList.contains('is-on') || !tripW) return G.base;
    return G.base.concat([{ x: G.tripAt.x - 6, y: G.tripAt.y - 5, w: tripW + 12, h: G.tb.h + 9 }]);
  }
  function draw(t, dt) {
    const v = viewAt(t);
    const s = G.F.w / v.w;
    cur = { s, ox: G.F.x - v.x0 * s, oy: G.F.y - v.y0 * s, z: G.W0.w / v.w, ppd: s * DEG, t };
    moving = inMove(t);
    showTrip(t >= P.END ? 'end' : tripOf(t));
    G.clear = clearNow();
    drawSea(cur);
    drawMap(cur, t, dt);
    showFigures([countAt(P.inc.c, t), countAt(P.inc.f, t), countAt(P.inc.p, t)]);
  }

  function drawMap(c, t, dt) {
    const ctx = mctx, F = G.F, { s, ox, oy } = c;
    const INK = cssVar('--ink');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, mapCv.width, mapCv.height);
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.beginPath(); ctx.rect(F.x, F.y, F.w, F.h); ctx.clip();

    // the graticule, every fifteen degrees, the equator a shade firmer
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    for (let lon = -180; lon < 180; lon += 15) {
      const x = ox + xOfLon(lon) * s;
      if (x > F.x && x < F.x + F.w) { ctx.moveTo(x, F.y); ctx.lineTo(x, F.y + F.h); }
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      if (!lat) continue;
      const y = oy + gy(lat) * s;
      if (y > F.y && y < F.y + F.h) { ctx.moveTo(F.x, y); ctx.lineTo(F.x + F.w, y); }
    }
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    const ye = oy + gy(0) * s;
    ctx.beginPath(); ctx.moveTo(F.x, ye); ctx.lineTo(F.x + F.w, ye); ctx.stroke();
    ctx.globalAlpha = 1;

    // the washes, laid on their own sheet, the paper's tooth rubbed out of them, then multiplied in
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, washCv.width, washCv.height);
    wctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * ox, DPR * oy);
    wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'high';
    const dabs = [];
    MINE.forEach((m) => {
      const pt = m.home ? 1 : spread(unit(t, m.tb, BLEED)), p = up(pt);
      if (p <= 0 || !m.wash) return;
      if (Math.max(m.bU.x1 - m.bU.x0, m.bU.y1 - m.bU.y0) * s < 7) { dabs.push({ m, p }); return; }
      if (pt >= 1 || !m.bleed) { wctx.drawImage(m.wash.cv, m.wash.x, m.wash.y, m.wash.w, m.wash.h); return; }
      // part way out; on a skip the whole wash comes up over it
      if (pt > 0) { wctx.globalAlpha = 1 - K; wctx.drawImage(bleeding(m, pt), m.wash.x, m.wash.y, m.wash.w, m.wash.h); }
      if (K > 0) { wctx.globalAlpha = K; wctx.drawImage(m.wash.cv, m.wash.x, m.wash.y, m.wash.w, m.wash.h); }
      wctx.globalAlpha = 1;
    });
    if (tooth) {
      wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      wctx.globalCompositeOperation = 'destination-out';
      wctx.fillStyle = tooth; wctx.fillRect(F.x, F.y, F.w, F.h);
      wctx.globalCompositeOperation = 'source-over';
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(washCv, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    // the engraving: borders, then coasts, smoothed close in
    const hi = c.ppd >= 6.5;
    ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * ox, DPR * oy);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.5; ctx.lineWidth = 0.4 / s; ctx.stroke(hi ? borderHi : borderLo);
    ctx.globalAlpha = 1; ctx.lineWidth = 0.72 / s; ctx.stroke(hi ? coastHi : coastLo);

    // a country too small to see: a dab of its colour in a fine ring
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    dabs.forEach(({ m, p }) => {
      const x = ox + m.anchorU[0] * s, y = oy + m.anchorU[1] * s, r = clamp(3.2 * G.k, 2.6, 3.8);
      ctx.globalAlpha = 0.85 * p; ctx.fillStyle = m.tone.css; ctx.globalCompositeOperation = 'multiply';
      ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = p; ctx.lineWidth = 0.7; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    });

    // the flights: fine arcs at low strength, drawn like a pen, settling faint
    const ROUTE = cssVar('--route'), INK2 = cssVar('--ink-2');
    ctx.lineWidth = 0.8; ctx.strokeStyle = ROUTE; ctx.lineCap = 'round';
    ARCS.forEach((a) => {
      const q = up(inOut(unit(t, a.t0, a.dur)));
      if (q <= 0) return;
      ctx.globalAlpha = q < 1 ? 0.62 : lerp(0.62, 0.34, up(inOut(unit(t, a.t0 + a.dur, SETTLE))));
      const L = q * a.total;
      ctx.beginPath();
      ctx.moveTo(ox + a.pts[0][0] * s, oy + a.pts[0][1] * s);
      for (let i = 1; i < a.pts.length; i++) {
        if (a.len[i] <= L) { ctx.lineTo(ox + a.pts[i][0] * s, oy + a.pts[i][1] * s); continue; }
        const f = (L - a.len[i - 1]) / (a.len[i] - a.len[i - 1] || 1);
        ctx.lineTo(ox + lerp(a.pts[i - 1][0], a.pts[i][0], f) * s, oy + lerp(a.pts[i - 1][1], a.pts[i][1], f) * s);
        break;
      }
      ctx.stroke();
    });
    ctx.fillStyle = INK2;
    DOTS.forEach((d) => {
      const a = up(inOut(unit(t, d.t, 400)));
      if (a <= 0) return;
      ctx.globalAlpha = 0.6 * a;
      ctx.beginPath(); ctx.arc(ox + d.u[0] * s, oy + d.u[1] * s, 1.35, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    drawLabels(ctx, c, t, dt);

    // the clearing round the numbers: rings of rubbing out, wider and fainter outwards, so the lines thin away
    if (G.clear) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      const N = 14;
      for (let i = 0; i < N; i++) {
        ctx.globalAlpha = 0.28;
        const grow = 3 + 20 * (1 - i / (N - 1));
        ctx.beginPath();
        G.clear.forEach((r) => {
          if (ctx.roundRect) ctx.roundRect(r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow, grow); else ctx.rect(r.x - grow, r.y - grow, r.w + 2 * grow, r.h + 2 * grow);
        });
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // the neatline: a fine rule on the edge of the map, a heavier one outside it
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.6; ctx.strokeRect(F.x, F.y, F.w, F.h);
    const gap = G.narrow ? 2.5 : 3.5, lw = G.narrow ? 1.3 : 2.2;
    ctx.lineWidth = lw; ctx.strokeRect(F.x - gap - lw / 2, F.y - gap - lw / 2, F.w + 2 * gap + lw, F.h + 2 * gap + lw);
    ctx.restore();
  }

  /* ------------------------------------------------------------ the numbers and the trip line */

  const shown = ['', '', ''], shownW = ['', '', ''];
  function showFigures(vals, measuring) {
    const words = [FP.w.countries, FP.w.flights, FP.w.photos];
    vals.forEach((v, i) => {
      const html = [...FP.fmt(v)].map((ch) => (/\d/.test(ch) ? `<span>${ch}</span>` : `<span class="is-sep">${FP.esc(ch)}</span>`)).join('');
      if (html !== shown[i]) { figN[i].innerHTML = html; shown[i] = html; }
      // measured at the widest words (the plural), so the corner never changes size
      const w = words[i](measuring ? 2 : v);
      if (w !== shownW[i]) { figW[i].textContent = w; shownW[i] = w; }
    });
    if (measuring) { shown.fill(''); }
  }

  // the line naming the trip being shown: its date and its countries ("January 2025 · Japan",
  // 「2025 年 1 月　日本」); at rest the span of the years, and on a phone that the map can be dragged
  const SHORT = { dubai: { en: 'Dubai', zh: '杜拜' } };
  const JOURNEY = new Map(FP.journeys.map((j) => [j.id, j]));
  function tripText(key, narrow, l = FP.lang) {
    const zh = l === 'zh', w = FP.WORDS[l];
    if (key === 'end') {
      const span = w.span(FP.counts.since, FP.counts.until);
      if (!narrow) return span;
      return zh ? `${span}　左右拖動地圖` : `${span} · drag the map sideways`;
    }
    const st = FP.ramp[key], j = JOURNEY.get(st.journey);
    const names = j.countries.map((id) => (SHORT[id] || FP.byId.get(id).name)[l]);
    return zh ? `${st.date.zh}　${names.join('、')}` : `${st.date.en} · ${names.join(', ')}`;
  }
  const tripLines = (narrow, l) => FP.ramp.map((_, i) => tripText(i, narrow, l)).concat([tripText('end', narrow, l)]);
  let shownKey = null, shownTrip = '', tripW = 0;
  function showTrip(key) {
    if (key === shownKey) return;
    shownKey = key;
    trip.classList.toggle('is-on', key !== -1);
    if (key === -1) return;
    shownTrip = tripText(key, G.narrow);
    tripIn.textContent = shownTrip;
    tripW = tripIn.getBoundingClientRect().width;
  }

  function words() {
    const n = FP.counts, w = FP.w;
    sr.textContent = FP.lang === 'zh'
      ? `${w.where}：${FP.fmt(n.countries)} ${w.countries(n.countries)}，${FP.fmt(n.flights)} ${w.flights(n.flights)}，${FP.fmt(n.photos)} ${w.photos(n.photos)}`
      : `${w.where}: ${FP.fmt(n.countries)} ${w.countries(n.countries)}, ${FP.fmt(n.flights)} ${w.flights(n.flights)}, ${FP.fmt(n.photos)} ${w.photos(n.photos)}`;
    stage.setAttribute('aria-label', w.where);
    finals.forEach((v, i) => figN[i].style.setProperty('--nd', String(FP.fmt(v).length)));
  }

  /* ------------------------------------------------------------ clicking, pointing, dragging */

  function countryAt(e, reach) {
    if (!cur || !G) return null;
    const r = mapCv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, F = G.F;
    if (x < F.x || x > F.x + F.w || y < F.y || y > F.y + F.h) return null;
    if (G.clear && G.clear.some((q) => x > q.x && x < q.x + q.w && y > q.y && y < q.y + q.h)) return null;
    const on = MINE.filter((m) => m.home || up(spread(unit(cur.t, m.tb, BLEED))) > 0.4);
    hitCtx.setTransform(cur.s, 0, 0, cur.s, cur.ox, cur.oy);
    for (const m of on) if (m.pathU && hitCtx.isPointInPath(m.pathU, x, y)) return m;
    let best = null, bd = reach;
    on.forEach((m) => { const d = Math.hypot(cur.ox + m.anchorU[0] * cur.s - x, cur.oy + m.anchorU[1] * cur.s - y); if (d < bd) { bd = d; best = m; } });
    return best;
  }

  let t0 = 0, raf = 0, lastNow = 0, skipNow = 0;
  const running = () => raf !== 0 && K === 0 && performance.now() - t0 < P.viewEnd;
  // a click or a tap while the view travels: from where it is, one move to the end, everything left
  // (the colours, the flights, the counts) coming in together on the way
  function skip() {
    const now = performance.now();
    P.skipT = now - t0;
    P.skip = zoomer(cen(viewAt(P.skipT)), cen(P.REST));
    skipNow = now; K = 1e-4;
    body.classList.remove('is-moving');
  }
  // on a phone, once it rests, the map dragged sideways along the sheet
  function pan(x0) {
    const W0 = G.W0;
    P.REST.x0 = clamp(x0, W0.x0, W0.x0 + W0.w - P.REST.w);
    draw(P.END + 1, 1e6);
  }
  let pointed = null, drag = null, tapSkip = false, rested = false, early = false, stale = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || !G || !P) return;
    tapSkip = false;
    if (running()) { skip(); tapSkip = true; FP.tip(0, 0, null); return; }
    if (!rested) { early = true; tapSkip = true; return; } // before it sets off: straight to the end once ready
    if (G.narrow) drag = { id: e.pointerId, x: e.clientX, x0: P.REST.x0, moved: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; FP.tip(0, 0, null); try { stage.setPointerCapture(e.pointerId); } catch (er) { /* gone */ } }
      if (drag.moved) { dragging = true; pan(drag.x0 - dx / cur.s); return; }
    }
    if (e.pointerType === 'touch') return;
    const m = countryAt(e, 10);
    pointed = m;
    FP.tip(e.clientX, e.clientY, m ? FP.about(m.c) : null);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return false;
    const moved = drag.moved; drag = null;
    if (moved) { dragging = false; rest(); }
    return moved;
  };
  stage.addEventListener('pointerup', (e) => {
    const moved = endDrag(e);
    if (moved || tapSkip || e.pointerType === 'mouse') return;
    const m = countryAt(e, 26);
    FP.tip(e.clientX, e.clientY, m ? FP.about(m.c) : null);
  });
  stage.addEventListener('pointercancel', (e) => { endDrag(e); });
  stage.addEventListener('pointerleave', () => { pointed = null; FP.tip(0, 0, null); });

  /* ------------------------------------------------------------ putting it together */

  // the largest a country is seen once it has its colour, so its wash is made fine enough for that
  function washScale(m) {
    const t1 = m.home ? 0 : m.tb;
    const b = m.bU;
    let s = 0;
    for (let t = t1; t <= P.viewEnd + 40; t += 40) {
      const v = viewAt(t);
      if (v.x0 < b.x1 && v.x0 + v.w > b.x0 && v.y0 < b.y1 && v.y0 + v.h > b.y0) s = Math.max(s, G.F.w / v.w);
    }
    if (G.narrow) s = Math.max(s, G.F.w / P.REST.w);
    return s || G.F.w / viewAt(t1).w;
  }

  // the layout and everything sized by it; `quick` makes only what the landing shows at once, the rest
  // (the coarser water fields, the washes) while the landing holds still, before the view sets off
  let pending = [];
  function layout(quick) {
    words();
    const g = solve();
    if (!g) return false;
    G = g;
    body.classList.toggle('is-narrow', G.narrow);
    figs.style.setProperty('--f', `${G.F1.toFixed(1)}px`);
    figs.style.setProperty('--x', `${G.fig.x.toFixed(1)}px`);
    figs.style.setProperty('--y', `${G.fig.y.toFixed(1)}px`);
    trip.style.setProperty('--x', `${G.tripAt.x.toFixed(1)}px`);
    trip.style.setProperty('--y', `${G.tripAt.y.toFixed(1)}px`);
    stage.style.setProperty('--room', G.narrow ? `${Math.ceil(G.roomH)}px` : '0px');
    sheet.style.setProperty('--sheet-w', `${G.w}px`);
    sheet.style.setProperty('--sheet-h', `${G.h}px`);
    for (const cv of [mapCv, seaCv, washCv]) { cv.width = Math.round(G.w * DPR); cv.height = Math.round(G.h * DPR); }
    metrics.clear(); LBL.clear(); shownKey = null;
    plan();
    const jobs = [];
    if (sea.gl) {
      sea.col = rgb(cssVar('--tn-water')).map((x) => x / 255);
      const L = seaLevels();
      sea.zA = L.zA; sea.zB = L.zB; sea.A = sea.B = sea.C = sea.D = null;
      jobs.push({ at: -2, run: () => { sea.D = density(); } });
      L.want.forEach(([name, rect, texel, at, cap]) => jobs.push({ at: at - 1, run: () => { sea[name] = field(rect, texel, cap); } }));
    }
    MINE.forEach((m) => {
      const at = m.home ? -1 : m.tb;
      if (!Number.isFinite(at)) return;
      jobs.push({ at: at - 500, run: () => makeWash(m, washScale(m)) });
    });
    jobs.sort((a, b) => a.at - b.at);
    if (!tooth) makeTooth();
    if (!quick) { jobs.forEach((j) => j.run()); pending = []; return true; }
    jobs.filter((j) => j.at < 150).forEach((j) => j.run());
    pending = jobs.filter((j) => j.at >= 150);
    return true;
  }
  // the map at rest: drawn twice, so a name with a better place free fades out there and in again at once
  function rest() { draw(P.END + 1, 1e6); draw(P.END + 1, 1e6); }
  function finish() { K = 0; raf = 0; rested = true; body.classList.remove('is-moving'); rest(); }
  function loop(now) {
    const dt = now - lastNow; lastNow = now;
    if (K > 0) {
      K = Math.min(1, (now - skipNow) / SKIP);
      if (K >= 1) { finish(); return; }
      draw(P.skipT, dt);
    } else {
      const t = now - t0;
      if (t >= P.END) { finish(); return; }
      draw(t, dt);
    }
    raf = requestAnimationFrame(loop);
  }

  const fontsIn = Promise.race([
    Promise.all([
      document.fonts.load('400 120px "Playfair Display"', '0123456789'),
      document.fonts.load('400 12px "Playfair Display"', 'JAPAN TAIWAN PACIFIC OCEAN 2024'),
      document.fonts.load('500 12px "Geist"', 'COUNTRIES FLIGHTS PHOTOGRAPHS JANUARY SUMMER'),
      document.fonts.load('600 12px "Geist"', 'HOME'),
      document.fonts.load('500 12px "Noto Serif TC"', '台灣日本南韓中國美國太平洋印度洋'),
      document.fonts.load('500 12px "Noto Sans TC"', '個國家段航程張照片家年月暑假左右拖動地圖'),
    ]).catch(() => null),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  initSea();
  if (STILL || AT != null) body.classList.add('is-still');
  Promise.all([FP.world('50m'), FP.world('110m'), fontsIn]).then(([a, b]) => {
    atlas = a; lite = b;
    prepare();
    const go = () => {
      const live = !STILL && AT == null;
      if (!layout(live)) return false;
      started = true;
      if (!live) {
        rested = true;
        draw(STILL ? P.END + 1 : AT, 1e6);
        body.classList.add('is-ready');
        return true;
      }
      draw(0, 1e6);
      requestAnimationFrame(() => body.classList.add('is-ready'));
      // the rest of the washes and water fields are made while the landing holds still, so nothing
      // stalls a move; then the clock starts
      const begin = () => {
        if (stale) { stale = false; layout(false); } // the window changed while it was getting ready
        if (early) { finish(); return; }
        t0 = performance.now(); lastNow = t0;
        body.classList.add('is-moving');
        raf = requestAnimationFrame(loop);
      };
      const prep = () => { if (pending.length) { pending.shift().run(); setTimeout(prep, 0); } else begin(); };
      setTimeout(prep, 650);
      return true;
    };
    if (!go()) {
      const again = () => { if (!started && go()) removeEventListener('resize', again); };
      addEventListener('resize', again);
    }
  });

  // a new window size: everything laid out again, the tour carrying on from where it was (a skip, finished)
  let rt = 0;
  addEventListener('resize', () => {
    if (!started) return;
    clearTimeout(rt);
    rt = setTimeout(() => {
      const skipping = K > 0;
      if (skipping) { cancelAnimationFrame(raf); raf = 0; K = 0; body.classList.remove('is-moving'); }
      if (!rested && !raf) { stale = true; return; } // still getting ready: laid out again as it sets off
      const t = AT != null ? AT : STILL || skipping || !raf ? P.END + 1 : performance.now() - t0;
      if (!layout(false)) return;
      draw(Math.min(t, P.END + 1), 1e6);
      if (!STILL && AT == null && !raf && t < P.END) raf = requestAnimationFrame(loop);
    }, 160);
  });
  FP.onLang(() => {
    if (!started) return;
    words(); metrics.clear(); LBL.clear(); shownW.fill(''); shownKey = null;
    if (!raf) draw(AT != null ? AT : P.END + 1, 1e6);
    if (pointed) FP.tip(0, 0, null);
  });
})();
