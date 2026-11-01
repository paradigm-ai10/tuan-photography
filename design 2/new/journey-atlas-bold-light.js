/* Atlas in colour 彩色足跡 (row 14, 2026-11-02): the light. One low warm sun from the upper left,
   written into the globe's own unlit material as a small shader chunk (no three.js lights): the
   relief raised as a bump that grows as you come close, his countries embossed like pressed paper
   with a soft shadow on the sea side, the countries he had not yet been to (on the Years line)
   faded back to plain land, and the one under the pointer lifted. The sheet and the sharper patch
   share one set of uniforms, so the light is the same on both and no square shows.
   Also here: the warm rim round the ball, its soft shadow on the page, and the pin at home. */
import * as THREE from 'three';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const MAX_C = 24;

const PARS = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform vec3 uShade;
uniform sampler2D uBumpMap;
uniform float uBump;
uniform float uHasBump;
uniform sampler2D uMask;
uniform vec2 uMaskSize;
uniform float uHasMask;
uniform float uEmboss;
uniform float uShadowK;
uniform float uYear;
uniform sampler2D uFirstTex;
uniform vec3 uLand;
uniform vec3 uLandLow;
uniform vec3 uLandHigh;
uniform vec3 uLandPeak;
uniform float uContour;
uniform vec3 uContourCol;
uniform float uHover;
uniform float uHoverK;
uniform float uHalo;
uniform vec3 uHaloCol;
varying vec3 vObj;
// the year a country was first visited (0: always shown), from a 32 x 1 strip
float firstOf( int i ) { return i > 0 && i <= ${MAX_C} ? texelFetch( uFirstTex, ivec2( i - 1, 0 ), 0 ).r * 255.0 + 2000.0 : 0.0; }
// the land's tint from the shaded relief's brightness: lowland sage, mid sand, highland ochre, pale peaks
vec3 landTint( float L ) {
  if ( L < 0.25 ) return mix( uLandPeak, uLandHigh, smoothstep( 0.12, 0.25, L ) );
  if ( L < 0.42 ) return mix( uLandHigh, uLand, smoothstep( 0.25, 0.48, L ) );
  return mix( uLand, uLandLow, smoothstep( 0.5, 0.7, L ) );
}
`;

// The relief file is a hillshade, not a height: flat ground reads about 0.807, a face turned to its
// north-west light is brighter, one turned away darker. So its brightness is read as a slope toward
// or away from the north-west, and the ground's normal is leaned that way, then lit by the page's sun
// (upper left, which with north up is the north-west). One sample, no differences, so no facets.
const BODY = /* glsl */ `
{
  vec3 N = normalize( vObj );
  float cl = max( length( N.xz ), 1e-4 );
  vec2 guv = vec2( atan( -N.z, N.x ) * 0.15915494 + 0.5, asin( clamp( N.y, -1.0, 1.0 ) ) * 0.31830989 + 0.5 );
  // derivatives that ignore the jump where longitude wraps, so no seam shows in the samples
  vec2 gdx = dFdx( guv ), gdy = dFdy( guv );
  gdx.x -= floor( gdx.x + 0.5 ); gdy.x -= floor( gdy.x + 0.5 );
  vec4 mk = vec4( 0.0 );
  int idx = 0;
  if ( uHasMask > 0.5 ) {
    mk = textureGrad( uMask, guv, gdx, gdy );
    ivec2 tp = ivec2( int( fract( guv.x ) * uMaskSize.x ), int( clamp( guv.y, 0.0, 0.9999 ) * uMaskSize.y ) );
    idx = int( texelFetch( uMask, tp, 0 ).b * 255.0 + 0.5 );
  }
  // the relief's brightness here, and how fast it changes on the screen (for the contours), read in
  // uniform control flow so the derivatives hold
  float Lr = uHasBump > 0.5 ? textureGrad( uBumpMap, guv, gdx, gdy ).r : 0.807;
  float cz = Lr / 0.08;
  float cw = fwidth( cz );
  vec3 east = vec3( N.z, 0.0, -N.x ) / cl;
  vec3 north = normalize( vec3( 0.0, 1.0, 0.0 ) - N * N.y );
  vec3 Nb = N;
  if ( uHasBump > 0.5 && mk.a > 0.01 ) {
    vec3 nw = normalize( north - east );
    Nb = normalize( N + uBump * mk.a * 2.0 * ( Lr - 0.807 ) * nw );
  }
  // a country he had not been to yet, at the year chosen, goes back to plain land
  float hov = 0.0, gone = 0.0;
  if ( idx > 0 ) {
    gone = smoothstep( uYear, uYear + 0.4, firstOf( idx ) );
    diffuseColor.rgb = mix( diffuseColor.rgb, uLand, gone );
    hov = ( float( idx ) == uHover ? uHoverK : 0.0 ) * ( 1.0 - gone );
  }
  // the land tinted by height (painted flat on the sheet, so this costs no painting): fully on plain
  // land, a little inside his countries so their terrain reads through the terracotta
  if ( uHasBump > 0.5 ) {
    vec3 t = landTint( Lr );
    float lat = abs( asin( clamp( N.y, -1.0, 1.0 ) ) ) * 57.29578;
    t = mix( t, uLandPeak, smoothstep( 63.0, 69.0, lat ) );
    float wgt = mk.a * ( 1.0 - 0.65 * mk.g * ( 1.0 - gone ) );
    diffuseColor.rgb *= mix( vec3( 1.0 ), t / max( uLand, vec3( 1e-3 ) ), wgt );
    // close in: fine contour lines where the relief's brightness crosses a band, inside the view only
    if ( uContour > 0.001 ) {
      float dist = abs( fract( cz + 0.5 ) - 0.5 );
      float ln = ( 1.0 - smoothstep( 0.25 * cw, 0.9 * cw + 1e-4, dist ) ) * ( 1.0 - smoothstep( 0.12, 0.35, cw ) );
      diffuseColor.rgb = mix( diffuseColor.rgb, uContourCol, ln * 0.3 * uContour * mk.a );
    }
  }
  // his countries pressed up from the paper: a soft shadow on the side away from the sun, a light edge facing it
  if ( uHasMask > 0.5 && uEmboss > 0.001 ) {
    vec2 st = vec2( dot( uSun, east ), dot( uSun, north ) );
    float sl = length( st );
    if ( sl > 1e-3 ) {
      st /= sl;
      vec2 tx = 1.0 / uMaskSize;
      vec2 off = st * uShadowK * tx;
      off.x /= max( cl, 0.2 );
      vec4 mo = textureGrad( uMask, guv + off, gdx, gdy );
      ivec2 to = ivec2( int( fract( guv.x + off.x ) * uMaskSize.x ), int( clamp( guv.y + off.y, 0.0, 0.9999 ) * uMaskSize.y ) );
      int io = int( texelFetch( uMask, to, 0 ).b * 255.0 + 0.5 );
      float hoverO = float( io ) == uHover ? uHoverK : 0.0;
      if ( io > 0 ) mo.r *= 1.0 - smoothstep( uYear, uYear + 0.4, firstOf( io ) );
      float shade = 0.16 * mo.r * ( 1.0 - mk.r ) * ( 1.0 + hoverO );
      vec2 e = vec2( tx.x / max( cl, 0.2 ), 0.0 ), f = vec2( 0.0, tx.y );
      vec2 gr = vec2( textureGrad( uMask, guv + e, gdx, gdy ).r - textureGrad( uMask, guv - e, gdx, gdy ).r,
                      textureGrad( uMask, guv + f, gdx, gdy ).r - textureGrad( uMask, guv - f, gdx, gdy ).r );
      float rim = clamp( -dot( gr, st ) * 3.0, 0.0, 1.0 ) * 0.06 * ( 1.0 + hov );
      diffuseColor.rgb *= 1.0 - shade * uEmboss;
      diffuseColor.rgb *= 1.0 + rim * uEmboss;
    }
  }
  diffuseColor.rgb *= 1.0 + 0.05 * hov;
  // the light: warm and full on the sun's side, cool and a little lower on the other, never dark
  float d = dot( Nb, uSun );
  float lit = smoothstep( -0.30, 0.85, d );
  vec3 tint = mix( uShade, uSunCol, lit );
  diffuseColor.rgb *= mix( vec3( 0.80 ), vec3( 1.04 ), lit ) * mix( vec3( 1.0 ), tint, 0.35 );
  // the warm limb on the sun's side, a few pixels at the edge of the ball (no extra sphere for it)
  if ( uHalo > 0.001 ) {
    vec3 V = normalize( cameraPosition - vObj );
    float fr = pow( 1.0 - max( dot( N, V ), 0.0 ), 5.0 );
    float sd = smoothstep( 0.0, 0.35, dot( N, uSun ) );
    diffuseColor.rgb = mix( diffuseColor.rgb, uHaloCol, fr * 0.22 * sd * uHalo );
  }
}
`;

export function createLight({ renderer, scene, C, phone }) {
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  blank.needsUpdate = true;
  // the year each of his countries was first visited, as years after 2000 (0: always shown)
  const firstTex = new THREE.DataTexture(new Uint8Array(32), 32, 1, THREE.RedFormat);
  firstTex.unpackAlignment = 1;
  firstTex.needsUpdate = true;
  const U = {
    uSun: { value: new THREE.Vector3(0.4, 0.5, 0.77).normalize() },
    uSunCol: { value: C.sun.color.clone() },
    uShade: { value: C.shade.color.clone() },
    uBumpMap: { value: blank },
    uBump: { value: 0 },
    uHasBump: { value: 0 },
    uMask: { value: blank },
    uMaskSize: { value: new THREE.Vector2(1, 1) },
    uHasMask: { value: 0 },
    uEmboss: { value: 1 },
    uShadowK: { value: 3 },
    uYear: { value: 9999 },
    uFirstTex: { value: firstTex },
    uLand: { value: C['land-mid'].color.clone() },
    uLandLow: { value: C['land-low'].color.clone() },
    uLandHigh: { value: C['land-high'].color.clone() },
    uLandPeak: { value: C['land-peak'].color.clone() },
    uContour: { value: 0 },
    uContourCol: { value: C.olive.color.clone() },
    uHover: { value: -1 },
    uHoverK: { value: 0 },
    uHalo: { value: 1 },
    uHaloCol: { value: C.halo.color.clone() },
  };

  /* the chunk, written into a MeshBasicMaterial (the sheet, the patch) */
  function apply(mat, key) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vObj = position;');
      sh.fragmentShader = PARS + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + BODY);
    };
    mat.customProgramCacheKey = () => key;
    mat.needsUpdate = true;
  }

  /* the mask: R his countries blurred, G his countries, B which one (index + 1), A land; south row first */
  function setMask(pick, shapes, firstYears, size) {
    const W = size, H = size / 2;
    const layer = (fn) => {
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.fillStyle = 'black'; g.fillRect(0, 0, W, H);
      g.setTransform(W / 360, 0, 0, H / 180, W / 2, H / 2);
      g.fillStyle = 'white';
      fn(g);
      const d = g.getImageData(0, 0, W, H).data;
      cv.width = cv.height = 1;
      return d;
    };
    const land = layer((g) => g.fill(shapes.land));
    const vis = layer((g) => { for (const v of shapes.visited) if (v.path) g.fill(v.path); });
    const soft = layer((g) => { g.filter = `blur(${(2 * W / 2048).toFixed(2)}px)`; for (const v of shapes.visited) if (v.path) g.fill(v.path); });
    const data = new Uint8Array(W * H * 4);
    const code = pick.code, PW = pick.W, PH = pick.H;
    for (let y = 0; y < H; y++) {
      const row = H - 1 - y; // the texture's first row is the south
      const py = Math.min(PH - 1, Math.floor((y + 0.5) * PH / H));
      for (let x = 0; x < W; x++) {
        const s = (y * W + x) * 4, t = (row * W + x) * 4;
        const i = code[py * PW + Math.min(PW - 1, Math.floor((x + 0.5) * PW / W))];
        data[t] = soft[s]; data[t + 1] = vis[s]; data[t + 2] = i >= 0 ? i + 1 : 0; data[t + 3] = land[s];
      }
    }
    const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    if (U.uMask.value !== blank) U.uMask.value.dispose();
    U.uMask.value = tex;
    U.uMaskSize.value.set(W, H);
    U.uHasMask.value = 1;
    const fy = firstTex.image.data;
    fy.fill(0);
    firstYears.forEach((y, i) => { if (i < MAX_C) fy[i] = y ? Math.max(1, Math.min(255, y - 2000)) : 0; });
    firstTex.needsUpdate = true;
  }

  /* the relief as a bump: one channel only (it is grey), 4096 wide (2048 on a phone), south row first.
     Read from the relief file the page has already fetched, so it is downloaded once. The bytes are
     kept, a quarter of the picture's size, so a lost graphics context can upload them again. */
  async function loadBump(blobP) {
    try {
      const blob = await blobP;
      if (!blob) return;
      const w = phone ? 2048 : 4096, h = w / 2;
      const bmp = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high', imageOrientation: 'flipY' });
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(bmp, 0, 0);
      bmp.close && bmp.close();
      const px = g.getImageData(0, 0, w, h).data;
      cv.width = cv.height = 1;
      const red = new Uint8Array(w * h);
      for (let i = 0, j = 0; i < red.length; i++, j += 4) red[i] = px[j];
      const tex = new THREE.DataTexture(red, w, h, THREE.RedFormat);
      tex.unpackAlignment = 1;
      tex.colorSpace = THREE.NoColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      renderer.initTexture(tex);
      U.uBumpMap.value = tex;
      U.uHasBump.value = 1;
    } catch (e) { /* the light without the bump */ }
  }

  /* ---------- the warm rim round the ball ---------- */
  const uHalo = U.uHalo;
  const haloCol = U.uHaloCol;
  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.05, 64, 48), new THREE.ShaderMaterial({
    uniforms: { uSun: U.uSun, uHalo, uCol: haloCol },
    vertexShader: 'varying vec3 vW;\nvoid main() { vW = ( modelMatrix * vec4( position, 1.0 ) ).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `uniform vec3 uSun; uniform float uHalo; uniform vec3 uCol; varying vec3 vW;
void main() {
  vec3 V = normalize( vW - cameraPosition );
  // how close the line of sight passes to the ball: densest at its edge, gone at the rim's edge
  float dmin = length( cross( cameraPosition, V ) );
  float t = clamp( ( dmin - 1.0 ) / 0.05, 0.0, 1.0 );
  float side = mix( 0.5, 1.0, smoothstep( -0.6, 0.6, dot( normalize( vW ), uSun ) ) );
  gl_FragColor = vec4( uCol, pow( 1.0 - t, 2.5 ) * 0.45 * side * uHalo );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    side: THREE.BackSide, transparent: true, depthWrite: false,
  }));
  rim.renderOrder = -1;
  scene.add(rim);

  /* ---------- the ball's soft shadow on the page ---------- */
  const shadowTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    // an alpha map is read from its grey, so the gradient is opaque, white to black
    g.fillStyle = 'black'; g.fillRect(0, 0, 256, 256);
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'white');
    gr.addColorStop(0.45, 'rgb(140 140 140)');
    gr.addColorStop(1, 'black');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.NoColorSpace;
    return t;
  })();
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), new THREE.MeshBasicMaterial({ color: C.text.color, alphaMap: shadowTex, transparent: true, opacity: 0.16, depthWrite: false }));
  contact.renderOrder = -2;
  scene.add(contact);

  /* ---------- the pin at home ---------- */
  // Two parts: the paper ring and the pin's shadow lie flat on the ground (their own group, on the
  // ground's true normal, so neither dips into the ball), and the pin itself leans a little toward
  // the top of the screen so its stem shows even straight below the camera.
  const pin = new THREE.Group();      // the ring and the shadow, flat on the ground
  const pinHead = new THREE.Group();  // the pin, leaning
  const pinLit = (mat) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSun = U.uSun;
      sh.vertexShader = 'varying vec3 vNw;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vNw = normalize( mat3( modelMatrix ) * normal );');
      sh.fragmentShader = 'uniform vec3 uSun;\nvarying vec3 vNw;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb *= mix( 0.72, 1.1, smoothstep( -0.3, 0.85, dot( normalize( vNw ), uSun ) ) );');
    };
    mat.customProgramCacheKey = () => 'bold-pin';
    return mat;
  };
  {
    // a lathe: a fine stem rising to a round head, in units of the pin's height
    const prof = [[0, 0], [0.035, 0], [0.035, 0.66]];
    for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; prof.push([0.2 * Math.cos(a), 0.8 + 0.2 * Math.sin(a)]); }
    const geo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(Math.max(0, x), y)), 24);
    geo.rotateX(Math.PI / 2); // its height along +z, the ground's normal
    const head = new THREE.Mesh(geo, pinLit(new THREE.MeshBasicMaterial({ color: C.home.color })));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.15, 32), new THREE.MeshBasicMaterial({ color: C.paper.color, depthWrite: false, transparent: true, opacity: 0.95 }));
    ring.position.z = 0.004;
    const shade = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshBasicMaterial({ color: C.text.color, alphaMap: shadowTex, transparent: true, opacity: 0.35, depthWrite: false }));
    shade.scale.set(1.6, 0.8, 1);
    shade.position.z = 0.002;
    head.renderOrder = 6; ring.renderOrder = 5; shade.renderOrder = 4;
    pin.add(shade, ring);
    pinHead.add(head);
    pin.userData = { head, ring, shade };
    pin.visible = pinHead.visible = false;
    scene.add(pin, pinHead);
  }
  const pinAt = { v: null };
  function setHome(v) { pinAt.v = v.clone().normalize(); }
  // on a narrow screen the pin is smaller, so it does not cover home's name and its neighbours
  let pinK = 1;
  const setPinScale = (k) => { pinK = k; };

  /* ---------- each frame the camera moves ---------- */
  const c = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), fwd = new THREE.Vector3();
  const sunScreen = { x: -0.64, y: -0.57 };
  const basis = new THREE.Matrix4(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), tz = new THREE.Vector3();
  function update(camera, alt, sweep = 0) {
    // the sun: the camera's own direction, turned 35 degrees up and 40 toward the left of the screen
    c.copy(camera.position).normalize();
    up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const s = U.uSun.value;
    s.copy(c).multiplyScalar(Math.cos(35 * Math.PI / 180)).addScaledVector(up, Math.sin(35 * Math.PI / 180)).normalize();
    s.multiplyScalar(Math.cos(40 * Math.PI / 180)).addScaledVector(right, -Math.sin(40 * Math.PI / 180)).normalize();
    if (sweep) s.applyAxisAngle(up, sweep).normalize();
    sunScreen.x = s.dot(right); sunScreen.y = -s.dot(up);
    const n = Math.hypot(sunScreen.x, sunScreen.y) || 1;
    sunScreen.x /= n; sunScreen.y /= n;
    // the relief rises as you come close, and eases back a little at city height, where one texel of
    // it covers many pixels (the patch's own sharper relief carries the ground there)
    U.uBump.value = 0.8 * Math.min(2.4, Math.max(0.7, 0.35 / alt)) * (0.55 + 0.45 * smooth(0.03, 0.09, alt));
    U.uContour.value = 1 - smooth(0.05, 0.1, alt);
    // the paper emboss hands over to the patch below 0.12
    U.uEmboss.value = smooth(0.08, 0.12, alt);
    U.uShadowK.value = 3 * Math.min(1, Math.max(0.15, alt));
    uHalo.value = smooth(0.3, 0.6, alt);
    rim.visible = uHalo.value > 0.001;
    // the soft shadow under the ball, at world view only
    const k = smooth(0.6, 1.2, alt);
    contact.visible = k > 0.001;
    if (contact.visible) {
      fwd.copy(c).negate();
      contact.position.copy(up).multiplyScalar(-1.12).addScaledVector(fwd, 0.35);
      contact.quaternion.copy(camera.quaternion);
      contact.material.opacity = 0.16 * k;
    }
    // the pin, its size kept on the screen, hidden very close in
    if (pinAt.v) {
      // (and hidden once home turns over the limb, so it never stands off the ball's edge)
      pin.visible = pinHead.visible = alt > 0.05 && pinAt.v.dot(c) > 1 / camera.position.length() + 0.03;
      if (pin.visible) {
        const v = pinAt.v;
        const sc = v.distanceTo(camera.position) * 0.024 * pinK;
        // the ring and the shadow: on the ground's own normal
        e1.set(0, 1, 0).cross(v).normalize();
        e2.crossVectors(v, e1);
        basis.makeBasis(e1, e2, v);
        pin.position.copy(v);
        pin.quaternion.setFromRotationMatrix(basis);
        pin.scale.setScalar(sc);
        // its shadow falls away from the sun
        const sh = pin.userData.shade.position;
        sh.set(-s.dot(e1), -s.dot(e2), 0).normalize().multiplyScalar(0.12);
        sh.z = 0.002;
        // the pin: leaning a little toward the top of the screen
        tz.copy(v).addScaledVector(up, 0.55).normalize();
        e1.set(0, 1, 0).cross(tz).normalize();
        e2.crossVectors(tz, e1);
        basis.makeBasis(e1, e2, tz);
        pinHead.position.copy(v);
        pinHead.quaternion.setFromRotationMatrix(basis);
        pinHead.scale.setScalar(sc);
      }
    }
    return sunScreen;
  }

  return { U, apply, setMask, loadBump, update, setHome, setPinScale, rim, contact, pin, pinHead, shadowTex, sunScreen };
}
