# Payroll feedback and approval calendar — Stage 0 (2026-10-30)

## Mục tiêu

Chốt chính sách phản ánh bảng lương và lịch phê duyệt/khóa sổ trước khi thay đổi schema hoặc code nghiệp vụ.

## Quyết định đã xác nhận

- Ngày 1–3: thời gian nhân sự phản hồi; HR/Kế toán được kiểm tra và điều chỉnh khi kỳ chưa phê duyệt.
- Từ ngày 4: bắt đầu cho phép phê duyệt.
- Từ ngày 5: được khóa sổ và chi nếu kỳ đã `approved`.
- Nếu chưa `approved`, nút khóa sổ/chi luôn bị disable và backend luôn từ chối.
- Sau `approved`, kỳ bất biến về số tiền; sai sót xử lý bằng kỳ/khoản điều chỉnh riêng.
- Phản ánh có lý do bắt buộc, gắn với phiếu lương và có trạng thái xử lý/audit.

## Phạm vi Stage 0

Chỉ ghi nhận chính sách và plan; chưa thay đổi database, API, UI hoặc dữ liệu hiện tại.

## Tài liệu

- Kế hoạch tổng thể: `PLAN_PAYROLL_FEEDBACK_APPROVAL_CALENDAR.md`.

## Kết quả

Stage 0 hoàn tất. Stage 1 sẽ bắt đầu bằng thiết kế migration cho bảng phản ánh và các mốc lịch của kỳ lương.

## Stage 1 — Schema và migration

- Đã thêm `PayrollDispute` với liên kết bắt buộc đến kỳ lương, phiếu lương và nhân sự; liên kết người gửi/người xử lý dùng `SetNull` để giữ lịch sử khi tài khoản bị vô hiệu hóa.
- Đã thêm `feedbackStartsAt`, `approvalStartsAt`, `lockStartsAt` dạng `date` vào `PayrollPeriod` để lưu mốc lịch theo từng kỳ.
- Đã thêm các index theo kỳ/trạng thái, phiếu/trạng thái, nhân sự/thời gian và người gửi/trạng thái.
- Migration `20261030_payroll_feedback_calendar` đã áp dụng thành công. Database hiện có 0 phản ánh; các mốc lịch kỳ hiện hữu đang để `NULL` và sẽ được khởi tạo khi triển khai calendar guard ở Stage 3.
- Chưa có API, UI hoặc thay đổi dữ liệu lương trong Stage 1.

### Kiểm chứng Stage 1

- `pnpm.cmd exec prisma validate`: đạt.
- `pnpm.cmd exec prisma generate`: đạt.
- `pnpm.cmd exec prisma migrate deploy`: đạt.
- `pnpm.cmd exec prisma migrate status`: database up to date.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: 66/66 test đạt.

Stage 2 tiếp theo là backend API, ownership và phân quyền cho phản ánh.

## Stage 2 — Backend API, ownership và RBAC

- Đã thêm API lấy danh sách phản ánh theo kỳ, tạo phản ánh theo phiếu lương, xử lý trạng thái và hủy phản ánh.
- Danh tính người gửi được lấy từ authenticated request; payload không thể thay thế `submittedById`.
- Nhân sự chỉ xem/tạo/hủy phản ánh của chính mình khi còn `submitted`; HR/Kế toán/Giám đốc/Super Admin được xem và xử lý theo quyền.
- Không cho tạo phản ánh trên kỳ `locked_paid`; không cho cập nhật tùy ý trạng thái hoặc kết luận nếu không có quyền xử lý.
- API mutation được route policy bảo vệ; middleware audit hiện hữu ghi request ID, actor, resource và status code.
- Thêm client API và type/policy dùng chung; chưa thêm UI trong Stage 2.

### Kiểm chứng Stage 2

- `problems`: không lỗi trên các file liên quan.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: 68/68 test đạt.
- Database migration status: vẫn up to date; số phản ánh hiện tại: 0.

Stage 3 tiếp theo là calendar guard cho submit/approve/lock theo ngày 1–3, ngày 4 và từ ngày 5.

## Stage 3 — Calendar guard

- Đã thêm utility lịch kỳ lương: ngày phản hồi 1, ngày phê duyệt 4, ngày khóa/chi 5 của tháng liền sau kỳ lương.
- `submit` và `approve` chỉ được thực hiện từ ngày 4 theo `referenceDate` hệ thống.
- `lock/pay` chỉ được thực hiện từ ngày 5 và khi `PayrollPeriod.status === approved`.
- Backend từ chối cả request trực tiếp nếu sai ngày hoặc kỳ chưa phê duyệt; UI disable nút tương ứng và hiển thị ngày được phép.
- Mốc lịch đã được backfill bằng migration riêng `20261030_payroll_calendar_backfill`; không sửa migration Stage 1 đã apply.
- Kỳ `2025-12` hiện có mốc phản hồi `2026-01-01`, phê duyệt `2026-01-04`, khóa/chi `2026-01-05`.

### Kiểm chứng Stage 3

- `pnpm.cmd exec prisma validate/generate/migrate deploy/migrate status`: đạt, database up to date.
- `problems`: không lỗi trên các file liên quan.
- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd test`: 70/70 test đạt.
- `pnpm.cmd run build`: đạt; cảnh báo bundle entry >500 kB vẫn là cảnh báo hiện hữu.
- Browser smoke test chưa thực hiện được vì môi trường Node hiện vẫn gặp `uv_os_get_passwd ENOMEM` khi khởi động server.

Stage 4 tiếp theo là UI phản ánh trực tiếp trên phiếu lương.

## Stage 4 — UI phản ánh trên phiếu lương

- Đã thêm form `Phản ánh phiếu lương` vào `PayslipModal`, dùng chung cho phiếu cá nhân và màn hình quản trị.
- Form cho phép chọn loại sai lệch (lệch công, giờ live, ngày nghỉ, khoản trừ, lương, KPI/thưởng hoặc khác), nhập số liệu đề nghị, lý do bắt buộc và link bằng chứng tùy chọn.
- Modal tải và hiển thị lịch sử phản ánh của đúng phiếu, kèm trạng thái xử lý; việc tạo phản ánh đi qua API hiện hữu và không tự thay đổi số tiền trên phiếu.
- Hiển thị các mốc phản hồi/phê duyệt/khóa theo kỳ lương và mốc hiện tại theo `referenceDate`; kỳ `locked_paid` hoặc phiếu đã thanh toán không cho tạo phản ánh mới.
- Bổ sung nhãn trình bày dùng chung tại `src/utils/payrollDisputePresentation.ts` và test cho toàn bộ category/status/date formatting.

### Kiểm chứng Stage 4

- `problems`: không có lỗi trên các file liên quan.
- `npm.cmd run lint`: đạt.
- `npm.cmd test`: 72/72 test đạt.
- `npm.cmd run build`: đạt; cảnh báo bundle entry >500 kB vẫn là cảnh báo hiện hữu.
- Browser smoke test chưa thực hiện được do runtime Node vẫn gặp `uv_os_get_passwd ENOMEM` khi khởi động server; cần chạy lại khi môi trường runtime ổn định.

Stage 5 tiếp theo là UI danh sách phản ánh cho HR/Kế toán/Giám đốc và hiển thị lý do các nút workflow bị disable.

### Điều chỉnh nội dung phiếu lương sau Stage 4

- Phiếu lương chỉ còn thông báo thời hạn phản hồi: từ ngày 01 của tháng kế tiếp đến 23:59:59 ngày 03 của tháng kế tiếp.
- Đã bỏ các thẻ mốc “Phê duyệt” và “Khóa/chi” khỏi khu vực phản ánh trên phiếu lương; các quy tắc workflow vẫn giữ ở màn hình quản lý bảng lương và backend.
- Nội dung xác nhận rõ phản hồi sau thời hạn sẽ không được xem xét.
- Bổ sung test tính đúng ngày kết thúc cửa sổ phản hồi.

## Stage 5 — UI xử lý phản ánh cho reviewer

- Đã thêm panel `Phản ánh cần xử lý` trong màn hình quản lý bảng lương, chỉ hiển thị cho HR/Kế toán/Giám đốc/Super Admin theo policy server hiện hữu.
- Panel tải phản ánh của kỳ đang chọn, hiển thị số phản ánh đang mở, lọc `Chưa xử lý`/`Tất cả`, người gửi/nhân sự, loại phản ánh, giá trị hệ thống/đề nghị, lý do, bằng chứng và kết luận.
- Reviewer có thể tiếp nhận (`under_review`), đánh dấu đã xử lý (`resolved`) hoặc từ chối (`rejected`); xử lý/từ chối bắt buộc có ghi chú. API backend tiếp tục là lớp kiểm tra quyền và transition cuối cùng.
- Bổ sung thông báo trực tiếp tại khu vực thao tác workflow khi chưa đến ngày trình/phê duyệt hoặc ngày khóa/chi.

### Kiểm chứng Stage 5

- `problems`: không có lỗi trên file liên quan.
- `npm.cmd run lint`: đạt.
- `npm.cmd test`: 72/72 test đạt.
- `npm.cmd run build`: đạt; cảnh báo bundle entry >500 kB vẫn là cảnh báo hiện hữu.
- Browser smoke test chưa hoàn tất do API localhost hiện trả lỗi 401/kết nối máy chủ; cần xác minh lại với server và phiên đăng nhập hợp lệ.
