// Builds the page into dist/: bundles src/main.ts and copies the HTML and CSS.
import { build } from 'esbuild';
import { copyFile, cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: true,
  target: 'es2022',
  format: 'iife',
  outfile: 'dist/main.js',
});
await copyFile('index.html', 'dist/index.html');
await copyFile('styles.css', 'dist/styles.css');
for (const icon of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']) {
  await copyFile(icon, `dist/${icon}`);
}
await cp('fonts', 'dist/fonts', { recursive: true });
console.log('built dist/');
