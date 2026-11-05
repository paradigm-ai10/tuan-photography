/* The home page's loading screen: the logo arrives as the opening photograph loads, then opens
   onto it (version 21 of the logo motion round, his choice on 2026-11-05). The small script at
   the top of the page has already put "loading" on <html> when this is the visit's first page.
   The line is the loading bar: it runs at least 2.2 s so it reads, and waits at 85% for the
   photograph and the logo's face. A click or a key skips straight to the opening. */
(() => {
  'use strict';
  const html = document.documentElement;
  const screen = document.querySelector('.loader');
  if (!screen) return;
  if (!html.classList.contains('loading')) { screen.remove(); return; }

  const FILL = 2200, HOLD = 2800, CLEAR = 2400, WAIT = 8000;
  const photo = document.querySelector('.cover img');
  let face = false, failed = false, opened = false, p = 0, last = 0, timer = 0;
  document.fonts.load('300 1em "Cormorant Garamond"').then(() => { face = true; }, () => { face = true; });
  if (photo) photo.addEventListener('error', () => { failed = true; });
  const t0 = performance.now();
  const ready = (now) => now - t0 > WAIT ||
    (face && (!photo || failed || (photo.complete && photo.naturalWidth > 0)));

  function fill(now) {
    if (opened) return;
    p = Math.min(ready(now) ? 1 : 0.85, p + (now - (last || now)) / FILL);
    last = now;
    screen.style.setProperty('--p', (1 - Math.pow(1 - p, 2)).toFixed(4));   // a number for the stylesheet
    if (p < 1) requestAnimationFrame(fill);
    else { html.classList.add('loader-full'); timer = setTimeout(open, HOLD); }
  }

  function open() {
    if (opened) return;
    opened = true;
    clearTimeout(timer);
    html.classList.add('loader-out');
    try { sessionStorage.setItem('tuan-opening', '1'); } catch (e) { /* private window: it plays again next time */ }
    setTimeout(() => {
      screen.remove();
      html.classList.remove('loading', 'loader-full', 'loader-out');
    }, CLEAR);
  }

  screen.addEventListener('click', open);
  document.addEventListener('keydown', open, { once: true });
  requestAnimationFrame(fill);
})();
