import {KATAKANA_GROUPS} from './katakana-data.js';

const HIRAGANA_GROUPS = [
  {id: 'basic', name: 'Âm đơn', sample: 'あ', hint: 'Bảng chữ cái gốc', items: [
    ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o'],
    ['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko'],
    ['さ','sa'],['し','shi','si'],['す','su'],['せ','se'],['そ','so'],
    ['た','ta'],['ち','chi','ti'],['つ','tsu','tu'],['て','te'],['と','to'],
    ['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no'],
    ['は','ha'],['ひ','hi'],['ふ','fu','hu'],['へ','he'],['ほ','ho'],
    ['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo'],
    ['や','ya'],['ゆ','yu'],['よ','yo'],
    ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],
    ['わ','wa'],['を','wo'],['ん','n']
  ]},
  {id: 'voiced', name: 'Âm đơn có dấu biến âm', sample: 'が', hint: 'が ざ だ ば ぱ', items: [
    ['が','ga'],['ぎ','gi'],['ぐ','gu'],['げ','ge'],['ご','go'],
    ['ざ','za'],['じ','ji','zi'],['ず','zu'],['ぜ','ze'],['ぞ','zo'],
    ['だ','da'],['ぢ','dji','ji','di'],['づ','dzu','zu','du'],['で','de'],['ど','do'],
    ['ば','ba'],['び','bi'],['ぶ','bu'],['べ','be'],['ぼ','bo'],
    ['ぱ','pa'],['ぴ','pi'],['ぷ','pu'],['ぺ','pe'],['ぽ','po'],
    ['ゔ','vu']
  ]},
  {id: 'combo', name: 'Âm ghép', sample: 'きゃ', hint: 'きゃ しゃ ちゃ', items: [
    ['きゃ','kya'],['きゅ','kyu'],['きょ','kyo'],
    ['しゃ','sha','sya'],['しゅ','shu','syu'],['しょ','sho','syo'],
    ['ちゃ','cha','tya','cya'],['ちゅ','chu','tyu','cyu'],['ちょ','cho','tyo','cyo'],
    ['にゃ','nya'],['にゅ','nyu'],['にょ','nyo'],
    ['ひゃ','hya'],['ひゅ','hyu'],['ひょ','hyo'],
    ['みゃ','mya'],['みゅ','myu'],['みょ','myo'],
    ['りゃ','rya'],['りゅ','ryu'],['りょ','ryo']
  ]},
  {id: 'voiced-combo', name: 'Âm ghép có dấu biến âm', sample: 'ぎゃ', hint: 'ぎゃ じゃ びゃ ぴゃ', items: [
    ['ぎゃ','gya'],['ぎゅ','gyu'],['ぎょ','gyo'],
    ['じゃ','ja','zya','jya'],['じゅ','ju','zyu','jyu'],['じょ','jo','zyo','jyo'],
    ['ぢゃ','ja','dya','dja'],['ぢゅ','ju','dyu','dju'],['ぢょ','jo','dyo','djo'],
    ['びゃ','bya'],['びゅ','byu'],['びょ','byo'],
    ['ぴゃ','pya'],['ぴゅ','pyu'],['ぴょ','pyo']
  ]}
];

const SCRIPT_GROUPS = {hiragana: HIRAGANA_GROUPS, katakana: KATAKANA_GROUPS};
const SCRIPT_NAMES = {hiragana: 'Hiragana', katakana: 'Katakana'};
let activeScript = 'hiragana';
let GROUPS = HIRAGANA_GROUPS;
let KANA = [];

function activateScript(script) {
  activeScript = Object.prototype.hasOwnProperty.call(SCRIPT_GROUPS, script) ? script : 'hiragana';
  GROUPS = SCRIPT_GROUPS[activeScript];
  KANA = GROUPS.flatMap(group => group.items);
  let nextIndex = 0;
  for (const group of GROUPS) group.indexes = group.items.map(() => nextIndex++);
}

activateScript(activeScript);
const SMALL_KANA = {'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ'};
const FULL_TO_SMALL = {'や': 'ゃ', 'ゆ': 'ゅ', 'よ': 'ょ'};

const STORAGE_KEY = 'kana-study-v1';
const ACTIVE_SCRIPT_KEY = 'kana-active-script-v1';
const SAMPLES_KEY = 'kana-handwriting-v1';
const MAX_SAMPLES_PER_CHAR = 20;
const FEEDBACK_DELAY_MS = 60_000;
const app = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const state = {
  screen: 'home', mode: 'type', queue: [], cursor: 0,
  results: {}, feedback: null, feedbackUntil: 0, snapshots: [], cellStrokes: [], strokeOrder: [], drawing: false,
  groups: ['basic'], drawingReview: false,
  pointerId: null, timer: null, samples: {}, samplesModel: null
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function announce(message) { announcer.textContent = message; }

function storageKey() {
  return activeScript === 'hiragana' ? STORAGE_KEY : `${STORAGE_KEY}:${activeScript}`;
}

function samplesStorageKey() {
  return activeScript === 'hiragana' ? SAMPLES_KEY : `${SAMPLES_KEY}:${activeScript}`;
}

function scriptName() { return SCRIPT_NAMES[activeScript]; }

function save() {
  try {
    localStorage.setItem(ACTIVE_SCRIPT_KEY, activeScript);
    localStorage.setItem(storageKey(), JSON.stringify({
      screen: state.screen, mode: state.mode, queue: state.queue, groups: state.groups,
      cursor: state.cursor, results: state.results, pendingAdvance: Boolean(state.feedback),
      feedback: state.feedback, feedbackUntil: state.feedbackUntil
    }));
  } catch { /* Private browsing can block storage; the current session still works. */ }
}

function restore({readActiveScript = true} = {}) {
  try {
    if (readActiveScript) {
      const savedScript = localStorage.getItem(ACTIVE_SCRIPT_KEY);
      activateScript(savedScript === 'katakana' ? 'katakana' : 'hiragana');
    }
    const data = JSON.parse(localStorage.getItem(storageKey()) || 'null');
    if (!data || !['home','quiz','results'].includes(data.screen) || !['type','draw'].includes(data.mode)) return;
    if (!Array.isArray(data.queue) || !data.queue.length || data.queue.length > KANA.length ||
        new Set(data.queue).size !== data.queue.length ||
        !data.queue.every(n => Number.isInteger(n) && n >= 0 && n < KANA.length)) return;
    if (!Number.isInteger(data.cursor) || data.cursor < 0 || data.cursor > data.queue.length) return;
    const clean = {};
    if (data.results && typeof data.results === 'object') {
      for (const [key, result] of Object.entries(data.results)) {
        const n = Number(key);
        if (!Number.isInteger(n) || n < 0 || n >= KANA.length ||
            !result || typeof result.correct !== 'boolean') continue;
        clean[n] = {correct: result.correct, answer: String(result.answer || '').slice(0, 20)};
      }
    }
    const groups = Array.isArray(data.groups) ? data.groups.filter(id => GROUPS.some(group => group.id === id)) : [];
    if (groups.length) state.groups = groups;
    let cursor = data.cursor;
    let feedback = null;
    let feedbackUntil = 0;
    if (data.screen === 'quiz' && data.pendingAdvance && cursor < data.queue.length) {
      const now = Date.now();
      const saved = data.feedback;
      const until = Number(data.feedbackUntil);
      if (saved && typeof saved.correct === 'boolean' && Number.isFinite(until) &&
          until > now && until <= now + FEEDBACK_DELAY_MS && clean[data.queue[cursor]]) {
        feedback = {correct: saved.correct, answer: String(saved.answer || '').slice(0, 20),
          recognized: String(saved.recognized || '').slice(0, 10)};
        feedbackUntil = until;
      } else {
        cursor++;
      }
    }
    Object.assign(state, {screen: data.screen === 'home' ? 'home' :
      cursor === data.queue.length ? 'results' : data.screen,
      mode: data.mode, queue: data.queue, cursor, results: clean, feedback, feedbackUntil});
  } catch { /* Ignore stale or malformed browser data. */ }
}

function selectScript(script) {
  if (!Object.prototype.hasOwnProperty.call(SCRIPT_GROUPS, script) || script === activeScript) return;
  clearTimer();
  activateScript(script);
  Object.assign(state, {
    screen: 'home', mode: 'type', queue: [], cursor: 0, results: {},
    feedback: null, feedbackUntil: 0, groups: ['basic'], samples: {}, samplesModel: null
  });
  resetDrawing();
  try { localStorage.setItem(ACTIVE_SCRIPT_KEY, activeScript); }
  catch { /* The active script still changes for this session. */ }
  restore({readActiveScript: false});
  loadSamples();
  refreshSampleFeatures();
  save();
  render();
  if (state.feedback) state.timer = setTimeout(next, Math.max(0, state.feedbackUntil - Date.now()));
  document.querySelector(`[data-script="${activeScript}"]`)?.focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function clearTimer() {
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;
}

function start(mode, retry = false) {
  clearTimer();
  const selected = GROUPS.filter(group => state.groups.includes(group.id)).flatMap(group => group.indexes);
  const targets = retry ? KANA.map((_, i) => i).filter(i => state.results[i]?.correct === false) : selected;
  if (!targets.length) return;
  state.mode = mode;
  state.queue = shuffle(targets);
  state.cursor = 0;
  state.results = retry ? {...state.results} : {};
  state.screen = 'quiz';
  state.feedback = null;
  state.feedbackUntil = 0;
  resetDrawing();
  save();
  render();
}

function current() { return KANA[state.queue[state.cursor]]; }

function resetDrawing() {
  state.snapshots = [];
  state.cellStrokes = [];
  state.strokeOrder = [];
  state.drawingReview = false;
}

function cellCount(item) { return [...item[0]].length; }

// Each drawing cell holds one character; small ゃゅょ are recognized as their full-size shapes.
function cellTargets(item) {
  const chars = [...item[0]];
  return chars.map((char, cell) => {
    if (activeScript === 'katakana') return [char];
    if (SMALL_KANA[char]) return [SMALL_KANA[char]];
    // じゃ and ぢゃ share the romaji "ja", so either spelling answers the prompt.
    if (chars.length > 1 && cell === 0 && (char === 'じ' || char === 'ぢ')) return ['じ', 'ぢ'];
    return [char];
  });
}

function home() {
  clearTimer();
  const finishedByFeedback = Boolean(state.feedback && state.cursor + 1 >= state.queue.length);
  if (state.feedback) {
    state.cursor++;
    resetDrawing();
  }
  state.feedback = null;
  state.feedbackUntil = 0;
  state.screen = finishedByFeedback ? 'results' : 'home';
  save();
  render();
}

function next() {
  if (!state.feedback) return;
  clearTimer();
  state.cursor++;
  state.feedback = null;
  state.feedbackUntil = 0;
  resetDrawing();
  state.screen = state.cursor >= state.queue.length ? 'results' : 'quiz';
  save();
  render();
}

function grade(correct, answer, recognized = '') {
  if (state.feedback) return;
  const index = state.queue[state.cursor];
  state.results[index] = {correct, answer};
  state.feedback = {correct, answer, recognized};
  state.feedbackUntil = Date.now() + FEEDBACK_DELAY_MS;
  if (state.mode === 'draw' && !state.snapshots.length) {
    state.snapshots = [...document.querySelectorAll('.draw-canvas')].map(canvas => canvas.toDataURL('image/png'));
  }
  save();
  render();
  document.querySelector('.feedback')?.scrollIntoView({block: 'nearest'});
  announce(correct ? 'Chính xác. Bạn có thể chọn chữ tiếp theo.' :
    `Chưa đúng. Đáp án là ${KANA[index][0]}, ${KANA[index][1]}. Bạn có thể chọn chữ tiếp theo.`);
  state.timer = setTimeout(next, Math.max(0, state.feedbackUntil - Date.now()));
}

function checkTyped(event) {
  event.preventDefault();
  if (state.feedback) return;
  const input = document.querySelector('#answer');
  const answer = input.value.normalize('NFKC').trim().toLowerCase();
  if (!answer) { input.focus(); announce('Hãy nhập phiên âm trước khi kiểm tra.'); return; }
  grade(current().slice(1).includes(answer), answer);
}

function showDrawMessage(message) {
  const element = document.querySelector('#draw-message');
  if (element) element.textContent = message;
  if (message) announce(message);
}

function recognizeDrawing() {
  const targets = cellTargets(current());
  const cells = targets.map((_, cell) => state.cellStrokes[cell] || []);
  if (cells.some(strokes => !strokes.length)) {
    showDrawMessage(targets.length > 1 ? 'Hãy vẽ đủ cả hai ô trước khi kiểm tra.' : 'Hãy vẽ chữ trước khi kiểm tra.');
    return;
  }
  const tooSmall = cells.some(strokes => {
    const all = strokes.flat();
    const xs = all.map(p => p[0]);
    const ys = all.map(p => p[1]);
    return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 38;
  });
  if (tooSmall) { showDrawMessage('Nét vẽ quá nhỏ. Hãy vẽ rõ hơn trên ô giấy.'); return; }
  let results;
  try {
    results = cells.map((strokes, cell) => window.KanaRecognizer.recognize(strokes, targets[cell], state.samples));
  } catch {
    showDrawMessage('Bộ nhận dạng đang gặp lỗi. Bạn có thể xóa nét rồi thử lại.');
    return;
  }
  results.forEach((result, cell) => {
    if (result.correct) addSample(result.recognized, cells[cell], result.features);
  });
  const shown = results.map((result, cell) => cell > 0 && FULL_TO_SMALL[result.recognized] || result.recognized).join('');
  grade(results.every(result => result.correct), shown, shown);
}

function reviewKatakanaDrawing() {
  const targets = cellTargets(current());
  const cells = targets.map((_, cell) => state.cellStrokes[cell] || []);
  if (cells.some(strokes => !strokes.length)) {
    showDrawMessage(targets.length > 1 ? 'Hãy vẽ đủ các ô trước khi tự chấm.' : 'Hãy vẽ chữ trước khi tự chấm.');
    return;
  }
  const tooSmall = cells.some(strokes => {
    const points = strokes.flat();
    const xs = points.map(point => point[0]);
    const ys = points.map(point => point[1]);
    return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 38;
  });
  if (tooSmall) { showDrawMessage('Nét vẽ quá nhỏ. Hãy vẽ rõ hơn trên ô giấy.'); return; }
  try {
    state.snapshots = [...document.querySelectorAll('.draw-canvas')].map(canvas => canvas.toDataURL('image/png'));
  } catch {
    showDrawMessage('Không thể xem trước nét vẽ. Hãy thử xóa nét rồi vẽ lại.');
    return;
  }
  state.drawingReview = true;
  render();
  document.querySelector('[data-action="mark-draw-correct"]')?.focus({preventScroll: true});
  announce('So sánh nét vẽ với chữ mẫu rồi tự đánh giá kết quả.');
}

function renderKatakanaSelfReview(item) {
  return `<div class="katakana-self-review"><span>CHỮ MẪU</span><strong>${item[0]}</strong><p>So sánh từng nét với chữ bạn vừa viết, rồi tự chấm kết quả.</p></div>
    <div class="draw-preview">${state.snapshots.map(snapshot => `<img alt="Nét vẽ của bạn" src="${snapshot}">`).join('')}</div>
    <div class="self-grade-actions"><button class="button button-dark" data-action="mark-draw-correct" type="button">Mình viết đúng</button><button class="button button-outline" data-action="mark-draw-wrong" type="button">Cần luyện lại</button><button class="self-grade-redraw" data-action="redraw-katakana" type="button">Vẽ lại</button></div>`;
}

function loadSamples() {
  try {
    const saved = JSON.parse(localStorage.getItem(samplesStorageKey()) || 'null');
    if (!saved || typeof saved.samples !== 'object') return;
    for (const [char, list] of Object.entries(saved.samples)) {
      if (!KANA.some(([kana]) => kana === char) || !Array.isArray(list)) continue;
      const valid = list.filter(sample => Array.isArray(sample?.strokes) && sample.strokes.length && Array.isArray(sample.features));
      if (valid.length) state.samples[char] = valid;
    }
    state.samplesModel = saved.modelVersion;
  } catch { /* Ignore stale or malformed browser data. */ }
}

function saveSamples() {
  try {
    localStorage.setItem(samplesStorageKey(), JSON.stringify({modelVersion: window.KANA_MODEL_DATA?.version, samples: state.samples}));
  } catch { /* Storage may be full or blocked; samples still help for this session. */ }
}

function addSample(char, strokes, features) {
  const list = state.samples[char] ||= [];
  list.push({
    strokes: strokes.map(stroke => stroke.map(([x, y]) => [Math.round(x), Math.round(y)])),
    features: features.map(value => Math.round(value * 1000) / 1000)
  });
  if (list.length > MAX_SAMPLES_PER_CHAR) list.shift();
  saveSamples();
}

function sampleCount() {
  return Object.values(state.samples).reduce((total, list) => total + list.length, 0);
}

// A retrained model has different features, so saved drawings are re-read in the background.
function refreshSampleFeatures() {
  if (activeScript !== 'hiragana') return;
  const version = window.KANA_MODEL_DATA?.version;
  if (!version || state.samplesModel === version || !sampleCount()) return;
  const pending = Object.values(state.samples).flat();
  const step = () => {
    const sample = pending.pop();
    if (!sample) { state.samplesModel = version; saveSamples(); return; }
    try { sample.features = window.KanaModel.predict(sample.strokes).features.map(value => Math.round(value * 1000) / 1000); }
    catch { return; }
    setTimeout(step, 0);
  };
  setTimeout(step, 0);
}

function exportSamples() {
  const samples = Object.fromEntries(Object.entries(state.samples).map(([char, list]) =>
    [char, list.map(({strokes}) => ({strokes}))]));
  const file = new Blob([JSON.stringify({format: 'kana-handwriting', exportedAt: new Date().toISOString(), samples})], {type: 'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = 'mau-chu-viet-cua-toi.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function clearSamples() {
  if (!window.confirm(`Xóa toàn bộ mẫu chữ ${scriptName()} đã lưu? Máy sẽ phải học lại nét chữ của bạn từ đầu.`)) return;
  state.samples = {};
  saveSamples();
  render();
}

function selectedCount() {
  return GROUPS.filter(group => state.groups.includes(group.id)).reduce((total, group) => total + group.items.length, 0);
}

function renderGroupCard(group) {
  const selected = state.groups.includes(group.id);
  return `<button class="group-card ${selected ? 'selected' : ''}" data-action="toggle-group" data-group="${group.id}" type="button" aria-pressed="${selected}">
    <span class="group-check" aria-hidden="true">${selected ? '✓' : ''}</span>
    <span class="group-sample">${group.sample}</span>
    <strong>${group.name}</strong>
    <small>${group.hint} · ${group.items.length} âm</small>
  </button>`;
}

function toggleGroup(id) {
  if (state.groups.includes(id)) {
    if (state.groups.length === 1) {
      document.querySelector('.group-summary').textContent = 'Cần chọn ít nhất một nhóm âm.';
      announce('Cần chọn ít nhất một nhóm âm.');
      return;
    }
    state.groups = state.groups.filter(group => group !== id);
  } else {
    state.groups = [...state.groups, id];
  }
  save();
  render();
  document.querySelector(`[data-group="${id}"]`)?.focus({preventScroll: true});
}

function renderDrawCells(item) {
  const count = cellCount(item);
  const cells = Array.from({length: count}, (_, cell) => `<div class="draw-cell ${cell ? 'is-small' : ''}">
      <div class="draw-wrap"><canvas class="draw-canvas" data-cell="${cell}" width="256" height="256" aria-label="${count > 1 ? (cell ? 'Ô vẽ chữ nhỏ' : 'Ô vẽ chữ chính') : `Ô vẽ chữ ${scriptName()}`} bằng chuột hoặc ngón tay"></canvas></div>
      ${count > 1 && activeScript === 'hiragana' ? `<span class="cell-label">${cell ? 'Chữ nhỏ' : 'Chữ chính'}</span>` : ''}
    </div>`).join('');
  return `<div class="draw-cells">${cells}</div>`;
}

function renderHome() {
  const sample = KANA[0];
  const script = scriptName();
  const scriptLabel = activeScript.toUpperCase();
  const canResume = state.queue.length && state.cursor < state.queue.length;
  const canViewResults = state.queue.length && state.cursor >= state.queue.length &&
    Object.keys(state.results).length > 0;
  return `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-line"></span> BẮT ĐẦU HÀNH TRÌNH CỦA BẠN</div>
        <h1>Mỗi ngày một chút.<br><em>Tiếng Nhật</em> gần hơn.</h1>
        <p class="hero-lead">Luyện nhận diện và viết từng chữ cái. Một lượt học nhỏ, một bước tiến thật rõ ràng.</p>
        <div class="hero-points"><span><b>${KANA.length}</b> mục ${script}</span><span class="point-dot"></span><span><b>2</b> cách luyện tập</span></div>
      </div>
      <div class="hero-art" aria-hidden="true"><span class="art-ring ring-one"></span><span class="art-ring ring-two"></span><div class="art-card card-back">${KANA[1]?.[0] || sample[0]}</div><div class="art-card card-front"><span class="art-label">${scriptLabel} 01 / ${String(GROUPS[0].items.length).padStart(2, '0')}</span><strong>${sample[0]}</strong><span class="art-romaji">${sample[1]}</span></div><span class="art-caption">はじめましょう <i>✳</i></span></div>
    </section>
    <section class="choose-section" aria-labelledby="choose-title">
      <div class="section-heading"><div><span class="section-kicker">CHƯƠNG ĐẦU TIÊN</span><h2 id="choose-title">Chọn bảng chữ cái</h2></div><span class="section-aside">Bắt đầu với nền tảng tiếng Nhật</span></div>
      <div class="script-grid">
        <button class="script-card ${activeScript === 'hiragana' ? 'selected' : ''}" data-action="select-script" data-script="hiragana" type="button" aria-pressed="${activeScript === 'hiragana'}"><span class="script-top"><span class="script-icon">あ</span><span class="script-status">${activeScript === 'hiragana' ? 'ĐANG HỌC' : 'CHỌN HỌC'}</span></span><span class="script-card-title">Hiragana</span><span class="script-description">46 chữ cơ bản, biến âm và âm ghép · Nền tảng để đọc tiếng Nhật</span><span class="script-bottom">01 / 03 <span aria-hidden="true">↗</span></span></button>
        <button class="script-card ${activeScript === 'katakana' ? 'selected' : ''}" data-action="select-script" data-script="katakana" type="button" aria-pressed="${activeScript === 'katakana'}"><span class="script-top"><span class="script-icon">ア</span><span class="${activeScript === 'katakana' ? 'script-status' : 'soon-badge'}">${activeScript === 'katakana' ? 'ĐANG HỌC' : 'BẮT ĐẦU'}</span></span><span class="script-card-title">Katakana</span><span class="script-description">Chữ dùng trong từ mượn, tên riêng và âm thanh</span><span class="script-bottom">02 / 03 <span aria-hidden="true">↗</span></span></button>
        <div class="script-card upcoming"><div class="script-top"><span class="script-icon">字</span><span class="soon-badge">SẮP CÓ</span></div><h3>Kanji</h3><p>Hệ thống chữ Hán dùng trong tiếng Nhật</p><span class="script-bottom">03 / 03</span></div>
      </div>
    </section>
    <section class="groups-section" aria-labelledby="groups-title">
      <div class="section-heading"><div><span class="section-kicker">NỘI DUNG LUYỆN TẬP</span><h2 id="groups-title">Chọn nhóm âm</h2></div><span class="section-aside">Chọn một hoặc nhiều nhóm</span></div>
      <div class="group-grid">${GROUPS.map(renderGroupCard).join('')}</div>
      <p class="group-summary"><b>${selectedCount()}</b> âm sẽ xuất hiện trong lượt học, theo thứ tự ngẫu nhiên.</p>
      ${activeScript === 'katakana' ? `<aside class="katakana-tip"><strong>Mẹo đọc từ mượn</strong><span>Dấu <b>ー</b> kéo dài nguyên âm như コーヒー (koohii); chữ nhỏ <b>ッ</b> ngắt phụ âm như ベッド (beddo).</span></aside>` : ''}
    </section>
    <section class="mode-section" aria-labelledby="mode-title">
      <div class="section-heading"><div><span class="section-kicker">CHỌN CÁCH HỌC</span><h2 id="mode-title">Bạn muốn luyện gì hôm nay?</h2></div></div>
      <div class="mode-grid">
        <article class="mode-card"><div class="mode-icon">⌨</div><div class="mode-number">01 — NHẬN DIỆN</div><h3>Nhìn chữ, gõ âm</h3><p>Một chữ ${script} xuất hiện. Bạn nhập phiên âm bằng bàn phím và kiểm tra ngay.</p><button class="button button-dark" data-action="start-type">Bắt đầu luyện gõ <span aria-hidden="true">↗</span></button></article>
        <article class="mode-card"><div class="mode-icon brush-icon">✎</div><div class="mode-number">02 — LUYỆN VIẾT</div><h3>Nhìn âm, vẽ chữ</h3><p>Một phiên âm xuất hiện. Bạn vẽ chữ bằng chuột hoặc ngón tay và ${activeScript === 'katakana' ? 'tự so sánh với mẫu để chấm' : 'nhận kết quả'}.</p><button class="button button-outline" data-action="start-draw">Bắt đầu luyện vẽ <span aria-hidden="true">↗</span></button></article>
      </div>
      ${canResume ? `<button class="resume-button" data-action="resume">↺ &nbsp; Tiếp tục lượt học đang dở (${state.cursor}/${state.queue.length})</button>` : ''}
      ${canViewResults ? `<button class="resume-button" data-action="view-results">↗ &nbsp; Xem kết quả lượt gần nhất</button>` : ''}
      ${sampleCount() ? `<div class="samples-panel"><p>Máy đã lưu <b>${sampleCount()}</b> mẫu chữ của bạn để quen nét viết. Mẫu chỉ nằm trên trình duyệt này.</p><div><button data-action="export-samples" type="button">Tải mẫu xuống</button><button data-action="clear-samples" type="button">Xóa mẫu</button></div></div>` : ''}
    </section>`;
}

function renderFeedback() {
  const item = current();
  const f = state.feedback;
  if (!f) return '';
  const right = f.correct;
  return `<div class="feedback ${right ? 'is-right' : 'is-wrong'}" role="alert">
    <div class="feedback-icon" aria-hidden="true">${right ? '✓' : '×'}</div>
    <div class="feedback-copy"><strong>${right ? 'Chính xác!' : 'Chưa đúng rồi'}</strong><p>${right ?
      activeScript === 'katakana' && state.mode === 'draw' ? 'Bạn tự đánh giá chữ mình vừa viết là đúng.' : 'Bạn đã nhớ đúng chữ này.' :
      `Đáp án đúng là <b>${item[0]} — ${item[1]}</b>.`}</p>
      ${!right && state.mode === 'draw' && activeScript === 'hiragana' ? `<small>Máy nhận dạng: ${escapeHtml(f.recognized || 'không rõ')}.</small>` : ''}
    </div>
    <div class="feedback-actions">
      <button class="button button-dark feedback-next" data-action="next">Chữ tiếp theo <span aria-hidden="true">→</span></button>
    </div>
  </div>`;
}

function renderQuiz() {
  const item = current();
  const done = state.cursor;
  const percent = Math.round((done / state.queue.length) * 100);
  return `<section class="quiz-shell">
    <div class="quiz-topline"><button class="back-link" data-action="home"><span aria-hidden="true">←</span> Trở về</button><div class="quiz-track-name">${activeScript.toUpperCase()} <span> / </span> ${state.mode === 'type' ? 'NHẬN DIỆN' : 'LUYỆN VIẾT'}</div><span class="quiz-counter">${String(done + 1).padStart(2, '0')} / ${String(state.queue.length).padStart(2, '0')}</span></div>
    <div class="progress-track" role="progressbar" aria-label="Tiến độ luyện tập" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${state.queue.length}"><span style="width:${percent}%"></span></div>
    <div class="quiz-intro"><span class="section-kicker">${state.mode === 'type' ? 'NHÌN CHỮ, GÕ ÂM' : 'NHÌN ÂM, VẼ CHỮ'}</span><h1>${state.mode === 'type' ? 'Chữ này đọc là gì?' : 'Hãy vẽ chữ này'}</h1><p>${state.mode === 'type' ? 'Nhập phiên âm Romaji tương ứng với chữ bên dưới.' : activeScript === 'katakana' ? 'Dùng chuột hoặc ngón tay vẽ Katakana rồi tự so sánh với chữ mẫu.' : 'Dùng chuột hoặc ngón tay vẽ Hiragana tương ứng với phiên âm.'}</p></div>
    <div class="quiz-panel ${state.mode === 'draw' ? 'draw-panel' : ''} ${cellCount(item) > 1 ? 'is-pair' : ''}">
      <div class="question-side"><span class="card-overline">${state.mode === 'type' ? `CHỮ ${scriptName().toUpperCase()}` : 'PHIÊN ÂM ROMAJI'}</span><div class="prompt-symbol ${state.mode === 'draw' ? 'romaji-symbol' : cellCount(item) > 1 ? 'is-compound' : ''}">${state.mode === 'type' ? item[0] : item[1]}</div><span class="card-footnote">${state.mode === 'type' ? 'Đọc chữ này thành tiếng nếu bạn muốn' : activeScript === 'katakana' ? 'Vẽ từng chữ vào ô giấy rồi so với mẫu' : cellCount(item) > 1 ? 'Chữ chính viết ở ô lớn, chữ nhỏ viết ở ô nhỏ' : 'Viết đúng chữ Hiragana cho âm này'}</span></div>
      <div class="answer-side"><span class="card-overline">CÂU TRẢ LỜI CỦA BẠN</span>
        ${state.feedback ? (state.snapshots.length ? `<div class="draw-preview">${state.snapshots.map((snapshot, cell) => `<img class="${activeScript === 'hiragana' && cell ? 'is-small' : ''}" alt="Nét vẽ của bạn" src="${snapshot}">`).join('')}</div>` : `<div class="answered-text">${escapeHtml(state.feedback.answer)}</div>`) :
          state.mode === 'type' ? `<form id="answer-form"><label for="answer" class="input-label">Nhập phiên âm</label><input id="answer" name="answer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="latin" maxlength="12" placeholder="Ví dụ: a, ki, shi..." aria-describedby="answer-help" autofocus><small id="answer-help">Nhấn Enter hoặc nút Kiểm tra để trả lời</small><button class="button button-dark check-button" type="submit">Kiểm tra <span aria-hidden="true">→</span></button></form>` :
          activeScript === 'katakana' && state.drawingReview ? renderKatakanaSelfReview(item) :
          `${renderDrawCells(item)}<div class="draw-tools"><button data-action="undo" type="button">↶ &nbsp; Hoàn tác</button><button data-action="clear" type="button">✕ &nbsp; Xóa hết</button></div><p id="draw-message" class="draw-message"></p><button class="button button-dark check-button" data-action="check-draw" type="button">Kiểm tra nét vẽ <span aria-hidden="true">→</span></button>`}
      </div>
    </div>
    ${renderFeedback()}
    <div class="quiz-bottom"><span><span class="tiny-dot"></span> Mỗi chữ chỉ xuất hiện một lần trong lượt học</span></div>
  </section>`;
}

function renderKanaTile(i) {
  const [char, romaji] = KANA[i];
  const result = state.results[i];
  const status = result ? result.correct ? 'right' : 'wrong' : 'unseen';
  const title = result ? `${char} (${romaji}): ${result.correct ? 'đúng' : `sai, đã trả lời ${result.answer || 'không nhận dạng được'}`}` : `${char} (${romaji}): chưa luyện`;
  return `<div class="kana-tile ${status}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"><strong>${char}</strong><span>${romaji}</span>${result ? `<b aria-hidden="true">${result.correct ? '✓' : '×'}</b>` : ''}</div>`;
}

function renderResults() {
  const correct = KANA.filter((_, i) => state.results[i]?.correct).length;
  const wrong = KANA.filter((_, i) => state.results[i] && !state.results[i].correct).length;
  const answered = correct + wrong;
  const percentage = answered ? Math.round(correct / answered * 100) : 0;
  const shown = GROUPS.filter(group => group.indexes.some(i => state.results[i] || state.queue.includes(i)));
  const total = shown.reduce((sum, group) => sum + group.items.length, 0);
  return `<section class="results-shell"><div class="quiz-topline"><button class="back-link" data-action="home"><span aria-hidden="true">←</span> Trang đầu</button><div class="quiz-track-name">${activeScript.toUpperCase()} <span> / </span> KẾT QUẢ</div><span class="quiz-counter">HOÀN THÀNH</span></div>
    <div class="results-hero"><span class="section-kicker">MỘT CHẶNG ĐƯỜNG ĐÃ HOÀN THÀNH</span><h1>${wrong === 0 ? 'Thật tuyệt vời!' : 'Bạn đã đi hết một lượt!'}</h1><p>Nhìn lại từng chữ bạn đã luyện. Những ô màu đỏ là cơ hội để nhớ lâu hơn ở lượt tiếp theo.</p></div>
    <div class="stat-grid"><div class="stat-card"><strong>${percentage}<small>%</small></strong><span>ĐỘ CHÍNH XÁC</span></div><div class="stat-card"><strong>${correct}<small> / ${total}</small></strong><span>CHỮ ĐÚNG</span></div><div class="stat-card"><strong>${wrong}<small> / ${total}</small></strong><span>CẦN ÔN LẠI</span></div></div>
    <div class="result-heading"><div><span class="section-kicker">BẢN ĐỒ HỌC TẬP</span><h2>Các âm trong lượt học</h2></div><div class="legend"><span><i class="legend-dot green"></i> Đúng</span><span><i class="legend-dot red"></i> Sai</span><span><i class="legend-dot gray"></i> Chưa luyện</span></div></div>
    ${shown.map(group => `<h3 class="kana-group-title">${group.name}</h3><div class="kana-grid ${group.items[0][0].length > 1 ? 'is-compound' : ''}">${group.indexes.map(renderKanaTile).join('')}</div>`).join('')}
    <div class="results-actions">${wrong ? `<button class="button button-dark" data-action="retry">Ôn lại ${wrong} chữ sai <span aria-hidden="true">↗</span></button>` : ''}<button class="button button-outline" data-action="restart">Luyện lại từ đầu <span aria-hidden="true">↗</span></button></div>
    <p class="results-note">Kết quả gần nhất được lưu trên trình duyệt này. Bạn có thể quay lại và tiếp tục sau.</p>
  </section>`;
}

function penWidth(cell) { return cell ? 12 : 7; }

function setupPen(ctx, cell) {
  ctx.lineWidth = penWidth(cell);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#20333b';
  ctx.fillStyle = '#20333b';
}

function setupCanvas(canvas) {
  const cell = Number(canvas.dataset.cell);
  const ctx = canvas.getContext('2d');
  setupPen(ctx, cell);
  const point = event => {
    const rect = canvas.getBoundingClientRect();
    return [Math.max(0, Math.min(256, (event.clientX - rect.left) * 256 / rect.width)),
      Math.max(0, Math.min(256, (event.clientY - rect.top) * 256 / rect.height))];
  };
  const finish = event => {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    state.drawing = false;
    state.pointerId = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* Capture may already be gone. */ }
  };
  canvas.addEventListener('pointerdown', event => {
    if (state.drawing) return;
    event.preventDefault();
    showDrawMessage('');
    state.drawing = true;
    state.pointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    (state.cellStrokes[cell] ||= []).push([p]);
    state.strokeOrder.push(cell);
    ctx.beginPath();
    ctx.arc(p[0], p[1], penWidth(cell) / 2, 0, Math.PI * 2);
    ctx.fill();
  });
  canvas.addEventListener('pointermove', event => {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    const p = point(event);
    const stroke = state.cellStrokes[cell].at(-1);
    const last = stroke.at(-1);
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
    stroke.push(p);
    ctx.beginPath();
    ctx.moveTo(last[0], last[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  });
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
}

function redrawCanvases() {
  showDrawMessage('');
  for (const canvas of document.querySelectorAll('.draw-canvas')) {
    const cell = Number(canvas.dataset.cell);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    setupPen(ctx, cell);
    for (const stroke of state.cellStrokes[cell] || []) {
      ctx.beginPath(); ctx.moveTo(...stroke[0]);
      for (const p of stroke.slice(1)) ctx.lineTo(...p);
      if (stroke.length === 1) ctx.lineTo(stroke[0][0] + .1, stroke[0][1] + .1);
      ctx.stroke();
    }
  }
}

function undoStroke() {
  const cell = state.strokeOrder.pop();
  if (cell === undefined) return;
  state.cellStrokes[cell].pop();
  redrawCanvases();
}

function render() {
  app.innerHTML = state.screen === 'home' ? renderHome() : state.screen === 'quiz' ? renderQuiz() : renderResults();
  if (state.screen === 'quiz' && !state.feedback) {
    if (state.mode === 'draw') document.querySelectorAll('.draw-canvas').forEach(setupCanvas);
    else document.querySelector('#answer')?.focus({preventScroll: true});
  }
}

app.addEventListener('submit', event => {
  if (event.target.id === 'answer-form') checkTyped(event);
});

app.addEventListener('click', event => {
  const trigger = event.target.closest('[data-action]');
  const action = trigger?.dataset.action;
  if (!action) return;
  if (action === 'start-type') start('type');
  else if (action === 'start-draw') start('draw');
  else if (action === 'resume') { state.screen = 'quiz'; save(); render(); }
  else if (action === 'view-results') { state.screen = 'results'; save(); render(); }
  else if (action === 'home') home();
  else if (action === 'next') next();
  else if (action === 'check-draw') activeScript === 'katakana' ? reviewKatakanaDrawing() : recognizeDrawing();
  else if (action === 'mark-draw-correct') grade(true, 'Tự chấm: viết đúng');
  else if (action === 'mark-draw-wrong') grade(false, 'Tự chấm: cần luyện lại');
  else if (action === 'redraw-katakana') { state.drawingReview = false; state.snapshots = []; render(); }
  else if (action === 'select-script') selectScript(trigger.dataset.script);
  else if (action === 'export-samples') exportSamples();
  else if (action === 'clear-samples') clearSamples();
  else if (action === 'toggle-group') toggleGroup(trigger.dataset.group);
  else if (action === 'undo') undoStroke();
  else if (action === 'clear') { state.cellStrokes = []; state.strokeOrder = []; redrawCanvases(); }
  else if (action === 'retry') start(state.mode, true);
  else if (action === 'restart') start(state.mode);
});

restore();
loadSamples();
refreshSampleFeatures();
render();
if (state.feedback) state.timer = setTimeout(next, Math.max(0, state.feedbackUntil - Date.now()));
