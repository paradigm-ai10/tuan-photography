// Glass block, the Portfolio page (design 5). Every photograph, by country: one small glass block
// per country stands in a row on the dark floor, its photographs printed on the panes, the latest
// trip on the left. Choosing a block (click, tap or keyboard) lifts its panes out one by one and
// fans them in front of it, large; choosing a pane opens the viewer with that country's photographs.
//
// One interaction, nothing else moves. The blocks, the fan and the floor are drawn with the home
// page's glass (one shader for every pane, one shared box, a mirrored copy for the reflection); the
// names under the blocks and the panes of the open fan are real buttons laid over the canvas, so the
// keyboard and screen readers use the same page. Without WebGL the same list shows each country's
// photographs as a plain grid.
//
// Cheap: prints load at 640 px, the front pane of each block first, then the fan's; only the open
// fan gets 1280; a fan that closes gives its prints back. It draws only when something changed.

import * as THREE from 'three';
import { Kit, esc } from '../kit/kit.js';

const SITE = window.SITE;
const html = document.documentElement;
const STILL = html.classList.contains('still');
let mode = html.classList.contains('no-gl') ? 'plain' : 'glass';
const slides = SITE.slides;

/* ------------------------------------------------------------------ the countries, latest trip first */

const byId = Object.fromEntries(SITE.countries.map(c => [c.id, c]));
const has = id => byId[id] && byId[id].photos.some(p => slides[p]);
const order = [];
for (const j of SITE.journeys) for (const c of j.countries) if (!order.includes(c) && has(c)) order.push(c);
for (const c of SITE.countries) if (!order.includes(c.id) && has(c.id)) order.push(c.id);   // home base, no trip
const wide = id => slides[id].w >= slides[id].h;
const COUNTRIES = order.map(id => {
  const c = byId[id];
  const photos = c.photos.filter(p => slides[p]);
  const front = photos.find(wide) || photos[0];
  return { id, c, photos, stack: [front, ...photos.filter(p => p !== front)] };
});

/* ------------------------------------------------------------------ words */

const words = {
  en: {
    skip: 'Skip to the countries',
    line: 'Every photograph, country by country. The latest trip comes first.',
  },
  zh: {
    skip: '跳到國家列表',
    line: '每一張照片，依國家排列，最近的一趟在最前面。',
  },
};
const count = (n, lang) => (lang === 'zh' ? `${n} 張照片` : `${n} photograph${n === 1 ? '' : 's'}`);

/* ------------------------------------------------------------------ the list (both pages) */

const list = document.getElementById('countries');
const cap = document.getElementById('fan-cap');
let built = false;
let glass = null;          // the 3D side, once it runs: { words(), hover() }

function buildGlassList() {
  list.className = 'countries glassy';
  list.innerHTML = COUNTRIES.map(k => `<li class="c" data-c="${k.id}">
    <button type="button" class="c-block" id="cb-${k.id}" aria-expanded="false" aria-controls="sh-${k.id}">
      <span class="c-name"></span><span class="vh c-count"></span></button>
    <div class="shots" id="sh-${k.id}" role="group" aria-labelledby="cb-${k.id}" hidden>${
      k.photos.map(p => `<button type="button" class="shot" data-open="${p}" data-list="${k.photos.join(' ')}" data-p="${p}"></button>`).join('')
    }</div></li>`).join('');
  built = true;
}

function renderGlass(k) {
  if (!built) buildGlassList();
  for (const c of COUNTRIES) {
    const li = list.querySelector(`[data-c="${c.id}"]`);
    li.querySelector('.c-name').textContent = k.pick(c.c.name);
    li.querySelector('.c-count').textContent = `, ${count(c.photos.length, k.lang)}`;
    li.querySelectorAll('.shot').forEach(b => { b.setAttribute('aria-label', k.pick(slides[b.dataset.p].place)); });
  }
  if (glass) glass.words();
}

function renderPlain(k) {
  built = false;
  list.className = 'countries plain';
  list.innerHTML = COUNTRIES.map(c => `<li class="p-country">
    <h2 class="p-name">${esc(k.pick(c.c.name))}</h2>
    <p class="p-line"><span class="when">${esc(k.pick(c.c.date))}</span>${esc(k.pick(c.c.note))}</p>
    <ul class="grid">${c.photos.map(p => {
      const s = slides[p];
      return `<li style="--ar:${(s.w / s.h).toFixed(3)}"><button type="button" data-open="${p}" data-list="${c.photos.join(' ')}">
        <img src="${k.img(s.file, 640)}" width="${s.w}" height="${s.h}" alt="${esc(k.pick(s.alt))}" loading="lazy" decoding="async"></button>
        <p class="g-place">${esc(k.pick(s.place))}</p></li>`;
    }).join('')}</ul></li>`).join('');
}

const kit = Kit({
  here: 'portfolio',
  words,
  render(k) {
    document.title = k.lang === 'zh' ? '作品集：陳亮元 tuan photography' : 'Portfolio: tuan photography 陳亮元';
    if (mode === 'glass') renderGlass(k); else renderPlain(k);
  },
});
// the kit puts the top bar first; the skip link belongs before it
document.body.prepend(document.querySelector('.skip'));

function toPlain() {
  mode = 'plain';
  html.classList.add('no-gl');
  glass = null;
  renderPlain(kit);
}

if (mode === 'glass') startGlass(); else renderPlain(kit);

/* ================================================================== the glass */

function startGlass() {
  const room = document.getElementById('room');
  const canvas = document.getElementById('glass');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    toPlain();
    return;
  }
  const BG = new THREE.Color('#121110');
  renderer.setClearColor(BG, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  const th = Math.tan((camera.fov * Math.PI) / 360);

  /* ---- sizes, in scene units: a pane is 1.5 by 1, like the home page's ---- */
  const NB = COUNTRIES.length;
  const W = 1.5, H = 1.0, TH = 0.016, STEP = 0.036;
  const SLOT = 1.9;                       // from one block to the next
  const YAW = -0.42;                      // every block turned the same way, so its depth shows
  const BORDER = 0.007;                   // clear glass round each print, as a share of the width
  const innerA = (W * (1 - 2 * BORDER)) / (H - 2 * BORDER * W);
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
  const qUp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);

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

  // the home page's pane (glass.js), with the print fitted whole inside the clear rim: a portrait
  // photograph is printed sideways on the pane and stands up when the pane comes out
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
    uniform sampler2D uMap; uniform float uHas; uniform vec2 uFit; uniform float uSide; uniform float uShade; uniform float uRefl;
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
        vec2 uv = vUv;
        vec2 bb = vec2(${BORDER.toFixed(4)}, ${((BORDER * W) / H).toFixed(4)});
        vec2 inner = (uv - bb) / (1.0 - 2.0 * bb);
        vec2 r = mix(inner, vec2(1.0 - inner.y, inner.x), uSide);
        vec2 puv = (r - 0.5) / uFit + 0.5;
        float inPhoto = step(0.0, puv.x) * step(puv.x, 1.0) * step(0.0, puv.y) * step(puv.y, 1.0);
        vec3 photo = mix(uEmpty, texture2D(uMap, clamp(puv, 0.0, 1.0)).rgb, uHas);
        vec3 glass = uGlass * 0.6 + uGlassHi * 0.05;
        col = mix(glass * 0.55, photo, inPhoto);
        col *= mix(0.8, 1.0, diff) * uShade;
        vec2 d2 = min(uv, 1.0 - uv);
        float rim = 1.0 - smoothstep(0.0, 0.0045, min(d2.x, d2.y * ${(H / W).toFixed(4)}));
        col += uGlassHi * rim * 0.28 * (0.5 + 0.5 * uShade);
        vec3 R = reflect(-V, Nw);
        col += uGlassHi * (smoothstep(0.35, 0.9, R.y) * 0.035 + fres * 0.22);
      } else {
        float along = abs(vN.x) > 0.5 ? vUv.x : vUv.y;
        vec3 body = mix(uGlassDeep, uGlass, 0.25 + 0.45 * diff);
        body *= 0.82 + 0.3 * smoothstep(0.0, 1.0, along);
        vec3 Lr = reflect(-uKey, Nw);
        float spec = pow(max(dot(Lr, V), 0.0), 24.0);
        col = body * mix(0.6, 1.0, uShade) * (abs(vN.y) > 0.5 ? 0.72 : 1.0) + uGlassHi * (spec * 0.4 + fres * 0.12);
        // the tops are many edges thinner than a pixel: one calm tone, or they shimmer
        if (abs(vN.y) > 0.5) col = mix(uGlassDeep, uGlass, 0.5) * 0.7 * mix(0.6, 1.0, uShade);
      }
      float a = 1.0;
      #ifdef MIRROR
        a = (1.0 - smoothstep(0.0, 0.45, -vWP.y)) * 0.2 * uFade * uRefl;
        col *= 0.7;
      #else
        col = mix(uBg, col, uFade);
      #endif
      gl_FragColor = vec4(col, a);
      #include <colorspace_fragment>
    }`;

  const paneGeo = new THREE.BoxGeometry(W, H, TH);
  const REFLECT = new THREE.Matrix4().makeScale(1, -1, 1);

  /* ---- the blocks and their panes ---- */
  const blocks = COUNTRIES.map((k, ci) => {
    const n = k.stack.length;
    const upright = !wide(k.stack[0]);          // only portrait photographs: the block stands on its end
    const b = {
      k, ci, n, upright, x: (ci - (NB - 1) / 2) * SLOT,
      f: 0, rise: 0, fan: null, panes: [], li: null, btn: null, shots: null,
    };
    k.stack.forEach((id, si) => {
      const s = slides[id];
      const side = s.w < s.h ? 1 : 0;
      const a = s.w / s.h;
      const A = side ? 1 / innerA : innerA;       // the print's frame, in the photograph's own turn
      const u = {
        ...G,
        uMap: { value: null }, uHas: { value: 0 }, uSide: { value: side },
        uFit: { value: new THREE.Vector2(a > A ? 1 : a / A, a > A ? A / a : 1) },
        uShade: { value: 1 }, uRefl: { value: 1 },
      };
      const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: paneVert, fragmentShader: paneFrag });
      const mMat = new THREE.ShaderMaterial({
        uniforms: u, vertexShader: paneVert, fragmentShader: paneFrag,
        defines: { MIRROR: 1 }, transparent: true, depthWrite: false,
      });
      const mesh = new THREE.Mesh(paneGeo, mat);
      mesh.matrixAutoUpdate = false;
      scene.add(mesh);
      const mirror = new THREE.Mesh(paneGeo, mMat);
      mirror.matrixAutoUpdate = false;
      mirror.renderOrder = 1;
      scene.add(mirror);
      b.panes.push({
        id, s, b, si, fi: k.photos.indexOf(id), side, u, mesh, mirror,
        base: 1 - 0.3 * Math.pow(si / Math.max(1, n - 1), 0.8),
        size: 0, want: 0, gen: 0, hasAt: 0, hl: 0,
      });
    });
    return b;
  });
  const allPanes = blocks.flatMap(b => b.panes);

  /* ---- the floor: the page's colour, a long pool of light under the row, a soft shadow under each block ---- */
  const MAXB = 16;
  const rects = Array.from({ length: MAXB }, () => new THREE.Vector4(0, 0, 0, 0));
  blocks.forEach((b, i) => {
    if (i >= MAXB) return;
    const depth = (b.n - 1) * STEP + TH;
    rects[i].set(b.x, 0, (b.upright ? H : W) / 2, depth / 2);
  });
  const floorU = {
    uBg: G.uBg, uPool: { value: new THREE.Color('#1f1d1a') }, uSpotC: { value: new THREE.Color('#2a2723') },
    uRects: { value: rects }, uCount: { value: Math.min(MAXB, NB) }, uYaw: { value: YAW },
    uRow: { value: new THREE.Vector2(((NB - 1) / 2) * SLOT + 3, 3.2) },
    uSpot: { value: 0 }, uSpotAmt: { value: 0 },
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.ShaderMaterial({
      uniforms: floorU,
      vertexShader: /* glsl */`varying vec3 vWP; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */`
        uniform vec3 uBg; uniform vec3 uPool; uniform vec3 uSpotC; uniform vec4 uRects[${MAXB}]; uniform int uCount;
        uniform float uYaw; uniform vec2 uRow; uniform float uSpot; uniform float uSpotAmt;
        varying vec3 vWP;
        void main() {
          vec2 e = vWP.xz / uRow;
          float pool = 1.0 - smoothstep(0.25, 1.0, length(e));
          vec3 col = mix(uBg, uPool, pool);
          vec2 sp = vec2(vWP.x - uSpot, vWP.z) / vec2(2.6, 2.2);
          col = mix(col, uSpotC, exp(-dot(sp, sp) * 1.6) * uSpotAmt);
          float c = cos(uYaw), s = sin(uYaw);
          float shade = 0.0;
          for (int i = 0; i < ${MAXB}; i++) {
            if (i >= uCount) break;
            vec4 r = uRects[i];
            if (r.z <= 0.0) continue;
            vec2 d = vWP.xz - r.xy;
            vec2 p = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
            vec2 q = abs(p) - r.zw;
            float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
            shade = max(shade, 1.0 - smoothstep(-0.04, 0.32, dist));
          }
          col *= 1.0 - 0.55 * shade * max(pool, 0.3);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
      depthWrite: false,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;
  scene.add(floor);

  /* ---- the DOM laid over it ---- */
  for (const b of blocks) {
    b.li = list.querySelector(`[data-c="${b.k.id}"]`);
    b.btn = b.li.querySelector('.c-block');
    b.shotWrap = b.li.querySelector('.shots');
    b.shots = new Map([...b.li.querySelectorAll('.shot')].map(el => [el.dataset.p, el]));
  }
  const capName = cap.querySelector('.fan-name');
  const capLine = cap.querySelector('.fan-line');

  /* ---- prints: 640 px, the front of each block first, nearest first; 1280 only for the open fan ---- */
  const loader = new THREE.TextureLoader();
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  let inflight = 0, dirty = true, fadeStart = 0;
  const queue = [];
  function setTex(p, tex, size) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    const old = p.u.uMap.value;
    p.u.uMap.value = tex;
    if (!old) p.hasAt = performance.now();         // a first print fades in; a sharper one just replaces it
    p.size = size;
    if (old) old.dispose();
    wake();
  }
  function need(p, size, first) {
    if (p.size >= size || p.want >= size) return;
    p.want = size;
    const job = { p, size, gen: p.gen };
    if (first) queue.unshift(job); else queue.push(job);
  }
  function pump() {
    while (inflight < 4 && queue.length) {
      const job = queue.shift();
      const { p, size, gen } = job;
      if (gen !== p.gen || p.size >= size) continue;
      inflight++;
      loader.load(kit.img(p.s.file, size), tex => {
        inflight--;
        if (gen === p.gen && size > p.size) setTex(p, tex, size); else tex.dispose();
        if (!fadeStart) fadeStart = performance.now();
        pump();
      }, undefined, () => { inflight--; if (p.want === size) p.want = p.size; pump(); });
    }
  }
  function release(b) {     // a fan that has closed gives its prints back (the front one stays)
    for (const p of b.panes) {
      if (p.si === 0) continue;
      p.gen++;
      p.want = 0;
      if (p.u.uMap.value) { p.u.uMap.value.dispose(); p.u.uMap.value = null; }
      p.u.uHas.value = 0; p.size = 0; p.hasAt = 0;
    }
  }
  function loadFronts(from) {
    const near = blocks.slice().sort((a, b) => Math.abs(a.ci - from) - Math.abs(b.ci - from));
    for (const b of near) need(b.panes[0], 640);
    pump();
  }
  function loadFan(b, first) {
    for (const p of b.panes.slice().sort((x, y) => x.fi - y.fi)) need(p, 640, false);
    if (first) {   // to the front of the line, in reading order
      const mine = queue.filter(j => j.p.b === b);
      const rest = queue.filter(j => j.p.b !== b);
      queue.length = 0; queue.push(...mine, ...rest);
    }
    pump();
  }
  function sharpen(b) {
    for (const p of b.panes.slice().sort((x, y) => x.fi - y.fi)) need(p, 1280, false);
    pump();
  }

  /* ---- layout: where the camera stands, where the row and the fan go on screen ---- */
  let vw = 1, vh = 1, phone = false, ppuRow = 40, slotPx = 100;
  const NAMES = 58;                        // px under the floor line for the names
  const ELEV = 0.2;                        // the camera looks a little down on the row
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  let camX = 0, lookY = 0, dist = 30;
  const region = { x0: 0, x1: 0, y0: 0, y1: 0 };
  let rowTopPx = 0, rowBasePx = 0;

  function placeCamera() {
    camTarget.set(camX, lookY, 0);
    camera.position.set(camX, lookY + Math.sin(ELEV) * dist, Math.cos(ELEV) * dist);
    camera.lookAt(camTarget);
    camera.updateMatrixWorld();
    camPos.copy(camera.position);
    camera.getWorldDirection(fwd);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  }
  const tmp = new THREE.Vector3();
  function toPx(v) {
    tmp.copy(v).project(camera);
    return [(tmp.x * 0.5 + 0.5) * vw, (-tmp.y * 0.5 + 0.5) * vh];
  }

  function layout() {
    vw = room.clientWidth || innerWidth;
    vh = room.clientHeight || innerHeight;
    phone = vw < 640 || vw / vh < 0.85;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    const gut = parseFloat(getComputedStyle(room.querySelector('.room-head')).paddingLeft) || 16;

    list.classList.toggle('row', !phone);
    list.classList.toggle('swipe', phone);

    // how many pixels a scene unit is at the row, and where the floor line sits
    if (phone) {
      slotPx = Math.round(Math.min(vw * 0.34, 200));
      ppuRow = slotPx / SLOT;
    } else {
      const span = NB * SLOT + 0.6;
      ppuRow = Math.min((vw - 2 * gut) / span, vh * 0.085);
      slotPx = SLOT * ppuRow;
    }
    rowBasePx = vh - NAMES - (phone ? 10 : 22);
    // solve the camera so the row's floor line lands on rowBasePx at the size above
    const Y0 = 1 - (2 * rowBasePx) / vh;
    const depth = vh / (2 * th * ppuRow);
    dist = depth;
    for (let i = 0; i < 4; i++) {
      lookY = (-Y0 * th * dist) / (Math.cos(ELEV) + Y0 * th * Math.sin(ELEV));
      dist = depth - lookY * Math.sin(ELEV);
    }
    syncCamX();
    placeCamera();
    const tallest = blocks.some(b => b.upright) ? W : H;
    const [, top] = toPx(tmp.set(camX, tallest + 0.05, 0));
    rowTopPx = top;

    // the fan's room: under the heading, over the names of the row
    const head = room.querySelector('.room-head');
    const headBottom = head.offsetTop + head.offsetHeight;
    region.x0 = gut; region.x1 = vw - gut;
    region.y0 = headBottom + (phone ? 14 : 22);
    region.y1 = rowTopPx - (phone ? 74 : 96);

    if (phone) {
      list.style.setProperty('--slot', `${slotPx}px`);
      list.style.setProperty('--row-h', `${Math.round(vh - rowTopPx + 10)}px`);
      for (const b of blocks) { b.btn.style.transform = ''; b.btn.style.width = ''; b.btn.style.height = ''; }
    } else {
      list.style.removeProperty('--slot');
      list.style.removeProperty('--row-h');
      for (const b of blocks) {
        const [x] = toPx(tmp.set(b.x, 0, 0));
        const [, yTop] = toPx(tmp.set(b.x, (b.upright ? W : H) + 0.08, 0));
        const w = Math.max(40, slotPx - 4);
        b.btn.style.width = `${w}px`;
        b.btn.style.height = `${Math.round(rowBasePx + NAMES - yTop)}px`;
        b.btn.style.transform = `translate(${Math.round(x - w / 2)}px, ${Math.round(yTop - 6)}px)`;
      }
    }
    for (const b of blocks) b.fan = null;   // the fans are laid out again when next needed
    dirty = true;
  }

  // phone: the camera follows the swipe; the list's scroll is the row's position
  let swipeAt = 0;
  function syncCamX() {
    if (!phone) { camX = 0; swipeAt = 0; return; }
    swipeAt = list.scrollLeft / slotPx;
    camX = (swipeAt - (NB - 1) / 2) * SLOT;
  }

  /* ---- the fan: rows of panes, each pane's place on screen, then in the scene ---- */
  // In units of the fan's own scale: a landscape pane is 1.5 by 1; a portrait one turns up, 1 by 1.5.
  function fanLayout(b) {
    const items = b.k.photos.map(id => {
      const p = b.panes.find(q => q.id === id);
      return { p, w: p.side ? H : W, h: p.side ? W : H };
    });
    const n = items.length;
    const GX = 0.14, GY = 0.22;
    const FW = region.x1 - region.x0, FH = Math.max(80, region.y1 - region.y0);
    let best = null;
    for (let r = 1; r <= n; r++) {
      // split into r rows of about equal width, in reading order
      const total = items.reduce((s, it) => s + it.w, 0) + GX * (n - r);
      const rows = [];
      let cur = [], acc = 0, left = total;
      for (let i = 0; i < n; i++) {
        const target = left / (r - rows.length);
        const it = items[i];
        const rowsLeft = r - rows.length - 1;
        const itemsLeft = n - i;
        if (cur.length && rowsLeft > 0 && (acc + it.w / 2 > target || itemsLeft <= rowsLeft)) {
          rows.push(cur); left -= acc + GX; cur = []; acc = 0;
        }
        acc += (cur.length ? GX : 0) + it.w;
        cur.push(it);
      }
      rows.push(cur);
      if (rows.length !== r) continue;
      const widths = rows.map(row => row.reduce((s, it) => s + it.w, 0) + GX * (row.length - 1));
      const heights = rows.map(row => Math.max(...row.map(it => it.h)));
      const tw = Math.max(...widths);
      const tH = heights.reduce((s, h) => s + h, 0) + GY * (r - 1);
      const bow = 0.07 * tw;                       // the ends of a row drop a little: a fan, not a grid
      const ppu = Math.min(FW / tw, FH / (tH + bow));
      if (!best || ppu > best.ppu) best = { ppu, rows, widths, heights, tw, tH, bow };
    }
    // a fan never grows past half the room's height for one pane
    const most = phone ? FH / 1.9 : Math.min(FH / 1.25, vh * 0.42);
    const ppu = Math.min(best.ppu, most);
    const fw = best.tw * ppu, fh = (best.tH + best.bow) * ppu;
    // in front of its block, as far as the room allows
    const [bx] = toPx(tmp.set(b.x, 0, 0));
    const cx = phone ? vw / 2 : Math.min(region.x1 - fw / 2, Math.max(region.x0 + fw / 2, bx));
    const cy = region.y0 + (FH - fh) * 0.62 + fh / 2;   // a little below the middle of its room
    const out = { ppu, cx, cy, fw, fh, items: new Map() };
    let y = cy - fh / 2;
    best.rows.forEach((row, ri) => {
      const rw = best.widths[ri] * ppu, rh = best.heights[ri] * ppu;
      let x = cx - rw / 2;
      for (const it of row) {
        const w = it.w * ppu;
        const u = rw > w ? ((x + w / 2) - cx) / (rw / 2) : 0;
        const px = x + w / 2;
        const py = y + rh / 2 + best.bow * ppu * u * u * (best.widths[ri] / best.tw);
        out.items.set(it.p, { px, py, u });
        x += w + GX * ppu;
      }
      y += rh + GY * ppu;
    });
    return out;
  }

  // a point on screen, at the depth where one scene unit is `ppu` pixels
  const fanQ = new THREE.Quaternion(), eul = new THREE.Euler(0, 0, 0, 'YXZ'), lq = new THREE.Quaternion();
  function fanPose(b, p, outP, outQ) {
    if (!b.fan) b.fan = fanLayout(b);
    const it = b.fan.items.get(p);
    const d = vh / (2 * th * b.fan.ppu);
    const nx = (it.px / vw) * 2 - 1, ny = 1 - (it.py / vh) * 2;
    const back = 0.05 * d * it.u * it.u;           // the ends curve back a little
    outP.copy(camPos)
      .addScaledVector(fwd, d + back)
      .addScaledVector(right, nx * th * camera.aspect * (d + back))
      .addScaledVector(up, ny * th * (d + back));
    eul.set(0, -it.u * 0.24, -it.u * 0.07 + (p.side ? Math.PI / 2 : 0));
    lq.setFromEuler(eul);
    outQ.copy(camera.quaternion).multiply(lq);
    return d;
  }

  /* ---- choosing ---- */
  let want = null;        // the block whose fan is open, or opening
  let hoverB = null, hoverP = null;
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = x => Math.min(1, Math.max(0, x));

  function choose(b, { focusFirst = false } = {}) {
    if (want === b) return;
    if (want) {
      want.btn.setAttribute('aria-expanded', 'false');
      want.shotWrap.hidden = true;
    }
    want = b;
    hoverP = null;
    if (b) {
      b.btn.setAttribute('aria-expanded', 'true');
      b.shotWrap.hidden = false;
      loadFan(b, true);
      if (STILL) for (const o of blocks) o.f = o === b ? 1 : 0;
      if (focusFirst) { const f = b.shotWrap.querySelector('.shot'); if (f) f.focus({ preventScroll: true }); }
    } else if (STILL) {
      for (const o of blocks) o.f = 0;
    }
    words();
    wake();
  }

  for (const b of blocks) {
    b.btn.addEventListener('click', () => {
      if (phone) {
        const at = Math.round(swipeAt);
        if (at !== b.ci) { list.scrollTo({ left: b.ci * slotPx, behavior: STILL ? 'auto' : 'smooth' }); return; }
      }
      choose(want === b ? null : b);
    });
    b.btn.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hoverB = b; loadFan(b, false); wake(); } });
    b.btn.addEventListener('pointerleave', () => { if (hoverB === b) { hoverB = null; wake(); } });
    b.btn.addEventListener('focus', () => { hoverB = b; wake(); });
    b.btn.addEventListener('blur', () => { if (hoverB === b) { hoverB = null; wake(); } });
    for (const [id, el] of b.shots) {
      const p = b.panes.find(q => q.id === id);
      const on = () => { hoverP = p; words(); wake(); };
      const off = () => { if (hoverP === p) { hoverP = null; words(); wake(); } };
      el.addEventListener('pointerenter', on);
      el.addEventListener('pointerleave', off);
      el.addEventListener('focus', on);
      el.addEventListener('blur', off);
    }
  }
  // Escape folds the fan back, unless the viewer is open (it closes first)
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || html.classList.contains('v-open') || !want) return;
    const b = want;
    const inFan = b.shotWrap.contains(document.activeElement);
    choose(null);
    if (inFan) b.btn.focus();
  }, true);

  // the caption under the fan
  function words() {
    if (!want) return;
    const c = want.k.c;
    capName.textContent = kit.pick(c.name);
    if (hoverP && hoverP.b === want) {
      capLine.textContent = kit.pick(hoverP.s.place);
    } else {
      capLine.innerHTML = `<span class="when">${esc(kit.pick(c.date))}</span>${esc(kit.pick(c.note))}`;
    }
    dirty = true;
  }

  /* ---- one frame ---- */
  const S = new THREE.Vector3(), P1 = new THREE.Vector3(), T = new THREE.Vector3();
  const Q0 = new THREE.Quaternion(), QT = new THREE.Quaternion();
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const corners = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]].map(([x, y]) => new THREE.Vector3(x, y, TH / 2));
  let moving = false;

  function pose(now) {
    moving = false;
    syncCamX();
    placeCamera();
    let open = 0;
    for (const b of blocks) open = Math.max(open, easeIO(b.f));

    for (const b of blocks) {
      const lift = b.rise;
      const dmax = Math.min(0.45, 0.03 * b.n);
      const fanOn = b.f > 0;
      for (const p of b.panes) {
        // its place in the block
        const z = ((b.n - 1) * STEP) / 2 - p.si * STEP;
        S.set(b.x + Math.sin(YAW) * z, (b.upright ? W : H) / 2 + 0.002 + lift, Math.cos(YAW) * z);
        Q0.copy(qYaw);
        if (b.upright) Q0.multiply(qUp);
        let e = 0, shade = p.base;
        if (fanOn) {
          const d0 = b.n > 1 ? (p.si / (b.n - 1)) * dmax : 0;
          e = easeIO(clamp01((b.f - d0) / (1 - dmax)));
        }
        if (e > 0) {
          const d = fanPose(b, p, T, QT);
          // up out of the stack first, then forward to its place
          P1.copy(S); P1.y += (b.upright ? W : H) * 1.6;
          const a = 1 - e;
          pos.set(0, 0, 0).addScaledVector(S, a * a).addScaledVector(P1, 2 * a * e).addScaledVector(T, e * e);
          quat.copy(Q0).slerp(QT, e);
          // the pane under the pointer comes a little closer
          if (p.hl > 0.001) pos.addScaledVector(fwd, -0.035 * d * p.hl * e);
          shade = p.base + (1 - p.base) * e;
          if (hoverP && hoverP.b === b && hoverP !== p) shade *= 1 - 0.18 * e;
        } else {
          pos.copy(S);
          quat.copy(Q0);
          // the other blocks step back into the dark while a fan is open
          shade *= 1 - 0.5 * open * (want === b ? 0 : 1);
          if (hoverB === b && want !== b) shade = Math.min(1.08, shade * 1.12);
        }
        p.mesh.matrix.compose(pos, quat, one);
        p.mesh.matrixWorld.copy(p.mesh.matrix);
        p.mirror.visible = e < 0.35;
        if (p.mirror.visible) {
          p.mirror.matrix.multiplyMatrices(REFLECT, p.mesh.matrix);
          p.mirror.matrixWorld.copy(p.mirror.matrix);
        }
        p.u.uRefl.value = 1 - e / 0.35;
        // a print fades in when it arrives
        if (p.hasAt) {
          const h = STILL ? 1 : clamp01((now - p.hasAt) / 280);
          p.u.uHas.value = h;
          if (h < 1) moving = true; else p.hasAt = 0;
        } else if (p.u.uMap.value && p.size) p.u.uHas.value = 1;
        p.u.uShade.value = shade;
      }
    }

    // the floor's light follows the open block
    const spotB = want || blocks.reduce((m, b) => (b.f > (m ? m.f : 0) ? b : m), null);
    if (spotB) floorU.uSpot.value = spotB.x;
    floorU.uSpotAmt.value = open;

    // the clear buttons over the open fan, and the caption under it
    for (const b of blocks) {
      if (b !== want) continue;
      const vis = b.f > 0.6;
      for (const p of b.panes) {
        const el = b.shots.get(p.id);
        if (!vis) { el.style.transform = 'translate(-9999px, 0)'; continue; }
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const c of corners) {
          const [x, y] = toPx(tmp.copy(c).applyMatrix4(p.mesh.matrixWorld));
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        el.style.width = `${Math.round(x1 - x0)}px`;
        el.style.height = `${Math.round(y1 - y0)}px`;
        el.style.transform = `translate(${Math.round(x0)}px, ${Math.round(y0)}px)`;
      }
    }
    if (want && want.fan) {
      const cw = cap.offsetWidth;
      const x = Math.min(vw - cw / 2 - 8, Math.max(cw / 2 + 8, want.fan.cx));
      cap.style.transform = `translate(${Math.round(x - cw / 2)}px, ${Math.round(want.fan.cy + want.fan.fh / 2 + (phone ? 12 : 18))}px)`;
      cap.style.opacity = String(clamp01((want.f - 0.55) / 0.45));
    } else {
      cap.style.opacity = '0';
    }
  }

  /* ---- time: the fan opens and closes, a pane under the pointer comes forward ---- */
  function step(dt) {
    let busy = false;
    for (const b of blocks) {
      const T0 = (900 + 22 * b.n) / 1000;
      if (b === want) {
        // wait for the fan that is closing to be mostly home first
        const others = blocks.some(o => o !== b && o.f > 0.45);
        if (b.f < 1 && !others) { b.f = STILL ? 1 : Math.min(1, b.f + dt / T0); busy = true; }
        else if (b.f < 1) busy = true;
        // the sharper print only where the pane is shown larger than the 640 one
        if (b.f >= 1 && b.fan && b.fan.ppu * W * renderer.getPixelRatio() > 700) sharpen(b);
      } else if (b.f > 0) {
        b.f = STILL ? 0 : Math.max(0, b.f - dt / (T0 * 0.7));
        busy = true;
        if (b.f === 0) { b.fan = null; release(b); }
      }
      const r = hoverB === b && want !== b ? 0.06 : 0;
      if (Math.abs(b.rise - r) > 0.0005) { b.rise += (r - b.rise) * (STILL ? 1 : 1 - Math.exp(-dt * 12)); busy = true; } else b.rise = r;
      for (const p of b.panes) {
        const h = hoverP === p ? 1 : 0;
        if (Math.abs(p.hl - h) > 0.002) { p.hl += (h - p.hl) * (STILL ? 1 : 1 - Math.exp(-dt * 10)); busy = true; } else p.hl = h;
      }
    }
    if (fadeStart && G.uFade.value < 1) {
      const t = clamp01((performance.now() - fadeStart) / 900);
      G.uFade.value = STILL ? 1 : t * t * (3 - 2 * t);
      busy = true;
    }
    return busy;
  }

  /* ---- the loop: runs while something moves, sleeps otherwise ---- */
  let raf = 0, last = 0;
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
    last = now;
    const busy = step(dt);
    if (busy || dirty || moving) {
      dirty = false;
      pose(now);
      renderer.render(scene, camera);
    }
    if (busy || moving) raf = requestAnimationFrame(frame); else last = 0;
  }
  function wake() { dirty = true; if (!raf) raf = requestAnimationFrame(frame); }

  /* ---- phone: the swipe moves the camera; where it settles, that country opens ---- */
  let settleT = 0;
  list.addEventListener('scroll', () => {
    if (!phone) return;
    syncCamX();
    if (want && Math.abs(swipeAt - want.ci) > 0.5) choose(null);
    clearTimeout(settleT);
    settleT = setTimeout(() => {
      const at = Math.max(0, Math.min(NB - 1, Math.round(list.scrollLeft / slotPx)));
      loadFronts(at);
      if (!want || want.ci !== at) choose(blocks[at]);
    }, 140);
    wake();
  }, { passive: true });

  let resizeT = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { layout(); wake(); }, 60);
  });

  layout();
  loadFronts(0);
  // arrival: the row stands still a moment, then the latest country fans out
  const first = blocks[0];
  loadFan(first, true);
  const openFirst = () => { if (!want && !opened) { opened = true; choose(first); } };
  let opened = false;
  if (STILL) openFirst();
  else {
    const ready = () => first.panes.every(p => p.size > 0);
    const t0 = performance.now();
    (function waitFirst() {
      if (opened) return;
      if (performance.now() - t0 > 650 && (ready() || performance.now() - t0 > 2200)) openFirst();
      else setTimeout(waitFirst, 120);
    })();
  }
  wake();

  glass = { words };

  // for checking in a browser tab where requestAnimationFrame does not run
  window.__portfolio = {
    open(id) { choose(blocks.find(b => b.k.id === id) || null); },
    settle() {
      for (const b of blocks) { b.f = b === want ? 1 : 0; b.rise = 0; if (b !== want) b.fan = null; }
      G.uFade.value = 1;
      for (const p of allPanes) { if (p.hasAt) p.hasAt = 1; }
      pose(performance.now() + 1e6); renderer.render(scene, camera);
      return this.info();
    },
    at(f) { if (want) want.f = f; G.uFade.value = 1; pose(performance.now() + 1e6); renderer.render(scene, camera); },
    draw() { pose(performance.now() + 1e6); renderer.render(scene, camera); },
    info() {
      return {
        phone, vw, vh, want: want && want.k.id, f: want && want.f, ppuRow, slotPx,
        loaded: allPanes.filter(p => p.size).length, big: allPanes.filter(p => p.size === 1280).length,
        queue: queue.length, inflight, calls: renderer.info.render.calls,
        fan: want && want.fan && { ppu: Math.round(want.fan.ppu), w: Math.round(want.fan.fw), h: Math.round(want.fan.fh) },
      };
    },
    shot() { return canvas.toDataURL('image/jpeg', 0.7); },
  };
}
