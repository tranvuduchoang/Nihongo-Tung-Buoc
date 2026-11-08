import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.rmSync(dist, {recursive: true, force: true});
fs.mkdirSync(dist, {recursive: true});
for (const file of ['index.html', 'styles.css', 'favicon.svg', 'hiragana-patterns.js',
  'hiragana-patterns-tomoe.js', 'hiragana-patterns-kanjivg.js', 'THIRD_PARTY_NOTICES.md', '.nojekyll',
  'src/app.js', 'src/recognizer.js', 'vendor/kanji-canvas.min.js']) {
  const target = path.join(dist, file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, file), target);
}
console.log('Built static site in dist/');
