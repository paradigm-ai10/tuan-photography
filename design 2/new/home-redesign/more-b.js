/* Home content, twenty versions, batch B (tools/home_more_b.py, 2026-11-12). Each version is one held stage that
   the scroll conducts. The scroll gives a target; what is drawn follows it, eased by time so a wheel step glides
   (at once under "reduce motion"). Only transforms and opacity are written, once a frame, and only while moving. */
(() => {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ?still (the review list's small pictures): the stage at the top instead of the film
  if (/[?&]still\b/.test(location.search)) {
    const el = document.querySelector('.mb [class$="__run"]');
    if (el) {
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      document.querySelectorAll('.hr-open, .cover, .top').forEach((x) => x.remove());
      while (el.previousElementSibling) el.previousElementSibling.remove();
    }
  }

  // a place at a time: each rests a while at either end of its share of the scroll and travels in the middle 70%
  const rests = (raw, n) => {
    const x = raw * (n - 1), i = Math.floor(x);
    if (i >= n - 1) return n - 1;
    return i + smooth(clamp((x - i - 0.15) / 0.7));
  };

  // follow(run, map, draw, measure): map turns the scroll through run (0 to 1) into a value; draw(value) draws it
  function follow(run, map, draw, measure = () => {}) {
    let f = null, to = 0, moving = false, last = 0;
    const raw = () => { const r = run.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? clamp(-r.top / span) : 0; };
    const step = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000 || 0.016); last = now;
      f += (to - f) * (calm ? 1 : 1 - Math.exp(-dt * 6.5));
      if (Math.abs(to - f) < 0.0008) f = to;
      draw(f);
      if (f !== to) requestAnimationFrame(step); else { moving = false; last = 0; }
    };
    const read = () => {
      to = map(raw());
      if (f === null) { f = to; draw(f); return; }
      if (!moving && to !== f) { moving = true; requestAnimationFrame(step); }
    };
    const again = () => { measure(); if (f !== null) draw(f); read(); };
    addEventListener('scroll', read, { passive: true });
    addEventListener('resize', again);
    addEventListener('load', again);
    document.addEventListener('langchange', again);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(again);
    measure(); read();
    return { jump: (k, n) => { const r = run.getBoundingClientRect(); scrollTo({ top: r.top + scrollY + (k / (n - 1)) * (r.height - innerHeight), behavior: calm ? 'auto' : 'smooth' }); } };
  }

  // wb1, the long wall: scrolling down walks sideways along it
  document.querySelectorAll('.mb-wall__run').forEach((run) => {
    const track = run.querySelector('.mb-wall__track');
    let far = 0;
    follow(run, (x) => x, (f) => { track.style.transform = `translate3d(${(-f * far).toFixed(1)}px, 0, 0)`; },
      () => { far = Math.max(0, track.scrollWidth - innerWidth); });
  });

  // wb2, into the photograph: each one grows from small to past the window's edges; the next is small in its middle
  document.querySelectorAll('.mb-zoom__run').forEach((run) => {
    const stage = run.querySelector('.mb-zoom__stage');
    const figs = [...run.querySelectorAll('.mb-zoom__ph')], names = [...run.querySelectorAll('.mb-zoom__name')];
    const n = figs.length;
    let Z = [], lift = 0;
    const measure = () => {
      const W = stage.clientWidth, Hh = stage.clientHeight;
      Z = figs.map((f) => 1.04 * Math.max(W / f.offsetWidth, Hh / f.offsetHeight));
      lift = Hh * 0.06;   // a small photograph sits a little above the middle, so its name fits beneath; full, it is centred
    };
    const draw = (p) => {
      figs.forEach((fig, k) => {
        const d = p - k;
        let o, s, y = 0;
        if (calm) { o = Math.round(p) === k ? 1 : 0; s = 1; }
        else {
          o = clamp((d + 0.5) / 0.08) * (1 - clamp((d - 0.8) / 0.18));
          s = Math.pow(Z[k], clamp(d, -1, 1.2));
          y = lift * clamp(d);
        }
        fig.style.opacity = o.toFixed(3);
        fig.style.visibility = o > 0 ? 'visible' : 'hidden';
        fig.style.transform = `translate(-50%, -50%) translate3d(0, ${y.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
        fig.style.pointerEvents = Math.abs(d) < 0.5 ? 'auto' : 'none';
      });
      names.forEach((nm, k) => {
        const d = p - k;
        const o = calm ? (Math.round(p) === k ? 1 : 0) : clamp((d + 0.05) / 0.06) * (1 - clamp((d - 0.1) / 0.12));
        nm.style.opacity = o.toFixed(3);
        nm.style.transform = `translate3d(0, ${((1 - o) * (d < 0 ? 8 : -8)).toFixed(1)}px, 0)`;
      });
    };
    follow(run, (x) => rests(x, n), draw, measure);
  });

  // wb3, the pile: each print slides up from the foot of the window and settles over the last
  document.querySelectorAll('.mb-pile__run').forEach((run) => {
    const prints = [...run.querySelectorAll('.mb-pile__print')], names = [...run.querySelectorAll('.mb-pile__name')];
    const n = prints.length;
    const spec = prints.map((p) => ({ dx: +p.style.getPropertyValue('--dx'), dy: +p.style.getPropertyValue('--dy'), r: +p.style.getPropertyValue('--r') / 10 }));
    let top = 0;
    const draw = (p) => {
      // the name beneath is the top print's once it has settled; while one is on its way, no name
      const moving = p - Math.floor(p) > 0.04 && p < n - 1;
      const k0 = moving ? -1 : Math.min(n - 1, Math.round(p)), unit = Math.min(1.6, innerWidth / 900);
      prints.forEach((el, k) => {
        const e = k === 0 ? 1 : clamp(p - (k - 1)), a = calm ? (e > 0.5 ? 1 : 0) : 1 - Math.pow(1 - e, 2);
        const off = (1 - a) * innerHeight * 1.1;
        const { dx, dy, r } = spec[k];
        el.style.transform = `translate(-50%, -50%) translate3d(${(dx * unit).toFixed(1)}px, ${(dy * unit + off).toFixed(1)}px, 0) rotate(${(r + (1 - a) * 2.4).toFixed(2)}deg)`;
        el.style.visibility = a > 0 ? 'visible' : 'hidden';
      });
      if (k0 !== top) { names.forEach((nm, k) => nm.classList.toggle('is-on', k === k0)); top = k0; }
    };
    follow(run, (x) => rests(x, n), draw);
  });

  // wb4, two directions: the left column rises, the right one falls; the names in the gutter follow each
  document.querySelectorAll('.mb-two__run').forEach((run) => {
    const stage = run.querySelector('.mb-two__stage');
    const side = (q) => {
      const track = run.querySelector(`.mb-two__col--${q} .mb-two__track`);
      return { track, figs: [...track.children], list: run.querySelector(`.mb-two__names--${q} ol`), c: [] };
    };
    const L = side('left'), R = side('right');
    let nh = 0, Hh = 0;
    const measure = () => {
      [L, R].forEach((s) => { s.c = s.figs.map((f) => f.offsetTop + f.offsetHeight / 2); });
      nh = L.list.firstElementChild.offsetHeight; Hh = stage.clientHeight;
    };
    // which photograph is at the middle line: an index between two, held on the nearer one for a while
    const at = (c, m) => {
      let i = 0;
      while (i < c.length - 2 && m > c[i + 1]) i++;
      const t = clamp((m - c[i]) / (c[i + 1] - c[i]));
      return i + smooth(clamp((t - 0.3) / 0.4));
    };
    const draw = (p) => {
      const mL = lerp(L.c[0], L.c[L.c.length - 1], p), mR = lerp(R.c[R.c.length - 1], R.c[0], p);
      L.track.style.transform = `translate3d(0, ${(Hh / 2 - mL).toFixed(1)}px, 0)`;
      R.track.style.transform = `translate3d(0, ${(Hh / 2 - mR).toFixed(1)}px, 0)`;
      [[L, at(L.c, mL)], [R, at(R.c, mR)]].forEach(([s, f]) => {
        s.list.style.transform = `translate3d(0, ${(-f * nh).toFixed(1)}px, 0)`;
        [...s.list.children].forEach((li, j) => { li.style.opacity = (1 - clamp(Math.abs(j - f) * 1.8)).toFixed(3); });
      });
    };
    follow(run, (x) => smooth(x), draw, measure);
  });

  // wb5, the blind: the slats turn from the top down, the photograph on their backs is the next one
  document.querySelectorAll('.mb-blind__run').forEach((run) => {
    const figs = [...run.querySelectorAll('.mb-blind__ph')], names = [...run.querySelectorAll('.mb-blind__name')];
    const jumps = [...run.querySelectorAll('.mb-blind__list button')];
    const slats = [...run.querySelectorAll('.mb-blind__slat')];
    const fronts = slats.map((s) => s.children[0]), backs = slats.map((s) => s.children[1]);
    const src = figs.map((f) => f.dataset.src);
    const n = figs.length, N = slats.length, lag = 0.045, span = 1 - (N - 1) * lag;
    let pair = 0, on = -1, under = -1;
    const draw = (p) => {
      const k = Math.min(n - 2, Math.floor(p)), t = p - k;
      if (k !== pair) {
        fronts.forEach((f) => { f.firstChild.src = src[k]; });
        backs.forEach((b) => { b.firstChild.src = src[k + 1]; });
        pair = k;
      }
      const u = calm ? Math.round(p) : (t > 0.002 ? k + 1 : k);   // what shows through the gaps between the slats
      if (u !== under) { figs.forEach((f, j) => f.classList.toggle('is-under', j === u)); under = u; }
      const c = Math.round(p);
      if (c !== on) { [figs, names, jumps].forEach((set) => set.forEach((el, j) => el.classList.toggle('is-on', j === c))); on = c; }
      if (calm) return;
      slats.forEach((sl, i) => {
        const a = 180 * smooth(clamp((t - i * lag) / span));
        sl.style.transform = `rotateX(${a.toFixed(2)}deg)`;
        sl.style.setProperty('--shade', (0.26 * Math.abs(Math.sin(a * Math.PI / 180))).toFixed(3));
      });
    };
    const ride = follow(run, (x) => rests(x, n), draw);
    jumps.forEach((b, k) => b.addEventListener('click', () => ride.jump(k, n)));
  });
})();
