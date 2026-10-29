/* The Journey review page (2026-10-29): only for getting around, his call. One line per version
   with the score and the number of moments he gave it on the page itself (review.js, the Note
   tab), saved into ideas/reviews/journey.json on his Mac, which Claude reads straight from the file. */
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
      saved: 'Saved. Claude can read it.', local: 'Saved in this browser only', how: 'Open one to look; on the page the Notes bar (or the N key) scores it and pins what you notice. Or score them here, after seeing them all.',
      ranking: 'Your ranking', unscored: (n) => `${n} not scored yet`, noneYet: 'Nothing scored yet. Score a version and it lands here.',
      open: 'Open', more: 'What it is', moments: 'Moments', noMoments: 'No moments yet', go: 'Go there', note: 'Overall note',
      scores: ['', 'Not for me', 'Weak', 'Fine', 'Good', 'Love it'], pinned: (n) => `${n} pinned`, scoreOf: (x) => `Score ${x}`,
      short: { V1: 'Globe in the corner', V2: 'See-through globe', V3: 'Polish only', '6': 'Combined globe', '6A': 'Right panel: contents page', '6B': 'Right panel: prints', '6C': 'The live page: globe and one line', S: 'The live page: the drawn globe', 1: 'Matte paper globe', 2: 'Mountains in shaded relief', 3: 'Flights in tall arcs', 4: 'Visited countries stand up', 5: 'The map rolls up, then closes' },
      items: [
        ['6C', 'Panel: one line', 'The live Journey page since 2026-10-29, with the Impeccable polish (arcs closer to the globe, "Read the trip", easier faded trips): the combined globe, with the trips hung on one line down the panel: read ones filled, the one being read in vermilion, the years as tabs on the line.', 'journey.html'],
      ],
    },
    zh: {
      title: '旅程：各個版本',
      intro: '旅程頁，和給它寫筆記的地方。第一個連結打開整頁，其他直接打開一趟旅行。',
      list: '所有旅程', trip: '一趟：越南', trip2: '一趟：澳洲與紐西蘭',
      good: '喜歡', bad: '不要', note: '給 Claude 的筆記：喜歡什麼、要改什麼', general: '其他想法', generalHint: '對整個旅程頁的想法',
      hidden: (n) => `${n} 個標了「不要」的已收起。`, showThem: '顯示', hideThem: '收起',
      saved: '已存，Claude 讀得到。', local: '只存在這個瀏覽器', how: '打開一版看看；在頁面上用「筆記」小條（或按 N）打分數、把看到的寫一句釘上。也可以全部看完再回這裡打分。',
      ranking: '你的排名', unscored: (n) => `還有 ${n} 個沒打分`, noneYet: '還沒打分。給一版打分，它就會排到這裡。',
      open: '打開', more: '這版是什麼', moments: '片刻', noMoments: '還沒有片刻', go: '回到那裡', note: '整體筆記',
      scores: ['', '不要', '普通偏弱', '還可以', '喜歡', '超喜歡'], pinned: (n) => `釘了 ${n} 句`, scoreOf: (x) => `給「${x}」打分`,
      short: { V1: '地球移到角落', V2: '透明的地球', V3: '只做小修', '6': '合併版地球', '6A': '右側：目錄頁', '6B': '右側：照片條', '6C': '正式版：地球加一條線', S: '目前的版本：畫出來的地球', 1: '霧面紙質地球', 2: '山脈有地形陰影', 3: '航線拉成高弧', 4: '去過的國家浮起來', 5: '地圖先捲起再合起' },
      items: [
        ['6C', '右側：一條線', '2026-10-29 起的正式旅程頁，加上 Impeccable 小修（航線貼近地球、「看這一趟」、變淡的旅程比較好讀）：合併版地球，所有旅程掛在右側一條線上：讀過的填滿，正在讀的是朱紅色，年份是線上的小標籤。', 'journey.html'],
      ],
    },
  };
  // what he marked lives in window.Review (review.js): { items: { <version>: { stars, verdict, note, pins, seen } }, general }
  const R = window.Review;
  const idOf = (href) => href.replace('.html', '');
  WORDS.en.items.forEach(([, name, , href]) => R.name(idOf(href), name));
  const scoreOf = (id) => (R.data.items[id] || {}).stars || 0;

  let showAll = false;
  const rejected = (id) => { const it = R.data.items[id] || {}; return it.stars ? it.stars <= 2 : it.verdict === 'bad'; };

  // one line per version: the number and name open it; the five squares score it here or on the page
  function row([m, name, , href], w) {
    const id = idOf(href), my = R.data.items[id] || {}, s = my.stars || 0, n = (my.pins || []).length;
    return `
    <li class="cz__row${s >= 4 ? ' is-liked' : ''}${rejected(id) ? ' is-low' : ''}" id="v-${id}" data-id="${id}">
      <a class="cz__link" href="${href}">
        <span class="cz__mark">${esc(m)}</span>
        <span class="cz__name">${esc(w.short[m] || name)}</span>
        ${n ? `<span class="cz__pins-n">${esc(w.pinned(n))}</span>` : ''}
      </a>
      <div class="cz__score" role="group" aria-label="${esc(w.scoreOf(w.short[m] || name))}">
        ${[1, 2, 3, 4, 5].map((k) => `<button type="button" class="cz__n" data-n="${k}" aria-pressed="${s === k}" title="${esc(w.scores[k])}">${k}</button>`).join('')}
      </div>
    </li>`;
  }

  function render() {
    const w = WORDS[K.lang];
    // a low score dims the line instead of hiding it, so a score given here never makes a line vanish
    const kept = w.items, away = 0;
    $('#top').innerHTML = K.topbar('journey');
    document.title = `${w.title} · tuan photography 陳亮元`;
    $('#main').innerHTML = `<div class="cz">
      <h1 class="cz__title">${esc(w.title)}</h1>
      <p class="cz__how">${esc(w.how)}</p>
      <ol class="cz__list">${kept.map((it) => row(it, w)).join('')}</ol>
      ${away ? `<p class="cz__away">${esc(w.hidden(away))} <button type="button" class="word" id="cz-all">${esc(showAll ? w.hideThem : w.showThem)}</button></p>` : ''}
    </div>`;
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#cz-all')) { showAll = !showAll; render(); return; }
    const b = e.target.closest('.cz__n');
    if (b) {
      R.setScore(b.closest('.cz__row').dataset.id, +b.dataset.n);
      const y = scrollY; render(); scrollTo(0, y);
      const again = document.querySelector(`#${b.closest('.cz__row').id} .cz__n[data-n="${b.dataset.n}"]`);
      if (again) again.focus();
    }
  });
  R.on((k) => { if (k === 'pulled') render(); });
  // back from a version page (or another tab): read the file again, it may hold new moments
  addEventListener('pageshow', () => R.pull());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) R.pull(); });
  K.onLang(render);
  render();
  if (location.hash) requestAnimationFrame(() => { const el = document.querySelector(location.hash); if (el) el.scrollIntoView(); });
})();
