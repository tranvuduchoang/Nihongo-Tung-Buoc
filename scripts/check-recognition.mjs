import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = {window: {}, document: {addEventListener() {}}};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'vendor/kanji-canvas.min.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'hiragana-patterns.js'), 'utf8'), context);
const engine = context.KanjiCanvas;
if (engine.refPatterns.length !== 46) throw new Error('Expected 46 patterns');
const mistakes = [];
for (const [char, , strokes] of engine.refPatterns) {
  const candidates = engine.coarseClassification(strokes);
  const predicted = engine.fineClassification(strokes, candidates).trim().split(/\s+/)[0];
  if (predicted !== char) mistakes.push(`${char} → ${predicted || '(none)'}`);
}
if (mistakes.length) throw new Error(`Reference recognition failed: ${mistakes.join(', ')}`);
console.log('All 46 reference Hiragana patterns recognized.');
