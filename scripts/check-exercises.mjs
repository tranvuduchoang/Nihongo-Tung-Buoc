import assert from 'node:assert/strict';
import {QUESTIONS, TYPES, checkAnswer, makeQueue} from '../src/exercises-data.js';
import {createWorksheet} from '../src/exercises-pdf.js';

assert.equal(QUESTIONS.length, 980, 'Exercise bank should contain 980 questions.');
assert.equal(new Set(QUESTIONS.map(question => question.id)).size, QUESTIONS.length);
for (const question of QUESTIONS) {
  assert(TYPES.some(type => type.id === question.type), question.id);
  assert(question.prompt && question.reading && question.meaning, question.id);
  assert(question.answers.length && question.answers.every(answer => typeof answer === 'string' && answer.trim()), question.id);
  assert(checkAnswer(question, question.answers[0]), question.id);
  assert(!checkAnswer(question, '   '), question.id);
}

const question = (type, prompt) => {
  const found = QUESTIONS.find(item => item.type === type && item.prompt === prompt);
  assert(found, `Missing ${type}: ${prompt}`);
  return found;
};

// Typing variants must be helpful without confusing different Japanese words.
assert(checkAnswer(question('kana-romaji', 'かばん'), '  KABAN  '));
assert(checkAnswer(question('kana-romaji', 'がっこう'), 'gakkō'));
assert(checkAnswer(question('kana-romaji', 'しんぶん'), 'shimbun'));
assert(!checkAnswer(question('kana-romaji', 'がっこう'), 'gakou'));
assert(!checkAnswer(question('kana-romaji', 'がっこう'), 'gakko'));
assert(!checkAnswer(question('kana-romaji', 'にほん'), 'nippon'));
assert(checkAnswer(question('romaji-kana', 'byouin'), 'びょういん'));
assert(!checkAnswer(question('romaji-kana', 'byouin'), 'びよういん'));
assert(!checkAnswer(question('romaji-kana', 'biyouin'), 'びょういん'));
assert(!checkAnswer(question('romaji-kana', 'kitte'), 'きて'));
assert(!checkAnswer(question('romaji-kana', 'sakura'), 'sakura'));

assert(checkAnswer(question('vi-ja', 'Xin chào (ban ngày)'), 'こんにちは！'));
assert(!checkAnswer(question('vi-ja', 'Xin chào (ban ngày)'), 'こんにちわ'));
assert(checkAnswer(question('vi-ja', 'Tôi xin phép về trước (ở công ty)'), 'お先に失礼します。'));
assert(!checkAnswer(question('vi-ja', 'Anh/chị vất vả rồi (chào đồng nghiệp)'), 'おさきにしつれいします'));
assert(checkAnswer(question('ja-vi', 'こんばんは'), 'CHÀO BUỔI TỐI!'));
assert(checkAnswer(question('ja-vi', 'こんばんは'), 'chao buoi toi'));
assert(!checkAnswer(question('ja-vi', 'こんばんは'), 'chào buổi sáng'));
assert(!checkAnswer(question('ja-vi', 'こんばんは'), '!!!'));
assert(!checkAnswer(question('ja-vi', 'こんばんは'), 'không phải chào buổi tối'));

assert(checkAnswer(question('kana-romaji', 'ぎゅうにゅう'), 'gyūnyū'));
assert(!checkAnswer(question('kana-romaji', 'ぎゅうにゅう'), 'gyunyu'));
assert(!checkAnswer(question('romaji-kana', 'ginkou'), 'ぎんこ'));
assert(checkAnswer(question('vi-ja', 'Tôi đang học tiếng Nhật'), '日本語を勉強しています。'));
assert(checkAnswer(question('ja-vi', 'みぎにまがってください'), 'Hãy rẽ phải'));
assert(!checkAnswer(question('ja-vi', 'みぎにまがってください'), 'Hãy rẽ trái'));

// Stable IDs are required for old localStorage sessions after a bank expansion.
assert.equal(QUESTIONS.find(item => item.id === 'word-51-write').prompt, 'shukudai');
assert.equal(QUESTIONS.find(item => item.id === 'phrase-23-read').prompt, 'だいじょうぶです');
const expectedCounts = {
  'kana-romaji':200, 'romaji-kana':200, 'katakana-romaji':162, 'romaji-katakana':158,
  'katakana-vi':30, 'vi-katakana':30, 'vi-ja':100, 'ja-vi':100
};
for (const type of TYPES) {
  const bank = QUESTIONS.filter(item => item.type === type.id);
  assert.equal(bank.length, expectedCounts[type.id]);
  assert.equal(new Set(bank.map(item => item.prompt)).size, bank.length, `Duplicate prompt in ${type.id}`);
}

const queue = makeQueue(['romaji-kana'], 20);
assert.equal(queue.length, 20);
assert.equal(new Set(queue).size, 20);
assert(queue.every(id => QUESTIONS.find(item => item.id === id).type === 'romaji-kana'));
assert.equal(makeQueue(['vi-ja'], 150).length, 100, 'A small pool must not repeat questions.');
assert.deepEqual(makeQueue([], 10), []);
assert.equal(makeQueue(TYPES.map(type => type.id), 30).length, 30);

// PDF count applies to EACH section, and never touches the existing quiz queue.
for (const selected of [['kana-romaji'], ['romaji-kana','vi-ja'], TYPES.map(type => type.id)]) {
  const sections = createWorksheet(selected, 20);
  assert.equal(sections.length, selected.length);
  assert.equal(sections.reduce((sum, section) => sum + section.questions.length, 0), selected.length * 20);
  for (const section of sections) {
    assert.equal(section.questions.length, 20);
    assert(section.questions.every(item => item.type === section.id));
    assert.equal(new Set(section.questions.map(item => item.id)).size, 20);
  }
}
assert.equal(createWorksheet(['kana-romaji','kana-romaji'], 10).length, 1);
assert.equal(createWorksheet(['ja-vi'], 100)[0].questions.length, 100);
assert.throws(() => createWorksheet([], 10));
assert.throws(() => createWorksheet(['unknown'], 10));
assert.throws(() => createWorksheet(['vi-ja'], 0));
assert.throws(() => createWorksheet(['vi-ja'], 1.5));
assert.throws(() => createWorksheet(['vi-ja'], 101));
console.log(`Exercises passed: ${QUESTIONS.length} questions, grading variants, Japanese spelling, and question selection.`);
