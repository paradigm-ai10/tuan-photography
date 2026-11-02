/* Atlas, version 1 "Varnished globe" 上漆紙地球 (2026-11-02): the painted paper of a hand-made
   globe. One base sheet for the whole globe, a sharper patch painted for the part in view once you
   come close, and a small hidden map of his countries used to tell which one a point is in.
   Painted in this order at every scale, so the patch lies on the sheet without a seam: a warm sea
   that deepens toward each coast, the land, the shaded relief multiplied in, one clay watercolour
   wash per visit with its pigment pooled at the border, the borders, the coasts, and (on the base
   sheet only) the ocean names in both languages. No graticule, no gores. */
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

/* ---------- the colours of the painted globe ---------- */
export const INK = {
  land: '#f9f6f1',
  sea: '#e8e3da',
  shore: '#d2cbc2',
  clay: '#955b3e',
  ink: '#5c534c',
  border: '#d2cbc2',
};

/* ---------- the sea deepening toward the coasts: a distance field, made once ---------- */
// The land, white on black, blurred (24 px on a 4096 sheet; here 12 px on a 2048 one, the same
// width on the globe). Over the sea the blur is 0.5 at the shore and falls away offshore; the shore
// colour is laid on with alpha = smoothstep(0.02, 0.5, blur), so the sea darkens as it nears land.
// Held as one small canvas (2048 x 1024) and drawn, scaled, into every window.
export function makeSeaShade(shapes) {
  const W = 2048, H = 1024;
  const mask = document.createElement('canvas');
  mask.width = W; mask.height = H;
  const m = mask.getContext('2d');
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  m.setTransform(W / 360, 0, 0, H / 180, W / 2, H / 2);
  m.fillStyle = '#fff';
  // the land across the dateline too, so the blur runs across it without a seam
  for (const k of [-360, 0, 360]) { m.setTransform(W / 360, 0, 0, H / 180, W / 2 + (k * W) / 360, H / 2); m.fill(shapes.land); }
  m.setTransform(1, 0, 0, 1, 0, 0);
  const blur = document.createElement('canvas');
  blur.width = W; blur.height = H;
  const b = blur.getContext('2d', { willReadFrequently: true });
  b.fillStyle = '#000'; b.fillRect(0, 0, W, H);
  b.filter = 'blur(12px)';
  b.drawImage(mask, 0, 0);
  b.filter = 'none';
  const px = b.getImageData(0, 0, W, H);
  const d = px.data;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * smooth(0.02, 0.5, i / 255));
  const r = parseInt(INK.shore.slice(1, 3), 16), g = parseInt(INK.shore.slice(3, 5), 16), bl = parseInt(INK.shore.slice(5, 7), 16);
  for (let k = 0; k < d.length; k += 4) { const a = lut[d[k]]; d[k] = r; d[k + 1] = g; d[k + 2] = bl; d[k + 3] = a; }
  b.putImageData(px, 0, 0);
  mask.width = mask.height = 1;
  return blur;
}
// the part of the shade a window needs, drawn across it (one piece per copy of the world it reaches)
function drawShade(g, shade, win, W, H) {
  if (!shade) return;
  const sw = shade.width, sh = shade.height, sx = W / (win.lngR - win.lngL);
  for (const k of shiftsOf(win)) {
    const l = Math.max(win.lngL, -180 + k), r = Math.min(win.lngR, 180 + k);
    if (r <= l) continue;
    g.drawImage(shade, ((l - k + 180) / 360) * sw, ((90 - win.latT) / 180) * sh, ((r - l) / 360) * sw, ((win.latT - win.latB) / 180) * sh,
      (l - win.lngL) * sx, 0, (r - l) * sx, H);
  }
}

/* ---------- the ocean names, as on a printed globe ---------- */
const OCEANS = [
  { en: 'Pacific Ocean', zh: '太平洋', lat: 14, lng: 168 },
  { en: 'Pacific Ocean', zh: '太平洋', lat: -16, lng: -128 },
  { en: 'Atlantic Ocean', zh: '大西洋', lat: 24, lng: -44 },
  { en: 'Atlantic Ocean', zh: '大西洋', lat: -24, lng: -18 },
  { en: 'Indian Ocean', zh: '印度洋', lat: -24, lng: 80 },
  { en: 'Southern Ocean', zh: '南冰洋', lat: -60, lng: 40 },
  { en: 'Southern Ocean', zh: '南冰洋', lat: -60, lng: -150 },
];
export function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load('400 32px "Playfair Display"', 'PACIFIC OCEAN'),
    document.fonts.load('500 32px "Noto Serif TC"', '太平洋大西洋印度洋南冰洋'),
  ]).catch(() => {});
}
function paintOceans(g, W, H) {
  const k = W / 4096;
  g.save();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = INK.ink;
  g.globalAlpha = 0.3;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  for (const o of OCEANS) {
    const x = ((o.lng + 180) / 360) * W, y = ((90 - o.lat) / 180) * H;
    // the sheet is pressed onto a ball: across it is squeezed by cos(latitude), so the name is
    // painted that much wider to read true on the globe
    const stretch = 1 / Math.max(0.3, Math.cos(o.lat * D));
    g.setTransform(stretch, 0, 0, 1, x, y);
    g.font = `400 ${Math.round(26 * k)}px "Playfair Display", Georgia, serif`;
    try { g.letterSpacing = `${(0.32 * 26 * k).toFixed(1)}px`; } catch (e) { /* older canvas */ }
    g.fillText(o.en.toUpperCase(), 0, 0);
    g.font = `500 ${Math.round(21 * k)}px "Noto Serif TC", serif`;
    try { g.letterSpacing = `${(0.6 * 21 * k).toFixed(1)}px`; } catch (e) { /* older canvas */ }
    g.fillText(o.zh, 0, Math.round(32 * k));
  }
  try { g.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  g.restore();
}

/* ---------- paint one window of the globe onto a canvas ---------- */
// win: { lngL, lngR, latB, latT } in degrees (lngL may run below -180 or lngR above 180)
// layers[i]: how many clay washes country i gets (one per visit, at most four)
const POOL_DEG = (6 * 360) / 4096; // the pooled edge is 6 px wide on a 4096 sheet, the same width on the globe at every scale
function paintWindow(g, W, H, win, P) {
  const { shapes, layers, relief, reliefAlpha, lineK, shade, oceans, poolMax = 160 } = P;
  const sx = W / (win.lngR - win.lngL), sy = H / (win.latT - win.latB);
  const shifts = shiftsOf(win);
  const mat = (k) => new DOMMatrix([sx, 0, 0, sy, (k - win.lngL) * sx, win.latT * sy]);
  const fillAll = (path) => { for (const k of shifts) { g.setTransform(mat(k)); g.fill(path); } g.setTransform(1, 0, 0, 1, 0, 0); };
  // strokes are copied into pixels first, so a line is as wide across as it is along
  const pathAll = (path) => { const p = new Path2D(); for (const k of shifts) p.addPath(path, mat(k)); return p; };

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.filter = 'none';
  // the sea, a warm wash, deepening toward each coast
  g.fillStyle = INK.sea;
  g.fillRect(0, 0, W, H);
  drawShade(g, shade, win, W, H);
  // the land
  g.fillStyle = INK.land;
  fillAll(shapes.land);
  const land = pathAll(shapes.land);
  // the shaded relief multiplied in, only on land
  if (relief && reliefAlpha > 0.005) {
    g.save();
    g.clip(land);
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = reliefAlpha;
    for (const p of relief) g.drawImage(p.bmp, p.dx, 0, p.dw, H);
    g.restore();
  }
  // the clay: one watercolour wash per visit, each with its pigment pooled at the border
  // (on the patch it is capped in the patch's own pixels, so close in it stays a thin pooled edge
  // instead of a wide band across the screen)
  const pool = Math.min(poolMax, Math.max(1, POOL_DEG * sx));
  g.globalCompositeOperation = 'multiply';
  shapes.visited.forEach((v, i) => {
    const n = Math.min(4, layers[i] || 0);
    if (!v.path || !n) return;
    // a country well outside the window costs nothing
    const p = pathAll(v.path);
    for (let w = 0; w < n; w++) {
      g.globalAlpha = 0.14;
      g.fillStyle = INK.clay;
      g.fill(p);
    }
    // the pooled edge: a soft stroke kept inside the border (the stroke is twice as wide, half of it
    // clipped away), once per wash, so a country he went back to has a darker rim too
    g.save();
    g.clip(p);
    g.strokeStyle = INK.clay;
    g.lineWidth = pool * 2;
    g.lineJoin = 'round';
    g.filter = `blur(${(pool * 0.6).toFixed(1)}px)`;
    g.globalAlpha = 1 - Math.pow(1 - 0.25, n);
    g.stroke(p);
    g.filter = 'none';
    g.restore();
  });
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // the borders, in the shore colour, then the coasts in ink
  g.strokeStyle = INK.border;
  g.globalAlpha = 1; g.lineWidth = 0.5 * lineK;
  g.stroke(pathAll(shapes.borders));
  g.strokeStyle = INK.ink;
  g.globalAlpha = 0.85; g.lineWidth = 0.8 * lineK;
  g.stroke(pathAll(shapes.coast));
  g.globalAlpha = 1;
  if (oceans) paintOceans(g, W, H);
}

/* ---------- the base sheet, the whole globe ---------- */
// Returns the texture; the page cross-fades it in over the sheet it replaces.
export const BASE_RELIEF = 0.22;
export async function paintBase({ renderer, shapes, layers, reliefSrc, size, shade }) {
  const W = size, H = size / 2;
  const win = { lngL: -180, lngR: 180, latB: -90, latT: 90 };
  const relief = await reliefFor(reliefSrc, win, W, H);
  await fontsReady();
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  paintWindow(g, W, H, win, { shapes, layers, relief, reliefAlpha: BASE_RELIEF, lineK: W / 4096, shade, oceans: true });
  closeAll(relief);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  renderer.initTexture(tex);
  // the canvas is on the graphics card now; let the memory go
  cv.width = cv.height = 1;
  return tex;
}

/* ---------- the detail patch: a piece of sphere just above the sheet, painted for the view ---------- */
// relief on the patch follows the base sheet far out and fades away close in
const reliefAt = (alt) => BASE_RELIEF * smooth(0.03, 0.08, alt);
export function createPatch({ renderer, scene, shapes, layers, reliefSrc, size, shade, makeMaterial }) {
  let cur = null, next = null, fadeT = 0, painting = false, painted = null, gen = 0, src = reliefSrc;
  let level = 0;

  function makeMesh(win, cv) {
    const geo = new THREE.SphereGeometry(1.00003, 96, 96,
      (win.lngL + 180) * D, (win.lngR - win.lngL) * D, (90 - win.latT) * D, (win.latT - win.latB) * D);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    // a patch is seen near one to one: no mipmaps, which saves a third of its memory
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    // lit and varnished like the globe under it, so it lies on it without a seam
    const mat = makeMaterial(tex);
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 1;
    m.userData = { win, show: 1 };
    renderer.initTexture(tex);
    cv.width = cv.height = 1;
    scene.add(m);
    return m;
  }
  function drop(m) {
    if (!m) return;
    scene.remove(m);
    m.geometry.dispose(); m.material.map.dispose(); m.material.dispose();
  }

  function windowFor(cam, view) {
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
    if (Math.abs(reliefAt(cam.alt) - reliefAt(w.alt)) > 0.03) return true;
    const r = cam.alt / w.alt;
    return r > 1.7 || r < 1 / 1.7;
  }
  function fits(w, cam, view) {
    const dLat = view.halfH / 1.35 / D, dLng = (view.halfW / 1.35 / D) / Math.max(0.17, Math.cos(cam.lat * D));
    if (cam.lat - dLat < w.latB - 0.01 && w.latB > -82) return false;
    if (cam.lat + dLat > w.latT + 0.01 && w.latT < 82) return false;
    if (Math.abs(offLng(cam, w)) + dLng > (w.lngR - w.lngL) / 2 + 0.01) return false;
    if (Math.abs(reliefAt(cam.alt) - reliefAt(w.alt)) > 0.045) return false;
    return cam.alt / w.alt < 2.2;
  }

  function paint(cam, view, done) {
    painting = true;
    const my = gen;
    const run = async () => {
      const win = windowFor(cam, view);
      const reliefAlpha = reliefAt(cam.alt);
      const relief = reliefAlpha > 0.005 ? await reliefFor(src, win, size, size) : null;
      if (my !== gen) { closeAll(relief); painting = false; return; }
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const g = cv.getContext('2d');
      const lineK = Math.max(1, size / 1400);
      paintWindow(g, size, size, win, { shapes, layers, relief, reliefAlpha, lineK, shade, oceans: false, poolMax: 4 * lineK });
      closeAll(relief);
      drop(next);
      next = makeMesh(win, cv);
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
    // the relief arrives after the patch is made: paint again with it (the old one stays until then)
    setRelief(s) { src = s; gen++; painting = false; painted = null; },
    reset() { gen++; drop(cur); drop(next); cur = next = null; painted = null; painting = false; },
  };
}
