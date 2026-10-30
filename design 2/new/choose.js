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
      scores: ['', 'Not for me', 'Weak', 'Fine', 'Good', 'Love it'], pinned: (n) => `${n} pinned`, pickWord: 'Main', scoreOf: (x) => `Score ${x}`,
      short: {},
      items: [
        ['1', 'The live page', 'The Journey tab as it is now: the paper globe, the trips on one line, the Impeccable polish. The main one.', 'journey.html', 'pick'],
        ['2', 'Sea chart, scroll-craft', 'A4: the flat map closes into a large globe on the whole screen, home sends out a ring, the panel slides in. A pale blue chart surface.', 'journey-craft.html'],
        ['3', 'Paper, the whole page wraps', 'New: the live page\'s quiet paper globe, with A4\'s movement and the whole page wrapping up into it, so no rectangle lifts off the background. The smallest step from what is live.', 'journey-paperwrap.html'],
        ['4', 'Painted paper globe, closing in strips', 'New, from your references: a globe printed on paper and tinted in watercolour, after Bellerby & Co, the oceans named in engraved capitals. On arrival the routes are drawn in ink from Taiwan and each country takes its wash as its line lands; scrolling cuts the map into twelve strips that close round Taiwan one by one, as a globemaker pastes them on.', 'journey-gores.html'],
        ['5', 'Strips, the photograph beneath', 'Version 4 with your photographs in the transition: the map was printed over the trip\'s photograph, so the cuts open onto it, and it is there, whole, behind the globe once it closes. It is the same photograph the reading then shows.', 'journey-gores-through.html'],
        ['6', 'Strips, a desk of prints', 'Version 4 with your photographs in the transition: a small print from every trip lies under the map; the strips lift off them, and the globe closes in the middle of the prints.', 'journey-gores-prints.html'],
        ['7', 'Strips, photographs on their backs', 'Version 4 with your photographs in the transition: each strip has one of your photographs printed down its back, seen as the strips swing round to close the far side.', 'journey-gores-backs.html'],
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
      scores: ['', '不要', '普通偏弱', '還可以', '喜歡', '超喜歡'], pinned: (n) => `釘了 ${n} 句`, pickWord: '主要版本', scoreOf: (x) => `給「${x}」打分`,
      short: {},
      items: [
        ['1', '目前的正式版', '現在的旅程頁：紙質地球、所有旅程掛在一條線上、Impeccable 小修。這是主要版本。', 'journey.html', 'pick'],
        ['2', '海圖，scroll-craft 版', 'A4：平面地圖在整個畫面上合成大地球，台灣亮一圈，面板滑進來。表面是淡藍色海圖。', 'journey-craft.html'],
        ['3', '紙，整頁包起來', '新的：正式版安靜的紙質地球，加上 A4 的動態，而且是整個頁面包成地球，不會有一塊長方形從背景翹起來。和正式版差最少的一步。', 'journey-paperwrap.html'],
        ['4', '手繪紙地球，一條一條包起來', '新的，照你選的參考做：像 Bellerby & Co 那樣印在紙上、用水彩上色的地球，海洋名稱像雕版印的字。一打開，航線從台灣用墨水一條條畫出去，線到了哪個國家，那裡就染上顏色；往下捲，地圖切成十二條，從台灣那一條開始，一條一條貼到球上。', 'journey-gores.html'],
        ['5', '紙條下面是照片', '第四版加上你的照片：地圖像是印在這趟旅行的照片上面，切開的縫裡看得到照片，地球合起來以後，整張照片就在地球後面。和往下讀時背景那張是同一張。', 'journey-gores-through.html'],
        ['6', '紙條下面是一桌照片', '第四版加上你的照片：地圖下面放著每趟旅行一張的小照片，紙條掀起來就看到它們，地球在這圈照片中間合起來。', 'journey-gores-prints.html'],
        ['7', '紙條背面印著照片', '第四版加上你的照片：每一條紙的背面印著你的一張照片，紙條翻過去包住地球背面時看得到。', 'journey-gores-backs.html'],
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
  function row([m, name, , href, pick], w) {
    const id = idOf(href), my = R.data.items[id] || {}, s = my.stars || 0, n = (my.pins || []).length;
    return `
    <li class="cz__row${s >= 4 ? ' is-liked' : ''}${rejected(id) ? ' is-low' : ''}" id="v-${id}" data-id="${id}">
      <a class="cz__link" href="${href}">
        <span class="cz__mark">${esc(m)}</span>
        <span class="cz__name">${esc(name)}</span>${pick ? `<span class="cz__pick caps">${esc(w.pickWord)}</span>` : ''}
        ${n ? `<span class="cz__pins-n">${esc(w.pinned(n))}</span>` : ''}
      </a>
      <div class="cz__score" role="group" aria-label="${esc(w.scoreOf(name))}">
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
