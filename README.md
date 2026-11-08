# Nihongo Từng Bước

**Website:** https://tranvuduchoang.github.io/Nihongo-Tung-Buoc/

Website tĩnh để học 46 chữ Hiragana cơ bản bằng hai cách:

- **Nhìn chữ, gõ âm:** nhập Romaji; trả lời đúng/sai được báo ngay rồi tự chuyển chữ.
- **Nhìn âm, vẽ chữ:** vẽ bằng chuột hoặc ngón tay; bộ nhận dạng chạy ngay trong trình duyệt.

Sau mỗi lượt, trang kết quả hiển thị đủ 46 chữ với màu xanh/đỏ và nút ôn lại chữ sai. Tiến độ lượt học hiện tại được lưu trong `localStorage` của trình duyệt. Katakana và Kanji đang là mục dự kiến cho các phiên bản sau.

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

Chấm vẽ chữ dựa trên so khớp nét với một mẫu tham chiếu cho mỗi chữ, nên có thể nhận nhầm nét viết tay khác nhau. Khi nhận dạng sai, dùng **Tôi đã vẽ đúng** trước khi tự chuyển chữ để sửa thống kê. Bộ nhận dạng và mẫu được ghi nguồn trong [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
