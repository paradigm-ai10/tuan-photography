/* Version Review kit: the hub, a contact sheet of every version.

   <script src="review-kit/hub.js" data-manifest="review-manifest.json" data-mount="#main"></script>
   (after words.js and store.js; compare.js beside it for ?compare=a,b,c)

   Each version is a card: its still (made by review_thumbs.py; a numbered paper block until then),
   his marks as dots on it, the score as five squares he can press here, the count of marks, the
   last thing he wrote. Filters, sort, "Keeps saying" (what he says most, counted), group notes,
   and the versions no longer on the list, folded and read-only. The versions Claude asks him to
   score this round (manifest "ask") are listed at the top and framed on the sheet until scored.
   With a round (manifest "round", else "ask"), the sheet shows this round only; earlier rounds wait
   behind their own word at the top, so nothing old is mixed in with what he is judging now. */
(() => {
  'use strict';
  const SCRIPT = document.currentScript;
  const OPT = (SCRIPT && SCRIPT.dataset) || {};
  const RW = window.ReviewWords;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // when a group (one round of versions) was built: manifest group "built": "2026-11-10T14:30"
  const builtAt = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(s));
    if (!m) return '';
    const [, y, mo, d, hh, mm] = m;
    const time = hh ? `${hh}:${mm}` : '';
    if (lang() === 'zh') return t('built', { d: `${y}年${+mo}月${+d}日${time ? ' ' + time : ''}` });
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+mo - 1];
    return t('built', { d: `${+d} ${mon} ${y}${time ? ', ' + time : ''}` });
  };
  const lang = () => {
    const k = window.Kit && window.Kit.lang;
    if (k === 'zh' || k === 'en') return k;
    return /^zh/i.test(document.documentElement.lang || '') ? 'zh' : 'en';
  };
  const t = (k, v) => RW.t(lang(), k, v);
  const pick = (v) => RW.pick(lang(), v);
  const typing = (el) => el && el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');

  let M = null, R = null, list = [], stills = {}, mount = null;
  const ui = { filter: 0, sort: 0, scroll: 0, earlier: false, keeps: false, by: null, picked: null, open: {}, view: 'now' };
  const MAXPICK = () => (window.ReviewCompare && window.ReviewCompare.MAX) || 6;
  const KEY = () => `rv-hub-${M.name}`;
  function remember() {
    try { localStorage.setItem(KEY(), JSON.stringify({ filter: ui.filter, sort: ui.sort, scroll: Math.round(scrollY), earlier: ui.earlier })); } catch (e) { /* storage blocked */ }
  }

  const itemOf = (id) => (R.data.items || {})[id] || {};
  const starsOf = (id) => itemOf(id).stars || 0;
  const liked = (id) => { const it = itemOf(id); return it.stars ? it.stars >= 4 : it.verdict === 'good'; };
  const away = (id) => { const it = itemOf(id); return it.stars ? it.stars <= 2 : it.verdict === 'bad'; };
  // a version he scored or wrote about has been seen, even from before the kit kept "seen"
  const seen = (id) => { const it = itemOf(id); return !!(it.seen || it.stars || it.verdict || it.note || (it.pins || []).length || (it.marks || []).length); };
  // this round's versions Claude wants him to look at and score: {"ask": {"ids": [...], "question": {...}}}
  const askIds = () => (M && M.ask && Array.isArray(M.ask.ids) ? M.ask.ids.filter((id) => list.some((v) => v.id === id)) : []);
  const asked = (id) => askIds().includes(id);
  const scored = (id) => { const it = itemOf(id); return !!(it.stars || it.verdict); };
  const stillUrl = (id) => (stills[id] && M.stills ? `${M.stills}${id}.jpg?v=${encodeURIComponent(stills[id].taken || '')}` : '');
  const scoreWord = (id) => {
    const it = itemOf(id);
    if (it.stars) return t('scores')[it.stars];
    if (it.verdict === 'good') return t('scores')[4];
    if (it.verdict === 'bad') return t('scores')[1];
    return t('unscored');
  };
  const marksCount = (n) => (n === 1 ? t('mark1') : t('marks', { n }));
  const tagWord = (id) => { const x = (M.tags || []).find((g) => g.id === id); return x ? pick(x) : id; };
  const phraseWord = (id) => { const x = (M.phrases || []).find((g) => g.id === id); return x ? pick(x) : id; };

  function lastWords(id) {
    const it = itemOf(id);
    const ms = R.marksOf(id).filter((m) => m.text).sort((a, b) => String(b.when).localeCompare(String(a.when)));
    if (ms.length && (!it.note || String(ms[0].when) > String(it.noted || ''))) return ms[0].text;
    return it.note || (ms[0] && ms[0].text) || '';
  }

  // this round and the earlier ones: the sheet shows one at a time when there is a round
  const hasRound = () => list.some((v) => !v.now);
  const pool = () => (hasRound() ? list.filter((v) => (ui.view === 'earlier' ? !v.now : v.now)) : list);

  // what "Keeps saying" counts: each phrase and tag, split by Like and Change
  function sayings() {
    const out = new Map();
    pool().forEach((v) => R.marksOf(v.id).forEach((m) => {
      const kind = m.kind || '';
      (m.phrases || []).forEach((p) => {
        const tagsOf = (m.tags || []).length ? m.tags : [''];
        tagsOf.forEach((g) => {
          const k = `${kind}|p:${p}|${g}`;
          const o = out.get(k) || { kind, p, g, n: 0, ids: new Set() };
          o.n++; o.ids.add(v.id); out.set(k, o);
        });
      });
      if (!(m.phrases || []).length) (m.tags || []).forEach((g) => {
        const k = `${kind}|t:${g}`;
        const o = out.get(k) || { kind, p: '', g, n: 0, ids: new Set() };
        o.n++; o.ids.add(v.id); out.set(k, o);
      });
    }));
    return [...out.values()].sort((a, b) => b.n - a.n);
  }

  function matches(v) {
    if (ui.by) return ui.by.has(v.id);
    if (ui.filter === 1) return !seen(v.id);
    if (ui.filter === 2) return liked(v.id);
    if (ui.filter === 3) return away(v.id);
    if (ui.filter === 4) return asked(v.id);
    return true;
  }
  function sorted(vs) {
    const out = vs.slice();
    if (ui.sort === 1) out.sort((a, b) => (starsOf(b.id) || (liked(b.id) ? 3.5 : 0)) - (starsOf(a.id) || (liked(a.id) ? 3.5 : 0)) || a.n - b.n);
    if (ui.sort === 2) out.sort((a, b) => R.lastNoted(b.id).localeCompare(R.lastNoted(a.id)) || a.n - b.n);
    return out;
  }

  // ---- one card --------------------------------------------------------------------------------
  function card(v) {
    const it = itemOf(v.id), s = it.stars || 0, ms = R.marksOf(v.id), title = pick(v.title), src = stillUrl(v.id);
    const dots = ms.filter((m) => m.where).map((m) => `<span class="rvh-pin${m.kind ? ` is-${m.kind}` : ''}" style="--x: ${(+m.where.x).toFixed(4)}; --y: ${(+m.where.y).toFixed(4)}"></span>`).join('');
    const last = lastWords(v.id);
    const picked = !!ui.picked && ui.picked.includes(v.id);
    // while choosing, the picture itself says it is chosen, and in what order
    // otherwise a version he is asked to score carries "Your pick" until he scores it
    const ask = !ui.picked && asked(v.id), done = ask && scored(v.id);
    const tag = ui.picked ? (picked ? `<span class="rvh-chosen">${esc(t('chosenN', { n: ui.picked.indexOf(v.id) + 1 }))}</span>` : `<span class="rvh-choose">${esc(t('choose'))}</span>`)
      : ask ? `<span class="rvh-asktag${done ? ' is-done' : ''}">${esc(t(done ? 'askDoneTag' : 'askTag'))}</span>` : '';
    return `<article class="rvh-card${liked(v.id) ? ' is-liked' : ''}${away(v.id) ? ' is-low' : ''}${ui.picked ? ' is-choosing' : ''}${picked ? ' is-picked' : ''}${ask && !done ? ' is-ask' : ''}${v.out ? ' is-out' : ''}" id="v-${esc(v.id)}" data-id="${esc(v.id)}">
      <a class="rvh-still" href="${esc(v.href)}" tabindex="-1" aria-hidden="true">
        ${src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" width="960" height="600">` : `<span class="rvh-blank"><span>${v.n}</span><small>${esc(t('noStill'))}</small></span>`}
        ${dots}${tag}${v.out ? `<svg class="rvh-x" viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden="true"><path d="M7 6 C 30 20, 62 40, 94 57"/><path d="M92 5 C 66 22, 38 40, 6 58"/></svg>` : ''}
      </a>
      <div class="rvh-meta">
        <h3 class="rvh-name"><a href="${esc(v.href)}"><span class="rvh-num">${v.n}</span>${esc(title)}</a></h3>
        ${v.main ? `<p class="rvh-main">${esc(t('main'))}</p>` : ''}
        ${v.out ? `<p class="rvh-out">${esc(t('out'))}</p>` : ''}
        <div class="rvh-line">
          <span class="rvh-sc" role="group" aria-label="${esc(t('score'))}: ${esc(title)}">${[1, 2, 3, 4, 5].map((k) =>
            `<button type="button" class="rvh-sq" data-h="score" data-n="${k}" aria-pressed="${s === k}" title="${esc(t('scores')[k])}" aria-label="${k}, ${esc(t('scores')[k])}"></button>`).join('')}</span>
          <span class="rvh-sw">${esc(scoreWord(v.id))}</span>
          ${ms.length ? `<span class="rvh-mc">${esc(marksCount(ms.length))}</span>` : ''}
          ${seen(v.id) ? '' : `<span class="rvh-ns">${esc(t('notSeen'))}</span>`}
        </div>
        ${last ? `<p class="rvh-last">${esc(last)}</p>` : ''}
        <p class="rvh-acts">
          <a class="rvh-w" href="${esc(v.href)}">${esc(t('open'))}</a>
          <button type="button" class="rvh-w" data-h="what" aria-expanded="${!!ui.open[v.id]}">${esc(ui.open[v.id] ? t('less') : t('what'))}</button>
          <button type="button" class="rvh-w${picked ? ' is-on' : ''}" data-h="cmp"${ui.picked ? ` aria-pressed="${picked}"` : ''}>${esc(ui.picked ? (picked ? t('chosen') : t('choose')) : t('compare'))}</button>
        </p>
        ${ui.open[v.id] ? `<p class="rvh-desc">${esc(pick(v.desc))}</p>` : ''}
        <textarea class="rvh-cn" data-id="${esc(v.id)}" rows="2" placeholder="${esc(t('cardNote'))}" aria-label="${esc(t('cardNote'))}: ${esc(title)}">${esc(it.note || '')}</textarea>
      </div>
    </article>`;
  }

  function earlierCard(id) {
    const it = itemOf(id), ms = R.marksOf(id), name = (R.data.names || {})[id] || id;
    return `<article class="rvh-card is-earlier${away(id) ? ' is-low' : ''}" data-id="${esc(id)}">
      <div class="rvh-meta">
        <h3 class="rvh-name"><span>${esc(name)}</span></h3>
        <div class="rvh-line"><span class="rvh-sw">${esc(scoreWord(id))}</span>${ms.length ? `<span class="rvh-mc">${esc(marksCount(ms.length))}</span>` : ''}</div>
        ${it.note ? `<p class="rvh-last is-full">${esc(it.note)}</p>` : ''}
      </div></article>`;
  }

  // ---- the page --------------------------------------------------------------------------------
  function render() {
    if (!M) return;
    if (/[?&]compare=/.test(location.search) && window.ReviewCompare) {
      return window.ReviewCompare.render({ R, M, list, t, pick, esc, stillUrl, mount, lang, back: hubBack });
    }
    document.title = `${pick(M.title)}${M.siteTitle ? ` · ${M.siteTitle}` : ''}`;
    const filters = t('filters'), sorts = t('sorts');
    const groups = (M.groups && M.groups.length ? M.groups : [{ id: '', title: '' }]);
    const say = ui.keeps ? sayings() : [];
    const known = new Set(list.map((v) => v.id));
    const earlier = Object.keys(R.data.items || {}).filter((id) => !known.has(id) && !id.startsWith('*'));
    const vsAll = pool(), past = hasRound() && ui.view === 'earlier';
    let shown = 0;
    const groupHtml = groups.map((g) => {
      const vs = sorted(vsAll.filter((v) => (v.group || '') === (g.id || '') || (!g.id && !v.group)));
      if (!vs.length) return '';
      const vis = vs.filter(matches);
      shown += vis.length;
      const note = (R.data.groupNotes || {})[g.id] || '';
      return `<section class="rvh-group" data-g="${esc(g.id)}">
        <header class="rvh-gh">
          ${g.title ? `<h2 class="rvh-gt">${esc(pick(g.title))}</h2>` : ''}
          <span class="rvh-gc">${esc(vs.length === 1 ? t('version1') : t('versions', { n: vs.length }))}</span>
          ${g.built ? `<span class="rvh-gc rvh-gb">${esc(builtAt(g.built))}</span>` : ''}
          ${g.id ? `<input class="rvh-gn" type="text" data-g="${esc(g.id)}" value="${esc(note)}" placeholder="${esc(t('groupNote'))}" aria-label="${esc(t('groupNote'))}: ${esc(pick(g.title))}">` : ''}
        </header>
        ${vis.length ? `<div class="rvh-grid">${vis.map(card).join('')}</div>` : ''}
      </section>`;
    }).join('');

    mount.innerHTML = `<div class="rvh">
      <header class="rvh-top">
        <h1 class="rvh-title">${esc(pick(M.title))}</h1>
        ${M.intro ? `<p class="rvh-intro">${esc(pick(M.intro))}</p>` : ''}
      </header>
      ${hasRound() ? `<nav class="rvh-views" aria-label="${esc(t('viewNow'))} / ${esc(t('viewEarlier'))}">${['now', 'earlier'].map((k) => {
          const n = list.filter((v) => (k === 'now' ? v.now : !v.now)).length;
          return `<button type="button" class="rvh-view" data-h="view" data-v="${k}" aria-pressed="${ui.view === k}">${esc(t(k === 'now' ? 'viewNow' : 'viewEarlier'))} <span class="rvh-gc">${n}</span></button>`;
        }).join('')}</nav>` : ''}
      ${past ? `<p class="rvh-intro">${esc(t('viewEarlierNote'))}</p>` : askBox()}
      <div class="rvh-tools">
        <span class="rvh-tg" role="group" aria-label="${esc(t('filterLabel'))}">${filters.map((f, i) => `<button type="button" class="rvh-w" data-h="filter" data-i="${i}" aria-pressed="${!ui.by && ui.filter === i}">${esc(f)}</button>`).join('')}${askIds().length ? `<button type="button" class="rvh-w" data-h="filter" data-i="4" aria-pressed="${!ui.by && ui.filter === 4}">${esc(t('askTag'))}</button>` : ''}</span>
        <span class="rvh-tg" role="group" aria-label="${esc(t('sortLabel'))}">${sorts.map((f, i) => `<button type="button" class="rvh-w" data-h="sort" data-i="${i}" aria-pressed="${ui.sort === i}">${esc(f)}</button>`).join('')}</span>
        <span class="rvh-tg">
          <button type="button" class="rvh-w" data-h="pick" aria-pressed="${!!ui.picked}">${esc(t('compareSome'))}</button>
          <button type="button" class="rvh-w" data-h="keeps" aria-expanded="${ui.keeps}">${esc(t('keeps'))}</button>
        </span>
      </div>
      ${ui.picked ? `<p class="rvh-banner is-pick">${esc(ui.picked.length ? t('pickedList', { list: ui.picked.map((id) => { const x = list.find((y) => y.id === id); return x ? x.n : id; }).join(', ') }) : t('pickSome'))}${ui.picked.length >= MAXPICK() ? ` <span class="rvh-quiet">${esc(t('pickMax'))}</span>` : ''}
        ${ui.picked.length >= 2 ? `<button type="button" class="rvh-go" data-h="sbs">${esc(t('showSide', { n: ui.picked.length }))}</button>` : ''}
        <button type="button" class="rvh-w" data-h="unpick">${esc(t('pickCancel'))}</button></p>` : ''}
      ${ui.by ? `<p class="rvh-banner">${esc(ui.byLabel || '')} <button type="button" class="rvh-w" data-h="clear">${esc(t('clearFilter'))}</button></p>` : ''}
      ${ui.keeps ? `<div class="rvh-keeps">${say.length ? ['like', 'change', ''].map((kind) => {
          const rows = say.filter((x) => x.kind === kind);
          if (!rows.length) return '';
          const head = kind === 'like' ? t('like') : kind === 'change' ? t('change') : t('earlierPin');
          return `<div class="rvh-kcol is-${kind || 'none'}"><p class="rvh-kh">${esc(kind ? head : '')}</p><ul>${rows.slice(0, 8).map((x, i) =>
            `<li><button type="button" class="rvh-kb" data-h="by" data-kind="${esc(kind)}" data-i="${say.indexOf(x)}">${esc(sayingText(x))}</button></li>`).join('')}</ul></div>`;
        }).join('') : `<p class="rvh-none">${esc(t('keepsNone'))}</p>`}</div>` : ''}
      ${groupHtml}
      ${shown ? '' : `<p class="rvh-none">${esc(t('nothingHere'))}</p>`}
      ${earlier.length && (!hasRound() || past) ? `<details class="rvh-earlier"${ui.earlier ? ' open' : ''}>
        <summary><span class="rvh-gt">${esc(t('earlier'))}</span> <span class="rvh-gc">${esc(earlier.length === 1 ? t('version1') : t('versions', { n: earlier.length }))}</span></summary>
        <p class="rvh-intro">${esc(t('earlierNote'))}</p>
        <div class="rvh-grid is-small">${earlier.map(earlierCard).join('')}</div>
      </details>` : ''}
      <footer class="rvh-foot">
        <label class="rvh-lab" for="rvh-general">${esc(t('general'))}</label>
        <textarea class="rvh-in" id="rvh-general" rows="2"></textarea>
        <p class="rvh-state" role="status" aria-live="polite">${R.status ? esc(t(R.status)) : ''}</p>
        ${Object.keys(stills).length < list.length ? `<p class="rvh-quiet">${esc(t('refresh'))}</p>` : ''}
      </footer>
    </div>`;
    const g = mount.querySelector('#rvh-general');
    if (g) g.value = R.data.general || '';
    ui._say = say;
  }

  // the top of the list: what Claude asks this round, and which of those versions still wait for a score
  function askBox() {
    const ids = askIds();
    if (!ids.length) return '';
    const vs = list.filter((v) => ids.includes(v.id)), left = vs.filter((v) => !scored(v.id)).length;
    return `<section class="rvh-ask${left ? '' : ' is-done'}" aria-label="${esc(t('askTitle'))}">
      <p class="rvh-askh">${esc(t('askTitle'))}</p>
      ${M.ask.question ? `<p class="rvh-askq">${esc(pick(M.ask.question))}</p>` : ''}
      <ol class="rvh-askl">${vs.map((v) => `<li><a class="rvh-aska${scored(v.id) ? ' is-done' : ''}" href="${esc(v.href)}"><span class="rvh-num">${v.n}</span><span class="rvh-askn">${esc(pick(v.title))}</span><span class="rvh-asks">${esc(scoreWord(v.id))}</span></a></li>`).join('')}</ol>
      <p class="rvh-askf"><span>${esc(left ? t('askLeft', { n: left, total: vs.length }) : t('askDone'))}</span>
        <button type="button" class="rvh-w" data-h="filter" data-i="4" aria-pressed="${!ui.by && ui.filter === 4}">${esc(t('askOnly'))}</button></p>
    </section>`;
  }

  function sayingText(x) {
    const what = x.p ? phraseWord(x.p) : tagWord(x.g);
    const on = x.p && x.g ? (lang() === 'zh' ? `（${tagWord(x.g)}）` : ` on ${tagWord(x.g)}`) : '';
    return `${what} ×${x.n}${on}`;
  }

  function hubBack(id) {
    const u = location.pathname + (id ? `#v-${id}` : '');
    location.href = u;
  }

  // a redraw that keeps his place and whatever he is typing in
  function redraw() {
    const a = document.activeElement;
    if (a && mount.contains(a) && typing(a)) return;
    const y = scrollY;
    const focusSel = a && mount.contains(a) && a.dataset ? (a.dataset.h ? `[data-h="${a.dataset.h}"]${a.dataset.n ? `[data-n="${a.dataset.n}"]` : ''}${a.dataset.i ? `[data-i="${a.dataset.i}"]` : ''}` : '') : '';
    const cardId = a && a.closest && a.closest('.rvh-card') ? a.closest('.rvh-card').dataset.id : '';
    render();
    scrollTo({ top: y, behavior: 'instant' });
    if (focusSel) {
      const scope = cardId ? mount.querySelector(`.rvh-card[data-id="${CSS.escape(cardId)}"]`) : mount;
      const el = scope && scope.querySelector(focusSel);
      if (el) el.focus({ preventScroll: true });
    }
  }

  // ---- what he does ------------------------------------------------------------------------------
  function choose(id) {
    const i = ui.picked.indexOf(id);
    if (i >= 0) ui.picked.splice(i, 1);
    else if (ui.picked.length < MAXPICK()) ui.picked.push(id);
    redraw();
  }

  document.addEventListener('click', (e) => {
    if (!mount || !mount.contains(e.target)) return;
    // while choosing, a tap on a picture chooses it instead of opening it
    const still = ui.picked && e.target.closest('.rvh-card .rvh-still');
    if (still) { e.preventDefault(); choose(still.closest('.rvh-card').dataset.id); return; }
    const b = e.target.closest('[data-h]');
    if (!b) return;
    const k = b.dataset.h, c = b.closest('.rvh-card'), id = c && c.dataset.id;
    if (k === 'score') { R.setStars(id, +b.dataset.n); redraw(); }
    else if (k === 'filter') { ui.filter = +b.dataset.i; ui.by = null; remember(); redraw(); }
    else if (k === 'sort') { ui.sort = +b.dataset.i; remember(); redraw(); }
    else if (k === 'what') { ui.open[id] = !ui.open[id]; redraw(); }
    else if (k === 'keeps') { ui.keeps = !ui.keeps; redraw(); }
    else if (k === 'pick') { ui.picked = ui.picked ? null : []; redraw(); }
    else if (k === 'unpick') { ui.picked = null; redraw(); }
    else if (k === 'sbs') { location.href = `${location.pathname}?compare=${ui.picked.map(encodeURIComponent).join(',')}`; }
    else if (k === 'clear') { ui.by = null; redraw(); }
    else if (k === 'view') { ui.view = b.dataset.v === 'earlier' ? 'earlier' : 'now'; ui.by = null; ui.keeps = false; render(); scrollTo({ top: 0, behavior: 'instant' }); }
    else if (k === 'by') {
      const x = (ui._say || [])[+b.dataset.i];
      if (x) { ui.by = x.ids; ui.byLabel = sayingText(x); redraw(); scrollTo({ top: 0, behavior: 'instant' }); }
    }
    else if (k === 'cmp') {
      if (!ui.picked) { ui.picked = [id]; redraw(); }
      else choose(id);
    }
  });
  document.addEventListener('toggle', (e) => {
    if (e.target.classList && e.target.classList.contains('rvh-earlier')) { ui.earlier = e.target.open; remember(); }
  }, true);
  document.addEventListener('input', (e) => {
    if (!mount || !mount.contains(e.target)) return;
    if (e.target.id === 'rvh-general') R.setGeneral(e.target.value);
    else if (e.target.classList.contains('rvh-gn')) R.setGroupNote(e.target.dataset.g, e.target.value);
    else if (e.target.classList.contains('rvh-cn')) R.setNote(e.target.dataset.id, e.target.value);   // the note on one version, the same one its page's Notes drawer shows
  });
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || /[?&]compare=/.test(location.search)) return;
    if (e.key === 'Escape' && (ui.by || ui.filter || ui.picked)) { ui.by = null; ui.filter = 0; ui.picked = null; remember(); redraw(); }
    if (e.key === '?') { const q = document.createElement('p'); q.className = 'rvh-keys'; q.textContent = t('keysHub'); document.body.appendChild(q); setTimeout(() => q.remove(), 4000); }
  });
  let scrollT = 0;
  addEventListener('scroll', () => { clearTimeout(scrollT); scrollT = setTimeout(remember, 300); }, { passive: true });

  // ---- the start ---------------------------------------------------------------------------------
  function start() {
    mount = document.querySelector(OPT.mount || '#main') || document.body;
    fetch(OPT.manifest || 'review-manifest.json', { cache: 'no-store' }).then((r) => r.json()).then((m) => {
      M = m;
      RW.extend(m.words);
      if (m.theme && !document.getElementById('rvk-theme')) {
        const st = document.createElement('style');
        st.id = 'rvk-theme';
        st.textContent = `:root{${Object.entries(m.theme).filter(([k]) => /^--rv-[a-z0-9-]+$/.test(k)).map(([k, v]) => `${k}:${String(v).replace(/[;{}<]/g, '')}`).join(';')}}`;
        document.head.appendChild(st);
      }
      R = window.ReviewStore.open(m.name, { endpoint: m.endpoint });
      window.Review = window.Review || R;
      list = window.ReviewStore.ordered(m);
      list.forEach((v) => R.name(v.id, RW.pick('en', v.title)));
      // ?pick=a,b: back from side by side to choose one more, with those already chosen
      const pk = new URLSearchParams(location.search).get('pick');
      if (pk != null) ui.picked = pk.split(',').filter((id) => list.some((v) => v.id === id)).slice(0, MAXPICK());
      try { const k = JSON.parse(localStorage.getItem(KEY())) || {}; ui.filter = k.filter | 0; ui.sort = k.sort | 0; ui.scroll = k.scroll | 0; ui.earlier = !!k.earlier; } catch (e) { /* storage blocked */ }
      if (ui.filter === 4 && !askIds().length) ui.filter = 0;
      const thumbs = m.stills ? fetch(`${m.stills}thumbs.json`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})) : Promise.resolve({});
      return Promise.all([thumbs, R.pull()]);
    }).then(([th]) => {
      stills = th || {};
      // back from a version: its card in view and outlined; otherwise where he was
      const h = /^#v-(.+)$/.exec(location.hash);
      // back from an earlier round's version: the earlier rounds are what he was looking at
      if (h && list.some((v) => v.id === decodeURIComponent(h[1]) && !v.now)) ui.view = 'earlier';
      render();
      const el = h && document.getElementById(`v-${decodeURIComponent(h[1])}`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        el.classList.add('is-back');
        setTimeout(() => el.classList.remove('is-back'), 1200);
      } else if (ui.scroll && !/[?&]compare=/.test(location.search)) scrollTo({ top: ui.scroll, behavior: 'instant' });
      R.on((k) => {
        if (k === 'pulled') redraw();
        if (k === 'saved' || k === 'local') { const s = mount.querySelector('.rvh-state'); if (s) s.textContent = t(k); }
      });
      addEventListener('pageshow', (e) => { if (e.persisted) R.pull(); });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) R.pull(); });
      const onLang = () => redraw();
      if (window.Kit && typeof window.Kit.onLang === 'function') window.Kit.onLang(onLang);
      new MutationObserver(onLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    });
  }
  window.ReviewHub = { redraw: () => redraw() };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
