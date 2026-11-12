/* Batch D of the home page's content trials (tools/home_more_d.py, 2026-11-12). One small script per version, each
   finding its own root and doing nothing on the other pages. Only transform, opacity and classes are written; under
   "reduce motion" nothing glides. */
(() => {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const word = (k) => {
    const L = document.documentElement.lang === 'zh-Hant' ? 'zh' : 'en';
    return (window.pageI18n?.[L] || {})[k] ?? window.pageI18n?.en?.[k] ?? '';
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const onScroll = (fn) => {
    let waiting = false;
    addEventListener('scroll', () => { if (!waiting) { waiting = true; requestAnimationFrame(() => { waiting = false; fn(); }); } }, { passive: true });
    addEventListener('resize', fn);
  };
  // how far through a held run the scroll is, 0 to 1
  const through = (run) => { const r = run.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight), 0, 1); };

  // ?still (the review list's pictures): the content at the top
  if (/[?&]still\b/.test(location.search)) {
    const first = { wd1: '.md-c', wd2: '.md-t', wd3: '.md-z', wd4: '.md-m', wd5: '.md-p' }[document.documentElement.dataset.hc];
    const el = first && document.querySelector(first);
    if (el) {
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      document.querySelectorAll('.hr-open, .cover, .top').forEach((x) => x.remove());
      while (el.previousElementSibling) el.previousElementSibling.remove();
    }
  }

  /* wd1, by colour: pointing at a print (or tapping it, on a phone) shows it larger beside the field, named */
  document.querySelectorAll('.md-c').forEach((sec) => {
    const list = sec.querySelector('.md-c-prints'), big = sec.querySelector('.md-c-big'), pic = big.querySelector('img');
    const name = sec.querySelector('.md-c-proof b'), place = sec.querySelector('.md-c-proof figcaption span');
    let shown = null;
    const show = (a) => {
      if (!a || a === shown) return;
      shown?.classList.remove('is-on');
      shown = a; a.classList.add('is-on');
      const sid = a.dataset.k, from = a.querySelector('img');
      big.href = a.getAttribute('href'); big.dataset.slide = sid;
      big.setAttribute('aria-label', a.getAttribute('aria-label')); big.dataset.i18nAria = `sl_${sid}`;
      name.dataset.i18n = `sp_${sid}`; name.textContent = word(`sp_${sid}`);
      place.dataset.i18n = `sw_${sid}`; place.textContent = word(`sw_${sid}`);
      pic.classList.add('is-wait');
      pic.width = from.width; pic.height = from.height;
      pic.srcset = from.getAttribute('srcset'); pic.src = from.getAttribute('src');
      pic.alt = from.alt; pic.dataset.i18nAlt = `sa_${sid}`;
      const reveal = () => { if (shown === a) pic.classList.remove('is-wait'); };
      (pic.decode ? pic.decode() : Promise.resolve()).then(reveal, reveal);
    };
    const prints = [...list.querySelectorAll('.md-c-p')];
    show(prints.find((a) => a.dataset.k === 'queensboro-train') || prints[0]);
    list.addEventListener('pointerover', (ev) => { const a = ev.target.closest('.md-c-p'); if (a && ev.pointerType === 'mouse') show(a); });
    list.addEventListener('focusin', (ev) => show(ev.target.closest('.md-c-p')));
    // on a phone the first tap shows the print larger, and the large one opens it
    list.addEventListener('click', (ev) => {
      const a = ev.target.closest('.md-c-p');
      if (a && touch && a !== shown) { ev.preventDefault(); ev.stopPropagation(); show(a); }
    }, true);
    if (calm || !('IntersectionObserver' in window)) sec.classList.add('is-in');
    else {
      const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { sec.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.12 });
      io.observe(list);
    }
  });

  /* wd2, the trail: moving across the field leaves photographs behind, each fading slowly; when the hand rests, the
     last one stays with its name under it. On a phone each tap lays one down. */
  document.querySelectorAll('.md-t').forEach((sec) => {
    const figs = [...sec.querySelectorAll('.md-t-p')];
    let next = 1, z = 1, last = figs[0], lx = null, ly = null, idle = 0;
    const size = (f) => { const img = f.querySelector('img'); return [img.offsetWidth, img.offsetHeight]; };
    const put = (f, x, y) => {
      const [w, h] = size(f), W = sec.clientWidth, Hh = sec.clientHeight, m = 16;
      const cx = clamp(x - w / 2, m, Math.max(m, W - w - m)), cy = clamp(y - h / 2, m, Math.max(m, Hh - h - 56));
      f.style.transform = `translate3d(${cx.toFixed(0)}px, ${cy.toFixed(0)}px, 0)`;
    };
    const rest = () => { clearTimeout(idle); idle = setTimeout(() => sec.classList.add('is-still'), touch ? 300 : 650); };
    const lay = (x, y) => {
      const f = figs[next]; next = (next + 1) % figs.length;
      f.classList.remove('is-on', 'is-last');
      f.style.transition = 'none'; put(f, x, y); f.style.zIndex = ++z;
      void f.offsetWidth; f.style.transition = '';
      f.classList.add('is-on', 'is-last');
      const was = last; last = f;
      if (was && was !== f) { was.classList.remove('is-last'); setTimeout(() => { if (was !== last) was.classList.remove('is-on'); }, calm ? 0 : 480); }
      sec.classList.remove('is-still'); rest();
    };
    const start = () => {
      const narrow = innerWidth < 768;
      put(figs[0], sec.clientWidth * (narrow ? 0.5 : 0.64), sec.clientHeight * (narrow ? 0.58 : 0.5));
      sec.classList.add('is-still');
    };
    sec.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'touch') return;
      const r = sec.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      if (lx === null) { lx = x; ly = y; return; }
      if (Math.hypot(x - lx, y - ly) > (calm ? 220 : 130)) { lx = x; ly = y; lay(x, y); }
    });
    sec.addEventListener('pointerleave', () => { lx = null; rest(); });
    sec.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType !== 'touch' || ev.target.closest('.md-t-p.is-last')) return;
      const r = sec.getBoundingClientRect(); lay(ev.clientX - r.left, ev.clientY - r.top);
    });
    const ready = () => { if (sec.classList.contains('is-still') && last === figs[0]) start(); };
    figs[0].querySelector('img').addEventListener('load', ready);
    addEventListener('resize', () => { if (last === figs[0]) start(); });
    start();
  });

  /* wd3, one photograph, closer: the scroll through each run moves the frame from the whole photograph into three of
     its details and back. Each detail is held for a while, the move between eased, and the move followed by time so
     a wheel step glides. */
  document.querySelectorAll('.md-z').forEach((run) => {
    const img = run.querySelector('.md-z-frame img'), notes = [...run.querySelectorAll('.md-z-note')];
    const keys = notes.map((n) => ({ x: +n.dataset.x, y: +n.dataset.y, z: +n.dataset.z }));
    const n = keys.length;
    let f = 0, to = 0, on = 0, moving = false, then = 0;
    const draw = () => {
      const i = Math.min(n - 2, Math.floor(f)), t = f - i, a = keys[i], b = keys[i + 1];
      const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t);
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      const tx = clamp(0.5 - x * z, 1 - z, 0) * 100, ty = clamp(0.5 - y * z, 1 - z, 0) * 100;
      img.style.transform = `translate3d(${tx.toFixed(3)}%, ${ty.toFixed(3)}%, 0) scale(${z.toFixed(4)})`;
      const k = Math.round(f);
      if (k !== on) { notes.forEach((el, j) => el.classList.toggle('is-on', j === k)); on = k; }
    };
    const step = (now) => {
      const dt = Math.min(0.05, (now - (then || now)) / 1000 || 0.016); then = now;
      f += (to - f) * (calm ? 1 : 1 - Math.exp(-dt * 6));
      if (Math.abs(to - f) < 0.001) f = to;
      draw();
      if (f !== to) requestAnimationFrame(step); else { moving = false; then = 0; }
    };
    const read = () => {
      const raw = through(run) * (n - 1), i = Math.floor(raw), t = clamp((raw - i - 0.3) / 0.55, 0, 1);
      to = Math.min(n - 1, i + t * t * (3 - 2 * t));
      if (!moving && to !== f) { moving = true; requestAnimationFrame(step); }
    };
    onScroll(read);
    draw(); read();
  });

  /* wd4, the map line: the scroll travels the route; the dotted line lights behind a small ring, each place's dot
     fills as it is passed, and the photograph of the nearest place is shown whole beside the map */
  document.querySelectorAll('.md-m').forEach((run) => {
    const dots = [...run.querySelectorAll('.md-m-d')].map((d) => ({ el: d, u: +d.dataset.u, x: +d.getAttribute('cx'), y: +d.getAttribute('cy') }));
    const places = [...run.querySelectorAll('.md-m-place')], labels = [...run.querySelectorAll('.md-m-label')];
    const photos = [...run.querySelectorAll('.md-m-photo')], jumps = [...run.querySelectorAll('.md-m-index button')];
    const mark = run.querySelector('.md-m-mark'), n = places.length;
    let f = 0, to = 0, on = -1, lit = 0, moving = false, then = 0;
    const at = (u) => {   // the point on the route at u
      let k = 0;
      while (k < dots.length - 1 && dots[k + 1].u < u) k++;
      const a = dots[k], b = dots[Math.min(dots.length - 1, k + 1)], t = b.u > a.u ? clamp((u - a.u) / (b.u - a.u), 0, 1) : 0;
      return [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t];
    };
    const draw = () => {
      const [x, y] = at(f);
      mark.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      let want = 0;
      while (want < dots.length && dots[want].u <= f + 0.0001) want++;
      for (let k = Math.min(lit, want); k < Math.max(lit, want); k++) dots[k].el.classList.toggle('is-lit', k < want);
      lit = want;
      const k = Math.round(f);
      if (k !== on) {
        [labels, photos].forEach((set) => set.forEach((el, j) => el.classList.toggle('is-on', j === k)));
        places.forEach((el, j) => { el.classList.toggle('is-on', j === k); el.classList.toggle('is-past', j < k); });
        jumps.forEach((el, j) => { el.classList.toggle('is-on', j === k); el.classList.toggle('is-past', j < k); });
        on = k;
      }
    };
    const step = (now) => {
      const dt = Math.min(0.05, (now - (then || now)) / 1000 || 0.016); then = now;
      f += (to - f) * (calm ? 1 : 1 - Math.exp(-dt * 5));
      if (Math.abs(to - f) < 0.001) f = to;
      draw();
      if (f !== to) requestAnimationFrame(step); else { moving = false; then = 0; }
    };
    const read = () => {
      const raw = through(run) * (n - 1), i = Math.floor(raw), t = clamp((raw - i - 0.2) / 0.6, 0, 1);
      to = Math.min(n - 1, i + t * t * (3 - 2 * t));
      if (!moving && to !== f) { moving = true; requestAnimationFrame(step); }
    };
    jumps.forEach((b, k) => b.addEventListener('click', () => {
      const r = run.getBoundingClientRect();
      scrollTo({ top: r.top + scrollY + (k / (n - 1)) * (r.height - innerHeight), behavior: calm ? 'auto' : 'smooth' });
    }));
    onScroll(read);
    draw(); read();
  });

  /* wd5, matched pairs: the scroll through the run picks the pair; the one leaving parts and fades, the next comes
     together as it appears */
  document.querySelectorAll('.md-p').forEach((run) => {
    const pairs = [...run.querySelectorAll('.md-p-pair')], n = pairs.length;
    let on = 0;
    const read = () => {
      const k = Math.min(n - 1, Math.floor(through(run) * n));
      if (k === on) return;
      pairs.forEach((p, j) => p.classList.toggle('is-on', j === k));
      on = k;
    };
    onScroll(read);
    read();
  });
})();
