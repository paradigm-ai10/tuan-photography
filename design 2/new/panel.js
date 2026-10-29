/* The right panel, three step-ups (trial, 2026-10-29), on the combined globe. Chosen by
   <body data-panel="…">; everything else on the page is journey.js as it stands.
     index   a contents page: the year large in the panel's margin, trips as ruled lines,
             only the trip being read opens its route
     prints  the trip being read opens a strip of its own photographs (they open the viewer)
     line    the trips hang on one line down the panel: read ones filled, the one being read
             in vermilion, the years as small tabs on the line
   panel.css holds the looks; this file only adds the prints and marks the trips already read. */
(() => {
  'use strict';
  const P = document.body.dataset.panel;
  if (!P) return;
  const K = window.Kit;
  const main = document.getElementById('main');

  // the strip of a trip's photographs, each a button the page's own viewer answers
  function strips() {
    if (P !== 'prints') return;
    for (const li of main.querySelectorAll('.jr-trip')) {
      if (li.querySelector('.pn-strip')) continue;
      const t = K.trips.find((x) => x.id === li.dataset.trip);
      if (!t || !t.photos.length) continue;
      const ids = t.photos.slice(0, 6);
      li.insertAdjacentHTML('beforeend', `<div class="pn-strip" data-set="${t.photos.join(',')}">${ids.map((id) => {
        const s = K.S.slides[id];
        return `<button type="button" class="jr-shot pn-strip__shot" data-shot="${id}" style="--ar: ${(s.w / s.h).toFixed(4)}">${K.img(id, '12vw', 'pn-strip__img')}</button>`;
      }).join('')}${t.photos.length > ids.length ? `<span class="pn-strip__more">+${t.photos.length - ids.length}</span>` : ''}</div>`);
    }
  }

  // the trips above the one being read (newer, already read) are marked, for the line
  let raf = 0;
  function past() {
    raf = 0;
    const all = [...main.querySelectorAll('.jr-trip')];
    const i = all.findIndex((el) => el.classList.contains('is-reading'));
    all.forEach((el, n) => el.classList.toggle('is-past', i >= 0 && n < i));
  }

  new MutationObserver(() => { strips(); if (!raf) raf = requestAnimationFrame(past); })
    .observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  strips();
})();
