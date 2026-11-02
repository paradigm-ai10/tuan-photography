// Glass block: the Guides list. The guide(s) that exist come first and large, as a closed glass
// stack of their photographs that leads into the guide; every other place follows quietly, its
// photographs now and its guide later. Data: window.SITE.books, .guides, .countries, .slides.

import { Kit, esc } from '../kit/kit.js';
import { stackHTML } from './stack.js';

const SITE = window.SITE;

const words = {
  en: {
    skip: 'Skip to the guides',
    line: 'Where to stand, when the light is right, and how to get there.',
    read: 'Read the guide',
    later: 'Photographs first, the guide later',
    laterLine: 'These places have photographs. Their guides are not written yet.',
  },
  zh: {
    skip: '跳到攻略',
    line: '站在哪裡、什麼時候光線最好、怎麼到那裡。',
    read: '閱讀攻略',
    later: '先有照片，攻略之後再寫',
    laterLine: '這些地方已經有照片，攻略還沒寫。',
  },
};

const country = id => SITE.countries.find(c => c.id === id) || { photos: [] };
// a book's photographs: a city's own (the US is four books), otherwise its country's
const photosOf = b => (b.place
  ? Object.keys(SITE.slides).filter(id => SITE.slides[id].city === b.place)
  : country(b.country).photos.filter(id => SITE.slides[id] && !SITE.slides[id].city)
).filter(id => SITE.slides[id]);

const guides = SITE.books.filter(b => b.guide && SITE.guides[b.guide]);
const later = SITE.books.filter(b => !b.guide).map(b => ({ b, ids: photosOf(b) })).filter(x => x.ids.length);

const featureEl = document.getElementById('feature');
const laterEl = document.getElementById('later');

const kit = Kit({
  here: 'guides',
  words,
  render(k) {
    document.title = `${k.tr('guides')}${k.lang === 'zh' ? '：' : ': '}${SITE.i18n.en.site}`;

    featureEl.innerHTML = guides.map(b => {
      const g = SITE.guides[b.guide];
      const front = g.lead || b.cover;
      const ids = [front, ...photosOf(b).filter(id => id !== front)];
      const meta = (g.i18n[k.lang] || g.i18n.en).aMeta || '';
      const href = `${b.guide}/`;
      return `
        <a class="feature-link" href="${href}" tabindex="-1" aria-hidden="true">
          <div class="stack">${stackHTML(ids, k)}</div>
        </a>
        <div class="feature-text">
          <h2 id="feature-h">${esc(k.pick(g.title))}</h2>
          <p class="feature-facts">${esc(k.pick(g.facts))}</p>
          <p class="feature-note">${esc(meta)}</p>
          <p class="more"><a href="${href}">${esc(k.tr('read'))}</a></p>
        </div>`;
    }).join('');

    laterEl.innerHTML = later.map(({ b, ids }) => {
      const front = ids.includes(b.cover) ? b.cover : ids.includes(b.photo) ? b.photo : ids[0];
      const s = SITE.slides[front];
      const list = [front, ...ids.filter(id => id !== front)].join(' ');
      return `<li style="--ar:${(s.w / s.h).toFixed(4)}"><button type="button" data-open="${front}" data-list="${list}">
        <img src="${k.img(s.file, 640)}" alt="${esc(k.pick(s.alt))}" width="${s.w}" height="${s.h}" loading="lazy" decoding="async">
        <span class="later-name">${esc(k.pick(b.title))}</span>
        <span class="later-when">${esc(k.pick(country(b.country).date))}</span>
      </button></li>`;
    }).join('');
  },
});

// the skip link belongs before the top bar the kit drew
const skip = document.querySelector('.skip');
if (skip) document.body.prepend(skip);
void kit;
