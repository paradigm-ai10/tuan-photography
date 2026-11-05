/* Paper pop-up 立體紙地圖 (2026-11-06), one of the ten footprint maps.
   The world printed on a sheet of warm paper lying on a table, seen at a low angle. The countries he
   has been to are cut from card and stand up off the sheet: one trip low, two higher, three highest;
   Taiwan, home, in clay and tallest. Each card is a flat earth colour by continent with paper edges,
   and casts a soft shadow on the sheet. The counts sit in the sheet's bottom margin like a printed
   map's title block (real text, laid onto the sheet in perspective); on a phone they are set below
   the sheet. On arrival the cards rise one by one in the order he first went, like a pop-up book
   opening (about 3 s). Hover a card for the country. */
import * as THREE from 'three';

const FP = window.FP;
const d3 = window.d3;
const esc = FP.esc;
FP.chrome();

const stage = document.getElementById('stage');

/* ------------------------------------------------------------ the palette, read from the stylesheet */

const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
function css(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  probe.clearRect(0, 0, 1, 1); probe.fillStyle = 'transparent'; probe.fillStyle = v; probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
}
const PAL = {
  paper: css('--paper'), table: css('--pp-table'), land: css('--pp-land'), coast: css('--pp-coast'),
  border: css('--pp-border'), grat: css('--hair'), ink2: css('--ink-2'), ink3: css('--ink-3'),
  wall: css('--pp-wall'), edge: css('--pp-edge'), home: css('--pp-home'),
  light: 'rgb(255, 255, 255)', // the lamp: plain white, so the paper keeps its own colour
  asia: css('--pp-asia'), europe: css('--pp-europe'), 'north-america': css('--pp-north-america'), oceania: css('--pp-oceania'),
};
const color = (rgb) => new THREE.Color().setStyle(rgb);

/* ------------------------------------------------------------ the sheet and its print */

const CENTRE = 155;  // the Pacific in the middle, as maps are printed in Taiwan
const SOUTH = -58;   // Antarctica is left off
const CW = 4096;     // the print, in canvas pixels across
const SW = 20;       // the sheet, in scene units across
const K = SW / CW;   // canvas pixels to scene units
const M = 150;       // the sheet's margin round the map, in canvas pixels
const MB = 470;      // the bottom margin that holds the title block, on a wide window

const outline = (() => {
  const pts = [];
  for (let o = -179.9; o <= 179.9; o += 2) pts.push([CENTRE + o, 90], [CENTRE + o, SOUTH]);
  for (let lat = SOUTH; lat <= 90; lat += 2) pts.push([CENTRE - 179.9, lat], [CENTRE + 179.9, lat]);
  return { type: 'MultiPoint', coordinates: pts };
})();
const proj = d3.geoNaturalEarth1().rotate([-CENTRE, 0]).precision(0.1).fitWidth(CW - 2 * M - 40, outline);
{
  const b = d3.geoPath(proj).bounds(outline);
  const t = proj.translate();
  proj.translate([t[0] + M + 20 - b[0][0], t[1] + M + 20 - b[0][1]]);
}
const MAP = (() => { const b = d3.geoPath(proj).bounds(outline); return { x0: M, y0: M, x1: CW - M, y1: b[1][1] }; })();
proj.clipExtent([[MAP.x0, MAP.y0], [MAP.x1, MAP.y1]]);
const ZOFF = (MAP.y0 + MAP.y1) / 2; // the scene's middle is the map's middle
const X = (px) => (px - CW / 2) * K;
const Z = (py) => (py - ZOFF) * K;

const TRIP_H = (n) => 0.2 + (Math.min(n, 3) - 1) * 0.13; // one trip low, two higher, three highest
const HOME_H = TRIP_H(3) + 0.08;
const SMALL = new Set(['singapore', 'hong-kong', 'andorra']); // too small to cut: a raised disc

function drawPrint(ctx, w110) {
  const H = ctx.canvas.height;
  ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, CW, H);
  const path = d3.geoPath(proj, ctx);
  // graticule, every 30 degrees, and the edge of the world
  ctx.beginPath(); path(d3.geoGraticule().step([30, 30])()); ctx.strokeStyle = PAL.grat; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = PAL.ink3; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
  // the land, a pale tint; the borders faint; the coast a fine line
  const land = { type: 'FeatureCollection', features: w110.features.filter((f) => f.id !== '010') };
  ctx.beginPath(); path(land); ctx.fillStyle = PAL.land; ctx.fill();
  ctx.beginPath(); path(w110.borders); ctx.strokeStyle = PAL.border; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.beginPath(); path(land); ctx.strokeStyle = PAL.coast; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
  // the neatline, a double rule
  ctx.strokeStyle = PAL.ink2; ctx.lineWidth = 3; ctx.strokeRect(MAP.x0, MAP.y0, MAP.x1 - MAP.x0, MAP.y1 - MAP.y0);
  ctx.strokeStyle = PAL.ink3; ctx.lineWidth = 1.5; ctx.strokeRect(MAP.x0 - 14, MAP.y0 - 14, MAP.x1 - MAP.x0 + 28, MAP.y1 - MAP.y0 + 28);
}

/* ------------------------------------------------------------ the scene */

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: FP.still });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(color(PAL.table), 1);
renderer.domElement.className = 'pp-canvas';
renderer.domElement.setAttribute('role', 'img');
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(10, 1, 1, 2000);

// one sun from the upper left, a little in front, and a soft fill. A face looking up shows its own
// colour exactly (fill and sun add up to pi); a face in shadow keeps about two thirds of its light
const L = new THREE.Vector3(-5, 4.8, 1.3).normalize();
const AMB = 0.64;
scene.add(new THREE.AmbientLight(color(PAL.light), AMB * Math.PI));
const sun = new THREE.DirectionalLight(color(PAL.light), ((1 - AMB) * Math.PI) / L.y);
sun.position.copy(L).multiplyScalar(40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.radius = 5;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.012;
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 8, bottom: -8, near: 1, far: 90 });
scene.add(sun, sun.target);

// the table, and the sheet lying on it with a little thickness
const T = 0.035;
const table = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: color(PAL.table) }));
table.position.y = -T;
table.receiveShadow = true;
scene.add(table);

let printTex = null;
const sheetTop = new THREE.MeshLambertMaterial();
const sheetEdge = new THREE.MeshLambertMaterial({ color: color(PAL.edge) });
let sheet = null;
let wideNow = null;

function layoutSheet(wide, w110) {
  if (sheet && wideNow === wide) return;
  wideNow = wide;
  const ch = Math.round(MAP.y1 + (wide ? MB : M));
  // a fresh canvas and texture each time the sheet changes shape: a texture keeps the size it was made at
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = ch;
  drawPrint(cv.getContext('2d'), w110);
  if (printTex) printTex.dispose();
  printTex = new THREE.CanvasTexture(cv);
  printTex.colorSpace = THREE.SRGBColorSpace;
  printTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  sheetTop.map = printTex;
  sheetTop.needsUpdate = true;
  if (sheet) { scene.remove(sheet); sheet.geometry.dispose(); }
  const sh = ch * K;
  sheet = new THREE.Mesh(new THREE.BoxGeometry(SW, T, sh), [sheetEdge, sheetEdge, sheetTop, sheetEdge, sheetEdge, sheetEdge]);
  sheet.position.set(0, -T / 2, Z(0) + sh / 2);
  sheet.castShadow = true;
  sheet.receiveShadow = true;
  sheet.userData.z0 = Z(0); sheet.userData.z1 = Z(0) + sh;
  scene.add(sheet);
}

/* ------------------------------------------------------------ the cut-outs */

const cards = []; // { mesh, country, h, k, lift, liftTo }
// the cut edge of the card: paper, lit, but evenly, so the coast's many little faces do not stripe it
const wallMat = new THREE.MeshLambertMaterial({ color: color(PAL.wall).multiplyScalar(0.36), emissive: color(PAL.wall).multiplyScalar(0.6) });
const capMat = {};
const capOf = (key) => (capMat[key] ||= new THREE.MeshLambertMaterial({ color: color(PAL[key] || PAL.ink3) }));

function ringsOf(geom) {
  const rings = []; let cur = null;
  const ctx = { moveTo(x, y) { cur = [[x, y]]; rings.push(cur); }, lineTo(x, y) { cur.push([x, y]); }, closePath() {}, arc() {}, beginPath() {} };
  d3.geoPath(proj, ctx)(geom);
  return rings;
}
const area = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };

// the parts of a country far from home ground (French Guiana, the Falklands, the Dutch Caribbean) are
// not where he went: they stay on the print. The United States keeps Alaska and Hawaii.
const FAR_KM = 3500;
function nearParts(c, feature) {
  const polys = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  if (c.id === 'usa') return polys;
  return polys.filter((poly) => { const m = d3.geoCentroid({ type: 'Polygon', coordinates: poly }); return FP.km([m[1], m[0]], c.ll) < FAR_KM; });
}
function shapesOf(c, feature) {
  const polys = nearParts(c, feature);
  const shapes = [];
  for (const poly of polys) {
    for (const ring of ringsOf({ type: 'Polygon', coordinates: [poly[0]] })) {
      const pts = [];
      for (const p of ring) { const q = pts[pts.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 2.2) pts.push(p); }
      if (pts.length < 4 || area(pts) < 260) continue; // islands too small to cut stay on the print
      shapes.push(new THREE.Shape(pts.map((p) => new THREE.Vector2(X(p[0]), -Z(p[1])))));
    }
  }
  return shapes;
}

const FLAT = 0.006;
function setHeight(card) { card.mesh.scale.y = Math.max(FLAT, card.h * card.k + card.lift); }

function makeCard(c, feature) {
  const key = c.home ? 'home' : c.continent;
  const h = c.home ? HOME_H : TRIP_H(c.trips);
  let mesh;
  const shapes = feature && !SMALL.has(c.id) ? shapesOf(c, feature) : [];
  if (shapes.length) {
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    mesh = new THREE.Mesh(g, [capOf(key), wallMat]);
  } else { // a small raised disc, standing a little proud of its neighbours
    const p = proj([c.ll[1], c.ll[0]]);
    const g = new THREE.CylinderGeometry(0.085, 0.085, 1, 40).translate(0, 0.5, 0);
    mesh = new THREE.Mesh(g, [wallMat, capOf(key), capOf(key)]);
    mesh.position.set(X(p[0]), 0, Z(p[1]));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const card = { mesh, country: c, h: shapes.length ? h : h + 0.12, k: 0, lift: 0, liftTo: 0 };
  mesh.userData.card = card;
  setHeight(card);
  scene.add(mesh);
  cards.push(card);
}

/* ------------------------------------------------------------ the camera: framed to the window */

const TILT = 38 * Math.PI / 180; // from straight down
const view = { yaw: 0, pitch: 0, yawTo: 0, pitchTo: 0, dist: 40, target: new THREE.Vector3() };
let W = 1, H = 1;

function place(yaw, pitch) {
  const t = TILT + pitch;
  camera.position.set(
    view.target.x + view.dist * Math.sin(t) * Math.sin(yaw),
    view.target.y + view.dist * Math.cos(t),
    view.target.z + view.dist * Math.sin(t) * Math.cos(yaw),
  );
  camera.lookAt(view.target);
  camera.updateMatrixWorld();
}

// where a point of the sheet lands in the window, in css pixels
const v3 = new THREE.Vector3();
function onScreen(x, y, z) { v3.set(x, y, z).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H]; }

function frameView(box) { // box: the part of the window the sheet may use, in css pixels
  camera.aspect = W / H;
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
  const z0 = sheet.userData.z0, z1 = sheet.userData.z1;
  view.target.set(0, 0, (z0 + z1) / 2);
  const pts = [];
  for (const x of [-SW / 2, SW / 2]) for (const z of [z0, z1]) for (const y of [0, HOME_H]) pts.push(new THREE.Vector3(x, y, z));
  const bounds = () => {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
    for (const p of pts) { const q = p.clone().project(camera); a = Math.min(a, q.x); b = Math.max(b, q.x); c = Math.min(c, q.y); d = Math.max(d, q.y); }
    return [a, b, c, d];
  };
  // a little room to spare, for the drift
  const bw = (box.x1 - box.x0) / W * 2 * 0.975, bh = (box.y1 - box.y0) / H * 2 * 0.975;
  let lo = 5, hi = 2000;
  for (let i = 0; i < 44; i++) {
    view.dist = (lo + hi) / 2; place(0, 0);
    const [a, b, c, d] = bounds();
    if (b - a > bw || d - c > bh) lo = view.dist; else hi = view.dist;
  }
  view.dist = hi;
  // the near and far planes hug the table, so the depth test can tell a flat card from the sheet under it
  camera.near = Math.max(0.5, view.dist - 30); camera.far = view.dist + 40;
  camera.updateProjectionMatrix();
  place(0, 0);
  const [a, b, c, d] = bounds();
  const cx = (a + b) / 2, cy = (c + d) / 2;
  const tx = ((box.x0 + box.x1) / 2 / W) * 2 - 1, ty = 1 - ((box.y0 + box.y1) / 2 / H) * 2;
  camera.setViewOffset(W, H, -((tx - cx) / 2) * W, ((ty - cy) / 2) * H, W, H);
  camera.updateProjectionMatrix();
  const sh = ty - cy;
  return { top: (1 - (d + sh)) / 2 * H, bottom: (1 - (c + sh)) / 2 * H };
}

/* ------------------------------------------------------------ the title block: real words, laid on the sheet */

let block = null; // the counts: on the sheet's margin when wide, set below the sheet on a phone

function blockHTML() {
  const w = FP.w, c = FP.counts;
  const n = (v, label) => `<p class="pp-count"><span class="pp-count__n">${esc(FP.fmt(v))}</span><span class="pp-count__l">${esc(label)}</span></p>`;
  const conts = [...new Set(FP.abroad.map((a) => a.continent))].sort();
  return `<div class="pp-block__name"><h1 class="pp-title">${esc(w.where)}</h1>
      <p class="pp-span">${esc(w.span(c.since, c.until))}</p></div>
    <ul class="pp-key">${conts.map((id) => `<li><i class="pp-sw pp-sw--${id}" aria-hidden="true"></i>${esc(w.continent[id] || id)}</li>`).join('')}<li><i class="pp-sw pp-sw--home" aria-hidden="true"></i>${esc(w.home)}</li></ul>
    <div class="pp-nums">${n(c.countries, w.countries(c.countries))}${n(c.trips, w.trips(c.trips))}${n(c.continents, w.continents(c.continents))}</div>`;
}

// a 2D homography from the block's own rectangle to the four corners on screen, as a css matrix3d
function quadMatrix(w, h, q) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i], [x, y] = q[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  for (let i = 0; i < 8; i++) { // gaussian elimination
    let p = i;
    for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < 8; r++) {
      const f = A[r][i] / A[i][i];
      for (let k = i; k < 8; k++) A[r][k] -= f * A[i][k];
      b[r] -= f * b[i];
    }
  }
  const s = new Array(8);
  for (let i = 7; i >= 0; i--) { let t = b[i]; for (let k = i + 1; k < 8; k++) t -= A[i][k] * s[k]; s[i] = t / A[i][i]; }
  const [a1, b1, c1, d1, e1, f1, g1, h1] = s;
  return `matrix3d(${a1},${d1},0,${g1},${b1},${e1},0,${h1},0,0,1,0,${c1},${f1},0,1)`;
}

// the block's rectangle on the sheet: under the map, across its width
const BLOCK = { x0: X(MAP.x0), x1: X(MAP.x1), z0: Z(MAP.y1 + 60), z1: Z(MAP.y1 + MB - 90) };
function layBlock() {
  if (!wideNow || !block) return;
  const q = [onScreen(BLOCK.x0, 0, BLOCK.z0), onScreen(BLOCK.x1, 0, BLOCK.z0), onScreen(BLOCK.x1, 0, BLOCK.z1), onScreen(BLOCK.x0, 0, BLOCK.z1)];
  const bw = block.offsetWidth, bh = block.offsetHeight;
  block.style.setProperty('--m', quadMatrix(bw, bh, q));
}
function sizeBlock() {
  if (!wideNow) return;
  // laid out at about the size it will show at, so the words are drawn sharp
  const q0 = onScreen(BLOCK.x0, 0, BLOCK.z1), q1 = onScreen(BLOCK.x1, 0, BLOCK.z1);
  const bw = Math.round(q1[0] - q0[0]);
  const bh = Math.round(bw * (BLOCK.z1 - BLOCK.z0) / (BLOCK.x1 - BLOCK.x0));
  block.style.setProperty('--bw', `${bw}px`);
  block.style.setProperty('--bh', `${bh}px`);
  block.style.setProperty('--u', (bw / 1000).toFixed(4));
}

/* ------------------------------------------------------------ build, size, arrival */

let w110 = null, w50 = null;
let dirty = 2;
let rising = false, t0 = 0;
const RISE = 0.72, STEP = 0.112, FIRST = 0.2;

function size() {
  W = stage.clientWidth; H = stage.clientHeight;
  renderer.setSize(W, H, false);
  const wide = !(W < 720 || W / H < 1.05);
  stage.classList.toggle('is-narrow', !wide);
  block.classList.toggle('is-printed', wide);
  layoutSheet(wide, w110);
  const TOP = 64;
  if (wide) {
    const side = Math.max(16, Math.min(40, W * 0.03));
    frameView({ x0: side, y0: TOP, x1: W - side, y1: H - 10 });
    sizeBlock();
    layBlock();
  } else {
    // framed to the width first, to learn how tall the sheet looks; then the sheet and the counts centred together
    const side = 10;
    const ch = block.offsetHeight;
    const first = frameView({ x0: side, y0: TOP, x1: W - side, y1: H - 10 });
    const sheetH = first.bottom - first.top;
    const total = sheetH + 22 + ch;
    const y0 = Math.max(TOP, TOP + (H - TOP - 10 - total) / 2);
    const fr = frameView({ x0: side, y0, x1: W - side, y1: y0 + sheetH + 1 });
    block.style.setProperty('--y', `${Math.round(fr.bottom + 22)}px`);
  }
  renderer.domElement.setAttribute('aria-label', FP.lang === 'zh' ? '一張攤在桌上的紙地圖，我去過的國家剪成卡紙立起來' : 'A paper map on a table, the countries I have been to cut from card and standing up');
  dirty = 2;
}

function build() {
  block = document.createElement('section');
  block.className = 'pp-block';
  block.innerHTML = blockHTML();
  stage.appendChild(block);
  size();
  // a country can come in several pieces with the same number (Australia and the Ashmore Islands): join them
  const byIso = new Map();
  for (const f of w50.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const had = byIso.get(f.id);
    if (had) had.geometry.coordinates.push(...polys);
    else byIso.set(f.id, { id: f.id, geometry: { type: 'MultiPolygon', coordinates: polys.slice() } });
  }
  makeCard(FP.home, byIso.get(FP.home.iso));        // home first,
  for (const c of FP.abroad) makeCard(c, byIso.get(c.iso)); // then in the order he first went
  if (FP.still || FP.reduced) cards.forEach((c) => { c.k = 1; setHeight(c); });
  else { rising = true; t0 = performance.now(); }
  render(); // a frame right away
}

function render() { renderer.render(scene, camera); }

const backOut = (t) => { const s = 1.25, u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

function tick() {
  requestAnimationFrame(tick);
  if (!sheet) return;
  let moving = false;
  if (rising) {
    const s = (performance.now() - t0) / 1000;
    cards.forEach((c, i) => {
      const u = Math.min(1, Math.max(0, (s - FIRST - i * STEP) / RISE));
      c.k = u <= 0 ? 0 : backOut(u);
    });
    if (s > FIRST + (cards.length - 1) * STEP + RISE) { rising = false; cards.forEach((c) => { c.k = 1; }); }
    moving = true;
  }
  for (const c of cards) {
    if (Math.abs(c.lift - c.liftTo) > 0.0005) { c.lift += (c.liftTo - c.lift) * 0.18; moving = true; } else c.lift = c.liftTo;
    setHeight(c);
  }
  const dy = view.yawTo - view.yaw, dp = view.pitchTo - view.pitch;
  if (Math.abs(dy) > 1e-5 || Math.abs(dp) > 1e-5) { view.yaw += dy * 0.05; view.pitch += dp * 0.05; moving = true; }
  if (moving || dirty > 0 || FP.still) {
    place(view.yaw, view.pitch);
    render();
    layBlock();
    if (dirty > 0) dirty--;
  }
}

/* ------------------------------------------------------------ hover and drift */

const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let hovered = null;
stage.addEventListener('pointermove', (e) => {
  if (!sheet) return;
  const r = renderer.domElement.getBoundingClientRect();
  const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
  if (!FP.reduced && e.pointerType === 'mouse') { // a degree or so of drift with the pointer
    view.yawTo = (nx - 0.5) * 2 * (1.4 * Math.PI / 180);
    view.pitchTo = (ny - 0.5) * 2 * (0.9 * Math.PI / 180);
  }
  ptr.set(nx * 2 - 1, -(ny * 2 - 1));
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(cards.map((c) => c.mesh), false)[0];
  const card = hit ? hit.object.userData.card : null;
  if (card !== hovered) {
    if (hovered) hovered.liftTo = 0;
    hovered = card;
    if (hovered && !FP.reduced) hovered.liftTo = 0.06;
  }
  if (card) FP.tip(e.clientX, e.clientY, FP.about(card.country)); else FP.tip(0, 0, null);
});
stage.addEventListener('pointerleave', () => {
  if (hovered) hovered.liftTo = 0;
  hovered = null;
  view.yawTo = 0; view.pitchTo = 0;
  FP.tip(0, 0, null);
});

let rt = 0;
let sizeNow = '';
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    const now = `${stage.clientWidth}x${stage.clientHeight}`;
    if (!sheet || now === sizeNow) return;
    sizeNow = now; size();
  }, 100);
});
FP.onLang(() => {
  if (!sheet) return;
  block.innerHTML = blockHTML();
  size();
});

/* ------------------------------------------------------------ start */

const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => null) : Promise.resolve();
Promise.all([FP.world('110m'), FP.world('50m'), fontsReady]).then(([a, b]) => {
  w110 = a; w50 = b;
  sizeNow = `${stage.clientWidth}x${stage.clientHeight}`;
  build();
  requestAnimationFrame(tick);
});
