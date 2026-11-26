// Bundles the viewer into scripts/viewer/dist: the components as one script, the styles as one
// stylesheet. `wireflow build` inlines both, so dist is committed and the CLI needs no install.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const STYLES = ['base', 'toolbar', 'canvas', 'board', 'frame', 'panel', 'log', 'player'];

await build({
  absWorkingDir: root,
  entryPoints: ['scripts/viewer/src/main.mjs'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: false,
  outfile: 'scripts/viewer/dist/viewer.js',
});

const css = STYLES.map((name) =>
  readFileSync(`${root}scripts/viewer/src/styles/${name}.css`, 'utf8'),
);
writeFileSync(`${root}scripts/viewer/dist/viewer.css`, css.join('\n'));
