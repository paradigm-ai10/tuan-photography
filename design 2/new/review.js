/* The review kit (2026-10-29): what he thinks of each Journey version, written where he sees it.
   window.Review is the store, shared with the review page (choose.js): every save reads the file on
   his Mac first and changes only the versions touched here, so two open tabs never wipe each other.
   On a version page it also draws the Note tab: a 1 to 5 score, a note, and "moments", a line
   pinned to the place on the page where he wrote it. Shown only on his own Mac (localhost), never
   on the public site. */
(() => {
  'use strict';
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const NAME = 'journey';
  const KEY = 'journey-review';
  const URL_ = `/__reviews/${NAME}`;

  // ---- the store ----------------------------------------------------------------------------
  let mine = { items: {} };
  try { mine = JSON.parse(localStorage.getItem(KEY)) || mine; } catch (e) { /* storage blocked */ }
  mine.items = mine.items || {};
  const dirty = new Set();
  let general = false, timer = 0;
  const listeners = [];

  const item = (id) => (mine.items[id] = mine.items[id] || {});
  // the old Good / Not for me words follow the score, so older notes and the put-away rule still hold
  const verdictOf = (s) => (s >= 4 ? 'good' : s && s <= 2 ? 'bad' : '');

  function pull() {
    return fetch(URL_).then((r) => r.json()).then((d) => {
      if (d && d.items) {
        // keep what is waiting to be saved here; everything else comes from the file
        dirty.forEach((id) => { d.items[id] = mine.items[id]; });
        if (general) d.general = mine.general;
        d.names = Object.assign({}, d.names, mine.names);
        mine = d;
        try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (e) { /* storage blocked */ }
        listeners.forEach((f) => f('pulled'));
      }
    }).catch(() => { /* no server notes yet */ });
  }

  function save(id) {
    if (id === '*general') general = true; else if (id) dirty.add(id);
    try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (e) { /* storage blocked */ }
    clearTimeout(timer);
    timer = setTimeout(push, 500);
  }

  function push() {
    fetch(URL_).then((r) => r.json()).catch(() => ({})).then((d) => {
      d = d && typeof d === 'object' ? d : {};
      d.items = d.items || {};
      dirty.forEach((id) => { d.items[id] = mine.items[id]; });
      if (general) d.general = mine.general;
      d.names = Object.assign({}, d.names, mine.names);
      const sent = new Set(dirty);
      return fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
        .then((r) => {
          if (!r.ok) throw new Error('not saved');
          sent.forEach((id) => dirty.delete(id));
          general = false;
          mine = Object.assign(d, { items: Object.assign(d.items, mine.items) });
          listeners.forEach((f) => f('saved'));
        });
    }).catch(() => listeners.forEach((f) => f('local')));
  }

  window.Review = {
    get data() { return mine; },
    item, save, pull, verdictOf,
    on: (f) => listeners.push(f),
    setScore(id, s) { const it = item(id); it.stars = it.stars === s ? 0 : s; it.verdict = verdictOf(it.stars); save(id); },
    name(id, en) { mine.names = mine.names || {}; mine.names[id] = en; },
  };

  // ---- the Note tab on a version page ---------------------------------------------------------
  const page = document.body && document.body.classList.contains('journey');
  if (!LOCAL || !page) return;
  const ID = (location.pathname.split('/').pop() || 'journey.html').replace('.html', '');

  const WORDS = {
    en: {
      tab: 'Note', title: 'Your notes', score: 'Score', scores: ['', 'Not for me', 'Weak', 'Fine', 'Good', 'Love it'],
      moment: 'Like something? Say what, it pins to this spot', pin: 'Pin it', moments: 'Moments', none: 'No moments yet. Scroll to something you notice and pin a line.',
      note: 'Overall', noteHint: 'What to keep, what to change', go: 'Go there', del: 'Remove', close: 'Close',
      saved: 'Saved. Claude can read it.', local: 'Saved in this browser only', saving: 'Saving', back: 'All versions',
      at: (p) => `${p}% down`,
    },
    zh: {
      tab: '筆記', title: '你的筆記', score: '分數', scores: ['', '不要', '普通偏弱', '還可以', '喜歡', '超喜歡'],
      moment: '看到喜歡的？寫一句，會釘在這個位置', pin: '釘上', moments: '片刻', none: '還沒有。捲到你注意到的地方，寫一句釘上。',
      note: '整體', noteHint: '要留什麼、要改什麼', go: '回到那裡', del: '刪掉', close: '關上',
      saved: '已存，Claude 讀得到。', local: '只存在這個瀏覽器', saving: '存檔中', back: '所有版本',
      at: (p) => `往下 ${p}%`,
    },
  };
  const lang = () => (window.Kit && window.Kit.lang) || (document.documentElement.lang === 'zh-Hant' ? 'zh' : 'en');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const depth = () => { const h = document.documentElement.scrollHeight - innerHeight; return h > 0 ? scrollY / h : 0; };
  // what the page is showing, in its own words: the trip being read, if any
  const showing = () => {
    const on = document.querySelector('.jr-trip.is-reading .jr-trip__title');
    return on ? on.textContent.trim().slice(0, 80) : '';
  };

  const box = document.createElement('aside');
  box.className = 'rv';
  box.setAttribute('aria-label', 'Review');
  document.body.appendChild(box);
  let open = false;
  try { open = sessionStorage.getItem('rv-open') === '1'; } catch (e) { /* storage blocked */ }

  function draw() {
    const w = WORDS[lang()], it = item(ID), s = it.stars || 0, pins = it.pins || [];
    box.classList.toggle('is-open', open);
    box.innerHTML = `
      <button type="button" class="rv__tab" aria-expanded="${open}" aria-controls="rv-panel">${esc(w.tab)}${s ? ` <span class="rv__tab-s">${s}</span>` : ''}${pins.length ? ` <span class="rv__tab-n">· ${pins.length}</span>` : ''}</button>
      <div class="rv__panel" id="rv-panel" ${open ? '' : 'hidden'}>
        <div class="rv__head"><span class="rv__h">${esc(w.title)}</span><a class="rv__back" href="index.html#v-${ID}">${esc(w.back)}</a><button type="button" class="rv__x" data-rv="close">${esc(w.close)}</button></div>
        <div class="rv__score" role="group" aria-label="${esc(w.score)}">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="rv__n" data-rv="score" data-n="${n}" aria-pressed="${s === n}" title="${esc(w.scores[n])}">${n}</button>`).join('')}
        </div>
        <p class="rv__said">${s ? esc(w.scores[s]) : '&nbsp;'}</p>
        <form class="rv__pinform" data-rv="pin">
          <textarea class="rv__in" id="rv-moment" rows="2" placeholder="${esc(w.moment)}"></textarea>
          <button type="submit" class="rv__pin">${esc(w.pin)}</button>
        </form>
        <p class="rv__label">${esc(w.moments)}</p>
        <ol class="rv__pins">${pins.length ? pins.map((p, i) => `
          <li class="rv__p"><p class="rv__pt">${esc(p.text)}</p>
            <p class="rv__pm">${esc(w.at(Math.round((p.at || 0) * 100)))}${p.view ? `, ${esc(p.view)}` : ''}
              <button type="button" class="rv__w" data-rv="go" data-i="${i}">${esc(w.go)}</button>
              <button type="button" class="rv__w" data-rv="del" data-i="${i}">${esc(w.del)}</button></p></li>`).join('') : `<li class="rv__none">${esc(w.none)}</li>`}</ol>
        <label class="rv__label" for="rv-note">${esc(w.note)}</label>
        <textarea class="rv__in" id="rv-note" rows="3" placeholder="${esc(w.noteHint)}">${esc(it.note || '')}</textarea>
        <p class="rv__state" role="status" aria-live="polite"></p>
      </div>`;
  }
  const state = (k) => { const el = box.querySelector('.rv__state'); if (el) el.textContent = WORDS[lang()][k] || ''; };
  const goTo = (at) => { const h = document.documentElement.scrollHeight - innerHeight; scrollTo({ top: at * h, behavior: 'smooth' }); };
  function setOpen(v) {
    open = v;
    try { sessionStorage.setItem('rv-open', v ? '1' : '0'); } catch (e) { /* storage blocked */ }
    draw();
    if (v) box.querySelector('#rv-moment').focus();
  }
  function pin() {
    const t = box.querySelector('#rv-moment'), text = t.value.trim();
    if (!text) { t.focus(); return; }
    const it = item(ID);
    it.pins = it.pins || [];
    it.pins.push({ text, at: +depth().toFixed(3), view: showing(), when: new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16).replace('T', ' ') });
    it.seen = true;
    save(ID);
    draw();
    box.querySelector('#rv-moment').focus();
  }

  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rv], .rv__tab');
    if (!b) return;
    if (b.classList.contains('rv__tab')) return setOpen(!open);
    const k = b.dataset.rv, it = item(ID);
    if (k === 'close') setOpen(false);
    else if (k === 'score') { window.Review.setScore(ID, +b.dataset.n); draw(); }
    else if (k === 'go') goTo(it.pins[+b.dataset.i].at);
    else if (k === 'del') { it.pins.splice(+b.dataset.i, 1); save(ID); draw(); }
  });
  box.addEventListener('submit', (e) => { e.preventDefault(); pin(); });
  box.addEventListener('keydown', (e) => {
    if (e.target.id === 'rv-moment' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pin(); }
    if (e.key === 'Escape') setOpen(false);
  });
  box.addEventListener('input', (e) => { if (e.target.id === 'rv-note') { item(ID).note = e.target.value; save(ID); } });
  // N opens the notes from anywhere on the page (not while typing)
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || e.target.closest('input, textarea, [contenteditable]')) return;
    e.preventDefault();
    setOpen(!open);
  });
  window.Review.on((k) => {
    if (k === 'pulled' && !box.contains(document.activeElement)) draw();
    if (k === 'saved' || k === 'local') state(k);
  });
  if (window.Kit && window.Kit.onLang) window.Kit.onLang(draw);

  // a moment linked from the review page: index.html sends #at=0.42
  const at = /#at=([\d.]+)/.exec(location.hash);
  if (at) addEventListener('load', () => setTimeout(() => goTo(+at[1]), 900));

  draw();
  pull();
})();
