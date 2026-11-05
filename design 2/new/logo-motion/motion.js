/* Plays the loading screen: lm-in (arrive), a pause, lm-out (open onto the site).
   Click anywhere or press R to play it again. ?still shows the logo at rest, for the list page's pictures. */
(() => {
  'use strict';
  const html = document.documentElement;
  const M = html.dataset.motion;
  // when each version starts to open (ms after it starts), and how long the opening takes
  const TIME = {
    letters: [3900, 1700], line: [3300, 2000], develop: [3300, 2600],
    gather: [3500, 1700], part: [3100, 1700], loading: [0, 1700]
  };
  // the line-loads family (6, and round two from 2026-11-05): how long each holds once the line is full
  const LOAD = { loading: 600, 'l-first': 2000, 'l-write': 800, 'l-part': 500, 'l-slit': 1100, 'l-runout': 400, 'l-through': 500 };
  const photo = document.querySelector('.lm-photo');
  const rule = document.querySelector('.lm-rule');
  let timers = [];
  let frame = 0;

  function letters(el) {
    const word = el.textContent;
    el.textContent = '';
    el.setAttribute('aria-label', word);
    word.split('').forEach((c, i) => {
      const s = document.createElement('span');
      s.textContent = c;
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);   // the order the letters arrive, read by the stylesheet
      el.appendChild(s);
    });
  }
  letters(document.querySelector('.lm-tuan'));
  letters(document.querySelector('.lm-ph'));

  function open() { html.classList.add('lm-out'); }

  // the line is the loading bar; it runs at least 2.2 s so it reads, and waits for the photograph.
  // --p (0 to 1) is set on the page, so the words, the paper and the line can all follow it
  function load(t0) {
    const ready = photo.complete && photo.naturalWidth > 0;
    const t = (performance.now() - t0) / 2200;
    const p = Math.min(1, ready ? t : Math.min(t, 0.85));
    html.style.setProperty('--p', (1 - Math.pow(1 - p, 2)).toFixed(4));   // a number for the stylesheet
    if (p < 1) frame = requestAnimationFrame(() => load(t0));
    else { html.classList.add('lm-full'); timers.push(setTimeout(open, LOAD[M])); }
  }

  function play() {
    timers.forEach(clearTimeout);
    cancelAnimationFrame(frame);
    timers = [];
    html.classList.add('lm-reset');
    html.classList.remove('lm-in', 'lm-out', 'lm-full');
    html.style.setProperty('--p', 0);
    // how many times the line must stretch to reach both edges of the screen (10)
    html.style.setProperty('--wide', (innerWidth / Math.max(1, rule.offsetWidth)).toFixed(3));
    void html.offsetWidth;   // restart the animations
    html.classList.remove('lm-reset');
    html.classList.add('lm-in');
    if (M in LOAD) { const t0 = performance.now(); frame = requestAnimationFrame(() => load(t0)); }
    else timers.push(setTimeout(open, TIME[M][0]));
  }

  if (/[?&]still\b/.test(location.search)) { html.classList.add('lm-still'); return; }
  document.fonts.ready.then(play);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[class*="rvk"], [id*="rvk"], button, a, input, textarea')) return;
    play();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) play();
  });
})();
