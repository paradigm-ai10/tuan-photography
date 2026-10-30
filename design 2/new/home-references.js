/* Home references (2026-10-30): six reference sites for the home page, each with Good / Not for me
   and a note, saved as he types to ideas/reviews/home-references.json through the site server
   (POST /__reviews/home-references). Claude reads that file directly. */
(() => {
  'use strict';
  const URL_ = '/__reviews/home-references';
  const SITES = [
    { id: 'per-appelgren', name: 'Per Appelgren', url: 'https://perappelgren.de/',
      kind: '時尚攝影師 Fashion photographer',
      look: '白色整頁只有他的名字。滑鼠一動，小張照片在名字四周散開。 A white page with only his name; move the mouse and small prints scatter around it.',
      fits: '克制，照片自己說話，照片上沒有字。 Restraint; nothing written on a photograph.',
      not: '跟作品集的照片牆很像。 Close to your Gallery photo wall.' },
    { id: 'tommaso-dintino', name: 'Tommaso D’intino', url: 'https://tdi.photos/',
      kind: '旅行攝影師 Travel photographer',
      look: '淺灰底，黑白照片像底片格，兩欄慢慢捲過，中間只有名字和地名。 Pale ground, photographs as film frames in two slow columns, only his name and place names between.',
      fits: '跟你一樣是旅行攝影，淺色底，用地名。 Same trade as you, light ground, place names.',
      not: '底片框和經緯度，旅程頁拿掉過經緯度。 Film borders and coordinates; you removed coordinates from the trip page.' },
    { id: 'jon-mccormack', name: 'Jon McCormack', url: 'https://jonmccormack.com/',
      kind: '大自然藝術攝影師 Fine-art nature photographer',
      look: '一進來就是一整張大自然照片，往下捲才出現一句話和 Enter。 Opens on one whole nature photograph; a sentence and Enter come on scroll.',
      fits: '照片就是入口，跟你的定位最近。 The photograph is the entrance, closest to who you are.',
      not: '往下捲後字壓在照片上。 After the scroll, words sit on the photograph.' },
    { id: 'hedwig', name: 'Hedwig', url: 'https://hedwigtravel.com/',
      kind: '旅行規劃 Curated travel',
      look: '頂部一張像隨手拍的旅行照片，下面白底一段字，四個角落各一個小選單字。 A snapshot-like travel photograph on top, plain text on white below, one small word in each corner.',
      fits: '照片很真、很安靜，選單只是角落的小字。 Honest, quiet photograph; the menu is just corner words.',
      not: '照片上有標誌和一行字。 A logo and a line on the photograph.' },
    { id: 'velaa', name: 'Velaa Private Island', url: 'https://www.velaaprivateisland.com/',
      kind: '馬爾地夫度假島 Maldives resort',
      look: '從雲上往下飛向島，接著一封手寫的信放在紙上。 Flies down through clouds to the island, then a handwritten letter on paper.',
      fits: '抵達就像一趟旅程；紙和手寫很有溫度。 Arriving feels like a journey; paper and handwriting are warm.',
      not: '靠影片，很重，度假村的味道。 Video-heavy, a resort feel.' },
    { id: 'tengile-malamala', name: 'Tengile MalaMala', url: 'https://tengilemalamala.com/',
      kind: '非洲野生動物保護區 Safari lodges (Site of the Day)',
      look: '先是安靜的橄欖綠底和小標誌慢慢出現，再打開大地景照片，細的襯線字。 A quiet olive ground with a small mark first, then a wide landscape opens, thin serif type.',
      fits: '開場慢而安靜，大地色，襯線字。 Slow, quiet opening, earth colour, serif type.',
      not: '大標題橫跨照片，違反你的規則。 A big headline across the photograph, against your rule.' }
  ];

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

  function draw() {
    list.textContent = '';
    SITES.forEach((s) => {
      const mine = data.items[s.id] = data.items[s.id] || {};
      mine.name = s.name; mine.url = s.url;
      const li = el('li', 'refs-item');
      li.appendChild(el('p', 'refs-site-kind', s.kind));
      const h = el('h2', 'refs-site-name');
      const a = el('a', '', s.name);
      a.href = s.url; a.target = '_blank'; a.rel = 'noopener';
      h.appendChild(a); li.appendChild(h);
      li.appendChild(el('p', 'refs-look', s.look));
      const pair = el('div', 'refs-pair');
      const p1 = el('p'); p1.appendChild(el('b', '', '合 Fits')); p1.appendChild(document.createTextNode(s.fits));
      const p2 = el('p'); p2.appendChild(el('b', '', '不合 Does not')); p2.appendChild(document.createTextNode(s.not));
      pair.append(p1, p2); li.appendChild(pair);
      const row = el('div', 'refs-row');
      [['good', 'refs-btn', '喜歡 Good'], ['bad', 'refs-btn no', '不是我要的 Not for me']].forEach(([v, cls, label]) => {
        const b = el('button', cls, label);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(mine.verdict === v));
        b.addEventListener('click', () => {
          mine.verdict = mine.verdict === v ? '' : v;
          row.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
          if (mine.verdict) b.setAttribute('aria-pressed', 'true');
          save();
        });
        row.appendChild(b);
      });
      li.appendChild(row);
      const t = el('textarea');
      t.rows = 2;
      t.placeholder = '你喜歡它的哪一點？ What do you like in it?';
      t.setAttribute('aria-label', s.name + ' 筆記 note');
      t.value = mine.note || '';
      t.addEventListener('input', () => { mine.note = t.value; save(); });
      li.appendChild(t);
      list.appendChild(li);
    });
    general.value = data.general || '';
  }

  general.addEventListener('input', () => { data.general = general.value; save(); });

  fetch(URL_).then((r) => r.json()).then((d) => {
    if (d && d.items) data = Object.assign({ items: {}, general: '' }, d);
  }).catch(() => {}).then(draw);
})();
