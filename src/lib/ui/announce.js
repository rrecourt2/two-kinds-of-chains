// Screen-reader summary for a grid of stat tiles. Instead of making the grid a live
// region, which reads every tile on every slider step and every animation frame,
// this waits until the numbers have stopped changing and then reads them once.
// Tiles marked data-quiet (animated values) are left out.

export function announce(node, { delay = 900 } = {}) {
  const region = document.createElement('p');
  region.className = 'tkc-sr';
  region.setAttribute('aria-live', 'polite');
  node.after(region);

  let timer = 0;
  const summary = () =>
    [...node.querySelectorAll('.tkc-stat:not([data-quiet])')]
      .map((tile) => {
        const label = tile.querySelector('.tkc-stat-label')?.textContent.trim();
        const value = tile.querySelector('.tkc-stat-value')?.textContent.trim();
        return label && value ? `${label}: ${value}.` : '';
      })
      .filter(Boolean)
      .join(' ');

  const observer = new MutationObserver((records) => {
    const target = (r) => (r.target.nodeType === 1 ? r.target : r.target.parentElement);
    if (records.every((r) => target(r)?.closest('[data-quiet]'))) return;
    clearTimeout(timer);
    timer = setTimeout(() => (region.textContent = summary()), delay);
  });
  observer.observe(node, { subtree: true, childList: true, characterData: true });

  return {
    destroy() {
      clearTimeout(timer);
      observer.disconnect();
      region.remove();
    },
  };
}
