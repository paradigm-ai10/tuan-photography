/* Journey references (2026-11-05, his ask: a short list of high-end sites from Awwwards, so he can point
   at what 高級感 means to him): six sites, each with Good / Not for me and a note, saved as he types to
   ideas/reviews/journey-references.json through the site server (POST /__reviews/journey-references).
   Claude reads that file directly. The page and its look are home-references.html's. */
(() => {
  'use strict';
  const URL_ = '/__reviews/journey-references';
  const SITES = [
    { group: '高級感，六個 High-end, six' },
    {id: "cartier", name: "Cartier, Le Chœur des Pierres", url: "https://www.cartier.com/en-fr/lechoeurdespierres", kind: "珠寶品牌，Awwwards 每日網站 2026-10-20 Jewellery house, Site of the Day", look: "淺灰像絲綢的底，幾顆寶石在不同深度慢慢漂，往下捲時讓開，中間出現很大的古典襯線標題；分成幾章。 A pale grey ground like silk; a few gemstones drift slowly at different depths, part as you scroll, and a large classical serif title arrives; told in chapters.", fits: "東西很少、動得很慢、有前後深度，整頁只有一種材質。換到地球上：幾張照片在紙上慢慢漂開，讓地球出來。 Very few things, moving slowly, with depth, one material. For the globe: a few prints drifting apart on paper to let it in.", not: "一進去先有 cookie 和選國家的視窗擋住；標題很大。 Cookie and country pop-ups first; the title is big."},
    {id: "velaa", name: "Velaa Private Island", url: "https://www.velaaprivateisland.com/", kind: "馬爾地夫私人島嶼度假村 Private island resort, Maldives", look: "開場像電影：從雲上一路下到水裡，海豚游過，只有一行小字。之後是米白紙上一個手寫簽名，再到深藍底上的照片和細細的襯線字。 Opens like a film: down from the clouds into the water, dolphins passing, one small line. Then a handwritten signature on off-white paper, then photographs on deep navy with a thin serif.", fits: "節奏慢，一個畫面接一個畫面，字非常少。 Slow pacing, one scene into the next, very few words.", not: "用影片開場，有一大段深藍色；有聲音按鈕。 Video-led, long deep navy stretches; a sound button."},
    {id: "hedwig", name: "Hedwig", url: "https://hedwigtravel.com/", kind: "量身規劃的旅行 Curated travel", look: "一整張有底片顆粒的旅行照片，邊上只有很小的字和一個圓形標誌，像一本旅行雜誌。 One full film-grain travel photograph, only small words at the edges and a round mark, like a travel magazine.", fits: "底片的顆粒和顏色，安靜的雜誌感，跟「印刷旅行日誌」很近。 Film grain and colour, a quiet magazine feel, close to your Printed Travel Journal.", not: "照片上寫了一行字；字體偏粗。 A line written over the photograph; bolder type."},
    {id: "martha-king", name: "Martha King Travel", url: "https://www.marthakingtravel.com/", kind: "旅行顧問 Travel advisors", look: "整個畫面都是會動的城市影像（倫敦塔橋），介面幾乎看不到；往下才是排得很整齊的內容。 The whole screen is a moving city image (Tower Bridge), the interface almost invisible; below, content in a neat, elegant structure.", fits: "影像很大、介面很少，讓畫面自己說話。 Big image, almost no interface; the picture speaks.", not: "比較像一般旅行社網站。 Closer to a regular travel agency site."},
    {id: "jon-mccormack", name: "Jon McCormack", url: "https://jonmccormack.com/", kind: "風景攝影師 Fine-art landscape photographer", look: "黑底載入，接著是長曝光的霧海和礁石，顏色很淡很靜；作品照系列分（空拍、極地、植物）。 A black loading screen, then a long-exposure sea in mist over rocks, muted and still; the work in series (aerial, polar, plants).", fits: "跟你一樣是風景攝影師；高級感來自照片本身的安靜和淡色。 A landscape photographer like you; the high-end feel comes from the photographs’ own stillness and muted colour.", not: "黑底，照片上寫了一句大字，兩點都違反你的規則。 A black ground and a large sentence over the photograph, both against your rules."},
    {id: "odyssee", name: "Odyssée", url: "https://www.odysseeclinic.com.au/", kind: "醫美診所，Awwwards 每日網站 2026-10-08 Aesthetic clinic, Site of the Day", look: "灰色的載入畫面，然後一張很大、裁得很近的照片；下面在米白底上一句很大的細襯線字，選單字很小。 A grey loading screen, then one large, closely cropped photograph; below, one large sentence in a light serif on off-white, a tiny menu.", fits: "顏色很少（灰、米白），細襯線，留白很多：最典型的「高級感」排版。 Very few colours (grey, off-white), a light serif, lots of space: the textbook high-end layout.", not: "跟旅行、地圖無關，只能借排版和顏色。 Nothing to do with travel or maps; only the layout and colour to borrow."},
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
