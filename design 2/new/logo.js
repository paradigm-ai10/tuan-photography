/* Logo typeface trial (2026-10-31): twelve typefaces for TUAN photography, each as the loading screen,
   with Good / Not for me and a note saved as he types to ideas/reviews/logo-fonts.json
   (POST /__reviews/logo-fonts through the site server). Claude reads that file directly. */
(() => {
  'use strict';
  // one script, two pages: logo.html (the twelve, Good / Not for me) and logo-final.html (the last five,
  // one choice), told apart by <body data-review> and data-set
  const REVIEW = document.body.dataset.review || 'logo-fonts';
  const FINAL = document.body.dataset.set === 'final';
  const URL_ = '/__reviews/' + REVIEW;
  const ALL = [
    { id: 'playfair', name: 'Playfair Display', kind: '現在網站的標題字 The site’s heading face now',
      say: '跟網站現在的標題一樣，標誌和網站一體。photography 用斜體。 Same as the site’s headings, so the logo and site are one; photography in italic.' },
    { id: 'cormorant', name: 'Cormorant Garamond Light', kind: '細的古典襯線 Light classical serif',
      say: '細、高反差、很優雅，最接近你喜歡的 Tengile 那種細襯線。 Thin, high contrast, elegant; closest to the thin serif on Tengile, which you liked.' },
    { id: 'italiana', name: 'Italiana', kind: '極細的時尚襯線 Hairline fashion serif',
      say: '非常細，像雜誌封面或香水瓶，很安靜但小尺寸會太淡。 Very fine, like a magazine cover; quiet, but faint at small sizes.' },
    { id: 'bodoni', name: 'Bodoni Moda', kind: '經典高反差 Classic high contrast',
      say: '粗細對比強烈，有 Vogue 的味道，比較硬、比較時尚。 Strong thick and thin strokes, a Vogue feel; firmer and more fashion.' },
    { id: 'fraunces', name: 'Fraunces Light', kind: '溫暖的手作襯線 Warm, soft serif',
      say: '筆畫邊角圓潤，像舊書和手工印刷，跟暖紙色最搭。 Soft rounded details, like old books and letterpress; the best match for warm paper.' },
    { id: 'instrument', name: 'Instrument Serif', kind: '窄的現代編輯襯線 Narrow editorial serif',
      say: '窄、現代，很有雜誌感；缺點是最近很多設計工作室都在用。 Narrow and modern, very editorial; but many studios use it right now.' },
    { id: 'cinzel', name: 'Cinzel', kind: '羅馬碑文大寫 Roman inscription capitals',
      say: '像刻在石頭上的字，古典、地標感；只有大寫，photography 會變成小大寫。 Like letters cut in stone, monumental; capitals only, so photography becomes small capitals.' },
    { id: 'marcellus', name: 'Marcellus', kind: '溫和的古典大寫 Gentle flared capitals',
      say: '收筆微微張開，像 Cinzel 的柔和版本，有手感。 Strokes flare slightly at the ends; a softer Cinzel with a hand-made feel.' },
    { id: 'jost', name: 'Jost', kind: '幾何無襯線，像 Futura Geometric sans, Futura-like',
      say: 'Per Appelgren 的名字就是這一類，乾淨、現代、攝影師常用。 The kind Per Appelgren’s name uses; clean, modern, common with photographers.' },
    { id: 'josefin', name: 'Josefin Sans Light', kind: '復古幾何無襯線 Vintage geometric sans',
      say: '細長、優雅，帶 1920 年代旅行海報的味道。 Fine and elegant, with a 1920s travel-poster flavour.' },
    { id: 'tenor', name: 'Tenor Sans', kind: '人文無襯線 Humanist sans',
      say: '安靜、清楚、有一點書法的溫度，不搶照片。 Quiet and clear with a little calligraphic warmth; never competes with a photograph.' },
    { id: 'signature', name: 'Cormorant + Pinyon Script', kind: '大寫加手寫 Capitals with a signature',
      say: 'TUAN 用細襯線大寫，photography 用手寫，像在照片背後簽名。 TUAN in thin serif capitals, photography in script, like signing the back of a print.' },
    { id: 'castoro', name: 'Castoro Titling', kind: '銳利的碑文大寫 Sharp inscription capitals',
      say: '新的。介於 Cinzel 和 Cormorant 之間：像 Cinzel 一樣是刻字的大寫，但更細、更銳利。 New. Between Cinzel and Cormorant: carved capitals like Cinzel, but finer and sharper.' },
    { id: 'forum', name: 'Forum', kind: '細長的羅馬字 Slender Roman letters',
      say: '新的。古羅馬的字形，比 Cinzel 窄、安靜，有小寫，photography 寫起來自然。 New. Roman letterforms, narrower and quieter than Cinzel, with real lowercase for photography.' }
  ];
  const SETS = {
    all: ['playfair', 'cormorant', 'italiana', 'bodoni', 'fraunces', 'instrument', 'cinzel', 'marcellus', 'jost', 'josefin', 'tenor', 'signature'],
    final: ['cormorant', 'cinzel', 'signature', 'castoro', 'forum']
  };
  const FACES = (SETS[document.body.dataset.set] || SETS.all).map((id) => ALL.find((f) => f.id === id));

  let data = { items: {}, general: '' };
  let timer = 0;
  const saved = document.getElementById('saved');
  const list = document.getElementById('list');
  const general = document.getElementById('general');

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

  function mark() {
    const m = el('div', 'lg-mark');
    const t = el('div', 'lg-tuan');
    t.setAttribute('aria-label', 'TUAN');
    'TUAN'.split('').forEach((c, i) => {
      const s = el('span', '', c);
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);   // the order the letters arrive, read by the stylesheet
      t.appendChild(s);
    });
    m.append(t, el('span', 'lg-rule'), el('div', 'lg-photo', 'photography'));
    return m;
  }

  function play(frame) {
    frame.classList.remove('play');
    void frame.offsetWidth;   // restart the animation
    frame.classList.add('play');
  }

  const frames = [];
  function draw() {
    list.textContent = '';
    FACES.forEach((f, n) => {
      const mine = data.items[f.id] = data.items[f.id] || {};
      mine.name = f.name;
      const li = el('li', 'lg-item f-' + f.id);
      const frame = el('div', 'lg-frame');
      frame.appendChild(mark());
      frames.push(frame);
      li.appendChild(frame);
      const small = el('div', 'lg-small');
      small.append(mark(), el('span', 'lg-small-menu', 'Gallery  Journey  Guides  About'));
      li.appendChild(small);
      li.appendChild(el('p', 'lg-kind', (n + 1) + ' · ' + f.kind));
      li.appendChild(el('h2', 'lg-name', f.name));
      li.appendChild(el('p', 'lg-say', f.say));
      const row = el('div', 'lg-row');
      if (FINAL) {
        const pick = el('button', 'lg-btn pick', '選這個 Choose this one');
        pick.type = 'button';
        pick.setAttribute('aria-pressed', String(data.choice === f.id));
        pick.addEventListener('click', () => {
          data.choice = data.choice === f.id ? '' : f.id;
          data.choiceName = data.choice ? f.name : '';
          document.querySelectorAll('.lg-btn.pick').forEach((x) => x.setAttribute('aria-pressed', 'false'));
          if (data.choice) pick.setAttribute('aria-pressed', 'true');
          save();
        });
        row.appendChild(pick);
      } else [['good', 'lg-btn', '喜歡 Good'], ['bad', 'lg-btn no', '不是我要的 Not for me']].forEach(([v, cls, label]) => {
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
      t.setAttribute('aria-label', f.name + ' 筆記 note');
      t.value = mine.note || '';
      t.addEventListener('input', () => { mine.note = t.value; save(); });
      li.appendChild(t);
      list.appendChild(li);
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
