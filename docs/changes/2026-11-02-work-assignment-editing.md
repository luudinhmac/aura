# Chỉnh sửa công việc được giao và hiệu ứng nút

## Phạm vi

- Quản lý có thể mở lại công việc chưa hoàn tất để chỉnh sửa thông tin công việc.
- Không cho thay đổi danh sách người thực hiện sau khi công việc đã được giao, tránh làm mất lịch sử phản hồi và dữ liệu tính lương.
- Không cho chỉnh sửa công việc đã hoàn tất toàn bộ.
- Các nút trong luồng công việc được giao có hiệu ứng hover, active, focus và trạng thái disabled nhất quán.

## Thay đổi kỹ thuật

- Thêm API `PUT /api/work-assignments/:id` và cập nhật state phía ứng dụng sau khi lưu.
- Modal dùng chung cho tạo mới và chỉnh sửa.
- Backend kiểm tra tiêu đề, thời gian, mức phạt và trạng thái trước khi cập nhật.
- Không cần migration cơ sở dữ liệu.

## Kiểm tra

- Lint, unit tests và production build được chạy lại sau thay đổi.
- Kiểm tra giao diện cần xác thực bằng phiên đăng nhập còn hiệu lực để mở modal chỉnh sửa mà không ghi dữ liệu.
