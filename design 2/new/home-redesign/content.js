/* Trial versions of the home page's content (tools/home_content.py). Two small jobs, both tied to the scroll:
   the index of places shows the photograph of the name being read, and the pairs' second photograph trails the
   first by a little. Nothing moves under "reduce motion". */
(() => {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ?still (the review list's small pictures, taken by headless Chrome, which cannot scroll): leave out what comes
  // before the part worth picturing, so the content is at the top instead of the film every version starts with
  if (/[?&]still\b/.test(location.search)) {
    const first = { 'v-stays': '.hc-hold', 'v-index': '.hc-index', 'v-pairs': '.hc-pair--rails' }[document.documentElement.dataset.hc];
    const el = first && document.querySelector(first);
    if (el) {
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      document.querySelectorAll('.hr-open, .cover, .top').forEach((x) => x.remove());
      while (el.previousElementSibling) el.previousElementSibling.remove();
    }
  }

  // B: the name nearest the reading line is the one shown; pointing at or tabbing to a name shows that one
  const names = [...document.querySelectorAll('.hc-names a')];
  if (names.length) {
    const prints = new Map([...document.querySelectorAll('.hc-print')].map((f) => [f.dataset.print, f]));
    let held = null, shown = null;
    const show = (a) => {
      if (!a || a === shown) return;
      shown = a;
      names.forEach((n) => n.classList.toggle('is-on', n === a));
      prints.forEach((f, id) => f.classList.toggle('is-on', id === a.dataset.print));
    };
    const read = () => {
      if (held) return;
      const narrow = matchMedia('(max-width: 56rem)').matches;
      const at = innerHeight * (narrow ? 0.62 : 0.46);
      let best = names[0], gap = Infinity;
      names.forEach((n) => { const r = n.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - at); if (d < gap) { gap = d; best = n; } });
      show(best);
    };
    names.forEach((n) => {
      n.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { held = n; show(n); } });
      n.addEventListener('pointerleave', () => { held = null; read(); });
      n.addEventListener('focus', () => { held = n; show(n); });
      n.addEventListener('blur', () => { held = null; read(); });
    });
    let waiting = false;
    addEventListener('scroll', () => { if (!waiting) { waiting = true; requestAnimationFrame(() => { waiting = false; read(); }); } }, { passive: true });
    addEventListener('resize', read);
    read();
  }

  // C: the second photograph of a pair trails the first as the pair passes
  const twos = [...document.querySelectorAll('.hc-pair .hc-two')];
  if (twos.length && !calm) {
    let waiting = false;
    const lag = () => {
      waiting = false;
      if (matchMedia('(max-width: 48rem)').matches) { twos.forEach((t) => t.style.removeProperty('--lag')); return; }
      const vh = innerHeight;
      twos.forEach((t) => {
        const r = t.parentElement.getBoundingClientRect();
        const passage = (r.top + r.height) / (vh + r.height);   // 1 entering at the foot, 0 leaving at the top
        t.style.setProperty('--lag', `${((passage - 0.5) * 0.14 * vh).toFixed(1)}px`);
      });
    };
    addEventListener('scroll', () => { if (!waiting) { waiting = true; requestAnimationFrame(lag); } }, { passive: true });
    addEventListener('resize', lag);
    lag();
  }
})();
