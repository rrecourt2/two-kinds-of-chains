import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two outputs from one codebase:
//   vite build             -> dist/index.html, one self-contained file (no network requests)
//   vite build --mode lib  -> dist-lib/two-chains.js, an ES module that mounts the story
//                             into any element (used by the SharePoint Framework web part)
export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    return {
      plugins: [svelte({ emitCss: false, compilerOptions: { css: 'injected' } })],
      build: {
        outDir: 'dist-lib',
        emptyOutDir: true,
        lib: { entry: 'src/lib.js', formats: ['es'], fileName: () => 'two-chains.js' },
      },
    };
  }
  return {
    plugins: [svelte(), viteSingleFile()],
    // No preload helper: the single file must never try to fetch anything.
    build: { outDir: 'dist', emptyOutDir: true, modulePreload: { polyfill: false } },
  };
});
