/* The Spain Collection trial, second pass (w-true), closer to the original: see spain-true.css for what changed.
   The sentence is carried by the same spring as the photographs, the film's title arrives letter by letter over the
   last part of the scroll (hers: from 0.64 to 1, each letter 0.18 long, back.inOut(2)), and the name goes before the
   first screen opens. The rest is spain.js:

   A trial way into the home page (2026-11-12), after spaincollection.com's landing. Styles and the story: spain.css.

   The name TUAN photography arrives as on the live page and goes; the first screen opens (five photographs round one
   sentence, the film small at the foot). Then the scroll conducts it: over one screen of scrolling the film grows
   from four tenths to the whole window and rises 15vw, the picture inside it eases back from 1.4, and the
   photographs leave: the two on the left up and to the left, the two on the right up and to the right, the one at
   the top straight up (her timeline, read from her script; hers is tied to the scroll through a smoothed scroller,
   here a spring with no bounce follows the scroll).

   A trial page plays the name on every load; ?still skips it; never under "reduce motion". A click, a key or the
   first turn of the wheel or swipe ends the name at once. */
(() => {
  'use strict';
  const html = document.documentElement;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const screen = document.querySelector('.hr-load');
  const stage = document.querySelector('.sp');
  const film = stage.querySelector('.sp__film');
  const video = film.querySelector('video');
  const photos = [...stage.querySelectorAll('.sp__p')];
  const bar = document.querySelector('.top');
  const words = document.querySelector('.sp-words');
  const title = film.querySelector('.sp-title');
  // each language's letters, in order: the page shows one language, and each arrives over the same stretch
  const sets = [...title.querySelectorAll('[data-set]')].reduce((m, el) => { (m[el.dataset.set] = m[el.dataset.set] || []).push(...el.querySelectorAll('.sp-ch')); return m; }, {});
  const back = (t) => { const c = 2 * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2; };
  const day = html.dataset.sp === 'day';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const playing = html.classList.contains('hr-loading');
  let done = false;

  // a caption for each scene of the film, shown while its scene plays
  const caps = [...film.querySelectorAll('.hr-cap__one')];
  video.addEventListener('timeupdate', () => {
    const t = video.currentTime;
    caps.forEach((c) => c.classList.toggle('is-on', t >= Number(c.dataset.from) && t < Number(c.dataset.to)));
  });
  video.play().catch(() => {});

  /* ---------------- the scroll conducts the first screen ---------------- */
  const SIDE = [-1, 0, 1, -1, 1];   // which way each photograph leaves: left, straight up, right
  let W = innerWidth, H = stage.offsetHeight, p = 0, to = 0, last = 0, running = false, full = null, covered = false;
  const narrow = () => W < 700;
  function draw() {
    const rise = narrow() ? 0.08 * H : 0.15 * W;   // how far below the foot the film hangs at first
    film.style.transform = `translate3d(0, ${(-p * rise).toFixed(2)}px, 0) scale(${(0.4 + 0.6 * p).toFixed(5)})`;
    video.style.transform = `scale(${(1.4 - 0.4 * p).toFixed(5)})`;
    words.style.transform = `translate3d(0, ${(-p * H).toFixed(2)}px, 0)`;
    const o = 0.18;
    Object.values(sets).forEach((chars) => {
      const r = o / chars.length, start = 1 - o - r * chars.length;
      chars.forEach((ch, k) => {
        const t = Math.max(0, Math.min(1, (p - start - k * r) / o)), e = back(t);
        ch.style.opacity = Math.max(0, Math.min(1, e)).toFixed(3);
        ch.style.transform = `translateY(${(-20 * (1 - e)).toFixed(2)}%) scaleX(${(0.7 + 0.3 * e).toFixed(4)})`;
      });
    });
    title.style.setProperty('--rule', Math.max(0, Math.min(1, (p - 0.64) / o)).toFixed(3));
    photos.forEach((el, k) => { el.style.transform = `translate3d(${(SIDE[k] * p * 0.5 * W).toFixed(2)}px, ${(-p * H).toFixed(2)}px, 0)`; });
    const now = p > 0.985;
    if (now !== full) {
      full = now;
      html.classList.toggle('hr-shown', full);
      if (bar && day) bar.classList.toggle('top--ink', !full);
    }
  }
  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    p += (to - p) * (1 - Math.exp(-dt * 11));   // a spring with no bounce, eleven a second, as the Journey fold follows its scroll
    if (Math.abs(to - p) < 0.0005) p = to;
    draw();
    if (p !== to) requestAnimationFrame(step); else running = false;
  }
  function follow() {
    to = Math.max(0, Math.min(1, scrollY / H));
    if (!running && to !== p) { running = true; last = performance.now(); requestAnimationFrame(step); }
    const under = scrollY >= 2 * H;   // the opening photograph has covered the film: it rests
    if (under !== covered) { covered = under; if (covered) video.pause(); else video.play().catch(() => {}); }
  }
  if (!reduce) {
    addEventListener('scroll', follow, { passive: true });
    addEventListener('resize', () => { W = innerWidth; H = stage.offsetHeight; follow(); draw(); });
    to = p = Math.max(0, Math.min(1, scrollY / H));
    draw();
  } else {
    html.classList.add('hr-shown');
    if (bar && day) bar.classList.add('top--ink');
  }

  /* ---------------- the name, then the first screen ---------------- */
  function arrive(still) {
    if (done) return;
    done = true;
    if (still) html.classList.add('sp-still');
    const open = () => { if (screen) screen.remove(); html.classList.add('sp-in'); html.classList.remove('hr-loading', 'hr-full', 'sp-out'); };
    if (still || !screen) open();
    else { html.classList.add('sp-out'); setTimeout(open, 600); }   // the name goes first (hers: 0.6 s), then the first screen opens
  }
  if (!playing || !screen) { arrive(true); return; }
  const skip = () => arrive(false);
  screen.addEventListener('click', skip);
  document.addEventListener('keydown', (e) => { if (!done && !e.metaKey && !e.ctrlKey && !e.altKey) skip(); });
  ['wheel', 'touchmove'].forEach((type) => addEventListener(type, skip, { passive: true, once: true }));

  const FILL = 1400;
  const imgs = photos.map((f) => f.querySelector('img'));
  const ready = () => imgs.every((im) => im.complete && im.naturalWidth > 0) && video.readyState >= 2;
  let face = false;
  document.fonts.load('300 1em "Cormorant Garamond"').then(() => { face = true; }, () => { face = true; });
  (async () => {
    const t0 = performance.now();
    const ok = () => performance.now() - t0 > 8000 || (face && ready());
    const line = screen.querySelector('.hr-load__line').animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration: FILL, easing: 'cubic-bezier(0.5, 1, 0.89, 1)', fill: 'both' });
    await wait(FILL * 0.61);
    if (!ok()) { line.pause(); while (!ok() && !done) await wait(100); line.play(); }
    await line.finished.catch(() => {});
    if (done) return;
    html.classList.add('hr-full');
    await wait(3200);   // the name's own arrival, and a moment with it whole
    await Promise.all(imgs.map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
    arrive(false);
  })();
})();
