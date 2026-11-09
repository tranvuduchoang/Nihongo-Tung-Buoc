import assert from 'node:assert/strict';
import {QUESTIONS, TYPES, checkAnswer, makeQueue} from '../src/exercises-data.js';

assert.equal(QUESTIONS.length, 152, 'Exercise bank should contain 152 questions.');
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

const queue = makeQueue(['romaji-kana'], 20);
assert.equal(queue.length, 20);
assert.equal(new Set(queue).size, 20);
assert(queue.every(id => QUESTIONS.find(item => item.id === id).type === 'romaji-kana'));
assert.equal(makeQueue(['vi-ja'], 30).length, 24, 'A small pool must not repeat questions.');
assert.deepEqual(makeQueue([], 10), []);
assert.equal(makeQueue(TYPES.map(type => type.id), 30).length, 30);
console.log(`Exercises passed: ${QUESTIONS.length} questions, grading variants, Japanese spelling, and question selection.`);
