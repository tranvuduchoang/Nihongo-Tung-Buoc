const KANA = [
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
];

const STORAGE_KEY = 'kana-study-v1';
const FEEDBACK_DELAY_MS = 60_000;
const app = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const state = {
  screen: 'home', mode: 'type', queue: [], cursor: 0,
  results: {}, feedback: null, feedbackUntil: 0, snapshot: '', strokes: [], drawing: false,
  pointerId: null, timer: null
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function announce(message) { announcer.textContent = message; }

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      screen: state.screen, mode: state.mode, queue: state.queue,
      cursor: state.cursor, results: state.results, pendingAdvance: Boolean(state.feedback),
      feedback: state.feedback, feedbackUntil: state.feedbackUntil
    }));
  } catch { /* Private browsing can block storage; the current session still works. */ }
}

function restore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
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
          recognized: String(saved.recognized || '').slice(0, 10), corrected: Boolean(saved.corrected)};
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
  const targets = retry ? KANA.map((_, i) => i).filter(i => state.results[i]?.correct === false)
    : KANA.map((_, i) => i);
  if (!targets.length) return;
  state.mode = mode;
  state.queue = shuffle(targets);
  state.cursor = 0;
  state.results = retry ? {...state.results} : {};
  state.screen = 'quiz';
  state.feedback = null;
  state.feedbackUntil = 0;
  state.strokes = [];
  save();
  render();
}

function current() { return KANA[state.queue[state.cursor]]; }

function home() {
  clearTimer();
  const finishedByFeedback = Boolean(state.feedback && state.cursor + 1 >= state.queue.length);
  if (state.feedback) {
    state.cursor++;
    state.strokes = [];
    state.snapshot = '';
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
  state.snapshot = '';
  state.strokes = [];
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
  if (state.mode === 'draw') {
    const canvas = document.querySelector('#draw-canvas');
    state.snapshot = canvas?.toDataURL('image/png') || '';
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

function recognizeDrawing() {
  if (!state.strokes.length) { announce('Hãy vẽ chữ trước khi kiểm tra.'); return; }
  const all = state.strokes.flat();
  const xs = all.map(p => p[0]);
  const ys = all.map(p => p[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  if (Math.max(width, height) < 38 || all.length < 8) {
    announce('Nét vẽ quá nhỏ. Hãy vẽ rõ hơn trên ô giấy.'); return;
  }
  let recognized = '';
  try {
    if (!window.KanjiCanvas?.refPatterns?.length) throw new Error('Recognition data unavailable');
    const engine = window.KanjiCanvas;
    engine.recordedPattern_quiz = state.strokes.map(stroke => stroke.length === 1 ? [...stroke, stroke[0]] : stroke);
    const normalized = engine.momentNormalize('quiz');
    const features = engine.extractFeatures(normalized, 20);
    const candidates = engine.coarseClassification(features);
    recognized = candidates.length ? engine.fineClassification(features, candidates).trim().split(/\s+/)[0] : '';
  } catch {
    announce('Bộ nhận dạng đang gặp lỗi. Bạn có thể xóa nét rồi thử lại.');
    return;
  }
  grade(recognized === current()[0], recognized || 'Không nhận dạng được', recognized);
}

function correctRecognition() {
  if (!state.feedback || state.mode !== 'draw' || state.feedback.correct) return;
  clearTimer();
  const index = state.queue[state.cursor];
  state.results[index] = {correct: true, answer: 'Tự xác nhận'};
  state.feedback = {...state.feedback, correct: true, corrected: true};
  state.feedbackUntil = Date.now() + FEEDBACK_DELAY_MS;
  save();
  render();
  announce('Đã sửa đánh giá thành đúng. Bạn có thể chọn chữ tiếp theo.');
  state.timer = setTimeout(next, Math.max(0, state.feedbackUntil - Date.now()));
}

function renderHome() {
  const canResume = state.queue.length && state.cursor < state.queue.length;
  const canViewResults = state.queue.length && state.cursor >= state.queue.length &&
    Object.keys(state.results).length > 0;
  return `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-line"></span> BẮT ĐẦU HÀNH TRÌNH CỦA BẠN</div>
        <h1>Mỗi ngày một chút.<br><em>Tiếng Nhật</em> gần hơn.</h1>
        <p class="hero-lead">Luyện nhận diện và viết từng chữ cái. Một lượt học nhỏ, một bước tiến thật rõ ràng.</p>
        <div class="hero-points"><span><b>46</b> chữ Hiragana cơ bản</span><span class="point-dot"></span><span><b>2</b> cách luyện tập</span></div>
      </div>
      <div class="hero-art" aria-hidden="true"><span class="art-ring ring-one"></span><span class="art-ring ring-two"></span><div class="art-card card-back">い</div><div class="art-card card-front"><span class="art-label">HIRAGANA 01 / 46</span><strong>あ</strong><span class="art-romaji">a</span></div><span class="art-caption">はじめましょう <i>✳</i></span></div>
    </section>
    <section class="choose-section" aria-labelledby="choose-title">
      <div class="section-heading"><div><span class="section-kicker">CHƯƠNG ĐẦU TIÊN</span><h2 id="choose-title">Chọn bảng chữ cái</h2></div><span class="section-aside">Bắt đầu với nền tảng tiếng Nhật</span></div>
      <div class="script-grid">
        <div class="script-card selected"><div class="script-top"><span class="script-icon">あ</span><span class="script-status">ĐANG HỌC <i>●</i></span></div><h3>Hiragana</h3><p>46 chữ cơ bản · Nền tảng để đọc tiếng Nhật</p><span class="script-bottom">01 / 03 <span aria-hidden="true">↗</span></span></div>
        <div class="script-card upcoming"><div class="script-top"><span class="script-icon">ア</span><span class="soon-badge">SẮP CÓ</span></div><h3>Katakana</h3><p>Dành cho từ mượn và tên nước ngoài</p><span class="script-bottom">02 / 03</span></div>
        <div class="script-card upcoming"><div class="script-top"><span class="script-icon">字</span><span class="soon-badge">SẮP CÓ</span></div><h3>Kanji</h3><p>Hệ thống chữ Hán dùng trong tiếng Nhật</p><span class="script-bottom">03 / 03</span></div>
      </div>
    </section>
    <section class="mode-section" aria-labelledby="mode-title">
      <div class="section-heading"><div><span class="section-kicker">CHỌN CÁCH HỌC</span><h2 id="mode-title">Bạn muốn luyện gì hôm nay?</h2></div></div>
      <div class="mode-grid">
        <article class="mode-card"><div class="mode-icon">⌨</div><div class="mode-number">01 — NHẬN DIỆN</div><h3>Nhìn chữ, gõ âm</h3><p>Một chữ Hiragana xuất hiện. Bạn nhập phiên âm bằng bàn phím và kiểm tra ngay.</p><button class="button button-dark" data-action="start-type">Bắt đầu luyện gõ <span aria-hidden="true">↗</span></button></article>
        <article class="mode-card"><div class="mode-icon brush-icon">✎</div><div class="mode-number">02 — LUYỆN VIẾT</div><h3>Nhìn âm, vẽ chữ</h3><p>Một phiên âm xuất hiện. Bạn vẽ chữ bằng chuột hoặc ngón tay và nhận kết quả.</p><button class="button button-outline" data-action="start-draw">Bắt đầu luyện vẽ <span aria-hidden="true">↗</span></button></article>
      </div>
      ${canResume ? `<button class="resume-button" data-action="resume">↺ &nbsp; Tiếp tục lượt học đang dở (${state.cursor}/${state.queue.length})</button>` : ''}
      ${canViewResults ? `<button class="resume-button" data-action="view-results">↗ &nbsp; Xem kết quả lượt gần nhất</button>` : ''}
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
      (f.corrected ? 'Đã sửa đánh giá theo xác nhận của bạn.' : 'Bạn đã nhớ đúng chữ này.') :
      `Đáp án đúng là <b>${item[0]} — ${item[1]}</b>.`}</p>
      ${!right && state.mode === 'draw' ? `<small>Máy nhận dạng: ${escapeHtml(f.recognized || 'không rõ')}. Nếu máy chấm nhầm, hãy sửa đánh giá.</small>` : ''}
    </div>
    <div class="feedback-actions">
      ${!right && state.mode === 'draw' ? `<button class="feedback-correct" data-action="correct-recognition">Tôi đã vẽ đúng</button>` : ''}
      <button class="button button-dark feedback-next" data-action="next">Chữ tiếp theo <span aria-hidden="true">→</span></button>
    </div>
  </div>`;
}

function renderQuiz() {
  const item = current();
  const done = state.cursor;
  const percent = Math.round((done / state.queue.length) * 100);
  return `<section class="quiz-shell">
    <div class="quiz-topline"><button class="back-link" data-action="home"><span aria-hidden="true">←</span> Trở về</button><div class="quiz-track-name">HIRAGANA <span> / </span> ${state.mode === 'type' ? 'NHẬN DIỆN' : 'LUYỆN VIẾT'}</div><span class="quiz-counter">${String(done + 1).padStart(2, '0')} / ${String(state.queue.length).padStart(2, '0')}</span></div>
    <div class="progress-track" role="progressbar" aria-label="Tiến độ luyện tập" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${state.queue.length}"><span style="width:${percent}%"></span></div>
    <div class="quiz-intro"><span class="section-kicker">${state.mode === 'type' ? 'NHÌN CHỮ, GÕ ÂM' : 'NHÌN ÂM, VẼ CHỮ'}</span><h1>${state.mode === 'type' ? 'Chữ này đọc là gì?' : 'Hãy vẽ chữ này'}</h1><p>${state.mode === 'type' ? 'Nhập phiên âm Romaji tương ứng với chữ bên dưới.' : 'Dùng chuột hoặc ngón tay vẽ Hiragana tương ứng với phiên âm.'}</p></div>
    <div class="quiz-panel ${state.mode === 'draw' ? 'draw-panel' : ''}">
      <div class="question-side"><span class="card-overline">${state.mode === 'type' ? 'CHỮ HIRAGANA' : 'PHIÊN ÂM ROMAJI'}</span><div class="prompt-symbol ${state.mode === 'draw' ? 'romaji-symbol' : ''}">${state.mode === 'type' ? item[0] : item[1]}</div><span class="card-footnote">${state.mode === 'type' ? 'Đọc chữ này thành tiếng nếu bạn muốn' : 'Viết đúng chữ Hiragana cho âm này'}</span></div>
      <div class="answer-side"><span class="card-overline">CÂU TRẢ LỜI CỦA BẠN</span>
        ${state.feedback ? (state.mode === 'draw' && state.snapshot ? `<div class="draw-preview"><img alt="Nét vẽ của bạn" src="${state.snapshot}"></div>` : `<div class="answered-text">${escapeHtml(state.feedback.answer)}</div>`) :
          state.mode === 'type' ? `<form id="answer-form"><label for="answer" class="input-label">Nhập phiên âm</label><input id="answer" name="answer" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="latin" maxlength="12" placeholder="Ví dụ: a, ki, shi..." aria-describedby="answer-help" autofocus><small id="answer-help">Nhấn Enter hoặc nút Kiểm tra để trả lời</small><button class="button button-dark check-button" type="submit">Kiểm tra <span aria-hidden="true">→</span></button></form>` :
          `<div class="draw-wrap"><canvas id="draw-canvas" width="256" height="256" aria-label="Ô vẽ chữ Hiragana bằng chuột hoặc ngón tay"></canvas></div><div class="draw-tools"><button data-action="undo" type="button">↶ &nbsp; Hoàn tác</button><button data-action="clear" type="button">✕ &nbsp; Xóa hết</button></div><button class="button button-dark check-button" data-action="check-draw" type="button">Kiểm tra nét vẽ <span aria-hidden="true">→</span></button>`}
      </div>
    </div>
    ${renderFeedback()}
    <div class="quiz-bottom"><span><span class="tiny-dot"></span> Mỗi chữ chỉ xuất hiện một lần trong lượt học</span></div>
  </section>`;
}

function renderResults() {
  const correct = KANA.filter((_, i) => state.results[i]?.correct).length;
  const wrong = KANA.filter((_, i) => state.results[i] && !state.results[i].correct).length;
  const answered = correct + wrong;
  const percentage = answered ? Math.round(correct / answered * 100) : 0;
  return `<section class="results-shell"><div class="quiz-topline"><button class="back-link" data-action="home"><span aria-hidden="true">←</span> Trang đầu</button><div class="quiz-track-name">HIRAGANA <span> / </span> KẾT QUẢ</div><span class="quiz-counter">HOÀN THÀNH</span></div>
    <div class="results-hero"><span class="section-kicker">MỘT CHẶNG ĐƯỜNG ĐÃ HOÀN THÀNH</span><h1>${wrong === 0 ? 'Thật tuyệt vời!' : 'Bạn đã đi hết một lượt!'}</h1><p>Nhìn lại từng chữ bạn đã luyện. Những ô màu đỏ là cơ hội để nhớ lâu hơn ở lượt tiếp theo.</p></div>
    <div class="stat-grid"><div class="stat-card"><strong>${percentage}<small>%</small></strong><span>ĐỘ CHÍNH XÁC</span></div><div class="stat-card"><strong>${correct}<small> / 46</small></strong><span>CHỮ ĐÚNG</span></div><div class="stat-card"><strong>${wrong}<small> / 46</small></strong><span>CẦN ÔN LẠI</span></div></div>
    <div class="result-heading"><div><span class="section-kicker">BẢN ĐỒ HỌC TẬP</span><h2>Toàn bộ bảng Hiragana</h2></div><div class="legend"><span><i class="legend-dot green"></i> Đúng</span><span><i class="legend-dot red"></i> Sai</span><span><i class="legend-dot gray"></i> Chưa luyện</span></div></div>
    <div class="kana-grid">${KANA.map(([char, romaji], i) => {
      const result = state.results[i];
      const status = result ? result.correct ? 'right' : 'wrong' : 'unseen';
      const title = result ? `${char} (${romaji}): ${result.correct ? 'đúng' : `sai, đã trả lời ${result.answer || 'không nhận dạng được'}`}` : `${char} (${romaji}): chưa luyện`;
      return `<div class="kana-tile ${status}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"><strong>${char}</strong><span>${romaji}</span>${result ? `<b aria-hidden="true">${result.correct ? '✓' : '×'}</b>` : ''}</div>`;
    }).join('')}</div>
    <div class="results-actions">${wrong ? `<button class="button button-dark" data-action="retry">Ôn lại ${wrong} chữ sai <span aria-hidden="true">↗</span></button>` : ''}<button class="button button-outline" data-action="restart">Luyện lại từ đầu <span aria-hidden="true">↗</span></button></div>
    <p class="results-note">Kết quả gần nhất được lưu trên trình duyệt này. Bạn có thể quay lại và tiếp tục sau.</p>
  </section>`;
}

function drawSetup() {
  const canvas = document.querySelector('#draw-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#20333b';
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
    state.drawing = true;
    state.pointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    state.strokes.push([p]);
    ctx.beginPath();
    ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#20333b';
    ctx.fill();
  });
  canvas.addEventListener('pointermove', event => {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    const p = point(event);
    const stroke = state.strokes.at(-1);
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

function redrawCanvas() {
  const canvas = document.querySelector('#draw-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = '#20333b'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const stroke of state.strokes) {
    if (!stroke.length) continue;
    ctx.beginPath(); ctx.moveTo(...stroke[0]);
    for (const p of stroke.slice(1)) ctx.lineTo(...p);
    if (stroke.length === 1) ctx.lineTo(stroke[0][0] + .1, stroke[0][1] + .1);
    ctx.stroke();
  }
}

function render() {
  app.innerHTML = state.screen === 'home' ? renderHome() : state.screen === 'quiz' ? renderQuiz() : renderResults();
  if (state.screen === 'quiz' && !state.feedback) {
    if (state.mode === 'draw') drawSetup();
    else document.querySelector('#answer')?.focus({preventScroll: true});
  }
}

app.addEventListener('submit', event => {
  if (event.target.id === 'answer-form') checkTyped(event);
});

app.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'start-type') start('type');
  else if (action === 'start-draw') start('draw');
  else if (action === 'resume') { state.screen = 'quiz'; save(); render(); }
  else if (action === 'view-results') { state.screen = 'results'; save(); render(); }
  else if (action === 'home') home();
  else if (action === 'next') next();
  else if (action === 'check-draw') recognizeDrawing();
  else if (action === 'correct-recognition') correctRecognition();
  else if (action === 'undo' && state.strokes.length) { state.strokes.pop(); redrawCanvas(); }
  else if (action === 'clear') { state.strokes = []; redrawCanvas(); }
  else if (action === 'retry') start(state.mode, true);
  else if (action === 'restart') start(state.mode);
});

restore();
render();
if (state.feedback) state.timer = setTimeout(next, Math.max(0, state.feedbackUntil - Date.now()));
