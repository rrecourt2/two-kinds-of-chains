import { mount, unmount } from 'svelte';
import App from './App.svelte';

export function mountStory(target, { theme = 'auto', syncHash = false, startAt } = {}) {
  const app = mount(App, { target, props: { theme, syncHash, startAt } });
  return {
    destroy() {
      unmount(app);
    },
  };
}
