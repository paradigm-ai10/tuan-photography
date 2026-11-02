// Design 4, "Where they were taken". One persistent three.js world: a misted paper
// atlas with every photograph standing on it as a print, at the place it was taken.
// Native scroll is the journey (no wheel hijack); every pose is a pure function of
// the scroll position, so forward, back, jumps and reloads all land the same frame.
// The world bible is DESIGN.md beside this file.

import * as THREE from 'three';
import { LineSegments2 } from 'three/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/lines/LineMaterial.js';

const SITE = window.SITE;
const html = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)').matches;

/* ------------------------------------------------------------------ words */

const T = {
  en: {
    name: 'Thomas Chen', places: 'Places', switch: '中文', skip: 'Skip to the places',
    title: 'Thomas Chen, landscape photographs',
    lede: 'Photographs from the road, standing where they were taken.',
    prev: 'Previous', next: 'Next', close: SITE.i18n.en.close, best: SITE.i18n.en.best,
    countryPage: 'The country page', guide: t => `The ${t} guide`,
    photo: (p, n, all) => `${p}, photograph ${n} of ${all}`,
    endTitle: 'The road so far',
    endLine: 'Every trip starts from Taiwan. The rest of the site is one word away.',
    gallery: 'Gallery', journey: 'Journey', guides: 'Guides', about: 'About',
    follow: SITE.i18n.en.follow,
  },
  zh: {
    name: '陳亮元', places: '地點', switch: 'EN', skip: '跳到各個地點',
    title: '陳亮元的風景攝影',
    lede: '旅途中的照片，\n立在它們被拍下的地方。',
    prev: '上一張', next: '下一張', close: SITE.i18n.zh.close, best: SITE.i18n.zh.best,
    countryPage: '國家頁面', guide: t => `${t}攻略`,
    photo: (p, n, all) => `${p}，第 ${n} 張，共 ${all} 張`,
    endTitle: '到目前為止的路',
    endLine: '每一趟都從台灣出發。網站的其他部分，點一下就到。',
    gallery: '作品集', journey: '旅程', guides: '攻略', about: '關於我',
    follow: SITE.i18n.zh.follow,
  },
};
let lang = 'en';
try { if (localStorage.getItem('d4-lang') === 'zh') lang = 'zh'; } catch (e) { /* private window */ }
const tr = k => T[lang][k];
const pick = o => (o ? (o[lang] || o.en || '') : '');

/* ------------------------------------------------------------------ places */

const S = 4;                                    // units per degree
const toXZ = ([lat, lng]) => new THREE.Vector3((lng - 121.5) * S, 0, -(lat - 25) * S);

const ORDER = ['taiwan', 'japan', 'china', 'hong-kong', 'vietnam', 'singapore', 'australia',
  'new-zealand', 'dubai', 'switzerland', 'france', 'spain', 'germany', 'uk', 'usa'];
const CITY_ORDER = ['new-york', 'washington', 'los-angeles', 'san-francisco'];
const CITY_NAMES = { washington: { en: 'Washington, D.C.', zh: '華盛頓' } };

const countries = Object.fromEntries(SITE.countries.map(c => [c.id, c]));
const slides = SITE.slides;

function cityTitle(city) {
  const b = SITE.books.find(b => b.key === city || b.id === city);
  return (b && b.title) || CITY_NAMES[city] || { en: city, zh: city };
}

const R_ARC = 9;          // radius of a place's arc of prints
const WALK = 5.6;         // the camera walks this far in front of the prints
const PRINT_H = 1.5;
const BORDER = 0.06;
const GAP = 0.55;

const stops = [];
for (const id of ORDER) {
  const c = countries[id];
  if (!c || !c.photos.length) continue;
  const groups = new Map();
  for (const pid of c.photos) {
    const s = slides[pid];
    if (!s) continue;
    const key = s.city || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id: pid, ...s });
  }
  const keys = [...groups.keys()].sort((a, b) => CITY_ORDER.indexOf(a) - CITY_ORDER.indexOf(b));
  for (const key of keys) {
    const photos = groups.get(key);
    const ll = photos.reduce((a, p) => [a[0] + p.ll[0] / photos.length, a[1] + p.ll[1] / photos.length], [0, 0]);
    const book = SITE.books.find(b => b.country === id && b.guide);
    stops.push({
      id: key || id, country: c, city: key,
      title: key ? cityTitle(key) : c.name,
      photos, P: toXZ(ll), book,
    });
  }
}
// neighbours in Europe and on the US east coast sit closer than two arcs of prints:
// nudge them apart (a degree or so) so one place never stands inside another
for (let it = 0; it < 80; it++) {
  for (let i = 0; i < stops.length; i++) for (let j = i + 1; j < stops.length; j++) {
    const a = stops[i].P, b = stops[j].P;
    const d = Math.hypot(b.x - a.x, b.z - a.z), MIN = 26;
    if (d < MIN && d > 0.001) {
      const k = (MIN - d) / 2 / d;
      const dx = (b.x - a.x) * k, dz = (b.z - a.z) * k;
      a.x -= dx; a.z -= dz; b.x += dx; b.z += dz;
    }
  }
}

/* ------------------------------------------------------------------ page */

const story = document.getElementById('story');
const sections = [];

function stopHTML(stop, i) {
  const sec = document.createElement('section');
  sec.className = 'stop';
  sec.id = 'p-' + stop.id;
  sec.dataset.stop = i;
  const n = stop.photos.length;
  sec.style.setProperty('--len', `${Math.max(95, 62 + 44 * (n - 1))}svh`);
  sec.innerHTML = `
    <div class="caption">
      <img class="c-fallback" alt="" loading="lazy" src="../images/web/1280/${stop.photos[0].file}">
      <h2></h2>
      <p class="c-when"></p>
      <p class="c-note"></p>
      <p class="c-links"></p>
      <ul class="c-photos"></ul>
    </div>`;
  return sec;
}

function flightHTML(len) {
  const d = document.createElement('div');
  d.className = 'flight';
  d.setAttribute('aria-hidden', 'true');
  d.style.setProperty('--len', `${len}svh`);
  return d;
}

function fillCaption(sec, stop) {
  const cap = sec.querySelector('.caption');
  cap.querySelector('h2').textContent = pick(stop.title);
  cap.querySelector('.c-when').textContent = stop.city
    ? `${pick(stop.country.name)}${lang === 'zh' ? '，' : ', '}${pick(stop.country.date)}`
    : pick(stop.country.date);
  cap.querySelector('.c-note').textContent = stop.city ? '' : pick(stop.country.note);
  const links = [];
  if (stop.book && !stop.city) links.push(`<a href="../posts/${stop.book.guide}.html">${tr('guide')(pick(stop.book.title))}</a>`);
  links.push(`<a href="../countries/${stop.country.id}.html">${tr('countryPage')}</a>`);
  cap.querySelector('.c-links').innerHTML = links.join('');
  cap.querySelector('.c-fallback').alt = pick(stop.photos[0].alt);
  const ul = cap.querySelector('.c-photos');
  ul.innerHTML = '';
  stop.photos.forEach((p, k) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = tr('photo')(pick(p.place), k + 1, stop.photos.length);
    b.addEventListener('click', () => openViewer(stop, k, b));
    li.append(b);
    ul.append(li);
  });
}

const endSec = document.createElement('section');
endSec.className = 'end';
endSec.id = 'end';
endSec.innerHTML = `
  <div class="end-inner">
    <h2 data-i18n="endTitle"></h2>
    <p data-i18n="endLine"></p>
    <nav class="end-tabs" aria-label="Tabs">
      <a class="word" href="../gallery.html" data-i18n="gallery"></a>
      <a class="word" href="../journey/" data-i18n="journey"></a>
      <a class="word" href="../guides.html" data-i18n="guides"></a>
      <a class="word" href="../about.html" data-i18n="about"></a>
    </nav>
    <p class="end-ig"><a href="${SITE.instagram.url}" data-i18n="follow"></a></p>
  </div>`;

stops.forEach((stop, i) => {
  const prev = i ? stops[i - 1] : null;
  const dist = prev ? prev.P.distanceTo(stop.P) : 40;
  story.append(flightHTML(i ? Math.round(Math.min(170, Math.max(70, 55 + dist * 0.22))) : 40));
  const sec = stopHTML(stop, i);
  story.append(sec);
  sections.push(sec);
});
story.append(flightHTML(90));
story.append(endSec);

const placesList = document.getElementById('places-list');

function applyLang() {
  html.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  html.dataset.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = T[lang][el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v;
  });
  document.getElementById('lang').lang = lang === 'zh' ? 'en' : 'zh-Hant';
  stops.forEach((s, i) => fillCaption(sections[i], s));
  placesList.innerHTML = '';
  stops.forEach((s, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `${pick(s.title)}<span class="pl-where"></span>`;
    b.querySelector('.pl-where').textContent = s.city ? pick(s.country.name) : pick(s.country.date);
    b.addEventListener('click', () => { closePlaces(); travelTo(i); });
    li.append(b);
    placesList.append(li);
  });
  if (viewer.stop) showViewer();
  measure();
}

document.getElementById('lang').addEventListener('click', () => {
  lang = lang === 'en' ? 'zh' : 'en';
  try { localStorage.setItem('d4-lang', lang); } catch (e) { /* ignore */ }
  applyLang();
});

/* ------------------------------------------------------------------ renderer */

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('world'), antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  renderer = null;
}

const viewer = { stop: null, index: 0, returnFocus: null };

if (!renderer) {
  html.classList.add('no-gl');
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 6000);
const fog = new THREE.Fog(0xf1f0ec, 10, 200);
scene.fog = fog;

if (renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xf1f0ec, 1);
}

/* ---- palette: paper, tinted by each place's photograph ---- */

const PAPER = {
  sky: new THREE.Color('#e3e7e7'),
  hor: new THREE.Color('#f2f0ea'),
  gnd: new THREE.Color('#efece4'),
};
function lighten(c, minL, maxS) {
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(hsl.s, maxS), Math.max(hsl.l, minL));
  return c;
}
stops.forEach(s => {
  s.pal = { sky: PAPER.sky.clone(), hor: PAPER.hor.clone(), gnd: PAPER.gnd.clone() };
});
function samplePalette(stop, img) {
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 24;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    const avg = (y0, y1) => {
      let r = 0, gg = 0, b = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = 0; x < 24; x++) {
        const k = (y * 24 + x) * 4; r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++;
      }
      return new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace);
    };
    const top = avg(0, 8), bottom = avg(16, 24);
    stop.pal.sky.copy(PAPER.sky).lerp(top, 0.72); lighten(stop.pal.sky, 0.64, 0.5);
    stop.pal.hor.copy(PAPER.hor).lerp(top, 0.38); lighten(stop.pal.hor, 0.83, 0.34);
    stop.pal.gnd.copy(PAPER.gnd).lerp(bottom, 0.3); lighten(stop.pal.gnd, 0.79, 0.24);
    dirty = true;
  } catch (e) { /* keep paper */ }
}

/* ---- sky ---- */

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: PAPER.sky.clone() }, hor: { value: PAPER.hor.clone() } },
  vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 top; uniform vec3 hor; varying vec3 vP;
    void main(){ float y = normalize(vP).y; float t = pow(smoothstep(0.0, 0.42, y), 0.8);
      gl_FragColor = vec4(mix(hor, top, t), 1.0);
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat);
sky.renderOrder = -10;
scene.add(sky);

/* ---- ground: the paper atlas ---- */

const groundMat = new THREE.MeshBasicMaterial({
  color: PAPER.gnd.clone(), transparent: true, opacity: 0.74, depthWrite: false,
});
// close to the camera the atlas is too coarse to read, so it fades into plain wet paper
groundMat.onBeforeCompile = sh => {
  sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
    #ifdef USE_MAP
      vec4 sampledDiffuseColor = texture2D( map, vMapUv );
      sampledDiffuseColor.rgb = mix( vec3( 0.975 ), sampledDiffuseColor.rgb, smoothstep( 6.0, 30.0, vFogDepth ) );
      diffuseColor *= sampledDiffuseColor;
    #endif`);
};
const ground = new THREE.Mesh(new THREE.PlaneGeometry(360 * S, 170 * S), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.set((0 - 121.5) * S, 0, 25 * S);
ground.renderOrder = 1;
scene.add(ground);

async function paintAtlas() {
  const W = renderer && renderer.capabilities.maxTextureSize >= 8192 && !coarse ? 8192 : 4096;
  const H = Math.round(W * 170 / 360);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  // paper grain, very faint, so the ground is a surface and not a fill
  const grain = g.createImageData(256, 256);
  for (let k = 0; k < grain.data.length; k += 4) {
    const v = 236 + Math.random() * 19;
    grain.data[k] = grain.data[k + 1] = grain.data[k + 2] = v;
    grain.data[k + 3] = 40;
  }
  const gc = document.createElement('canvas'); gc.width = gc.height = 256;
  gc.getContext('2d').putImageData(grain, 0, 0);
  g.fillStyle = g.createPattern(gc, 'repeat');
  g.fillRect(0, 0, W, H);
  try {
    const topo = await fetch('../journey/vendor/countries-50m.json').then(r => r.json());
    const land = topojson.feature(topo, topo.objects.land || topo.objects.countries);
    const borders = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);
    const proj = d3.geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);
    const path = d3.geoPath(proj, g);
    // graticule every 15 degrees
    g.strokeStyle = 'rgba(120,112,100,0.10)'; g.lineWidth = W / 8192;
    g.beginPath(); path(d3.geoGraticule().step([15, 15])()); g.stroke();
    g.fillStyle = '#e9e5dc';
    g.beginPath(); path(land); g.fill();
    g.strokeStyle = 'rgba(90,80,68,0.10)'; g.lineWidth = 0.8 * W / 8192;
    g.beginPath(); path(borders); g.stroke();
    g.strokeStyle = 'rgba(80,70,58,0.22)'; g.lineWidth = 0.9 * W / 8192;
    g.beginPath(); path(land); g.stroke();
  } catch (e) { /* the paper alone still works */ }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  groundMat.map = tex;
  groundMat.needsUpdate = true;
  dirty = true;
}

/* ---- shared small textures ---- */

function gradTex(draw, w = 8, h = 128) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  return t;
}
// reflection: strong at the ground line, gone by 55% of the print's height
const fadeTex = gradTex((g, w, h) => {
  const gr = g.createLinearGradient(0, h, 0, 0);
  gr.addColorStop(0, 'rgb(255,255,255)');
  gr.addColorStop(0.18, 'rgb(150,150,150)');
  gr.addColorStop(0.55, 'rgb(0,0,0)');
  gr.addColorStop(1, 'rgb(0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const shadowTex = gradTex((g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgb(255,255,255)');
  gr.addColorStop(0.45, 'rgb(120,120,120)');
  gr.addColorStop(1, 'rgb(0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, 128, 128);

/* ---- prints ---- */

const frameMat = new THREE.MeshBasicMaterial({ color: '#f8f7f3' });
const edgeMat = new THREE.MeshBasicMaterial({ color: '#e4e1da' });
const photoMeshes = [];

stops.forEach((stop, si) => {
  const group = new THREE.Group();
  stop.group = group;
  const n = stop.photos.length;
  const ws = stop.photos.map(p => PRINT_H * Math.min(1.9, Math.max(0.56, p.w / p.h)));
  const L = ws.reduce((a, w) => a + w + 2 * BORDER, 0) + GAP * (n - 1);
  // keep a place's arc to a gentle curve: wide places get a wider radius
  const R = Math.max(R_ARC, L / 2.1);
  stop.R = R;
  stop.walk = R - WALK;
  stop.C = stop.P.clone().add(new THREE.Vector3(0, 0, R));
  let s = -L / 2;
  stop.angles = [];
  stop.prints = [];
  stop.photos.forEach((p, k) => {
    const w = ws[k];
    const fw = w + 2 * BORDER, fh = PRINT_H + 2 * BORDER;
    const th = (s + fw / 2) / R;
    s += fw + GAP;
    stop.angles.push(th);
    const base = new THREE.Vector3(stop.C.x + R * Math.sin(th), 0, stop.C.z - R * Math.cos(th));
    const pg = new THREE.Group();
    pg.position.copy(base);
    pg.rotation.y = -th;
    const cy = fh / 2 + 0.02;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.03),
      [edgeMat, edgeMat, edgeMat, edgeMat, frameMat, frameMat]);
    frame.position.y = cy;
    pg.add(frame);

    const mat = new THREE.MeshBasicMaterial({ color: stop.pal.gnd.clone().multiplyScalar(0.92) });
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, PRINT_H), mat);
    photo.position.set(0, cy, 0.0156);
    photo.userData = { stop: si, index: k };
    pg.add(photo);
    photoMeshes.push(photo);

    const rmat = new THREE.MeshBasicMaterial({
      color: stop.pal.gnd.clone(), alphaMap: fadeTex, transparent: true, opacity: 1,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const refl = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), rmat);
    refl.position.y = -cy;
    refl.scale.y = -1;
    refl.renderOrder = 0;
    pg.add(refl);

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(fw + 1.2, 1.1),
      new THREE.MeshBasicMaterial({ color: '#3b342c', alphaMap: shadowTex, transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.006, 0.05);
    shadow.renderOrder = 2;
    pg.add(shadow);

    const print = { p, pg, photo, refl, base, lift: 0, liftTo: 0, state: 0, w, fh, cy };
    stop.prints.push(print);
    group.add(pg);
  });
  scene.add(group);
});

/* ---- textures, nearest first ---- */

const loader = new THREE.TextureLoader();
let loading = 0;
function loadPrint(stop, print, size) {
  loading++;
  print.state = size === 1280 ? 3 : 1;
  loader.load(`../images/web/${size}/${print.p.file}`, tex => {
    loading--;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const old = print.photo.material.map;
    print.photo.material.map = tex;
    print.photo.material.color.set(0xffffff);
    print.photo.material.needsUpdate = true;
    print.refl.material.map = tex;
    print.refl.material.color.set(0xffffff);
    print.refl.material.opacity = 0.62;
    print.refl.material.needsUpdate = true;
    if (old) old.dispose();
    print.state = size === 1280 ? 4 : 2;
    if (print === stop.prints[0] && size === 640) samplePalette(stop, tex.image);
    dirty = true;
  }, undefined, () => { loading--; print.state = size === 1280 ? 2 : 0; });
}
function pumpTextures() {
  if (loading >= 4) return;
  const here = camera.position;
  let best = null, bestD = Infinity, bestSize = 640;
  for (const stop of stops) {
    const d = here.distanceTo(stop.C);
    for (const print of stop.prints) {
      if (print.state === 0 && d < bestD) { best = [stop, print]; bestD = d; bestSize = 640; }
      else if (print.state === 2 && d < 16 && d - 1000 < bestD) { best = [stop, print]; bestD = d - 1000; bestSize = 1280; }
    }
  }
  if (best && (bestD < fog.far * 1.6 || bestD < -900)) loadPrint(best[0], best[1], bestSize);
}

/* ---- the route ---- */

const routePts = [];
const routeLen = [0];
stops.forEach((s, i) => {
  const p = s.C.clone(); p.y = 0.04;
  if (i) {
    const a = routePts[routePts.length - 1];
    const d = a.distanceTo(p);
    const n = Math.max(1, Math.ceil(d / 1.2));
    for (let k = 1; k <= n; k++) routePts.push(a.clone().lerp(p, k / n));
  } else routePts.push(p);
});
for (let k = 1; k < routePts.length; k++) routeLen.push(routeLen[k - 1] + routePts[k].distanceTo(routePts[k - 1]));
stops.forEach(s => {
  let best = 0, bd = Infinity;
  routePts.forEach((p, k) => { const d = p.distanceTo(s.C); if (d < bd) { bd = d; best = k; } });
  s.routeAt = routeLen[best];
});
const segPos = [];
for (let k = 1; k < routePts.length; k++) segPos.push(...routePts[k - 1].toArray(), ...routePts[k].toArray());
const routeGeo = new LineSegmentsGeometry();
routeGeo.setPositions(segPos);
const routeMat = new LineMaterial({ color: 0x8f4a2a, linewidth: 2.2, transparent: true, opacity: 0.85, depthWrite: false });
const route = new LineSegments2(routeGeo, routeMat);
route.renderOrder = 3;
scene.add(route);
// the road still ahead, faint, so a flight always shows where it is going
const aheadMat = new LineMaterial({ color: 0x8f4a2a, linewidth: 1.1, transparent: true, opacity: 0.22, depthWrite: false });
const ahead = new LineSegments2(routeGeo.clone(), aheadMat);
ahead.renderOrder = 3;
scene.add(ahead);
function showRoute(at) {
  let k = 0;
  while (k < routeLen.length - 1 && routeLen[k + 1] <= at) k++;
  routeGeo.instanceCount = Math.max(0, k);
}

/* ------------------------------------------------------------------ poses */

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * t);
const lerpV = (a, b, t) => a.clone().lerp(b, t);
let portrait = false;

function arcPoint(stop, th, r, y) {
  return V(stop.C.x + r * Math.sin(th), y, stop.C.z - r * Math.cos(th));
}
// along a place: rest at each print, move between them
function stopPose(stop, u) {
  const n = stop.prints.length;
  let th;
  if (n === 1) th = stop.angles[0];
  else {
    const x = Math.min(n - 1, Math.max(0, u * (n - 1)));
    const k = Math.min(n - 2, Math.floor(x));
    const f = x - k;
    // a short rest on each print, then a soft walk to the next
    const g = f < 0.22 ? 0 : f > 0.78 ? 1 : ease((f - 0.22) / 0.56);
    th = stop.angles[k] + (stop.angles[k + 1] - stop.angles[k]) * g;
  }
  const eye = portrait ? 1.0 : 1.08;
  const back = portrait ? 0.4 : 0;
  return {
    pos: arcPoint(stop, th, stop.walk - back, eye),
    tgt: arcPoint(stop, th, stop.R, 0.86),
    at: stop.routeAt, ia: stops.indexOf(stop), ib: stops.indexOf(stop), t: 0,
  };
}
function openPose() {
  const s = stops[0];
  const lift = portrait ? 1.35 : 1;
  return { pos: s.C.clone().add(V(4, 19 * lift, 36 * lift)), tgt: s.C.clone().add(V(-12, 0, -34)), at: 0, ia: 0, ib: 0, t: 0 };
}
const centroid = stops.reduce((a, s) => a.add(s.C.clone().multiplyScalar(1 / stops.length)), V(0, 0, 0));
function endPose() {
  const lift = portrait ? 1.6 : 1;
  return {
    pos: centroid.clone().add(V(0, 600 * lift, 420 * lift)), tgt: centroid.clone().add(V(0, 0, 25)),
    at: routeLen[routeLen.length - 1], ia: stops.length - 1, ib: stops.length - 1, t: 0,
  };
}
function flight(a, b, t, hop) {
  const e = ease(t);
  const d = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
  const H = hop ? Math.min(130, Math.max(5, d * 0.3)) : 0;
  const up = Math.sin(Math.PI * e);
  const pos = lerpV(a.pos, b.pos, e); pos.y += H * up;
  const tgt = lerpV(a.tgt, b.tgt, e);
  if (hop && d > 0.01) {
    const dir = V(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z).normalize();
    tgt.addScaledVector(dir, H * 2.1 * up);
    tgt.y = Math.max(0, tgt.y - 0.86 * up);
  }
  return { pos, tgt, at: a.at + (b.at - a.at) * e, ia: a.ia, ib: b.ia, t: e };
}

/* ---- scroll timeline, measured from the real sections ---- */

let segs = [];
let maxY = 1;
function measure() {
  const vh = window.innerHeight;
  portrait = window.innerWidth / vh < 0.82;
  maxY = Math.max(1, document.documentElement.scrollHeight - vh);
  const capTop = portrait ? 0.62 : 0.66;
  const keys = [];
  sections.forEach(sec => {
    const cap = sec.querySelector('.caption');
    const a = sec.offsetTop - vh * capTop;
    const b = sec.offsetTop + sec.offsetHeight - vh * capTop - cap.offsetHeight;
    keys.push([a, Math.max(a + 1, b)]);
  });
  const endY = Math.min(maxY, endSec.offsetTop - vh * 0.3);
  segs = [];
  let prevY = 0, prevPose = openPose, hop = false;
  stops.forEach((stop, i) => {
    const [a, b] = keys[i];
    const from = prevPose, isHop = hop;
    segs.push({ y0: prevY, y1: a, f: t => flight(from(), stopPose(stop, 0), t, isHop) });
    segs.push({ y0: a, y1: b, f: t => stopPose(stop, t) });
    prevY = b; prevPose = () => stopPose(stop, 1); hop = true;
  });
  const last = prevPose;
  segs.push({ y0: prevY, y1: endY, f: t => flight(last(), endPose(), t, false) });
  stops.forEach((s, i) => { s.arriveY = keys[i][0]; });
  dirty = true;
}
function poseAt(y) {
  for (const s of segs) {
    if (y <= s.y1 || s === segs[segs.length - 1]) {
      const t = s.y1 > s.y0 ? Math.min(1, Math.max(0, (y - s.y0) / (s.y1 - s.y0))) : 1;
      return s.f(t);
    }
  }
  return openPose();
}

function travelTo(i) {
  window.scrollTo({ top: Math.ceil(stops[i].arriveY) + 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
}

/* ------------------------------------------------------------------ frame */

let dirty = true;
let smoothY = window.scrollY;
let last = 0;
const pointer = new THREE.Vector2(0, 0), drift = new THREE.Vector2(0, 0);
const camTgt = new THREE.Vector3();
const palNow = { sky: new THREE.Color(), hor: new THREE.Color(), gnd: new THREE.Color() };
let hazeHex = '';
let hovered = null;

function resize() {
  if (!renderer) return;
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  portrait = w / h < 0.82;
  camera.fov = portrait ? 52 : 40;
  // lens shift: the prints sit a little right of centre and above the words
  if (portrait) camera.setViewOffset(w, h, 0, h * 0.16, w, h);
  else camera.setViewOffset(w, h, -w * 0.06, h * 0.13, w, h);
  camera.updateProjectionMatrix();
  routeMat.resolution.set(w, h);
  aheadMat.resolution.set(w, h);
  measure();
}

function applyPalette(pose) {
  const a = stops[pose.ia].pal, b = stops[pose.ib].pal;
  const t = pose.t;
  palNow.sky.copy(a.sky).lerp(b.sky, t);
  palNow.hor.copy(a.hor).lerp(b.hor, t);
  palNow.gnd.copy(a.gnd).lerp(b.gnd, t);
  skyMat.uniforms.top.value.copy(palNow.sky);
  skyMat.uniforms.hor.value.copy(palNow.hor);
  fog.color.copy(palNow.hor);
  renderer.setClearColor(palNow.hor, 1);
  groundMat.color.copy(palNow.gnd);
  const hex = '#' + palNow.hor.getHexString(THREE.SRGBColorSpace);
  if (hex !== hazeHex) { hazeHex = hex; html.style.setProperty('--haze', hex); }
}

function frame(now) {
  requestAnimationFrame(frame);
  tick(now);
}
function tick(now) {
  const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
  last = now;
  const y = Math.min(maxY, Math.max(0, window.scrollY));
  const lambda = reduceMotion.matches ? Infinity : 4.6;
  const prevY = smoothY;
  smoothY = lambda === Infinity ? y : smoothY + (y - smoothY) * (1 - Math.exp(-lambda * dt));
  if (Math.abs(smoothY - y) < 0.05) smoothY = y;
  if (smoothY !== prevY) dirty = true;

  const allowDrift = !reduceMotion.matches && !coarse;
  const dx = allowDrift ? pointer.x - drift.x : -drift.x, dy = allowDrift ? pointer.y - drift.y : -drift.y;
  if (Math.abs(dx) + Math.abs(dy) > 0.0005) { drift.x += dx * (1 - Math.exp(-3 * dt)); drift.y += dy * (1 - Math.exp(-3 * dt)); dirty = true; }

  for (const stop of stops) for (const pr of stop.prints) {
    const to = reduceMotion.matches ? 0 : pr.liftTo;
    if (Math.abs(pr.lift - to) > 0.001) {
      pr.lift += (to - pr.lift) * (1 - Math.exp(-10 * dt));
      const nx = Math.sin(-pr.pg.rotation.y), nz = Math.cos(-pr.pg.rotation.y);
      pr.pg.position.set(pr.base.x - nx * pr.lift, 0, pr.base.z + nz * pr.lift);
      dirty = true;
    }
  }

  if (!dirty || !renderer) { pumpTextures(); return; }
  dirty = false;

  const pose = poseAt(smoothY);
  camera.position.copy(pose.pos);
  camTgt.copy(pose.tgt);
  const nearGround = Math.max(0, 1 - pose.pos.y / 6);
  camTgt.x += drift.x * 0.35 * nearGround;
  camTgt.y += drift.y * 0.14 * nearGround;
  camera.lookAt(camTgt);
  sky.position.copy(camera.position);

  const h = pose.pos.y;
  fog.near = 8 + h * 0.6;
  fog.far = 58 + h * 4.2;
  applyPalette(pose);
  showRoute(pose.at);

  for (const stop of stops) stop.group.visible = camera.position.distanceTo(stop.C) < fog.far + stop.R + 10;

  renderer.render(scene, camera);
  updateHovercap();
  pumpTextures();
  if (!html.classList.contains('ready') && groundMat.map) {
    requestAnimationFrame(() => html.classList.add('ready'));
  }
}

/* ------------------------------------------------------------------ pointing */

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const hovercap = document.getElementById('hovercap');
let downAt = null;

function pickAt(cx, cy) {
  ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const vis = photoMeshes.filter(m => m.parent.parent.visible && m.material.map);
  const hit = ray.intersectObjects(vis, false)[0];
  return hit && hit.distance < 40 ? hit.object : null;
}
function setHover(mesh) {
  if (mesh === hovered) return;
  if (hovered) stops[hovered.userData.stop].prints[hovered.userData.index].liftTo = 0;
  hovered = mesh;
  if (mesh) {
    const pr = stops[mesh.userData.stop].prints[mesh.userData.index];
    pr.liftTo = 0.14;
    hovercap.querySelector('.hc-place').textContent = pick(pr.p.place);
    hovercap.querySelector('.hc-where').textContent = pick(pr.p.where);
  }
  html.classList.toggle('has-hover', !!mesh);
  hovercap.classList.toggle('on', !!mesh);
  dirty = true;
}
const tmpV = new THREE.Vector3();
function updateHovercap() {
  if (!hovered) return;
  const pr = stops[hovered.userData.stop].prints[hovered.userData.index];
  tmpV.copy(pr.pg.position).setY(0.0);
  tmpV.project(camera);
  hovercap.style.left = `${(tmpV.x * 0.5 + 0.5) * window.innerWidth}px`;
  hovercap.style.top = `${(-tmpV.y * 0.5 + 0.5) * window.innerHeight + 10}px`;
}

if (renderer) {
  window.addEventListener('pointermove', e => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    if (e.pointerType === 'mouse' && !viewer.stop) setHover(pickAt(e.clientX, e.clientY));
  }, { passive: true });
  window.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; }, { passive: true });
  window.addEventListener('pointerup', e => {
    if (!downAt || viewer.stop || placesOpen()) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    downAt = null;
    if (moved > 8) return;
    if (e.target.closest('a, button, .bar')) return;
    const m = pickAt(e.clientX, e.clientY);
    if (m) openViewer(stops[m.userData.stop], m.userData.index, null);
  });
  window.addEventListener('scroll', () => { dirty = true; }, { passive: true });
}

/* ------------------------------------------------------------------ viewer */

const vEl = document.getElementById('viewer');
const vImg = document.getElementById('v-img');

function showViewer() {
  const p = viewer.stop.photos[viewer.index];
  vImg.src = `../images/web/${p.file}`;
  vImg.alt = pick(p.alt);
  document.getElementById('v-place').textContent = pick(p.place);
  document.getElementById('v-where').textContent = pick(p.where);
  document.getElementById('v-note').textContent = pick(p.note);
  document.getElementById('v-best').textContent = p.best ? `${tr('best')}: ${pick(p.best)}` : '';
  const made = [p.camera, p.lens, p.focal, p.aperture, p.shutter, p.iso && `ISO ${p.iso}`].filter(Boolean);
  document.getElementById('v-made').textContent = made.join(', ');
  const many = viewer.stop.photos.length > 1;
  document.getElementById('v-prev').hidden = !many;
  document.getElementById('v-next').hidden = !many;
}
// The print's rectangle on screen, from its photo plane's four corners.
function printRect(stop, index) {
  const pr = stop.prints[index];
  if (!pr || !stop.group.visible) return null;
  const g = pr.photo.geometry.parameters;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    tmpV.set(sx * g.width / 2, sy * g.height / 2, 0);
    pr.photo.localToWorld(tmpV);
    tmpV.project(camera);
    if (tmpV.z > 1) return null;
    const x = (tmpV.x * 0.5 + 0.5) * window.innerWidth, y = (-tmpV.y * 0.5 + 0.5) * window.innerHeight;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x1 < 0 || y1 < 0 || x0 > window.innerWidth || y0 > window.innerHeight) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
// Where the photograph actually sits inside the viewer's <img> (object-fit: contain).
function shownRect() {
  const r = vImg.getBoundingClientRect();
  const ar = (vImg.naturalWidth || 3) / (vImg.naturalHeight || 2);
  let w = r.width, h = r.width / ar;
  if (h > r.height) { h = r.height; w = h * ar; }
  const bottom = getComputedStyle(vImg).objectPosition.trim().endsWith('100%');
  return { x: r.left + (r.width - w) / 2, y: bottom ? r.bottom - h : r.top + (r.height - h) / 2, w, h };
}
// The print travels between the world and the viewer: one motion, so the eye never loses it.
function flyPrint(from, to, back) {
  const k = `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.w / to.w}, ${from.h / to.h})`;
  vImg.style.transformOrigin = `${to.x - vImg.getBoundingClientRect().left}px ${to.y - vImg.getBoundingClientRect().top}px`;
  return vImg.animate(back ? [{ transform: 'none' }, { transform: k }] : [{ transform: k }, { transform: 'none' }],
    { duration: back ? 520 : 760, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' });
}
async function openViewer(stop, index, from) {
  viewer.stop = stop; viewer.index = index; viewer.returnFocus = from || document.activeElement;
  const fromRect = !reduceMotion.matches && printRect(stop, index);
  setHover(null);
  showViewer();
  vEl.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('v-close').focus({ preventScroll: true });
  if (fromRect) {
    vImg.style.opacity = '0';
    // wait for the photograph (never longer than a moment), so the flight knows its shape
    if (!vImg.complete || !vImg.naturalWidth) {
      await new Promise(r => { vImg.addEventListener('load', r, { once: true }); vImg.addEventListener('error', r, { once: true }); setTimeout(r, 1200); });
    }
    vImg.style.opacity = '';
    flyPrint(fromRect, shownRect(), false);
  }
  requestAnimationFrame(() => vEl.classList.add('on'));
}
function closeViewer() {
  if (!viewer.stop) return;
  const toRect = !reduceMotion.matches && printRect(viewer.stop, viewer.index);
  viewer.stop = null;
  vEl.classList.remove('on');
  document.body.style.overflow = '';
  const done = () => { if (!viewer.stop) { vEl.hidden = true; vImg.getAnimations().forEach(a => a.cancel()); } };
  if (toRect) flyPrint(toRect, shownRect(), true).finished.then(done, done);
  else setTimeout(done, 300);
  if (viewer.returnFocus && viewer.returnFocus.focus) viewer.returnFocus.focus({ preventScroll: true });
}
function stepViewer(d) {
  const n = viewer.stop.photos.length;
  viewer.index = (viewer.index + d + n) % n;
  showViewer();
}
document.getElementById('v-close').addEventListener('click', closeViewer);
document.getElementById('v-prev').addEventListener('click', () => stepViewer(-1));
document.getElementById('v-next').addEventListener('click', () => stepViewer(1));
vEl.addEventListener('click', e => { if (e.target === vEl) closeViewer(); });

/* ------------------------------------------------------------------ places */

const plEl = document.getElementById('places');
const placesOpen = () => !plEl.hidden;
function openPlaces() {
  plEl.hidden = false;
  requestAnimationFrame(() => plEl.classList.add('on'));
  document.body.style.overflow = 'hidden';
  document.getElementById('places-close').focus({ preventScroll: true });
}
function closePlaces() {
  plEl.classList.remove('on');
  plEl.hidden = true;
  document.body.style.overflow = '';
  document.getElementById('places-open').focus({ preventScroll: true });
}
document.getElementById('places-open').addEventListener('click', openPlaces);
document.getElementById('places-close').addEventListener('click', closePlaces);

function trapFocus(root, e) {
  const f = [...root.querySelectorAll('button:not([hidden]), a[href]')].filter(el => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], lastEl = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
  else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
}
document.addEventListener('keydown', e => {
  if (viewer.stop) {
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowRight') stepViewer(1);
    else if (e.key === 'ArrowLeft') stepViewer(-1);
    else if (e.key === 'Tab') trapFocus(vEl, e);
  } else if (placesOpen()) {
    if (e.key === 'Escape') closePlaces();
    else if (e.key === 'Tab') trapFocus(plEl, e);
  }
});

/* ------------------------------------------------------------------ start */

// for checking in the browser: __d4.snap() draws the exact frame for the current scroll
window.__d4 = {
  camera, scene, renderer, stops, poseAt, printRect, shownRect, get smoothY() { return smoothY; },
  snap() { smoothY = window.scrollY; dirty = true; tick(performance.now()); return camera.position.toArray().map(v => +v.toFixed(2)); },
};

applyLang();
if (renderer) {
  resize();
  window.addEventListener('resize', resize);
  document.fonts && document.fonts.ready.then(() => { measure(); });
  window.addEventListener('load', measure);
  paintAtlas().then(() => { dirty = true; });
  requestAnimationFrame(frame);
} else {
  html.classList.add('ready');
}
