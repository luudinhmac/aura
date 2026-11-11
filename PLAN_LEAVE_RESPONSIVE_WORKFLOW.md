# Plan: Responsive modal và phân bổ phép năm / nghỉ không lương

## Mục tiêu

- Các modal dài vẫn thao tác được ở màn hình thấp/hẹp, không bị che và có vùng cuộn nội dung rõ ràng.
- Khi số ngày xin phép năm vượt quỹ còn lại, hệ thống tách phần còn quỹ thành phép năm và phần vượt thành nghỉ không lương sau khi người dùng xác nhận.
- Chỉ đơn đã duyệt mới ảnh hưởng đến khấu trừ nghỉ không lương trong phiếu lương.

## Trạng thái thực hiện

### Stage 1 — Responsive modal/layout: Hoàn tất

- Bổ sung `overflow-y-auto`, `max-height` theo viewport, `min-h-0` cho form nội dung và padding responsive ở các modal dài trong các view/chức năng hồ sơ, vận hành, KPI, tài chính, payroll, quản trị và các component modal dùng chung.
- Giữ header/footer modal cố định theo bố cục hiện có; chỉ vùng nội dung cuộn.
- Kiểm tra TypeScript, test và production build.

### Stage 2 — Phân bổ phép và payroll: Hoàn tất

- Thêm các trường `annualLeaveDays`, `unpaidLeaveDays`, `allocationConfirmed` vào `LeaveRequest` và migration `20261030_leave_allocations`.
- Tính quỹ phép dựa trên đơn pending/approved; đơn rejected không giữ quỹ.
- API trả lỗi có mã `LEAVE_ALLOCATION_CONFIRMATION_REQUIRED` khi cần xác nhận; UI hiển thị số ngày tách cụ thể và checkbox xác nhận.
- Quản trị thấy phân bổ trong danh sách/khung duyệt.
- Phiếu lương mới trừ `unpaidLeaveDeduction` theo số ngày nghỉ không lương của các đơn đã duyệt.

### Stage 3 — RBAC và identity cho luồng nghỉ phép: Hoàn tất

- GET/POST leave request yêu cầu identity; nhân sự thường chỉ được xem/tạo đơn cho `idolId` của chính tài khoản.
- PUT/DELETE leave request yêu cầu `manage_approvals`.
- Người duyệt được lấy từ identity server-side, không tin `reviewedBy` do client gửi.
- Bổ sung test route policy và kiểm tra lint/unit/build.

### Stage 4 — Điểm truy cập phê duyệt cho người có quyền nghiệp vụ: Hoàn tất

- Người có `manage_approvals` được truy cập Admin Portal ở mức nghiệp vụ, không cần `system_admin` hoặc Super Admin.
- Tài khoản giám đốc `khanghm` có thể mở khu vực `Duyệt Nghỉ Phép`; Admin Portal của tài khoản nghiệp vụ hiển thị theo ngữ cảnh phê duyệt thay vì yêu cầu quyền quản trị hệ thống.
- Không thay đổi `accountType`, không nâng quyền Super Admin và không mở các API quản trị tài khoản trái với route policy hiện có.
- Kiểm tra lint, unit test, build và quyền hiển thị phía frontend.
- Bổ sung kiểm tra thẩm quyền Giám Đốc theo `role`, `roleTitle` hoặc phòng Ban Giám Đốc ở cả UI và backend; tài khoản nghiệp vụ có `role=super_admin` nhưng `isSuperAdmin=false` vẫn được duyệt đơn từ 3 ngày trở lên nếu thuộc Ban Giám Đốc.

## Acceptance criteria

- Modal trên viewport thấp có thể cuộn đến nút thao tác cuối cùng, không làm cuộn trang nền thay thế.
- Xin 5 ngày khi còn 1 ngày phép: chưa tick xác nhận thì không gửi; tick xác nhận thì lưu 1 ngày phép + 4 ngày không lương.
- Đơn bị từ chối không làm giảm quỹ phép.
- Phiếu lương sử dụng ngày không lương đã duyệt; salary snapshot và các kỳ đã chốt không bị thay đổi.
- `lint`, unit tests, build và migration status đều pass.

## Known limitations / follow-up

### Browser smoke verification update (2026-10-30)

- Verified login with idol account `quynhbt/123`; the account exposes only the personal Idol Dashboard and has no management approval controls.
- At viewport 420x700, the leave modal stayed within the viewport, its content remained scrollable, and the submit action stayed accessible.
- For 01/12/2025–05/12/2025 with 1 annual-leave day remaining, the UI showed `1 annual + 4 unpaid` and blocked submission until confirmation.
- The modal was closed with `Hủy`; no test leave request was persisted.

- Browser hiện đang ở tài khoản HR chỉ được cấp màn hình Tài chính; chưa thể mở trực tiếp màn hình Idol Dashboard để thao tác form nghỉ trong phiên browser này. Cần smoke test UI form bằng tài khoản có quyền hồ sơ trước khi release.
- Payroll sync hiện áp dụng khoản khấu trừ khi tạo phiếu lương mới; kỳ đã tồn tại/đã chốt không tự ý recalculation để bảo toàn snapshot lịch sử.
- Chưa có OTP/Telegram cho thao tác duyệt; đây là hạng mục bảo mật riêng ngoài scope hiện tại.
