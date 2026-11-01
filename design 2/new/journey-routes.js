/* Journey routes (just for fun, 2026-11-01). His trips flown and driven again on a paper globe.
   Flights rise in great-circle arcs, as high as they are long; trains (slate, dashed) and roads
   (olive) hug the ground. A small plane, or a dot on the ground, runs along each leg in order, the
   line drawing itself behind it, and the camera follows: close in for a road inside a country,
   far out for a long flight. Trip after trip, oldest first, or pick one from the list.
   Standalone; reads window.SITE (../data.js) and nothing on the live Journey page. */
import * as THREE from 'three';
import { LineSegments2 } from '../vendor/three/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../vendor/three/lines/LineSegmentsGeometry.js';
import { LineMaterial } from '../vendor/three/lines/LineMaterial.js';

const S = window.SITE || { journeys: [], countries: [] };
const D = Math.PI / 180;
const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduce = reduceQ.matches;
reduceQ.addEventListener?.('change', (e) => { reduce = e.matches; });

/* ---------- words, both languages ---------- */
const WORDS = {
  en: {
    name: 'Journey routes', back: 'Journey', other: '中文', play: 'Play', pause: 'Pause', next: 'Next',
    flight: 'flight', train: 'train', bus: 'bus', car: 'car', ground: 'overland', road: 'road',
    noRoute: 'no route recorded', join: ', ', trips: 'Trips',
    title: 'Journey routes · tuan photography 陳亮元',
    desc: 'Every trip Thomas Chen has taken, flown and driven again on a paper globe: flights between countries, trains and roads within them.',
    globe: 'A globe showing the routes of every trip',
  },
  zh: {
    name: '旅程路線圖', back: '旅程', other: 'English', play: '播放', pause: '暫停', next: '下一段',
    flight: '飛機', train: '火車', bus: '巴士', car: '自駕', ground: '陸路', road: '公路',
    noRoute: '沒有記錄路線', join: '、', trips: '旅程',
    title: '旅程路線圖 · tuan photography 陳亮元',
    desc: '陳亮元走過的每一趟旅程，在紙地球上重新飛一遍、開一遍：國與國之間的航班，國內的火車與公路。',
    globe: '顯示每趟旅程路線的地球',
  },
};
let lang = 'en';
try { lang = localStorage.getItem('tlap-lang') === 'zh' ? 'zh' : 'en'; } catch (e) { /* storage blocked */ }
const W = () => WORDS[lang];
const cityName = (p) => (lang === 'zh' ? p.zh || p.city : p.city);

/* ---------- colours, read from the stylesheet's tokens ---------- */
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
const rootStyle = getComputedStyle(document.documentElement);
function token(name) {
  const css = rootStyle.getPropertyValue(name).trim() || '#888';
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#888';
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return { css, color: new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace) };
}
const C = Object.fromEntries(['bg', 'band', 'paper', 'line', 'text', 'text-2', 'accent', 'clay', 'olive', 'slate'].map((n) => [n, token('--' + n)]));
const MODE_COLOUR = { flight: 'clay', train: 'slate', bus: 'olive', car: 'olive', ground: 'olive' };
const kindOf = (mode) => (mode === 'flight' ? 'flight' : mode === 'train' ? 'train' : 'road');

/* ---------- the sphere's sums (matching three's SphereGeometry texture layout) ---------- */
const toVec = (lat, lng, r = 1) => {
  const la = lat * D, lo = lng * D;
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(r);
};
const latOf = (v) => Math.asin(THREE.MathUtils.clamp(v.y / v.length(), -1, 1)) / D;
const lngOf = (v) => Math.atan2(-v.z, v.x) / D;
function slerp(a, b, t, out = new THREE.Vector3()) {
  const w = a.angleTo(b);
  if (w < 1e-6) return out.copy(a);
  const s = Math.sin(w);
  return out.copy(a).multiplyScalar(Math.sin((1 - t) * w) / s).addScaledVector(b, Math.sin(t * w) / s);
}
const wrap = (d) => ((d + 540) % 360) - 180;
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

/* ---------- the trips, oldest first ---------- */
const countryById = Object.fromEntries((S.countries || []).map((c) => [c.id, c]));

/* One place per city: a flight lands at the airport and the next road leaves from the centre, which
   at close range showed as two dots and a jump. Points with the same name within 70 km become one,
   the city centre (home, then the ground legs' points) winning over the airport. */
const PLACES = [];
const SNAP = 70 / 6371;
function place(p) {
  const v = toVec(p.lat, p.lng);
  for (const q of PLACES) if (q.city === p.city && q.v.angleTo(v) < SNAP) return q;
  const q = { city: p.city, zh: p.zh, lat: p.lat, lng: p.lng, v };
  PLACES.push(q);
  return q;
}
const homePlace = S.flightsFrom ? place({ city: 'Taipei', zh: '台北', lat: S.flightsFrom[0], lng: S.flightsFrom[1] }) : null;
const okLeg = (l) => l && l.from && l.to && isFinite(l.from.lat) && isFinite(l.to.lat);
for (const j of S.journeys || []) for (const l of j.legs || []) if (okLeg(l) && l.mode !== 'flight') { place(l.from); place(l.to); }

const flightHeight = (angle) => Math.min(0.22, 0.01 + angle * 0.09);
function arcPoints(A, B, angle, h, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const r = h ? 1.002 + h * Math.sin(Math.PI * s) : 1.0025 + angle * 0.03 * Math.sin(Math.PI * s);
    pts.push(slerp(A, B, s).normalize().multiplyScalar(r));
  }
  return pts;
}
const TRIPS = (S.journeys || []).slice().reverse().map((j) => {
  let prev = null;
  const legs = (j.legs || []).filter(okLeg).map((raw) => {
    const from = place(raw.from), to = place(raw.to);
    const l = { ...raw, from, to };
    const A = from.v, B = to.v;
    const angle = A.angleTo(B);
    const flight = l.mode === 'flight';
    const h = flight ? flightHeight(angle) : 0;
    const n = Math.max(24, Math.min(220, Math.ceil(angle / D * 2)));
    const pts = arcPoints(A, B, angle, h, n);
    const dur = flight ? 2.4 + angle * 1.8 : 1.8 + Math.min(angle * 25, 2);
    // the last leg ended somewhere else (Sapa, then Lao Cai): a short faint link, the traveller slides along it
    let gap = null;
    if (prev && prev.to !== from) {
      const ga = prev.to.v.angleTo(A);
      gap = { A: prev.to.v, B: A, angle: ga, pts: arcPoints(prev.to.v, A, ga, 0, 24), dur: 0.5 + Math.min(ga * 20, 0.6) };
    }
    prev = l;
    return { ...l, A, B, angle, h, pts, dur, gap, kind: kindOf(l.mode) };
  });
  const countries = (j.countries || []).map((id) => countryById[id]).filter(Boolean);
  return { ...j, legs, countryList: countries };
});

/* ---------- renderer, scene, camera ---------- */
const canvas = document.getElementById('globe');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(C.bg.color, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.005, 40);
const res = new THREE.Vector2(1, 1);

// the globe: plain paper until the painted sheet is ready
const globeMat = new THREE.MeshBasicMaterial({ color: C.paper.color });
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), globeMat);
scene.add(globe);
// a thin ink rim, so the ball reads against the paper page
const rim = new THREE.Mesh(new THREE.SphereGeometry(1.006, 96, 64), new THREE.MeshBasicMaterial({ color: C.line.color, side: THREE.BackSide }));
scene.add(rim);

/* ---------- the painted sheet: relief, land, the countries he went to, the borders ---------- */
const ALIAS = { usa: 'United States of America', uk: 'United Kingdom', dubai: 'United Arab Emirates', 'south-korea': 'South Korea' };
async function paintSheet() {
  // a sharper sheet where the screen and the graphics card allow it: roads inside a country are seen close
  const small = Math.min(innerWidth, innerHeight) < 700;
  const maxTex = renderer.capabilities.maxTextureSize || 4096;
  const Wd = Math.min(maxTex, small ? 4096 : 8192), Ht = Wd / 2;
  const cv = document.createElement('canvas');
  cv.width = Wd; cv.height = Ht;
  const g = cv.getContext('2d');
  const X = (lng) => ((lng + 180) / 360) * Wd, Y = (lat) => ((90 - lat) / 180) * Ht;
  let world = null, relief = null;
  try { world = await (await fetch('../vendor/countries-50m.json')).json(); } catch (e) { /* drawn without land */ }
  try {
    relief = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = '../vendor/relief/SR_50M-4096.jpg'; });
  } catch (e) { /* drawn without relief */ }
  const topo = window.topojson;
  g.fillStyle = C.paper.css;
  g.fillRect(0, 0, Wd, Ht);
  // faint graticule every 30 degrees
  g.strokeStyle = C.line.css; g.globalAlpha = 0.55; g.lineWidth = Wd / 4096;
  for (let lng = -180; lng <= 180; lng += 30) { g.beginPath(); g.moveTo(X(lng), 0); g.lineTo(X(lng), Ht); g.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(Wd, Y(lat)); g.stroke(); }
  g.globalAlpha = 1;
  const d3 = window.d3;
  if (world && topo && d3) {
    // d3 cuts every shape cleanly at the 180 degree line and closes Antarctica along the bottom edge,
    // so Russia, Fiji and the South Pole no longer paint bands across the sheet
    const path = d3.geoPath(d3.geoEquirectangular().scale(Wd / (2 * Math.PI)).translate([Wd / 2, Ht / 2]).precision(0.2), g);
    const land = topo.feature(world, world.objects.land);
    g.beginPath(); path(land);
    g.fillStyle = C.band.css; g.fill();
    if (relief) {
      g.save(); g.clip();
      g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.36;
      g.drawImage(relief, 0, 0, Wd, Ht);
      g.restore();
    }
    // the countries he has been to, a light clay wash
    const names = new Set((S.countries || []).map((c) => ALIAS[c.id] || c.name.en));
    const countries = topo.feature(world, world.objects.countries).features;
    g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.22; g.fillStyle = C.clay.css;
    for (const f of countries) if (names.has(f.properties && f.properties.name)) { g.beginPath(); path(f); g.fill(); }
    g.restore();
    // borders and coasts in light ink
    g.strokeStyle = C['text-2'].css; g.globalAlpha = 0.35; g.lineWidth = Wd / 5200; g.lineJoin = 'round'; // thin: up close the sheet is seen magnified
    g.beginPath(); path(topo.mesh(world, world.objects.countries));
    g.stroke(); g.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  globeMat.map = tex; globeMat.color.set(0xffffff); globeMat.needsUpdate = true;
}
paintSheet();

/* ---------- lines ---------- */
const lineMats = [];
function makeLine(kind, colourName, width, opacity, positions, unconfirmed) {
  const dashed = kind === 'train';
  const m = new LineMaterial({
    color: C[colourName].color, linewidth: width, transparent: true, opacity: unconfirmed ? opacity * 0.55 : opacity,
    resolution: res, dashed, dashSize: 0.01, gapSize: 0.007, depthWrite: false,
  });
  m.userData.dashed = dashed;
  lineMats.push(m);
  const l = new LineSegments2(new LineSegmentsGeometry().setPositions(positions), m);
  if (dashed) l.computeLineDistances();
  l.frustumCulled = false;
  return l;
}
const segs = (pts) => {
  const a = new Float32Array((pts.length - 1) * 6);
  for (let i = 0; i < pts.length - 1; i++) { pts[i].toArray(a, i * 6); pts[i + 1].toArray(a, i * 6 + 3); }
  return a;
};

// every trip, faint, always there: the whole web of his travels
const faint = new THREE.Group();
scene.add(faint);
{
  const byKind = { flight: [], train: [], road: [] };
  for (const t of TRIPS) for (const l of t.legs) byKind[l.kind].push(segs(l.pts));
  for (const [k, arrs] of Object.entries(byKind)) {
    if (!arrs.length) continue;
    const all = new Float32Array(arrs.reduce((n, a) => n + a.length, 0));
    let o = 0; for (const a of arrs) { all.set(a, o); o += a.length; }
    // ground lines are short, so they get a touch more weight than the long flights to stay legible
    faint.add(makeLine(k, k === 'flight' ? 'clay' : k === 'train' ? 'slate' : 'olive', k === 'flight' ? 1 : 1.25, k === 'flight' ? 0.2 : 0.4, all));
  }
}

/* ---------- city dots ---------- */
const dotGeo = new THREE.CircleGeometry(1, 20);
const dots = [];
const dotMat = { faint: new THREE.MeshBasicMaterial({ color: C['text-2'].color, transparent: true, opacity: 0.45, depthWrite: false }),
  strong: new THREE.MeshBasicMaterial({ color: C.text.color, depthWrite: false }),
  home: new THREE.MeshBasicMaterial({ color: C.accent.color, depthWrite: false }) };
const cities = new Map();      // one dot per place (see PLACES above)
function addCity(p) {
  if (cities.has(p)) return cities.get(p);
  const P = toVec(p.lat, p.lng);
  const m = new THREE.Mesh(dotGeo, dotMat.faint);
  m.position.copy(P).multiplyScalar(1.0015);
  m.lookAt(P.clone().multiplyScalar(2));
  m.renderOrder = 2;
  scene.add(m);
  const c = { p, P, mesh: m, size: 1, label: null };
  cities.set(p, c); dots.push(c);
  return c;
}
const home = homePlace ? addCity(homePlace) : null;
if (home) { home.mesh.material = dotMat.home; home.size = 1.4; }
for (const t of TRIPS) {
  for (const l of t.legs) { l.cFrom = addCity(l.from); l.cTo = addCity(l.to); }
  if (!t.legs.length) t.pins = t.countryList.map((c) => addCity(place({ city: c.name.en, zh: c.name.zh, lat: c.ll[0], lng: c.ll[1] })));
}

/* ---------- the traveller: a small paper plane in the air, a dot on the ground ---------- */
function planeShape() {
  const half = [[0, 1], [0.1, 0.78], [0.12, 0.3], [0.95, -0.05], [0.95, -0.2], [0.12, 0.02], [0.09, -0.6], [0.38, -0.82], [0.38, -0.95], [0, -0.86]];
  const s = new THREE.Shape();
  half.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  for (let i = half.length - 2; i > 0; i--) s.lineTo(-half[i][0], half[i][1]);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}
// depth-tested, so a traveller left on the far side of a turned globe stays hidden behind it
const inkMat = new THREE.MeshBasicMaterial({ color: C.text.color, depthWrite: false });
const plane = new THREE.Mesh(planeShape(), inkMat);
// on the ground: a small ink dot with a thin paper edge, so it reads over its own line without hiding the city
const walker = new THREE.Group();
walker.add(new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ color: C.paper.color, depthWrite: false })));
const walkerDot = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), inkMat);
walkerDot.position.z = 0.002;
walker.add(walkerDot);
const marker = new THREE.Group();
marker.add(plane, walker);
marker.renderOrder = 10;
plane.renderOrder = 10; walker.children.forEach((c, i) => { c.renderOrder = 11 + i; }); // the ink dot after its paper edge
marker.visible = false;
scene.add(marker);

/* ---------- the trip being shown ---------- */
const live = new THREE.Group();
scene.add(live);
let trip = null;          // TRIPS[i]
let tripIndex = -1;
let legLines = [];
let gapLines = [];        // per leg: the faint link from where the last leg ended, or null
function showTrip(i) {
  tripIndex = (i + TRIPS.length) % TRIPS.length;
  trip = TRIPS[tripIndex];
  for (const l of [...legLines, ...gapLines]) {
    if (!l) continue;
    l.geometry.dispose(); l.material.dispose(); lineMats.splice(lineMats.indexOf(l.material), 1); live.remove(l);
  }
  legLines = trip.legs.map((l) => {
    const line = makeLine(l.kind, MODE_COLOUR[l.mode] || 'olive', l.kind === 'flight' ? 2.2 : 2.6, 0.95, segs(l.pts), l.confirmed === false);
    line.geometry.instanceCount = 0;
    line.renderOrder = 3;
    live.add(line);
    return line;
  });
  gapLines = trip.legs.map((l) => {
    if (!l.gap) return null;
    const line = makeLine('train', 'text-2', 1.25, 0.6, segs(l.gap.pts));
    line.geometry.instanceCount = 0;
    line.renderOrder = 3;
    live.add(line);
    return line;
  });
  // this trip's cities stand out, with their names
  const mine = new Set();
  trip.legs.forEach((l) => { mine.add(l.cFrom); mine.add(l.cTo); });
  (trip.pins || []).forEach((c) => mine.add(c));
  for (const c of dots) {
    if (c === home) continue;
    c.mesh.material = mine.has(c) ? dotMat.strong : dotMat.faint;
    c.size = mine.has(c) ? 1.15 : 0.8;
  }
  setLabels([home, ...mine].filter(Boolean)); // home first, so its name keeps the home colour
  renderList();
  writeCaption();
}

/* ---------- names beside the dots ---------- */
const labelsEl = document.getElementById('labels');
let labelled = [];
function setLabels(list) {
  labelsEl.textContent = '';
  labelled = [];
  const seen = new Set();
  for (const c of list) {
    const name = cityName(c.p);
    if (seen.has(name)) continue; // a pin and a city with the same name: one name each
    seen.add(name);
    const el = document.createElement('span');
    el.className = 'jr-label' + (c === home ? ' is-home' : '');
    el.textContent = name;
    labelsEl.appendChild(el);
    labelled.push({ c, el, w: 0, h: 0 });
  }
  requestAnimationFrame(() => labelled.forEach((L) => { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }));
}
const proj = new THREE.Vector3(), toCam = new THREE.Vector3();
function placeLabels() {
  const w = innerWidth, h = innerHeight;
  const taken = [];
  for (const L of labelled) {
    const P = L.c.P;
    toCam.copy(camera.position).sub(P);
    const facing = toCam.dot(P) / toCam.length();
    proj.copy(P).project(camera);
    const x = (proj.x * 0.5 + 0.5) * w + 8, y = (-proj.y * 0.5 + 0.5) * h - L.h / 2;
    let on = facing > 0.12 && proj.z < 1 && x > 0 && x < w - 20 && y > 0 && y < h;
    if (on) {
      const r = [x - 2, y - 1, x + L.w + 2, y + L.h + 1];
      if (taken.some((t) => r[0] < t[2] && r[2] > t[0] && r[1] < t[3] && r[3] > t[1])) on = false;
      else taken.push(r);
    }
    L.el.classList.toggle('is-on', on);
    // placement only, changing every frame: the stylesheet turns --x and --y into the transform
    if (on) { L.el.style.setProperty('--x', x.toFixed(1) + 'px'); L.el.style.setProperty('--y', y.toFixed(1) + 'px'); }
  }
}

/* ---------- the camera: a point on the globe, a height above it, a gentle tilt ---------- */
const cam = { lat: 23.5, lng: 121, alt: 2.6 };
const aim = { lat: 23.5, lng: 121, alt: 2.4 };
const north = new THREE.Vector3(), lookAt = new THREE.Vector3(), camDir = new THREE.Vector3();
function placeCamera() {
  const P = toVec(cam.lat, cam.lng);
  const la = cam.lat * D, lo = cam.lng * D;
  north.set(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
  const close = THREE.MathUtils.clamp((1.4 - cam.alt) / 1.2, 0, 1);
  const tilt = 0.08 + 0.5 * close;
  camDir.copy(P).multiplyScalar(Math.cos(tilt)).addScaledVector(north, -Math.sin(tilt));
  camera.position.copy(P).addScaledVector(camDir, cam.alt);
  camera.up.copy(north);
  // far out, look at the globe's middle; from about 0.8 down, look right at the point, so a close leg
  // sits in the middle of the free screen instead of drifting up toward the top bar
  lookAt.copy(P).multiplyScalar(THREE.MathUtils.clamp((2.0 - cam.alt) / 1.2, 0, 1));
  camera.lookAt(lookAt);
}
// no closer than about 0.32: nearer than that the map's coastlines and the painted sheet turn rough
const ALT_MIN = 0.32, ZOOM_MIN = 0.25, ZOOM_MAX = 3.5;
let frameK = 1; // how much smaller the free part of the screen is than the whole (see layoutView)
const altFor = (angle, h) => THREE.MathUtils.clamp((0.1 + angle * 1.9 + h * 1.2) * frameK, ALT_MIN, 2.8);
function aimAt(v, alt) { aim.lat = latOf(v); aim.lng = lngOf(v); aim.alt = alt; }
function overview(t) {
  const vs = t.legs.length ? t.legs.flatMap((l) => [l.A, l.B]) : t.countryList.map((c) => toVec(c.ll[0], c.ll[1]));
  if (!vs.length) return;
  const mid = vs.reduce((s, v) => s.add(v), new THREE.Vector3());
  if (mid.lengthSq() < 1e-6) mid.copy(vs[0]);
  mid.normalize();
  const spread = Math.max(...vs.map((v) => v.angleTo(mid)));
  aimAt(mid, THREE.MathUtils.clamp((0.25 + spread * 2.6) * frameK, ALT_MIN, 3));
}

/* ---------- the story: intro, each leg, a breath between, the next trip ---------- */
const st = { phase: 'intro', leg: 0, t: 0, timer: 0 };
let playing = true;
let follow = true;
function startTrip(i) {
  showTrip(i);
  st.phase = 'intro'; st.leg = 0; st.t = 0; st.timer = reduce ? 1.6 : 1.8;
  marker.visible = false;
  follow = true;
  overview(trip);
  if (!trip.legs.length) { st.phase = 'empty'; st.timer = 3.5; }
  if (!playing) drawWhole();
  writeCaption();
}
// paused on a picked trip: the whole route at once
function drawWhole() {
  legLines.forEach((l, k) => { l.geometry.instanceCount = trip.legs[k].pts.length - 1; });
  gapLines.forEach((l, k) => { if (l) l.geometry.instanceCount = trip.legs[k].gap.pts.length - 1; });
  st.phase = 'whole';
  marker.visible = false;
  overview(trip);
  writeCaption();
}
function beginLeg(k) {
  st.leg = k;
  const gl = gapLines[k];
  if (gl) gl.geometry.instanceCount = trip.legs[k].gap.pts.length - 1;
  // a leg that starts somewhere new: slide there first (reduced motion skips the slide)
  if (gl && !reduce) { st.phase = 'gap'; st.t = 0; }
  else { st.phase = 'leg'; st.t = reduce ? 1 : 0; }
  writeCaption();
}
function nextStep() {
  if (st.phase === 'gap') st.phase = 'leg';
  if (st.phase === 'leg' || st.phase === 'hold') {
    if (st.phase === 'leg') finishLeg();
    if (st.leg + 1 < trip.legs.length) beginLeg(st.leg + 1);
    else startTrip(tripIndex + 1);
  } else if (st.phase === 'intro' && trip.legs.length) beginLeg(0);
  else startTrip(tripIndex + 1);
}
function finishLeg() {
  const line = legLines[st.leg];
  if (line) line.geometry.instanceCount = trip.legs[st.leg].pts.length - 1;
  st.t = 1;
}
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpG = new THREE.Vector3(), fwd = new THREE.Vector3(), nrm = new THREE.Vector3(), side = new THREE.Vector3(), basis = new THREE.Matrix4();
function legAim(l, e) {
  // long flights keep the whole arc in view; short legs follow the traveller closely
  const mid = slerp(l.A, l.B, 0.5, tmpA);
  const g = slerp(l.A, l.B, e, tmpG);
  const w = l.angle > 0.25 ? 0.35 : 0.9;
  aimAt(slerp(mid, g, w, tmpB), altFor(l.angle, l.h));
}
// puts the traveller at e (0 to 1) along pts; flying picks the plane or the ground dot; returns the segment reached
function placeMarker(pts, e, flying) {
  const n = pts.length - 1;
  const f = e * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
  marker.position.lerpVectors(pts[i], pts[i + 1], u);
  fwd.subVectors(pts[i + 1], pts[i]);
  nrm.copy(marker.position).normalize();
  fwd.addScaledVector(nrm, -fwd.dot(nrm));
  if (fwd.lengthSq() < 1e-12) fwd.copy(north).addScaledVector(nrm, -north.dot(nrm)); // no direction: face north on the tangent plane
  if (fwd.lengthSq() < 1e-12) fwd.set(0, 1, 0).addScaledVector(nrm, -nrm.y);
  fwd.normalize();
  side.crossVectors(fwd, nrm);
  basis.makeBasis(side, fwd, nrm);
  marker.quaternion.setFromRotationMatrix(basis);
  plane.visible = flying; walker.visible = !flying;
  marker.visible = true;
  return { n, f };
}
function placeOnLeg(l, e) {
  const { n, f } = placeMarker(l.pts, e, l.kind === 'flight');
  const legLine = legLines[st.leg];
  // the line stays just behind the traveller, never a segment ahead of it
  if (legLine) legLine.geometry.instanceCount = e >= 1 ? n : Math.min(n, Math.floor(f));
}
function update(dt) {
  if (!trip) return;
  if (playing) {
    if (st.phase === 'intro' || st.phase === 'empty') {
      st.timer -= dt;
      if (st.timer <= 0) { if (st.phase === 'intro') beginLeg(0); else startTrip(tripIndex + 1); }
    } else if (st.phase === 'gap') {
      const g = trip.legs[st.leg].gap;
      st.t = Math.min(1, st.t + dt / g.dur);
      if (st.t >= 1) { st.phase = 'leg'; st.t = 0; }
    } else if (st.phase === 'leg') {
      const l = trip.legs[st.leg];
      st.t = Math.min(1, st.t + dt / l.dur);
      if (st.t >= 1) { finishLeg(); st.phase = 'hold'; st.timer = reduce ? 2.6 : st.leg + 1 < trip.legs.length ? 1.0 : 2.2; }
    } else if (st.phase === 'hold') {
      st.timer -= dt;
      if (st.timer <= 0) { if (st.leg + 1 < trip.legs.length) beginLeg(st.leg + 1); else startTrip(tripIndex + 1); }
    }
  }
  if (st.phase === 'gap' && trip.legs[st.leg]) {
    const l = trip.legs[st.leg];
    placeMarker(l.gap.pts, ease(st.t), false);
    if (follow) legAim(l, 0);
  } else if ((st.phase === 'leg' || st.phase === 'hold') && trip.legs[st.leg]) {
    const l = trip.legs[st.leg];
    const e = ease(st.t);
    placeOnLeg(l, e);
    if (follow) {
      if (st.phase === 'hold' && st.timer < 0.9 && trip.legs[st.leg + 1]) legAim(trip.legs[st.leg + 1], 0);
      else legAim(l, e);
    }
  }
  // the camera eases toward its aim; reduced motion jumps
  if (follow) {
    const k = reduce ? 1 : 1 - Math.exp(-dt * 2.0);
    cam.lat += (aim.lat - cam.lat) * k;
    cam.lng += wrap(aim.lng - cam.lng) * k;
    cam.alt += (aim.alt - cam.alt) * k;
  }
  cam.lng = wrap(cam.lng);
}

/* ---------- words on the page ---------- */
const $ = (id) => document.getElementById(id);
function writeCaption() {
  if (!trip) return;
  $('when').textContent = trip.date ? trip.date[lang] : trip.id;
  let line;
  if (!trip.legs.length) {
    line = trip.countryList.map((c) => c.name[lang]).join(W().join) + (trip.countryList.length ? ' · ' : '') + W().noRoute;
  } else if (st.phase === 'intro' || st.phase === 'whole' || !trip.legs[st.leg]) {
    line = trip.countryList.map((c) => c.name[lang]).join(W().join);
  } else {
    const l = trip.legs[st.leg];
    line = `${cityName(l.from)} → ${cityName(l.to)} · ${W()[l.mode] || l.mode}`;
  }
  $('leg').textContent = line;
}
function renderList() {
  const ol = $('list');
  if (!ol.children.length) {
    TRIPS.forEach((t, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'jr-word'; b.dataset.i = i;
      b.addEventListener('click', () => { startTrip(i); });
      li.appendChild(b); ol.appendChild(li);
    });
  }
  [...ol.querySelectorAll('button')].forEach((b) => {
    const t = TRIPS[+b.dataset.i];
    b.textContent = t.date ? t.date[lang] : t.id;
    b.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    const cur = +b.dataset.i === tripIndex;
    b.setAttribute('aria-current', cur ? 'true' : 'false');
  });
  centreCurrent(!reduce);
  // a smooth scroll can be cut short (a busy or throttled page): make sure it ends on the trip
  clearTimeout(renderList.t);
  renderList.t = setTimeout(() => centreCurrent(false), 800);
}
// keep the trip being shown in the middle of the list (a row on a phone, a column on a computer);
// scrolls the list itself only, never the page
function centreCurrent(smooth) {
  const nav = $('list').parentElement;
  const b = $('list').querySelector('[aria-current="true"]');
  if (!b) return;
  const n = nav.getBoundingClientRect(), r = b.getBoundingClientRect();
  const left = nav.scrollLeft + (r.left + r.width / 2) - (n.left + n.width / 2);
  const top = nav.scrollTop + (r.top + r.height / 2) - (n.top + n.height / 2);
  nav.scrollTo({ left, top, behavior: smooth ? 'smooth' : 'auto' });
}
function writeWords() {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  document.title = W().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', W().desc);
  canvas.setAttribute('aria-label', W().globe);
  $('name').textContent = W().name;
  $('back').textContent = W().back;
  $('lang').textContent = W().other;
  $('lang').lang = lang === 'zh' ? 'en' : 'zh-Hant';
  $('play').textContent = playing ? W().pause : W().play;
  $('next').textContent = W().next;
  document.querySelectorAll('[data-word]').forEach((el) => { el.textContent = W()[el.dataset.word]; });
  $('list').parentElement.setAttribute('aria-label', W().trips);
  if (trip) {
    const list = labelled.map((L) => L.c);
    setLabels(list);
    renderList();
    writeCaption();
  }
}
$('lang').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem('tlap-lang', lang); } catch (e) { /* storage blocked */ }
  writeWords();
});
function setPlaying(on) {
  playing = on;
  if (on) {
    follow = true;
    if (st.phase === 'whole') startTrip(tripIndex);
  }
  $('play').textContent = playing ? W().pause : W().play;
}
$('play').addEventListener('click', () => setPlaying(!playing));
// paused, Next shows the next leg whole and stays paused
$('next').addEventListener('click', () => {
  follow = true;
  nextStep();
  if (!playing && (st.phase === 'leg' || st.phase === 'gap')) { st.phase = 'leg'; finishLeg(); st.phase = 'hold'; st.timer = 1; }
});

/* ---------- drag to turn the globe, wheel or pinch to come closer (pauses the story) ---------- */
// a plain tap does nothing: the story pauses only once the finger has really moved, or on pinch or wheel
const pointers = new Map();
let pinch0 = 0, alt0 = 0;
function takeOver() { if (playing) setPlaying(false); follow = false; }
canvas.addEventListener('pointerdown', (e) => {
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false });
  if (pointers.size === 2) {
    takeOver();
    const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); alt0 = cam.alt;
  }
});
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0 > 0) cam.alt = THREE.MathUtils.clamp(alt0 * pinch0 / Math.max(d, 1), ZOOM_MIN, ZOOM_MAX);
    return;
  }
  if (!p.moved) {
    if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 4) return;
    p.moved = true;
    takeOver();
    canvas.classList.add('is-dragging');
  }
  // the ground under the finger moves with the finger: degrees per pixel from the height and the lens
  const k = Math.min(180, cam.alt * camera.fov) / innerHeight;
  cam.lng -= dx * k / Math.max(0.3, Math.cos(cam.lat * D));
  cam.lat = THREE.MathUtils.clamp(cam.lat + dy * k, -75, 75);
});
const up = (e) => { pointers.delete(e.pointerId); if (!pointers.size) canvas.classList.remove('is-dragging'); pinch0 = 0; };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  takeOver();
  cam.alt = THREE.MathUtils.clamp(cam.alt * Math.exp(e.deltaY * 0.0012), ZOOM_MIN, ZOOM_MAX);
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('button, a, input, textarea')) return;
  if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
  else if (e.key === 'ArrowRight') { follow = true; nextStep(); }
});

/* ---------- size, the free part of the screen, and the loop ---------- */
// The globe is framed in the part of the screen the words leave free: left of the list of trips on a
// computer, above the row of trips on a phone, below the top bar. The projection is shifted so the
// camera's aim lands in the middle of that part, and frameK says how much closer it must stay.
function layoutView() {
  const w = innerWidth, h = innerHeight;
  const top = $('back').closest('header').getBoundingClientRect().bottom;
  const nowR = document.querySelector('.jr-now').getBoundingClientRect();
  const listR = $('list').parentElement.getBoundingClientRect();
  let x0 = 0, x1 = w, y0 = top, y1 = h;
  if (w > 700) { x1 = Math.max(w * 0.6, listR.left - 16); y1 = h - nowR.height * 0.55; }
  else y1 = Math.max(h * 0.5, listR.top - 8);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
  frameK = THREE.MathUtils.clamp(Math.max(h / (y1 - y0), (w / (x1 - x0)) * (h / w < 1 ? 0.6 : 1)), 1, 1.7);
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // a phone sees the globe from a little further back so it fits the narrow screen
  camera.fov = w < h ? 35 + 12 * Math.min(1, (h / w - 1)) : 35;
  res.set(w, h);
  for (const m of lineMats) m.resolution.copy(res);
  layoutView();
  camera.updateProjectionMatrix();
  centreCurrent(false);
  if (trip && follow && (st.phase === 'intro' || st.phase === 'whole' || st.phase === 'empty')) overview(trip);
}
addEventListener('resize', resize);
resize();
writeWords();
if (TRIPS.length) { startTrip(0); resize(); }

// the story's clock: a slow frame moves the story on by real time (up to a quarter second), so
// its pace does not depend on the frame rate; a hidden tab simply waits
const timer = new THREE.Timer();
timer.connect?.(document);
const camDist = new THREE.Vector3();
renderer.setAnimationLoop((now) => {
  timer.update(now);
  const dt = Math.min(0.25, timer.getDelta());
  update(dt);
  placeCamera();
  // dots, traveller and dashes keep a steady size on screen at any height
  for (const c of dots) {
    const d = camDist.copy(c.mesh.position).distanceTo(camera.position);
    c.mesh.scale.setScalar(d * 0.0026 * c.size);
  }
  if (marker.visible) marker.scale.setScalar(marker.position.distanceTo(camera.position) * 0.022);
  const dash = Math.max(0.0012, cam.alt * 0.014);
  for (const m of lineMats) if (m.userData.dashed) { m.dashSize = dash; m.gapSize = dash * 0.7; }
  renderer.render(scene, camera);
  placeLabels();
});
