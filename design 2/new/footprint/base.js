/* The footprint maps (2026-11-06): ten versions of the Journey's arrival map, each showing where
   he has been. This file is what they share: his countries with their counts, the cities and
   flights of every trip, the world's shapes, the words in both languages, the slim top bar and a
   hover note. A version page loads d3, topojson, data.js, this file and its own script. */
(() => {
  'use strict';

  const S = window.SITE;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ------------------------------------------------------------ words */

  const WORDS = {
    en: {
      site: 'tuan photography', journey: 'Journey', where: 'Where I have been',
      countries: (n) => (n === 1 ? 'country' : 'countries'),
      trips: (n) => (n === 1 ? 'trip' : 'trips'),
      continents: (n) => (n === 1 ? 'continent' : 'continents'),
      cities: (n) => (n === 1 ? 'place' : 'places'),
      flights: (n) => (n === 1 ? 'flight' : 'flights'),
      photos: (n) => (n === 1 ? 'photograph' : 'photographs'),
      since: (y) => `since ${y}`, span: (a, b) => `${a} to ${b}`,
      home: 'Home', of: (a, b) => `${a} of ${b}`, km: 'km',
      // the share of the world: "10.3%" + "of the world's 195 countries"
      pct: (p) => `${p}%`, ofWorld: (n) => `of the world's ${n} countries`,
      first: (y) => `first in ${y}`, times: (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`),
      continent: { asia: 'Asia', europe: 'Europe', oceania: 'Oceania', 'north-america': 'North America' },
    },
    zh: {
      site: 'tuan photography', journey: '旅程', where: '我去過的地方',
      countries: () => '個國家', trips: () => '趟旅行', continents: () => '個大洲',
      cities: () => '個地方', flights: () => '段航程', photos: () => '張照片',
      since: (y) => `從 ${y} 年起`, span: (a, b) => `${a} 到 ${b}`,
      home: '家', of: (a, b) => `${b} 個中的 ${a} 個`, km: '公里',
      pct: (p) => `${p}%`, ofWorld: (n) => `全世界 ${n} 個國家的`,
      first: (y) => `${y} 年第一次去`, times: (n) => `去過 ${n} 次`,
      continent: { asia: '亞洲', europe: '歐洲', oceania: '大洋洲', 'north-america': '北美洲' },
    },
  };

  let lang = 'en';
  try { lang = localStorage.getItem('tlap-lang') === 'zh' ? 'zh' : 'en'; } catch (e) { /* storage blocked */ }
  const listeners = [];
  function setLang(l) {
    lang = l === 'zh' ? 'zh' : 'en';
    try { localStorage.setItem('tlap-lang', lang); } catch (e) { /* storage blocked */ }
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    document.querySelectorAll('.fp-lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    listeners.forEach((fn) => fn(lang));
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }

  /* ------------------------------------------------------------ his countries */

  // as the world atlas numbers them (Dubai is the Emirates)
  const ISO = {
    spain: '724', uk: '826', france: '250', andorra: '020', vietnam: '704', china: '156', singapore: '702',
    australia: '036', 'new-zealand': '554', 'south-korea': '410', usa: '840', 'hong-kong': '344', japan: '392',
    germany: '276', switzerland: '756', dubai: '784', thailand: '764', myanmar: '104', netherlands: '528',
    malaysia: '458', taiwan: '158',
  };
  // the country's own name for Dubai's entry
  const NAME = { dubai: { en: 'United Arab Emirates', zh: '阿拉伯聯合大公國' } };
  const yearOf = (j) => +String(j.id).slice(0, 4);
  const journeys = S.journeys.slice().sort((a, b) => a.id.localeCompare(b.id)); // oldest first

  const countries = S.countries.map((c) => {
    const went = journeys.filter((j) => j.countries.includes(c.id));
    const years = [...new Set(went.map(yearOf))];
    return {
      id: c.id, iso: ISO[c.id], continent: c.continent, ll: c.ll,
      name: c.name, country: NAME[c.id] || c.name,
      home: c.id === S.home,
      years, first: years.length ? years[0] : null, last: years.length ? years[years.length - 1] : null,
      trips: went.length, journeys: went.map((j) => j.id),
      photos: c.photos.length,
    };
  });
  const home = countries.find((c) => c.home);
  const abroad = countries.filter((c) => !c.home).sort((a, b) => (a.first - b.first) || a.id.localeCompare(b.id));
  abroad.forEach((c, i) => { c.order = i; });
  const byId = new Map(countries.map((c) => [c.id, c]));
  const byIso = new Map(countries.map((c) => [c.iso, c]));

  /* ------------------------------------------------------------ places and flights */

  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  function km(a, b) { // a, b as [lat, lng]
    const dl = rad(b[0] - a[0]), dn = rad(b[1] - a[1]);
    const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dn / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const near = (ll, ids) => ids.map((id) => byId.get(id)).filter(Boolean).sort((p, q) => km(ll, p.ll) - km(ll, q.ll))[0];
  const placeMap = new Map();
  const flights = [];
  for (const j of journeys) {
    for (const l of j.legs) {
      for (const p of [l.from, l.to]) {
        const ll = [p.lat, p.lng];
        if (km(ll, home.ll) < 60) continue; // Taipei and Taoyuan are home
        let pl = placeMap.get(p.city);
        if (!pl) {
          const c = near(ll, j.countries);
          pl = { name: { en: p.city, zh: p.zh || p.city }, ll, code: p.code || null, country: c ? c.id : null, journeys: [], years: [] };
          placeMap.set(p.city, pl);
        }
        if (p.code && !pl.code) pl.code = p.code;
        if (!pl.journeys.includes(j.id)) { pl.journeys.push(j.id); pl.years.push(yearOf(j)); }
      }
      if (l.mode === 'flight') flights.push({ from: l.from, to: l.to, month: l.month, journey: j.id, km: km([l.from.lat, l.from.lng], [l.to.lat, l.to.lng]) });
    }
  }
  const places = [...placeMap.values()];

  const counts = {
    countries: abroad.length,
    trips: journeys.length,
    continents: new Set(countries.map((c) => c.continent)).size,
    places: places.length,
    flights: flights.length,
    km: Math.round(flights.reduce((s, f) => s + f.km, 0) / 100) * 100,
    photos: Object.keys(S.slides).length,
    since: Math.min(...abroad.map((c) => c.first)),
    until: Math.max(...abroad.map((c) => c.last)),
    world: 195, // the countries of the world, as the United Nations counts them
  };
  // how much of the world's countries he has been to, in percent with one decimal (20 of 195: 10.3)
  counts.share = Math.round((counts.countries / counts.world) * 1000) / 10;

  // the ramp (2026-11-06): his record trip by trip, oldest first, with the running totals of the three
  // numbers on the page: countries, flights and photographs. A country's photographs join the count when
  // the country first does; home's are there from the start.
  const ramp = [];
  {
    const seen = new Set();
    let cs = 0, fs = 0, ps = home.photos;
    for (const j of journeys) {
      const fresh = j.countries.map((id) => byId.get(id)).filter((c) => c && !c.home && !seen.has(c.id));
      fresh.forEach((c) => seen.add(c.id));
      const fl = flights.filter((f) => f.journey === j.id);
      cs += fresh.length; fs += fl.length; ps += fresh.reduce((n, c) => n + c.photos, 0);
      ramp.push({ journey: j.id, year: yearOf(j), date: j.date, fresh, flights: fl, countries: cs, flightsSoFar: fs, photos: ps });
    }
  }

  // year by year: the countries first seen that year, and the running total
  const years = [];
  for (let y = counts.since, total = 0; y <= counts.until; y++) {
    const fresh = abroad.filter((c) => c.first === y);
    total += fresh.length;
    years.push({ year: y, fresh, total, trips: journeys.filter((j) => yearOf(j) === y) });
  }

  /* ------------------------------------------------------------ the world's shapes */

  const cache = {};
  function world(res = '50m') {
    if (cache[res]) return cache[res];
    return (cache[res] = fetch(`../vendor/countries-${res}.json`).then((r) => r.json()).then((topo) => {
      const features = topojson.feature(topo, topo.objects.countries).features;
      return {
        topo, features,
        land: topojson.feature(topo, topo.objects.land),
        borders: topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b),
        visited: features.filter((f) => byIso.has(f.id) && !byIso.get(f.id).home),
        home: features.find((f) => f.id === home.iso),
        others: features.filter((f) => !byIso.has(f.id)),
        mine: (f) => byIso.get(f.id) || null,
      };
    }));
  }
  const names = () => window.COUNTRY_NAMES || {};

  /* ------------------------------------------------------------ the page around the map */

  function chrome({ dark = false } = {}) {
    const top = document.createElement('header');
    top.className = 'fp-top' + (dark ? ' is-dark' : '');
    top.innerHTML = `<a class="fp-top__name" href="journey.html">tuan photography <span>陳亮元</span></a>
      <div class="fp-lang" role="group" aria-label="Language"><button type="button" data-lang="en">EN</button><button type="button" data-lang="zh">中文</button></div>`;
    document.body.prepend(top);
    top.querySelectorAll('.fp-lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
    setLang(lang);
  }

  // a small note that follows the pointer: the country, when first, how often
  let tipEl = null;
  function tip(x, y, html) {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'fp-tip'; tipEl.setAttribute('role', 'status'); document.body.appendChild(tipEl); }
    if (html == null) { tipEl.classList.remove('is-on'); return; }
    tipEl.innerHTML = html;
    const r = tipEl.getBoundingClientRect();
    tipEl.style.setProperty('--x', `${Math.min(innerWidth - r.width - 12, x + 14)}px`);
    tipEl.style.setProperty('--y', `${Math.max(12, y - r.height - 10)}px`);
    tipEl.classList.add('is-on');
  }
  function about(c) {
    const w = WORDS[lang];
    if (!c) return null;
    if (c.home) return `<b>${esc(c.name[lang])}</b><span>${esc(w.home)}</span>`;
    return `<b>${esc(c.name[lang])}</b><span>${esc(w.first(c.first))} · ${esc(w.times(c.trips))}</span>`;
  }

  const fmt = (n) => n.toLocaleString(lang === 'zh' ? 'zh-TW' : 'en');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = new URLSearchParams(location.search).has('still');

  window.FP = {
    S, esc, $, WORDS, get lang() { return lang; }, get w() { return WORDS[lang]; }, setLang, onLang: (fn) => listeners.push(fn),
    ISO, countries, abroad, home, byId, byIso, places, flights, journeys, years, ramp, counts, km,
    world, names, chrome, tip, about, fmt, reduced, still,
  };
})();
