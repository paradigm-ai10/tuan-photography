/* The opening photograph (2026-10-29), <body data-opening>: the editorial-portfolio-chapters skill's
   first rule, "open with one strong image; let the work earn attention first". One of his photographs
   fills the screen with nothing written on it, holds, then flies down into its own country on the
   map, where that country is the first to develop into it; the planes leave as it lands.
   It is the photograph of the country he went to first (of those he has photographs from).
   globe3d.js waits on window.JourneyOpening.ready before the planes, and calls skip() when the page
   opens settled (back from a trip). Reduced motion, a return, or the wheel, a key or a touch skips it. */
(() => {
  'use strict';
  if (!('opening' in document.body.dataset)) return;
  const K = window.Kit, S = K.S;
  let resolve;
  const O = window.JourneyOpening = { done: false, ready: new Promise((r) => { resolve = r; }), skip: () => end(true) };
  const hand = () => { if (!O.done) { O.done = true; resolve(); } };
  if (K.reduced || /^#t=/.test(location.hash) || !matchMedia('(min-width: 64rem)').matches) { hand(); return; }

  // the country he went to first, of those with photographs (home aside), and its photograph
  const home = S.countries.find((c) => K.km(c.ll, S.flightsFrom) < 80)?.id;
  const first = {};
  for (const t of K.trips) for (const c of t.countries) first[c.id] = Math.min(first[c.id] || 9999, +t.year);
  const shots = {};
  for (const [id, s] of Object.entries(S.slides)) (shots[s.country] = shots[s.country] || []).push(id);
  const cid = Object.keys(shots).filter((c) => c !== home && first[c] && K.ISO[c]).sort((a, b) => first[a] - first[b])[0];
  if (!cid) { hand(); return; }
  const trip = K.trips.find((t) => t.countries.some((c) => c.id === cid) && t.lead && S.slides[t.lead]?.country === cid);
  const id = trip ? trip.lead : shots[cid].find((i) => S.slides[i].w > S.slides[i].h) || shots[cid][0];
  const s = S.slides[id];
  O.iso = K.ISO[cid];

  const box = document.createElement('div');
  box.className = 'op';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = `<img class="op__img" alt="" src="${K.src(s.file, 1280)}" srcset="${K.src(s.file, 1280)} 1280w, ${K.src(s.file)} 2400w" sizes="100vw">`;
  document.body.appendChild(box);
  const img = box.firstChild;

  let gone = false, anim = null;
  function end(quick) {
    if (gone) return;
    gone = true;
    removeEventListener('wheel', cut); removeEventListener('keydown', cut); removeEventListener('touchstart', cut);
    if (anim) anim.cancel();
    if (quick) {
      box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' }).finished.then(() => box.remove());
      hand();
    }
  }
  const cut = () => end(true);
  addEventListener('wheel', cut, { passive: true }); addEventListener('keydown', cut); addEventListener('touchstart', cut, { passive: true });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const loaded = new Promise((r) => { if (img.complete) r(); else { img.onload = r; img.onerror = r; } });
  // the map must be drawn before it can say where the country is
  const mapReady = async () => { for (let i = 0; i < 80; i++) { const at = window.JourneyMapScreen && window.JourneyMapScreen(K.ISO[cid]); if (at && at.w > 2) return at; await wait(50); } return null; };

  (async () => {
    await Promise.race([loaded, wait(3000)]);
    if (gone) return;
    box.classList.add('is-in');
    await wait(1500);                       // the photograph alone, long enough to look at
    const at = await mapReady();
    if (gone) return;
    if (!at) { end(true); return; }
    const W = innerWidth, H = innerHeight;
    const k = Math.max(at.w / W, at.h / H) * 1.05;
    const to = `translate(${at.x - W / 2}px, ${at.y - H / 2}px) scale(${k})`;
    const dur = 1700;
    // the move: strong ease-in-out (on-screen movement); it lands at 70%, then fades into the print
    // its country has become underneath it
    anim = box.animate([
      { transform: 'none', opacity: 1, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' },
      { transform: to, opacity: 1, offset: 0.7, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      { transform: to, opacity: 0 },
    ], { duration: dur, fill: 'forwards' });
    setTimeout(() => { if (!gone) hand(); }, dur * 0.45);   // its country starts to develop under it, the planes leave
    await anim.finished.catch(() => {});
    gone = true;
    box.remove();
    removeEventListener('wheel', cut); removeEventListener('keydown', cut); removeEventListener('touchstart', cut);
  })();
})();
