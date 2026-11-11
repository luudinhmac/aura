## Run Locally

**Prerequisites:**  Node.js

### Chạy với cơ sở dữ liệu kiểm thử

- Tạo file `.env.test.local` (đã được Git ignore) và đặt `DATABASE_URL` trỏ tới database clone kiểm thử; đặt `PORT=3001`.
- Khởi động bằng `pnpm run dev:test`. Lệnh này nạp `.env.test.local` riêng, không sửa hoặc thay thế `.env` local-dev.
- Không đưa mật khẩu hoặc thông tin kết nối thật vào README hay commit.
