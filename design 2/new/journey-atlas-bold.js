/* Atlas in colour 彩色足跡 (row 14, 2026-11-02): row 13's personal atlas, now lit by a low warm sun
   and tinted like a hand-coloured atlas. His countries raised in terracotta, a warm rim and a soft
   shadow so the ball stands on the page, each trip coloured by its year, a Years line that can be
   played, a card for each of his countries, and his photographs larger at every height.
   Copied from journey-atlas.* (row 13), which stays exactly as it was. Reads window.SITE (../data.js). */
import * as THREE from 'three';
import { LineSegments2 } from '../vendor/three/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../vendor/three/lines/LineSegmentsGeometry.js';
import { LineMaterial } from '../vendor/three/lines/LineMaterial.js';
import { buildRecord, angle as angleOf } from './journey-atlas-bold-record.js';
import { createCamera, toVec, latOf, lngOf, slerp, wrap, tiltOf } from './journey-atlas-bold-camera.js';
import { makeShapes, makePick, paintBase, createPatch, loadRelief } from './journey-atlas-bold-paint.js';
import { createMarks } from './journey-atlas-bold-labels.js';
import { createLight } from './journey-atlas-bold-light.js';

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
    title: 'Atlas in colour · tuan photography 陳亮元', name: 'Atlas in colour', back: 'Journey', other: '中文',
    desc: 'Every place Thomas Chen has been and every trip he has taken, on a lit, hand-coloured globe you can zoom from the whole world down to a city.',
    globe: 'A lit, hand-coloured globe of every place he has been. The Index lists everything on it.',
    index: 'Index', places: 'Places', trips: 'Trips', world: 'World', whole: 'Whole world', closer: 'Closer', further: 'Further',
    continents: { asia: 'Asia', europe: 'Europe', 'north-america': 'North America', 'south-america': 'South America', oceania: 'Oceania', africa: 'Africa', antarctica: 'Antarctica' },
    across: (n) => `about ${num(n)} km across`,
    totals: (t) => `${t.countries} countries, ${t.places} places, ${t.trips} trips since ${t.since}, about ${num(t.km)} km flown`,
    totalsBy: (t, y) => `By ${y}: ${t.countries} countries, ${t.places} places, ${t.trips} trips, about ${num(t.km)} km flown`,
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
    yearsLabel: 'Years', playYears: 'Play the years', stopYears: 'Stop', allYears: 'All years', yearWord: (y) => `${y}`,
    tripsSpan: (n, a, b) => (n === 1 ? `1 trip, ${a}` : a === b ? `${n} trips, ${a}` : `${n} trips, ${a} to ${b}`),
    span: (a, b) => (a === b ? `${a}` : `${a} to ${b}`),
  },
  zh: {
    title: '彩色足跡 · tuan photography 陳亮元', name: '彩色足跡', back: '旅程', other: 'English',
    desc: '陳亮元去過的每個地方、走過的每趟旅程，畫在一顆有光、手工上色的地球上，可以從整個世界一路拉近到一座城市。',
    globe: '一顆有光、手工上色的地球，畫著他去過的每個地方。「目錄」列出上面的一切。',
    index: '目錄', places: '地方', trips: '旅程', world: '世界', whole: '全世界', closer: '近一點', further: '遠一點',
    continents: { asia: '亞洲', europe: '歐洲', 'north-america': '北美洲', 'south-america': '南美洲', oceania: '大洋洲', africa: '非洲', antarctica: '南極洲' },
    across: (n) => `約 ${num(n)} 公里寬`,
    totals: (t) => `${t.since} 年起 ${t.countries} 個國家、${t.places} 個地方、${t.trips} 趟旅程，飛了約 ${num(t.km)} 公里`,
    totalsBy: (t, y) => `到 ${y} 年為止：${t.countries} 個國家、${t.places} 個地方、${t.trips} 趟旅程，飛了約 ${num(t.km)} 公里`,
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
    yearsLabel: '這些年', playYears: '播放這些年', stopYears: '停止', allYears: '所有年份', yearWord: (y) => `${y} 年`,
    tripsSpan: (n, a, b) => (n === 1 || a === b ? `${n} 趟旅程，${a} 年` : `${n} 趟旅程，${a} 至 ${b} 年`),
    span: (a, b) => (a === b ? `${a} 年` : `${a} 至 ${b} 年`),
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
// (a token that cannot be read falls back to the secondary ink, itself a token)
const inkFallback = () => rootStyle.getPropertyValue('--text-2').trim() || 'gray';
function token(name) {
  const css = rootStyle.getPropertyValue(name).trim() || inkFallback();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = inkFallback();
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return { css: `rgb(${r},${g},${b})`, color: new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace) };
}
const C = Object.fromEntries(['bg', 'band', 'paper', 'line', 'text', 'text-2', 'accent', 'clay', 'olive', 'slate',
  'sea', 'sea-shallow', 'land-low', 'land-mid', 'land-high', 'land-peak', 'visit-1', 'visit-2', 'visit-3', 'home',
  'sun', 'shade', 'halo', 'year-0', 'year-1', 'year-2', 'year-3', 'bead'].map((n) => [n, token('--' + n)]));
const KIND_COLOUR = { flight: 'clay', train: 'slate', road: 'olive', gap: 'text-2' };

/* ---------- each trip's colour, by its date, on one ramp: slate for the first, terracotta for the latest ---------- */
// The ramp is spread over the trips in date order, not over the calendar: most of his trips are from
// 2023 to 2026, so on a calendar ramp they would all share one clay. In order, each year gets its own
// hue (slate, olive, ochre, terracotta), still running from the earliest to the latest.
// interpolated in OKLab, so the ramp stays even in lightness and never passes through a muddy middle
function oklab(col) {
  const r = col.r, g = col.g, b = col.b; // THREE.Color is linear already
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q];
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, q = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const cl = (x) => clamp(x, 0, 1);
  return new THREE.Color(cl(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q), cl(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q), cl(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q));
}
const RAMP_AT = [0, 1 / 3, 2 / 3, 1]; // stops along the trips in date order (the swatch bars in the stylesheet use the same)
const RAMP_LAB = ['year-0', 'year-1', 'year-2', 'year-3'].map((k) => oklab(C[k].color));
function rampColour(p) {
  let i = 0;
  while (i < 2 && p > RAMP_AT[i + 1]) i++;
  const t = clamp((p - RAMP_AT[i]) / (RAMP_AT[i + 1] - RAMP_AT[i]), 0, 1);
  const A = RAMP_LAB[i], B = RAMP_LAB[i + 1];
  return fromOklab([0, 1, 2].map((k) => A[k] + (B[k] - A[k]) * t));
}
// a trip's place in time: its year and the month its first leg ran (mid-year when no month is known)
function yearOf(t) {
  const ms = [...t.months].sort();
  const m = ms.length ? +ms[0].slice(5, 7) : (/-(\d\d)$/.exec(t.id) ? +/-(\d\d)$/.exec(t.id)[1] : 7);
  return t.year + (clamp(m, 1, 12) - 0.5) / 12;
}

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
const maxTex = renderer.capabilities.maxTextureSize || 4096;
const big = !phone && maxTex >= 8192;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10);
const res = new THREE.Vector2(1, 1);

const globeMat = new THREE.MeshBasicMaterial({ color: C.paper.color });
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), globeMat);
scene.add(globe);
// the light: one chunk on the sheet and the patch, the warm rim, the shadow beneath, the pin at home
const light = createLight({ renderer, scene, C, phone: phone || maxTex < 8192 });
light.apply(globeMat, 'bold-lit');

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
// the camera's direction and the horizon's (1 / its distance): an arc flattens toward the edge of the
// ball, so nothing climbs off the globe at its limb or curls round behind it
const uView = { value: new THREE.Vector3(0, 0, 1) }, uHorizon = { value: 0.25 };
const uTime = { value: 0 }, uPulse = { value: 0 }, uBead = { value: C.bead.color };
function makeLine(kind, positions, { width = 1, opacity = 1, lifted = false, colors = null, pulse = false, dashed: dash = null } = {}) {
  const dashed = dash == null ? kind === 'train' || kind === 'gap' : dash;
  const m = new LineMaterial({
    color: colors ? new THREE.Color(1, 1, 1) : C[KIND_COLOUR[kind]].color, linewidth: width, transparent: true, opacity,
    resolution: res, dashed, dashSize: 0.01, gapSize: 0.007, depthWrite: false, vertexColors: !!colors,
  });
  if (pulse && !dashed) {
    // a bead of light running out along the trip from Taiwan (its distance along the line, as a share of the whole)
    m.uniforms.uTime = uTime; m.uniforms.uPulse = uPulse; m.uniforms.uBead = uBead; m.uniforms.uLen = { value: 1 };
    m.vertexShader = m.vertexShader
      .replace('attribute vec3 instanceStart;', 'attribute float instanceDistanceStart;\nattribute float instanceDistanceEnd;\nvarying float vPulseD;\nattribute vec3 instanceStart;')
      .replace(/void main\(\) \{/, 'void main() {\n\t\t\tvPulseD = ( position.y < 0.5 ) ? instanceDistanceStart : instanceDistanceEnd;');
    m.fragmentShader = m.fragmentShader
      .replace('uniform float opacity;', 'uniform float opacity;\nuniform float uTime;\nuniform float uPulse;\nuniform float uLen;\nuniform vec3 uBead;\nvarying float vPulseD;')
      .replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );', 'float bd = exp( -pow( ( fract( vPulseD / uLen - uTime * 0.18 ) - 0.5 ) * 9.0, 2.0 ) ) * uPulse;\n\t\t\tgl_FragColor = vec4( mix( diffuseColor.rgb, uBead, bd * 0.8 ), min( 1.0, alpha * ( 1.0 + bd * 0.6 ) ) );');
    m.userData.pulse = true;
  }
  if (lifted) {
    // the arc's height above the ground is scaled by uLift in the shader: full far out, almost flat close in
    m.uniforms.uLift = uLift; m.uniforms.uView = uView; m.uniforms.uHorizon = uHorizon;
    m.vertexShader = m.vertexShader
      .replace('attribute vec3 instanceStart;', 'uniform float uLift;\nuniform vec3 uView;\nuniform float uHorizon;\nvec3 lift( vec3 p ) { vec3 n = normalize( p ); float h = length( p ) - 1.0, b = min( h, 0.002 ); float f = smoothstep( uHorizon + 0.1, uHorizon + 0.55, dot( n, uView ) ); return n * ( 1.0 + ( b + ( h - b ) * f ) * uLift ); }\nattribute vec3 instanceStart;')
      .replace('vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );', 'vec4 start = modelViewMatrix * vec4( lift( instanceStart ), 1.0 );')
      .replace('vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );', 'vec4 end = modelViewMatrix * vec4( lift( instanceEnd ), 1.0 );')
      // and fades out as it goes over the limb, so a route to the far side never runs round the ball's edge
      .replace('attribute vec3 instanceStart;', 'varying float vFace;\nattribute vec3 instanceStart;')
      .replace(/void main\(\) \{/, 'void main() {\n\t\t\tvFace = smoothstep( uHorizon - 0.02, uHorizon + 0.08, dot( normalize( position.y < 0.5 ? instanceStart : instanceEnd ), uView ) );');
    m.fragmentShader = m.fragmentShader
      .replace('uniform float opacity;', 'uniform float opacity;\nvarying float vFace;')
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.a *= vFace;\n\t\t\t#include <tonemapping_fragment>');
  }
  const key = (lifted ? 'lifted' : 'flat') + (m.userData.pulse ? '-pulse' : '');
  m.customProgramCacheKey = () => key;
  m.userData = { dashed, base: opacity, kind, pulse: !!m.userData.pulse };
  lineMats.push(m);
  const geo = new LineSegmentsGeometry().setPositions(positions);
  if (colors) geo.setColors(colors);
  const l = new LineSegments2(geo, m);
  if (dashed || m.userData.pulse) l.computeLineDistances();
  if (m.userData.pulse) { const d = geo.attributes.instanceDistanceEnd; m.uniforms.uLen.value = Math.max(1e-4, d.getX(d.count - 1)); }
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
// as low as row 13, and flattened toward the limb in the shader, so the arcs never upstage the photographs
const flightHeight = (a) => Math.min(0.09, 0.008 + a * 0.055);
function arcPoints(A, B, ang, h, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const r = h ? 1.002 + h * Math.sin(Math.PI * s) : 1.00006;
    pts.push(slerp(A, B, s).normalize().multiplyScalar(r));
  }
  return pts;
}
// the same lift as the shader's, for the plane
const liftPoint = (p, out) => {
  const len = p.length(), h = len - 1, b = Math.min(h, 0.002);
  const f = smooth(uHorizon.value + 0.1, uHorizon.value + 0.55, p.dot(uView.value) / len);
  return out.copy(p).multiplyScalar((1 + (b + (h - b) * f) * uLift.value) / len);
};

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
  for (const t of R.trips) t.yf = yearOf(t);
  const order = [...new Set(R.trips.map((t) => t.yf))].sort((a, b) => a - b);
  for (const t of R.trips) {
    t.ramp = order.length > 1 ? order.indexOf(t.yf) / (order.length - 1) : 1;
    t.colour = rampColour(t.ramp);
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
// one colour per segment, the trip's own (faded toward the paper when given a weight below 1)
const fadeTo = (col, k) => (k >= 1 ? col : col.clone().lerp(C.bg.color, 1 - k));
function colourSegs(n, col) {
  const a = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) { col.toArray(a, i * 6); col.toArray(a, i * 6 + 3); }
  return a;
}
// the Years line: null shows every trip; a year shows the trips up to it, the ones before it fainter
let yearSel = null;
const tripShown = (t) => yearSel == null || t.year <= yearSel;
const tripWeight = (t) => (yearSel == null || t.year === yearSel ? 1 : 0.35);
let faintKey = '';
function buildFaint() {
  const k0 = String(yearSel);
  if (k0 === faintKey) return;
  faintKey = k0;
  for (const k of Object.keys(faintLines)) { dropLine(faintLines[k]); delete faintLines[k]; }
  const byKind = { flight: [], train: [], road: [], gap: [] }, cols = { flight: [], train: [], road: [], gap: [] };
  for (const t of R.trips) {
    if (!tripShown(t)) continue;
    const col = fadeTo(t.colour, tripWeight(t));
    for (const l of t.legs) {
      byKind[l.kind].push(segs(l.pts)); cols[l.kind].push(colourSegs(l.pts.length - 1, col));
      if (l.gap) { byKind.gap.push(segs(l.gap.pts)); cols.gap.push(colourSegs(l.gap.pts.length - 1, fadeTo(col, 0.6))); }
    }
  }
  for (const [k, arrs] of Object.entries(byKind)) {
    if (!arrs.length) continue;
    const line = makeLine(k, join(arrs), { width: k === 'flight' ? 2 : 2.5, opacity: 0.5, lifted: k === 'flight', colors: join(cols[k]) });
    line.renderOrder = 2;
    line.userData.count = line.geometry.instanceCount;
    faintLines[k] = line;
    faint.add(line);
  }
  wake();
}
// the trips lifted out: the selected one, or the trips of the selected place or country, or a hovered row
function focusTrips() {
  const f = hover || (sel.item ? sel : null);
  let ts = [];
  if (f && f.kind === 'trip') ts = [f.item];
  else if (f && (f.kind === 'place' || f.kind === 'country')) ts = f.item.trips;
  else if (!f && yearSel != null && R) ts = R.trips.filter((t) => t.year === yearSel);
  return ts.filter(tripShown);
}
// the pulse runs only while one trip is being looked at, and for 4 s after the last touch of it
let pulseUntil = 0;
const PULSE_FOR = 4000;
function buildStrong() {
  const ts = playing ? [] : focusTrips();
  const k = ts.map((t) => t.id).join('|');
  if (k === strongKey) return;
  strongKey = k;
  [...strong.children].forEach(dropLine);
  if (!ts.length) return;
  const one = ts.length === 1;
  if (one) pulseUntil = performance.now() + PULSE_FOR;
  const halos = ts.length <= 3;
  for (const kind of ['flight', 'train', 'road', 'gap']) {
    const arrs = [], cols = [], soft = [];
    // from Taiwan outward: each trip's legs in order, so the bead's distance runs along the journey
    for (const t of ts) for (const l of t.legs) {
      if (kind === 'gap') { if (l.gap) { arrs.push(segs(l.gap.pts)); cols.push(colourSegs(l.gap.pts.length - 1, fadeTo(t.colour, 0.6))); } continue; }
      if (l.kind !== kind) continue;
      arrs.push(segs(l.pts)); cols.push(colourSegs(l.pts.length - 1, t.colour));
      if (halos) soft.push(colourSegs(l.pts.length - 1, t.colour.clone().lerp(C.paper.color, 0.45)));
    }
    if (!arrs.length) continue;
    const pos = join(arrs);
    if (halos && kind !== 'gap') {
      // a soft wide line beneath, the trip's colour lightened toward the paper
      const h = makeLine(kind, pos, { width: 2.5 * 3.5, opacity: 0.34, lifted: kind === 'flight', colors: join(soft), dashed: false });
      h.renderOrder = 2.5; h.material.userData.halo = true;
      strong.add(h);
    }
    const line = makeLine(kind, pos, { width: kind === 'gap' ? 1.4 : 2.5, opacity: kind === 'gap' ? 0.6 : 0.95, lifted: kind === 'flight', colors: join(cols), pulse: one && kind !== 'gap' && !reduce });
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
  // when a trip is in focus (hovered, selected, or opened from an address), every other route drops to a quarter
  const dim = playing ? 0.35 : focusTrips().length ? 0.5 : 1;
  const fl = (0.5 - 0.06 * region - 0.05 * country - 0.08 * city) * dim;
  const ground = (0.5 * region + 0.4 * country) * dim;
  const groundW = 2 + 0.5 * country;
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
    const top = k === 'flight' ? 0.95 - 0.3 * country : k === 'gap' ? 0.6 : 0.6 + 0.35 * region;
    line.material.opacity = line.material.userData.halo ? 0.34 * top : top;
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
  if (!narrow()) {
    x1 = Math.max(w * 0.55, pr.left); y0 = Math.max(top, crumbs.bottom);
    // the Years line holds the bottom of the free part; the globe and its shadow stand above it
    const yr = $('years').getBoundingClientRect();
    if (yr.height && !document.body.classList.contains('is-playing')) y1 = Math.max(y0 + 200, yr.top - 28);
  }
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
const yearsOf = (c) => (c.years.length ? W().years(c.years) : c.date ? dateText(c.date[lang]) : '');
let indexYear = null;
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
      // a small square of the trip's first photograph (or plain paper), and a bar in its year's colour
      const ph = t.photos.slice().sort((a, b) => String(a.taken || '9').localeCompare(String(b.taken || '9')))[0];
      const thumb = ph ? `<img src="../images/web/640/${esc(ph.file)}" alt="" width="56" height="56" decoding="async" loading="lazy">` : '';
      html += `<li class="at-row at-row--trip${tripShown(t) ? '' : ' is-later'}"><button type="button" class="at-row__main at-trip" data-kind="trip" data-id="${esc(t.id)}"><span class="at-trip__thumb">${thumb}</span><span class="at-trip__bar" style="--i: ${t.ramp.toFixed(3)}"></span><span class="at-trip__text"><span class="at-row__name">${esc(t.date[lang])}</span><span class="at-row__meta">${esc(t.countries.map((c) => c.name[lang]).join(w.join))}</span>${flags ? `<span class="at-row__flag">${esc(flags)}</span>` : ''}</span></button></li>`;
    }
    if (year !== null) html += '</ul></section>';
  }
  $('index-body').innerHTML = html;
  indexYear = yearSel;
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
    const sub = [it.date ? dateText(it.date[lang]) : '', it.visits >= 2 ? w.nTrips(it.visits) : ''].filter(Boolean).join(w.join2);
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
  // choosing something stops the years playing, and a thing from after the year shown brings the line up to it
  if (yPlay) stopYears();
  const fy = kind === 'trip' ? item.year : firstYearOf(kind, item);
  if (yearSel != null && fy > yearSel) setYear(fy);
  if (!sel.item) indexScroll = $('panel-body').scrollTop;
  sel.kind = kind; sel.item = item;
  hover = null;
  pulseUntil = performance.now() + PULSE_FOR;
  hideCard();
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
  if (hover && hover.kind === 'trip') bringRound(hover.item);
});
// A trip hovered in the list holds the globe still, and when its route is round the back of the
// ball, the globe turns gently to it after a short pause (so running down the list does not swing it).
let roundT = 0;
const camDir = new THREE.Vector3();
function bringRound(t) {
  quietSince = performance.now(); spinK = 0;
  clearTimeout(roundT);
  roundT = setTimeout(() => {
    if (!hover || hover.item !== t || playing || view.gesturing) return;
    const vs = t.legs.length ? t.legs.flatMap((l) => [l.A, l.B]) : t.countries.map((c) => toVec(c.ll[0], c.ll[1]));
    if (!vs.length) return;
    const mid = vs.reduce((a, v) => a.add(v), new THREE.Vector3());
    if (mid.lengthSq() < 1e-6) return;
    mid.normalize();
    camDir.copy(camera.position).normalize();
    if (mid.dot(camDir) >= 0.2) return;
    quietSince = performance.now(); spinK = 0;
    view.flyTo({ lat: latOf(mid), lng: lngOf(mid), alt: Math.max(cam.alt, Math.min(view.lim.world, 1.2)) }, reduce ? { jump: true } : { duration: 1200 });
  }, 280);
}
panel.addEventListener('pointerleave', () => { if (hover) { hover = null; setFocusMarks(); } });
panel.addEventListener('pointermove', (e) => { if (hover && hover.kind === 'trip' && e.pointerType === 'mouse') { pulseUntil = performance.now() + PULSE_FOR; quietSince = performance.now(); spinK = 0; wake(); } });
// a photograph in the list that fails to arrive (a busy server) is asked for once more, then left as
// the plain paper square behind it
panel.addEventListener('error', (e) => {
  const im = e.target;
  if (!(im instanceof HTMLImageElement)) return;
  if (!im.dataset.again) { im.dataset.again = '1'; const src = im.src; setTimeout(() => { im.src = src; }, 700); }
  else im.remove();
}, true);
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
  el.textContent = sel.item ? (sel.kind === 'trip' ? sel.item.date[lang] : sel.item.name[lang]) : totalsLine();
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
    const top = clamp(drag.top0 + dy, innerHeight * 0.12, innerHeight - 150);
    panel.style.setProperty('--y', `${top}px`);
  });
  const end = () => {
    if (!drag) return;
    panel.classList.remove('is-dragging');
    if (drag.moved) {
      const top = panel.getBoundingClientRect().top / innerHeight;
      const opts = [['full', 0.12], ['half', 0.5], ['peek', 1 - 150 / innerHeight]];
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
  const ink = new THREE.MeshBasicMaterial({ color: C.text.color, depthWrite: false });
  marker.userData.plane = new THREE.Mesh(new THREE.ShapeGeometry(s), ink);
  const walker = new THREE.Group();
  walker.add(new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({ color: C.paper.color, depthWrite: false })));
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
    // the flown part in the trip's own colour, a touch wider than the routes at rest
    const line = makeLine(l.kind, segs(l.pts), { width: 3, opacity: l.confirmed ? 0.95 : 0.55, lifted: l.kind === 'flight', colors: colourSegs(l.pts.length - 1, t.colour) });
    line.geometry.instanceCount = 0; line.renderOrder = 4; live.add(line); return line;
  });
  gapLines = t.legs.map((l) => {
    if (!l.gap) return null;
    const line = makeLine('gap', segs(l.gap.pts), { width: 1.25, opacity: 0.6 });
    line.geometry.instanceCount = 0; line.renderOrder = 4; live.add(line); return line;
  });
  st.phase = 'intro'; st.t = 0; st.timer = reduce ? 1.2 : 1.6;
  if (yPlay) stopYears();
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
  pulseUntil = performance.now() + PULSE_FOR;
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
      if (st.t >= 1) {
        finishLeg(playIndex); st.phase = 'hold';
        // a stop: one ring opens round it, and its best photograph stands beside it for two seconds
        const at = t.legs[playIndex];
        ringAt(at.B); showStop(at.to);
        st.timer = reduce ? 2.6 : playIndex + 1 < t.legs.length ? (stopShow ? 2.0 : 1.0) : 2.0;
      }
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
view.onUser = () => { quietSince = performance.now(); spinK = 0; if (playing) writePlaybar(); if (yPlay) stopYears(); };
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
  if (cardIdx !== -1) { cardIdx = -1; $('card').hidden = true; light.U.uHover.value = -1; reservedBoxes = reserved(); collideNext = true; }
  cam.lng = wrap(cam.lng + SPIN * spinK * dt);
  return true;
}

/* ---------- the address: the view and what is open ---------- */
let hashT = 0, applying = false;
function hashString() {
  const parts = [`at=${cam.lat.toFixed(3)},${wrap(cam.lng).toFixed(3)},${cam.alt.toFixed(3)}`];
  if (sel.photo) parts.push(`photo=${encodeURIComponent(sel.photo.id)}`);
  else if (sel.item) parts.push(`${sel.kind}=${encodeURIComponent(sel.kind === 'place' ? sel.item.slug : sel.item.id)}`);
  if (yearSel != null) parts.push(`y=${yearSel}`);
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
  const y = parseInt(q.get('y'), 10);
  out.y = isFinite(y) ? y : null;
  return out;
}
function applyHash(fly) {
  const h = readHash();
  applying = true;
  closePhoto({ push: false });
  if (yearsList.length) setYear(h.y == null ? null : snapYear(h.y));
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
  const m = marks.nearest(x, y, touch ? 22 : 12);
  if (m) {
    if (m.kind === 'print') openPhoto(m.item);
    else select(m.kind, m.item);
    return;
  }
  const i = cam.alt >= 0.1 ? countryNear(x, y) : (() => { const g = view.hit(x, y); return g ? pickIndex(g.lat, g.lng) : -1; })();
  if (i < 0) { hideCard(); return; }
  // on a touch screen the first tap shows the country's card, the second opens it
  if (touch && cam.alt >= 0.1 && cardIdx !== i) { showCard(i, x, y); return; }
  hideCard();
  select('country', R.countries[i]);
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
    writeYears();
    if (cardIdx >= 0) hideCard();
    $('totals').textContent = totalsLine();
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
  light.setPinScale(narrow() ? 0.6 : 1);
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
// on a phone the Years line moves into the sheet, above the tabs
function placeYears() {
  const el = $('years');
  if (narrow()) { const tabs = panel.querySelector('.at-tabs'); if (el.nextElementSibling !== tabs) tabs.before(el); }
  else if (el.parentElement !== document.body) $('controls').before(el);
}
narrowQ.addEventListener?.('change', () => {
  placeYears();
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
  for (const id of ['top', 'crumbs', 'controls', 'totals', 'playbar', 'panel', 'years', 'stop']) {
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
  if (arrival < 1) { arrivalT += dt; arrival = reduce ? 1 : Math.min(1, arrivalT / 1.6); moving = true; }
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
  const movedBefore = moving;
  if (stepExtras(dt, now)) moving = true;
  // on a phone, a frame where only the bead runs and it is not its turn to step is not drawn
  if (!movedBefore && extrasOnlyPulse && pulseHold) { again = true; return; }
  const sun = light.update(camera, cam.alt, sweepAngle());
  uView.value.copy(camera.position).normalize();
  uHorizon.value = 1 / Math.max(1.0001, camera.position.length());
  if (Math.abs(sun.x - sunCss.x) > 0.01 || Math.abs(sun.y - sunCss.y) > 0.01) {
    sunCss.x = sun.x; sunCss.y = sun.y;
    for (const id of ['marks', 'stop']) { $(id).style.setProperty('--sx', sun.x.toFixed(2)); $(id).style.setProperty('--sy', sun.y.toFixed(2)); }
  }
  renderer.render(scene, camera);
  if (marks) {
    marks.update({ w: innerWidth, h: innerHeight, alt: cam.alt, level: levelOf(cam.alt), reserved: cardBox ? [...reservedBoxes, cardBox] : reservedBoxes, dragging: view.gesturing || view.busy(), phone: phone || narrow(), sun: sunCss, focus: { place: sel.kind === 'place' ? sel.item : null, country: sel.kind === 'country' ? sel.item : null, trip: playing ? playTrip : sel.kind === 'trip' ? sel.item : null }, hover: hover && hover.kind === 'place' ? hover.item : null, year: yearSel, collide: moving || collideNext });
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
['top', 'crumbs', 'controls', 'totals', 'panel', 'playbar', 'years'].forEach((id) => $(id) && ro.observe($(id)));
panel.addEventListener('transitionend', () => { reservedBoxes = reserved(); layoutView(); camera.updateProjectionMatrix(); collideNext = true; wake(); });

renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
renderer.domElement.addEventListener('webglcontextrestored', () => { paintAll(); if (patch) patch.reset(); wake(); });

/* ---------- row 14: the Years line, the country card, the pulse, the lit playback, the arrival ---------- */
const sunCss = { x: NaN, y: NaN };
// a country's own dates read "2024 to 2026", never with a middle dot
const dateText = (d) => String(d || '').replace(/\s*·\s*/g, lang === 'zh' ? ' 至 ' : ' to ');

/* the arrival: the sun starts 70 degrees round and settles to rest over 2.4 s, once */
let sweepT = reduce ? Infinity : 0;
const SWEEP = 70 * D, SWEEP_FOR = 2.4;
const sweepAngle = () => (sweepT >= SWEEP_FOR ? 0 : SWEEP * (1 - (1 - (1 - sweepT / SWEEP_FOR) ** 3)) );

/* the Years line */
// the year he first went to a place or a country (0: always there, as home is)
function firstYearOf(kind, it) {
  if (!it || it.home) return 0;
  if (kind === 'country') return it.trips.length ? Math.min(...it.trips.map((t) => t.year)) : 0;
  if (it.trips && it.trips.length) return Math.min(...it.trips.map((t) => t.year));
  return firstYearOf('country', R.countryById[it.country]);
}
// the line under the globe: everything, or what there was by the year chosen
function totalsLine() {
  if (yearSel == null) return W().totals(R.totals);
  const y = yearSel, ts = R.trips.filter((t) => t.year <= y);
  let km = 0;
  for (const t of ts) for (const l of t.legs) if (l.kind === 'flight') km += l.angle * 6371;
  return W().totalsBy({
    countries: R.countries.filter((c) => firstYearOf('country', c) <= y && (c.home || c.trips.length)).length,
    places: R.places.filter((p) => p.kind !== 'pin' && firstYearOf('place', p) <= y).length,
    trips: ts.length,
    km: Math.round(km / 1000) * 1000,
  }, y);
}
let yearsList = [], yPlay = null; // yPlay: { t } while the years are played
const YEAR0 = 2010, YEAR1 = 2026, YEARS_FOR = 12;
function writeUYear() {
  const U = light.U;
  U.uYear.value = yPlay ? yPlay.y - 0.4 : yearSel == null ? 9999 : yearSel + 0.5;
}
function setYear(y, { push = false, fly = false } = {}) {
  const last = yearsList[yearsList.length - 1];
  const v = y == null || y >= last ? null : y;
  const changed = v !== yearSel;
  yearSel = v;
  $('y-range').value = String(v == null ? last : v);
  $('y-all').hidden = v == null;
  $('y-now').textContent = v == null ? W().span(yearsList[0], last) : W().yearWord(v);
  $('y-range').setAttribute('aria-valuetext', $('y-now').textContent);
  writeUYear();
  if (changed) {
    buildFaint(); strongKey = null; buildStrong(); setFocusMarks();
    $('totals').textContent = totalsLine(); writeSummary();
    if (tab === 'trips' && indexYear !== yearSel) renderIndex();
    if (fly && v != null) flyToYear(v);
  }
  if (push) writeHash(false);
  wake();
}
function flyToYear(y) {
  const ts = R.trips.filter((t) => t.year === y);
  if (!ts.length) return;
  const legs = ts.flatMap((t) => t.legs), countries = ts.flatMap((t) => t.countries);
  const o = targetFor('trip', { legs, countries });
  if (reduce) view.flyTo(o, { jump: true, owner: 'fly' }); else view.flyTo({ ...o, alt: Math.max(o.alt, 0.6) }, { duration: 900 });
}
function snapYear(v) {
  let best = yearsList[0];
  for (const y of yearsList) if (Math.abs(y - v) < Math.abs(best - v)) best = y;
  return best;
}
function writeYears() {
  const w = W();
  $('y-label').textContent = w.yearsLabel;
  $('y-range').setAttribute('aria-label', w.yearsLabel);
  $('y-play').textContent = yPlay ? w.stopYears : w.playYears;
  $('y-all').textContent = w.allYears;
  const last = yearsList[yearsList.length - 1];
  // the ticks at his trip years only, spaced by real time, so the quiet years show as a gap
  const named = new Set([yearsList[0], 2015, 2022, last]);
  $('y-ticks').innerHTML = yearsList.map((y) => `<span class="at-years__tick${named.has(y) ? ' is-named' : ''}" style="--x: ${(((y - YEAR0) / (YEAR1 - YEAR0)) * 100).toFixed(2)}"><span class="at-years__y">${esc(w.yearWord(y))}</span></span>`).join('');
  $('y-now').textContent = yearSel == null ? w.span(yearsList[0], last) : w.yearWord(yearSel);
}
function playYears() {
  if (yPlay) { stopYears(); return; }
  if (playing) stopPlay();
  clearSelection({ push: false });
  yPlay = { y: YEAR0, step: 0 };
  quietSince = performance.now();
  document.body.classList.add('is-years');
  setYear(yearsList[0], { fly: true });
  writeYears();
  wake();
}
function stopYears(toEnd = false) {
  if (!yPlay) return;
  yPlay = null;
  document.body.classList.remove('is-years');
  writeUYear();
  if (toEnd) setYear(null);
  writeYears();
  wake();
}
function stepYears(dt) {
  if (!yPlay) return false;
  if (reduce) {
    // under reduced motion the years step one by one, 0.8 s each, with no glide
    yPlay.step += dt;
    if (yPlay.step < 0.8) return true;
    yPlay.step = 0;
    const i = yearsList.indexOf(yearSel);
    if (i < 0 || i + 1 >= yearsList.length - 1) { stopYears(true); return false; }
    yPlay.y = yearsList[i + 1] + 0.5;
    setYear(yearsList[i + 1], { fly: true });
    return true;
  }
  yPlay.y += dt * (YEAR1 + 1 - YEAR0) / YEARS_FOR;
  if (yPlay.y >= YEAR1 + 1) { stopYears(true); return false; }
  const y = Math.floor(yPlay.y);
  // between trip years the line holds on the last one, so a quiet year is seen as quiet
  let shown = yearsList[0];
  for (const t of yearsList) if (t <= y) shown = t;
  if (shown !== yearSel && shown < yearsList[yearsList.length - 1]) setYear(shown, { fly: true });
  else if (shown >= yearsList[yearsList.length - 1] && yearSel != null && y >= shown) setYear(null);
  writeUYear();
  return true;
}
$('y-range').addEventListener('input', () => { if (yPlay) stopYears(); setYear(snapYear(+$('y-range').value), { push: true }); });
$('y-range').addEventListener('change', () => { if (yearSel != null) flyToYear(yearSel); });
$('y-play').addEventListener('click', () => playYears());
$('y-all').addEventListener('click', () => { stopYears(); setYear(null, { push: true }); });

/* the country card: the country under the pointer lifts a little, and a card says how often he went */
let cardIdx = -1, hoverK = 0;
function countryNear(x, y) {
  const g = view.hit(x, y);
  if (g) { const i = pickIndex(g.lat, g.lng); if (i >= 0) return i; }
  // a country too small to point at (Andorra, Singapore, Hong Kong) is found by its mark, within 20 px
  let best = -1, bd = 20;
  for (const m of marks.marks) {
    if (m.kind !== 'country' || !m.vis) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bd) { bd = d; best = m.item.index; }
  }
  return best;
}
function showCard(i, x, y) {
  const card = $('card');
  if (i < 0 || !R || !R.countries[i] || cam.alt < 0.1 || (yearSel != null && !R.countries[i].home && !R.countries[i].trips.some(tripShown))) {
    if (cardIdx !== -1) { cardIdx = -1; card.hidden = true; light.U.uHover.value = -1; reservedBoxes = reserved(); collideNext = true; wake(); }
    return;
  }
  const c = R.countries[i];
  // a country under a resting pointer does not stop the slow turn; the card steps aside while it turns
  if (spinK > 0.01) return;
  if (cardIdx !== i) {
    cardIdx = i;
    const w = W();
    const ys = c.years.slice().sort();
    const line = c.home ? w.home : w.tripsSpan(c.trips.length, ys[0], ys[ys.length - 1]);
    const ph = c.photos[0];
    card.innerHTML = `<p class="at-card__name"><span lang="en">${esc(c.name.en)}</span><span class="at-card__zh" lang="zh-Hant">${esc(c.name.zh)}</span></p><p class="at-card__line">${esc(line)}</p>${ph ? `<span class="at-card__print" style="--ar: ${(ph.w / ph.h).toFixed(3)}"><img src="../images/web/640/${esc(ph.file)}" alt="" width="120" height="${Math.round(120 * ph.h / ph.w)}" decoding="async"></span>` : ''}`;
    card.hidden = false;
    light.U.uHover.value = i + 1;
    if (reduce) hoverK = 0;
  }
  // beside the pointer, kept inside the free part of the screen
  const bw = card.offsetWidth || 160, bh = card.offsetHeight || 80;
  let cx = x + 18, cy = y + 14;
  if (cx + bw > free.x1 - 8) cx = x - 18 - bw;
  if (cy + bh > innerHeight - 8) cy = y - 14 - bh;
  card.style.setProperty('--x', `${Math.max(8, cx).toFixed(0)}px`);
  card.style.setProperty('--y', `${Math.max(8, cy).toFixed(0)}px`);
  cardBox = [cx - 6, cy - 6, cx + bw + 6, cy + bh + 6];
  wake();
}
let cardBox = null;
const hideCard = () => { showCard(-1); cardBox = null; };
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons || !R || !marks || !matchMedia('(hover: hover)').matches) return;
  showCard(countryNear(e.clientX, e.clientY), e.clientX, e.clientY);
});
canvas.addEventListener('pointerleave', hideCard);
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') hideCard(); });

/* the lit playback: a ring at each stop, the stop's photograph for two seconds, the plane's shadow */
const rings = [];
const ringGeo = new THREE.RingGeometry(0.7, 1, 48);
function ringAt(v) {
  if (reduce) return;
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: C.home.color, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(v).multiplyScalar(1.0004);
  m.lookAt(v.clone().multiplyScalar(2));
  m.renderOrder = 9;
  m.userData.t = 0;
  scene.add(m);
  rings.push(m);
}
const planeShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: C.text.color, alphaMap: light.shadowTex, transparent: true, opacity: 0.28, depthWrite: false }));
planeShadow.renderOrder = 8;
planeShadow.visible = false;
scene.add(planeShadow);
let stopShow = null; // { ph, place, t }
function showStop(place) {
  const ph = place && place.photos && place.photos[0];
  const el = $('stop');
  if (!ph) { stopShow = null; el.hidden = true; return; }
  stopShow = { ph, place, v: toVec(place.lat, place.lng), t: 0 };
  el.innerHTML = `<img src="../images/web/640/${esc(ph.file)}" alt="${esc(ph.alt ? ph.alt[lang] : '')}" width="180" height="${Math.round(180 * ph.h / ph.w)}" decoding="async"><span class="at-stop__name">${esc(place.name[lang])}</span>`;
  el.style.setProperty('--ar', (ph.w / ph.h).toFixed(3));
  el.dataset.photo = ph.id;
  el.hidden = false;
  el.classList.remove('is-on');
  requestAnimationFrame(() => el.classList.add('is-on'));
}
$('stop').addEventListener('click', () => { if (stopShow) openPhoto(stopShow.ph); });
const projV = new THREE.Vector3(), sunT = new THREE.Vector3();

/* everything above that moves, each frame; true while something does */
function stepExtras(dt, now) {
  let moving = false;
  if (sweepT < SWEEP_FOR) { sweepT += dt; moving = true; }
  if (stepYears(dt)) moving = true;
  // the country under the pointer rises over 180 ms, with no bounce
  const want = cardIdx >= 0 && !reduce ? 1 : 0;
  if (hoverK !== want) {
    hoverK = want ? Math.min(1, hoverK + dt / 0.18) : Math.max(0, hoverK - dt / 0.18);
    moving = true;
  }
  light.U.uHoverK.value = 1 - (1 - hoverK) ** 3;
  // the bead: only on the one trip in focus, for 4 s after the last touch of it, never during the spin
  const hasPulse = strong.children.some((l) => l.material.userData.pulse);
  const on = hasPulse && !reduce && now < pulseUntil && spinK < 0.01;
  const pk = uPulse.value;
  uPulse.value = on ? Math.min(1, pk + dt / 0.3) : Math.max(0, pk - dt / 0.3);
  pulseHold = false;
  if (on || uPulse.value > 0) {
    // a phone draws the bead at most 30 times a second: between its steps the frame is not drawn at all
    pulseAcc += dt;
    if (!(phone && pulseAcc < 1 / 30)) { uTime.value += pulseAcc; pulseAcc = 0; } else pulseHold = true;
    if (uPulse.value !== pk) pulseHold = false; // fading in or out: every frame
  }
  if (!on && uPulse.value === 0) pulseAcc = 0;
  const pulseMoving = on || uPulse.value > 0;
  // the rings at the stops
  for (let i = rings.length - 1; i >= 0; i--) {
    const m = rings[i];
    m.userData.t += dt / 0.6;
    const t = Math.min(1, m.userData.t), e = 1 - (1 - t) ** 3;
    const sc = m.position.distanceTo(camera.position) * 0.012 * (1 + 2 * e);
    m.scale.setScalar(sc);
    m.material.opacity = 0.6 * (1 - t);
    if (t >= 1) { scene.remove(m); m.material.dispose(); rings.splice(i, 1); } else moving = true;
  }
  // the stop's photograph, beside its dot for two seconds
  if (stopShow) {
    stopShow.t += dt;
    projV.copy(stopShow.v).project(camera);
    const x = (projV.x * 0.5 + 0.5) * innerWidth, y = (-projV.y * 0.5 + 0.5) * innerHeight;
    $('stop').style.setProperty('--x', `${x.toFixed(1)}px`);
    $('stop').style.setProperty('--y', `${y.toFixed(1)}px`);
    if (stopShow.t > 2) { stopShow = null; $('stop').classList.remove('is-on'); setTimeout(() => { if (!stopShow) $('stop').hidden = true; }, 300); }
    else moving = true;
  }
  // the plane's small shadow on the ground, away from the sun
  planeShadow.visible = !!(marker.visible && marker.userData.plane.visible);
  if (planeShadow.visible) {
    const g = marker.position.clone().normalize();
    sunT.copy(light.U.uSun.value).addScaledVector(g, -light.U.uSun.value.dot(g));
    const lift = marker.position.length() - 1;
    planeShadow.position.copy(g).addScaledVector(sunT.normalize(), -Math.min(0.03, lift * 0.5)).normalize().multiplyScalar(1.0003);
    planeShadow.lookAt(planeShadow.position.clone().multiplyScalar(2));
    planeShadow.scale.setScalar(marker.scale.x * 0.7);
  }
  // pulseOnly: nothing but the bead asks for this frame
  extrasOnlyPulse = !moving && pulseMoving;
  return moving || pulseMoving;
}
let pulseAcc = 0, pulseHold = false, extrasOnlyPulse = false;

/* ---------- start ---------- */
// The highlight's own line programs (the bead on a flight and on the ground, a dashed gap without
// colours) are built once at the start, off the frame, so the first hover of a trip does not stall
// while they compile. Their materials are kept, so the compiled programs stay cached.
function warmLines() {
  const pos = new Float32Array([1.01, 0, 0, 0, 1.01, 0]), col = new Float32Array(6).fill(0.5);
  const g = new THREE.Group();
  g.add(makeLine('flight', pos, { lifted: true, colors: col, pulse: true }));
  g.add(makeLine('road', pos, { colors: col, pulse: true }));
  g.add(makeLine('gap', pos, { width: 1.25, opacity: 0.6 }));
  for (const l of g.children) l.material.opacity = 0.001;
  scene.add(g);
  const done = () => { scene.remove(g); for (const l of g.children) l.geometry.dispose(); };
  try { (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera))).then(done, done); } catch (e) { done(); }
}
let shapes = null;
// his countries in solid terracotta, deeper with each return; home the deepest
// (a little short of solid, so the land's own tint and relief read through; the patch quietens them further close in)
const washOf = (c) => (!c ? null : c.home ? { colour: 'home', alpha: 0.88 } : c.visits >= 3 ? { colour: 'visit-3', alpha: 0.8 }
  : c.visits === 2 ? { colour: 'visit-2', alpha: 0.72 } : c.visits === 1 ? { colour: 'visit-1', alpha: 0.64 } : null);
let reliefSrc = null;
async function paintAll(size = big ? 8192 : 4096, withRelief = true) {
  if (!shapes || !R) return;
  const washes = R.countries.map(washOf);
  await paintBase({ renderer, material: globeMat, shapes, C, washes, reliefSrc: withRelief ? reliefSrc : null, size });
  wake();
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
  yearsList = [...new Set(R.trips.map((t) => t.year))].sort((a, b) => a - b);
  placeYears();
  writeYears();
  setYear(null);
  buildFaint();
  if (R.home) light.setHome(toVec(R.home.lat, R.home.lng));
  marks = createMarks({
    layer: $('marks'), overlay: $('hair'), camera, words: W, lang: () => lang,
    onPick: (kind, item) => { if (kind === 'photo') openPhoto(item); else select(kind, item); },
    onHover: (kind, item) => { hover = kind ? { kind, item } : null; setFocusMarks(); },
  });
  $('hair').dataset.ink = C['text-2'].css;
  $('hair').dataset.stem = C.text.css;
  marks.build(R);
  writeWords();
  reservedBoxes = reserved();
  // arrival: high over Taiwan, settling to the whole world; a link with a view opens there at once
  const h = readHash();
  // a link naming nothing that exists is treated as no link: the usual arrival, and a clean address
  if (h.kind && !(h.kind === 'photo' ? itemOf('photo', h.id) : itemOf(h.kind, h.id))) h.kind = null;
  if (h.at || h.kind || h.y != null) {
    arrival = 1; sweepT = Infinity;
    if (!h.at && h.kind) { const it = h.kind === 'photo' ? itemOf('photo', h.id) && itemOf('photo', h.id).at : itemOf(h.kind, h.id); if (it) Object.assign(cam, targetFor(h.kind === 'photo' ? 'place' : h.kind, it)); }
    applyHash(false);
  } else {
    if (reduce) Object.assign(cam, worldView());
    else Object.assign(cam, { lat: 22, lng: R.home ? R.home.lng : 121, alt: Math.max(3.0, view.lim.world * 1.08) });
    view.place();
    if (!reduce) view.zoomTo(view.lim.world, free.cx, free.cy, 1.4);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sandboxed */ }
  }
  setTimeout(() => $('marks').classList.add('is-ready'), reduce ? 0 : 400);
  wake();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { marks.measure(); collideNext = true; wake(); });
  // The paper: a small quick sheet at once (about 20 MB), then the real one painted once with its relief.
  // The sharper relief only on a computer that can hold it; the phone never asks for it.
  if (world) {
    // the light's mask (his countries, the land, the year each was first visited) and the relief as a bump
    light.setMask(pickIndex, shapes, R.countries.map((c) => (c.home ? 0 : c.trips.length ? Math.min(...c.trips.map((t) => t.year)) : 0)), big ? 2048 : 1024);
    // the 4096 relief is fetched once: the light's bump and tint read it, and so does the paint where
    // the sharper 10800 one is not wanted
    const smallRelief = fetch('../vendor/relief/SR_50M-4096.jpg').then((r) => (r.ok ? r.blob() : null)).catch(() => null);
    light.loadBump(smallRelief).then(wake);
    await paintAll(2048, false);
    warmLines();
    try {
      if (big) reliefSrc = await loadRelief('../vendor/relief/SR_50M-10800.jpg', 10800, 5400);
      else { const b = await smallRelief; reliefSrc = b ? { blob: b, w: 4096, h: 2048 } : null; }
    } catch (e) { reliefSrc = null; }
    await paintAll();
    const patchSize = phone || (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 1024 : (devicePixelRatio > 1.5 && maxTex >= 16384 ? 4096 : 2048);
    patch = createPatch({ renderer, scene, shapes, C, washes: R.countries.map(washOf), reliefSrc, size: patchSize, lit: (m) => light.apply(m, 'bold-lit-patch') });
    wake();
  }
}
start();
window.__atlasBold = { get R() { return R; }, cam, view, pick: (a, b) => pickIndex(a, b), get patch() { return patch; }, get relief() { return reliefSrc; }, globeMat, scene, get sel() { return sel; }, marks: () => marks, tiltOf, light, renderer, setYear: (y) => setYear(y), get yearSel() { return yearSel; }, showCard: (i, x, y) => showCard(i, x, y), wake: () => wake() };
