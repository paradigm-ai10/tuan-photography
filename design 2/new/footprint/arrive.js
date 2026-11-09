/* The footprint map as the Journey tab's first screen (2026-11-09, his call, "好 用現在這個新的": round
   eight's One breath out, slower still, scored 5). journey.html carries the map's stage,
   <div class="fp-stage jr-fp" id="stage">, and <body data-arrive="footprint" data-tempo="1.85">; this
   file joins the map to the page:
   - the first move (a wheel, a touch, a key, any scroll) finishes the map's ramp, as below.js does on the
     version pages;
   - the page's own EN / 中文 words switch the map's words too;
   - once the page's top bar is drawn (journey.js draws it after the map may have been laid out), the map
     is laid out again, so the engraving keeps clear of its words;
   - on a wide window the map fades away over the first 0.3 of a screen of scroll, while the globe beneath
     is already folding (journey.js starts the fold at once when data-arrive is set). On a phone the map
     is the page's first block and scrolls away with it. */
(() => {
  'use strict';
  const stage = document.getElementById('stage');
  if (!stage) return;
  const root = document.documentElement;
  // the review bar shows on his Mac only; the map keeps its height clear there, as on the version pages
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) root.classList.add('has-rv');

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

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (b && window.FP) FP.setLang(b.dataset.lang);
  });

  const top = document.getElementById('top');
  if (top) new MutationObserver(() => dispatchEvent(new Event('fp-relayout'))).observe(top, { childList: true });

  const wide = matchMedia('(min-width: 64rem)');
  let frame = 0;
  function fade() {
    frame = 0;
    const out = wide.matches ? Math.min(1, Math.max(0, scrollY / (innerHeight * 0.3))) : 0;
    stage.style.setProperty('--fp-out', out.toFixed(4));
    stage.classList.toggle('is-gone', out > 0.98);
    if (out > 0.02 && window.FP) FP.tip(0, 0, null);
  }
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(fade); }, { passive: true });
  addEventListener('resize', fade);
  fade();
})();
