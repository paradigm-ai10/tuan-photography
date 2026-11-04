/* Version Review kit: the bar, the Notes drawer and the marks, on every version page.

   <script src="review-kit/bar.js" data-name="journey" data-id="…" data-manifest="review-manifest.json"></script>
   (needs words.js and store.js first; review.js in a project can load all three).
   data-name   the review file (default: the manifest's name, else "journey")
   data-id     this version's id (default: the file name without .html)
   data-back   "" for a page with no list to go back to
   data-list   the store only, no bar (a list page that draws its own)
   data-manifest  where the list of versions is (default review-manifest.json beside the page)

   The tool stays out of the way: a thin bar at the bottom edge that shrinks to a hairline, a
   drawer on the right only when asked (N), and marks dropped on the spot he means (M).
   Keys: , . previous and next version (Shift: the whole list), B the list, 1 to 5 score, N notes,
   M mark, H hide marks, ? the keys. They are stopped at the kit, so the page never acts on them too. Shown only
   on the owner's own computer (localhost), never in stills (?still or headless Chrome).
   A page may offer window.ReviewView = { get(), set(state), near?(x, y) } so a mark or a move to
   the next version brings back the same view; without it the scroll position is used. */
(() => {
  'use strict';
  const SCRIPT = document.currentScript;
  const OPT = (SCRIPT && SCRIPT.dataset) || {};
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const STILL = /[?&]still\b/.test(location.search) || /HeadlessChrome/.test(navigator.userAgent);
  let FRAMED = false;
  try { FRAMED = window.top !== window.self; } catch (e) { FRAMED = true; }   // inside Compare's live frame
  const RW = window.ReviewWords;
  const NAME0 = OPT.name || 'journey';
  const R = window.ReviewStore.open(NAME0);
  window.Review = window.Review || R;
  if (!LOCAL || FRAMED || 'list' in OPT) return;

  // ---- what came with the address: #rv=<the view to show>, from the previous version -----------
  let arriving = null;
  {
    const m = /(?:^#|&)rv=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (m) {
      try {
        arriving = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))));
      } catch (e) { arriving = null; }
      // a page that keeps its own view in the address (#at=… on the atlas) gets it back before it reads it
      const rest = arriving && arriving.hash ? arriving.hash : '';
      try { history.replaceState(history.state, '', location.pathname + location.search + rest); } catch (e) { /* sandboxed */ }
    }
  }

  // a still (review_thumbs.py): no tool at all, only the view it was asked for
  if (STILL) {
    if (arriving) addEventListener('load', () => setTimeout(() => {
      const V = window.ReviewView;
      if (arriving.state != null && V && V.set) V.set(arriving.state);
      else if (arriving.state && typeof arriving.state.y === 'number') scrollTo({ top: arriving.state.y * innerHeight, behavior: 'instant' });
      else if (typeof arriving.y === 'number') scrollTo({ top: arriving.y, behavior: 'instant' });
    }, 2500));
    return;
  }

  const ID = OPT.id || decodeURIComponent((location.pathname.split('/').pop() || 'index.html').replace(/\.html?$/, '')) || 'index';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lang = () => {
    const k = window.Kit && window.Kit.lang;
    if (k === 'zh' || k === 'en') return k;
    return /^zh/i.test(document.documentElement.lang || '') ? 'zh' : 'en';
  };
  const t = (k, v) => RW.t(lang(), k, v);
  const pick = (v) => RW.pick(lang(), v);
  const typing = (el) => el && el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');

  let M = { items: [], groups: [], tags: [], phrases: [] };   // the manifest
  let list = [], me = null, idx = -1, groupList = [];

  // ---- the DOM -----------------------------------------------------------------------------------
  const root = document.createElement('div');
  root.className = 'rvk';
  root.innerHTML = `
    <div class="rvk-zone"><div class="rvk-dots"></div><span class="rvk-pend" aria-hidden="true" hidden></span><div class="rvk-card" hidden></div></div>
    <div class="rvk-layer" hidden><p class="rvk-hint"></p></div>
    <nav class="rvk-bar" aria-label="Review"></nav>
    <aside class="rvk-drawer" id="rvk-drawer" hidden></aside>
    <p class="rvk-keys" hidden></p>`;
  const $ = (s) => root.querySelector(s);
  const zone = $('.rvk-zone'), dotsEl = $('.rvk-dots'), card = $('.rvk-card'), layer = $('.rvk-layer');
  const bar = $('.rvk-bar'), drawer = $('#rvk-drawer'), keysEl = $('.rvk-keys');

  let drawerOpen = false, hideDots = false, marking = false, pending = null, peek = null;
  // every version arrives with the drawer closed: he judges each one whole (principle 2)
  try { hideDots = sessionStorage.getItem('rvk-hide') === '1'; } catch (e) { /* storage blocked */ }

  // ---- the bar -----------------------------------------------------------------------------------
  function drawBar() {
    const it = R.data.items[ID] || {}, s = it.stars || 0;
    const n = idx + 1, total = list.length;
    const title = me ? pick(me.title) : (R.data.names || {})[ID] || document.title.split(' · ')[0];
    const back = OPT.back !== '' && list.length;
    bar.innerHTML = `
      <span class="rvk-hair" aria-hidden="true"${n > 0 ? ` data-n="${n}"` : ''}></span>
      <div class="rvk-row">
        ${total > 1 ? `<button type="button" class="rvk-w rvk-prev" data-k="prev">${esc(t('prev'))}</button>` : ''}
        <span class="rvk-where">${n > 0 ? `<span class="rvk-n">${esc(t('of', { n, total }))}</span>` : ''}<span class="rvk-title">${esc(title)}</span></span>
        ${total > 1 ? `<button type="button" class="rvk-w rvk-next" data-k="next">${esc(t('next'))}</button>` : ''}
        <span class="rvk-sep" aria-hidden="true"></span>
        <span class="rvk-sc" role="group" aria-label="${esc(t('score'))}">${[1, 2, 3, 4, 5].map((k) =>
          `<button type="button" class="rvk-sq" data-k="score" data-n="${k}" aria-pressed="${s === k}" title="${esc(t('scores')[k])}" aria-label="${k}, ${esc(t('scores')[k])}">${k}</button>`).join('')}</span>
        <button type="button" class="rvk-w rvk-notes" data-k="notes" aria-expanded="${drawerOpen}" aria-controls="rvk-drawer">${esc(t('notes'))}${marksOf().length ? ` <span class="rvk-count">${marksOf().length}</span>` : ''}</button>
        ${back ? `<a class="rvk-w rvk-all" href="${esc(hubHref())}">${esc(t('all'))}</a>` : ''}
      </div>`;
  }

  function hubHref() { return `${M.hub || 'index.html'}#v-${ID}`; }

  // shown for 3 s on arrival, then a hairline; back when the pointer nears the bottom edge or a key is used
  let shrinkT = 0;
  function showBar(ms) {
    root.classList.add('is-bar');
    clearTimeout(shrinkT);
    if (ms !== Infinity) shrinkT = setTimeout(() => { if (!bar.contains(document.activeElement) && !drawerOpen && !overBar) root.classList.remove('is-bar'); }, ms || 2200);
  }
  let overBar = false;
  addEventListener('pointermove', (e) => {
    const near = innerHeight - e.clientY < 48;
    if (near && !overBar) { overBar = true; showBar(Infinity); }
    else if (!near && overBar) { overBar = false; showBar(1200); }
  }, { passive: true });
  bar.addEventListener('focusin', () => showBar(Infinity));
  bar.addEventListener('focusout', () => showBar(1500));
  let scrollT = 0;
  addEventListener('scroll', () => {
    root.classList.add('is-scrolling');
    clearTimeout(scrollT);
    scrollT = setTimeout(() => root.classList.remove('is-scrolling'), 400);
  }, { passive: true });

  // ---- the drawer --------------------------------------------------------------------------------
  function marksOf() { return R.marksOf(ID); }
  const tagWord = (id) => { const x = (M.tags || []).find((g) => g.id === id); return x ? pick(x) : id; };
  const phraseWord = (id) => { const x = (M.phrases || []).find((g) => g.id === id); return x ? pick(x) : id; };

  function markLine(m, i) {
    const kind = m.kind === 'like' ? t('likeShort') : m.kind === 'change' ? t('changeShort') : m.legacy ? t('earlierPin') : t('bare');
    const chips = [...(m.tags || []).map(tagWord), ...(m.phrases || []).map(phraseWord)];
    const where = m.where ? '' : m.view && typeof m.view.scroll === 'number' ? t('atPct', { p: Math.round(m.view.scroll * 100) }) : '';
    return `<li class="rvk-m${m.kind ? ` is-${m.kind}` : ''}" data-m="${esc(m.id)}">
      <span class="rvk-dotn" aria-hidden="true">${i + 1}</span>
      <div class="rvk-mb">
        <p class="rvk-mk">${esc(kind)}${chips.length ? `<span class="rvk-chips">${chips.map((c) => `<span class="rvk-chip">${esc(c)}</span>`).join('')}</span>` : ''}</p>
        ${m.text ? `<p class="rvk-mt">${esc(m.text)}</p>` : ''}
        ${where || m.near ? `<p class="rvk-mn">${esc([where, m.near].filter(Boolean).join(', '))}</p>` : ''}
        <p class="rvk-ma"><button type="button" class="rvk-w" data-k="go" data-m="${esc(m.id)}">${esc(t('go'))}</button>${m.legacy ? '' : `<button type="button" class="rvk-w" data-k="del" data-m="${esc(m.id)}">${esc(t('remove'))}</button>`}</p>
      </div></li>`;
  }

  function drawDrawer() {
    document.documentElement.classList.toggle('rvk-drawer-open', drawerOpen);
    drawer.hidden = !drawerOpen;
    if (!drawerOpen) { drawDots(); return; }
    const it = R.data.items[ID] || {}, s = it.stars || 0, ms = marksOf();
    const noteFocused = document.activeElement && document.activeElement.id === 'rvk-overall';
    const scoreHtml = `<div class="rvk-score" role="group" aria-label="${esc(t('score'))}">${[1, 2, 3, 4, 5].map((k) =>
      `<button type="button" class="rvk-sb" data-k="score" data-n="${k}" aria-pressed="${s === k}"><span class="rvk-sbn">${k}</span><span class="rvk-sbw">${esc(t('scores')[k])}</span></button>`).join('')}</div>`;
    const body = `
      <header class="rvk-dh"><p class="rvk-dt">${esc(me ? pick(me.title) : t('notes'))}</p><button type="button" class="rvk-w" data-k="notes">${esc(t('close'))}</button></header>
      ${scoreHtml}
      <button type="button" class="rvk-markbtn" data-k="mark">${esc(t('mark'))}<span class="rvk-key" aria-hidden="true">M</span></button>
      <ol class="rvk-ms">${ms.length ? ms.map(markLine).join('') : `<li class="rvk-none">${esc(t('noMarks'))}</li>`}</ol>
      ${ms.some((m) => m.where) ? `<button type="button" class="rvk-w rvk-hide" data-k="hide">${esc(hideDots ? t('showMarks') : t('hideMarks'))}</button>` : ''}
      <label class="rvk-lab" for="rvk-overall">${esc(t('overall'))}</label>
      <textarea class="rvk-in" id="rvk-overall" rows="2" placeholder="${esc(t('overallHint'))}"></textarea>
      <p class="rvk-state" role="status" aria-live="polite">${R.status ? esc(t(R.status)) : ''}</p>
      <p class="rvk-keyline">${esc(t('keys'))}</p>`;
    if (noteFocused) {
      // he is typing: redraw everything round the note, never the note itself
      const keep = drawer.querySelector('#rvk-overall');
      drawer.innerHTML = body;
      drawer.querySelector('#rvk-overall').replaceWith(keep);
      keep.focus();
    } else {
      drawer.innerHTML = body;
      drawer.querySelector('#rvk-overall').value = it.note || '';
    }
    drawDots();
  }

  function setDrawer(v, focus) {
    drawerOpen = v;
    drawDrawer();
    drawBar();
    if (v) {
      showBar(Infinity);
      if (focus !== false) { const b = drawer.querySelector('.rvk-sb[aria-pressed="true"]') || drawer.querySelector('.rvk-sb'); if (b) b.focus({ preventScroll: true }); }
    } else {
      showBar(1500);
      if (focus !== false) { const b = bar.querySelector('.rvk-notes'); if (b) b.focus({ preventScroll: true }); }
    }
  }

  // ---- saved marks as dots (while the drawer is open) ------------------------------------------
  function drawDots() {
    const ms = marksOf();
    const show = drawerOpen && !hideDots;
    dotsEl.innerHTML = show ? ms.map((m, i) => (m.where ? `<button type="button" class="rvk-dot${m.kind ? ` is-${m.kind}` : ''}" data-m="${esc(m.id)}" style="--x: ${(+m.where.x).toFixed(4)}; --y: ${(+m.where.y).toFixed(4)}" aria-label="${i + 1}"><span>${i + 1}</span></button>` : '')).join('') : '';
  }

  function flash(id) {
    const d = dotsEl.querySelector(`.rvk-dot[data-m="${CSS.escape(id)}"]`);
    if (!d) return;
    d.classList.remove('is-flash'); void d.offsetWidth; d.classList.add('is-flash');
  }

  // ---- mark mode ---------------------------------------------------------------------------------
  function startMarking() {
    if (marking) return;
    closeCard();
    marking = true;
    layer.hidden = false;
    layer.querySelector('.rvk-hint').textContent = t('markHint');
    root.classList.add('is-marking');
  }
  function stopMarking() { marking = false; layer.hidden = true; root.classList.remove('is-marking'); }

  function cssPath(el) {
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.body && el !== document.documentElement && parts.length < 3) {
      let p = el.tagName.toLowerCase();
      if (el.id) { parts.unshift(`${p}#${CSS.escape(el.id)}`); break; }
      const cls = [...el.classList].filter((c) => !/^is-|^has-/.test(c)).slice(0, 2);
      if (cls.length) p += '.' + cls.map((c) => CSS.escape(c)).join('.');
      parts.unshift(p);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  function nearOf(el, cx, cy) {
    const V = window.ReviewView;
    if (V && typeof V.near === 'function') { try { const n = V.near(cx, cy); if (n) return cut(n, 60); } catch (e) { /* the page's own */ } }
    if (!el) return '';
    const own = el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title');
    if (own) return cut(own, 60);
    const txt = (el.innerText || el.textContent || '').trim();
    return txt && txt.length <= 120 ? cut(txt, 60) : '';
  }

  function currentView() {
    const h = document.documentElement.scrollHeight - innerHeight;
    const v = { scroll: h > 0 ? +(scrollY / h).toFixed(4) : 0, y: Math.round(scrollY), vh: innerHeight };
    if (location.hash && !/rv=/.test(location.hash)) v.hash = location.hash;
    const V = window.ReviewView;
    if (V && typeof V.get === 'function') { try { const s = V.get(); if (s != null) v.state = s; } catch (e) { /* the page's own */ } }
    return v;
  }

  layer.addEventListener('click', (e) => {
    const x = e.clientX / innerWidth, y = e.clientY / innerHeight;
    // what is under the click: look through the layer and the kit
    root.classList.add('is-looking');
    const under = document.elementFromPoint(e.clientX, e.clientY);
    root.classList.remove('is-looking');
    const el = under && !root.contains(under) ? under : null;
    pending = {
      kind: null, tags: [], phrases: [], text: '',
      where: { x: +x.toFixed(4), y: +y.toFixed(4), sel: el ? cssPath(el) : '', near: nearOf(el, e.clientX, e.clientY) },
      view: currentView(),
    };
    stopMarking();
    openCard(pending, false);
  });

  // ---- the card beside a dot ----------------------------------------------------------------
  function placeCard(where) {
    zone.style.setProperty('--x', (+where.x).toFixed(4));
    zone.style.setProperty('--y', (+where.y).toFixed(4));
    card.classList.toggle('is-left', where.x > 0.62);
    card.classList.toggle('is-up', where.y > 0.5);
  }

  function chipRow(kindList, chosen, k) {
    return (kindList || []).map((g) => `<button type="button" class="rvk-chipb" data-k="${k}" data-v="${esc(g.id)}" aria-pressed="${chosen.includes(g.id)}">${esc(pick(g))}</button>`).join('');
  }

  function openCard(m, readOnly) {
    placeCard(m.where);
    root.classList.add('has-card');
    card.hidden = false;
    card.classList.toggle('is-read', !!readOnly);
    if (readOnly) {
      peek = m.id;
      const i = marksOf().findIndex((x) => x.id === m.id);
      card.innerHTML = `<ol class="rvk-ms">${markLine(m, i)}</ol>`;
    } else {
      peek = null;
      $('.rvk-pend').hidden = false;
      card.innerHTML = `
        <div class="rvk-kind" role="group">
          <button type="button" class="rvk-kb is-like" data-k="kind" data-v="like" aria-pressed="${m.kind === 'like'}">${esc(t('like'))}</button>
          <button type="button" class="rvk-kb is-change" data-k="kind" data-v="change" aria-pressed="${m.kind === 'change'}">${esc(t('change'))}</button>
        </div>
        ${(M.tags || []).length ? `<div class="rvk-chipset">${chipRow(M.tags, m.tags, 'tag')}</div>` : ''}
        ${(M.phrases || []).length ? `<div class="rvk-chipset is-phr">${chipRow(M.phrases, m.phrases, 'phrase')}</div>` : ''}
        <input class="rvk-in rvk-text" type="text" placeholder="${esc(t('text'))}" value="${esc(m.text)}" enterkeyhint="done">
        <div class="rvk-act"><button type="button" class="rvk-save" data-k="save">${esc(t('save'))}</button><button type="button" class="rvk-w" data-k="cancel">${esc(t('cancel'))}</button></div>`;
      const first = card.querySelector('.rvk-kb');
      if (first) first.focus({ preventScroll: true });
    }
    card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in');
  }
  function closeCard() {
    pending = null; peek = null;
    $('.rvk-pend').hidden = true;
    card.hidden = true; card.innerHTML = '';
    root.classList.remove('has-card');
  }
  function saveCard() {
    if (!pending) return;
    const inp = card.querySelector('.rvk-text');
    if (inp) pending.text = inp.value.trim();
    const m = R.addMark(ID, pending);
    closeCard();
    if (!drawerOpen) setDrawer(true, false); else { drawDrawer(); drawBar(); }
    flash(m.id);
  }

  // ---- going back to a view ----------------------------------------------------------------------
  function restore(view) {
    if (!view) return Promise.resolve();
    const V = window.ReviewView;
    if (view.state != null && V && typeof V.set === 'function') {
      try { V.set(view.state); return Promise.resolve(); } catch (e) { /* fall back to the scroll */ }
    }
    if (view.hash && view.hash !== location.hash) location.hash = view.hash;
    const html = document.documentElement, was = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    let top;
    if (typeof view.y === 'number') top = view.y;
    else { const h = html.scrollHeight - innerHeight; top = (view.scroll || 0) * Math.max(0, h); }
    scrollTo({ top, left: 0, behavior: 'instant' });
    requestAnimationFrame(() => { html.style.scrollBehavior = was; });
    return Promise.resolve();
  }
  function goMark(id) {
    const m = marksOf().find((x) => x.id === id);
    if (!m) return;
    if (hideDots) { hideDots = false; drawDrawer(); }
    restore(m.view).then(() => setTimeout(() => flash(id), 60));
  }

  // ---- moving between versions -------------------------------------------------------------------
  function b64(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function step(dir, whole) {
    if (list.length < 2 || idx < 0) return;
    let target;
    if (whole || !me || !me.group) target = list[(idx + dir + list.length) % list.length];
    else { const g = groupList, j = g.indexOf(me); target = g[(j + dir + g.length) % g.length]; }
    if (!target || target === me) return;
    const v = currentView();
    // a view kept in the address only means something on a page of the same kind
    if (!(me && target.group && target.group === me.group)) delete v.hash;
    location.href = `${target.href}#rv=${b64(v)}`;
  }

  // ---- seen --------------------------------------------------------------------------------------
  // five seconds of him looking: the tab in front and the window focused. Never for a browser
  // driven by a script (Claude's own checks, headless Chrome), which would make "Not seen" lie.
  const DRIVEN = navigator.webdriver === true || /HeadlessChrome/.test(navigator.userAgent);
  let seenLeft = 5000, seenAt = 0, seenT = 0, seenOn = false;
  const looking = () => !document.hidden && document.hasFocus();
  function seenTick() {
    if (DRIVEN || seenLeft <= 0) return;
    if (seenOn) { seenLeft -= Date.now() - seenAt; seenOn = false; clearTimeout(seenT); }
    if (!looking()) return;
    seenOn = true; seenAt = Date.now();
    seenT = setTimeout(() => { seenOn = false; seenLeft = 0; R.setSeen(ID); }, Math.max(0, seenLeft));
  }
  document.addEventListener('visibilitychange', seenTick);
  addEventListener('focus', seenTick);
  addEventListener('blur', seenTick);

  // ---- keys ----------------------------------------------------------------------------------
  let keysT = 0;
  function showKeys() {
    keysEl.textContent = t('keys'); keysEl.hidden = false;
    clearTimeout(keysT); keysT = setTimeout(() => { keysEl.hidden = true; }, 4000);
  }
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') {
      const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      if (!card.hidden) { closeCard(); stop(); return; }
      if (marking) { stopMarking(); stop(); return; }
      if (drawerOpen && !typing(e.target)) { setDrawer(false); stop(); }
      return;
    }
    if (!card.hidden && pending && e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); saveCard(); return; }
    if (typing(e.target)) return;
    const k = e.key, code = e.code;
    let used = true;
    // , and . (with Shift, < and >) for the versions, B for the list: keys the pages themselves
    // leave free ([ ] and L belong to the atlas pages: trips and language)
    if (code === 'Comma' || k === ',' || k === '<') { showBar(); step(-1, e.shiftKey || k === '<'); }
    else if (code === 'Period' || k === '.' || k === '>') { showBar(); step(1, e.shiftKey || k === '>'); }
    else if (/^[1-5]$/.test(k) && !e.shiftKey) { R.setStars(ID, +k); redraw(); showBar(); }
    else if (k === 'n' || k === 'N') setDrawer(!drawerOpen);
    else if (k === 'm' || k === 'M') { if (marking) stopMarking(); else startMarking(); }
    else if (k === 'h' || k === 'H') { hideDots = !hideDots; try { sessionStorage.setItem('rvk-hide', hideDots ? '1' : '0'); } catch (er) { /* storage blocked */ } drawDrawer(); }
    else if ((k === 'b' || k === 'B') && OPT.back !== '' && list.length) location.href = hubHref();
    else if (k === '?') showKeys();
    else used = false;
    // the kit's key is the kit's alone: the page under it never sees it too
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // ---- clicks ------------------------------------------------------------------------------------
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b || !root.contains(b)) return;
    const k = b.dataset.k;
    if (k === 'prev') step(-1, e.shiftKey);
    else if (k === 'next') step(1, e.shiftKey);
    else if (k === 'score') { R.setStars(ID, +b.dataset.n); redraw(); const again = root.querySelector(`.${b.classList[0]}[data-n="${b.dataset.n}"]`); if (again) again.focus({ preventScroll: true }); }
    else if (k === 'notes') setDrawer(!drawerOpen);
    else if (k === 'mark') startMarking();
    else if (k === 'hide') { hideDots = !hideDots; drawDrawer(); }
    else if (k === 'go') goMark(b.dataset.m);
    else if (k === 'del') { R.removeMark(ID, b.dataset.m); closeCard(); redraw(); }
    else if (k === 'kind' && pending) { pending.kind = pending.kind === b.dataset.v ? null : b.dataset.v; card.querySelectorAll('.rvk-kb').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === pending.kind))); }
    else if ((k === 'tag' || k === 'phrase') && pending) {
      const arr = k === 'tag' ? pending.tags : pending.phrases, v = b.dataset.v, i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else arr.push(v);
      b.setAttribute('aria-pressed', String(i < 0));
    }
    else if (k === 'save') saveCard();
    else if (k === 'cancel') closeCard();
  });
  // a saved dot shows its card when pointed at or focused
  dotsEl.addEventListener('pointerover', (e) => { const d = e.target.closest('.rvk-dot'); if (d && !pending) { const m = marksOf().find((x) => x.id === d.dataset.m); if (m) openCard(m, true); } });
  dotsEl.addEventListener('focusin', (e) => { const d = e.target.closest('.rvk-dot'); if (d && !pending) { const m = marksOf().find((x) => x.id === d.dataset.m); if (m) openCard(m, true); } });
  dotsEl.addEventListener('pointerout', (e) => { if (peek && !card.contains(e.relatedTarget)) closeCard(); });
  card.addEventListener('pointerleave', () => { if (peek) closeCard(); });
  drawer.addEventListener('input', (e) => {
    if (e.target.id === 'rvk-overall') { R.item(ID).note = e.target.value; R.item(ID).noted = R.now(); R.save(ID); }
  });

  function redraw() { drawBar(); drawDrawer(); }
  R.on((k) => {
    if (k === 'pulled' || k === 'change') redraw();
    if (k === 'saved' || k === 'local') { const s = drawer.querySelector('.rvk-state'); if (s) s.textContent = t(k); }
  });

  // ---- the manifest and the start ------------------------------------------------------------
  function applyManifest(m) {
    if (!m || (OPT.name && m.name && m.name !== OPT.name)) return;
    M = m;
    RW.extend(m.words);
    if (m.theme && !document.getElementById('rvk-theme')) {
      const st = document.createElement('style');
      st.id = 'rvk-theme';
      st.textContent = `:root{${Object.entries(m.theme).filter(([k]) => /^--rv-[a-z0-9-]+$/.test(k)).map(([k, v]) => `${k}:${String(v).replace(/[;{}<]/g, '')}`).join(';')}}`;
      document.head.appendChild(st);
    }
    list = window.ReviewStore.ordered(m);
    me = list.find((x) => x.id === ID) || null;
    idx = me ? list.indexOf(me) : -1;
    groupList = me && me.group ? list.filter((x) => x.group === me.group) : list;
    list.forEach((x) => R.name(x.id, RW.pick('en', x.title)));
  }

  function start() {
    document.body.appendChild(root);
    root.classList.toggle('is-reduced', reduced);
    drawBar(); drawDrawer();
    showBar(3000);
    seenTick();
    // a page that names its own review file (data-name) has a list only if it says where (data-manifest)
    const mf = OPT.manifest || (OPT.name ? '' : 'review-manifest.json');
    (mf ? fetch(mf, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then((m) => {
      applyManifest(m);
      redraw();
      showBar(3000);
    });
    R.pull();
    const onLang = () => redraw();
    if (window.Kit && typeof window.Kit.onLang === 'function') window.Kit.onLang(onLang);
    new MutationObserver(onLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    // the view brought from the previous version: once the page is ready
    if (arriving) {
      const when = Date.now();
      const tryIt = () => {
        const V = window.ReviewView;
        if (arriving.state != null && !(V && V.set) && Date.now() - when < 8000) return setTimeout(tryIt, 200);
        if (arriving.hash) delete arriving.hash;   // already given to the page
        restore(arriving);
      };
      if (document.readyState === 'complete') setTimeout(tryIt, 600); else addEventListener('load', () => setTimeout(tryIt, 600));
    }
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
