import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = {window: {}, document: {addEventListener() {}}};
context.window = context;
vm.createContext(context);
for (const file of ['vendor/kanji-canvas.min.js', 'hiragana-patterns.js', 'hiragana-patterns-tomoe.js',
  'hiragana-patterns-kanjivg.js', 'src/recognizer.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const engine = context.KanjiCanvas;
const allTemplates = [...engine.refPatterns];
const SOURCES = ['kanjicanvas', 'tomoe', 'kanjivg'];
const covered = new Set(allTemplates.map(template => template[0]));
if (covered.size !== 46) throw new Error(`Expected templates for 46 characters, found ${covered.size}`);
for (const char of covered) {
  const sources = new Set(allTemplates.filter(template => template[0] === char).map(template => template[3]));
  if (!SOURCES.every(source => sources.has(source))) throw new Error(`${char} is missing a template source`);
}

let seed = 12345;
function random(min, max) {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return min + seed / 4294967296 * (max - min);
}

// Reads a polyline the way a touch screen does: one point every `gap` canvas units.
function sampleEvery(polyline, nextGap) {
  const points = [polyline[0]];
  let travelled = 0;
  let gap = nextGap();
  for (let i = 1; i < polyline.length; i++) {
    const [a, b] = [polyline[i - 1], polyline[i]];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const parts = Math.max(1, Math.ceil(length / 0.5));
    for (let part = 1; part <= parts; part++) {
      travelled += length / parts;
      if (travelled < gap) continue;
      points.push([a[0] + (b[0] - a[0]) * part / parts, a[1] + (b[1] - a[1]) * part / parts]);
      travelled = 0;
      gap = nextGap();
    }
  }
  if (travelled > 0) points.push(polyline.at(-1));
  return points;
}

const failures = [];

for (const [char, , strokes] of allTemplates) {
  const predicted = engine.recognizeKana(strokes)[0];
  if (predicted !== char) failures.push(`reference ${char} → ${predicted || '(none)'}`);
}

// Traced from phone screenshots, in 256-unit canvas coordinates.
const TRACED = [
  {char: 'の', minRank: 1, strokes: [[[124,86],[117,111],[101,139],[91,164],[81,169],[68,151],[62,129],[64,106],[78,92],[101,86],[147,86],[172,93],[181,121],[177,146],[164,164],[148,169]]]},
  {char: 'わ', minRank: 1, strokes: [
    [[71,26],[72,66],[73,106],[71,137],[70,172]],
    [[30,66],[56,56],[81,45],[112,40],[117,53],[101,69],[78,89],[56,106],[43,117],[66,101],[91,86],[122,76],[142,84],[149,99],[142,117],[124,134]]]},
  {char: 'ぬ', minRank: 1, strokes: [
    [[99,30],[102,70],[106,106],[109,142]],
    [[132,40],[117,58],[96,73],[71,93],[58,114],[62,129],[78,119],[99,88],[119,69],[152,67],[167,83],[168,106],[152,124],[132,129],[125,116],[134,108],[157,110],[180,120],[201,128]]]}
];
for (const {char, minRank, strokes} of TRACED) {
  for (const gap of [4, 8, 12, 16]) {
    const ranking = engine.recognizeKana(strokes.map(stroke => sampleEvery(stroke, () => gap)));
    const rank = ranking.indexOf(char) + 1;
    if (!rank || rank > minRank) failures.push(`traced ${char} at gap ${gap}: rank ${rank || 'none'}, got ${ranking[0]}`);
  }
}

// Each template drawn with a slight tilt, stretch and wobble at a range of finger speeds.
function distort(strokes, gap) {
  const [turn, shear, scaleX, scaleY] = [random(-.12, .12), random(-.12, .12), random(.8, 1.15), random(.8, 1.15)];
  const [wobbleX, wobbleY, wave, phase] = [random(0, 9), random(0, 9), random(.008, .02), random(0, 6)];
  const moved = strokes.map(stroke => stroke.map(([x, y]) => {
    const [cx, cy] = [x - 128, y - 128];
    return [scaleX * (cx * Math.cos(turn) - cy * Math.sin(turn) + shear * cy) + wobbleX * Math.sin(wave * cy + phase),
      scaleY * (cx * Math.sin(turn) + cy * Math.cos(turn)) + wobbleY * Math.sin(wave * cx + phase)];
  }));
  const all = moved.flat();
  const [minX, minY] = [Math.min(...all.map(p => p[0])), Math.min(...all.map(p => p[1]))];
  const size = Math.max(Math.max(...all.map(p => p[0])) - minX, Math.max(...all.map(p => p[1])) - minY);
  const scale = random(120, 220) / size;
  return moved.map(stroke => sampleEvery(
    stroke.map(([x, y]) => [(x - minX) * scale + 18, (y - minY) * scale + 18]),
    () => gap * random(.6, 1.3)));
}

// Drawings from one source are graded using only the other sources' templates, so a
// character cannot pass by matching itself.
const MIN_ACCURACY = 95;
for (const gap of [3, 9, 14]) {
  let correct = 0;
  let total = 0;
  for (const source of SOURCES) {
    engine.refPatterns = allTemplates.filter(template => template[3] !== source);
    for (const [char, , strokes] of allTemplates.filter(template => template[3] === source)) {
      for (let i = 0; i < 2; i++, total++) {
        if (engine.recognizeKana(distort(strokes, gap))[0] === char) correct++;
      }
    }
  }
  const accuracy = 100 * correct / total;
  console.log(`Cross-source drawings, point gap ${gap}: ${accuracy.toFixed(1)}%`);
  if (accuracy < MIN_ACCURACY) failures.push(`cross-source accuracy at gap ${gap}: ${accuracy.toFixed(1)}%`);
}

if (failures.length) throw new Error(`Recognition check failed:\n${failures.join('\n')}`);
console.log('Recognition check passed.');
