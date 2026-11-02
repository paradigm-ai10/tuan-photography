/* Engraved globe 銅版地球 (version 2 of the Atlas, 2026-11-02): the plate. Ink on paper only, the way
   a copperplate globe is cut: hairline coasts, three waterlines following every coast out to sea,
   the mountains as short hachures read from the shaded relief, a 15 degree graticule, dashed borders,
   and his countries hatched in clay, closer for each visit. Nothing is filled with colour.
   The base sheet holds the paper and its engraving; a second sheet (a mask, read as data) holds the
   clay hatch in red and the coasts in green, so the opening can bring each in on its own.
   Close in, a patch is engraved again for the part in view, with every width and spacing measured
   in screen pixels, so the lines stay hairline from the world down to a city. */
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
    coast: coastPath(coastSegments(world)),
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

/* ---------- the coasts, as plain segments: shared by the painted plate and the opening's ink ---------- */
// Natural Earth cuts the land along 180 degrees and runs Antarctica down to the pole; those cut edges
// are not coast and are left out, on the plate and in the ink alike.
export function coastSegments(world) {
  const mesh = window.topojson.mesh(world, world.objects.land);
  const out = [];
  for (const line of mesh.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      const [a, b] = [line[i], line[i + 1]];
      if (Math.abs(a[0] - b[0]) > 180) continue;
      if (Math.abs(a[0]) > 179.9 && Math.abs(b[0]) > 179.9) continue;
      if (a[1] < -89.5 && b[1] < -89.5) continue;
      out.push(a[0], a[1], b[0], b[1]);
    }
  }
  return new Float32Array(out);
}
function coastPath(seg) {
  const p = new Path2D();
  let lx = NaN, ly = NaN;
  for (let i = 0; i < seg.length; i += 4) {
    if (seg[i] !== lx || seg[i + 1] !== ly) p.moveTo(seg[i], -seg[i + 1]);
    p.lineTo(seg[i + 2], -seg[i + 3]);
    lx = seg[i + 2]; ly = seg[i + 3];
  }
  return p;
}

/* ---------- the waterlines: the land blurred and contoured three times, once ---------- */
// A 2048 by 1024 sample of the land, padded on both sides with the world's other copies so the blur
// runs across 180 degrees, blurred (three box passes, about an 8 px gaussian), then contoured at
// 0.42, 0.30 and 0.18 with d3.contours: the nearest line hugs the coast, the farthest stands off it.
export const WATER = [{ t: 0.42, a: 0.18 }, { t: 0.30, a: 0.10 }, { t: 0.18, a: 0.05 }];
export function makeWater(shapes) {
  const W = 2048, H = 1024, pad = 96, WP = W + pad * 2;
  const cv = document.createElement('canvas');
  cv.width = WP; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000';
  for (const k of [-360, 0, 360]) {
    g.setTransform(W / 360, 0, 0, H / 180, pad + W / 2 + (k * W) / 360, H / 2);
    g.fill(shapes.land);
  }
  const px = g.getImageData(0, 0, WP, H).data;
  cv.width = cv.height = 1;
  let a = new Float32Array(WP * H), b = new Float32Array(WP * H);
  for (let k = 0; k < WP * H; k++) a[k] = px[k * 4 + 3] / 255;
  // separable box blur, three passes of radius 4 (sigma about 8 px over the three)
  const r = 4, n = r * 2 + 1;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) {
      const o = y * WP; let s = 0;
      for (let x = -r; x <= r; x++) s += a[o + Math.min(WP - 1, Math.max(0, x))];
      for (let x = 0; x < WP; x++) {
        b[o + x] = s / n;
        s += a[o + Math.min(WP - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < WP; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += b[Math.min(H - 1, Math.max(0, y)) * WP + x];
      for (let y = 0; y < H; y++) {
        a[y * WP + x] = s / n;
        s += b[Math.min(H - 1, y + r + 1) * WP + x] - b[Math.max(0, y - r) * WP + x];
      }
    }
  }
  b = null;
  const sets = window.d3.contours().size([WP, H]).thresholds(WATER.map((w) => w.t))(a);
  return WATER.map((w, i) => {
    const p = new Path2D();
    const toX = (x) => ((x - pad) * 360) / W - 180, toY = (y) => (y * 180) / H - 90;
    // keep the world's own copy (and a pixel either side, so the copies meet), never the image's edge
    const inside = (q) => q[0] >= pad - 1 && q[0] <= pad + W + 1 && q[1] > 0.6 && q[1] < H - 0.6;
    for (const poly of sets[i].coordinates) for (const ring of poly) {
      let open = false;
      for (let j = 0; j < ring.length - 1; j++) {
        const q0 = ring[j], q1 = ring[j + 1];
        if (!inside(q0) || !inside(q1)) { open = false; continue; }
        if (!open) { p.moveTo(toX(q0[0]), toY(q0[1])); open = true; }
        p.lineTo(toX(q1[0]), toY(q1[1]));
      }
    }
    return p;
  });
}

/* ---------- the relief as a grid of brightness, for the hachures ---------- */
// The relief is read at twice the grid and each cell keeps its darkest quarter, so a narrow ridge's
// shadow is not averaged away. Brightness is measured against the relief's own scale: its flat ground
// (about 0.81) reads 1 and its deepest shadow (0.55 and under) reads 0, so "below 0.62" means the
// shadowed slopes, the way an engraver would choose them.
const FLAT = 0.81, DEEP = 0.55;
async function reliefGrid(src, win, gw, gh) {
  const rw = gw * 2, rh = gh * 2;
  const parts = await reliefFor(src, win, rw, rh);
  if (!parts) return null;
  const cv = document.createElement('canvas');
  cv.width = rw; cv.height = rh;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, rw, rh);
  for (const p of parts) g.drawImage(p.bmp, p.dx, 0, p.dw, rh);
  closeAll(parts);
  const px = g.getImageData(0, 0, rw, rh).data;
  cv.width = cv.height = 1;
  const lum = new Float32Array(gw * gh);
  const at = (x, y) => { const k = (y * rw + x) * 4; return (0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]) / 255; };
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const v = Math.min(at(2 * i, 2 * j), at(2 * i + 1, 2 * j), at(2 * i, 2 * j + 1), at(2 * i + 1, 2 * j + 1));
    lum[j * gw + i] = Math.min(1, Math.max(0, (v - DEEP) / (FLAT - DEEP)));
  }
  return { lum, gw, gh };
}

const idle = () => new Promise((res) => (window.requestIdleCallback ? requestIdleCallback(() => res(), { timeout: 40 }) : setTimeout(res, 0)));
// a small fixed hash, so a cell's jitter is the same every time it is engraved
const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* ---------- engrave one window of the globe onto a canvas ---------- */
// win: { lngL, lngR, latB, latT } in degrees (lngL may run below -180 or lngR above 180).
// layer: 'sheet' (paper, graticule, waterlines, hachures, borders), 'mask' (clay hatch in red,
// coasts in green, on black) or 'all' (everything, in that order, for the patch).
// k: pixels of this canvas per screen pixel, so every width and spacing below is in screen pixels.
export const HATCH = (wash) => (wash >= 0.3 ? 3.5 : wash >= 0.24 ? 5 : wash > 0 ? 7 : 0);
async function engrave(g, W, H, win, P, layer, alive = () => true) {
  const { shapes, C, washes, water, grid, k, hachureFade = 1 } = P;
  // world: 1 for the whole globe seen at once, 0 close in. Seen whole, the plate is cut a little more
  // openly so it stays quiet: the clay hatch wider apart and a touch heavier (so it reads as clay, not
  // as a grey moire), the coasts finer, the graticule paler, the hachures a little darker.
  const world = P.world == null ? 0 : P.world;
  const hatchMul = 1 + 0.6 * world, hatchW = 0.6 + 0.3 * world, coastW = 1.1 - 0.3 * world;
  const gratA = 1 - 0.4 * world, hachMax = 0.55 + 0.15 * world;
  const sx = W / (win.lngR - win.lngL), sy = H / (win.latT - win.latB);
  const shifts = shiftsOf(win);
  const mat = (s) => new DOMMatrix([sx, 0, 0, sy, (s - win.lngL) * sx, win.latT * sy]);
  const inPx = (path) => { const p = new Path2D(); for (const s of shifts) p.addPath(path, mat(s)); return p; };
  const sheet = layer !== 'mask', mask = layer === 'mask', all = layer === 'all';
  let t0 = performance.now();
  const breathe = async () => { if (performance.now() - t0 > 10) { await idle(); t0 = performance.now(); } return alive(); };

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.fillStyle = mask ? '#000' : C.plate.css;
  g.fillRect(0, 0, W, H);
  const land = inPx(shapes.land);

  if (sheet) {
    // the graticule every 15 degrees; the equator and the two tropics a little heavier
    g.strokeStyle = C.grat.css;
    const lines = (heavy) => {
      g.beginPath();
      for (let lng = Math.ceil(win.lngL / 15) * 15; lng <= win.lngR; lng += 15) {
        if (heavy) continue;
        const x = (lng - win.lngL) * sx; g.moveTo(x, 0); g.lineTo(x, H);
      }
      const lats = heavy ? [0, 23.4366, -23.4366] : [-75, -60, -45, -30, -15, 15, 30, 45, 60, 75];
      for (const lat of lats) {
        if (lat < win.latB || lat > win.latT) continue;
        const y = (win.latT - lat) * sy; g.moveTo(0, y); g.lineTo(W, y);
      }
      g.stroke();
    };
    g.globalAlpha = gratA;
    g.lineWidth = 0.6 * k; lines(false);
    g.lineWidth = 0.9 * k; lines(true);
    g.globalAlpha = 1;
    // three waterlines, fainter away from the coast
    g.strokeStyle = C.ink.css; g.lineWidth = 0.6 * k;
    WATER.forEach((w, i) => { g.globalAlpha = w.a; g.stroke(inPx(water[i])); });
    g.globalAlpha = 1;
    if (!(await breathe())) return false;

    // hachures: short strokes along the slope, on a jittered 5 px grid, only where the relief is dark
    if (grid && hachureFade > 0.01) {
      const { lum, gw, gh } = grid;
      const cw = W / gw, ch = H / gh;
      const BUCKETS = 6;
      const paths = Array.from({ length: BUCKETS }, () => new Path2D());
      const L = (i, j) => lum[Math.min(gh - 1, Math.max(0, j)) * gw + Math.min(gw - 1, Math.max(0, i))];
      for (let j = 0; j < gh; j++) {
        const lat = win.latT - ((j + 0.5) * (win.latT - win.latB)) / gh;
        const cosl = Math.max(0.2, Math.cos(lat * D));
        for (let i = 0; i < gw; i++) {
          const v = lum[j * gw + i];
          if (v >= 0.62) continue;
          const dark = (0.62 - v) / 0.62;
          const gx = (L(i + 1, j - 1) + 2 * L(i + 1, j) + L(i + 1, j + 1)) - (L(i - 1, j - 1) + 2 * L(i - 1, j) + L(i - 1, j + 1));
          const gy = (L(i - 1, j + 1) + 2 * L(i, j + 1) + L(i + 1, j + 1)) - (L(i - 1, j - 1) + 2 * L(i, j - 1) + L(i + 1, j - 1));
          // the slope's direction on the ground (the sheet is stretched east to west by 1 / cos(latitude))
          const ang = Math.atan2(gy, gx / cosl) + Math.PI / 2;
          const len = (3 + 3 * hash(i, j, 3)) * k * 0.5;
          const x = (i + 0.5 + (hash(i, j, 1) - 0.5) * 0.9) * cw, y = (j + 0.5 + (hash(i, j, 2) - 0.5) * 0.9) * ch;
          const dx = (Math.cos(ang) * len) / cosl, dy = Math.sin(ang) * len;
          const p = paths[Math.min(BUCKETS - 1, Math.floor(dark * BUCKETS))];
          p.moveTo(x - dx, y - dy); p.lineTo(x + dx, y + dy);
        }
        if ((j & 15) === 15 && !(await breathe())) return false;
      }
      g.save();
      g.clip(land);
      g.strokeStyle = C.ink.css; g.lineWidth = 0.5 * k;
      paths.forEach((p, b) => { g.globalAlpha = hachMax * ((b + 0.5) / BUCKETS) * hachureFade; g.stroke(p); });
      g.restore();
      g.globalAlpha = 1;
      if (!(await breathe())) return false;
    }
    // borders, dashed
    g.strokeStyle = C.border.css; g.lineWidth = 0.4 * k;
    g.setLineDash([2 * k, 2 * k]);
    g.stroke(inPx(shapes.borders));
    g.setLineDash([]);
  }

  if (mask || all) {
    // his countries hatched at 45 degrees, closer for each visit, clipped to the country
    if (mask) g.globalCompositeOperation = 'lighter';
    g.strokeStyle = mask ? '#f00' : C.hatch.css;
    g.lineWidth = hatchW * k;
    for (const sp of [7, 5, 3.5]) {
      const clip = new Path2D();
      let any = false;
      shapes.visited.forEach((v, i) => { if (v.path && HATCH(washes[i]) === sp) { clip.addPath(inPx(v.path)); any = true; } });
      if (!any) continue;
      g.save();
      g.clip(clip);
      const step = sp * hatchMul * k * Math.SQRT2;
      g.beginPath();
      for (let c = -H; c < W + step; c += step) { g.moveTo(c, H); g.lineTo(c + H, 0); }
      g.stroke();
      g.restore();
    }
    // the coasts, last, in full ink
    g.strokeStyle = mask ? '#0f0' : C.ink.css;
    g.lineWidth = coastW * k;
    g.stroke(inPx(shapes.coast));
    g.globalCompositeOperation = 'source-over';
  }
  return true;
}

/* ---------- the base sheet and its mask, the whole globe ---------- */
// k for the whole globe: sheet pixels per screen pixel at the world view, at the centre of the globe
export function sheetK(W, alt, tanHalf) {
  const sheetPerRad = W / (2 * Math.PI);
  const screenPerRad = (Math.max(320, innerHeight) / 2) / (alt * tanHalf);
  return Math.min(4, Math.max(0.6, sheetPerRad / screenPerRad));
}
const toTexture = (renderer, cv, data) => {
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  renderer.initTexture(tex);
  cv.width = cv.height = 1;
  return tex;
};
export async function paintBase({ renderer, shapes, C, washes, water, reliefSrc, size, k }) {
  const W = size, H = size / 2;
  const win = { lngL: -180, lngR: 180, latB: -90, latT: 90 };
  // the relief read on the same 5 px grid the hachures sit on
  const cell = 5 * k;
  const grid = reliefSrc ? await reliefGrid(reliefSrc, win, Math.round(W / cell), Math.round(H / cell)) : null;
  const P = { shapes, C, washes, water, grid, k, world: 1 };
  const a = document.createElement('canvas'); a.width = W; a.height = H;
  await engrave(a.getContext('2d'), W, H, win, P, 'sheet');
  const sheet = toTexture(renderer, a, false);
  // the mask holds only two thin lines (hatch and coast): half the size is enough, with every width
  // still measured in screen pixels (k halves with it)
  const b = document.createElement('canvas'); b.width = W / 2; b.height = H / 2;
  await engrave(b.getContext('2d'), W / 2, H / 2, win, { ...P, k: k / 2 }, 'mask');
  const mask = toTexture(renderer, b, true);
  return { sheet, mask };
}

/* ---------- the detail patch: a piece of sphere just above the sheet, engraved for the view ---------- */
// The patch takes over below about 1.3 (fully below 1.1), early enough that the sheet's lines, cut for
// the world view, never grow past about twice their width before the patch carries them again.
const PATCH_EDGE = 1.3;
const hachuresAt = (alt) => smooth(0.03, 0.08, alt);
export function createPatch({ renderer, scene, shapes, C, washes, water, reliefSrc, size, maxTex, dress }) {
  let cur = null, next = null, fadeT = 0, painting = false, painted = null, gen = 0;
  let level = 0;
  let relief = reliefSrc;

  function makeMesh(win, cv) {
    const geo = new THREE.SphereGeometry(1.00003, 96, 96,
      (win.lngL + 180) * D, (win.lngR - win.lngL) * D, (90 - win.latT) * D, (win.latT - win.latB) * D);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    dress && dress(mat);
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 1;
    m.userData = { win, show: 1 };
    renderer.initTexture(tex);
    cv.width = cv.height = 1;
    scene.add(m);
    return m;
  }
  // a freshly engraved window: if the same window is still fading in (its first pass), its picture is
  // simply exchanged; otherwise it fades in over what is there
  function install(win, cv) {
    painted = win;
    if (next && next.userData.win === win) {
      const old = next.material.map, tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      renderer.initTexture(tex);
      cv.width = cv.height = 1;
      next.material.map = tex; old.dispose();
      return;
    }
    drop(next);
    next = makeMesh(win, cv);
    fadeT = 0;
  }
  function drop(m) {
    if (!m) return;
    scene.remove(m);
    m.geometry.dispose(); m.material.map.dispose(); m.material.dispose();
  }
  // how much of the ground the view really covers, from the centre to an edge of the frame (radians)
  const cover = (alt, theta) => { const d = 1 + alt, s = d * Math.sin(theta); return s >= 1 ? Math.acos(1 / d) : Math.asin(s) - theta; };
  const reach = (cam, v) => {
    const tH = Math.atan(v.tanHalf), tW = Math.atan(v.tanHalf * v.aspect);
    // a little extra for the globe being framed off centre beside the panel
    return { lat: cover(cam.alt, tH) / D * 1.15, lng: cover(cam.alt, tW) / D * 1.15 / Math.max(0.17, Math.cos(cam.lat * D)) };
  };
  function windowFor(cam, v) {
    const r = reach(cam, v);
    const halfLat = Math.min(60, r.lat * 1.6 + 0.02);
    const latC = Math.max(-80, Math.min(80, cam.lat));
    const latB = Math.max(-84, latC - halfLat), latT = Math.min(84, latC + halfLat);
    const halfLng = Math.min(150, r.lng * 1.6 + 0.02);
    return { lngL: cam.lng - halfLng, lngR: cam.lng + halfLng, latB, latT, alt: cam.alt };
  }
  const offLng = (cam, w) => ((cam.lng - (w.lngL + w.lngR) / 2 + 540) % 360) - 180;

  function needs(cam) {
    if (!painted) return true;
    const w = painted;
    const span = w.lngR - w.lngL, spanY = w.latT - w.latB;
    if (Math.abs(offLng(cam, w)) > span * 0.2) return true;
    if (Math.abs(cam.lat - (w.latB + w.latT) / 2) > spanY * 0.2) return true;
    if (Math.abs(hachuresAt(cam.alt) - hachuresAt(w.alt)) > 0.1) return true;
    const r = cam.alt / w.alt;
    // the lines are cut to screen pixels: repaint sooner than the old atlas did
    return r > 1.4 || r < 1 / 1.4;
  }
  function fits(w, cam, v) {
    const r = reach(cam, v);
    const dLat = r.lat / 1.15, dLng = r.lng / 1.15;
    if (cam.lat - dLat < w.latB - 0.01 && w.latB > -84) return false;
    if (cam.lat + dLat > w.latT + 0.01 && w.latT < 84) return false;
    if (Math.abs(offLng(cam, w)) + dLng > (w.lngR - w.lngL) / 2 + 0.01) return false;
    if (Math.abs(hachuresAt(cam.alt) - hachuresAt(w.alt)) > 0.15) return false;
    const q = cam.alt / w.alt;
    return q < 1.8 && q > 1 / 2.5;
  }

  function paint(cam, v, done) {
    painting = true;
    const my = gen;
    const run = async () => {
      const win = windowFor(cam, v);
      const latSpan = win.latT - win.latB, lngSpan = win.lngR - win.lngL;
      const cosl = Math.max(0.17, Math.cos(((win.latT + win.latB) / 2) * D));
      // the canvas keeps the ground's own proportions, so a pixel is as wide on the ground as it is tall
      const H = size, W = Math.round(Math.max(size / 4, Math.min(Math.min(maxTex, size * 2.5), (size * lngSpan * cosl) / latSpan)));
      // patch pixels per screen pixel, at the centre of the view
      const screenPerDeg = (v.screenH / 2) / (cam.alt * v.tanHalf) * D;
      const k = Math.max(0.5, (H / latSpan) / screenPerDeg);
      const fade = hachuresAt(cam.alt);
      const world = smooth(0.3, PATCH_EDGE, cam.alt);
      const P = { shapes, C, washes, water, grid: null, k, hachureFade: fade, world };
      const alive = () => my === gen;
      // Painted in two passes so the hairlines land at once: first the lines (coasts, waterlines,
      // graticule, borders, hatch), which take a moment; then, if the mountains show at this height,
      // the same plate again with its hachures, read from the relief, which takes longer.
      const pass = async (grid) => {
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ok = await engrave(cv.getContext('2d'), W, H, win, { ...P, grid }, 'all', alive);
        if (!ok || my !== gen) { cv.width = cv.height = 1; return false; }
        install(win, cv);
        done && done();
        return true;
      };
      const withHachures = fade > 0.01 && relief;
      if (!(await pass(null))) { painting = false; return; }
      if (withHachures) {
        const cell = 5 * k;
        const grid = await reliefGrid(relief, win, Math.max(8, Math.round(W / cell)), Math.max(8, Math.round(H / cell)));
        if (my !== gen) { painting = false; return; }
        if (grid) await pass(grid);
      }
      painting = false;
      done && done();
    };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 50 }); else setTimeout(run, 16);
  }

  return {
    update(cam, v, still, reduce, wake, dt) {
      level = 1 - smooth(Math.log(PATCH_EDGE * 0.85), Math.log(PATCH_EDGE * 1.15), Math.log(cam.alt));
      if (level <= 0.001) {
        if (cur) { drop(cur); cur = null; }
        if (next) { drop(next); next = null; }
        painted = null;
        gen++;
        painting = false;
        return false;
      }
      if (still && !painting && !next && needs(cam)) paint({ ...cam }, { ...v }, wake);
      let busy = false;
      const step = reduce ? 1 : Math.min(dt, 0.05) / 0.16;
      if (cur) {
        const want = fits(cur.userData.win, cam, v) ? 1 : 0, s = cur.userData.show;
        cur.userData.show = want === s ? s : want > s ? Math.min(1, s + step) : Math.max(0, s - step);
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
    setRelief(src) { relief = src; painted = null; },
    painting: () => painting,
    level: () => level,
    reset() { gen++; drop(cur); drop(next); cur = next = null; painted = null; painting = false; },
  };
}
