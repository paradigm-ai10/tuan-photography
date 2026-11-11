/* After Camille Mormal (2026-11-10): her home page, move for move, with his photographs.
   1. a small percentage counts up in the middle while the photographs load;
   2. landscape cards pop in one by one across a wall, which drifts a little;
   3. the wall zooms into its middle card until that photograph fills the window;
   4. the words come up: Work / About, the title, a + at each side, 1 — 8, eight thumbnails;
   5. the wheel (or a drag) shrinks the photograph into a row of tall cards, which the wheel then moves;
      a card clicked opens to the whole window again, a thumbnail or a + changes the photograph.
   Each card is the whole window, clipped to its shape (clip-path) and moved with a transform. */
(() => {
  'use strict';
  const C = window.COPY;
  const P = C.projects;
  const root = document.getElementById('cm');
  const wall = document.getElementById('wall');
  const row = document.getElementById('row');
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const zh = () => html.lang === 'zh-Hant';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const INOUT = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const IO4 = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
  const seed = (n) => { let s = n; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };

  let W = innerWidth, H = innerHeight, phone = W < 700;
  const card = () => (phone ? { w: W * 0.38, h: W * 0.24, gx: 10, gy: 10 } : { w: W * 0.2326, h: W * 0.1458, gx: W * 0.0174, gy: W * 0.0174 });
  const slot = () => { const w = phone ? W * 0.62 : Math.min(W * 0.225, H * 0.36); return { w, h: Math.min(w * 1.39, H * (phone ? 0.58 : 0.5)), gap: phone ? 14 : W * 0.0167 }; };

  // ---------- the wall ----------
  const rnd = seed(7);
  const wc = card();
  const cols = Math.ceil(W / (wc.w + wc.gx) / 2) * 2 + 3;     // odd, so one card sits on the middle
  const rows = Math.ceil(H / (wc.h + wc.gy) / 2) * 2 + 3;
  const cards = [];
  let pick = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const mid = r === (rows - 1) / 2 && c === (cols - 1) / 2;
      const p = mid ? P[0] : C.wall[(pick++) % C.wall.length];
      const el = document.createElement('div');
      el.className = 'cm-card';
      const im = document.createElement('img');
      im.src = C.img + '640/' + p.file; im.alt = ''; im.decoding = 'async';
      el.appendChild(im);
      const x = W / 2 + (c - (cols - 1) / 2) * (wc.w + wc.gx) - wc.w / 2;
      const y = H / 2 + (r - (rows - 1) / 2) * (wc.h + wc.gy) - wc.h / 2;
      el.style.width = wc.w + 'px'; el.style.height = wc.h + 'px';
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      wall.appendChild(el);
      cards.push({ el, im, mid, order: mid ? 0.55 : rnd() });
    }
  }

  // ---------- the row ----------
  const slides = P.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'cm-slide';
    const im = document.createElement('img');
    im.src = C.img + p.file; im.alt = (zh() ? p.title.zh : p.title.en); im.decoding = 'async';
    el.appendChild(im);
    el.addEventListener('click', () => { if (!drag || !drag.moved) open(i); });
    row.appendChild(el);
    return { el, im, p };
  });
  let pos = 0, target = 0;          // which photograph, in the row
  let f = 1, fFrom = 1, fTo = 1, fT0 = 0;   // 1: the whole window, 0: the row of cards
  const F_MS = 1100;

  function layoutRow(now) {
    pos += (target - pos) * 0.1;
    if (Math.abs(target - pos) < 0.0005) pos = target;
    if (f !== fTo) { const k = clamp((now - fT0) / F_MS); f = fFrom + (fTo - fFrom) * IO4(k); if (k >= 1) f = fTo; }
    const s = slot();
    const ix = (W - s.w) / 2, iy = (H - s.h) / 2;
    slides.forEach((sl, k) => {
      const d = k - pos;
      // in the row: side by side; on the whole window: a window apart
      const x = d * (s.w + s.gap) * (1 - f) + d * W * f;
      const cx = ix * (1 - f), cy = iy * (1 - f);
      sl.el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      sl.el.style.clipPath = `inset(${cy.toFixed(2)}px ${cx.toFixed(2)}px ${cy.toFixed(2)}px ${cx.toFixed(2)}px)`;
      sl.im.style.transform = `translate3d(${(-d * W * 0.06 * (1 - f)).toFixed(2)}px, 0, 0)`;
      sl.el.style.visibility = Math.abs(x) > W + s.w ? 'hidden' : '';
    });
  }

  // ---------- words ----------
  const title = document.getElementById('title');
  const num = document.getElementById('num');
  document.getElementById('of').textContent = P.length;
  const thumbs = document.getElementById('thumbs');
  P.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', p.title.en + ' ' + p.title.zh);
    const im = document.createElement('img');
    im.src = C.img + '640/' + p.file; im.alt = '';
    b.appendChild(im);
    b.addEventListener('click', () => { target = i; });
    thumbs.appendChild(b);
  });
  let shownK = -1;
  function words() {
    const k = clamp(Math.round(target), 0, P.length - 1);
    if (k === shownK) return;
    shownK = k;
    title.textContent = zh() ? P[k].title.zh : P[k].title.en;
    num.textContent = k + 1;
    [...thumbs.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === k)));
  }
  document.getElementById('prev').addEventListener('click', () => { target = (Math.round(target) - 1 + P.length) % P.length; });
  document.getElementById('next').addEventListener('click', () => { target = (Math.round(target) + 1) % P.length; });

  function setF(to) {
    if (to === fTo) return;
    fFrom = f; fTo = to; fT0 = performance.now();
    root.classList.toggle('is-slider', to === 0);
  }
  function open(i) { if (!live) return; if (fTo === 0) { target = i; setF(1); } }

  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.setAttribute('aria-pressed', String((b.dataset.lang === 'zh') === zh()));
    b.addEventListener('click', () => {
      html.lang = b.dataset.lang === 'zh' ? 'zh-Hant' : 'en';
      try { localStorage.setItem('tlap-lang', b.dataset.lang); } catch (e) { /* private window */ }
      document.querySelectorAll('[data-lang]').forEach((x) => x.setAttribute('aria-pressed', String((x.dataset.lang === 'zh') === zh())));
      shownK = -1; words();
    });
  });

  // ---------- input ----------
  let live = false, idle = 0;
  const bound = () => { target = clamp(target, 0, P.length - 1); };
  const snap = () => { clearTimeout(idle); idle = setTimeout(() => { target = Math.round(target); }, 140); };
  addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!live) return;
    if (fTo === 1) { if (e.deltaY > 8) setF(0); return; }
    const s = slot();
    target += (e.deltaY + e.deltaX) / (s.w + s.gap) * 0.8; bound(); snap();
  }, { passive: false });
  let drag = null;
  root.addEventListener('pointerdown', (e) => { if (live) drag = { x: e.clientX, y: e.clientY, t: target, moved: false }; });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (fTo === 1) { if (dy < -40 || Math.abs(dx) > 40) setF(0); return; }
    const s = slot();
    target = drag.t - dx / (s.w + s.gap); bound();
  });
  addEventListener('pointerup', () => { if (drag) { target = Math.round(target); setTimeout(() => { drag = null; }, 0); } });
  addEventListener('keydown', (e) => {
    if (!live) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { if (fTo === 1 && e.key === 'ArrowDown') setF(0); else { target = Math.round(target) + 1; bound(); } e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { target = Math.round(target) - 1; bound(); e.preventDefault(); }
    if (e.key === 'Enter' && fTo === 0) open(Math.round(target));
    if (e.key === 'Escape' && fTo === 1) setF(0);
  });
  addEventListener('resize', () => { W = innerWidth; H = innerHeight; phone = W < 700; });

  // ---------- run: load, wall, zoom, the photograph ----------
  const load = document.getElementById('load');
  const want = cards.map((c) => c.im).concat(slides.map((s) => s.im));
  let done = 0;
  const tick = () => { done++; load.textContent = Math.round(done / want.length * 100) + '%'; };
  const loaded = Promise.all(want.map((im) => (im.complete ? (tick(), 0) : new Promise((r) => { im.addEventListener('load', () => { tick(); r(); }, { once: true }); im.addEventListener('error', () => { tick(); r(); }, { once: true }); }))));
  const T = reduce ? { pop: 1, hold: 0, zoom: 1 } : { pop: 1700, hold: 350, zoom: 1500 };

  function wallRun() {
    root.classList.add('is-wall');
    const t0 = performance.now();
    cards.forEach((c) => setTimeout(() => c.el.classList.add('is-in'), c.order * T.pop));
    const k = Math.max(W / wc.w, H / wc.h);
    function step(now) {
      const t = now - t0;
      const drift = clamp(t / (T.pop + T.hold));
      const z = IO4(clamp((t - T.pop - T.hold) / T.zoom));
      const s = 1 + (k - 1) * z;
      const dy = (1 - drift) * 18 * (1 - z);
      wall.style.transform = `translate3d(0, ${dy.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      if (z < 1) { requestAnimationFrame(step); return; }
      root.classList.add('is-row', 'is-ui');
      live = true;
      words();
      requestAnimationFrame(rowLoop);
    }
    requestAnimationFrame(step);
  }
  function rowLoop(now) { layoutRow(now); words(); requestAnimationFrame(rowLoop); }

  layoutRow(performance.now());
  Promise.race([loaded, new Promise((r) => setTimeout(r, 6000))]).then(() => {
    load.textContent = '100%';
    setTimeout(wallRun, reduce ? 0 : 350);
  });
})();
