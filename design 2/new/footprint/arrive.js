/* The footprint map as the Journey tab's first screen (2026-11-09, his call, "好 用現在這個新的": round
   eight's One breath out, slower still, scored 5). journey.html carries the map's stage,
   <div class="fp-stage jr-fp" id="stage">, and <body data-arrive="footprint" data-tempo="1.85">; this
   file joins the map to the page:
   - the first move (a wheel, a touch, a key, any scroll) finishes the map's ramp, as below.js does on the
     version pages;
   - the page's own EN / 中文 words switch the map's words too;
   - once the page's top bar is drawn (journey.js draws it after the map may have been laid out), the map
     is laid out again, so the engraving keeps clear of its words;
   - on a wide window the map fades away over the first 0.3 of a screen of scroll (data-fade, on the join
     versions 0.12), while the globe beneath is already folding (journey.js starts the fold at once when
     data-arrive is set, or at data-fold-at). On a phone the map is the page's first block and scrolls
     away with it. */
(() => {
  'use strict';
  const stage = document.getElementById('stage');
  if (!stage) return;
  const root = document.documentElement;
  // the review bar shows on his Mac only; the map keeps its height clear there, as on the version pages
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) root.classList.add('has-rv');

  // (the listeners go once they have heard the first move, so later scrolling never waits on them)
  const waiting = [];
  let moved = false;
  const onScroll = () => { if (scrollY > 2) go(); };
  const onKey = (e) => { if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) go(); };
  const go = () => {
    if (moved) return;
    moved = true;
    removeEventListener('wheel', go); removeEventListener('touchmove', go);
    removeEventListener('scroll', onScroll); removeEventListener('keydown', onKey);
    waiting.splice(0).forEach((fn) => fn());
  };
  addEventListener('wheel', go, { passive: true });
  addEventListener('touchmove', go, { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('keydown', onKey);
  window.FPBelow = { onFirstMove(fn) { if (moved) fn(); else waiting.push(fn); } };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (b && window.FP) FP.setLang(b.dataset.lang);
  });

  const top = document.getElementById('top');
  if (top) new MutationObserver(() => dispatchEvent(new Event('fp-relayout'))).observe(top, { childList: true });

  // (data-spring, the live page) the fade follows the scroll through the same spring as the globe's sheet
  // beneath (globe3d.js, CFG.spring), so a mouse wheel's step lifts the names away over a moment, not at
  // once, and the two keep together
  const wide = matchMedia('(min-width: 64rem)');
  const FADE = parseFloat(document.body.dataset.fade) || 0.3;
  const SPRING = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : parseFloat(document.body.dataset.spring) || 0;
  let frame = 0, out = 0, vel = 0, last = 0, shown = -1;
  const want = () => (wide.matches ? Math.min(1, Math.max(0, scrollY / (innerHeight * FADE))) : 0);
  function show(v) {
    if (v === shown) return;
    shown = v;
    stage.style.setProperty('--fp-out', v.toFixed(4));
    stage.classList.toggle('is-gone', v > 0.98);
    if (v > 0.02 && window.FP) FP.tip(0, 0, null);
  }
  function fade(now) {
    frame = 0;
    const to = want();
    if (!SPRING || !now) { out = to; vel = 0; last = 0; show(out); return; }
    const dt = last && now - last < 100 ? (now - last) / 1000 : 1 / 60;
    last = now;
    const x0 = out - to, c1 = vel + SPRING * x0, e = Math.exp(-SPRING * dt);
    const x = (x0 + c1 * dt) * e;
    vel = (vel - SPRING * c1 * dt) * e;
    out = Math.min(1, Math.max(0, to + x));
    if (Math.abs(out - to) < 0.002 && Math.abs(vel) < 0.01) { out = to; vel = 0; }
    show(out);
    if (out !== to || vel) frame = requestAnimationFrame(fade); else last = 0;
  }
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(fade); }, { passive: true });
  addEventListener('resize', () => fade(0));
  fade(0);
})();
