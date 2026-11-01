/* Atlas 足跡 (2026-11-01): the record. Every place he has been and every trip, built from
   window.SITE (../data.js) and nothing else. Pure: no page, no three.js. Nothing is typed in by
   hand except the few border towns below, and nothing is guessed: a photograph belongs to a trip
   only when its date and its country (or its place on that trip's route) say so. */

const D = Math.PI / 180;
const R_KM = 6371;

/* the angle between two points on the globe, in radians */
export function angle(lat1, lng1, lat2, lng2) {
  const a = Math.sin(((lat2 - lat1) * D) / 2) ** 2 +
    Math.cos(lat1 * D) * Math.cos(lat2 * D) * Math.sin(((lng2 - lng1) * D) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
const km = (a, b) => angle(a.lat, a.lng, b.lat, b.lng) * R_KM;

const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'place';
// "Twizel (Mt Cook)" is Twizel when matched against a photograph's caption
const bareName = (s) => String(s).replace(/\([^)]*\)/g, '').trim().toLowerCase();

/* border towns, where the shapes of the map are too coarse to say which country a point is in */
const OVERRIDE = {
  'Andorra la Vella': 'andorra',
  Monaco: 'france', // Monaco is not one of his countries: the day trip belongs to the France leg of the trip
  Menton: 'france',
  Nice: 'france',
  Geneva: 'switzerland',
  'Hong Kong': 'hong-kong',
  Singapore: 'singapore',
};

const plainOne = (s) => String(s).split(/\s*[\/／]\s*/)[0].trim();
const plain = (n) => ({ en: plainOne(n.en), zh: plainOne(n.zh || n.en) });

const kindOf = (mode) => (mode === 'flight' ? 'flight' : mode === 'train' ? 'train' : 'road');
const okLeg = (l) => l && l.from && l.to && isFinite(l.from.lat) && isFinite(l.to.lat) && isFinite(l.from.lng) && isFinite(l.to.lng);

/**
 * @param S       window.SITE
 * @param opts.countryAt (lat, lng) => visited country id or null (the page's pick raster)
 */
export function buildRecord(S, opts = {}) {
  const countryAt = opts.countryAt || (() => null);
  const countriesSrc = S.countries || [];
  const countryById = {};
  const countries = countriesSrc.map((c, i) => {
    const o = { ...c, index: i, trips: [], years: [], visits: 0, places: [], photos: [], home: c.id === S.home };
    countryById[c.id] = o;
    return o;
  });

  /* ---- places: one per city, the city centre beating the airport ---- */
  const places = [];
  const SNAP = 70; // km
  function place(p, kind = 'leg') {
    for (const q of places) if (q.name.en === p.city && km(q, p) < SNAP) return q;
    const q = { name: { en: p.city, zh: p.zh || p.city }, lat: p.lat, lng: p.lng, kind, country: null, trips: [], photos: [], home: false };
    places.push(q);
    return q;
  }
  let home = null;
  if (S.flightsFrom) {
    home = place({ city: 'Taipei', zh: '台北', lat: S.flightsFrom[0], lng: S.flightsFrom[1] });
    home.home = true;
    home.country = S.home || 'taiwan';
  }
  const journeys = (S.journeys || []).slice().reverse(); // oldest first
  for (const j of journeys) for (const l of j.legs || []) if (okLeg(l) && l.mode !== 'flight') { place(l.from); place(l.to); }

  /* ---- trips ---- */
  const tripById = {};
  const trips = journeys.map((j, index) => {
    const tCountries = (j.countries || []).map((id) => countryById[id]).filter(Boolean);
    let prev = null;
    const legs = (j.legs || []).filter(okLeg).map((raw) => {
      const from = place(raw.from), to = place(raw.to);
      // the last leg ended somewhere else (Sapa, then Lao Cai): a dashed link joins the two
      const gapFrom = prev && prev.to !== from ? prev.to : null;
      const leg = { from, to, mode: raw.mode, kind: kindOf(raw.mode), month: raw.month || null, confirmed: raw.confirmed !== false, gapFrom, trip: null };
      prev = leg;
      return leg;
    });
    const year = +String(j.id).slice(0, 4);
    const months = new Set(legs.map((l) => l.month).filter(Boolean));
    const t = { id: j.id, index, date: j.date || { en: j.id, zh: j.id }, year, countries: tCountries, legs, months, places: [], photos: [], unconfirmed: legs.some((l) => !l.confirmed), pins: [] };
    legs.forEach((l) => { l.trip = t; });
    tripById[t.id] = t;
    return t;
  });

  /* ---- which country each place is in ---- */
  for (const t of trips) {
    for (const l of t.legs) {
      for (const p of [l.from, l.to]) {
        if (p.country) continue;
        let id = OVERRIDE[p.name.en] || countryAt(p.lat, p.lng);
        if (!id || !countryById[id]) {
          // nearest of the trip's own countries
          let best = null, bd = Infinity;
          for (const c of t.countries) { const d = angle(p.lat, p.lng, c.ll[0], c.ll[1]); if (d < bd) { bd = d; best = c; } }
          id = best ? best.id : null;
        }
        p.country = id;
      }
    }
  }

  /* ---- trips through each place ---- */
  // A trip counts as a visit to a place only when the trip went to that place's country. Chongqing,
  // where the China trip ended and the Europe trip took off, is one visit, not two; Shanghai on the
  // way home from Europe is a change of planes, not a visit. The route still passes through them.
  const visited = (p, t) => p.home || t.countries.some((c) => c.id === p.country);
  const addTrip = (p, t) => {
    if (!t.places.includes(p)) t.places.push(p);
    if (!p.trips.includes(t) && visited(p, t)) p.trips.push(t);
  };
  for (const t of trips) for (const l of t.legs) { addTrip(l.from, t); addTrip(l.to, t); }

  /* trips with no route recorded (2012 Netherlands, 2022 Myanmar): a pin at the country itself */
  for (const t of trips) {
    if (t.legs.length) continue;
    for (const c of t.countries) {
      let p = places.find((q) => q.kind === 'pin' && q.country === c.id);
      if (!p) {
        p = { name: { ...c.name }, lat: c.ll[0], lng: c.ll[1], kind: 'pin', country: c.id, trips: [], photos: [], home: false };
        places.push(p);
      }
      addTrip(p, t);
      t.pins.push(p);
    }
  }

  /* ---- photographs: to the nearest place in the same country, or a place of their own ---- */
  const photoById = {};
  const photos = Object.entries(S.slides || {}).map(([id, s]) => {
    const ph = { ...s, id, at: null, trip: null }; // at: the place it belongs to; place: its own name
    photoById[id] = ph;
    return ph;
  }).filter((ph) => Array.isArray(ph.ll) && isFinite(ph.ll[0]));

  for (const ph of photos) {
    const pt = { lat: ph.ll[0], lng: ph.ll[1] };
    const caption = `${(ph.where && ph.where.en) || ''} ${(ph.place && ph.place.en) || ''}`.toLowerCase();
    let named = null, nd = Infinity, near = null, dd = Infinity;
    for (const q of places) {
      if (q.kind === 'photo' || q.country !== ph.country) continue;
      const d = km(q, pt);
      if (d < dd) { dd = d; near = q; }
      if (d < 40 && caption.includes(bareName(q.name.en)) && d < nd) { nd = d; named = q; }
    }
    // nearest first: a place right beside it (12 km) wins; then a place its caption names, within 40 km.
    // Never further than 40 km; past that it is a place of its own.
    let target = (dd < 12 ? near : null) || named;
    if (!target) {
      // a place of its own (Gordes, Cassis, Hội An...), shared by photographs a few km apart.
      // A plain name: "Aoraki / Mount Cook" is Aoraki (a slash would read as another level of the crumb)
      target = places.find((q) => q.kind === 'photo' && q.country === ph.country && km(q, pt) < 15);
      if (!target) {
        target = { name: plain(ph.place), lat: pt.lat, lng: pt.lng, kind: 'photo', country: ph.country, trips: [], photos: [], home: false };
        places.push(target);
      } else if (plain(ph.place).en.length < target.name.en.length) {
        target.name = plain(ph.place);
      }
    }
    ph.at = target;
    target.photos.push(ph);
  }

  /* ---- a photograph's trip: proven by its date, never guessed ---- */
  const tripsOfCountry = (id) => trips.filter((t) => t.countries.some((c) => c.id === id));
  for (const ph of photos) {
    const month = ph.taken ? String(ph.taken).slice(0, 7) : null;
    if (month) {
      // the trip whose legs ran in that month and which went to that country, or passed through that place
      ph.trip = trips.find((t) => t.months.has(month) && (t.countries.some((c) => c.id === ph.country) ||
        t.legs.some((l) => l.month === month && (l.from === ph.at || l.to === ph.at)))) || null;
    } else {
      const ts = tripsOfCountry(ph.country);
      ph.trip = ts.length === 1 ? ts[0] : null;
    }
    if (ph.trip) {
      ph.trip.photos.push(ph);
      if (!ph.at.home) addTrip(ph.at, ph.trip);
    }
  }

  /* ---- finish places ---- */
  const used = new Set();
  for (const p of places) {
    p.trips.sort((a, b) => a.index - b.index);
    let s = slugify(p.name.en), k = 2;
    if (p.home) s = 'taipei';
    while (used.has(s)) s = `${slugify(p.name.en)}-${k++}`;
    used.add(s);
    p.slug = s;
    p.visits = p.trips.length;
    p.years = [...new Set(p.trips.map((t) => t.year))];
    if (!p.country && p.photos[0]) p.country = p.photos[0].country;
  }
  const placeBySlug = Object.fromEntries(places.map((p) => [p.slug, p]));

  /* ---- finish countries ---- */
  for (const c of countries) {
    c.trips = tripsOfCountry(c.id);
    c.visits = c.trips.length;
    c.years = [...new Set(c.trips.map((t) => t.year))];
    c.places = places.filter((p) => p.country === c.id);
    c.photos = (c.photos || []).map((id) => photoById[id]).filter(Boolean);
    // photographs taken there but not on the country's own list
    for (const p of c.places) for (const ph of p.photos) if (!c.photos.includes(ph)) c.photos.push(ph);
    c.first = c.trips.length ? c.trips[0].index : c.home ? -1 : 999;
  }

  /* ---- totals, computed here, never written in ---- */
  let flown = 0;
  for (const t of trips) for (const l of t.legs) if (l.kind === 'flight') flown += km(l.from, l.to);
  const totals = {
    countries: countries.length,
    places: places.filter((p) => p.kind !== 'pin').length,
    trips: trips.length,
    since: trips.length ? Math.min(...trips.map((t) => t.year)) : null,
    photos: photos.length,
    km: Math.round(flown / 1000) * 1000,
  };

  return { home, places, placeBySlug, trips, tripById, countries, countryById, photos, photoById, totals };
}
