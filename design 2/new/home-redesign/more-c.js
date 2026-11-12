/* Home content, batch C (tools/home_more_c.py): one engine for five held stages. The scroll through a .mc-run is
   a place between its first item and its last; each place rests briefly at both ends of its share of the scroll
   and moves through the middle, eased toward the scroll by time so a wheel step glides. Each version draws that
   place its own way: pages turning, a row travelling, cards rising. Only transforms and opacity are written.
   Under "reduce motion" the place steps from one item to the next without the movement between. */
(() => {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = () => matchMedia('(max-width: 48rem)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  function drive(run, draw) {
    const n = +run.dataset.n;
    let f = 0, to = 0, last = 0, moving = false;
    const target = () => {
      const r = run.getBoundingClientRect(), span = r.height - innerHeight;
      const raw = clamp(-r.top / span, 0, 1) * (n - 1), i = Math.floor(raw);
      const t = clamp((raw - i - 0.15) / 0.7, 0, 1), v = Math.min(n - 1, i + smooth(t));
      return calm ? Math.round(v) : v;
    };
    const step = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000 || 0.016); last = now;
      f += (to - f) * (calm ? 1 : 1 - Math.exp(-dt * 6));
      if (Math.abs(to - f) < 0.001) f = to;
      draw(f);
      if (f !== to) requestAnimationFrame(step); else { moving = false; last = 0; }
    };
    const kick = () => { to = target(); if (!moving && to !== f) { moving = true; requestAnimationFrame(step); } };
    const go = (k) => {
      const r = run.getBoundingClientRect();
      scrollTo({ top: r.top + scrollY + (clamp(k, 0, n - 1) / (n - 1)) * (r.height - innerHeight) + 1, behavior: calm ? 'auto' : 'smooth' });
    };
    run.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => go(Math.round(to) + +b.dataset.step)));
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { draw(f); kick(); });
    addEventListener('load', () => draw(f));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw(f));
    draw(f); kick();
    return { go };
  }

  // a row that travels sideways so the place being read sits at the middle of the window
  function row(run, items, extra) {
    const track = run.querySelector('.mc-track');
    const mid = (el) => el.offsetLeft + el.offsetWidth / 2;
    let on = -1;
    return drive(run, (f) => {
      const n = items.length, i = Math.min(n - 2, Math.floor(f)), t = f - i;
      const x = innerWidth / 2 - lerp(mid(items[i]), mid(items[i + 1]), t);
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      const k = Math.round(f);
      if (k !== on) { items.forEach((el, j) => el.classList.toggle('is-on', j === k)); on = k; }
      if (extra) extra(x);
    });
  }

  // wc1: the photobook. Leaf i turns as the place passes from i to i + 1, round the gutter (upward on a phone)
  document.querySelectorAll('.mc-book .mc-run').forEach((run) => {
    const leaves = [...run.querySelectorAll('.mc-lf')];
    drive(run, (f) => {
      const up = narrow();
      leaves.forEach((lf, i) => {
        const t = clamp(f - i, 0, 1), a = 180 * t;
        lf.style.transform = up ? `rotateX(${a.toFixed(2)}deg)` : `rotateY(${(-a).toFixed(2)}deg)`;
        lf.style.zIndex = t > 0 && t < 1 ? 100 : t >= 1 ? 50 + i : 40 - i;
        lf.style.setProperty('--sh', Math.sin(Math.PI * t).toFixed(3));
      });
    });
  });

  // wc2: postcards. A card comes in from the right showing its back and turns over to its photograph as it reaches
  // the middle; Turn over turns any card by hand
  document.querySelectorAll('.mc-post .mc-run').forEach((run) => {
    const pcs = [...run.querySelectorAll('.mc-pc')], cards = pcs.map((p) => p.querySelector('.mc-pc-card'));
    const mid = (el) => el.offsetLeft + el.offsetWidth / 2;
    row(run, pcs, (x) => {
      const w = innerWidth;
      pcs.forEach((p, j) => {
        const u = clamp((x + mid(p) - w * 0.5) / (w * 0.32), 0, 1);
        const a = calm ? (u > 0.5 ? 180 : 0) : 180 * smooth(u);
        cards[j].style.transform = `rotateY(${(-a).toFixed(2)}deg)`;
      });
    });
    pcs.forEach((p) => p.querySelector('.mc-pc-turn').addEventListener('click', () => p.classList.toggle('is-turned')));
  });

  // wc3: one horizon, and wc4: the exhibition room. The row alone
  document.querySelectorAll('.mc-hz .mc-run').forEach((run) => row(run, [...run.querySelectorAll('.mc-hz-photo')]));
  document.querySelectorAll('.mc-room .mc-run').forEach((run) => row(run, [...run.querySelectorAll('.mc-hang')]));

  // wc5: index cards. The cards behind the place lean back in the drawer, deeper the further on; the place's card
  // rises out of it; the card before falls forward and is gone
  document.querySelectorAll('.mc-cards .mc-run').forEach((run) => {
    const cards = [...run.querySelectorAll('.mc-card')], pack = run.querySelector('.mc-pack');
    let on = -1;
    const ctl = drive(run, (f) => {
      const rise = pack.offsetTop - innerHeight * 0.075, depth = narrow() ? 16 : 26;
      cards.forEach((c, i) => {
        const k = i - f;
        let y = -Math.min(k, 12) * 7, z = -k * depth, rx = 7, op = 1;   // each card further back stands a little higher, so its tab shows
        if (k < 1 && k >= 0) { const s = smooth(1 - k); y = lerp(-7, -rise, s); z = lerp(-depth, 14, s); rx = 7 * (1 - s); }
        else if (k < 0) { const s = smooth(clamp(-k * 1.6, 0, 1)); y = -rise * (1 - s); z = 14 + 40 * s; rx = -80 * s; op = 1 - clamp((s - 0.55) / 0.45, 0, 1); }
        c.style.transform = `translate3d(0, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg)`;
        c.style.opacity = op.toFixed(3);
        c.style.visibility = op < 0.01 ? 'hidden' : '';
      });
      const k = Math.round(f);
      if (k !== on) { cards.forEach((c, j) => c.classList.toggle('is-on', j === k)); on = k; }
    });
    cards.forEach((c, i) => c.querySelector('.mc-tab').addEventListener('click', () => ctl.go(i)));
  });
})();
