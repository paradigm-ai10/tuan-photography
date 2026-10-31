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
     gores   a painted paper globe; the map is cut into twelve strips that close round Taiwan
     gallery the same globe; the map is a wall of square prints that lift off and settle on the ball
             (the live page since 2026-10-31; gallery-backs, -edges and -ring bring his photographs in)

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
// the globemaker's globe (see gores below), shared by its photograph variations
const GORE = { lift: 0.03, seg: [720, 360], frame1: 3.05, look: 0.3, paint: 'globe', wave: true, gores: true, rise: true, pen: true, unlit: true, bleed: true, gloss: true, noGrat: true };
const GALLERY = { ...GORE, gores: false, tiles: [24, 12] };
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
  // the photographic round (2026-10-29): every country he has been to is filled with his own
  // photograph from there, and develops from blank paper into it as its plane lands
  // the earth round (2026-10-30): a real-looking earth (terrain relief, land coloured by climate,
  // deep sea with shallows and sun glint, ice, drifting clouds, a blue atmosphere); the map fills
  // the whole page edge to edge and its edges fade into the paper, so the page itself wraps up
  earth: { lift: 0.09, seg: [720, 360], raise: 0.01, soft: 4, frame1: 3.05, look: 0.3, paint: 'earth', wave: true, rise: true, unlit: true, earth: true, bleed: true },
  // the night-before-review round (2026-10-30): the live paper globe with A4's movement and the
  // whole page wrapping; and a designed globe in the site's own inks (deep ink sea, paper land)
  paperwrap: { lift: 0.08, seg: [720, 360], raise: 0.018, soft: 4, frame1: 3.05, look: 0.3, wave: true, rise: true, unlit: true, bleed: true },
  ink: { lift: 0.09, seg: [720, 360], raise: 0.012, soft: 4, frame1: 3.05, look: 0.3, paint: 'ink', wave: true, rise: true, unlit: true, earth: true, bleed: true, noClouds: true },
  photo: { lift: 0.08, seg: [720, 360], raise: 0.014, soft: 4, frame1: 3.05, look: 0.3, paint: 'photo', wave: true, rise: true, develop: true, unlit: true },
  // the globemaker's round (2026-10-30, from his references: Bellerby & Co's hand-painted globes and
  // the gores they are made of): a globe printed on paper and tinted in watercolour; on arrival the
  // routes are drawn in ink and each country takes its wash as its line lands; the fold cuts the map
  // into twelve strips that close round Taiwan one by one, as a globemaker pastes them on the ball
  gores: GORE,
  // his photographs in the transition (2026-10-31, his ask: "add some photos ... to enrich the display"):
  // through  the map was printed over the trip's photograph: the cuts open onto it, and it is there,
  //          whole, when the globe has closed (the same photograph the reading then shows behind it)
  // prints   a desk of small prints, one per trip, lies under the map; the strips lift off them and
  //          the globe closes in the middle of them
  // backs    each strip has one of his photographs printed on its back, seen as it swings round
  'gores-through': { ...GORE, photos: 'through' },
  'gores-prints': { ...GORE, photos: 'prints' },
  'gores-backs': { ...GORE, photos: 'backs' },
  // the gallery round (2026-10-31, his ask: a smoother change than the strips, "the feeling of galleries
  // folding into the globe", after photoooooos' wall of prints that gathers into a ball): the same globe,
  // its map printed across a wall of small square prints, 24 across and 12 down; scrolling lifts each
  // print off the wall whole and lays it on the ball, Taiwan's first, and the gaps close as they land
  gallery: GALLERY,
  // his photographs in the print wall (2026-10-31, his ask: "some images design"):
  // backs  every print is two-sided, the map on its face and one of his photographs on its back,
  //        seen as the prints turn over on their way round to the far side of the ball
  // edges  the prints along the wall's faded top and bottom are his photographs: they come up out of
  //        the paper as they lift off, and turn to map as they are laid on the ball's ends
  // ring   one print per trip lifts off the wall where that trip went and hangs in a ring round the
  //        closed globe; the trip being read turns to the bottom of the ring, a little larger
  'gallery-backs': { ...GALLERY, photos: 'tileBacks' },
  'gallery-edges': { ...GALLERY, photos: 'tileEdges' },
  'gallery-ring': { ...GALLERY, photos: 'ring' },
  // scatter  backs, made plain to see: each print is tossed higher and a little aside, and turns
  //          right over in flight about its own slant, lingering photograph up, then lands map up
  'gallery-scatter': { ...GALLERY, photos: 'tileBacks', flip: true, tileLift: 0.5, scatter: 0.1 },
}[V];
const HOME_LL = [S.flightsFrom[1], S.flightsFrom[0]];
const CRAFT = 'craft' in document.body.dataset;

const R = 1;
const START = 150;                 // the flat map is centred on the Pacific, Taiwan in view (as before)
const TAU = Math.PI * 2, RAD = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// a CSS cubic-bezier as a function of time, for the entrances (strong ease-out, 0.23 1 0.32 1)
function bezier(x1, y1, x2, y2) {
  const f = (a, b, t) => ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t;
  return (x) => { let lo = 0, hi = 1, t = x; for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (f(x1, x2, t) < x) lo = t; else hi = t; } return f(y1, y2, t); };
}
const easeOut = bezier(0.23, 1, 0.32, 1);
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
// the gores: twelve strips, 30 degrees wide, the middle one centred on Taiwan (GORE0, as a share of the
// sheet's width). Through the first fifth of the fold the knife narrows each strip towards its tips;
// then each closes onto the ball on its own clock, Taiwan's first and the far side last, each pressed
// down from its waist to its tips. The shader does the same sums for the sheet.
const GORES = 12, GORE0 = 0.5 + ((HOME_LL[0] - START + 540) % 360 - 180) / 360;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function gorePlace(q, b, h, f, out) {
  const g = GORE0 + Math.floor((q - GORE0) * GORES + 0.5) / GORES;
  const a = (q - 0.5) * TAU, gc = (g - 0.5) * TAU, dl = a - gc;
  const xf = gc + dl * (1 + (Math.cos(b) - 1) * smooth(0, 0.2, f));
  const dg = Math.abs(g - GORE0), far = Math.min(dg, 1 - dg) * 2;   // 0 at Taiwan's strip, 1 on the far side
  const k = clamp(((f - 0.16) / 0.84) * 1.95 - far * 0.62 - (Math.abs(b) / (Math.PI / 2)) * 0.28, 0, 1), w = k * k * (3 - 2 * k);
  const sx = Math.cos(b) * Math.sin(a) * R * (1 + h), sy = Math.sin(b) * R * (1 + h), sz = Math.cos(b) * Math.cos(a) * R * (1 + h);
  const fx = xf * R, fy = b * R, fz = R + h * R;
  return out.set(fx + (sx - fx) * w, fy + (sy - fy) * w, fz + (sz - fz) * w);
}
// the gallery: the sheet is a wall of square prints (CFG.tiles across and down). On arrival it is one
// whole map; the first of the scroll opens a thin line of paper between the prints. Each print keeps its own clock, Taiwan's first and the far side last: it lifts off the wall
// whole, travels and turns to face out from its place on the ball, narrowing to the ball's width
// there, and is pressed down onto it as it lands, the gaps closing. The shader does the same sums.
const TILES = CFG.tiles || [1, 1], TILE_GAP = 0.06, TILE_LIFT = CFG.tileLift || 0.3, TILE_FLIP = CFG.flip ? 1 : 0, TILE_SCATTER = CFG.scatter || 0;
// (scatter) each print's own slant, from its place on the wall; the shader works it out the same way
const tileSlant = (c, r) => ((c * 7 + r * 13) * 2.39996) % TAU;
const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10);
function tilePlace(q, b, h, f, center, out) {
  const [cols, rows] = TILES, qy = b / Math.PI + 0.5;
  const ac = ((Math.min(cols - 1, Math.floor(q * cols)) + 0.5) / cols - 0.5) * TAU;
  const bc = ((Math.min(rows - 1, Math.max(0, Math.floor(qy * rows))) + 0.5) / rows - 0.5) * Math.PI;
  const hp = HOME_LL[1] * RAD, dh = ac + center - HOME_LL[0] * RAD;
  const d = Math.acos(clamp(Math.sin(bc) * Math.sin(hp) + Math.cos(bc) * Math.cos(hp) * Math.cos(dh), -1, 1)) / Math.PI;
  const s = smoother(clamp(f * 1.6 - d * 0.6, 0, 1));
  const gap = TILE_GAP * smooth(0, 0.1, f) * (1 - smooth(0.78, 1, s));
  const ox = ((q - 0.5) * TAU - ac) * (1 - gap), oy = (b - bc) * (1 - gap);
  const ya = ac * s, pa = bc * s, lift = TILE_LIFT * Math.sin(Math.PI * s), wx = 1 + (Math.cos(bc) - 1) * s;
  const nx = Math.cos(pa) * Math.sin(ya), ny = Math.sin(pa), nz = Math.cos(pa) * Math.cos(ya);
  const ex = Math.cos(ya), ez = -Math.sin(ya), mx = -Math.sin(pa) * Math.sin(ya), my = Math.cos(pa), mz = -Math.sin(pa) * Math.cos(ya);
  let cx = ac * R + (Math.cos(bc) * Math.sin(ac) - ac) * R * s + nx * lift, cy = bc * R + (Math.sin(bc) - bc) * R * s + ny * lift, cz = R + (Math.cos(bc) * Math.cos(ac) - 1) * R * s + nz * lift;
  let X = ox * wx * R, Y = oy * R, Z = h * R;
  if (TILE_FLIP) {
    // tossed: pushed a little aside along its slant, and turned one whole time about it, slowest
    // while its back (the photograph) is up
    const ph = tileSlant(Math.min(cols - 1, Math.floor(q * cols)), Math.min(rows - 1, Math.max(0, Math.floor(qy * rows))));
    const kx = Math.cos(ph), ky = Math.sin(ph), t = smooth(0.04, 0.72, s), th = TAU * t + 0.6 * Math.sin(TAU * t);
    const co = Math.cos(th), sn = Math.sin(th), kv = kx * X + ky * Y, dr = TILE_SCATTER * R * Math.sin(Math.PI * s);
    [X, Y, Z] = [X * co + ky * Z * sn + kx * kv * (1 - co), Y * co - kx * Z * sn + ky * kv * (1 - co), Z * co + (kx * Y - ky * X) * sn];
    cx += (ex * -ky + mx * kx) * dr; cy += my * kx * dr; cz += (ez * -ky + mz * kx) * dr;
  }
  const rx = cx + ex * X + mx * Y + nx * Z, ry = cy + my * Y + ny * Z, rz = cz + ez * X + mz * Y + nz * Z;
  const a2 = ac + ox, b2 = bc + oy, k = R * (1 + h), cf = smooth(0.72, 1, s);
  const px = Math.cos(b2) * Math.sin(a2) * k, py = Math.sin(b2) * k, pz = Math.cos(b2) * Math.cos(a2) * k;
  return out.set(rx + (px - rx) * cf, ry + (py - ry) * cf, rz + (pz - rz) * cf);
}
function place(lon, lat, h, st, out = new THREE.Vector3()) {
  const lonR = (((lon - st.center) % 360) + 540) % 360 - 180;
  const u = lonR * RAD * R, v = lat * RAD * R;
  if (CFG.gores) { gorePlace((lonR + 180) / 360, lat * RAD, h, st.fold, out); out.lonR = lonR; return out; }
  if (CFG.tiles) { tilePlace((lonR + 180) / 360, lat * RAD, h, st.fold, st.center * RAD, out); out.lonR = lonR; return out; }
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
  uniform float uKx, uKy, uR, uCenter, uRaise, uMix, uWave, uFold, uRise, uReveal, uSoft, uGores, uGore0, uTiles, uTileGap, uTileLift, uTileFlip, uTileScatter;
  uniform vec2 uHome, uTileN;
  uniform sampler2D uMask, uMaskPrev;
  varying vec2 vQ;
  varying float vRz;
  varying vec2 vGore;
  varying float vGoreId;
  varying vec2 vTile, vTileC;
  varying float vLand, vW;
  ${CFG.gores ? 'attribute float aGore;' : 'const float aGore = 0.5;'}
  ${CFG.tiles ? 'attribute vec2 aTile;' : 'const vec2 aTile = vec2(0.5);'}
  vec3 sheet(vec2 q, float h, out vec3 n) {
    float u = (q.x - 0.5) * 6.2831853 * uR, v = (q.y - 0.5) * 3.1415927 * uR;
    vGore = vec2(0.0, 1.0); vGoreId = 0.0; vTile = vec2(0.0); vLand = 1.0; vTileC = vec2(0.5); vW = 1.0;
    if (uTiles > 0.5) {
      // a print on the wall (tilePlace in the JS): lifted off whole, turned to face out from its place on
      // the ball and laid there, then pressed down onto it as the gaps close
      float a = u / uR, b = v / uR;
      float ac = (aTile.x - 0.5) * 6.2831853, bc = (aTile.y - 0.5) * 3.1415927;
      float d = acos(clamp(sin(bc) * sin(uHome.y) + cos(bc) * cos(uHome.y) * cos(ac + uCenter - uHome.x), -1.0, 1.0)) / 3.1415927;
      float s = clamp(uFold * 1.6 - d * 0.6, 0.0, 1.0); s = s * s * s * (s * (s * 6.0 - 15.0) + 10.0);
      vec2 o = vec2(a - ac, b - bc) * (1.0 - uTileGap * smoothstep(0.0, 0.1, uFold) * (1.0 - smoothstep(0.78, 1.0, s)));
      float ya = ac * s, pa = bc * s;
      vec3 nr = vec3(cos(pa) * sin(ya), sin(pa), cos(pa) * cos(ya));
      vec3 ex = vec3(cos(ya), 0.0, -sin(ya)), my = vec3(-sin(pa) * sin(ya), cos(pa), -sin(pa) * cos(ya));
      vec3 nc = vec3(cos(bc) * sin(ac), sin(bc), cos(bc) * cos(ac));
      vec3 c = mix(vec3(ac * uR, bc * uR, uR), nc * uR, s) + nr * uTileLift * sin(3.1415927 * s);
      vec3 L = vec3(o.x * mix(1.0, cos(bc), s), o.y, h) * uR, nf = nr;
      if (uTileFlip > 0.5) {
        vec2 tc = floor(aTile * uTileN);
        float ph = mod((tc.x * 7.0 + tc.y * 13.0) * 2.39996, 6.2831853), kx = cos(ph), ky = sin(ph);
        float t = smoothstep(0.04, 0.72, s), th = 6.2831853 * t + 0.6 * sin(6.2831853 * t), co = cos(th), sn = sin(th), kv = kx * L.x + ky * L.y;
        L = vec3(L.x * co + ky * L.z * sn + kx * kv * (1.0 - co), L.y * co - kx * L.z * sn + ky * kv * (1.0 - co), L.z * co + (kx * L.y - ky * L.x) * sn);
        nf = ex * ky * sn - my * kx * sn + nr * co;
        c += (ex * -ky + my * kx) * uTileScatter * uR * sin(3.1415927 * s);
      }
      vec3 rigid = c + ex * L.x + my * L.y + nr * L.z;
      vec2 g = vec2(ac, bc) + o;
      vec3 ns = vec3(cos(g.y) * sin(g.x), sin(g.y), cos(g.y) * cos(g.x));
      float cf = smoothstep(0.72, 1.0, s);
      vTile = vec2(a - ac, b - bc) / vec2(3.1415927 / uTileN.x, 1.5707963 / uTileN.y);
      vLand = s; vTileC = aTile; vW = mix(1.0, cos(bc), s);
      n = normalize(mix(nf, ns, cf));
      return mix(rigid, ns * uR * (1.0 + h), cf);
    }
    if (uGores > 0.5) {
      // a strip of the map (gorePlace in the JS): cut narrow towards its tips, then closed onto the ball
      float a = u / uR, b = v / uR, gc = (aGore - 0.5) * 6.2831853, dl = a - gc;
      float xf = gc + dl * mix(1.0, cos(b), smoothstep(0.0, 0.2, uFold));
      float dg = abs(aGore - uGore0), far = min(dg, 1.0 - dg) * 2.0;
      float k = clamp((uFold - 0.16) / 0.84 * 1.95 - far * 0.62 - abs(b) / 1.5707963 * 0.28, 0.0, 1.0);
      float w = k * k * (3.0 - 2.0 * k);
      vec3 ns = vec3(cos(b) * sin(a), sin(b), cos(b) * cos(a));
      vGore = vec2(dl / 0.5235988, w);
      vGoreId = mod(floor((aGore - uGore0) * 12.0 + 0.5) + 12.0, 12.0);
      n = normalize(mix(vec3(0.0, 0.0, 1.0), ns, w));
      return mix(vec3(xf * uR, b * uR, uR + h * uR), ns * uR * (1.0 + h), w);
    }
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
    // thin prints: the height is read from a few points around, so the print's edge is gentle
    if (uSoft > 0.0) {
      vec2 dx = vec2(uSoft / 2048.0, 0.0), dy = vec2(0.0, uSoft / 1024.0);
      g = (g + mix(texture2D(uMaskPrev, m + dx).r, texture2D(uMask, m + dx).r, uMix) + mix(texture2D(uMaskPrev, m - dx).r, texture2D(uMask, m - dx).r, uMix)
             + mix(texture2D(uMaskPrev, m + dy).r, texture2D(uMask, m + dy).r, uMix) + mix(texture2D(uMaskPrev, m - dy).r, texture2D(uMask, m - dy).r, uMix)) / 5.0;
    }
    // with the rise, the mask's grey is the order he first went: each country stands up in its turn
    if (uRise > 0.5) return g > 0.02 ? uRaise * smoothstep(g - 0.07, g, uReveal * 1.08) : 0.0;
    return uRaise * g;
  }
`;

/* ------------------------------------------------------------ the world, painted flat */

const TW = 4096, TH = 2048;
const eq = d3.geoEquirectangular().scale(TW / TAU).translate([TW / 2, TH / 2]).precision(0.2);

let reliefImg = null;
const reliefP = CFG.relief || CFG.earth ? new Promise((ok) => { const i = new Image(); i.onload = () => ok(reliefImg = i); i.onerror = () => ok(null); i.src = '../vendor/relief/SR_50M-4096.jpg'; }) : Promise.resolve(null);

function painter(world, colours, photos) {
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
        // with the pen, the grey is when its route lands (none: washed from the start, as Taiwan is)
        const g = Math.round((CFG.pen ? LAND[f.id] || 0 : CFG.rise ? order[f.id] : 1) * 255);
        if (!g) continue;
        c.fillStyle = `rgb(${g}, ${g}, ${g})`; c.beginPath(); path(f); c.fill();
      }
      return;
    }
    if (CFG.paint === 'globe') return paintGlobe(c, path, world, visited, colours, firstOf, y, hover);
    if (CFG.paint === 'chart') return paintChart(c, path, world, visited, colours, firstOf, y, hover);
    if (CFG.paint === 'cut') return paintCut(c, path, world, visited, colours, firstOf, y, hover);
    if (CFG.paint === 'ink') return paintInk(c, path, world, visited, colours, firstOf, y, hover);
    if (CFG.paint === 'earth') return paintEarth(c, path, world, visited, colours, firstOf, y, hover);
    if (CFG.paint === 'photo') return paintPhoto(c, path, world, visited, colours, firstOf, y, hover, photos);
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

/* ---- the earth: painted once from the land shapes and the relief, then his countries on top ---- */
// a small value noise for the clouds (seamless round the world: sampled on a cylinder)
function noise3(x, y, z) {
  const h = (i, j, k) => { const n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return n - Math.floor(n); };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
           l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}
// the dry places, as soft boxes [lon0, lon1, lat0, lat1, strength]: Sahara and Arabia, Iran and
// Thar, Taklamakan and Gobi, Australia's interior, Kalahari and Namib, the American south-west,
// Atacama, Patagonia, the Kazakh steppe
const DRY = [[-17, 60, 14, 33, 1], [44, 75, 24, 38, 0.8], [75, 112, 36, 47, 0.85], [114, 146, -32, -19, 0.9], [12, 26, -29, -18, 0.75],
  [-120, -103, 24, 37, 0.65], [-71.5, -68, -28, -17, 0.9], [-72, -64, -50, -38, 0.55], [50, 80, 42, 50, 0.45]];
let EARTH = null;
function earthBase(world, relief) {
  if (EARTH) return EARTH;
  const W = 2048, H = 1024;
  const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const eqW = d3.geoEquirectangular().scale(W / TAU).translate([W / 2, H / 2]).precision(0.3);
  const land = (cv, blur) => {
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    if (blur) c.filter = `blur(${blur}px)`;
    c.fillStyle = '#fff'; c.beginPath(); d3.geoPath(eqW, c)(world.land); c.fill();
    return c.getImageData(0, 0, W, H).data;
  };
  const L = land(mk(W, H)), inland = land(mk(W, H), 26), near = land(mk(W, H), 7);
  const out = mk(W, H), oc = out.getContext('2d');
  const img = oc.createImageData(W, H), d = img.data;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // coarse noise fields (warp for the dry regions, mottling for the land), sampled per pixel
  const NW = 512, NH = 256, nf = (k) => { const a = new Float32Array(NW * NH); for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) { const th = x / NW * TAU, yy = y / NH * 6; a[y * NW + x] = noise3(Math.cos(th) * 2.2 + k, Math.sin(th) * 2.2, yy) * 0.6 + noise3(Math.cos(th) * 5 + k, Math.sin(th) * 5, yy * 2.3) * 0.4; } return a; };
  const nX = nf(1.7), nY = nf(9.3), nM = nf(4.1);
  const C = { rain: [38, 84, 44], green: [86, 120, 62], steppe: [150, 146, 96], sand: [214, 186, 134], boreal: [44, 74, 52], tundra: [138, 138, 118], ice: [240, 243, 246],
    deep: [22, 60, 104], sea: [34, 86, 136], shallow: [58, 140, 168], seaIce: [214, 226, 236] };
  for (let y = 0; y < H; y++) {
    const lat = 90 - ((y + 0.5) / H) * 180, a = Math.abs(lat);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, lon = ((x + 0.5) / W) * 360 - 180;
      const ni = (y >> 2) * NW + (x >> 2);
      let col;
      if (L[i] > 127) {
        // climate by latitude, with the dry places and the far interiors drier
        col = a < 12 ? C.rain : a < 20 ? mix(C.rain, C.green, ss(12, 20, a)) : a < 46 ? C.green : a < 52 ? mix(C.green, C.boreal, ss(46, 52, a)) : a < 62 ? C.boreal : mix(C.boreal, C.tundra, ss(62, 68, a));
        let dry = ss(0.72, 0.95, inland[i] / 255) * Math.exp(-((a - 26) ** 2) / 120) * 0.6;
        const wl = lon + (nX[ni] - 0.5) * 16, wa = lat + (nY[ni] - 0.5) * 11;
        for (const [x0, x1, y0, y1, k] of DRY) {
          const fx = ss(x0 - 7, x0 + 5, wl) * (1 - ss(x1 - 5, x1 + 7, wl)), fy = ss(y0 - 5, y0 + 4, wa) * (1 - ss(y1 - 4, y1 + 5, wa));
          dry = Math.max(dry, k * fx * fy * (0.75 + 0.5 * nM[ni]));
        }
        col = mix(col, dry > 0.6 ? mix(C.steppe, C.sand, ss(0.6, 0.95, dry)) : C.steppe, Math.min(1, dry * 1.25));
        const m = 0.9 + 0.2 * nM[ni];
        col = [col[0] * m, col[1] * m, col[2] * m];
        const greenland = lon > -58 && lon < -18 && lat > 59;
        if (a > 70 || lat < -60 || greenland) col = mix(col, C.ice, greenland ? ss(59, 66, lat) : lat < -60 ? 1 : ss(70, 76, a));
      } else {
        // the sea: shallow near the coasts, deeper out; ice towards the poles
        const sh = near[i] / 255;
        col = mix(mix(C.deep, C.sea, ss(0, 0.18, sh)), C.shallow, ss(0.18, 0.55, sh));
        if (lat > 74 || lat < -66) col = mix(col, C.seaIce, lat > 0 ? ss(74, 84, lat) : ss(66, 74, -lat));
      }
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
  }
  oc.putImageData(img, 0, 0);
  // full size, the land given the shape of its mountains from the relief
  const big = mk(TW, TH), bc = big.getContext('2d');
  bc.imageSmoothingQuality = 'high';
  bc.drawImage(out, 0, 0, TW, TH);
  if (relief) {
    bc.save(); bc.beginPath(); d3.geoPath(eq, bc)(world.land); bc.clip();
    bc.globalCompositeOperation = 'soft-light'; bc.globalAlpha = 0.95; bc.drawImage(relief, 0, 0, TW, TH);
    bc.globalCompositeOperation = 'multiply'; bc.globalAlpha = 0.3; bc.drawImage(relief, 0, 0, TW, TH);
    bc.restore();
  }
  // where the sun glints: the sea
  const spec = mk(1024, 512), sc = spec.getContext('2d');
  sc.fillStyle = '#fff'; sc.fillRect(0, 0, 1024, 512);
  sc.fillStyle = '#000'; sc.beginPath(); d3.geoPath(d3.geoEquirectangular().scale(1024 / TAU).translate([512, 256]), sc)(world.land); sc.fill();
  // the clouds: white where a seamless noise is high, thicker in the storm belts, thin over the deserts
  const cw = 1024, chh = 512, cl = mk(cw, chh), cc = cl.getContext('2d'), ci = cc.createImageData(cw, chh), cd = ci.data;
  for (let y = 0; y < chh; y++) {
    const lat = 90 - ((y + 0.5) / chh) * 180, a = Math.abs(lat);
    const belt = 0.55 + 0.45 * Math.max(Math.exp(-((a - 55) ** 2) / 180), Math.exp(-(a ** 2) / 60)) - 0.25 * Math.exp(-((a - 25) ** 2) / 70);
    for (let x = 0; x < cw; x++) {
      const th = (x / cw) * TAU, py = y / chh * 9;
      let n = 0, amp = 0.55, f = 3.2;
      for (let o = 0; o < 5; o++) { n += amp * noise3(Math.cos(th) * f, Math.sin(th) * f, py * f / 1.6); amp *= 0.5; f *= 2.15; }
      const v = ss(0.52, 0.8, n * belt + 0.08);
      const k = (y * cw + x) * 4;
      cd[k] = cd[k + 1] = cd[k + 2] = 255; cd[k + 3] = Math.round(v * 235);
    }
  }
  cc.putImageData(ci, 0, 0);
  return (EARTH = { big, spec, clouds: cl });
}
function paintEarth(c, path, world, visited, col, firstOf, y, hover) {
  c.drawImage(EARTH.big, 0, 0, TW, TH);
  // his countries: a warm wash and a bright edge, so they read on the real earth
  for (const f of visited) {
    if (firstOf[f.id] > y) continue;
    c.beginPath(); path(f);
    c.fillStyle = f.id === hover ? 'rgba(255, 196, 120, 0.55)' : 'rgba(255, 190, 110, 0.34)'; c.fill();
    c.strokeStyle = f.id === hover ? 'rgba(255, 240, 210, 1)' : 'rgba(255, 228, 186, 0.85)'; c.lineWidth = f.id === hover ? 3.4 : 2; c.stroke();
  }
  c.strokeStyle = 'rgba(255, 255, 255, 0.22)'; c.lineWidth = 1.2; c.beginPath(); path(world.borders); c.stroke();
}

/* ---- the ink globe: a printed two-ink earth in the site's own colours ---- */
// deep ink sea, lighter where it is shallow; the land the page's paper with its mountains printed
// in a warm grey from the relief; a thin ink coast; his countries in a vermilion wash
let INK = null;
function inkBase(world, relief) {
  if (INK) return INK;
  const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const big = mk(TW, TH), c = big.getContext('2d'), path = d3.geoPath(eq, c);
  c.fillStyle = rgb('oklch(36% 0.075 248)'); c.fillRect(0, 0, TW, TH);
  // the shallows: the coast drawn wide and soft in a lighter ink
  c.save(); c.filter = 'blur(18px)'; c.strokeStyle = rgb('oklch(52% 0.08 238)'); c.lineWidth = 34; c.lineJoin = 'round'; c.beginPath(); path(world.land); c.stroke(); c.restore();
  c.save(); c.filter = 'blur(5px)'; c.strokeStyle = rgb('oklch(62% 0.07 230)'); c.lineWidth = 9; c.beginPath(); path(world.land); c.stroke(); c.restore();
  // fine waterlines every 15 degrees, barely there
  c.strokeStyle = 'rgba(255, 255, 255, 0.07)'; c.lineWidth = 1.4; c.beginPath(); path(d3.geoGraticule().step([15, 15])()); c.stroke();
  // the land: paper, its mountains printed from the relief
  c.fillStyle = rgb('--paper'); c.beginPath(); path(world.land); c.fill();
  if (relief) { c.save(); c.beginPath(); path(world.land); c.clip(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.55; c.drawImage(relief, 0, 0, TW, TH); c.restore(); }
  c.strokeStyle = rgb('oklch(30% 0.04 248)'); c.lineWidth = 1.6; c.beginPath(); path(world.land); c.stroke();
  const spec = mk(1024, 512), sc = spec.getContext('2d');
  sc.fillStyle = '#fff'; sc.fillRect(0, 0, 1024, 512);
  sc.fillStyle = '#000'; sc.beginPath(); d3.geoPath(d3.geoEquirectangular().scale(1024 / TAU).translate([512, 256]), sc)(world.land); sc.fill();
  return (INK = { big, spec });
}
function paintInk(c, path, world, visited, col, firstOf, y, hover) {
  c.drawImage(INK.big, 0, 0, TW, TH);
  for (const f of visited) {
    if (firstOf[f.id] > y) continue;
    c.beginPath(); path(f);
    c.fillStyle = f.id === hover ? 'rgba(214, 74, 46, 0.5)' : 'rgba(214, 74, 46, 0.26)'; c.fill();
    c.strokeStyle = f.id === hover ? rgb('oklch(50% 0.17 33)') : 'rgba(190, 64, 40, 0.8)'; c.lineWidth = f.id === hover ? 3 : 1.6; c.stroke();
  }
  c.strokeStyle = 'rgba(60, 50, 40, 0.18)'; c.lineWidth = 1.1; c.beginPath(); path(world.borders); c.stroke();
}

/* ---- the globemaker's globe: printed on paper, tinted by hand in watercolour (after Bellerby & Co) ---- */
// an aged paper sea under a pale wash that pools darker along the coasts, two engraved waterlines;
// every country its own pale wash with a darker rim where the water dried; a fine sepia graticule,
// dotted borders and an inked coast; the oceans named in spaced capitals; the paper's grain over all
let GLOBE = null;
let LAND = {};   // with the pen: when each country's route lands, as a share of the whole opening
const TINTS = [['oklch(92% 0.022 85)', 'oklch(83% 0.035 78)'], ['oklch(91.5% 0.022 135)', 'oklch(83% 0.032 135)'], ['oklch(91.5% 0.02 40)', 'oklch(83% 0.032 40)'],
  ['oklch(92.5% 0.03 95)', 'oklch(85% 0.045 92)'], ['oklch(91% 0.014 300)', 'oklch(83% 0.022 300)']];
// (the Atlantic's name sits west of 30W, where the flat map is cut, so it is never split across the ends)
const OCEANS = [{ ll: [-150, 6], en: 'Pacific Ocean', zh: '太平洋' }, { ll: [-56, 30], en: 'Atlantic Ocean', zh: '大西洋' }, { ll: [78, -22], en: 'Indian Ocean', zh: '印度洋' }];
const hashOf = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
// a watercolour wash over some countries: the colour, then a darker rim just inside each edge
function wash(c, path, fs, fill, rim, rimA = 0.55) {
  if (!fs.length) return;
  const all = () => { c.beginPath(); for (const f of fs) path(f); };
  c.save();
  c.fillStyle = fill; all(); c.fill();
  all(); c.clip();
  c.filter = 'blur(5px)'; c.globalAlpha = rimA; c.strokeStyle = rim; c.lineWidth = 10; c.lineJoin = 'round'; all(); c.stroke();
  c.restore();
}
// letters set apart, as an engraver spaces them
function spaced(c, text, x, y, gap) {
  const ws = [...text].map((ch) => c.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
  let at = x - total / 2;
  [...text].forEach((ch, i) => { c.fillText(ch, at + ws[i] / 2, y); at += ws[i] + gap; });
}
function globeBase(world, lang) {
  if (GLOBE && GLOBE.lang === lang) return GLOBE;
  const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const big = mk(TW, TH), c = big.getContext('2d'), path = d3.geoPath(eq, c);
  // the paper, a little aged, and the sea's wash laid over it
  c.fillStyle = rgb('oklch(93.5% 0.022 82)'); c.fillRect(0, 0, TW, TH);
  c.globalAlpha = 0.85; c.fillStyle = rgb('oklch(89% 0.03 198)'); c.fillRect(0, 0, TW, TH); c.globalAlpha = 1;
  // where the wash pooled: darker along every coast
  c.save(); c.lineJoin = 'round'; c.filter = 'blur(22px)'; c.globalAlpha = 0.32; c.strokeStyle = rgb('oklch(80% 0.05 205)'); c.lineWidth = 46; c.beginPath(); path(world.land); c.stroke(); c.restore();
  c.save(); c.lineJoin = 'round'; c.filter = 'blur(6px)'; c.globalAlpha = 0.3; c.strokeStyle = rgb('oklch(76% 0.055 210)'); c.lineWidth = 12; c.beginPath(); path(world.land); c.stroke(); c.restore();
  // two engraved waterlines following each coast: a wide line hollowed out leaves a thin ring
  const ring = mk(TW, TH), rc = ring.getContext('2d'), rp = d3.geoPath(eq, rc);
  rc.lineJoin = 'round'; rc.strokeStyle = '#000';
  for (const w of [58, 30]) {
    rc.globalCompositeOperation = 'source-over'; rc.lineWidth = w + 2.6; rc.beginPath(); rp(world.land); rc.stroke();
    rc.globalCompositeOperation = 'destination-out'; rc.lineWidth = w; rc.beginPath(); rp(world.land); rc.stroke();
  }
  rc.globalCompositeOperation = 'source-in'; rc.fillStyle = rgb('oklch(48% 0.045 215)'); rc.fillRect(0, 0, TW, TH);
  c.globalAlpha = 0.17; c.drawImage(ring, 0, 0); c.globalAlpha = 1;
  ring.width = ring.height = 0;
  // the land: land without a country first, then every country its own pale wash
  c.fillStyle = rgb('oklch(93% 0.02 85)'); c.beginPath(); path(world.land); c.fill();
  const groups = TINTS.map(() => []);
  world.countries.forEach((f) => groups[hashOf(f.id) % TINTS.length].push(f));
  groups.forEach((fs, i) => wash(c, path, fs, rgb(TINTS[i][0]), rgb(TINTS[i][1]), 0.45));
  // the engraved lines: every 15 degrees, the equator a little stronger, the tropics dashed
  const sepia = rgb('oklch(42% 0.04 60)');
  c.strokeStyle = sepia; c.globalAlpha = 0.15; c.lineWidth = 1.3; c.beginPath(); path(d3.geoGraticule().step([15, 15]).extentMinor([[-180, -80], [180, 80]])()); c.stroke();
  const parallel = (lat) => ({ type: 'LineString', coordinates: d3.range(-180, 181, 2).map((lon) => [lon, lat]) });
  c.globalAlpha = 0.3; c.lineWidth = 1.7; c.beginPath(); path(parallel(0)); c.stroke();
  c.setLineDash([10, 9]); c.globalAlpha = 0.24; c.lineWidth = 1.3; c.beginPath(); path(parallel(23.44)); path(parallel(-23.44)); c.stroke(); c.setLineDash([]);
  // the oceans' names, in the site's serif, set wide
  const zh = lang === 'zh';
  c.globalAlpha = 0.5; c.fillStyle = sepia; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = zh ? '500 46px "Noto Serif TC"' : '400 34px "Playfair Display"';
  for (const o of OCEANS) { const [x, y] = eq(o.ll); spaced(c, zh ? o.zh : o.en.toUpperCase(), x, y, zh ? 34 : 10); }
  c.globalAlpha = 1;
  // the paper's grain (fine) and its age (broad, uneven), multiplied over everything at each repaint
  const grain = mk(512, 512), gc = grain.getContext('2d'), gi = gc.createImageData(512, 512);
  for (let i = 0; i < gi.data.length; i += 4) { const v = 238 + Math.random() * 17; gi.data[i] = v; gi.data[i + 1] = v - 1; gi.data[i + 2] = v - 4; gi.data[i + 3] = 255; }
  gc.putImageData(gi, 0, 0);
  const AW = 512, AH = 256, age = mk(AW, AH), ac = age.getContext('2d'), ai = ac.createImageData(AW, AH);
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const th = (x / AW) * TAU, yy = (y / AH) * 5;
    const n = noise3(Math.cos(th) * 2.4, Math.sin(th) * 2.4, yy) * 0.6 + noise3(Math.cos(th) * 6, Math.sin(th) * 6, yy * 2.4) * 0.4;
    const v = 255 - Math.max(0, n - 0.45) * 46, i = (y * AW + x) * 4;
    ai.data[i] = v; ai.data[i + 1] = v - 2; ai.data[i + 2] = v - 7; ai.data[i + 3] = 255;
  }
  ac.putImageData(ai, 0, 0);
  return (GLOBE = { lang, big, grain, age });
}
function paintGlobe(c, path, world, visited, col, firstOf, y, hover) {
  c.drawImage(GLOBE.big, 0, 0);
  // his countries: a deeper wash, the one pointed at deeper still
  const been = visited.filter((f) => firstOf[f.id] <= y);
  wash(c, path, been.filter((f) => f.id !== hover), col.been, col.beenRim, 0.6);
  wash(c, path, been.filter((f) => f.id === hover), col.beenOn, col.beenRim, 0.7);
  // the ink: dotted borders, a fine coast, his countries' edges in their own colour
  c.strokeStyle = col.ink3; c.globalAlpha = 0.5; c.setLineDash([2.5, 5]); c.lineWidth = 1.4; c.beginPath(); path(world.borders); c.stroke(); c.setLineDash([]);
  c.globalAlpha = 0.85; c.strokeStyle = col.coast; c.lineWidth = 1.7; c.beginPath(); path(world.land); c.stroke();
  c.globalAlpha = 0.75; c.strokeStyle = col.beenRim; c.lineWidth = 1.5; c.beginPath(); been.forEach((f) => path(f)); c.stroke();
  c.globalAlpha = 1;
  c.save(); c.globalCompositeOperation = 'multiply';
  c.fillStyle = c.createPattern(GLOBE.grain, 'repeat'); c.fillRect(0, 0, TW, TH);
  c.drawImage(GLOBE.age, 0, 0, TW, TH);
  c.restore();
}

// "Developed": the world drawn quietly on the page's own paper, and every country he has been to
// filled with his photograph from there. Each piece of a country (an island, a mainland) gets the
// photograph fitted to its own outline, cropped like a print, never stretched.
function paintPhoto(c, path, world, visited, col, firstOf, y, hover, photos) {
  c.fillStyle = col.sea; c.fillRect(0, 0, TW, TH);
  c.fillStyle = col.land; c.beginPath(); path(world.land); c.fill();
  for (const f of visited) {
    if (firstOf[f.id] > y) continue;
    const img = photos[f.id];
    const parts = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map((co) => ({ type: 'Polygon', coordinates: co })) : [f.geometry];
    for (const g of parts) {
      const [[x0, y0], [x1, y1]] = path.bounds(g);
      if (!(x1 - x0 > 0.5)) continue;
      c.save(); c.beginPath(); path(g); c.clip();
      if (img) {
        const bw = x1 - x0, bh = y1 - y0, k = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        c.drawImage(img, x0 + (bw - w) / 2, y0 + (bh - h) / 2, w, h);
      } else { c.fillStyle = col.been; c.fillRect(x0, y0, x1 - x0, y1 - y0); }
      c.restore();
    }
    c.beginPath(); path(f);
    c.strokeStyle = f.id === hover ? col.route : col.edge; c.lineWidth = f.id === hover ? 3.2 : 1.2; c.stroke();
  }
  c.strokeStyle = col.hair; c.lineWidth = 1.3; c.beginPath(); path(world.borders); c.stroke();
  c.strokeStyle = col.coast; c.lineWidth = 1.8; c.beginPath(); path(world.land); c.stroke();
}

/* ------------------------------------------------------------ the gores: the sheet in strips */

// the sheet as twelve strips with their own edges (the two at the map's ends are halves of one), so
// they can part; each point knows its strip's middle (aGore, as a share of the sheet's width)
function goreSheet(cols, rows) {
  const pos = [], uv = [], gore = [], idx = [];
  const g0 = Math.floor(-GORE0 * GORES + 0.5), g1 = Math.floor((1 - GORE0) * GORES + 0.5);
  for (let g = g0; g <= g1; g++) {
    const mid = GORE0 + g / GORES, q0 = Math.max(0, mid - 0.5 / GORES), q1 = Math.min(1, mid + 0.5 / GORES);
    if (q1 - q0 < 1e-6) continue;
    const nx = Math.max(2, Math.round(cols * (q1 - q0))), first = uv.length / 2;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= nx; i++) { uv.push(q0 + ((q1 - q0) * i) / nx, j / rows); gore.push(mid); pos.push(0, 0, 0); }
    for (let j = 0; j < rows; j++) for (let i = 0; i < nx; i++) {
      const a = first + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aGore', new THREE.Float32BufferAttribute(gore, 1));
  geo.setIndex(idx);
  return geo;
}

/* ------------------------------------------------------------ the gallery: the sheet as prints */

// the sheet as a wall of square prints, each with its own edges so it can lift off whole; each point
// knows its print's middle (aTile, as shares of the sheet's width and height)
function tileSheet([cols, rows], [sx, sy]) {
  const pos = [], uv = [], tile = [], idx = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const first = uv.length / 2;
    for (let j = 0; j <= sy; j++) for (let i = 0; i <= sx; i++) { uv.push((c + i / sx) / cols, (r + j / sy) / rows); tile.push((c + 0.5) / cols, (r + 0.5) / rows); pos.push(0, 0, 0); }
    for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
      const a = first + j * (sx + 1) + i, b = a + 1, d = a + sx + 1, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aTile', new THREE.Float32BufferAttribute(tile, 2));
  geo.setIndex(idx);
  return geo;
}

/* ------------------------------------------------------------ the plane, a small paper cut-out */

function planeShape() {
  const half = [[9, 0], [6.5, -1.1], [2, -1.1], [-2.5, -7.5], [-4.3, -7.5], [-1.8, -1.1], [-6, -1.1], [-7.8, -3.6], [-9, -3.6], [-8, 0]];
  const pts = half.concat(half.slice(1, -1).reverse().map(([x, y]) => [x, -y]));
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x / 9, y / 9)));
  return new THREE.ShapeGeometry(s);
}

/* ------------------------------------------------------------ the map */

// one photograph per country he has been to: the lead of his latest trip there when it was taken in
// that country, else his first landscape-shaped one from there; keyed by the map's country number
function countryPhotos() {
  const pick = {};
  for (const [id, s] of Object.entries(S.slides)) (pick[s.country] = pick[s.country] || []).push(id);
  const jobs = Object.entries(pick).map(([cid, ids]) => {
    const iso = K.ISO[cid];
    if (!iso) return null;
    const trip = K.trips.find((t) => t.countries.some((c) => c.id === cid) && t.lead && S.slides[t.lead]?.country === cid);
    const id = trip ? trip.lead : ids.find((i) => S.slides[i].w > S.slides[i].h) || ids[0];
    return new Promise((ok) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => ok([iso, img]);
      img.onerror = () => ok(null);
      img.src = K.src(S.slides[id].file, 1280);
    });
  }).filter(Boolean);
  return Promise.all(jobs).then((r) => Object.fromEntries(r.filter(Boolean)));
}

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
  if (CFG.paint === 'photo') Object.assign(colours, {
    sea: rgb('--paper'), land: rgb('--paper-2'), been: rgb('--been'), edge: rgb('oklch(84% 0.012 80)'),
    hair: rgb('--hair'), coast: rgb('--ink-3'),
  });
  if (CFG.paint === 'cut') Object.assign(colours, {
    sea: rgb('oklch(90% 0.015 75)'), land: rgb('oklch(97% 0.005 85)'), been: rgb('oklch(80% 0.07 45)'),
    beenOn: rgb('oklch(75% 0.09 42)'), edge: rgb('oklch(66% 0.08 42)'), score: rgb('oklch(88% 0.012 75)'),
  });
  if (CFG.paint === 'globe') Object.assign(colours, {
    sea: rgb('oklch(90% 0.028 198)'), land: rgb('--paper'), coast: rgb('oklch(38% 0.035 55)'), ink3: rgb('oklch(45% 0.03 60)'),
    been: rgb('oklch(82% 0.065 48)'), beenOn: rgb('oklch(76% 0.09 46)'), beenRim: rgb('oklch(64% 0.08 42)'), fly: rgb('oklch(40% 0.05 45)'),
  });
  const [world] = await Promise.all([K.world(), reliefP]);
  const photos = CFG.paint === 'photo' ? await countryPhotos() : {};
  if (CFG.paint === 'earth') earthBase(world, reliefImg);
  if (CFG.paint === 'ink') inkBase(world, reliefImg);
  if (CFG.paint === 'globe') {
    // the oceans' names are painted with the site's own serif, so it has to be loaded first
    await Promise.all([document.fonts.load('400 36px "Playfair Display"', 'PACIFIC'), document.fonts.load('500 46px "Noto Serif TC"', '太平洋大西洋印度')]).catch(() => {});
    globeBase(world, K.lang);
  }
  const paint = painter(world, colours, photos);

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
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI * (CFG.earth ? 0.36 : 0.6)));
  const sun = new THREE.DirectionalLight(CFG.earth ? 0xfff6ea : 0xffffff, Math.PI * (CFG.earth ? 0.95 : 0.5));
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
  const masks = CFG.raise || CFG.pen ? [0, 1].map(() => Object.assign(document.createElement('canvas'), { width: 2048, height: 1024 })) : null;
  const maskTex = masks ? masks.map((cv) => { const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; return t; }) : null;
  let front = 0;

  const U = {
    uKx: { value: 0 }, uKy: { value: 0 }, uR: { value: R }, uCenter: { value: START * RAD },
    uRaise: { value: CFG.raise || 0 }, uMix: { value: 1 }, uLit: { value: 0 },
    uPrev: { value: texes[1] }, uBack: { value: new THREE.Color(colours.land) },
    uWave: { value: CFG.wave ? 1 : 0 }, uFold: { value: 0 }, uHome: { value: new THREE.Vector2(HOME_LL[0] * RAD, HOME_LL[1] * RAD) },
    uRise: { value: CFG.rise ? 1 : 0 }, uSoft: { value: CFG.soft || 0 }, uReveal: { value: CFG.rise && !K.reduced ? 0 : 1 },
    uPlate: { value: CFG.plate ? 1 : 0 }, uWalls: { value: CFG.walls ? 1 : 0 }, uEdge: { value: new THREE.Color(colours.edge) },
    uEarth: { value: CFG.earth ? 1 : 0 }, uAlive: { value: 0 }, uBleed: { value: CFG.bleed ? 1 : 0 }, uPaperC: { value: new THREE.Color(rgb('--paper')) },
    uDevelop: { value: CFG.develop ? 1 : 0 }, uDevTint: { value: new THREE.Color(rgb('oklch(78% 0.07 70)')) },
    uGores: { value: CFG.gores ? 1 : 0 }, uGore0: { value: GORE0 }, uPen: { value: CFG.pen ? 1 : 0 },
    uTiles: { value: CFG.tiles ? 1 : 0 }, uTilePhotos: { value: { tileBacks: 1, tileEdges: 2 }[CFG.photos] || 0 }, uAtlasN: { value: 6 }, uTileN: { value: new THREE.Vector2(...TILES) }, uTileGap: { value: TILE_GAP }, uTileLift: { value: TILE_LIFT }, uTileFlip: { value: TILE_FLIP }, uTileScatter: { value: TILE_SCATTER },
    uBacks: { value: 0 }, uBackTex: { value: texes[0] },
    uMask: { value: maskTex ? maskTex[0] : texes[0] }, uMaskPrev: { value: maskTex ? maskTex[1] : texes[0] },
  };
  const mat = new (CFG.earth || CFG.gloss ? THREE.MeshPhongMaterial : THREE.MeshLambertMaterial)({
    map: texes[0], side: THREE.DoubleSide, flatShading: !!CFG.raise && !CFG.soft,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  // the globemaker's varnish: a soft sheen where the light falls, nothing like glass
  if (CFG.gloss) { mat.specular = new THREE.Color(0x2e2b26); mat.shininess = 24; }
  if ((CFG.relief || CFG.earth) && reliefImg) {
    const bump = new THREE.Texture(reliefImg); bump.needsUpdate = true; bump.wrapS = THREE.RepeatWrapping;
    mat.bumpMap = bump; mat.bumpScale = CFG.earth ? 0.9 : 1.4;
  }
  if (CFG.earth) {
    const spec = new THREE.CanvasTexture((EARTH || INK).spec); spec.wrapS = THREE.RepeatWrapping;
    mat.specularMap = spec; mat.specular = new THREE.Color(0x5d6f82); mat.shininess = 22;
  }
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${MORPH}`)
      .replace('#include <beginnormal_vertex>', 'vec3 nrm; float rz = raiseAt(uv); vQ = uv; vRz = uRaise > 0.0 ? rz / uRaise : 0.0;\nvec3 morphed = sheet(uv, rz, nrm);\nvec3 objectNormal = nrm;')
      .replace('#include <begin_vertex>', 'vec3 transformed = morphed;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uPrev, uMask, uMaskPrev; uniform float uMix, uLit, uPlate, uFold, uWalls, uDevelop, uCenter, uReveal, uEarth, uAlive, uBleed, uGores, uPen, uBacks, uTiles, uTilePhotos, uAtlasN; uniform vec2 uTileN; uniform sampler2D uBackTex; uniform vec3 uBack, uEdge, uDevTint, uPaperC; varying vec2 vQ; varying float vRz; varying vec2 vGore; varying float vGoreId; varying vec2 vTile, vTileC; varying float vLand, vW;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        #ifdef USE_MAP
          diffuseColor.rgb = mix(texture2D(uPrev, vMapUv).rgb, diffuseColor.rgb, uMix);
        #endif
        // the earth: on the flat map a lighter, printed-atlas version of itself; it comes alive as it closes
        if (uEarth > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb * 1.08, diffuseColor.rgb, uAlive);
        // a country develops like a print, blank paper to his photograph, in the order he first went
        if (uDevelop > 0.5) {
          vec2 mq = vec2(vQ.x + uCenter / 6.2831853, vQ.y);
          float g = mix(texture2D(uMaskPrev, mq).r, texture2D(uMask, mq).r, uMix);
          if (g > 0.02) {
            float dv = smoothstep(g - 0.07, g, uReveal * 1.08);
            // grain by grain, like a silver print coming up in the tray: each grain has its own threshold
            vec2 gp = floor(vQ * vec2(2600.0, 1300.0));
            float n = fract(sin(dot(gp, vec2(127.1, 311.7))) * 43758.5453);
            dv = smoothstep(n * 0.8, n * 0.8 + 0.2, dv);
            diffuseColor.rgb = mix(mix(uBack, diffuseColor.rgb, dv), uDevTint, 1.2 * dv * (1.0 - dv));
          }
        }
        // the pen: a country he has been to waits as pale paper until its route lands, then takes its wash,
        // the water spreading unevenly
        if (uPen > 0.5) {
          vec2 mq = vec2(vQ.x + uCenter / 6.2831853, vQ.y);
          float g = mix(texture2D(uMaskPrev, mq).r, texture2D(uMask, mq).r, uMix);
          if (g > 0.02) {
            vec2 p = vQ * vec2(70.0, 35.0), i = floor(p), fr = fract(p); fr = fr * fr * (3.0 - 2.0 * fr);
            float h00 = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453), h10 = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
            float h01 = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453), h11 = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
            float nz = mix(mix(h00, h10, fr.x), mix(h01, h11, fr.x), fr.y);
            float dv = smoothstep(g - 0.06 + nz * 0.03, g + nz * 0.03, uReveal * 1.03);
            diffuseColor.rgb = mix(mix(diffuseColor.rgb, uPaperC * 0.965, 0.8), diffuseColor.rgb, dv);
          }
        }
        // the cut between two strips: a faint edge while the knife works, almost gone once pasted down
        if (uGores > 0.5) {
          float seam = smoothstep(0.43, 0.5, abs(vGore.x)) * smoothstep(0.02, 0.2, uFold) * mix(0.7, 0.18, vGore.y);
          diffuseColor.rgb *= 1.0 - 0.2 * seam;
        }
        // a print on the wall: a faint edge round it once the wall parts, gone once it is pressed onto the ball
        if (uTiles > 0.5) {
          float edge = smoothstep(0.93, 1.0, max(abs(vTile.x), abs(vTile.y)));
          diffuseColor.rgb *= 1.0 - 0.13 * edge * smoothstep(0.0, 0.1, uFold) * (1.0 - smoothstep(0.75, 1.0, vLand));
        }
        // the printed plate: on arrival the map is trimmed to its band, 80N to 56S
        if (uPlate > 0.5) { float la = (vQ.y - 0.5) * 180.0, o = smoothstep(0.15, 0.6, uFold); if (la > mix(80.0, 91.0, o) || la < mix(-56.0, -91.0, o)) discard; }
        // the cut sides of a raised country, a deeper clay than its top
        if (uWalls > 0.5) { float wall = smoothstep(0.04, 0.25, vRz) * (1.0 - smoothstep(0.75, 0.96, vRz)); diffuseColor.rgb = mix(diffuseColor.rgb, uEdge * 0.92, wall * 0.75); }
        // a strip's back: plain paper, or (backs) one of his photographs printed on it, cut by the strip's shape
        if (!gl_FrontFacing) {
          diffuseColor.rgb = uBack;
          if (uBacks > 0.5) {
            float cb = cos((vQ.y - 0.5) * 3.1415927);
            diffuseColor.rgb = texture2D(uBackTex, vec2((vGoreId + 0.5 - vGore.x * cb) / 12.0, vQ.y)).rgb;
          }
        }
        // his photographs on the prints (the gallery's variations): one per print from an atlas of
        // them, in a thin paper border, narrowed with the print so it keeps its shape; on the backs
        // (1), or on both sides of the wall's top and bottom rows (2), coming up as each lifts off and
        // giving way to the map as it is laid on the ball
        if (uTilePhotos > 0.5) {
          float tr = floor(vTileC.y * uTileN.y), tc = floor(vTileC.x * uTileN.x);
          bool edgeRow = tr < 2.5 || tr > uTileN.y - 2.5;
          if (uTilePhotos < 1.5 ? !gl_FrontFacing : edgeRow) {
            vec2 l = vTile * 0.5 + 0.5;
            if (!gl_FrontFacing) l.x = 1.0 - l.x;
            float id = mod(tc * 7.0 + tr * 11.0, uAtlasN * uAtlasN);
            vec2 pu = (l - 0.06) / 0.88;
            pu.x = 0.5 + (pu.x - 0.5) * vW;
            vec3 ph = texture2D(uBackTex, (vec2(mod(id, uAtlasN), floor(id / uAtlasN)) + clamp(pu, 0.002, 0.998)) / uAtlasN).rgb;
            float inside = step(0.06, l.x) * step(l.x, 0.94) * step(0.06, l.y) * step(l.y, 0.94);
            vec3 print = mix(uPaperC, ph, inside);
            diffuseColor.rgb = uTilePhotos < 1.5 || !gl_FrontFacing ? print : mix(diffuseColor.rgb, print, smoothstep(0.02, 0.2, vLand) * (1.0 - smoothstep(0.7, 0.95, vLand)));
          }
        }`)
      .replace('#include <opaque_fragment>', `outgoingLight = mix(diffuseColor.rgb, outgoingLight, uLit);
        // the map fills the page, and its edges fade into the paper, so no sheet edge is ever seen
        if (uBleed > 0.5) {
          float la = (vQ.y - 0.5) * 180.0;
          float e = max(smoothstep(64.0, 86.0, la), smoothstep(34.0, 56.0, -la));
          e = max(e, max(1.0 - smoothstep(0.0, 0.035, vQ.x), smoothstep(0.965, 1.0, vQ.x)));
          // (the gores show their whole pointed shapes once the knife has cut them; a print at the wall's
          // faded edge comes up to full strength as it lifts off)
          outgoingLight = mix(outgoingLight, uPaperC, e * (1.0 - (uGores > 0.5 ? smoothstep(0.08, 0.3, uFold) : uTiles > 0.5 ? smoothstep(0.0, 0.25, vLand) : smoothstep(0.45, 0.92, uFold))));
        }
        #include <opaque_fragment>`);
  };
  const sheet = new THREE.Mesh(CFG.gores ? goreSheet(...CFG.seg) : CFG.tiles ? tileSheet(TILES, [CFG.seg[0] / TILES[0], CFG.seg[1] / TILES[1]]) : new THREE.PlaneGeometry(1, 1, ...CFG.seg), mat);
  // the grid's own corners stand in for the uv: the shader places every point itself
  sheet.geometry.attributes.position.array.fill(0);
  // the back of a pasted strip, or of a print, is plain paper
  if (CFG.gores || CFG.tiles) U.uBack.value = new THREE.Color(rgb('--paper'));

  /* his photographs in the transition (the gores' variations, CFG.photos) */
  // a trip's photograph, newest trip first: its lead, or the first that suits (prefer)
  const pickOf = (t, prefer) => { const ids = [t.lead, ...t.photos].filter(Boolean); return (prefer && ids.find(prefer)) || ids[0] || null; };
  const tripPhotos = (n, prefer) => K.trips.map((t) => pickOf(t, prefer)).filter((id, i, a) => id && a.indexOf(id) === i).slice(0, n);
  let under = null, underFor = () => {};
  if (CFG.photos === 'through' || CFG.photos === 'prints') {
    // a layer under the map's drawing, shown only inside the map's own box
    under = document.createElement('div');
    under.className = `g3-under g3-under--${CFG.photos}`;
    box.prepend(under);
  }
  if (CFG.photos === 'through') {
    // the photograph of the trip being read (the newest before the reading starts), the same one the
    // reading then shows behind the globe, so the two are one picture
    const ims = [0, 1].map(() => { const im = new Image(); im.className = 'g3-under__img'; im.alt = ''; im.decoding = 'async'; under.appendChild(im); return im; });
    let shownId = null, turn = 0;
    underFor = (t) => {
      const id = pickOf(t || K.trips[0]);
      if (!id || id === shownId) return;
      shownId = id;
      const sl = S.slides[id];
      turn ^= 1;
      const im = ims[turn], old = ims[turn ^ 1];
      im.srcset = `${K.src(sl.file, 640)} 640w, ${K.src(sl.file, 1280)} 1280w, ${K.src(sl.file)} 2400w`;
      im.sizes = '100vw';
      im.src = K.src(sl.file, 1280);
      const on = () => { im.classList.add('is-on'); old.classList.remove('is-on'); };
      if (im.complete) on(); else im.onload = on;
    };
    underFor(null);
  }
  if (CFG.photos === 'prints') {
    // one small print per trip, laid loosely down both sides of the desk, where the globe will not cover them
    const desk = document.createElement('div');
    desk.className = 'g3-under__desk';
    under.appendChild(desk);
    const ids = tripPhotos(14);
    const jit = (i) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); };
    const perSide = Math.ceil(ids.length / 2);
    ids.forEach((id, i) => {
      const sl = S.slides[id], right = i % 2, row = Math.floor(i / 2), rows = right ? Math.floor(ids.length / 2) : perSide;
      const pr = document.createElement('figure');
      pr.className = 'g3-print';
      pr.style.setProperty('--x', `${((right ? 88 : 12) + (jit(i + 7) - 0.5) * 5).toFixed(2)}%`);
      pr.style.setProperty('--y', `${(14 + (72 * (row + 0.5)) / rows + (jit(i + 13) - 0.5) * 6).toFixed(2)}%`);
      pr.style.setProperty('--rot', `${((jit(i + 21) - 0.5) * 7).toFixed(2)}deg`);
      pr.style.setProperty('--ar', (sl.w / sl.h).toFixed(4));
      const im = new Image(); im.alt = ''; im.decoding = 'async';
      im.src = K.src(sl.file, 640);
      pr.appendChild(im);
      desk.appendChild(pr);
    });
  }
  if (CFG.photos === 'backs') {
    // twelve of his photographs, one per strip, each printed down the back of its strip
    const SW = 256, SH = 1536, atlas = Object.assign(document.createElement('canvas'), { width: SW * 12, height: SH });
    const ac = atlas.getContext('2d');
    ac.fillStyle = rgb('--paper'); ac.fillRect(0, 0, atlas.width, SH);
    const tex = new THREE.CanvasTexture(atlas);
    tex.colorSpace = THREE.SRGBColorSpace;
    U.uBackTex.value = tex; U.uBacks.value = 1;
    tripPhotos(12, (id) => S.slides[id].h > S.slides[id].w).forEach((id, i) => {
      const im = new Image();
      im.onload = () => {
        const k = Math.max(SW / im.naturalWidth, SH / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
        ac.save(); ac.beginPath(); ac.rect(i * SW, 0, SW, SH); ac.clip();
        ac.drawImage(im, i * SW + (SW - w) / 2, (SH - h) / 2, w, h);
        ac.restore();
        tex.needsUpdate = true; kick();
      };
      im.src = K.src(S.slides[id].file, 640);
    });
  }
  if (CFG.photos === 'tileBacks' || CFG.photos === 'tileEdges') {
    // thirty-six of his photographs, each cut square, in a six by six atlas; one per trip first
    const N = 6, C = 256, atlas = Object.assign(document.createElement('canvas'), { width: N * C, height: N * C });
    const ac = atlas.getContext('2d');
    ac.fillStyle = rgb('--paper'); ac.fillRect(0, 0, atlas.width, atlas.height);
    const tex = new THREE.CanvasTexture(atlas);
    tex.colorSpace = THREE.SRGBColorSpace;
    U.uBackTex.value = tex;
    const ids = [...tripPhotos(16), ...Object.keys(S.slides)].filter((id, i, a) => a.indexOf(id) === i).slice(0, N * N);
    ids.forEach((id, i) => {
      const im = new Image();
      im.onload = () => {
        // the atlas is read bottom row first (the texture is flipped), so photograph i sits in row N-1-floor(i/N)
        const k = Math.max(C / im.naturalWidth, C / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
        const x = (i % N) * C, y = (N - 1 - Math.floor(i / N)) * C;
        ac.save(); ac.beginPath(); ac.rect(x, y, C, C); ac.clip();
        ac.drawImage(im, x + (C - w) / 2, y + (C - h) / 2, w, h);
        ac.restore();
        tex.needsUpdate = true; kick();
      };
      im.src = K.src(S.slides[id].file, 640);
    });
  }
  // the ring: one print per trip, in a paper border, always facing the eye
  const hung = [];
  let ringAt = 0, ringWant = 0;
  if (CFG.photos === 'ring') {
    const paperC = rgb('--paper');
    for (const t of K.trips) {
      const id = pickOf(t);
      if (!id || !t.countries.length) continue;
      const sl = S.slides[id], ar = sl.w / sl.h, B = 0.06;
      const cv = Object.assign(document.createElement('canvas'), { width: Math.round(360 * ar), height: 360 });
      const cx = cv.getContext('2d');
      cx.fillStyle = paperC; cx.fillRect(0, 0, cv.width, cv.height);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const im = new Image();
      im.onload = () => {
        const b = cv.height * B, w = cv.width - 2 * b, h = cv.height - 2 * b, k = Math.max(w / im.naturalWidth, h / im.naturalHeight);
        cx.save(); cx.beginPath(); cx.rect(b, b, w, h); cx.clip();
        cx.drawImage(im, b + (w - im.naturalWidth * k) / 2, b + (h - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
        cx.restore();
        tex.needsUpdate = true; kick();
      };
      im.src = K.src(sl.file, 640);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ar, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, side: THREE.DoubleSide }));
      mesh.renderOrder = 8; mesh.visible = false;
      scene.add(mesh);
      hung.push({ t, mesh, from: d3.geoCentroid({ type: 'MultiPoint', coordinates: t.countries.map((c) => ll(c.ll)) }) });
    }
  }
  sheet.frustumCulled = false;
  group.add(sheet);

  /* the earth's air: clouds a little above the ground, and a blue rim of atmosphere */
  let clouds = null, air = null;
  if (CFG.earth) {
    const ct = new THREE.CanvasTexture(EARTH ? EARTH.clouds : document.createElement('canvas')); ct.wrapS = THREE.RepeatWrapping; ct.colorSpace = THREE.SRGBColorSpace;
    clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.024, 128, 64), new THREE.MeshLambertMaterial({ map: ct, transparent: true, depthWrite: false, opacity: 0 }));
    clouds.rotation.y = -Math.PI / 2; clouds.visible = false; clouds.renderOrder = 6;
    group.add(clouds);
    air = new THREE.Mesh(new THREE.SphereGeometry(R * 1.065, 96, 48), new THREE.ShaderMaterial({
      uniforms: { uOp: { value: 0 }, uCol: { value: new THREE.Color(0x7fb4ff) } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uOp; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; void main(){ float r = 1.0 - abs(dot(vN, vV)); float a = pow(smoothstep(0.15, 0.72, r), 1.6) * (1.0 - smoothstep(0.7, 1.0, r)); gl_FragColor = vec4(uCol, a * uOp); }',
      transparent: true, depthWrite: false, side: THREE.FrontSide,
    }));
    air.visible = false; air.renderOrder = 7;
    group.add(air);
  }

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
    fly: lineSet(colours.fly || colours.route, CFG.pen ? 1.25 : 1.5, 1),
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
    return { c, to: ll(c.ll), go: d3.geoInterpolate(home, ll(c.ll)), d: d3.geoDistance(home, ll(c.ll)), first: firstYear[c.id], dur: 1700 + Math.min(1, km / 13000) * 3600, p: 0, end: dot(colours.sea, colours.fly || colours.route, CFG.pen ? 0.009 : 0.011), plane: null, ringM: null };
  });
  flights.forEach((f) => { f.end.visible = false; });
  const longest = Math.max(...flights.map((f) => f.dur));
  // with the pen, each country's wash comes as its route lands (a share of the whole opening)
  LAND = {};
  if (CFG.pen) for (const f of flights) if (K.ISO[f.c.id]) LAND[K.ISO[f.c.id]] = Math.min(1, f.dur / longest + 0.06);
  const homeDot = dot(colours.ink, colours.ink, 0.012);
  const stops = [];
  const planeGeo = planeShape();

  /* the state */
  const st = { fold: 0, want: 0, kx: 0, ky: 0, center: START, spin: [121, 23.5], tilt: 0, drag: [0, 0], drop: CFG.rise && !K.reduced ? 1 : 0 };
  let year = Infinity, hereYear = null, nowTrip = null, hover = null, flying = false;
  const ops = { grat: 0, fly: 1, past: 0, here: 0, now: 0 }, opsNow = { ...ops };
  let rewound = false;

  // the gores close facing the flat map's own middle (the strips are cut there), and the prints land
  // where they were hung; only the finished globe turns to the trip being read
  const turned = () => (CFG.gores || CFG.tiles ? smooth(0.82, 1, st.fold) : st.fold);
  const facing = () => [START + turnBy(START, st.spin[0] + st.drag[0]) * turned(), clamp(st.spin[1] + st.drag[1], -60, 60) * turned()];

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
    // the gores and the prints: the lines are lifted off while they are apart, and laid back on the closed globe
    const gate = CFG.gores || CFG.tiles ? Math.max(1 - smooth(0.02, 0.14, st.fold), smooth(0.9, 1, st.fold)) : 1;
    for (const k of Object.keys(ops)) if (sets[k].material.opacity !== opsNow[k] * gate) sets[k].material.opacity = opsNow[k] * gate;
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
    let s1 = CFG.frame1 || 2.3;
    // scroll-craft: at the peak, before the globe docks, it is shown large on the whole screen
    if (CRAFT) s1 = 2.05 + (s1 - 2.05) * (parseFloat(getComputedStyle(fig).getPropertyValue('--dock')) || 0);
    const fw = (2 * Math.PI * (CFG.bleed ? 1 : 1.01)) * (1 - f) + s1 * f, fh = (CFG.bleed ? 0 : 136 * RAD * 1.06) * (1 - f) + s1 * f;
    const cy = (CFG.bleed ? 8 : 12) * RAD * (1 - f), plane = R * (1 - f) + 0.25 * f;
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

  /* the ring of his prints round the globe (gallery-ring) */
  // each print lifts off the wall where its trip went, on its own clock, newest first, and travels to
  // its place in a ring round the closed globe; the ring turns so the trip being read hangs at the
  // bottom, a third larger
  const RING_R = 1.36, RING_H = 0.2, ringFrom = new THREE.Vector3();
  function placeRing() {
    const n = hung.length, f = st.fold;
    const d = ((ringWant - ringAt) % n + n * 1.5) % n - n / 2;
    ringAt = K.reduced || Math.abs(d) < 0.002 ? ringWant : ringAt + d * 0.08;
    hung.forEach((p, i) => {
      const s = smoother(clamp((f - 0.12 - (i / n) * 0.22) / 0.6, 0, 1));
      p.mesh.visible = s > 0.001;
      if (!p.mesh.visible) return;
      group.localToWorld(place(p.from[0], p.from[1], 0.004, { ...st, fold: 0, center: START }, ringFrom));
      const th = ((i - ringAt) / n) * TAU, front = Math.pow(Math.max(0, Math.cos(th)), 6);
      p.mesh.position.set(ringFrom.x + (Math.sin(th) * RING_R - ringFrom.x) * s, ringFrom.y + (-Math.cos(th) * RING_R - ringFrom.y) * s, ringFrom.z * (1 - s) + 0.45 * Math.sin(Math.PI * s));
      p.mesh.quaternion.copy(camera.quaternion);
      p.mesh.scale.setScalar(RING_H * (1 + 0.33 * front * s));
      p.mesh.material.opacity = smooth(0, 0.18, s);
    });
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
  // scroll-craft: the map's box changes with the scroll before the fold starts, so draw on scroll
  if (CRAFT) addEventListener('scroll', kick, { passive: true });
  function frame(now) {
    raf = 0;
    for (const tw of [...tweens]) if (tw(now) === false) tweens.delete(tw);
    // the fold carries a little weight: it follows the scroll instead of jumping with it
    if (CFG.wave && st.fold !== st.want) { const d = st.want - st.fold; st.fold = Math.abs(d) < 0.0008 ? st.want : st.fold + d * 0.11; linesDirty = true; }
    U.uFold.value = st.fold;
    if (CFG.wave && !K.reduced) {
      if (st.fold > 0.985 && !st.closed) { st.closed = true; pulseHome(); }
      else if (st.fold < 0.9) st.closed = false;
    }
    for (const k of Object.keys(ops)) {
      const d = ops[k] - opsNow[k];
      if (Math.abs(d) > 0.003) { opsNow[k] += d * 0.14; linesDirty = true; } else if (opsNow[k] !== ops[k]) { opsNow[k] = ops[k]; linesDirty = true; }
    }
    const [kx, ky] = bends(st.fold);
    const [c, tl] = facing();
    if (kx !== st.kx || ky !== st.ky || c !== st.center || tl !== st.tilt) linesDirty = true;
    st.kx = kx; st.ky = ky; st.center = c; st.tilt = tl;
    U.uKx.value = kx; U.uKy.value = ky; U.uCenter.value = c * RAD;
    U.uLit.value = CFG.rise && !CFG.unlit ? Math.max(st.fold, 0.7) : st.fold;
    if (CFG.earth) {
      const f = st.fold, ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
      U.uAlive.value = ss(0.05, 0.8, f);
      const co = ss(0.82, 1, f), ao = ss(0.6, 1, f);
      clouds.visible = !CFG.noClouds && co > 0.01; clouds.material.opacity = 0.7 * co;
      clouds.material.map.offset.x = -c / 360 + (K.reduced ? 0 : now / 900000);
      air.visible = ao > 0.01; air.material.uniforms.uOp.value = 0.6 * ao;
      comets(now);
    }
    const off = c / 360;
    for (const t of texes) t.offset.x = off;
    if (mat.bumpMap) mat.bumpMap.offset.x = off;
    if (mat.specularMap) mat.specularMap.offset.x = off;
    group.rotation.x = tl * RAD - 0.32 * st.drop * st.drop;
    group.position.set(0, -0.25 * st.drop, 0.5 * st.drop);
    group.updateMatrixWorld();
    if (linesDirty) { buildLines(); placeMarks(); linesDirty = false; }
    frameCamera();
    if (hung.length) placeRing();
    // drawn only inside the map's own box, as the SVG was
    const r = target();
    if (under) {
      // the photographs under the map: shown inside its box, once the cuts have opened, until the reading takes over
      // (through: as the globe docks, the photograph opens out to the whole screen, as the reading shows it)
      const dk = parseFloat(getComputedStyle(fig).getPropertyValue('--dock')) || 0;
      const through = CFG.photos === 'through', open = through ? 1 - dk : 1;
      const show = smooth(0.1, 0.3, st.fold) * (through ? 1 : 1 - smooth(0.15, 0.6, dk));
      const set = (k, v) => under.style.setProperty(k, v);
      set('--show', show.toFixed(3));
      set('--t', `${r.y * open}px`); set('--l', `${r.x * open}px`); set('--w', `${r.w}px`); set('--h', `${r.h}px`);
      set('--r', `${(W - r.x - r.w) * open}px`); set('--b', `${(H - r.y - r.h) * open}px`);
    }
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    renderer.setScissor(r.x, H - r.y - r.h, r.w, r.h);
    renderer.render(scene, camera);
    // the earth keeps living while it is a globe: the clouds drift, light runs along the trip
    const alive = CFG.earth && !K.reduced && st.fold > 0.85 && !document.hidden;
    if (alive || moving || ringAt !== ringWant || st.fold !== st.want || tweens.size || Object.keys(ops).some((k) => opsNow[k] !== ops[k])) kick();
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

  // light running along the trip being read: a small bright point travelling each flight, again and again
  const cometPool = [];
  function comets(now) {
    const legs = CFG.earth && nowTrip && st.fold > 0.85 ? allLegs.filter((L) => L.t === nowTrip && L.flight) : [];
    while (cometPool.length < legs.length) { const d = dot('#fff7e8', colours.route, 0.0085); d.visible = false; cometPool.push(d); }
    cometPool.forEach((d, i) => {
      const L = legs[i];
      if (!L) { d.visible = false; return; }
      const t = ((now / 2600) + i * 0.37) % 1, g = L.go(t), g2 = L.go(Math.min(1, t + 0.01));
      d.visible = true;
      lay(d, g[0], g[1], base + arcH(L.d, t) + 0.005, d.r * (0.7 + 0.6 * Math.sin(Math.PI * t)), [g2[0], g2[1], base + arcH(L.d, Math.min(1, t + 0.01)) + 0.005]);
    });
  }

  // home answers once when the world has closed round it: one ring opening out from Taiwan
  const pulse = new THREE.Mesh(ring, basic(colours.route, { opacity: 0 }));
  pulse.visible = false; pulse.renderOrder = 5; group.add(pulse);
  function pulseHome() {
    pulse.visible = true;
    tween(1500, (k) => {
      const e = easeOut(k);
      pulse.material.opacity = 0.9 * (1 - k);
      lay(pulse, ...home, base + 0.004, 0.014 + e * 0.11);
      if (k >= 1) pulse.visible = false;
    });
  }

  // where a country's main piece sits on the screen right now (for the opening photograph)
  window.JourneyMapScreen = (iso) => {
    const f = visitedF.find((g) => g.id === iso);
    if (!f) return null;
    const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map((c) => ({ type: 'Polygon', coordinates: c })) : [f.geometry];
    const main = polys.reduce((a, b) => (d3.geoArea(b) > d3.geoArea(a) ? b : a));
    const [[lo0, la0], [lo1, la1]] = d3.geoBounds(main);
    const r = renderer.domElement.getBoundingClientRect();
    const scr = (lon, lat) => { const v = place(lon, lat, 0, { ...st, fold: 0 }, new THREE.Vector3()).applyMatrix4(group.matrixWorld).project(camera); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; };
    const a = scr(lo0, la1), b = scr(lo1, la0), c = scr(...d3.geoCentroid(main));
    return { x: c[0], y: c[1], w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) };
  };

  /* the six words journey.js speaks */
  function setFold(a) {
    a = K.reduced ? (a < 0.5 ? 0 : 1) : a;
    // the prints each ease on their own clocks, so the page's ease (cubic in and out) is taken back off:
    // the fold keeps the scroll's even pace and no stretch of it rushes
    if (CFG.tiles) a = a < 0.5 ? Math.cbrt(a / 4) : 1 - Math.cbrt(2 * (1 - a)) / 2;
    if (CFG.wave && !K.reduced) { if (Math.abs(a - st.want) < 0.0005) return; st.want = a; }
    else { if (Math.abs(a - st.fold) < 0.0005) return; st.fold = a; st.want = a; }
    ops.grat = CFG.noGrat ? 0 : rewound || a > 0 ? (CFG.earth ? 0.16 : 0.55) * a : 0;
    kick();
  }
  function trip(t) {
    if (t === nowTrip) return;
    nowTrip = t;
    underFor(t);
    if (hung.length) { ringWant = Math.max(0, hung.findIndex((p) => p.t === (t || K.trips[0]))); kick(); }
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
    if (window.JourneyOpening) window.JourneyOpening.skip();
    linesDirty = true; kick();
    onLand(flights.length, true, 1);
  }
  function flyOut(onLand) {
    if (K.reduced) { settled(onLand); return; }
    // an opening photograph may be on screen first (open.js): the map waits for it to land
    if (window.JourneyOpening && !window.JourneyOpening.done) { st.drop = 0; window.JourneyOpening.ready.then(() => flyOut(onLand)); return; }
    flying = true;
    const planes = CFG.pen ? [] : flights.map((f) => { const m = new THREE.Mesh(planeGeo, basic(colours.ink, { opacity: 1 })); m.visible = false; group.add(m); return m; });
    const rings = CFG.pen ? [] : flights.map(() => { const m = new THREE.Mesh(ring, basic(colours.route, { opacity: 0 })); m.visible = false; group.add(m); return m; });
    // the plate is laid down on the table first, then the planes leave
    const lay0 = st.drop > 0 ? 650 : 0;
    // the opening photograph's country comes up at once, under the photograph as it lands
    let openFloor = 0;
    const oiso = window.JourneyOpening && window.JourneyOpening.iso;
    if (CFG.rise && oiso && isoFirst[oiso]) {
      const ys = [...new Set(visitedF.map((f) => isoFirst[f.id]))].sort((a, b) => a - b);
      const target = (0.12 + 0.86 * (ys.indexOf(isoFirst[oiso]) + 1) / ys.length) / 1.08 + 0.004;
      tween(900, (k) => { openFloor = target * easeOut(k); U.uReveal.value = Math.max(U.uReveal.value, openFloor); });
    }
    if (st.drop > 0) tween(1100, (k) => { st.drop = 1 - easeOut(k); });
    const t0 = performance.now() + lay0;
    let landed = -1;
    tweens.add((now) => {
      const el = now - t0;
      if (el < 0) return true;
      let busy = false, n = 0;
      flights.forEach((f, i) => {
        const t = clamp(el / f.dur, 0, 1);
        f.p = ease(t);
        // the pen: only the line, drawn out from Taiwan; the country's wash answers when it lands
        if (CFG.pen) { if (t >= 1) { n++; f.end.on = true; } else busy = true; return; }
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
      if (CFG.rise) U.uReveal.value = Math.max(p, openFloor);
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
      if (CRAFT) removeEventListener('scroll', kick);
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
