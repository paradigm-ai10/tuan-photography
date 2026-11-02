/* Atlas 足跡: the marks on the globe. Country names, city dots, the small paper squares that say
   "photographs here", and close up the prints themselves. All of them are buttons in one layer
   over the globe, so text and photographs stay sharp at any size. Names are placed by priority so
   they never overlap: the selected thing first, then home, then the trip being read, the countries,
   the cities. A name already showing gets a head start and its old side, so names do not flicker.
   Nothing is ever written on a photograph; a print pushed aside keeps a hairline to its true place. */
import * as THREE from 'three';
import { toVec } from './journey-atlas-v2-camera.js';

const CELL = 48;
const ANCHORS = ['r', 'l', 'a', 'b'];

export function createMarks({ layer, overlay, camera, words, lang, onPick, onHover }) {
  const marks = [];          // countries and places
  const prints = [];         // one per photograph
  let all = [];
  const tmp = new THREE.Vector3(), toCam = new THREE.Vector3();

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- build ---------- */
  function build(R) {
    layer.textContent = '';
    marks.length = 0; prints.length = 0;
    for (const c of R.countries) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'at-c';
      el.innerHTML = '<span class="at-c__dot"></span><span class="at-c__name"></span>';
      el.dataset.anchor = 'r';
      layer.appendChild(el);
      const m = { kind: 'country', item: c, el, name: el.lastChild, v: toVec(c.ll[0], c.ll[1], 1.00002), w: 0, h: 0, shown: false, anchor: 'r', miss: 0, on: false, key: `${c.id}|${c.name.en}` };
      el.addEventListener('click', (e) => { e.stopPropagation(); onPick('country', c); });
      marks.push(m);
    }
    for (const p of R.places) {
      const el = document.createElement('button');
      el.type = 'button';
      const size = p.home ? 'h' : p.visits >= 3 ? '3' : p.visits === 2 ? '2' : '1';
      el.className = `at-p${p.home ? ' is-home' : ''}${p.photos.length ? ' has-photos' : ''}${p.kind === 'pin' ? ' is-pin' : ''}`;
      el.dataset.size = size;
      el.dataset.anchor = 'r';
      el.innerHTML = '<span class="at-p__dot"></span><span class="at-p__pm"></span><span class="at-p__name"><span class="at-p__t"></span><span class="at-p__more"><span class="at-p__mt"></span><span class="at-p__mp"></span></span><span class="at-p__count"></span></span>';
      layer.appendChild(el);
      const m = { kind: 'place', item: p, el, name: el.querySelector('.at-p__name'), v: toVec(p.lat, p.lng, 1.00002), w: 0, h: 0, shown: false, anchor: 'r', miss: 0, on: false, key: `${p.country}|${p.name.en}` };
      el.addEventListener('click', (e) => { e.stopPropagation(); onPick('place', p); });
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') onHover && onHover('place', p); });
      el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') onHover && onHover(null); });
      marks.push(m);
      for (const ph of p.photos) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'at-print';
        b.style.setProperty('--ar', (ph.w / ph.h).toFixed(3));
        const img = document.createElement('img');
        img.decoding = 'async';
        img.alt = '';
        img.width = 96; img.height = Math.round(96 * ph.h / ph.w);
        b.appendChild(img);
        layer.appendChild(b);
        const pr = { kind: 'print', item: ph, place: p, el: b, img, v: toVec(ph.ll[0], ph.ll[1], 1.00002), loaded: false, shown: false, on: false, x: 0, y: 0, tx: 0, ty: 0, rank: p.photos.indexOf(ph) };
        b.addEventListener('click', (e) => { e.stopPropagation(); onPick('photo', ph); });
        prints.push(pr);
      }
    }
    all = [...marks, ...prints];
    write();
  }

  /* ---------- words (and measuring them) ---------- */
  function write() {
    const L = lang(), W = words();
    for (const m of marks) {
      const it = m.item;
      if (m.kind === 'country') {
        m.name.textContent = it.name[L];
        m.el.setAttribute('aria-label', it.name[L]);
      } else {
        m.el.querySelector('.at-p__t').textContent = it.name[L];
        const more = [];
        if (it.visits) more.push(W.nTrips(it.visits));
        if (it.photos.length) more.push(W.nPhotos(it.photos.length));
        // the hover line: trips, then photographs (the photographs part hides close up when the group
        // already says how many it has)
        m.el.querySelector('.at-p__mt').textContent = it.visits ? W.nTrips(it.visits) : '';
        m.el.querySelector('.at-p__mp').textContent = it.photos.length ? (it.visits ? W.join2 : '') + W.nPhotos(it.photos.length) : '';
        m.el.setAttribute('aria-label', `${it.name[L]}${more.length ? W.join2 + more.join(W.join2) : ''}`);
        m.count = it.photos.length >= 4 ? W.nPhotos(it.photos.length) : '';
        m.el.classList.toggle('has-count', !!m.count);
        // close up, a big group shows three prints and says how many there are
        m.el.querySelector('.at-p__count').textContent = m.count;
        m.far = undefined;
      }
      m.el.lang = L === 'zh' ? 'zh-Hant' : 'en';
    }
    for (const pr of prints) {
      pr.el.setAttribute('aria-label', `${pr.item.place[L]}${W.join2}${W.photo}`);
      pr.img.alt = pr.item.alt ? pr.item.alt[L] : '';
    }
    measure();
  }
  // Names are measured in both of their styles (Playfair further out, small capitals with the count line
  // close up), with and without the hover line, after the typefaces arrive, on each change of language
  // and when home changes its word. Never in the loop.
  function measureSet(list) {
    const lvl = layer.dataset.level;
    layer.classList.add('is-measuring');
    const pass = (k) => { for (const m of list) m[k] = [m.name.offsetWidth, m.name.offsetHeight]; };
    layer.dataset.level = 'region'; pass('szN');
    layer.classList.add('is-measuring-more'); pass('szNm'); layer.classList.remove('is-measuring-more');
    layer.dataset.level = 'city'; pass('szC');
    layer.classList.add('is-measuring-more'); pass('szCm'); layer.classList.remove('is-measuring-more');
    if (lvl) layer.dataset.level = lvl; else delete layer.dataset.level;
    layer.classList.remove('is-measuring');
  }
  const measure = () => measureSet(marks);
  const sizeOf = (m, city, more) => (city ? (more ? m.szCm : m.szC) : (more ? m.szNm : m.szN)) || [0, 0];

  /* ---------- the priority grid ---------- */
  let grid = new Map();
  const key = (cx, cy) => cx * 4096 + cy;
  function hits(b) {
    const x0 = Math.floor(b[0] / CELL), x1 = Math.floor(b[2] / CELL), y0 = Math.floor(b[1] / CELL), y1 = Math.floor(b[3] / CELL);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const list = grid.get(key(x, y));
      if (list) for (const o of list) if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return true;
    }
    return false;
  }
  function take(b) {
    const x0 = Math.floor(b[0] / CELL), x1 = Math.floor(b[2] / CELL), y0 = Math.floor(b[1] / CELL), y1 = Math.floor(b[3] / CELL);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const k = key(x, y);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(b);
    }
  }
  function nameBox(m, x, y, a) {
    const w = m.w, h = m.h, g = m.kind === 'country' ? 7 : 6;
    if (a === 'r') return [x + g, y - h / 2, x + g + w, y + h / 2];
    if (a === 'l') return [x - g - w, y - h / 2, x - g, y + h / 2];
    if (a === 'a') return [x - w / 2, y - g - h, x + w / 2, y - g];
    return [x - w / 2, y + g, x + w / 2, y + g + h];
  }

  /* ---------- each frame the camera moves ---------- */
  // view: { w, h, alt, level, reserved: [boxes], focus: { place, country, trip }, hover, collide, touch }
  function update(view) {
    const { w, h, alt } = view;
    const f = view.focus || {};
    const tripPlaces = f.trip ? new Set([...f.trip.places, ...(f.trip.pins || [])]) : null;
    const showCountry = alt > 0.62, showCountryDot = alt > 1.25, showDots = alt < 1.75;
    const showNames = alt < 1.5, showPM = alt < 0.55 && alt > 0.085, showPrints = alt < 0.1;
    layer.dataset.level = view.level;

    // where each mark is on the screen, and whether it faces us
    for (const m of all) {
      tmp.copy(m.v);
      toCam.copy(camera.position).sub(tmp);
      const facing = toCam.dot(tmp) / (toCam.length() * tmp.length());
      tmp.project(camera);
      if (m.kind === 'place' && m.item.home) {
        // far out, home is called home
        const far = alt > 1.5;
        if (far !== m.far) { m.far = far; m.el.querySelector('.at-p__t').textContent = far ? words().home : m.item.name[lang()]; measureSet([m]); }
      }
      m.x = (tmp.x * 0.5 + 0.5) * w; m.y = (-tmp.y * 0.5 + 0.5) * h;
      m.vis = facing > 0.15 && tmp.z < 1 && m.x > -60 && m.x < w + 60 && m.y > -60 && m.y < h + 60;
    }
    if (!view.collide) { position(); return; }

    grid = new Map();
    for (const b of view.reserved || []) take(b);
    // the dots themselves come first, small, so names keep off them
    for (const m of marks) {
      const dotOn = m.vis && (m.kind === 'country' ? showCountryDot && !(m.item.home) : showDots || m.item.home);
      m.dotOn = dotOn;
      if (dotOn) take([m.x - 4, m.y - 4, m.x + 4, m.y + 4]);
    }
    // the names, by priority
    const city = view.level === 'city';
    for (const m of marks) { [m.w, m.h] = sizeOf(m, city, m.kind === 'place' && view.hover === m.item); }
    const cand = [];
    for (const m of marks) {
      if (!m.vis) { m.want = false; continue; }
      const it = m.item;
      let pr;
      if (m.kind === 'country') {
        if (!showCountry) { m.want = false; continue; }
        pr = 70 + 2 * it.visits;
        if (f.country === it) pr = 100;
      } else {
        if (!showNames && !(it.home && m.dotOn)) { m.want = false; continue; }
        pr = it.home ? 95 : 40 + 3 * it.visits + it.photos.length / 5;
        if (tripPlaces && tripPlaces.has(it)) pr = 80;
        if (f.place === it || view.hover === it) pr = 100;
        // far out, only home, his trip's cities and the places he went back to have names
        if (alt > 1.15 && pr < 80 && it.visits < 2) pr -= 30;
      }
      if (m.shown) pr += 15;
      m.want = true; m.pr = pr;
      cand.push(m);
    }
    cand.sort((a, b) => b.pr - a.pr);

    // close up, each place's prints: in their own shape, pushed aside along a spiral if they would overlap
    const s = Math.round(48 + 48 * Math.min(1, Math.max(0, Math.log(0.1 / alt) / Math.log(0.1 / 0.014))));
    let np = 0;
    const groups = new Map();
    for (const pr of prints) {
      pr.want = false; pr.moved = false;
      if (!showPrints || !pr.vis) continue;
      const n = pr.place.photos.length;
      if (n >= 4 && pr.rank >= 3) continue; // a big group shows its first three, and says how many
      if (!groups.has(pr.place)) groups.set(pr.place, []);
      groups.get(pr.place).push(pr);
    }
    function placePrint(pr, lift) {
      if (np >= 40) return null;
      const ar = pr.item.w / pr.item.h;
      const pw = ar >= 1 ? s : s * ar, ph = ar >= 1 ? s / ar : s;
      const bw = pw + 8, bh = ph + 8;
      for (let i = 0; i < 28; i++) {
        const r = i ? 0.42 * s * (1 + i * 0.32) : 0, t = i * 2.39996;
        const cx = pr.x + r * Math.cos(t), cy = pr.y - bh / 2 - 8 - lift + r * Math.sin(t);
        const b = [cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2];
        if (b[0] < 2 || b[2] > w - 2 || b[1] < 2 || b[3] > h - 2) continue;
        if (hits(b)) continue;
        take(b);
        pr.want = true; pr.tx = cx; pr.ty = cy; pr.s = s; pr.moved = i > 0;
        if (!pr.loaded) { pr.img.src = `../images/web/640/${pr.item.file}`; pr.loaded = true; }
        np++;
        return { i, cx, b };
      }
      return null;
    }
    const done = new Set();
    let placed = 0;
    const keys = new Set();   // a place named like its country (Hong Kong, a pin) is named once
    for (const m of cand) {
      if (placed >= 60 || keys.has(m.key)) { m.want = false; continue; }
      const group = m.kind === 'place' ? groups.get(m.item) : null;
      let first = null;
      if (group) {
        // the first print stands above its place with room beneath it for the name
        done.add(m.item);
        first = placePrint(group[0], m.h + 4);
      }
      const order = m.shown ? [m.anchor, ...ANCHORS.filter((a) => a !== m.anchor)] : ANCHORS;
      let got = null;
      if (first && first.i === 0) {
        // the name sits centred beneath the print, never on it
        const gx = first.cx - m.x, gy = first.b[3] + 2 - m.y;
        const b = [first.cx - m.w / 2, first.b[3] + 2, first.cx + m.w / 2, first.b[3] + 2 + m.h];
        if (b[0] >= 4 && b[2] <= w - 4 && b[3] <= h - 4 && !hits(b)) { got = { a: 'g', b }; m.gx = gx; m.gy = gy; }
      }
      if (!got) for (const a of order) {
        if (a === 'g') continue;
        const b = nameBox(m, m.x, m.y, a);
        if (b[0] < 4 || b[2] > w - 4 || b[1] < 4 || b[3] > h - 4) continue;
        if (!hits(b)) { got = { a, b }; break; }
      }
      if (got) {
        m.anchor = got.a; m.miss = 0; m.want = true;
        take([got.b[0] - 3, got.b[1] - 1, got.b[2] + 3, got.b[3] + 1]);
        placed++; keys.add(m.key);
      } else if (m.shown && m.miss < 4 && m.anchor !== 'g') {
        // a few frames' grace before it goes; the name still holds its ground meanwhile
        m.miss++; m.want = true;
        take(nameBox(m, m.x, m.y, m.anchor));
        placed++; keys.add(m.key);
      } else {
        m.want = false;
      }
      if (group) for (const pr of group.slice(1)) placePrint(pr, 0);
    }
    // the prints of places that have no name showing
    for (const [p, group] of groups) if (!done.has(p)) for (const pr of group) placePrint(pr, 0);
    position();
  }

  function position() {
    const g = overlay.getContext('2d');
    const dpr = overlay.width / Math.max(1, overlay.clientWidth);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, overlay.width, overlay.height);
    g.strokeStyle = overlay.dataset.ink || '#555';
    g.lineWidth = 0.75;
    g.globalAlpha = 0.6;
    for (const m of marks) {
      const on = m.vis && (m.dotOn || m.want);
      if (on !== m.on) { m.on = on; m.el.classList.toggle('is-on', on); m.el.tabIndex = on ? 0 : -1; }
      const named = on && !!m.want;
      if (named !== m.shown) { m.shown = named; m.el.classList.toggle('is-named', named); }
      if (m.el.dataset.anchor !== m.anchor) m.el.dataset.anchor = m.anchor;
      if (on && m.anchor === 'g') { m.el.style.setProperty('--gx', m.gx.toFixed(1)); m.el.style.setProperty('--gy', m.gy.toFixed(1)); }
      const dot = !!m.dotOn;
      if (dot !== m.dotShown) { m.dotShown = dot; m.el.classList.toggle('is-dot', dot); }
      if (on) {
        m.el.style.setProperty('--x', m.x.toFixed(1) + 'px');
        m.el.style.setProperty('--y', m.y.toFixed(1) + 'px');
      }
    }
    g.beginPath();
    for (const pr of prints) {
      const on = !!(pr.vis && pr.want);
      if (on !== pr.on) { pr.on = on; pr.el.classList.toggle('is-on', on); pr.el.tabIndex = on ? 0 : -1; }
      if (!on) continue;
      pr.el.style.setProperty('--x', pr.tx.toFixed(1) + 'px');
      pr.el.style.setProperty('--y', pr.ty.toFixed(1) + 'px');
      pr.el.style.setProperty('--s', String(pr.s));
      // a hairline back to the true place when the print had to move aside
      const by = pr.ty + (pr.item.w >= pr.item.h ? pr.s / (pr.item.w / pr.item.h) : pr.s) / 2 + 4;
      if (pr.moved && Math.hypot(pr.tx - pr.x, by - pr.y) > 10) { g.moveTo(pr.x, pr.y); g.lineTo(pr.tx, by); }
    }
    g.stroke();
  }

  /* the nearest facing mark to a point on the screen, within r px */
  function nearest(x, y, r) {
    let best = null, bd = r;
    for (const m of [...prints, ...marks]) {
      if (!m.on) continue;
      const mx = m.kind === 'print' ? m.tx : m.x, my = m.kind === 'print' ? m.ty : m.y;
      const d = Math.hypot(mx - x, my - y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  return {
    build, write, measure, update, nearest,
    marks, prints,
    setState(kind, item, cls, on) {
      for (const m of marks) if (m.item === item) m.el.classList.toggle(cls, on);
    },
    clearState(cls) { for (const m of marks) m.el.classList.remove(cls); },
    markOf(item) { return marks.find((m) => m.item === item); },
  };
}
