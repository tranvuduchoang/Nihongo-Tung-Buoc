import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = {window: {}, document: {addEventListener() {}}, atob: text => Buffer.from(text, 'base64').toString('binary')};
context.window = context;
vm.createContext(context);
for (const file of ['vendor/kanji-canvas.min.js', 'hiragana-patterns.js', 'hiragana-patterns-tomoe.js',
  'hiragana-patterns-kanjivg.js', 'hiragana-model.js', 'src/kana-model.js', 'src/recognizer.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const {KanaRecognizer, KanaModel, KanjiCanvas} = context;
const CHARS = [...context.KANA_MODEL_DATA.classes];
if (CHARS.length !== 72) throw new Error(`Expected 72 classes, found ${CHARS.length}`);

// Each drawing is graded against all 46 targets, so reuse its single model run.
const runModel = KanaModel.predict;
const predictions = new Map();
KanaModel.predict = strokes => {
  if (!predictions.has(strokes)) predictions.set(strokes, runModel(strokes));
  return predictions.get(strokes);
};

const failures = [];

// Traced from phone and desktop screenshots of a learner's drawings, in 256-unit canvas coordinates.
const TRACED = {
  の: [[[124,86],[117,111],[101,139],[91,164],[81,169],[68,151],[62,129],[64,106],[78,92],[101,86],[147,86],[172,93],[181,121],[177,146],[164,164],[148,169]]],
  わ: [[[71,26],[72,66],[73,106],[71,137],[70,172]], [[30,66],[56,56],[81,45],[112,40],[117,53],[101,69],[78,89],[56,106],[43,117],[66,101],[91,86],[122,76],[142,84],[149,99],[142,117],[124,134]]],
  ぬ: [[[99,30],[102,70],[106,106],[109,142]], [[132,40],[117,58],[96,73],[71,93],[58,114],[62,129],[78,119],[99,88],[119,69],[152,67],[167,83],[168,106],[152,124],[132,129],[125,116],[134,108],[157,110],[180,120],[201,128]]],
  ら: [[[79,18],[82,32],[86,47]], [[45,66],[44,114],[46,162],[65,122],[81,91],[105,75],[141,66],[153,82],[157,106],[149,130],[126,150]]],
  か: [[[50,50],[88,51],[128,53],[166,49],[166,83],[165,113]], [[91,13],[88,59],[82,99],[79,121]], [[170,13],[180,19],[190,22]]],
  ね: [[[87,38],[85,90],[83,172]], [[59,73],[85,61],[110,50],[93,86],[77,122],[59,154],[89,126],[117,117],[138,122],[142,137],[126,153],[125,140],[149,134],[177,148],[201,158]]],
  め: [[[92,49],[102,97],[112,137]], [[118,62],[98,89],[78,117],[82,122],[102,109],[122,77],[146,67],[162,77],[173,101],[173,125],[158,134],[154,133]]],
  そ: [[[81,56],[106,55],[133,56],[110,74],[90,92],[122,87],[150,85],[126,100],[109,114],[114,132],[142,137],[177,130]]],
  む: [[[85,44],[126,43],[169,42]], [[120,1],[134,47],[137,87],[122,119],[98,108],[81,127],[90,150],[118,139],[138,119],[154,159],[170,178],[182,162]], [[186,6],[190,14],[194,22]]]
};

// The learner's own style before any personal samples; these drawings were picked because they were hard.
const MIN_TRACED_ACCEPTED = 6;
const rejected = Object.keys(TRACED).filter(char => !KanaRecognizer.recognize(TRACED[char], char).correct);
if (Object.keys(TRACED).length - rejected.length < MIN_TRACED_ACCEPTED) failures.push(`traced drawings rejected: ${rejected.join(' ')}`);
console.log(`Traced drawings accepted without personal samples: ${9 - rejected.length}/9`);

// One saved drawing per character must be enough for the same handwriting to pass.
const personal = Object.fromEntries(Object.entries(TRACED).map(([char, strokes]) => [char, [{features: KanaModel.predict(strokes).features}]]));
for (const [char, strokes] of Object.entries(TRACED)) {
  if (!KanaRecognizer.recognize(strokes, char, personal).correct) failures.push(`personal sample did not help ${char}`);
}

// A wrong character must not pass, with or without personal samples for similar characters.
const templates = KanjiCanvas.refPatterns.filter((_, i) => i % 3 === 0);
for (const [label, samples, limit] of [['no personal samples', {}, 1.5], ['personal samples', personal, 3]]) {
  let correct = 0;
  let falseAccepts = 0;
  let wrongTargets = 0;
  for (const [char, , strokes] of templates) {
    if (KanaRecognizer.recognize(strokes, char, samples).correct) correct++;
    for (const target of CHARS) {
      if (target === char) continue;
      wrongTargets++;
      if (KanaRecognizer.recognize(strokes, target, samples).correct) falseAccepts++;
    }
  }
  const accuracy = 100 * correct / templates.length;
  const falseRate = 100 * falseAccepts / wrongTargets;
  console.log(`Stroke data, ${label}: accepted ${accuracy.toFixed(1)}%, wrong target accepted ${falseRate.toFixed(2)}%`);
  if (accuracy < 97) failures.push(`accuracy with ${label}: ${accuracy.toFixed(1)}%`);
  if (falseRate > limit) failures.push(`false accepts with ${label}: ${falseRate.toFixed(2)}%`);
}

// Marks must count: forgetting them, or adding them to a plain character, is a wrong answer.
const VOICED = {が: 'か', ざ: 'さ', じ: 'し', だ: 'た', ぢ: 'ち', づ: 'つ', ば: 'は', び: 'ひ', ぶ: 'ふ', べ: 'へ', ぼ: 'ほ'};
const SEMI_VOICED = {ぱ: 'は', ぴ: 'ひ', ぷ: 'ふ', ぺ: 'へ', ぽ: 'ほ'};
function withMarks(strokes, circle) {
  const points = strokes.flat();
  const right = Math.max(...points.map(p => p[0]));
  const top = Math.min(...points.map(p => p[1]));
  if (circle) return [...strokes, Array.from({length: 12}, (_, i) => [right + 22 * Math.cos(i * .57), top + 22 * Math.sin(i * .57)])];
  return [...strokes, [[right, top], [right + 18, top + 34]], [[right + 32, top], [right + 50, top + 34]]];
}
for (const [marks, circle] of [[VOICED, false], [SEMI_VOICED, true]]) {
  for (const [marked, base] of Object.entries(marks)) {
    const plain = KanjiCanvas.refPatterns.find(template => template[0] === base)[2];
    const drawn = withMarks(plain, circle);
    if (!KanaRecognizer.recognize(drawn, marked).correct) failures.push(`${marked} with marks was rejected`);
    if (KanaRecognizer.recognize(plain, marked).correct) failures.push(`${base} without marks passed as ${marked}`);
    if (KanaRecognizer.recognize(drawn, base).correct) failures.push(`${marked} passed as ${base}`);
  }
}
const shi = KanjiCanvas.refPatterns.find(template => template[0] === 'し')[2];
if (!KanaRecognizer.recognize(shi, ['か', 'し']).correct) failures.push('alternative targets are not honored');

if (failures.length) throw new Error(`Recognition check failed:\n${failures.join('\n')}`);
console.log('Recognition check passed.');
