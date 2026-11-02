/* Porcelain globe 素燒地球 (version 3): the porcelain sheets. One set of sheets for the whole globe,
   a sharper set painted for the part in view once you come close, and a small hidden map of his countries
   used to tell which one a point is in. The body is one unglazed colour; the relief is light and shadow
   from a normal map; the sea is a smoother satin a little lower than the land; his countries are glazed in
   clay. The shapes, the pick map and the relief loading are row 13's, unchanged. */
import * as THREE from 'three';

const D = Math.PI / 180;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const ALIAS = { usa: 'United States of America', uk: 'United Kingdom', dubai: 'United Arab Emirates', 'south-korea': 'South Korea' };

/* ---------- the shapes, once: Path2D in degrees (x = longitude, y = minus latitude) ---------- */
export function makeShapes(world, countries) {
  const d3 = window.d3, topo = window.topojson;
  const proj = d3.geoEquirectangular().scale(180 / Math.PI).translate([0, 0]).precision(0.1);
  const toPath = (geo) => { const p = new Path2D(); d3.geoPath(proj, p)(geo); return p; };
  const feats = topo.feature(world, world.objects.countries).features;
  const byName = new Map(feats.map((f) => [f.properties && f.properties.name, f]));
  const visited = countries.map((c) => {
    const f = byName.get(ALIAS[c.id] || c.name.en);
    return f ? { id: c.id, feature: f, path: toPath(f) } : { id: c.id, feature: null, path: null };
  });
  return {
    land: toPath(topo.feature(world, world.objects.land)),
    coast: toPath(topo.mesh(world, world.objects.land)),
    borders: toPath(topo.mesh(world, world.objects.countries, (a, b) => a !== b)),
    visited,
    features: feats,
  };
}

/* ---------- which of his countries a point is in: a 2048 sheet, each country its own shade ---------- */
// Each country is written in two channels that are not in step with each other (red (i+1)*10, green and
// blue scrambled numbers), and a pixel counts only when all three match one country exactly and it is opaque. The
// soft edge where two countries meet blends both channels, so it can never pass for a third country.
// Coast pixels (partly covered, over the sea) carry one country's colour and are kept within a small margin.
// green and blue are quadratic in i, so a blend of two countries' colours never lands on a third
const pickGreen = (i) => ((i * i * 37 + i * 11 + 5) % 251) + 1;
const pickBlue = (i) => ((i * i * 53 + i * 17 + 101) % 241) + 7;
export function makePick(shapes) {
  const W = 2048, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.setTransform(W / 360, 0, 0, H / 180, W / 2, H / 2);
  shapes.visited.forEach((v, i) => {
    if (!v.path) return;
    g.fillStyle = `rgb(${(i + 1) * 10},${pickGreen(i)},${pickBlue(i)})`;
    g.fill(v.path);
  });
  const px = g.getImageData(0, 0, W, H).data;
  const code = new Int8Array(W * H).fill(-1);
  const n = shapes.visited.length;
  for (let k = 0; k < W * H; k++) {
    const a = px[k * 4 + 3];
    if (a < 40) continue;
    const r = px[k * 4], gr = px[k * 4 + 1], bl = px[k * 4 + 2];
    const i = Math.round(r / 10) - 1;
    if (i < 0 || i >= n) continue;
    if (a >= 250) {
      // fully covered: one country exactly, or a blend of two (rejected)
      if (r === (i + 1) * 10 && gr === pickGreen(i) && bl === pickBlue(i)) code[k] = i;
    } else if (Math.abs(r - (i + 1) * 10) <= 2 && Math.abs(gr - pickGreen(i)) <= 2 && Math.abs(bl - pickBlue(i)) <= 2) {
      // a coast pixel, partly covered over the sea: one country, a little rounded by the edge
      code[k] = i;
    }
  }
  cv.width = cv.height = 1;
  return (lat, lng) => {
    const x = Math.floor((((lng + 180) % 360 + 360) % 360) / 360 * W), y = Math.floor((90 - lat) / 180 * H);
    if (y < 0 || y >= H) return -1;
    return code[y * W + Math.min(W - 1, x)];
  };
}

/* ---------- the shaded relief: kept as the compressed file, cut to the window each time ---------- */
// The 10800 relief decoded whole is about 230 MB; holding it would cost that for as long as the page is
// open. The file itself is a few MB, so each painting decodes only the piece it needs, at the size it
// needs, and lets it go straight after.
export async function loadRelief(url, w, h) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('relief');
  return { blob: await r.blob(), w, h };
}
async function cut(src, sx, sy, sw, sh, dw, dh) {
  sx = Math.max(0, Math.floor(sx)); sy = Math.max(0, Math.floor(sy));
  sw = Math.max(1, Math.min(src.w - sx, Math.ceil(sw))); sh = Math.max(1, Math.min(src.h - sy, Math.ceil(sh)));
  dw = Math.max(1, Math.round(Math.min(dw, sw))); dh = Math.max(1, Math.round(Math.min(dh, sh)));
  try { return await createImageBitmap(src.blob, sx, sy, sw, sh, { resizeWidth: dw, resizeHeight: dh, resizeQuality: 'high' }); }
  catch (e) { try { return await createImageBitmap(src.blob, sx, sy, sw, sh); } catch (e2) { return null; } }
}
const shiftsOf = (win) => { const out = []; for (let k = -1; k <= 1; k++) if (win.lngL < 180 + 360 * k && win.lngR > -180 + 360 * k) out.push(360 * k); return out; };
// the pieces of relief a window needs, one per copy of the world it reaches into, each with where it goes
async function reliefFor(src, win, W, H) {
  if (!src || !window.createImageBitmap) return null;
  const sx = W / (win.lngR - win.lngL);
  const parts = [];
  for (const k of shiftsOf(win)) {
    const l = Math.max(win.lngL, -180 + k), r = Math.min(win.lngR, 180 + k);
    if (r <= l) continue;
    const bmp = await cut(src, ((l - k + 180) / 360) * src.w, ((90 - win.latT) / 180) * src.h, ((r - l) / 360) * src.w, ((win.latT - win.latB) / 180) * src.h, (r - l) * sx, H);
    if (bmp) parts.push({ bmp, dx: (l - win.lngL) * sx, dw: (r - l) * sx });
  }
  return parts.length ? parts : null;
}
const closeAll = (parts) => { if (parts) for (const p of parts) p.bmp.close && p.bmp.close(); };

/* ---------- the porcelain: one window of the globe as four sheets ---------- */
// For a window { lngL, lngR, latB, latT } it makes, at W x H pixels:
//   map       the unglazed body colour (the sea a shade cooler and greyer than the land), with his
//             countries glazed in clay at 25 %
//   normal    the relief as real light and shadow: a Sobel of the relief's luminance, plus a small step
//             at every coast, because the sea is a satin surface set a little lower than the land
//   orm       red: the relief's luminance as ambient occlusion; green: roughness (land 0.9, sea 0.6, glaze 0.35)
//   height    (only when asked) the same heights, small, for the desktop's displacement
// Nothing else is painted: no lines, no names, no borders. Up close, the patch adds one hairline round
// the glazed countries only.
// SEA: the satin sea is a shade apart from the land (review 2026-11-02: unvisited land vanished at the
// world view), so the continents read by tone as well as by the coast step. Glaze lowered from 35 % to
// 25 % so his countries glint rather than sit as a flat pink fill.
export const BODY = '#f4efe6', SEA = '#ebe6de', GLAZE = '#955b3e', GLAZE_A = 0.25, HAIR = '#d2cbc2';
const ROUGH = { land: 0.9, sea: 0.6, glaze: 0.35 };
// relief: how steep the relief's luminance reads (per base pixel of 360/4096 degrees)
// bevel: the coast step, per pixel of whatever sheet is painted (so it looks the same at every scale)
export const TUNE = { relief: 15, bevel: 3 };
const REF_DEG = 360 / 4096;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function canvasOf(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// a shape list filled in white on black, read back as one byte a pixel
function maskOf(W, H, win, paths) {
  const cv = canvasOf(W, H), g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  const sx = W / (win.lngR - win.lngL), sy = H / (win.latT - win.latB);
  for (const k of shiftsOf(win)) {
    g.setTransform(sx, 0, 0, sy, (k - win.lngL) * sx, win.latT * sy);
    for (const p of paths) if (p) g.fill(p);
  }
  const d = g.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4];
  cv.width = cv.height = 1;
  return out;
}
// a separable box blur of radius r, twice (close to a Gaussian), on a byte mask
function blur(src, W, H, r) {
  let a = src, b = new Uint8Array(W * H);
  const n = 2 * r + 1;
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < H; y++) {
      const o = y * W;
      let s = 0;
      for (let x = -r; x <= r; x++) s += a[o + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        b[o + x] = (s / n + 0.5) | 0;
        s += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
      }
    }
    const c = new Uint8Array(W * H);
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += b[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        c[y * W + x] = (s / n + 0.5) | 0;
        s += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x];
      }
    }
    a = c;
  }
  return a;
}
// the relief's luminance in the window, one byte a pixel (null when there is no relief)
async function lumOf(reliefSrc, win, W, H) {
  const parts = await reliefFor(reliefSrc, win, W, H);
  if (!parts) return null;
  const cv = canvasOf(W, H), g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  for (const p of parts) g.drawImage(p.bmp, p.dx, 0, p.dw, H);
  closeAll(parts);
  const d = g.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0;
  cv.width = cv.height = 1;
  return out;
}

export async function paintPorcelain({ shapes, reliefSrc, win, W, H, reliefAmt = 1, hair = 0, heightSize = 0 }) {
  const land = maskOf(W, H, win, [shapes.land]);
  const glazed = maskOf(W, H, win, shapes.visited.map((v) => v.path));
  const soft = blur(land, W, H, 2);   // the 2 px coast bevel
  const lum = reliefAmt > 0.005 ? await lumOf(reliefSrc, win, W, H) : null;
  const sx = W / (win.lngR - win.lngL), sy = H / (win.latT - win.latB);
  const N = W * H;
  // relief heights on land only, in luminance units; the sea is flat
  const rel = new Float32Array(N);
  if (lum) for (let i = 0; i < N; i++) rel[i] = land[i] * lum[i] * (1 / 65025) * reliefAmt;

  const body = hex(BODY), sea = hex(SEA), glaze = hex(GLAZE);
  const mapCv = canvasOf(W, H), nCv = canvasOf(W, H), oCv = canvasOf(W, H);
  const mg = mapCv.getContext('2d'), ng = nCv.getContext('2d'), og = oCv.getContext('2d');
  const mI = mg.createImageData(W, H), nI = ng.createImageData(W, H), oI = og.createImageData(W, H);
  const md = mI.data, nd = nI.data, od = oI.data;
  // Slopes are measured per degree, so the relief reads the same however close the sheet is painted; a
  // sharper relief file has steeper pixels, so its slopes are scaled back to the 4096 file's
  const kSrc = reliefSrc && reliefSrc.w > 4096 ? 0.75 * 4096 / reliefSrc.w : 1;
  const rk = TUNE.relief * kSrc * REF_DEG * sy, bk = TUNE.bevel / 255;
  for (let y = 0; y < H; y++) {
    const lat = win.latT - (y + 0.5) / sy;
    // a pixel is narrower east to west away from the equator, so the same rise is steeper across
    const kx = TUNE.relief * kSrc * REF_DEG * sx / Math.max(0.12, Math.cos(lat * D));
    const y0 = Math.max(0, y - 1) * W, y1 = y * W, y2 = Math.min(H - 1, y + 1) * W;
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - 1), x2 = Math.min(W - 1, x + 1);
      const i = y1 + x;
      // Sobel, divided by 8 so it is a slope per pixel
      const gxR = (rel[y0 + x2] + 2 * rel[y1 + x2] + rel[y2 + x2] - rel[y0 + x0] - 2 * rel[y1 + x0] - rel[y2 + x0]) / 8;
      const gyR = (rel[y2 + x0] + 2 * rel[y2 + x] + rel[y2 + x2] - rel[y0 + x0] - 2 * rel[y0 + x] - rel[y0 + x2]) / 8;
      const gxB = (soft[y0 + x2] + 2 * soft[y1 + x2] + soft[y2 + x2] - soft[y0 + x0] - 2 * soft[y1 + x0] - soft[y2 + x0]) / 8;
      const gyB = (soft[y2 + x0] + 2 * soft[y2 + x] + soft[y2 + x2] - soft[y0 + x0] - 2 * soft[y0 + x] - soft[y0 + x2]) / 8;
      // canvas y runs south; the texture's v runs north
      let nx = -(gxR * kx + gxB * bk), ny = gyR * rk + gyB * bk, nz = 1;
      const l = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      nx *= l; ny *= l; nz *= l;
      const j = i * 4;
      nd[j] = (nx * 0.5 + 0.5) * 255; nd[j + 1] = (ny * 0.5 + 0.5) * 255; nd[j + 2] = (nz * 0.5 + 0.5) * 255; nd[j + 3] = 255;
      // body and glaze (the glaze sits on land only)
      const gz = (glazed[i] * land[i]) / 65025 * GLAZE_A, ls = soft[i] / 255;
      for (let c = 0; c < 3; c++) { const b = sea[c] + (body[c] - sea[c]) * ls; md[j + c] = b + (glaze[c] - b) * gz; }
      md[j + 3] = 255;
      // ambient occlusion from the relief's luminance on land, none at sea; roughness by surface
      const s = soft[i] / 255;
      const ao = lum ? 255 - (255 - lum[i]) * (land[i] / 255) * reliefAmt : 255;
      const gl = (glazed[i] / 255) * s;
      const rough = ROUGH.sea + (ROUGH.land - ROUGH.sea) * s + (ROUGH.glaze - ROUGH.land) * gl;
      od[j] = ao; od[j + 1] = rough * 255; od[j + 2] = 0; od[j + 3] = 255;
    }
  }
  mg.putImageData(mI, 0, 0); ng.putImageData(nI, 0, 0); og.putImageData(oI, 0, 0);
  if (hair > 0) {
    // the one line on the body, close in only: a hairline round his countries
    const p = new Path2D();
    for (const k of shiftsOf(win)) for (const v of shapes.visited) if (v.path) p.addPath(v.path, new DOMMatrix([sx, 0, 0, sy, (k - win.lngL) * sx, win.latT * sy]));
    mg.strokeStyle = HAIR; mg.lineWidth = hair; mg.lineJoin = 'round';
    mg.stroke(p);
  }
  let hCv = null;
  if (heightSize) {
    // the land a little proud of the sea, the mountains on top: 0 sea, 1 the highest relief
    const hw = heightSize, hh = heightSize / 2;
    hCv = canvasOf(hw, hh);
    const hg = hCv.getContext('2d'), hI = hg.createImageData(hw, hh), hd = hI.data;
    for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
      const i = Math.floor((y + 0.5) * H / hh) * W + Math.floor((x + 0.5) * W / hw);
      const v = Math.min(255, soft[i] * 0.55 + (lum ? rel[i] * 255 * 0.45 : 0));
      const j = (y * hw + x) * 4;
      hd[j] = hd[j + 1] = hd[j + 2] = v; hd[j + 3] = 255;
    }
    hg.putImageData(hI, 0, 0);
  }
  return { map: mapCv, normal: nCv, orm: oCv, height: hCv };
}

function texOf(renderer, cv, { color = false, mips = true } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.generateMipmaps = mips;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  renderer.initTexture(t);
  return t;
}
const freeCanvas = (cv) => { if (cv) cv.width = cv.height = 1; };

/* ---------- the base: the whole globe, once ---------- */
export const BASE_RELIEF = 1;
export const NORMAL_SCALE = 0.9;
// The relief's strength by altitude (review 2026-11-02: at a country the land read as moulded clay):
// the full 0.9 at the world view, easing to 0.35 by the country level, where the patch takes over.
export const normalAt = (alt) => 0.35 + 0.55 * smooth(0.45, 1.6, alt);
export async function paintBase({ renderer, material, shapes, reliefSrc, size, heightSize = 0 }) {
  const W = size, H = size / 2;
  const win = { lngL: -180, lngR: 180, latB: -90, latT: 90 };
  const sheets = await paintPorcelain({ shapes, reliefSrc, win, W, H, reliefAmt: reliefSrc ? 1 : 0, heightSize });
  const old = [material.map, material.normalMap, material.roughnessMap, material.displacementMap];
  material.map = texOf(renderer, sheets.map, { color: true });
  material.normalMap = texOf(renderer, sheets.normal);
  const orm = texOf(renderer, sheets.orm);
  material.roughnessMap = orm; material.aoMap = orm;
  material.displacementMap = sheets.height ? texOf(renderer, sheets.height) : null;
  material.needsUpdate = true;
  for (const t of new Set(old)) if (t) t.dispose();
  // the pixels are on the graphics card now; the canvases let their memory go
  for (const k of ['map', 'normal', 'orm', 'height']) freeCanvas(sheets[k]);
  return material.map;
}

/* ---------- the detail patch: a piece of porcelain just above the base, painted for the view ---------- */
// The relief follows the base far out and eases away close in, where the relief file has nothing sharper
// to give (spec: smoothstep(0.03, 0.08, alt)); the coast step and the glaze stay.
// Moved up to smoothstep(0.07, 0.18) on 2026-11-02: at a city (alt 0.06) the relief file's own pixels
// showed as blocky squares in the light; the city now reads as smooth bisque with the coast step only.
const reliefAt = (alt) => BASE_RELIEF * smooth(0.07, 0.18, alt);
export function createPatch({ renderer, parent, shapes, reliefSrc, size, lightsMat }) {
  let cur = null, next = null, fadeT = 0, painting = false, painted = null, gen = 0;
  let level = 0;

  function makeMesh(win, sheets) {
    const geo = new THREE.SphereGeometry(1.00003, 96, 96,
      (win.lngL + 180) * D, (win.lngR - win.lngL) * D, (90 - win.latT) * D, (win.latT - win.latB) * D);
    const orm = texOf(renderer, sheets.orm, { mips: false });
    const mat = new THREE.MeshStandardMaterial({
      map: texOf(renderer, sheets.map, { color: true, mips: false }),
      normalMap: texOf(renderer, sheets.normal, { mips: false }),
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: orm, aoMap: orm, aoMapIntensity: lightsMat.aoMapIntensity,
      roughness: 1, metalness: 0,
      transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 1;
    m.userData = { win, show: 1 };
    for (const k of ['map', 'normal', 'orm']) freeCanvas(sheets[k]);
    parent.add(m);
    return m;
  }
  function drop(m) {
    if (!m) return;
    m.parent && m.parent.remove(m);
    m.geometry.dispose();
    for (const t of new Set([m.material.map, m.material.normalMap, m.material.roughnessMap])) t && t.dispose();
    m.material.dispose();
  }

  function windowFor(cam, view) {
    // 1.6 times what is in view, latitude kept within 80 degrees, longitude widened by 1/cos
    const halfLat = Math.min(40, (view.halfH / D) * 1.6);
    const latC = Math.max(-80, Math.min(80, cam.lat));
    const latB = Math.max(-82, latC - halfLat), latT = Math.min(82, latC + halfLat);
    const cosl = Math.max(0.17, Math.cos(latC * D));
    const halfLng = Math.min(90, ((view.halfW / D) * 1.6) / cosl);
    return { lngL: cam.lng - halfLng, lngR: cam.lng + halfLng, latB, latT, alt: cam.alt };
  }
  const offLng = (cam, w) => ((cam.lng - (w.lngL + w.lngR) / 2 + 540) % 360) - 180;

  function needs(cam) {
    if (!painted) return true;
    const w = painted;
    const span = w.lngR - w.lngL, spanY = w.latT - w.latB;
    if (Math.abs(offLng(cam, w)) > span * 0.2) return true;
    if (Math.abs(cam.lat - (w.latB + w.latT) / 2) > spanY * 0.2) return true;
    if (Math.abs(reliefAt(cam.alt) - reliefAt(w.alt)) > 0.12) return true;
    const r = cam.alt / w.alt;
    return r > 1.7 || r < 1 / 1.7;
  }
  function fits(w, cam, view) {
    const dLat = view.halfH / 1.35 / D, dLng = (view.halfW / 1.35 / D) / Math.max(0.17, Math.cos(cam.lat * D));
    if (cam.lat - dLat < w.latB - 0.01 && w.latB > -82) return false;
    if (cam.lat + dLat > w.latT + 0.01 && w.latT < 82) return false;
    if (Math.abs(offLng(cam, w)) + dLng > (w.lngR - w.lngL) / 2 + 0.01) return false;
    if (Math.abs(reliefAt(cam.alt) - reliefAt(w.alt)) > 0.18) return false;
    return cam.alt / w.alt < 2.2;
  }

  function paint(cam, view, done) {
    painting = true;
    const my = gen;
    const run = async () => {
      const win = windowFor(cam, view);
      // the hairline reads about 0.4 of a screen pixel wide
      const hair = 0.4 * Math.max(1, size / 1400);
      const sheets = await paintPorcelain({ shapes, reliefSrc, win, W: size, H: size, reliefAmt: reliefAt(cam.alt), hair });
      if (my !== gen) { for (const k of ['map', 'normal', 'orm']) freeCanvas(sheets[k]); painting = false; return; }
      drop(next);
      next = makeMesh(win, sheets);
      fadeT = 0;
      painted = win;
      painting = false;
      done && done();
    };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 50 }); else setTimeout(run, 16);
  }

  return {
    update(cam, view, still, reduce, wake, dt) {
      level = 1 - smooth(Math.log(0.45 * 0.85), Math.log(0.45 * 1.15), Math.log(cam.alt));
      const ns = normalAt(cam.alt);
      for (const m of [cur, next]) if (m) m.material.normalScale.set(ns, ns);
      if (level <= 0.001) {
        if (cur) { drop(cur); cur = null; }
        if (next) { drop(next); next = null; }
        painted = null;
        gen++;
        return false;
      }
      if (still && !painting && !next && needs(cam)) paint({ ...cam }, view, wake);
      let busy = false;
      const k = reduce ? 1 : Math.min(dt, 0.05) / 0.16;
      if (cur) {
        const want = fits(cur.userData.win, cam, view) ? 1 : 0, s = cur.userData.show;
        cur.userData.show = want === s ? s : want > s ? Math.min(1, s + k) : Math.max(0, s - k);
        if (cur.userData.show !== want) busy = true;
      }
      if (next) {
        fadeT = reduce ? 1 : Math.min(1, fadeT + Math.min(dt, 0.05) / 0.22);
        next.material.opacity = level * fadeT;
        busy = busy || fadeT < 1;
        if (fadeT >= 1) { drop(cur); cur = next; cur.userData.show = 1; next = null; }
      }
      if (cur) { cur.material.opacity = level * cur.userData.show; cur.visible = cur.material.opacity > 0.001; }
      return busy || painting;
    },
    painting: () => painting,
    level: () => level,
    reset() { gen++; drop(cur); drop(next); cur = next = null; painted = null; painting = false; },
  };
}
