/* Reference pages: a Lightroom-style flag filter (2026-11-10, his ask: "像 LRC filter 不要的").
   Three toggles above the list, Good / Unmarked / Not for me, each with its count; switch one off to
   hide those sites. Read from the page's own Good / Not for me buttons, so it works on every
   reference page without touching their scripts. The choice is remembered per page in this browser. */
(() => {
  'use strict';
  const list = document.getElementById('list');
  if (!list) return;
  const KEY = 'refs-filter:' + location.pathname;
  const KINDS = [
    ['good', '喜歡 Good'],
    ['none', '還沒標 Unmarked'],
    ['bad', '不要的 Not for me']
  ];
  let on = { good: true, none: true, bad: true };
  try { Object.assign(on, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* private window */ }

  const bar = document.createElement('div');
  bar.className = 'refs-filter';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', '篩選 Filter');
  const label = document.createElement('span');
  label.className = 'refs-filter-label';
  label.textContent = '顯示 Show';
  bar.appendChild(label);
  const btns = {};
  KINDS.forEach(([k, text]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'refs-btn refs-filter-btn';
    b.dataset.k = k;
    b.dataset.text = text;
    b.addEventListener('click', () => {
      on[k] = !on[k];
      try { localStorage.setItem(KEY, JSON.stringify(on)); } catch (e) { /* ignore */ }
      apply();
    });
    btns[k] = b;
    bar.appendChild(b);
  });
  const shown = document.createElement('span');
  shown.className = 'refs-filter-label refs-filter-count';
  bar.appendChild(shown);
  list.parentNode.insertBefore(bar, list);

  const kindOf = (li) => {
    const b = li.querySelectorAll('.refs-row button');
    if (b[0] && b[0].getAttribute('aria-pressed') === 'true') return 'good';
    if (b[1] && b[1].getAttribute('aria-pressed') === 'true') return 'bad';
    return 'none';
  };

  function apply() {
    const n = { good: 0, none: 0, bad: 0 };
    let total = 0, visible = 0, group = null, groupHas = false;
    const closeGroup = () => { if (group) group.hidden = !groupHas; };
    [...list.children].forEach((li) => {
      if (li.classList.contains('refs-group')) { closeGroup(); group = li; groupHas = false; return; }
      if (!li.classList.contains('refs-item')) return;
      const k = kindOf(li);
      n[k]++; total++;
      li.hidden = !on[k];
      if (!li.hidden) { visible++; groupHas = true; }
    });
    closeGroup();
    KINDS.forEach(([k]) => {
      btns[k].textContent = btns[k].dataset.text + ' ' + n[k];
      btns[k].setAttribute('aria-pressed', String(on[k]));
    });
    shown.textContent = visible === total ? '' : '顯示 ' + visible + ' / ' + total + ' shown';
  }

  // the list is drawn after its notes load, and marks change on click: follow both
  new MutationObserver(apply).observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
  apply();
})();
