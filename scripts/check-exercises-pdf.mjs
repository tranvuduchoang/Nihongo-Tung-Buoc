import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {QUESTIONS, TYPES} from '../src/exercises-data.js';
import {createWorksheet, buildWorksheetPdf} from '../src/exercises-pdf.js';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = {
  pdfLib:require('../vendor/pdf/pdf-lib-1.17.1.min.js'),
  fontkit:require('../vendor/pdf/fontkit-1.1.1.umd.min.js'),
  latinFont:fs.readFileSync(path.join(root, 'assets/fonts/NihongoLatin-Regular.ttf')),
  japaneseFont:fs.readFileSync(path.join(root, 'assets/fonts/NihongoJapanese-Regular.ttf'))
};
const fonts = [assets.fontkit.create(assets.latinFont), assets.fontkit.create(assets.japaneseFont)];
for (const question of QUESTIONS) {
  for (const char of question.prompt.normalize('NFC')) assert(fonts.some(font => font.hasGlyphForCodePoint(char.codePointAt(0))), `Missing PDF glyph ${char} in ${question.id}`);
}

// Optional output is useful for rendering the same generator used in the browser.
const outputArg = process.argv.indexOf('--output');
const output = outputArg >= 0 ? path.resolve(process.argv[outputArg + 1]) : null;
if (output) fs.mkdirSync(output, {recursive:true});
const allTypes = TYPES.map(type => type.id);
const samples = [
  ...allTypes.map(id => ({name:id, ids:[id], count:10})),
  {name:'two-sections', ids:['kana-romaji','romaji-kana'], count:20},
  {name:'four-sections', ids:allTypes, count:20},
  {name:'full-bank-per-section', ids:allTypes, count:100}
];
for (const sample of samples) {
  const sections = createWorksheet(sample.ids, sample.count, () => .5);
  const bytes = await buildWorksheetPdf(sections, assets, {code:'QA-600'});
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), '%PDF');
  const pdf = await assets.pdfLib.PDFDocument.load(bytes);
  assert(pdf.getPageCount() >= sample.ids.length);
  assert(!pdf.getForm().getFields().length, 'Worksheets should be printable, without interactive form fields.');
  assert.equal(pdf.getAuthor(), 'Nihongo Từng Bước');
  for (const page of pdf.getPages()) {
    assert(Math.abs(page.getWidth() - 595.28) < .01 && Math.abs(page.getHeight() - 841.89) < .01, 'Expected A4 pages.');
  }
  if (output) {
    fs.writeFileSync(path.join(output, `${sample.name}.pdf`), bytes);
    fs.writeFileSync(path.join(output, `${sample.name}.json`), JSON.stringify(sections));
  }
  console.log(`PDF passed: ${sample.name}, ${sections.reduce((sum, section) => sum + section.questions.length, 0)} questions, ${pdf.getPageCount()} pages, ${bytes.length} bytes.`);
}
