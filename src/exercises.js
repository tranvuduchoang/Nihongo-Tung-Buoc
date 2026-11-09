import {QUESTIONS, TYPES, checkAnswer, makeQueue} from './exercises-data.js';
import {PDF_COUNTS, createWorksheet, loadPdfAssets, buildWorksheetPdf, savePdfDownload} from './exercises-pdf.js';

const KEY = 'nihongo-exercises-v1';
const byId = new Map(QUESTIONS.map(question => [question.id, question]));
const app = document.querySelector('#exercises');
const announcer = document.querySelector('#exercise-announcer');
const emptyDraft = mode => ({mode, text:'', strokes:[], revealed:false});
let settings = {types:TYPES.map(type => type.id), count:10, mode:'type', pdfCount:20};
let session = null;
let history = [];
let screen = 'home';
let storageUnavailable = false;
let activeStroke = null;
let activePointer = null;
let pdfBusy = false;
let pdfMessage = '';
let pdfError = false;
const html = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const say = message => { announcer.textContent = message; };
const current = () => byId.get(session.ids[session.cursor]);
const correctCount = results => results.filter(result => result.correct).length;
const manualCount = results => results.filter(result => ['draw','self'].includes(result.mode)).length;
const dateLabel = date => new Date(date).toLocaleString('vi-VN', {dateStyle:'short', timeStyle:'short'});

function cleanDraft(draft) {
  const strokes = Array.isArray(draft?.strokes) ? draft.strokes : [];
  const valid = strokes.length <= 160 && strokes.every(stroke => Array.isArray(stroke) && stroke.length > 0 && stroke.length <= 2000 &&
    stroke.every(point => Array.isArray(point) && point.length === 2 && point.every(n => Number.isFinite(n) && n >= 0 && n <= 1000)));
  return {mode:draft?.mode === 'draw' ? 'draw' : 'type', text:String(draft?.text || '').slice(0, 500),
    strokes:valid ? strokes : [], revealed:valid && draft?.mode === 'draw' && Boolean(draft?.revealed)};
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || saved.version !== 1) return;
    if (saved.settings) {
      const types = TYPES.map(type => type.id).filter(id => saved.settings.types?.includes(id));
      settings = {types:types.length ? types : settings.types,
        count:[10, 20, 30].includes(saved.settings.count) ? saved.settings.count : 10,
        mode:saved.settings.mode === 'draw' ? 'draw' : 'type',
        pdfCount:PDF_COUNTS.includes(saved.settings.pdfCount) ? saved.settings.pdfCount : 20};
    }
    if (Array.isArray(saved.history)) history = saved.history.filter(item => item && typeof item.date === 'string' &&
      Number.isFinite(Date.parse(item.date)) && Number.isInteger(item.total) && item.total > 0 && item.total <= QUESTIONS.length &&
      Number.isInteger(item.correct) && item.correct >= 0 && item.correct <= item.total &&
      Number.isInteger(item.manual) && item.manual >= 0 && item.manual <= item.total).slice(0, 12);
    const data = saved.session;
    if (!data || !Array.isArray(data.ids) || !data.ids.length || data.ids.length > QUESTIONS.length ||
      data.ids.some(id => !byId.has(id)) || new Set(data.ids).size !== data.ids.length ||
      !Number.isInteger(data.cursor) || data.cursor < 0 || data.cursor > data.ids.length || !Array.isArray(data.results)) return;
    const validResult = (result, i) => result && result.id === data.ids[i] && typeof result.correct === 'boolean' &&
      ['type','draw','self','skip'].includes(result.mode) && typeof result.answer === 'string';
    if (data.results.length < data.cursor || data.results.length > Math.min(data.cursor + 1, data.ids.length) ||
      !data.results.every(validResult)) return;
    session = {ids:data.ids, cursor:data.cursor,
      results:data.results.map(result => ({id:result.id, correct:result.correct, mode:result.mode, answer:result.answer.slice(0, 500)})),
      draft:cleanDraft(data.draft), recorded:Boolean(data.recorded)};
  } catch { /* Invalid or unavailable storage never blocks practice. */ }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({version:1, settings, session, history})); }
  catch { storageUnavailable = true; say('Trình duyệt không lưu được tiến độ. Bạn vẫn có thể làm bài trong trang này.'); }
  const notice = document.querySelector('#storage-notice');
  if (notice) notice.hidden = !storageUnavailable;
}

function begin(ids) {
  if (!ids.length) return;
  session = {ids, cursor:0, results:[], draft:emptyDraft(settings.mode), recorded:false};
  screen = 'quiz';
  save(); render();
}

function render() {
  activeStroke = null; activePointer = null;
  app.innerHTML = `<div class="exercise-shell"><p id="storage-notice" class="storage-notice" ${storageUnavailable ? '' : 'hidden'}>Không thể lưu trên trình duyệt. Tiến độ hiện tại chỉ giữ khi trang còn mở.</p>${screen === 'home' ? homeView() : screen === 'results' ? resultsView() : quizView()}</div>`;
  if (screen === 'quiz' && session.draft.mode === 'draw' && !session.results[session.cursor]) setupCanvas();
  if (screen !== 'home') {
    const heading = app.querySelector('h1');
    heading?.focus({preventScroll:true});
  }
}

function homeView() {
  const available = QUESTIONS.filter(question => settings.types.includes(question.type)).length;
  const resumable = session && session.cursor < session.ids.length;
  return `<section class="exercise-hero">
    <div><span class="section-kicker">れんしゅう · GÓC TỰ LUYỆN</span><h1>Học rồi, <em>thử làm nhé.</em></h1><p>Từ những nét chữ đầu tiên đến lời chào hằng ngày. Một đề nhỏ, một chút tiến bộ — theo nhịp của bạn.</p><div class="exercise-tags"><span>${QUESTIONS.length} câu hỏi</span><span>4 dạng bài</span><span>Đánh máy hoặc viết tay</span></div></div>
    <div class="notebook" aria-hidden="true"><span>きょうの れんしゅう</span><strong>ありがとう</strong><p>Cảm ơn</p><div>少しずつ、一歩ずつ。</div><small>Từng chút một, từng bước một.</small></div>
  </section>
  ${resumable ? `<aside class="resume-strip"><div><strong>Bài tập của bạn vẫn ở đây.</strong><p>Đã trả lời ${session.results.length}/${session.ids.length} câu. Tiếp tục từ chỗ đã dừng.</p></div><button class="button button-dark" data-action="resume">Tiếp tục làm bài <span aria-hidden="true">→</span></button></aside>` : session ? '<aside class="resume-strip"><strong>Bạn đã hoàn thành lượt luyện gần nhất.</strong><button class="button button-outline" data-action="results">Xem lại kết quả →</button></aside>' : ''}
  <section class="exercise-setup" aria-labelledby="setup-title"><div class="section-heading"><div><span class="section-kicker">01 / CHỌN NỘI DUNG</span><h2 id="setup-title">Hôm nay bạn muốn luyện gì?</h2></div><span class="section-aside">Chọn một hoặc nhiều dạng bài</span></div>
    <fieldset class="exercise-types"><legend class="sr-only">Dạng bài tập</legend>${TYPES.map((type, i) => `<label class="exercise-type"><input type="checkbox" name="exercise-type" value="${type.id}" ${settings.types.includes(type.id) ? 'checked' : ''}><span class="type-content"><span class="type-number">0${i + 1}</span><strong>${type.title}</strong><span class="type-example">${type.sample}</span><small>${type.description}</small><span class="type-count">${QUESTIONS.filter(question => question.type === type.id).length} câu trong ngân hàng</span></span></label>`).join('')}</fieldset>
    <div class="exercise-options"><div><label for="question-count">Số câu mỗi lượt</label><select id="question-count">${[10,20,30].map(n => `<option value="${n}" ${settings.count === n ? 'selected' : ''}>${n} câu</option>`).join('')}</select></div><fieldset class="mode-choice"><legend>Cách trả lời ban đầu</legend><label><input type="radio" name="initial-mode" value="type" ${settings.mode === 'type' ? 'checked' : ''}> Đánh máy</label><label><input type="radio" name="initial-mode" value="draw" ${settings.mode === 'draw' ? 'checked' : ''}> Viết tay</label></fieldset></div>
    <div class="exercise-start"><p id="pool-count">${available ? `${available} câu có sẵn · Xáo trộn mỗi lượt` : 'Chọn ít nhất một dạng bài để bắt đầu.'}</p><button class="button button-dark" data-action="start" ${available ? '' : 'disabled'}>Bắt đầu làm bài <span aria-hidden="true">→</span></button></div>
    <p class="practice-note">Đánh máy được đối chiếu với đáp án mẫu. Viết tay bằng chuột hoặc ngón tay, sau đó xem đáp án và tự đánh giá. Có thể đổi cách trả lời ở từng câu.</p>
  </section>
  <section class="pdf-section" aria-labelledby="pdf-title"><div class="section-heading"><div><span class="section-kicker">02 / MANG BÀI TẬP RA GIẤY</span><h2 id="pdf-title">Một tờ giấy, một buổi luyện.</h2></div><span class="pdf-badge">PDF · A4</span></div>
    <p class="pdf-description">Dùng các mục bạn đã chọn ở trên để tạo đề in. Mỗi mục có tiêu đề riêng, câu hỏi đánh số từ 1 và dòng trống để viết. File chỉ có đề, không kèm đáp án.</p>
    <div class="pdf-controls"><div><label for="pdf-count">Số câu cho mỗi mục</label><select id="pdf-count" ${pdfBusy ? 'disabled' : ''}>${PDF_COUNTS.map(count => `<option value="${count}" ${settings.pdfCount === count ? 'selected' : ''}>${count} câu / mục</option>`).join('')}</select></div><button class="button button-dark" data-action="download-pdf" ${!settings.types.length || pdfBusy ? 'disabled' : ''}>${pdfBusy ? 'Đang tạo PDF…' : 'Tải đề PDF'} <span aria-hidden="true">↓</span></button></div>
    <p id="pdf-summary" class="pdf-summary">${pdfSummary()}</p><p id="pdf-status" class="pdf-status ${pdfError ? 'is-error' : ''}" role="status">${html(pdfMessage)}</p><p class="practice-note">Xáo trộn đề mới mỗi lần tải. Tải PDF không làm thay đổi bài đang làm hoặc lịch sử luyện tập.</p>
  </section>
  <details class="exercise-sources"><summary>Nguồn học và cách biên soạn</summary><p>Nội dung luyện tập được tự biên soạn theo các chủ đề nhập môn, tham khảo tài liệu của The Japan Foundation. Các nguồn giúp chọn chủ đề và đối chiếu từ vựng; đây không phải đề thi chính thức của giáo trình.</p><ul><li><a href="https://marugoto.jpf.go.jp/en/download/starter_a/" target="_blank" rel="noopener noreferrer">Marugoto Starter A1 · tài liệu và từ vựng</a></li><li><a href="https://www.irodori.jpf.go.jp/en/starter/pdf.html" target="_blank" rel="noopener noreferrer">Irodori Starter · giao tiếp trong đời sống</a></li></ul><p>Phiên âm mẫu giữ các nguyên âm như cách viết Hiragana (ou, oo, ei); nhiều từ cũng nhận cách viết âm dài bằng dấu ngang. Các bài dịch có nhiều đáp án tương đương; bạn có thể tự đánh giá nếu cách diễn đạt của mình khác mẫu.</p></details>
  <section class="exercise-history" aria-labelledby="history-title"><div class="section-heading"><div><span class="section-kicker">DẤU CHÂN HỌC TẬP</span><h2 id="history-title">Những lần bạn đã cố gắng</h2></div></div>${history.length ? `<ol class="history-list">${history.map(item => `<li><span>${html(dateLabel(item.date))}<small>${item.manual ? `${item.manual} câu tự đánh giá` : 'Chấm đáp án đánh máy'}</small></span><strong>${item.correct}<span> / ${item.total} đúng</span></strong></li>`).join('')}</ol>` : '<p class="empty-history">Chưa có lượt hoàn thành. Bắt đầu một đề nhỏ hôm nay nhé.</p>'}<p class="practice-note">Giữ 12 lượt gần nhất trên trình duyệt này. Dữ liệu chưa đồng bộ giữa các thiết bị.</p></section>`;
}

function pdfSummary() {
  const sections = settings.types.length ? createWorksheet(settings.types, settings.pdfCount, () => .5) : [];
  if (!sections.length) return 'Chọn ít nhất một mục ở trên để tải đề PDF.';
  const total = sections.reduce((sum, section) => sum + section.questions.length, 0);
  return `${sections.length} mục × ${settings.pdfCount} câu / mục = ${total} câu. Các mục: ${sections.map(section => section.title).join(' · ')}.`;
}

function updatePdfControls() {
  const summary = document.querySelector('#pdf-summary');
  if (summary) summary.textContent = pdfSummary();
  const button = document.querySelector('[data-action="download-pdf"]');
  if (button) {
    button.disabled = pdfBusy || !settings.types.length;
    button.innerHTML = `${pdfBusy ? 'Đang tạo PDF…' : 'Tải đề PDF'} <span aria-hidden="true">↓</span>`;
    button.setAttribute('aria-busy', String(pdfBusy));
  }
  const count = document.querySelector('#pdf-count');
  if (count) count.disabled = pdfBusy;
  const status = document.querySelector('#pdf-status');
  if (status) { status.textContent = pdfMessage; status.classList.toggle('is-error', pdfError); }
}

async function downloadPdf() {
  if (pdfBusy || !settings.types.length) return;
  const sections = createWorksheet(settings.types, settings.pdfCount);
  pdfBusy = true; pdfError = false; pdfMessage = 'Đang chuẩn bị đề và phông chữ tiếng Nhật…';
  updatePdfControls();
  try {
    const assets = await loadPdfAssets();
    const code = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
    const bytes = await buildWorksheetPdf(sections, assets, {code});
    savePdfDownload(bytes, `nihongo-de-luyen-${code.toLowerCase()}.pdf`);
    pdfMessage = `Đã tạo đề gồm ${sections.length} mục, ${sections.reduce((sum, section) => sum + section.questions.length, 0)} câu. Nếu chưa thấy file, hãy kiểm tra mục tải xuống của trình duyệt.`;
  } catch (error) {
    pdfError = true;
    pdfMessage = `Chưa tạo được PDF. ${error.message || 'Hãy kiểm tra kết nối và thử lại.'}`;
  } finally {
    pdfBusy = false; updatePdfControls(); say(pdfMessage);
  }
}

function quizView() {
  const question = current();
  const type = TYPES.find(type => type.id === question.type);
  const result = session.results[session.cursor];
  const draft = session.draft;
  return `<div class="exercise-topline"><button class="back-link" data-action="home">← Lưu và về bài tập</button><span>Câu ${session.cursor + 1} / ${session.ids.length}</span></div>
  <progress class="exercise-progress" value="${session.results.length}" max="${session.ids.length}" aria-label="Tiến độ làm bài"></progress>
  <div class="exercise-intro"><span class="section-kicker">${type.title}</span><h1 tabindex="-1">${question.type === 'kana-romaji' ? 'Từ này đọc thế nào?' : question.type === 'romaji-kana' ? 'Viết lại bằng Hiragana.' : question.type === 'vi-ja' ? 'Bạn sẽ nói thế nào?' : 'Câu này có nghĩa là gì?'}</h1><p>${type.target}.</p></div>
  <section class="exercise-paper"><div class="exercise-question"><span class="card-overline">ĐỀ BÀI</span><p ${['kana-romaji','ja-vi'].includes(question.type) ? 'lang="ja"' : ''} class="exercise-prompt ${question.type === 'vi-ja' ? 'is-vietnamese' : ''}">${html(question.prompt)}</p><span class="paper-stamp" aria-hidden="true">練習</span></div>
  <div class="exercise-answer"><div class="answer-toolbar"><span class="input-label">Câu trả lời của bạn</span><div class="answer-mode" role="group" aria-label="Cách trả lời">${[['type','Đánh máy'],['draw','Viết tay']].map(([mode,label]) => `<button type="button" data-mode="${mode}" aria-pressed="${draft.mode === mode}" ${result || draft.revealed ? 'disabled' : ''}>${label}</button>`).join('')}</div></div>
    ${result ? `<div class="submitted-answer">${result.mode === 'draw' ? '<span>Bài viết tay · Bạn đã tự đánh giá</span>' : result.mode === 'skip' ? '<span>Đã xem đáp án</span>' : `<p>${html(result.answer)}</p>${result.mode === 'self' ? '<span>Câu dịch · Bạn đã tự đánh giá</span>' : ''}`}</div>` : draft.mode === 'type' ? `<form id="exercise-answer-form"><label class="sr-only" for="exercise-answer">${type.target}</label><textarea id="exercise-answer" rows="3" maxlength="500" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="typing-help" placeholder="Viết câu trả lời ở đây…">${html(draft.text)}</textarea><p id="typing-help" class="practice-note">${question.type === 'ja-vi' ? 'Chấp nhận tiếng Việt có hoặc không dấu. Dùng cách diễn đạt tương đương đáp án mẫu.' : question.type === 'kana-romaji' ? 'Không phân biệt hoa/thường, khoảng trắng. Chú ý âm dài và phụ âm kép.' : 'Dùng bàn phím tiếng Nhật của thiết bị để nhập chữ Nhật.'} Nhấn Ctrl/⌘ + Enter để kiểm tra.</p><div class="answer-actions"><button type="submit" class="button button-dark">Kiểm tra đáp án <span aria-hidden="true">→</span></button><button type="button" class="text-button" data-action="reveal">Chưa nhớ · Xem đáp án</button></div></form>` : `<div class="writing-board"><canvas id="exercise-canvas" width="1000" height="600" aria-label="Bảng viết tay. Dùng chuột hoặc ngón tay để viết câu trả lời."></canvas></div><div class="writing-tools"><button data-action="undo" ${draft.revealed ? 'disabled' : ''}>↶ Hoàn tác nét</button><button data-action="clear" ${draft.revealed ? 'disabled' : ''}>Xóa bảng</button></div><p class="practice-note">Viết tự do bằng chuột hoặc ngón tay. Bảng viết giữ nguyên khi xoay màn hình. Chế độ này do bạn tự đối chiếu, không tự nhận dạng chữ.</p>${draft.revealed ? '' : '<button class="button button-dark" data-action="reveal">Xem đáp án để tự chấm <span aria-hidden="true">→</span></button>'}`}
    <p id="answer-message" class="answer-message" role="status"></p>
  </div></section>
  ${result || draft.revealed ? feedbackView(question, result) : ''}
  <p class="exercise-bottom-note">Không giới hạn thời gian · Tự lưu tiến độ · Cứ thong thả làm nhé</p>`;
}

function feedbackView(question, result) {
  return `<section class="exercise-feedback ${result ? result.correct ? 'is-right' : 'is-wrong' : 'is-compare'}" aria-label="Đáp án và giải thích"><div><strong>${result ? result.correct ? '✓ Bạn đã làm đúng!' : result.mode === 'skip' ? 'Cùng ghi nhớ câu này nhé.' : 'Thêm một lần luyện, thêm một lần nhớ.' : 'Đối chiếu với bài viết của bạn'}</strong><p class="model-answer">${html(question.answers[0])}</p>${question.answers.length > 1 ? `<p>Cũng chấp nhận: ${question.answers.slice(1).map(html).join(' · ')}</p>` : ''}<p><b>Phiên âm:</b> ${html(question.reading)}<br><b>Nghĩa:</b> ${html(question.meaning)}</p>${question.note ? `<p class="answer-explanation">${html(question.note)}</p>` : ''}${question.type === 'ja-vi' ? '<p class="practice-note">Đối chiếu theo đáp án mẫu; nếu bạn diễn đạt khác nhưng cùng nghĩa, có thể tự đánh giá lại bên dưới.</p>' : ''}</div>
    <div class="feedback-buttons">${result ? `${question.type === 'ja-vi' && result.mode === 'type' && !result.correct ? '<button class="button button-outline" data-action="override">Ý của tôi đúng · Tự đánh giá</button>' : ''}<button class="button button-dark" data-action="next">${session.cursor + 1 === session.ids.length ? 'Xem kết quả' : 'Câu tiếp theo'} <span aria-hidden="true">→</span></button>` : '<span class="self-grade-label">Tự đánh giá bài viết:</span><button class="button button-dark" data-action="self-right">Tôi viết đúng ✓</button><button class="button button-outline" data-action="self-wrong">Cần luyện thêm</button>'}</div></section>`;
}

function resultsView() {
  const correct = correctCount(session.results);
  const wrong = session.results.filter(result => !result.correct);
  const manual = manualCount(session.results);
  return `<button class="back-link" data-action="home">← Về trang bài tập</button><section class="exercise-result-heading"><span class="section-kicker">おつかれさま · BẠN ĐÃ CỐ GẮNG RỒI</span><h1 tabindex="-1">Thêm một bước tiến bộ.</h1><p>Mỗi câu chưa nhớ là một cơ hội để học lại.</p></section><div class="exercise-stats"><div><strong>${correct}<small>/${session.ids.length}</small></strong><span>Câu đúng</span></div><div><strong>${Math.round(100 * correct / session.ids.length)}<small>%</small></strong><span>Kết quả lượt này</span></div><div><strong>${wrong.length}</strong><span>Câu cần ôn lại</span></div></div><p class="practice-note score-note">${manual ? `${manual} câu do bạn tự đánh giá (viết tay hoặc cách dịch tương đương); ${session.ids.length - manual} câu đối chiếu đáp án tự động hoặc đã xem đáp án.` : 'Kết quả dựa trên đáp án mẫu; câu đã xem đáp án được tính là cần ôn lại.'}</p><div class="exercise-result-actions">${wrong.length ? '<button class="button button-dark" data-action="retry">Ôn lại câu sai →</button>' : ''}<button class="button button-outline" data-action="new">Làm đề mới</button></div><section class="answer-review" aria-labelledby="review-title"><h2 id="review-title">Xem lại từng câu</h2>${session.results.map((result, i) => {
    const question = byId.get(result.id);
    return `<details class="review-item ${result.correct ? 'right' : 'wrong'}"><summary><span class="review-mark" aria-label="${result.correct ? 'Đúng' : 'Cần ôn'}">${result.correct ? '✓' : '↻'}</span><span><small>CÂU ${i + 1} · ${TYPES.find(type => type.id === question.type).title}</small>${html(question.prompt)}</span><span aria-hidden="true">＋</span></summary><div><p><b>Bạn trả lời:</b> ${result.mode === 'draw' ? (result.correct ? 'Bài viết tay · Đúng (tự đánh giá)' : 'Bài viết tay · Cần luyện thêm (tự đánh giá)') : html(result.answer || 'Đã xem đáp án')}</p><p><b>Đáp án:</b> ${html(question.answers.join(' / '))}</p><p>${html(question.reading)} · ${html(question.meaning)}</p>${question.note ? `<p>${html(question.note)}</p>` : ''}${['draw','self'].includes(result.mode) ? '<small>Kết quả do bạn tự đánh giá.</small>' : ''}</div></details>`;
  }).join('')}</section>`;
}

function message(text) {
  document.querySelector('#answer-message').textContent = text;
  say(text);
}

function grade(correct, mode, answer = '') {
  if (session.results[session.cursor]) return;
  session.results.push({id:current().id, correct, mode, answer});
  save(); render();
  say(correct ? 'Bạn đã làm đúng. Có thể chuyển sang câu tiếp theo.' : `Đáp án: ${current().answers[0]}.`);
  document.querySelector('.exercise-feedback')?.scrollIntoView({block:'nearest', behavior:'smooth'});
  document.querySelector('[data-action="next"]')?.focus({preventScroll:true});
}

function submit() {
  if (screen !== 'quiz' || session.draft.mode !== 'type' || session.results[session.cursor]) return;
  const answer = session.draft.text.trim();
  if (!answer) { message('Hãy nhập câu trả lời trước khi kiểm tra.'); document.querySelector('#exercise-answer').focus(); return; }
  grade(checkAnswer(current(), answer), 'type', answer);
}

function next() {
  if (!session.results[session.cursor]) return;
  const mode = session.draft.mode;
  session.cursor++;
  session.draft = emptyDraft(mode);
  if (session.cursor === session.ids.length) {
    screen = 'results';
    if (!session.recorded) {
      history.unshift({date:new Date().toISOString(), total:session.ids.length, correct:correctCount(session.results), manual:manualCount(session.results)});
      history = history.slice(0, 12);
      session.recorded = true;
    }
  }
  save(); render(); window.scrollTo({top:0, behavior:'smooth'});
}

function setupCanvas() {
  const canvas = document.querySelector('#exercise-canvas');
  const context = canvas.getContext('2d');
  context.lineWidth = 4; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#263e42'; context.fillStyle = '#263e42';
  const point = event => {
    const rect = canvas.getBoundingClientRect();
    return [Math.max(0, Math.min(1000, (event.clientX - rect.left) * 1000 / rect.width)), Math.max(0, Math.min(600, (event.clientY - rect.top) * 600 / rect.height))].map(Math.round);
  };
  const paint = stroke => {
    if (stroke.length === 1) { context.beginPath(); context.arc(...stroke[0], 2, 0, Math.PI * 2); context.fill(); }
    else { context.beginPath(); context.moveTo(...stroke[0]); for (const p of stroke.slice(1)) context.lineTo(...p); context.stroke(); }
  };
  session.draft.strokes.forEach(paint);
  canvas.addEventListener('pointerdown', event => {
    if (session.draft.revealed || activePointer !== null || event.button !== 0) return;
    if (session.draft.strokes.length >= 160) { message('Bảng đã có nhiều nét. Hãy kiểm tra hoặc xóa bảng để viết lại.'); return; }
    event.preventDefault(); canvas.setPointerCapture(event.pointerId);
    activePointer = event.pointerId; activeStroke = [point(event)];
    session.draft.strokes.push(activeStroke); paint(activeStroke);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== activePointer || !activeStroke || activeStroke.length >= 2000) return;
    event.preventDefault();
    const p = point(event);
    paint([activeStroke.at(-1), p]); activeStroke.push(p);
  });
  const finish = event => {
    if (event.pointerId !== activePointer) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    activePointer = null; activeStroke = null; save();
  };
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name, finish);
}

app.addEventListener('input', event => {
  if (event.target.id === 'exercise-answer') { session.draft.text = event.target.value; save(); }
});
app.addEventListener('change', event => {
  if (event.target.name === 'exercise-type') {
    settings.types = [...app.querySelectorAll('[name="exercise-type"]:checked')].map(input => input.value);
    const count = QUESTIONS.filter(question => settings.types.includes(question.type)).length;
    document.querySelector('#pool-count').textContent = count ? `${count} câu có sẵn · Xáo trộn mỗi lượt` : 'Chọn ít nhất một dạng bài để bắt đầu.';
    document.querySelector('[data-action="start"]').disabled = !count;
    if (!pdfBusy) { pdfMessage = ''; pdfError = false; }
    updatePdfControls();
  }
  if (event.target.id === 'question-count') settings.count = Number(event.target.value);
  if (event.target.name === 'initial-mode') settings.mode = event.target.value;
  if (event.target.id === 'pdf-count') { settings.pdfCount = Number(event.target.value); pdfMessage = ''; pdfError = false; updatePdfControls(); }
  save();
});
app.addEventListener('submit', event => { if (event.target.id === 'exercise-answer-form') { event.preventDefault(); submit(); } });
app.addEventListener('keydown', event => {
  if (event.target.id === 'exercise-answer' && (event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.isComposing) { event.preventDefault(); submit(); }
});
app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'download-pdf') { void downloadPdf(); return; }
  if (button.dataset.mode && screen === 'quiz' && !session.draft.revealed && !session.results[session.cursor]) {
    session.draft.mode = button.dataset.mode; save(); render();
  }
  if (action === 'start' || action === 'new') begin(makeQueue(settings.types.length ? settings.types : TYPES.map(type => type.id), settings.count));
  if (action === 'resume') { screen = 'quiz'; render(); window.scrollTo({top:0, behavior:'smooth'}); }
  if (action === 'results' && session?.cursor === session?.ids.length) { screen = 'results'; render(); window.scrollTo({top:0, behavior:'smooth'}); }
  if (action === 'home') { screen = 'home'; save(); render(); window.scrollTo({top:0, behavior:'smooth'}); }
  if (action === 'next') next();
  if (action === 'retry') begin(session.results.filter(result => !result.correct).map(result => result.id));
  if (action === 'undo' || action === 'clear') {
    if (session.draft.revealed) return;
    if (action === 'undo') session.draft.strokes.pop(); else session.draft.strokes = [];
    save(); render();
  }
  if (action === 'reveal') {
    if (session.draft.mode === 'type') grade(false, 'skip', session.draft.text);
    else if (!session.draft.strokes.length) message('Hãy viết câu trả lời lên bảng trước khi xem đáp án.');
    else { session.draft.revealed = true; save(); render(); say('Đáp án đã mở. Hãy đối chiếu và tự đánh giá bài viết.'); document.querySelector('.exercise-feedback')?.scrollIntoView({block:'nearest', behavior:'smooth'}); }
  }
  if ((action === 'self-right' || action === 'self-wrong') && session.draft.revealed) grade(action === 'self-right', 'draw');
  if (action === 'override' && current().type === 'ja-vi' && session.results[session.cursor]?.mode === 'type') {
    session.results[session.cursor].correct = true;
    session.results[session.cursor].mode = 'self';
    save(); render(); say('Đã ghi nhận bạn tự đánh giá câu dịch này là đúng.');
  }
});

restore();
render();
window.addEventListener('pagehide', save);
