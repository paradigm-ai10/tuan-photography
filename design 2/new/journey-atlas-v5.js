/* Prints globe 相片地球 (v5, 2026-11-02), copied from Atlas 足跡 (row 13) and keeping all it does: the
   zoomable personal atlas of every place and every trip, the index, the trips played, the address.
   What is its own: the globe is a quiet lit paper ball with his photographs laid on it as small square
   prints where they were taken (journey-atlas-v5-prints.js), and it opens with "prints going home":
   a loose contact sheet of his prints gathers onto the globe, Taiwan's first, while the ball comes up
   beneath them; then the city dots settle, the routes draw and the names arrive.
   Reads window.SITE (../data.js). Leaves rows 13 and 14 and journey-routes.* alone. */
import * as THREE from 'three';
import { LineSegments2 } from '../vendor/three/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../vendor/three/lines/LineSegmentsGeometry.js';
import { LineMaterial } from '../vendor/three/lines/LineMaterial.js';
import { buildRecord, angle as angleOf } from './journey-atlas-v5-record.js';
import { createCamera, toVec, latOf, lngOf, slerp, wrap, tiltOf } from './journey-atlas-v5-camera.js';
import { makeShapes, makePick, paintBase, createPatch } from './journey-atlas-v5-paint.js';
import { createMarks } from './journey-atlas-v5-labels.js';
import { createPrints, T as OT, SHEET_MAX, SHEET_FALLBACK, WAIT } from './journey-atlas-v5-prints.js';

const S = window.SITE || { journeys: [], countries: [], slides: {} };
const D = Math.PI / 180;
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduce = reduceQ.matches;
reduceQ.addEventListener?.('change', (e) => { reduce = e.matches; });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- words, both languages ---------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const num = (n) => Number(n).toLocaleString('en-US');
const WORDS = {
  en: {
    title: 'Prints globe · tuan photography 陳亮元', name: 'Prints globe', back: 'Journey', other: '中文',
    desc: 'Every place Thomas Chen has been and every trip he has taken, on a paper globe you can zoom from the whole world down to a city.',
    globe: 'A paper globe with his photographs laid where they were taken. The Index lists everything on it.',
    index: 'Index', places: 'Places', trips: 'Trips', world: 'World', whole: 'Whole world', closer: 'Closer', further: 'Further',
    continents: { asia: 'Asia', europe: 'Europe', 'north-america': 'North America', 'south-america': 'South America', oceania: 'Oceania', africa: 'Africa', antarctica: 'Antarctica' },
    across: (n) => `about ${num(n)} km across`,
    totals: (t) => `${t.countries} countries, ${t.places} places, ${t.trips} trips since ${t.since}, about ${num(t.km)} km flown`,
    home: 'Home', homeLine: 'Every trip starts here',
    been: (n) => `Been here ${n} times`, wentBack: (n) => `${n} trips`,
    nTrips: (n) => (n === 1 ? '1 trip' : `${n} trips`), nPhotos: (n) => (n === 1 ? '1 photograph' : `${n} photographs`),
    join: ', ', join2: ', ', years: (ys) => ys.join(', '),
    countryPage: 'Country page', guide: 'Guide', along: 'The trip, along its route', play: 'Play this trip',
    noRoute: 'no route recorded', unconfirmed: 'route not confirmed', approx: 'approximate',
    leg: (a, b, m) => `${a} to ${b}, ${m}`,
    flight: 'flight', train: 'train', bus: 'bus', car: 'car', ground: 'overland',
    backWord: 'Back', approxPlace: 'approximate place', notRecorded: 'trip not recorded',
    prev: 'Previous', next: 'Next', close: 'Close', gallery: 'Gallery', photo: 'photograph',
    month: (y, m) => `${MONTHS[m - 1]} ${y}`,
    pause: 'Pause', resume: 'Play', nextLeg: 'Next leg', stop: 'Stop', follow: 'Follow',
    routes: 'The routes, played', crumbs: 'Where you are', photos: 'Photographs', theTrips: 'Trips', placesOf: 'Places',
    tripWord: 'Trip', photoOf: (i, n) => `${i} of ${n}`, playing: 'Playing',
  },
  zh: {
    title: '相片地球 · tuan photography 陳亮元', name: '相片地球', back: '旅程', other: 'English',
    desc: '陳亮元去過的每個地方、走過的每趟旅程，畫在一顆紙地球上，可以從整個世界一路拉近到一座城市。',
    globe: '一顆紙地球，他的照片放在拍下的地方。「目錄」列出上面的一切。',
    index: '目錄', places: '地方', trips: '旅程', world: '世界', whole: '全世界', closer: '近一點', further: '遠一點',
    continents: { asia: '亞洲', europe: '歐洲', 'north-america': '北美洲', 'south-america': '南美洲', oceania: '大洋洲', africa: '非洲', antarctica: '南極洲' },
    across: (n) => `約 ${num(n)} 公里寬`,
    totals: (t) => `${t.since} 年起 ${t.countries} 個國家、${t.places} 個地方、${t.trips} 趟旅程，飛了約 ${num(t.km)} 公里`,
    home: '家', homeLine: '每趟都從這裡出發',
    been: (n) => `來過 ${n} 次`, wentBack: (n) => `${n} 趟`,
    nTrips: (n) => `${n} 趟旅程`, nPhotos: (n) => `${n} 張照片`,
    join: '、', join2: '，', years: (ys) => ys.join('、'),
    countryPage: '國家頁', guide: '攻略', along: '沿著路線看這趟', play: '播放這趟',
    noRoute: '沒有記錄路線', unconfirmed: '路線未確認', approx: '大約',
    leg: (a, b, m) => `${a} 到 ${b}，${m}`,
    flight: '飛機', train: '火車', bus: '巴士', car: '自駕', ground: '陸路',
    backWord: '返回', approxPlace: '大約位置', notRecorded: '未記錄是哪一趟',
    prev: '上一張', next: '下一張', close: '關閉', gallery: '作品集', photo: '照片',
    month: (y, m) => `${y} 年 ${m} 月`,
    pause: '暫停', resume: '播放', nextLeg: '下一段', stop: '停', follow: '跟著走',
    routes: '路線動畫', crumbs: '你在哪裡', photos: '照片', theTrips: '旅程', placesOf: '地方',
    tripWord: '旅程', photoOf: (i, n) => `第 ${i} 張，共 ${n} 張`, playing: '播放中',
  },
};
let lang = 'en';
try { lang = localStorage.getItem('tlap-lang') === 'zh' ? 'zh' : 'en'; } catch (e) { /* storage blocked */ }
const W = () => WORDS[lang];
// the review kit's Notes box follows the page's language
window.Kit = window.Kit || { _f: [], onLang(f) { this._f.push(f); } };
window.Kit.lang = lang;

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
  return { css: `rgb(${r},${g},${b})`, color: new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace) };
}
const C = Object.fromEntries(['bg', 'band', 'paper', 'line', 'text', 'text-2', 'accent', 'clay', 'olive', 'slate',
  'g-sea', 'g-land', 'g-coast', 'g-wash', 'g-border', 'g-shadow', 'g-sky', 'g-ground', 'g-sun'].map((n) => [n, token('--' + n)]));
const KIND_COLOUR = { flight: 'clay', train: 'slate', road: 'olive', gap: 'text-2' };

/* ---------- the device: how sharp the paper can be, and how the page is laid out ---------- */
// Quality follows the device's screen, not the window: a short laptop window is still a laptop.
const phone = Math.min(screen.width || innerWidth, screen.height || innerHeight) < 700;
// Layout follows the window, and is read again whenever it changes (the stylesheet's sheet appears below 700 px).
const narrowQ = matchMedia('(max-width: 699px)');
const narrow = () => narrowQ.matches;

/* ---------- renderer, scene, camera ---------- */
const canvas = $('globe');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setClearColor(C.bg.color, 1);
// the lit ball is tone mapped so its lit face lands on the land's own paper; lines, marks and prints are not
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 2.2; // a first guess; calibrate() measures it on the page
const maxTex = renderer.capabilities.maxTextureSize || 4096;
const big = !phone && maxTex >= 8192;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10);
const res = new THREE.Vector2(1, 1);

// a quiet body, lit softly: a warm sun from over the viewer's left shoulder and a pale sky
const globeMat = new THREE.MeshStandardMaterial({ color: C['g-sea'].color, roughness: 0.9, metalness: 0, transparent: true, opacity: 0 });
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), globeMat);
scene.add(globe);
const rimMat = new THREE.MeshBasicMaterial({ color: C.line.color, side: THREE.BackSide, transparent: true, opacity: 0, toneMapped: false });
const rim = new THREE.Mesh(new THREE.SphereGeometry(1.006, 96, 64), rimMat);
scene.add(rim);
const sun = new THREE.DirectionalLight(C['g-sun'].color, 1.6);
sun.position.set(-1.4, 1.6, 2.2); // in the camera's own space: the light travels with the view
camera.add(sun);
scene.add(camera);
scene.add(new THREE.HemisphereLight(C['g-sky'].color, C['g-ground'].color, 1.0));
const sunDir = new THREE.Vector3();
// The warm sun and the warm sky multiply into the warm paper and would turn it orange; the painted
// sheet is balanced by this tint so the lit face keeps the paper's own colours. Measured once on the
// page by calibrate(): lit land at its brightest reads #f9f6f1.
const PAPER_TINT = new THREE.Color(0.86, 0.915, 1);
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function calibrate() {
  const gl = renderer.getContext();
  const keepCam = { ...cam };
  Object.assign(cam, worldView());
  view.place();
  camera.updateMatrixWorld(true);
  const calibMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  const keepMat = globe.material;
  globe.material = calibMat;
  const hide = scene.children.filter((o) => o !== globe && o !== camera && !o.isLight && o.visible);
  hide.forEach((o) => { o.visible = false; });
  try {
    // the brightest lit spot: where the sun stands overhead
    const L = sun.getWorldPosition(new THREE.Vector3()).normalize();
    const p = L.clone().project(camera);
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const x = Math.round((p.x + 1) / 2 * W), y = Math.round((p.y + 1) / 2 * H);
    const px = new Uint8Array(36);
    const read = () => {
      renderer.render(scene, camera);
      gl.readPixels(clamp(x - 1, 0, W - 3), clamp(y - 1, 0, H - 3), 3, 3, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const o = [0, 0, 0];
      for (let i = 0; i < 9; i++) for (let c = 0; c < 3; c++) o[c] += px[i * 4 + c] / 9;
      return o;
    };
    const want = [0xf9, 0xf6, 0xf1];
    const setCol = (bal) => { calibMat.color.setRGB(want[0] / 255, want[1] / 255, want[2] / 255, THREE.SRGBColorSpace); calibMat.color.r *= bal[0]; calibMat.color.g *= bal[1]; calibMat.color.b *= bal[2]; };
    const bal = [PAPER_TINT.r, PAPER_TINT.g, PAPER_TINT.b];
    setCol(bal);
    let lo = 0.2, hi = 5;
    for (let i = 0; i < 14; i++) { const e = (lo + hi) / 2; renderer.toneMappingExposure = e; if (read()[1] > want[1]) hi = e; else lo = e; }
    renderer.toneMappingExposure = (lo + hi) / 2;
    for (let i = 0; i < 6; i++) {
      const got = read();
      for (let c = 0; c < 3; c++) bal[c] *= toLin(want[c] / 255) / Math.max(1e-4, toLin(got[c] / 255));
      setCol(bal);
    }
    const got = read().map(Math.round);
    PAPER_TINT.setRGB(bal[0], bal[1], bal[2]);
    return { exposure: +renderer.toneMappingExposure.toFixed(3), tint: bal.map((v) => +v.toFixed(4)), rgb: got };
  } catch (e) {
    return { error: String(e) };
  } finally {
    globe.material = keepMat;
    hide.forEach((o) => { o.visible = true; });
    calibMat.dispose();
    Object.assign(cam, keepCam);
    view.place();
    renderer.clear();
  }
}
let calib = null;

/* ---------- the camera and its controls ---------- */
let wake = () => {};
const view = createCamera({
  camera, canvas, surfaces: [canvas, $('marks')],
  reduce: () => reduce,
  invalidate: () => wake(),
  fade: (on) => { canvas.classList.toggle('is-jumping', on); $('marks').classList.toggle('is-jumping', on); },
});
const cam = view.cam;
view.lim.min = (maxTex < 8192 || phone) ? 0.02 : 0.012;

/* ---------- lines: flights lifted into arcs that flatten as you come close ---------- */
const lineMats = [];
const uLift = { value: 1 };
function makeLine(kind, positions, { width = 1, opacity = 1, lifted = false } = {}) {
  const dashed = kind === 'train' || kind === 'gap';
  const m = new LineMaterial({
    color: C[KIND_COLOUR[kind]].color, linewidth: width, transparent: true, opacity,
    resolution: res, dashed, dashSize: 0.01, gapSize: 0.007, depthWrite: false, toneMapped: false,
  });
  if (lifted) {
    // the arc's height above the ground is scaled by uLift in the shader: full far out, almost flat close in
    m.uniforms.uLift = uLift;
    m.vertexShader = m.vertexShader
      .replace('attribute vec3 instanceStart;', 'uniform float uLift;\nvec3 lift( vec3 p ) { return normalize( p ) * ( 1.0 + ( length( p ) - 1.0 ) * uLift ); }\nattribute vec3 instanceStart;')
      .replace('vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );', 'vec4 start = modelViewMatrix * vec4( lift( instanceStart ), 1.0 );')
      .replace('vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );', 'vec4 end = modelViewMatrix * vec4( lift( instanceEnd ), 1.0 );');
    m.customProgramCacheKey = () => 'lifted';
  }
  m.userData = { dashed, base: opacity, kind };
  lineMats.push(m);
  const l = new LineSegments2(new LineSegmentsGeometry().setPositions(positions), m);
  if (dashed) l.computeLineDistances();
  l.frustumCulled = false;
  return l;
}
function dropLine(l) {
  if (!l) return;
  l.parent && l.parent.remove(l);
  l.geometry.dispose(); l.material.dispose();
  const i = lineMats.indexOf(l.material);
  if (i >= 0) lineMats.splice(i, 1);
}
const segs = (pts) => {
  const a = new Float32Array((pts.length - 1) * 6);
  for (let i = 0; i < pts.length - 1; i++) { pts[i].toArray(a, i * 6); pts[i + 1].toArray(a, i * 6 + 3); }
  return a;
};
const join = (arrs) => {
  const all = new Float32Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0; for (const a of arrs) { all.set(a, o); o += a.length; }
  return all;
};
const flightHeight = (a) => Math.min(0.12, 0.008 + a * 0.06); // low enough that long flights stay close to the ball at world view
function arcPoints(A, B, ang, h, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const r = h ? 1.002 + h * Math.sin(Math.PI * s) : 1.00006;
    pts.push(slerp(A, B, s).normalize().multiplyScalar(r));
  }
  return pts;
}
const liftPoint = (p, out) => { const len = p.length(); return out.copy(p).multiplyScalar((1 + (len - 1) * uLift.value) / len); };

/* ---------- state ---------- */
let R = null;                 // the record
let marks = null;
let patch = null;
let pickIndex = () => -1;
const sel = { kind: null, item: null, photo: null };  // what the panel shows
let hover = null;             // { kind, item } from the index rows or a mark
let arrival = reduce ? 1 : 0; // the routes drawing themselves in, 0 to 1 (the opening sets it)
let prints = null;
const faint = new THREE.Group(); scene.add(faint);
const strong = new THREE.Group(); scene.add(strong);
const live = new THREE.Group(); scene.add(live);
const faintLines = {};
let strongKey = '';

/* ---------- the routes, per trip ---------- */
function prepTrips() {
  for (const t of R.trips) {
    for (const l of t.legs) {
      l.A = toVec(l.from.lat, l.from.lng); l.B = toVec(l.to.lat, l.to.lng);
      l.angle = l.A.angleTo(l.B);
      l.h = l.kind === 'flight' ? flightHeight(l.angle) : 0;
      const n = Math.max(24, Math.min(220, Math.ceil(l.angle / D * 2)));
      l.pts = arcPoints(l.A, l.B, l.angle, l.h, l.kind === 'flight' ? n : Math.max(24, Math.ceil(l.angle / D * 20)));
      l.dur = l.kind === 'flight' ? 2.4 + l.angle * 1.8 : 1.8 + Math.min(l.angle * 25, 2);
      if (l.gapFrom) {
        const G = toVec(l.gapFrom.lat, l.gapFrom.lng);
        const ga = G.angleTo(l.A);
        l.gap = { A: G, B: l.A, angle: ga, pts: arcPoints(G, l.A, ga, 0, 24), dur: 0.5 + Math.min(ga * 20, 0.6) };
      }
    }
  }
}
function buildFaint() {
  const byKind = { flight: [], train: [], road: [], gap: [] };
  for (const t of R.trips) for (const l of t.legs) {
    byKind[l.kind].push(segs(l.pts));
    if (l.gap) byKind.gap.push(segs(l.gap.pts));
  }
  for (const [k, arrs] of Object.entries(byKind)) {
    if (!arrs.length) continue;
    const line = makeLine(k, join(arrs), { width: k === 'flight' ? 1 : 1.4, opacity: 0.2, lifted: k === 'flight' });
    line.renderOrder = 2;
    line.userData.count = line.geometry.instanceCount;
    faintLines[k] = line;
    faint.add(line);
  }
}
// the trips lifted out: the selected one, or the trips of the selected place or country, or a hovered row
function focusTrips() {
  const f = hover || (sel.item ? sel : null);
  if (!f) return [];
  if (f.kind === 'trip') return [f.item];
  if (f.kind === 'place' || f.kind === 'country') return f.item.trips;
  return [];
}
function buildStrong() {
  const ts = playing ? [] : focusTrips();
  const k = ts.map((t) => t.id).join('|');
  if (k === strongKey) return;
  strongKey = k;
  [...strong.children].forEach(dropLine);
  if (!ts.length) return;
  const byKind = { flight: [], train: [], road: [], gap: [] };
  for (const t of ts) for (const l of t.legs) {
    byKind[l.kind].push(segs(l.pts));
    if (l.gap) byKind.gap.push(segs(l.gap.pts));
  }
  for (const [kind, arrs] of Object.entries(byKind)) {
    if (!arrs.length) continue;
    const line = makeLine(kind, join(arrs), { width: kind === 'flight' ? 1.8 : kind === 'gap' ? 1.2 : 2.2, opacity: kind === 'gap' ? 0.6 : 0.92, lifted: kind === 'flight' });
    line.renderOrder = 3;
    strong.add(line);
  }
}

/* ---------- the levels: what each height shows ---------- */
const L = Math.log;
const band = (alt, edge) => smooth(L(edge * 1.15), L(edge * 0.85), L(alt)); // 0 above the edge, 1 below
function levelOf(alt) { return alt > 1.5 ? 'world' : alt > 0.5 ? 'region' : alt > 0.1 ? 'country' : 'city'; }
function applyLevels() {
  const a = cam.alt;
  uLift.value = Math.max(0.03, smooth(0.08, 1.2, a));
  const region = band(a, 1.5), country = band(a, 0.5), city = band(a, 0.1);
  const dim = playing ? 0.35 : focusTrips().length ? 0.6 : 1;
  const fl = (0.22 - 0.04 * region - 0.02 * country - 0.04 * city) * dim;
  const ground = (0.4 * region + 0.5 * country) * dim;
  const groundW = 1.3 + 0.7 * country;
  for (const [k, line] of Object.entries(faintLines)) {
    const m = line.material;
    m.opacity = playing ? 0.08 : k === 'flight' ? fl : k === 'gap' ? ground * 0.6 : ground;
    if (k !== 'flight') m.linewidth = k === 'gap' ? 1 : groundW;
    line.visible = m.opacity > 0.004;
    line.geometry.instanceCount = arrival >= 1 ? line.userData.count : Math.floor(line.userData.count * arrival);
  }
  // strong lines stay legible at every height; ground ones a touch stronger close in
  for (const line of strong.children) {
    const k = line.material.userData.kind;
    line.material.opacity = k === 'flight' ? 0.92 - 0.35 * country : k === 'gap' ? 0.6 : 0.6 + 0.35 * region;
  }
  const dash = a * 0.012;
  for (const m of lineMats) if (m.userData.dashed) { m.dashSize = dash; m.gapSize = dash * 0.7; }
  document.body.dataset.level = levelOf(a);
}

/* ---------- the free part of the screen, where the globe is framed ---------- */
let free = { x0: 0, y0: 0, x1: 1, y1: 1, cx: 0.5, cy: 0.5 };
let tanFree = 0.3;
function layoutView() {
  const w = innerWidth, h = innerHeight;
  // a window with no size yet (a hidden pane, a thumbnail) keeps the last good layout
  if (w < 2 || h < 2) return;
  const top = $('top').getBoundingClientRect().bottom;
  const crumbs = $('crumbs').getBoundingClientRect();
  const pr = $('panel').getBoundingClientRect();
  let x0 = 0, x1 = w, y0 = top, y1 = h;
  if (!narrow()) { x1 = Math.max(w * 0.55, pr.left); y0 = Math.max(top, crumbs.bottom); }
  else { y0 = Math.max(top, crumbs.bottom); y1 = Math.max(y0 + 120, pr.top); }
  if (!(x1 - x0 > 1 && y1 - y0 > 1)) return;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  free = { x0, y0, x1, y1, cx, cy };
  camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
  const t = Math.tan((camera.fov * D) / 2);
  const tf = Math.min(t * (y1 - y0) / h, t * (x1 - x0) / h);
  if (!(tf > 0.01)) return;
  tanFree = tf;
  // the whole globe, with a margin, in the free part
  view.lim.world = 1 / Math.sin(Math.atan(tanFree) * 0.9) - 1;
  view.lim.max = Math.max(3.2, view.lim.world * 1.12);
  // the controls sit at the bottom right of the free part
  document.body.classList.toggle('is-wide', !narrow());
}
view.centrePx = () => [free.cx, free.cy];
// how high to stand to see a spread of s radians around the centre
const altForSpread = (s, min = 0.06) => clamp((Math.max(s, 0.002) / tanFree) * 1.25, min, view.lim.world);
const COUNTRY_MIN = 0.28;
const worldView = () => ({ lat: 22, lng: R && R.home ? R.home.lng : 121, alt: view.lim.world });

/* ---------- where each thing is framed ---------- */
function targetFor(kind, item) {
  if (kind === 'place') {
    if (item.kind === 'pin') return targetFor('country', R.countryById[item.country]);
    let spread = 0;
    for (const ph of item.photos) spread = Math.max(spread, angleOf(item.lat, item.lng, ph.ll[0], ph.ll[1]));
    return { lat: item.lat, lng: item.lng, alt: Math.max(0.06, altForSpread(spread * 1.1, view.lim.min)) };
  }
  if (kind === 'country') {
    const pts = [[item.ll[1], item.ll[0]], ...item.places.map((p) => [p.lng, p.lat])];
    const b = window.d3.geoBounds({ type: 'MultiPoint', coordinates: pts });
    let lng0 = b[0][0], lng1 = b[1][0];
    if (lng1 < lng0) lng1 += 360;
    const lng = wrap((lng0 + lng1) / 2), lat = (b[0][1] + b[1][1]) / 2;
    let spread = 0;
    for (const [x, y] of pts) spread = Math.max(spread, angleOf(lat, lng, y, x));
    // never closer than the Country level, so a country with one place of his (Spain) is still a country view
    return { lat, lng, alt: altForSpread(spread * 1.15, COUNTRY_MIN) };
  }
  if (kind === 'trip') {
    const vs = item.legs.length ? item.legs.flatMap((l) => [l.A, l.B]) : item.countries.map((c) => toVec(c.ll[0], c.ll[1]));
    if (!vs.length) return worldView();
    const mid = vs.reduce((s, v) => s.add(v), new THREE.Vector3());
    if (mid.lengthSq() < 1e-6) mid.copy(vs[0]);
    mid.normalize();
    const spread = Math.max(...vs.map((v) => v.angleTo(mid)));
    return { lat: latOf(mid), lng: lngOf(mid), alt: altForSpread(spread * 1.1, 0.12) };
  }
  if (kind === 'continent') {
    const ps = R.places.filter((p) => R.countryById[p.country] && R.countryById[p.country].continent === item);
    if (!ps.length) return worldView();
    const mid = ps.reduce((s, p) => s.add(toVec(p.lat, p.lng)), new THREE.Vector3()).normalize();
    const lat = latOf(mid), lng = lngOf(mid);
    const spread = Math.max(...ps.map((p) => angleOf(lat, lng, p.lat, p.lng)));
    // a continent always stands above the views of its own countries, so going up a crumb goes up
    const cs = R.countries.filter((c) => c.continent === item);
    const top = Math.max(0, ...cs.map((c) => targetFor('country', c).alt));
    return { lat, lng, alt: clamp(Math.max(altForSpread(spread, 0.7), top * 1.6), 0.7, Math.min(1.45, view.lim.world)) };
  }
  return worldView();
}

/* ---------- the breadcrumb and the scale word ---------- */
let crumbList = [];
const fitCache = new Map();
function fitAlt(kind, item) {
  const k = kind + ':' + (item.slug || item.id) + ':' + tanFree.toFixed(4);
  if (!fitCache.has(k)) fitCache.set(k, targetFor(kind, item).alt);
  return fitCache.get(k);
}
function nearestPlace(lat, lng, within) {
  let best = null, bd = within;
  for (const p of R.places) { const d = angleOf(lat, lng, p.lat, p.lng); if (d < bd) { bd = d; best = p; } }
  return best;
}
function computeCrumbs() {
  const out = [{ kind: 'world', label: W().world }];
  if (!R) return out;
  const a = cam.alt;
  if (a > 1.5) return out;
  const half = Math.atan(tanFree) * a; // the view's half height at the centre, in radians (close enough)
  let ci = pickIndex(cam.lat, cam.lng);
  let country = ci >= 0 ? R.countries[ci] : null;
  if (!country) {
    let bd = half * 1.5;
    for (const c of R.countries) { const d = angleOf(cam.lat, cam.lng, c.ll[0], c.ll[1]); if (d < bd) { bd = d; country = c; } }
  }
  // Each crumb shows from the height its own view lands at (and below), and never above it: clicking a
  // crumb, or Esc, then always lands one level up, where the crumb after it is gone.
  if (country) {
    out.push({ kind: 'continent', item: country.continent, label: W().continents[country.continent] || country.continent });
    if (a < Math.max(0.5, fitAlt('country', country) * 1.1)) out.push({ kind: 'country', item: country, label: country.name[lang] });
  }
  const halfW = Math.atan(Math.min(tanFree * 1.6, Math.tan((camera.fov * D) / 2) * (free.x1 - free.x0) / innerHeight)) * a;
  const p = a < 0.5 ? nearestPlace(cam.lat, cam.lng, halfW) : null;
  if (p && (!country || p.country === country.id) && out.length >= 3 && p.name.en !== country.name.en &&
      a < Math.max(0.1, fitAlt('place', p) * 1.1)) {
    out.push({ kind: 'place', item: p, label: p.name[lang].replace(/\s*[\/／]\s*/g, ' ') });
  }
  return out;
}
let crumbKey = '', announceT = 0;
function writeCrumbs() {
  const list = computeCrumbs();
  const k = lang + list.map((c) => c.label).join('/');
  if (k === crumbKey) return;
  crumbKey = k;
  crumbList = list;
  const nav = $('crumbs');
  nav.innerHTML = list.map((c, i) => (i < list.length - 1
    ? `<button type="button" class="at-word at-crumb" data-i="${i}">${esc(c.label)}</button><span class="at-sep" aria-hidden="true"> / </span>`
    : `<span class="at-crumb is-here" aria-current="location">${esc(c.label)}</span>`)).join('');
  clearTimeout(announceT);
  announceT = setTimeout(() => { $('live').textContent = list.map((c) => c.label).join(' / '); }, 600);
}
$('crumbs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-i]');
  if (!b) return;
  goCrumb(crumbList[+b.dataset.i]);
});
function goCrumb(c) {
  if (!c) return;
  if (c.kind === 'world') view.flyTo(worldView());
  else if (c.kind === 'continent') view.flyTo(targetFor('continent', c.item));
  else view.flyTo(targetFor(c.kind, c.item));
}
const nice = (x) => { const p = 10 ** Math.floor(Math.log10(x)); const m = x / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
let scaleKey = '';
function writeScale() {
  const y = free.cy;
  const A = view.hitVec(free.x0 + 8, y, new THREE.Vector3()), B = view.hitVec(free.x1 - 8, y, new THREE.Vector3());
  let km;
  if (A && B) km = A.angleTo(B) * 6371;
  else km = 2 * Math.acos(1 / (1 + cam.alt)) * 6371;
  const s = W().across(nice(km));
  if (s !== scaleKey) { scaleKey = s; $('scale').textContent = s; }
}

/* ---------- the panel: the index and the pages ---------- */
const panel = $('panel');
let tab = 'places';
function continentsInOrder() {
  const order = [];
  const cs = R.countries.slice().sort((a, b) => a.first - b.first);
  for (const c of cs) if (!order.includes(c.continent)) order.push(c.continent);
  return order.map((k) => ({ k, countries: cs.filter((c) => c.continent === k) }));
}
const yearsOf = (c) => (c.years.length ? W().years(c.years) : c.date ? c.date[lang] : '');
function renderIndex() {
  const w = W();
  $('tab-places').setAttribute('aria-selected', tab === 'places');
  $('tab-trips').setAttribute('aria-selected', tab === 'trips');
  let html = '';
  if (tab === 'places') {
    for (const { k, countries } of continentsInOrder()) {
      html += `<section class="at-group"><h2 class="at-kicker">${esc(w.continents[k] || k)}</h2><ul class="at-rows">`;
      for (const c of countries) {
        const meta = [yearsOf(c), c.photos.length ? w.nPhotos(c.photos.length) : ''].filter(Boolean).join(w.join2);
        const ps = c.places.filter((p) => p.kind !== 'pin').sort((a, b) => (b.home - a.home) || (b.photos.length - a.photos.length) || (b.visits - a.visits));
        html += `<li class="at-row"><button type="button" class="at-row__main" data-kind="country" data-id="${esc(c.id)}"><span class="at-row__name">${esc(c.name[lang])}</span><span class="at-row__meta">${esc(meta)}</span></button>`;
        if (ps.length) html += `<p class="at-row__places">${ps.map((p) => `<button type="button" class="at-link" data-kind="place" data-id="${esc(p.slug)}">${esc(p.name[lang])}</button>`).join('<span class="at-comma">' + esc(w.join) + '</span>')}</p>`;
        html += '</li>';
      }
      html += '</ul></section>';
    }
  } else {
    let year = null;
    const ts = R.trips.slice().reverse();
    for (const t of ts) {
      if (t.year !== year) { if (year !== null) html += '</ul></section>'; year = t.year; html += `<section class="at-group"><h2 class="at-kicker">${t.year}</h2><ul class="at-rows">`; }
      const flags = [!t.legs.length ? w.noRoute : '', t.unconfirmed ? w.unconfirmed : ''].filter(Boolean).join(w.join2);
      html += `<li class="at-row"><button type="button" class="at-row__main" data-kind="trip" data-id="${esc(t.id)}"><span class="at-row__name">${esc(t.date[lang])}</span><span class="at-row__meta">${esc(t.countries.map((c) => c.name[lang]).join(w.join))}</span>${flags ? `<span class="at-row__flag">${esc(flags)}</span>` : ''}</button></li>`;
    }
    if (year !== null) html += '</ul></section>';
  }
  $('index-body').innerHTML = html;
}
// only the record's own entries: an address such as #place=constructor must find nothing
const own = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null);
function itemOf(kind, id) {
  if (kind === 'place') return own(R.placeBySlug, id);
  if (kind === 'country') return own(R.countryById, id);
  if (kind === 'trip') return own(R.tripById, id);
  if (kind === 'photo') return own(R.photoById, id);
  return null;
}
// the guide for his country (Barcelona, for Spain); places elsewhere in it lead there too
function guideFor(countryId) {
  for (const [id, g] of Object.entries(S.guides || {})) if (g.country === countryId) return id;
  return null;
}
const img = (ph, size, cls = '') => `<img class="${cls}" src="../images/web/${size}/${esc(ph.file)}" alt="${esc(ph.alt ? ph.alt[lang] : '')}" width="${size}" height="${Math.round(size * ph.h / ph.w)}" decoding="async" loading="lazy">`;
function strip(photos, max = 99) {
  const list = photos.slice(0, max);
  if (!list.length) return '';
  return `<ul class="at-strip">${list.map((ph) => `<li><button type="button" class="at-strip__item" data-photo="${esc(ph.id)}" style="--ar: ${(ph.w / ph.h).toFixed(3)}">${img(ph, 640)}<span class="at-strip__name">${esc(ph.place[lang])}</span></button></li>`).join('')}</ul>`;
}
const tripLinks = (ts) => ts.map((t) => `<button type="button" class="at-link" data-kind="trip" data-id="${esc(t.id)}">${esc(t.date[lang])}</button>`).join(`<span class="at-comma">${esc(W().join)}</span>`);
function links(country, place) {
  const w = W(), out = [];
  if (country) out.push(`<a class="at-word" href="../../countries/${esc(country.id)}.html">${esc(w.countryPage)}</a>`);
  const g = country && guideFor(country.id);
  if (g) out.push(`<a class="at-word" href="../../posts/${esc(g)}.html">${esc(w.guide)}</a>`);
  return out;
}
// with more than one trip on a page, each link says which trip it opens
const storyLink = (t, dated) => `<a class="at-word" href="../wc-sketch/trip/?trip=${encodeURIComponent(t.id)}&amp;from=journey">${esc(dated ? `${W().along}${W().join2}${t.date[lang]}` : W().along)}</a>`;
function renderPage() {
  const w = W(), it = sel.item;
  let html = `<button type="button" class="at-word at-backword" data-act="back">${esc(w.backWord)}</button>`;
  if (sel.kind === 'place') {
    const c = R.countryById[it.country];
    html += `<h1 class="at-title">${esc(it.home ? `${it.name[lang]}` : it.name[lang])}</h1>`;
    // a place named like its country (a pin, Hong Kong) does not repeat the name beneath
    const sub = it.home ? w.home : c && c.name.en !== it.name.en ? c.name[lang] : '';
    if (sub) html += `<p class="at-sub">${esc(sub)}</p>`;
    if (it.home) html += `<p class="at-line">${esc(w.homeLine)}</p>`;
    else {
      const bits = [];
      if (it.visits >= 2) bits.push(w.been(it.visits));
      if (it.years.length) bits.push(w.years(it.years));
      if (bits.length) html += `<p class="at-line">${esc(bits.join(w.join2))}</p>`;
    }
    if (!it.home && it.trips.length) html += `<p class="at-line at-trips">${tripLinks(it.trips)}</p>`;
    const photos = it.home && c ? c.photos : it.photos;
    html += strip(photos);
    const ls = links(c, it);
    if (!it.home) { const ts = it.trips.filter((t) => t.legs.length); for (const t of ts) ls.push(storyLink(t, ts.length > 1)); }
    if (ls.length) html += `<p class="at-links">${ls.join('')}</p>`;
  } else if (sel.kind === 'country') {
    html += `<h1 class="at-title">${esc(it.name[lang])}</h1>`;
    const sub = [it.date ? it.date[lang] : '', it.visits >= 2 ? w.nTrips(it.visits) : ''].filter(Boolean).join(w.join2);
    html += `<p class="at-sub">${esc(sub)}</p>`;
    if (it.note) html += `<p class="at-note">${esc(it.note[lang])}</p>`;
    if (it.trips.length) html += `<p class="at-line at-trips">${tripLinks(it.trips)}</p>`;
    const ps = it.places.filter((p) => p.kind !== 'pin');
    if (ps.length) html += `<p class="at-line at-placewords">${ps.map((p) => `<button type="button" class="at-link" data-kind="place" data-id="${esc(p.slug)}">${esc(p.name[lang])}</button>`).join(`<span class="at-comma">${esc(w.join)}</span>`)}</p>`;
    if (it.trips.some((t) => !t.legs.length)) html += `<p class="at-flag">${esc(w.noRoute)}</p>`;
    html += strip(it.photos, 6);
    const ls = links(it, null);
    { const ts = it.trips.filter((t) => t.legs.length); for (const t of ts) ls.push(storyLink(t, ts.length > 1)); }
    html += `<p class="at-links">${ls.join('')}</p>`;
  } else if (sel.kind === 'trip') {
    html += `<h1 class="at-title">${esc(it.date[lang])}</h1>`;
    html += `<p class="at-sub">${esc(it.countries.map((c) => c.name[lang]).join(w.join))}</p>`;
    if (!it.legs.length) html += `<p class="at-flag">${esc(w.noRoute)}</p>`;
    else if (it.unconfirmed) html += `<p class="at-flag">${esc(w.unconfirmed)}</p>`;
    if (it.legs.length) {
      html += `<p class="at-links at-links--play"><button type="button" class="at-word" data-act="play">${esc(w.play)}</button>${storyLink(it)}</p>`;
      html += `<ol class="at-legs">${it.legs.map((l, i) => `<li><button type="button" class="at-leg${playing && playIndex === i ? ' is-now' : ''}" data-leg="${i}"><span>${esc(w.leg(l.from.name[lang], l.to.name[lang], w[l.mode] || l.mode))}</span>${l.confirmed ? '' : `<span class="at-leg__flag">${esc(w.approx)}</span>`}</button></li>`).join('')}</ol>`;
    }
    html += strip(it.photos, 6);
  }
  $('page').innerHTML = html;
}
function showPage(on) {
  panel.classList.toggle('is-page', on);
  $('index').hidden = on;
  $('page').hidden = !on;
}

/* ---------- selecting things ---------- */
function setFocusMarks() {
  if (!marks) return;
  marks.clearState('is-selected');
  if (sel.item && (sel.kind === 'place' || sel.kind === 'country')) marks.setState(sel.kind, sel.item, 'is-selected', true);
  marks.clearState('is-trip');
  const ts = focusTrips();
  for (const t of ts) for (const p of [...t.places, ...t.pins]) marks.setState('place', p, 'is-trip', true);
  marks.clearState('is-hover');
  if (hover && (hover.kind === 'place' || hover.kind === 'country')) marks.setState(hover.kind, hover.item, 'is-hover', true);
  buildStrong();
  collideNext = true;
  wake();
}
// a trip's photographs are fetched as soon as the trip opens, so the panel never waits on grey frames
const preloaded = new Map();
function preload(photos) {
  for (const ph of photos || []) {
    if (preloaded.has(ph.file)) continue;
    const im = new Image();
    im.decoding = 'async';
    im.src = `../images/web/640/${ph.file}`;
    preloaded.set(ph.file, im);
  }
}
function select(kind, item, { fly = true, push = true } = {}) {
  if (!item) return;
  if (kind === 'trip') preload(item.photos);
  rushOpening();
  if (playing && !(kind === 'trip' && item === playTrip)) stopPlay(false);
  if (!sel.item) indexScroll = $('panel-body').scrollTop;
  sel.kind = kind; sel.item = item;
  hover = null;
  renderPage();
  showPage(true);
  $('panel-body').scrollTop = 0;
  setFocusMarks();
  if (fly) view.flyTo(targetFor(kind, item));
  if (push) writeHash(true);
  $('live').textContent = `${kind === 'trip' ? item.date[lang] : item.name[lang]}`;
  if (narrow()) setSheet(sheet === 'peek' ? 'half' : sheet);
  writeSummary();
}
let indexScroll = 0;
function clearSelection({ push = true } = {}) {
  if (playing) stopPlay(false);
  const was = !!sel.item;
  sel.kind = null; sel.item = null;
  hover = null;
  showPage(false);
  if (was) $('panel-body').scrollTop = indexScroll;
  setFocusMarks();
  if (push) writeHash(true);
  writeSummary();
}

/* ---------- the photograph, whole ---------- */
let viewerList = [], viewerAt = 0, viewerReturn = null;
function openPhoto(ph, { push = true } = {}) {
  if (!ph) return;
  const place = ph.at;
  viewerList = place && !place.home ? place.photos : place && place.home ? (R.countryById[place.country] || { photos: [ph] }).photos : [ph];
  if (!viewerList.includes(ph)) viewerList = [ph];
  viewerAt = viewerList.indexOf(ph);
  sel.photo = ph;
  if (!viewerReturn) viewerReturn = document.activeElement;
  drawViewer();
  $('viewer').hidden = false;
  document.body.classList.add('is-viewing');
  $('v-close').focus();
  if (push) writeHash(true);
}
function drawViewer() {
  const ph = viewerList[viewerAt], w = W();
  if (!ph) return;
  const size = innerWidth > 1400 ? '' : '1280/';
  const im = $('v-img');
  im.src = `../images/web/${size}${ph.file}`;
  im.alt = ph.alt ? ph.alt[lang] : '';
  im.width = ph.w; im.height = ph.h;
  $('v-frame').style.setProperty('--ar', (ph.w / ph.h).toFixed(4));
  const lines = [];
  lines.push(`<p class="at-v__place">${esc(ph.place[lang])}</p>`);
  const where = [ph.where ? ph.where[lang] : '', w.approxPlace].filter(Boolean).join(w.join2);
  lines.push(`<p class="at-v__line">${esc(where)}</p>`);
  if (ph.taken) { const [y, m] = String(ph.taken).split('-').map(Number); lines.push(`<p class="at-v__line">${esc(w.month(y, m))}</p>`); }
  const camBits = [ph.camera, ph.lens, ph.focal, ph.aperture, ph.shutter, ph.iso ? `ISO ${ph.iso}` : ''].filter(Boolean);
  if (camBits.length) lines.push(`<p class="at-v__line at-v__cam">${esc(camBits.join(w.join2))}</p>`);
  lines.push(ph.trip ? `<p class="at-v__line"><button type="button" class="at-link" data-kind="trip" data-id="${esc(ph.trip.id)}">${esc(ph.trip.date[lang])}</button></p>` : `<p class="at-v__line at-v__quiet">${esc(w.notRecorded)}</p>`);
  lines.push(`<p class="at-v__line at-v__quiet">${esc(w.photoOf(viewerAt + 1, viewerList.length))}</p>`);
  $('v-text').innerHTML = lines.join('');
  $('v-prev').disabled = viewerList.length < 2; $('v-next').disabled = viewerList.length < 2;
  $('v-prev').textContent = w.prev; $('v-next').textContent = w.next; $('v-close').textContent = w.close;
  $('v-gallery').textContent = w.gallery;
}
function closePhoto({ push = true } = {}) {
  if ($('viewer').hidden) return;
  $('viewer').hidden = true;
  document.body.classList.remove('is-viewing');
  sel.photo = null;
  if (viewerReturn && viewerReturn.focus && document.contains(viewerReturn)) viewerReturn.focus();
  viewerReturn = null;
  if (push) writeHash(true);
}
$('v-prev').addEventListener('click', () => { viewerAt = (viewerAt - 1 + viewerList.length) % viewerList.length; sel.photo = viewerList[viewerAt]; drawViewer(); writeHash(false); });
$('v-next').addEventListener('click', () => { viewerAt = (viewerAt + 1) % viewerList.length; sel.photo = viewerList[viewerAt]; drawViewer(); writeHash(false); });
$('v-close').addEventListener('click', () => closePhoto());
$('viewer').addEventListener('click', (e) => {
  if (e.target === $('viewer')) return closePhoto();
  const b = e.target.closest('[data-kind]');
  if (b) { closePhoto({ push: false }); select(b.dataset.kind, itemOf(b.dataset.kind, b.dataset.id)); }
});

/* ---------- clicks inside the panel ---------- */
panel.addEventListener('click', (e) => {
  const t = e.target;
  const ph = t.closest('[data-photo]');
  if (ph) { openPhoto(R.photoById[ph.dataset.photo]); return; }
  const b = t.closest('[data-kind]');
  if (b) { select(b.dataset.kind, itemOf(b.dataset.kind, b.dataset.id)); return; }
  const leg = t.closest('[data-leg]');
  if (leg && sel.kind === 'trip') {
    const l = sel.item.legs[+leg.dataset.leg];
    if (playing) { jumpToLeg(+leg.dataset.leg); return; }
    const A = l.A, B = l.B, mid = slerp(A, B, 0.5, new THREE.Vector3());
    view.flyTo({ lat: latOf(mid), lng: lngOf(mid), alt: altForSpread(l.angle * 0.6 + l.h * 0.4, 0.05) });
    return;
  }
  const act = t.closest('[data-act]');
  if (act) {
    if (act.dataset.act === 'back') clearSelection();
    else if (act.dataset.act === 'play') startPlay(sel.item);
    return;
  }
  const tb = t.closest('[data-tab]');
  if (tb) { tab = tb.dataset.tab; renderIndex(); if (sel.item) clearSelection(); if (narrow() && sheet === 'peek') setSheet('half'); return; }
  if (t.closest('#sheet-world')) { view.flyTo(worldView()); return; }
});
// hovering a row lifts its thing on the globe, without moving the camera
panel.addEventListener('pointerover', (e) => {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  const b = e.target.closest('[data-kind]');
  const next = b ? { kind: b.dataset.kind, item: itemOf(b.dataset.kind, b.dataset.id) } : null;
  if ((next && hover && next.item === hover.item) || (!next && !hover)) return;
  hover = next && next.item ? next : null;
  setFocusMarks();
});
panel.addEventListener('pointerleave', () => { if (hover) { hover = null; setFocusMarks(); } });
panel.addEventListener('focusin', (e) => {
  const b = e.target.closest('[data-kind]');
  hover = b ? { kind: b.dataset.kind, item: itemOf(b.dataset.kind, b.dataset.id) } : null;
  if (hover && !hover.item) hover = null;
  setFocusMarks();
});
// focus leaving a row lets its trip go again
panel.addEventListener('focusout', (e) => {
  if (!hover) return;
  const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('#panel [data-kind]');
  if (!to) { hover = null; setFocusMarks(); }
});

/* ---------- the phone's sheet ---------- */
let sheet = 'peek';
function setSheet(s) {
  if (!narrow()) return;
  sheet = s;
  panel.dataset.sheet = s;
  panel.style.removeProperty('--y');
  $('sheet-toggle').setAttribute('aria-expanded', s !== 'peek');
  setTimeout(() => { layoutView(); camera.updateProjectionMatrix(); wake(); }, reduce ? 0 : 320);
}
function writeSummary() {
  const el = $('sheet-summary');
  if (!el || !R) return;
  el.textContent = sel.item ? (sel.kind === 'trip' ? sel.item.date[lang] : sel.item.name[lang]) : W().totals(R.totals);
}
{
  const h = $('sheet-toggle');
  let drag = null;
  h.addEventListener('click', () => { if (drag && drag.moved) return; setSheet(sheet === 'peek' ? 'half' : sheet === 'half' ? 'full' : 'peek'); });
  h.addEventListener('pointerdown', (e) => {
    if (!narrow()) return;
    drag = { y0: e.clientY, top0: panel.getBoundingClientRect().top, moved: false };
    try { h.setPointerCapture(e.pointerId); } catch (err) { /* gone */ }
  });
  h.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    if (!drag.moved && Math.abs(dy) < 6) return;
    drag.moved = true;
    panel.classList.add('is-dragging');
    const top = clamp(drag.top0 + dy, innerHeight * 0.12, innerHeight - 96);
    panel.style.setProperty('--y', `${top}px`);
  });
  const end = () => {
    if (!drag) return;
    panel.classList.remove('is-dragging');
    if (drag.moved) {
      const top = panel.getBoundingClientRect().top / innerHeight;
      const opts = [['full', 0.12], ['half', 0.5], ['peek', 1 - 96 / innerHeight]];
      let best = opts[0]; for (const o of opts) if (Math.abs(o[1] - top) < Math.abs(best[1] - top)) best = o;
      setSheet(best[0]);
      setTimeout(() => { drag = null; }, 0);
    } else drag = null;
  };
  h.addEventListener('pointerup', end);
  h.addEventListener('pointercancel', end);
}

/* ---------- the trip, played ---------- */
let playing = false, paused = false, playTrip = null, playIndex = 0;
let legLines = [], gapLines = [];
const st = { phase: 'intro', t: 0, timer: 0 };
const marker = new THREE.Group();
{
  const half = [[0, 1], [0.1, 0.78], [0.12, 0.3], [0.95, -0.05], [0.95, -0.2], [0.12, 0.02], [0.09, -0.6], [0.38, -0.82], [0.38, -0.95], [0, -0.86]];
  const s = new THREE.Shape();
  half.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  for (let i = half.length - 2; i > 0; i--) s.lineTo(-half[i][0], half[i][1]);
  s.closePath();
  const ink = new THREE.MeshBasicMaterial({ color: C.text.color, depthWrite: false, toneMapped: false });
  marker.userData.plane = new THREE.Mesh(new THREE.ShapeGeometry(s), ink);
  const walker = new THREE.Group();
  walker.add(new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ color: C.paper.color, depthWrite: false, toneMapped: false })));
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), ink);
  dot.position.z = 0.002;
  walker.add(dot);
  marker.userData.walker = walker;
  marker.add(marker.userData.plane, walker);
  marker.userData.plane.renderOrder = 10; walker.children.forEach((c, i) => { c.renderOrder = 11 + i; });
  marker.visible = false;
  scene.add(marker);
}
const aim = { lat: 0, lng: 0, alt: 1 };
const altFor = (a, h) => clamp((0.1 + a * 1.9 + h * 1.2) * (0.3 / tanFree) * 0.9, 0.08, view.lim.world);
function legAim(l, e) {
  const mid = slerp(l.A, l.B, 0.5, new THREE.Vector3());
  const g = slerp(l.A, l.B, e, new THREE.Vector3());
  const w = l.angle > 0.25 ? 0.35 : 0.9;
  const v = slerp(mid, g, w, new THREE.Vector3());
  aim.lat = latOf(v); aim.lng = lngOf(v); aim.alt = altFor(l.angle, l.h);
}
function startPlay(t) {
  if (!t || !t.legs.length) return;
  preload(t.photos);
  stopPlay(false);
  playTrip = t; playing = true; paused = false; playIndex = 0;
  sel.kind = 'trip'; sel.item = t;
  strongKey = '';
  [...strong.children].forEach(dropLine);
  legLines = t.legs.map((l) => {
    const line = makeLine(l.kind, segs(l.pts), { width: l.kind === 'flight' ? 2.2 : 2.6, opacity: l.confirmed ? 0.95 : 0.55, lifted: l.kind === 'flight' });
    line.geometry.instanceCount = 0; line.renderOrder = 4; live.add(line); return line;
  });
  gapLines = t.legs.map((l) => {
    if (!l.gap) return null;
    const line = makeLine('gap', segs(l.gap.pts), { width: 1.25, opacity: 0.6 });
    line.geometry.instanceCount = 0; line.renderOrder = 4; live.add(line); return line;
  });
  st.phase = 'intro'; st.t = 0; st.timer = reduce ? 1.2 : 1.6;
  const o = targetFor('trip', t);
  view.flyTo(o, { owner: 'follow' });
  document.body.classList.add('is-playing');
  writePlaybar();
  renderPage();
  wake();
}
function stopPlay(keep = true) {
  if (!playing && !legLines.length) return;
  playing = false; paused = false;
  legLines.forEach(dropLine); gapLines.forEach(dropLine);
  legLines = []; gapLines = [];
  marker.visible = false;
  bank.roll = 0; bank.bearing = NaN; bank.key = ''; marker.userData.plane.rotation.y = 0;
  document.body.classList.remove('is-playing');
  if (view.owner === 'follow') view.owner = 'user';
  strongKey = '';
  if (keep) { buildStrong(); renderPage(); }
  writePlaybar();
  wake();
}
function finishLeg(k) {
  const l = playTrip.legs[k];
  drawTo(legLines[k], l.pts, Infinity);
  if (gapLines[k]) gapLines[k].geometry.instanceCount = l.gap.pts.length - 1;
}
// A leg's line drawn f segments along its points. The last segment is cut exactly at the traveller,
// so the ink ends right under him: no gap behind him and nothing ahead of him. The one cut segment is
// restored before the next cut (a dashed line's dash lengths too).
const cutV = new THREE.Vector3();
function drawTo(line, pts, f) {
  if (!line) return;
  const g = line.geometry, n = pts.length - 1, u = line.userData;
  const pos = g.attributes.instanceStart.data;
  const dist = g.attributes.instanceDistanceStart ? g.attributes.instanceDistanceStart.data : null;
  if (u.cut != null) {
    pts[u.cut + 1].toArray(pos.array, u.cut * 6 + 3);
    pos.needsUpdate = true;
    if (dist) { dist.array[u.cut * 2 + 1] = u.cutD; dist.needsUpdate = true; }
    u.cut = null;
  }
  if (!(f < n)) { g.instanceCount = n; return; }
  const i = Math.max(0, Math.floor(f)), frac = f - i;
  g.instanceCount = i;
  if (frac <= 1e-4) return;
  cutV.lerpVectors(pts[i], pts[i + 1], frac).toArray(pos.array, i * 6 + 3);
  pos.needsUpdate = true;
  if (dist) {
    const d0 = dist.array[i * 2];
    u.cutD = dist.array[i * 2 + 1];
    dist.array[i * 2 + 1] = d0 + (u.cutD - d0) * frac;
    dist.needsUpdate = true;
  }
  u.cut = i;
  g.instanceCount = i + 1;
}
function beginLeg(k) {
  playIndex = k;
  const gl = gapLines[k];
  if (gl) gl.geometry.instanceCount = playTrip.legs[k].gap.pts.length - 1;
  if (gl && !reduce) { st.phase = 'gap'; st.t = 0; } else { st.phase = 'leg'; st.t = reduce ? 1 : 0; }
  writePlaybar();
  markLegRow();
}
function jumpToLeg(k) {
  for (let i = 0; i < k; i++) finishLeg(i);
  // the legs after it are not travelled yet: undraw them
  for (let i = k; i < legLines.length; i++) { drawTo(legLines[i], playTrip.legs[i].pts, 0); if (gapLines[i]) gapLines[i].geometry.instanceCount = 0; }
  beginLeg(k);
  view.owner = 'follow';
}
function endPlay() {
  // the trip rests whole and stays selected; nothing moves on to another trip
  playTrip.legs.forEach((_, k) => finishLeg(k));
  const t = playTrip;
  stopPlay(false);
  sel.kind = 'trip'; sel.item = t;
  buildStrong();
  renderPage();
  view.flyTo(targetFor('trip', t));
}
function markLegRow() {
  document.querySelectorAll('.at-leg').forEach((b) => b.classList.toggle('is-now', playing && +b.dataset.leg === playIndex));
}
const tA = new THREE.Vector3(), tB = new THREE.Vector3(), fwd = new THREE.Vector3(), nrm = new THREE.Vector3(), side = new THREE.Vector3(), basis = new THREE.Matrix4(), northV = new THREE.Vector3();
function placeMarker(pts, e, flying) {
  const n = pts.length - 1;
  const f = e * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
  tA.lerpVectors(pts[i], pts[i + 1], u);
  if (flying) liftPoint(tA, marker.position); else marker.position.copy(tA);
  liftPoint(pts[i + 1], tB);
  fwd.subVectors(flying ? tB : pts[i + 1], flying ? liftPoint(pts[i], new THREE.Vector3()) : pts[i]);
  nrm.copy(marker.position).normalize();
  fwd.addScaledVector(nrm, -fwd.dot(nrm));
  if (fwd.lengthSq() < 1e-14) { northV.set(0, 1, 0); fwd.copy(northV).addScaledVector(nrm, -nrm.y); }
  fwd.normalize();
  side.crossVectors(fwd, nrm);
  basis.makeBasis(side, fwd, nrm);
  marker.quaternion.setFromRotationMatrix(basis);
  marker.userData.plane.visible = flying; marker.userData.walker.visible = !flying;
  marker.visible = true;
  return { n, f };
}
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
// A leg: the traveller gathers speed over its first 12%, keeps an even pace, and slows over the last
// 12%. The speed rises and falls along a smoothstep, so the start and the stop have no corner.
const RAMP = 0.12, PACE = 1 / (1 - RAMP);
const rampIn = (s) => s * s * s - (s * s * s * s) / 2; // the area under a smoothstep from 0 to s
function legEase(t) {
  if (!(t > 0)) return 0;
  if (!(t < 1)) return 1;
  if (t < RAMP) return PACE * RAMP * rampIn(t / RAMP);
  if (t > 1 - RAMP) return 1 - PACE * RAMP * rampIn((1 - t) / RAMP);
  return PACE * (RAMP / 2 + t - RAMP);
}
// The plane leans into a turn: its roll follows how fast its heading (from north, as the map shows
// it) is turning, damped, at most 25 degrees, and level near the ground at either end. Never under
// reduced motion.
const BANK_MAX = 25 * D, BANK_GAIN = 1.5, BANK_LAMBDA = 5;
const bank = { roll: 0, bearing: NaN, key: '' };
const axisV = new THREE.Vector3(), headV = new THREE.Vector3(), eastV = new THREE.Vector3(), upV = new THREE.Vector3();
function bankPlane(l, key, e, dt) {
  let target = 0;
  if (!reduce && dt > 0) {
    upV.copy(marker.position).normalize();
    axisV.crossVectors(l.A, l.B);
    northV.set(0, 1, 0).addScaledVector(upV, -upV.y);
    if (axisV.lengthSq() > 1e-12 && northV.lengthSq() > 1e-8) {
      // the great circle's own direction here: smooth, unlike the polyline's segments
      headV.crossVectors(axisV.normalize(), upV);
      northV.normalize();
      eastV.crossVectors(northV, upV);
      const b = Math.atan2(headV.dot(eastV), headV.dot(northV));
      if (bank.key === key && isFinite(bank.bearing)) {
        const turn = Math.atan2(Math.sin(b - bank.bearing), Math.cos(b - bank.bearing)) / dt; // clockwise from above
        target = clamp(turn * BANK_GAIN, -BANK_MAX, BANK_MAX) * smooth(0, RAMP, e) * smooth(1, 1 - RAMP, e);
      }
      bank.bearing = b;
    }
    bank.key = key;
  }
  if (reduce) bank.roll = 0;
  else if (dt > 0) bank.roll = THREE.MathUtils.damp(bank.roll, target, BANK_LAMBDA, dt);
  if (target === 0 && Math.abs(bank.roll) < 1e-3) bank.roll = 0;
  marker.userData.plane.rotation.y = bank.roll; // about the plane's own length: the right wing dips into a right turn
  return dt > 0 && bank.roll !== 0; // paused, the roll holds still and asks for no frames
}
function stepPlay(dt) {
  if (!playing) return false;
  const t = playTrip;
  let busy = !paused;
  if (!paused) {
    if (st.phase === 'intro') { st.timer -= dt; if (st.timer <= 0) beginLeg(0); }
    else if (st.phase === 'gap') { st.t = Math.min(1, st.t + dt / t.legs[playIndex].gap.dur); if (st.t >= 1) { st.phase = 'leg'; st.t = 0; } }
    else if (st.phase === 'leg') {
      st.t = Math.min(1, st.t + dt / t.legs[playIndex].dur);
      if (st.t >= 1) { finishLeg(playIndex); st.phase = 'hold'; st.timer = reduce ? 2.6 : playIndex + 1 < t.legs.length ? 1.0 : 1.8; }
    } else if (st.phase === 'hold') {
      st.timer -= dt;
      if (st.timer <= 0) { if (playIndex + 1 < t.legs.length) beginLeg(playIndex + 1); else { endPlay(); return true; } }
    }
  }
  const l = t.legs[playIndex];
  if (st.phase === 'gap' && l) {
    placeMarker(l.gap.pts, ease(st.t), false);
    legAim(l, 0);
  } else if ((st.phase === 'leg' || st.phase === 'hold') && l) {
    const e = legEase(st.t);
    const flying = l.kind === 'flight';
    const { n, f } = placeMarker(l.pts, e, flying);
    drawTo(legLines[playIndex], l.pts, e >= 1 ? n : f);
    if (flying && bankPlane(l, playTrip.id + ':' + playIndex, e, paused ? 0 : dt)) busy = true;
    if (st.phase === 'hold' && st.timer < 0.9 && t.legs[playIndex + 1]) legAim(t.legs[playIndex + 1], 0); else legAim(l, e);
  } else if (st.phase === 'intro') {
    const o = targetFor('trip', t); aim.lat = o.lat; aim.lng = o.lng; aim.alt = o.alt;
  }
  // the camera follows the traveller unless he has taken it
  if (view.owner === 'follow' && !view.flying()) {
    // an even, frame-rate independent ease (rate 2 per second), settled exactly once it is too close to see
    const dLng = wrap(aim.lng - cam.lng), dAlt = L(aim.alt) - L(cam.alt);
    const near = view.viewDeg() * 2e-4;
    if (reduce || (Math.abs(aim.lat - cam.lat) < near && Math.abs(dLng) * Math.cos(cam.lat * D) < near && Math.abs(dAlt) < 2e-4)) {
      cam.lat = aim.lat; cam.lng = wrap(aim.lng); cam.alt = aim.alt;
    } else {
      const k = 1 - Math.exp(-2.0 * dt);
      cam.lat = THREE.MathUtils.damp(cam.lat, aim.lat, 2.0, dt);
      cam.lng = wrap(cam.lng + dLng * k);
      cam.alt = Math.exp(L(cam.alt) + dAlt * k);
      busy = true;
    }
    view.place();
  }
  // paused, the loop may rest once the plane is level and the camera has caught up
  return busy;
}
function writePlaybar() {
  const w = W(), bar = $('playbar');
  bar.hidden = !playing;
  if (!playing) return;
  clearNotes();
  const l = playTrip.legs[playIndex];
  $('pb-trip').textContent = playTrip.date[lang];
  $('pb-leg').textContent = st.phase === 'intro' || !l ? playTrip.countries.map((c) => c.name[lang]).join(w.join) : w.leg(l.from.name[lang], l.to.name[lang], w[l.mode] || l.mode);
  $('pb-pause').textContent = paused ? w.resume : w.pause;
  $('pb-next').textContent = w.nextLeg;
  $('pb-stop').textContent = w.stop;
  $('pb-follow').textContent = w.follow;
  $('pb-follow').hidden = view.owner === 'follow';
}
// the playbar steps right of the Notes box (on this computer only) when the two would meet
function clearNotes() {
  const bar = $('playbar'), rv = document.querySelector('.rv');
  bar.style.removeProperty('--pb-x');
  if (!rv || bar.hidden) return;
  const a = bar.getBoundingClientRect(), b = rv.getBoundingClientRect();
  if (!b.width || a.left >= b.right || a.right <= b.left || a.top >= b.bottom || a.bottom <= b.top) return;
  bar.style.setProperty('--pb-x', Math.round(b.right + 16 - a.left));
}
addEventListener('pointerup', () => { if (playing) requestAnimationFrame(clearNotes); });
addEventListener('resize', () => { if (playing) clearNotes(); });
$('pb-pause').addEventListener('click', () => { paused = !paused; writePlaybar(); wake(); });
$('pb-next').addEventListener('click', () => {
  if (!playing) return;
  if (st.phase === 'intro') { beginLeg(0); finishLeg(0); st.phase = 'hold'; st.t = 1; st.timer = 1; }
  else if (playIndex + 1 < playTrip.legs.length) { finishLeg(playIndex); beginLeg(playIndex + 1); }
  else endPlay();
  view.owner = 'follow'; writePlaybar(); wake();
});
$('pb-stop').addEventListener('click', () => { const t = playTrip; stopPlay(false); if (t) { sel.kind = 'trip'; sel.item = t; buildStrong(); renderPage(); } });
$('pb-follow').addEventListener('click', () => { view.owner = 'follow'; writePlaybar(); wake(); });
view.onUser = () => { quietSince = performance.now(); spinK = 0; if (playing) writePlaybar(); rushOpening(); };
// The globe turns slowly on its own while it is left alone at world level: from the arrival on, and
// again after a quiet spell. Any touch stops it at once; reduced motion never turns it.
// The loop sleeps at rest, so a timer wakes it when the quiet spell is over.
const SPIN = 5;            // degrees of longitude a second, about 72 s a turn
const SPIN_AFTER = 12000;  // ms left alone before it turns again
let quietSince = -Infinity, spinK = 0, spinTimer = 0;
function stepSpin(dt) {
  const now = performance.now();
  // something open (a place, a photograph, a trip playing) counts as being looked at: the quiet starts when it closes
  if (playing || sel.kind || sel.photo) { quietSince = now; spinK = 0; return false; }
  if (reduce || view.busy() || document.body.dataset.level !== 'world') { spinK = 0; return false; }
  const wait = quietSince + SPIN_AFTER - now;
  if (wait > 0) { clearTimeout(spinTimer); spinTimer = setTimeout(wake, wait + 20); return false; }
  spinK = THREE.MathUtils.damp(spinK, 1, 1.5, dt); // eases into the turn
  cam.lng = wrap(cam.lng + SPIN * spinK * dt);
  return true;
}

/* ---------- the address: the view and what is open ---------- */
let hashT = 0, applying = false;
function hashString() {
  const parts = [`at=${cam.lat.toFixed(3)},${wrap(cam.lng).toFixed(3)},${cam.alt.toFixed(3)}`];
  if (sel.photo) parts.push(`photo=${encodeURIComponent(sel.photo.id)}`);
  else if (sel.item) parts.push(`${sel.kind}=${encodeURIComponent(sel.kind === 'place' ? sel.item.slug : sel.item.id)}`);
  return '#' + parts.join('&');
}
function writeHash(push) {
  if (applying) return;
  const h = hashString();
  if (h === location.hash) return;
  try { if (push) history.pushState(null, '', h); else history.replaceState(null, '', h); } catch (e) { /* sandboxed */ }
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const at = (q.get('at') || '').split(',').map(Number);
  const out = { at: at.length === 3 && at.every(isFinite) ? { lat: at[0], lng: at[1], alt: at[2] } : null };
  for (const k of ['place', 'country', 'trip', 'photo']) if (q.get(k)) { out.kind = k; out.id = q.get(k); }
  return out;
}
function applyHash(fly) {
  const h = readHash();
  applying = true;
  closePhoto({ push: false });
  if (h.kind === 'photo') {
    const ph = itemOf('photo', h.id);
    if (ph) { select('place', ph.at, { fly: false, push: false }); openPhoto(ph, { push: false }); }
  } else if (h.kind) {
    const it = itemOf(h.kind, h.id);
    if (it) select(h.kind, it, { fly: false, push: false });
  } else if (sel.item) clearSelection({ push: false });
  if (h.at) { if (fly) view.flyTo(h.at); else { Object.assign(cam, { lat: clamp(h.at.lat, -85, 85), lng: wrap(h.at.lng), alt: clamp(h.at.alt, view.lim.min, view.lim.max) }); view.place(); } }
  else if (fly && h.kind) { const it = h.kind === 'photo' ? itemOf('photo', h.id) && itemOf('photo', h.id).at : itemOf(h.kind, h.id); if (it) view.flyTo(targetFor(h.kind === 'photo' ? 'place' : h.kind, it)); }
  applying = false;
  wake();
}
addEventListener('popstate', () => { if (R) applyHash(true); });
addEventListener('hashchange', () => { if (R && location.hash !== hashString()) applyHash(true); });

/* ---------- taps on the globe ---------- */
view.onTap = (x, y, touch) => {
  if (!R) return;
  // a print on the ball: far out it opens its place, from the Country level in, the photograph itself
  const pr = prints && opening.done && prints.pickAt(x, y, innerWidth, innerHeight, touch ? 6 : 0);
  if (pr) {
    if (cam.alt > 0.5) select('place', pr.photo.at || pr.stack.place);
    else openPhoto(pr.photo);
    return;
  }
  const m = marks.nearest(x, y, touch ? 22 : 12);
  if (m) {
    if (m.kind === 'print') openPhoto(m.item);
    else select(m.kind, m.item);
    return;
  }
  const g = view.hit(x, y);
  if (!g) return;
  const i = pickIndex(g.lat, g.lng);
  if (i >= 0) select('country', R.countries[i]);
};

// a pointer over a print says it can be opened
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  const over = !!(prints && opening.done && prints.pickAt(e.clientX, e.clientY, innerWidth, innerHeight));
  canvas.classList.toggle('is-over-print', over);
});

/* ---------- words on the page ---------- */
function writeWords() {
  const w = W();
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  document.title = w.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', w.desc);
  canvas.setAttribute('aria-label', w.globe);
  $('back').textContent = w.back;
  $('name').textContent = w.name;
  $('lang').textContent = w.other;
  $('lang').lang = lang === 'zh' ? 'en' : 'zh-Hant';
  $('closer').textContent = w.closer; $('further').textContent = w.further; $('whole').textContent = w.whole;
  $('tab-places').textContent = w.places; $('tab-trips').textContent = w.trips;
  $('sheet-toggle').textContent = w.index;
  $('sheet-world').textContent = w.whole;
  $('routes').textContent = w.routes;
  $('crumbs').setAttribute('aria-label', w.crumbs);
  $('panel').setAttribute('aria-label', w.index);
  $('pb-label').textContent = w.playing;
  if (R) {
    $('totals').textContent = w.totals(R.totals);
    renderIndex();
    if (sel.item) renderPage();
    if (!$('viewer').hidden) drawViewer();
    marks.write();
    writeSummary();
    writePlaybar();
  }
  crumbKey = ''; scaleKey = '';
  window.Kit.lang = lang;
  (window.Kit._f || []).forEach((f) => { try { f(lang); } catch (e) { /* the notes box */ } });
  collideNext = true;
  wake();
}
$('lang').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem('tlap-lang', lang); } catch (e) { /* storage blocked */ }
  writeWords();
});
$('closer').addEventListener('click', () => view.closer());
$('further').addEventListener('click', () => view.further());
$('whole').addEventListener('click', () => view.flyTo(worldView()));

/* ---------- keys ---------- */
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const inField = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
  if (inField) return;
  if (e.key === 'Escape') {
    if (!$('viewer').hidden) { closePhoto(); return; }
    if (playing) { $('pb-stop').click(); return; }
    if (sel.item) { clearSelection(); return; }
    if (crumbList.length > 1) goCrumb(crumbList[crumbList.length - 2]);
    return;
  }
  if (!$('viewer').hidden) {
    if (e.key === 'ArrowLeft') { $('v-prev').click(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { $('v-next').click(); e.preventDefault(); }
    return;
  }
  const onButton = e.target.closest && e.target.closest('button, a');
  if ((e.key === ' ' || e.key === 'Enter') && onButton) return;
  if (e.key.toLowerCase() === 'l') { $('lang').click(); return; }
  if (e.key === '0' || e.key === 'Home') { e.preventDefault(); view.flyTo(worldView()); return; }
  if (e.key === '[' || e.key === ']') {
    if (!R) return;
    const i = sel.kind === 'trip' ? sel.item.index : e.key === '[' ? R.trips.length : -1;
    const j = clamp(i + (e.key === ']' ? 1 : -1), 0, R.trips.length - 1);
    select('trip', R.trips[j]);
    return;
  }
  if (e.key === ' ') {
    e.preventDefault();
    if (playing) $('pb-pause').click();
    else if (sel.kind === 'trip') startPlay(sel.item);
    return;
  }
  if (view.keyDown(e)) wake();
});

/* ---------- size ---------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  res.set(w, h);
  for (const m of lineMats) m.resolution.copy(res);
  const hair = $('hair');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  hair.width = Math.round(w * dpr); hair.height = Math.round(h * dpr);
  layoutView();
  camera.updateProjectionMatrix();
  reservedBoxes = reserved();
  collideNext = true;
  wake();
}
addEventListener('resize', resize);
// crossing 700 px: the panel becomes the sheet (closed to its peek) or the sheet becomes the panel
narrowQ.addEventListener?.('change', () => {
  if (narrow()) { sheet = 'half'; setSheet('peek'); }
  else { delete panel.dataset.sheet; panel.style.removeProperty('--y'); }
  resize();
});

/* ---------- the loop: a frame only while something moves ---------- */
// The renderer's own animation loop, started by wake() and stopped at rest, so nothing draws while
// nothing moves. The Timer gives each frame its time step; connected to the page, it starts afresh
// when a hidden tab comes back, and a step is never longer than a tenth of a second, so nothing jumps.
const timer = new THREE.Timer();
timer.connect(document);
const MAX_DT = 0.1;
let looping = false, again = false, stillSince = 0, collideNext = true, slow = 0, stillTimer = 0, rested = false;
let arrivalT = 0;
wake = () => {
  again = true; // a wake during a frame asks for one more
  if (looping) return;
  looping = true;
  timer.update(); // the time at rest is not a step: the first frame counts from here
  renderer.setAnimationLoop(frame);
};
function reserved() {
  const boxes = [];
  for (const id of ['top', 'crumbs', 'controls', 'totals', 'playbar', 'panel']) {
    const el = $(id);
    if (!el || el.hidden) continue;
    // the totals line is only there at world level; elsewhere it holds no ground
    if (id === 'totals' && document.body.dataset.level !== 'world') continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.height) boxes.push([r.left - 4, r.top - 4, r.right + 4, r.bottom + 4]);
  }
  return boxes;
}
let reservedBoxes = [];
const prevCam = { lat: NaN, lng: NaN, alt: NaN };
let camStillSince = 0, lastLevel = '';
function frame() {
  timer.update();
  again = false;
  const now = performance.now();
  const dt = Math.min(MAX_DT, timer.getDelta());
  let moving = view.step(dt);
  if (stepPlay(dt)) moving = true;
  if (arrival >= 1 && stepSpin(dt)) moving = true;
  if (stepOpening(now, dt)) moving = true;
  // Any change of the camera is motion, whoever made it: a drag, a pinch and a trackpad move it
  // inside their own events, between frames.
  const dLat = cam.lat - prevCam.lat, dLng = wrap(cam.lng - prevCam.lng), dAlt = Math.log(cam.alt / prevCam.alt);
  const changed = !(dLat === 0 && dLng === 0 && dAlt === 0);
  if (changed) moving = true;
  // how far it moved, in view widths: the sharper patch waits until the camera has (nearly) stopped
  const shift = changed ? (Math.hypot(dLat, dLng * Math.cos(cam.lat * D)) / Math.max(1e-6, view.viewDeg()) + Math.abs(dAlt)) : 0;
  if (!(shift < 0.0015)) camStillSince = now;
  prevCam.lat = cam.lat; prevCam.lng = cam.lng; prevCam.alt = cam.alt;
  if (moving) stillSince = now;
  // still: the camera has stopped for 100 ms (as soon as a flight ends), or a played trip holds on a place
  const camStill = now - camStillSince > 100 || (playing && st.phase === 'hold');
  if (patch) {
    const halfH = Math.atan(Math.tan((camera.fov * D) / 2)) * cam.alt * 1.35;
    const halfW = halfH * (innerWidth / innerHeight);
    if (patch.update(cam, { halfH, halfW }, camStill && !view.busy(), reduce, wake, dt)) moving = true;
  }
  applyLevels();
  const lvl = document.body.dataset.level;
  if (lvl !== lastLevel) { lastLevel = lvl; reservedBoxes = reserved(); collideNext = true; }
  view.place();
  if (marker.visible) marker.scale.setScalar(marker.position.distanceTo(camera.position) * 0.022);
  if (prints) {
    sun.getWorldPosition(sunDir).normalize();
    if (prints.update({ t: opening.t, alt: cam.alt, pageAlpha: opening.alpha, now, lightDir: sunDir })) moving = true;
  }
  renderer.render(scene, camera);
  if (marks) {
    // the prints on the ball hold their ground too, so no name is ever written across a photograph
    // (a print that steps out from under the page's words is drawn on the next frame)
    if (prints && opening.done && (moving || collideNext) && prints.clearOf(reservedBoxes, innerWidth, innerHeight)) { moving = true; again = true; }
    const printBoxes = prints && (moving || collideNext) ? prints.boxList(innerWidth, innerHeight) : [];
    marks.update({ w: innerWidth, h: innerHeight, alt: cam.alt, level: levelOf(cam.alt), reserved: printBoxes.length ? reservedBoxes.concat(printBoxes) : reservedBoxes, cover: printBoxes, focus: { place: sel.kind === 'place' ? sel.item : null, country: sel.kind === 'country' ? sel.item : null, trip: playing ? playTrip : sel.kind === 'trip' ? sel.item : null }, hover: hover && hover.kind === 'place' ? hover.item : null, collide: moving || collideNext });
    collideNext = false;
    writeCrumbs();
    writeScale();
  }
  // a slow machine draws at a lower resolution while moving, full again once still
  const ms = performance.now() - now;
  if (moving) { slow = ms > 22 ? slow + 1 : Math.max(0, slow - 1); if (slow > 30 && pixelRatio > 1.5) { pixelRatio = 1.5; renderer.setPixelRatio(pixelRatio); resize(); } }
  if (moving || (patch && patch.painting())) rested = false;
  else if (!again) {
    looping = false;
    renderer.setAnimationLoop(null);
    if (!rested) {
      // the first frame at rest: look again once the camera has been still a moment (the sharper
      // patch waits for that), then write the view into the address
      rested = true;
      if (pixelRatio < Math.min(devicePixelRatio || 1, 2)) { pixelRatio = Math.min(devicePixelRatio || 1, 2); renderer.setPixelRatio(pixelRatio); resize(); }
      setTimeout(() => wake(), 170);
      clearTimeout(stillTimer);
      stillTimer = setTimeout(() => { collideNext = true; wake(); writeHash(false); }, 400);
    }
  }
}
const ro = new ResizeObserver(() => { reservedBoxes = reserved(); collideNext = true; wake(); });
['top', 'crumbs', 'controls', 'totals', 'panel', 'playbar'].forEach((id) => $(id) && ro.observe($(id)));
panel.addEventListener('transitionend', () => { reservedBoxes = reserved(); layoutView(); camera.updateProjectionMatrix(); collideNext = true; wake(); });

renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
renderer.domElement.addEventListener('webglcontextrestored', () => { paintAll(); if (patch) patch.reset(); wake(); });

/* ---------- the opening: prints going home ---------- */
// 0 to 600 ms the prints come up as a loose contact sheet over the paper; from 500 ms each flies home
// along a great circle, Taiwan's first, landing by 2400 ms as a print; the ball comes up beneath them
// from 700 to 1900 ms; from 2200 ms the city dots settle and the routes draw; the names at 2800 ms.
// The camera stands still. Any touch finishes it within 200 ms; a link with a view skips it; under
// reduced motion nothing flies: a 400 ms fade with the prints already in their places.
const opening = { mode: null, t: 0, t0: 0, rush: null, done: false, alpha: 0, dots: false, names: false };
function beginOpening(mode) {
  opening.mode = mode;
  opening.t0 = performance.now() - (mode === 'play' ? 0 : OT.end);
  opening.t = mode === 'play' ? 0 : OT.end;
  if (mode === 'skip') opening.t0 -= 400;
  wake();
}
function rushOpening() {
  if (opening.mode !== 'play' || opening.done || opening.rush) return;
  opening.rush = { from: performance.now() - opening.t0, at: performance.now() };
}
function stepOpening(now) {
  if (!opening.mode) return false;
  if (opening.rush && !opening.done) {
    // whatever is left plays out within 200 ms
    const k = clamp((now - opening.rush.at) / 200, 0, 1);
    const want = opening.rush.from + (OT.end - opening.rush.from) * k;
    if (want > now - opening.t0) opening.t0 = now - want;
  }
  const t = opening.t = now - opening.t0;
  if (opening.done) return false;
  let ball, alpha;
  if (opening.mode === 'play') {
    alpha = 1;
    ball = smooth(700, 1900, t);
    arrival = clamp((t - 2200) / 1000, 0, 1);
  } else {
    // the fade: 400 ms from when the page began (a link with a view arrives already faded in)
    alpha = clamp((t - OT.end) / 400, 0, 1);
    ball = alpha;
    arrival = 1;
  }
  opening.alpha = alpha;
  globeMat.opacity = ball; rimMat.opacity = ball;
  if (!opening.dots && (opening.mode !== 'play' || t >= 2200)) { opening.dots = true; $('marks').classList.add('is-ready'); collideNext = true; }
  if (!opening.names && (opening.mode !== 'play' || t >= 2800)) { opening.names = true; document.body.classList.add('is-names'); collideNext = true; }
  if (ball >= 1 && arrival >= 1 && alpha >= 1 && t >= OT.end) {
    opening.done = true;
    // the ball is solid from here on: drawn with the solid things, before the prints and the routes
    globeMat.transparent = false; globeMat.opacity = 1; globeMat.needsUpdate = true;
    rimMat.transparent = false; rimMat.opacity = 1; rimMat.needsUpdate = true;
    reservedBoxes = reserved();
  }
  return true;
}

/* ---------- start ---------- */
let shapes = null;
const washOf = (c) => (!c ? 0 : c.home ? 0.3 : c.visits >= 3 ? 0.3 : c.visits === 2 ? 0.24 : c.visits === 1 ? 0.18 : 0);
let reliefSrc = null;
// the quiet body has no relief and almost no detail: one sheet, 4096 (2048 on a phone), is plenty
async function paintAll(size = phone ? 2048 : 4096, withRelief = false) {
  if (!shapes || !R) return;
  const washes = R.countries.map(washOf);
  await paintBase({ renderer, material: globeMat, shapes, C, washes, reliefSrc: withRelief ? reliefSrc : null, size });
  globeMat.color.copy(PAPER_TINT);
  wake();
}
// The photographs start loading at once; the paper is painted meanwhile (painting holds the page for
// a moment, so it is done before anything moves); then the opening.
async function openWithPrints(h, world) {
  prints = createPrints({ renderer, scene, camera, R, C, phone, home: R.home || { lat: 25.04, lng: 121.56 } });
  let late = false;
  const timeout = new Promise((r) => setTimeout(() => { late = true; r(); }, WAIT));
  if (world) await paintAll();
  calib = calibrate();
  globeMat.color.copy(PAPER_TINT);
  if (h.at || h.kind || reduce) {
    // a link with a view: the prints are simply there as their photographs arrive, no fade
    prints.layoutSheet(free, 0, false);
    beginOpening(h.at || h.kind ? 'skip' : 'fade');
    return;
  }
  await Promise.race([prints.allLoaded, timeout]);
  view.place();
  // the atlas goes to the graphics card once, here, before anything moves
  prints.flush(performance.now());
  prints.layoutSheet(free, late ? SHEET_FALLBACK : SHEET_MAX, true);
  beginOpening('play');
  // a touch while it was waiting still gets the whole opening, played quickly
  if (quietSince > 0) rushOpening();
}
async function start() {
  resize();
  writeWords();
  if (narrow()) setSheet('peek');
  let world = null;
  try { world = await (await fetch('../vendor/countries-50m.json')).json(); } catch (e) { /* drawn without land */ }
  if (world) {
    shapes = makeShapes(world, S.countries || []);
    const pick = makePick(shapes);
    pickIndex = pick;
    const ids = (S.countries || []).map((c) => c.id);
    R = buildRecord(S, { countryAt: (lat, lng) => { const i = pick(lat, lng); return i >= 0 ? ids[i] : null; } });
  } else R = buildRecord(S, {});
  prepTrips();
  buildFaint();
  marks = createMarks({
    layer: $('marks'), overlay: $('hair'), camera, words: W, lang: () => lang,
    onPick: (kind, item) => { if (kind === 'photo') openPhoto(item); else select(kind, item); },
    onHover: (kind, item) => { hover = kind ? { kind, item } : null; setFocusMarks(); },
  });
  $('hair').dataset.ink = C['text-2'].css;
  marks.build(R);
  writeWords();
  reservedBoxes = reserved();
  // arrival: the whole world, still, while the prints go home; a link with a view opens there at once
  const h = readHash();
  // a link naming nothing that exists is treated as no link: the usual arrival, and a clean address
  if (h.kind && !(h.kind === 'photo' ? itemOf('photo', h.id) : itemOf(h.kind, h.id))) h.kind = null;
  if (h.at || h.kind) {
    arrival = 1;
    if (!h.at && h.kind) { const it = h.kind === 'photo' ? itemOf('photo', h.id) && itemOf('photo', h.id).at : itemOf(h.kind, h.id); if (it) Object.assign(cam, targetFor(h.kind === 'photo' ? 'place' : h.kind, it)); }
    applyHash(false);
  } else {
    Object.assign(cam, worldView()); // the camera stands still at the whole world through the opening
    view.place();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sandboxed */ }
  }
  await openWithPrints(h, world);
  wake();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { marks.measure(); collideNext = true; wake(); });
  // the sharper patch for close in (painted as the view settles)
  if (world) {
    const patchSize = phone || (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 1024 : (devicePixelRatio > 1.5 && maxTex >= 16384 ? 4096 : 2048);
    patch = createPatch({ renderer, scene, shapes, C, washes: R.countries.map(washOf), reliefSrc, size: patchSize, tint: PAPER_TINT });
    wake();
  }
}
start();
window.__atlasV5 = { get prints() { return prints; }, opening, renderer, camera, get calib() { return calib; }, get R() { return R; }, cam, view, pick: (a, b) => pickIndex(a, b), get patch() { return patch; }, get relief() { return reliefSrc; }, globeMat, scene, get sel() { return sel; }, marks: () => marks, tiltOf };
