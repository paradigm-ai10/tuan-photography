// Glass block, the shared parts of every page (design 5): the top bar, the language switch, the
// footer and the photo viewer, all drawn from window.SITE (../../../journey/data.js).
//
//   import { Kit } from '../kit/kit.js';
//   const kit = Kit({ here: 'portfolio', words: { en: {...}, zh: {...} }, render() { ... } });
//   kit.tr('key'), kit.pick({en, zh}), kit.img(file, 640|1280|''), kit.open(listOfIds, id, opener)
//
// render() is called once at start and again whenever the language changes.

const SITE = window.SITE;
const html = document.documentElement;
const ROOT = new URL('../../../', import.meta.url);           // the site's root, wherever the page is
const HOME = new URL('../', import.meta.url);                 // design 5 / glass /

const BASE = {
  en: {
    switch: '中文', series: SITE.i18n.en.series, portfolio: 'Portfolio', guides: 'Guides', trips: 'Trips',
    follow: SITE.i18n.en.follow, prev: 'Previous', next: 'Next', close: SITE.i18n.en.close, best: SITE.i18n.en.best,
    list: ', ',
  },
  zh: {
    switch: 'EN', series: SITE.i18n.zh.series, portfolio: '作品集', guides: '攻略', trips: '旅程',
    follow: SITE.i18n.zh.follow, prev: '上一張', next: '下一張', close: SITE.i18n.zh.close, best: SITE.i18n.zh.best,
    list: '、',
  },
};

export const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function Kit({ here = '', words = { en: {}, zh: {} }, render = () => {} } = {}) {
  let lang = 'en';
  try { if (localStorage.getItem('d5-lang') === 'zh') lang = 'zh'; } catch (e) { /* private window */ }
  const T = { en: { ...BASE.en, ...words.en }, zh: { ...BASE.zh, ...words.zh } };
  const tr = k => T[lang][k];
  const pick = o => (o ? (o[lang] || o.en || '') : '');
  const img = (file, size = 1280) => new URL(`images/web/${size ? size + '/' : ''}${file}`, ROOT).href;
  const link = path => new URL(path, HOME).href;

  /* ---- top bar and footer ---- */
  const top = document.createElement('header');
  top.className = 'top on-page';
  top.innerHTML = `
    <a class="series" href="${link('./')}" data-k="series"></a>
    <nav class="words" aria-label="Site">
      <a href="${link('portfolio/')}" data-k="portfolio"${here === 'portfolio' ? ' aria-current="page"' : ''}></a>
      <a href="${link('guides/')}" data-k="guides"${here === 'guides' ? ' aria-current="page"' : ''}></a>
      <a href="${link('trips/')}" data-k="trips"${here === 'trips' ? ' aria-current="page"' : ''}></a>
      <button type="button" class="lang" data-k="switch"></button>
    </nav>`;
  document.body.prepend(top);
  const foot = document.createElement('footer');
  foot.className = 'foot';
  foot.innerHTML = `<p class="foot-name" data-k="series"></p><p><a href="${esc(SITE.instagram.url)}" data-k="follow"></a></p>`;
  const main = document.querySelector('main');
  (main ? main.after(foot) : document.body.append(foot));
  top.querySelector('.lang').addEventListener('click', () => {
    lang = lang === 'en' ? 'zh' : 'en';
    try { localStorage.setItem('d5-lang', lang); } catch (e) { /* ignore */ }
    apply();
  });

  /* ---- the viewer ---- */
  const v = document.createElement('div');
  v.className = 'viewer'; v.tabIndex = -1; v.hidden = true;
  v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-labelledby', 'v-place');
  v.innerHTML = `<figure class="v-figure"><img alt=""><figcaption class="v-cap"><h2 class="v-place" id="v-place"></h2>
    <p class="v-where"></p><p class="v-note"></p><p class="v-made"></p></figcaption></figure>
    <div class="v-words"><button type="button" data-v="-1" data-k="prev"></button><button type="button" data-v="1" data-k="next"></button><button type="button" data-v="0" data-k="close"></button></div>`;
  document.body.append(v);
  const vImg = v.querySelector('img');
  const state = { list: null, i: 0, opener: null };
  const made = s => [[s.camera, s.lens].filter(Boolean).join(', '),
    [s.focal, s.aperture, s.shutter, s.iso && `ISO ${s.iso}`].filter(Boolean).join('  ')].filter(Boolean).join('. ');
  function show() {
    const s = SITE.slides[state.list[state.i]];
    vImg.src = img(s.file, 1280);
    vImg.srcset = `${img(s.file, 1280)} 1280w, ${img(s.file, '')} 2400w`;
    vImg.sizes = '92vw';
    vImg.alt = pick(s.alt);
    v.querySelector('.v-place').textContent = pick(s.place);
    v.querySelector('.v-where').textContent = pick(s.where);
    v.querySelector('.v-note').textContent = [pick(s.note), s.best && `${tr('best')}: ${pick(s.best)}`].filter(Boolean).join(' ');
    v.querySelector('.v-made').textContent = made(s);
    const many = state.list.length > 1;
    v.querySelectorAll('[data-v="-1"], [data-v="1"]').forEach(b => { b.hidden = !many; });
  }
  function open(list, id, opener) {
    state.list = list.filter(x => SITE.slides[x]);
    state.i = Math.max(0, state.list.indexOf(id));
    state.opener = opener || document.activeElement;
    show();
    v.hidden = false;
    html.classList.add('v-open');
    v.focus();
  }
  function close() {
    v.hidden = true;
    html.classList.remove('v-open');
    state.list = null;
    vImg.removeAttribute('src'); vImg.removeAttribute('srcset');
    if (state.opener && state.opener.focus) state.opener.focus({ preventScroll: true });
  }
  const step = d => { state.i = (state.i + d + state.list.length) % state.list.length; show(); };
  v.addEventListener('click', e => {
    const b = e.target.closest('[data-v]');
    if (b) { const d = +b.dataset.v; d ? step(d) : close(); }
    else if (e.target === v) close();
  });
  document.addEventListener('keydown', e => {
    if (v.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && state.list.length > 1) step(-1);
    else if (e.key === 'ArrowRight' && state.list.length > 1) step(1);
    else if (e.key === 'Tab') {
      const f = [...v.querySelectorAll('button')].filter(b => !b.hidden);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === v)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // any element with data-open="id" (and optional data-list="id id id") opens the viewer
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    e.preventDefault();
    open((b.dataset.list || b.dataset.open).split(' '), b.dataset.open, b);
  });

  /* ---- words ---- */
  function apply() {
    html.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    html.dataset.lang = lang;
    document.querySelectorAll('[data-k]').forEach(el => {
      const val = T[lang][el.dataset.k];
      if (typeof val === 'string') el.textContent = val;
    });
    top.querySelector('.lang').lang = lang === 'zh' ? 'en' : 'zh-Hant';
    render(api);
    if (state.list) show();
  }

  const api = { SITE, tr, pick, img, link, root: ROOT.href, open, esc, get lang() { return lang; } };
  apply();
  return api;
}
