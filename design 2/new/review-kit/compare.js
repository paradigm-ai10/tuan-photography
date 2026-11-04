/* Version Review kit: compare two, side by side, inside the hub page (index.html?compare=a,b).
   Each side: its still (or the live page in a frame, one side at a time), number, title, score,
   marks. Between them: Keep left, Keep right, Can't choose. A choice adds the loser to the
   winner's "beats". , and . change the right-hand version within its group; Esc goes back. */
(() => {
  'use strict';
  let ctx = null, live = '', said = '';

  function ids() {
    const q = new URLSearchParams(location.search).get('compare') || '';
    return q.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 2);
  }

  function side(v, which) {
    const { R, t, pick, esc, stillUrl } = ctx;
    const it = R.data.items[v.id] || {}, s = it.stars || 0, ms = R.marksOf(v.id), src = stillUrl(v.id);
    const isLive = live === which;
    const kindW = (m) => (m.kind === 'like' ? t('likeShort') : m.kind === 'change' ? t('changeShort') : m.legacy ? t('earlierPin') : t('bare'));
    const tagW = (id) => { const x = (ctx.M.tags || []).concat(ctx.M.phrases || []).find((g) => g.id === id); return x ? pick(x) : id; };
    const dots = ms.filter((m) => m.where).map((m) => `<span class="rvh-pin${m.kind ? ` is-${m.kind}` : ''}" style="--x: ${(+m.where.x).toFixed(4)}; --y: ${(+m.where.y).toFixed(4)}"></span>`).join('');
    return `<section class="rvc-side" data-side="${which}" data-id="${esc(v.id)}">
      <p class="rvc-sw"><button type="button" class="rvh-w" data-c="live" data-side="${which}" aria-pressed="${isLive}">${esc(isLive ? t('still') : t('live'))}</button></p>
      <div class="rvc-view">
        ${isLive ? `<iframe class="rvc-frame" src="${esc(v.href)}" title="${esc(pick(v.title))}"></iframe>`
          : `<a class="rvh-still" href="${esc(v.href)}">${src ? `<img src="${esc(src)}" alt="" width="960" height="600">` : `<span class="rvh-blank"><span>${v.n}</span></span>`}${dots}</a>`}
      </div>
      <h2 class="rvh-name"><a href="${esc(v.href)}"><span class="rvh-num">${v.n}</span>${esc(pick(v.title))}</a></h2>
      <div class="rvh-line">
        <span class="rvh-sc" role="group" aria-label="${esc(t('score'))}">${[1, 2, 3, 4, 5].map((k) =>
          `<button type="button" class="rvh-sq" data-c="score" data-n="${k}" aria-pressed="${s === k}" title="${esc(t('scores')[k])}" aria-label="${k}, ${esc(t('scores')[k])}"></button>`).join('')}</span>
        <span class="rvh-sw">${esc(s ? t('scores')[s] : t('unscored'))}</span>
      </div>
      ${(it.beats || []).length ? `<p class="rvc-beats">${esc(t('beats', { list: it.beats.map((b) => { const x = ctx.list.find((y) => y.id === b); return x ? x.n : b; }).join(', ') }))}</p>` : ''}
      ${it.note ? `<p class="rvh-last is-full">${esc(it.note)}</p>` : ''}
      <ol class="rvc-marks">${ms.map((m, i) => `<li><span class="rvc-n${m.kind ? ` is-${m.kind}` : ''}">${i + 1}</span> ${esc([kindW(m), ...(m.tags || []).map(tagW), ...(m.phrases || []).map(tagW)].filter(Boolean).join(', '))}${m.text ? `<span class="rvc-t">${esc(m.text)}</span>` : ''}</li>`).join('') || `<li class="rvh-none">${esc(t('noMarks'))}</li>`}</ol>
    </section>`;
  }

  function render(c) {
    ctx = c;
    const { t, esc, list, mount, pick } = ctx;
    const [a, b] = ids().map((id) => list.find((v) => v.id === id));
    if (!a || !b) { ctx.back(''); return; }
    document.title = t('compareTitle', { a: a.n, b: b.n });
    mount.innerHTML = `<div class="rvh rvc">
      <p class="rvc-top"><a class="rvh-w" href="${esc(location.pathname)}#v-${esc(a.id)}">${esc(t('back'))}</a><span class="rvh-quiet">${esc(t('keysCompare'))}</span></p>
      <div class="rvc-grid">
        ${side(a, 'l')}
        <div class="rvc-mid" role="group" aria-label="${esc(t('compare'))}">
          <button type="button" class="rvc-keep" data-c="keep" data-w="l">${esc(t('keepL'))}</button>
          <button type="button" class="rvc-keep" data-c="keep" data-w="r">${esc(t('keepR'))}</button>
          <button type="button" class="rvh-w" data-c="cant">${esc(t('cant'))}</button>
          <p class="rvh-state" role="status" aria-live="polite">${esc(said)}</p>
        </div>
        ${side(b, 'r')}
      </div>
    </div>`;
    void pick;
  }

  function swapRight(dir) {
    const [a, b] = ids();
    const vb = ctx.list.find((v) => v.id === b);
    if (!vb) return;
    const g = vb.group ? ctx.list.filter((v) => v.group === vb.group && v.id !== a) : ctx.list.filter((v) => v.id !== a);
    const j = g.indexOf(vb);
    const next = g[(j + dir + g.length) % g.length];
    if (!next || next === vb) return;
    said = '';
    if (live === 'r') live = '';
    history.replaceState(null, '', `${location.pathname}?compare=${encodeURIComponent(a)},${encodeURIComponent(next.id)}`);
    render(ctx);
  }

  document.addEventListener('click', (e) => {
    if (!ctx || !/[?&]compare=/.test(location.search)) return;
    const b = e.target.closest('[data-c]');
    if (!b) return;
    const k = b.dataset.c, [a, r] = ids();
    if (k === 'live') { live = live === b.dataset.side ? '' : b.dataset.side; render(ctx); }
    else if (k === 'score') { const id = b.closest('.rvc-side').dataset.id; ctx.R.setStars(id, +b.dataset.n); render(ctx); }
    else if (k === 'keep') {
      const win = b.dataset.w === 'l' ? a : r, lose = b.dataset.w === 'l' ? r : a;
      ctx.R.addBeat(win, lose);
      const v = ctx.list.find((x) => x.id === win);
      said = `${ctx.t('kept')}: ${v ? `${v.n}, ${ctx.pick(v.title)}` : win}`;
      render(ctx);
    }
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
    if (R) R.on((k) => { if (k === 'pulled' && ctx) render(ctx); });
  }, 0);

  window.ReviewCompare = { render };
})();
