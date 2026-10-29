/* The Journey map as a real 3D object (trial, 2026-10-29). One paper sheet, the flat map of the
   arrival, bends round into a globe as the page scrolls: three.js, lit, turning to the trip being
   read. It takes the place of journey.js's own SVG map and answers it with the same six words
   (flyOut, settled, at, forward, trip, setFold), so the page around it is unchanged.

   Five versions, chosen by <body data-globe="…">:
     paper   the sheet closes evenly into a matte paper globe; flights lift a little off it
     relief  the same globe with the land in shaded relief, mountains catching the light
     high    flights rise in tall arcs above the globe, seen a little from above
     raised  the countries he has been to stand up from the globe like cut paper
     roll    the map rolls up like a paper chart first, then closes at the poles
     mix     raised countries with mid-height arcs, the globe at high's size (his pick)

   The sheet is one grid of points; where each point sits is worked out on the graphics card from
   two curvatures (across and up and down), so the flat map, the half-rolled sheet and the globe are
   one shape at different bends. The same sums run here in JS for the lines and dots on it. */
import * as THREE from 'three';
import { LineSegments2 } from "../vendor/three/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "../vendor/three/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "../vendor/three/lines/LineMaterial.js";

const K = window.Kit;
const S = K.S;
const V = document.body.dataset.globe || 'paper';
const CFG = {
  paper: { lift: 0.07, seg: [360, 180] },
  relief: { lift: 0.07, seg: [360, 180], relief: true },
  high: { lift: 0.42, seg: [360, 180], frame1: 3.05, look: 0.3 },
  raised: { lift: 0.07, seg: [720, 360], raise: 0.03 },
  roll: { lift: 0.07, seg: [360, 180], roll: true },
  // his pick (2026-10-29): raised countries, arcs lower than high's, the globe at high's size
  mix: { lift: 0.15, seg: [720, 360], raise: 0.03, frame1: 3.05, look: 0.3 },
  // the Impeccable variations (2026-10-29): the same globe, arcs held closer to it
  mixlow: { lift: 0.08, seg: [720, 360], raise: 0.03, frame1: 3.05, look: 0.3 },
  // the artists' round (2026-10-29): a printed plate on arrival, the countries standing up in the
  // order he first went, the world wrapping closed round Taiwan, and two new surfaces
  chart: { lift: 0.08, seg: [720, 360], raise: 0.03, frame1: 3.05, look: 0.3, paint: 'chart', wave: true, rise: true, plate: true, walls: true },
  cut: { lift: 0.08, seg: [720, 360], raise: 0.035, frame1: 3.05, look: 0.3, paint: 'cut', wave: true, rise: true, plate: true, walls: true },
  motion: { lift: 0.08, seg: [720, 360], raise: 0.03, frame1: 3.05, look: 0.3, wave: true, rise: true, plate: true },
}[V];
const HOME_LL = [S.flightsFrom[1], S.flightsFrom[0]];

const R = 1;
const START = 150;                 // the flat map is centred on the Pacific, Taiwan in view (as before)
const TAU = Math.PI * 2, RAD = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const turnBy = (from, to) => ((to - from + 540) % 360) - 180;
const ll = (p) => [p[1], p[0]];

// the site's colours, read from the stylesheet (oklch there; three wants plain rgb)
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
function rgb(name) {
  const v = name.startsWith('--') ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : name;
  probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = v; probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
}

/* ------------------------------------------------------------ the bend */

// how far the sheet is curved across (kx) and up and down (ky) at fold f
function bends(f) {
  if (!CFG.roll) return [f / R, f / R];
  return [ease(clamp(f / 0.6, 0, 1)) / R, ease(clamp((f - 0.4) / 0.6, 0, 1)) / R];
}
// a place (lon, lat in degrees, h above the surface in globe radii) on the sheet as it is bent now
// with the wave, each point closes on its own clock: the ones near home first, the far side last
function waveW(lon, lat, f) {
  const p = lat * RAD, hp = HOME_LL[1] * RAD, dl = (lon - HOME_LL[0]) * RAD;
  const d = Math.acos(clamp(Math.sin(p) * Math.sin(hp) + Math.cos(p) * Math.cos(hp) * Math.cos(dl), -1, 1)) / Math.PI;
  const x = clamp(f * 1.7 - d * 0.7, 0, 1);
  return x * x * (3 - 2 * x);
}
function place(lon, lat, h, st, out = new THREE.Vector3()) {
  const lonR = (((lon - st.center) % 360) + 540) % 360 - 180;
  const u = lonR * RAD * R, v = lat * RAD * R;
  if (CFG.wave) {
    const a = u / R, b = v / R, w = waveW(lon, lat, st.fold);
    const nx = Math.cos(b) * Math.sin(a), ny = Math.sin(b), nz = Math.cos(b) * Math.cos(a);
    const fx = u, fy = v, fz = R + h * R;
    const sx = nx * R * (1 + h), sy = ny * R * (1 + h), sz = nz * R * (1 + h);
    out.set(fx + (sx - fx) * w, fy + (sy - fy) * w, fz + (sz - fz) * w);
    out.lonR = lonR;
    return out;
  }
  const kx = Math.max(st.kx, 1e-3), ky = Math.max(st.ky, 1e-3);
  const a = u * kx, b = v * ky;
  const w = (Math.cos(b) - 1) / ky + 1 / kx;
  const nx = Math.cos(b) * Math.sin(a), ny = Math.sin(b), nz = Math.cos(b) * Math.cos(a);
  out.set(w * Math.sin(a) + nx * h * R, Math.sin(b) / ky + ny * h * R, w * Math.cos(a) + R - 1 / kx + nz * h * R);
  out.lonR = lonR;
  return out;
}
const MORPH = /* glsl */`
  uniform float uKx, uKy, uR, uCenter, uRaise, uMix, uWave, uFold, uRise, uReveal;
  uniform vec2 uHome;
  uniform sampler2D uMask, uMaskPrev;
  varying vec2 vQ;
  varying float vRz;
  vec3 sheet(vec2 q, float h, out vec3 n) {
    float u = (q.x - 0.5) * 6.2831853 * uR, v = (q.y - 0.5) * 3.1415927 * uR;
    if (uWave > 0.5) {
      float a = u / uR, b = v / uR;
      vec3 ns = vec3(cos(b) * sin(a), sin(b), cos(b) * cos(a));
      float lon = a + uCenter;
      float d = acos(clamp(sin(b) * sin(uHome.y) + cos(b) * cos(uHome.y) * cos(lon - uHome.x), -1.0, 1.0)) / 3.1415927;
      float w = smoothstep(0.0, 1.0, clamp(uFold * 1.7 - d * 0.7, 0.0, 1.0));
      n = normalize(mix(vec3(0.0, 0.0, 1.0), ns, w));
      return mix(vec3(u, v, uR + h * uR), ns * uR * (1.0 + h), w);
    }
    float kx = max(uKx, 1e-3), ky = max(uKy, 1e-3);
    float a = u * kx, b = v * ky;
    float w = (cos(b) - 1.0) / ky + 1.0 / kx;
    n = vec3(cos(b) * sin(a), sin(b), cos(b) * cos(a));
    return vec3(w * sin(a), sin(b) / ky, w * cos(a) + uR - 1.0 / kx) + n * h * uR;
  }
  float raiseAt(vec2 q) {
    if (uRaise <= 0.0) return 0.0;
    vec2 m = vec2(q.x + uCenter / 6.2831853, q.y);
    float g = mix(texture2D(uMaskPrev, m).r, texture2D(uMask, m).r, uMix);
    // with the rise, the mask's grey is the order he first went: each country stands up in its turn
    if (uRise > 0.5) return g > 0.02 ? uRaise * smoothstep(g - 0.07, g, uReveal * 1.08) : 0.0;
    return uRaise * g;
  }
`;

/* ------------------------------------------------------------ the world, painted flat */

const TW = 4096, TH = 2048;
const eq = d3.geoEquirectangular().scale(TW / TAU).translate([TW / 2, TH / 2]).precision(0.2);

let reliefImg = null;
const reliefP = CFG.relief ? new Promise((ok) => { const i = new Image(); i.onload = () => ok(reliefImg = i); i.onerror = () => ok(null); i.src = '../vendor/relief/SR_50M-4096.jpg'; }) : Promise.resolve(null);

function painter(world, colours) {
  const visited = world.countries.filter((f) => K.visitedIso.has(f.id));
  let order = null;   // the grey each visited country gets in the mask: earlier trips darker
  return (cv, firstOf, y, hover, mask) => {
    if (!order) {
      const ys = [...new Set(visited.map((f) => firstOf[f.id]))].sort((a, b) => a - b);
      order = Object.fromEntries(visited.map((f) => [f.id, 0.12 + 0.86 * (ys.indexOf(firstOf[f.id]) + 1) / ys.length]));
    }
    const c = cv.getContext('2d');
    const path = d3.geoPath(eq, c);
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (mask) {
      const k = cv.width / TW;
      c.setTransform(k, 0, 0, k, 0, 0);
      c.fillStyle = '#000'; c.fillRect(0, 0, TW, TH);
      for (const f of visited) if (firstOf[f.id] <= y) {
        const g = CFG.rise ? Math.round(order[f.id] * 255) : 255;
        c.fillStyle = `rgb(${g}, ${g}, ${g})`; c.beginPath(); path(f); c.fill();
      }
      return;
    }
    if (CFG.paint === 'chart') return paintChart(c, path, world, visited, colours, firstOf, y, hover);
    if (CFG.paint === 'cut') return paintCut(c, path, world, visited, colours, firstOf, y, hover);
    c.fillStyle = colours.sea; c.fillRect(0, 0, TW, TH);
    c.fillStyle = colours.land; c.beginPath(); path(world.land); c.fill();
    if (reliefImg) {
      c.save(); c.beginPath(); path(world.land); c.clip();
      c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.55;
      c.drawImage(reliefImg, 0, 0, TW, TH);
      c.restore();
    }
    for (const f of visited) {
      const later = firstOf[f.id] > y;
      c.fillStyle = f.id === hover ? colours.beenOn : later ? colours.land : colours.been;
      c.globalAlpha = reliefImg && !later ? 0.82 : 1;
      c.beginPath(); path(f); c.fill();
    }
    c.globalAlpha = 1;
    c.strokeStyle = colours.hair; c.lineWidth = 1.6; c.beginPath(); path(world.borders); c.stroke();
    c.strokeStyle = colours.coast; c.lineWidth = 2.2; c.beginPath(); path(world.land); c.stroke();
  };
}

// "Sea chart" (the illustrator's pick): the colour is in the sea, the land is the page's own paper,
// engraved waterlines round every coast, a crisp ink coast, dotted borders
function paintChart(c, path, world, visited, col, firstOf, y, hover) {
  c.fillStyle = col.sea; c.fillRect(0, 0, TW, TH);
  c.lineJoin = 'round';
  c.strokeStyle = col.water;
  for (const [w, a] of [[46, 0.16], [30, 0.26], [16, 0.42]]) {
    c.globalAlpha = a; c.lineWidth = w; c.beginPath(); path(world.land); c.stroke();
  }
  c.globalAlpha = 1;
  c.fillStyle = col.land; c.beginPath(); path(world.land); c.fill();
  for (const f of visited) {
    if (firstOf[f.id] > y) continue;
    c.fillStyle = f.id === hover ? col.beenOn : col.been;
    c.beginPath(); path(f); c.fill();
    c.strokeStyle = col.edge; c.lineWidth = 1.4; c.stroke();
  }
  c.setLineDash([3, 5]); c.strokeStyle = col.hair; c.lineWidth = 1.3; c.beginPath(); path(world.borders); c.stroke();
  c.setLineDash([]);
  c.strokeStyle = col.coast; c.lineWidth = 2.4; c.beginPath(); path(world.land); c.stroke();
}
// "Three papers": a grey card sea, a whiter sheet of land, terracotta for where he has been, each
// layer throwing a soft shadow on the one below; no outlines, scored borders
function paintCut(c, path, world, visited, col, firstOf, y, hover) {
  c.fillStyle = col.sea; c.fillRect(0, 0, TW, TH);
  const shadow = (draw, dx, dy, blur, a) => {
    c.save(); c.filter = `blur(${blur}px)`; c.globalAlpha = a; c.fillStyle = col.ink;
    c.translate(dx, dy); c.beginPath(); draw(); c.fill(); c.restore();
  };
  shadow(() => path(world.land), 5, 7, 7, 0.22);
  c.fillStyle = col.land; c.beginPath(); path(world.land); c.fill();
  const been = visited.filter((f) => firstOf[f.id] <= y);
  shadow(() => been.forEach((f) => path(f)), 4, 6, 6, 0.28);
  for (const f of been) { c.fillStyle = f.id === hover ? col.beenOn : col.been; c.beginPath(); path(f); c.fill(); }
  c.strokeStyle = col.score; c.lineWidth = 1.2; c.beginPath(); path(world.borders); c.stroke();
}

/* ------------------------------------------------------------ the plane, a small paper cut-out */

function planeShape() {
  const half = [[9, 0], [6.5, -1.1], [2, -1.1], [-2.5, -7.5], [-4.3, -7.5], [-1.8, -1.1], [-6, -1.1], [-7.8, -3.6], [-9, -3.6], [-8, 0]];
  const pts = half.concat(half.slice(1, -1).reverse().map(([x, y]) => [x, -y]));
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x / 9, y / 9)));
  return new THREE.ShapeGeometry(s);
}

/* ------------------------------------------------------------ the map */

let live = null;   // the one globe on the page (a language switch builds the page again)

window.JourneyMap = async function makeGlobe(svgEl) {
  if (live) live.dispose();
  const fig = svgEl.closest('.jr-map');
  const box = document.createElement('div');
  box.className = 'g3';
  svgEl.after(box);

  const colours = {
    sea: rgb('--paper'), land: rgb('--paper-2'), been: rgb('--been'), beenOn: rgb('--been-on'),
    hair: rgb('--hair'), coast: rgb('--ink-3'), ink: rgb('--ink'), ink2: rgb('--ink-2'), route: rgb('--route'),
    edge: rgb('oklch(74% 0.05 50)'),
  };
  if (CFG.paint === 'chart') Object.assign(colours, {
    sea: rgb('oklch(92.5% 0.018 235)'), water: rgb('oklch(82% 0.03 235)'), coast: rgb('oklch(42% 0.02 240)'),
    land: rgb('--paper'), been: rgb('oklch(87% 0.045 55)'), beenOn: rgb('oklch(83% 0.06 50)'), edge: rgb('oklch(74% 0.05 50)'),
    hair: rgb('oklch(70% 0.02 240)'),
  });
  if (CFG.paint === 'cut') Object.assign(colours, {
    sea: rgb('oklch(90% 0.015 75)'), land: rgb('oklch(97% 0.005 85)'), been: rgb('oklch(80% 0.07 45)'),
    beenOn: rgb('oklch(75% 0.09 42)'), edge: rgb('oklch(66% 0.08 42)'), score: rgb('oklch(88% 0.012 75)'),
  });
  const [world] = await Promise.all([K.world(), reliefP]);
  const paint = painter(world, colours);

  // the facts, as journey.js has them
  const HOME_ID = S.countries.find((c) => K.km(c.ll, S.flightsFrom) < 80)?.id || 'taiwan';
  const firstYear = {};
  for (const t of K.trips) for (const c of t.countries) firstYear[c.id] = Math.min(firstYear[c.id] || 9999, +t.year);
  firstYear[HOME_ID] = 0;
  const isoFirst = {};
  for (const [id, y] of Object.entries(firstYear)) if (K.ISO[id]) isoFirst[K.ISO[id]] = y;
  const idOf = Object.fromEntries(Object.entries(K.ISO).map(([id, iso]) => [iso, id]));
  const latest = (iso) => K.trips.find((t) => t.countries.some((c) => c.id === idOf[iso]));
  const visitedF = world.countries.filter((f) => K.visitedIso.has(f.id));

  /* the renderer, the camera, the light */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(20, 1, 0.05, 100);
  scene.add(camera);
  // soft paper light: most of it even, a little from the upper left, so the globe reads as round
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI * 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, Math.PI * 0.5);
  sun.position.set(-1.6, 1.4, 2.2);
  camera.add(sun);
  const group = new THREE.Group();
  scene.add(group);

  /* the sheet */
  const canvases = [0, 1].map(() => Object.assign(document.createElement('canvas'), { width: TW, height: TH }));
  const texes = canvases.map((cv) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  });
  const masks = CFG.raise ? [0, 1].map(() => Object.assign(document.createElement('canvas'), { width: 2048, height: 1024 })) : null;
  const maskTex = masks ? masks.map((cv) => { const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; return t; }) : null;
  let front = 0;

  const U = {
    uKx: { value: 0 }, uKy: { value: 0 }, uR: { value: R }, uCenter: { value: START * RAD },
    uRaise: { value: CFG.raise || 0 }, uMix: { value: 1 }, uLit: { value: 0 },
    uPrev: { value: texes[1] }, uBack: { value: new THREE.Color(colours.land) },
    uWave: { value: CFG.wave ? 1 : 0 }, uFold: { value: 0 }, uHome: { value: new THREE.Vector2(HOME_LL[0] * RAD, HOME_LL[1] * RAD) },
    uRise: { value: CFG.rise ? 1 : 0 }, uReveal: { value: CFG.rise && !K.reduced ? 0 : 1 },
    uPlate: { value: CFG.plate ? 1 : 0 }, uWalls: { value: CFG.walls ? 1 : 0 }, uEdge: { value: new THREE.Color(colours.edge) },
    uMask: { value: maskTex ? maskTex[0] : texes[0] }, uMaskPrev: { value: maskTex ? maskTex[1] : texes[0] },
  };
  const mat = new THREE.MeshLambertMaterial({
    map: texes[0], side: THREE.DoubleSide, flatShading: !!CFG.raise,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  if (CFG.relief) {
    const bump = new THREE.Texture(reliefImg); bump.needsUpdate = true; bump.wrapS = THREE.RepeatWrapping;
    mat.bumpMap = bump; mat.bumpScale = 1.4;
  }
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${MORPH}`)
      .replace('#include <beginnormal_vertex>', 'vec3 nrm; float rz = raiseAt(uv); vQ = uv; vRz = uRaise > 0.0 ? rz / uRaise : 0.0;\nvec3 morphed = sheet(uv, rz, nrm);\nvec3 objectNormal = nrm;')
      .replace('#include <begin_vertex>', 'vec3 transformed = morphed;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uPrev; uniform float uMix, uLit, uPlate, uFold, uWalls; uniform vec3 uBack, uEdge; varying vec2 vQ; varying float vRz;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        #ifdef USE_MAP
          diffuseColor.rgb = mix(texture2D(uPrev, vMapUv).rgb, diffuseColor.rgb, uMix);
        #endif
        // the printed plate: on arrival the map is trimmed to its band, 80N to 56S
        if (uPlate > 0.5) { float la = (vQ.y - 0.5) * 180.0, o = smoothstep(0.15, 0.6, uFold); if (la > mix(80.0, 91.0, o) || la < mix(-56.0, -91.0, o)) discard; }
        // the cut sides of a raised country, a deeper clay than its top
        if (uWalls > 0.5) { float wall = smoothstep(0.04, 0.25, vRz) * (1.0 - smoothstep(0.75, 0.96, vRz)); diffuseColor.rgb = mix(diffuseColor.rgb, uEdge * 0.92, wall * 0.75); }
        if (!gl_FrontFacing) diffuseColor.rgb = uBack;`)
      .replace('#include <opaque_fragment>', 'outgoingLight = mix(diffuseColor.rgb, outgoingLight, uLit);\n#include <opaque_fragment>');
  };
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, ...CFG.seg), mat);
  // the grid's own corners stand in for the uv: the shader places every point itself
  sheet.geometry.attributes.position.array.fill(0);
  sheet.frustumCulled = false;
  group.add(sheet);

  /* lines: one fat-line set per kind, rebuilt as the sheet bends */
  const res = new THREE.Vector2(1, 1);
  const lineSet = (colour, width, opacity) => {
    const m = new LineMaterial({ color: new THREE.Color(colour), linewidth: width, transparent: true, opacity, resolution: res });
    const l = new LineSegments2(new LineSegmentsGeometry(), m);
    l.frustumCulled = false;
    group.add(l);
    return l;
  };
  const sets = {
    grat: lineSet(colours.hair, 1, 0),
    fly: lineSet(colours.route, 1.5, 1),
    past: lineSet(colours.ink2, 1, 0),
    here: lineSet(colours.ink2, 1.3, 0),
    now: lineSet(colours.route, 2.4, 0),
    plate: lineSet(colours.ink2, 1, CFG.plate ? 0.9 : 0),
  };
  sets.now.renderOrder = 2;

  /* dots and planes */
  const disc = new THREE.CircleGeometry(1, 24), ring = new THREE.RingGeometry(0.62, 1, 32);
  const basic = (colour, extra = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(colour), side: THREE.DoubleSide, transparent: true, depthWrite: false, ...extra });
  const dot = (fill, edge, r) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(disc, basic(fill)), new THREE.Mesh(ring, basic(edge)));
    g.children[0].renderOrder = 3; g.children[1].renderOrder = 4;
    g.r = r; group.add(g);
    return g;
  };

  // one flight from Taiwan to each country he has been to
  const home = ll(S.flightsFrom);
  const flights = S.countries.filter((c) => c.id !== HOME_ID).map((c) => {
    const km = K.km(S.flightsFrom, c.ll);
    return { c, to: ll(c.ll), go: d3.geoInterpolate(home, ll(c.ll)), d: d3.geoDistance(home, ll(c.ll)), first: firstYear[c.id], dur: 1700 + Math.min(1, km / 13000) * 3600, p: 0, end: dot(colours.sea, colours.route, 0.011), plane: null, ringM: null };
  });
  flights.forEach((f) => { f.end.visible = false; });
  const longest = Math.max(...flights.map((f) => f.dur));
  const homeDot = dot(colours.ink, colours.ink, 0.012);
  const stops = [];
  const planeGeo = planeShape();

  /* the state */
  const st = { fold: 0, want: 0, kx: 0, ky: 0, center: START, spin: [121, 23.5], tilt: 0, drag: [0, 0], drop: CFG.rise && !K.reduced ? 1 : 0 };
  let year = Infinity, hereYear = null, nowTrip = null, hover = null, flying = false;
  const ops = { grat: 0, fly: 1, past: 0, here: 0, now: 0 }, opsNow = { ...ops };
  let rewound = false;

  const facing = () => [START + turnBy(START, st.spin[0] + st.drag[0]) * st.fold, clamp(st.spin[1] + st.drag[1], -60, 60) * st.fold];

  // the lift of a flight's arc at t along it: a little for the short hops, more for the long ones
  const arcH = (d, t) => CFG.lift * (CFG.wave ? 1 + 2.4 * Math.sin(Math.PI * st.fold) : 1) * Math.min(1, d / 1.4 + 0.25) * Math.sin(Math.PI * t);
  const base = (CFG.raise || 0) + 0.004;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  function arcPoints(go, d, upto, out, h0 = base, lifted = true) {
    const n = Math.max(8, Math.ceil(64 * upto));
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * upto;
      const p = go(t);
      const q = place(p[0], p[1], h0 + (lifted ? arcH(d, t) : 0), st, new THREE.Vector3());
      if (prev && Math.abs(q.lonR - prev.lonR) < 180) out.push(prev.x, prev.y, prev.z, q.x, q.y, q.z);
      prev = q;
    }
  }
  function setLines(l, arr) {
    if (!arr.length) { l.visible = false; return; }
    l.visible = true;
    l.geometry.dispose();
    l.geometry = new LineSegmentsGeometry().setPositions(arr);
  }
  const legGo = (l) => { const c = K.legGeo(l).coordinates; return { go: d3.geoInterpolate(c[0], c[1]), d: d3.geoDistance(c[0], c[1]), flight: l.mode === 'flight' }; };
  const allLegs = K.trips.flatMap((t) => t.legs.map((l) => ({ t, ...legGo(l) })));

  // the plate's frame on arrival: a neatline round the band and a tick every 30 degrees
  function plateLines() {
    const out = [], z = R + 0.002, x0 = -Math.PI * R, x1 = Math.PI * R, y0 = -56 * RAD * R, y1 = 80 * RAD * R, t = 0.025;
    out.push(x0, y0, z, x1, y0, z, x1, y0, z, x1, y1, z, x1, y1, z, x0, y1, z, x0, y1, z, x0, y0, z);
    for (let lon = -180 + 30; lon < 180; lon += 30) { const x = lon * RAD * R; out.push(x, y1, z, x, y1 + t, z, x, y0, z, x, y0 - t, z); }
    for (let lat = -30; lat <= 60; lat += 30) { const y = lat * RAD * R; out.push(x0, y, z, x0 - t, y, z, x1, y, z, x1 + t, y, z); }
    return out;
  }
  function buildLines() {
    if (CFG.plate) {
      const a = clamp(1 - st.fold * 6, 0, 1) * 0.9;
      if (a > 0.01) { if (!sets.plate.visible || !sets.plate.geometry.attributes.instanceStart) setLines(sets.plate, plateLines()); sets.plate.visible = true; sets.plate.material.opacity = a; } else sets.plate.visible = false;
    }
    // the graticule, every 30 degrees, coming in as the sheet closes
    if (opsNow.grat > 0.01) {
      const g = [];
      for (let lon = -180; lon < 180; lon += 30) arcPoints((t) => [lon, -80 + 160 * t], 0, 1, g, base * 0.5, false);
      for (let lat = -60; lat <= 60; lat += 30) arcPoints((t) => [-180 + 360 * t, lat], 0, 1, g, base * 0.5, false);
      setLines(sets.grat, g);
    } else sets.grat.visible = false;
    const fly = [];
    if (opsNow.fly > 0.01) for (const f of flights) if (f.p > 0 && f.first <= year) arcPoints(f.go, f.d, f.p, fly);
    setLines(sets.fly, fly);
    const past = [], here = [], now = [];
    if (rewound || opsNow.past > 0.01) {
      for (const L of allLegs) {
        if (+L.t.year > year) continue;
        const out = L.t === nowTrip ? now : +L.t.year === hereYear ? here : past;
        arcPoints(L.go, L.d, 1, out, base, L.flight);
      }
    }
    setLines(sets.past, past); setLines(sets.here, here); setLines(sets.now, now);
    for (const k of Object.keys(ops)) if (sets[k].material.opacity !== opsNow[k]) sets[k].material.opacity = opsNow[k];
  }

  // a dot or a plane laid on the surface at a place, facing out
  const look = new THREE.Matrix4(), xa = new THREE.Vector3(), ya = new THREE.Vector3(), za = new THREE.Vector3();
  function lay(obj, lon, lat, h, scale, ahead) {
    place(lon, lat, h, st, tmp);
    obj.position.copy(tmp);
    place(lon, lat, h + 0.05, st, tmp2);
    za.subVectors(tmp2, tmp).normalize();
    if (ahead) { place(ahead[0], ahead[1], ahead[2], st, tmp2); xa.subVectors(tmp2, tmp); } else xa.set(1, 0, 0);
    xa.addScaledVector(za, -xa.dot(za)).normalize();
    ya.crossVectors(za, xa);
    look.makeBasis(xa, ya, za);
    obj.quaternion.setFromRotationMatrix(look);
    obj.scale.setScalar(scale);
  }
  function placeMarks() {
    for (const f of flights) { f.end.visible = f.end.on && f.first <= year && !rewound; if (f.end.visible) lay(f.end, ...f.to, base + 0.001, f.end.r); }
    lay(homeDot, ...home, base + 0.002, homeDot.r);
    stops.forEach((s) => { s.visible = rewound; lay(s, ...s.at, base + 0.002, s.r); });
  }

  /* the frame: where on the canvas the drawing sits, and how big */
  let W = 1, H = 1;
  const fit = new ResizeObserver(() => {
    const r = box.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    res.set(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
    for (const l of Object.values(sets)) l.material.resolution.copy(res);
    kick();
  });
  fit.observe(box);
  function target() {
    const b = box.getBoundingClientRect();
    if (getComputedStyle(box).position !== 'fixed') return { x: 0, y: 0, w: W, h: H };
    const fr = fig.getBoundingClientRect(), cs = getComputedStyle(fig);
    const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
    return { x: fr.left + pl - b.left, y: fr.top + pt - b.top, w: fr.width - pl - pr, h: fr.height - pt - pb };
  }
  function frameCamera() {
    const f = st.fold, r = target();
    // the world's frame: the flat map's band (80N to 56S, all the way round) or the globe and its air
    const s1 = CFG.frame1 || 2.3;
    const fw = (2 * Math.PI * 1.01) * (1 - f) + s1 * f, fh = (136 * RAD * 1.06) * (1 - f) + s1 * f;
    const cy = 12 * RAD * (1 - f), plane = R * (1 - f) + 0.25 * f;
    const ppw = Math.min(r.w / fw, r.h / fh);
    const fov = camera.fov * RAD;
    const d = (H / ppw) / (2 * Math.tan(fov / 2));
    const lookDown = (CFG.look || 0) * f + (CFG.wave ? 0.5 * Math.sin(Math.PI * f) : 0);
    camera.aspect = W / H;
    camera.position.set(0, cy + Math.sin(lookDown) * d, plane + Math.cos(lookDown) * d);
    camera.lookAt(0, cy, plane);
    camera.updateProjectionMatrix();
    // a lens shift, so the frame's middle lands in the middle of the box it is given
    const tx = ((r.x + r.w / 2) / W) * 2 - 1, ty = 1 - ((r.y + r.h / 2) / H) * 2;
    camera.projectionMatrix.elements[8] = -tx;
    camera.projectionMatrix.elements[9] = -ty;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  /* drawing: only when something moved */
  const tweens = new Set();
  let raf = 0, linesDirty = true;
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  // while the map's own box is changing size in CSS (a variation moves the globe aside), keep drawing
  let moving = 0;
  fig.addEventListener('transitionrun', (e) => { if (e.target === fig) { moving++; kick(); } });
  const still = (e) => { if (e.target === fig) moving = Math.max(0, moving - 1); };
  fig.addEventListener('transitionend', still);
  fig.addEventListener('transitioncancel', still);
  function frame(now) {
    raf = 0;
    for (const tw of [...tweens]) if (tw(now) === false) tweens.delete(tw);
    // the fold carries a little weight: it follows the scroll instead of jumping with it
    if (CFG.wave && st.fold !== st.want) { const d = st.want - st.fold; st.fold = Math.abs(d) < 0.0008 ? st.want : st.fold + d * 0.11; linesDirty = true; }
    U.uFold.value = st.fold;
    for (const k of Object.keys(ops)) {
      const d = ops[k] - opsNow[k];
      if (Math.abs(d) > 0.003) { opsNow[k] += d * 0.14; linesDirty = true; } else if (opsNow[k] !== ops[k]) { opsNow[k] = ops[k]; linesDirty = true; }
    }
    const [kx, ky] = bends(st.fold);
    const [c, tl] = facing();
    if (kx !== st.kx || ky !== st.ky || c !== st.center || tl !== st.tilt) linesDirty = true;
    st.kx = kx; st.ky = ky; st.center = c; st.tilt = tl;
    U.uKx.value = kx; U.uKy.value = ky; U.uCenter.value = c * RAD;
    U.uLit.value = CFG.rise ? Math.max(st.fold, 0.7) : st.fold;
    const off = c / 360;
    for (const t of texes) t.offset.x = off;
    if (mat.bumpMap) mat.bumpMap.offset.x = off;
    group.rotation.x = tl * RAD - 0.32 * st.drop * st.drop;
    group.position.set(0, -0.25 * st.drop, 0.5 * st.drop);
    group.updateMatrixWorld();
    if (linesDirty) { buildLines(); placeMarks(); linesDirty = false; }
    frameCamera();
    // drawn only inside the map's own box, as the SVG was
    const r = target();
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    renderer.setScissor(r.x, H - r.y - r.h, r.w, r.h);
    renderer.render(scene, camera);
    if (moving || st.fold !== st.want || tweens.size || Object.keys(ops).some((k) => opsNow[k] !== ops[k])) kick();
  }
  const tween = (dur, step) => new Promise((done) => {
    const t0 = performance.now();
    tweens.add((now) => { const k = clamp((now - t0) / dur, 0, 1); step(k); if (k >= 1) { done(); return false; } return true; });
    kick();
  });

  /* the painted world: a new state crossfades in over the last */
  let painting = 0;
  function repaint(fade = true) {
    const back = front ^ 1;
    paint(canvases[back], isoFirst, year, hover);
    texes[back].needsUpdate = true;
    if (masks) { paint(masks[back], isoFirst, year, null, true); maskTex[back].needsUpdate = true; }
    mat.map = texes[back]; U.uPrev.value = texes[front];
    if (masks) { U.uMask.value = maskTex[back]; U.uMaskPrev.value = maskTex[front]; }
    front = back;
    const id = ++painting;
    if (!fade || K.reduced) { U.uMix.value = 1; kick(); return; }
    U.uMix.value = 0;
    tween(600, (k) => { if (id === painting) U.uMix.value = ease(k); });
  }
  repaint(false);
  // the second texture starts as the first, so the first crossfade has something to come from
  paint(canvases[1], isoFirst, year, hover); texes[1].needsUpdate = true;
  if (masks) { paint(masks[1], isoFirst, year, null, true); maskTex[1].needsUpdate = true; }

  /* the turn to a trip */
  let turnId = 0;
  function face(lonlat) {
    const to = [lonlat[0], clamp(lonlat[1], -35, 35)];
    to[0] = st.spin[0] + turnBy(st.spin[0], to[0]);
    const from = st.spin.slice(), drag0 = st.drag.slice();
    const id = ++turnId;
    if (K.reduced || st.fold === 0) { st.spin = to; st.drag = [0, 0]; kick(); return; }
    tween(1100, (k) => {
      if (id !== turnId) return;
      const e = ease(k);
      st.spin = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
      st.drag = [drag0[0] * (1 - e), drag0[1] * (1 - e)];
    });
  }

  /* pointing at it: a country he has been to opens its latest trip; a drag turns the globe */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), inv = new THREE.Matrix4();
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    inv.copy(group.matrixWorld).invert();
    const o = ray.ray.origin.clone().applyMatrix4(inv), dir = ray.ray.direction.clone().transformDirection(inv);
    let lon, lat;
    if (st.fold < 0.5) {
      const t = (R - o.z) / dir.z;
      if (!(t > 0)) return null;
      const x = o.x + dir.x * t, y = o.y + dir.y * t;
      lon = st.center + x / R / RAD; lat = y / R / RAD;
    } else {
      const b = o.dot(dir), c = o.lengthSq() - R * R, disc2 = b * b - c;
      if (disc2 < 0) return null;
      const p = o.addScaledVector(dir, -b - Math.sqrt(disc2));
      lat = Math.asin(clamp(p.y / R, -1, 1)) / RAD; lon = st.center + Math.atan2(p.x, p.z) / RAD;
    }
    if (Math.abs(lat) > 90) return null;
    lon = ((lon + 540) % 360) - 180;
    const f = visitedF.find((g) => d3.geoContains(g, [lon, lat]));
    return f && latest(f.id) && isoFirst[f.id] <= year ? f : null;
  }
  const cv = renderer.domElement;
  let down = null;
  cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, drag: st.drag.slice(), moved: false }; });
  addEventListener('pointerup', () => { if (down && down.moved) cv.style.cursor = ''; setTimeout(() => { down = null; }, 0); });
  cv.addEventListener('pointermove', (e) => {
    if (down && e.buttons && st.fold > 0.8) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) < 5) return;
      down.moved = true;
      cv.style.cursor = 'grabbing';
      const per = 180 / Math.max(200, target().h);
      st.drag = [down.drag[0] - dx * per, down.drag[1] + dy * per];
      turnId++;
      kick();
      return;
    }
    const f = pick(e);
    const id = f ? f.id : null;
    cv.style.cursor = id ? 'pointer' : st.fold > 0.8 ? 'grab' : '';
    if (id !== hover && matchMedia('(hover: hover)').matches) { hover = id; repaint(false); }
  });
  cv.addEventListener('pointerleave', () => { if (hover) { hover = null; repaint(false); } });
  cv.addEventListener('click', (e) => {
    if (down && down.moved) return;
    const f = pick(e);
    if (!f) return;
    const t = latest(f.id);
    if (t.legs.length) { location.href = `../wc-sketch/trip/?trip=${encodeURIComponent(t.id)}&from=${location.pathname.split('/').pop().replace('.html', '')}`; return; }
    document.getElementById(`t-${t.id}`)?.scrollIntoView({ behavior: K.reduced ? 'auto' : 'smooth', block: 'center' });
  });

  /* the six words journey.js speaks */
  function setFold(a) {
    a = K.reduced ? (a < 0.5 ? 0 : 1) : a;
    if (CFG.wave && !K.reduced) { if (Math.abs(a - st.want) < 0.0005) return; st.want = a; }
    else { if (Math.abs(a - st.fold) < 0.0005) return; st.fold = a; st.want = a; }
    ops.grat = rewound || a > 0 ? 0.55 * a : 0;
    kick();
  }
  function trip(t) {
    if (t === nowTrip) return;
    nowTrip = t;
    stops.forEach((s) => group.remove(s));
    stops.length = 0;
    if (t) for (const s of t.stops) { const d = dot(colours.sea, colours.route, 0.0095); d.at = ll(s.at.ll); stops.push(d); }
    linesDirty = true;
    const where = (tt) => d3.geoCentroid({ type: 'MultiPoint', coordinates: tt.countries.map((c) => ll(c.ll)) });
    face(t && t.countries.length ? where(t) : where(K.trips[0]));
  }
  function at(y, here) {
    const was = year;
    year = y; hereYear = here; rewound = y !== Infinity;
    ops.fly = rewound ? 0 : 1; ops.past = rewound ? 0.32 : 0; ops.here = rewound ? 0.45 : 0; ops.now = rewound ? 1 : 0;
    linesDirty = true;
    if (was !== y) repaint();
    kick();
  }
  async function forward() {
    // his countries come back in the order he first went
    const ys = [...new Set(Object.values(isoFirst))].sort((a, b) => a - b).filter((v) => v > year);
    rewound = false; hereYear = null;
    ops.past = 0; ops.here = 0; ops.now = 0;
    for (const v of ys) {
      if (K.reduced) break;
      year = v; repaint(); linesDirty = true;
      await new Promise((ok) => setTimeout(ok, 160));
      if (year !== v) return;   // the reader went back meanwhile
    }
    year = Infinity; ops.fly = 1; repaint(); linesDirty = true; kick();
  }

  function settled(onLand) {
    flights.forEach((f) => { f.p = 1; f.end.on = true; });
    U.uReveal.value = 1; st.drop = 0;
    linesDirty = true; kick();
    onLand(flights.length, true, 1);
  }
  function flyOut(onLand) {
    if (K.reduced) { settled(onLand); return; }
    flying = true;
    const planes = flights.map((f) => { const m = new THREE.Mesh(planeGeo, basic(colours.ink, { opacity: 1 })); m.visible = false; group.add(m); return m; });
    const rings = flights.map(() => { const m = new THREE.Mesh(ring, basic(colours.route, { opacity: 0 })); m.visible = false; group.add(m); return m; });
    // the plate is laid down on the table first, then the planes leave
    const lay0 = st.drop > 0 ? 650 : 0;
    if (st.drop > 0) tween(1100, (k) => { st.drop = 1 - ease(k); });
    const t0 = performance.now() + lay0;
    let landed = -1;
    tweens.add((now) => {
      const el = now - t0;
      if (el < 0) return true;
      let busy = false, n = 0;
      flights.forEach((f, i) => {
        const t = clamp(el / f.dur, 0, 1);
        f.p = ease(t);
        const pl = planes[i];
        if (t >= 1) { n++; pl.visible = false; f.end.on = true; } else {
          busy = true;
          const e = f.p, g = f.go(e), g2 = f.go(Math.min(1, e + 0.01));
          pl.visible = true;
          lay(pl, g[0], g[1], base + arcH(f.d, e) + 0.004, 0.032, [g2[0], g2[1], base + arcH(f.d, Math.min(1, e + 0.01)) + 0.004]);
        }
        const k = (el - f.dur) / 1200, rg = rings[i];
        if (k < 0 || k > 1) rg.visible = false; else {
          busy = true; rg.visible = true;
          rg.material.opacity = 1 - k;
          lay(rg, ...f.to, base + 0.003, 0.011 + k * 0.05);
        }
      });
      linesDirty = true;
      const p = clamp(el / longest, 0, 1);
      if (CFG.rise) U.uReveal.value = p;
      if (n !== landed || p < 1) { landed = n; onLand(n, false, p); }
      if (!busy) {
        planes.concat(rings).forEach((m) => { group.remove(m); m.material.dispose(); });
        flying = false;
        onLand(flights.length, true, 1);
        return false;
      }
      return true;
    });
    kick();
  }

  live = {
    dispose() {
      cancelAnimationFrame(raf); fit.disconnect();
      renderer.dispose(); box.remove();
    },
  };
  trip(null);
  kick();
  return { flyOut, settled, at, forward, trip, setFold };
};

// the page itself comes after: journey.js asks for window.JourneyMap when it builds the map
const js = document.createElement('script');
js.src = 'journey.js';
document.body.appendChild(js);
