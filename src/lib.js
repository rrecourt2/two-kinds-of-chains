// Library entry for hosts that own the page, such as a SharePoint Framework web part.
// The theme stylesheet travels inside the bundle and is added once per document.
import themeCss from './theme.css?inline';
import { mountStory as mount } from './mount.js';

const STYLE_ID = 'two-chains-theme';

/**
 * Mount the story into `target`.
 * options.theme: 'light' (default here, to match a SharePoint page), 'dark' or 'auto'.
 * options.syncHash: false (default here) leaves the host page's URL alone.
 * Returns { destroy() }.
 */
export function mountStory(target, options = {}) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = themeCss;
    document.head.appendChild(style);
  }
  return mount(target, { theme: 'light', syncHash: false, ...options });
}
