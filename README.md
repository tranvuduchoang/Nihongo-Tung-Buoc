# Nihongo Từng Bước

**Website:** https://tranvuduchoang.github.io/Nihongo-Tung-Buoc/

Website tĩnh để học Hiragana (46 âm đơn, 26 âm có dấu biến âm, 21 âm ghép và 15 âm ghép có dấu biến âm), chọn một hoặc nhiều nhóm ở trang đầu, bằng hai cách:

- **Nhìn chữ, gõ âm:** nhập Romaji; trả lời đúng/sai được báo ngay rồi tự chuyển chữ.
- **Nhìn âm, vẽ chữ:** vẽ bằng chuột hoặc ngón tay, âm ghép có một ô lớn cho chữ chính và một ô nhỏ cho ゃ ゅ ょ; bộ nhận dạng chạy ngay trong trình duyệt.

Kết quả giữ trên màn hình trong 60 giây trước khi tự chuyển. Người học có thể bấm **Chữ tiếp theo** để chuyển ngay; không có đồng hồ đếm ngược trên giao diện.

Sau mỗi lượt, trang kết quả hiển thị các âm đã chọn theo từng nhóm với màu xanh/đỏ và nút ôn lại chữ sai. Tiến độ lượt học hiện tại được lưu trong `localStorage` của trình duyệt. Katakana và Kanji đang là mục dự kiến cho các phiên bản sau.

## Làm bài tập

Chọn **Làm bài tập** trên thanh điều hướng hoặc mở `/exercises/`. Trang riêng này không thay đổi logic kiểm tra bảng chữ cái.

Ngân hàng gồm **152 câu hỏi** theo bốn dạng: Hiragana → Romaji (52 câu), Romaji → Hiragana (52 câu), tiếng Việt → tiếng Nhật (24 câu) và tiếng Nhật → tiếng Việt (24 câu). Nội dung gồm từ vựng, âm dài, âm ngắt, chữ nhỏ và câu chào trong sinh hoạt/công ty, kèm phiên âm, nghĩa và lưu ý sử dụng.

- Chọn nhiều dạng bài và đề 10, 20 hoặc 30 câu, xáo trộn mỗi lượt. Nếu nhóm đã chọn có ít câu hơn, đề lấy toàn bộ nhóm, không lặp câu.
- **Đánh máy:** đối chiếu đáp án mẫu; không phân biệt hoa/thường, khoảng trắng và dấu câu. Tiếng Việt chấp nhận cả có dấu/không dấu. Chữ nhỏ, âm dài và phụ âm kép tiếng Nhật vẫn phải đúng. Bài yêu cầu chữ Nhật cần bàn phím tiếng Nhật của thiết bị. Có thể nhấn Ctrl/⌘ + Enter để kiểm tra.
- **Viết tay:** bảng viết bằng chuột, bút hoặc ngón tay, có hoàn tác và xóa. Mở đáp án để đối chiếu rồi tự chọn đúng/cần luyện thêm; không dùng AI/OCR chấm cả từ hoặc câu. Có thể đổi cách trả lời trước khi xem đáp án.
- Xem lại kết quả, giải thích và ôn riêng câu sai. Với câu dịch sang tiếng Việt có cách diễn đạt đúng khác mẫu, có thể tự đánh giá lại. Kết quả ghi rõ số câu tự đánh giá.
- Lưu tự động lượt đang làm (cả chữ đang gõ/nét viết) và 12 lượt hoàn thành gần nhất trong khóa `nihongo-exercises-v1`, tách khỏi tiến độ bảng chữ cái. Nét viết của câu đang làm được giữ khi tải lại; sau khi chuyển câu, chỉ giữ kết quả tự đánh giá. Dữ liệu chỉ có trên trình duyệt đang dùng, chưa đồng bộ thiết bị; nếu trình duyệt chặn lưu trữ, trang vẫn dùng được và thông báo không thể lưu.

## Chạy tại máy

Không cần cài thư viện hoặc backend. Mở `index.html` trực tiếp hoặc chạy một HTTP server tĩnh trong thư mục này, ví dụ:

```sh
python -m http.server 8000
```

Sau đó mở `http://localhost:8000`.

Trang bài tập: `http://localhost:8000/exercises/` (mở `/exercises` cũng được server chuyển sang đường dẫn có dấu `/` cuối). Các đường dẫn tài nguyên là tương đối nên chạy được dưới `/Nihongo-Tung-Buoc/exercises/` trên GitHub Pages, kể cả khi mở trực tiếp hoặc tải lại trang.

## Triển khai GitHub Pages

Repository đã bật Pages với nguồn **GitHub Actions**. Mỗi lần đẩy lên nhánh `main`, workflow `.github/workflows/deploy.yml` sẽ đóng gói các file tĩnh trong `dist/` và triển khai website.

Không đặt API key hoặc dữ liệu riêng tư trong repository hay mã phía trình duyệt.

## Kiểm tra

```sh
node scripts/check-recognition.mjs
node scripts/check-exercises.mjs
node scripts/build.mjs
```

Chấm vẽ chữ dùng một mô hình AI nhỏ chạy ngay trong trình duyệt, nét vẽ không gửi đi đâu. Mô hình vẫn có thể nhận nhầm một số nét viết tay. Mỗi lần được chấm đúng, nét vẽ được lưu trên trình duyệt để máy quen dần chữ của bạn; ở trang đầu có thể tải các mẫu này xuống hoặc xóa đi. File tải xuống dùng được để huấn luyện lại bằng `scripts/train-model.py --samples`. Bộ nhận dạng và mẫu được ghi nguồn trong [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
