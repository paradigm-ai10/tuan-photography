/* The prototype picker's wiring (PICKER.md). The page is the stage: a variant is one class on
   <body>, swapped instantly. No replay: the directions are still, there is nothing to re-run. */
(() => {
  const variants = ['hl-wash', 'hl-fade', 'hl-margin'];
  const picker = document.querySelector('.proto-picker');
  const highlight = picker.querySelector('.proto-picker-highlight');
  const items = [...picker.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)')];
  let current = 0;
  function moveHighlight() {
    const el = items[current];
    highlight.style.width = el.offsetWidth + 'px';
    highlight.style.transform = `translateX(${el.offsetLeft}px)`;
  }
  function mount(i) {
    document.body.classList.remove(...variants);
    document.body.classList.add(variants[i]);
  }
  function setActive(i) {
    if (i < 0 || i >= variants.length) return;
    current = i;
    items.forEach((el, j) => {
      el.toggleAttribute('data-active', j === i);
      if (j === i) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
    moveHighlight();
    const url = new URL(location);
    url.searchParams.set('v', i + 1);
    history.replaceState(null, '', url);
    mount(i);
  }
  items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
  window.addEventListener('resize', moveHighlight);
  document.addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('.viewer.is-open, .viewer[open]')) return;   // the photo viewer has the arrows
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= variants.length) setActive(num - 1);
    else if (e.key === 'ArrowRight') setActive((current + 1) % variants.length);
    else if (e.key === 'ArrowLeft') setActive((current - 1 + variants.length) % variants.length);
  });
  setActive((parseInt(new URLSearchParams(location.search).get('v'), 10) || 1) - 1);
  requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute('data-ready', '')));
})();
