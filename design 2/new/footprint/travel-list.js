/* Where he has been, and when (2026-11-14, his ask: "a where I travelled (and when) journey list on the right
   side of the landing page map. It should come in the same way the countries come in, with color").
   <body data-fp-list>: glide-calm.js keeps a column on the right of a wide window and frames the map in the
   rest; this file sets his countries down it as a map's key, oldest first, each a swatch of the colour the map
   gives it, its name and the years he went. A line stays blank until its country colours in on the map
   (FP.reveal, FP.onDraw), then comes up with it, so the key fills in the same scattered order the map does.
   A phone keeps the map as it was. */
(() => {
  'use strict';
  if (!('fpList' in document.body.dataset) || !window.FP) return;
  const stage = document.getElementById('stage');
  if (!stage) return;
  const WORDS = {
    en: { head: 'Where I have been, and when', years: (ys) => ys.join(', ') },
    zh: { head: '去過的地方，和那一年', years: (ys) => ys.join('、') },
  };
  const abroad = FP.abroad.filter((c) => c.years.length).slice().sort((a, b) => a.first - b.first || a.last - b.last);

  const col = document.createElement('aside');
  col.className = 'fp-list';
  const head = document.createElement('h2');
  head.className = 'fp-list__head';
  const list = document.createElement('ol');
  list.className = 'fp-list__rows';
  col.append(head, list);
  stage.append(col);

  const rows = abroad.map((c) => {
    const li = document.createElement('li');
    li.className = 'fp-list__row';
    li.innerHTML = '<span class="fp-list__swatch" aria-hidden="true"></span><span class="fp-list__name"></span><span class="fp-list__years"></span>';
    list.append(li);
    return { c, li, sw: li.firstChild, name: li.children[1], years: li.children[2], on: false };
  });

  function words() {
    const lang = FP.lang === 'zh' ? 'zh' : 'en', w = WORDS[lang];
    head.textContent = w.head;
    rows.forEach((r) => {
      const n = r.c.country || r.c.name;
      r.name.textContent = (n && (n[lang] || n.en)) || r.c.id;
      r.years.textContent = w.years(r.c.years);
    });
  }
  words();
  FP.onLang(words);

  let at = new Map();
  addEventListener('fp-plan', () => {
    const R = FP.reveal;
    at = R.at;
    stage.style.setProperty('--fp-col', `${R.col}px`);
    col.hidden = !R.col;
    rows.forEach((r) => { const tone = R.tone.get(r.c.id); if (tone) r.sw.style.setProperty('--tone', tone); });
  });
  // each line comes up as its country's wash begins on the map
  FP.onDraw = (t) => {
    rows.forEach((r) => {
      const on = (at.get(r.c.id) ?? Infinity) <= t;
      if (on !== r.on) { r.on = on; r.li.classList.toggle('is-in', on); }
    });
  };
})();
