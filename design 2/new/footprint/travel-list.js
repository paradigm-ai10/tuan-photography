/* Where he has been, and when (2026-11-14, his ask: "a where I travelled (and when) journey list on the right
   side of the landing page map. It should come in the same way the countries come in, with color").
   <body data-fp-list="…">, wide windows only (a phone keeps the map as it was). Every line, or name, stays
   blank until its country colours in on the map (FP.reveal, FP.onDraw), then comes up with it, so the list
   fills in the same scattered order the map does. Four forms:
     (empty)  key      a map's key down a column on the right: a swatch, the name, the years
   and, after his "this is not high-end enough" (the same day), three quieter ones:
     ledger   a column read as a travel ledger: a year, then the countries of that year as one line of
              serif text, each name underlined with a fine stroke of its colour as it comes in
     index    a column set as an atlas index: the names alphabetical, a dotted leader to the first year,
              a small dot of its colour; no swatches
     pacific  no column: the map edge to edge again, the ledger lettered into the open South Pacific as an
              atlas cartouche, a fine double rule round it, its years in two columns */
(() => {
  'use strict';
  if (!('fpList' in document.body.dataset) || !window.FP) return;
  const KIND = document.body.dataset.fpList || 'key';
  const stage = document.getElementById('stage');
  if (!stage) return;
  const WORDS = {
    en: { head: KIND === 'key' ? 'Where I have been, and when' : 'Where I have been', and: ', ', yrs: (ys) => ys.join(', ') },
    zh: { head: KIND === 'key' ? '去過的地方，和那一年' : '去過的地方', and: '、', yrs: (ys) => ys.join('、') },
  };
  const lang = () => (FP.lang === 'zh' ? 'zh' : 'en');
  const nameOf = (c) => { const n = c.country || c.name; return (n && (n[lang()] || n.en)) || c.id; };
  const abroad = FP.abroad.filter((c) => c.years.length);
  const byId = new Map(abroad.map((c) => [c.id, c]));

  const box = document.createElement('aside');
  box.className = `fp-list fp-list--${KIND}`;
  box.setAttribute('aria-label', 'Where I have been');
  const head = document.createElement('h2');
  head.className = 'fp-list__head';
  box.append(head);
  stage.append(box);

  // each thing that comes up: its element and the country it waits for
  const items = [];
  const add = (el, id) => { items.push({ el, id, on: false }); return el; };
  const span = (cls, text) => { const s = document.createElement('span'); s.className = cls; if (text != null) s.textContent = text; return s; };

  let fill = () => {};
  if (KIND === 'key' || KIND === 'index') {
    const list = document.createElement('ol');
    list.className = 'fp-list__rows';
    box.append(list);
    const order = abroad.slice();
    const rows = order.map((c) => {
      const li = add(document.createElement('li'), c.id);
      li.className = 'fp-list__row';
      const sw = span('fp-list__swatch'); sw.setAttribute('aria-hidden', 'true');
      const nm = span('fp-list__name'), yr = span('fp-list__years');
      if (KIND === 'index') li.append(sw, nm, span('fp-list__lead'), yr); else li.append(sw, nm, yr);
      list.append(li);
      return { c, li, sw, nm, yr };
    });
    fill = () => {
      const l = lang();
      if (KIND === 'index') rows.sort((a, b) => nameOf(a.c).localeCompare(nameOf(b.c), l === 'zh' ? 'zh-Hant' : 'en'));
      else rows.sort((a, b) => a.c.first - b.c.first || a.c.last - b.c.last);
      rows.forEach((r) => {
        list.append(r.li);
        r.nm.textContent = nameOf(r.c);
        r.yr.textContent = KIND === 'index' ? String(r.c.first) : WORDS[l].yrs(r.c.years);
      });
    };
  } else {
    // ledger and pacific: a year, then that year's countries in the order he went
    const yearOf = (j) => +String(j.id).slice(0, 4);
    const groups = [];
    FP.journeys.forEach((j) => {
      const y = yearOf(j);
      let g = groups.find((x) => x.y === y);
      if (!g) groups.push((g = { y, ids: [] }));
      j.countries.forEach((id) => { if (byId.has(id) && !g.ids.includes(id)) g.ids.push(id); });
    });
    const list = document.createElement('dl');
    list.className = 'fp-list__years-list';
    box.append(list);
    const lines = groups.filter((g) => g.ids.length).map((g) => {
      const dt = document.createElement('dt'); dt.className = 'fp-list__y'; dt.textContent = g.y;
      const dd = document.createElement('dd'); dd.className = 'fp-list__these';
      list.append(dt, dd);
      const names = g.ids.map((id) => add(span('fp-list__c'), id));
      // the year comes up with the first of its countries
      items.push({ el: dt, ids: g.ids, on: false });
      return { g, dd, names };
    });
    fill = () => {
      const w = WORDS[lang()];
      lines.forEach(({ g, dd, names }) => {
        dd.replaceChildren();
        names.forEach((s, i) => {
          s.textContent = nameOf(byId.get(g.ids[i]));
          dd.append(s);
          if (i < names.length - 1) dd.append(span('fp-list__sep', w.and));
        });
      });
    };
  }

  function words() { head.textContent = WORDS[lang()].head; fill(); }
  words();
  FP.onLang(words);

  let at = new Map();
  addEventListener('fp-plan', () => {
    const R = FP.reveal;
    at = R.at;
    stage.style.setProperty('--fp-col', `${R.col}px`);
    items.forEach((it) => {
      const tone = it.id && R.tone.get(it.id);
      if (tone) it.el.style.setProperty('--tone', tone);
    });
  });
  // (pacific) set in the open ocean, under its own name, wherever the map has put it
  if (KIND === 'pacific') {
    addEventListener('fp-view', () => {
      if (!FP.view || !FP.view.at) return;
      const sr = stage.getBoundingClientRect();
      let [x, y] = FP.view.at(-128, -16);
      x -= sr.left; y -= sr.top;
      // kept clear of the numbers along the foot and inside the window
      const row = [...document.querySelectorAll('.wb-row > *')].map((e) => e.getBoundingClientRect().top - sr.top).filter((v) => v > 0);
      const foot = row.length ? Math.min(...row) - 20 : sr.height - 40;
      const h = box.offsetHeight, w = box.offsetWidth;
      y = Math.min(y, foot - h / 2);
      x = Math.min(x, sr.width - 24 - w / 2);
      box.style.setProperty('--cx', `${x.toFixed(1)}px`);
      box.style.setProperty('--cy', `${y.toFixed(1)}px`);
    });
  }
  // each comes up as its country's wash begins on the map
  FP.onDraw = (t) => {
    items.forEach((it) => {
      const when = it.ids ? Math.min(...it.ids.map((id) => at.get(id) ?? Infinity)) : at.get(it.id) ?? Infinity;
      const on = when <= t;
      if (on !== it.on) { it.on = on; it.el.classList.toggle('is-in', on); }
    });
  };
})();
