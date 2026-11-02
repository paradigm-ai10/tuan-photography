// Design 5, "Glass block". His photographs printed on thin panes of glass, stacked into one
// solid block on a dark floor. Two moments only: the first scroll turns the block so its depth
// shows, then panes slide out sideways one at a time, come up flat and large with the place
// name below, and go back. Native scroll drives it; every pose is a function of the scroll
// position, eased a little so the block never jumps.

import * as THREE from 'three';

const SITE = window.SITE;
const html = document.documentElement;
const STILL = html.classList.contains('still');
const NO_GL = html.classList.contains('no-gl');

/* ------------------------------------------------------------------ words */

const I = SITE.i18n;
const T = {
  en: {
    switch: '中文', skip: 'Skip to the portfolio', series: I.en.series,
    portfolio: 'Portfolio', guides: 'Guides', trips: 'Trips',
    name: 'Thomas Chen', line: 'Landscape photographs from the road, of nature and of cities.',
    pfLine: 'A few from the road. The portfolio holds every photograph, country by country.',
    pfLink: 'See the portfolio',
    gdLine: 'Where to stand, when the light is right, and how to get there.',
    gdLink: 'Read the guide',
    trLine: 'Every trip starts from Taiwan. The latest four:',
    trLink: 'All trips',
    follow: I.en.follow, prev: 'Previous', next: 'Next', close: I.en.close,
    best: I.en.best, open: p => `Open ${p}`, list: ', ',
  },
  zh: {
    switch: 'EN', skip: '跳到作品集', series: I.zh.series,
    portfolio: '作品集', guides: '攻略', trips: '旅程',
    name: '陳亮元', line: '旅途中的風景照片，自然與城市。',
    pfLine: '從旅途中挑出的幾張。作品集裡是全部的照片，依國家排好。',
    pfLink: '看作品集',
    gdLine: '站在哪裡、什麼時候光線最好、怎麼到那裡。',
    gdLink: '閱讀攻略',
    trLine: '每一趟都從台灣出發。最近的四趟：',
    trLink: '全部旅程',
    follow: I.zh.follow, prev: '上一張', next: '下一張', close: I.zh.close,
    best: I.zh.best, open: p => `打開「${p}」`, list: '、',
  },
};
let lang = html.dataset.lang === 'zh' ? 'zh' : 'en';
const tr = k => T[lang][k];
const pick = o => (o ? (o[lang] || o.en || '') : '');

/* ------------------------------------------------------------------ the photographs */

const slides = SITE.slides;
const countries = Object.fromEntries(SITE.countries.map(c => [c.id, c]));
const IMG = (file, size) => `../../images/web/${size ? size + '/' : ''}${file}`;

// front to back; the five that slide out sit at different depths
const STACK = [
  'matterhorn-lake', 'aoraki', 'fuji-lake', 'sapa-valley', 'calanque', 'roys-peak',
  'peak-night', 'tekapo-church', 'matterhorn-flag', 'aurora', 'neuschwanstein', 'otaru-canal',
  'kinkaku', 'marina-bay', 'tower-bridge', 'lower-manhattan-reflection', 'kiyomizu', 'bunkers',
  'dubai-above', 'taipei-night', 'fuji-shinkansen', 'marseille-port', 'lujiazui', 'golden-gate-fog',
  'supertrees', 'griffith-observatory', 'edge-night', 'sagrada-plaza', 'kifune', 'hoi-an-night',
  'chongqing-raffles', 'greenwich',
].filter(id => slides[id]);
const FEATURES = ['roys-peak', 'otaru-canal', 'bunkers', 'golden-gate-fog', 'hoi-an-night']
  .filter(id => STACK.includes(id));
const STRIP = ['tekapo-stars', 'aoraki', 'casa-batllo', 'fuji-lake', 'sapa-terraces', 'matterhorn-lake',
  'bund-night', 'calanque', 'tekapo-lupins', 'peak-night', 'leshan-buddha', 'aurora']
  .filter(id => slides[id]);

/* ------------------------------------------------------------------ language */

const langBtn = document.getElementById('lang');
function applyWords() {
  html.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  html.dataset.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = T[lang][el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v;
  });
  langBtn.textContent = tr('switch');
  langBtn.lang = lang === 'zh' ? 'en' : 'zh-Hant';
  document.title = lang === 'zh' ? '陳亮元 tuan photography' : 'tuan photography 陳亮元';
  renderSections();
  if (viewer.list) showViewer();
  if (caption.id) setCaption(caption.id, true);
}
langBtn.addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem('d5-lang', lang); } catch (e) { /* private window */ }
  applyWords();
});

/* ------------------------------------------------------------------ the sections below */

const strip = document.getElementById('strip');
const plates = document.getElementById('plates');
const tripList = document.getElementById('trip-list');
const guidePhoto = document.getElementById('guide-photo');

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function img(id, size, { alt, eager } = {}) {
  const s = slides[id];
  const a = alt === undefined ? pick(s.alt) : alt;
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<img src="${IMG(s.file, size)}" width="${s.w}" height="${s.h}" alt="${esc(a)}" ${load} decoding="async">`;
}

function renderSections() {
  strip.innerHTML = STRIP.map(id => `<li><button type="button" data-open="strip" data-id="${id}">
    ${img(id, 640)}<span class="s-place">${esc(pick(slides[id].place))}</span></button></li>`).join('');

  plates.innerHTML = FEATURES.map(id => `<li><button type="button" class="plate" data-open="plates" data-id="${id}">
    ${img(id, 1280)}<span class="plate-place">${esc(pick(slides[id].place))}</span>
    <span class="plate-where">${esc(pick(slides[id].where))}</span></button></li>`).join('');

  // the one guide that exists, with its cover
  const book = SITE.books.find(b => b.guide) || SITE.books[0];
  const g = SITE.guides[book.guide] || {};
  const cover = book.cover || g.lead;
  if (cover && slides[cover]) {
    guidePhoto.innerHTML = `<a href="../../posts/${book.guide}.html" tabindex="-1" aria-hidden="true">${img(cover, 1280)}</a>
      <figcaption>${esc(pick(slides[cover].place))}</figcaption>`;
  }
  document.getElementById('guide-title').textContent = pick(book.title);
  document.getElementById('guide-facts').textContent = pick(g.facts);
  document.getElementById('guide-link').href = `../../posts/${book.guide}.html`;

  // the latest trips that have photographs
  const trips = SITE.journeys.filter(j => j.countries.some(c => countries[c] && countries[c].photos.length)).slice(0, 4);
  tripList.innerHTML = trips.map(j => {
    const year = j.id.slice(0, 4);
    // one landscape print from each country in turn, from that year when the files say so
    const lists = j.countries.map(c => {
      const all = (countries[c] ? countries[c].photos : []).filter(id => slides[id] && slides[id].w > slides[id].h);
      const yr = all.filter(id => (slides[id].taken || '').startsWith(year));
      return yr.length ? yr : all;
    }).filter(l => l.length);
    const shots = [];
    for (let r = 0; shots.length < 3 && r < 6; r++) for (const l of lists) if (l[r] && shots.length < 3) shots.push(l[r]);
    const names = j.countries.map(c => (countries[c] ? pick(countries[c].name) : c)).join(tr('list'));
    return `<li class="trip"><p class="trip-date">${esc(pick(j.date))}</p>
      <p class="trip-where">${esc(names)}</p>
      <p class="trip-glimpse">${shots.map(id => `<button type="button" data-open="trip-${j.id}" data-list="${shots.join(' ')}" data-id="${id}" aria-label="${esc(tr('open')(pick(slides[id].place)))}">${img(id, 640, { alt: '' })}</button>`).join('')}</p></li>`;
  }).join('');
}

/* ------------------------------------------------------------------ the viewer */

const viewer = { list: null, i: 0, opener: null };
const vEl = document.getElementById('viewer');
const vImg = document.getElementById('v-img');
function made(s) {
  const kit = [s.camera, s.lens].filter(Boolean).join(', ');
  const exp = [s.focal, s.aperture, s.shutter, s.iso && `ISO ${s.iso}`].filter(Boolean).join('  ');
  return [kit, exp].filter(Boolean).join('. ');
}
function showViewer() {
  const s = slides[viewer.list[viewer.i]];
  vImg.src = IMG(s.file, 1280);
  vImg.srcset = `${IMG(s.file, 1280)} 1280w, ${IMG(s.file)} 2400w`;
  vImg.sizes = '92vw';
  vImg.alt = pick(s.alt);
  document.getElementById('v-place').textContent = pick(s.place);
  document.getElementById('v-where').textContent = pick(s.where);
  const note = pick(s.note);
  const best = pick(s.best);
  document.getElementById('v-note').textContent = [note, best && `${tr('best')}: ${best}`].filter(Boolean).join(' ');
  document.getElementById('v-made').textContent = made(s);
  const many = viewer.list.length > 1;
  document.getElementById('v-prev').hidden = !many;
  document.getElementById('v-next').hidden = !many;
}
function openViewer(list, id, opener) {
  viewer.list = list;
  viewer.i = Math.max(0, list.indexOf(id));
  viewer.opener = opener || document.activeElement;
  showViewer();
  vEl.hidden = false;
  html.classList.add('v-open');
  vEl.focus();
}
function closeViewer() {
  vEl.hidden = true;
  html.classList.remove('v-open');
  viewer.list = null;
  vImg.removeAttribute('src'); vImg.removeAttribute('srcset');
  if (viewer.opener && viewer.opener.focus) viewer.opener.focus({ preventScroll: true });
}
const step = d => { viewer.i = (viewer.i + d + viewer.list.length) % viewer.list.length; showViewer(); };
document.getElementById('v-prev').addEventListener('click', () => step(-1));
document.getElementById('v-next').addEventListener('click', () => step(1));
document.getElementById('v-close').addEventListener('click', closeViewer);
vEl.addEventListener('click', e => { if (e.target === vEl) closeViewer(); });
document.addEventListener('keydown', e => {
  if (vEl.hidden) return;
  if (e.key === 'Escape') closeViewer();
  else if (e.key === 'ArrowLeft' && viewer.list.length > 1) step(-1);
  else if (e.key === 'ArrowRight' && viewer.list.length > 1) step(1);
  else if (e.key === 'Tab') {   // keep focus inside the dialog
    const f = [...vEl.querySelectorAll('button')].filter(b => !b.hidden);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === vEl)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-open]');
  if (!b) return;
  const kind = b.dataset.open;
  const list = kind === 'strip' ? STRIP : kind === 'plates' ? FEATURES : (b.dataset.list || b.dataset.id).split(' ');
  openViewer(list, b.dataset.id, b);
});

/* ------------------------------------------------------------------ the caption under a pane */

const capEl = document.getElementById('cap');
const caption = { id: null };
function setCaption(id, force) {
  if (caption.id === id && !force) return;
  caption.id = id;
  if (!id) return;
  capEl.querySelector('.cap-place').textContent = pick(slides[id].place);
  capEl.querySelector('.cap-where').textContent = pick(slides[id].where);
}

renderSections();
applyWords();

/* ------------------------------------------------------------------ no WebGL: the front photograph */

if (NO_GL) {
  const lead = document.getElementById('lead');
  const id = STACK[0];
  lead.innerHTML = `<button type="button" data-open="plates-lead" data-list="${STACK.join(' ')}" data-id="${id}">${img(id, 1280, { eager: true })}</button>
    <figcaption><span class="cap-place">${esc(pick(slides[id].place))}</span><span class="cap-where">${esc(pick(slides[id].where))}</span></figcaption>`;
  lead.hidden = false;
} else {
  startGlass();
}

/* ================================================================== the glass block */

function startGlass() {
  const canvas = document.getElementById('glass');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    html.classList.add('no-gl', 'still');
    return;
  }
  const BG = new THREE.Color('#121110');
  renderer.setClearColor(BG, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

  /* ---- sizes (scene units: a pane is 1.5 by 1) ---- */
  const N = STACK.length;
  const W = 1.5, H = 1.0, TH = 0.016, STEP = 0.032;
  const BORDER = 0.007;                       // the clear glass round each print, as a share of the width
  const innerA = (W * (1 - 2 * BORDER)) / (H - 2 * BORDER * W);

  /* ---- shared uniforms ---- */
  const G = {
    uFade: { value: STILL ? 1 : 0 },
    uBg: { value: BG.clone() },
    uGlass: { value: new THREE.Color('#3f6359') },
    uGlassDeep: { value: new THREE.Color('#0f1a17') },
    uGlassHi: { value: new THREE.Color('#c9e2d8') },
    uEmpty: { value: new THREE.Color('#1f2422') },
    uKey: { value: new THREE.Vector3(-0.45, 0.75, 0.55).normalize() },
  };

  const paneVert = /* glsl */`
    varying vec2 vUv; varying vec3 vN; varying vec3 vWN; varying vec3 vWP;
    void main() {
      vUv = uv; vN = normal;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWP = wp.xyz;
      vWN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;
  const paneFrag = /* glsl */`
    uniform sampler2D uMap; uniform float uHas; uniform vec2 uCrop; uniform float uShade; uniform float uRefl;
    uniform float uFade; uniform vec3 uBg; uniform vec3 uGlass; uniform vec3 uGlassDeep; uniform vec3 uGlassHi; uniform vec3 uEmpty;
    uniform vec3 uKey;
    varying vec2 vUv; varying vec3 vN; varying vec3 vWN; varying vec3 vWP;
    void main() {
      #ifdef MIRROR
        if (vWP.y > 0.0) discard;
      #endif
      vec3 V = normalize(cameraPosition - vWP);
      vec3 Nw = normalize(vWN);
      if (dot(Nw, V) < 0.0) Nw = -Nw;
      float facing = clamp(dot(Nw, V), 0.0, 1.0);
      float fres = pow(1.0 - facing, 3.0);
      float diff = max(dot(Nw, uKey), 0.0);
      vec3 col;
      if (abs(vN.z) > 0.5) {
        // the face: the print, a clear rim of glass, a polished edge, a soft studio reflection
        vec2 uv = vUv;
        vec2 bb = vec2(${BORDER.toFixed(4)}, ${(BORDER * W / H).toFixed(4)});
        vec2 inner = (uv - bb) / (1.0 - 2.0 * bb);
        float inPhoto = step(0.0, inner.x) * step(inner.x, 1.0) * step(0.0, inner.y) * step(inner.y, 1.0);
        vec2 puv = (inner - 0.5) * uCrop + 0.5;
        vec3 photo = mix(uEmpty, texture2D(uMap, puv).rgb, uHas);
        vec3 glass = uGlass * 0.6 + uGlassHi * 0.05;
        col = mix(glass, photo, inPhoto);
        col *= mix(0.8, 1.0, diff) * uShade;
        vec2 d2 = min(uv, 1.0 - uv);
        float rim = 1.0 - smoothstep(0.0, 0.0045, min(d2.x, d2.y * ${(H / W).toFixed(4)} * 1.0));
        col += uGlassHi * rim * 0.28 * (0.5 + 0.5 * uShade);
        vec3 R = reflect(-V, Nw);
        float soft = smoothstep(0.35, 0.9, R.y) * 0.035 + fres * 0.22;
        col += uGlassHi * soft;
      } else {
        // the edge of the glass: deep green inside, a bright line where it catches the light
        float along = abs(vN.x) > 0.5 ? vUv.x : vUv.y;
        vec3 body = mix(uGlassDeep, uGlass, 0.25 + 0.45 * diff);
        body *= 0.82 + 0.3 * smoothstep(0.0, 1.0, along);
        vec3 Lr = reflect(-uKey, Nw);
        float spec = pow(max(dot(Lr, V), 0.0), 24.0);
        col = body * mix(0.6, 1.0, uShade) * (abs(vN.y) > 0.5 ? 0.72 : 1.0) + uGlassHi * (spec * 0.4 + fres * 0.12);
        // the tops are 32 edges thinner than a pixel: one calm even tone, or they shimmer
        if (abs(vN.y) > 0.5) col = mix(uGlassDeep, uGlass, 0.5) * 0.7 * mix(0.6, 1.0, uShade);
      }
      float a = 1.0;
      #ifdef MIRROR
        float h = -vWP.y;
        a = (1.0 - smoothstep(0.0, 0.5, h)) * 0.2 * uFade * uRefl;
        col *= 0.7;
      #else
        col = mix(uBg, col, uFade);
      #endif
      gl_FragColor = vec4(col, a);
      #include <colorspace_fragment>
    }`;

  const paneGeo = new THREE.BoxGeometry(W, H, TH);
  const block = new THREE.Group();
  block.position.y = H / 2 + 0.002;
  scene.add(block);

  const REFLECT = new THREE.Matrix4().makeScale(1, -1, 1);
  const panes = STACK.map((id, i) => {
    const u = {
      ...G,
      uMap: { value: null }, uHas: { value: 0 }, uCrop: { value: new THREE.Vector2(1, 1) },
      uShade: { value: 1 }, uRefl: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: paneVert, fragmentShader: paneFrag });
    const mMat = new THREE.ShaderMaterial({
      uniforms: u, vertexShader: paneVert, fragmentShader: paneFrag,
      defines: { MIRROR: 1 }, transparent: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(paneGeo, mat);
    mesh.userData.id = id;
    block.add(mesh);
    const mirror = new THREE.Mesh(paneGeo, mMat);
    mirror.matrixAutoUpdate = false;
    mirror.renderOrder = 1;
    scene.add(mirror);
    const base = 1 - 0.32 * Math.pow(i / Math.max(1, N - 1), 0.8);
    return { id, i, s: slides[id], u, mesh, mirror, base, state: 0, feature: FEATURES.indexOf(id) };
  });
  const meshes = panes.map(p => p.mesh);

  /* ---- the floor: the page's own colour, a pool of light, a soft contact shadow ---- */
  const floorU = {
    uBg: G.uBg, uPool: { value: new THREE.Color('#201e1b') },
    uYaw: { value: 0 }, uHalf: { value: new THREE.Vector2(W / 2, 0.5) },
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShaderMaterial({
      uniforms: floorU,
      vertexShader: /* glsl */`varying vec3 vWP; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uBg; uniform vec3 uPool; uniform float uYaw; uniform vec2 uHalf;
        varying vec3 vWP;
        void main() {
          float r = length(vWP.xz * vec2(0.8, 1.0));
          float pool = 1.0 - smoothstep(0.3, 3.4, r);
          vec3 col = mix(uBg, uPool, pool);
          float c = cos(uYaw), s = sin(uYaw);
          vec2 p = vec2(c * vWP.x - s * vWP.z, s * vWP.x + c * vWP.z);
          vec2 q = abs(p) - uHalf;
          float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
          col *= 1.0 - 0.6 * (1.0 - smoothstep(-0.04, 0.3, d)) * pool;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      depthWrite: false,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;
  scene.add(floor);

  /* ---- textures: front panes first, a few at a time ---- */
  const loader = new THREE.TextureLoader();
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  let inflight = 0, next = 0, dirty = true, fadeStart = 0;
  function setTex(p, tex) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    const a = tex.image.width / tex.image.height;
    p.u.uCrop.value.set(a > innerA ? innerA / a : 1, a > innerA ? 1 : a / innerA);
    const old = p.u.uMap.value;
    p.u.uMap.value = tex;
    p.u.uHas.value = 1;
    if (old) old.dispose();
    dirty = true;
  }
  function pump() {
    while (inflight < 4 && next < panes.length) {
      const p = panes[next++];
      if (p.state) continue;
      inflight++;
      p.state = 1;
      loader.load(IMG(p.s.file, 640), tex => {
        inflight--;
        if (p.state < 3) { setTex(p, tex); p.state = 2; } else tex.dispose();
        if (p.i === 0 && !fadeStart) fadeStart = performance.now();
        pump();
      }, undefined, () => { inflight--; pump(); });
    }
  }
  function sharpen(p) {     // the pane that comes up large gets the 1280 print
    if (p.state >= 3) return;
    p.state = 3;
    loader.load(IMG(p.s.file, 1280), tex => setTex(p, tex));
  }
  pump();
  setTimeout(() => { if (!fadeStart) fadeStart = performance.now(); }, 1600);

  /* ---- layout ---- */
  let vw = 1, vh = 1, phone = false;
  function resize() {
    vw = canvas.clientWidth || innerWidth;
    vh = canvas.clientHeight || innerHeight;
    phone = vw / vh < 0.85 || vw < 640;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  addEventListener('resize', resize);
  resize();

  /* ---- scroll: the stage in screens ---- */
  const stage = document.getElementById('stage');
  const intro = document.getElementById('intro');
  const TURN = 0.9, FEAT = 0.56, TOTAL = 4.0;    // in screens of scroll
  const FEAT0 = TURN;
  function target() {
    if (STILL) return TURN;
    const r = stage.getBoundingClientRect();
    const run = r.height - innerHeight;
    return run > 0 ? Math.min(1, Math.max(0, -r.top / run)) * TOTAL : 0;
  }
  let shown = target();

  const clamp01 = x => Math.min(1, Math.max(0, x));
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---- one frame from one scroll position ---- */
  const tmpV = new THREE.Vector3(), camQ = new THREE.Quaternion(), invQ = new THREE.Quaternion();
  const restQ = new THREE.Quaternion(), bigQ = new THREE.Quaternion();
  const restP = new THREE.Vector3(), slidP = new THREE.Vector3(), bigP = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  let active = null, bigAmt = 0, capAmt = 0;

  function pose(s) {
    const turn = easeIO(clamp01(s / TURN));
    const spread = 1 + 0.7 * turn;              // the block opens a little as it turns
    const step = STEP * spread;
    const depth = (N - 1) * step + TH;

    // the block turns; the camera rises a little to see the top edges
    block.rotation.y = -0.12 - 0.62 * turn;
    floorU.uYaw.value = block.rotation.y;
    floorU.uHalf.value.set(W / 2, depth / 2);

    const fov = camera.fov * Math.PI / 180;
    const th = Math.tan(fov / 2);
    const yaw = Math.abs(block.rotation.y);
    const visW = W * Math.cos(yaw) + depth * Math.sin(yaw);   // how wide the block looks from here
    const frac = phone ? 0.8 : 0.36;
    const dist = Math.max(visW / (frac * 2 * th * camera.aspect), 1.15 / ((phone ? 0.5 : 0.56) * 2 * th));
    const elev = 0.1 + 0.2 * turn;
    const off = 0.34 - 0.2 * smooth(TURN * 0.8, TURN + 0.3, s);   // the block drifts toward the middle once the name has gone
    lookAt.set(phone ? 0 : -dist * th * camera.aspect * off, phone ? 0.5 - dist * th * 0.2 : 0.5, 0);
    camera.position.set(lookAt.x, lookAt.y + Math.sin(elev) * dist, lookAt.z + Math.cos(elev) * dist);
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
    block.updateMatrixWorld(true);

    // which pane is out, and how far
    const f = (s - FEAT0) / FEAT;
    const k = Math.floor(f);
    const t = f - k;
    const id = !STILL && k >= 0 && k < FEATURES.length ? FEATURES[k] : null;
    let slide = 0, big = 0;
    if (id) {
      if (t < 0.5) { slide = smooth(0.0, 0.26, t); big = easeIO(clamp01((t - 0.26) / 0.24)); }
      else { big = 1 - easeIO(clamp01((t - 0.68) / 0.16)); slide = 1 - smooth(0.84, 1.0, t); }
    }
    active = id ? panes.find(p => p.id === id) : null;
    bigAmt = big;
    capAmt = id ? smooth(0.44, 0.52, t) * (1 - smooth(0.66, 0.72, t)) : 0;

    // where "large and flat" is, in the block's own space
    if (active && big > 0) {
      const halfH = th, halfW = th * camera.aspect;
      const fw = phone ? 0.88 : 0.5, fh = phone ? 0.42 : 0.6;
      const d = Math.max(W / (2 * halfW * fw), H / (2 * halfH * fh));
      const ndcY = phone ? 0.12 : 0.1;
      camera.getWorldDirection(tmpV);
      bigP.copy(camera.position).addScaledVector(tmpV, d);
      tmpV.set(0, 1, 0).applyQuaternion(camera.quaternion);
      bigP.addScaledVector(tmpV, ndcY * halfH * d);
      block.worldToLocal(bigP);
      block.getWorldQuaternion(invQ).invert();
      camQ.copy(camera.quaternion);
      bigQ.copy(invQ).multiply(camQ);
    }

    for (const p of panes) {
      const z = (N - 1) * step / 2 - p.i * step;
      restP.set(0, 0, z);
      let shade = p.base;
      if (p === active) {
        slidP.copy(restP).setX(W + 0.22);
        restP.lerp(slidP, slide);
        if (big > 0) { restP.lerp(bigP, big); sharpen(p); }
        restQ.identity().slerp(bigQ, big);
        p.mesh.quaternion.copy(restQ);
        shade = p.base + (1 - p.base) * slide;
      } else {
        p.mesh.quaternion.identity();
        shade *= 1 - 0.5 * bigAmt;
      }
      p.mesh.position.copy(restP);
      p.u.uShade.value = shade;
      p.u.uRefl.value = p === active ? 1 - big : 1;
    }
    block.updateMatrixWorld(true);
    for (const p of panes) p.mirror.matrix.multiplyMatrices(REFLECT, p.mesh.matrixWorld);

    // the words over the stage
    intro.style.opacity = STILL ? 1 : String(1 - smooth(0.04, 0.4, s));
    if (active && capAmt > 0.001) {
      setCaption(active.id);
      tmpV.set(0, -H / 2, 0);
      active.mesh.localToWorld(tmpV).project(camera);
      const x = (tmpV.x * 0.5 + 0.5) * vw, y = (-tmpV.y * 0.5 + 0.5) * vh;
      const cw = capEl.offsetWidth;
      capEl.style.transform = `translate(${Math.round(x - cw / 2)}px, ${Math.round(y + (phone ? 14 : 20))}px)`;
      capEl.style.opacity = String(capAmt);
    } else {
      capEl.style.opacity = '0';
    }
  }

  /* ---- pointer: a pane under the pointer opens large ---- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  function hit(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (active && bigAmt > 0.5) {
      const h = ray.intersectObject(active.mesh, false)[0];
      return h ? active : null;
    }
    const h = ray.intersectObjects(meshes, false)[0];
    return h ? panes.find(p => p.mesh === h.object) : null;
  }
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    canvas.classList.toggle('is-over', !!hit(e));
  });
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { down = null; return; }
    down = null;
    const p = hit(e);
    if (p) openViewer(STACK, p.id, null);
  });

  /* ---- the loop: draw only when something changed, and only while the stage is on screen ---- */
  let onScreen = true;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (onScreen) dirty = true; }).observe(stage);
  addEventListener('scroll', () => { dirty = true; }, { passive: true });

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!onScreen) return;
    if (!STILL) {
      const goal = target();
      const diff = goal - shown;
      if (Math.abs(diff) > 0.0004) { shown += diff * (1 - Math.exp(-dt * 5.5)); dirty = true; }
      else if (diff !== 0) { shown = goal; dirty = true; }
      if (fadeStart && G.uFade.value < 1) {
        G.uFade.value = clamp01((now - fadeStart) / 1100);
        G.uFade.value = G.uFade.value * G.uFade.value * (3 - 2 * G.uFade.value);
        dirty = true;
      }
    }
    if (!dirty) return;
    dirty = false;
    pose(STILL ? TURN : shown);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
