// Glass block, Trips (design 5): every trip with a camera, newest first, beside a quiet route map.
// The map is a 2D canvas (Natural Earth 1:50m through d3 and topojson): land a shade lighter than
// the ground, every route faint, the trip in view drawn fully in the accent, its countries named.
// Which trip is in view comes from an IntersectionObserver on a line across the window; the page
// scrolls natively. Reduced motion: the map moves straight to each trip and nothing is drawn in.

import { Kit, esc } from '../kit/kit.js';

const SITE = window.SITE;
const html = document.documentElement;
const still = () => html.classList.contains('still');

const WORDS = {
  en: {
    skip: 'Skip to the trips',
    title: 'Trips',
    intro: 'Every trip with a camera, newest first. The map follows the one you are reading.',
    earlier: 'Earlier',
    open: 'Open the photograph: ',
  },
  zh: {
    skip: '跳到旅程',
    title: '旅程',
    intro: '每一趟帶著相機的旅程，由新到舊。地圖跟著你正在讀的那一趟。',
    earlier: '更早',
    open: '打開照片：',
  },
};

/* ------------------------------------------------------------------ the trips and their photographs */

const country = Object.fromEntries(SITE.countries.map(c => [c.id, c]));
const ISO = {
  spain: '724', uk: '826', france: '250', andorra: '020', vietnam: '704', china: '156', singapore: '702',
  australia: '036', 'new-zealand': '554', 'south-korea': '410', usa: '840', 'hong-kong': '344', japan: '392',
  germany: '276', switzerland: '756', dubai: '784', thailand: '764', myanmar: '104', netherlands: '528',
  malaysia: '458', taiwan: '158',
};
// where a country's name sits on the map: its middle, or the city for Dubai
const labelAt = c => {
  if (!country[c]) return null;
  const N = window.COUNTRY_NAMES && window.COUNTRY_NAMES[ISO[c]];
  return c === 'dubai' || !N ? [country[c].ll[1], country[c].ll[0]] : N.at;
};
const nextMonth = m => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; };

// A photograph belongs to a trip when it was made in one of the trip's countries while the trip
// lasted (the months of its legs, and the one after). One whose file carries no date belongs to a
// trip only when that trip is the only one to its country, or to its city when the trip names cities.
function photosOf(J) {
  const months = J.legs.map(l => l.month).filter(Boolean).sort();
  const from = months[0], till = months.length ? nextMonth(months[months.length - 1]) : null;
  const ours = id => {
    const s = SITE.slides[id];
    if (!s) return false;
    if (s.taken) return from ? (s.taken.slice(0, 7) >= from && s.taken.slice(0, 7) <= till) : s.taken.slice(0, 4) === J.id.slice(0, 4);
    const rivals = SITE.journeys.filter(j => j.countries.includes(s.country));
    if (rivals.length === 1) return true;
    if (!s.city) return false;
    const withCity = rivals.filter(j => (j.places || []).includes(s.city));
    return withCity.length === 1 && withCity[0] === J;
  };
  const ids = J.countries.flatMap(c => (country[c] ? country[c].photos : [])).filter(ours);
  const order = new Map(ids.map((id, i) => [id, i]));
  return ids.sort((a, b) => ((SITE.slides[a].taken || '9') < (SITE.slides[b].taken || '9') ? -1
    : (SITE.slides[a].taken || '9') > (SITE.slides[b].taken || '9') ? 1 : order.get(a) - order.get(b)));
}

const TRIPS = SITE.journeys.map(J => ({ J, photos: photosOf(J) }));
// the trips after the last one with photographs are "Earlier"; a trip without photographs before
// that stays in its place as one line
const lastWith = TRIPS.reduce((n, t, i) => (t.photos.length ? i : n), -1);
const RECENT = TRIPS.slice(0, lastWith + 1);
const EARLIER = TRIPS.slice(lastWith + 1);

// the places along the route, in order, without Taipei at either end
function stops(J, k) {
  const out = [];
  const add = p => { const n = k.lang === 'zh' ? (p.zh || p.city) : p.city; if (n && out[out.length - 1] !== n) out.push(n); };
  J.legs.forEach((l, i) => { if (i === 0) add(l.from); add(l.to); });
  const home = k.lang === 'zh' ? '台北' : 'Taipei';
  while (out[0] === home) out.shift();
  while (out[out.length - 1] === home) out.pop();
  return [...new Set(out)];
}

/* ------------------------------------------------------------------ the page */

let K = null;
let active = null;          // the id of the trip in view
let io = null;

function render(k) {
  K = k;
  const names = J => J.countries.map(c => (country[c] ? k.pick(country[c].name) : c)).join(k.tr('list'));
  const line = ({ J }) => `<li class="trip trip--line" id="t-${esc(J.id)}" data-trip="${esc(J.id)}">
      <p class="trip-date">${esc(k.pick(J.date))}</p><h3 class="trip-where">${esc(names(J))}</h3></li>`;
  const full = ({ J, photos }) => {
    const list = photos.join(' ');
    const panes = photos.map(id => {
      const s = SITE.slides[id];
      const ar = (s.w && s.h) ? (s.w / s.h).toFixed(4) : '1.5';
      return `<button type="button" class="pane" style="--ar: ${ar}" data-open="${esc(id)}" data-list="${esc(list)}" aria-label="${esc(k.tr('open') + k.pick(s.place))}"><img src="${esc(k.img(s.file, 640))}" alt="" loading="lazy" decoding="async" width="${s.w || 3}" height="${s.h || 2}"></button>`;
    }).join('');
    const st = stops(J, k);
    return `<li class="trip" id="t-${esc(J.id)}" data-trip="${esc(J.id)}">
      <p class="trip-date">${esc(k.pick(J.date))}</p>
      <h3 class="trip-where">${esc(names(J))}</h3>
      ${st.length ? `<p class="trip-stops">${esc(st.join(k.tr('list')))}</p>` : ''}
      <div class="panes">${panes}</div></li>`;
  };
  document.querySelector('.trip-list').innerHTML = RECENT.map(t => (t.photos.length ? full(t) : line(t))).join('');
  document.querySelector('.earlier-list').innerHTML = EARLIER.map(line).join('');
  document.querySelector('[data-k="intro"]').textContent = k.tr('intro');
  document.title = `${k.tr('title')}, tuan photography 陳亮元`;
  watch();
  mark();
  if (MAP.ready) MAP.draw();
}

/* ------------------------------------------------------------------ which trip is in view */

// a thin line across the window: wide screens near the middle, phones below the small map
const LINE = matchMedia('(max-width: 860px)');
const seen = new Map();
function watch() {
  if (io) io.disconnect();
  seen.clear();
  const at = LINE.matches ? 62 : 46;
  io = new IntersectionObserver(entries => {
    for (const e of entries) seen.set(e.target.dataset.trip, e.isIntersecting);
    const on = [...document.querySelectorAll('[data-trip]')].find(el => seen.get(el.dataset.trip));
    if (on) setActive(on.dataset.trip);
    else {
      // above the first trip: the whole world; past the last: keep the last
      const first = document.querySelector('[data-trip]');
      if (first && first.getBoundingClientRect().top > innerHeight * at / 100) setActive(null);
    }
  }, { rootMargin: `-${at}% 0px -${100 - at - 0.5}% 0px` });
  document.querySelectorAll('[data-trip]').forEach(el => io.observe(el));
}
LINE.addEventListener('change', () => { watch(); MAP.resize(); });

function setActive(id) {
  if (id === active) return;
  active = id;
  mark();
  MAP.go(id);
}
function mark() {
  document.querySelectorAll('[data-trip]').forEach(el => el.classList.toggle('is-on', el.dataset.trip === active));
}

/* ------------------------------------------------------------------ the map */

const MAP = (() => {
  const box = document.querySelector('.map');
  const canvas = box.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const W0 = 1000, H0 = 520;
  const proj = d3.geoNaturalEarth1().rotate([-150, 0]).fitSize([W0, H0], { type: 'Sphere' });
  const geo = d3.geoPath(proj);
  const css = getComputedStyle(html);
  const C = {
    land: css.getPropertyValue('--land').trim() || '#1f1d1b',
    on: css.getPropertyValue('--land-on').trim() || '#2c2a26',
    accent: css.getPropertyValue('--accent').trim() || '#9cc4b5',
    ink: css.getPropertyValue('--ink').trim() || '#ece7df',
    ink2: css.getPropertyValue('--ink-2').trim() || '#b9b2a7',
    bg: css.getPropertyValue('--bg').trim() || '#121110',
  };
  // the world without the far south and north, as the view with no trip in it
  const WORLD = [[0, proj([150, 80])[1]], [W0, proj([150, -57])[1]]];

  const S = { ready: false, cw: 0, ch: 0, dpr: 1, land: null, shapes: {}, legs: {}, view: null, from: null, to: null, t0: 0, dur: 0, draw0: 0, raf: 0, timer: 0 };

  // length of a path in the map's own units, for drawing a route in
  const meter = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const lengthOf = d => { meter.setAttribute('d', d); try { return meter.getTotalLength(); } catch (e) { return 0; } };

  // a country's main body of land, without its far islands and territories
  const main = f => {
    if (f.geometry.type !== 'MultiPolygon') return f;
    const polys = f.geometry.coordinates.map(c => ({ type: 'Polygon', coordinates: c }));
    return polys.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
  };
  function prepare(topo) {
    S.land = new Path2D(geo(topojson.feature(topo, topo.objects.land)));
    const feats = topojson.feature(topo, topo.objects.countries).features;
    const want = new Set(Object.values(ISO));
    for (const f of feats) if (want.has(f.id)) S.shapes[f.id] = { f, path: new Path2D(geo(f)), bounds: geo.bounds(main(f)) };
    for (const { J } of TRIPS) {
      S.legs[J.id] = J.legs.map(l => {
        const line = { type: 'LineString', coordinates: [[l.from.lng, l.from.lat], [l.to.lng, l.to.lat]] };
        const d = geo(line) || '';
        return { ll: [[l.from.lng, l.from.lat], [l.to.lng, l.to.lat]], path: new Path2D(d), len: lengthOf(d), ground: l.mode !== 'flight', a: proj([l.from.lng, l.from.lat]), b: proj([l.to.lng, l.to.lat]), bounds: geo.bounds(line) };
      });
    }
    // HOME: Taipei, where every flight leaves from
    S.home = proj([121.56, 25.03]);
  }

  /* the view: [centre x, centre y, width] in the map's units, as d3.interpolateZoom wants it */
  function fit(id) {
    let b = null;
    const grow = q => { if (!q || !isFinite(q[0][0])) return; b = b ? [[Math.min(b[0][0], q[0][0]), Math.min(b[0][1], q[0][1])], [Math.max(b[1][0], q[1][0]), Math.max(b[1][1], q[1][1])]] : q; };
    const t = id && TRIPS.find(x => x.J.id === id);
    if (t) {
      // frame where the trip happened: the stops inside its own countries and their names; the long
      // flights there and back may run off the edge, toward home
      const shapes = t.J.countries.map(c => S.shapes[ISO[c]]).filter(Boolean);
      const boxes = shapes.map(s => s.bounds);
      // in one of its countries, or within a few kilometres of the coast (airports sit on it)
      const near = [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3]];
      const inside = ll => shapes.some(s => near.some(([dx, dy]) => d3.geoContains(s.f, [ll[0] + dx, ll[1] + dy])));
      const pts = (S.legs[id] || []).flatMap(l => [inside(l.ll[0]) && l.a, inside(l.ll[1]) && l.b]).filter(Boolean);
      t.J.countries.forEach(c => { const ll = labelAt(c); const p = ll && proj(ll); if (p) pts.push(p); });
      if (pts.length > 1) pts.forEach(p => grow([p, p]));
      else boxes.forEach(grow);
    }
    if (!b) b = WORLD;
    const minSide = W0 * 0.07;
    let [[x0, y0], [x1, y1]] = b;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const bw = Math.max(x1 - x0, minSide), bh = Math.max(y1 - y0, minSide * 0.6);
    const pad = t ? 1.5 : 1.02;
    const kWorld = Math.min(S.cw / (WORLD[1][0] - WORLD[0][0]), S.ch / (WORLD[1][1] - WORLD[0][1]));
    let k = Math.min(S.cw / (bw * pad), S.ch / (bh * pad));
    k = Math.max(k, kWorld);
    return [cx, cy, S.cw / k];
  }

  function resize() {
    const r = box.getBoundingClientRect();
    if (!r.width || !r.height) return;
    S.cw = r.width; S.ch = r.height; S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(S.cw * S.dpr); canvas.height = Math.round(S.ch * S.dpr);
    if (!S.ready) return;
    S.view = fit(active); S.to = S.view; S.from = null;
    draw();
  }

  /* ---- moving to a trip ---- */
  function go(id) {
    if (!S.ready) return;
    const target = fit(id);
    cancelAnimationFrame(S.raf); clearTimeout(S.timer);
    if (still() || !S.view) { S.view = target; S.draw0 = 1; draw(); return; }
    const zoom = d3.interpolateZoom(S.view, target);
    S.zoom = zoom;
    S.dur = Math.min(1500, Math.max(650, zoom.duration * 0.8));
    S.t0 = performance.now();
    S.draw0 = 0;
    tick();
    // a hidden or throttled tab may not run frames: land on the end state anyway
    S.timer = setTimeout(() => { if (S.zoom === zoom) { S.view = target; S.zoom = null; S.draw0 = 1; draw(); } }, S.dur + 1500);
  }
  const ease = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function tick() {
    const now = performance.now();
    const u = Math.min(1, (now - S.t0) / S.dur);
    if (S.zoom) S.view = S.zoom(easeInOut(u));
    // the route draws in once the map has mostly arrived
    S.draw0 = ease(Math.max(0, Math.min(1, (now - S.t0 - S.dur * 0.45) / 1300)));
    draw();
    if (u < 1 || S.draw0 < 1) S.raf = requestAnimationFrame(tick);
    else { S.zoom = null; clearTimeout(S.timer); }
  }

  /* ---- one frame ---- */
  function draw() {
    if (!S.ready || !S.cw) return;
    const [cx, cy, w] = S.view;
    const k = S.cw / w;
    const tx = S.cw / 2 - cx * k, ty = S.ch / 2 - cy * k;
    const px = 1 / k;  // one CSS pixel in the map's units
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(S.dpr * k, 0, 0, S.dpr * k, S.dpr * tx, S.dpr * ty);

    ctx.fillStyle = C.land;
    ctx.fill(S.land);

    const t = active && TRIPS.find(x => x.J.id === active);
    const fade = still() ? 1 : Math.min(1, S.draw0 * 2.5 + 0.35);
    if (t) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = C.on;
      t.J.countries.forEach(c => { const s = S.shapes[ISO[c]]; if (s) ctx.fill(s.path); });
      ctx.globalAlpha = 1;
    }

    // every other route, very faint
    ctx.strokeStyle = C.accent;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = t ? 0.13 : 0.34;
    for (const { J } of TRIPS) {
      if (t && J.id === t.J.id) continue;
      for (const l of S.legs[J.id]) { ctx.lineWidth = (l.ground ? 0.8 : 1) * px; ctx.stroke(l.path); }
    }
    ctx.globalAlpha = 1;

    // the trip in view, drawn fully (or drawn in, leg after leg)
    if (t) {
      const legs = S.legs[t.J.id];
      const total = legs.reduce((n, l) => n + l.len, 0);
      let left = (still() ? 1 : S.draw0) * total;
      ctx.globalAlpha = 0.95;
      for (const l of legs) {
        if (left <= 0) break;
        ctx.lineWidth = (l.ground ? 1 : 1.35) * px;
        if (left >= l.len || !l.len) ctx.setLineDash([]);
        else ctx.setLineDash([left, l.len + 1]);
        ctx.stroke(l.path);
        left -= l.len;
      }
      ctx.setLineDash([]);
      // the places it stopped, as small points
      const pts = [];
      legs.forEach(l => { pts.push(l.a, l.b); });
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.9 * fade;
      for (const p of pts) if (p && Math.hypot(p[0] - S.home[0], p[1] - S.home[1]) > 2.5 * px) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.9 * px, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // home
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(S.home[0], S.home[1], 2.3 * px, 0, Math.PI * 2); ctx.fill();

    // the names of the trip's countries, the only words on the map
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    if (t) {
      const zh = html.dataset.lang === 'zh';
      ctx.font = zh ? '400 12.5px "Noto Sans TC", sans-serif' : '400 12.5px Geist, "Noto Sans TC", sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = zh ? '0.08em' : '0.03em';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = fade;
      const placed = [];
      for (const c of t.J.countries) {
        const C0 = country[c];
        if (!C0) continue;
        const p = proj(labelAt(c));
        if (!p) continue;
        const x = p[0] * k + tx, y = p[1] * k + ty;
        const name = zh ? C0.name.zh : C0.name.en;
        const wTxt = ctx.measureText(name).width + 8, hTxt = 18;
        const tries = [[0, 0], [0, -16], [0, 16], [wTxt / 2 + 4, 0], [-wTxt / 2 - 4, 0], [0, -30], [0, 30]];
        let spot = tries[0];
        for (const [dx, dy] of tries) {
          const r = { x: x + dx - wTxt / 2, y: y + dy - hTxt / 2, w: wTxt, h: hTxt };
          if (!placed.some(q => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y)) { spot = [dx, dy]; placed.push(r); break; }
        }
        // a soft cut-out of the ground under the word, so a route never crosses it
        ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = C.bg;
        ctx.strokeText(name, x + spot[0], y + spot[1]);
        ctx.fillStyle = C.ink2;
        ctx.fillText(name, x + spot[0], y + spot[1]);
      }
      ctx.globalAlpha = 1;
    }
  }

  async function start() {
    try {
      const topo = await fetch('../../../journey/vendor/countries-50m.json').then(r => r.json());
      prepare(topo);
    } catch (e) {
      box.parentElement.hidden = true;   // the trips read on their own without the map
      return;
    }
    S.ready = true;
    resize();
    S.view = fit(active); S.draw0 = 1;
    draw();
    box.classList.add('is-ready');
    new ResizeObserver(() => resize()).observe(box);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw());
  }

  return { start, go, draw, resize, get ready() { return S.ready; }, _S: S };
})();

Kit({ here: 'trips', words: WORDS, render });
MAP.start();
window.__trips = { MAP, TRIPS, setActive };
