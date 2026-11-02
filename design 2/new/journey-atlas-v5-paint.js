/* Prints globe 相片地球 (v5, copied from Atlas 足跡): the painted paper. One base sheet for the whole globe, a sharper patch painted for
   the part of the globe in view once you come close, and a small hidden map of his countries used
   to tell which one a point is in. The paper, the land, the clay wash that deepens with each visit,
   the shaded relief, the coasts and the dotted borders are painted in that order, the same way at
   every scale, so the patch lies on the sheet without a seam. */
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

/* ---------- paint one window of the globe onto a canvas ---------- */
// Prints globe (v5): a quiet body, so his prints are what you see. Bisque paper for the sea, the land a
// barely lighter paper with a hairline coast, the countries he has been to a pale clay wash. No relief,
// no graticule; close in, the borders come as a faint dotted hairline.
// win: { lngL, lngR, latB, latT } in degrees (lngL may run below -180 or lngR above 180)
function paintWindow(g, W, H, win, P) {
  const { shapes, C, washes, lineK, borders } = P;
  const sx = W / (win.lngR - win.lngL), sy = H / (win.latT - win.latB);
  const shifts = shiftsOf(win);
  const mat = (k) => new DOMMatrix([sx, 0, 0, sy, (k - win.lngL) * sx, win.latT * sy]);
  const fillAll = (path) => { for (const k of shifts) { g.setTransform(mat(k)); g.fill(path); } g.setTransform(1, 0, 0, 1, 0, 0); };
  const strokeAll = (path) => { const p = new Path2D(); for (const k of shifts) p.addPath(path, mat(k)); g.stroke(p); };

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.fillStyle = C['g-sea'].css;
  g.fillRect(0, 0, W, H);
  g.fillStyle = C['g-land'].css;
  fillAll(shapes.land);
  // the pale clay wash on his countries (a single strength: the prints say how often he went)
  g.fillStyle = C['g-wash'].css;
  shapes.visited.forEach((v, i) => {
    if (!v.path || !washes[i]) return;
    g.globalAlpha = 0.1;
    fillAll(v.path);
  });
  g.globalAlpha = 1;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = C['g-coast'].css;
  g.lineWidth = 0.6 * lineK;
  strokeAll(shapes.coast);
  if (borders) {
    g.globalAlpha = 0.7; g.lineWidth = 0.6 * lineK;
    g.setLineDash([0.1, 2.4 * lineK]);
    strokeAll(shapes.borders);
    g.setLineDash([]);
    g.globalAlpha = 1;
  }
}

/* ---------- the base sheet, the whole globe ---------- */
export const BASE_RELIEF = 0.36;
export async function paintBase({ renderer, material, shapes, C, washes, reliefSrc, size }) {
  const W = size, H = size / 2;
  const win = { lngL: -180, lngR: 180, latB: -90, latT: 90 };
  const relief = await reliefFor(reliefSrc, win, W, H);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  paintWindow(g, W, H, win, { shapes, C, washes, lineK: W / 1400, borders: false });
  closeAll(relief);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  // the old sheet leaves the graphics card before the new one arrives, so the two are never held at once
  const old = material.map;
  material.map = tex; material.color.set(0xffffff); material.needsUpdate = true;
  if (old) old.dispose();
  renderer.initTexture(tex);
  // the canvas is on the graphics card now; let the memory go
  cv.width = cv.height = 1;
  return tex;
}

/* ---------- the detail patch: a piece of sphere just above the sheet, painted for the view ---------- */
// relief on the patch follows the base sheet far out and fades away close in (spec: 0.36 x smoothstep(0.03, 0.08, alt))
const reliefAt = (alt) => BASE_RELIEF * smooth(0.03, 0.08, alt);
export function createPatch({ renderer, scene, shapes, C, washes, reliefSrc, size, tint }) {
  let cur = null, next = null, fadeT = 0, painting = false, painted = null, gen = 0;
  let level = 0;

  function makeMesh(win, cv) {
    const geo = new THREE.SphereGeometry(1.00003, 96, 96,
      (win.lngL + 180) * D, (win.lngR - win.lngL) * D, (90 - win.latT) * D, (win.latT - win.latB) * D);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    // a patch is seen near one to one: no mipmaps, which saves a third of its memory
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    // lit like the globe beneath it, so the patch never shows as a brighter square
    const mat = new THREE.MeshStandardMaterial({ map: tex, color: tint || 0xffffff, roughness: 0.9, metalness: 0, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 1;
    m.userData = { win, show: 1 };
    renderer.initTexture(tex);
    // the pixels are on the graphics card now; the canvas lets its memory go
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
    // 1.6 times what is in view, latitude kept within 80 degrees, longitude widened by 1/cos
    const halfLat = Math.min(40, (view.halfH / D) * 1.6);
    const latC = Math.max(-80, Math.min(80, cam.lat));
    const latB = Math.max(-82, latC - halfLat), latT = Math.min(82, latC + halfLat);
    const cosl = Math.max(0.17, Math.cos(latC * D));
    const halfLng = Math.min(90, ((view.halfW / D) * 1.6) / cosl);
    return { lngL: cam.lng - halfLng, lngR: cam.lng + halfLng, latB, latT, alt: cam.alt };
  }
  const gridFor = (span) => (span > 20 ? 10 : span > 2 ? 1 : 1 / 6);
  const offLng = (cam, w) => ((cam.lng - (w.lngL + w.lngR) / 2 + 540) % 360) - 180;

  function needs(cam) {
    if (!painted) return true;
    const w = painted;
    const span = w.lngR - w.lngL, spanY = w.latT - w.latB;
    // the view has left the inner part of the window (repaint before it reaches the edge)
    if (Math.abs(offLng(cam, w)) > span * 0.2) return true;
    if (Math.abs(cam.lat - (w.latB + w.latT) / 2) > spanY * 0.2) return true;
    if (Math.abs(reliefAt(cam.alt) - reliefAt(w.alt)) > 0.04) return true;
    const r = cam.alt / w.alt;
    return r > 1.7 || r < 1 / 1.7;
  }
  // a patch shows only while it covers the whole view and looks like the sheet beneath it would;
  // otherwise it fades out at once and the sheet carries the view until a new one is painted
  function fits(w, cam, view) {
    // view.halfH carries a 1.35 margin; the view itself is that much smaller
    const dLat = view.halfH / 1.35 / D, dLng = (view.halfW / 1.35 / D) / Math.max(0.17, Math.cos(cam.lat * D));
    if (cam.lat - dLat < w.latB - 0.01 && w.latB > -82) return false;
    if (cam.lat + dLat > w.latT + 0.01 && w.latT < 82) return false;
    if (Math.abs(offLng(cam, w)) + dLng > (w.lngR - w.lngL) / 2 + 0.01) return false;
    if (Math.abs(reliefAt(cam.alt) - reliefAt(w.alt)) > 0.06) return false;
    return cam.alt / w.alt < 2.2;
  }

  function paint(cam, view, done) {
    painting = true;
    const my = gen;
    const run = async () => {
      const win = windowFor(cam, view);
      const reliefAlpha = reliefAt(cam.alt);
      const relief = reliefAlpha > 0.005 ? await reliefFor(reliefSrc, win, size, size) : null;
      if (my !== gen) { closeAll(relief); painting = false; return; }
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const g = cv.getContext('2d');
      // line widths in pixels of the patch, scaled so they read about one screen pixel wide
      const lineK = Math.max(1.4, size / 1000);
      paintWindow(g, size, size, win, { shapes, C, washes, lineK, borders: true });
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
    /* called each frame; returns true while the patch is fading in or out */
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
        // (when it already shows what it should, it stays: no dip and no extra frame)
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
