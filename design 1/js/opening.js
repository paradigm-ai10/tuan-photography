/* The home page's opening (2026-11-12): the loading screen, the wall of photographs, and the film it lands on.
   The page itself is the site's own (js/main.js); this script only plays the way in.

   His pick from the home redesign rounds (number 9 of the last one, "the wall, in one move", on black; the trial
   versions stay in design 2/new/home-redesign). The name TUAN photography arrives on a black ground and goes. Then
   one five-second move of 25 cards in five columns, the outer two half off the screen:
     · columns 1, 3 and 5 come up from below, 2 and 4 come down from above, half a row out of step (a brick wall);
     · within a column the cards start twelve card-heights apart and close to a narrow gap, so they streak past
       singly at first and gather: cubic-bezier(.8, 0, .1, 1) over the first 3.25 s;
     · from 2 s to 5 s, while the columns are still closing, every card grows and moves out from the middle until
       the middle one is the window: cubic-bezier(.72, 0, .11, 1).
   The middle card is the film of Barcelona, playing small and slow; when it fills the window the page's own film
   starts beneath it at the same frame and the card goes, so the picture never holds still. The geometry and the
   timings are Camille Mormal's opening, read from her site's own script; the photographs, the film, the name and
   the ground are his.

   Each card's motion is two plain animations handed to the browser's compositor (a column slide on a wrapper, the
   zoom on the card), so script cannot make it stutter. The cards are laid out larger than shown, from the larger
   files, so they stay sharp as they grow.

   Once per visit (sessionStorage, as the loading screen before it); never under "reduce motion"; a click or a key
   or the first turn of the wheel or swipe skips to the end; ?opening in the address plays it again. The small script in the page decides before anything
   is drawn and marks <html class="hr-loading">. */
(() => {
  'use strict';
  const html = document.documentElement;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const screen = document.querySelector('.hr-load');
  const video = document.querySelector('.hr-open video');
  const playing = html.classList.contains('hr-loading');   // the page's small script chose: the opening plays
  let done = false;

  // a caption for each scene of the film, shown while its scene plays
  const caps = [...document.querySelectorAll('.hr-cap__one')];
  if (video && caps.length) video.addEventListener('timeupdate', () => {
    const t = video.currentTime;
    caps.forEach((c) => c.classList.toggle('is-on', t >= Number(c.dataset.from) && t < Number(c.dataset.to)));
  });

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
    html.classList.add('hr-shown');
    if (screen) screen.remove();
    html.classList.remove('hr-loading', 'hr-full', 'hr-out', 'hr-arrive', 'hr-markgone');
    if (video) { if (!easing) video.playbackRate = 1; video.play().catch(() => {}); }
    if (playing) { try { sessionStorage.setItem('tuan-opening', '1'); } catch (e) { /* private window: it plays again next time */ } }
  }
  // the film rests while the page covers it, and plays again when the visitor comes back up to it
  if (video) {
    const film = video.closest('.hr-open');
    let covered = false, tall = film.offsetHeight;   // measured once and on a resize, never while scrolling
    addEventListener('resize', () => { tall = film.offsetHeight; });
    addEventListener('scroll', () => {
      const now = scrollY >= tall;
      if (now === covered || !done) return;
      covered = now;
      if (covered) video.pause(); else video.play().catch(() => {});
    }, { passive: true });
  }
  if (!playing || !screen) { finish(); return; }
  screen.addEventListener('click', finish);
  document.addEventListener('keydown', (e) => { if (!done && !e.metaKey && !e.ctrlKey && !e.altKey) finish(); });
  // a visitor who starts to scroll wants the page: the first turn of the wheel or swipe skips too
  ['wheel', 'touchmove'].forEach((type) => addEventListener(type, finish, { passive: true, once: true }));

  /* ---------------- the wall ---------------- */
  const layer = screen.querySelector('.hr-flock');
  const photos = [...layer.querySelectorAll('.hr-tile:not(.hr-tile--film)')];
  const filmEl = layer.querySelector('.hr-tile--film');
  const tv = filmEl.querySelector('video');
  let W = screen.clientWidth, H = innerHeight;   // the loading screen's width: the page's, without the scrollbar's place
  const narrow = () => W < 700;
  const T = 5000;                                   // the whole move
  const SLIDE = 'cubic-bezier(0.8, 0, 0.1, 1)';     // the columns closing up
  const ZOOM = 'cubic-bezier(0.72, 0, 0.11, 1)';    // the view closing on the middle card
  // a phone takes the smaller copies: its cards are small and 24 large files are a long wait on a phone line
  photos.forEach((p) => { const im = p.querySelector('img'); im.src = narrow() ? im.dataset.src : im.dataset.src.replace('/640/', '/1280/'); });
  tv.src = tv.dataset.src; tv.load();
  const loaded = (im) => im.complete && im.naturalWidth > 0;
  const ready = () => photos.every((p) => loaded(p.querySelector('img'))) && tv.readyState >= 2 && (!video || video.readyState >= 2);

  async function wall() {
    W = screen.clientWidth; H = innerHeight;
    // her measures: a gap of 30 px on a 1440 px window, four cards and four gaps across, cards the window's shape
    const s0 = 30 * W / 1440, r = (W - 4 * s0) / 4, a = r * H / W;
    const h = a + s0, l = r + s0, o = 0.5 * h, n = H + 0.5 * (5 * a + 4 * s0 - H), p = 12 * a, d = W + 2, c = H + 2;
    const s1 = s0 * d / r, g = c + s1, u = d + s1;
    const S = narrow() ? 1.5 : 2;   // laid out this much larger than shown, so the cards are still sharp grown
    const cards = [...photos.slice(0, 12), filmEl, ...photos.slice(12, 24)];   // the film is the middle one of 25
    html.classList.add('hr-arrive');
    // decode every photograph now, while the name is still up: one decoded on the frame it first shows drops that frame
    const decoded = Promise.all(photos.map((ph) => { const im = ph.querySelector('img'); return im.decode ? im.decode().catch(() => {}) : null; }));
    await wait(300); if (done) return;   // the whole name, alone, a moment longer
    html.classList.add('hr-markgone');
    tv.playbackRate = 0.3; tv.play().catch(() => {});   // the film in its card, small, in slow motion
    await Promise.race([decoded, wait(600)]); if (done) return;

    const zooms = cards.map((el, k) => {
      const col = Math.floor(k / 5), row = k % 5, v = col - 2, w = row - 2, down = col % 2 === 1, R = Math.abs(v);
      const y0 = down ? -(n - o + (4 - row) * p + R * a + 20) : n + row * p + R * a + 20;   // where the card starts, off the screen
      const xs = 0.5 * (W - r) + v * l, ys = 0.5 * (H - a) + w * h - (down ? o : 0);         // its place in the small wall
      const xf = 0.5 * (W - d) + v * u, yf = 0.5 * (H - c) + w * g - (down ? 0.5 * g : 0);   // its place when the middle card is the window
      el.style.left = '0px'; el.style.top = '0px'; el.style.width = r * S + 'px'; el.style.height = a * S + 'px';
      el.style.transformOrigin = '0 0';
      const ride = document.createElement('div');   // the column's slide, on its own layer
      ride.className = 'hr-flock__ride';
      layer.appendChild(ride);
      ride.appendChild(el);
      const small = `translate3d(${xs.toFixed(2)}px, ${ys.toFixed(2)}px, 0) scale(${(1 / S).toFixed(5)})`;
      ride.animate([{ transform: `translate3d(0, ${y0.toFixed(1)}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }], { duration: T * 0.65, easing: SLIDE, fill: 'both' });
      const z = el.animate([
        { transform: small },
        { transform: small, offset: 0.4, easing: ZOOM },
        { transform: `translate3d(${xf.toFixed(2)}px, ${yf.toFixed(2)}px, 0) scale(${(d / r / S).toFixed(5)})` }
      ], { duration: T, fill: 'both' });
      el.style.opacity = '1';
      return z;
    });
    // the picture inside the middle card starts one and a half times too large and eases back, so the card opens on it
    tv.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1.5)', offset: 0.4, easing: ZOOM }, { transform: 'scale(1)' }], { duration: T, fill: 'both' });
    // the page's own film waits, paused, at the frame the card will have reached when it fills the window
    setTimeout(() => { if (video && !done) { try { video.currentTime = tv.currentTime + T * 0.6 / 1000 * (tv.playbackRate || 0.3); } catch (e) { /* not yet seekable */ } } }, T * 0.4);
    await Promise.all(zooms.map((z) => z.finished.catch(() => {}))); if (done) return;
    html.classList.add('hr-out');

    // the card's film keeps playing; the page's own starts beneath it, and only when it is showing a frame does the card go
    if (video) {
      const rate = tv.playbackRate || 0.3;
      if (Math.abs(video.currentTime - tv.currentTime) > 0.1) {
        await new Promise((res) => { const on = () => { video.removeEventListener('seeked', on); res(); }; video.addEventListener('seeked', on); video.currentTime = tv.currentTime + 0.05; setTimeout(res, 400); });
        if (done) return;
      }
      video.playbackRate = rate;
      await video.play().catch(() => {});
      await new Promise((res) => { if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(() => res()); setTimeout(res, 120); });
      if (done) return;
      speed(rate, 1, 1400);
    }
    html.classList.add('hr-shown');
  }

  // the line under the name is the loading bar: at least FILL ms, and it waits at 85% for the logo's face, the
  // photographs and the film (eight seconds at most, then it goes on with what has come)
  const FILL = 1400;
  let face = false;
  document.fonts.load('300 1em "Cormorant Garamond"').then(() => { face = true; }, () => { face = true; });
  // one animation the browser runs itself, so the line stays smooth while the photographs and the film arrive
  async function fill() {
    const t0 = performance.now();
    const ok = () => performance.now() - t0 > 8000 || (face && ready());
    const line = screen.querySelector('.hr-load__line').animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration: FILL, easing: 'cubic-bezier(0.5, 1, 0.89, 1)', fill: 'both' });
    await wait(FILL * 0.61);   // where this curve reaches 85% of the line
    if (!ok()) {
      line.pause();
      while (!ok() && !done) await wait(100);
      line.play();
    }
    await line.finished.catch(() => {});
    if (!done) html.classList.add('hr-full');
  }

  (async () => {
    await fill();
    await wait(2900); if (done) return;   // the name's own arrival, and a moment with it whole
    try { await wall(); }
    catch (e) { console.error(e); }
    finally { finish(); }   // whatever happens, the visitor gets the page
  })();
})();
