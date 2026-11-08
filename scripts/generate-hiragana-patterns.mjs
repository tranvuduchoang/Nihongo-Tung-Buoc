// Rebuilds the stroke data used to train the model. Each source keeps its own output file and license:
// node scripts/generate-hiragana-patterns.mjs <kanjicanvas/hiragana> <tomoe/data/handwriting-ja.xml> <kanjivg/kanji>
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [kanjiCanvasDir, tomoeFile, kanjiVgDir] = process.argv.slice(2);
if (!kanjiVgDir) {
  console.error('Usage: node scripts/generate-hiragana-patterns.mjs <kanjicanvas/hiragana> <handwriting-ja.xml> <kanjivg/kanji>');
  process.exit(1);
}

const chars = [...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'];
// Strokes commonly written without lifting the pen: character → index joined to the next stroke.
const CONNECTED_STROKES = {き: 2, さ: 1, り: 0, た: 2, な: 2, け: 1, に: 1, こ: 0, ふ: 1, い: 0};
// A learner's handwritten ぬ with a long, nearly straight first stroke (256-unit canvas coordinates).
const PROJECT_SAMPLES = [['ぬ', [
  [[99, 30], [102, 70], [106, 106], [109, 142]],
  [[132, 40], [117, 58], [96, 73], [71, 93], [58, 114], [62, 129], [78, 119], [99, 88], [119, 69], [152, 67],
    [167, 83], [168, 106], [152, 124], [132, 129], [125, 116], [134, 108], [157, 110], [180, 120], [201, 128]]
]]];

const context = {window: {}, document: {addEventListener() {}}};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'vendor/kanji-canvas.min.js'), 'utf8'), context);

function densify(stroke) {
  const dense = [stroke[0]];
  for (let i = 1; i < stroke.length; i++) {
    const [a, b] = [stroke[i - 1], stroke[i]];
    const parts = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
    for (let part = 1; part <= parts; part++) {
      dense.push([a[0] + (b[0] - a[0]) * part / parts, a[1] + (b[1] - a[1]) * part / parts]);
    }
  }
  return dense;
}

function strokeFeatures(strokes) {
  context.KanjiCanvas.recordedPattern_generation = strokes.map(densify);
  return context.KanjiCanvas.extractFeatures(context.KanjiCanvas.momentNormalize('generation'), 20);
}

const pointsOf = body => [...body.matchAll(/<point x="(\d+)" y="(\d+)"\s*\/>/g)].map(([, x, y]) => [Number(x), Number(y)]);
const strokesOf = xml => [...xml.matchAll(/<stroke>([\s\S]*?)<\/stroke>/g)].map(([, body]) => pointsOf(body));

function readKanjiCanvas() {
  return chars.map(char => {
    const file = path.join(kanjiCanvasDir, `${char.codePointAt(0).toString(16).toUpperCase()}.xml`);
    return [char, strokesOf(fs.readFileSync(file, 'utf8'))];
  });
}

function readTomoe() {
  const samples = [];
  for (const [, body] of fs.readFileSync(tomoeFile, 'utf8').matchAll(/<character>([\s\S]*?)<\/character>/g)) {
    const code = body.match(/<utf8>&#x([0-9a-f]+);<\/utf8>/i);
    const char = code && String.fromCodePoint(parseInt(code[1], 16));
    if (chars.includes(char)) samples.push([char, strokesOf(body)]);
  }
  return samples;
}

function curvePoints(pathData) {
  const tokens = pathData.match(/[a-zA-Z]|-?\d*\.?\d+/g);
  const points = [];
  let i = 0, command = '', x = 0, y = 0, controlX = 0, controlY = 0;
  const number = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++];
    const [baseX, baseY] = command === command.toLowerCase() ? [x, y] : [0, 0];
    const type = command.toUpperCase();
    if (type === 'M') {
      x = number() + baseX;
      y = number() + baseY;
      points.push([x, y]);
    } else if (type === 'C' || type === 'S') {
      const [x1, y1] = type === 'C' ? [number() + baseX, number() + baseY] : [2 * x - controlX, 2 * y - controlY];
      const [x2, y2, endX, endY] = [number() + baseX, number() + baseY, number() + baseX, number() + baseY];
      for (let step = 1; step <= 12; step++) {
        const t = step / 12, u = 1 - t;
        points.push([
          u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * endX,
          u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * endY
        ]);
      }
      [controlX, controlY, x, y] = [x2, y2, endX, endY];
    } else {
      throw new Error(`Unsupported SVG path command ${command}`);
    }
  }
  return points;
}

function readKanjiVg() {
  return chars.map(char => {
    const svg = fs.readFileSync(path.join(kanjiVgDir, `0${char.codePointAt(0).toString(16)}.svg`), 'utf8');
    return [char, [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(match => curvePoints(match[1]))];
  });
}

const rounded = features => features.map(stroke => stroke.map(point => point.map(value => Math.round(value * 10) / 10)));

function templates(samples, source) {
  const result = [];
  for (const [char, strokes] of samples) {
    if (!strokes.length || strokes.some(stroke => stroke.length < 2)) throw new Error(`Missing stroke data for ${char} in ${source}`);
    const variants = [strokes];
    const joined = CONNECTED_STROKES[char];
    if (joined !== undefined && strokes.length > joined + 1) {
      variants.push([...strokes.slice(0, joined), [...strokes[joined], ...strokes[joined + 1]], ...strokes.slice(joined + 2)]);
    }
    for (const variant of variants) {
      result.push([char, variant.length, rounded(strokeFeatures(variant)), source]);
    }
  }
  return result;
}

function write(file, notice, statement, patterns) {
  fs.writeFileSync(path.join(root, file), `// ${notice} See THIRD_PARTY_NOTICES.md.\n${statement(JSON.stringify(patterns))}\n`);
  console.log(`${file}: ${patterns.length} templates`);
}

write('hiragana-patterns.js', 'Generated from KanjiCanvas hiragana XML (MIT) and this project\'s own sample.',
  json => `KanjiCanvas.refPatterns = ${json};`,
  [...templates(readKanjiCanvas(), 'kanjicanvas'), ...templates(PROJECT_SAMPLES, 'project')]);
write('hiragana-patterns-tomoe.js', 'Generated from Tomoe handwriting-ja.xml (LGPL-2.1).',
  json => `KanjiCanvas.refPatterns.push(...${json});`, templates(readTomoe(), 'tomoe'));
write('hiragana-patterns-kanjivg.js', 'Derived from KanjiVG, (C) Ulrich Apel, CC BY-SA 3.0.',
  json => `KanjiCanvas.refPatterns.push(...${json});`, templates(readKanjiVg(), 'kanjivg'));
