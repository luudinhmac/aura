# Payroll dispute inbox — Stage 7 (2026-10-30)

## Mục tiêu

Tách phản ánh bảng lương khỏi màn hình quản lý lương, loại bỏ JSON kỹ thuật và làm rõ luồng tiếp nhận → điều chỉnh → kết luận.

## Đã triển khai

- Thêm tab `payroll_disputes` và menu `Phản ánh bảng lương` có badge số phản ánh đang mở.
- Thêm `GET /api/payroll-disputes/inbox?status=open|all` với kiểm tra quyền và ownership ở server.
- Bổ sung dữ liệu inbox gồm kỳ lương, trạng thái kỳ, nhân sự, nghệ danh và phòng ban.
- Thêm `PayrollDisputesView` với tìm kiếm, lọc, danh sách, chi tiết, tiếp nhận, mở điều chỉnh, xác nhận xử lý và từ chối.
- Nút mở điều chỉnh chuyển về `PayrollManagementView`, chọn đúng kỳ/phiếu và mở form điều chỉnh hiện có.
- Chuẩn hóa số liệu phản ánh qua `formatPayrollDisputeValue`; không còn hiển thị trực tiếp JSON trong inbox.
- Panel phản ánh legacy trên màn hình bảng lương không còn hiển thị.

## Quy tắc nghiệp vụ

- Tiếp nhận chỉ chuyển `submitted` → `under_review`, không tự thay đổi số tiền.
- Xác nhận hoàn tất/từ chối bắt buộc có ghi chú.
- Quyền xem inbox và cập nhật trạng thái vẫn được kiểm tra tại backend.
- Guard kỳ lương hiện hành tiếp tục ngăn điều chỉnh sau phê duyệt/khóa.

## Verification

- `npm.cmd run lint`: passed.
- `npm.cmd test`: passed, 73 tests.
- `npm.cmd run build`: passed; cảnh báo chunk lớn hiện hữu vẫn còn.
- `problems`: không có lỗi ở các file ảnh hưởng.
- Browser acceptance: blocked; `npm.cmd run dev` và `node --import tsx server.ts` đều dừng với `uv_os_get_passwd ENOMEM` trước khi server khởi động.

## Follow-up

- Chạy smoke test bằng tài khoản reviewer và idol khi runtime Node ổn định.
- Xác nhận badge, inbox và thao tác mở form điều chỉnh trên browser.
