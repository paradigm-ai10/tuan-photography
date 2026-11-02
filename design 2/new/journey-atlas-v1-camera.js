/* Atlas 足跡: the camera. One owner at a time ('user', 'fly' or 'follow'); north always up; the
   camera tilts a little only when close. Zoom keeps the ground under the cursor where it is, a drag
   keeps the grabbed point under the finger, a release coasts to a stop. Flights between places
   follow van Wijk's smooth zoom (d3.interpolateZoom). Under reduced motion: no coasting, and a
   flight becomes a short fade and a jump. */
import * as THREE from 'three';

const D = Math.PI / 180;
const clamp = THREE.MathUtils.clamp;
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - (1 - t) ** 3;
const INERTIA_LAMBDA = 6;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const toVec = (lat, lng, r = 1) => {
  const la = lat * D, lo = lng * D;
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(r);
};
export const latOf = (v) => Math.asin(clamp(v.y / v.length(), -1, 1)) / D;
export const lngOf = (v) => Math.atan2(-v.z, v.x) / D;
export function slerp(a, b, t, out = new THREE.Vector3()) {
  const w = a.angleTo(b);
  if (w < 1e-6) return out.copy(a);
  const s = Math.sin(w);
  return out.copy(a).multiplyScalar(Math.sin((1 - t) * w) / s).addScaledVector(b, Math.sin(t * w) / s);
}
export { wrap };

/* tilt: none from alt 1 up, rising smoothly (in log height) to 0.30 rad at 0.03 */
export const tiltOf = (alt) => 0.3 * smooth(0, 1, Math.log(1 / alt) / Math.log(1 / 0.03));

export function createCamera({ camera, canvas, surfaces, reduce, invalidate, fade }) {
  // the canvas and the layer of marks over it both take the gestures, so a wheel or a drag that
  // starts on a name or a print still moves the globe
  const areas = surfaces && surfaces.length ? surfaces : [canvas];
  const cam = { lat: 23.5, lng: 121, alt: 3.0 };
  const lim = { min: 0.012, max: 3.2, world: 2.8 };
  const api = { cam, lim, owner: 'user', onTap: null, onUser: null, onSettle: null, gesturing: false };

  /* ---------- place the camera ---------- */
  const P = new THREE.Vector3(), north = new THREE.Vector3(), dir = new THREE.Vector3();
  let good = { ...cam };
  function place() {
    // a guard: a bad sum somewhere never leaves the camera lost
    if (!isFinite(cam.lat) || !isFinite(cam.lng) || !isFinite(cam.alt)) { console.warn('atlas: camera reset'); Object.assign(cam, good); }
    else good = { lat: cam.lat, lng: cam.lng, alt: cam.alt };
    P.copy(toVec(cam.lat, cam.lng));
    const la = cam.lat * D, lo = cam.lng * D;
    north.set(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
    const tilt = tiltOf(cam.alt);
    dir.copy(P).multiplyScalar(Math.cos(tilt)).addScaledVector(north, -Math.sin(tilt));
    camera.position.copy(P).addScaledVector(dir, cam.alt);
    camera.up.copy(north);
    camera.lookAt(P);
    camera.near = Math.max(cam.alt * 0.05, 2e-5);
    camera.far = Math.sqrt((1 + cam.alt) ** 2 - 1) + 1.2;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }
  api.place = place;

  /* ---------- the point on the globe under a pixel ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitV = new THREE.Vector3();
  function hitVec(px, py, out = hitV) {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    ndc.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const b = o.dot(d), c = o.lengthSq() - 1, disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    if (t < 0) return null;
    return out.copy(o).addScaledVector(d, t);
  }
  function hit(px, py) {
    const v = hitVec(px, py);
    return v ? { lat: latOf(v), lng: lngOf(v) } : null;
  }
  api.hit = hit;
  api.hitVec = hitVec;

  // move the centre so the ground point G sits under pixel (px, py) again (two passes is enough)
  function solve(px, py, G, passes = 2) {
    for (let i = 0; i < passes; i++) {
      place();
      const H = hit(px, py);
      if (!H) return;
      cam.lat = clamp(cam.lat + (G.lat - H.lat), -85, 85);
      cam.lng = wrap(cam.lng + wrap(G.lng - H.lng));
    }
    place();
  }
  function zoomAbout(px, py, G, alt) {
    cam.alt = alt;
    if (G) solve(px, py, G); else place();
  }
  api.zoomAbout = zoomAbout;

  const softMin = () => lim.min * 0.8, softMax = () => lim.max * 1.08;
  const clampAlt = (a) => clamp(a, softMin(), softMax());

  /* ---------- motion state ---------- */
  let fly = null;            // { kind:'fly'|'zoom'|'pan', ... }
  let wheel = null;          // mouse wheel: { target, px, py, G }
  let inertia = null;        // { vlat, vlng }
  let pinchZoom = null;      // short zoom coast after a pinch: { v, px, py, G }
  let lastInput = 0;
  const keys = new Map();    // arrow keys held: key -> time pressed

  function takeOver() {
    api.owner = 'user';
    fly = null; inertia = null; pinchZoom = null;
    lastInput = performance.now();
    api.onUser && api.onUser();
  }
  api.takeOver = takeOver;

  /* ---------- flights ---------- */
  const fovHalf = () => Math.tan((camera.fov * D) / 2);
  function flyTo(t, opts = {}) {
    const target = { lat: clamp(t.lat, -85, 85), lng: wrap(t.lng), alt: clamp(t.alt, lim.min, lim.max) };
    wheel = null; inertia = null; pinchZoom = null;
    api.owner = opts.owner || 'fly';
    if (reduce() || opts.jump) {
      fly = null;
      const go = () => { Object.assign(cam, target); place(); invalidate(); api.onSettle && api.onSettle(); };
      if (opts.jump || !fade) { go(); return; }
      fade(true);
      setTimeout(() => { go(); setTimeout(() => fade(false), 30); }, 120);
      return;
    }
    const A = toVec(cam.lat, cam.lng), B = toVec(target.lat, target.lng);
    const d = A.angleTo(B);
    const k = 2 * fovHalf();
    const wFit = k * lim.world;
    const w0 = Math.min(k * cam.alt, wFit), w1 = Math.min(k * target.alt, wFit);
    const interp = window.d3.interpolateZoom([0, 0, w0], [d, 0, w1]);
    const dur = opts.duration || clamp(interp.duration * 0.55, 600, 2200);
    fly = { kind: 'fly', A, B, d, interp, t: 0, dur: dur / 1000, alt0: cam.alt, alt1: target.alt, k, wFit, target };
    invalidate();
  }
  api.flyTo = flyTo;
  api.flying = () => !!fly;

  // a timed zoom about a pixel (double click, the Closer and Further words)
  function zoomTo(alt1, px, py, dur) {
    takeOver();
    const G = px == null ? null : hit(px, py);
    const a1 = clamp(alt1, lim.min, lim.max);
    if (reduce()) { zoomAbout(px, py, G, a1); invalidate(); return; }
    fly = { kind: 'zoom', a0: cam.alt, a1, px, py, G, t: 0, dur };
    invalidate();
  }
  api.zoomTo = zoomTo;
  const centre = () => api.centrePx ? api.centrePx() : [innerWidth / 2, innerHeight / 2];
  api.closer = () => { const [x, y] = centre(); zoomTo(cam.alt * 0.5, x, y, 0.35); };
  api.further = () => { const [x, y] = centre(); zoomTo(cam.alt * 2, x, y, 0.35); };

  // a pan by a share of the view (arrow keys)
  function viewDeg() { return (2 * fovHalf() * cam.alt) / D; } // ground height of the view at the centre, in degrees
  function panBy(fx, fy, dur = 0.22) {
    takeOver();
    const dl = fy * viewDeg(), dg = (fx * viewDeg()) / Math.max(0.2, Math.cos(cam.lat * D));
    const to = { lat: clamp(cam.lat + dl, -85, 85), lng: wrap(cam.lng + dg) };
    if (reduce()) { cam.lat = to.lat; cam.lng = to.lng; place(); invalidate(); return; }
    fly = { kind: 'pan', from: { lat: cam.lat, lng: cam.lng }, to, t: 0, dur };
    invalidate();
  }
  api.panBy = panBy;

  /* ---------- the step: called every frame, returns true while anything moves ---------- */
  api.step = (dt) => {
    let moving = false;
    const now = performance.now();
    if (fly) {
      moving = true;
      fly.t = Math.min(1, fly.t + dt / fly.dur);
      if (fly.kind === 'fly') {
        const e = easeInOut(fly.t);
        const [x, , w] = fly.interp(e);
        const c = fly.d > 1e-6 ? slerp(fly.A, fly.B, clamp(x / fly.d, 0, 1)) : fly.B;
        cam.lat = latOf(c); cam.lng = lngOf(c);
        // the endpoints exactly, whatever the clamped width did in between
        const ww = Math.min(w, fly.wFit);
        cam.alt = fly.t >= 1 ? fly.alt1 : clamp(ww / fly.k, lim.min, lim.max);
        if (fly.t < 0.02) cam.alt = THREE.MathUtils.lerp(fly.alt0, cam.alt, fly.t / 0.02);
        place();
      } else if (fly.kind === 'zoom') {
        const e = easeOut(fly.t);
        zoomAbout(fly.px, fly.py, fly.G, Math.exp(THREE.MathUtils.lerp(Math.log(fly.a0), Math.log(fly.a1), e)));
      } else if (fly.kind === 'pan') {
        const e = easeOut(fly.t);
        cam.lat = THREE.MathUtils.lerp(fly.from.lat, fly.to.lat, e);
        cam.lng = wrap(fly.from.lng + wrap(fly.to.lng - fly.from.lng) * e);
        place();
      }
      if (fly.t >= 1) {
        const k = fly.kind;
        fly = null;
        if (k === 'fly') { if (api.owner === 'fly') api.owner = 'user'; api.onSettle && api.onSettle(); }
      }
    }
    if (wheel) {
      moving = true;
      const k = 1 - Math.exp(-dt * 14);
      const a = Math.exp(Math.log(cam.alt) + (Math.log(wheel.target) - Math.log(cam.alt)) * k);
      zoomAbout(wheel.px, wheel.py, wheel.G, a);
      if (Math.abs(Math.log(a / wheel.target)) < 0.002) { zoomAbout(wheel.px, wheel.py, wheel.G, wheel.target); wheel = null; }
    }
    if (inertia) {
      moving = true;
      // a short glide: the speed decays at rate 6 per second, so it has all but stopped within half a second
      inertia.vlat = THREE.MathUtils.damp(inertia.vlat, 0, INERTIA_LAMBDA, dt);
      inertia.vlng = THREE.MathUtils.damp(inertia.vlng, 0, INERTIA_LAMBDA, dt);
      cam.lat = clamp(cam.lat + inertia.vlat * dt, -85, 85);
      cam.lng = wrap(cam.lng + inertia.vlng * dt);
      place();
      const speed = Math.hypot(inertia.vlat, inertia.vlng * Math.cos(cam.lat * D)) / viewDeg();
      if (speed < 0.02) inertia = null;
    }
    if (pinchZoom) {
      moving = true;
      const f = Math.exp(-dt / 0.2);
      pinchZoom.v *= f;
      zoomAbout(pinchZoom.px, pinchZoom.py, pinchZoom.G, clampAlt(cam.alt * Math.exp(pinchZoom.v * dt)));
      if (Math.abs(pinchZoom.v) < 0.05) pinchZoom = null;
    }
    if (keys.size) {
      moving = true;
      for (const [key, t0] of keys) {
        const held = (now - t0) / 1000;
        if (held < 0.3) continue;
        const v = 0.9 * Math.min(2.5, 1 + (held - 0.3) * 1.5) * dt;
        const fx = key === 'ArrowLeft' ? -v : key === 'ArrowRight' ? v : 0;
        const fy = key === 'ArrowUp' ? v : key === 'ArrowDown' ? -v : 0;
        cam.lat = clamp(cam.lat + fy * viewDeg(), -85, 85);
        cam.lng = wrap(cam.lng + (fx * viewDeg()) / Math.max(0.2, Math.cos(cam.lat * D)));
      }
      place();
    }
    // the floor and the ceiling give a little, then spring back over a quarter second
    const idle = !api.gesturing && !wheel && !fly && now - lastInput > 90;
    if (idle && (cam.alt < lim.min - 1e-6 || cam.alt > lim.max + 1e-6)) {
      moving = true;
      const goal = cam.alt < lim.min ? lim.min : lim.max;
      const k = reduce() ? 1 : 1 - Math.exp(-dt / 0.06);
      const a = Math.exp(Math.log(cam.alt) + (Math.log(goal) - Math.log(cam.alt)) * k);
      const [x, y] = centre();
      zoomAbout(x, y, hit(x, y), Math.abs(Math.log(a / goal)) < 0.003 ? goal : a);
    }
    return moving;
  };

  /* ---------- input: pointers ---------- */
  const pointers = new Map();
  let grab = null;            // { G, px, py } the point held under one finger
  let pinch = null;           // { d0, alt0, G }
  let samples = [];           // the last 100 ms of the drag, for the coast after release
  let downAt = 0, tapTimer = 0, lastTap = null, twoTap = null;
  const isTouch = (e) => e.pointerType === 'touch';

  let suppressClick = false;
  function down(e) {
    if (e.button !== undefined && e.button > 0) return;
    // a press on a mark: the mark keeps the pointer, so a plain click still opens it
    const onMark = e.target !== canvas;
    const holder = onMark ? (e.target.closest && e.target.closest('button')) || e.target : canvas;
    try { holder.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false, touch: isTouch(e), onMark });
    downAt = performance.now();
    takeOver();
    wheel = null;
    api.gesturing = true;
    if (pointers.size === 1) {
      const G = hit(e.clientX, e.clientY);
      grab = G ? { G } : null;
      samples = [{ t: performance.now(), lat: cam.lat, lng: cam.lng }];
      twoTap = null;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      pinch = { d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), alt0: cam.alt, G: hit(mx, my), last: [], t0: performance.now() };
      grab = null;
      twoTap = { t: performance.now(), moved: false };
    }
    invalidate();
  }

  function move(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (!p.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) >= 4) { p.moved = true; canvas.classList.add('is-dragging'); }
    if (!p.moved) return;
    lastInput = performance.now();
    if (pointers.size >= 2 && pinch) {
      if (twoTap) twoTap.moved = true;
      const [a, b] = [...pointers.values()];
      const d = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const alt = clampAlt((pinch.alt0 * pinch.d0) / d);
      pinch.last.push({ t: performance.now(), alt });
      while (pinch.last.length > 2 && performance.now() - pinch.last[0].t > 100) pinch.last.shift();
      cam.alt = alt;
      if (pinch.G) solve(mx, my, pinch.G); else place();
      invalidate();
      return;
    }
    if (pointers.size !== 1) return;
    if (grab) {
      solve(e.clientX, e.clientY, grab.G);
      // the grabbed point slid off the edge of the ball: carry on by degrees per pixel
      if (!hit(e.clientX, e.clientY)) grab = null;
    } else {
      const k = Math.min(180, cam.alt * camera.fov) / innerHeight;
      cam.lng = wrap(cam.lng - (dx * k) / Math.max(0.3, Math.cos(cam.lat * D)));
      cam.lat = clamp(cam.lat + dy * k, -85, 85);
      place();
    }
    const now = performance.now();
    samples.push({ t: now, lat: cam.lat, lng: cam.lng });
    while (samples.length > 2 && now - samples[0].t > 100) samples.shift();
    invalidate();
  }

  function up(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    const now = performance.now();
    // a drag that began on a mark must not open it when the finger lifts
    if (p.onMark && (p.moved || pinch)) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); }
    if (pinch && pointers.size < 2) {
      // a two-finger tap: further out
      if (twoTap && !twoTap.moved && now - twoTap.t < 300) {
        twoTap = null; pinch = null;
        const [x, y] = centre();
        pointers.clear();
        api.gesturing = false;
        canvas.classList.remove('is-dragging');
        zoomTo(cam.alt * 2.5, x, y, 0.45);
        return;
      }
      // a short coast of the zoom after a pinch
      const L = pinch.last;
      if (!reduce() && L.length >= 2 && now - L[L.length - 1].t < 60) {
        const dtp = (L[L.length - 1].t - L[0].t) / 1000;
        if (dtp > 0.01) {
          const v = Math.log(L[L.length - 1].alt / L[0].alt) / dtp;
          const [x, y] = centre();
          if (Math.abs(v) > 0.3) pinchZoom = { v: clamp(v, -6, 6), px: x, py: y, G: hit(x, y) };
        }
      }
      pinch = null;
      // the remaining finger carries on as a drag from where it is
      const rest = [...pointers.values()][0];
      if (rest) { const G = hit(rest.x, rest.y); grab = G ? { G } : null; samples = [{ t: now, lat: cam.lat, lng: cam.lng }]; }
    }
    if (!pointers.size) {
      api.gesturing = false;
      canvas.classList.remove('is-dragging');
      if (!p.moved && now - downAt < 500 && !pinchZoom) {
        if (!p.onMark) tap(p.x0, p.y0, p.touch, e.shiftKey);
      } else if (p.moved && !reduce() && samples.length >= 2 && now - samples[samples.length - 1].t < 60) {
        const a = samples[0], b = samples[samples.length - 1];
        const dts = (b.t - a.t) / 1000;
        if (dts > 0.008) inertia = { vlat: (b.lat - a.lat) / dts, vlng: wrap(b.lng - a.lng) / dts };
      }
      grab = null;
      invalidate();
    }
  }
  for (const el of areas) {
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    if (el !== canvas) el.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, true);
  }

  // a tap waits a moment for a second one: two make a double tap (closer, or further with shift)
  function tap(x, y, touch, shift) {
    const now = performance.now();
    if (lastTap && now - lastTap.t < 280 && Math.hypot(x - lastTap.x, y - lastTap.y) < 24) {
      clearTimeout(tapTimer);
      lastTap = null;
      zoomTo(cam.alt * (shift ? 2.5 : 0.35), x, y, 0.45);
      return;
    }
    lastTap = { t: now, x, y };
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { lastTap = null; api.onTap && api.onTap(x, y, touch); }, 260);
  }
  canvas.addEventListener('dblclick', (e) => e.preventDefault());
  canvas.addEventListener('contextmenu', (e) => { if (pointers.size > 1) e.preventDefault(); });

  /* ---------- input: the wheel and the trackpad ---------- */
  let lastWheelT = 0, trackpad = false;
  function onWheel(e) {
    e.preventDefault();
    const now = performance.now();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= innerHeight;
    d = clamp(d, -160, 160);
    const gap = now - lastWheelT;
    lastWheelT = now;
    // a stream of small, close events is a trackpad; a pinch on it arrives with ctrlKey
    if (e.ctrlKey) trackpad = true;
    else if (gap < 20 && Math.abs(d) < 20) trackpad = true;
    else if (gap > 200) trackpad = Math.abs(d) < 8 && !Number.isInteger(d);
    takeOver();
    if (trackpad || e.ctrlKey) {
      wheel = null;
      const k = e.ctrlKey ? 0.01 : 0.0022;
      zoomAbout(e.clientX, e.clientY, hit(e.clientX, e.clientY), clampAlt(cam.alt * Math.exp(d * k)));
    } else {
      const G = hit(e.clientX, e.clientY);
      const base = wheel ? wheel.target : cam.alt;
      wheel = { target: clampAlt(base * Math.exp(d * 0.0022)), px: e.clientX, py: e.clientY, G };
    }
    invalidate();
  }
  for (const el of areas) el.addEventListener('wheel', onWheel, { passive: false });
  // Safari's own pinch gestures would zoom the page: never
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });

  /* ---------- input: keys ---------- */
  api.keyDown = (e) => {
    const k = e.key;
    if (k.startsWith('Arrow')) {
      e.preventDefault();
      if (!e.repeat && !keys.has(k)) {
        keys.set(k, performance.now());
        panBy(k === 'ArrowLeft' ? -0.15 : k === 'ArrowRight' ? 0.15 : 0, k === 'ArrowUp' ? 0.15 : k === 'ArrowDown' ? -0.15 : 0);
      }
      invalidate();
      return true;
    }
    if (k === '+' || k === '=') { api.closer(); return true; }
    if (k === '-' || k === '_') { api.further(); return true; }
    return false;
  };
  addEventListener('keyup', (e) => { if (keys.delete(e.key)) invalidate(); });
  addEventListener('blur', () => keys.clear());

  /* ---------- the view: how wide, what it shows ---------- */
  api.viewDeg = viewDeg;
  api.groundPerPx = () => (2 * fovHalf() * cam.alt) / (canvas.clientHeight || innerHeight); // globe radii per pixel at the centre
  // a trackpad stream moves the camera inside its events, with nothing left running: count it as busy
  // for a moment after the last one, so the sharper patch never paints in the middle of it
  api.busy = () => !!(fly || wheel || inertia || pinchZoom || keys.size || api.gesturing || performance.now() - lastInput < 150);

  place();
  return api;
}
