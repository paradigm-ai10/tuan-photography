// A small stack of glass panes, one per photograph, drawn in CSS 3D (no WebGL needed).
// Used by the guides list (closed, a link to the guide) and by a guide's opening (it opens a little
// on arrival, each pane opens the viewer). The look is in guides.css, `.stack`.
//
//   stackHTML(ids, k, { open: true })   ids: slide ids, front first; k: the Kit api
//
// Each pane carries only two numbers inline, --i (its depth) and --ar (the photograph's shape);
// everything else is in the stylesheet.

export function stackHTML(ids, k, { open = false } = {}) {
  const S = k.SITE.slides;
  const list = ids.join(' ');
  const panes = ids.map((id, i) => {
    const s = S[id];
    const ar = (s.w / s.h).toFixed(4);
    const src = k.img(s.file, i === 0 ? 1280 : 640);
    const im = `<img src="${src}" alt="${open ? k.esc(k.pick(s.alt)) : ''}" width="${s.w}" height="${s.h}" decoding="async">`;
    return open
      ? `<button type="button" class="pane" data-open="${id}" data-list="${list}" style="--i:${i};--ar:${ar}">${im}</button>`
      : `<span class="pane" style="--i:${i};--ar:${ar}">${im}</span>`;
  }).join('');
  return `<div class="stack-in" style="--n:${ids.length}">${panes}</div>`;
}

// open the stack a little once the page has painted; reduced motion gets the open stack at once
export function arrive(el) {
  if (!el) return;
  const go = () => el.classList.add('is-open');
  const settle = () => el.classList.add('is-settled');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { go(); settle(); return; }
  let done = false;
  const once = () => { if (done) return; done = true; go(); setTimeout(settle, 2000); };
  requestAnimationFrame(() => requestAnimationFrame(once));
  setTimeout(once, 120);      // a hidden tab may never run animation frames
}
