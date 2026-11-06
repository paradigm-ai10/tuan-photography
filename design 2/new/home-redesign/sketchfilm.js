/* Home redesign, E's opening drawn so the drawing turns into the film (his ask, 2026-11-06: in the earlier
   sketches "the video and sketching itself is detached"; he wants a smooth change from one to the other).
   The drawing is not a picture laid over the film and swapped for it: it is the film itself, drawn in pencil as it
   plays (slowed), on one canvas over it, so the drawing already moves, shares the film's slow settling zoom, and
   turns into it where the canvas lets the film through. <html data-pencil> names the way:
     sk-move     the hatching thickens, layer on layer, each stroke bolder, until no paper shows and it is the photograph
     sk-bleed    the colour spreads out from the drawn lines into the spaces between them
     sk-tone     the light comes through first, the sky and the sunlit stone, then the middle tones, the shadows last
     sk-front    one sweep from the spire outward: paper ahead, the drawing at the front, the film behind it
     sk-tracing  the film seen faintly through tracing paper while E's traced lines are drawn on it, then the paper clears
   home.js calls HRPencil.start() and gets the timings back, as with the brush. */
(() => {
  'use strict';
  const html = document.documentElement;
  const canvas = document.querySelector('.hr-load__wear');
  const video = document.querySelector('.hr-open video');
  // draw: when the drawing runs (s); real: when the film comes through (s); lines, hatch: how much of each
  const WAYS = {
    // (after a review round, 2026-11-06: each drawn its own way, so the three that turn real differently do not open alike;
    // bleed in lines alone, tone from the top down like light falling, move from the spire outward in hatching)
    'sk-move': { mode: 0, draw: [0, 2.6], real: [2.0, 5.2], hatch: 1, wash: 0.1 },
    'sk-bleed': { mode: 1, draw: [0, 2.6], real: [2.2, 5.0], hatch: 0, wash: 0.05 },
    'sk-tone': { mode: 2, draw: [0, 2.6], real: [2.1, 5.3], hatch: 0.9, wash: 0.08 },
    'sk-front': { mode: 3, draw: [0, 4.6], real: [0, 4.6], hatch: 0.8, wash: 0.1 },
    'sk-tracing': { mode: 4, draw: [0.4, 2.6], real: [2.7, 4.6], hatch: 0, wash: 0 },
  };
  const o = WAYS[html.dataset.pencil];
  if (!o || !canvas || !video) return;

  const VS = 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }';
  const FS = `
precision highp float;
uniform sampler2D uV, uD, uL;
uniform vec2 uRes, uSpire;
uniform vec4 uBox;
uniform vec3 uPaper, uLead;
uniform float uK, uHave, uDraw, uReal, uMode, uHatch, uWash, uSee;

vec2 uvAt(vec2 p) { return (p - uBox.xy) / uBox.zw; }
vec3 V(vec2 p) { return texture2D(uV, clamp(uvAt(p), 0.0005, 0.9995)).rgb; }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// when the drawing reaches this point, 0 to 1: from the spire outward, in patches rather than a ring
float order(vec2 p, int mode) {
  if (mode == 2) return clamp(p.y / uRes.y * 0.82 + 0.18 * noise(p / 75.0) + 0.06 * noise(p / 14.0), 0.0, 1.0);   // from the top down
  vec2 d = (p - uSpire) / vec2(uRes.x * 0.6, uRes.y * 0.9);
  return clamp(length(d) * 0.8 + 0.2 * noise(p / 75.0) + 0.06 * noise(p / 14.0), 0.0, 1.0);
}
// one layer of hatching: short pencil dashes at angle a, rows gap px apart, where the tone passes thr; each dash
// drawn from its start once the drawing reaches it
float hatch(vec2 p, float a, float gap, float tone, float thr, float when, float grow) {
  vec2 q = mat2(cos(a), sin(a), -sin(a), cos(a)) * p;
  float row = floor(q.y / gap), jit = hash(vec2(row, a * 17.0));
  float L = 16.0 + 30.0 * jit;
  float x = q.x / L + hash(vec2(row, 3.1 + a)) * 9.0, seg = floor(x), u = fract(x);
  float h = hash(vec2(row, seg) + a);
  float y = (fract(q.y / gap) - 0.5 - (jit - 0.5) * 0.4) * gap + (u - 0.5) * (h - 0.5) * 2.2;
  float w = (0.35 + 0.4 * h) * (1.0 + grow * 4.0);   // grow: the strokes go bolder until they meet
  float line = 1.0 - smoothstep(w, w + 0.85, abs(y));
  float ends = smoothstep(0.0, 0.1, u) * smoothstep(1.0, 0.82, u);
  float gate = smoothstep(thr - 0.05, thr + 0.07, tone + (h - 0.5) * 0.14);
  float drawn = smoothstep(u - 0.02, u, (when - h * 0.06) / 0.05);
  return line * ends * gate * drawn * step(0.14, h);
}
float sobel(vec2 p, float r) {   // sampled between pixels, so the picture is lightly softened first
  float tl = lum(V(p + vec2(-r, -r))), t = lum(V(p + vec2(0.0, -r))), tr = lum(V(p + vec2(r, -r)));
  float l = lum(V(p + vec2(-r, 0.0))), rt = lum(V(p + vec2(r, 0.0)));
  float bl = lum(V(p + vec2(-r, r))), b = lum(V(p + vec2(0.0, r))), br = lum(V(p + vec2(r, r)));
  return length(vec2((tr + 2.0 * rt + br) - (tl + 2.0 * l + bl), (bl + 2.0 * b + br) - (tl + 2.0 * t + tr)));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uK - gl_FragCoord.y) / uK;
  vec3 c = V(p);
  int mode = int(uMode + 0.5);
  float o = order(p, mode);
  float grain = noise(p * 0.85) * 0.65 + noise(p * 0.21) * 0.35;   // the paper's tooth

  // how far the film has come through here, 0 to 1
  float f = mode == 0 ? clamp(uReal * 1.9 - o * 0.9, 0.0, 1.0) : clamp(uReal * 1.35 - o * 0.35, 0.0, 1.0);   // sk-move: place by place
  float drawAt = mode == 3 ? uDraw * 1.32 : uDraw * 1.08;
  float when = drawAt - o;

  // the drawing: lines where the picture has edges, hatching where it is dark, in the picture's own colours
  float tone = smoothstep(0.12, 0.88, 1.0 - lum(c));
  float e = smoothstep(0.2, 0.55, sobel(p, 1.5)) * smoothstep(0.08, 0.3, sobel(p, 3.2)) * (mode == 4 ? 0.0 : 1.0);
  float edge = e * smoothstep(0.0, 0.04, when - noise(p / 9.0) * 0.05);
  // sk-move: more and more layers as the film comes, then every stroke bolder until they meet
  float thick = mode == 0 ? smoothstep(0.0, 0.55, f) * 1.25 : 0.0, grow = mode == 0 ? smoothstep(0.3, 1.0, f) : 0.0;
  float h = 0.0;
  h = max(h, hatch(p, 0.92, 5.5, tone, 0.28 - thick, when, grow));
  h = max(h, hatch(p, -0.66, 6.0, tone, 0.52 - thick, when - 0.04, grow));
  h = max(h, hatch(p, 0.27, 4.6, tone, 0.74 - thick, when - 0.08, grow));
  if (mode == 0) {
    h = max(h, hatch(p, 1.35, 4.2, tone, 1.0 - thick, when - 0.1, grow));
    h = max(h, hatch(p, -1.2, 3.8, tone, 1.2 - thick, when - 0.1, grow));
  }
  h *= uHatch * (mode == 3 ? 1.0 + tone * 0.5 : 1.0);   // sk-front: shadows drawn darker, so the film's own darks do not land as stains
  float tooth = mix(0.5 + 0.5 * grain, 1.0, mode == 0 ? grow : 0.0);
  vec3 deep = mix(c, c * c, 0.3) * 1.04 + 0.03;    // coloured pencil: the picture's colour, a little deeper
  vec3 lead = mode == 4 ? uLead : mix(deep * 0.72, uLead, 0.3);
  float washed = smoothstep(0.0, 0.12, when) * uWash;
  vec3 col = mix(uPaper, c, mode == 0 ? max(washed, smoothstep(0.05, 0.8, f) * 0.92) : washed);   // sk-move: the paper takes the colour as the film comes
  if (mode == 4) col = mix(uPaper, c, uSee);       // tracing paper: the film faintly through it, moving
  vec3 pen = mode == 0 ? mix(deep, c, f) : mode == 3 ? deep * (1.0 - 0.3 * tone) : deep;
  col = mix(col, pen, clamp(h * tooth * (0.62 + 0.38 * f), 0.0, 1.0));
  col = mix(col, lead, clamp(edge * tooth * 0.75, 0.0, 1.0));
  vec2 sc = gl_FragCoord.xy / (uRes * uK);
  if (mode == 4) col = mix(col, uLead, texture2D(uL, vec2(sc.x, 1.0 - sc.y)).a * 0.85);   // the traced lines

  // where the canvas lets the film through
  float m = 0.0;
  if (mode == 0) {          // the paper's tooth fills, grain by grain, behind the thickening hatching
    m = smoothstep(0.86, 1.0, f);   // by now the strokes have met: the film takes over unseen
  } else if (mode == 1) {   // out from the lines: distance from the first frame's lines, 0 on them
    float d0 = texture2D(uD, clamp(uvAt(p), 0.0, 1.0)).r;
    float d = d0 * (1.0 - 0.65 * tone);   // dark places soak it up sooner
    d = mix(d, 0.3 + p.y / uRes.y * 0.6, smoothstep(0.15, 0.5, d0) * (1.0 - tone));   // open sky, away from the lines, takes one wash from the top down
    d += (noise(p / 11.0) - 0.5) * 0.06 + (grain - 0.5) * 0.14;
    m = smoothstep(d - 0.3, d + 0.03, f * 1.2 - 0.04);   // a feathered, grainy edge, as colour soaking into paper
  } else if (mode == 2) {   // the light first
    vec3 b = (V(p + vec2(3.0, 0.0)) + V(p - vec2(3.0, 0.0)) + V(p + vec2(0.0, 3.0)) + V(p - vec2(0.0, 3.0))) * 0.25;
    float lt = smoothstep(0.08, 0.92, lum(b)) + (grain - 0.5) * 0.08;
    m = smoothstep(-0.14, 0.14, lt - (1.0 - f * 1.3));   // a wide ramp, so the middle tones are half there as the sky lands
  } else if (mode == 3) {   // one sweep: the film follows the drawing's front at a distance
    m = smoothstep(o - 0.05, o + 0.05, drawAt - 0.34 + (grain - 0.5) * 0.06);
  } else {                  // the tracing paper clears, from the spire outward, softly, as wet paper turns clear
    float q = length((p - uSpire) / vec2(uRes.x * 0.6, uRes.y * 0.9)) * 0.8 + noise(p / 160.0) * 0.2;
    m = smoothstep(q - 0.1, q + 0.1, uReal * 1.25 - 0.1);
  }
  m *= uHave * smoothstep(0.0, 0.1, when) * (mode == 3 ? 1.0 : smoothstep(0.0, 0.08, f));   // never before it is drawn
  float a = 1.0 - m;
  if (uHave < 0.5) col = uPaper;
  gl_FragColor = vec4(col * a, a);
}`;

  let running = false, gl = null, prog = null, tex = null, distTex = null, lineTex = null, U = {};
  const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const span = ([a, b], t) => ease((t - a) / (b - a));

  function setup() {
    gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return false; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uV', 'uD', 'uL', 'uRes', 'uSpire', 'uBox', 'uPaper', 'uLead', 'uK', 'uHave', 'uDraw', 'uReal', 'uMode', 'uHatch', 'uWash', 'uSee'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    const make = (unit) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([255]));
      return t;
    };
    tex = make(0);
    distTex = make(1);
    lineTex = make(2);
    gl.uniform1i(U.uV, 0);
    gl.uniform1i(U.uD, 1);
    gl.uniform1i(U.uL, 2);
    return true;
  }

  // sk-bleed: how far each point of the first frame is from its lines (480 x 270, a chamfer distance, 0 on a line)
  function distances() {
    const w = 480, h = 270, c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(video, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data, L = new Float32Array(w * h), D = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const at = (dx, dy) => L[Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx))];
      const gx = at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1);
      const gy = at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1);
      D[y * w + x] = Math.hypot(gx, gy) > 0.32 ? 0 : 1e9;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {   // two passes, 1 and 1.4 steps
      const i = y * w + x;
      if (x > 0) D[i] = Math.min(D[i], D[i - 1] + 1);
      if (y > 0) { D[i] = Math.min(D[i], D[i - w] + 1); if (x > 0) D[i] = Math.min(D[i], D[i - w - 1] + 1.4); if (x < w - 1) D[i] = Math.min(D[i], D[i - w + 1] + 1.4); }
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (x < w - 1) D[i] = Math.min(D[i], D[i + 1] + 1);
      if (y < h - 1) { D[i] = Math.min(D[i], D[i + w] + 1); if (x < w - 1) D[i] = Math.min(D[i], D[i + w + 1] + 1.4); if (x > 0) D[i] = Math.min(D[i], D[i + w - 1] + 1.4); }
    }
    const out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = Math.min(255, Math.sqrt(Math.min(1, D[i] / 30)) * 255);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, distTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, w, h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, out);
  }

  function colour(css) {   // a computed rgb() colour as three numbers 0 to 1
    const k = document.createElement('canvas').getContext('2d');
    k.fillStyle = css;
    k.fillRect(0, 0, 1, 1);
    const d = k.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  function start() {
    if (running) return null;
    if (!gl && !setup()) return null;
    running = true;
    const W = innerWidth, H = innerHeight, k = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const paper = colour(getComputedStyle(document.querySelector('.hr-load__paper')).backgroundColor);
    const lead = colour(getComputedStyle(document.body).color);
    gl.uniform3fv(U.uPaper, paper);
    gl.uniform3fv(U.uLead, lead);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uK, k);
    gl.uniform1f(U.uMode, o.mode);
    gl.uniform1f(U.uHatch, o.hatch);
    gl.uniform1f(U.uWash, o.wash);
    let have = false, dist = o.mode !== 1;
    // sk-tracing: E's traced lines (laid over the screen as the film is, cover), drawn from the towers outward into a
    // canvas of their own that the shader reads, so they clear with the paper
    const svg = o.mode === 4 ? document.querySelector('.hr-load__trace') : null, ink = [];
    let lc = null, lx = null, inked = false;
    if (svg) {
      lc = document.createElement('canvas');
      lc.width = canvas.width; lc.height = canvas.height;
      lx = lc.getContext('2d');
      lx.setTransform(k, 0, 0, k, 0, 0);
      lx.lineCap = lx.lineJoin = 'round';
      const s = Math.max(W / 1920, H / 1080), ox = (W - 1920 * s) / 2, oy = (H - 1080 * s) / 2, pace = (o.draw[1] - o.draw[0]) / 5.3;
      lx.lineWidth = 1.35 * s;
      svg.querySelectorAll('path').forEach((el) => {
        const pts = el.getAttribute('d').slice(1).split(' L').map((q) => { const [x, y] = q.split(',').map(Number); return [ox + x * s, oy + y * s]; });
        const st = el.getAttribute('style') || '', cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        if (cum[cum.length - 1] < 70 * s) return;   // the short squiggles in the trees left out, so fewer, firmer lines
        ink.push({ pts, cum, d: o.draw[0] + parseFloat((/--d:\s*([\d.]+)/.exec(st) || [0, 0])[1]) * pace, t: parseFloat((/--t:\s*([\d.]+)/.exec(st) || [0, 0.6])[1]) * pace, i: 0, at: pts[0] });
      });
    }
    const draw = (t) => {   // the lines drawn so far, each from its start along its length
      const path = new Path2D();
      let busy = false;
      for (const l of ink) {
        if (l.i >= l.pts.length - 1) continue;
        busy = true;
        if (t < l.d) continue;
        const kk = Math.min(1, (t - l.d) / l.t), along = (1 - Math.pow(1 - kk, 3)) * l.cum[l.cum.length - 1];
        path.moveTo(l.at[0], l.at[1]);
        while (l.i < l.pts.length - 1 && l.cum[l.i + 1] <= along) { l.i++; l.at = l.pts[l.i]; path.lineTo(l.at[0], l.at[1]); }
        if (l.i < l.pts.length - 1) {
          const f = (along - l.cum[l.i]) / Math.max(0.001, l.cum[l.i + 1] - l.cum[l.i]), a = l.pts[l.i], b = l.pts[l.i + 1];
          l.at = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          path.lineTo(l.at[0], l.at[1]);
        }
      }
      lx.stroke(path);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, lineTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lc);
      return busy;
    };
    const t0 = performance.now(), end = Math.max(o.draw[1], o.real[1]);
    const frame = (now) => {
      if (!running) return;
      const t = (now - t0) / 1000;
      if (video.readyState >= 2 && video.videoWidth) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        if (!dist) { distances(); dist = true; }
        have = true;
        // the film's picture on screen (object-fit: cover inside its box, which settles from a little close)
        const r = video.getBoundingClientRect(), s = Math.max(r.width / video.videoWidth, r.height / video.videoHeight);
        const cw = video.videoWidth * s, ch = video.videoHeight * s;
        gl.uniform4f(U.uBox, r.left + (r.width - cw) / 2, r.top + (r.height - ch) / 2, cw, ch);
        gl.uniform2f(U.uSpire, r.left + (r.width - cw) / 2 + cw * 0.495, r.top + (r.height - ch) / 2 + ch * 0.3);
      }
      if (lc && !inked) inked = !draw(t);
      gl.uniform1f(U.uHave, have ? 1 : 0);
      gl.uniform1f(U.uDraw, o.mode === 3 ? 1.06 * span(o.draw, t) : span(o.draw, t));
      gl.uniform1f(U.uReal, span(o.real, t));
      gl.uniform1f(U.uSee, 0.2 * ease(t / 0.9));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (t < end + 0.4) requestAnimationFrame(frame);
    };
    frame(t0);
    // the shades come in as the last of the paper goes, the menu and caption once it is nearly all gone
    return { footTop: H, count: 0.6, counted: 0, end, clear: end - 1.1, out: end + 0.15, film: 'now', rate: 0.25 };
  }
  window.HRPencil = { start, stop: () => { running = false; } };
})();
