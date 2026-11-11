# Native dialog removal (2026-10-30)

## Mục tiêu

Loại bỏ hộp thoại native `alert/confirm` của trình duyệt khỏi các module nghiệp vụ, thay bằng feedback đồng nhất trong giao diện.

## Đã triển khai

- Thêm [uiFeedback.ts](../../src/utils/uiFeedback.ts) với `notify()` và `confirmDialog()`.
- Thay cảnh báo native bằng toast nội bộ trong App, bảng lương, cấu hình cột, KPI, chấm điểm, xếp hạng, quản trị tài khoản và các phân hệ tài chính/doanh thu.
- Thay xác nhận native bằng modal nội bộ cho thao tác xóa, hủy, cấp quyền cao, gỡ vai trò và điều chỉnh dữ liệu.
- Kiểm tra toàn workspace: không còn lời gọi native trong mã thực thi; các kết quả còn lại chỉ là comment mô tả UI cũ.

## Verification

- `npm.cmd run lint`: passed.
- `npm.cmd test`: passed, 73 tests.
- `npm.cmd run build`: passed; cảnh báo chunk lớn hiện hữu vẫn còn.
- Browser acceptance chưa thực hiện được vì runtime Node vẫn lỗi `uv_os_get_passwd ENOMEM` khi khởi động server.
