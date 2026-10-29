/* The right panel, one line (trial, 2026-10-29, his pick of three; the contents page and the prints
   are at tag journey-panels-three-2026-10-29). <body data-panel="line">: the trips hang on one line
   down the panel, read ones filled, the one being read in vermilion, the years as small tabs.
   panel.css holds the look; this file only marks the trips already read. */
(() => {
  'use strict';
  const P = document.body.dataset.panel;
  if (!P) return;
  const main = document.getElementById('main');

  // the trips above the one being read (newer, already read) are marked, for the line
  let raf = 0;
  function past() {
    raf = 0;
    const all = [...main.querySelectorAll('.jr-trip')];
    const i = all.findIndex((el) => el.classList.contains('is-reading'));
    all.forEach((el, n) => el.classList.toggle('is-past', i >= 0 && n < i));
  }

  new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(past); })
    .observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  past();
})();
