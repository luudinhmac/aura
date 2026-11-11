# Phạm vi quyền Trung tâm Phê duyệt và Quản trị

## Mục tiêu

Tách quyền phê duyệt yêu cầu nhân sự khỏi quyền quản trị toàn hệ thống. Tài khoản HR có quyền `manage_approvals` chỉ được dùng Trung tâm Phê duyệt, không được truy cập quản lý tài khoản, cơ cấu đơn vị, danh mục hệ thống, cấu hình hoặc tiêu đề cột.

## Thay đổi

- Tạo bộ kiểm tra quyền dùng chung cho Admin Portal.
- Người có `manage_approvals` vẫn được mở Trung tâm Phê duyệt.
- Chỉ `system_admin` được hiển thị và truy cập các tab quản trị hệ thống.
- Với tài khoản không phải Super Admin, nút điều hướng hiển thị là `Phê Duyệt`.
- Trạng thái tab được lưu trong localStorage được kiểm tra lại, không thể dùng để mở tab trái quyền.
- Các vùng render quản trị cũng được chặn theo quyền, không chỉ ẩn nút giao diện.

## Kiểm chứng

- HR local: chỉ thấy `Duyệt Nghỉ Phép` và `Duyệt Yêu Cầu`.
- HR không mở lại được `Thiết Lập Hệ Thống` khi localStorage chứa tab trái quyền.
- `pnpm run lint`: đạt.
- `pnpm run build`: đạt.
- `pnpm test`: 77/77 đạt.
