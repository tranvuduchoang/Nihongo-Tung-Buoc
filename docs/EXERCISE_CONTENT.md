# Ngân hàng câu hỏi luyện tập

Ngân hàng hiện có 980 câu: 200 Hiragana → Romaji, 200 Romaji → Hiragana, 162 Katakana → Romaji, 158 Romaji → Katakana, 30 Katakana → tiếng Việt, 30 tiếng Việt → Katakana, 100 tiếng Việt → tiếng Nhật và 100 tiếng Nhật → tiếng Việt. Hai mục Katakana đầu bao phủ 132 âm/chữ ghép và 30 từ mượn. Một số âm có chung Romaji được gộp thành một câu hỏi với nhiều cách viết hợp lệ. Các mục từ/câu được dùng theo hai chiều; đây không phải 980 mục từ độc lập.

## Nguồn tham khảo

Đã tham khảo ngày 09/11/2026:

- [Marugoto Starter (A1) – tài liệu hỗ trợ](https://marugoto.jpf.go.jp/en/download/starter_a/), The Japan Foundation.
- [Marugoto A1 – danh sách từ vựng có tiếng Việt](https://marugoto.jpf.go.jp/assets/docs/download/starter_c/MarugotoStarterCompetencesVocabularyIndex_VN.pdf), dùng để đối chiếu một số từ cơ bản, cách gọi người thân và nghĩa theo ngữ cảnh.
- [Irodori Starter – các bài học](https://www.irodori.jpf.go.jp/en/starter/pdf.html), The Japan Foundation, tham khảo nhóm tình huống: làm quen, hỏi lại, sinh hoạt, ăn uống, đi lại, mua sắm và sở thích.

Đây là câu hỏi tự biên soạn theo chủ đề nhập môn; không sao chép nguyên đề, bố cục, hình minh họa, phần giải thích hay toàn bộ danh sách của giáo trình. Không phải ngân hàng đề thi hoặc chứng nhận chính thức của The Japan Foundation/JLPT. Bản PDF xuất ra chỉ gồm đề và dòng trống, không đính kèm đáp án hay tài liệu nguồn.

## Quy ước biên soạn

- Dữ liệu Hiragana và hội thoại nằm trong `src/exercises-data.js`/`src/exercises-extra.js`. Bảng chữ và 30 từ mượn Katakana dùng chung từ `src/katakana-data.js` giữa trang bảng chữ cái và trang bài tập.
- Chỉ nối thêm vào cuối các mảng gốc để không thay đổi ID đang dùng trong lịch sử và lượt luyện đã lưu.
- Từ Hiragana dùng phiên âm theo mặt chữ: `こう` → `kou`, `とお` → `too`, `せい` → `sei`. Một số từ chấp nhận dấu ngang cho âm dài hoặc biến thể Hepburn thông dụng, nhưng không bỏ âm dài/phụ âm kép/chữ nhỏ khi chấm.
- Từ Katakana theo cách ghi Romaji của từng mục; chỉ nhận biến thể phiên âm đã liệt kê. Không bỏ dấu kéo dài `ー`, âm ngắt `ッ` hay chữ nhỏ. Với Romaji có thể ánh xạ tới nhiều cách viết Katakana, bài tập chấp nhận các chữ trong danh sách đáp án.
- Câu giao tiếp phiên âm trợ từ theo cách đọc: は → wa, へ → e, を → o. Đáp án mẫu ưu tiên Hiragana và bổ sung một số cách viết Kanji tương đương.
- Nghĩa tiếng Việt được diễn đạt cho người tự học; câu đề Việt có ngữ cảnh khi dễ nhầm. Các từ đồng âm có thể ghi nhiều nghĩa, không đánh đồng nghĩa chỉ dựa vào phiên âm.
- Chấm dịch Việt theo đáp án hữu hạn. Người học có thể tự đánh giá lại câu diễn đạt khác mà vẫn đúng nghĩa. Không khẳng định hệ thống hiểu tự do mọi cách dịch.
- Những cách nói cần chú ý có ghi chú riêng, ví dụ tuổi 20, câu chào ở công ty hoặc `にがて`.

## Kiểm tra khi thêm dữ liệu

Chạy `node scripts/check-exercises.mjs` để kiểm tra số lượng, trùng ID/đề, biến thể đáp án và các trường hợp dễ sai. Chạy `node scripts/check-exercises-pdf.mjs` để tạo thử đề một/nhiều mục, kiểm tra A4 và độ phủ ký tự của phông. Có thể thêm `--output /tmp/nihongo-pdf-qa` để lưu file kiểm tra và danh sách câu đã chọn.

Nếu thêm ký tự Nhật chưa có trong phông đã rút gọn, script kiểm tra PDF sẽ báo lỗi. Tái tạo phông bằng `scripts/prepare-pdf-fonts.py`; xem nguồn và giấy phép trong `THIRD_PARTY_NOTICES.md`. Không cần cài Python hay thư viện để người dùng làm bài/tải PDF trên website.
