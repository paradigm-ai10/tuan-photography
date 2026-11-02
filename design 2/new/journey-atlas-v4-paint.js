/* Contour globe 等高線地球 (version 4): the paper, drawn in form-lines. Copied from Atlas 足跡 and
   changed: one base sheet for the whole globe in olive form-lines, a dark ink coast, three slate
   waterlines offshore and a pale clay wash for his countries; a sharper patch close in, its lines worked
   out again for the area in view; and a small hidden map of his countries used to tell which one a point
   is in. No graticule and no painted shading: the lines carry the form. */
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
  // a crop of a larger world image (src.x0, src.y0 its corner in that image): coordinates move into the crop
  sx -= src.x0 || 0; sy -= src.y0 || 0;
  sx = Math.max(0, Math.floor(sx)); sy = Math.max(0, Math.floor(sy));
  sw = Math.max(1, Math.min(src.w - sx, Math.ceil(sw))); sh = Math.max(1, Math.min(src.h - sy, Math.ceil(sh)));
  dw = Math.max(1, Math.round(Math.min(dw, sw))); dh = Math.max(1, Math.round(Math.min(dh, sh)));
  // a relief already decoded once (src.bmp) is cut straight from memory; otherwise from the compressed file
  try { return await createImageBitmap(src.bmp || src.blob, sx, sy, sw, sh, { resizeWidth: dw, resizeHeight: dh, resizeQuality: 'high' }); }
  catch (e) { try { return await createImageBitmap(src.bmp || src.blob, sx, sy, sw, sh); } catch (e2) { return null; } }
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
    const Wd = src.W || src.w, Hd = src.H || src.h; // the whole world's size in this image's pixels
    const bmp = await cut(src, ((l - k + 180) / 360) * Wd, ((90 - win.latT) / 180) * Hd, ((r - l) / 360) * Wd, ((win.latT - win.latB) / 180) * Hd, (r - l) * sx, H);
    if (bmp) parts.push({ bmp, dx: (l - win.lngL) * sx, dw: (r - l) * sx });
  }
  return parts.length ? parts : null;
}
const closeAll = (parts) => { if (parts) for (const p of parts) p.bmp.close && p.bmp.close(); };

/* ---------- version 4: the ink ---------- */
// The spec's own colours: a warm paper, olive form-lines, a dark ink coast, slate waterlines offshore and a
// pale clay wash for his countries. They are this globe's, not the page's tokens.
export const INK = { paper: '#f9f6f1', olive: '#6a603e', coast: '#26201c', slate: '#37504f', clay: '#955b3e' };
const WASH_ALPHA = 0.12;              // one layer per visit, up to three, multiplied
const WATER = [0.15, 0.09, 0.05];     // the three waterlines: where the blurred land mask falls to these values
const WATER_ALPHA = [0.7, 0.52, 0.36];
// Line weights in screen pixels. The spec's 0.5 and 0.9 px read as nothing on a real screen once the paper is
// lit and the sheet filtered down to the whole world, so the lines are drawn a little heavier and darker:
// the form-lines and the coast must carry the globe on their own (there is no shading under them).
const LW = { thin: 0.75, heavy: 1.3, water: 0.65, coast: 1.25, border: 0.6 };
const LA = { thin: 0.78, heavy: 0.95, coast: 1, border: 0.4 };
// The sharper patch takes over below about 1.6: the sheet's lines are drawn for the whole-world view, and
// much closer than 1.6 they would be magnified past their weight, so the patch carries every height below.
export const PATCH_EDGE = 1.6;

const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 120 }) : setTimeout(() => f({ timeRemaining: () => 8, didTimeout: true }), 16));
const matFor = (W, H, win, k) => {
  const sx = W / (win.lngR - win.lngL), sy = H / (win.latT - win.latB);
  return new DOMMatrix([sx, 0, 0, sy, (k - win.lngL) * sx, win.latT * sy]);
};
function fillWin(g, W, H, win, path) {
  for (const k of shiftsOf(win)) { g.setTransform(matFor(W, H, win, k)); g.fill(path); }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
// the path copied into pixels, so a stroke is as wide across as it is along
function pathWin(W, H, win, path) { const p = new Path2D(); for (const k of shiftsOf(win)) p.addPath(path, matFor(W, H, win, k)); return p; }

/* ---------- the field: the relief's brightness on a grid, and the land ---------- */
// Honest note: the form-lines follow the shaded relief's brightness (light and shadow on the slopes), not
// true altitude. They read as the shape of the ground the way a hand-drawn form-line map does, but a
// line here is not a height above the sea.
async function sampleGrid(src, shapes, win, n, m) {
  const cv = document.createElement('canvas');
  cv.width = n; cv.height = m;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = 'rgb(206,206,206)';
  g.fillRect(0, 0, n, m);
  const parts = await reliefFor(src, win, n, m);
  if (parts) for (const p of parts) g.drawImage(p.bmp, p.dx, 0, p.dw, m);
  closeAll(parts);
  const px = g.getImageData(0, 0, n, m).data;
  const lum = new Float32Array(n * m);
  for (let k = 0; k < n * m; k++) lum[k] = (px[k * 4] + px[k * 4 + 1] + px[k * 4 + 2]) / 3;
  g.fillStyle = '#000'; g.fillRect(0, 0, n, m);
  g.fillStyle = '#fff';
  fillWin(g, n, m, win, shapes.land);
  const mp = g.getImageData(0, 0, n, m).data;
  const mask = new Float32Array(n * m);
  for (let k = 0; k < n * m; k++) mask[k] = mp[k * 4] / 255;
  cv.width = cv.height = 1;
  return { lum, mask, n, m, relief: !!parts };
}
const blurred = (arr, n, m, r) => { const d = Float32Array.from(arr); if (r > 0.05) window.d3.blur2({ data: d, width: n, height: m }, r); return d; };
// the sea takes the flat ground's brightness, so the coast itself draws no form-line
function prepare(grid, flat, rLum, rMask) {
  const { lum, mask, n, m } = grid;
  const v = new Float32Array(n * m);
  for (let k = 0; k < n * m; k++) v[k] = mask[k] * lum[k] + (1 - mask[k]) * flat;
  return { v: blurred(v, n, m, rLum), water: blurred(mask, n, m, rMask), n, m };
}
function centile(h, tot, q) { let c = 0; for (let i = 0; i < h.length; i++) { c += h[i]; if (c >= tot * q) return i; } return h.length - 1; }
function landHistogram(vals, mask) {
  const h = new Float64Array(256); let tot = 0;
  for (let k = 0; k < vals.length; k++) if (mask[k] > 0.5) { h[Math.max(0, Math.min(255, Math.round(vals[k])))]++; tot++; }
  return { h, tot };
}
// The lines are spaced out from the flat ground's brightness both ways (the lit and the shaded slopes);
// the base sheet holds about 24 of them, every fourth one heavier.
function levelsFor(field, s, lo, hi, cap = 180) {
  for (;;) {
    const out = [], step = field.delta / s;
    for (let k = 0; k < 4000; k++) {
      const off = field.gap + k * step, up = field.mode + off, dn = field.mode - off;
      if (up > hi && dn < lo) break;
      const heavy = (k + 1) % 4 === 0;
      if (up <= hi && up >= lo) out.push({ v: up, heavy });
      if (dn >= lo && dn <= hi) out.push({ v: dn, heavy });
    }
    if (out.length <= cap || s <= 0.25) return out;
    s /= 2;
  }
}
// How finely a patch divides the sheet's spacing: so that on the steeper ground in view (the 70th centile
// of the slope of brightness, per screen pixel) the lines fall about 7 px apart, as on the sheet. Rounded to
// a power of two, so the patch's lines are the sheet's lines plus new ones between them. Coming closer
// over detailed relief, the spacing halves and finer lines arrive; once the relief runs out of detail (its
// pixels larger than the screen's), it stops dividing and opens up again instead of crowding.
const TARGET_PX = 7;
function subdivFor(v, mask, n, m, pxPerCell, delta, target = TARGET_PX) {
  const g = [];
  for (let j = 1; j < m - 1; j += 2) for (let i = 1; i < n - 1; i += 2) {
    const k = j * n + i;
    if (mask[k] < 0.5) continue;
    const gx = (v[k + 1] - v[k - 1]) / 2, gy = (v[k + n] - v[k - n]) / 2;
    g.push(Math.hypot(gx, gy));
  }
  if (g.length < 16) return 1;
  g.sort((a, b) => a - b);
  const perPx = g[Math.floor(g.length * 0.7)] / pxPerCell;
  if (!(perPx > 1e-6)) return 1;
  const s = delta / (perPx * target);
  return Math.min(8, Math.max(0.25, 2 ** Math.round(Math.log2(s))));
}

// Marching squares, straight to line segments: the lines are only ever stroked, so no polygons are put
// together. One pass over the grid serves every level; each square only looks at the levels between its
// lowest and highest corner. Values sit at cell centres, so a point (x, y) here is (i + 0.5, j + 0.5).
// Saddles are settled by the square's mean. Out: per level, a flat list x1, y1, x2, y2 in grid units.
const EDGES = [null, [0, 3], [0, 1], [3, 1], [1, 2], null, [0, 2], [3, 2], [3, 2], [0, 2], null, [1, 2], [3, 1], [0, 1], [0, 3], null];
function isoRows(v, n, m, L, out, j0, j1) {
  const K = L.length, ex = [0, 0, 0, 0], ey = [0, 0, 0, 0];
  for (let j = j0; j < j1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = v[j * n + i], b = v[j * n + i + 1], c = v[(j + 1) * n + i + 1], d = v[(j + 1) * n + i];
      const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
      if (hi < L[0] || lo > L[K - 1]) continue;
      let k0 = 0, k1 = K;
      while (k0 < k1) { const h = (k0 + k1) >> 1; if (L[h] <= lo) k0 = h + 1; else k1 = h; }
      for (let k = k0; k < K && L[k] <= hi; k++) {
        const t = L[k];
        const cs = (a >= t ? 1 : 0) | (b >= t ? 2 : 0) | (c >= t ? 4 : 0) | (d >= t ? 8 : 0);
        if (cs === 0 || cs === 15) continue;
        const x = i + 0.5, y = j + 0.5;
        ex[0] = x + (t - a) / (b - a); ey[0] = y;
        ex[1] = x + 1; ey[1] = y + (t - b) / (c - b);
        ex[2] = x + (t - d) / (c - d); ey[2] = y + 1;
        ex[3] = x; ey[3] = y + (t - a) / (d - a);
        const o = out[k];
        if (cs === 5 || cs === 10) {
          const high = (a + b + c + d) / 4 >= t;
          const aroundBD = cs === 5 ? high : !high; // the two segments cut off corners b and d
          if (aroundBD) { o.push(ex[0], ey[0], ex[1], ey[1], ex[2], ey[2], ex[3], ey[3]); }
          else { o.push(ex[0], ey[0], ex[3], ey[3], ex[1], ey[1], ex[2], ey[2]); }
          continue;
        }
        const e = EDGES[cs];
        o.push(ex[e[0]], ey[e[0]], ex[e[1]], ey[e[1]]);
      }
    }
  }
}
function sortedLevels(levels) { return levels.map((l, i) => ({ ...l, i })).sort((p, q) => p.v - q.v); }
function contourAll(v, n, m, levels) {
  const S = sortedLevels(levels), out = S.map(() => []);
  if (S.length) isoRows(v, n, m, S.map((l) => l.v), out, 0, m - 1);
  return S.map((l, k) => ({ ...l, seg: out[k] }));
}
// the same in idle time, a band of rows at a time, so a patch never holds up a frame
function contourIdle(v, n, m, levels, stale) {
  return new Promise((resolve) => {
    const S = sortedLevels(levels), out = S.map(() => []), L = S.map((l) => l.v);
    if (!S.length) { resolve([]); return; }
    let j = 0;
    const step = (dl) => {
      if (stale()) { resolve(null); return; }
      do { const j1 = Math.min(m - 1, j + 16); isoRows(v, n, m, L, out, j, j1); j = j1; }
      while (j < m - 1 && dl && dl.timeRemaining() > 3);
      if (j < m - 1) idle(step); else resolve(S.map((l, k) => ({ ...l, seg: out[k] })));
    };
    idle(step);
  });
}
function segsInto(p, seg, sx, sy) {
  for (let q = 0; q < seg.length; q += 4) { p.moveTo(seg[q] * sx, seg[q + 1] * sy); p.lineTo(seg[q + 2] * sx, seg[q + 3] * sy); }
}

/* ---------- paint one window: paper, form-lines on the land, waterlines on the sea, borders, coast ---------- */
function paintSheet(g, W, H, win, P) {
  const { shapes, lines, water, lineK, n, m } = P;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.fillStyle = INK.paper;
  g.fillRect(0, 0, W, H);
  const land = pathWin(W, H, win, shapes.land);
  const sx = W / n, sy = H / m;
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (lines && lines.length) {
    g.save();
    g.clip(land);
    const thin = new Path2D(), heavy = new Path2D();
    for (const l of lines) segsInto(l.heavy ? heavy : thin, l.seg, sx, sy);
    g.strokeStyle = INK.olive;
    g.globalAlpha = LA.thin; g.lineWidth = LW.thin * lineK; g.stroke(thin);
    g.globalAlpha = LA.heavy; g.lineWidth = LW.heavy * lineK; g.stroke(heavy);
    g.restore();
  }
  if (water && water.length) {
    g.save();
    const sea = new Path2D(); sea.rect(0, 0, W, H); sea.addPath(land);
    g.clip(sea, 'evenodd');
    g.strokeStyle = INK.slate; g.lineWidth = LW.water * lineK;
    water.forEach((w) => { const p = new Path2D(); segsInto(p, w.seg, sx, sy); g.globalAlpha = WATER_ALPHA[w.i] || 0.3; g.stroke(p); });
    g.restore();
  }
  g.strokeStyle = INK.coast;
  g.globalAlpha = LA.border; g.lineWidth = LW.border * lineK;
  g.setLineDash([0.1, 2.2 * lineK]);
  g.stroke(pathWin(W, H, win, shapes.borders));
  g.setLineDash([]);
  g.globalAlpha = LA.coast; g.lineWidth = LW.coast * lineK;
  g.stroke(pathWin(W, H, win, shapes.coast));
  g.globalAlpha = 1;
}
// his countries in clay: white, then one multiplied layer per visit (up to three)
function paintWash(g, W, H, win, shapes, layers) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = INK.clay; g.globalAlpha = WASH_ALPHA;
  for (let pass = 1; pass <= 3; pass++) shapes.visited.forEach((v, i) => { if (v.path && (layers[i] || 0) >= pass) fillWin(g, W, H, win, v.path); });
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}

/* ---------- the wash in the material: one shared uWash, so the opening can deepen it ---------- */
export const uWash = { value: 1 };
// The warm light tints white paper yellow; every sheet's material is multiplied by this (linear) colour so the
// lit paper comes out at the paper's own #f9f6f1. Worked out by the page from its lights (journey-atlas-v4.js).
export const paperFix = new THREE.Color(1, 1, 1);
export function washable(material, tex) {
  material.userData.washMap = { value: tex || null };
  material.onBeforeCompile = (sh) => {
    sh.uniforms.washMap = material.userData.washMap;
    sh.uniforms.uWash = uWash;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D washMap;\nuniform float uWash;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n#ifdef USE_MAP\n\tdiffuseColor.rgb *= mix( vec3( 1.0 ), texture2D( washMap, vMapUv ).rgb, uWash );\n#endif');
  };
  material.customProgramCacheKey = () => 'wash';
  return material;
}
const texOf = (renderer, cv, mips) => {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (mips) { t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); }
  else { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  renderer.initTexture(t);
  cv.width = cv.height = 1;
  return t;
};

/* ---------- the base: one field for the whole world, its lines computed once ---------- */
// rLum and rMask: blur radii in grid cells (the caller works them out from screen pixels at world view)
export async function makeBase({ shapes, reliefSrc, n = 1024, m = 512, rLum = 1, rMask = 2.5 }) {
  const win = { lngL: -180, lngR: 180, latB: -90, latT: 90 };
  const grid = await sampleGrid(reliefSrc, shapes, win, n, m);
  const raw = landHistogram(grid.lum, grid.mask);
  let mode = 206, best = -1;
  for (let i = 1; i < 255; i++) { const c = raw.h[i - 1] + raw.h[i] + raw.h[i + 1]; if (c > best) { best = c; mode = i; } }
  const f = prepare(grid, mode, rLum, rMask);
  const hb = landHistogram(f.v, grid.mask);
  const lo0 = centile(hb.h, hb.tot, 0.004), hi0 = centile(hb.h, hb.tot, 0.996);
  // the flat ground's own grain (a level or two either side of it) draws nothing: the first line stands clear of it
  const delta = Math.max(1.6, (hi0 - lo0) / 24);
  const field = { mode, delta, gap: delta + 1.5, lo: lo0, hi: hi0, lo0, hi0 };
  const lines = grid.relief ? contourAll(f.v, n, m, levelsFor(field, 1, lo0, hi0)) : [];
  const water = contourAll(f.water, n, m, WATER.map((v) => ({ v })));
  return { field, lines, water, n, m, relief: grid.relief };
}
export async function paintBase({ renderer, material, shapes, layers, base, size, lineK }) {
  const W = size, H = size / 2;
  const win = { lngL: -180, lngR: 180, latB: -90, latT: 90 };
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  paintSheet(cv.getContext('2d'), W, H, win, { shapes, lines: base.lines, water: base.water, lineK, n: base.n, m: base.m });
  const wcv = document.createElement('canvas');
  wcv.width = 2048; wcv.height = 1024;
  paintWash(wcv.getContext('2d'), 2048, 1024, win, shapes, layers);
  const tex = texOf(renderer, cv, true), wtex = texOf(renderer, wcv, true);
  // the old sheet leaves the graphics card before the new one arrives, so the two are never held at once
  const old = material.map, oldW = material.userData.washMap && material.userData.washMap.value;
  material.map = tex; material.userData.washMap.value = wtex;
  material.color.copy(paperFix); material.needsUpdate = true;
  if (old) old.dispose();
  if (oldW) oldW.dispose();
  return tex;
}

/* ---------- the detail patch: a piece of sphere just above the sheet, its lines worked out for the view ---------- */
// The patch is drawn again for the area in view at a finer grid, with the same line weights and spacing in
// screen pixels as the sheet, so finer lines arrive as you come in. pxPerDeg(alt): screen pixels per degree
// of latitude at the centre of the view.
const dimsFor = (win, size) => {
  const latC = (win.latB + win.latT) / 2;
  const a = ((win.lngR - win.lngL) * Math.max(0.17, Math.cos(latC * D))) / (win.latT - win.latB);
  return a >= 1 ? [size, Math.max(64, Math.round(size / a))] : [Math.max(64, Math.round(size * a)), size];
};
export function createPatch({ renderer, scene, shapes, layers, reliefSrc, homeSrc = null, size, base, pxPerDeg, gridMax = 512 }) {
  // the sharper relief over home (a crop of the 10800 one), used for any window that lies inside it
  const inside = (win, s) => s && s.bounds && win.lngL >= s.bounds.lngL && win.lngR <= s.bounds.lngR && win.latB >= s.bounds.latB && win.latT <= s.bounds.latT;
  const srcFor = (win) => (inside(win, homeSrc) && !(reliefSrc && reliefSrc.w >= 10800) ? homeSrc : reliefSrc);
  let cur = null, next = null, fadeT = 0, painting = false, painted = null, gen = 0;
  let level = 0;
  let primed = [], primeClosed = false;

  function makeMesh(win, cv, wcv, { radius = 1.00003, mips = false, order = 1 } = {}) {
    const geo = new THREE.SphereGeometry(radius, 96, 96,
      (win.lngL + 180) * D, (win.lngR - win.lngL) * D, (90 - win.latT) * D, (win.latT - win.latB) * D);
    const tex = texOf(renderer, cv, mips), wtex = texOf(renderer, wcv, false);
    const mat = washable(new THREE.MeshLambertMaterial({ map: tex, color: paperFix.clone(), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), wtex);
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = order;
    m.userData = { win, show: 1 };
    scene.add(m);
    return m;
  }
  function drop(m) {
    if (!m) return;
    scene.remove(m);
    m.geometry.dispose(); m.material.map.dispose();
    if (m.material.userData.washMap.value) m.material.userData.washMap.value.dispose();
    m.material.dispose();
  }

  // everything a patch needs, worked out for one window and one height; sync for the opening, idle otherwise
  async function build(win, alt, { sz = size, sync = false, stale = () => false, mips = false, radius, order, target } = {}) {
    const [W, H] = dimsFor(win, sz);
    const [n, m] = dimsFor(win, gridMax);
    const spanLat = win.latT - win.latB;
    const ppd = pxPerDeg(alt);
    const pxPerCell = ppd * (spanLat / m);
    const grid = await sampleGrid(srcFor(win), shapes, win, n, m);
    if (stale()) return null;
    const f = prepare(grid, base.field.mode, Math.min(5, Math.max(1.2, 3 / pxPerCell)), Math.min(30, Math.max(1.5, 14 / pxPerCell)));
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < n * m; k++) if (grid.mask[k] > 0.5) { const x = f.v[k]; if (x < lo) lo = x; if (x > hi) hi = x; }
    lo = Math.max(lo, base.field.lo0); hi = Math.min(hi, base.field.hi0);
    const sub = subdivFor(f.v, grid.mask, n, m, pxPerCell, base.field.delta, target);
    const levels = grid.relief && hi > lo ? levelsFor(base.field, sub, lo, hi) : [];
    const lines = sync ? contourAll(f.v, n, m, levels) : await contourIdle(f.v, n, m, levels, stale);
    if (!lines || stale()) return null;
    const water = contourAll(f.water, n, m, WATER.map((v) => ({ v })));
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    // line widths in pixels of the patch, so they read at the sheet's weights on screen at this height
    const lineK = Math.max(0.5, (H / spanLat) / ppd);
    paintSheet(cv.getContext('2d'), W, H, win, { shapes, lines, water, lineK, n, m });
    const wcv = document.createElement('canvas');
    const [ww, wh] = dimsFor(win, Math.max(256, sz / 2));
    wcv.width = ww; wcv.height = wh;
    paintWash(wcv.getContext('2d'), ww, wh, win, shapes, layers);
    const mesh = makeMesh(win, cv, wcv, { mips, radius, order });
    return mesh;
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
    const r = cam.alt / w.alt;
    return r > 1.7 || r < 1 / 1.7;
  }
  function fits(w, cam, view) {
    const dLat = view.halfH / 1.35 / D, dLng = (view.halfW / 1.35 / D) / Math.max(0.17, Math.cos(cam.lat * D));
    if (cam.lat - dLat < w.latB - 0.01 && w.latB > -82) return false;
    if (cam.lat + dLat > w.latT + 0.01 && w.latT < 82) return false;
    if (Math.abs(offLng(cam, w)) + dLng > (w.lngR - w.lngL) / 2 + 0.01) return false;
    return cam.alt / w.alt < 2.2;
  }

  function paint(cam, view, done) {
    painting = true;
    const my = gen;
    const win = windowFor(cam, view);
    build(win, cam.alt, { stale: () => my !== gen }).then((mesh) => {
      if (my !== gen) { if (mesh) drop(mesh); return; }
      painting = false;
      if (!mesh) return;
      drop(next);
      next = mesh;
      fadeT = 0;
      painted = win;
      done && done();
    }).catch((e) => { console.warn('patch', e); if (my === gen) painting = false; });
  }

  return {
    /* the opening's patches, built before anything moves: [{ win, alt, size, out: [a, b] | null }] */
    // sync: worked out at once (the first one, before anything shows); otherwise in idle time
    async prime(specs, sync = true) {
      const my = gen;
      for (const s of specs) {
        if (primeClosed) break;
        const mesh = await build(s.win, s.alt, { sz: s.size, sync, mips: true, radius: s.radius, order: s.order, target: s.target, stale: () => my !== gen || primeClosed });
        // the opening may already be over (a touch rushes it): a late patch is not kept
        if (mesh && my === gen && !primeClosed) primed.push({ mesh, out: s.out });
        else if (mesh) drop(mesh);
      }
      return primed.length;
    },
    /* called each frame; returns true while the patch is fading in or out */
    update(cam, view, still, reduce, wake, dt, arriving) {
      level = 1 - smooth(Math.log(PATCH_EDGE * 0.8), Math.log(PATCH_EDGE * 1.25), Math.log(cam.alt));
      // the opening's patches: each hands over by height alone, not by time
      const showPrimed = (k = 1) => {
        for (const p of primed) {
          const out = p.out ? 1 - smooth(Math.log(p.out[0]), Math.log(p.out[1]), Math.log(cam.alt)) : 1;
          p.mesh.material.opacity = level * out * k;
          p.mesh.visible = p.mesh.material.opacity > 0.001;
        }
      };
      if (arriving) { showPrimed(); return false; }
      primeClosed = true;
      // An opening cut short leaves the camera close in: its patches (they sit at their true places) stay
      // under the view until the first patch of the viewer's own has come in, so the coarse sheet never shows
      // magnified in between.
      if (primed.length) {
        // they fade out as the viewer's first patch fades in, and go once it is in
        if (cur || level <= 0.001) { for (const p of primed) drop(p.mesh); primed = []; }
        else showPrimed(next ? 1 - fadeT : 1);
      }
      if (level <= 0.001) {
        if (cur) { drop(cur); cur = null; }
        if (next) { drop(next); next = null; }
        painted = null;
        gen++;
        painting = false;
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
      return busy;
    },
    painting: () => painting,
    level: () => level,
    setRelief(src) { reliefSrc = src; },
    reset() { gen++; drop(cur); drop(next); cur = next = null; painted = null; painting = false; for (const p of primed) drop(p.mesh); primed = []; },
  };
}
