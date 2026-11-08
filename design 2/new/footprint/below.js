/* What comes under the footprint map (2026-11-09): his trips as a plain list, newest first, so the
   arrival map sits on a page that scrolls, the way it will on the Journey tab. He wants visitors to
   start scrolling sooner ("it's a landing page"), so a version can ask to be told the moment someone
   moves on (a wheel, a touch, a key, any scroll) and finish its ramp at once:
     FPBelow.onFirstMove(() => { ...jump to the end... })
   A page uses it by loading below.css and this file after footprint/base.js. */
(() => {
  'use strict';
  const FP = window.FP;
  const stage = document.getElementById('stage');
  document.documentElement.classList.add('fp-scroll');
  document.body.classList.add('fp-scroll');

  const WORDS = { en: { trips: 'The trips', list: ', ' }, zh: { trips: '旅行', list: '、' } };
  const sec = document.createElement('section');
  sec.className = 'fp-below';
  function draw() {
    const l = FP.lang, w = WORDS[l];
    const rows = FP.journeys.slice().reverse().map((j) => {
      const where = j.countries.map((id) => FP.byId.get(id)).filter(Boolean).map((c) => c.country[l]).join(w.list);
      return `<li><span class="fp-below__date">${FP.esc(j.date[l])}</span><span class="fp-below__where">${FP.esc(where)}</span></li>`;
    }).join('');
    sec.innerHTML = `<h2 class="fp-below__h">${w.trips}</h2><ol class="fp-below__list">${rows}</ol>`;
  }
  stage.after(sec);
  draw();
  FP.onLang(draw);

  // the first sign of moving on: a wheel, a touch drag, a scrolling key, or the page already scrolled
  const waiting = [];
  let moved = false;
  const go = () => {
    if (moved) return;
    moved = true;
    waiting.splice(0).forEach((fn) => fn());
  };
  addEventListener('wheel', go, { passive: true });
  addEventListener('touchmove', go, { passive: true });
  addEventListener('scroll', () => { if (scrollY > 2) go(); }, { passive: true });
  addEventListener('keydown', (e) => { if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) go(); });

  window.FPBelow = { onFirstMove(fn) { if (moved) fn(); else waiting.push(fn); } };
})();
