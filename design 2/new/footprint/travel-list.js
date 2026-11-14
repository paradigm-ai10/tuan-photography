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
              atlas cartouche, a fine double rule round it, its years in two columns
   He liked none of the four ("try some more", the same day), so four more, each in the column:
     years    each year a large serif numeral, as large as the page's own numbers allow, its countries under it
     ruler    every year from 2010 to 2026 as a tick on one rule, the empty years too, so the long gap shows
     prints   a small contact sheet: one of his photographs from each country, its name and year under it
     sentence one paragraph set as a caption: "Malaysia in 2010. The Netherlands in 2012. …", each name in
              its own colour, deepened to read
   He picked years and ruler (rejecting prints and sentence) and asked for them mixed, so three mixes:
     rulerbig   the ruler, its years with travel set as large serif numerals, the empty ones small ticks
     rulergap   the same, the empty years ticks without numbers, a pause on the rule
     yearsrule  by year (the numeral above, the countries under it) hung on a rule down the left; the
                years without travel one quiet stretch of the rule, "2016 to 2021" */
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
  } else if (['years', 'ruler', 'rulerbig', 'rulergap', 'yearsrule', 'prints', 'sentence'].includes(KIND)) {
    const yearOf = (j) => +String(j.id).slice(0, 4);
    const groups = new Map();
    FP.journeys.forEach((j) => {
      const y = yearOf(j);
      if (!groups.has(y)) groups.set(y, []);
      const g = groups.get(y);
      j.countries.forEach((id) => { if (byId.has(id) && !g.includes(id)) g.push(id); });
    });
    const ys = [...groups.keys()].filter((y) => groups.get(y).length).sort((a, b) => a - b);
    const dot = () => { const d = span('fp-list__dot'); d.setAttribute('aria-hidden', 'true'); return d; };
    const RULED = ['ruler', 'rulerbig', 'rulergap', 'yearsrule'].includes(KIND);
    if (KIND === 'years' || RULED) {
      // years: each year a large serif numeral, its countries under it
      // ruler: every year from the first to the last as a tick on one rule, the empty years too, so the
      //        gap in the middle (2016 to 2021) shows as time passing; the countries beside their year
      const wrap = document.createElement('div');
      wrap.className = 'fp-list__ys';
      box.append(wrap);
      let all = RULED ? Array.from({ length: ys[ys.length - 1] - ys[0] + 1 }, (_, i) => ys[0] + i) : ys;
      // (yearsrule) a run of years without travel becomes one quiet stretch of the rule, "2016 to 2021"
      if (KIND === 'yearsrule') {
        const out = [];
        all.forEach((y) => {
          const last = out[out.length - 1];
          if (!(groups.get(y) || []).length && last && Array.isArray(last)) last.push(y);
          else out.push((groups.get(y) || []).length ? y : [y]);
        });
        all = out;
      }
      const rows = all.map((yy) => {
        const run = Array.isArray(yy), y = run ? yy[0] : yy;
        const ids = run ? [] : groups.get(y) || [];
        const row = document.createElement('div');
        row.className = `fp-list__yr${ids.length ? '' : ' is-empty'}${run ? ' is-run' : ''}`;
        const n = span('fp-list__yn', run && yy.length > 1 ? `${yy[0]}|${yy[yy.length - 1]}` : String(y));
        const cs = document.createElement('div'); cs.className = 'fp-list__ycs';
        const names = ids.map((id) => { const e = add(span('fp-list__yc'), id); e.append(dot(), span('fp-list__ycn')); cs.append(e); return e; });
        row.append(n, cs);
        wrap.append(row);
        if (ids.length) items.push({ el: n, ids, on: false }); else n.classList.add('is-in');
        return { ids, names };
      });
      const runs = [...wrap.querySelectorAll('.is-run .fp-list__yn')].map((n) => ({ n, a: n.textContent.split('|') }));
      fill = () => {
        rows.forEach(({ ids, names }) => names.forEach((e, i) => { e.lastChild.textContent = nameOf(byId.get(ids[i])); }));
        runs.forEach(({ n, a }) => { n.textContent = a.length < 2 ? a[0] : lang() === 'zh' ? `${a[0]} 至 ${a[1]}` : `${a[0]} to ${a[1]}`; });
      };
    } else if (KIND === 'prints') {
      // prints: a small contact sheet, one of his photographs from each country, its name and year under it
      const sheet = document.createElement('ol');
      sheet.className = 'fp-list__prints';
      box.append(sheet);
      const S = FP.S || window.SITE;
      const order = abroad.slice().sort((a, b) => a.first - b.first || a.last - b.last);
      const cells = order.map((c) => {
        const li = add(document.createElement('li'), c.id);
        li.className = 'fp-list__print';
        const sc = S && S.countries.find((x) => x.id === c.id);
        const sl = sc && sc.photos.length && S.slides[sc.photos[0]];
        const fr = span('fp-list__frame');
        if (sl) { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = `../images/web/640/${sl.file}`; fr.append(im); }
        const cap = span('fp-list__cap');
        li.append(fr, cap);
        sheet.append(li);
        return { c, cap };
      });
      fill = () => cells.forEach(({ c, cap }) => { cap.textContent = `${nameOf(c)} ${c.first}`; });
    } else {
      // sentence: one paragraph, set as a caption is: "Malaysia in 2010. The Netherlands in 2012. …"
      const p = document.createElement('p');
      p.className = 'fp-list__para';
      box.append(p);
      const order = abroad.slice().sort((a, b) => a.first - b.first || a.last - b.last);
      const bits = order.map((c) => ({ c, el: add(span('fp-list__s'), c.id) }));
      const the = (n) => (/^(United |Netherlands)/.test(n) ? `the ${n}` : n);
      const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
      const andList = (a, l) => (l === 'zh' ? a.join('、') : a.length < 2 ? String(a[0]) : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
      fill = () => {
        const l = lang();
        p.replaceChildren();
        bits.forEach(({ c, el }, i) => {
          el.replaceChildren();
          const nm = span('fp-list__sn', l === 'zh' ? nameOf(c) : cap1(the(nameOf(c))));
          if (l === 'zh') el.append(document.createTextNode(`${andList(c.years, l)} 年，`), nm, document.createTextNode('。'));
          else el.append(nm, document.createTextNode(` in ${andList(c.years, l)}.`));
          p.append(el);
          if (i < bits.length - 1 && l !== 'zh') p.append(document.createTextNode(' '));
        });
      };
    }
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
  // pointing at a year or a country (his note, 2026-11-14: "when my mouse move to it itll highlight that
  // journey on the map on the left and make others dim"): those countries stay on the map (FP.focus in
  // glide-calm.js) and in the list, the rest step back
  const hit = new Map();
  items.forEach((it) => { hit.set(it.el, it.ids || [it.id]); it.el.classList.add('fp-list__hot'); });
  const focus = (el) => {
    const ids = el ? hit.get(el) : null;
    if (FP.focus) FP.focus(ids);
    box.classList.toggle('is-focusing', !!ids);
    items.forEach((it) => it.el.classList.toggle('is-focus', !!ids && (it.el === el || (it.id ? ids.includes(it.id) : it.ids.some((x) => ids.includes(x))))));
  };
  box.addEventListener('pointerover', (e) => { const el = e.target.closest('.fp-list__hot'); if (el && el.classList.contains('is-in')) focus(el); });
  box.addEventListener('pointerout', (e) => { if (!box.contains(e.relatedTarget) || !(e.relatedTarget && e.relatedTarget.closest('.fp-list__hot'))) focus(null); });

  // each comes up as its country's wash begins on the map
  FP.onDraw = (t) => {
    items.forEach((it) => {
      const when = it.ids ? Math.min(...it.ids.map((id) => at.get(id) ?? Infinity)) : at.get(it.id) ?? Infinity;
      const on = when <= t;
      if (on !== it.on) { it.on = on; it.el.classList.toggle('is-in', on); }
    });
  };
})();
