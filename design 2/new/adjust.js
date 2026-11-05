/* The adjust tab (his ask, 2026-11-04: "給我一個 adjustment tab 讓我能掌控 scroll 的速度"), for the
   wind versions of the Journey (data-globe="gallery-wind", "-murmur", "-deck", "-vortex", "-tide"), and
   the 高級感 versions ("luxe-unveil", "-print", "-hang", "-clouds", "-drift", "-develop"), which have only the
   scroll length.
   window.JourneyTweak holds the values the page and the globe read: how much scroll the change takes
   (journey.js, dockCraft), when the prints start back, the wind, the rocking, how strongly his
   photographs show behind (globe3d.js). On his Mac only, a word at the bottom left opens sliders; what
   he sets is applied as he drags and saved to ideas/reviews/journey-adjust.json, which Claude reads to
   make it the page's own. Everywhere else the page keeps the values below. */
(() => {
  const page = document.body.dataset.globe || 'journey';
  const luxe = page.startsWith('luxe-');
  const DEF = { fold: page === 'luxe-print' || page.startsWith('luxe-hang') ? 2.6 : 2.2, hold: page === 'gallery-tide' ? 0.6 : 0.55, wind: 0.9, rock: 1, photos: 1 };
  const T = (window.JourneyTweak = { ...DEF });
  const changed = () => dispatchEvent(new CustomEvent('journeytweak'));
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;

  const WORDS = {
    en: { tab: 'Adjust', title: 'Adjust this version', now: 'Now', through: 'through the change', reset: 'Reset', close: 'Close',
      saved: 'Saved', saving: 'Saving', unsaved: 'Not saved, the local server is not answering' },
    zh: { tab: '調整', title: '調整這一版', now: '目前', through: '轉場進度', reset: '還原', close: '關閉',
      saved: '已存', saving: '存檔中', unsaved: '沒存到，本機伺服器沒有回應' },
  };
  const ALL = [
    { k: 'fold', min: 1, max: 4, step: 0.1, en: ['Scroll length', 'higher is slower'], zh: ['捲動長度', '越大越慢'], show: (v) => `× ${v.toFixed(1)}` },
    { k: 'hold', min: 0.35, max: 0.75, step: 0.01, en: ['Prints start back at', 'later holds the cloud longer'], zh: ['相片開始飛回', '越晚，照片停在空中越久'], show: (v) => `${Math.round(v * 100)}%` },
    { k: 'wind', min: 0, max: 2, step: 0.05, en: ['Wind and speed', 'how far and fast they travel'], zh: ['風力和速度', '飛多遠、多快'], show: (v) => v.toFixed(2) },
    { k: 'rock', min: 0, max: 2, step: 0.05, en: ['Rocking in the air', 'while you stop scrolling'], zh: ['空中晃動', '停下來不捲時'], show: (v) => v.toFixed(2) },
    { k: 'photos', min: 0, max: 1, step: 0.05, en: ['Photographs behind', 'how strongly they show'], zh: ['背後的照片', '顯示的濃淡'], show: (v) => `${Math.round(v * 100)}%` },
  ];
  const ROWS = luxe ? ALL.filter((r) => r.k === 'fold') : ALL;
  const lang = () => (document.documentElement.lang || '').startsWith('zh') ? 'zh' : 'en';
  const w = (k) => WORDS[lang()][k];

  // what he saved, for every version; this page's part is put back on load
  let store = {}, timer = 0;
  const url = '/__reviews/journey-adjust';
  fetch(url).then((r) => r.json()).then((d) => {
    store = d && typeof d === 'object' ? d : {};
    const mine = (store.pages || {})[page];
    if (mine) { for (const r of ROWS) if (typeof mine[r.k] === 'number') T[r.k] = mine[r.k]; paint(); changed(); }
  }).catch(() => {});
  function save() {
    clearTimeout(timer);
    status.textContent = w('saving');
    timer = setTimeout(() => {
      store.pages = { ...(store.pages || {}), [page]: { ...T } };
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(store) })
        .then((r) => { status.textContent = r.ok ? w('saved') : w('unsaved'); })
        .catch(() => { status.textContent = w('unsaved'); });
    }, 500);
  }

  const box = document.createElement('div');
  box.className = 'adj';
  box.innerHTML = `<button type="button" class="adj-tab" aria-expanded="false"></button>
    <section class="adj-panel" hidden>
      <header class="adj-head"><h2 class="adj-title"></h2><button type="button" class="adj-close"></button></header>
      <p class="adj-now"></p>
      ${ROWS.map((r) => `<label class="adj-row"><span class="adj-name"></span><span class="adj-val"></span>
        <input class="adj-range" type="range" min="${r.min}" max="${r.max}" step="${r.step}" data-k="${r.k}">
        <span class="adj-hint"></span></label>`).join('')}
      <footer class="adj-foot"><button type="button" class="adj-reset"></button><span class="adj-status" role="status"></span></footer>
    </section>`;
  document.body.appendChild(box);
  const $ = (s) => box.querySelector(s), tab = $('.adj-tab'), panel = $('.adj-panel'), status = $('.adj-status');
  const ranges = [...box.querySelectorAll('.adj-range')];

  function paint() {
    tab.textContent = w('tab');
    $('.adj-title').textContent = w('title');
    $('.adj-close').textContent = w('close');
    $('.adj-reset').textContent = w('reset');
    box.querySelectorAll('.adj-row').forEach((row, i) => {
      const r = ROWS[i];
      row.querySelector('.adj-name').textContent = r[lang()][0];
      row.querySelector('.adj-hint').textContent = r[lang()][1];
      row.querySelector('.adj-val').textContent = r.show(T[r.k]);
      ranges[i].value = T[r.k];
    });
    now();
  }
  // how far through the change the page is, the same sum as journey.js
  function now() {
    if (panel.hidden) return;
    const H = innerHeight, f = Math.min(1, Math.max(0, (scrollY - H * 0.15) / (H * 0.85 * T.fold)));
    const pc = `${Math.round(f * 100)}%`;
    $('.adj-now').textContent = lang() === 'zh' ? `${w('now')}：${w('through')} ${pc}` : `${w('now')} ${pc} ${w('through')}`;
  }
  function open(on) {
    panel.hidden = !on;
    tab.setAttribute('aria-expanded', String(on));
    box.classList.toggle('is-open', on);
    // the progress line follows the scroll only while the panel is open (one listener fewer otherwise)
    if (on) { addEventListener('scroll', now, { passive: true }); paint(); ranges[0].focus(); }
    else { removeEventListener('scroll', now); tab.focus(); }
  }
  tab.addEventListener('click', () => open(panel.hidden));
  $('.adj-close').addEventListener('click', () => open(false));
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { e.stopPropagation(); open(false); } });
  ranges.forEach((el) => el.addEventListener('input', () => {
    T[el.dataset.k] = +el.value;
    el.closest('.adj-row').querySelector('.adj-val').textContent = ROWS.find((r) => r.k === el.dataset.k).show(T[el.dataset.k]);
    changed(); now(); save();
  }));
  $('.adj-reset').addEventListener('click', () => { Object.assign(T, DEF); paint(); changed(); save(); });
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  paint();
})();
