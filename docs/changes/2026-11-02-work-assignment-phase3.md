# Phase 3 — Công tác, nghỉ bù và vi phạm

## Phạm vi đã triển khai

- Khi tạo công tác bắt buộc, người giao có thể cấu hình mức phạt: không phạt, số tiền cố định hoặc phần trăm lương hợp đồng.
- Công tác không bắt buộc vẫn cho phép nhân sự từ chối kèm lý do.
- Tự động tính ngày nghỉ bù: cùng ngày về muộn được nghỉ nửa ngày; công tác qua đêm được nghỉ một ngày.
- Nếu ngày nghỉ bù rơi vào Chủ Nhật cố định, hệ thống chuyển sang ngày làm việc kế tiếp.
- Lịch cố định trong khoảng thời gian công tác và ngày nghỉ bù được ẩn khỏi lịch thực hiện để công tác là nguồn lịch ưu tiên.
- Quản lý có thể xác nhận hoặc miễn vi phạm đối với người chưa hoàn thành công tác bắt buộc.
- Khi xác nhận vi phạm, khoản phạt được đưa vào `otherPenalty` khi tạo phiếu lương mới; không tự ghi đè phiếu lương đã điều chỉnh thủ công.

## Dữ liệu và API

- `work_assignments`: `penaltyType`, `penaltyValue`, `restDayDate`, `restDayPortion`.
- `work_assignment_assignees`: `penaltyAmount`, `violationNote`, `reviewedAt`.
- `POST /api/work-assignments/:id/assignees/:personnelId/violation` với `action=confirm|waive`.
- Quyền server-side: chỉ tài khoản có `manage_work_assignments` được xử lý vi phạm.

## Kiểm thử

- `pnpm.cmd run lint`: đạt.
- `pnpm.cmd run test`: 99/99 đạt.
- `pnpm.cmd run build`: đạt; Vite vẫn cảnh báo chunk lớn hiện hữu.
- Migration đã được áp dụng bằng `prisma db execute` vì lịch sử migration cục bộ không đồng bộ.
- Browser chưa thể kiểm thử lại sau thay đổi vì server dev không khởi động được trong môi trường hiện tại (`uv_os_get_passwd returned ENOMEM`); phiên browser đang giữ lỗi kết nối cũ và các lỗi 401 do phiên đăng nhập hết hạn.
