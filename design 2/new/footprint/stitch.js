/* Cross-stitch sampler 十字繡 (2026-11-06). The world as an embroidery sampler on aida cloth: every
   square of land is a cross stitch. Where he has not been, only the printed pattern shows, pale
   pencil crosses still to be sewn; the countries he has been to are sewn in earth-coloured floss,
   Taiwan in red as home. A stitched border goes round it, and the count is sewn as numerals.
   On arrival the countries are sewn one after another in the order he first went, each row
   worked the Danish way: all the half stitches out, then crossed on the way back. */
(() => {
  'use strict';
  const FP = window.FP;
  FP.chrome();
  const asked = new URLSearchParams(location.search).get('lang'); // ?lang=zh opens it in 中文
  if (asked === 'zh' || asked === 'en') FP.setLang(asked);

  /* ------------------------------------------------------------ words */

  const WORDS = {
    en: {
      countries: 'countries', home: 'Home', taiwan: 'Taiwan, home', pattern: 'Not yet sewn',
      map: (n) => `A cross-stitch sampler of the world with ${n} countries sewn`,
    },
    zh: {
      countries: '個國家', home: '家', taiwan: '台灣，家', pattern: '還沒繡',
      map: (n) => `一幅十字繡世界地圖，繡上了 ${n} 個國家`,
    },
  };
  const t = () => WORDS[FP.lang];

  /* ------------------------------------------------------------ colours, from the stylesheet */

  const root = getComputedStyle(document.documentElement);
  const PAL = {};
  ['paper', 'ink', 'ink-2', 'ink-3', 'hair', 'route', 'clay', 'olive', 'slate', 'ochre', 'linen']
    .forEach((k) => { PAL[k] = root.getPropertyValue('--' + k).trim(); });
  const CONTINENT = { asia: 'clay', europe: 'slate', oceania: 'olive', 'north-america': 'ochre' };

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function rgb(css) {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  const RGB = {};
  for (const k in PAL) RGB[k] = rgb(PAL[k]);
  const mixRGB = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
  const css = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let r = Math.imul(a ^ (a >>> 15), 1 | a);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

  /* ------------------------------------------------------------ the page */

  const stage = document.getElementById('stage');
  stage.innerHTML = `<div class="st-cloth">
      <canvas class="st-base" aria-hidden="true"></canvas>
      <canvas class="st-sewn" role="img"></canvas>
      <p class="st-home fp-label"></p>
      <p class="st-where fp-label"></p>
      <div class="st-words"></div>
      <ul class="st-key"></ul>
    </div>`;
  const cloth = stage.querySelector('.st-cloth');
  const cvBase = cloth.querySelector('.st-base');
  const cvSewn = cloth.querySelector('.st-sewn');
  const homeEl = cloth.querySelector('.st-home');
  const whereEl = cloth.querySelector('.st-where');
  const wordsEl = cloth.querySelector('.st-words');
  const keyEl = cloth.querySelector('.st-key');
  const px = (el, k, v) => el.style.setProperty(k, `${Math.round(v * 100) / 100}px`);

  const C = FP.counts;
  const perContinent = {};
  FP.abroad.forEach((c) => { perContinent[c.continent] = (perContinent[c.continent] || 0) + 1; });
  const continents = Object.keys(perContinent).sort((a, b) => perContinent[b] - perContinent[a]);
  // the key's rows: a thread and its name
  const keyRows = () => [
    ...continents.map((k) => ({ thread: CONTINENT[k], name: FP.w.continent[k], n: perContinent[k] })),
    { thread: 'route', name: t().taiwan },
    { thread: null, name: t().pattern, n: C.world - C.countries },
  ];

  function words() {
    const w = FP.w, s = t();
    whereEl.textContent = w.where;
    const a = `${C.trips} ${w.trips(C.trips)}`, b = `${C.continents} ${w.continents(C.continents)}`;
    wordsEl.innerHTML = `<span class="st-words__what">${FP.esc(s.countries)}</span>
      <span class="st-words__span">${FP.esc(w.span(C.since, C.until))}</span>
      <span class="st-words__trips">${FP.esc(a)}</span><span class="st-words__trips">${FP.esc(b)}</span>`;
    keyEl.innerHTML = keyRows().map((r) => `<li><span>${FP.esc(r.name)}</span>${r.n != null ? `<b>${r.n}</b>` : ''}</li>`).join('');
    homeEl.textContent = s.home;
    cvSewn.setAttribute('aria-label', s.map(C.countries));
  }

  /* ------------------------------------------------------------ threads */

  // one strand laid from hole to hole: a darker body, the floss, its twist and a little sheen
  function strand(g, x0, y0, x1, y1, tw, col, r) {
    const dark = css(mixRGB(col, RGB.ink, 0.3)), light = css(mixRGB(col, RGB.paper, 0.55));
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    g.lineCap = 'round';
    g.globalAlpha = 1;
    g.strokeStyle = dark; g.lineWidth = tw;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = css(col); g.lineWidth = tw * 0.68;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    // the twist of the six strands, as faint slanted ticks across the thread
    g.strokeStyle = dark; g.lineWidth = Math.max(0.5, tw * 0.1); g.globalAlpha = 0.32;
    const ticks = Math.max(2, Math.round(len / (tw * 1.1)));
    for (let k = 1; k < ticks; k++) {
      const p = k / ticks + (r() - 0.5) * 0.04, cx = x0 + dx * p, cy = y0 + dy * p;
      g.beginPath();
      g.moveTo(cx + nx * tw * 0.36 - ux * tw * 0.22, cy + ny * tw * 0.36 - uy * tw * 0.22);
      g.lineTo(cx - nx * tw * 0.36 + ux * tw * 0.22, cy - ny * tw * 0.36 + uy * tw * 0.22);
      g.stroke();
    }
    // the sheen, along one side, not to the ends
    g.globalAlpha = 0.5 + r() * 0.25; g.strokeStyle = light; g.lineWidth = tw * 0.2;
    const a = 0.2 + r() * 0.08, b = 0.72 + r() * 0.08, o = -tw * 0.17;
    g.beginPath(); g.moveTo(x0 + dx * a + nx * o, y0 + dy * a + ny * o); g.lineTo(x0 + dx * b + nx * o, y0 + dy * b + ny * o); g.stroke();
    g.globalAlpha = 1;
  }

  // a thread's half stitches, a few of each so no two neighbours are quite alike
  function sprites(col, s, seed) {
    const r = rng(seed), out = [];
    const e = s * 0.12, tw = s * 0.4;
    for (let v = 0; v < 4; v++) {
      const shade = mixRGB(col, r() < 0.5 ? RGB.ink : RGB.paper, r() * 0.07);
      const a = canvasOf(s, s), b = canvasOf(s, s);
      strand(a.getContext('2d'), e, s - e, s - e, e, tw, shade, r);   // the first half, up to the right
      strand(b.getContext('2d'), e, e, s - e, s - e, tw, shade, r);   // crossed over it, down to the right
      out.push({ a, b });
    }
    return out;
  }

  /* ------------------------------------------------------------ the cloth */

  function aidaTile(s) {
    const c = canvasOf(s, s), g = c.getContext('2d');
    g.fillStyle = PAL.linen;
    g.fillRect(0, 0, s, s);
    // each square of aida is a little block of woven threads, the holes at its corners
    const i = s * 0.16;
    g.globalAlpha = 0.5;
    g.fillStyle = PAL.paper;
    g.fillRect(i, i, s - 2 * i, s - 2 * i);
    g.globalAlpha = 0.07;
    g.strokeStyle = PAL['ink-2'];
    g.lineWidth = Math.max(0.5, s * 0.04);
    for (const f of [0.38, 0.62]) {
      g.beginPath(); g.moveTo(i, s * f); g.lineTo(s - i, s * f); g.stroke();
      g.beginPath(); g.moveTo(s * f, i); g.lineTo(s * f, s - i); g.stroke();
    }
    g.globalAlpha = 0.3;
    g.fillStyle = PAL['ink-3'];
    const hr = Math.max(0.6, s * 0.1);
    for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.beginPath(); g.arc(x, y, hr, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    return c;
  }

  // the numerals, as the squares Playfair's figures cover
  function numeralCells(text, rowsTall) {
    const k = 10, font = (fs) => `600 ${fs}px "Playfair Display"`;
    const m = probe;
    m.font = font(100);
    const tm = m.measureText(text);
    const inkH = tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent;
    const fs = (100 * rowsTall * k) / inkH;
    m.font = font(fs);
    const t2 = m.measureText(text);
    const wpx = t2.actualBoundingBoxLeft + t2.actualBoundingBoxRight, hpx = t2.actualBoundingBoxAscent + t2.actualBoundingBoxDescent;
    const cols = Math.ceil(wpx / k) + 1, rows = Math.ceil(hpx / k);
    const c = canvasOf(cols * k, rows * k), g = c.getContext('2d', { willReadFrequently: true });
    g.font = font(fs);
    g.fillStyle = PAL.ink;
    g.fillText(text, t2.actualBoundingBoxLeft + k * 0.5, t2.actualBoundingBoxAscent);
    const a = g.getImageData(0, 0, c.width, c.height).data;
    const cells = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let sum = 0;
      for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) sum += a[((j * k + y) * c.width + i * k + x) * 4 + 3];
      if (sum / (k * k * 255) >= 0.42) cells.push([i, j]);
    }
    return { cells, cols, rows };
  }

  /* ------------------------------------------------------------ the map */

  const EXTENT = [[-180, -57], [180, 84]];
  const PENCIL = 0.62; // how dark the printed pattern is
  let W = null, L = null, run = 0;

  function build(animate) {
    const my = ++run;
    const SW = stage.clientWidth, SH = stage.clientHeight;
    const edge = Math.max(16, Math.min(40, innerWidth * 0.032));
    const top = (document.querySelector('.fp-top') || {}).offsetHeight || 58;
    const narrow = SW < 700;
    const wpx = SW - 2 * edge;
    const c = narrow ? Math.max(3, Math.min(5, Math.round(wpx / 92))) : Math.max(6, Math.min(9, Math.round(wpx / 190)));
    const cols = Math.floor(wpx / c);
    const m = narrow ? 1 : 2;            // the outer line of the border, cells in from the edge
    const inset = m + 5 + 2; // where the field inside the border starts
    const availRows = Math.floor((SH - top - (narrow ? 12 : 10)) / c);
    const dpr = (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1; // whole pixels, so every square is the same

    const frame = d3.geoGraticule().extent(EXTENT).outline();
    const projection = d3.geoNaturalEarth1().precision(0.3);
    const Hd = narrow ? Math.max(12, Math.min(20, Math.round(68 / c))) : Math.max(9, Math.min(15, Math.round(88 / c), Math.floor(availRows * 0.16)));
    let rows = narrow ? 0 : availRows, mapRows = 0;
    const fx0 = inset * c, fx1 = (cols - inset) * c, fy0 = inset * c, fy1 = (availRows - inset) * c;
    if (narrow) {
      projection.fitWidth(fx1 - fx0, frame);
      const tr = projection.translate();
      projection.translate([tr[0] + fx0, tr[1] + fy0]);
    } else projection.fitExtent([[fx0, fy0], [fx1, fy1]], frame);
    {
      // the sea round the edges of the world is bare cloth, so the land itself is fitted to the field
      const probeRows = Math.ceil(d3.geoPath(projection).bounds(frame)[1][1] / c) + 2;
      const g = canvasOf(cols, probeRows).getContext('2d', { willReadFrequently: true });
      g.setTransform(1 / c, 0, 0, 1 / c, 0, 0);
      g.fill(new Path2D(d3.geoPath(projection)(W.landNoPole)));
      const a2 = g.getImageData(0, 0, cols, probeRows).data;
      const inCol = new Uint16Array(cols), inRow = new Uint16Array(probeRows);
      for (let j = 0; j < probeRows; j++) for (let i = 0; i < cols; i++) if (a2[(j * cols + i) * 4 + 3] >= 128) { inCol[i]++; inRow[j]++; }
      const first = (arr) => arr.findIndex((v) => v >= 2), last = (arr) => arr.length - 1 - [...arr].reverse().findIndex((v) => v >= 2);
      const lx0 = first(inCol), lx1 = last(inCol), ly0 = first(inRow), ly1 = last(inRow);
      const lw = (lx1 - lx0 + 1) * c, lh = (ly1 - ly0 + 1) * c;
      const k = narrow ? (fx1 - fx0) / lw : Math.min((fx1 - fx0) / lw, (fy1 - fy0) / lh);
      const [tx, ty] = projection.translate();
      const cxL = ((lx0 + lx1 + 1) / 2) * c, cyL = ((ly0 + ly1 + 1) / 2) * c;
      const cyR = narrow ? fy0 + (lh * k) / 2 : (fy0 + fy1) / 2;
      projection.scale(projection.scale() * k).translate([(fx0 + fx1) / 2 - (cxL - tx) * k, cyR - (cyL - ty) * k]);
      if (narrow) mapRows = Math.ceil((lh * k) / c);
    }
    const path = d3.geoPath(projection);

    // the countries he has been to, Taiwan first, then in the order he first went
    const list = [FP.home, ...FP.abroad];
    const shadeAt = {};
    const items = list.map((cty, idx) => {
      const f = homeland(cty.home ? W.home : W.visited.find((v) => v.id === cty.iso));
      const thread = cty.home ? 'route' : CONTINENT[cty.continent] || 'clay';
      const nth = (shadeAt[thread] = (shadeAt[thread] || 0) + 1) - 1;
      const tone = [0, 0.1, -0.08][nth % 3]; // neighbours in one thread, each a slightly different dye lot
      const col = tone > 0 ? mixRGB(RGB[thread], RGB.paper, tone) : mixRGB(RGB[thread], RGB.ink, -tone);
      return { c: cty, f, p: new Path2D(path(f)), thread, col, idx, cells: [], halves: [], done: 0 };
    });

    // the rows the map covers, for the cloth's height on a phone
    const gridRows = narrow ? inset + mapRows + 2 : rows; // on a phone the cloth grows below this for the count
    // which square is land, and whose
    const cover = (draw) => {
      const g = canvasOf(cols, gridRows).getContext('2d', { willReadFrequently: true });
      g.setTransform(1 / c, 0, 0, 1 / c, 0, 0);
      draw(g);
      const a = g.getImageData(0, 0, cols, gridRows).data, out = new Uint8Array(cols * gridRows);
      for (let i = 0; i < out.length; i++) out[i] = a[i * 4 + 3];
      return out;
    };
    const land = cover((g) => g.fill(new Path2D(path(W.landNoPole))));
    const covers = items.map((it) => cover((g) => g.fill(it.p)));
    const owner = new Int16Array(cols * gridRows).fill(-1); // -1 cloth, -2 land still to sew, else his
    for (let q = 0; q < owner.length; q++) {
      let best = -1, bv = 0, sum = 0;
      for (let k = 0; k < items.length; k++) { const v = covers[k][q]; sum += v; if (v > bv) { bv = v; best = k; } }
      const other = Math.max(0, land[q] - sum);
      if (best >= 0 && bv >= 0.38 * 255 && bv >= other) owner[q] = best;
      else if (land[q] >= 0.5 * 255) owner[q] = -2;
    }
    // a country too small to cover a square still gets one stitch, where it is
    items.forEach((it, k) => {
      let any = false;
      for (let q = 0; q < owner.length && !any; q++) if (owner[q] === k) any = true;
      if (any) return;
      const pt = projection([it.c.ll[1], it.c.ll[0]]);
      if (!pt) return;
      const i = Math.floor(pt[0] / c), j = Math.floor(pt[1] / c);
      if (i >= 0 && j >= 0 && i < cols && j < gridRows) owner[j * cols + i] = k;
    });
    for (let j = 0; j < gridRows; j++) for (let i = 0; i < cols; i++) {
      const o = owner[j * cols + i];
      if (o >= 0) items[o].cells.push([i, j]);
    }

    /* the count and its words: under the map on a phone, else in a quiet corner of the sea */
    words();
    const num = numeralCells(String(C.countries), Hd);
    const keyPitch = narrow ? Math.max(4, Math.ceil(19 / c)) : Math.max(2, Math.ceil(17 / c));
    const wordsCols = Math.ceil((wordsEl.offsetWidth + 4) / c);
    const keyText = Math.max(...[...keyEl.children].map((li) => li.firstElementChild.offsetWidth + (li.children[1] ? li.children[1].offsetWidth + 18 : 0)));
    const keyColCells = Math.ceil(keyText / c) + 3; // a stitch, a square's gap, the words
    const labelRows = Math.ceil(16 / c) + 1;
    const count = { w: num.cols + 2 + wordsCols, h: labelRows + Math.max(num.rows, Math.ceil((wordsEl.offsetHeight - 3) / c)) };
    const nKey = keyRows().length;
    const shapes = [
      { per: Math.ceil(nKey / 2), cols: 2 }, // two columns of three
      { per: nKey, cols: 1 },                // or one column of six
    ].map((k) => ({ ...k, w: k.cols * keyColCells + (k.cols - 1) * 3, h: (k.per - 1) * keyPitch + 1 }));
    let cx0, cy0, key = null;
    const taken = [];
    if (narrow) {
      cx0 = inset;
      cy0 = inset + mapRows + 3;
      key = { ...shapes[0], x: inset, y: cy0 + count.h + 3 };
      rows = key.y + key.h + inset + 1;
    } else {
      // the squares already sewn or patterned, summed, so any rectangle can be checked at once
      const sat = new Int32Array((cols + 1) * (rows + 1));
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const v = j < gridRows && owner[j * cols + i] !== -1 ? 1 : 0;
        sat[(j + 1) * (cols + 1) + i + 1] = v + sat[j * (cols + 1) + i + 1] + sat[(j + 1) * (cols + 1) + i] - sat[j * (cols + 1) + i];
      }
      const used = (x0, y0, x1, y1) => { // inclusive squares, clipped to the cloth
        x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(cols - 1, x1); y1 = Math.min(rows - 1, y1);
        return sat[(y1 + 1) * (cols + 1) + x1 + 1] - sat[y0 * (cols + 1) + x1 + 1] - sat[(y1 + 1) * (cols + 1) + x0] + sat[y0 * (cols + 1) + x0];
      };
      const free = (x, y, w, h) => {
        for (const t2 of taken) if (x < t2.x + t2.w + 3 && t2.x < x + w + 3 && y < t2.y + t2.h + 3 && t2.y < y + h + 3) return false;
        return used(x - 1, y - 1, x + w, y + h) === 0;
      };
      // the free place nearest a bottom corner of the field
      const find = (w, h, fromRight) => {
        let best = null, bs = Infinity;
        for (let y = inset; y <= rows - inset - h; y++) for (let x = inset; x <= cols - inset - w; x++) {
          const side = fromRight ? cols - inset - w - x : x - inset, score = (rows - inset - h - y) + side * 0.6;
          if (score < bs && free(x, y, w, h)) { bs = score; best = [x, y]; }
        }
        return best;
      };
      const at = find(count.w, count.h, false) || [inset, rows - inset - count.h];
      [cx0, cy0] = at;
      taken.push({ x: cx0, y: cy0, w: count.w, h: count.h });
      for (const sh of shapes) {
        const k2 = find(sh.w, sh.h, true);
        if (k2) { key = { ...sh, x: k2[0], y: k2[1] }; break; }
      }
    }
    const cw = cols * c, ch = rows * c;

    /* the cloth on the page */
    px(cloth, '--cx', edge + (wpx - cw) / 2);
    px(cloth, '--cw', cw);
    px(cloth, '--ch', ch);
    const availH = SH - top - (narrow ? 12 : 10);
    px(cloth, '--cy', top + (narrow ? Math.max(0, (availH - ch) * 0.42) : (availH - ch) / 2));
    for (const cv of [cvBase, cvSewn]) {
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
      cv.style.setProperty('width', `${cw}px`);
      cv.style.setProperty('height', `${ch}px`);
    }
    const s = c * dpr; // a square, in the canvas's own pixels

    const base = cvBase.getContext('2d');
    base.setTransform(1, 0, 0, 1, 0, 0);
    base.clearRect(0, 0, cvBase.width, cvBase.height);
    base.fillStyle = base.createPattern(aidaTile(s), 'repeat');
    base.fillRect(0, 0, cvBase.width, cvBase.height);
    // linen is never quite even: a row or a column a shade off, and the odd square
    {
      const r = rng(5), g = canvasOf(cols, rows).getContext('2d');
      const img = g.createImageData(cols, rows), d = img.data;
      const rowT = Array.from({ length: rows }, () => (r() * 2 - 1)), colT = Array.from({ length: cols }, () => (r() * 2 - 1));
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const v = rowT[j] * 0.5 + colT[i] * 0.5 + (r() * 2 - 1) * 0.6, q = (j * cols + i) * 4, src = v > 0 ? RGB.paper : RGB.ink;
        d[q] = src[0]; d[q + 1] = src[1]; d[q + 2] = src[2]; d[q + 3] = Math.min(255, Math.abs(v) * (v > 0 ? 12 : 5));
      }
      g.putImageData(img, 0, 0);
      base.imageSmoothingEnabled = false;
      base.drawImage(g.canvas, 0, 0, cvBase.width, cvBase.height);
      base.imageSmoothingEnabled = true;
    }
    // the printed pattern: a pale pencil cross on every square of land
    base.strokeStyle = PAL['ink-3'];
    base.globalAlpha = PENCIL;
    base.lineWidth = Math.max(0.75 * dpr, s * 0.08);
    base.lineCap = 'round';
    base.beginPath();
    const pe = s * 0.24;
    for (let j = 0; j < gridRows; j++) for (let i = 0; i < cols; i++) {
      if (owner[j * cols + i] === -1) continue;
      const x = i * s, y = j * s;
      base.moveTo(x + pe, y + s - pe); base.lineTo(x + s - pe, y + pe);
      base.moveTo(x + pe, y + pe); base.lineTo(x + s - pe, y + s - pe);
    }
    base.stroke();
    base.globalAlpha = 1;

    // the border: a backstitched line, a chain of small diamonds, another line; a cross at each corner
    const borderSp = sprites(mixRGB(RGB['ink-2'], RGB.paper, 0.3), s, 77);
    const r = rng(11);
    const full = (i, j, sp) => { const v = sp[Math.floor(r() * sp.length)]; base.drawImage(v.a, i * s, j * s); base.drawImage(v.b, i * s, j * s); };
    // backstitch lies along the lines between the squares, one stitch per square
    const lineH = (g0) => {
      for (let i = g0; i < cols - g0; i++) {
        strand(base, i * s + s * 0.08, g0 * s, (i + 1) * s - s * 0.08, g0 * s, s * 0.26, mixRGB(RGB['ink-2'], RGB.paper, r() * 0.08), r);
        strand(base, i * s + s * 0.08, (rows - g0) * s, (i + 1) * s - s * 0.08, (rows - g0) * s, s * 0.26, mixRGB(RGB['ink-2'], RGB.paper, r() * 0.08), r);
      }
      for (let j = g0; j < rows - g0; j++) {
        strand(base, g0 * s, j * s + s * 0.08, g0 * s, (j + 1) * s - s * 0.08, s * 0.26, mixRGB(RGB['ink-2'], RGB.paper, r() * 0.08), r);
        strand(base, (cols - g0) * s, j * s + s * 0.08, (cols - g0) * s, (j + 1) * s - s * 0.08, s * 0.26, mixRGB(RGB['ink-2'], RGB.paper, r() * 0.08), r);
      }
    };
    lineH(m);
    lineH(m + 5);
    const b0 = m + 1; // the diamonds' band: three squares, b0 to b0 + 2
    const chain = (len, put) => { // a run of small diamonds, centred in its length
      const n = Math.floor((len + 1) / 4), off = Math.floor((len + 1 - 4 * n) / 2);
      for (let k = 0; k < n * 4 - 1; k++) {
        const p = k % 4;
        if (p === 0 || p === 2) put(off + k, 1);
        if (p === 1) { put(off + k, 0); put(off + k, 2); }
      }
    };
    const runW = cols - 2 * (b0 + 3) - 2, runH = rows - 2 * (b0 + 3) - 2;
    chain(runW, (k, q) => { full(b0 + 4 + k, b0 + q, borderSp); full(b0 + 4 + k, rows - 1 - b0 - q, borderSp); });
    chain(runH, (k, q) => { full(b0 + q, b0 + 4 + k, borderSp); full(cols - 1 - b0 - q, b0 + 4 + k, borderSp); });
    for (const [ci, cj] of [[b0, b0], [cols - b0 - 3, b0], [b0, rows - b0 - 3], [cols - b0 - 3, rows - b0 - 3]]) {
      for (const [di, dj] of [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]]) full(ci + di, cj + dj, borderSp);
    }

    // the count, sewn in dark thread
    const numSp = sprites(mixRGB(RGB.ink, RGB['ink-2'], 0.6), s, 91);
    const ny = cy0 + labelRows;
    for (const [i, j] of num.cells) full(cx0 + i, ny + j, numSp);

    // the key: a stitch of each thread, its name beside it on the same row
    const keyAt = (n) => [key.x + Math.floor(n / key.per) * (keyColCells + 3), key.y + (n % key.per) * keyPitch];
    const keySp = {};
    if (key) {
      keyRows().forEach((row, n) => {
        const [i, j] = keyAt(n);
        if (row.thread) full(i, j, keySp[row.thread] || (keySp[row.thread] = sprites(RGB[row.thread], s, 300 + n)));
        else { // a pencil cross, still to be sewn
          base.strokeStyle = PAL['ink-3']; base.globalAlpha = PENCIL; base.lineWidth = Math.max(0.75 * dpr, s * 0.08);
          base.beginPath();
          base.moveTo(i * s + pe, j * s + s - pe); base.lineTo(i * s + s - pe, j * s + pe);
          base.moveTo(i * s + pe, j * s + pe); base.lineTo(i * s + s - pe, j * s + s - pe);
          base.stroke(); base.globalAlpha = 1;
        }
      });
    }

    /* the words, on the same rows of the cloth */
    px(whereEl, '--x', cx0 * c);
    px(whereEl, '--y', (cy0 + labelRows / 2 - 0.5) * c);
    px(wordsEl, '--x', (cx0 + num.cols + 2) * c);
    px(wordsEl, '--y', ny * c - 3);
    keyEl.hidden = !key;
    if (key) [...keyEl.children].forEach((li, n) => {
      const [i, j] = keyAt(n);
      px(li, '--x', (i + 2) * c);
      px(li, '--y', (j + 0.5) * c);
      px(li, '--w', (keyColCells - 2) * c);
    });
    // Taiwan's mark
    const tw = items[0].cells;
    if (tw.length) {
      const ti = Math.max(...tw.map((q) => q[0])), tj = tw.reduce((a, q) => a + q[1], 0) / tw.length;
      const tl = Math.min(...tw.map((q) => q[0])), tb = Math.max(...tw.map((q) => q[1]));
      homeEl.classList.toggle('is-under', narrow);
      px(homeEl, '--x', narrow ? ((tl + ti + 1) / 2) * c : (ti + 1) * c + 4);
      px(homeEl, '--y', narrow ? (tb + 1) * c + 2 : (tj + 0.5) * c - homeEl.offsetHeight / 2);
    }

    /* the sewing: Taiwan, then each country in the order he first went */
    const sewn = cvSewn.getContext('2d');
    sewn.setTransform(1, 0, 0, 1, 0, 0);
    sewn.clearRect(0, 0, cvSewn.width, cvSewn.height);
    items.forEach((it) => {
      it.sp = sprites(it.col, s, 1000 + it.idx * 17);
      const rr = rng(2000 + it.idx);
      const byRow = new Map();
      for (const q of it.cells) { if (!byRow.has(q[1])) byRow.set(q[1], []); byRow.get(q[1]).push(q); }
      const rowsOf = [...byRow.keys()].sort((a, b) => a - b);
      for (const j of rowsOf) {
        const row = byRow.get(j).sort((a, b) => a[0] - b[0]);
        const pick = row.map(() => it.sp[Math.floor(rr() * it.sp.length)]);
        row.forEach((q, n) => it.halves.push({ i: q[0], j, sp: pick[n], h: 'a' }));
        for (let n = row.length - 1; n >= 0; n--) it.halves.push({ i: row[n][0], j, sp: pick[n], h: 'b' });
      }
    });
    const sewTo = (it, k) => {
      for (let n = it.done; n < k; n++) { const h = it.halves[n]; sewn.drawImage(h.sp[h.h], h.i * s, h.j * s); }
      it.done = Math.max(it.done, k);
    };

    L = { c, cols, rows: gridRows, owner, items, narrow };

    const total = 3000, lead = 350;
    const weights = items.map((it) => 60 + 18 * Math.sqrt(it.cells.length + 1));
    const sum = weights.reduce((a, b) => a + b, 0);
    let at = lead;
    items.forEach((it, k) => { it.start = at; it.dur = (weights[k] / sum) * total; at += it.dur; });

    const atQ = +new URLSearchParams(location.search).get('at');
    if (!animate || atQ) {
      items.forEach((it) => sewTo(it, atQ ? Math.round(Math.max(0, Math.min(1, (atQ - it.start) / it.dur)) * it.halves.length) : it.halves.length));
      return;
    }
    const t0 = performance.now();
    const tick = (now) => {
      if (my !== run) return;
      const el = now - t0;
      let busy = false;
      for (const it of items) {
        if (el < it.start) { busy = true; continue; }
        const k = Math.round(Math.min(1, (el - it.start) / it.dur) * it.halves.length);
        if (k > it.done) sewTo(it, k);
        if (it.done < it.halves.length) busy = true;
      }
      if (busy) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // France and the Netherlands without their lands overseas: he went to the European part
  const EUROPE = [[-12, 34], [32, 62]];
  function homeland(f) {
    if (!f || (f.id !== '250' && f.id !== '528') || f.geometry.type !== 'MultiPolygon') return f;
    const keep = f.geometry.coordinates.filter((poly) => {
      const [x, y] = d3.geoCentroid({ type: 'Polygon', coordinates: poly });
      return x > EUROPE[0][0] && x < EUROPE[1][0] && y > EUROPE[0][1] && y < EUROPE[1][1];
    });
    return { ...f, geometry: { type: 'MultiPolygon', coordinates: keep } };
  }

  /* ------------------------------------------------------------ the pointer */

  cvSewn.addEventListener('pointermove', (e) => {
    if (!L) return;
    const r = cvSewn.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left) / L.c), j = Math.floor((e.clientY - r.top) / L.c);
    const o = i >= 0 && j >= 0 && i < L.cols && j < L.rows ? L.owner[j * L.cols + i] : -1;
    const it = o >= 0 ? L.items[o] : null;
    if (it && it.done >= it.halves.length) FP.tip(e.clientX, e.clientY, FP.about(it.c));
    else FP.tip();
  });
  cvSewn.addEventListener('pointerleave', () => FP.tip());

  /* ------------------------------------------------------------ start */

  words();
  FP.onLang(() => { if (L) build(false); else words(); });
  const fonts = document.fonts ? Promise.all([document.fonts.ready, document.fonts.load('600 40px "Playfair Display"')]) : Promise.resolve();
  Promise.all([FP.world('50m'), fonts]).then(([world]) => {
    W = { ...world, landNoPole: { type: 'FeatureCollection', features: world.features.filter((f) => f.id !== '010') } };
    build(!(FP.still || FP.reduced));
    let wait = 0;
    addEventListener('resize', () => { clearTimeout(wait); wait = setTimeout(() => build(false), 160); });
  });
})();
