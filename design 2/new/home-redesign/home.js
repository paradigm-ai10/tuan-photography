/* Home redesign, three directions (2026-11-05): the opening of each, the two languages, and the
   photographs rising into view. <html data-home> names the direction: a (a short film), b (prints
   gather), c (drawn, then real), d (traced line by line, then real); with data-counts on <html> it is E,
   the trip so far counting up under the drawing and a caption for each scene of the film; data-colour adds the
   colour coming up under the lines as they are drawn, and data-pencil lays it down in coloured pencil (pencil.js). The loading screen is the live one (logo 1C, motion 21); here it
   plays on every load so each version can be judged. A click or a key skips to the end; R plays it
   again; ?still shows the end at once (for the list page's pictures); "reduce motion" skips it. */
(() => {
  'use strict';
  const html = document.documentElement;
  const HOME = html.dataset.home;
  const still = /[?&]still\b/.test(location.search) || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // the two languages, following the site's own choice
  const words = document.querySelectorAll('[data-lang]');
  function setLang(l) {
    html.lang = l === 'zh' ? 'zh-Hant' : 'en';
    words.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    try { localStorage.setItem('tlap-lang', l); } catch (e) { /* private window */ }
  }
  let saved = 'en';
  try { saved = localStorage.getItem('tlap-lang') || 'en'; } catch (e) { /* private window */ }
  setLang(saved);
  words.forEach((b) => b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    if (typeof window.setLang === 'function') window.setLang(b.dataset.lang);   // L: the live sections' own words
  }));

  // photographs and sentences rise into place as they come into view
  html.classList.add('hr-js');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.hr-in, .hr-reveal').forEach((el) => io.observe(el));

  // O: the light table; a print chosen by hover, focus or tap becomes the big print
  document.querySelectorAll('.hr-lt').forEach((lt) => {
    const bigs = [...lt.querySelectorAll('.hr-lt__big')], prints = [...lt.querySelectorAll('.hr-lt__print')];
    const show = (k) => {
      bigs.forEach((b) => b.classList.toggle('is-on', b.dataset.k === k));
      prints.forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.k === k)));
    };
    prints.forEach((p) => {
      p.addEventListener('click', () => show(p.dataset.k));
      p.addEventListener('focus', () => show(p.dataset.k));
      if (matchMedia('(hover: hover) and (pointer: fine)').matches) p.addEventListener('mouseenter', () => show(p.dataset.k));
    });
  });

  // P: the place reaching the middle of the screen takes over the held half
  document.querySelectorAll('.hr-split').forEach((sp) => {
    const imgs = [...sp.querySelectorAll('.hr-split__img')];
    const mid = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) imgs.forEach((im) => im.classList.toggle('is-on', im.dataset.k === e.target.dataset.k));
    }), { rootMargin: '-45% 0px -45% 0px' });
    sp.querySelectorAll('.hr-split__one').forEach((el) => mid.observe(el));
  });
  // F: a pencil drawing turns into its photograph once it is well in view
  const real = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-real'); real.unobserve(e.target); }
  }), { threshold: 0.55 });
  document.querySelectorAll('.hr-sk').forEach((el) => real.observe(el));

  const screen = document.querySelector('.hr-load');
  const video = document.querySelector('.hr-open video');
  const cover = document.querySelector('.hr-open > img');
  const sketch = document.querySelector('.hr-load__sketch');
  let done = false;

  // E: the trip so far counts up while the lines are drawn (the numbers come from the site's own data)
  const tally = [...document.querySelectorAll('.hr-load__counts b')];
  function count(ms) {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      tally.forEach((b) => { b.textContent = String(Math.round(e * Number(b.dataset.to))); });
      if (k < 1 && !done) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // E: a caption for each scene of the film, shown while its scene plays
  const caps = [...document.querySelectorAll('.hr-cap__one')];
  if (video && caps.length) video.addEventListener('timeupdate', () => {
    const t = video.currentTime;
    caps.forEach((c) => c.classList.toggle('is-on', t >= Number(c.dataset.from) && t < Number(c.dataset.to)));
  });

  // smoothed: the film's pace from the last stroke, so its first shot ends T seconds from now on every load: it keeps
  // its slow pace, then eases back to its own, reaching it as the shot ends (data-cut on the captions, or the first caption's end)
  function hold(T) {
    if (!video) return;
    const box = document.querySelector('.hr-cap'), cut = box && box.dataset.cut ? Number(box.dataset.cut) : caps.length ? Number(caps[0].dataset.to) : 2.6, r0 = video.playbackRate;
    const left = cut - video.currentTime;
    const R = Math.min(T, Math.max(0.8, (left - r0 * T) / ((1 - r0) / 2)));
    setTimeout(() => speed(r0, 1, R * 1000), (T - R) * 1000);
  }

  // the film's pace eased from one speed to another
  let easing = false;
  function speed(from, to, ms) {
    easing = true;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      video.playbackRate = from + (to - from) * k * k * (3 - 2 * k);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // the end state at once: the loading screen gone, the film playing
  function finish() {
    if (done) return;
    done = true;
    if (window.HRPencil) window.HRPencil.stop();
    if (!html.classList.contains('hr-settle')) { html.style.setProperty('--settle', '1.2s'); html.classList.add('hr-settle'); }
    html.classList.add('hr-shown', 'hr-clearing');   // smoothed: the caption and the shades, if skipped before the paper cleared
    if (screen) screen.remove();
    html.classList.remove('hr-loading', 'hr-full', 'hr-out', 'hr-horizon', 'hr-draw', 'hr-trace', 'hr-shade', 'hr-counted');
    if (video) { if (!easing) video.playbackRate = 1; video.play().catch(() => {}); }   // a skip mid-brush plays it at its own pace
  }
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === 'r' || e.key === 'R') location.reload();
    else if (!done) finish();
  });
  if (still || !screen) { finish(); return; }
  screen.addEventListener('click', finish);

  // the line is the loading bar: at least FILL ms, and it waits at 85% for the logo's face and the opening's picture
  let face = false;
  document.fonts.load('300 1em "Cormorant Garamond"').then(() => { face = true; }, () => { face = true; });
  const seen = (img) => !img || (img.complete && img.naturalWidth > 0);
  const media = () => (HOME === 'a' ? !video || video.readyState >= 3
    : HOME === 'c' || HOME === 'd' ? seen(sketch) && (!video || video.readyState >= 2)
    : seen(cover));
  // how long the line takes to run under the name: D and E draw it in 1 s (his ask, 2026-11-05), the others 2.2 s
  const FILL = HOME === 'd' ? 1000 : 2200;
  function fill() {
    return new Promise((res) => {
      const t0 = performance.now();
      let p = 0, last = 0;
      const step = (now) => {
        if (done) return;
        const ready = now - t0 > 8000 || (face && media());
        p = Math.min(ready ? 1 : 0.85, p + (now - (last || now)) / FILL);
        last = now;
        screen.style.setProperty('--p', (1 - Math.pow(1 - p, 2)).toFixed(4));   // a number for the stylesheet
        if (p < 1) requestAnimationFrame(step);
        else { html.classList.add('hr-full'); res(); }
      };
      requestAnimationFrame(step);
    });
  }

  // A: as the live page; the film plays behind the thinning paper, then comes into focus
  async function openA() {
    await fill();
    if (video) video.play().catch(() => {});
    await wait(2800); if (done) return;
    html.classList.add('hr-out');
    await wait(2400);
    finish();
  }

  // C: the name goes, the line runs to both edges, the drawing spreads from it, then the film begins
  async function openC() {
    await fill();
    await wait(1300); if (done) return;
    const line = screen.querySelector('.hr-load__line');
    screen.style.setProperty('--wide', (innerWidth / Math.max(1, line.offsetWidth) * 1.02).toFixed(3));
    html.classList.add('hr-horizon');
    await wait(1100); if (done) return;
    html.classList.add('hr-draw');
    await wait(3100); if (done) return;
    if (video) { video.currentTime = 0; video.play().catch(() => {}); }
    html.classList.add('hr-out');
    await wait(1900);
    finish();
  }

  // D: the name goes, the line runs to both edges, then the drawing is traced from the towers outward,
  // shaded in pencil under the lines, and the film begins
  async function openD() {
    await fill();
    await wait(1800); if (done) return;   // the whole logo holds a moment before the name goes (his ask, 2026-11-05)
    const line = screen.querySelector('.hr-load__line');
    screen.style.setProperty('--wide', (innerWidth / Math.max(1, line.offsetWidth) * 1.02).toFixed(3));
    html.classList.add('hr-horizon');
    await wait(1100); if (done) return;
    html.classList.add('hr-trace');
    // the coloured pencil or the brush (pencil.js) answers with its timings, in seconds from now
    const plan = window.HRPencil ? window.HRPencil.start() : null;
    if (plan && plan.film === 'now' && video) {   // the brush uncovers the film already playing, slowed while it works
      video.currentTime = 0;
      if (plan.rate) video.playbackRate = plan.rate;
      video.play().catch(() => {});
    }
    if (plan && plan.out) {   // smoothed: the film settles from a little close, all through the brushing and after
      html.style.setProperty('--settle', (plan.out + 2.8).toFixed(2) + 's');   // a number for the stylesheet: still drifting as the first shot ends
      html.classList.add('hr-settle');
    }
    if (tally.length) count(plan ? plan.count * 1000 : 2100);
    if (plan) {   // the counts step aside so the foot of the picture under them can be coloured
      await wait(plan.counted * 1000); if (done) return;
      html.classList.add('hr-counted');
      if (plan.out) {   // smoothed: as the last sweep begins the paper starts to thin, the shades come in under it, the menu and caption
        // once most of it is gone, and the first shot holds about two seconds after
        await wait((plan.clear - plan.counted) * 1000); if (done) return;
        html.classList.add('hr-clearing');
        hold(plan.out - plan.clear + 2.4);
        await wait((plan.out - plan.clear - 0.25) * 1000); if (done) return;
        html.classList.add('hr-out', 'hr-shown');
        await wait(1400);
        finish();
        return;
      }
      await wait((plan.end - plan.counted) * 1000); if (done) return;
      if (plan.rate && video) speed(plan.rate, 1, 900);   // then eases back to its own pace, the first shot still on
    }
    if ('colour' in html.dataset || plan) {   // the colour is in as the last lines land, and the film starts moving under them
      if (!plan) { await wait(2550); if (done) return; }
      if (video) video.play().catch(() => {});
      html.classList.add('hr-out');   // the lines and the counts lift off the moving film
      await wait(1200);
      finish();
      return;
    }
    await wait(1900); if (done) return;   // the shading starts as the last lines land (the lines run at --pace 0.5)
    html.classList.add('hr-shade');
    if (video) { video.currentTime = 0; video.play().catch(() => {}); }   // the film is already moving under the paper
    await wait(700); if (done) return;    // then lines, shading and film dissolve as one move, no hold between
    html.classList.add('hr-out');
    await wait(2300);
    finish();
  }


  // B: the prints come in along the diagonal, settle in a row under the name, and one grows into the opening
  const layer = screen.querySelector('.hr-prints');
  const prints = layer ? [...layer.querySelectorAll('.hr-print')] : [];
  async function openB() {
    await fill();
    await wait(900); if (done) return;
    const W = innerWidth, H = innerHeight;
    const sub = screen.querySelector('.hr-load__sub').getBoundingClientRect();
    const h = Math.round(Math.min(H * 0.12, 120, W * 0.16));
    const gap = Math.round(h * 0.14);
    const sizes = prints.map((el) => Math.round(h * Number(el.dataset.ar)));
    const lead = prints.findIndex((el) => 'lead' in el.dataset);
    // the row is centred on the opening photograph, so it can grow from where it is
    let x = W / 2 - sizes[lead] / 2;
    for (let i = lead - 1; i >= 0; i--) x -= sizes[i] + gap;
    const y = Math.min(sub.bottom + h * 0.8, H - h - 24);
    const n = prints.length;
    const flights = prints.map((el, i) => {
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.width = sizes[i] + 'px'; el.style.height = h + 'px';
      const cx = x + sizes[i] / 2, cy = y + h / 2;
      x += sizes[i] + gap;
      const t = i / (n - 1);
      const mx = W * (0.08 + 0.84 * t), my = H * (0.88 - 0.76 * t);   // along the diagonal, bottom left to top right
      const tilt = ((i * 37) % 13) - 6;
      return el.animate([
        { opacity: 0, transform: `translate(${mx - cx - W * 0.7}px, ${my - cy + H * 0.7}px) rotate(${tilt * 2}deg) scale(0.7)` },
        { opacity: 1, transform: `translate(${mx - cx}px, ${my - cy}px) rotate(${tilt}deg) scale(0.85)`, offset: 0.5 },
        { opacity: 1, transform: 'none' }
      ], { duration: 2000, delay: i * 55, easing: 'cubic-bezier(0.3, 0, 0.2, 1)', fill: 'both' });
    });
    await Promise.all(flights.map((f) => f.finished)); if (done) return;
    await wait(500); if (done) return;
    // the others fall away, the name goes, the opening photograph grows to the whole window
    prints.forEach((el, i) => {
      if (i === lead) return;
      el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${h * 0.4}px)` }],
        { duration: 700, delay: Math.abs(i - lead) * 25, easing: 'ease-in', fill: 'both' });
    });
    html.classList.add('hr-out');
    const one = prints[lead];
    const from = one.getBoundingClientRect();
    await one.animate([
      { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' },
      { left: '0px', top: '0px', width: W + 'px', height: H + 'px' }
    ], { duration: 1500, delay: 250, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'both' }).finished;
    finish();
  }

  ({ a: openA, b: openB, c: openC, d: openD })[HOME]();
})();
