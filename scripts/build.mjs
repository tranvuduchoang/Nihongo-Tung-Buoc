import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.rmSync(dist, {recursive: true, force: true});
fs.mkdirSync(dist, {recursive: true});
for (const file of ['index.html', 'styles.css', 'favicon.svg', 'hiragana-model.js', 'THIRD_PARTY_NOTICES.md', '.nojekyll',
  'src/app.js', 'src/kana-model.js', 'src/recognizer.js', 'src/katakana-data.js',
  'exercises/index.html', 'src/exercises.js', 'src/exercises-data.js', 'src/exercises-extra.js', 'src/exercises-pdf.js', 'src/exercises.css',
  'vendor/pdf/pdf-lib-1.17.1.min.js', 'vendor/pdf/fontkit-1.1.1.umd.min.js', 'vendor/pdf/pdf-lib-LICENSE.md', 'vendor/pdf/fontkit-LICENSE.md',
  'assets/fonts/NihongoLatin-Regular.ttf', 'assets/fonts/NihongoJapanese-Regular.ttf', 'assets/fonts/OFL-Latin.txt', 'assets/fonts/OFL-JP.txt']) {
  const target = path.join(dist, file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, file), target);
}
console.log('Built static site in dist/');
