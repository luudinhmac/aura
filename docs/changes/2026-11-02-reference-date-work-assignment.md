# Đồng bộ mốc ngày hệ thống cho giao công tác

- Ngày: 2026-11-02
- Mục tiêu: Khi quản trị cấu hình `referenceDate` là `01/01/2026`, dashboard và server phải coi đó là ngày hiện tại chung.
- Phạm vi: hạn chấp nhận, chuyển quá hạn, hoàn thành công tác, đổi người thực hiện, thời hạn ủy quyền và nút hoàn thành trên dashboard.
- UI không còn hiển thị nút xác nhận khi hạn chấp nhận đã qua; thay bằng trạng thái “Đã quá hạn chấp nhận”.
- Bổ sung nút “Gửi giải trình / xin miễn giảm phạt” khi vi phạm đang chờ xử lý và hiển thị kết quả miễn/phạt sau khi đã xử lý.
- Thiết kế: dùng `getEffectiveSystemDate()` ở PostgreSQL store; truyền `referenceDate` vào `WorkAssignmentPanel` và dùng `getSystemNow()` ở UI. Không thay đổi schema hoặc dữ liệu.
- Kiểm thử: thêm kiểm thử hồi quy cho mốc ngày cấu hình; chạy lint, test và build.
- Giới hạn: nếu không cấu hình `referenceDate`, hệ thống tiếp tục dùng thời gian thực của server/trình duyệt.
- Manager view now shows each employee's waiver reason, submitted time, current request status, and the keep-penalty / waive actions beside the assigned person.
