/* The map in names 名字地圖 (footprint, 2026-11-06).
   No outlines at all: every country of the world is only its name, set at its label point and sized
   by its area, so the continents come out of the type. The world is small pale capitals; the
   countries he has been to are set large in Playfair and take the page; Taiwan is clay, with Home
   beneath. The count is the largest word of all, in the empty South Pacific.
   Names never collide: his are placed first, nearest their places (Europe fans out, with a fine
   leader where a name had to move); then the world's, by rank, and a pale name that would touch
   another is set smaller or left out. On arrival his names settle in one by one, in the order he
   first went, about three seconds. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  if (new URLSearchParams(location.search).get('lang') === 'zh') FP.setLang('zh');

  const stage = document.getElementById('stage');
  const NS = 'http://www.w3.org/2000/svg';
  const STILL = FP.still || FP.reduced;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const NORTH = 80, SOUTH = -56; // the map's own top and bottom; Antarctica is left out
  // Antarctica, and the far southern islands that would only letter the empty ocean
  const SKIP = new Set(['010', '260', '334', '239', '086']);

  /* ------------------------------------------------------------ the page */

  const sheet = document.createElement('div'); sheet.className = 'nm-sheet';
  const lines = document.createElementNS(NS, 'svg'); lines.setAttribute('class', 'nm-lines'); lines.setAttribute('aria-hidden', 'true');
  const box = document.createElement('div'); box.className = 'nm-names';
  const count = document.createElement('div'); count.className = 'nm-count';
  sheet.append(lines, box, count);
  stage.append(sheet);

  /* ------------------------------------------------------------ every country, with its size */

  let world = []; // { iso, at, km2, rank, mine (his country or null), el }
  function gather(atlas) {
    const N = FP.names();
    const area = new Map();
    const byName = new Map(Object.entries(N).filter(([k]) => k.startsWith('x-')).map(([k, v]) => [v.en, k]));
    atlas.features.forEach((f) => {
      const id = f.id || byName.get(f.properties && f.properties.name);
      if (!id) return;
      area.set(id, (area.get(id) || 0) + d3.geoArea(f) * 6371 * 6371);
    });
    world = Object.entries(N)
      .filter(([iso, n]) => !SKIP.has(iso) && n.at && n.at[1] < NORTH + 4 && n.at[1] > SOUTH - 2)
      .filter(([iso, n]) => FP.byIso.has(iso) || (n.min || 0) < 5) // the very smallest only where he went
      .map(([iso, n]) => ({ iso, n, at: n.at, km2: area.get(iso) || 0, rank: n.rank || 6, mine: FP.byIso.get(iso) || null }));
    // his countries take the point the atlas letters them at; Taiwan and the others are all there
    const maxAll = Math.max(...world.map((c) => c.km2));
    const maxMine = Math.max(...world.filter((c) => c.mine).map((c) => c.km2));
    world.forEach((c) => {
      c.base = c.mine ? 16 + 28 * Math.pow(c.km2 / maxMine, 0.45) : 6.2 + 13 * Math.pow(c.km2 / maxAll, 0.5);
    });
  }

  /* ------------------------------------------------------------ the words of the count */

  function countHTML() {
    const w = FP.w, n = FP.counts, zh = FP.lang === 'zh';
    const gap = zh ? ' ' : ' ';
    return `<p class="nm-count__where fp-label">${FP.esc(w.where)}</p>
      <p class="nm-count__big"><b>${FP.fmt(n.countries)}</b><span>${FP.esc(w.countries(n.countries))}</span></p>
      <p class="nm-count__line fp-label"><span>${FP.fmt(n.trips)}${gap}${FP.esc(w.trips(n.trips))}</span><span>${FP.fmt(n.continents)}${gap}${FP.esc(w.continents(n.continents))}</span><span>${FP.esc(w.span(n.since, n.until))}</span></p>`;
  }

  /* ------------------------------------------------------------ setting the names */

  let W = 0, H = 0, narrow = false, k = 1, sx = 1, sy = 1, ox = 0, oy = 0;
  const unit = d3.geoEqualEarth().scale(1).translate([0, 0]);
  const xr = unit([179.9999, 0])[0], yN = unit([0, NORTH])[1], yS = unit([0, SOUTH])[1];
  const pt = (ll) => { const p = unit(ll); return [ox + p[0] * sx, oy + p[1] * sy]; };

  function frame() {
    W = stage.clientWidth; H = stage.clientHeight;
    narrow = W < 640;
    const side = narrow ? 16 : clamp(W * 0.032, 16, 40);
    const top = narrow ? 74 : 70, bottom = narrow ? 14 : 18;
    const aw = W - 2 * side - (narrow ? 0 : 40), ah = H - top - bottom - (narrow ? 215 : 0);
    sx = aw / (2 * xr);
    sy = clamp(ah / (yS - yN), sx * (narrow ? 1 : 0.95), sx * (narrow ? 3.4 : 1.28));
    if (!narrow && sy < sx) sx = sy; // a short wide window: the height decides
    ox = W / 2;
    const mh = (yS - yN) * sy;
    oy = top + (narrow ? 0 : Math.max(0, (ah - mh) / 2)) - yN * sy;
    k = narrow ? clamp((2 * xr * sx) / 1360, 0.26, 1) : clamp((2 * xr * sx) / 1360, 0.6, 1.15);
    document.documentElement.style.setProperty('--nm-k', (narrow ? 0.62 : k).toFixed(3));
    return { side, top, bottom, mapTop: oy + yN * sy, mapBottom: oy + yS * sy };
  }

  // a name's size on this window: his never under 15 (12 on a phone), the world's never under 6
  function sizeOf(c) {
    if (c.mine) return narrow ? clamp(c.base * 0.5, 11.5, 19) : Math.max(c.base * k, 13);
    if (FP.lang === 'zh') return narrow ? clamp(c.base * 0.6, 6.5, 8.5) : Math.max(c.base * k * 0.95, 7.4);
    return narrow ? clamp(c.base * 0.62, 5.2, 8.5) : Math.max(c.base * k, 5.8);
  }

  const hit = (a, b, pad = 0) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
  const rectAt = (cx, cy, w, h) => ({ x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 });

  function set() {
    const F = frame();
    if (W < 120 || H < 120 || !(sx > 10) || !(sy > 10)) { waiting = true; return false; } // too small, or still hidden: wait
    waiting = false;
    const lang = FP.lang, zh = lang === 'zh';
    box.replaceChildren();
    lines.replaceChildren();
    lines.setAttribute('width', W); lines.setAttribute('height', H);

    // every name, at its size, measured in one go
    world.forEach((c) => {
      const el = document.createElement('span');
      const fs = sizeOf(c);
      c.fs = fs;
      el.className = 'nm-n ' + (c.mine ? 'nm-v' : 'nm-o') + (c.mine && c.mine.home ? ' is-home' : '');
      const name = c.mine ? (c.mine.home ? c.mine.name[lang] : c.mine.country[lang]) : (zh ? c.n.zh : c.n.en);
      if (c.mine && c.mine.home) el.innerHTML = `<span class="nm-v__name">${FP.esc(name)}</span><span class="nm-v__home">${FP.esc(FP.w.home)}</span>`;
      else if (c.mine && (zh ? name.length > 6 : name.split(' ').length > 2)) { // a long name on two lines
        const parts = zh ? [name.slice(0, 3), name.slice(3)] : [name.split(' ').slice(0, 2).join(' '), name.split(' ').slice(2).join(' ')];
        el.innerHTML = `<span class="nm-v__line">${FP.esc(parts[0])}</span><span class="nm-v__line">${FP.esc(parts[1])}</span>`;
      } else el.textContent = name;
      el.style.setProperty('--fs', fs.toFixed(2));
      if (c.mine) { el.dataset.id = c.mine.id; el.tabIndex = 0; el.setAttribute('role', 'img'); el.setAttribute('aria-label', FP.about(c.mine).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()); }
      c.el = el;
      box.appendChild(el);
    });
    count.innerHTML = countHTML();
    world.forEach((c) => { const r = c.el.getBoundingClientRect(); c.w = r.width; c.h = c.mine ? r.height * 0.86 : r.height * 0.78; });
    const cr = count.getBoundingClientRect();

    // the count: in the South Pacific; on a phone, under the map
    const placed = [];
    let cx, cy;
    if (narrow) { cx = W / 2; cy = F.mapBottom + 30 + cr.height / 2; }
    else {
      [cx, cy] = pt([-127, -31]);
      cx = Math.max(cx, F.side + cr.width / 2 + 6);
      cy = Math.min(cy, H - F.bottom - cr.height / 2);
    }
    count.style.setProperty('--x', cx.toFixed(1));
    count.style.setProperty('--y', cy.toFixed(1));
    placed.push(rectAt(cx, cy, cr.width + 16, cr.height + 10));
    const bounds = { x0: F.side * 0.5, x1: W - F.side * 0.5, y0: F.top - 8, y1: H - F.bottom * 0.5 };
    const inside = (r) => r.x0 >= bounds.x0 && r.x1 <= bounds.x1 && r.y0 >= bounds.y0 && r.y1 <= bounds.y1;

    // his names. Each may sit over its own place, slid a little, or beside it further out with a
    // leader; a large country's name may sit anywhere over its own ground without one. The choice
    // is made for all of them together: no two touch, none covers another's place, the world's main
    // names are spared where possible, and the names keep the order of their places (north above
    // south, west left of east). A few starting orders, each settled by turns; the best is kept.
    const pxPerKm2 = (sx * sy) / (6371 * 6371);
    const mine = world.filter((c) => c.mine);
    const soft = world.filter((c) => !c.mine && c.rank <= 3).map((c) => {
      const [x, y] = pt(c.at);
      return { r: rectAt(x, y, c.w * 0.8, c.h), cost: c.rank <= 2 ? 30 : 12 };
    });
    const reach = (r, x, y) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.y0 - y, 0, y - r.y1));
    const unitG = narrow ? 0.7 : Math.max(0.75, k);
    const L = mine.map((c) => {
      const [ax, ay] = pt(c.at);
      const w = c.w, h = c.h, terr = Math.sqrt((c.km2 * pxPerKm2) / Math.PI), tol = Math.max(2, terr * 0.7);
      const raw = [];
      for (const fx of [0, -0.3, 0.3, -0.45, 0.45]) for (const fy of [0, -0.4, 0.4]) raw.push({ x: ax + fx * w, y: ay + fy * h, base: (Math.abs(fx) + Math.abs(fy)) * 2 });
      [1, 4, 8, 13, 19, 27, 37, 50, 66, 86].forEach((g) => {
        const gg = g * unitG;
        for (let j = 0; j < 12; j++) {
          const a = (j / 12) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
          const tx = (w / 2 + gg) * Math.sign(dx) * Math.min(1, Math.abs(dx) * 2.2);
          const ty = (h / 2 + gg) * Math.sign(dy) * Math.min(1, Math.abs(dy) * 2.2);
          raw.push({ x: ax + tx, y: ay + ty, base: Math.abs(dy) > 0.9 ? 2 : 0 });
        }
      });
      const cands = [];
      raw.forEach((p) => {
        const r = rectAt(p.x, p.y, w, h);
        if (!inside(r) || placed.some((q) => hit(r, q, 3))) return;
        const dist = reach(r, ax, ay);
        p.r = r;
        p.seg = dist > Math.max(3, tol) ? [clamp(ax, r.x0, r.x1), clamp(ay, r.y0, r.y1), ax, ay] : null; // its leader, if it needs one
        p.pre = p.base + (dist <= tol ? dist * 0.15 : tol * 0.15 + (dist - tol) * 1.2) + soft.reduce((s2, o) => s2 + (hit(r, o.r, 1) ? o.cost : 0), 0);
        cands.push(p);
      });
      if (!cands.length) cands.push({ x: ax, y: ay, r: rectAt(ax, ay, w, h), pre: 0 });
      return { c, ax, ay, w, h, tol, dot: rectAt(ax, ay, 5, 5), cands };
    });
    const near = 170 * unitG;
    const cuts = (g, r) => { // does a leader run through a name?
      for (let t = 0.12; t < 0.95; t += 0.08) {
        const x = g[0] + (g[2] - g[0]) * t, y = g[1] + (g[3] - g[1]) * t;
        if (x > r.x0 + 1 && x < r.x1 - 1 && y > r.y0 + 1 && y < r.y1 - 1) return true;
      }
      return false;
    };
    const costOf = (i, p, picks) => {
      let sum = p.pre;
      const A = L[i];
      for (let j = 0; j < L.length; j++) {
        if (j === i || picks[j] == null) continue;
        const B = L[j], q = B.cands[picks[j]];
        if (hit(p.r, q.r, 3)) sum += 1000;
        if (hit(p.r, B.dot, 1)) sum += 300;
        if (p.seg && cuts(p.seg, q.r)) sum += 45;
        if (q.seg && cuts(q.seg, p.r)) sum += 45;
        // two names near each other keep the bearing of their places
        const dx = A.ax - B.ax, dy = A.ay - B.ay, da = Math.hypot(dx, dy);
        if (da < near && da > 2) {
          const lx = p.x - q.x, ly = p.y - q.y, dl = Math.hypot(lx, ly) || 1;
          sum += (1 - (dx * lx + dy * ly) / (da * dl)) * 9 * (1 - da / near);
        }
      }
      return sum;
    };
    const bestFor = (i, picks) => {
      let bi = 0, bc = Infinity;
      L[i].cands.forEach((p, n) => { const v = costOf(i, p, picks); if (v < bc) { bc = v; bi = n; } });
      return bi;
    };
    const idx = L.map((_, i) => i);
    const orders = [
      idx.slice().sort((a, b) => L[a].tol - L[b].tol),
      idx.slice().sort((a, b) => L[b].c.fs - L[a].c.fs),
      idx.slice().sort((a, b) => L[a].ax - L[b].ax),
      idx.slice().sort((a, b) => L[a].ay - L[b].ay),
      idx.slice().sort((a, b) => L[b].ax - L[a].ax),
    ];
    let win = null;
    orders.forEach((order) => {
      const picks = new Array(L.length).fill(null);
      order.forEach((i) => { picks[i] = bestFor(i, picks); });
      for (let pass = 0; pass < 4; pass++) {
        let moved = false;
        order.forEach((i) => { const n = bestFor(i, picks); if (n !== picks[i]) { picks[i] = n; moved = true; } });
        if (!moved) break;
      }
      const total = L.reduce((s2, _, i) => s2 + costOf(i, L[i].cands[picks[i]], picks), 0);
      if (!win || total < win.total) win = { picks, total };
    });
    L.forEach((A, i) => {
      const p = A.cands[win.picks[i]], c = A.c;
      placed.push(rectAt(p.x, p.y, A.w + 2, A.h * 1.16)); // the world's names keep clear of the descenders too
      c.x = p.x; c.y = p.y; c.ax = A.ax; c.ay = A.ay; c.w = A.w; c.h = A.h;
      c.moved = reach(p.r, A.ax, A.ay) > Math.max(3, A.tol);
      c.lineEls = null;
    });

    // the leaders and the places they point to
    mine.filter((c) => c.moved).forEach((c) => {
      const r = rectAt(c.x, c.y, c.w, c.h);
      const qx = clamp(c.ax, r.x0 - 2, r.x1 + 2), qy = clamp(c.ay, r.y0 - 1, r.y1 + 1);
      const l = document.createElementNS(NS, 'path');
      l.setAttribute('class', 'nm-lead');
      l.setAttribute('d', `M${qx.toFixed(1)},${qy.toFixed(1)}L${c.ax.toFixed(1)},${c.ay.toFixed(1)}`);
      lines.appendChild(l);
      const d = document.createElementNS(NS, 'circle');
      d.setAttribute('class', 'nm-dot' + (c.mine.home ? ' is-home' : ''));
      d.setAttribute('cx', c.ax.toFixed(1)); d.setAttribute('cy', c.ay.toFixed(1)); d.setAttribute('r', 1.8);
      lines.appendChild(d);
      placed.push(rectAt(c.ax, c.ay, 4, 4));
      c.lineEls = [l, d];
    });

    // then the world, by rank and size; a name that would touch another is set smaller, or left out
    const rest = world.filter((c) => !c.mine).sort((a, b) => (a.rank - b.rank) || (b.km2 - a.km2));
    const minFs = zh ? (narrow ? 6.5 : 7.4) : (narrow ? 5 : 5.6); // a Chinese name under 7 px is a smudge
    rest.forEach((c) => {
      const [x, y] = pt(c.at);
      c.x = x; c.y = y; c.on = false;
      for (const f of [1, 0.84, 0.72]) {
        const fs = c.fs * f;
        if (fs < minFs - 0.01) break;
        const r = rectAt(x, y, c.w * f, c.h * f);
        if (!inside(r)) continue;
        if (placed.some((q) => hit(r, q, 1.6))) continue;
        placed.push(r);
        c.on = true;
        if (f !== 1) { c.fs = fs; c.el.style.setProperty('--fs', fs.toFixed(2)); }
        break;
      }
    });

    world.forEach((c) => {
      c.el.classList.toggle('is-off', !c.mine && !c.on);
      c.el.style.setProperty('--x', c.x.toFixed(1));
      c.el.style.setProperty('--y', c.y.toFixed(1));
    });
  }

  /* ------------------------------------------------------------ arrival: his names, in the order he went */

  const T_HOME = 0.1, T_FIRST = 0.42, T_STEP = 0.145;
  const AT = parseFloat(new URLSearchParams(location.search).get('at')); // a frame of the arrival, for checking it
  function arrive(animate) {
    const order = [FP.home, ...FP.abroad];
    const mine = world.filter((c) => c.mine);
    if (AT >= 0) {
      sheet.classList.add('is-frozen');
      mine.forEach((c) => {
        const i = order.indexOf(c.mine), t = i === 0 ? T_HOME : T_FIRST + (i - 1) * T_STEP;
        const p = clamp((AT - t) / 0.6, 0, 1), e = 1 - Math.pow(1 - p, 3);
        c.el.style.setProperty('--p', e.toFixed(3));
        (c.lineEls || []).forEach((el) => el.style.setProperty('--p', clamp((AT - t - 0.2) / 0.5, 0, 1).toFixed(3)));
      });
      return;
    }
    if (!animate) { mine.forEach((c) => c.el.classList.remove('is-wait')); return; }
    mine.forEach((c) => {
      const i = order.indexOf(c.mine);
      const t = i === 0 ? T_HOME : T_FIRST + (i - 1) * T_STEP;
      c.el.style.setProperty('--d', `${t.toFixed(3)}s`);
      c.el.classList.add('is-wait');
      (c.lineEls || []).forEach((e) => { e.classList.add('nm-later'); e.style.setProperty('--d', `${(t + 0.2).toFixed(3)}s`); });
    });
    // two frames later, so the waiting state is drawn before it lets go
    requestAnimationFrame(() => requestAnimationFrame(() => {
      mine.forEach((c) => c.el.classList.remove('is-wait'));
      lines.classList.add('is-in');
    }));
  }

  /* ------------------------------------------------------------ hover */

  box.addEventListener('pointermove', (e) => {
    const t = e.target.closest('.nm-v');
    if (t) FP.tip(e.clientX, e.clientY, FP.about(FP.byId.get(t.dataset.id))); else FP.tip();
  });
  box.addEventListener('pointerleave', () => FP.tip());
  box.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.nm-v');
    if (t) FP.tip(e.clientX, e.clientY, FP.about(FP.byId.get(t.dataset.id))); else FP.tip();
  });
  box.addEventListener('focusin', (e) => {
    const t = e.target.closest('.nm-v');
    if (!t) return;
    const r = t.getBoundingClientRect();
    FP.tip(r.left + r.width / 2, r.top, FP.about(FP.byId.get(t.dataset.id)));
  });
  box.addEventListener('focusout', () => FP.tip());

  /* ------------------------------------------------------------ fonts, then everything */

  // the names are measured before they are placed, so their typefaces must be in first
  function fontsFor(lang) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const zhText = world.map((c) => (c.mine ? (c.mine.home ? c.mine.name.zh : c.mine.country.zh) : c.n.zh)).join('') + FP.w.home;
    const jobs = lang === 'zh'
      ? [document.fonts.load('500 20px "Noto Serif TC"', zhText + '個國家'), document.fonts.load('400 10px "Noto Sans TC"', zhText + '趟旅行大洲到我去過的地方')]
      : [document.fonts.load('400 20px "Playfair Display"', 'Spain 20'), document.fonts.load('400 10px "Geist"', 'BRAZIL')];
    jobs.push(document.fonts.load('500 11px "Geist"', 'WHERE'));
    return Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 1500))]);
  }

  let ready = false, waiting = false;
  FP.world('50m').then((atlas) => {
    gather(atlas);
    return fontsFor(FP.lang);
  }).then(() => {
    if (set() !== false) arrive(!STILL);
    ready = true;
  });

  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    if (!ready) return;
    if (STILL) { if (set() !== false) arrive(false); return; }
    const first = waiting;
    rt = setTimeout(() => { if (set() !== false) arrive(first); }, first ? 0 : 120);
  });
  FP.onLang((lang) => {
    if (!ready) return;
    box.classList.add('is-hush'); lines.classList.add('is-hush');
    Promise.all([fontsFor(lang), new Promise((r) => setTimeout(r, STILL ? 0 : 180))]).then(() => {
      if (set() !== false) arrive(false);
      box.classList.remove('is-hush'); lines.classList.remove('is-hush');
    });
  });
})();
