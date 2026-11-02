// Glass block: one guide (the folder's <body data-guide="…">, here Barcelona).
// Its photographs open as a small glass stack, then the guide reads as a long page on the dark
// ground. The words are his, from window.SITE.guides[id]: `html` is the guide as written for the
// current site, `i18n` holds every string of it in English and 中文 by key. This page reads that
// html, puts the chosen language into it, and lays it out again: the photo spots table becomes a
// list of spots, each with its photograph where one exists (matched by its map pin), best time,
// note and map link; every photograph opens the viewer. Nothing is rewritten or added.

import { Kit, esc } from '../../kit/kit.js';
import { stackHTML, arrive } from '../stack.js';

const SITE = window.SITE;
const ID = document.body.dataset.guide;
const G = SITE.guides[ID];
const SRC = new DOMParser().parseFromString(G.html, 'text/html');

// the guide's photographs in the order it shows them, its lead first
const inGuide = [...SRC.querySelectorAll('[data-slide]')].map(a => a.dataset.slide).filter(id => SITE.slides[id]);
const ORDER = [...new Set([G.lead, ...inGuide].filter(id => SITE.slides[id]))];
const LIST = ORDER.join(' ');

const words = {
  en: { skip: 'Skip to the guide', all: 'All guides' },
  zh: { skip: '跳到攻略內文', all: '所有攻略' },
};

const $ = id => document.getElementById(id);
const stackEl = $('g-stack');
const tocEl = $('g-toc');
const bodyEl = $('g-body');

/* ---- a photograph in the guide: bare, the name and the camera data beneath, never on it ---- */
function figure(id, k, T) {
  const s = SITE.slides[id];
  const name = T[`sp_${id}`] || k.pick(s.place);
  const alt = T[`sa_${id}`] || k.pick(s.alt);
  const data = [s.focal, s.aperture, s.shutter, s.iso && `ISO ${s.iso}`].filter(Boolean)
    .map(x => `<span>${esc(x)}</span>`).join('');
  const tall = s.h > s.w;
  return `<figure class="shot ${tall ? 'is-tall' : 'is-wide'}" style="--ar:${(s.w / s.h).toFixed(4)}">
    <button type="button" class="shot-open" data-open="${id}" data-list="${LIST}">
      <img src="${k.img(s.file, 1280)}" srcset="${k.img(s.file, 640)} 640w, ${k.img(s.file, 1280)} 1280w, ${k.img(s.file, '')} ${s.w}w"
        sizes="(max-width: 760px) 92vw, ${tall ? '24rem' : '52rem'}" width="${s.w}" height="${s.h}" alt="${esc(alt)}" loading="lazy" decoding="async">
    </button>
    <figcaption><span class="shot-name">${esc(name)}</span>${data ? `<span class="shot-data">${data}</span>` : ''}</figcaption>
  </figure>`;
}

const node = (doc, html) => { const t = doc.createElement('div'); t.innerHTML = html.trim(); return t.firstElementChild; };
const textOf = cell => [...cell.childNodes].filter(n => n.nodeType === 3 || !n.classList?.contains('ate')).map(n => n.textContent).join('').trim();

/* ---- the guide, in one language ---- */
function build(k) {
  const T = { ...G.i18n.en, ...(G.i18n[k.lang] || {}) };
  const doc = SRC.cloneNode(true);
  const root = doc.body;

  root.querySelectorAll('[data-i18n]').forEach(el => { const v = T[el.dataset.i18n]; if (v != null) el.textContent = v; });
  root.querySelectorAll('[data-i18n-html]').forEach(el => { const v = T[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
  // names and prices that are the same in both languages still carry the old dashes: plain hyphens
  const tw = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (/[–—]/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/[–—]/g, '-');
  root.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));

  const art = root.querySelector('article.body') || root;
  const tables = [...art.querySelectorAll('table.sheet')];

  // quick facts: a key and value sheet reads better as a list of pairs
  tables.filter(t => !t.tHead).forEach(t => {
    const cap = t.caption ? t.caption.textContent : '';
    const rows = [...t.rows].map(r => `<div><dt>${r.cells[0].innerHTML}</dt><dd>${r.cells[1].innerHTML}</dd></div>`).join('');
    const box = t.closest('.glance__card') || t.closest('.sheet-wrap') || t;
    box.replaceWith(node(doc, `<div class="facts-box"><h3 class="facts-h">${cap}</h3><dl class="facts">${rows}</dl></div>`));
  });

  // the photo spots: one entry per spot, with its photograph where the guide has one for that pin
  const used = new Set();
  const spotT = tables.find(t => t.caption && t.caption.dataset.i18n === 't1cap');
  if (spotT) {
    const heads = [...spotT.tHead.rows[0].cells].map(c => c.textContent);
    const spots = [...spotT.tBodies[0].rows].map(r => {
      const [n, when, note, map] = r.cells;
      const a = map && map.querySelector('a');
      const href = a ? a.getAttribute('href') : '';
      const photo = href && ORDER.find(id => SITE.slides[id].map === href && !used.has(id));
      if (photo) used.add(photo);
      const s = photo && SITE.slides[photo];
      const name = n.textContent.trim();
      return `<section class="spot${photo ? ` has-shot ${s.h > s.w ? 'is-tall' : 'is-wide'}` : ''}">
        ${photo ? figure(photo, k, T) : ''}
        <div class="spot-text">
          <h3>${n.innerHTML}</h3>
          <p class="spot-when"><span class="spot-lbl">${esc(heads[1])}</span><span class="${when.classList.contains('best') ? 'is-best' : ''}">${when.innerHTML}</span></p>
          <p class="spot-note">${note.innerHTML}</p>
          ${href ? `<p class="spot-map"><a href="${esc(href)}" target="_blank" rel="noopener">${esc(T.mapLink)}<span class="sr">: ${esc(name)}</span></a></p>` : ''}
        </div>
      </section>`;
    }).join('');
    (spotT.closest('.sheet-wrap') || spotT).replaceWith(node(doc, `<div class="spots">${spots}</div>`));
  }

  // every other photograph where the guide put it; the ones now beside their spot leave their row
  art.querySelectorAll('figure.piece').forEach(f => {
    const a = f.querySelector('[data-slide]');
    const id = a && a.dataset.slide;
    if (!id || !SITE.slides[id] || used.has(id)) { f.remove(); return; }
    f.replaceWith(node(doc, figure(id, k, T)));
  });
  art.querySelectorAll('.wall__row').forEach(row => {
    if (!row.querySelector('figure')) row.remove();
    else row.className = `shots n${row.querySelectorAll('figure').length}`;
  });

  // the other tables: each cell knows its column's name, so a phone can show rows as small blocks
  art.querySelectorAll('table.sheet').forEach(t => {
    if (!t.tHead) return;
    const heads = [...t.tHead.rows[0].cells].map(c => c.textContent);
    [...t.tBodies[0].rows].forEach(r => {
      const name = textOf(r.cells[0]);
      [...r.cells].forEach((c, i) => {
        c.setAttribute('data-h', heads[i] || '');
        const a = c.querySelector('a[target="_blank"]');
        if (a) {
          c.classList.add('c-link');
          a.insertAdjacentHTML('beforeend', `<span class="sr">: ${esc(name)}</span>`);
        }
      });
    });
  });

  const toc = root.querySelector('nav.toc');
  return {
    T,
    toc: toc ? `<h2 id="toc-h">${esc(T.tocLabel || '')}</h2>${toc.querySelector('ol').outerHTML}` : '',
    body: art.innerHTML,
  };
}

/* ---- the contents list follows the reading ---- */
let heads = [];
function follow() {
  const links = [...tocEl.querySelectorAll('a[href^="#"]')];
  let at = null;
  const line = innerHeight * 0.3;
  for (const h of heads) { if (h.getBoundingClientRect().top < line) at = h.id; else break; }
  links.forEach(a => {
    if (a.getAttribute('href') === `#${at}`) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; follow(); });
}, { passive: true });

/* ---- the page ---- */
let first = true;
Kit({
  here: 'guides',
  words,
  render(k) {
    const { T, toc, body } = build(k);
    document.title = T.docTitle || `${k.pick(G.title)}: ${SITE.i18n.en.site}`;
    $('g-title').textContent = T.aTitle || k.pick(G.title);
    $('g-facts').textContent = k.pick(G.facts);
    $('g-meta').textContent = T.aMeta || '';
    stackEl.innerHTML = stackHTML(ORDER, k, { open: true });
    tocEl.innerHTML = toc;
    bodyEl.innerHTML = body;
    heads = [...bodyEl.querySelectorAll('h2[id]')];
    follow();
    if (first) {
      first = false;
      arrive(stackEl);
      const target = location.hash && document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  },
});

// the skip link belongs before the top bar the kit drew
const skip = document.querySelector('.skip');
if (skip) document.body.prepend(skip);
