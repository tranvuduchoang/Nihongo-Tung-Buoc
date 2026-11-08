# Nihongo Từng Bước

**Website:** https://tranvuduchoang.github.io/Nihongo-Tung-Buoc/

Website tĩnh để học Hiragana (46 âm đơn, 26 âm có dấu biến âm, 21 âm ghép và 15 âm ghép có dấu biến âm), chọn một hoặc nhiều nhóm ở trang đầu, bằng hai cách:

- **Nhìn chữ, gõ âm:** nhập Romaji; trả lời đúng/sai được báo ngay rồi tự chuyển chữ.
- **Nhìn âm, vẽ chữ:** vẽ bằng chuột hoặc ngón tay, âm ghép có một ô lớn cho chữ chính và một ô nhỏ cho ゃ ゅ ょ; bộ nhận dạng chạy ngay trong trình duyệt.

Kết quả giữ trên màn hình trong 60 giây trước khi tự chuyển. Người học có thể bấm **Chữ tiếp theo** để chuyển ngay; không có đồng hồ đếm ngược trên giao diện.

Sau mỗi lượt, trang kết quả hiển thị các âm đã chọn theo từng nhóm với màu xanh/đỏ và nút ôn lại chữ sai. Tiến độ lượt học hiện tại được lưu trong `localStorage` của trình duyệt. Katakana và Kanji đang là mục dự kiến cho các phiên bản sau.

## Chạy tại máy

Không cần cài thư viện hoặc backend. Mở `index.html` trực tiếp hoặc chạy một HTTP server tĩnh trong thư mục này, ví dụ:

```sh
python -m http.server 8000
```

Sau đó mở `http://localhost:8000`.

## Triển khai GitHub Pages

Repository đã bật Pages với nguồn **GitHub Actions**. Mỗi lần đẩy lên nhánh `main`, workflow `.github/workflows/deploy.yml` sẽ đóng gói các file tĩnh trong `dist/` và triển khai website.

Không đặt API key hoặc dữ liệu riêng tư trong repository hay mã phía trình duyệt.

## Kiểm tra

```sh
node scripts/check-recognition.mjs
node scripts/build.mjs
```

Chấm vẽ chữ dùng một mô hình AI nhỏ chạy ngay trong trình duyệt, nét vẽ không gửi đi đâu. Mô hình vẫn có thể nhận nhầm một số nét viết tay. Mỗi lần được chấm đúng, nét vẽ được lưu trên trình duyệt để máy quen dần chữ của bạn; ở trang đầu có thể tải các mẫu này xuống hoặc xóa đi. File tải xuống dùng được để huấn luyện lại bằng `scripts/train-model.py --samples`. Bộ nhận dạng và mẫu được ghi nguồn trong [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
