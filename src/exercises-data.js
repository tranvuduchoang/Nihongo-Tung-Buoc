import {EXTRA_VOCABULARY, EXTRA_EXPRESSIONS} from './exercises-extra.js';
import {KATAKANA_GROUPS, KATAKANA_WORDS} from './katakana-data.js';

// Append entries to preserve IDs used in saved sessions and results.
const vocabulary = [
  ['かさ','kasa','cái ô'], ['せんせい','sensei','giáo viên'],
  ['てんき','tenki','thời tiết'], ['せんもん','senmon','chuyên môn'],
  ['すし','sushi','sushi'], ['はし','hashi','đũa / cầu (tùy ngữ cảnh)'],
  ['けんか','kenka','cãi nhau'], ['さいきん','saikin','gần đây'],
  ['さくら','sakura','hoa anh đào'], ['げんき','genki','khỏe mạnh'],
  ['けっこん','kekkon','kết hôn'], ['かばん','kaban','cặp, túi xách'],
  ['まいにち','mainichi','mỗi ngày'], ['ねこ','neko','con mèo'],
  ['いぬ','inu','con chó'], ['みず','mizu','nước'],
  ['やま','yama','núi'], ['かわ','kawa','sông'],
  ['そら','sora','bầu trời'], ['うみ','umi','biển'],
  ['はな','hana','hoa / mũi (tùy ngữ cảnh)'], ['ほん','hon','sách'],
  ['ともだち','tomodachi','bạn bè'], ['がっこう','gakkou','trường học',['gakkō']],
  ['がくせい','gakusei','học sinh, sinh viên'], ['にほん','nihon','Nhật Bản'],
  ['にほんご','nihongo','tiếng Nhật'], ['でんしゃ','densha','tàu điện'],
  ['じてんしゃ','jitensha','xe đạp'], ['びょういん','byouin','bệnh viện',['byōin']],
  ['びよういん','biyouin','tiệm làm tóc',['biyōin']], ['きって','kitte','tem thư'],
  ['ざっし','zasshi','tạp chí'], ['りょこう','ryokou','du lịch',['ryokō']],
  ['しゃしん','shashin','ảnh'], ['しんぶん','shinbun','báo',['shimbun']],
  ['きょう','kyou','hôm nay',['kyō']], ['あした','ashita','ngày mai'],
  ['きのう','kinou','hôm qua',['kinō']], ['あさ','asa','buổi sáng'],
  ['ひる','hiru','buổi trưa'], ['よる','yoru','buổi tối, đêm'],
  ['たべもの','tabemono','đồ ăn'], ['のみもの','nomimono','đồ uống'],
  ['おちゃ','ocha','trà'], ['ごはん','gohan','cơm, bữa ăn'],
  ['たまご','tamago','trứng'], ['さかな','sakana','cá'],
  ['おかね','okane','tiền'], ['じかん','jikan','thời gian'],
  ['べんきょう','benkyou','việc học',['benkyō']], ['しゅくだい','shukudai','bài tập về nhà'],
  ...EXTRA_VOCABULARY
];

// Prompt meanings include context to distinguish greetings with similar translations.
const expressions = [
  ['おはようございます','Chào buổi sáng (lịch sự)',['chào buổi sáng','xin chào buổi sáng'],'ohayou gozaimasu',[], 'Có thể nói おはよう với người thân quen.'],
  ['こんにちは','Xin chào (ban ngày)',['xin chào','chào ban ngày','chào buổi trưa','chào buổi chiều'],'konnichiwa',[], 'は ở cuối lời chào được đọc là wa.'],
  ['こんばんは','Chào buổi tối',['chào buổi tối','xin chào buổi tối'],'konbanwa',[], 'は ở cuối lời chào được đọc là wa.'],
  ['おやすみなさい','Chúc ngủ ngon',['chúc ngủ ngon','ngủ ngon'],'oyasuminasai',['おやすみ']],
  ['ありがとうございます','Cảm ơn',['cảm ơn','xin cảm ơn','cảm ơn bạn'],'arigatou gozaimasu',['ありがとう'],'ありがとう là cách nói thân mật hơn.'],
  ['どういたしまして','Không có gì (đáp lại lời cảm ơn)',['không có gì','không có chi'],'dou itashimashite'],
  ['すみません','Xin lỗi / xin phép (khi gọi người khác)',['xin lỗi','xin phép','làm phiền bạn'],'sumimasen'],
  ['ごめんなさい','Xin lỗi (khi mắc lỗi)',['xin lỗi','tôi xin lỗi'],'gomennasai',['ごめん']],
  ['さようなら','Tạm biệt',['tạm biệt','chào tạm biệt'],'sayounara',['さよなら']],
  ['じゃ、また','Hẹn gặp lại (thân mật)',['hẹn gặp lại','gặp lại sau'],'ja mata',['じゃまた','ではまた','またね']],
  ['またあした','Hẹn gặp lại ngày mai',['hẹn gặp lại ngày mai','mai gặp lại','hẹn mai gặp'],'mata ashita'],
  ['はじめまして','Rất vui được gặp bạn (lần đầu gặp)',['rất vui được gặp bạn','rất vui được làm quen','lần đầu gặp mặt'],'hajimemashite'],
  ['どうぞよろしくおねがいします','Rất mong được giúp đỡ (khi giới thiệu bản thân)',['rất mong được giúp đỡ','mong được giúp đỡ','mong bạn giúp đỡ'],'douzo yoroshiku onegaishimasu',['よろしくおねがいします','どうぞよろしくお願いします','よろしくお願いします']],
  ['おさきにしつれいします','Tôi xin phép về trước (ở công ty)',['tôi xin phép về trước','xin phép về trước','tôi xin về trước'],'osaki ni shitsurei shimasu',['お先に失礼します']],
  ['おつかれさまです','Anh/chị vất vả rồi (chào đồng nghiệp)',['anh chị vất vả rồi','vất vả rồi','bạn vất vả rồi','cảm ơn vì đã làm việc vất vả'],'otsukaresama desu',['おつかれさまでした','お疲れ様です','お疲れ様でした'],'おつかれさまでした thường dùng khi công việc đã kết thúc.'],
  ['おかげさまで','Nhờ ơn bạn / nhờ mọi người (khi được hỏi thăm)',['nhờ ơn bạn','nhờ mọi người','nhờ bạn','nhờ ơn mọi người'],'okagesama de',[], 'Thường dùng trong câu おかげさまで、げんきです (Nhờ ơn bạn, tôi vẫn khỏe).'],
  ['いってきます','Tôi đi đây (nói khi rời nhà)',['tôi đi đây','mình đi đây','con đi đây'],'itte kimasu'],
  ['いってらっしゃい','Đi nhé (đáp lại người rời nhà)',['đi nhé','đi cẩn thận nhé','đi đường cẩn thận','đi rồi về nhé'],'itterasshai'],
  ['ただいま','Tôi về rồi (khi về nhà)',['tôi về rồi','con về rồi','mình về rồi'],'tadaima'],
  ['おかえりなさい','Mừng bạn về nhà',['mừng bạn về nhà','mừng bạn đã về','mừng về nhà'],'okaerinasai',['おかえり']],
  ['いただきます','Lời nói trước khi ăn',['mời ăn','mời mọi người ăn','tôi xin phép ăn','cảm ơn vì bữa ăn','lời nói trước khi ăn'],'itadakimasu',[], 'Lời cảm ơn trước bữa ăn; không có một bản dịch tiếng Việt duy nhất.'],
  ['ごちそうさまでした','Cảm ơn vì bữa ăn (nói sau khi ăn)',['cảm ơn vì bữa ăn','cảm ơn bữa ăn','cảm ơn đã cho tôi ăn ngon'],'gochisousama deshita',['ごちそうさま']],
  ['おねがいします','Làm ơn / nhờ bạn (khi yêu cầu)',['làm ơn','nhờ bạn','xin nhờ bạn','xin vui lòng'],'onegaishimasu',['お願いします']],
  ['だいじょうぶです','Tôi ổn / không sao đâu',['tôi ổn','không sao đâu','không sao','tôi không sao'],'daijoubu desu',['大丈夫です']],
  ...EXTRA_EXPRESSIONS
];

export const TYPES = [
  {id:'kana-romaji', title:'Hiragana → Romaji', sample:'さくら → sakura', description:'Đọc từ và viết lại phiên âm.', target:'Viết bằng Romaji'},
  {id:'romaji-kana', title:'Romaji → Hiragana', sample:'kaban → かばん', description:'Nhớ mặt chữ, âm ghép và âm ngắt.', target:'Viết bằng Hiragana'},
  {id:'katakana-romaji', title:'Katakana → Romaji', sample:'コーヒー → koohii', description:'Đọc âm đơn, âm ghép và từ mượn.', target:'Viết bằng Romaji'},
  {id:'romaji-katakana', title:'Romaji → Katakana', sample:'sakkaa → サッカー', description:'Nhớ mặt chữ, dấu kéo dài và âm ngắt.', target:'Viết bằng Katakana'},
  {id:'katakana-vi', title:'Katakana → Tiếng Việt', sample:'ホテル → khách sạn', description:'Đọc và hiểu từ mượn thường gặp.', target:'Viết nghĩa bằng tiếng Việt'},
  {id:'vi-katakana', title:'Tiếng Việt → Katakana', sample:'cà phê → コーヒー', description:'Nhớ cách viết Katakana của từ mượn.', target:'Viết bằng Katakana'},
  {id:'vi-ja', title:'Tiếng Việt → Tiếng Nhật', sample:'Cảm ơn → ありがとう', description:'Luyện câu chào và giao tiếp hằng ngày.', target:'Viết bằng tiếng Nhật (Hiragana hoặc Kanji)'},
  {id:'ja-vi', title:'Tiếng Nhật → Tiếng Việt', sample:'こんばんは → Chào buổi tối', description:'Hiểu nghĩa và ngữ cảnh sử dụng.', target:'Viết nghĩa bằng tiếng Việt'}
];

const katakanaCharacters = KATAKANA_GROUPS.flatMap(group => group.items.map(([kana, romaji, ...variants]) => ({
  kana, romaji, variants, group:group.name, groupId:group.id,
  id:`katakana-char-${[...kana].map(char => char.codePointAt(0).toString(16)).join('-')}`,
  meaning:`Katakana · ${group.name}`,
  note:group.id === 'voiced' ? 'Dấu dakuten/handakuten làm thay đổi âm của chữ gốc.' :
    [...kana].length > 1 ? 'Chữ thứ hai nhỏ hơn và ghép với chữ chính thành một âm.' : ''
})));

const katakanaReadQuestions = [
  ...katakanaCharacters.map(item => ({
    id:`${item.id}-read`, type:'katakana-romaji', prompt:item.kana,
    answers:[item.romaji, ...item.variants], reading:item.romaji, meaning:item.meaning, note:item.note
  })),
  ...KATAKANA_WORDS.map((word, index) => ({
    id:`katakana-word-${index}-read`, type:'katakana-romaji', prompt:word.kana,
    answers:[word.romaji, ...(word.romajiVariants || [])], reading:word.romaji,
    meaning:word.meaning, note:word.note || ''
  }))
];

const writingPrompts = new Map();
for (const item of katakanaCharacters) {
  const prompt = writingPrompts.get(item.romaji) || {kana:[], meanings:[], notes:[]};
  prompt.kana.push(item.kana);
  prompt.meanings.push(item.meaning);
  if (item.note) prompt.notes.push(item.note);
  writingPrompts.set(item.romaji, prompt);
}
for (const item of katakanaCharacters) {
  for (const alias of item.variants) {
    writingPrompts.get(alias)?.kana.push(item.kana);
  }
}
for (const word of KATAKANA_WORDS) {
  const prompt = writingPrompts.get(word.romaji) || {kana:[], meanings:[], notes:[]};
  prompt.kana.push(word.kana, ...(word.kanaVariants || []));
  prompt.meanings.push(word.meaning);
  if (word.note) prompt.notes.push(word.note);
  writingPrompts.set(word.romaji, prompt);
}
const katakanaWriteQuestions = [...writingPrompts].map(([romaji, prompt]) => {
  const answers = [...new Set(prompt.kana)];
  const meanings = [...new Set(prompt.meanings)];
  const notes = [...new Set(prompt.notes)];
  return {
    id:`katakana-write-${romaji}`, type:'romaji-katakana', prompt:romaji,
    answers, reading:romaji, meaning:meanings.join(' / '),
    note:answers.length > 1 ? 'Phiên âm này có nhiều cách viết Katakana được chấp nhận.' : notes.join(' ')
  };
});

const katakanaMeaningQuestions = KATAKANA_WORDS.flatMap((word, index) => [
  {id:`katakana-word-${index}-meaning`, type:'katakana-vi', prompt:word.kana,
    answers:[word.meaning, ...(word.meaningVariants || [])], reading:word.romaji, meaning:word.meaning, note:word.note || ''},
  {id:`katakana-word-${index}-write`, type:'vi-katakana', prompt:word.meaning,
    answers:[word.kana, ...(word.kanaVariants || [])], reading:word.romaji, meaning:word.meaning, note:word.note || ''}
]);

export const QUESTIONS = [
  ...vocabulary.flatMap(([kana, romaji, meaning, variants = []], i) => [
    {id:`word-${i}-read`, type:'kana-romaji', prompt:kana, answers:[romaji, ...variants], reading:romaji, meaning, note:kana === 'にほん' ? 'にっぽん (nippon) cũng là một cách đọc tên nước Nhật.' : ''},
    {id:`word-${i}-write`, type:'romaji-kana', prompt:romaji, answers:[kana], reading:romaji, meaning,
      note:kana === 'びょういん' ? 'びょういん: bệnh viện; phân biệt với びよういん: tiệm làm tóc.' : kana === 'びよういん' ? 'びよういん có chữ よ cỡ thường; びょういん dùng chữ ょ nhỏ.' : ''}
  ]),
  ...expressions.flatMap(([japanese, vietnamese, meanings, reading, variants = [], note = ''], i) => [
    {id:`phrase-${i}-write`, type:'vi-ja', prompt:vietnamese, answers:[japanese, ...variants], reading, meaning:vietnamese, note},
    {id:`phrase-${i}-read`, type:'ja-vi', prompt:japanese, answers:meanings, reading, meaning:vietnamese, note}
  ]),
  ...katakanaReadQuestions,
  ...katakanaWriteQuestions,
  ...katakanaMeaningQuestions
];

export function normalizeAnswer(value, type) {
  let answer = value.normalize('NFKC').toLowerCase().trim();
  if (['ja-vi','katakana-vi'].includes(type)) answer = answer.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
  // Preserve small kana, vowel length and doubled consonants: these change words.
  return answer.replace(/[\s\p{P}]/gu, '');
}

export function checkAnswer(question, value) {
  const normalized = normalizeAnswer(value, question.type);
  return Boolean(normalized) && question.answers.some(answer => normalizeAnswer(answer, question.type) === normalized);
}

export function makeQueue(types, count, random = Math.random) {
  const questions = QUESTIONS.filter(question => types.includes(question.type));
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return questions.slice(0, count).map(question => question.id);
}
