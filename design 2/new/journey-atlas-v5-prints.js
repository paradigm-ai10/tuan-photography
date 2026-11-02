/* Prints globe 相片地球 (v5, 2026-11-02): his photographs as small square prints laid on the globe
   where they were taken, and the opening where they gather onto it.

   One InstancedMesh of planes draws every print; a second, beneath it, draws their soft shadows. Both
   read one photo atlas (each photograph centre-cropped to a square, drawn from images/web/640) and
   one clock, uT, in milliseconds since the opening began. The vertex shader flies each print from its
   place on the contact sheet (a point between the camera and the globe) along a great circle to its
   place on the ball, shrinking it from sheet size to its world size and turning it to face outward
   as it settles. Prints from one place stack, slightly fanned, at most three. Nothing is written on
   a photograph: a print is a paper border and the picture, nothing else.

   Draw order is the landing order (Taiwan's first), so a later print lies over an earlier one; the
   prints are drawn after the routes, so no line crosses a photograph. While
   flying they ignore the depth buffer and are hidden behind the ball by a ray test in the shader;
   once landed, the ball's own depth hides the far side. */
import * as THREE from 'three';
import { toVec } from './journey-atlas-v5-camera.js';

const D = Math.PI / 180;
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// the timeline of the opening, in milliseconds (the page reads these too)
export const T = {
  sheetIn: 0, sheetStagger: 50, sheetFade: 240,  // the contact sheet fades in a row at a time, top row first
  fly: 500, flyStagger: 30, flyDur: 900,         // each print flies home, Taiwan's first
  land: 2400,                                    // every print is home by now
  end: 3200,
};
export const SHEET_MAX = 48, SHEET_FALLBACK = 24, WAIT = 1200;
const MAX_STACK = 3;

const VERT = /* glsl */ `
attribute vec3 aTo;      // the stack's place on the ball (unit vector)
attribute vec3 aFrom;    // the print's place on the contact sheet (world)
// packed four to an attribute (a vertex shader may read only sixteen)
attribute vec4 aTiming;  // size on the sheet, flight start, fade start, on the sheet (1) or not
attribute vec4 aFan;     // turn, sheet jitter, draw order, rank in its stack
attribute vec4 aPlace;   // fan offset (x, y), atlas cell (column, row)
attribute vec2 aState;   // drawn into the atlas, clear of the page's words
#define aFromSize aTiming.x
#define aStart aTiming.y
#define aFade aTiming.z
#define aSheet aTiming.w
#define aRot aFan.x
#define aJit aFan.y
#define aOrder aFan.z
#define aRank aFan.w
#define aOff aPlace.xy
#define aCell aPlace.zw
#define aReady aState.x
#define aClear aState.y
uniform float uT, uDur, uFadeDur, uSize, uGap, uLiftK, uAlpha, uShadow, uGrid;
uniform vec3 uCamR, uCamU, uCamB, uCamPos, uLightDir;
uniform vec2 uLimb;      // cosines of the angle from the view's centre where a landed print starts and ends fading
varying vec2 vUv, vCell;
varying float vA, vShade;

// cubic-bezier(p1x, p1y, p2x, p2y) at x, solved for t with a few Newton steps
float bez1(float t, float a, float b) { float u = 1.0 - t; return 3.0 * u * u * t * a + 3.0 * u * t * t * b + t * t * t; }
float bezD(float t, float a, float b) { float u = 1.0 - t; return 3.0 * u * u * a + 6.0 * u * t * (b - a) + 3.0 * t * t * (1.0 - b); }
float bezier(float x, float p1x, float p1y, float p2x, float p2y) {
  float t = x;
  for (int i = 0; i < 6; i++) {
    float d = bezD(t, p1x, p2x);
    if (abs(d) < 1e-5) break;
    t = clamp(t - (bez1(t, p1x, p2x) - x) / d, 0.0, 1.0);
  }
  return bez1(t, p1y, p2y);
}
vec3 slerpDir(vec3 a, vec3 b, float t) {
  float w = acos(clamp(dot(a, b), -1.0, 1.0));
  if (w < 1e-4) return normalize(mix(a, b, t));
  return (a * sin((1.0 - t) * w) + b * sin(t * w)) / sin(w);
}
// east and north at a point on the ball
void frameAt(vec3 n, out vec3 e, out vec3 no) {
  e = vec3(n.z, 0.0, -n.x);
  if (dot(e, e) < 1e-8) e = vec3(1.0, 0.0, 0.0);
  e = normalize(e);
  no = cross(n, e);
}

void main() {
  vUv = uv;
  vCell = aCell;
  float S = uSize;
  // the landed place: the stack's spot, lifted above it once names show (so a name fits beneath), fanned
  vec3 n = normalize(aTo), e, no;
  frameAt(n, e, no);
  float h = 0.004 + (aOrder * 0.0018 + (2.0 - aRank) * 0.01) * S;
  vec3 L = n * (1.0 + h) + no * (uLiftK * (0.5 * S + uGap)) + (e * aOff.x + no * aOff.y) * S;

  // the flight
  float k = aSheet > 0.5 ? clamp((uT - aStart) / uDur, 0.0, 1.0) : 1.0;
  float ep = bezier(k, 0.77, 0.0, 0.175, 1.0);   // position: in-out
  float es = bezier(k, 0.23, 1.0, 0.32, 1.0);    // scale: out
  vec3 P = L;
  float size = S;
  if (k < 1.0) {
    vec3 fd = normalize(aFrom), ld = normalize(L);
    float w = acos(clamp(dot(fd, ld), -1.0, 1.0));
    float r = mix(length(aFrom), length(L), ep) + 0.32 * (w / 3.14159) * sin(3.14159 * ep);
    P = slerpDir(fd, ld, ep) * r;
    size = mix(aFromSize, S, es);
  }

  // the print's own axes: facing the camera on the sheet, facing outward at home, turned by its fan
  vec3 pn = normalize(P), pe, pno;
  frameAt(pn, pe, pno);
  float c = cos(aRot), s = sin(aRot);
  vec3 Rl = pe * c + pno * s, Ul = -pe * s + pno * c;
  float cj = cos(aJit), sj = sin(aJit);
  vec3 Rs = uCamR * cj + uCamU * sj, Us = -uCamR * sj + uCamU * cj;
  float turn = aSheet > 0.5 ? smoothstep(0.35, 1.0, ep) : 1.0;
  vec3 R = normalize(mix(Rs, Rl, turn)), U = normalize(mix(Us, Ul, turn));
  vec3 N = normalize(cross(R, U));
  U = normalize(cross(N, R));

  vec3 pos;
  if (uShadow > 0.5) {
    // the shadow: a little larger, on the ground, offset down and to the right of the print
    vec3 G = n * (1.0 + 0.0015 + aOrder * 0.0004 * S) + no * (uLiftK * (0.5 * S + uGap)) + (e * aOff.x + no * aOff.y) * S + (Rl * 0.12 - Ul * 0.12) * S;
    pos = G + (Rl * position.x + Ul * position.y) * S * 1.3;
    P = G;
  } else {
    pos = P + (R * position.x + U * position.y) * size;
  }

  // fade in (on the sheet, or in place), hidden behind the ball, and the page's own fade
  float a = aSheet > 0.5 ? smoothstep(aFade, aFade + uFadeDur, uT) : clamp((uT - aFade) / uFadeDur, 0.0, 1.0);
  vec3 rd = P - uCamPos;
  float dist = length(rd);
  rd /= dist;
  float b = dot(uCamPos, rd), q = dot(uCamPos, uCamPos) - 1.0, disc = b * b - q;
  float occ = 1.0;
  if (disc > 0.0) { float tHit = -b - sqrt(disc); if (tHit > 0.0) occ = smoothstep(-0.02, 0.02, tHit - dist); }
  // landed prints toward the limb fade away before they are foreshortened into slivers
  float limb = smoothstep(uLimb.y, uLimb.x, dot(n, normalize(uCamPos)));
  float landed = aSheet > 0.5 ? smoothstep(0.6, 1.0, k) : 1.0;
  vA = a * occ * uAlpha * aReady * aClear * mix(1.0, limb, landed);
  if (uShadow > 0.5) vA *= smoothstep(0.85, 1.0, k);
  vShade = 0.9 + 0.1 * clamp(dot(N, uLightDir), 0.0, 1.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uGrid;
uniform vec3 uBorder;
varying vec2 vUv, vCell;
varying float vA, vShade;
void main() {
  if (vA < 0.003) discard;
  // the paper border is 4 % of the print; the picture fills the rest, never written on
  const float B = 0.04;
  vec2 inner = (vUv - B) / (1.0 - 2.0 * B);
  vec2 fw = fwidth(inner);
  vec2 m = smoothstep(vec2(0.0), fw, inner) * smoothstep(vec2(0.0), fw, 1.0 - inner);
  float inside = m.x * m.y;
  vec2 cuv = clamp(inner, 0.0, 1.0) * 0.88 + 0.06;
  vec2 auv = vec2((vCell.x + cuv.x) / uGrid, 1.0 - (vCell.y + 1.0 - cuv.y) / uGrid);
  vec3 photo = texture2D(uAtlas, auv).rgb;
  vec3 col = mix(uBorder, photo, inside) * vShade;
  gl_FragColor = vec4(col, vA);
  #include <colorspace_fragment>
}
`;

const SHADOW_FRAG = /* glsl */ `
uniform vec3 uInk;
varying vec2 vUv;
varying float vA;
void main() {
  vec2 q = abs(vUv - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.45, 1.0, q.x)) * (1.0 - smoothstep(0.45, 1.0, q.y));
  if (a * vA < 0.003) discard;
  gl_FragColor = vec4(uInk, a * 0.26 * vA);
  #include <colorspace_fragment>
}
`;

export function createPrints({ renderer, scene, camera, R, C, phone, home }) {
  /* ---------- the stacks: one per place with photographs, at most three prints, Taiwan's first ---------- */
  const H = toVec(home.lat, home.lng);
  const stacks = R.places.filter((p) => p.photos.length).map((p) => {
    const shown = p.photos.slice(0, MAX_STACK);
    const mid = shown.reduce((s, ph) => s.add(toVec(ph.ll[0], ph.ll[1])), new THREE.Vector3()).normalize();
    return { place: p, photos: shown, dir: mid, d: mid.angleTo(H) };
  }).sort((a, b) => a.d - b.d);
  const items = [];
  stacks.forEach((st, si) => {
    // the bottom of the stack first, so its top print is drawn last and lies on top
    for (let r = st.photos.length - 1; r >= 0; r--) items.push({ stack: st, si, rank: r, photo: st.photos[r] });
  });
  const n = items.length;
  const G = Math.ceil(Math.sqrt(n));

  /* ---------- the atlas ---------- */
  const size = phone ? 2048 : Math.min(4096, renderer.capabilities.maxTextureSize || 4096);
  const cell = Math.floor(size / G);
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.fillStyle = C['g-border'].css;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;

  /* ---------- the instances ---------- */
  const geo = new THREE.InstancedBufferGeometry();
  geo.copy(new THREE.PlaneGeometry(1, 1));
  geo.deleteAttribute('normal');
  geo.instanceCount = n;
  const A = (name, k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * k), k); geo.setAttribute(name, a); return a; };
  const aTo = A('aTo', 3), aFrom = A('aFrom', 3);
  const timing = A('aTiming', 4), fan = A('aFan', 4), place = A('aPlace', 4), state = A('aState', 2);
  // one number of a packed attribute, read and written like an attribute of its own
  const part = (attr, c) => ({
    setX(i, v) { attr.array[i * attr.itemSize + c] = v; },
    getX(i) { return attr.array[i * attr.itemSize + c]; },
    set needsUpdate(v) { attr.needsUpdate = v; },
  });
  const aFromSize = part(timing, 0), aStart = part(timing, 1), aFade = part(timing, 2), aSheet = part(timing, 3);
  const aRot = part(fan, 0), aJit = part(fan, 1), aOrder = part(fan, 2), aRank = part(fan, 3);
  const aReady = part(state, 0), aClear = part(state, 1);
  const aOff = { setXY(i, x, y) { place.array[i * 4] = x; place.array[i * 4 + 1] = y; } };
  const aCell = { setXY(i, x, y) { place.array[i * 4 + 2] = x; place.array[i * 4 + 3] = y; } };
  // a steady sequence, so each print keeps its own small turn from one visit to the next
  const rnd = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const FAN = [[0, 0, 0], [4 * D, -0.06, 0.06], [-4 * D, 0.06, -0.06]];
  items.forEach((it, i) => {
    it.dir = it.stack.dir;
    aTo.setXYZ(i, it.dir.x, it.dir.y, it.dir.z);
    const [rot, ox, oy] = FAN[it.rank];
    aRot.setX(i, rot); aOff.setXY(i, ox, oy);
    aRank.setX(i, it.rank);
    aOrder.setX(i, i / n);
    aJit.setX(i, (rnd(i, 1) * 2 - 1) * 1.5 * D);
    aCell.setXY(i, i % G, Math.floor(i / G));
    aClear.setX(i, 1);
  });

  const uniforms = {
    uT: { value: T.end }, uDur: { value: T.flyDur }, uFadeDur: { value: T.sheetFade }, uSize: { value: 0.04 }, uGap: { value: 0.005 },
    uLiftK: { value: 0 }, uAlpha: { value: 0 }, uShadow: { value: 0 }, uGrid: { value: G },
    uCamR: { value: new THREE.Vector3(1, 0, 0) }, uCamU: { value: new THREE.Vector3(0, 1, 0) }, uCamB: { value: new THREE.Vector3(0, 0, 1) },
    uCamPos: { value: new THREE.Vector3() }, uLightDir: { value: new THREE.Vector3(0, 0, 1) },
    uLimb: { value: new THREE.Vector2(Math.cos(55 * D), Math.cos(72 * D)) },
    uAtlas: { value: tex }, uBorder: { value: C['g-border'].color.clone() }, uInk: { value: C['g-shadow'].color.clone() },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false });
  const shadowUniforms = { ...uniforms, uShadow: { value: 1 } };
  const shadowMat = new THREE.ShaderMaterial({ uniforms: shadowUniforms, vertexShader: VERT, fragmentShader: SHADOW_FRAG, transparent: true, depthWrite: false, depthTest: true });
  const mesh = new THREE.Mesh(geo, mat);
  const shadows = new THREE.Mesh(geo, shadowMat);
  mesh.frustumCulled = false; shadows.frustumCulled = false;
  // the shadows lie on the paper under the routes; the prints lie over the routes, so no line ever
  // crosses a photograph (the travelling plane, drawn last, still passes over them)
  shadows.renderOrder = 1.4; mesh.renderOrder = 5;
  scene.add(shadows, mesh);

  /* ---------- the photographs into the atlas ---------- */
  // A photograph is drawn into the canvas as it arrives, but a print shows it only once the atlas has
  // gone to the graphics card (until then its cell is blank paper). The atlas is sent whole, so it is
  // sent rarely: once before the opening, never while prints are flying, and after that at most every
  // 300 ms while late photographs are still coming in.
  let uploadAt = -Infinity, readyCount = 0;
  const pending = [];
  const loads = items.map((it, i) => new Promise((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      const s = Math.min(im.naturalWidth, im.naturalHeight);
      const sx = (im.naturalWidth - s) / 2, sy = (im.naturalHeight - s) / 2;
      g.drawImage(im, sx, sy, s, s, (i % G) * cell, Math.floor(i / G) * cell, cell, cell);
      it.drawn = true;
      pending.push(i);
      resolve(true);
    };
    im.onerror = () => resolve(false);
    im.src = `../images/web/640/${it.photo.file}`;
  }));
  const allLoaded = Promise.all(loads);
  function flush(now, force) {
    if (!pending.length) return false;
    if (!force && now - uploadAt < 300) return true;
    uploadAt = now;
    tex.needsUpdate = true;
    for (const i of pending) { items[i].ready = true; readyCount++; aReady.setX(i, 1); }
    pending.length = 0;
    aReady.needsUpdate = true;
    return false;
  }

  /* ---------- the contact sheet ---------- */
  const v = new THREE.Vector3(), fwd = new THREE.Vector3();
  // free: the part of the screen the globe is framed in; t0: the page clock when the opening begins
  function layoutSheet(free, max, opening) {
    const sheetIdx = [];
    for (let i = 0; i < n && sheetIdx.length < max; i++) if (items[i].ready) sheetIdx.push(i);
    const m = sheetIdx.length;
    const fw = free.x1 - free.x0, fh = free.y1 - free.y0;
    // an even grid in the shape of the free part of the screen, with a wide margin all round
    const cols = Math.max(1, Math.ceil(Math.sqrt((m * fw) / fh))), rows = Math.ceil(m / cols);
    const pitch = Math.min((fw * 0.8) / cols, (fh * 0.68) / rows);
    const px = pitch * 0.8;
    const x0 = free.cx - (pitch * (cols - 1)) / 2, y0 = free.cy - (pitch * (rows - 1)) / 2;
    camera.updateMatrixWorld(true);
    camera.getWorldDirection(fwd);
    const camDist = camera.position.length();
    const dS = camDist - 1.6;      // the sheet stands 0.6 in front of the globe's face
    const pxScale = (innerHeight / 2) / Math.tan((camera.fov * D) / 2);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const si = sheetIdx.indexOf(i);
      if (si >= 0 && opening) {
        const x = x0 + (si % cols) * pitch, y = y0 + Math.floor(si / cols) * pitch;
        v.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
        const t = dS / v.dot(fwd);
        v.multiplyScalar(t).add(camera.position);
        aFrom.setXYZ(i, v.x, v.y, v.z);
        aFromSize.setX(i, (px * t) / pxScale);
        aSheet.setX(i, 1);
        aFade.setX(i, T.sheetIn + Math.floor(si / cols) * T.sheetStagger);
        aStart.setX(i, T.fly + k * Math.min(T.flyStagger, (T.land - T.fly - T.flyDur) / Math.max(1, m - 1)));
        k++;
      } else {
        // not on the sheet: it simply comes up in its place while the globe does, nearest first
        aSheet.setX(i, 0);
        aFrom.setXYZ(i, 0, 0, 0); aFromSize.setX(i, 0);
        aStart.setX(i, 0);
        aFade.setX(i, opening ? 1500 + (i / n) * 700 : -1e6);
      }
      // the ones drawn in already keep this timing; the rest are timed when they arrive
      it.timed = !!it.ready;
    }
    instant = !opening;
    for (const a of [aFrom, aFromSize, aSheet, aFade, aStart]) a.needsUpdate = true;
    return m;
  }
  // a photograph that arrives after the sheet was laid comes up in its place as soon as it is drawn in
  let busyUntil = -Infinity, instant = false;
  function lateFades(tNow) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (it.timed || !it.ready) continue;
      it.timed = true;
      // after a skipped opening (a link with a view) a late photograph is simply there, no fade
      if (instant) { aFade.setX(i, -1e6); changed = true; continue; }
      if (aFade.getX(i) < tNow) { aFade.setX(i, tNow); changed = true; }
      busyUntil = Math.max(busyUntil, aFade.getX(i) + T.sheetFade);
    }
    if (changed) aFade.needsUpdate = true;
    return tNow < busyUntil;
  }

  /* ---------- each frame ---------- */
  const camR = new THREE.Vector3(), camU = new THREE.Vector3(), camB = new THREE.Vector3();
  let S = 0.04, liftK = 0, alpha = 0, gap = 0.005, pxScale = 1;
  // the print's size on screen: about 36 px over the whole world (big enough to see what the picture is),
  // growing to about 72 px by the edge of the City level, where the page's own close-in prints take over
  const PX_FAR = phone ? 28 : 36, PX_NEAR = phone ? 56 : 72;
  const pxAt = (alt) => PX_FAR + (PX_NEAR - PX_FAR) * clamp((Math.log(2.0) - Math.log(alt)) / (Math.log(2.0) - Math.log(0.15)), 0, 1);
  function update({ t, alt, pageAlpha, now, lightDir }) {
    camera.matrixWorld.extractBasis(camR, camU, camB);
    uniforms.uCamR.value.copy(camR); uniforms.uCamU.value.copy(camU); uniforms.uCamB.value.copy(camB);
    uniforms.uCamPos.value.copy(camera.position);
    if (lightDir) uniforms.uLightDir.value.copy(lightDir);
    pxScale = (innerHeight / 2) / Math.tan((camera.fov * D) / 2);
    const dist = Math.max(0.005, alt);
    S = (pxAt(alt) * dist) / pxScale;
    gap = (6 * dist) / pxScale;
    liftK = smooth(1.9, 1.4, alt);
    // close in they hand over to the page's prints (journey-atlas-v5-labels.js, below alt 0.15)
    alpha = pageAlpha * smooth(0.125, 0.18, alt);
    uniforms.uT.value = t; uniforms.uSize.value = S; uniforms.uGap.value = gap; uniforms.uLiftK.value = liftK; uniforms.uAlpha.value = alpha;
    // landed, the ball's own depth hides the far side
    const flying = t < T.land;
    mat.depthTest = !flying;   // a render state, not part of the compiled shader
    mesh.visible = shadows.visible = alpha > 0.002;
    frameNo++;
    // no upload while prints are in the air; after the opening, late photographs go up together
    const waiting = t >= T.end ? flush(now, false) : pending.length > 0;
    const fading = lateFades(t);
    return fading || waiting;
  }

  /* ---------- where each landed print is on the screen (for taps, and to keep names off them) ---------- */
  // Worked out once per frame into buffers that are kept, whoever asks for them.
  const P = new THREE.Vector3(), E = new THREE.Vector3(), N = new THREE.Vector3(), toCam = new THREE.Vector3(), cdir = new THREE.Vector3();
  const pool = items.map(() => ({ i: 0, item: null, box: [0, 0, 0, 0] }));
  const boxesOut = [], rawOut = [];
  let frameNo = 0, boxesAt = -1, boxesW = 0, boxesH = 0;
  const LIMB = Math.cos(68 * D);
  function screenBoxes(w, h) {
    if (boxesAt === frameNo && boxesW === w && boxesH === h) return boxesOut;
    boxesAt = frameNo; boxesW = w; boxesH = h;
    boxesOut.length = 0; rawOut.length = 0;
    if (alpha < 0.05) return boxesOut;
    const camPos = camera.position;
    cdir.copy(camPos).normalize();
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (!it.ready) continue;
      const d = it.dir;
      if (d.dot(cdir) < LIMB) continue;   // faded away toward the limb
      E.set(d.z, 0, -d.x).normalize(); N.crossVectors(d, E);
      const [, ox, oy] = FAN[it.rank];
      P.copy(d).multiplyScalar(1.004).addScaledVector(N, liftK * (0.5 * S + gap)).addScaledVector(E, ox * S).addScaledVector(N, oy * S);
      toCam.copy(camPos).sub(P);
      if (toCam.dot(P) <= 0.05 * toCam.length()) continue;   // over the horizon
      const dd = toCam.length();
      P.project(camera);
      if (P.z > 1) continue;
      const x = (P.x * 0.5 + 0.5) * w, y = (-P.y * 0.5 + 0.5) * h;
      const half = (S * pxScale) / dd / 2 * 1.06;
      const o = pool[boxesOut.length];
      o.i = i; o.item = it;
      o.box[0] = x - half; o.box[1] = y - half; o.box[2] = x + half; o.box[3] = y + half;
      boxesOut.push(o); rawOut.push(o.box);
    }
    return boxesOut;
  }
  // the same boxes, as bare rectangles (for the page's names to keep off)
  const boxList = (w, h) => { screenBoxes(w, h); return rawOut; };
  // a landed print that would lie under the page's own words (the top bar, the crumbs, the controls,
  // the playbar) steps out of the way: no word is ever over a photograph
  const hidden = new Uint8Array(n);
  function clearOf(ui, w, h) {
    if (!ui || !ui.length) return false;
    hidden.fill(0);
    for (const b of screenBoxes(w, h)) {
      const [x0, y0, x1, y1] = b.box;
      for (let k = 0; k < ui.length; k++) { const u = ui[k]; if (x0 < u[2] && x1 > u[0] && y0 < u[3] && y1 > u[1]) { hidden[b.i] = 1; break; } }
    }
    let changed = false;
    for (let i = 0; i < n; i++) {
      const want = hidden[i] ? 0 : 1;
      if (aClear.getX(i) !== want) { aClear.setX(i, want); changed = true; }
    }
    if (changed) aClear.needsUpdate = true;
    return changed;
  }
  function pickAt(x, y, w, h, pad = 0) {
    const bs = screenBoxes(w, h);
    // the print drawn last lies on top
    for (let k = bs.length - 1; k >= 0; k--) {
      if (aClear.getX(bs[k].i) < 0.5) continue;
      const b = bs[k].box;
      if (x >= b[0] - pad && x <= b[2] + pad && y >= b[1] - pad && y <= b[3] + pad) return bs[k].item;
    }
    return null;
  }

  return {
    items, stacks, count: n,
    allLoaded, readyCount: () => readyCount,
    layoutSheet,
    update, screenBoxes, boxList, pickAt, clearOf,
    flush: (now) => flush(now, true),
    mesh, shadows, tex,
  };
}
