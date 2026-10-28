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
        ['S', 'Journey, built with scroll-craft', 'The Journey as it stands: the grand map on arrival and every plane leaving Taiwan at once; the years, newest first, while the map rewinds; then the map folds into a globe that turns to the trip you are reading, over that trip\'s photograph, with the trips on a frosted panel where the one in view stays clear (your picks, 2026-10-28). A country on the map opens its latest trip. Back from a trip returns to that trip.', 'journey.html'],
        ['1', '3D globe: paper', 'The same page with the map made a real 3D object (three.js). The flat map bends round evenly into a matte paper globe, lit softly from the upper left; flights lift a little off its surface. Drag the globe to turn it; a country still opens its latest trip.', 'globe-paper.html'],
        ['2', '3D globe: relief', 'The paper globe with the land in shaded relief: mountains and ranges catch the light as the globe turns.', 'globe-relief.html'],
        ['3', '3D globe: high routes', 'The flights rise in tall arcs above the globe, and the globe is seen a little from above, so the routes stand out in the air.', 'globe-high.html'],
        ['4', '3D globe: raised countries', 'The countries you have been to stand up from the globe like cut paper. Read back in time and the ones you had not yet seen sink back down.', 'globe-raised.html'],
        ['5', '3D globe: rolled map', 'The flat map first rolls up like a paper chart, its plain back showing, then closes at the poles into the globe.', 'globe-roll.html'],
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
        ['S', '旅程，用 scroll-craft 做的', '目前的旅程頁：一進來整張地圖佔滿畫面，所有飛機同時從台灣起飛；接著按年份往下，地圖跟著回到過去；接著地圖折成地球，轉向你正在讀的那一趟，背後鋪著那一趟的照片，右邊霧面紙上的旅程只有正在讀的那一趟是清楚的（你 2026-10-28 選的）。點地圖上的國家會打開最近一趟。從一趟旅行回來會回到那一趟。', 'journey.html'],
        ['1', '立體地球：紙', '同一頁，地圖變成真正的立體物件（three.js）。平面地圖均勻彎起來，合成一顆霧面紙質的地球，光從左上方柔和打下；航線稍微浮在表面上。可以用滑鼠拖著轉；點國家一樣會打開最近一趟。', 'globe-paper.html'],
        ['2', '立體地球：地形', '紙質地球，陸地加上地形陰影：地球轉動時，山脈會受光。', 'globe-relief.html'],
        ['3', '立體地球：高航線', '航線在地球上方拉成高高的弧線，地球稍微從上往下看，路線像浮在空中。', 'globe-high.html'],
        ['4', '立體地球：國家浮起', '你去過的國家像剪紙一樣從地球上浮起來。往回讀到過去，那時還沒去過的國家會沉回去。', 'globe-raised.html'],
        ['5', '立體地球：捲起的地圖', '平面地圖先像紙地圖一樣捲成筒狀，看得到紙的背面，再從南北兩極合起來變成地球。', 'globe-roll.html'],
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
          <p class="cz__go"><a href="${href}">${esc(w.list)}</a>${/^[AS]/.test(m) ? (() => { const route = /^[AS]/.test(m); const base = route ? '../wc-sketch/trip/' : href; const back = route ? `&from=${href.replace('.html', '')}` : ''; return `<a href="${base}?trip=2026-08${back}">${esc(w.trip)}</a><a href="${base}?trip=2026-01${back}">${esc(w.trip2)}</a>`; })() : ''}</p>
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
