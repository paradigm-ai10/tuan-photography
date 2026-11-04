/* Logo variations (2026-11-04): his two faces, Cormorant (1) and Cinzel (2), each set six ways (A to F),
   with Good / Not for me and a note saved as he types to ideas/reviews/logo-vary.json
   (POST /__reviews/logo-vary through the site server). Claude reads that file directly. */
(() => {
  'use strict';
  const URL_ = '/__reviews/logo-vary';
  const FACES = [
    { n: 1, id: 'cormorant', name: 'Cormorant Garamond' },
    { n: 2, id: 'cinzel', name: 'Cinzel' }
  ];
  const WAYS = [
    { id: 'a', name: '原樣 As now', say: '上一頁的樣子，用來對照。 As on the last page, to compare against.' },
    { id: 'b', name: '大小靠近 Closer sizes', say: 'TUAN 小一點，PHOTOGRAPHY 大一點，兩行差距變小。 TUAN smaller, PHOTOGRAPHY larger, so the two lines are nearer in size.' },
    { id: 'c', name: '撐滿寬度 Full width', say: 'PHOTOGRAPHY 拉開到跟 TUAN 一樣寬。 PHOTOGRAPHY spread to the exact width of TUAN.' },
    { id: 'd', name: '沒有線 No line', say: '拿掉中間的線，只留兩行字。 The line removed; just the two words.' },
    { id: 'e', name: '更寬更小 Wider, smaller', say: '字距拉更開，字小一點，更安靜。 Letters spaced further apart and set smaller; quieter.' },
    { id: 'f', name: '短線 Short line', say: '線縮短，只在中間一小段。 The line shortened to a small mark in the centre.' }
  ];

  let data = { items: {}, general: '' };
  let timer = 0;
  const saved = document.getElementById('saved');
  const groups = document.getElementById('groups');
  const general = document.getElementById('general');
  const frames = [];

  function save() {
    clearTimeout(timer);
    saved.textContent = '儲存中 Saving';
    timer = setTimeout(() => {
      fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then((r) => r.json())
        .then((r) => { saved.textContent = '已存 Saved ' + (r.saved || ''); })
        .catch(() => { saved.textContent = '沒存到，請用 8642 打開 Not saved: open it on localhost:8642'; });
    }, 500);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  // each word as single letters, so a way can spread PHOTOGRAPHY across TUAN's width
  function letters(word, cls, label) {
    const w = el('div', cls);
    w.setAttribute('aria-label', label);
    word.split('').forEach((c, i) => {
      const s = el('span', '', c);
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);   // the order the letters arrive, read by the stylesheet
      w.appendChild(s);
    });
    return w;
  }

  function mark() {
    const m = el('div', 'lg-mark');
    m.append(letters('TUAN', 'lg-tuan', 'TUAN'), el('span', 'lg-rule'), letters('photography', 'lg-photo', 'photography'));
    return m;
  }

  function play(frame) {
    frame.classList.remove('play');
    void frame.offsetWidth;   // restart the animation
    frame.classList.add('play');
  }

  function draw() {
    FACES.forEach((f) => {
      const sec = el('section', 'lv-group');
      sec.appendChild(el('h2', 'lg-name', f.n + ' · ' + f.name));
      const list = el('ol', 'lg-list');
      WAYS.forEach((w) => {
        const code = f.n + w.id.toUpperCase();
        const mine = data.items[code] = data.items[code] || {};
        mine.name = f.name + ', ' + w.name;
        const li = el('li', 'lg-item f-' + f.id + ' lv-' + w.id);
        const frame = el('div', 'lg-frame');
        frame.appendChild(mark());
        frames.push(frame);
        li.appendChild(frame);
        li.appendChild(el('p', 'lg-kind', code + ' · ' + w.name));
        li.appendChild(el('p', 'lg-say', w.say));
        const row = el('div', 'lg-row');
        [['good', 'lg-btn', '喜歡 Good'], ['bad', 'lg-btn no', '不是我要的 Not for me']].forEach(([v, cls, label]) => {
          const b = el('button', cls, label);
          b.type = 'button';
          b.setAttribute('aria-pressed', String(mine.verdict === v));
          b.addEventListener('click', () => {
            mine.verdict = mine.verdict === v ? '' : v;
            row.querySelectorAll('[aria-pressed]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
            if (mine.verdict) b.setAttribute('aria-pressed', 'true');
            save();
          });
          row.appendChild(b);
        });
        const again = el('button', 'lg-btn replay', '再看一次 Play again');
        again.type = 'button';
        again.addEventListener('click', () => play(frame));
        row.appendChild(again);
        li.appendChild(row);
        const t = el('textarea');
        t.rows = 2;
        t.placeholder = '喜歡或不喜歡哪裡？ What do you like or not?';
        t.setAttribute('aria-label', code + ' 筆記 note');
        t.value = mine.note || '';
        t.addEventListener('input', () => { mine.note = t.value; save(); });
        li.appendChild(t);
        list.appendChild(li);
      });
      sec.appendChild(list);
      groups.appendChild(sec);
    });
    general.value = data.general || '';
    // play each loading screen when it comes into view
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { play(e.target); io.unobserve(e.target); }
    }), { threshold: 0.5 });
    frames.forEach((fr) => io.observe(fr));
  }

  general.addEventListener('input', () => { data.general = general.value; save(); });
  document.getElementById('playall').addEventListener('click', () => frames.forEach(play));

  fetch(URL_).then((r) => r.json()).then((d) => {
    if (d && d.items) data = Object.assign({ items: {}, general: '' }, d);
  }).catch(() => {}).then(draw);
})();
