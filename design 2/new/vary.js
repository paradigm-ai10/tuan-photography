/* Impeccable variations of the Journey tab (2026-10-29): see vary.css. This file adds the one word
   the polish needs, "Read the trip", under a trip that opens a page, and marks the years with a
   single trip so their "1 trip" can go. */
(() => {
  'use strict';
  const V = document.body.dataset.vary || '';
  if (!/\bpolish\b/.test(V)) return;
  const main = document.getElementById('main');
  const WORD = { en: 'Read the trip', zh: '看這一趟' };
  const lang = () => (window.Kit && window.Kit.lang) || 'en';

  function mark() {
    for (const a of main.querySelectorAll('a.jr-trip__link')) {
      const w = WORD[lang()];
      const go = a.querySelector('.vy-go');
      if (!go) a.insertAdjacentHTML('beforeend', `<span class="vy-go">${w}</span>`);
      else if (go.textContent !== w) go.textContent = w;
    }
    for (const sec of main.querySelectorAll('.jr-year')) {
      const c = sec.querySelector('.jr-year__count');
      if (c) c.classList.toggle('is-one', sec.querySelectorAll('.jr-trip').length === 1);
    }
  }
  new MutationObserver(mark).observe(main, { childList: true });
  mark();
})();
