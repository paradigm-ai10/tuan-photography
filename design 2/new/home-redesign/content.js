/* Trial versions of the home page's content (tools/home_content.py). Two small jobs, both tied to the scroll:
   the index of places shows the photograph of the name being read, and the pairs' second photograph trails the
   first by a little. Nothing moves under "reduce motion". */
(() => {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ?still (the review list's small pictures, taken by headless Chrome, which cannot scroll): leave out what comes
  // before the part worth picturing, so the content is at the top instead of the film every version starts with
  if (/[?&]still\b/.test(location.search)) {
    const first = { 'v-stays': '.hc-hold', 'v-index': '.hc-index', 'v-pairs': '.hc-pair--rails', 'v-index-stage': '.hx-run', 'v-index-window': '.hx-run', 'v-index-line': '.hx-run', 'v-index-fine': '.hc-index', 'v-across-list': '.hy-run', 'v-across-strip': '.hy-run', 'v-across-lines': '.hy-run' }[document.documentElement.dataset.hc];
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
      const last = shown && prints.get(shown.dataset.print);
      shown = a;
      names.forEach((n) => n.classList.toggle('is-on', n === a));
      prints.forEach((f, id) => { f.classList.toggle('is-on', id === a.dataset.print); f.classList.toggle('was', f === last && id !== a.dataset.print); });
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

  // The index as a held stage: the scroll through .hx-run picks the place; classes do the rest (is-on, and was
  // for the one just left, which stays under the one arriving)
  document.querySelectorAll('.hx-run').forEach((run) => {
    const sets = ['.hx-photo', '.hx-name', '.hx-index button'].map((q) => [...run.querySelectorAll(q)]);
    const n = sets[0].length, row = run.querySelector('.hx-names'), inLine = run.closest('[data-hx="line"]');
    let at = 0;
    const centre = () => { if (inLine) { const a = sets[1][at]; row.style.translate = `${-(a.offsetLeft + a.offsetWidth / 2 - innerWidth / 2).toFixed(1)}px 0`; } };
    const show = (i) => {
      if (i === at) return;
      sets.forEach((set) => set.forEach((el, k) => { el.classList.toggle('was', k === at); el.classList.toggle('is-on', k === i); }));
      at = i; centre();
    };
    const read = () => {
      const r = run.getBoundingClientRect(), span = r.height - innerHeight;
      show(Math.max(0, Math.min(n - 1, Math.floor((-r.top / span) * n))));
    };
    sets[2].forEach((b, k) => b.addEventListener('click', () => {
      const r = run.getBoundingClientRect();
      scrollTo({ top: r.top + scrollY + ((k + 0.5) / n) * (r.height - innerHeight), behavior: calm ? 'auto' : 'smooth' });
    }));
    let waiting = false;
    addEventListener('scroll', () => { if (!waiting) { waiting = true; requestAnimationFrame(() => { waiting = false; read(); }); } }, { passive: true });
    addEventListener('resize', () => { centre(); read(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(centre);
    centre(); read();
  });

  // The index travelling sideways: the scroll through .hy-run is a place between the first photograph and the last;
  // the strip (and, in "lines", the line of names) is moved so that place sits at its mark, eased toward the scroll
  // so a wheel step glides instead of jumping. Only transforms are written, once a frame, and only while it moves.
  document.querySelectorAll('.hy-run').forEach((run) => {
    const kind = run.closest('[data-hy]').dataset.hy;
    const track = run.querySelector('.hy-track'), view = run.querySelector('.hy-view');
    const figs = [...run.querySelectorAll('.hy-photo')], names = [...run.querySelectorAll('.hy-name')];
    const jumps = [...run.querySelectorAll('.hy-index button')], line = kind === 'lines' ? run.querySelector('.hy-names') : null;
    const n = figs.length;
    let f = 0, to = 0, on = 0, moving = false, last = 0;
    const mid = (el) => el.offsetLeft + el.offsetWidth / 2;
    const between = (a, b, t) => a + (b - a) * t;
    const place = () => {
      const i = Math.min(n - 2, Math.floor(f)), t = f - i;
      const x = kind === 'list' ? -between(figs[i].offsetLeft, figs[i + 1].offsetLeft, t)
        : view.clientWidth / 2 - between(mid(figs[i]), mid(figs[i + 1]), t);
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      if (line) {
        const a = names[i].parentElement, b = names[i + 1].parentElement;
        line.style.transform = `translate3d(${(innerWidth / 2 - between(mid(a), mid(b), t)).toFixed(1)}px, 0, 0)`;
      }
      const k = Math.round(f);
      if (k !== on) { [figs, names, jumps].forEach((set) => set.forEach((el, j) => el.classList.toggle('is-on', j === k))); on = k; }
    };
    const step = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000 || 0.016); last = now;   // by time, so it is the same on a 120 Hz screen
      f += (to - f) * (calm ? 1 : 1 - Math.exp(-dt * 7));
      if (Math.abs(to - f) < 0.0015) f = to;
      place();
      if (f !== to) requestAnimationFrame(step); else { moving = false; last = 0; }
    };
    const read = () => {
      const r = run.getBoundingClientRect(), span = r.height - innerHeight;
      // each place rests briefly at either end of its share of the scroll and travels through the middle 70%, so the
      // scroll is felt as sideways travel and a photograph is still whole where the hand tends to stop
      const raw = Math.max(0, Math.min(1, -r.top / span)) * (n - 1), i = Math.floor(raw), t = Math.max(0, Math.min(1, (raw - i - 0.15) / 0.7));
      to = Math.min(n - 1, i + t * t * (3 - 2 * t));
      if (!moving && to !== f) { moving = true; requestAnimationFrame(step); }
    };
    jumps.forEach((b, k) => b.addEventListener('click', () => {
      const r = run.getBoundingClientRect();
      scrollTo({ top: r.top + scrollY + (k / (n - 1)) * (r.height - innerHeight), behavior: calm ? 'auto' : 'smooth' });
    }));
    addEventListener('scroll', read, { passive: true });
    addEventListener('resize', () => { place(); read(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    addEventListener('load', place);
    place(); read();
  });

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
