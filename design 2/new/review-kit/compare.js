/* Version Review kit: compare, side by side, inside the hub page (index.html?compare=a,b,c).
   Two to six versions. Each one: its still, or its live page drawn at 1440 x 900 and shrunk to fit,
   so every page shows as it does on a desk screen; number, title, score, marks.
   Two: Keep left, Keep right, Can't choose between them, and , . change the right-hand one.
   Three or more: each has Keep this one (it is kept over all the others shown) and Take out.
   All live plays every page at once; Play all again restarts them together. Esc goes back. */
(() => {
  'use strict';
  const MAX = 6, W = 1440, H = 900;
  let ctx = null, said = '';
  const live = new Set();

  function ids() {
    const q = new URLSearchParams(location.search).get('compare') || '';
    return [...new Set(q.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, MAX);
  }
  function go(list) {
    history.replaceState(null, '', `${location.pathname}?compare=${list.map(encodeURIComponent).join(',')}`);
    render(ctx);
  }

  function side(v, which, many) {
    const { R, t, pick, esc, stillUrl } = ctx;
    const it = R.data.items[v.id] || {}, s = it.stars || 0, ms = R.marksOf(v.id), src = stillUrl(v.id);
    const isLive = live.has(v.id);
    const kindW = (m) => (m.kind === 'like' ? t('likeShort') : m.kind === 'change' ? t('changeShort') : m.legacy ? t('earlierPin') : t('bare'));
    const tagW = (id) => { const x = (ctx.M.tags || []).concat(ctx.M.phrases || []).find((g) => g.id === id); return x ? pick(x) : id; };
    const dots = ms.filter((m) => m.where).map((m) => `<span class="rvh-pin${m.kind ? ` is-${m.kind}` : ''}" style="--x: ${(+m.where.x).toFixed(4)}; --y: ${(+m.where.y).toFixed(4)}"></span>`).join('');
    return `<section class="rvc-side" data-side="${which}" data-id="${esc(v.id)}">
      <p class="rvc-sw"><button type="button" class="rvh-w" data-c="live" aria-pressed="${isLive}">${esc(isLive ? t('still') : t('live'))}</button></p>
      <div class="rvc-view">
        ${isLive ? `<iframe class="rvc-frame" src="${esc(v.href)}" title="${esc(pick(v.title))}" width="${W}" height="${H}"></iframe>`
          : `<a class="rvh-still" href="${esc(v.href)}">${src ? `<img src="${esc(src)}" alt="" width="960" height="600">` : `<span class="rvh-blank"><span>${v.n}</span></span>`}${dots}</a>`}
      </div>
      <h2 class="rvh-name"><a href="${esc(v.href)}"><span class="rvh-num">${v.n}</span>${esc(pick(v.title))}</a></h2>
      <div class="rvh-line">
        <span class="rvh-sc" role="group" aria-label="${esc(t('score'))}">${[1, 2, 3, 4, 5].map((k) =>
          `<button type="button" class="rvh-sq" data-c="score" data-n="${k}" aria-pressed="${s === k}" title="${esc(t('scores')[k])}" aria-label="${k}, ${esc(t('scores')[k])}"></button>`).join('')}</span>
        <span class="rvh-sw">${esc(s ? t('scores')[s] : t('unscored'))}</span>
      </div>
      ${many ? `<p class="rvc-acts"><button type="button" class="rvc-keep" data-c="keepthis">${esc(t('keepThis'))}</button><button type="button" class="rvh-w" data-c="out">${esc(t('takeOut'))}</button></p>` : ''}
      <p class="rvc-beats">${esc(beatsText(v.id))}</p>
      ${it.note ? `<p class="rvh-last is-full">${esc(it.note)}</p>` : ''}
      <ol class="rvc-marks">${ms.map((m, i) => `<li><span class="rvc-n${m.kind ? ` is-${m.kind}` : ''}">${i + 1}</span> ${esc([kindW(m), ...(m.tags || []).map(tagW), ...(m.phrases || []).map(tagW)].filter(Boolean).join(', '))}${m.text ? `<span class="rvc-t">${esc(m.text)}</span>` : ''}</li>`).join('') || `<li class="rvh-none">${esc(t('noMarks'))}</li>`}</ol>
    </section>`;
  }

  function beatsText(id) {
    const it = ctx.R.data.items[id] || {};
    return (it.beats || []).length ? ctx.t('beats', { list: it.beats.map((b) => { const x = ctx.list.find((y) => y.id === b); return x ? x.n : b; }).join(', ') }) : '';
  }

  // scores, "kept over" and the last word said, changed in place: a redraw would restart the live pages
  function refresh() {
    const { R, t, mount } = ctx;
    mount.querySelectorAll('.rvc-side').forEach((el) => {
      const s = (R.data.items[el.dataset.id] || {}).stars || 0;
      el.querySelectorAll('[data-c="score"]').forEach((q) => q.setAttribute('aria-pressed', String(+q.dataset.n === s)));
      el.querySelector('.rvh-sw').textContent = s ? t('scores')[s] : t('unscored');
      el.querySelector('.rvc-beats').textContent = beatsText(el.dataset.id);
    });
    const st = mount.querySelector('.rvc-said, .rvc-mid .rvh-state');
    if (st) st.textContent = said;
  }

  // a live page is laid out at desk size and shrunk to its box, so all of them show the same way
  let ro = null;
  function fit() {
    if (ro) ro.disconnect();
    ro = new ResizeObserver((es) => es.forEach((e) => e.target.style.setProperty('--k', (e.contentRect.width / W).toFixed(5))));
    ctx.mount.querySelectorAll('.rvc-view').forEach((el) => ro.observe(el));
  }

  function render(c) {
    ctx = c;
    const { t, esc, list, mount } = ctx;
    const vs = ids().map((id) => list.find((v) => v.id === id)).filter(Boolean);
    if (vs.length < 2) { ctx.back(vs[0] ? vs[0].id : ''); return; }
    [...live].forEach((id) => { if (!vs.some((v) => v.id === id)) live.delete(id); });
    const many = vs.length > 2, allLive = vs.every((v) => live.has(v.id));
    document.title = many ? t('compareTitleN', { list: vs.map((v) => v.n).join(' / ') }) : t('compareTitle', { a: vs[0].n, b: vs[1].n });
    const cols = vs.length === 4 ? 2 : Math.min(vs.length, 3);
    mount.innerHTML = `<div class="rvh rvc${many ? ' is-many' : ''}">
      <p class="rvc-top">
        <a class="rvh-w" href="${esc(location.pathname)}#v-${esc(vs[0].id)}">${esc(t('back'))}</a>
        <button type="button" class="rvh-w" data-c="all" aria-pressed="${allLive}">${esc(allLive ? t('allStill') : t('allLive'))}</button>
        ${live.size ? `<button type="button" class="rvh-w" data-c="replay">${esc(t('replay'))}</button>` : ''}
        ${vs.length < MAX ? `<a class="rvh-w" href="${esc(location.pathname)}?pick=${vs.map((v) => encodeURIComponent(v.id)).join(',')}">${esc(t('addMore'))}</a>` : ''}
        <span class="rvh-quiet">${esc(many ? t('keysCompareN') : t('keysCompare'))}</span>
      </p>
      ${many ? `<p class="rvh-state rvc-said" role="status" aria-live="polite">${esc(said)}</p>
      <div class="rvc-grid is-many" style="--cols: ${cols}">${vs.map((v, i) => side(v, String(i), true)).join('')}</div>`
      : `<div class="rvc-grid">
        ${side(vs[0], 'l', false)}
        <div class="rvc-mid" role="group" aria-label="${esc(t('compare'))}">
          <button type="button" class="rvc-keep" data-c="keep" data-w="l">${esc(t('keepL'))}</button>
          <button type="button" class="rvc-keep" data-c="keep" data-w="r">${esc(t('keepR'))}</button>
          <button type="button" class="rvh-w" data-c="cant">${esc(t('cant'))}</button>
          <p class="rvh-state" role="status" aria-live="polite">${esc(said)}</p>
        </div>
        ${side(vs[1], 'r', false)}
      </div>`}
    </div>`;
    fit();
  }

  function swapRight(dir) {
    const [a, b] = ids();
    const vb = ctx.list.find((v) => v.id === b);
    if (!vb || ids().length !== 2) return;
    const g = vb.group ? ctx.list.filter((v) => v.group === vb.group && v.id !== a) : ctx.list.filter((v) => v.id !== a);
    const j = g.indexOf(vb);
    const next = g[(j + dir + g.length) % g.length];
    if (!next || next === vb) return;
    said = '';
    live.delete(b);
    go([a, next.id]);
  }

  const nameOf = (id) => { const v = ctx.list.find((x) => x.id === id); return v ? `${v.n}, ${ctx.pick(v.title)}` : id; };

  document.addEventListener('click', (e) => {
    if (!ctx || !/[?&]compare=/.test(location.search)) return;
    const b = e.target.closest('[data-c]');
    if (!b) return;
    const k = b.dataset.c, all = ids(), [a, r] = all;
    const sideEl = b.closest('.rvc-side'), id = sideEl && sideEl.dataset.id;
    if (k === 'live') { if (live.has(id)) live.delete(id); else live.add(id); render(ctx); }
    else if (k === 'all') { if (all.every((x) => live.has(x))) live.clear(); else all.forEach((x) => live.add(x)); render(ctx); }
    else if (k === 'replay') {
      // every live page starts again in the same moment
      ctx.mount.querySelectorAll('.rvc-frame').forEach((f) => { try { f.contentWindow.location.reload(); } catch (err) { f.src = f.src; } });
    }
    else if (k === 'score') { ctx.R.setStars(id, +b.dataset.n); refresh(); }
    else if (k === 'keep') {
      const win = b.dataset.w === 'l' ? a : r, lose = b.dataset.w === 'l' ? r : a;
      ctx.R.addBeat(win, lose);
      said = `${ctx.t('kept')}: ${nameOf(win)}`;
      refresh();
    }
    else if (k === 'keepthis') {
      all.filter((x) => x !== id).forEach((x) => ctx.R.addBeat(id, x));
      said = `${ctx.t('kept')}: ${nameOf(id)}`;
      refresh();
    }
    else if (k === 'out') { said = ''; live.delete(id); const left = all.filter((x) => x !== id); if (left.length < 2) ctx.back(left[0] || id); else go(left); }
    else if (k === 'cant') { said = ''; swapRight(1); }
  });
  document.addEventListener('keydown', (e) => {
    if (!ctx || !/[?&]compare=/.test(location.search) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (e.key === 'Escape') { e.preventDefault(); ctx.back(ids()[0]); }
    else if (e.key === ',') { e.preventDefault(); swapRight(-1); }
    else if (e.key === '.') { e.preventDefault(); swapRight(1); }
  });
  if (window.ReviewStore) setTimeout(() => {
    const R = ctx && ctx.R;
    if (R) R.on((k) => { if (k === 'pulled' && ctx && /[?&]compare=/.test(location.search)) { if (live.size) refresh(); else render(ctx); } });
  }, 0);

  window.ReviewCompare = { render, MAX };
})();
