/* Home page content, batch A (tools/home_more_a.py): the timetable, the contact sheet, the gazetteer, the sentence,
   the day in light. Each part runs only when its page is the one open. Transforms, opacity and clip-path only;
   under "reduce motion" things change without travelling. */
(() => {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const onFrame = (fn) => { let waiting = false; return () => { if (!waiting) { waiting = true; requestAnimationFrame(() => { waiting = false; fn(); }); } }; };

  // ?still: the review list's stills start at the content instead of the film
  if (/[?&]still\b/.test(location.search)) {
    const el = document.querySelector('.leaf.ma');
    if (el) {
      document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      document.querySelectorAll('.hr-open, .cover, .top').forEach((x) => x.remove());
      while (el.previousElementSibling) el.previousElementSibling.remove();
    }
  }

  // wa1, the timetable: the row under the pointer, or the one nearest the reading line, shows its photograph;
  // the row turns over like a flap, the photograph drops in from its top edge
  const board = document.querySelector('.ma-t');
  if (board) {
    const rows = [...board.querySelectorAll('.ma-t-row')], prints = [...board.querySelectorAll('.ma-t-print')];
    let at = 0, held = null;
    const show = (i) => {
      if (i === at) return;
      const last = at; at = i;
      rows.forEach((r, k) => r.classList.toggle('is-on', k === i));
      prints.forEach((p, k) => { p.classList.toggle('was', k === last); p.classList.remove('is-on', 'is-in'); });
      const p = prints[i];
      if (!calm) { p.classList.add('is-in'); void p.offsetWidth; }
      p.classList.add('is-on'); p.classList.remove('is-in');
      if (!calm) { const r = rows[i]; r.classList.remove('is-flip'); void r.offsetWidth; r.classList.add('is-flip'); }
    };
    const read = () => {
      if (held !== null) return;
      const line = innerHeight * (matchMedia('(max-width: 56rem)').matches ? 0.66 : 0.5);
      let best = 0, gap = Infinity;
      rows.forEach((r, k) => { const b = r.getBoundingClientRect(), d = Math.abs((b.top + b.bottom) / 2 - line); if (d < gap) { gap = d; best = k; } });
      show(best);
    };
    rows.forEach((r, k) => {
      r.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { held = k; show(k); } });
      r.addEventListener('pointerleave', () => { held = null; });
      r.addEventListener('focus', () => { held = k; show(k); });
      r.addEventListener('blur', () => { held = null; });
      r.addEventListener('animationend', () => r.classList.remove('is-flip'));
    });
    addEventListener('scroll', onFrame(read), { passive: true });
    addEventListener('resize', read);
    read();
  }

  // wa2, the contact sheet: the frame under the pointer is proofed large beside the sheet and boxed in grease
  // pencil; on a touch screen a tap picks the frame and the proof is what opens
  const sheet = document.querySelector('.ma-c');
  if (sheet) {
    const frames = [...sheet.querySelectorAll('.ma-c-frame')], proofs = [...sheet.querySelectorAll('.ma-c-proof')];
    const grid = sheet.querySelector('.ma-c-sheet'), mark = sheet.querySelector('.ma-c-mark');
    let at = 0;
    const place = () => {
      const f = frames[at].parentElement, g = grid.getBoundingClientRect(), r = f.getBoundingClientRect();
      mark.style.setProperty('--mw', `${r.width + 6}px`);
      mark.style.setProperty('--mh', `${r.height + 6}px`);
      mark.style.transform = `translate3d(${(r.left - g.left - 3).toFixed(1)}px, ${(r.top - g.top - 3).toFixed(1)}px, 0)`;
      mark.classList.add('is-on');
    };
    const show = (i) => {
      if (i === at) return;
      at = i;
      frames.forEach((f, k) => f.classList.toggle('is-on', k === i));
      proofs.forEach((p, k) => p.classList.toggle('is-on', k === i));
      place();
    };
    frames.forEach((f, k) => {
      f.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(k); });
      f.addEventListener('focus', () => show(k));
    });
    // a tap on a touch screen picks the frame; the viewer is not opened from the sheet there
    grid.addEventListener('click', (e) => {
      const f = e.target.closest('.ma-c-frame');
      if (!f || fine.matches) return;
      e.preventDefault(); e.stopPropagation();
      show(frames.indexOf(f));
    }, true);
    addEventListener('resize', place);
    addEventListener('load', place);
    place();
  }

  // wa3, the gazetteer: each plate is pressed in as it comes into view
  const gaz = document.querySelector('.ma-g');
  if (gaz && 'IntersectionObserver' in window) {
    gaz.classList.add('is-js');
    const io = new IntersectionObserver((list) => list.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -12% 0px' });
    gaz.querySelectorAll('.ma-g-plate').forEach((p) => io.observe(p));
  }

  // wa4, the sentence: what has been read stays in full ink; what is still to come waits faintly
  const sent = document.querySelector('.ma-s');
  if (sent && !calm) {
    sent.classList.add('is-js');
    const parts = [...sent.querySelectorAll('.ma-s-c')];
    const read = () => {
      const line = innerHeight * 0.68;
      parts.forEach((p) => { const r = p.getClientRects()[0]; p.classList.toggle('is-read', !!r && r.top < line); });
    };
    addEventListener('scroll', onFrame(read), { passive: true });
    addEventListener('resize', read);
    read();
  }

  // wa5, the day in light: the paper takes the tone of the hour being read, blended between neighbours as the
  // scroll passes; the word for the hour is marked on the side
  const dayEl = document.querySelector('.ma-d');
  if (dayEl) {
    const bands = [...dayEl.querySelectorAll('.ma-d-band')], tones = [...dayEl.querySelectorAll('.ma-d-tone')];
    const words = [...dayEl.querySelectorAll('.ma-d-word')], rule = dayEl.querySelector('.ma-d-rule'), nav = dayEl.querySelector('.ma-d-hours');
    let on = -1;
    const mark = () => {
      const w = words[Math.max(0, on)], n = nav.getBoundingClientRect(), r = w.getBoundingClientRect();
      const phone = matchMedia('(max-width: 48rem)').matches;
      rule.style.transform = phone
        ? `translate3d(${(r.left - n.left).toFixed(1)}px, 0, 0) scaleX(${(r.width / 20).toFixed(3)})`
        : `translate3d(0, ${(r.top - n.top + r.height / 2).toFixed(1)}px, 0)`;
      rule.style.transformOrigin = 'left center';
    };
    const read = () => {
      const mid = innerHeight / 2;
      let f = 0;
      bands.forEach((b, i) => {
        const r = b.getBoundingClientRect();
        if (r.top <= mid) f = i + Math.max(-0.5, Math.min(0.5, (mid - r.top) / r.height - 0.5));
      });
      if (bands[0].getBoundingClientRect().top > mid) f = 0;
      tones.forEach((t, j) => { t.style.opacity = Math.max(0, 1 - Math.abs(f - j)).toFixed(3); });
      const k = Math.round(f);
      if (k !== on) { on = k; words.forEach((w, j) => w.classList.toggle('is-on', j === k)); mark(); }
    };
    words.forEach((w, j) => w.addEventListener('click', () => {
      const r = bands[j].getBoundingClientRect();
      scrollTo({ top: r.top + scrollY, behavior: calm ? 'auto' : 'smooth' });
    }));
    addEventListener('scroll', onFrame(read), { passive: true });
    addEventListener('resize', () => { mark(); read(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(mark);
    read();
  }
})();
