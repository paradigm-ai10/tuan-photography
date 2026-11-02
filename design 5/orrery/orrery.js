/* Design 5, direction "Orrery" (2026-11-02).
   A brass-and-paper instrument: a small engraved earth, one brass ring per trip (inner = oldest).
   Two big moments only: (1) on arrival the rings swing into line and settle; (2) scrolling turns the
   instrument through time, each trip's ring comes forward and its photographs fan out beside it.
   Everything below the instrument is plain HTML built from window.SITE. */
import * as THREE from 'three';

const S = window.SITE;
const html = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const IMG = '../../images/web/';
const MODE = html.classList.contains('gl') ? 'gl' : html.classList.contains('still') ? 'still' : 'nogl';

/* ---------------------------------------------------------------------------------------------
   Words
   --------------------------------------------------------------------------------------------- */
const WORDS = {
  en: {
    skip: 'Skip to the portfolio', brand: 'tuan photography',
    navPortfolio: 'Portfolio', navGuides: 'Guides', navTrips: 'Trips', switch: '中文',
    title: 'Thomas Chen',
    lede: 'Landscape photographs from the road, set out by the trips that made them.',
    timeTitle: 'The trips, oldest first',
    earlier: (a, b) => `${a} to ${b}`,
    earlierNone: 'No photographs from these trips on the site yet.',
    none: 'No photographs from this trip on the site yet.',
    portfolio: 'Portfolio', portfolioLink: 'See the portfolio',
    guides: 'Guides', guideLink: 'Read the Barcelona guide',
    trips: 'Trips', tripsLink: 'All the trips, on the map', older: 'Earlier',
    footName: 'Thomas Chen, Taiwan',
    tripOf: (d) => `The trip of ${d}`,
    join: ', ',
  },
  zh: {
    skip: '跳到作品集', brand: 'tuan photography',
    navPortfolio: '作品集', navGuides: '攻略', navTrips: '旅程', switch: 'English',
    title: '陳亮元',
    lede: '旅途中的風景照片，依著拍下它們的旅程排列。',
    timeTitle: '旅程，由舊到新',
    earlier: (a, b) => `${a} 至 ${b} 年`,
    earlierNone: '這幾趟的照片還沒放上網站。',
    none: '這趟的照片還沒放上網站。',
    portfolio: '作品集', portfolioLink: '看作品集',
    guides: '攻略', guideLink: '讀巴賽隆納攻略',
    trips: '旅程', tripsLink: '在地圖上看所有旅程', older: '更早',
    footName: '陳亮元，台灣',
    tripOf: (d) => `${d}的旅程`,
    join: '、',
  },
};
let lang = html.dataset.lang === 'zh' ? 'zh' : 'en';
const W = () => WORDS[lang];
const t2 = (o) => (o ? o[lang] || o.en : '');

/* ---------------------------------------------------------------------------------------------
   Data: trips oldest first, each photograph given to one trip by its country and the day it was taken
   --------------------------------------------------------------------------------------------- */
const C = Object.fromEntries(S.countries.map((c) => [c.id, c]));
const slides = S.slides;
const mo = (ym) => { const [y, m] = ym.split('-').map(Number); return y * 12 + (m || 0); };

const trips = S.journeys.map((j) => {
  const months = j.legs.map((l) => l.month).filter(Boolean).sort();
  const y = Number(j.id.slice(0, 4));
  return {
    ...j,
    start: months.length ? mo(months[0]) : y * 12 + 1,
    end: months.length ? mo(months[months.length - 1]) : y * 12 + 12,
    photos: [],
  };
}).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

const owner = {};
for (const [id, s] of Object.entries(slides)) {
  const cands = trips.filter((t) => t.countries.includes(s.country));
  if (!cands.length) continue;
  let best = cands[cands.length - 1];
  if (s.taken) {
    const m = mo(s.taken.slice(0, 7));
    let bd = Infinity;
    for (const t of cands) {
      const d = m < t.start ? t.start - m : m > t.end ? m - t.end : 0;
      if (d <= bd) { bd = d; best = t; }
    }
  }
  owner[id] = best;
}
// keep each country's own order of photographs (it is curated)
for (const t of trips) {
  for (const c of t.countries) for (const id of (C[c] ? C[c].photos : [])) if (owner[id] === t) t.photos.push(id);
}

const firstLit = Math.max(0, trips.findIndex((t) => t.photos.length));
const steps = [];
if (firstLit > 0) steps.push({ kind: 'earlier', trips: trips.slice(0, firstLit) });
trips.slice(firstLit).forEach((t) => steps.push({ kind: 'trip', trips: [t] }));
trips.forEach((t) => { t.step = steps.findIndex((s) => s.trips.includes(t)); });

const placeName = (cid) => (C[cid] ? t2(C[cid].name) : cid);
const tripWhere = (t) => t.countries.map(placeName).join(W().join);
const tripUrl = (t) => `../../journey/wc-sketch/trip/?trip=${encodeURIComponent(t.id)}&from=journey`;
const ar = (s) => (s.w / s.h).toFixed(3);
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------------------------------------------------------------------------------------
   The page's words and the sections built from data
   --------------------------------------------------------------------------------------------- */
function printHTML(id, i, t) {
  const s = slides[id];
  return `<a class="print" href="${tripUrl(t)}" data-ar="${ar(s)}" data-i="${i}">` +
    `<img src="${IMG}640/${s.file}" alt="${esc(t2(s.alt) || t2(s.place))}" loading="lazy" decoding="async" width="640" height="${Math.round(640 / (s.w / s.h))}"></a>`;
}

function stepHTML(st, k) {
  if (st.kind === 'earlier') {
    const a = st.trips[0].id.slice(0, 4), b = st.trips[st.trips.length - 1].id.slice(0, 4);
    const rows = st.trips.map((t) => `<dt>${esc(t.id.slice(0, 4))}</dt><dd>${esc(tripWhere(t))}</dd>`).join('');
    return `<article class="step" data-step="${k}"><div class="words">` +
      `<h3>${esc(W().earlier(a, b))}</h3><dl class="earlier">${rows}</dl>` +
      `<p class="none">${esc(W().earlierNone)}</p></div></article>`;
  }
  const t = st.trips[0];
  const ph = t.photos.slice(0, 5);
  const fan = ph.length
    ? `<div class="fan" data-n="${ph.length}">${ph.map((id, i) => printHTML(id, i, t)).join('')}</div>`
    : '';
  return `<article class="step" data-step="${k}">${fan}<div class="words">` +
    `<h3>${esc(t2(t.date))}</h3><p class="where">${esc(tripWhere(t))}</p>` +
    (ph.length ? '' : `<p class="none">${esc(W().none)}</p>`) + '</div></article>';
}

function portfolioHTML() {
  // one landscape photograph per country, in the site's own order
  const pick = [];
  for (const c of S.countries) {
    const id = (c.photos || []).find((p) => slides[p] && slides[p].w / slides[p].h >= 1.3);
    if (id) pick.push(id);
    if (pick.length === 7) break;
  }
  const fig = (id) => {
    const s = slides[id];
    return `<figure data-ar="${ar(s)}"><a href="../../gallery.html#s-${esc(id)}">` +
      `<img src="${IMG}1280/${s.file}" srcset="${IMG}640/${s.file} 640w, ${IMG}1280/${s.file} 1280w" sizes="(max-width: 819px) 80vw, 33vw" alt="${esc(t2(s.alt))}" loading="lazy" decoding="async"></a>` +
      `<figcaption>${esc(t2(s.place))}</figcaption></figure>`;
  };
  return `<div class="row">${pick.slice(0, 3).map(fig).join('')}</div><div class="row">${pick.slice(3).map(fig).join('')}</div>`;
}

function guideHTML() {
  const g = S.guides.barcelona;
  if (!g) return '';
  const lead = slides[g.lead];
  const spots = (C[g.country] ? C[g.country].photos : []).filter((id) => slides[id]).slice(0, 4)
    .map((id) => t2(slides[id].place)).join(W().join);
  return `<figure data-ar="${ar(lead)}"><a href="../../posts/barcelona.html">` +
    `<img src="${IMG}1280/${lead.file}" srcset="${IMG}640/${lead.file} 640w, ${IMG}1280/${lead.file} 1280w, ${IMG}${lead.file} 2400w" sizes="(max-width: 819px) 92vw, 60vw" alt="${esc(t2(lead.alt))}" loading="lazy" decoding="async"></a></figure>` +
    `<div><h3>${esc(t2(g.title))}</h3><p class="facts">${esc(t2(g.facts))}</p>` +
    `<p class="spots">${esc(spots)}</p>` +
    `<p class="more"><a href="../../posts/barcelona.html">${esc(W().guideLink)}</a></p></div>`;
}

function yearsHTML() {
  const groups = [];
  const newest = [...trips].reverse();
  for (const t of newest) {
    const y = Number(t.id.slice(0, 4));
    const key = y >= 2024 ? String(y) : W().older;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, trips: [] }));
    g.trips.push(t);
  }
  return groups.map((g) => `<div class="year"><h3>${esc(g.key)}</h3><ol>` +
    g.trips.map((t) => `<li><a href="${tripUrl(t)}"><span class="c">${esc(tripWhere(t))}</span><span class="d">${esc(t2(t.date))}</span></a></li>`).join('') +
    '</ol></div>').join('');
}

function setVars(root) {
  // the only two values carried inline: a photograph's shape and its place in the fan
  root.querySelectorAll('[data-ar]').forEach((el) => el.style.setProperty('--ar', el.dataset.ar));
  root.querySelectorAll('[data-i]').forEach((el) => el.style.setProperty('--i', el.dataset.i));
}

const stepsEl = $('#steps');
function render() {
  html.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  html.dataset.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = W()[el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v;
  });
  $('#lang').lang = lang === 'zh' ? 'en' : 'zh-Hant';
  stepsEl.querySelectorAll('.step').forEach((el) => el.remove());
  stepsEl.insertAdjacentHTML('beforeend', steps.map(stepHTML).join(''));
  $('#rows').innerHTML = portfolioHTML();
  $('#guide').innerHTML = guideHTML();
  $('#years').innerHTML = yearsHTML();
  // the photograph shown in place of the instrument when there is none (lazy, so it costs nothing otherwise)
  const home = C[S.home] && C[S.home].photos.length ? C[S.home] : S.countries.find((c) => c.photos.length);
  const hs = slides[home.photos[0]];
  $('#fall').innerHTML = `<img src="${IMG}1280/${hs.file}" srcset="${IMG}1280/${hs.file} 1280w, ${IMG}${hs.file} 2400w" sizes="100vw" alt="${esc(t2(hs.alt))}" loading="lazy">`;
  $('#ig').href = S.instagram.url;
  setVars(document);
  stepEls = [...stepsEl.querySelectorAll('.step')];
  measure();
}

$('#lang').addEventListener('click', () => {
  lang = lang === 'en' ? 'zh' : 'en';
  try { localStorage.setItem('orrery-lang', lang); } catch (e) { /* storage blocked */ }
  render();
});

/* ---------------------------------------------------------------------------------------------
   Where the reader is: a number from -1 (the opening) through each step (0, 1, 2 ...)
   --------------------------------------------------------------------------------------------- */
let stepEls = [];
let centers = [];
let refY = 0;
const phone = () => innerWidth < 820;
const stage = $('#stage');
const bar = $('#bar');
const timeEl = $('#time');

function measure() {
  const y = scrollY;
  centers = [$('#intro'), ...stepEls].map((el) => { const r = el.getBoundingClientRect(); return r.top + y + r.height / 2; });
  const sh = MODE === 'gl' && phone() ? stage.offsetHeight : 0;
  refY = sh ? sh + (innerHeight - sh) / 2 : innerHeight / 2;
}
function stepFloat() {
  const y = scrollY + refY;
  if (!centers.length || y <= centers[0]) return -1;
  for (let i = 1; i < centers.length; i++) {
    if (y < centers[i]) return i - 2 + (y - centers[i - 1]) / (centers[i] - centers[i - 1]);
  }
  return centers.length - 2;
}
let lastOn = -2;
function markOn(f) {
  const k = Math.round(f);
  const on = k >= 0 && Math.abs(f - k) < 0.42 ? k : -2;
  if (on === lastOn) return;
  lastOn = on;
  stepEls.forEach((el, i) => el.classList.toggle('on', i === on));
}
function onScroll() {
  bar.classList.toggle('solid', timeEl.getBoundingClientRect().bottom < 80);
  if (MODE === 'gl') markOn(stepFloat());
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { measure(); onScroll(); });

render();
onScroll();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); onScroll(); });
addEventListener('load', () => { measure(); onScroll(); });

/* ---------------------------------------------------------------------------------------------
   The instrument
   --------------------------------------------------------------------------------------------- */
if (MODE !== 'nogl') {
  try { buildInstrument(); } catch (e) {
    console.warn('orrery: no instrument', e);
    html.classList.remove('gl', 'still'); html.classList.add('nogl');
  }
}

function buildInstrument() {
  const canvas = $('#orrery');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.environment = makeEnvironment(renderer);
  scene.environmentIntensity = 0.95;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 80);
  const TARGET = new THREE.Vector3(0, -0.6, 0);
  const ELEV = 0.17;

  // light: one warm key from upper left (it casts the shadow on the page), a soft sky fill
  const key = new THREE.DirectionalLight(0xfff1de, 2.1);
  key.position.set(-3.2, 12, 4.2);
  key.target.position.set(0, -1.5, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(0xfff8ec, 0x8a7458, 0.35));

  // materials
  const brass = (hex, rough) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), metalness: 1, roughness: rough });
  const M = {
    brass: brass('#cfa560', 0.32),
    brassDark: brass('#9c7741', 0.42),
    ink: new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a2e21'), metalness: 0.3, roughness: 0.6 }),
    walnut: new THREE.MeshStandardMaterial({ color: new THREE.Color('#4b3424'), metalness: 0, roughness: 0.5 }),
    paper: new THREE.MeshStandardMaterial({ color: new THREE.Color('#f7f3ea'), metalness: 0, roughness: 0.85 }),
  };
  const RING_REST = new THREE.Color('#cda25c');
  const RING_DIM = new THREE.Color('#8e6f42');
  const RING_LIT = new THREE.Color('#e2bd76');

  const root = new THREE.Group();
  scene.add(root);
  const cast = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  // a flat brass band (a washer) in the XY plane, centred on z = 0
  const washer = (r0, r1, depth, seg = 200) => {
    const sh = new THREE.Shape(); sh.absarc(0, 0, r1, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, r0, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, {
      depth, curveSegments: seg, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: Math.min(depth * 0.25, (r1 - r0) * 0.2), bevelSegments: 2,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  };

  // ---- the frame: meridian ring, tilted axis, pivots, the earth
  const MR0 = 3.06, MR1 = 3.19;
  const cradle = new THREE.Group();
  root.add(cradle);
  const meridian = new THREE.Mesh(washer(MR0, MR1, 0.042, 256), M.brass);
  cradle.add(cast(meridian));

  // engraved degrees on both faces of the meridian: every 5, longer every 30
  const tickGeo = new THREE.BoxGeometry(1, 0.0075, 0.004);
  const nT = 72;
  const ticks = new THREE.InstancedMesh(tickGeo, M.ink, nT * 2);
  const dummy = new THREE.Object3D();
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < nT; i++) {
      const a = (i / nT) * Math.PI * 2;
      const len = i % 6 === 0 ? 0.085 : 0.04;
      const rr = MR1 - 0.012 - len / 2;
      dummy.position.set(Math.cos(a) * rr, Math.sin(a) * rr, (s ? -1 : 1) * 0.0335);
      dummy.rotation.set(0, 0, a);
      dummy.scale.set(len, 1, 1);
      dummy.updateMatrix();
      ticks.setMatrixAt(s * nT + i, dummy.matrix);
    }
  }
  cradle.add(ticks);

  const TILT = 0.4084; // 23.4 degrees
  const axis = new THREE.Group();
  axis.rotation.z = TILT;
  cradle.add(axis);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, MR0 * 2, 16), M.brassDark);
  axis.add(cast(rod));
  for (const sgn of [1, -1]) {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.062, 24, 16), M.brass);
    pin.position.y = sgn * (MR0 - 0.02);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.08, 24), M.brassDark);
    collar.position.y = sgn * 1.04;
    collar.rotation.x = sgn < 0 ? Math.PI : 0;
    axis.add(cast(pin), cast(collar));
  }
  const spin = new THREE.Group();
  axis.add(spin);
  const earthTex = new THREE.CanvasTexture(drawEarth(null));
  earthTex.colorSpace = THREE.SRGBColorSpace;
  earthTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.82, metalness: 0 }),
  );
  spin.add(cast(earth));

  // ---- the stand: a turned brass stem on a walnut foot, meeting the meridian at its lowest point
  const FLOOR = -4.42;
  const stemPts = [
    [0, -4.24], [0.5, -4.24], [0.42, -4.17], [0.26, -4.08], [0.17, -3.98], [0.13, -3.86], [0.12, -3.74],
    [0.165, -3.68], [0.185, -3.63], [0.165, -3.58], [0.11, -3.53], [0.09, -3.42], [0.1, -3.3], [0.125, -3.25], [0.125, -3.2], [0, -3.2],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  root.add(cast(new THREE.Mesh(new THREE.LatheGeometry(stemPts, 96), M.brass)));
  const footPts = [
    [0, FLOOR], [1.12, FLOOR], [1.16, FLOOR + 0.03], [1.16, FLOOR + 0.09], [1.1, FLOOR + 0.13], [0.95, FLOOR + 0.16], [0.62, FLOOR + 0.18], [0, FLOOR + 0.18],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  root.add(cast(new THREE.Mesh(new THREE.LatheGeometry(footPts, 96), M.walnut)));
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.1), M.brassDark);
  shoe.position.y = -MR1 - 0.02;
  root.add(cast(shoe));

  // the page itself catches the shadow
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: new THREE.Color('#5c4529'), opacity: 0.17 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---- one ring per trip, inner = oldest; each carries a tiny print (or a bead) for its trip
  const R0 = 1.4, R1 = 2.86;
  const n = trips.length;
  const loader = new THREE.TextureLoader();
  const rnd = mulberry(1127);
  const Z = new THREE.Vector3(0, 0, 1);
  const rings = trips.map((t, i) => {
    const r = n > 1 ? R0 + (i * (R1 - R0)) / (n - 1) : R0;
    const pivot = new THREE.Group();
    root.add(pivot);
    const mat = M.brass.clone();
    mat.color.copy(RING_REST);
    const band = new THREE.Mesh(washer(r - 0.017, r + 0.017, 0.013, 200), mat);
    pivot.add(cast(band));

    // the marker sits on the ring at angle 0 of its own plane
    const marker = new THREE.Group();
    marker.position.set(r, 0, 0);
    pivot.add(marker);
    if (t.photos.length) {
      const s = slides[t.photos[0]];
      const a = s.w / s.h;
      const pw = a >= 1 ? 0.3 : 0.3 * a, ph = a >= 1 ? 0.3 / a : 0.3;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.07, 10), M.brassDark);
      post.rotation.x = Math.PI / 2; post.position.z = 0.035;
      const mount = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.036, ph + 0.036, 0.008), M.paper);
      mount.position.z = 0.072;
      const pmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0 });
      const photo = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), pmat);
      photo.position.z = 0.0768;
      loader.load(`${IMG}640/${s.file}`, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        pmat.map = tex; pmat.needsUpdate = true;
        requestRender();
      });
      marker.add(cast(post), cast(mount), photo);
    } else {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.048, 24, 16), M.brass);
      marker.add(cast(bead));
    }

    // its resting tilt: all near one plane, each a touch different
    const rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      -Math.PI / 2 + 0.47 + (rnd() - 0.5) * 0.07, (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.08,
    ));
    // the swing it settles out of on arrival
    const swingAxis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() * 0.3).normalize();
    return {
      t, r, pivot, mat, marker, rest, swingAxis,
      swing: 1.1 + rnd() * 1.2,
      phase: rnd() * Math.PI * 2,
      rate: 2.0 / Math.pow(r, 1.5),
    };
  });

  /* ---------- motion ---------- */
  const FWD = new THREE.Vector3(0, Math.sin(ELEV), Math.cos(ELEV));
  const qPresentWorld = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.42, 0, 0));
  const qRootInv = new THREE.Quaternion();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
  const PRESENT_AT = -0.42; // where the trip's print comes to rest on a ring that faces us: right, a little low
  const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const lerpAng = (a, b, u) => a + angDiff(a, b) * u;

  // which longitude faces us at each step: home for the opening, the trip's first country after
  const home = C[S.home] ? C[S.home].ll[1] : 121;
  const stepLng = steps.map((st) => {
    const c = st.kind === 'earlier' ? null : C[st.trips[0].countries[0]];
    return c ? c.ll[1] : home;
  });
  const lngAt = (f) => {
    if (f <= -1) return home;
    const k = Math.floor(f), u = smooth(0.15, 0.85, f - k);
    const a = k < 0 ? home : stepLng[Math.min(k, stepLng.length - 1)];
    const b = stepLng[Math.min(k + 1, stepLng.length - 1)];
    return a + angDiff(a * Math.PI / 180, b * Math.PI / 180) * 180 / Math.PI * u;
  };

  let fs = -1;               // the smoothed step number the instrument follows
  let earthYaw = null;
  let born = null;           // when the arrival began
  let prev = performance.now();
  const still = MODE === 'still';

  function pose(now) {
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    const f = still ? -1 : stepFloat();
    fs = still ? -1 : fs + (f - fs) * (1 - Math.exp(-dt * 5));
    const at = still ? 99 : born === null ? 0 : (now - born) / 1000;
    const tIdle = still ? 0 : now / 1000;

    // the whole instrument turns slowly through time; on arrival it comes round from the left
    const through = smooth(-1, steps.length - 1, fs);
    const arrive = 1 - Math.pow(1 - Math.min(1, at / 2.8), 3);
    root.rotation.y = -0.38 + through * 0.55 - (1 - arrive) * 0.9;
    root.updateMatrixWorld();
    qRootInv.copy(root.quaternion).invert();
    qb.copy(qRootInv).multiply(qPresentWorld);   // a ring facing us, in the instrument's own terms

    let lit = 0;
    for (const R of rings) lit = Math.max(lit, 1 - Math.min(1, Math.abs(fs - R.t.step) * 1.5));
    rings.forEach((R, i) => {
      const w = smooth(0, 1, 1 - Math.abs(fs - R.t.step) * 1.5);
      // settle: a damped swing, inner rings first
      const tau = at - (0.25 + i * 0.07);
      const g = born === null && !still ? 1 : tau < 0 ? 1 : Math.exp(-2.3 * tau) * Math.cos(4.4 * tau);
      qa.slerpQuaternions(R.rest, qb, w);
      qc.setFromAxisAngle(R.swingAxis, R.swing * g);
      qa.multiply(qc);
      const orbit = R.phase + (fs + 1) * R.rate + tIdle * 0.012 * R.rate;
      qc.setFromAxisAngle(Z, lerpAng(orbit, PRESENT_AT, w));
      qa.multiply(qc);
      R.pivot.quaternion.copy(qa);
      // and it comes forward, toward the reader, clear of the others
      R.pivot.position.copy(FWD).multiplyScalar(0.85 * w).applyQuaternion(qRootInv);
      R.marker.scale.setScalar(1 + 1.1 * w);
      R.mat.color.copy(RING_REST).lerp(RING_DIM, lit * (1 - w) * 0.9).lerp(RING_LIT, w);
      R.mat.roughness = 0.36 - 0.1 * w;
    });

    // the earth turns to the place being read
    const lng = lngAt(fs) * Math.PI / 180;
    const target = -Math.PI / 2 - lng - root.rotation.y;
    earthYaw = earthYaw === null || still ? target : lerpAng(earthYaw, target, 1 - Math.exp(-dt * 3));
    spin.rotation.y = earthYaw + (1 - arrive) * 1.4;

    // wide screens: the instrument moves left to make room for the trips
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!still && !phone()) camera.setViewOffset(w, h, smooth(-1, -0.15, fs) * 0.2 * w, 0, w, h);
    else camera.clearViewOffset();
  }

  function fit() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const rv = phone() ? 4.35 : 4.55, rh = phone() ? 3.75 : 3.45;
    const dist = Math.max(rv / tan, rh / (tan * camera.aspect));
    camera.position.set(0, TARGET.y + Math.sin(ELEV) * dist, Math.cos(ELEV) * dist);
    camera.lookAt(TARGET);
    camera.near = dist * 0.5; camera.far = dist * 2;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    pose(now);
    renderer.render(scene, camera);
  }

  let pending = false;
  function requestRender() {
    if (!still || pending) return;
    pending = true;
    requestAnimationFrame((now) => { pending = false; frame(now); });
  }

  fit();
  addEventListener('resize', () => { fit(); requestRender(); });

  // the arrival starts once the earth is drawn (or after a short wait)
  const begin = () => {
    if (born !== null) return;
    stage.classList.add('ready');
    born = performance.now();
    requestRender();
  };
  fetch('../../journey/vendor/countries-110m.json').then((r) => r.json()).then((topo) => {
    drawEarth(topo, earthTex.image);
    earthTex.needsUpdate = true;
    begin();
  }).catch(() => begin());
  setTimeout(begin, 1600);

  if (still) {
    requestRender();
  } else {
    // run only while the instrument is on screen
    let running = false;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; prev = performance.now(); renderer.setAnimationLoop(frame); }
      else if (!e.isIntersecting && running) { running = false; renderer.setAnimationLoop(null); }
    }).observe(timeEl);
  }
}

/* ---------------------------------------------------------------------------------------------
   A warm studio to reflect in: a dim room with two soft windows and a pale floor
   --------------------------------------------------------------------------------------------- */
function makeEnvironment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.42, 0.36, 0.28), side: THREE.BackSide }));
  room.position.y = 3;
  env.add(room);
  const panel = (w, h, rgb, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(8, 6, [9, 7.9, 6.2], -7, 7, 6);      // the big window, upper left
  panel(2.2, 9, [2.6, 2.55, 2.4], 9, 2, -2);  // a cool strip on the right
  panel(10, 1.6, [2.4, 2.1, 1.7], 0, 6, -10); // a low light behind
  panel(22, 22, [0.75, 0.66, 0.52], 0, -5, 0); // the paper floor
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.035).texture;
  pm.dispose();
  return tex;
}

/* ---------------------------------------------------------------------------------------------
   The earth's paper: an engraved sea, plain land, his countries washed in sepia
   --------------------------------------------------------------------------------------------- */
function drawEarth(topo, cv) {
  const Wd = 2048, Ht = 1024;
  if (!cv) { cv = document.createElement('canvas'); cv.width = Wd; cv.height = Ht; }
  const g = cv.getContext('2d');
  g.fillStyle = '#e2d6bd';
  g.fillRect(0, 0, Wd, Ht);
  g.strokeStyle = 'rgba(84, 60, 32, 0.17)';
  g.lineWidth = 1;
  g.beginPath();
  for (let y = 2; y < Ht; y += 5) { g.moveTo(0, y + 0.5); g.lineTo(Wd, y + 0.5); }
  g.stroke();
  if (!window.d3) return cv;
  const proj = d3.geoEquirectangular().scale(Wd / (2 * Math.PI)).translate([Wd / 2, Ht / 2]);
  const path = d3.geoPath(proj, g);
  if (topo && window.topojson) {
    const obj = topo.objects.countries;
    const land = topojson.feature(topo, obj);
    g.beginPath(); path(land); g.fillStyle = '#f3ede0'; g.fill();
    const mine = land.features.filter((f) => S.countries.some((c) => d3.geoContains(f, [c.ll[1], c.ll[0]])));
    g.beginPath(); mine.forEach((f) => path(f)); g.fillStyle = 'rgba(166, 116, 52, 0.32)'; g.fill();
    g.beginPath(); path(topojson.mesh(topo, obj, (a, b) => a !== b));
    g.strokeStyle = 'rgba(58, 44, 28, 0.38)'; g.lineWidth = 0.8; g.stroke();
    g.beginPath(); path(topojson.mesh(topo, obj, (a, b) => a === b));
    g.strokeStyle = 'rgba(52, 38, 22, 0.85)'; g.lineWidth = 1.8; g.stroke();
    // the small places the coarse map leaves out still get their mark
    g.fillStyle = 'rgba(52, 38, 22, 0.85)';
    for (const c of S.countries) {
      const [x, y] = proj([c.ll[1], c.ll[0]]);
      g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill();
    }
  }
  g.beginPath(); path(d3.geoGraticule().step([15, 15])());
  g.strokeStyle = 'rgba(58, 44, 28, 0.22)'; g.lineWidth = 1; g.stroke();
  return cv;
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
