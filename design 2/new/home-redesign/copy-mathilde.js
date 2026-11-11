/* After Mathilde De Chiara (2026-11-10): her home page, move for move, with his photographs.
   1. the name rises through a mask at the left, holds, lifts away;
   2. the photographs stream in along the diagonal and lock into a diamond (a 6 by 6 square grid
      turned 45 degrees, six cells left empty);
   3. the diamond pulls apart along the diagonal, the squares turn straight and grow into one
      column down the middle, the first at the reading line;
   4. the four corners come up: the count, the line across, About, the continents, the place, Slider / Grid.
   Then the wheel, a drag or the arrow keys move the column, and it settles on the nearest photograph.
   Every tile is placed by this script on each frame (transform only). */
(() => {
  'use strict';
  const C = window.COPY;
  const root = document.getElementById('md');
  const stage = document.getElementById('stage');
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const zh = () => html.lang === 'zh-Hant';

  // ---------- easing ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const OUT = (t) => 1 - Math.pow(1 - t, 3);
  const OUT4 = (t) => 1 - Math.pow(1 - t, 4);
  const INOUT = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const seed = (n) => { let s = n; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };

  // ---------- tiles ----------
  const all = C.photos.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'md-tile';
    const im = document.createElement('img');
    im.src = C.img + '640/' + p.file;
    im.alt = '';
    im.decoding = 'async';
    el.appendChild(im);
    el.addEventListener('click', () => onTile(i));
    stage.appendChild(el);
    return { p, el, i, cell: 0, x: 0, y: 0, s: 0, r: 0, o: 1 };
  });
  // which diamond cell each photograph takes: 36 cells, the six left empty spread about
  const rnd = seed(11);
  const cells = [...Array(36).keys()];
  const empty = new Set();   // every cell filled, as hers
  const free = cells.filter((c) => !empty.has(c)).sort(() => rnd() - 0.5);
  all.forEach((t, k) => { t.cell = free[k]; t.delay = rnd(); });

  // ---------- geometry ----------
  let W = 0, H = 0, phone = false, side = 0, pitch = 0;
  function measure() {
    W = innerWidth; H = innerHeight; phone = W < 700;
    side = phone ? Math.min(W * 0.62, H * 0.38) : Math.min(W * 0.218, H * 0.349);
    pitch = side * 1.118;
    root.style.setProperty('--md-side', side + 'px');
  }
  function diamondCell(c) {   // centre and size of cell c in the turned grid
    const D = Math.min(H * 0.9, W * (phone ? 0.92 : 0.56));
    const S = D / Math.SQRT2, p = S / 6;
    const u = ((c % 6) - 2.5) * p, v = (Math.floor(c / 6) - 2.5) * p;
    return { x: W / 2 + (u - v) / Math.SQRT2, y: H / 2 + (u + v) / Math.SQRT2, s: p * 0.87 };
  }

  // ---------- filter and modes ----------
  let shown = all.slice();         // the photographs in the column, in order
  let mode = 'slider';
  let pos = 0, target = 0;         // the column, in photographs from the first
  let gridK = 0, gridFrom = 0;     // 0 slider, 1 grid; eased between
  let live = false;                // the opening has finished

  function columnPlace(t) {
    const k = shown.indexOf(t);
    if (k < 0) return null;
    return { x: W / 2, y: H / 2 + (k - pos) * pitch, s: side };
  }
  function gridPlace(t) {
    const k = shown.indexOf(t);
    if (k < 0) return null;
    const n = shown.length;
    const areaW = W - (phone ? 36 : 520), areaH = H - (phone ? 200 : 180);
    let cols = Math.max(2, Math.round(Math.sqrt(n * areaW / areaH)));
    let rows = Math.ceil(n / cols);
    const s = Math.min(areaW / (cols + (cols - 1) * 0.12), areaH / (rows + (rows - 1) * 0.12));
    const g = s * 1.12;
    const c = k % cols, r = Math.floor(k / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    return { x: W / 2 + (c - (inRow - 1) / 2) * g, y: H / 2 + (r - (rows - 1) / 2) * g, s };
  }

  // ---------- the opening ----------
  const T = reduce
    ? { name: 0, nameOut: 0, flyA: 0, flyB: 1, hold: 1, splitA: 1, splitB: 2, ui: 2 }
    : { name: 450, nameOut: 2350, flyA: 2150, flyB: 3750, hold: 4350, splitA: 4350, splitB: 5650, ui: 5300 };
  let t0 = 0;

  function opening(now) {
    const t = now - t0;
    const n = all.length;
    all.forEach((tile, k) => {
      const d = diamondCell(tile.cell);
      // 2. in along the diagonal from the upper right, the far cells first
      const diag = (tile.cell % 6) + Math.floor(tile.cell / 6);         // 0 .. 10 across the diamond
      const start = T.flyA + (10 - diag) * 70 + tile.delay * 220;
      const fly = reduce ? 1 : OUT4(clamp((t - start) / 900));
      const far = Math.hypot(W, H) * 0.75;
      let x = d.x + far * (1 - fly) * 0.707 * (0.85 + tile.delay * 0.3);
      let y = d.y - far * (1 - fly) * 0.707 * (0.85 + tile.delay * 0.3);
      let s = d.s, r = 45, o = t > start ? 1 : 0;
      // 3. apart along the diagonal, then into the column
      const col = columnPlace(tile) || { x: W / 2, y: H / 2, s: side };
      const k2 = shown.indexOf(tile);
      const a = INOUT(clamp((t - T.splitA - (n - k2) * 6) / 650));
      if (a > 0) {
        const off = (k2 - pos) * pitch * 0.42;
        const lx = W / 2 - off * 0.707 + (tile.delay - 0.5) * 30, ly = H / 2 + off * 0.707;
        x = lerp(x, lx, a); y = lerp(y, ly, a);
        s = lerp(d.s, d.s * 0.92, a);
      }
      const b = INOUT(clamp((t - T.splitA - 520 - Math.abs(k2 - pos) * 14) / 900));
      if (b > 0) {
        const off = (k2 - pos) * pitch * 0.42;
        const lx = W / 2 - off * 0.707 + (tile.delay - 0.5) * 30, ly = H / 2 + off * 0.707;
        x = lerp(lx, col.x, b); y = lerp(ly, col.y, b); s = lerp(d.s * 0.92, col.s, b);
      }
      r = 45 * (1 - INOUT(clamp((t - T.splitA - 200) / 1000)));
      Object.assign(tile, { x, y, s, r, o });
    });
    if (t > T.name && !root.classList.contains('is-name')) root.classList.add('is-name');
    if (t > T.nameOut && !root.classList.contains('is-name-out')) root.classList.add('is-name-out');
    if (t > T.ui && !root.classList.contains('is-ui')) { root.classList.add('is-ui'); readout(); }
    if (t > T.splitB + 300) live = true;
  }

  // ---------- after the opening: the column, or the grid ----------
  let gridT0 = 0;
  function settle(now) {
    pos += (target - pos) * 0.12;
    if (Math.abs(target - pos) < 0.0005) pos = target;
    const want = mode === 'grid' ? 1 : 0;
    if (want !== gridK) {
      const k = clamp((now - gridT0) / 1000);
      gridK = want ? INOUT(k) : 1 - INOUT(k);
      if (k >= 1) gridK = want;
    }
    all.forEach((tile) => {
      const c = columnPlace(tile), g = gridPlace(tile);
      if (!c) { tile.o += (0 - tile.o) * 0.15; return; }
      tile.o += (1 - tile.o) * 0.15;
      tile.x = lerp(c.x, g.x, gridK); tile.y = lerp(c.y, g.y, gridK); tile.s = lerp(c.s, g.s, gridK); tile.r = 0;
    });
  }

  function draw() {
    for (const t of all) {
      const half = t.s / 2;
      t.el.style.width = t.el.style.height = '100px';
      t.el.style.transform = `translate3d(${(t.x - 50).toFixed(2)}px, ${(t.y - 50).toFixed(2)}px, 0) rotate(${t.r.toFixed(2)}deg) scale(${(t.s / 100).toFixed(4)})`;
      t.el.style.opacity = t.o.toFixed(3);
      t.el.style.visibility = t.o < 0.01 || t.y + half < -side || t.y - half > H + side ? 'hidden' : '';
    }
  }

  // ---------- the words ----------
  const count = document.getElementById('count');
  const total = document.getElementById('total');
  const where = document.getElementById('where');
  let last = -1;
  function readout() {
    const k = Math.round(pos);
    if (k === last && total.textContent === String(shown.length).padStart(2, '0')) return;
    last = k;
    const t = shown[clamp(k, 0, shown.length - 1)];
    count.textContent = String(k + 1).padStart(2, '0');
    total.textContent = String(shown.length).padStart(2, '0');
    if (t) where.textContent = zh() ? t.p.where.zh : t.p.where.en;
  }

  // continents that have photographs here
  const cats = document.getElementById('cats');
  const used = new Set(all.map((t) => t.p.continent));
  const list = [{ id: '', en: 'All continents', zh: '全部' }].concat(C.continents.filter((c) => used.has(c.id)));
  let cat = '';
  function drawCats() {
    cats.textContent = '';
    list.forEach((c) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = zh() ? c.zh : c.en;
      b.setAttribute('aria-pressed', String(cat === c.id));
      b.addEventListener('click', () => {
        cat = c.id;
        shown = all.filter((t) => !cat || t.p.continent === cat);
        pos = target = 0; last = -1;
        drawCats(); readout();
      });
      li.appendChild(b); cats.appendChild(li);
    });
  }
  drawCats();

  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    b.addEventListener('click', () => setMode(b.dataset.mode));
  });
  function setMode(m) {
    if (m === mode) return;
    mode = m; gridT0 = performance.now();
    root.classList.toggle('is-grid', m === 'grid');
    document.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.mode === mode)));
  }
  function onTile(i) {
    if (!live) return;
    const k = shown.indexOf(all[i]);
    if (k < 0) return;
    if (mode === 'grid') { pos = target = k; setMode('slider'); readout(); return; }
    target = k;
  }

  // the two languages, as the site keeps them
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.setAttribute('aria-pressed', String((b.dataset.lang === 'zh') === zh()));
    b.addEventListener('click', () => {
      html.lang = b.dataset.lang === 'zh' ? 'zh-Hant' : 'en';
      try { localStorage.setItem('tlap-lang', b.dataset.lang); } catch (e) { /* private window */ }
      document.querySelectorAll('[data-lang]').forEach((x) => x.setAttribute('aria-pressed', String((x.dataset.lang === 'zh') === zh())));
      drawCats(); last = -1; readout();
    });
  });

  // ---------- input: wheel, drag, keys; the column settles on the nearest photograph ----------
  let idle = 0;
  const snap = () => { clearTimeout(idle); idle = setTimeout(() => { target = Math.round(target); }, 140); };
  const bound = () => { target = clamp(target, 0, shown.length - 1); };
  addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!live || mode === 'grid') return;
    target += (e.deltaY + e.deltaX) / pitch * 0.9; bound(); snap();
  }, { passive: false });
  let drag = null;
  root.addEventListener('pointerdown', (e) => { if (live && mode === 'slider') drag = { y: e.clientY, t: target, moved: false }; });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) > 4) drag.moved = true;
    target = drag.t - dy / pitch; bound();
  });
  addEventListener('pointerup', () => { if (drag) { target = Math.round(target); drag = null; } });
  addEventListener('keydown', (e) => {
    if (!live || e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') { target = Math.round(target) + 1; bound(); e.preventDefault(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') { target = Math.round(target) - 1; bound(); e.preventDefault(); }
  });
  addEventListener('resize', () => { measure(); last = -1; });

  // ---------- run ----------
  measure();
  all.forEach((t) => { t.o = 0; });
  function frame(now) {
    if (!t0) t0 = now;
    if (!live) opening(now); else settle(now);
    draw();
    if (root.classList.contains('is-ui')) readout();
    requestAnimationFrame(frame);
  }
  // start once the first photographs are in, as hers waits for its images
  const first = all.slice(0, 12).map((t) => t.el.firstChild);
  Promise.race([
    Promise.all(first.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })))),
    new Promise((r) => setTimeout(r, 2500))
  ]).then(() => requestAnimationFrame(frame));
})();
