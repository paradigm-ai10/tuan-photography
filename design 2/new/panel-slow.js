/* The trips read more slowly, their spacing kept (2026-11-14, his note on the second pass: "I don't want the
   lines to split that far away. Only the scrolling should get slower"). <body data-slow="3">, wide windows:
   once the list reaches the reading line, it moves up at a third of the scroll's pace, so each trip stays at
   the line three times as long; a room after the list (.jr-slow-room) gives the page the extra length, and
   the list has met its end exactly where the room ends, so what follows scrolls on as before. The trip being
   read, the globe and the photograph behind follow the list as they always did (they read where it is). */
(() => {
  'use strict';
  const K = Math.max(1, parseFloat(document.body.dataset.slow) || 3);
  const wide = matchMedia('(min-width: 64rem)');
  let years = null, room = null, lift = 0, frame = 0;
  function els() {
    const y = document.querySelector('.jr-years');
    if (y !== years) { years = y; lift = 0; if (room) room.remove(); room = null; }   // the list redrawn (a new language)
    if (years && !room) {
      room = document.createElement('div');
      room.className = 'jr-slow-room';
      room.setAttribute('aria-hidden', 'true');
      years.after(room);
    }
  }
  function apply() {
    frame = 0;
    els();
    if (!years) return;
    if (!wide.matches) { lift = 0; years.style.setProperty('--slow', '0px'); room.style.setProperty('--room', '0px'); return; }
    const L = years.offsetHeight;
    const docTop = years.getBoundingClientRect().top + scrollY - lift;   // where the list sits in the page
    const start = docTop - innerHeight * 0.35;                          // its top at the reading line
    const d = Math.min(Math.max(scrollY - start, 0), L * K);
    lift = d * (1 - 1 / K);
    years.style.setProperty('--slow', `${lift.toFixed(1)}px`);
    room.style.setProperty('--room', `${(L * (K - 1)).toFixed(0)}px`);
  }
  const kick = () => { if (!frame) frame = requestAnimationFrame(apply); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  new MutationObserver(kick).observe(document.body, { childList: true, subtree: true });
  kick();
})();
