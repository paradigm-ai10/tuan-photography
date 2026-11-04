/* Contour globe 等高線地球 (version 4, 2026-11-02), copied from Atlas 足跡 (row 13) and changed in two
   places. The globe: a lit paper ball drawn in olive form-lines, every fourth one heavier, a dark ink coast,
   three slate waterlines offshore and a pale clay wash for his countries; close in, the lines are worked out
   again for the area in view, so finer ones arrive as you come in. The opening, "Ascent from Taipei": the
   page holds on Taiwan, close and tilted, then the camera rises in one smooth zoom to the whole world while
   the washes deepen and the routes draw themselves from the first country abroad. The globe never turns
   during it; the whole move is the camera's.
   Atlas 足跡 (2026-11-01): a personal atlas of every place he has been and every trip, on one paper
   globe you can turn and zoom freely, from the whole world down to a city. Nothing plays by itself:
   the routes draw themselves once on arrival, then everything rests. Any trip can be played.
   Reads window.SITE (../data.js). Leaves journey-routes.* alone; the parts it shares were copied. */
import * as THREE from 'three';
import { LineSegments2 } from '../vendor/three/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../vendor/three/lines/LineSegmentsGeometry.js';
import { LineMaterial } from '../vendor/three/lines/LineMaterial.js';
import { buildRecord, angle as angleOf } from './journey-atlas-v4-record.js';
import { createCamera, toVec, latOf, lngOf, slerp, wrap, tiltOf } from './journey-atlas-v4-camera.js';
import { makeShapes, makePick, paintBase, createPatch, loadRelief, makeBase, washable, uWash, paperFix, INK } from './journey-atlas-v4-paint.js';
import { createMarks } from './journey-atlas-v4-labels.js';

const S = window.SITE || { journeys: [], countries: [], slides: {} };
const D = Math.PI / 180;
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
// a still for the review list (?still, review_thumbs.py) shows the page arrived: no opening, no spin
const STILL = /[?&]still\b/.test(location.search);
let reduce = reduceQ.matches || STILL;
reduceQ.addEventListener?.('change', (e) => { reduce = e.matches || STILL; });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- words, both languages ---------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const num = (n) => Number(n).toLocaleString('en-US');
const WORDS = {
  en: {
    title: 'Contour globe · tuan photography 陳亮元', name: 'Contour globe', back: 'Journey', other: '中文',
    desc: 'Every place Thomas Chen has been and every trip he has taken, on a paper globe drawn in form-lines that you can zoom from the whole world down to a city.',
    globe: 'A paper globe drawn in form-lines, with every place he has been. The Index lists everything on it.',
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
    title: '等高線地球 · tuan photography 陳亮元', name: '等高線地球', back: '旅程', other: 'English',
    desc: '陳亮元去過的每個地方、走過的每趟旅程，用等高線畫在一顆紙地球上，可以從整個世界一路拉近到一座城市。',
    globe: '一顆用等高線畫成的紙地球，畫著他去過的每個地方。「目錄」列出上面的一切。',
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
const C = Object.fromEntries(['bg', 'band', 'paper', 'line', 'text', 'text-2', 'accent', 'clay', 'olive', 'slate'].map((n) => [n, token('--' + n)]));
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
// Gently lit paper: a warm light from the upper left (it rides with the camera, so the light never moves
// round to the back), a soft sky above, Neutral tone mapping, and the exposure worked out so the brightest
// lit paper comes out at the paper's own colour (#f9f6f1).
renderer.toneMapping = THREE.NeutralToneMapping;
const SUN = { color: 0xfff6ea, intensity: 1.6, dir: new THREE.Vector3(-0.55, 0.62, 0.56).normalize() };
const SKY = { sky: 0xfdfbf7, ground: 0xe8e3da, intensity: 1.0 };
function neutral(c) { // three's NeutralToneMapping, in plain numbers
  let [r, g, b] = c;
  const x = Math.min(r, g, b), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  r -= off; g -= off; b -= off;
  const peak = Math.max(r, g, b);
  if (peak < 0.76) return [r, g, b];
  const d = 0.24, np = 1 - (d * d) / (peak + d - 0.76), k = np / peak;
  const q = 1 - 1 / (0.15 * (peak - np) + 1);
  return [r * k, g * k, b * k].map((v) => v + (np - v) * q);
}
function exposureFor() {
  // sRGB hex to linear, by hand (the colour management of THREE.Color is not assumed here)
  const lin = (hex) => {
    const n = typeof hex === 'number' ? hex : parseInt(String(hex).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  };
  const paper = lin(INK.paper), sun = lin(SUN.color), sky = lin(SKY.sky), ground = lin(SKY.ground);
  const wSky = 0.5 * SUN.dir.y + 0.5; // the brightest point faces the light; the sky light there
  const lit = paper.map((p, i) => (p * (SUN.intensity * sun[i] + SKY.intensity * (ground[i] + (sky[i] - ground[i]) * wSky))) / Math.PI);
  const Y = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  // the exposure brings the brightest lit paper to the paper's brightness; then a per-colour correction of the
  // paper itself takes out the warm light's yellow, so it comes out at #f9f6f1 and not a shade yellower
  const fix = [1, 1, 1];
  let e = 1;
  for (let pass = 0; pass < 6; pass++) {
    const lf = lit.map((v, i) => v * fix[i]);
    let lo = 0.2, hi = 6;
    for (let i = 0; i < 40; i++) { const x = (lo + hi) / 2; if (Y(neutral(lf.map((v) => v * x))) > Y(paper)) hi = x; else lo = x; }
    e = (lo + hi) / 2;
    const out = neutral(lf.map((v) => v * e));
    for (let i = 0; i < 3; i++) fix[i] *= paper[i] / Math.max(1e-4, out[i]);
    const top = Math.max(...fix);
    for (let i = 0; i < 3; i++) fix[i] /= top;
  }
  paperFix.setRGB(fix[0], fix[1], fix[2]);
  return e;
}
renderer.toneMappingExposure = exposureFor();
const maxTex = renderer.capabilities.maxTextureSize || 4096;
const big = !phone && maxTex >= 8192;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10);
const res = new THREE.Vector2(1, 1);

const globeMat = washable(new THREE.MeshLambertMaterial({ color: new THREE.Color(INK.paper) }), null);
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), globeMat);
scene.add(globe);
const rim = new THREE.Mesh(new THREE.SphereGeometry(1.006, 96, 64), new THREE.MeshBasicMaterial({ color: C.line.color, side: THREE.BackSide, toneMapped: false }));
scene.add(rim);
{
  const sun = new THREE.DirectionalLight(SUN.color, SUN.intensity);
  sun.position.copy(SUN.dir);
  sun.target.position.set(0, 0, -1);
  camera.add(sun, sun.target);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(SKY.sky, SKY.ground, SKY.intensity));
}

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
    resolution: res, dashed, dashSize: 0.01, gapSize: 0.007, depthWrite: false,
  });
  m.toneMapped = false; // the routes keep their exact colours; only the paper is lit
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
let arrival = reduce ? 1 : 0; // the routes drawing themselves in, 0 to 1
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
function select(kind, item, { fly = true, push = true } = {}) {
  if (!item) return;
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
  const l = playTrip.legs[playIndex];
  $('pb-trip').textContent = playTrip.date[lang];
  $('pb-leg').textContent = st.phase === 'intro' || !l ? playTrip.countries.map((c) => c.name[lang]).join(w.join) : w.leg(l.from.name[lang], l.to.name[lang], w[l.mode] || l.mode);
  $('pb-pause').textContent = paused ? w.resume : w.pause;
  $('pb-next').textContent = w.nextLeg;
  $('pb-stop').textContent = w.stop;
  $('pb-follow').textContent = w.follow;
  $('pb-follow').hidden = view.owner === 'follow';
}
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
view.onUser = () => { quietSince = performance.now(); spinK = 0; if (opening) rushOpening(); if (playing) writePlaybar(); };
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
  if (applying || opening || preOpen) return; // the opening never writes a view into the address
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
// for the review kit (review-kit/bar.js, on his Mac only): a mark or a move to the next version keeps
// this view, which is what the address holds (#at=…); near is the label or country under a click
window.ReviewView = {
  get: () => (R ? { hash: hashString() } : null),
  set: (s) => { if (s && s.hash && R) { if (typeof view.onUser === 'function') view.onUser(); if (location.hash === s.hash) applyHash(true); else location.hash = s.hash; } },
  near: (x, y) => {
    if (!R) return '';
    const m = marks.nearest(x, y, 24);
    if (m && m.name) return m.name.textContent.trim();
    const g = view.hit(x, y);
    const i = g ? pickIndex(g.lat, g.lng) : -1;
    return i >= 0 ? R.countries[i].name.en : '';
  },
};

/* ---------- taps on the globe ---------- */
view.onTap = (x, y, touch) => {
  if (!R) return;
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
  if (stepOpening(dt)) moving = true;
  else if (arrival >= 1 && stepSpin(dt)) moving = true;
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
    if (patch.update(cam, { halfH, halfW }, camStill && !view.busy() && !opening && !preOpen, reduce, wake, dt, !!opening || preOpen)) moving = true;
  }
  applyLevels();
  const lvl = document.body.dataset.level;
  if (lvl !== lastLevel) { lastLevel = lvl; reservedBoxes = reserved(); collideNext = true; }
  view.place();
  if (marker.visible) marker.scale.setScalar(marker.position.distanceTo(camera.position) * 0.022);
  renderer.render(scene, camera);
  if (marks) {
    marks.update({ w: innerWidth, h: innerHeight, alt: cam.alt, level: levelOf(cam.alt), reserved: reservedBoxes, focus: { place: sel.kind === 'place' ? sel.item : null, country: sel.kind === 'country' ? sel.item : null, trip: playing ? playTrip : sel.kind === 'trip' ? sel.item : null }, hover: hover && hover.kind === 'place' ? hover.item : null, collide: moving || collideNext });
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

/* ---------- the opening: Ascent from Taipei ---------- */
// Home first, then everywhere he went from it. Over Taiwan, close and tilted 20 degrees, the page holds on the
// paper while the canvas fades in (0 to 400 ms); then one smooth zoom (van Wijk's, d3.interpolateZoom with
// rho 1.4) rises to the whole world by 3200 ms, its time warped in-out by cubic-bezier(0.77, 0, 0.175, 1),
// the tilt levelling alongside. Everything else follows the height, not the clock: the fine contours over home
// cross-fade into coarser ones as the height passes 0.6, the clay washes deepen from the height reached at 1800 ms, and
// the routes start drawing the moment the first country abroad comes into view, complete at the top. The
// names come in at 2800 ms. Any touch hands the camera over at once (the washes and routes finish within 200 ms); a saved view skips it; reduced motion
// shows the resting view with a 400 ms fade.
const OPEN = { hold: 400, end: 3200, washFrom: 1800, labels: 2800, alt0: 0.18, tilt0: 20 * D };
function cubicBezier(x1, y1, x2, y2) {
  const bx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let a = 0, b = 1;
    for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (bx(m) < x) a = m; else b = m; }
    return by((a + b) / 2);
  };
}
const openEase = cubicBezier(0.77, 0, 0.175, 1);
let opening = null;
let preOpen = false; // the paper is held while the opening's patches are worked out
let openingDone = null;
const openingOver = new Promise((r) => { openingDone = r; });
const homeLL = () => (R && R.home ? { lat: R.home.lat, lng: R.home.lng } : { lat: 25.03, lng: 121.56 });
function openingPlan() {
  const from = { ...homeLL(), alt: OPEN.alt0 }, to = { lat: 22, lng: 121.5, alt: view.lim.world };
  const k = 2 * Math.tan((camera.fov * D) / 2);
  const A = toVec(from.lat, from.lng), B = toVec(to.lat, to.lng), d = A.angleTo(B);
  const interp = window.d3.interpolateZoom.rho(1.4)([0, 0, k * from.alt], [d, 0, k * to.alt]);
  const o = { t: 0, from, to, k, A, B, d, interp, altRoute: null, labels: false };
  o.altWash = poseAt(o, OPEN.washFrom).alt;
  return o;
}
const poseOut = new THREE.Vector3();
function poseAt(o, ms) {
  const u = clamp((ms - OPEN.hold) / (OPEN.end - OPEN.hold), 0, 1), e = openEase(u);
  if (u <= 0) return { ...o.from, tilt: OPEN.tilt0 };
  if (u >= 1) return { ...o.to, tilt: 0 };
  const [x, , w] = o.interp(e);
  const c = o.d > 1e-6 ? slerp(o.A, o.B, clamp(x / o.d, 0, 1), poseOut) : o.B;
  return { lat: latOf(c), lng: lngOf(c), alt: clamp(w / o.k, OPEN.alt0, o.to.alt), tilt: OPEN.tilt0 * (1 - e) };
}
// is any country of his, other than home, in the view now
function abroadInView() {
  const r = Math.min(Math.acos(1 / (1 + cam.alt)), Math.tan((camera.fov * D) / 2) * cam.alt * Math.max(1, camera.aspect) * 0.9);
  for (const c of R.countries) {
    if (c.home || !c.ll || !c.visits) continue;
    if (angleOf(cam.lat, cam.lng, c.ll[0], c.ll[1]) < r) return true;
  }
  return false;
}
function startOpening() {
  preOpen = false;
  opening = openingPlan();
  Object.assign(cam, opening.from);
  view.tiltOverride = OPEN.tilt0;
  view.owner = 'arrive';
  uWash.value = 0;
  arrival = 0;
  view.place();
}
// An interruption: the camera is the viewer's at once (the drag or wheel that interrupted is not swallowed);
// only the clay washes and the routes finish their arrival, within 200 ms.
let settle = null;
function rushOpening() {
  if (!opening) return;
  settle = { at: performance.now(), wash: uWash.value, arr: arrival };
  endOpening(true);
}
function stepSettle() {
  if (!settle) return false;
  const u = clamp((performance.now() - settle.at) / 200, 0, 1), e = 1 - (1 - u) ** 3;
  uWash.value = settle.wash + (1 - settle.wash) * e;
  arrival = u >= 1 ? 1 : settle.arr + (1 - settle.arr) * e;
  if (u >= 1) settle = null;
  return true;
}
function stepOpening(dt) {
  const o = opening;
  if (!o) return stepSettle();
  o.t += dt * 1000;
  const p = poseAt(o, o.t);
  cam.lat = p.lat; cam.lng = p.lng; cam.alt = p.alt;
  view.tiltOverride = p.tilt;
  const lnA = Math.log(cam.alt), lnTop = Math.log(o.to.alt);
  uWash.value = o.t < OPEN.washFrom ? 0 : smooth(Math.log(o.altWash), lnTop, lnA);
  if (o.altRoute == null && o.t > OPEN.hold && abroadInView()) o.altRoute = Math.min(cam.alt, o.to.alt * 0.9);
  arrival = o.altRoute == null ? 0 : smooth(Math.log(o.altRoute), lnTop, lnA);
  if (!o.labels && o.t >= OPEN.labels) { o.labels = true; $('marks').classList.add('is-ready'); }
  if (o.t >= OPEN.end) endOpening();
  return true;
}
function endOpening(handOver = false) {
  if (!opening) return;
  if (!handOver) Object.assign(cam, opening.to);
  opening = null;
  view.tiltOverride = null;
  view.owner = 'user';
  if (!handOver) { settle = null; uWash.value = 1; arrival = 1; }
  $('marks').classList.add('is-ready');
  view.place();
  openingDone();
  wake();
}
// a flight asked for during the opening (a row in the Index, the Whole world word) ends the opening first
{
  const fly = view.flyTo;
  view.flyTo = (t, o) => { if (opening) endOpening(); fly(t, o); };
}
function reveal(fade) {
  canvas.classList.toggle('v4-reveal', !!fade);
  canvas.classList.remove('v4-hold');
  if (fade) setTimeout(() => canvas.classList.remove('v4-reveal'), 500);
}

/* ---------- start ---------- */
let shapes = null;
let base = null;
// one layer of clay per visit, up to three; home counts as three
const layersOf = (c) => (!c ? 0 : c.home ? 3 : Math.min(3, c.visits || 0));
let reliefSrc = null;
// screen pixels per degree of latitude at the centre of the view, at a height
const pxPerDeg = (alt) => ((innerHeight || 800) * D) / (2 * Math.tan((camera.fov * D) / 2) * alt);
async function paintAll(size = phone ? 2048 : big ? 8192 : 4096) {
  if (!shapes || !R || !base) return;
  const lineK = Math.max(0.5, (size / 360) / pxPerDeg(view.lim.world));
  await paintBase({ renderer, material: globeMat, shapes, layers: R.countries.map(layersOf), base, size, lineK });
  wake();
}
let later = null;
const mode0 = () => { const h = readHash(); return h.at || h.kind ? 'link' : reduce ? 'quiet' : 'open'; };
async function start() {
  resize();
  writeWords();
  if (narrow()) setSheet('peek');
  // the relief is fetched alongside the shapes, so the paper waits for the slower of the two only
  const reliefP = loadRelief('../vendor/relief/SR_50M-4096.jpg', 4096, 2048).catch(() => null);
  // the field itself is worked out on a 1024 grid, from the same relief already cut down to that size
  // (40 KB, decoded in a moment), so the 4096 one is not needed before anything shows
  const smallP = loadRelief('journey-atlas-v4-relief-1024.jpg', 1024, 512).catch(() => null);
  // and for the opening, the 10800 relief cut down to the seas round home (lng 88 to 155, lat 50 to -2,
  // 30 pixels a degree), so the Central Range is drawn from the sharp relief from the first frame
  const homeP = mode0() === 'open' ? loadRelief('journey-atlas-v4-relief-home.jpg', 2010, 1560)
    .then((r) => Object.assign(r, { W: 10800, H: 5400, x0: 8040, y0: 1200, bounds: { lngL: 88, lngR: 155, latB: -2, latT: 50 } })).catch(() => null) : Promise.resolve(null);
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
  // a link with a view opens there at once; a link naming nothing that exists is treated as no link
  const h = readHash();
  if (h.kind && !(h.kind === 'photo' ? itemOf('photo', h.id) : itemOf(h.kind, h.id))) h.kind = null;
  const mode = h.at || h.kind ? 'link' : reduce ? 'quiet' : 'open';
  if (mode === 'link') {
    arrival = 1;
    if (!h.at && h.kind) { const it = h.kind === 'photo' ? itemOf('photo', h.id) && itemOf('photo', h.id).at : itemOf(h.kind, h.id); if (it) Object.assign(cam, targetFor(h.kind === 'photo' ? 'place' : h.kind, it)); }
    applyHash(false);
  } else {
    if (mode === 'quiet') { arrival = 1; Object.assign(cam, worldView()); }
    else { preOpen = true; Object.assign(cam, { ...homeLL(), alt: OPEN.alt0 }); view.tiltOverride = OPEN.tilt0; uWash.value = 0; arrival = 0; }
    view.place();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sandboxed */ }
  }
  // The paper, before anything shows: the field and its lines from the 4096 relief (one decode, cut down to the
  // 1024 grid), and for the opening only the tight patch over home, from the sharp relief, worked out at once
  // so the first frame is already sharp. The opening shows that patch alone (it covers the whole view), so the
  // 2048 sheet, the relief kept in memory and the two wider patches are all made while the page holds on
  // Taiwan; any other start paints the sheet first.
  const patchSize = phone || (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 1024 : (devicePixelRatio > 1.5 && maxTex >= 16384 ? 4096 : 2048);
  if (world) {
    const [r1, rHome] = await Promise.all([smallP, homeP]);
    const r4 = mode === 'open' ? null : await reliefP;
    const cellPx = pxPerDeg(view.lim.world) * (180 / 512);
    base = await makeBase({ shapes, reliefSrc: r1 || r4 || (await reliefP), rLum: clamp(3 / cellPx, 1.2, 5), rMask: clamp(14 / cellPx, 1.5, 30) });
    reliefSrc = r4;
    patch = createPatch({ renderer, scene, shapes, layers: R.countries.map(layersOf), reliefSrc: r4 || r1, homeSrc: rHome, size: patchSize, base, pxPerDeg, gridMax: phone ? 384 : 512 });
    // the 4096 relief decoded once (about 32 MB), so every later piece is cut from memory
    const keep = async () => {
      const big4 = r4 || (await reliefP);
      if (!big4) return;
      if (window.createImageBitmap) { try { big4.bmp = await createImageBitmap(big4.blob); } catch (e) { /* cut from the file instead */ } }
      reliefSrc = big4; patch.setRelief(big4);
    };
    if (mode === 'open') {
      // the wider one is needed from a height of about 0.3 (some 900 ms in), the regional one after it
      const specs = primeSpecs();
      try { await patch.prime(specs.slice(2)); } catch (e) { console.warn('opening patch', e); }
      later = async () => {
        await paintAll(2048);
        await keep();
        await patch.prime([specs[1], specs[0]], false).catch((e) => console.warn('opening patches', e));
      };
    } else {
      await keep();
      await paintAll(2048);
    }
  }
  if (mode === 'open') { reveal(true); startOpening(); if (later) later().catch((e) => console.warn('opening', e)); }
  else {
    reveal(mode === 'quiet');
    setTimeout(() => $('marks').classList.add('is-ready'), mode === 'quiet' ? 0 : 400);
    openingDone();
  }
  wake();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { marks.measure(); collideNext = true; wake(); });
  // after the opening: the full sheet, and on a computer that can hold it the sharper relief for the patches
  await openingOver;
  if (world) {
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 600 }) : setTimeout(r, 100)));
    if (!phone) await paintAll();
    if (big) {
      try { reliefSrc = await loadRelief('../vendor/relief/SR_50M-10800.jpg', 10800, 5400); patch.setRelief(reliefSrc); } catch (e) { /* the 4096 relief stays */ }
    }
  }
}
// The patches the opening starts on, all worked out before it shows: a tight sharp one over home for the
// first part of the rise (fading out by height between 0.30 and 0.36), a wider one with the finer lines
// under it, whose fine contours cross-fade into coarser ones as the height passes 0.6 (between 0.52 and 0.7,
// about 300 ms of the rise), and a regional one with the sheet's own spacing, drawn at the weight the
// lines have close to the whole world, which hands over to the sheet itself between 1.3 and 2.0. Each
// covers the whole canvas at the top of its range.
function primeSpecs() {
  const w = innerWidth, hh = innerHeight, tanH = Math.tan((camera.fov * D) / 2);
  const ex = Math.max(free.cx, w - free.cx) / (hh / 2), ey = Math.max(free.cy, hh - free.cy) / (hh / 2);
  const home = homeLL();
  const win = (latC, lngC, altMax) => {
    const halfLat = Math.min(60, ((ey * tanH * altMax) / D) * 1.15 + 0.5);
    const halfLng = Math.min(90, ((ex * tanH * altMax) / D) * 1.15 / Math.max(0.2, Math.cos(latC * D)) + 0.5);
    return { lngL: lngC - halfLng, lngR: lngC + halfLng, latB: Math.max(-82, latC - halfLat), latT: Math.min(82, latC + halfLat) };
  };
  const big2 = phone ? 2048 : 4096;
  return [
    { win: win(22.5, 121.5, 2.1), alt: 1.1, size: big2 / 2, out: null, order: 0.9, radius: 1.00002 },
    { win: win((home.lat + 22) / 2, 121.5, 0.74), alt: 0.45, size: big2, out: [0.52, 0.7], order: 1, radius: 1.00003, target: 5 },
    // the hero frame: lines about 4.5 px apart, so the Central Range reads as a range
    { win: win(home.lat, home.lng, 0.4), alt: 0.25, size: 2048, out: [0.3, 0.36], order: 1.5, radius: 1.00004, target: 4.5 },
  ];
}
start();

