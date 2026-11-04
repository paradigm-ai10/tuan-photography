/* The directions of the new website, with his Good / Not for me and a note for each.
   Saved through the review store (review.js) to ideas/reviews/design5.json, which Claude reads. */
(() => {
  const R = window.Review;
  const DIRS = [
    ['relief', 'Relief', '浮雕', 'The mountains you shot, cut from real elevation into a plaster model on a table. Scrolling is a day on each: the sun crosses the model, night falls and the land becomes the next mountain. Light and quiet.', '你拍過的山，用真實高度做成石膏模型放在桌上。往下捲是每座山的一天：太陽劃過模型，入夜後地形變成下一座山。明亮、安靜。'],
    ['orrery', 'Orrery', '天體儀', 'A brass-and-paper instrument with the earth at its centre and your trips as rings around it. Scrolling turns it through time, each trip coming forward with its photographs. Warm paper.', '黃銅和紙做的儀器，地球在中間，每趟旅行是一圈環。往下捲它隨時間轉動，每趟旅行帶著照片轉到前面。溫暖的紙色。'],
  ];
  const ol = document.getElementById('dirs');
  const status = document.getElementById('status');
  const say = () => { status.textContent = 'Saved. Claude can read it. 已存。'; };
  DIRS.forEach(([id, en, zh, den, dzh]) => {
    R.name(id, en);
    const it = R.item(id);
    const li = document.createElement('li');
    li.innerHTML = `<div class="d-head"><h2><a href="${id}/">${en} <span lang="zh-Hant">${zh}</span></a></h2>
      <a class="open" href="${id}/">Open 打開</a></div>
      <p>${den}<br><span lang="zh-Hant">${dzh}</span></p>
      <div class="verdict" role="group" aria-label="${en}">
        <button type="button" data-v="good">Good 喜歡</button><button type="button" data-v="bad">Not for me 不要</button></div>
      <textarea rows="3" placeholder="What you like, what to change / 喜歡什麼、要改什麼"></textarea>`;
    const ta = li.querySelector('textarea');
    ta.value = it.note || '';
    const mark = () => li.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === R.item(id).verdict)));
    li.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
      R.setScore(id, b.dataset.v === 'good' ? 5 : 1); mark(); say();
    }));
    let tm; ta.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { R.item(id).note = ta.value; R.save(id); say(); }, 500); });
    mark();
    ol.append(li);
  });
  const g = document.getElementById('general');
  g.value = (R.data.general) || '';
  let gt; g.addEventListener('input', () => { clearTimeout(gt); gt = setTimeout(() => { R.data.general = g.value; R.save('*general'); say(); }, 500); });
  R.on(() => { document.querySelectorAll('.dirs li').forEach((li, k) => { const id = DIRS[k][0]; const ta = li.querySelector('textarea'); if (document.activeElement !== ta) ta.value = R.item(id).note || ''; }); });
  R.pull();
})();
