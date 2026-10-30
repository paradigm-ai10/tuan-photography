/* Home references (2026-10-30): six reference sites for the home page, each with Good / Not for me
   and a note, saved as he types to ideas/reviews/home-references.json through the site server
   (POST /__reviews/home-references). Claude reads that file directly. */
(() => {
  'use strict';
  const URL_ = '/__reviews/home-references';
  const SITES = [
    { group: '新的十個 Ten new' },
    { id: 'gregor-collienne', name: 'Gregor Collienne', url: 'https://gregorcollienne.com/',
      kind: '比利時攝影師 Belgian photographer',
      look: '米白紙色整頁，照片像一張張小照片散在四周，往下捲時慢慢飄過，中間只有名字。 Warm off-white page, photographs scattered like loose prints that drift past as you scroll, only his name in the middle.',
      fits: '最像你喜歡的 Per Appelgren，而且是暖紙色。 Closest to Per Appelgren, which you liked, on warm paper.',
      not: '人像為主，名字很大。 Mostly portraits; the name is large.' },
    { id: 'christie-hemm-klok', name: 'Christie Hemm Klok', url: 'https://christiehemmklok.com/',
      kind: '攝影記者，以地方為主 Photojournalist, stories rooted in place',
      look: '白底，大小不一的照片錯落排開，名字拆在四個角落。 White ground, photographs of different sizes set off-grid, her name split across the four corners.',
      fits: '照片錯落，像桌上攤開的照片；以地方為主。 Prints laid out like a table of photographs; about places.',
      not: '名字用螢光黃，很搶。 The name is neon yellow and loud.' },
    { id: 'samuel-regan', name: 'Samuel Regan', url: 'https://www.samuelregan.com/',
      kind: '紐約導演、攝影師 Director and photographer, New York',
      look: '白色整頁是一面小照片牆，大小交錯，一進來全部攤開。 A white page that is one wall of small images at mixed sizes, all laid out at once.',
      fits: '一眼看到全部作品，照片自己說話。 All the work at a glance; the photographs speak.',
      not: '混了設計作品，不只照片。 Mixed with design work, not only photographs.' },
    { id: 'tamaki-yoshida', name: 'Tamaki Yoshida', url: 'https://www.tamakiyoshida.com/',
      kind: '日本視覺藝術家 Japanese visual artist',
      look: '幾乎空白的第一屏，底部一行很大的襯線名字；往下是作品格，名稱和年份在照片下面。 An almost empty first screen with a large serif name along the bottom; below, a grid of work with title and year under each.',
      fits: '襯線字、大量留白、名字在照片下面，跟你的規則一樣。 Serif type, lots of white space, names beneath photographs, like your rules.',
      not: '作品格偏黑，展覽感。 The grid is dark, exhibition-like.' },
    { id: 'kenichi-aikawa', name: 'Kenichi Aikawa', url: 'https://aikawakenichi.com/',
      kind: '東京攝影師 Tokyo photographer',
      look: '白底，超大的襯線 PORTFOLIO，前面一條彎曲的照片帶慢慢轉，像一圈底片。 White ground, a huge serif PORTFOLIO with a curved band of photographs turning in front of it, like a loop of film.',
      fits: '白、襯線、照片會動但很慢。 White, serif, photographs that move, slowly.',
      not: '照片壓在大字上面，3D 效果偏炫。 Photographs sit over big type; the 3D curve is showy.' },
    { id: 'reverie-safaris', name: 'Reverie Safaris', url: 'https://reveriesafaris.com/',
      kind: '非洲旅行 Safari travel',
      look: '和 Tengile 同一路：一整張安靜的大地景，上面只有細細的名字；往下是深綠底一段字，再接一張照片。 Same family as Tengile: one quiet wide landscape with only a thin name on it, then a deep green band of text, then a photograph.',
      fits: '你說有點喜歡 Tengile，這個更安靜，字更少。 You said you kind of like Tengile; this one is quieter, with fewer words.',
      not: '名字和選單在照片上。 Name and menu sit on the photograph.' },
    { id: 'tour-kyrgyzstan', name: 'Tour Kyrgyzstan', url: 'https://tour-kyrgyzstan.com/',
      kind: '中亞探險旅行 Central Asia expeditions',
      look: '像一本攤開的雜誌：細線分格，黑白照片，打字機一樣的小字。 Like an open magazine: thin ruled grid, black-and-white photographs, typewriter-like small type.',
      fits: '印刷雜誌的感覺，跟「印刷旅行日誌」很近。 A printed-magazine feel, close to your Printed Travel Journal.',
      not: '字很多，大標題全大寫。 A lot of text and capital headlines.' },
    { id: 'index-georgia', name: 'Index_Georgia', url: 'https://index-georgia.com/',
      kind: '喬治亞街頭藝術檔案 Archive of Georgian street art',
      look: '白底，一張很大的照片，下面一行小字寫是什麼、哪一年，其他什麼都沒有。 White ground, one large photograph, one small line beneath saying what and when, nothing else.',
      fits: '最克制，照片在上、名字在下。 The most restrained: photograph above, name below.',
      not: '可能太簡單，沒有個性。 Maybe too plain, little character.' },
    { id: 'andrii-mur', name: 'Andrii Mur', url: 'https://www.andriimur.com/',
      kind: '街頭與紀實攝影師 Street and documentary photographer',
      look: '一個系列一張照片，往下捲一個接一個換，系列名字在左邊。 One photograph per series, changing one after another as you scroll, the series name to the left.',
      fits: '一次只看一張，慢慢看。 One photograph at a time, slowly.',
      not: '深灰底，不是你的紙色。 Dark grey ground, not your paper.' },
    { id: 'tuscan-journey', name: 'The Tuscan Journey (Max Mara)', url: 'https://weekend-mm-2026-pasticcino-bag-master.monogrid.io/en/',
      kind: '品牌活動，Site of the Day Brand campaign',
      look: '你坐在火車車廂裡，窗外是一段段旅程，橄欖綠和皮革色。 You sit in a train compartment and the journey passes outside the window, olive and leather colours.',
      fits: '把「旅程」做成一個場景，很有溫度。 Turns a journey into a place you sit in; warm.',
      not: '是精品廣告，有按鈕和音樂，太熱鬧。 A fashion campaign with buttons and sound; busy.' },
    { group: '已經看過的六個 The six you rated' },
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
      if (s.group) { list.appendChild(el('li', 'refs-group', s.group)); return; }
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
