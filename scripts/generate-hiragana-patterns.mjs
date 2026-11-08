// Rebuild the recognition data from the MIT-licensed KanjiCanvas source XML:
// node scripts/generate-hiragana-patterns.mjs <path-to-kanjicanvas/hiragana>
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/generate-hiragana-patterns.mjs <kanjicanvas/hiragana>');
  process.exit(1);
}

const chars = [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'];
const context = { window: {}, document: { addEventListener() {} } };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'vendor/kanji-canvas.min.js'), 'utf8'), context);
const patterns = chars.map(char => {
  const file = path.join(source, `${char.codePointAt(0).toString(16).toUpperCase()}.xml`);
  const xml = fs.readFileSync(file, 'utf8');
  const strokes = [...xml.matchAll(/<stroke>([\s\S]*?)<\/stroke>/g)].map(([, body]) =>
    [...body.matchAll(/<point x="(\d+)" y="(\d+)"\s*\/>/g)].map(([, x, y]) => [Number(x), Number(y)]));
  if (!strokes.length || strokes.some(stroke => stroke.length < 2)) throw new Error(`Missing stroke data for ${char}`);
  context.KanjiCanvas.recordedPattern_generation = strokes;
  const normalized = context.KanjiCanvas.momentNormalize('generation');
  return [char, strokes.length, context.KanjiCanvas.extractFeatures(normalized, 20)];
});
fs.writeFileSync(path.join(root, 'hiragana-patterns.js'),
  `// Generated from KanjiCanvas hiragana XML; see THIRD_PARTY_NOTICES.md.\nKanjiCanvas.refPatterns = ${JSON.stringify(patterns)};\n`);
console.log(`Generated ${patterns.length} Hiragana patterns.`);
