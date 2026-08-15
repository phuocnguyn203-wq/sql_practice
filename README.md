# Common Table · SQL Study Manual

Ứng dụng luyện SQL tương tác bằng tiếng Việt, tập trung vào các chương 7, 8, 9, 10, 12 và 13 của *Practical SQL, 2nd Edition*.

## Tính năng

- 216 bài tập, đúng 36 bài cho mỗi chương.
- Ba mức độ: cơ bản, trung cấp và nâng cao.
- SQLite chạy trong bộ nhớ của trình duyệt; mỗi lần chấm dùng một database sạch.
- Chấm theo kết quả hoặc trạng thái database, không bắt buộc query giống đáp án mẫu.
- Hỗ trợ SELECT, JOIN, DDL, UPDATE, DELETE, transaction, date/time, subquery, CTE và CASE.
- Lưu tiến độ và bản nháp query trong trình duyệt.
- Giao diện responsive cho desktop và mobile.

## Chạy dự án

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (thường là `http://localhost:5173`). Nhấn `Ctrl+Enter` hoặc nút **Chạy query** để chấm bài.

## Kiểm thử và build

```bash
npm test
npm run build
```

Bản build tĩnh nằm trong `dist/` và có thể phục vụ bằng `npm run preview`.

## Ghi chú về SQL dialect

Sách sử dụng PostgreSQL. Phòng lab dùng SQLite/WASM để chạy hoàn toàn cục bộ, vì vậy các bài đã được chuyển sang cú pháp SQLite tương đương (ví dụ `strftime()` và `julianday()` cho ngày giờ). Mục tiêu kiến thức của từng chương vẫn được giữ nguyên.
