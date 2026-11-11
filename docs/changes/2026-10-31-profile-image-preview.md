# Phóng to ảnh hồ sơ trong modal chi tiết

## Phạm vi

- Tăng kích thước ảnh hồ sơ trong modal chi tiết nhân sự/Idol.
- Cho phép click ảnh để mở preview toàn màn hình.
- Preview có nút đóng, đóng khi click nền và hỗ trợ phím Escape.
- Không thay đổi upload, dữ liệu hồ sơ hoặc quyền chỉnh sửa.

## Xác minh

- Local browser: mở hồ sơ Minh Anh (Aria) từ danh sách nhân sự.
- Ảnh hiển thị lớn hơn với cursor zoom-in.
- Click ảnh mở dialog có tên truy cập được và ảnh preview.
- Escape đóng preview thành công.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test -- --run`: đạt 86/86.
- `pnpm.cmd run build`: đạt; vẫn có cảnh báo bundle lớn hơn 500 kB sau minify.

## Ghi chú

- Chỉ thay đổi và kiểm tra trên local.
- Chưa đồng bộ lên VM production.
