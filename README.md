# Common Table · SQL Study Manual

Ứng dụng luyện SQL tương tác bằng tiếng Việt.

## Tính năng

- 216 bài tập, đúng 36 bài cho mỗi chương.
- Ba mức độ: cơ bản, trung cấp và nâng cao.
- PostgreSQL chạy trong trình duyệt bằng PGlite; mỗi lần chấm dùng một database sạch trong bộ nhớ.
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

## SQL dialect

Phòng lab thực thi PostgreSQL thật được biên dịch sang WebAssembly bằng PGlite. Các bài ngày giờ dùng cú pháp PostgreSQL như `TO_CHAR`, `EXTRACT`, `DATE_TRUNC` và `INTERVAL`.
