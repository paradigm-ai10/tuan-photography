/* Atlas, version 1 "Varnished globe" 上漆紙地球: the object itself. The painted sheet under a coat
   of varnish (MeshPhysicalMaterial, clearcoat), lit by one warm light from the upper left and a
   room with one window, so the varnish shows a soft window and never a hot spot. The light and the
   room travel with the camera: the globe turns under them, so the window highlight drifts over
   the paint as it turns, the way it does on a globe on a desk. A thin ink rim (a fresnel term)
   turns the edge, so the ball reads as an object on the paper page. On a phone: the plain standard
   material, no clearcoat, a smaller room.
   Also here: the contact shadow on the desk, for the opening only. */
import * as THREE from 'three';

const hex = (h) => new THREE.Color(h);
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const srgb = (h) => { const c = parseInt(h.slice(1), 16); return new THREE.Vector3(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255); };

// in the camera's own space: x right, y up, z toward the viewer
export const LIGHT_DIR = new THREE.Vector3(-0.6, 0.7, 0.8).normalize();

export function createVarnish({ renderer, scene, camera, low }) {
  /* ---------- the room the varnish reflects ---------- */
  const room = new THREE.Scene();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: hex('#f7f3ec'), side: THREE.BackSide }));
  room.add(walls);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), new THREE.MeshBasicMaterial({ color: hex('#fdfbf7').multiplyScalar(3), side: THREE.DoubleSide }));
  pane.position.copy(LIGHT_DIR).multiplyScalar(4.6);
  pane.lookAt(0, 0, 0);
  room.add(pane);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(room, 0.04, 0.1, 100, { size: low ? 128 : 256 });
  pmrem.dispose();
  walls.geometry.dispose(); walls.material.dispose(); pane.geometry.dispose(); pane.material.dispose();
  const envMap = envRT.texture;

  /* ---------- the lights, carried by the camera ---------- */
  // The room's light carries the same warmth as the window's, and more of it: the white balance
  // below takes the warmth back out evenly, so the side away from the window stays warm paper
  // (#e8e3da range) instead of turning a cool grey. (Measured at world view: the lower right sea
  // reads about #ebe4dc, against #d4d0ca with a white sky at 1.0.)
  const sun = new THREE.DirectionalLight(hex('#fff4e6'), 1.8);
  sun.position.copy(LIGHT_DIR);
  sun.target.position.set(0, 0, 0);
  const sky = new THREE.HemisphereLight(hex('#fff4e6'), hex('#f6e8d4'), 2.0);
  sky.position.set(0, 1, 0);
  camera.add(sun, sun.target, sky);
  if (!camera.parent) scene.add(camera);

  /* ---------- the material ---------- */
  const placeholder = new THREE.DataTexture(new Uint8Array([0xe8, 0xe3, 0xda, 255]), 1, 1);
  placeholder.colorSpace = THREE.SRGBColorSpace;
  placeholder.needsUpdate = true;
  const rimU = { uRim: { value: srgb('#5c534c') }, uRimK: { value: 0.25 } };
  const mats = [];
  const balance = new THREE.Color(1, 1, 1);
  function finish(m, mix) {
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uRim = rimU.uRim;
      shader.uniforms.uRimK = rimU.uRimK;
      shader.uniforms.uMapB = mix.mapB;
      shader.uniforms.uMix = mix.mix;
      shader.fragmentShader = 'uniform vec3 uRim;\nuniform float uRimK;\nuniform sampler2D uMapB;\nuniform float uMix;\n' + shader.fragmentShader
        // two sheets cross-faded while a new one comes in (the relief, landing mid-move)
        .replace('#include <map_fragment>', `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv );
          if ( uMix > 0.0 ) sampledDiffuseColor = mix( sampledDiffuseColor, texture2D( uMapB, vMapUv ), uMix );
          diffuseColor *= sampledDiffuseColor;
        #endif`)
        // the ink rim, in the page's own colour, after tone mapping so it is exactly #5c534c
        .replace('#include <colorspace_fragment>', `#include <colorspace_fragment>
          {
            float nv = clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 );
            gl_FragColor.rgb = mix( gl_FragColor.rgb, uRim, uRimK * pow( 1.0 - nv, 6.0 ) );
          }`);
    };
    m.customProgramCacheKey = () => 'varnish-v1';
    mats.push(m);
    return m;
  }
  function makeMat(map, extra = {}) {
    const common = { color: balance.clone(), map, envMap, envMapIntensity: 0.35, transparent: true, ...extra };
    return low
      ? new THREE.MeshStandardMaterial({ ...common, roughness: 0.45, metalness: 0 })
      : new THREE.MeshPhysicalMaterial({ ...common, roughness: 0.6, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  }
  const sheetMix = { mapB: { value: placeholder }, mix: { value: 0 } };
  const globeMat = finish(makeMat(placeholder, { opacity: 0 }), sheetMix);

  // the detail patch: the same varnish, laid just above the sheet
  function makePatchMaterial(tex) {
    const m = finish(makeMat(tex, { opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), { mapB: { value: tex }, mix: { value: 0 } });
    const d = m.dispose.bind(m);
    m.dispose = () => { const i = mats.indexOf(m); if (i >= 0) mats.splice(i, 1); d(); };
    m.envMapRotation.copy(globeMat.envMapRotation);
    m.envMapIntensity = globeMat.envMapIntensity;
    if (m.clearcoat !== undefined && !low) m.clearcoat = globeMat.clearcoat;
    return m;
  }

  /* ---------- a new sheet: cross-faded in over 300 ms, or at once ---------- */
  let incoming = null, fadeT = 0;
  function setSheet(tex, fade) {
    const old = globeMat.map;
    if (!fade || old === placeholder) {
      if (incoming) { incoming.dispose(); incoming = null; }
      globeMat.map = tex; sheetMix.mix.value = 0; sheetMix.mapB.value = placeholder;
      if (old && old !== placeholder && old !== tex) old.dispose();
      return;
    }
    if (incoming) { globeMat.map = incoming; if (old !== placeholder) old.dispose(); }
    incoming = tex; fadeT = 0;
    sheetMix.mapB.value = tex; sheetMix.mix.value = 0.0001;
  }
  function step(dt) {
    if (!incoming) return false;
    fadeT = Math.min(1, fadeT + dt / 0.3);
    sheetMix.mix.value = Math.max(0.0001, fadeT * fadeT * (3 - 2 * fadeT));
    if (fadeT >= 1) {
      const old = globeMat.map;
      globeMat.map = incoming; incoming = null;
      sheetMix.mix.value = 0; sheetMix.mapB.value = placeholder;
      if (old && old !== placeholder) old.dispose();
      return true;
    }
    return true;
  }

  /* ---------- the room and the light stay where the viewer is ---------- */
  // the shader turns a world direction into the room's by the inverse of envMapRotation, so the
  // camera's own turn keeps the window at the upper left of the view
  function follow() {
    camera.updateMatrixWorld();
    for (const m of mats) m.envMapRotation.setFromQuaternion(camera.quaternion);
  }

  /* ---------- the exposure: lit land at its brightest reads #f9f6f1 ---------- */
  // Rendered once: the globe painted plain #f9f6f1 under the same light, the pixel read where the
  // sun stands overhead (the point whose normal is the light's direction), and the exposure found by
  // halving the interval. Tone mapping is monotonic, so this settles in a dozen renders.
  function calibrate({ globe, hide, project }) {
    const gl = renderer.getContext();
    const calibMat = makeMat(null, { color: hex('#f9f6f1'), transparent: false, opacity: 1 });
    calibMat.envMapRotation.setFromQuaternion(camera.quaternion);
    const keep = globe.material;
    globe.material = calibMat;
    const saved = hide.map((o) => [o, o.visible]);
    hide.forEach((o) => { o.visible = false; });
    try {
    follow();
    const L = LIGHT_DIR.clone().applyQuaternion(camera.quaternion);
    const [sx, sy] = project(L);
    const pr = renderer.getPixelRatio();
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const x = Math.round(sx * pr), y = Math.round(H - sy * pr);
    const px = new Uint8Array(4 * 9);
    const read = () => {
      renderer.render(scene, camera);
      gl.readPixels(Math.max(0, Math.min(W - 3, x - 1)), Math.max(0, Math.min(H - 3, y - 1)), 3, 3, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < 9; i++) { r += px[i * 4]; g += px[i * 4 + 1]; b += px[i * 4 + 2]; }
      return [r / 9, g / 9, b / 9];
    };
    let lo = 0.1, hi = 4, got = null;
    for (let i = 0; i < 14; i++) {
      const e = (lo + hi) / 2;
      renderer.toneMappingExposure = e;
      got = read();
      if (got[0] > 249) hi = e; else lo = e;
    }
    renderer.toneMappingExposure = (lo + hi) / 2;
    // the warm light tints the paper; a small white balance on the sheet takes the tint back out,
    // so lit land is #f9f6f1 in all three channels (a few rounds, each channel by its own ratio)
    const want = [0xf9, 0xf6, 0xf1].map((v) => toLin(v / 255));
    const bal = [1, 1, 1];
    for (let i = 0; i < 8; i++) {
      got = read();
      for (let c = 0; c < 3; c++) bal[c] *= want[c] / Math.max(1e-4, toLin(got[c] / 255));
      calibMat.color.setRGB(0xf9 / 255, 0xf6 / 255, 0xf1 / 255, THREE.SRGBColorSpace);
      calibMat.color.r *= bal[0]; calibMat.color.g *= bal[1]; calibMat.color.b *= bal[2];
    }
    got = read();
    balance.setRGB(bal[0], bal[1], bal[2]);
    for (const m of mats) m.color.copy(balance);
    return { exposure: renderer.toneMappingExposure, balance: bal.map((v) => +v.toFixed(4)), rgb: got.map((v) => Math.round(v)), at: [sx, sy] };
    } finally {
      globe.material = keep;
      saved.forEach(([o, v]) => { o.visible = v; });
      calibMat.dispose();
      renderer.clear();
    }
  }

  /* ---------- close in, the varnish steps back ---------- */
  // Below country height the window's reflection would lie as a pale band over a few kilometres of
  // sea, so the room fades out between 0.5 and 0.1 and the clearcoat thins (never to 0, which would
  // change the shader).
  let nearK = -1;
  function near(alt) {
    const t = Math.max(0, Math.min(1, (alt - 0.1) / 0.4));
    const k = t * t * (3 - 2 * t);
    if (Math.abs(k - nearK) < 0.002) return;
    nearK = k;
    for (const m of mats) {
      m.envMapIntensity = 0.35 * k;
      if (m.clearcoat !== undefined && !low) m.clearcoat = 0.1 + 0.4 * k;
    }
  }
  // the opening is over: the globe is opaque from now on, drawn first, with early depth
  function settle() {
    if (!globeMat.transparent) return;
    globeMat.opacity = 1;
    globeMat.transparent = false;
    globeMat.needsUpdate = true;
  }

  return { near, settle, balance, globeMat, makePatchMaterial, setSheet, step, follow, calibrate, envMap, sun, sky, get fading() { return !!incoming; } };
}

/* ---------- the desk: a soft contact shadow under the globe, for the opening only ---------- */
// One flat ellipse facing the viewer, two ready-made gradients (tight and soft) cross-faded as the
// globe lifts off. Its own scene, drawn before the globe; removed when the opening is over.
export function createDesk() {
  const desk = new THREE.Scene();
  const grad = (inner) => {
    const s = 128, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const g = cv.getContext('2d');
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(inner, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const mk = (tex) => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: tex, color: hex('#26201c'), transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false,
  }));
  const tight = mk(grad(0.35)), soft = mk(grad(0.12));
  tight.renderOrder = soft.renderOrder = -1;
  desk.add(tight, soft);
  const q = new THREE.Quaternion();
  return {
    scene: desk,
    // at: the point under the globe; up: the desk's up; w: width (globe radii); op: opacity; blur 0 to 1
    set(camera, at, w, op, blur) {
      camera.getWorldQuaternion(q);
      for (const [m, k] of [[tight, 1 - blur], [soft, blur]]) {
        m.position.copy(at);
        m.quaternion.copy(q);
        const ww = w * (1 + 0.15 * blur);
        m.scale.set(ww, ww * 0.16, 1);
        m.material.opacity = op * k;
        m.visible = m.material.opacity > 0.001;
      }
    },
    dispose() {
      for (const m of [tight, soft]) { m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); }
      desk.clear();
    },
  };
}
