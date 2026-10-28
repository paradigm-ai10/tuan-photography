/* The Journey page's kit (experiment `journey`): the facts, the words in both languages, the
   trip model (stops, photographs, distances), the site's top bar, the line map and a photograph
   viewer. Several directions were tried with it; on 2026-10-18 he chose the scroll-craft Journey
   (journey.js). The Logbook and the rest are at the tags journey-versions-trimmed-2026-10-18 and
   journey-five-versions-2026-10-18. */
(() => {
  'use strict';

  const S = window.SITE;
  const ask = new URLSearchParams(location.search);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (s, el = document) => el.querySelector(s);

  /* ------------------------------------------------------------ words */

  const WORDS = {
    en: {
      site: 'tuan photography', menu: 'Menu',
      nav: { gallery: 'Gallery', journey: 'Journey', guides: 'Guides', about: 'About' },
      journey: 'Journey',
      intro: 'Every trip I have taken with a camera, newest first.',
      trips: (n) => `${n} trips`, countries: (n) => `${n} countries`,
      since: (y) => `since ${y}`,
      photos: (n) => (n === 1 ? '1 photograph' : `${n} photographs`),
      stops: (n) => (n === 1 ? '1 stop' : `${n} stops`),
      km: (n) => `${n.toLocaleString('en')} km`,
      blank: 'No photograph yet', none: 'No photographs from this trip yet',
      noRoute: 'The route of this trip is not recorded',
      mode: { flight: 'by air', car: 'by car', train: 'by train', bus: 'by bus', ground: 'overland' },
      leg: (m, f) => `${m} from ${f}`, then: ', then ',
      home: 'Home', and: ' and ', list: ', ',
      open: 'The trip, along its route',
      all: 'All trips',
      guides: (c) => `Guides for ${c}`,
      passed: 'The places it passed, in Guides',
      went: 'Trips that went there',
      prev: 'Previous', next: 'Next', close: 'Close',
      older: 'Older trip', newer: 'Newer trip',
      count: (i, n) => `${i} / ${n}`,
    },
    zh: {
      site: 'tuan photography', menu: '選單',
      nav: { gallery: '作品集', journey: '旅程', guides: '攻略', about: '關於我' },
      journey: '旅程',
      intro: '每一趟帶著相機的旅行，從最近的開始。',
      trips: (n) => `${n} 趟旅行`, countries: (n) => `${n} 個國家`,
      since: (y) => `從 ${y} 年起`,
      photos: (n) => `${n} 張照片`,
      stops: (n) => `${n} 站`,
      km: (n) => `${n.toLocaleString('en')} 公里`,
      blank: '還沒有照片', none: '這趟還沒有照片',
      noRoute: '這趟的路線沒有記錄',
      mode: { flight: '搭飛機', car: '開車', train: '搭火車', bus: '搭巴士', ground: '走陸路' },
      leg: (m, f) => `從${f}${m}`, then: '，再',
      home: '回家', and: '與', list: '、',
      open: '沿著路線看這趟',
      all: '所有旅程',
      guides: (c) => `${c}的攻略`,
      passed: '這趟經過的地方，在攻略裡',
      went: '去過那裡的旅程',
      prev: '上一張', next: '下一張', close: '關閉',
      older: '更早的一趟', newer: '更近的一趟',
      count: (i, n) => `${i} / ${n}`,
    },
  };

  // the language is the site's one choice, shared with every tab
  let lang = 'en';
  try { lang = localStorage.getItem('tlap-lang') === 'zh' ? 'zh' : 'en'; } catch (e) { /* storage blocked */ }
  if (ask.get('lang')) lang = ask.get('lang') === 'zh' ? 'zh' : 'en';
  const listeners = [];

  /* ------------------------------------------------------------ the trips, from the facts */

  const country = (id) => S.countries.find((c) => c.id === id);
  const R = 6371;
  const km = (a, b) => Math.round(d3.geoDistance([a[1], a[0]], [b[1], b[0]]) * R);
  // a photograph that belongs to a stop other than the nearest one
  const BELONGS = { aoraki: 'Twizel (Mt Cook)' };
  const HOME = S.flightsFrom;

  function build(J) {
    const countries = J.countries.map(country).filter(Boolean);
    const places = new Map();
    for (const leg of J.legs) {
      for (const end of [leg.from, leg.to]) {
        const had = places.get(end.city);
        if (!had || (had.code && !end.code)) places.set(end.city, { city: end.city, zh: end.zh, ll: [end.lat, end.lng], code: end.code });
      }
    }
    const legs = J.legs.map((l) => ({ mode: l.mode, from: places.get(l.from.city), to: places.get(l.to.city), km: 0 }));
    legs.forEach((l) => { l.km = km(l.from.ll, l.to.ll); });

    // a chapter for each place reached; a town only passed back through joins the next one
    const chapters = [];
    if (legs.length) {
      const home = legs[0].from;
      const seen = new Set([home.city]);
      let pending = [];
      legs.forEach((leg, i) => {
        pending.push(leg);
        const next = legs[i + 1];
        if (seen.has(leg.to.city) && next && next.from === leg.to) return;
        const athome = leg.to === home || (HOME && Math.hypot(leg.to.ll[0] - HOME[0], leg.to.ll[1] - HOME[1]) < 0.6);
        chapters.push({ legs: pending, at: leg.to, home: !next && athome, photos: [] });
        seen.add(leg.to.city);
        pending = [];
      });
    } else {
      // no route recorded: one stop for each country
      for (const c of countries) chapters.push({ legs: [], at: { city: c.name.en, zh: c.name.zh, ll: c.ll }, home: false, photos: [], country: c });
    }
    const stops = chapters.filter((c) => !c.home);
    const countryOf = (ll) => {
      let best = null, bd = Infinity;
      for (const c of countries) { const d = Math.hypot(c.ll[0] - ll[0], c.ll[1] - ll[1]); if (d < bd) { bd = d; best = c; } }
      return best;
    };
    stops.forEach((s) => { s.country = s.country || countryOf(s.at.ll); });

    // the trip's own photographs: its countries', taken while it lasted (the months of its
    // legs and the one after). A photograph whose file carries no date belongs here only if no
    // other journey went to its country. (The same rule as the trip page before it.)
    const months = J.legs.map((l) => l.month).filter(Boolean).sort();
    const nextMonth = (m) => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; };
    const from = months[0], till = months.length ? nextMonth(months[months.length - 1]) : null;
    const ours = (id) => {
      const s = S.slides[id];
      if (!s) return false;
      if (s.taken) return from ? (s.taken.slice(0, 7) >= from && s.taken.slice(0, 7) <= till) : s.taken.slice(0, 4) === J.id.slice(0, 4); // no months: its year
      return S.journeys.filter((j) => (j.countries || []).includes(s.country)).length === 1;
    };
    const photos = countries.flatMap((c) => c.photos).filter(ours);
    for (const id of photos) {
      const s = S.slides[id];
      if (!s || !s.ll) continue;
      let ch = BELONGS[id] && stops.find((c) => c.at.city === BELONGS[id]);
      if (!ch) {
        let bd = Infinity;
        for (const c of stops) { const d = Math.hypot(c.at.ll[0] - s.ll[0], (c.at.ll[1] - s.ll[1]) * Math.cos((s.ll[0] * Math.PI) / 180)); if (d < bd) { bd = d; ch = c; } }
      }
      if (ch) ch.photos.push(id);
    }
    // the photographs in the order the trip met them
    const ordered = stops.flatMap((s) => s.photos);
    return {
      id: J.id, J, countries, legs, chapters, stops, photos: ordered,
      year: J.id.slice(0, 4),
      km: legs.reduce((n, l) => n + l.km, 0),
      lead: ordered.find((id) => S.slides[id].w >= S.slides[id].h) || ordered[0] || null,
    };
  }

  const trips = S.journeys.map(build);
  const byId = (id) => trips.find((t) => t.id === id);

  /* ------------------------------------------------------------ helpers the directions share */

  const W = () => WORDS[lang];
  const nameOf = (p) => (lang === 'zh' ? p.zh || p.city : p.city);
  const joinNames = (names) => {
    const w = W();
    return names.length > 2 ? names.slice(0, -1).join(w.list) + w.and + names[names.length - 1] : names.join(w.and);
  };
  const title = (t) => joinNames(t.countries.map((c) => c.name[lang]));
  const when = (t) => t.J.date[lang];
  const route = (t) => t.stops.map((s) => nameOf(s.at));
  const legLine = (c) => c.legs.map((l, i) => {
    const w = W();
    const s = w.leg(w.mode[l.mode] || l.mode, nameOf(l.from));
    return i === 0 ? s : w.then + s;
  }).join('');
  const src = (f, n) => `../images/web/${n ? n + '/' : ''}${f}`;
  // a photograph, at its own shape; --ar carries the shape to the stylesheet
  const img = (id, sizes, cls = '') => {
    const s = S.slides[id];
    return `<img class="${cls}" src="${src(s.file, 1280)}" srcset="${src(s.file, 640)} 640w, ${src(s.file, 1280)} 1280w, ${src(s.file)} 2400w" sizes="${sizes}" width="${s.w}" height="${s.h}" alt="${esc(s.alt[lang])}" loading="lazy" decoding="async" data-photo="${id}">`;
  };
  // a photograph with its name beneath; --ar on the frame lets rows share out their width
  const shot = (id, sizes, cap = true) => {
    const s = S.slides[id];
    return `<figure class="shot" style="--ar: ${(s.w / s.h).toFixed(4)}">${img(id, sizes, 'shot__img')}${cap ? `<figcaption class="shot__cap">${esc(s.place[lang])}</figcaption>` : ''}</figure>`;
  };
  const guideHref = (c) => {
    const g = Object.entries(S.guides).find(([, v]) => v.country === c.id);
    return g ? `../../posts/${g[0]}.html` : `../../countries/${c.id}.html`;
  };
  const tripHref = (t) => `?trip=${encodeURIComponent(t.id)}`;
  const tally = () => {
    const visited = new Set(S.countries.map((c) => c.id));
    const first = trips.map((t) => t.year).sort()[0];
    return { trips: trips.length, countries: visited.size, since: first };
  };

  /* ------------------------------------------------------------ the site's top bar */

  function topbar(here) {
    const w = W();
    const items = [['gallery', '../../gallery.html'], ['journey', './' + location.pathname.split('/').pop()], ['guides', '../../guides.html'], ['about', '../../about.html']];
    return `<header class="top">
      <a class="top__name" href="../../index.html">${esc(w.site)} <span lang="zh-Hant">陳亮元</span></a>
      <nav class="top__nav" aria-label="Site"><ul>${items.map(([k, h]) => `<li><a href="${k === 'journey' ? h.split('?')[0] : h}"${k === here ? ' aria-current="page"' : ''}>${esc(w.nav[k])}</a></li>`).join('')}</ul></nav>
      <div class="top__lang" role="group" aria-label="Language">
        <button type="button" data-lang="en" aria-pressed="${lang === 'en'}" lang="en">EN</button>
        <button type="button" data-lang="zh" aria-pressed="${lang === 'zh'}" lang="zh-Hant">中文</button>
      </div>
    </header>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    lang = b.dataset.lang;
    try { localStorage.setItem('tlap-lang', lang); } catch (err) { /* storage blocked */ }
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    listeners.forEach((f) => f());
  });

  /* ------------------------------------------------------------ the map: one quiet line drawing */

  let worldP = null;
  const world = () => worldP || (worldP = fetch('../vendor/countries-50m.json').then((r) => r.json()).then((topo) => ({
    land: topojson.feature(topo, topo.objects.land),
    countries: topojson.feature(topo, topo.objects.countries).features,
    borders: topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b),
  })));
  // land, his countries in their tone, borders and coast, into a d3 selection
  async function drawWorld(sel, projection, { borders = true } = {}) {
    const w = await world();
    const path = d3.geoPath(projection);
    const g = sel.append('g').attr('class', 'world');
    g.append('path').attr('class', 'land').attr('d', path(w.land));
    g.selectAll('path.visited').data(w.countries.filter((f) => visitedIso.has(f.id))).join('path')
      .attr('class', 'visited').attr('data-iso', (f) => f.id).attr('d', path);
    if (borders) g.append('path').attr('class', 'border').attr('d', path(w.borders));
    g.append('path').attr('class', 'coast').attr('d', path(w.land));
    return { g, path, w };
  }
  // his countries, as the world atlas numbers them (Dubai is the Emirates)
  const ISO = {
    spain: '724', uk: '826', france: '250', andorra: '020', vietnam: '704', china: '156', singapore: '702',
    australia: '036', 'new-zealand': '554', 'south-korea': '410', usa: '840', 'hong-kong': '344', japan: '392',
    germany: '276', switzerland: '756', dubai: '784', thailand: '764', myanmar: '104', netherlands: '528',
    malaysia: '458', taiwan: '158',
  };
  const visitedIso = new Set(S.countries.map((c) => ISO[c.id]).filter(Boolean));
  const legLine2 = (l) => ({ type: 'LineString', coordinates: [[l.from.ll[1], l.from.ll[0]], [l.to.ll[1], l.to.ll[0]]] });

  /* ------------------------------------------------------------ the viewer */

  let vlist = [], vi = 0, lastFocus = null;
  function viewer() {
    let v = $('#viewer');
    if (v) return v;
    v = document.createElement('div');
    v.id = 'viewer';
    v.className = 'viewer';
    v.hidden = true;
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-modal', 'true');
    v.innerHTML = `<figure class="viewer__fig"><img class="viewer__img" alt=""><figcaption class="viewer__cap"><span class="viewer__name"></span><span class="viewer__where"></span><span class="viewer__count"></span></figcaption></figure>
      <div class="viewer__words"><button type="button" class="viewer__prev"></button><button type="button" class="viewer__next"></button><button type="button" class="viewer__close"></button></div>`;
    document.body.appendChild(v);
    $('.viewer__prev', v).addEventListener('click', () => step(-1));
    $('.viewer__next', v).addEventListener('click', () => step(1));
    $('.viewer__close', v).addEventListener('click', closeViewer);
    v.addEventListener('click', (e) => { if (e.target === v) closeViewer(); });
    document.addEventListener('keydown', (e) => {
      if (v.hidden) return;
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
    return v;
  }
  function showViewer() {
    const v = viewer();
    const w = W();
    const s = S.slides[vlist[vi]];
    const im = $('.viewer__img', v);
    im.src = src(s.file);
    im.alt = s.alt[lang];
    $('.viewer__name', v).textContent = s.place[lang];
    $('.viewer__where', v).textContent = s.where[lang];
    $('.viewer__count', v).textContent = w.count(vi + 1, vlist.length);
    $('.viewer__prev', v).textContent = w.prev;
    $('.viewer__next', v).textContent = w.next;
    $('.viewer__close', v).textContent = w.close;
    $('.viewer__prev', v).hidden = $('.viewer__next', v).hidden = vlist.length < 2;
  }
  function step(d) { vi = (vi + d + vlist.length) % vlist.length; showViewer(); }
  function openViewer(list, id) {
    vlist = list; vi = Math.max(0, list.indexOf(id));
    lastFocus = document.activeElement;
    const v = viewer();
    showViewer();
    v.hidden = false;
    document.documentElement.classList.add('is-viewing');
    $('.viewer__close', v).focus();
  }
  function closeViewer() {
    const v = viewer();
    v.hidden = true;
    document.documentElement.classList.remove('is-viewing');
    if (lastFocus) lastFocus.focus();
  }
  // any photograph inside a [data-set] opens the viewer on that set
  document.addEventListener('click', (e) => {
    const im = e.target.closest('img[data-photo]');
    if (!im || im.closest('.viewer') || im.closest('a')) return;
    const set = im.closest('[data-set]');
    const list = set ? set.dataset.set.split(',') : [im.dataset.photo];
    openViewer(list, im.dataset.photo);
  });

  window.Kit = {
    S, ask, esc, $, trips, byId, build,
    get lang() { return lang; }, W, nameOf, joinNames, title, when, route, legLine, src, img,
    guideHref, tripHref, tally, topbar, onLang: (f) => listeners.push(f),
    world, drawWorld, shot, ISO, visitedIso, legGeo: legLine2, km, openViewer,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
})();
