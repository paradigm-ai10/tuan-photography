// Relief: four mountains he photographed, cut from real elevation into one plaster model on a
// plinth. Scroll is a day on each mountain: the sun rises, crosses and sets across the model; at
// night the land reshapes into the next mountain. Native scroll only; every frame is a pure
// function of the scroll position. Heights: terrain/<id>.bin (see terrain/README.txt).

import * as THREE from 'three';

const SITE = window.SITE;
const html = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------------ words */

const T = {
  en: {
    name: 'Thomas Chen', portfolio: 'Portfolio', guides: 'Guides', trips: 'Trips', switch: '中文',
    h1: 'Thomas Chen',
    introLine: 'Landscape photographs from twenty-one countries, and how to stand where they were taken.',
    allPhotos: 'All photographs', guideNext: 'Guides to more places are on the way. The photographs come first.',
    follow: 'Follow on Instagram',
    credit: 'Relief from Mapzen Terrain Tiles (SRTM, GMTED, Japan GSI, LINZ and others).',
    readGuide: 'Read the guide', trip: 'The trip', photos: 'Photographs from here',
    stood: 'The red mark is where he stood.',
  },
  zh: {
    name: '陳亮元', portfolio: '作品', guides: '攻略', trips: '旅程', switch: 'EN',
    h1: '陳亮元',
    introLine: '來自二十一個國家的風景照片，以及如何站到拍下它們的那個位置。',
    allPhotos: '所有作品', guideNext: '更多地方的攻略正在寫，照片先來。',
    follow: '在 Instagram 追蹤',
    credit: '地形資料來自 Mapzen Terrain Tiles（SRTM、GMTED、日本國土地理院、紐西蘭 LINZ 等）。',
    readGuide: '閱讀攻略', trip: '那一趟旅程', photos: '這裡的作品',
    stood: '紅色記號是他站的位置。',
  },
};
let lang = 'en';
try { if (localStorage.getItem('d5-lang') === 'zh') lang = 'zh'; } catch (e) { /* private window */ }
const t = k => T[lang][k];
const pick = o => (o ? o[lang] || o.en || '' : '');
const slide = id => SITE.slides[id];
const img = (file, size = 1280) => `../../images/web/${size}/${file}`;

/* ------------------------------------------------------------------ the mountains */

const PEAKS = [
  { id: 'matterhorn', photo: 'matterhorn-lake', country: 'switzerland' },
  { id: 'fuji', photo: 'fuji-lake', country: 'japan' },
  { id: 'aoraki', photo: 'aoraki', country: 'new-zealand' },
  { id: 'sapa', photo: 'sapa-valley', country: 'vietnam' },
];
const countryOf = id => SITE.countries.find(c => c.id === id);
const firstSentence = s => (s || '').split(/(?<=[.。])\s*/)[0];

const peaksEl = document.getElementById('peaks');
const peakSecs = PEAKS.map(p => {
  const s = slide(p.photo);
  const sec = document.createElement('section');
  sec.className = 'peak';
  sec.innerHTML = `<div class="peak-card"><img alt="" loading="lazy" src="${img(s.file)}">
    <h2></h2><p class="peak-where"></p><p class="peak-note"></p><p class="peak-links"></p></div>`;
  peaksEl.append(sec);
  return sec;
});

function fillPeaks() {
  PEAKS.forEach((p, i) => {
    const s = slide(p.photo), c = countryOf(p.country), sec = peakSecs[i];
    sec.querySelector('img').alt = pick(s.alt);
    sec.querySelector('h2').textContent = pick(s.place);
    sec.querySelector('.peak-where').textContent = pick(s.where);
    sec.querySelector('.peak-note').textContent = firstSentence(pick(s.note)) + (p.stood ? ' ' + t('stood') : '');
    sec.querySelector('.peak-links').innerHTML =
      `<a href="#trips">${t('trip')}</a><a href="#portfolio">${t('photos')}</a>`;
    sec.setAttribute('aria-label', `${pick(s.place)}, ${pick(c.name)}`);
  });
}

/* ---- the sections after: portfolio, guides, trips ---- */

const FOLIO = ['westminster-bridge', 'tekapo-stars', 'neuschwanstein', 'golden-gate-fog', 'calanque', 'taipei-night', 'edge-night'];
function fillSections() {
  document.getElementById('folio').innerHTML = FOLIO.filter(slide).map(id => {
    const s = slide(id);
    return `<figure><img loading="lazy" src="${img(s.file)}" width="${s.w}" height="${s.h}" alt="${pick(s.alt).replace(/"/g, '&quot;')}"><figcaption>${pick(s.place)}</figcaption></figure>`;
  }).join('');

  const g = SITE.guides.barcelona, lead = slide(g.lead), book = SITE.books.find(b => b.guide === 'barcelona');
  document.getElementById('guide-feature').innerHTML =
    `<a class="guide-feature" href="#"><img loading="lazy" src="${img(lead.file)}" alt="${pick(lead.alt).replace(/"/g, '&quot;')}">
     <div><h3>${pick(g.title)}</h3><p>${pick(g.facts)}</p><p class="go">${t('readGuide')}</p></div></a>`;
  const placed = new Set([book && book.country]);
  document.getElementById('guide-places').innerHTML = SITE.countries
    .filter(c => c.photos.length && !placed.has(c.id)).map(c => `<li>${pick(c.name)}</li>`).join('');

  const names = ids => ids.map(id => pick((countryOf(id) || {}).name)).filter(Boolean).join(lang === 'zh' ? '、' : ', ');
  document.getElementById('trip-list').innerHTML = SITE.journeys
    .map(j => `<li><span class="trip-when">${pick(j.date)}</span><span class="trip-where">${names(j.countries)}</span></li>`).join('');
  document.getElementById('ig').href = SITE.instagram.url;
}

function applyLang() {
  html.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  html.dataset.lang = lang;
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  const b = document.getElementById('lang');
  b.textContent = t('switch');
  b.lang = lang === 'zh' ? 'en' : 'zh-Hant';
  fillPeaks();
  fillSections();
}
document.getElementById('lang').addEventListener('click', () => {
  lang = lang === 'en' ? 'zh' : 'en';
  try { localStorage.setItem('d5-lang', lang); } catch (e) { /* ignore */ }
  applyLang();
});
applyLang();

/* ------------------------------------------------------------------ the model */

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('stage'), antialias: true }); }
catch (e) { renderer = null; }
if (!renderer) { html.classList.add('no-gl'); throw new Error('no WebGL: the photographs stand alone'); }

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

const SIZE = 10;          // the model is 10 units square
const BASE = -0.55;       // underside of the cast
const EXAG = 1.35;        // vertical exaggeration, as model makers do

const meta = await fetch('terrain/meta.json').then(r => r.json());
const fields = await Promise.all(PEAKS.map(p => fetch(`terrain/${p.id}.bin`).then(r => r.arrayBuffer()).then(b => {
  const m = meta[p.id], q = new Uint16Array(b), n = m.n;
  const unitsPerM = SIZE / (m.sizeKm * 1000);
  const y = new Float32Array(n * n), elev = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const metres = m.min + (q[i] / 65535) * (m.max - m.min);
    elev[i] = metres;
    y[i] = 0.12 + (metres - m.min) * unitsPerM * EXAG;
  }
  // where the photograph was taken, if it falls on the model
  const s = slide(p.photo);
  const kx = 111.32 * Math.cos(m.lat * Math.PI / 180), ky = 110.57;
  const u = m.peakU + ((s.ll[1] - m.lng) * kx) / m.sizeKm;
  const v = m.peakV - ((s.ll[0] - m.lat) * ky) / m.sizeKm;
  p.stood = u > 0.04 && u < 0.96 && v > 0.04 && v < 0.96 ? { u, v } : null;
  return { y, elev, n };
})));
fillPeaks();   // now that we know which ones show where he stood

const N = fields[0].n;
const geo = new THREE.PlaneGeometry(SIZE, SIZE, N - 1, N - 1);
geo.rotateX(-Math.PI / 2);
const pos = geo.attributes.position;
const elevAttr = new THREE.BufferAttribute(new Float32Array(N * N), 1);
geo.setAttribute('elev', elevAttr);

const plaster = new THREE.MeshStandardMaterial({ color: '#f4f3ef', roughness: 0.93, metalness: 0 });
// faint contour lines every 100 m, a little stronger every 500 m: a surveyor's model, not a toy
plaster.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float elev;\nvarying float vElev;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvElev = elev;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vElev;')
    .replace('#include <color_fragment>', `#include <color_fragment>
      float e1 = vElev / 100.0, e5 = vElev / 500.0;
      float l1 = 1.0 - min(abs(fract(e1 - 0.5) - 0.5) / max(fwidth(e1), 1e-4), 1.0);
      float l5 = 1.0 - min(abs(fract(e5 - 0.5) - 0.5) / max(fwidth(e5) * 1.3, 1e-4), 1.0);
      diffuseColor.rgb *= 1.0 - 0.07 * l1 - 0.10 * l5;`);
};
const land = new THREE.Mesh(geo, plaster);
land.castShadow = land.receiveShadow = true;

// the cut sides of the cast
const sideGeo = new THREE.BufferGeometry();
const sidePos = new Float32Array((N - 1) * 4 * 6 * 3);
sideGeo.setAttribute('position', new THREE.BufferAttribute(sidePos, 3));
const sideMat = new THREE.MeshStandardMaterial({ color: '#e9e8e3', roughness: 1, side: THREE.DoubleSide });
const sides = new THREE.Mesh(sideGeo, sideMat);
sides.castShadow = true;

// the plinth and the table it stands on
const plinth = new THREE.Mesh(new THREE.BoxGeometry(SIZE + 0.9, 0.7, SIZE + 0.9),
  new THREE.MeshStandardMaterial({ color: '#e2e3e3', roughness: 0.96 }));
plinth.position.y = BASE - 0.35;
plinth.castShadow = plinth.receiveShadow = true;
const table = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: 0.13 }));
table.rotation.x = -Math.PI / 2;
table.position.y = BASE - 0.7;
table.receiveShadow = true;

// the one marker: where he stood to take the photograph
const pin = new THREE.Group();
const pinMat = new THREE.MeshStandardMaterial({ color: '#c8452c', roughness: 0.6 });
const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), pinMat);
stem.position.y = 0.35;
const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), pinMat);
head.position.y = 0.72;
pin.add(stem, head);
pin.traverse(o => { o.castShadow = true; });

const model = new THREE.Group();
model.add(land, sides, plinth, pin);
scene.add(model, table);

const sun = new THREE.DirectionalLight('#ffffff', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -9;
sun.shadow.camera.right = sun.shadow.camera.top = 9;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const sky = new THREE.HemisphereLight('#eef1f4', '#cfcbc3', 0.6);
scene.add(sky);

let shown = -1, shownMix = -1;
function shape(i, mix) {
  if (i === shown && Math.abs(mix - shownMix) < 0.002) return;
  shown = i; shownMix = mix;
  const a = fields[i], b = fields[Math.min(i + 1, fields.length - 1)];
  for (let k = 0; k < N * N; k++) {
    pos.array[k * 3 + 1] = a.y[k] + (b.y[k] - a.y[k]) * mix;
    elevAttr.array[k] = a.elev[k] + (b.elev[k] - a.elev[k]) * mix;
  }
  pos.needsUpdate = true;
  elevAttr.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  // the sides follow the edge of the land down to the base
  let o = 0;
  const P = (k) => [pos.array[k * 3], pos.array[k * 3 + 1], pos.array[k * 3 + 2]];
  const edge = [];
  for (let c = 0; c < N; c++) edge.push(c);                       // north
  for (let r = 1; r < N; r++) edge.push(r * N + N - 1);           // east
  for (let c = N - 2; c >= 0; c--) edge.push((N - 1) * N + c);    // south
  for (let r = N - 2; r >= 0; r--) edge.push(r * N);              // west
  for (let e = 0; e < edge.length - 1; e++) {
    const p0 = P(edge[e]), p1 = P(edge[e + 1]);
    const q0 = [p0[0], BASE, p0[2]], q1 = [p1[0], BASE, p1[2]];
    for (const v of [p0, q0, p1, p1, q0, q1]) { sidePos[o++] = v[0]; sidePos[o++] = v[1]; sidePos[o++] = v[2]; }
  }
  sideGeo.attributes.position.needsUpdate = true;
  sideGeo.setDrawRange(0, o / 3);
  sideGeo.computeVertexNormals();
  // the pin stands at the photograph's spot on the mountain shown (hidden mid-change)
  const p = PEAKS[mix < 0.5 ? i : Math.min(i + 1, PEAKS.length - 1)];
  const sd = p.stood;
  pin.visible = !!sd && (mix < 0.08 || mix > 0.92);
  if (sd) {
    const col = Math.round(sd.u * (N - 1)), row = Math.round(sd.v * (N - 1));
    const k = row * N + col;
    pin.position.set(pos.array[k * 3], pos.array[k * 3 + 1], pos.array[k * 3 + 2]);
  }
}

/* ------------------------------------------------------------------ light and time */

const C = (h) => new THREE.Color(h);
const SKY = { dawn: C('#ebe5df'), day: C('#eceeed'), dusk: C('#efe2d6'), night: C('#cdd2d8') };
const tmp = new THREE.Color();

// d: 0 sunrise .. 1 sunset; night outside that
function light(d, night) {
  const el = Math.sin(Math.PI * Math.min(1, Math.max(0, d))) * 0.95 + 0.07;      // radians above horizon
  const az = 1.15 + d * 3.6;                                                     // east, round the back, to west
  sun.position.set(Math.cos(el) * Math.sin(az) * 30, Math.sin(el) * 30, Math.cos(el) * Math.cos(az) * 30);
  const low = 1 - Math.min(1, el / 0.6);
  sun.color.setRGB(1, 1 - 0.2 * low, 1 - 0.38 * low);
  sun.intensity = (3.1 - 0.7 * low) * (1 - night);
  sky.intensity = 0.62 - 0.25 * night;
  // the page's ground follows the light on the model
  const base = d < 0.5 ? tmp.copy(SKY.dawn).lerp(SKY.day, Math.min(1, d / 0.3))
                       : tmp.copy(SKY.day).lerp(SKY.dusk, Math.max(0, (d - 0.7) / 0.3));
  base.lerp(SKY.night, night);
  renderer.setClearColor(base, 1);
  html.style.setProperty('--sky', '#' + base.getHexString());
}

/* ------------------------------------------------------------------ scroll */

let portrait = false;
function measure() {
  const w = innerWidth, h = innerHeight;
  portrait = w / h < 0.85;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = portrait ? 42 : 30;
  camera.updateProjectionMatrix();
  last = '';
}
// lens shift: on the first screen the model stands right of the name; beside the photographs, left
function lens(p) {
  const w = innerWidth, h = innerHeight;
  if (portrait) { camera.setViewOffset(w, h, 0, h * 0.24, w, h); return; }
  const k = Math.min(1, Math.max(0, p + 1));
  const s = k * k * (3 - 2 * k);
  camera.setViewOffset(w, h, w * (-0.16 + 0.31 * s), h * (0.11 - 0.07 * s), w, h);
}

// p: -1 on the first screen, 0..4 through the four mountains
function progress() {
  const top = peaksEl.offsetTop, H = peakSecs[0].offsetHeight;
  return Math.max(-1, Math.min(PEAKS.length - 0.001, (scrollY - top + innerHeight * 0.35) / H));
}

let smooth = null;
function frame(now) {
  requestAnimationFrame(frame);
  const target = progress();
  smooth = smooth === null || reduce.matches ? target : smooth + (target - smooth) * 0.085;
  if (Math.abs(target - smooth) < 0.0005) smooth = target;
  draw(smooth);
}

let last = '';
function draw(p) {
  const key = p.toFixed(4) + innerWidth + 'x' + innerHeight;
  if (key === last) return;
  last = key;
  const i = Math.max(0, Math.floor(p));
  const f = p < 0 ? 0 : p - i;
  // a day over each mountain (to 0.78), then night, and the land becomes the next one
  const DAY = 0.78;
  const lastPeak = i >= PEAKS.length - 1;
  const d = p < 0 ? 0.1 + (p + 1) * 0.04 : (lastPeak ? 0.14 + f * 0.86 : 0.14 + Math.min(1, f / DAY) * 0.86);
  const nf = lastPeak ? 0 : Math.max(0, (f - DAY) / (1 - DAY));          // 0..1 across the night
  const night = Math.sin(Math.PI * nf) * 0.85;
  const mix = nf <= 0 ? 0 : 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, (nf - 0.15) / 0.7)));
  shape(i, mix);
  light(nf > 0.5 ? 0.02 + (nf - 0.5) * 0.24 : d, night);

  // the camera walks slowly round the table, one quarter turn over the four mountains
  const az = -0.55 + Math.max(0, p) * 0.32 + (p < 0 ? p * 0.12 : 0);
  const el = portrait ? 0.62 : 0.5 - (p < 0 ? p * 0.12 : 0);
  const r = (portrait ? 50 : 33) - (p < 0 ? p * 3 : 0);
  lens(p);
  camera.position.set(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r + 0.4, Math.cos(az) * Math.cos(el) * r);
  camera.lookAt(0, 0.3, 0);
  renderer.render(scene, camera);
}

measure();
addEventListener('resize', measure);
requestAnimationFrame(frame);
window.__relief = { draw, progress, camera, force() { last = ''; draw(progress()); } };
