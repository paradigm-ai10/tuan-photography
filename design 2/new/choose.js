/* The Journey review page (pictures first, 2026-10-29): one card per version with frames taken by
   tools/review_shots.mjs, a 1 to 5 score, the moments he pinned on the page itself, and a note; a
   ranking of what he scored on top. The store is review.js, saved into ideas/reviews/journey.json
   on his Mac, which Claude reads straight from the file. */
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
      saved: 'Saved. Claude can read it.', local: 'Saved in this browser only', how: 'Open one and look. Score it and pin what you notice from the Note tab on its left edge (or press N). Everything saves as you go, and Claude reads it.',
      ranking: 'Your ranking', unscored: (n) => `${n} not scored yet`, noneYet: 'Nothing scored yet. Score a version and it lands here.',
      open: 'Open', more: 'What it is', moments: 'Moments', noMoments: 'No moments yet', go: 'Go there', note: 'Overall note',
      scores: ['', 'Not for me', 'Weak', 'Fine', 'Good', 'Love it'], frames: ['Arrival', 'The fold', 'Reading'],
      short: { S: 'The live page: the drawn globe', 1: 'Matte paper globe', 2: 'Mountains in shaded relief', 3: 'Flights in tall arcs', 4: 'Visited countries stand up', 5: 'The map rolls up, then closes' },
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
      saved: '已存，Claude 讀得到。', local: '只存在這個瀏覽器', how: '打開一版看看。從左邊的「筆記」標籤（或按 N）打分數，看到喜歡的就寫一句釘上。打字就會存，Claude 讀得到。',
      ranking: '你的排名', unscored: (n) => `還有 ${n} 個沒打分`, noneYet: '還沒打分。給一版打分，它就會排到這裡。',
      open: '打開', more: '這版是什麼', moments: '片刻', noMoments: '還沒有片刻', go: '回到那裡', note: '整體筆記',
      scores: ['', '不要', '普通偏弱', '還可以', '喜歡', '超喜歡'], frames: ['剛進來', '折起來', '讀旅程'],
      short: { S: '目前的版本：畫出來的地球', 1: '霧面紙質地球', 2: '山脈有地形陰影', 3: '航線拉成高弧', 4: '去過的國家浮起來', 5: '地圖先捲起再合起' },
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
  // what he marked lives in window.Review (review.js): { items: { <version>: { stars, verdict, note, pins, seen } }, general }
  const R = window.Review;
  const idOf = (href) => href.replace('.html', '');
  WORDS.en.items.forEach(([, name, , href]) => R.name(idOf(href), name));
  const FRAMES = [0, 0.3, 0.6]; // the depths tools/review_shots.mjs photographs
  const shot = (id, n) => `shots/${id}-${n}.jpg`;
  const scoreOf = (id) => {
    const it = R.data.items[id] || {};
    return it.stars || 0;
  };

  // the ones he scored low are put away (still in git, and one word brings them back)
  let showAll = false;
  const rejected = (id) => { const it = R.data.items[id] || {}; return it.stars ? it.stars <= 2 : it.verdict === 'bad'; };

  function scoreRow(id, w) {
    const s = scoreOf(id);
    return `<div class="cz__score" role="group" aria-label="${esc(w.scores[s] || '')}">
      ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="cz__n" data-n="${n}" aria-pressed="${s === n}" title="${esc(w.scores[n])}">${n}</button>`).join('')}
    </div><p class="cz__said">${s ? esc(w.scores[s]) : '&nbsp;'}</p>`;
  }

  function ranking(w) {
    const all = w.items.map(([m, name, , href]) => ({ m, name, id: idOf(href), href, s: scoreOf(idOf(href)) }));
    const scored = all.filter((x) => x.s).sort((a, b) => b.s - a.s);
    const left = all.length - scored.length;
    return `<section class="cz__rank" aria-label="${esc(w.ranking)}">
      <h2 class="cz__rank-h caps">${esc(w.ranking)}</h2>
      ${scored.length ? `<ol class="cz__podium">${scored.map((x, i) => `
        <li class="cz__pod${i === 0 ? ' is-top' : ''}"><a href="#v-${x.id}">
          <img src="${shot(x.id, 1)}" alt="" loading="lazy" onerror="this.remove()">
          <span class="cz__pod-s">${x.s}</span><span class="cz__pod-n">${esc(x.m)} ${esc(w.short[x.m])}</span></a></li>`).join('')}
      </ol>` : `<p class="cz__rank-none">${esc(w.noneYet)}</p>`}
      ${scored.length && left ? `<p class="cz__rank-left">${esc(w.unscored(left))}</p>` : ''}
    </section>`;
  }

  function card([m, name, say, href], w) {
    const id = idOf(href), my = R.data.items[id] || {}, pins = my.pins || [];
    const trips = /^[AS]/.test(m) ? `<a href="../wc-sketch/trip/?trip=2026-08&from=${id}">${esc(w.trip)}</a><a href="../wc-sketch/trip/?trip=2026-01&from=${id}">${esc(w.trip2)}</a>` : '';
    return `
    <li class="cz__card${my.stars >= 4 ? ' is-liked' : ''}" id="v-${id}" data-id="${id}">
      <a class="cz__pic" href="${href}" aria-label="${esc(w.open)}: ${esc(name)}">
        <img src="${shot(id, 1)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('is-empty');this.remove()">
        <span class="cz__open caps">${esc(w.open)}</span>
      </a>
      <div class="cz__frames">${FRAMES.map((d, n) => `<a href="${href}#at=${d}" title="${esc(w.frames[n])}"><img src="${shot(id, n)}" alt="${esc(w.frames[n])}" loading="lazy" onerror="this.parentNode.remove()"></a>`).join('')}</div>
      <div class="cz__body">
        <h2 class="cz__name"><span class="cz__mark">${esc(m)}</span> ${esc(w.short[m] || name)}</h2>
        ${scoreRow(id, w)}
        <p class="cz__label caps">${esc(w.moments)}</p>
        <ol class="cz__pins">${pins.length ? pins.map((p) => `<li><a href="${href}#at=${p.at || 0}">${esc(p.text)}</a></li>`).join('') : `<li class="cz__nopin">${esc(w.noMoments)}</li>`}</ol>
        <textarea class="cz__note" rows="2" aria-label="${esc(w.note)}" placeholder="${esc(w.note)}">${esc(my.note || '')}</textarea>
        <details class="cz__more"><summary class="caps">${esc(w.more)}</summary><p class="cz__say">${esc(say)}</p>${trips ? `<p class="cz__go">${trips}</p>` : ''}</details>
      </div>
    </li>`;
  }

  function render() {
    const w = WORDS[K.lang];
    const kept = w.items.filter(([, , , href]) => showAll || !rejected(idOf(href)));
    const away = w.items.length - w.items.filter(([, , , href]) => !rejected(idOf(href))).length;
    $('#top').innerHTML = K.topbar('journey');
    document.title = `${w.title} · tuan photography 陳亮元`;
    $('#main').innerHTML = `<div class="cz">
      <h1 class="cz__title">${esc(w.title)}</h1>
      <p class="cz__how">${esc(w.how)}</p>
      ${ranking(w)}
      <ol class="cz__grid">${kept.map((it) => card(it, w)).join('')}</ol>
      ${away ? `<p class="cz__away">${esc(w.hidden(away))} <button type="button" class="word" id="cz-all">${esc(showAll ? w.hideThem : w.showThem)}</button></p>` : ''}
      <label class="cz__general"><span class="cz__general-head">${esc(w.general)}</span>
        <textarea class="cz__note" id="cz-general" rows="3" placeholder="${esc(w.generalHint)}">${esc(R.data.general || '')}</textarea></label>
      <p class="cz__state" id="cz-state" role="status" aria-live="polite"></p>
    </div>`;
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#cz-all')) { showAll = !showAll; render(); return; }
    const b = e.target.closest('.cz__n');
    if (b) {
      const id = b.closest('.cz__card').dataset.id;
      R.setScore(id, +b.dataset.n);
      const y = scrollY; render(); scrollTo(0, y);
      return;
    }
    const a = e.target.closest('.cz__pic, .cz__frames a, .cz__go a');
    if (a) { R.item(a.closest('.cz__card').dataset.id).seen = true; R.save(a.closest('.cz__card').dataset.id); }
  });
  document.addEventListener('input', (e) => {
    const t = e.target.closest('.cz__note');
    if (!t) return;
    if (t.id === 'cz-general') { R.data.general = t.value; R.save('*general'); }
    else { const id = t.closest('.cz__card').dataset.id; R.item(id).note = t.value; R.save(id); }
  });
  R.on((k) => {
    if (k === 'pulled' && !document.activeElement.closest('textarea')) { const y = scrollY; render(); scrollTo(0, y); }
    const st = $('#cz-state');
    if (st && (k === 'saved' || k === 'local')) st.textContent = WORDS[K.lang][k];
  });
  // back from a version page (or another tab): read the file again, it may hold new moments
  addEventListener('pageshow', () => R.pull());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) R.pull(); });
  K.onLang(render);
  render();
  if (location.hash) requestAnimationFrame(() => { const el = document.querySelector(location.hash); if (el) el.scrollIntoView(); });
})();
