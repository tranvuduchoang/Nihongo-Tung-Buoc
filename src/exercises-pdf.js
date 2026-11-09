import {QUESTIONS, TYPES, makeQueue} from './exercises-data.js';

export const PDF_COUNTS = [10, 20, 30, 50, 100];
const byId = new Map(QUESTIONS.map(question => [question.id, question]));
let assetsPromise;

// Each selected type gets its own random, non-repeating pool. Never mutate quiz state.
export function createWorksheet(types, count, random = Math.random) {
  if (!Array.isArray(types) || !types.length || types.some(id => !TYPES.some(type => type.id === id))) throw new Error('Hãy chọn ít nhất một dạng bài.');
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Số câu mỗi mục phải từ 1 đến 100.');
  return TYPES.filter(type => types.includes(type.id)).map(type => ({
    id:type.id, title:type.title, questions:makeQueue([type.id], count, random).map(id => byId.get(id))
  }));
}

function loadScript(path, globalName) {
  if (globalThis[globalName]) return Promise.resolve(globalThis[globalName]);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(path, import.meta.url).href;
    script.onload = () => globalThis[globalName] ? resolve(globalThis[globalName]) : reject(new Error('Không thể khởi tạo thư viện PDF.'));
    script.onerror = () => { script.remove(); reject(new Error('Không tải được thư viện PDF. Hãy kiểm tra kết nối và thử lại.')); };
    document.head.append(script);
  });
}

export function loadPdfAssets() {
  // Self-hosted, loaded only on demand; no CDN or external service at runtime.
  if (!assetsPromise) assetsPromise = Promise.all([
    loadScript('../vendor/pdf/pdf-lib-1.17.1.min.js', 'PDFLib'),
    loadScript('../vendor/pdf/fontkit-1.1.1.umd.min.js', 'fontkit'),
    ...['NihongoLatin-Regular.ttf','NihongoJapanese-Regular.ttf'].map(async name => {
      const response = await fetch(new URL(`../assets/fonts/${name}`, import.meta.url));
      if (!response.ok) throw new Error('Không tải được phông chữ PDF. Hãy thử lại khi có kết nối.');
      return new Uint8Array(await response.arrayBuffer());
    })
  ]).then(([pdfLib, fontkit, latinFont, japaneseFont]) => ({pdfLib, fontkit, latinFont, japaneseFont})).catch(error => {
    assetsPromise = undefined;
    throw error;
  });
  return assetsPromise;
}

// Dependency injection lets the exact browser generator run in Node regression checks.
export async function buildWorksheetPdf(sections, assets, {code = 'LUYEN-TAP'} = {}) {
  if (!Array.isArray(sections) || !sections.length || sections.some(section => !section.questions?.length)) throw new Error('Đề chưa có câu hỏi.');
  const {PDFDocument, rgb} = assets.pdfLib;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(assets.fontkit);
  const [latin, japanese] = await Promise.all([
    // Keep precomposed Vietnamese glyphs, so text extraction and marks stay exact.
    pdf.embedFont(assets.latinFont, {subset:true, features:{ccmp:false, liga:false, clig:false}}),
    pdf.embedFont(assets.japaneseFont, {subset:true})
  ]);
  const latinChars = new Set(latin.getCharacterSet());
  const japaneseChars = new Set(japanese.getCharacterSet());
  const width = 595.28, height = 841.89, margin = 43, bottom = 61;
  const ink = rgb(.12,.17,.19), muted = rgb(.37,.41,.40), line = rgb(.70,.73,.70);
  let page, y;
  const fontFor = char => {
    const cp = char.codePointAt(0);
    if (latinChars.has(cp)) return latin;
    if (japaneseChars.has(cp)) return japanese;
    throw new Error(`Phông PDF chưa có ký tự “${char}”.`);
  };
  const runs = text => {
    const result = [];
    for (const char of text.normalize('NFC')) {
      const font = fontFor(char);
      if (result.at(-1)?.font === font) result.at(-1).text += char;
      else result.push({text:char, font});
    }
    return result;
  };
  const measure = (text, size) => runs(text).reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, size), 0);
  const text = (value, x, baseline, size = 11, color = ink) => {
    for (const run of runs(value)) {
      page.drawText(run.text, {x, y:baseline, size, font:run.font, color});
      x += run.font.widthOfTextAtSize(run.text, size);
    }
  };
  const rule = (x, baseline, to, color = line, thickness = .5) => page.drawLine({start:{x,y:baseline}, end:{x:to,y:baseline}, color, thickness});
  const wrap = (value, size, maxWidth) => {
    // Wrap Vietnamese at word boundaries and Japanese between characters.
    const tokens = value.normalize('NFC').match(/[\u3000-\u9fff\uf900-\ufaff]|[^\s\u3000-\u9fff\uf900-\ufaff]+|\s+/gu) || [];
    const lines = []; let row = '';
    for (const token of tokens) {
      if (row && measure(row + token, size) > maxWidth) { lines.push(row.trimEnd()); row = token.trimStart(); }
      else row += token;
    }
    if (row.trim()) lines.push(row.trimEnd());
    return lines;
  };
  const directions = {
    'kana-romaji':'Viết phiên âm Romaji cho mỗi từ Hiragana bên dưới.',
    'romaji-kana':'Viết mỗi từ Romaji bằng chữ Hiragana. Chú ý âm dài và chữ nhỏ.',
    'vi-ja':'Viết câu tiếng Nhật phù hợp với nghĩa và ngữ cảnh đã cho.',
    'ja-vi':'Dịch từng câu tiếng Nhật sang tiếng Việt.'
  };
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const newPage = (section, continued) => {
    page = pdf.addPage([width, height]);
    text('NIHONGO TỪNG BƯỚC', margin, height - 39, 9, muted);
    const label = 'PHIẾU LUYỆN TẬP';
    text(label, width - margin - measure(label, 9), height - 39, 9, muted);
    rule(margin, height - 51, width - margin);
    y = height - 82;
    if (!continued) {
      text('Họ tên: .............................................', margin, y, 10, muted);
      text('Ngày: ........................', width - 190, y, 10, muted);
      y -= 32;
    }
    for (const title of wrap(section.title, 20, width - margin * 2)) { text(title, margin, y, 20); y -= 27; }
    text(`${section.questions.length} câu${continued ? ' (tiếp theo)' : ''}  |  Mã đề: ${code}`, margin, y, 10, muted);
    y -= 22;
    for (const instruction of wrap(directions[section.id], 10, width - margin * 2)) { text(instruction, margin, y, 10, muted); y -= 15; }
    y -= 16;
  };

  for (const section of sections) {
    newPage(section, false);
    const isWord = ['kana-romaji','romaji-kana'].includes(section.id);
    const size = section.id === 'vi-ja' ? 12 : 16;
    for (const [index, question] of section.questions.entries()) {
      const promptLines = wrap(question.prompt, size, width - margin * 2 - 57);
      const promptHeight = promptLines.length * (size + 6);
      const answerHeight = isWord ? 26 : 44;
      const rowHeight = Math.max(isWord ? 54 : 78, promptHeight + answerHeight + (isWord ? 6 : 14));
      if (y - rowHeight < bottom) newPage(section, true);
      text(`Câu ${index + 1}`, margin, y - 1, 9, muted);
      for (const [row, value] of promptLines.entries()) text(value, margin + 57, y - row * (size + 6), size);
      const firstLine = y - promptHeight - 14;
      rule(margin + 57, firstLine, width - margin);
      if (!isWord) rule(margin + 57, firstLine - 20, width - margin);
      y -= rowHeight;
    }
  }

  const pages = pdf.getPages();
  for (const [index, target] of pages.entries()) {
    page = target;
    rule(margin, 44, width - margin);
    text(`Mã đề: ${code}  |  ${sections.length} mục, ${totalQuestions} câu`, margin, 28, 8, muted);
    const number = `Trang ${index + 1} / ${pages.length}`;
    text(number, width - margin - measure(number, 8), 28, 8, muted);
  }
  pdf.setTitle(sections.length === 1 ? sections[0].title : 'Nihongo Từng Bước - Phiếu luyện tập');
  pdf.setAuthor('Nihongo Từng Bước');
  pdf.setSubject('Đề tự luyện tiếng Nhật, không kèm đáp án');
  pdf.setLanguage('vi-VN');
  return pdf.save();
}

export function savePdfDownload(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], {type:'application/pdf'}));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  // Leave enough time for mobile browsers to open the download before cleanup.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
