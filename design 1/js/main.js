/* ==========================================================
   tuan photography 陳亮元: site behavior
   1. EN / 中文 switcher   2. Menu   3. Looking at one photograph
   4. Guide contents marker
   ========================================================== */

/* ---------- 1. Language switcher ----------
   Every translated element has data-i18n="key".
   data-i18n-html is the same but keeps bold text.
   data-i18n-alt / data-i18n-aria translate an image's alt text
   and a control's spoken label.
   Add new text in BOTH dictionaries below. */

const i18n = {
  en: {
    navGallery: 'Gallery',
    navGuides: 'Guides',
    navAbout: 'About',
    navJourney: 'Journey',
    navMenu: 'Menu',
    skip: 'Skip to the content',
    footNote: '© 2026 tuan photography 陳亮元. All photographs are my own.',
    followCta: 'Follow on Instagram',
    vMaking: 'How it was made',
    vCamera: 'Camera',
    vLens: 'Lens',
    vFocal: 'Focal length',
    vAperture: 'Aperture',
    vShutter: 'Shutter',
    vIso: 'ISO',
    vBest: 'Best time',
    vGuide: 'Read the guide',
    vNoGuide: 'The guide for this place is not written yet.',
    vMap: 'Open the map pin',
    vClose: 'Close',
    vPrev: 'Previous',
    vNext: 'Next'
  },
  zh: {
    navGallery: '作品集',
    navGuides: '攻略',
    navAbout: '關於我',
    navJourney: '旅程',
    navMenu: '選單',
    skip: '跳到內容',
    footNote: '© 2026 tuan photography 陳亮元。所有照片皆為本人拍攝。',
    followCta: '追蹤 Instagram',
    vMaking: '這張怎麼拍',
    vCamera: '相機',
    vLens: '鏡頭',
    vFocal: '焦距',
    vAperture: '光圈',
    vShutter: '快門',
    vIso: 'ISO',
    vBest: '最佳時間',
    vGuide: '閱讀攻略',
    vNoGuide: '這個地方的攻略還沒寫。',
    vMap: '打開地圖座標',
    vClose: '關閉',
    vPrev: '上一張',
    vNext: '下一張'
  }
};

/* Pages can define their own extra translations in a
   window.pageI18n = { en: {...}, zh: {...} } block before this file loads. */
if (window.pageI18n) {
  Object.assign(i18n.en, window.pageI18n.en || {});
  Object.assign(i18n.zh, window.pageI18n.zh || {});
}

let lang = 'en';
const t = key => i18n[lang][key] ?? i18n.en[key] ?? '';

function setLang(next) {
  lang = next === 'zh' ? 'zh' : 'en';
  const dict = i18n[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = dict[el.dataset.i18n];
    if (v !== undefined) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const v = dict[el.dataset.i18nHtml];
    if (v !== undefined) el.innerHTML = v;
  });
  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    const v = dict[el.dataset.i18nAlt];
    if (v !== undefined) el.alt = v;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const v = dict[el.dataset.i18nAria];
    if (v !== undefined) el.setAttribute('aria-label', v);
  });
  if (dict.docTitle) document.title = dict.docTitle;
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  document.getElementById('lang-en')?.setAttribute('aria-pressed', String(lang === 'en'));
  document.getElementById('lang-zh')?.setAttribute('aria-pressed', String(lang === 'zh'));
  try { localStorage.setItem('tlap-lang', lang); } catch (e) { /* private mode */ }
  if (viewer?.open) renderViewer();
  document.dispatchEvent(new Event('langchange'));   // for a page's own script (wall.js)
}

document.getElementById('lang-en')?.addEventListener('click', () => setLang('en'));
document.getElementById('lang-zh')?.addEventListener('click', () => setLang('zh'));

/* ---------- 2. Menu (small screens) ---------- */
const menuBtn = document.querySelector('.menu-btn');
const menu = document.querySelector('.menu');
menuBtn?.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});

/* The opening photograph stays in place under the page. When the keyboard reaches it
   from further down, go back up to it so what has focus can be seen (on the home page it
   is the second screen, under the film). */
const coverLink = document.querySelector('.cover a');
coverLink?.addEventListener('focus', () => {
  const before = coverLink.closest('.cover').previousElementSibling;
  if (coverLink.matches(':focus-visible')) window.scrollTo(0, before ? before.offsetHeight : 0);
});

/* A window part way down the page: its photograph is fixed to the screen, and drifts
   slowly as the window passes, at a fraction of the page's speed. The number goes to the
   stylesheet as --drift; nothing moves under "reduce motion". */
const panes = [...document.querySelectorAll('.window')];
if (panes.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let waiting = false;
  const drift = () => {
    waiting = false;
    const vh = window.innerHeight;
    panes.forEach(pane => {
      const r = pane.getBoundingClientRect();
      const passage = (r.top + r.height) / (vh + r.height);   // 1 as it enters at the foot, 0 as it leaves at the top
      pane.style.setProperty('--drift', `${((passage - 0.5) * 0.24 * vh).toFixed(1)}px`);
    });
  };
  window.addEventListener('scroll', () => { if (!waiting) { waiting = true; requestAnimationFrame(drift); } }, { passive: true });
  window.addEventListener('resize', drift);
  drift();
}

/* ---------- 3. Looking at one photograph ----------
   The photographs on this page are listed in a JSON block (#slides-data).
   Opening one shows it large, with how it was made beside it.
   Every photograph has its own address: page.html#view-<id> */

const root = document.documentElement.dataset.root || '';
const dataEl = document.getElementById('slides-data');
const slides = dataEl ? JSON.parse(dataEl.textContent) : [];
const order = [...new Set([...document.querySelectorAll('[data-slide]')].map(el => el.dataset.slide))]
  .filter(id => slides.some(s => s.id === id));

let viewer = null;
let current = null;

function buildViewer() {
  viewer = document.createElement('dialog');
  viewer.className = 'viewer';
  viewer.setAttribute('aria-labelledby', 'viewer-place');
  viewer.tabIndex = -1;
  viewer.innerHTML = `
    <div class="viewer__bar">
      <div>
        <button id="viewer-prev" type="button"></button>
        <button id="viewer-next" type="button"></button>
        <span class="viewer__count num" id="viewer-count"></span>
      </div>
      <button id="viewer-close" type="button"></button>
    </div>
    <div class="viewer__photo"><img id="viewer-img" alt=""></div>
    <div class="viewer__side">
      <div>
        <h2 id="viewer-place" aria-live="polite"></h2>
        <p class="viewer__where" id="viewer-where"></p>
      </div>
      <div>
        <h3 id="viewer-making"></h3>
        <dl id="viewer-data"></dl>
      </div>
      <p class="viewer__note" id="viewer-note"></p>
      <div class="viewer__acts" id="viewer-acts"></div>
    </div>`;
  document.body.append(viewer);
  const tidy = () => {
    if (history.state?.viewer) history.back();
    else if (location.hash.startsWith('#view-')) history.replaceState(null, '', location.pathname + location.search);
    document.querySelector(`[data-slide="${current}"]`)?.focus({ preventScroll: true });
  };
  /* the phone's Back closes the photograph instead of leaving the site */
  window.addEventListener('popstate', () => {
    if (viewer.open && !location.hash.startsWith('#view-')) viewer.close();
  });
  /* a sideways swipe on the photograph steps to the next one */
  let touchX = null, touchY = null;
  const photo = viewer.querySelector('.viewer__photo');
  photo.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
  photo.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
    touchX = touchY = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  viewer.querySelector('#viewer-close').addEventListener('click', () => { viewer.close(); tidy(); });
  viewer.querySelector('#viewer-prev').addEventListener('click', () => step(-1));
  viewer.querySelector('#viewer-next').addEventListener('click', () => step(1));
  viewer.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });   /* Escape closes the dialog itself, and 'close' below tidies up once */
  viewer.addEventListener('close', tidy);
}

function row(label, value) {
  return value ? `<div><dt>${label}</dt><dd>${value}</dd></div>` : '';
}

function renderViewer() {
  const s = slides.find(x => x.id === current);
  if (!s) return;
  const img = viewer.querySelector('#viewer-img');
  if (!img.src.endsWith('/' + s.file)) {
    img.setAttribute('aria-busy', 'true');
    img.onload = () => img.removeAttribute('aria-busy');
    img.sizes = '(max-width: 56rem) 100vw, calc(100vw - 20rem)';
    img.srcset = s.srcset;
    img.src = root + 'images/web/' + s.file;
  }
  img.width = s.w;
  img.height = s.h;
  img.alt = s.alt[lang];
  viewer.querySelector('#viewer-place').textContent = s.place[lang];
  viewer.querySelector('#viewer-where').textContent = s.where[lang];
  viewer.querySelector('#viewer-making').textContent = t('vMaking');
  viewer.querySelector('#viewer-data').innerHTML =
    row(t('vBest'), s.best?.[lang]) +
    row(t('vFocal'), s.focal) +
    row(t('vAperture'), s.aperture) +
    row(t('vShutter'), s.shutter) +
    row(t('vIso'), s.iso) +
    row(t('vLens'), s.lens) +
    row(t('vCamera'), s.camera);
  const note = viewer.querySelector('#viewer-note');
  note.textContent = s.note?.[lang] ?? (s.guide ? '' : t('vNoGuide'));
  note.hidden = !note.textContent;
  const acts = [];
  if (s.guide) acts.push(`<a class="btn" href="${root}${s.guide}#s-${s.id}">${t('vGuide')}</a>`);
  if (s.map) acts.push(`<a href="${s.map}" target="_blank" rel="noopener">${t('vMap')}</a>`);
  viewer.querySelector('#viewer-acts').innerHTML = acts.join('');
  viewer.querySelector('#viewer-close').textContent = t('vClose');
  viewer.querySelector('#viewer-prev').textContent = t('vPrev');
  viewer.querySelector('#viewer-next').textContent = t('vNext');
  const many = order.length > 1;
  viewer.querySelector('#viewer-prev').hidden = !many;
  viewer.querySelector('#viewer-next').hidden = !many;
  const count = viewer.querySelector('#viewer-count');
  count.hidden = !many;
  count.textContent = `${order.indexOf(current) + 1} / ${order.length}`;
}

function pick(id, from) {
  if (!slides.some(s => s.id === id)) return;
  if (!viewer) buildViewer();
  current = id;
  const show = () => {
    renderViewer();
    if (!viewer.open) { viewer.showModal(); viewer.querySelector('#viewer-close').focus({ preventScroll: true }); }
  };
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const thumb = from?.querySelector('img');
  if (document.startViewTransition && thumb && !still && !viewer.open) {
    const big = viewer.querySelector('#viewer-img');
    thumb.style.viewTransitionName = 'picked';
    const vt = document.startViewTransition(() => {
      thumb.style.viewTransitionName = '';
      big.style.viewTransitionName = 'picked';
      show();
    });
    vt.ready.catch(() => {});
    vt.finished.catch(() => {}).finally(() => { big.style.viewTransitionName = ''; });
  } else {
    show();
  }
  if (history.state?.viewer) history.replaceState({ viewer: true }, '', '#view-' + id);
  else history.pushState({ viewer: true }, '', '#view-' + id);
}

function step(d) {
  if (order.length < 2) return;
  const i = order.indexOf(current);
  current = order[(i + d + order.length) % order.length];
  renderViewer();
  history.replaceState({ viewer: true }, '', '#view-' + current);
}

document.querySelectorAll('a[data-slide]').forEach(el => {
  el.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    pick(el.dataset.slide, el);
  });
});

/* ---------- 4. Books in a row ----------
   The books stand in a row, the one in front at the middle and the rest stepped back
   on either side. The wheel, the arrow keys, a swipe, or the page's own scrolling move
   the row; a click on a book further along brings it to the front; the book in front
   opens. Each book's distance from the front goes to the stylesheet as --d. */
const stackEl = document.querySelector('.stack');
if (stackEl) {
  const stage = stackEl.parentElement;
  const books = [...stackEl.children];
  const n = books.length;
  let cur = 0, settle = null, lastY = window.scrollY, shown = false;
  const place = () => {
    books.forEach((book, i) => {
      const d = i - cur, far = Math.abs(d);
      book.style.setProperty('--d', d.toFixed(3));
      book.style.setProperty('--z', (-far * 5).toFixed(2) + 'rem');
      book.style.setProperty('--o', Math.max(0.3, 1 - far * 0.22).toFixed(2));
      book.hidden = far > 5;
      book.classList.toggle('front', Math.round(cur) === i);
    });
  };
  const go = (to, snap = true) => {
    cur = Math.min(n - 1, Math.max(0, to));
    place();
    clearTimeout(settle);
    if (!snap) settle = setTimeout(() => go(Math.round(cur)), 160);
  };
  place();
  new IntersectionObserver(([e]) => { shown = e.isIntersecting; }).observe(stage);
  books.forEach((book, i) => {
    book.addEventListener('click', e => {
      if (i === Math.round(cur)) return;            // the book in front opens
      e.preventDefault();
      go(i);
    });
    book.addEventListener('focus', () => go(i));   // the keyboard walks the row
  });
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.round(cur) + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.round(cur) - 1); }
  });
  stage.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); go(cur + e.deltaX / 90, false); }
  }, { passive: false });
  let touchX = null;
  stage.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchmove', e => {
    if (touchX === null) return;
    go(cur - (e.touches[0].clientX - touchX) / 70, false); touchX = e.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', () => { touchX = null; go(Math.round(cur)); });
  /* the page's own scrolling walks the row while it is in view */
  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastY; lastY = window.scrollY;
    if (shown && !stage.matches(':hover')) go(cur + dy / 260, false);
  }, { passive: true });
}

/* ---------- 4b. Timed cards (experiment timed-cards) ----------
   After Giulio Cuscito's "Timed Cards Opening": one place fills the stage, the next places wait
   as cards in a row. Every few seconds the first card leaves the row and grows until it is
   the new background, the place's name rises in at the left line by line, the row closes up and
   the place just left joins the end. The arrows step either way, and a card can be clicked to
   bring its place forward. It waits while the stage is out of view, the tab is hidden, a
   photograph is open in the viewer, the pointer is over it or the keyboard is inside it, and
   for as long as the visitor has pressed Pause. While it plays by itself it says nothing to a
   screen reader; a step the visitor asked for is announced. Under "reduce motion" it changes
   only on the arrows, at once, and the Pause word is not shown.
   Each card's slot goes to the stylesheet as --j. */
const tcEl = document.querySelector('.tc');
if (tcEl) {
  const P = JSON.parse(document.getElementById('tc-data').textContent);
  const N = P.length, EVERY = 4000, GROW = 1200;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = 'cubic-bezier(0.65, 0, 0.25, 1)', out = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const bg = tcEl.querySelector('.tc__bg'), row = tcEl.querySelector('.tc__cards');
  const text = tcEl.querySelector('.tc__text'), count = tcEl.querySelector('.tc__count');
  const root = document.documentElement.dataset.root || '';
  const L = () => document.documentElement.lang === 'zh-Hant' ? 'zh' : 'en';
  const word = key => (window.pageI18n?.[L()] || {})[key] || key;
  const big = p => `${root}images/web/1280/${p.f}`;
  let cur = 0, busy = false, timer = null, inView = false, paused = false, held = false;
  const pause = tcEl.querySelector('.tc__pause');
  const mod = k => (k % N + N) % N;

  const card = (k, j) => {
    const p = P[k], li = document.createElement('li');
    li.className = 'tc__card'; li.dataset.k = k;
    li.innerHTML = `<img src="${root}images/web/640/${p.f}" alt="" decoding="async"><span class="tc__foot"><i></i><small></small><b></b></span>`;
    li.querySelector('small').textContent = p.where[L()];
    li.querySelector('b').textContent = p.name[L()];
    slot(li, j);
    return li;
  };
  const slot = (li, j) => { li.style.setProperty('--j', j); li.hidden = j > 6; li.dataset.j = j; };
  const layer = (k, asCard) => {
    const d = document.createElement('div');
    d.className = 'tc__layer' + (asCard ? ' is-card' : ''); d.dataset.k = k;
    d.innerHTML = `<img src="${big(P[k])}" alt="" decoding="async"><i class="tc__shade"></i>`;
    return d;
  };
  const fill = k => {
    const p = P[k], l = L();
    text.querySelector('.tc__where').textContent = p.where[l];
    text.querySelector('.tc__title').innerHTML = (l === 'zh' ? [p.name.zh] : p.name.en.split(' '))
      .map(w => `<span class="tc__line"><span></span></span>`).join('');
    const ws = l === 'zh' ? [p.name.zh] : p.name.en.split(' ');
    text.querySelectorAll('.tc__line > span').forEach((s, n) => { s.textContent = ws[n]; });
    text.querySelector('.tc__note').textContent = p.note[l];
    const a = text.querySelector('.tc__btn'); a.href = p.href; a.textContent = word(p.btn);
  };
  const number = k => {
    const s = count.querySelector('span');
    s.textContent = String(k + 1).padStart(2, '0');
    tcEl.querySelector('.tc__bar').style.setProperty('--p', ((k + 1) / N).toFixed(4));
    return s;
  };
  const draw = () => {   // the whole state at once: the first view, a language change, reduce motion
    bg.replaceChildren(layer(cur, false));
    row.replaceChildren(...Array.from({ length: N - 1 }, (_, j) => card(mod(cur + 1 + j), j)));
    fill(cur); number(cur);
  };
  const preload = k => { const im = new Image(); im.src = big(P[k]); };

  // the new words come in: the old fade away, then the title rises line by line, the rest after it
  const words = k => {
    const parts = [...text.children];
    parts.forEach(el => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-0.6rem)' }],
      { duration: 380, delay: 150, easing: 'ease-in', fill: 'forwards' }));
    setTimeout(() => {
      fill(k);
      parts.forEach(el => el.getAnimations().forEach(a => a.cancel()));
      text.querySelectorAll('.tc__line > span').forEach((s, n) =>
        s.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }], { duration: 750, delay: n * 90, easing: out, fill: 'backwards' }));
      [text.querySelector('.tc__rule'), text.querySelector('.tc__where')].forEach(el =>
        el.animate([{ opacity: 0, transform: 'translateY(0.6rem)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: out, fill: 'backwards' }));
      [text.querySelector('.tc__note'), text.querySelector('.tc__btn')].forEach((el, n) =>
        el.animate([{ opacity: 0, transform: 'translateY(0.8rem)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 220 + n * 90, easing: out, fill: 'backwards' }));
      number(k).animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 600, easing: out });
    }, 950);
  };
  const box = el => {
    const s = tcEl.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height };
  };
  const px = b => ({ left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
  /* The flight between a card's box and the whole stage. The layer always covers the stage and is
     only ever clipped and moved, never resized, so the browser does not lay the page out again on
     every frame. At the card end the photograph is scaled down and centred on the card, so it shows
     exactly the card's crop; at the stage end it is the full background. */
  const flight = (lay, b, toStage) => {
    const W = tcEl.clientWidth, H = tcEl.clientHeight, im = lay.querySelector('img');
    const iw = im.naturalWidth || P[+lay.dataset.k].w, ih = im.naturalHeight || P[+lay.dataset.k].h;
    const k = Math.max(b.width / iw, b.height / ih) / Math.max(W / iw, H / ih);
    const dx = b.left + b.width / 2 - W / 2, dy = b.top + b.height / 2 - H / 2;
    const card = { clip: `inset(${b.top}px ${W - b.left - b.width}px ${H - b.top - b.height}px ${b.left}px round 12px)`,
                   img: `translate(${dx}px, ${dy}px) scale(${k})` };
    const stage = { clip: 'inset(0px 0px 0px 0px round 0px)', img: 'translate(0px, 0px) scale(1)' };
    const [a, z] = toStage ? [card, stage] : [stage, card];
    const opts = { duration: GROW, easing: 'cubic-bezier(0.65, 0, 0.25, 1)', fill: 'forwards' };
    lay.classList.add('is-flying');
    im.animate([{ transform: a.img }, { transform: z.img }], opts);
    lay.querySelector('.tc__shade').animate([{ opacity: toStage ? 0 : 1 }, { opacity: toStage ? 1 : 0 }], { ...opts, easing: toStage ? 'ease-in' : 'ease-out' });
    return lay.animate([{ clipPath: a.clip }, { clipPath: z.clip }], opts).finished;
  };

  const next = () => {
    if (busy) return;
    const first = row.querySelector('.tc__card[data-j="0"]');
    if (still || !first) { cur = mod(cur + 1); draw(); return; }
    busy = true;
    const was = cur; cur = mod(cur + 1);
    const b = box(first);
    // the card leaves the row and becomes the top layer of the stage, then opens out to fill it
    const fly = layer(cur, false), im = fly.querySelector('img');
    im.src = first.querySelector('img').currentSrc || first.querySelector('img').src;
    const sharp = new Image(); sharp.src = big(P[cur]);
    sharp.decode().then(() => { im.src = sharp.src; }, () => {});
    bg.append(fly); first.remove();
    flight(fly, b, true).then(() => {
      fly.getAnimations({ subtree: true }).forEach(an => an.cancel());
      fly.classList.remove('is-flying');
      [...bg.children].forEach(c => { if (c !== fly) c.remove(); });
      busy = false; plan();
    });
    // the rest of the row closes up, and the place just left joins the end
    setTimeout(() => {
      row.querySelectorAll('.tc__card').forEach(li => slot(li, +li.dataset.j - 1));
      const end = card(was, N - 2);
      row.append(end);
      end.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 300, easing: out, fill: 'backwards' });
    }, 520);
    words(cur);
    preload(mod(cur + 1));
  };

  const prev = () => {
    if (busy) return;
    const first = row.querySelector('.tc__card[data-j="0"]');
    if (still || !first) { cur = mod(cur - 1); draw(); return; }
    busy = true;
    const was = cur; cur = mod(cur - 1);
    const b = box(first), top = bg.lastElementChild;
    bg.prepend(layer(cur, false));   // the place before waits underneath
    // the row opens a slot at the front, and the card that comes back to be the stage leaves the end
    row.querySelector(`.tc__card[data-k="${cur}"]`)?.remove();
    row.querySelectorAll('.tc__card').forEach(li => slot(li, +li.dataset.j + 1));
    flight(top, b, false).then(() => {
      row.prepend(card(was, 0));
      top.remove(); busy = false; plan();
    });
    words(cur);
  };

  const plan = () => {
    clearTimeout(timer);
    if (still || !inView || document.hidden || paused || held) return;
    // while a photograph is open in the viewer, wait and look again (his call, 2026-10-13)
    timer = setTimeout(() => {
      if (viewer?.open) return plan();
      text.setAttribute('aria-live', 'off');
      next();
    }, EVERY);
  };
  const asked = () => { clearTimeout(timer); text.setAttribute('aria-live', 'polite'); };
  tcEl.querySelectorAll('.tc__arrow').forEach(btn => btn.addEventListener('click', () => {
    asked();
    (btn.dataset.go === '1' ? next : prev)();
    if (!busy) plan();
  }));
  row.addEventListener('click', e => {
    const li = e.target.closest('.tc__card');
    if (!li || busy) return;
    asked();
    if (+li.dataset.j === 0 && !still) next();   // the first card opens out, as it would by itself
    else { cur = +li.dataset.k; draw(); }
    if (!busy) plan();
  });
  // held still while the pointer is over the stage or the keyboard is inside it
  const hold = () => { held = tcEl.matches(':hover') || tcEl.matches(':focus-within'); held ? clearTimeout(timer) : plan(); };
  tcEl.addEventListener('mouseenter', hold);
  tcEl.addEventListener('mouseleave', hold);
  tcEl.addEventListener('focusin', hold);
  tcEl.addEventListener('focusout', () => setTimeout(hold));
  const say = () => { const k = paused ? 'tcPlay' : 'tcPause'; pause.dataset.i18n = k; pause.textContent = word(k); pause.setAttribute('aria-pressed', paused); };
  if (still) pause.hidden = true;
  pause.addEventListener('click', () => { paused = !paused; say(); paused ? clearTimeout(timer) : plan(); });
  document.addEventListener('langchange', say);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; plan(); }, { threshold: 0.5 }).observe(tcEl);
  document.addEventListener('visibilitychange', plan);
  document.addEventListener('langchange', () => { if (!busy) draw(); });
  draw();
  preload(mod(cur + 1));
}

/* ---------- 5. Guide contents: mark the section being read ---------- */
const tocLinks = [...document.querySelectorAll('.toc a[href^="#"]')];
if (tocLinks.length && 'IntersectionObserver' in window) {
  const byId = new Map(tocLinks.map(a => [a.getAttribute('href').slice(1), a]));
  const seen = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      tocLinks.forEach(a => a.removeAttribute('aria-current'));
      byId.get(e.target.id)?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-10% 0px -75% 0px' });
  byId.forEach((a, id) => { const h = document.getElementById(id); if (h) seen.observe(h); });
}

/* ---------- start ---------- */
let saved = null;
try { saved = localStorage.getItem('tlap-lang'); } catch (e) { /* private mode */ }
const first = saved || ((navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en');
if (first === 'zh') setLang('zh');

const fromAddress = () => { if (location.hash.startsWith('#view-')) pick(location.hash.slice(6)); };
window.addEventListener('hashchange', fromAddress);
fromAddress();
