/* The review page of experiment `journey`: one line for each version, each with Good / Not for
   me and a note. What he marks is saved by the site's own server into ideas/reviews/journey.json
   (on his Mac only), which Claude reads straight from the file; the browser keeps a copy too. */
(() => {
  'use strict';
  const K = window.Kit;
  const { esc, $ } = K;
  const WORDS = {
    en: {
      title: 'Journey, the versions',
      intro: 'The Journey page, and a place for your notes on it. The first link opens the page; the others open one trip.',
      list: 'All trips', trip: 'One trip: Vietnam', trip2: 'One trip: Australia and New Zealand',
      good: 'Good', bad: 'Not for me', note: 'A note for Claude: what you like, what to change', general: 'Anything else', generalHint: 'Anything about Journey in general',
      hidden: (n) => `${n} you marked Not for me are put away.`, showThem: 'Show them', hideThem: 'Put them away',
      saved: 'Saved. Claude can read it.', local: 'Saved in this browser only', how: 'Mark each one and write a note. It saves as you go, and Claude reads it straight away.',
      items: [
        ['S', 'Journey, built with scroll-craft', 'The Journey as it stands: the grand map on arrival and every plane leaving Taiwan at once; the years, newest first, while the map rewinds; and, once the map has docked, the photograph of the trip you are reading under it, changing as you move on (your pick, S3, of the three ways of showing photographs). Back from a trip returns to that trip.', 'journey.html'],
        ['L1', 'Frosted', 'Once it scrolls: the photograph of the trip you are reading runs under the whole screen, the globe sits large on its left half, and the trips are read on a frosted paper panel on the right. Closest to the 8642 Flights page.', 'journey-frosted.html'],
        ['L2', 'Half', 'The photograph fills only the globe\'s half; the trips sit on plain paper on the right.', 'journey-half.html'],
        ['L3', 'Veil', 'The photograph runs under the whole screen, washed with paper so it stays quiet; the panel is lightly frosted.', 'journey-veil.html'],
        ['L4', 'Window', 'Paper all round. The photograph is a large print set in the left column with the globe over it; the trips on plain paper.', 'journey-window.html'],
      ],
    },
    zh: {
      title: '旅程：各個版本',
      intro: '旅程頁，和給它寫筆記的地方。第一個連結打開整頁，其他直接打開一趟旅行。',
      list: '所有旅程', trip: '一趟：越南', trip2: '一趟：澳洲與紐西蘭',
      good: '喜歡', bad: '不要', note: '給 Claude 的筆記：喜歡什麼、要改什麼', general: '其他想法', generalHint: '對整個旅程頁的想法',
      hidden: (n) => `${n} 個標了「不要」的已收起。`, showThem: '顯示', hideThem: '收起',
      saved: '已存，Claude 讀得到。', local: '只存在這個瀏覽器', how: '每一版按喜歡或不要，寫一句筆記。打字就會存，Claude 直接讀得到。',
      items: [
        ['S', '旅程，用 scroll-craft 做的', '目前的旅程頁：一進來整張地圖佔滿畫面，所有飛機同時從台灣起飛；接著按年份往下，地圖跟著回到過去；地圖滑到旁邊後，下面放著你正在讀的那一趟的照片，往下讀會跟著換（三種放照片的方式裡你選的 S3）。從一趟旅行回來會回到那一趟。', 'journey.html'],
        ['L1', '霧面', '往下捲之後：正在讀的那一趟的照片鋪滿整個畫面，地球大大地放在左半邊，右邊是一片霧面的紙，旅程寫在上面。最像 8642 的 Flights 頁。', 'journey-frosted.html'],
        ['L2', '半邊', '照片只鋪在地球那半邊，右邊的旅程放在白紙上。', 'journey-half.html'],
        ['L3', '薄紗', '照片鋪滿整個畫面，但蓋上一層紙色，讓它安靜一點；右邊的紙稍微霧面。', 'journey-veil.html'],
        ['L4', '窗口', '四周都是紙。照片像一張大照片放在左欄，地球疊在上面；右邊的旅程放在白紙上。', 'journey-window.html'],
      ],
    },
  };
  // what he marked: { items: { <version>: { verdict, note, seen } }, general, names }
  const NAME = 'journey';
  const KEY = 'journey-review';
  let mine = { items: {} };
  try { mine = JSON.parse(localStorage.getItem(KEY)) || mine; } catch (e) { /* storage blocked */ }
  mine.items = mine.items || {};
  const idOf = (href) => (href.startsWith('..') ? 'current' : href.replace('.html', ''));
  const of = (id) => (mine.items[id] = mine.items[id] || {});

  let timer = 0;
  function save() {
    const w = WORDS[K.lang];
    mine.names = Object.fromEntries(WORDS.en.items.map(([, name, , href]) => [idOf(href), name]));
    try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (e) { /* storage blocked */ }
    clearTimeout(timer);
    timer = setTimeout(() => {
      fetch(`/__reviews/${NAME}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mine) })
        .then((r) => { $('#cz-state').textContent = r.ok ? w.saved : w.local; })
        .catch(() => { $('#cz-state').textContent = w.local; });
    }, 500);
  }

  // the ones he marked Not for me are put away (still in git, and one word brings them back)
  let showAll = false;
  const rejected = (href) => (mine.items[idOf(href)] || {}).verdict === 'bad';

  function render() {
    const w = WORDS[K.lang];
    const kept = w.items.filter(([, , , href]) => showAll || !rejected(href));
    const away = w.items.filter(([, , , href]) => rejected(href)).length;
    $('#top').innerHTML = K.topbar('journey');
    document.title = `${w.title} · tuan photography 陳亮元`;
    $('#main').innerHTML = `<div class="cz">
      <h1 class="cz__title">${esc(w.title)}</h1>
      <p class="cz__intro">${esc(w.intro)}</p>
      <p class="cz__how">${esc(w.how)}</p>
      <ol class="cz__list">${kept.map(([m, name, say, href]) => {
        const id = idOf(href), my = mine.items[id] || {};
        return `
        <li class="cz__item" data-id="${id}">
          <span class="cz__mark" aria-hidden="true">${m}</span>
          <h2 class="cz__name">${esc(name)}</h2>
          <p class="cz__say">${esc(say)}</p>
          <p class="cz__go"><a href="${href}">${esc(w.list)}</a>${m ? (() => { const route = /^[AS]/.test(m); const base = route ? '../wc-sketch/trip/' : href; const back = route ? `&from=${href.replace('.html', '')}` : ''; return `<a href="${base}?trip=2026-08${back}">${esc(w.trip)}</a><a href="${base}?trip=2026-01${back}">${esc(w.trip2)}</a>`; })() : ''}</p>
          <div class="cz__mine">
            <div class="cz__verdict" role="group" aria-label="${esc(name)}">
              <button type="button" class="cz__v" data-v="good" aria-pressed="${my.verdict === 'good'}">${esc(w.good)}</button>
              <button type="button" class="cz__v" data-v="bad" aria-pressed="${my.verdict === 'bad'}">${esc(w.bad)}</button>
            </div>
            <textarea class="cz__note" rows="2" aria-label="${esc(w.note)}" placeholder="${esc(w.note)}">${esc(my.note || '')}</textarea>
          </div>
        </li>`;
      }).join('')}
      </ol>
      ${away ? `<p class="cz__away">${esc(w.hidden(away))} <button type="button" class="word" id="cz-all">${esc(showAll ? w.hideThem : w.showThem)}</button></p>` : ''}
      <label class="cz__general"><span class="cz__general-head">${esc(w.general)}</span>
        <textarea class="cz__note" id="cz-general" rows="3" placeholder="${esc(w.generalHint)}">${esc(mine.general || '')}</textarea></label>
      <p class="cz__state" id="cz-state" role="status" aria-live="polite"></p>
    </div>`;
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#cz-all')) { showAll = !showAll; render(); return; }
    const b = e.target.closest('.cz__v');
    if (b) {
      const it = of(b.closest('.cz__item').dataset.id);
      it.verdict = it.verdict === b.dataset.v ? '' : b.dataset.v;
      b.closest('.cz__verdict').querySelectorAll('.cz__v').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === it.verdict)));
      save();
      return;
    }
    const a = e.target.closest('.cz__go a');
    if (a) { of(a.closest('.cz__item').dataset.id).seen = true; save(); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target.closest('.cz__note');
    if (!t) return;
    if (t.id === 'cz-general') mine.general = t.value;
    else of(t.closest('.cz__item').dataset.id).note = t.value;
    save();
  });

  // what the file on his Mac holds wins over this browser's copy (it may come from another browser)
  fetch(`/__reviews/${NAME}`).then((r) => r.json()).then((d) => {
    if (d && d.items) { mine = d; mine.items = mine.items || {}; render(); }
  }).catch(() => { /* no server notes yet */ });
  K.onLang(render);
  render();
})();
