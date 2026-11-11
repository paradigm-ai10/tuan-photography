/* Version Review kit: the store. window.ReviewStore.open(name) gives one store per review file.

   The file lives on the owner's computer (GET / POST <endpoint>, by default /__reviews/<name>).
   Every save reads the file first and changes only what this tab changed, field by field, against
   the copy it last read (a three-way merge), so two open tabs never undo each other:
     stars, note, seen, verdict, flag: the last write wins
     marks: joined by id; a mark removed anywhere stays removed ("gone")
     beats: joined as a set
   Nothing he wrote is deleted: old "pins" are kept as they are and shown as marks.
   If the server cannot be reached the change waits in localStorage and is sent on the next load.
   window.Review is the older interface (data, item, save, pull, on, setScore, name, verdictOf),
   kept so pages written for it keep working. */
(() => {
  'use strict';
  if (window.ReviewStore) return;
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const verdictOf = (s) => (s >= 4 ? 'good' : s && s <= 2 ? 'bad' : '');
  const now = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const uid = () => 'm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  function mergeMarks(server, local, base) {
    const out = new Map();
    (server || []).forEach((m) => m && m.id && out.set(m.id, m));
    const baseIds = new Map((base || []).filter((m) => m && m.id).map((m) => [m.id, m]));
    (local || []).forEach((m) => {
      if (!m || !m.id) return;
      const s = out.get(m.id), b = baseIds.get(m.id);
      if (!s) { out.set(m.id, m); return; }
      // the same mark on both sides: what changed here wins, but a removal or a "done" is never undone
      const merged = Object.assign({}, s);
      Object.keys(m).forEach((k) => { if (!b || !same(m[k], b[k])) merged[k] = m[k]; });
      merged.gone = !!(s.gone || m.gone);
      if (s.done || m.done) merged.done = true;
      out.set(m.id, merged);
    });
    return [...out.values()];
  }

  function mergeItem(server, local, base) {
    const out = Object.assign({}, server || {});
    base = base || {};
    Object.keys(local).forEach((k) => {
      if (k === 'marks') out.marks = mergeMarks(out.marks, local.marks, base.marks);
      else if (k === 'beats') out.beats = [...new Set([...(out.beats || []), ...(local.beats || [])])];
      else if (!same(local[k], base[k])) out[k] = local[k];
    });
    // a field this tab removed (older pages delete keys) goes on the server too
    Object.keys(base).forEach((k) => { if (!(k in local) && k !== 'marks' && k !== 'beats') delete out[k]; });
    return out;
  }

  const stores = {};

  function open(name, opts) {
    opts = opts || {};
    if (stores[name]) return stores[name];
    const URL_ = opts.endpoint || `/__reviews/${name}`;
    const KEY = `${name}-review`;
    let mine = { items: {} }, base = { items: {} };
    const dirty = new Set();     // item ids changed here and not yet on the server
    const dirtyTop = new Set();  // 'general', 'groupNotes'
    const listeners = [];
    let timer = 0, status = '', busy = false, again = false;

    // what is waiting from an earlier visit
    try {
      const kept = JSON.parse(localStorage.getItem(KEY));
      if (kept && kept._pending) {
        mine = kept.mine || mine; base = kept.base || base;
        (kept._pending.items || []).forEach((id) => dirty.add(id));
        (kept._pending.top || []).forEach((k) => dirtyTop.add(k));
      } else if (kept && kept.items) {
        mine = kept; base = clone(kept);   // the older kit kept a plain copy here: a cache only
      }
    } catch (e) { /* storage blocked */ }
    mine.items = mine.items || {}; base.items = base.items || {};

    const emit = (k) => listeners.forEach((f) => { try { f(k); } catch (e) { /* a listener */ } });
    function keep() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ _pending: { items: [...dirty], top: [...dirtyTop] }, mine, base }));
      } catch (e) { /* storage blocked */ }
    }

    function adopt(s) {
      // take the file, but keep what is still waiting to be saved from here
      const next = clone(s);
      next.items = next.items || {};
      dirty.forEach((id) => { next.items[id] = mergeItem(next.items[id], mine.items[id] || {}, base.items[id]); });
      if (dirtyTop.has('general')) next.general = mine.general;
      if (dirtyTop.has('groupNotes')) next.groupNotes = Object.assign({}, next.groupNotes, mine.groupNotes);
      next.names = Object.assign({}, next.names, mine.names);
      base = clone(s); base.items = base.items || {};
      mine = next;
    }

    function pull() {
      return fetch(URL_, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(r))).then((s) => {
        if (!s || typeof s !== 'object') return;
        adopt(s);
        keep();
        emit('pulled');
        if (dirty.size || dirtyTop.size) schedule();
      }).catch(() => { if (dirty.size || dirtyTop.size) emit('local'); });
    }

    function schedule() { clearTimeout(timer); timer = setTimeout(push, 400); }

    function save(id) {
      if (id === '*general') dirtyTop.add('general');
      else if (id && id.startsWith('*group')) dirtyTop.add('groupNotes');
      else if (id) dirty.add(id);
      keep();
      emit('change');
      schedule();
    }

    // A save: read the file, merge in what changed here, write it back only if nobody wrote in
    // between (the server answers 409 when "_rev" moved on; then read, merge and try again).
    // A change made while a save is on its way stays waiting: an item leaves "dirty" only if it
    // is still exactly what was sent.
    let tries = 0;
    function push() {
      if (busy) { again = true; return; }
      if (!dirty.size && !dirtyTop.size) return;
      busy = true;
      const sentItems = [...dirty], sentTop = [...dirtyTop];
      const snap = {};
      sentItems.forEach((id) => { snap[id] = JSON.stringify(mine.items[id] || {}); });
      const snapTop = { general: JSON.stringify(mine.general), groupNotes: JSON.stringify(mine.groupNotes) };
      let conflict = false;
      fetch(URL_, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject(r))).then((s) => {
        if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('unreadable');
        s.items = s.items || {};
        const rev = typeof s._rev === 'number' ? s._rev : 0;
        sentItems.forEach((id) => { s.items[id] = mergeItem(s.items[id], mine.items[id] || {}, base.items[id]); });
        if (sentTop.includes('general') && !same(mine.general, base.general)) s.general = mine.general;
        if (sentTop.includes('groupNotes')) {
          const g = Object.assign({}, s.groupNotes);
          Object.keys(mine.groupNotes || {}).forEach((k) => { if (!same(mine.groupNotes[k], (base.groupNotes || {})[k])) g[k] = mine.groupNotes[k]; });
          s.groupNotes = g;
        }
        s.names = Object.assign({}, s.names, mine.names);
        s.schema = 2;
        const body = Object.assign({}, s, { _ifrev: rev });
        return fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          .then((r) => {
            if (r.status === 409) { conflict = true; throw new Error('moved on'); }
            if (!r.ok) throw new Error('not saved');
            return r.json();
          })
          .then((ok) => {
            if (ok && ok.saved) s._saved = ok.saved;
            if (ok && typeof ok.rev === 'number') s._rev = ok.rev;
            tries = 0;
            sentItems.forEach((id) => { if (JSON.stringify(mine.items[id] || {}) === snap[id]) dirty.delete(id); });
            sentTop.forEach((k) => { if (JSON.stringify(mine[k]) === snapTop[k]) dirtyTop.delete(k); });
            adopt(s);
            keep();
            status = 'saved';
            emit('saved');
            if (dirty.size || dirtyTop.size) again = true;
          });
      }).catch(() => {
        if (conflict && tries < 5) { tries += 1; again = true; return; }
        tries = 0;
        status = 'local'; keep(); emit('local');
      }).then(() => { busy = false; if (again) { again = false; setTimeout(push, conflict ? 60 + Math.random() * 120 : 0); } });
    }

    const item = (id) => (mine.items[id] = mine.items[id] || {});

    // old pins and new marks, shown together; removed ones left out
    function marksOf(id) {
      const it = mine.items[id] || {};
      const old = (it.pins || []).map((p, i) => ({
        id: `pin-${i}`, legacy: true, kind: null, tags: [], phrases: [], text: p.text || '', where: null,
        view: { scroll: typeof p.at === 'number' ? p.at : 0 }, near: p.view || '', when: p.when || '',
      }));
      return old.concat((it.marks || []).filter((m) => m && !m.gone));
    }

    const store = {
      name, endpoint: URL_,
      get data() { return mine; },
      get status() { return status; },
      item, save, pull, verdictOf, marksOf, now,
      on: (f) => listeners.push(f),
      off: (f) => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); },
      // the older interface: the same score twice clears it
      setScore(id, s) { const it = item(id); it.stars = it.stars === s ? 0 : s; it.verdict = verdictOf(it.stars); it.noted = now(); save(id); },
      setStars(id, s) { const it = item(id); it.stars = s; it.verdict = verdictOf(s); it.noted = now(); save(id); },
      setNote(id, text) { const it = item(id); it.note = text; it.noted = now(); save(id); },
      // Lightroom's flags: 'pick' | 'reject' | '' (the same flag twice takes it off)
      setFlag(id, f) { const it = item(id); it.flag = it.flag === f ? '' : (f || ''); it.noted = now(); save(id); },
      flagOf(id) { return (mine.items[id] || {}).flag || ''; },
      setSeen(id) { item(id).seen = now(); save(id); },
      addMark(id, m) {
        const it = item(id);
        it.marks = it.marks || [];
        const mark = Object.assign({ id: uid(), kind: null, tags: [], phrases: [], text: '', where: null, view: null, when: now(), done: false, gone: false }, m);
        it.marks.push(mark);
        save(id);
        return mark;
      },
      removeMark(id, markId) {
        const it = item(id);
        const m = (it.marks || []).find((x) => x.id === markId);
        if (m) { m.gone = true; save(id); }
      },
      addBeat(winner, loser) {
        const it = item(winner);
        it.beats = [...new Set([...(it.beats || []), loser])];
        save(winner);
      },
      setGeneral(text) { mine.general = text; save('*general'); },
      setGroupNote(gid, text) { mine.groupNotes = Object.assign({}, mine.groupNotes, { [gid]: text }); save('*group'); },
      name(id, en) { mine.names = mine.names || {}; if (mine.names[id] !== en) { mine.names[id] = en; } },
      // the last time he wrote anything on a version: a score, the note, a mark
      lastNoted(id) {
        const it = mine.items[id] || {};
        const t = [it.noted, ...(it.marks || []).filter((m) => !m.gone).map((m) => m.when), ...(it.pins || []).map((p) => p.when)]
          .filter((x) => typeof x === 'string').map((x) => x.replace(' ', 'T')).sort();
        return t.length ? t[t.length - 1] : '';
      },
    };
    stores[name] = store;
    if (dirty.size || dirtyTop.size) setTimeout(push, 50);
    return store;
  }

  // the manifest's versions in reading order: by group as the groups are listed, then as written,
  // so the numbers always run straight through each group (a row added at the end still joins its group)
  // this round: the manifest's "round" ({"groups": [...], "ids": [...]}), else the versions "ask" names.
  // Every version gets `now`: true for this round's, false for earlier rounds'; all true when there is no
  // round (or it names nothing on the list). This round comes first and is numbered from 1.
  function ordered(m) {
    const g = new Map(((m && m.groups) || []).map((x, i) => [x.id, i]));
    const r = (m && m.round) || {}, a = (m && m.ask) || {};
    const ids = new Set(Array.isArray(r.ids) ? r.ids : []), groups = new Set(Array.isArray(r.groups) ? r.groups : []);
    if (!ids.size && !groups.size && Array.isArray(a.ids)) a.ids.forEach((id) => ids.add(id));
    const vs = ((m && m.items) || []).map((it, i) => Object.assign({ id: (it.href || '').replace(/\.html?$/, '') }, it, { _i: i }));
    vs.forEach((v) => { v.now = ids.has(v.id) || groups.has(v.group); });
    if (!vs.some((v) => v.now)) vs.forEach((v) => { v.now = true; });
    return vs
      .sort((p, q) => (q.now - p.now) || (g.has(p.group) ? g.get(p.group) : 1e6) - (g.has(q.group) ? g.get(q.group) : 1e6) || p._i - q._i)
      .map((it, i) => Object.assign(it, { n: i + 1 }));
  }

  window.ReviewStore = { open, verdictOf, mergeItem, mergeMarks, ordered };
})();
